// Importa a configuração do banco de dados (MySQL usando mysql2/promise)
const db = require('../config/db');

// Importa o logger personalizado para registrar logs (sugestão útil para debug e auditoria)
const logger = require('../utils/logger');

/**
 * Executa consultas SQL de forma segura e padronizada
 * 
 * @param {string} sql - Consulta SQL com placeholders (?) para evitar SQL Injection
 * @param {Array} params - Parâmetros que serão substituídos nos placeholders da query
 * @param {Object} res - Objeto response do Express para enviar a resposta HTTP
 * @param {Object} options - Opções adicionais para personalizar o comportamento da função
 *        - successMessage {string} - Mensagem de sucesso personalizada
 *        - successStatus {number} - Código HTTP para sucesso (default: 200)
 *        - emptyMessage {string} - Mensagem quando a consulta não retorna dados
 *        - transformResult {Function} - Função opcional para transformar os resultados antes de retornar
 * 
 * @returns {Promise} - Retorna uma Promise para uso com async/await
 */
module.exports = async (sql, params, res, options = {}) => {
    // Desestrutura as opções, definindo valores padrão
    const {
        successMessage = '',
        successStatus = 200,
        emptyMessage = 'Nenhum registro encontrado',
        transformResult = null
    } = options;

    try {
        // Executa a query usando o método assíncrono do MySQL (retorna [rows, fields])
        const [results] = await db.query(sql, params);

        // Se estiver em modo de desenvolvimento, loga a query e os parâmetros
        if (process.env.NODE_ENV === 'development') {
            logger.debug(`SQL Executado: ${sql}`, { params });
        }

        // Se não houver resultados e uma mensagem de vazio estiver definida
        if ((!results || results.length === 0) && emptyMessage) {
            return res.status(404).json({ 
                status: 'empty', // status personalizado
                message: emptyMessage
            });
        }

        // Se foi fornecida uma função de transformação, aplica ela nos resultados
        const finalResults = transformResult ? transformResult(results) : results;

        // Se houver mensagem de sucesso personalizada, retorna com ela
        if (successMessage) {
            return res.status(successStatus).json({
                status: 'success',
                message: successMessage,
                data: finalResults
            });
        }

        // Caso contrário, retorna somente os dados
        return res.status(successStatus).json({
            status: 'success',
            data: finalResults
        });

    } catch (err) {
        // Log detalhado do erro no logger
        logger.error('Erro na execução da query', {
            error: err.message,  // mensagem de erro
            sql,                 // SQL que causou o erro
            params,              // parâmetros passados
            stack: err.stack     // stack trace
        });

        // Se for erro de duplicação de registro (violação de chave única)
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                status: 'error',
                code: 'DUPLICATE_ENTRY',
                message: 'Registro duplicado'
            });
        }

        // Se for erro de referência inválida (FK inexistente)
        if (err.code === 'ER_NO_REFERENCED_ROW') {
            return res.status(400).json({
                status: 'error',
                code: 'INVALID_REFERENCE',
                message: 'Referência inválida'
            });
        }

        // Qualquer outro erro genérico de banco
        return res.status(500).json({
            status: 'error',
            code: 'DATABASE_ERROR',
            message: 'Erro no servidor de banco de dados',
            // Mostra detalhes apenas em desenvolvimento
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// Versão alternativa da função para usar sem Express (sem o `res`)
module.exports.rawQuery = async (sql, params) => {
    try {
        // Executa a query e retorna os resultados diretamente
        const [results] = await db.query(sql, params);
        return results;
    } catch (err) {
        // Loga o erro
        logger.error('Erro na execução da query', {
            error: err.message,
            sql,
            params
        });

        // Repassa o erro para quem chamou a função tratar
        throw err;
    }
};

// Importa funções do express-validator:
// - check: para validar campos do corpo da requisição
// - validationResult: para extrair os erros de validação
// - query: para validar parâmetros de consulta (query string)
const { check, validationResult, query } = require('express-validator');

/**
 * Middleware de tratamento de erros de validação
 */
const handleValidationErrors = (req, res, next) => {
    // Extrai os erros de validação, se houver
    const errors = validationResult(req);
    
    // Se houver erros, responde com status 400 e detalhes dos erros
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Erro de validação',
            errors: errors.array().map(err => ({
                // Retorna apenas os campos relevantes: nome do campo, valor e mensagem
                param: err.param,
                value: err.value,
                message: err.msg
            }))
        });
    }

    // Se não houver erros, continua para o próximo middleware ou rota
    next();
};

/**
 * Validações reutilizáveis para estudantes
 */
const estudanteValidations = {
    // Validação para o campo "nome"
    nome: check('nome')
        .notEmpty().withMessage('Nome é obrigatório') // Não pode ser vazio
        .isLength({ max: 100 }).withMessage('Máximo 100 caracteres'), // Máximo de 100 caracteres
    
    // Validação para o campo "turma"
    turma: check('turma')
        .notEmpty().withMessage('Turma é obrigatória') // Não pode ser vazia
        .isLength({ max: 20 }).withMessage('Máximo 20 caracteres'), // Máximo de 20 caracteres
    
    // Validação para o campo "id"
    id: check('id')
        .isInt().withMessage('ID deve ser um número inteiro') // Deve ser número inteiro
        .toInt(), // Converte o valor para inteiro
    
    // Validações para paginação (parâmetros de query string)
    paginacao: [
        // Validação para o parâmetro "page"
        query('page')
            .optional() // Campo opcional
            .isInt({ min: 1 }).withMessage('Página deve ser ≥ 1') // Se presente, deve ser inteiro ≥ 1
            .toInt(), // Converte para inteiro
        
        // Validação para o parâmetro "limit"
        query('limit')
            .optional() // Campo opcional
            .isInt({ min: 1, max: 100 }).withMessage('Limite deve ser 1-100') // Deve ser inteiro entre 1 e 100
            .toInt() // Converte para inteiro
    ]
};

// Exporta os middlewares para uso nas rotas
module.exports = {
    handleValidationErrors,
    estudanteValidations
};

const db = require('../config/db'); // Importa a configuração do banco de dados
const fs = require('fs').promises; // Importa o módulo de arquivos com suporte a Promises
const path = require('path'); // Importa o módulo de manipulação de caminhos
const { validationResult } = require('express-validator'); // Importa os validadores do Express
const createError = require('http-errors'); // Importa utilitário para criar erros HTTP personalizados

class EstudanteController { // Classe que agrupa os métodos relacionados aos estudantes
  /**
   * Remove um arquivo do sistema de arquivos
   */
  static async _removerArquivo(filename) { // Método privado para remover imagem de estudante
    try {
      const filePath = path.join(__dirname, '../public/uploads', filename); // Gera o caminho completo do arquivo
      await fs.unlink(filePath); // Remove o arquivo do sistema de arquivos
    } catch (err) {
      console.error('Erro ao remover arquivo:', err); // Loga erro, se houver
    }
  }

  /**
   * Cadastra um novo estudante
   */
  static async cadastrar(req, res, next) { // Método de cadastro de estudante
    try {
      const errors = validationResult(req); // Verifica se há erros de validação
      if (!errors.isEmpty()) { // Se houver erros...
        if (req.file) await this._removerArquivo(req.file.filename); // Remove o arquivo enviado, se houver
        return res.status(400).json({ // Retorna erro 400 com os erros
          status: 'error',
          errors: errors.array()
        });
      }

      const { nome, turma, email, telefone } = req.body; // Desestrutura os dados do corpo da requisição
      const foto = req.file?.filename || null; // Pega o nome do arquivo, se houver

      const [result] = await db.query( // Insere o estudante no banco de dados
        'INSERT INTO estudantes (nome, turma, foto, email, telefone) VALUES (?, ?, ?, ?, ?)',
        [nome, turma, foto, email, telefone]
      );

      const [estudante] = await db.query( // Busca o estudante recém-inserido
        'SELECT id, nome, turma, foto, email, telefone FROM estudantes WHERE id = ?',
        [result.insertId]
      );

      res.status(201).json({ // Retorna resposta de sucesso com status 201
        status: 'success',
        data: estudante[0]
      });

    } catch (error) {
      if (req.file) await this._removerArquivo(req.file.filename); // Remove a imagem, se houver, em caso de erro
      console.error('Erro ao cadastrar estudante:', error); // Exibe erro no console
      next(createError(500, 'Falha ao cadastrar estudante')); // Passa erro para middleware
    }
  }

  /**
   * Lista todos os estudantes (sem paginação)
   */
  static async listar(req, res, next) { // Método que lista todos os estudantes
    try {
      const [estudantes] = await db.query( // Consulta todos os estudantes, ordenando por nome
        'SELECT id, nome, turma, foto, email, telefone FROM estudantes ORDER BY nome ASC'
      );

      res.json(estudantes); // Retorna a lista como JSON

    } catch (error) {
      console.error('Erro ao listar estudantes:', error); // Exibe erro no console
      next(createError(500, 'Falha ao listar estudantes')); // Passa erro para middleware
    }
  }

  /**
   * Atualiza um estudante
   */
  static async editar(req, res, next) { // Método que edita um estudante existente
    try {
      const errors = validationResult(req); // Verifica erros de validação
      if (!errors.isEmpty()) {
        if (req.file) await this._removerArquivo(req.file.filename); // Remove imagem enviada, se houver erro
        return res.status(400).json({ errors: errors.array() }); // Retorna erros
      }

      const { id } = req.params; // ID do estudante na URL
      const { nome, turma, email, telefone } = req.body; // Dados do corpo
      const foto = req.file?.filename || null; // Nome da nova imagem, se enviada

      const [estudanteAtual] = await db.query( // Busca o estudante atual
        'SELECT foto FROM estudantes WHERE id = ?', 
        [id]
      );

      if (!estudanteAtual.length) { // Se não encontrou estudante
        if (req.file) await this._removerArquivo(req.file.filename); // Remove imagem nova, se enviada
        return next(createError(404, 'Estudante não encontrado')); // Retorna erro 404
      }

      await db.query( // Atualiza os dados do estudante
        'UPDATE estudantes SET nome = ?, turma = ?, email = ?, telefone = ?, foto = COALESCE(?, foto) WHERE id = ?',
        [nome, turma, email, telefone, foto, id]
      );

      if (req.file && estudanteAtual[0].foto) { // Se nova imagem enviada e havia imagem anterior
        await this._removerArquivo(estudanteAtual[0].foto); // Remove imagem anterior
      }

      const [estudante] = await db.query( // Busca dados atualizados
        'SELECT id, nome, turma, foto, email, telefone FROM estudantes WHERE id = ?',
        [id]
      );

      res.json({ // Retorna dados atualizados
        status: 'success',
        data: estudante[0]
      });

    } catch (error) {
      if (req.file) await this._removerArquivo(req.file.filename); // Remove nova imagem, se erro
      console.error('Erro ao editar estudante:', error); // Exibe erro no console
      next(createError(500, 'Falha ao editar estudante')); // Passa erro ao middleware
    }
  }

  /**
   * Remove um estudante
   */
  static async deletar(req, res, next) { // Método que remove um estudante
    try {
      const { id } = req.params; // ID do estudante

      const [estudante] = await db.query( // Busca a imagem do estudante
        'SELECT foto FROM estudantes WHERE id = ?',
        [id]
      );

      if (!estudante.length) { // Se não encontrou estudante
        return next(createError(404, 'Estudante não encontrado')); // Retorna erro 404
      }

      await db.query('DELETE FROM estudantes WHERE id = ?', [id]); // Remove estudante do banco

      if (estudante[0].foto) { // Se estudante tinha imagem
        await this._removerArquivo(estudante[0].foto); // Remove imagem do sistema de arquivos
      }

      res.json({ // Retorna mensagem de sucesso
        status: 'success',
        message: 'Estudante removido com sucesso'
      });

    } catch (error) {
      console.error('Erro ao deletar estudante:', error); // Exibe erro no console
      next(createError(500, 'Falha ao remover estudante')); // Passa erro para middleware
    }
  }
}

// Exportação para o Express — torna os métodos acessíveis como middleware
module.exports = {
  cadastrar: (req, res, next) => EstudanteController.cadastrar(req, res, next), // Rota POST
  listar: (req, res, next) => EstudanteController.listar(req, res, next), // Rota GET
  editar: (req, res, next) => EstudanteController.editar(req, res, next), // Rota PUT
  deletar: (req, res, next) => EstudanteController.deletar(req, res, next) // Rota DELETE
};

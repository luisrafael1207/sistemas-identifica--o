const db = require('../config/db');
const fs = require('fs').promises;
const path = require('path');
const { validationResult } = require('express-validator');
const createError = require('http-errors');

class EstudanteController {
  static async _removerArquivo(filename) {
    try {
      const filePath = path.join(__dirname, '../public/uploads', filename);
      await fs.unlink(filePath);
    } catch (err) {
      console.error('Erro ao remover arquivo:', err);
    }
  }

  static async cadastrar(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        if (req.file) await this._removerArquivo(req.file.filename);
        return res.status(400).json({ status: 'error', errors: errors.array() });
      }

      const { nome, turma, email, telefone } = req.body;
      const foto = req.file?.filename || null;

      const [result] = await db.query(
        'INSERT INTO estudantes (nome, turma, foto, email, telefone) VALUES (?, ?, ?, ?, ?)',
        [nome, turma, foto, email, telefone]
      );

      const [estudante] = await db.query('SELECT * FROM estudantes WHERE id = ?', [result.insertId]);

      res.status(201).json({ status: 'success', data: estudante[0] });
    } catch (error) {
      if (req.file) await this._removerArquivo(req.file.filename);
      console.error('Erro ao cadastrar estudante:', error);
      next(createError(500, 'Falha ao cadastrar estudante'));
    }
  }

  static async listar(req, res, next) {
    try {
      const { filtro } = req.query;
      let query = 'SELECT * FROM estudantes';
      const params = [];

      if (filtro) {
        query += ' WHERE nome LIKE ? OR turma LIKE ?';
        const likeFiltro = `%${filtro}%`;
        params.push(likeFiltro, likeFiltro);
      }

      query += ' ORDER BY nome ASC';
      const [estudantes] = await db.query(query, params);
      res.json(estudantes);
    } catch (error) {
      console.error('Erro ao listar estudantes:', error);
      next(createError(500, 'Falha ao listar estudantes'));
    }
  }

  static async editar(req, res, next) {
    try {
      const { id } = req.params;
      let { nome, turma, email, telefone, nota } = req.body;
      const foto = req.file?.filename || null;

      nota = nota === undefined || nota === '' ? null : parseFloat(nota);

      const [estudanteAtual] = await db.query('SELECT foto FROM estudantes WHERE id = ?', [id]);

      if (!estudanteAtual.length) {
        if (req.file) await this._removerArquivo(req.file.filename);
        return next(createError(404, 'Estudante não encontrado'));
      }

      const updates = [];
      const values = [];

      if (nome !== undefined) {
        updates.push('nome = ?');
        values.push(nome);
      }
      if (turma !== undefined) {
        updates.push('turma = ?');
        values.push(turma);
      }
      if (email !== undefined) {
        updates.push('email = ?');
        values.push(email);
      }
      if (telefone !== undefined) {
        updates.push('telefone = ?');
        values.push(telefone);
      }
      if (nota !== undefined) {
        updates.push('nota = ?');
        values.push(nota);
      }
      if (foto !== null) {
        updates.push('foto = ?');
        values.push(foto);
      }

      if (updates.length === 0) {
        return res.status(400).json({ message: 'Nenhum campo fornecido para atualização' });
      }

      const sql = `UPDATE estudantes SET ${updates.join(', ')} WHERE id = ?`;
      values.push(id);

      await db.query(sql, values);

      if (req.file && estudanteAtual[0].foto) {
        await this._removerArquivo(estudanteAtual[0].foto);
      }

      const [estudante] = await db.query('SELECT * FROM estudantes WHERE id = ?', [id]);

      res.json({ status: 'success', data: estudante[0] });
    } catch (error) {
      if (req.file) await this._removerArquivo(req.file.filename);
      console.error('Erro ao editar estudante:', error);
      next(createError(500, 'Falha ao editar estudante'));
    }
  }

  static async atualizarNota(req, res, next) {
    try {
      const { id } = req.params;
      let { nota } = req.body;

      nota = nota === undefined || nota === '' ? null : parseFloat(nota);

      const [resultado] = await db.query('UPDATE estudantes SET nota = ? WHERE id = ?', [nota, id]);

      if (resultado.affectedRows === 0) {
        return next(createError(404, 'Estudante não encontrado'));
      }

      const [estudante] = await db.query('SELECT * FROM estudantes WHERE id = ?', [id]);
      res.json({ status: 'success', data: estudante[0] });
    } catch (error) {
      console.error('Erro ao atualizar nota:', error);
      next(createError(500, 'Erro ao atualizar nota'));
    }
  }

  static async deletar(req, res, next) {
    try {
      const { id } = req.params;
      const [estudante] = await db.query('SELECT foto FROM estudantes WHERE id = ?', [id]);

      if (!estudante.length) return next(createError(404, 'Estudante não encontrado'));

      await db.query('DELETE FROM estudantes WHERE id = ?', [id]);

      if (estudante[0].foto) {
        await this._removerArquivo(estudante[0].foto);
      }

      res.json({ status: 'success', message: 'Estudante removido com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar estudante:', error);
      next(createError(500, 'Falha ao remover estudante'));
    }
  }
}

module.exports = {
  cadastrar: (req, res, next) => EstudanteController.cadastrar(req, res, next),
  listar: (req, res, next) => EstudanteController.listar(req, res, next),
  editar: (req, res, next) => EstudanteController.editar(req, res, next),
  deletar: (req, res, next) => EstudanteController.deletar(req, res, next),
  atualizarNota: (req, res, next) => EstudanteController.atualizarNota(req, res, next),
};

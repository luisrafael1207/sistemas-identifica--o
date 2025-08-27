// controllers/estudanteController.js
const db = require('../config/db');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { softSkillOptions } = require('../middleware/validationMiddleware');

// --- LISTAR ESTUDANTES ---
async function listar(req, res) {
  try {
    logger.info('Iniciando listagem de estudantes', { user: req.user?.id || 'anônimo' });

    const page = parseInt(req.query.page) || 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : null; // null = retorna todos
    const offset = limit ? (page - 1) * limit : 0;
    const filtro = req.query.filtro ? `%${req.query.filtro.toLowerCase()}%` : null;

    let sql = 'SELECT * FROM estudantes';
    let countSql = 'SELECT COUNT(*) as total FROM estudantes';
    const params = [];
    const countParams = [];

    if (filtro) {
      const where = `
        WHERE LOWER(nome) LIKE ? 
          OR LOWER(turma) LIKE ? 
          OR LOWER(COALESCE(softSkill,"")) LIKE ?
      `;
      sql += where;
      countSql += where;
      for (let i = 0; i < 3; i++) {
        params.push(filtro);
        countParams.push(filtro);
      }
    }

    sql += ' ORDER BY nome ASC';
    if (limit) {
      sql += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);
    }

    const [rows] = await db.query(sql, params);
    const [countResult] = await db.query(countSql, countParams);
    const total = countResult[0]?.total || 0;

    res.json({
      page: limit ? page : 1,
      limit: limit || total,
      total,
      totalPages: limit ? Math.ceil(total / limit) : 1,
      estudantes: rows
    });
  } catch (error) {
    logger.error('Erro ao listar estudantes', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Erro ao listar estudantes' });
  }
}

// --- DETALHAR ESTUDANTE ---
async function detalhar(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await db.execute('SELECT * FROM estudantes WHERE id = ?', [id]);
    if (!rows || rows.length === 0) return res.status(404).json({ message: 'Estudante não encontrado' });
    res.json(rows[0]);
  } catch (error) {
    logger.error('Erro ao detalhar estudante', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Erro ao detalhar estudante' });
  }
}

// --- CADASTRAR ESTUDANTE ---
async function cadastrar(req, res) {
  try {
    const { nome, email, telefone, turma } = req.body;
    const foto = req.file ? `/uploads/${req.file.filename}` : '/uploads/default.jpg';
    const [result] = await db.execute(
      'INSERT INTO estudantes (nome, email, telefone, turma, foto) VALUES (?, ?, ?, ?, ?)',
      [nome, email, telefone, turma, foto]
    );
    res.status(201).json({ success: true, id: result.insertId, message: 'Estudante cadastrado com sucesso' });
  } catch (error) {
    logger.error('Erro ao cadastrar estudante', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Erro ao cadastrar estudante' });
  }
}

// --- EDITAR ESTUDANTE ---
async function editar(req, res) {
  try {
    const { id } = req.params;
    const { nome, email, telefone, turma } = req.body;
    const novaFoto = req.file ? `/uploads/${req.file.filename}` : null;

    if (novaFoto) {
      const [antigo] = await db.execute('SELECT foto FROM estudantes WHERE id = ?', [id]);
      const nomeFotoAntiga = antigo[0]?.foto;
      if (nomeFotoAntiga && nomeFotoAntiga !== '/uploads/default.jpg') {
        const caminhoAntigo = path.join(__dirname, '../public', nomeFotoAntiga);
        fs.unlink(caminhoAntigo, err => {
          if (err) logger.warn('Falha ao remover foto antiga', { err, estudanteId: id });
        });
      }
    }

    const sql = novaFoto
      ? 'UPDATE estudantes SET nome = ?, email = ?, telefone = ?, turma = ?, foto = ? WHERE id = ?'
      : 'UPDATE estudantes SET nome = ?, email = ?, telefone = ?, turma = ? WHERE id = ?';
    const params = novaFoto
      ? [nome, email, telefone, turma, novaFoto, id]
      : [nome, email, telefone, turma, id];

    await db.execute(sql, params);
    res.json({ success: true, message: 'Estudante atualizado com sucesso' });
  } catch (error) {
    logger.error('Erro ao editar estudante', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Erro ao editar estudante' });
  }
}

// --- DELETAR ESTUDANTE ---
async function deletar(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await db.execute('SELECT foto FROM estudantes WHERE id = ?', [id]);
    const nomeFoto = rows[0]?.foto;
    if (nomeFoto && nomeFoto !== '/uploads/default.jpg') {
      const caminho = path.join(__dirname, '../public', nomeFoto);
      fs.unlink(caminho, err => {
        if (err) logger.warn('Falha ao excluir foto', { err, estudanteId: id });
      });
    }
    await db.execute('DELETE FROM estudantes WHERE id = ?', [id]);
    res.json({ success: true, message: 'Estudante removido com sucesso' });
  } catch (error) {
    logger.error('Erro ao deletar estudante', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Erro ao deletar estudante' });
  }
}

// --- ATUALIZAR CAMPO ESPECÍFICO (nota ou softSkill) ---
async function atualizarCampo(req, res) {
  try {
    const { id } = req.params;
    let { campo, valor } = req.body;

    const camposValidos = ['nota', 'softSkill'];
    if (!camposValidos.includes(campo)) {
      return res.status(400).json({ message: 'Campo inválido para atualização' });
    }

    if (campo === 'nota') {
      valor = parseFloat(valor);
      if (isNaN(valor) || valor < 0 || valor > 10) {
        return res.status(400).json({ message: 'Nota inválida, deve estar entre 0 e 10' });
      }
    }

    if (campo === 'softSkill') {
      const valorNormalizado = valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const softSkillOptionsNorm = softSkillOptions.map(v =>
        v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      );
      if (!softSkillOptionsNorm.includes(valorNormalizado)) {
        return res.status(400).json({ message: 'SoftSkill inválida' });
      }
    }

    const sql = `UPDATE estudantes SET ${campo} = ? WHERE id = ?`;
    await db.execute(sql, [valor, id]);

    const [rows] = await db.execute('SELECT * FROM estudantes WHERE id = ?', [id]);
    if (!rows || rows.length === 0) return res.status(404).json({ message: 'Estudante não encontrado' });

    res.json({ success: true, estudante: rows[0], message: `${campo} atualizado com sucesso` });
  } catch (error) {
    logger.error('Erro ao atualizar campo do estudante', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Erro ao atualizar campo do estudante' });
  }
}

// --- ATUALIZAR ESTUDANTE (nota e/ou softSkill juntos) ---
async function atualizarEstudante(req, res) {
  try {
    const { id } = req.params;
    let { nota, softSkill } = req.body;

    const updates = [];
    const params = [];

    if (nota !== undefined) {
      nota = parseFloat(nota);
      if (isNaN(nota) || nota < 0 || nota > 10) {
        return res.status(400).json({ message: 'Nota inválida, deve estar entre 0 e 10' });
      }
      updates.push('nota = ?');
      params.push(nota);
    }

    if (softSkill !== undefined) {
      const softSkillOptionsNorm = softSkillOptions.map(v =>
        v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      );
      const valorNorm = softSkill.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      if (!softSkillOptionsNorm.includes(valorNorm)) {
        return res.status(400).json({ message: 'SoftSkill inválida' });
      }
      updates.push('softSkill = ?');
      params.push(softSkill);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'Nenhum campo válido para atualizar' });
    }

    params.push(id);
    const sql = `UPDATE estudantes SET ${updates.join(', ')} WHERE id = ?`;
    await db.execute(sql, params);

    const [rows] = await db.execute('SELECT * FROM estudantes WHERE id = ?', [id]);
    if (!rows || rows.length === 0) return res.status(404).json({ message: 'Estudante não encontrado' });

    res.json({ success: true, estudante: rows[0], message: 'Estudante atualizado com sucesso' });
  } catch (error) {
    logger.error('Erro ao atualizar estudante', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Erro ao atualizar estudante' });
  }
}

module.exports = {
  listar,
  detalhar,
  cadastrar,
  editar,
  deletar,
  atualizarCampo,
  atualizarEstudante
};

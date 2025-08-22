// controllers/authController.js

const db = require('../config/db');
const { validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'chave_secreta_jwt';
const JWT_EXPIRATION = '24h';

// ----- CADASTRO DE USUÁRIO -----
exports.cadastrarUsuario = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Tentativa de cadastro com dados inválidos', { errors: errors.array() });
    return res.status(400).json({ errors: errors.array() });
  }

  const { nome, email, senha } = req.body;
  let { tipo } = req.body;

  // Se tipo não informado, assume admin
  tipo = tipo || 'admin';

  if (tipo !== 'admin' && tipo !== 'professor') {
    logger.warn(`Tipo de usuário inválido: ${tipo}`);
    return res.status(400).json({ success: false, message: 'Tipo de usuário inválido. Escolha entre "admin" ou "professor".' });
  }

  try {
    // Verifica se email já existe
    const [jaExiste] = await db.execute('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (jaExiste.length > 0) {
      logger.warn(`Email já cadastrado: ${email}`);
      return res.status(409).json({ success: false, message: 'Email já cadastrado' });
    }

    // Criptografa senha
    const senhaCriptografada = await bcrypt.hash(senha, 10);

    // Insere usuário no banco
    const [resultado] = await db.execute(
      'INSERT INTO usuarios (nome, email, senha, tipo) VALUES (?, ?, ?, ?)',
      [nome, email, senhaCriptografada, tipo]
    );

    logger.info(`Usuário cadastrado com sucesso: ${email} (tipo: ${tipo})`);

    return res.status(201).json({
      success: true,
      message: 'Usuário cadastrado com sucesso',
      userId: resultado.insertId,
      tipo,
      email,
      nome
    });
  } catch (error) {
    logger.error('Erro ao cadastrar usuário', { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, message: 'Erro no servidor' });
  }
};

// ----- LOGIN -----
exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Tentativa de login com dados inválidos', { errors: errors.array() });
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, senha } = req.body;

  try {
    const [rows] = await db.execute('SELECT * FROM usuarios WHERE email = ?', [email]);
    if (rows.length === 0) {
      logger.warn(`Login falhou - email não encontrado: ${email}`);
      return res.status(401).json({ success: false, message: 'Credenciais inválidas' });
    }

    const usuario = rows[0];
    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      logger.warn(`Login falhou - senha incorreta: ${email}`);
      return res.status(401).json({ success: false, message: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      { id: usuario.id, tipo: usuario.tipo, nome: usuario.nome },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRATION }
    );

    logger.info(`Login bem-sucedido: ${email}`);

    return res.json({
      success: true,
      token,
      user: { id: usuario.id, nome: usuario.nome, tipo: usuario.tipo }
    });
  } catch (error) {
    logger.error('Erro ao realizar login', { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, message: 'Erro no servidor' });
  }
};

// ----- LOGOUT -----
exports.logout = (req, res) => {
  if (req.session) {
    req.session.destroy(err => {
      if (err) {
        logger.error('Erro ao encerrar sessão', { error: err });
        return res.status(500).json({ success: false, message: 'Erro ao encerrar sessão' });
      }
      res.clearCookie('connect.sid');
      logger.info('Logout bem-sucedido');
      return res.json({ success: true, message: 'Logout realizado com sucesso' });
    });
  } else {
    logger.info('Logout realizado sem sessão');
    return res.json({ success: true, message: 'Logout realizado' });
  }
};

// ----- VERIFICAÇÃO DE AUTENTICAÇÃO -----
exports.checkAuth = async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ authenticated: false, message: 'Token não fornecido' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return res.json({ authenticated: true, user: decoded });
  } catch (error) {
    logger.warn('Token inválido ou expirado', { error: error.message });
    return res.status(403).json({ authenticated: false, message: 'Token inválido ou expirado' });
  }
};

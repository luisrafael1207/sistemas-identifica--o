const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const db = require('../config/db');
const {
  usuarioValidations,
  handleValidationErrors,
} = require('../middleware/validationMiddleware');
const AuthMiddleware = require('../middleware/authMiddleware');

// ======================
// 🔑 ROTAS DE AUTENTICAÇÃO
// ======================

// ----- LOGIN -----
router.post(
  '/login',
  usuarioValidations.login,
  handleValidationErrors,
  authController.login
);

// ----- LOGOUT -----
router.post('/logout', authController.logout);

// ----- CADASTRO DE USUÁRIO -----
// Somente administradores podem cadastrar novos usuários
router.post(
  '/cadastrar',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize(['admin']),
  usuarioValidations.register,
  handleValidationErrors,
  authController.cadastrarUsuario
);

// ----- VERIFICAÇÃO DE SESSÃO -----
router.get('/verificar', AuthMiddleware.authenticate, authController.checkAuth);

// ----- VERIFICAR SE EMAIL JÁ EXISTE -----
router.get('/verificar-email', async (req, res) => {
  const email = req.query.email;
  if (!email) {
    return res
      .status(400)
      .json({ exists: false, message: 'Email não fornecido' });
  }

  try {
    const [rows] = await db.execute(
      'SELECT id FROM usuarios WHERE email = ?',
      [email]
    );
    return res.json({ exists: rows.length > 0 });
  } catch (error) {
    console.error('Erro ao verificar email:', error);
    return res
      .status(500)
      .json({ exists: false, message: 'Erro no servidor' });
  }
});

// ----- VERIFICAR SENHA DE CONFIGURAÇÕES -----
// Usada para liberar formulário de cadastro de administradores
router.post('/check-config-pass', (req, res) => {
  const { password } = req.body;
  if (!password)
    return res.status(400).json({ message: 'Senha não fornecida' });

  const CONFIG_PASS = process.env.CONFIG_PASSWORD || 'admin123';

  if (password === CONFIG_PASS) {
    return res.status(200).json({ message: 'Senha correta' });
  } else {
    return res.status(401).json({ message: 'Senha incorreta' });
  }
});

module.exports = router;

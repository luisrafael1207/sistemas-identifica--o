const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const db = require('../config/db');
// Importa o objeto de validações com o nome correto
const { usuarioValidations, handleValidationErrors } = require('../middleware/validationMiddleware');

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
router.post(
  '/cadastrar',
  usuarioValidations.register, // Garante que a função de validação seja a correta
  handleValidationErrors,
  authController.cadastrarUsuario
);

// ----- VERIFICAÇÃO DE SESSÃO -----
router.get('/verificar', authController.checkAuth);

// ----- VERIFICAR SE EMAIL JÁ EXISTE -----
router.get('/verificar-email', async (req, res) => {
  const email = req.query.email;
  if (!email) {
    return res.status(400).json({ exists: false, message: 'Email não fornecido' });
  }

  try {
    const [rows] = await db.execute('SELECT id FROM usuarios WHERE email = ?', [email]);
    return res.json({ exists: rows.length > 0 });
  } catch (error) {
    console.error('Erro ao verificar email:', error);
    return res.status(500).json({ exists: false, message: 'Erro no servidor' });
  }
});

module.exports = router;

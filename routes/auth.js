// 📦 Importa o framework Express, que será usado para criar e organizar rotas
const express = require('express');

// 🛠 Cria uma instância do roteador do Express
const router = express.Router();

// 🔐 Importa o controlador de autenticação, que contém a lógica para login, logout e verificação
const authController = require('../controllers/authController');

// ✅ Rota de login
// POST /auth/login → envia email e senha, e retorna dados do usuário + token (ou sessão)
router.post('/login', authController.login);

// 🚪 Rota de logout
// POST /auth/logout → encerra a sessão ou limpa o cookie com o token
router.post('/logout', authController.logout);

// 🔍 Rota para verificar se o usuário está autenticado
// GET /auth/check → retorna status de autenticação
router.get('/check', authController.checkAuth);

// 📤 Exporta o roteador para ser usado no server.js
module.exports = router;

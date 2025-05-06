const db = require('../config/db');
const { validationResult } = require('express-validator');

// 🔐 Login do usuário
exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, senha } = req.body;

  try {
    const [users] = await db.promise().query(
      'SELECT id, nome, email, tipo FROM usuarios WHERE email = ? AND senha = ?',
      [email, senha]
    );

    if (!users || users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas'
      });
    }

    const user = users[0];

    req.session.user = {
      id: user.id,
      nome: user.nome,
      email: user.email,
      tipo: user.tipo || 'user',
      loggedIn: true
    };

    req.session.save(err => {
      if (err) {
        console.error('Erro ao salvar sessão:', err);
        return res.status(500).json({
          success: false,
          message: 'Erro no servidor'
        });
      }

      // Retorna dados + instrução de redirecionamento
      res.json({
        success: true,
        user: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          tipo: user.tipo
        },
        redirectTo: 'cadastro.html'
      });
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
};

// 🚪 Logout do usuário
exports.logout = (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Erro ao fazer logout:', err);
      return res.status(500).json({
        success: false,
        message: 'Erro ao fazer logout'
      });
    }

    res.clearCookie('connect.sid'); // cookie padrão do express-session
    res.json({
      success: true,
      message: 'Logout realizado com sucesso',
      redirectTo: 'login.html'
    });
  });
};

// 🔍 Verificação de autenticação
exports.checkAuth = (req, res) => {
  if (req.session.user && req.session.user.loggedIn) {
    res.json({
      success: true,
      user: {
        id: req.session.user.id,
        nome: req.session.user.nome,
        email: req.session.user.email,
        tipo: req.session.user.tipo
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Não autenticado'
    });
  }
};

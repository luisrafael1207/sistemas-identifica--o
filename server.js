require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const session = require('express-session');

const authRoutes = require('./routes/auth');
const estudantesRoutes = require('./routes/estudantes');
const estudanteController = require('./controllers/estudanteController');
const logger = require('./utils/logger');
const AuthMiddleware = require('./middleware/authMiddleware');
const { testarConexao } = require('./config/db');

const app = express();
const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'segredo_super_secreto';

// -----------------------------
// CORS - Origens Permitidas
// -----------------------------
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:5500'];

// -----------------------------
// Middleware de Segurança
// -----------------------------
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    const msg = `CORS: origem não permitida: ${origin}`;
    logger.warn(msg);
    return callback(new Error(msg), false);
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// -----------------------------
// Sessão
// -----------------------------
app.use(session({
  secret: process.env.SESSION_SECRET || 'seuSegredoMuitoForteAqui',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 },
}));

// -----------------------------
// Logger de requisições HTTP
// -----------------------------
app.use(morgan('combined', {
  skip: (req, res) => res.statusCode >= 400,
  stream: { write: message => logger.info(message.trim()) },
}));
app.use(morgan('combined', {
  skip: (req, res) => res.statusCode < 400,
  stream: { write: message => logger.warn(message.trim()) },
}));

// -----------------------------
// Middleware JWT
// -----------------------------
function autenticarJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'Token não fornecido' });

  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token inválido ou expirado' });
    req.user = user;
    next();
  });
}

// -----------------------------
// Arquivos estáticos
// -----------------------------
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use('/models', express.static(path.join(__dirname, 'models')));

// -----------------------------
// Rotas públicas
// -----------------------------
app.use('/auth', authRoutes);

// -----------------------------
// Rotas protegidas - apenas admin
// -----------------------------
app.use('/estudantes', AuthMiddleware.authenticate, AuthMiddleware.authorize(['admin']), estudantesRoutes);

// PATCH para atualizar campos específicos (nota e softSkill)
app.patch('/estudantes/:id/campo',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize(['admin']),
  async (req, res) => {
    const { id } = req.params;
    const { campo, valor } = req.body;

    if (!campo || typeof valor === 'undefined') 
      return res.status(400).json({ message: 'Campo ou valor ausente' });

    try {
      const estudante = await estudanteController.atualizarCampo(id, campo, valor);
      if (!estudante) return res.status(404).json({ message: 'Estudante não encontrado' });
      res.json({ success: true, estudante });
    } catch (err) {
      logger.error('Erro ao atualizar campo do estudante', { err });
      res.status(500).json({ message: 'Erro interno ao atualizar estudante' });
    }
  }
);

// Rota de reconhecimento facial simulada
app.post('/reconhecer', AuthMiddleware.authenticate, (req, res) => {
  logger.info('📸 Requisição de reconhecimento facial recebida');
  setTimeout(() => {
    res.json({
      success: true,
      nome: "Estudante Exemplo",
      message: "Reconhecimento simulado - implemente integração real"
    });
  }, 1000);
});

// -----------------------------
// Middleware global de erro
// -----------------------------
app.use((err, req, res, next) => {
  logger.error(`Erro inesperado: ${err.message}`, { stack: err.stack });
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Erro interno no servidor' });
});

// -----------------------------
// Inicialização do servidor
// -----------------------------
async function startServer() {
  try {
    await testarConexao();

    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`
      ███████╗███████╗██████╗ ██╗   ██╗███████╗██████╗ 
      ██╔════╝██╔════╝██╔══██╗██║   ██║██╔════╝██╔══██╗
      ███████╗█████╗  ██████╔╝██║   ██║█████╗  ██████╔╝
      ╚════██║██╔══╝  ██╔══██╗╚██╗ ██╔╝██╔══╝  ██╔══██╗
      ███████║███████╗██║  ██║ ╚████╔╝ ███████╗██║  ██║
      ╚══════╝╚══════╝╚═╝  ╚═╝  ╚═══╝  ╚══════╝╚═╝  ╚═╝
      `);
      logger.info(`✅ Servidor rodando na porta ${PORT}`);
      logger.info(`🌐 Ambiente: ${NODE_ENV}`);
      logger.info(`🔗 Origens permitidas: ${allowedOrigins.join(', ')}`);
      logger.info(`📅 Iniciado em: ${new Date().toLocaleString()}`);
    });

    function shutdown() {
      logger.info('🛑 Servidor encerrando...');
      server.close(() => {
        logger.info('🔴 Servidor encerrado');
        process.exit(0);
      });
    }

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    logger.error('❌ Falha ao conectar ao banco. Servidor não iniciado.', { error });
    process.exit(1);
  }
}

startServer();

module.exports = { autenticarJWT };

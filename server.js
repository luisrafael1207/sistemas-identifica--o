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
const CONFIG_PASSWORD = process.env.CONFIG_PASSWORD || 'admin123';

// -----------------------------
// CORS - Origens Permitidas e Lógica Dinâmica
// -----------------------------
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5500'
];

// Função para verificar se é um IP de rede local (Ex: 192.168.x.x)
const isLocalNetwork = (origin) => {
  return /^(http|https):\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1]))/.test(origin);
};

// -----------------------------
// Middleware de Segurança
// -----------------------------
app.use(helmet({
  contentSecurityPolicy: false, // Desativado temporariamente para evitar conflitos de carregamento de scripts no front
}));

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requisições sem origem (como apps mobile nativos, curl, postman)
    if (!origin) return callback(null, true);

    // Verificar se está na lista branca exata
    if (allowedOrigins.includes(origin)) return callback(null, true);

    // CORREÇÃO PARA CELULAR: Permitir IPs da rede local dinamicamente em desenvolvimento
    if (NODE_ENV === 'development' && isLocalNetwork(origin)) {
      return callback(null, true);
    }

    const msg = `CORS: origem não permitida: ${origin}`;
    logger.warn(msg);
    return callback(new Error(msg), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-config-senha']
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
  cookie: { 
    secure: false, // Deve ser false se não estiver usando HTTPS
    httpOnly: true, 
    maxAge: 24 * 60 * 60 * 1000 
  },
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
// Middleware JWT simples
// -----------------------------
function autenticarJWT(req, res, next) {
  const authHeader = req.headers.authorization || req.cookies?.token;

  if (!authHeader) {
    // Se for uma requisição de API (JSON), retorna 401 JSON. Se for navegador, manda login.html
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(401).json({ message: 'Token não fornecido' });
    }
    return res.status(401).sendFile(path.join(__dirname, 'public', 'login.html'));
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(403).json({ message: 'Token inválido' });
        }
        return res.status(403).sendFile(path.join(__dirname, 'public', 'login.html'));
    }
    req.user = user;
    next();
  });
}

// -----------------------------
// Middleware para validar senha de Configurações
// -----------------------------
function validarConfigSenha(req, res, next) {
  const senha = req.headers['x-config-senha'] || req.body.configSenha || req.query?.configSenha;
  
  if (!senha || senha !== CONFIG_PASSWORD) {
    return res.status(403).send('Senha de configuração inválida');
  }
  next();
}

// -----------------------------
// Arquivos estáticos
// -----------------------------
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use('/models', express.static(path.join(__dirname, 'models')));

app.get('/', (req, res) => {
    res.redirect('/login.html'); 
});

// -----------------------------
// Rotas públicas
// -----------------------------
app.use('/auth', authRoutes);

// -----------------------------
// Rotas protegidas por JWT
// -----------------------------
app.get('/cadastro', autenticarJWT, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'cadastro.html'));
});

app.get('/cadastro-usuario', autenticarJWT, validarConfigSenha, (req, res) => {
  if (req.user.tipo !== 'admin') return res.status(403).send('Acesso negado');
  res.sendFile(path.join(__dirname, 'public', 'cadastroUsuario.html'));
});

// -----------------------------
// Rotas de estudantes - apenas admin
// -----------------------------
app.use('/estudantes', 
  AuthMiddleware.authenticate, 
  AuthMiddleware.authorize(['admin']), 
  estudantesRoutes
);

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

// -----------------------------
// Rota de reconhecimento facial simulada
// -----------------------------
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
    
    // '0.0.0.0' é essencial para acesso externo (celular)
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
      logger.info(`📅 Iniciado em: ${new Date().toLocaleString()}`);
      logger.info(`📱 Acesso via rede local habilitado (CORS dinâmico)`);
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

module.exports = { autenticarJWT, validarConfigSenha };
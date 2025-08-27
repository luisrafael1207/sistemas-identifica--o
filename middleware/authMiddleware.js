const db = require('../config/db');
const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');

const ERROR_CODES = {
  NOT_AUTHENTICATED: 'NOT_AUTHENTICATED',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  AUTHENTICATION_FAILURE: 'AUTHENTICATION_FAILURE',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  AUTHORIZATION_FAILURE: 'AUTHORIZATION_FAILURE',
};

class AuthMiddleware {
  // --- AUTENTICAÇÃO (JWT) ---
  static async authenticate(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ')
        ? authHeader.split(' ')[1]
        : null;

      if (!token) {
        logger.warn('Usuário não autenticado (token não fornecido)');
        return AuthMiddleware._handleUnauthorized(req, res, {
          code: ERROR_CODES.NOT_AUTHENTICATED,
          message: 'Token não fornecido',
        });
      }

      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET || 'chave_secreta_jwt');
      } catch (err) {
        logger.warn('Token JWT inválido ou expirado');
        return AuthMiddleware._handleUnauthorized(req, res, {
          code: ERROR_CODES.NOT_AUTHENTICATED,
          message: 'Token inválido ou expirado',
        });
      }

      const [users] = await db.query(
        'SELECT id, nome, email, tipo, ativo FROM usuarios WHERE id = ? AND ativo = 1',
        [decoded.id]
      );

      if (!users || users.length === 0) {
        logger.warn(`Usuário não encontrado ou inativo: ID ${decoded.id}`);
        return AuthMiddleware._handleUnauthorized(req, res, {
          code: ERROR_CODES.USER_NOT_FOUND,
          message: 'Usuário não encontrado ou conta desativada',
        });
      }

      req.user = users[0];
      logger.info(`Usuário autenticado: ID ${req.user.id}, Tipo: ${req.user.tipo}`);
      next();
    } catch (error) {
      logger.error('Erro na autenticação', { message: error.message, stack: error.stack });
      res.status(500).json({
        status: 'error',
        code: ERROR_CODES.AUTHENTICATION_FAILURE,
        message: 'Falha na autenticação',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  // --- AUTORIZAÇÃO POR ROLE ---
  static authorize(roles = []) {
    return (req, res, next) => {
      try {
        if (!req.user) {
          logger.warn('Usuário não autenticado na autorização');
          return AuthMiddleware._handleUnauthorized(req, res, {
            code: ERROR_CODES.UNAUTHORIZED,
            message: 'Usuário não autenticado',
          });
        }

        if (roles.length > 0 && !roles.includes(req.user.tipo)) {
          logger.warn(
            `Acesso não autorizado. Role necessária: ${roles.join(', ')}. Usuário: ${req.user.tipo}`
          );
          return res.status(403).json({
            status: 'error',
            code: ERROR_CODES.FORBIDDEN,
            message: 'Acesso não autorizado',
            details: `Requer role: ${roles.join(', ')}`,
          });
        }

        next();
      } catch (error) {
        logger.error('Erro na autorização', { message: error.message, stack: error.stack });
        res.status(500).json({
          status: 'error',
          code: ERROR_CODES.AUTHORIZATION_FAILURE,
          message: 'Falha na autorização',
        });
      }
    };
  }

  // --- Função auxiliar ---
  static _handleUnauthorized(req, res, errorData) {
    const isHtmlRequest =
      req.headers.accept?.includes('text/html') ||
      req.originalUrl.endsWith('.html');

    if (isHtmlRequest) {
      return res.redirect('/login.html');
    }

    return res.status(401).json({
      status: 'error',
      ...errorData,
    });
  }
}

module.exports = AuthMiddleware;
module.exports.ERROR_CODES = ERROR_CODES;

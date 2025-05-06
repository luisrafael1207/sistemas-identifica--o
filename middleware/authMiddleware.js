// Importa a conexão com o banco de dados
const db = require('../config/db');

// Define a classe AuthMiddleware que conterá os middlewares de autenticação e autorização
class AuthMiddleware {
  /**
   * Middleware de autenticação por sessão
   * @param {Object} req - Objeto de requisição
   * @param {Object} res - Objeto de resposta
   * @param {Function} next - Função next do Express
   */
  static async authenticate(req, res, next) {
    try {
      // 1. Verifica se há uma sessão ativa com um usuário logado
      if (!req.session || !req.session.user) {
        // Se não houver, retorna erro 401 (não autenticado)
        return res.status(401).json({ 
          status: 'error',
          code: 'NOT_AUTHENTICATED',
          message: 'Usuário não autenticado'
        });
      }

      // 2. Busca no banco de dados o usuário da sessão, confirmando se ele está ativo
      const [user] = await db.query(
        'SELECT id, email, role, ativo FROM usuarios WHERE id = ? AND ativo = 1',
        [req.session.user.id]
      );

      // Se o usuário não for encontrado ou estiver inativo
      if (!user) {
        // Destrói a sessão
        req.session.destroy();
        // Retorna erro 401 informando que o usuário não foi encontrado ou está desativado
        return res.status(401).json({
          status: 'error',
          code: 'USER_NOT_FOUND',
          message: 'Usuário não encontrado ou conta desativada'
        });
      }

      // 3. Se o usuário for válido, anexa os dados dele ao objeto de requisição
      req.user = user;
      // Chama o próximo middleware ou rota
      next();
    } catch (error) {
      // Em caso de erro inesperado, registra no console
      console.error('🔒 Authentication error:', error);
      
      // Retorna erro 500 informando falha na autenticação
      res.status(500).json({
        status: 'error',
        code: 'AUTHENTICATION_FAILURE',
        message: 'Falha na autenticação',
        // Se estiver em modo de desenvolvimento, mostra detalhes do erro
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Middleware de autorização baseado em roles (funções)
   * @param {Array<string>} roles - Lista de roles permitidas
   * @returns {Function} Middleware function
   */
  static authorize(roles = []) {
    // Retorna uma função middleware personalizada
    return (req, res, next) => {
      try {
        // Verifica se o usuário foi autenticado
        if (!req.user) {
          return res.status(401).json({
            status: 'error',
            code: 'UNAUTHORIZED',
            message: 'Usuário não autenticado'
          });
        }

        // Verifica se o usuário possui uma das roles permitidas
        if (roles.length > 0 && !roles.includes(req.user.role)) {
          return res.status(403).json({
            status: 'error',
            code: 'FORBIDDEN',
            message: 'Acesso não autorizado',
            details: `Requer role: ${roles.join(', ')}`
          });
        }

        // Se tudo estiver certo, segue para o próximo middleware ou rota
        next();
      } catch (error) {
        // Em caso de erro inesperado, registra no console
        console.error('🔒 Authorization error:', error);
        // Retorna erro 500 informando falha na autorização
        res.status(500).json({
          status: 'error',
          code: 'AUTHORIZATION_FAILURE',
          message: 'Falha na autorização'
        });
      }
    };
  }
}

// Exporta a classe para uso em outras partes do sistema
module.exports = AuthMiddleware;

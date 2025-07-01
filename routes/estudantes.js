const express = require('express');
const router = express.Router();

const estudanteController = require('../controllers/estudanteController');
const multer = require('../config/multerConfig');
const { estudanteValidations, handleValidationErrors } = require('../middleware/validationMiddleware');
const AuthMiddleware = require('../middleware/authMiddleware');

// Aplica autenticação em todas as rotas
router.use(AuthMiddleware.authenticate);

// Listar todos os estudantes (com filtro opcional ?filtro=nome_ou_turma)
router.get('/', estudanteController.listar);

// Obter estudante por ID (usado no detalhar)
router.get('/:id', estudanteController.listar);

// Cadastrar novo estudante (form-data com imagem)
router.post(
  '/',
  multer.single('foto'),
  estudanteValidations.nome,
  estudanteValidations.turma,
  handleValidationErrors,
  estudanteController.cadastrar
);

// Atualizar dados completos do estudante (form-data com imagem)
router.put('/:id',
  multer.single('foto'),
  estudanteController.editar
);

// Atualizar apenas a nota (JSON puro)
router.put('/:id/nota',
  estudanteController.atualizarNota
);

// Deletar estudante
router.delete('/:id', estudanteController.deletar);

module.exports = router;

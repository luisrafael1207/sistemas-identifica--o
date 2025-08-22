const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const estudantesController = require('../controllers/estudanteController');
const { estudanteValidations, handleValidationErrors } = require('../middleware/validationMiddleware');
const AuthMiddleware = require('../middleware/authMiddleware');

// --- Configuração multer para upload de fotos ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Tipo de arquivo não suportado'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// --- Middleware de autenticação ---
router.use(AuthMiddleware.authenticate);

// ------------------ Rotas ------------------ //

// ✅ Listar estudantes
router.get(
  '/',
  estudanteValidations.paginacao,
  estudanteValidations.filtro,
  handleValidationErrors,
  estudantesController.listar
);

// ✅ Detalhar estudante por ID
router.get(
  '/:id',
  estudanteValidations.idParam,
  handleValidationErrors,
  estudantesController.detalhar
);

// ✅ Cadastrar estudante
router.post(
  '/',
  (req, res, next) => upload.single('foto')(req, res, err => {
    if (err) return res.status(400).json({ message: err.message });
    next();
  }),
  estudanteValidations.criarOuAtualizar,
  handleValidationErrors,
  estudantesController.cadastrar
);

// ✅ Editar estudante
router.put(
  '/:id',
  (req, res, next) => upload.single('foto')(req, res, err => {
    if (err) return res.status(400).json({ message: err.message });
    next();
  }),
  estudanteValidations.idParam,
  estudanteValidations.criarOuAtualizar,
  handleValidationErrors,
  estudantesController.editar
);

// ✅ Deletar estudante
router.delete(
  '/:id',
  estudanteValidations.idParam,
  handleValidationErrors,
  estudantesController.deletar
);

// ✅ Atualizar nota e/ou softSkill juntos
router.patch(
  '/:id',
  estudanteValidations.atualizarEstudante,
  handleValidationErrors,
  estudantesController.atualizarEstudante
);

// ✅ Atualizar campo específico (PATCH)
router.patch(
  '/:id/campo',
  estudanteValidations.atualizarCampo,
  handleValidationErrors,
  estudantesController.atualizarCampo
);

module.exports = router;

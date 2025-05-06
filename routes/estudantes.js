// Importa o módulo express
const express = require('express');

// Cria um roteador do Express
const router = express.Router();

// Importa o multer para lidar com upload de arquivos
const multer = require('multer');

// Importa o path para manipulação de caminhos de arquivos
const path = require('path');

// Importa o método body do express-validator para validação dos dados
const { body } = require('express-validator');

// Importa o controller que contém as funções que executam as lógicas de cada rota
const estudanteController = require('../controllers/estudanteController');

// Configuração do multer para armazenar as imagens no disco
const storage = multer.diskStorage({
  // Define o diretório de destino dos arquivos enviados
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/uploads'));
  },
  // Define o nome do arquivo salvo (com timestamp para evitar conflitos)
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

// Cria o middleware de upload com configuração de armazenamento e filtro de arquivos
const upload = multer({
  storage,
  // Define quais tipos de arquivos são permitidos
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase(); // Pega a extensão do arquivo
    if (!['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
      // Rejeita arquivos que não são imagens
      return cb(new Error('Somente imagens são permitidas'));
    }
    cb(null, true); // Aceita o arquivo
  }
});

// Array de validações para os campos do formulário
const validacoes = [
  // Campo 'nome' é obrigatório e sem espaços em branco
  body('nome').trim().notEmpty().withMessage('Nome é obrigatório'),
  // Campo 'turma' é obrigatório
  body('turma').trim().notEmpty().withMessage('Turma é obrigatória'),
  // Campo 'email' é opcional, mas se fornecido, deve ser válido
  body('email').optional().isEmail().withMessage('E-mail inválido'),
  // Campo 'telefone' é opcional, mas se fornecido, deve ser um número de telefone válido do Brasil
  body('telefone').optional().isMobilePhone('pt-BR').withMessage('Telefone inválido')
];

// Rotas

// Rota POST para cadastrar um novo estudante (com upload de foto e validações)
router.post('/', upload.single('foto'), validacoes, estudanteController.cadastrar);

// Rota GET para listar todos os estudantes
router.get('/', estudanteController.listar);

// Rota PUT para editar um estudante com ID específico (com upload de nova foto e validações)
router.put('/:id', upload.single('foto'), validacoes, estudanteController.editar);

// Rota DELETE para excluir um estudante com ID específico
router.delete('/:id', estudanteController.deletar);

// Exporta o roteador para ser utilizado no app principal
module.exports = router;

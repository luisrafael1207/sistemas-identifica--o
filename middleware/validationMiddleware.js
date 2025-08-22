const { check, validationResult, query, param, body } = require('express-validator');

const MENSAGENS = {
  // Estudante
  NOME_OBRIGATORIO: 'Nome é obrigatório',
  NOME_MAX_CARACTERES: 'Máximo de 100 caracteres no nome',
  TURMA_OBRIGATORIA: 'Turma é obrigatória',
  TURMA_INVALIDA: 'Turma inválida',
  EMAIL_INVALIDO: 'Email inválido',
  EMAIL_MAX_CARACTERES: 'Máximo de 100 caracteres no email',
  TELEFONE_OBRIGATORIO: 'Telefone é obrigatório',
  TELEFONE_TAMANHO: 'Telefone deve ter entre 8 e 20 caracteres',
  NOTA_INTERVALO: 'Nota deve ser um número entre 0 e 10',
  SOFTSKILL_INVALIDA: 'SoftSkill inválida. Opções: Excelente, Boa, Regular, Ruim',
  ID_INVALIDO: 'ID deve ser um número inteiro positivo',
  PAGINA_INVALIDA: 'Página deve ser um número inteiro maior ou igual a 1',
  LIMITE_INVALIDO: 'Limite deve ser entre 1 e 100',
  FILTRO_MAX_CARACTERES: 'Filtro deve ter no máximo 100 caracteres',
  CAMPO_OBRIGATORIO: 'Campo é obrigatório',
  VALOR_OBRIGATORIO: 'Valor é obrigatório',
  CAMPO_INVALIDO: 'Campo inválido para atualização',

  // Usuário
  NOME_USUARIO_OBRIGATORIO: 'Nome é obrigatório para cadastro',
  NOME_USUARIO_MIN: 'O nome deve ter no mínimo 3 caracteres',
  SENHA_OBRIGATORIA: 'Senha é obrigatória',
  SENHA_MIN: 'A senha deve ter pelo menos 6 caracteres',
  TIPO_USUARIO_INVALIDO: "O tipo de usuário deve ser 'aluno', 'professor' ou 'admin'",
  EMAIL_OBRIGATORIO: 'E-mail é obrigatório'
};

const softSkillOptions = ['Comunicação', 'Trabalho em Equipe', 'Motivação', 'Criatividade', 'Flexibilidade', 'Liderança'];

const turmasValidas = [
  '1º Informática A', '1º Informática B',
  '2º Informática A', '2º Informática B',
  '3º Informática A', '3º Informática B',
  'Redes fase 1', 'Redes fase 2',
  'Redes fase 3', 'Redes fase 4',
  'Redes fase 5', 'Redes fase 6'
];

// ====================== ESTUDANTES ======================
const estudanteValidations = {
  criarOuAtualizar: [
    check('nome').trim().notEmpty().withMessage(MENSAGENS.NOME_OBRIGATORIO).isLength({ max: 100 }).withMessage(MENSAGENS.NOME_MAX_CARACTERES),
    check('turma').notEmpty().withMessage(MENSAGENS.TURMA_OBRIGATORIA).isIn(turmasValidas).withMessage(MENSAGENS.TURMA_INVALIDA),
    check('email').optional().trim().isEmail().withMessage(MENSAGENS.EMAIL_INVALIDO).isLength({ max: 100 }).withMessage(MENSAGENS.EMAIL_MAX_CARACTERES),
    check('telefone').trim().notEmpty().withMessage(MENSAGENS.TELEFONE_OBRIGATORIO).isLength({ min: 8, max: 20 }).withMessage(MENSAGENS.TELEFONE_TAMANHO),
    check('nota').optional({ nullable: true }).isFloat({ min: 0, max: 10 }).withMessage(MENSAGENS.NOTA_INTERVALO),
    check('softSkill').optional({ nullable: true }).isIn(softSkillOptions).withMessage(MENSAGENS.SOFTSKILL_INVALIDA)
  ],

  idParam: [param('id').isInt({ min: 1 }).withMessage(MENSAGENS.ID_INVALIDO).toInt()],

  paginacao: [
    query('page').optional().isInt({ min: 1 }).withMessage(MENSAGENS.PAGINA_INVALIDA).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage(MENSAGENS.LIMITE_INVALIDO).toInt()
  ],

  filtro: [query('filtro').optional().isLength({ max: 100 }).withMessage(MENSAGENS.FILTRO_MAX_CARACTERES)],

  atualizarEstudante: [
    param('id').isInt({ min: 1 }).withMessage(MENSAGENS.ID_INVALIDO).toInt(),
    check('nota').optional({ nullable: true }).isFloat({ min: 0, max: 10 }).withMessage(MENSAGENS.NOTA_INTERVALO),
    check('softSkill').optional({ nullable: true }).isIn(softSkillOptions).withMessage(MENSAGENS.SOFTSKILL_INVALIDA)
  ],

  atualizarCampo: [
    param('id').isInt({ min: 1 }).withMessage(MENSAGENS.ID_INVALIDO).toInt(),
    check('campo')
      .notEmpty().withMessage(MENSAGENS.CAMPO_OBRIGATORIO)
      .isIn(['nota', 'softSkill']).withMessage(MENSAGENS.CAMPO_INVALIDO),
    check('valor')
      .notEmpty().withMessage(MENSAGENS.VALOR_OBRIGATORIO)
      .custom((valor, { req }) => {
        const campo = req.body.campo;
        if (campo === 'nota') {
          const num = parseFloat(valor);
          if (isNaN(num) || num < 0 || num > 10) throw new Error(MENSAGENS.NOTA_INTERVALO);
        } else if (campo === 'softSkill') {
          if (!softSkillOptions.includes(valor)) throw new Error(MENSAGENS.SOFTSKILL_INVALIDA);
        }
        return true;
      })
  ]
};

// ====================== USUÁRIOS ======================
const usuarioValidations = {
  register: [
    body('nome').notEmpty().withMessage(MENSAGENS.NOME_USUARIO_OBRIGATORIO).isLength({ min: 3 }).withMessage(MENSAGENS.NOME_USUARIO_MIN),
    body('email').notEmpty().withMessage(MENSAGENS.EMAIL_OBRIGATORIO).isEmail().withMessage(MENSAGENS.EMAIL_INVALIDO),
    body('senha').notEmpty().withMessage(MENSAGENS.SENHA_OBRIGATORIA).isLength({ min: 6 }).withMessage(MENSAGENS.SENHA_MIN),
    body('tipo').optional().isIn(['aluno', 'professor', 'admin']).withMessage(MENSAGENS.TIPO_USUARIO_INVALIDO)
  ],
  login: [
    body('email').notEmpty().withMessage(MENSAGENS.EMAIL_OBRIGATORIO).isEmail().withMessage(MENSAGENS.EMAIL_INVALIDO),
    body('senha').notEmpty().withMessage(MENSAGENS.SENHA_OBRIGATORIA)
  ]
};

// Middleware genérico para tratar erros de validação
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Erro de validação',
      errors: errors.array().map(err => ({
        param: err.param,
        value: err.value,
        message: err.msg
      }))
    });
  }
  next();
};

// Middleware para verificar se o usuário é admin
const isAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Usuário não autenticado' });
  if (req.user.tipo !== 'admin') return res.status(403).json({ message: 'Acesso restrito a administradores' });
  next();
};

module.exports = {
  handleValidationErrors,
  estudanteValidations,
  usuarioValidations,
  isAdmin,
  softSkillOptions
};

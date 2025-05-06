const multer = require('multer'); // Importa o multer para lidar com uploads
const path = require('path'); // Importa o path para manipulação de caminhos de arquivos
const fs = require('fs').promises; // Importa o fs com Promises para manipulação assíncrona de arquivos

const storage = multer.diskStorage({
  destination: async (req, file, cb) => { // Define a pasta onde os arquivos serão salvos
    const uploadDir = path.join(__dirname, '../public/uploads'); // Caminho da pasta de uploads
    try {
      await fs.mkdir(uploadDir, { recursive: true }); // Cria a pasta se ela não existir
      cb(null, uploadDir); // Informa o destino ao multer
    } catch (err) {
      cb(err); // Em caso de erro, retorna o erro para o multer
    }
  },
  filename: (req, file, cb) => { // Define o nome do arquivo salvo
    const ext = path.extname(file.originalname).toLowerCase(); // Obtém a extensão do arquivo original
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${ext}`; // Gera nome único
    cb(null, uniqueName); // Informa o nome do arquivo ao multer
  }
});

const fileFilter = (req, file, cb) => { // Filtra os arquivos permitidos
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']; // Tipos de arquivos permitidos
  allowedTypes.includes(file.mimetype) // Verifica se o tipo é permitido
    ? cb(null, true) // Tipo válido: aceita
    : cb(new Error('Tipo de arquivo não suportado'), false); // Tipo inválido: rejeita
};

module.exports = multer({
  storage, // Usa o armazenamento personalizado
  fileFilter, // Usa o filtro de tipos de arquivos
  limits: { fileSize: 5 * 1024 * 1024 } // Limite de tamanho do arquivo: 5MB
});

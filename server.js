const express = require('express'); // Framework web para Node.js
const cors = require('cors'); // Middleware para habilitar CORS
const multer = require('multer'); // Middleware para upload de arquivos
const mysql = require('mysql2'); // Cliente MySQL para Node.js
const fs = require('fs'); // Módulo para manipulação de arquivos
const session = require('express-session'); // Middleware para sessões
const authRoutes = require('./routes/auth'); // Importa as rotas de autenticação

const app = express(); // Cria a aplicação Express

// Configuração do CORS (permite acesso externo)
app.use(cors({
    origin: '*', // Aceita requisições de qualquer origem
    credentials: true // Permite envio de cookies/sessão
}));

app.use(express.json()); // Permite ler JSON no corpo da requisição
app.use(express.urlencoded({ extended: true })); // Permite dados de formulário

// Configuração da sessão (armazenamento temporário por usuário)
app.use(session({
    secret: 'segredo_super_secreto', // Chave de segurança
    resave: false, // Não salva sessão se nada mudou
    saveUninitialized: false, // Não cria sessão vazia
    cookie: { secure: false } // Sem HTTPS (em localhost)
}));

// Arquivos públicos (HTML, JS, CSS) e imagens de uploads
app.use(express.static('public')); // HTML e JS do frontend
app.use('/uploads', express.static('uploads')); // Acesso às fotos dos estudantes

// Conexão com o banco de dados MySQL
const db = mysql.createConnection({
    host: 'localhost', // Host local
    user: 'root', // Usuário do MySQL
    password: '12074811', // Senha do MySQL
    database: 'identificacao_estudantes' // Nome do banco
});

// Verifica se a conexão foi bem-sucedida
db.connect((err) => {
    if (err) {
        console.error('Erro na conexão com o banco de dados:', err); // Erro de conexão
        process.exit(1); // Encerra o servidor
    }
    console.log('Conexão com o banco de dados estabelecida'); // Sucesso
});

// Torna a conexão acessível globalmente (não recomendado para sistemas grandes)
global.db = db;

// Configuração do multer (armazenamento local de fotos)
const upload = multer({ dest: 'uploads/' }); // Define a pasta onde fotos serão salvas

// Usa as rotas de autenticação (/auth/login, /auth/logout etc.)
app.use('/auth', authRoutes);

// =================== ROTAS DO CRUD ====================

// Listar estudantes com filtro (por nome ou turma)
app.get('/estudantes', (req, res) => {
    const filtro = req.query.filtro || ''; // Filtro opcional na URL
    const query = 'SELECT * FROM estudantes WHERE nome LIKE ? OR turma LIKE ?';
    const params = [`%${filtro}%`, `%${filtro}%`];

    db.query(query, params, (err, results) => {
        if (err) {
            console.error('Erro ao consultar estudantes:', err);
            return res.status(500).json({ message: 'Erro ao listar estudantes' });
        }
        res.json(results); // Retorna os estudantes encontrados
    });
});

// Buscar estudante por ID
app.get('/estudantes/:id', (req, res) => {
    const { id } = req.params;
    const query = 'SELECT * FROM estudantes WHERE id = ?';

    db.query(query, [id], (err, result) => {
        if (err) {
            console.error('Erro ao buscar detalhes do estudante:', err);
            return res.status(500).json({ message: 'Erro ao buscar detalhes' });
        }
        if (result.length > 0) {
            res.json(result[0]); // Retorna o estudante
        } else {
            res.status(404).json({ message: 'Estudante não encontrado' });
        }
    });
});

// Cadastrar novo estudante
app.post('/estudantes', upload.single('foto'), (req, res) => {
    const { nome, turma, email, telefone } = req.body;
    const foto = req.file ? req.file.filename : null; // Foto enviada

    // Validação: todos os campos obrigatórios
    if (!nome || !turma || !email || !telefone || !foto) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
    }

    const query = 'INSERT INTO estudantes (nome, turma, email, telefone, foto) VALUES (?, ?, ?, ?, ?)';
    db.query(query, [nome, turma, email, telefone, foto], (err, result) => {
        if (err) {
            console.error('Erro no banco:', err);
            return res.status(500).json({ message: 'Erro ao cadastrar estudante' });
        }
        res.status(201).json({ message: 'Estudante cadastrado com sucesso!', id: result.insertId });
    });
});

// ✅ Editar estudante (aceita atualização parcial)
app.put('/estudantes/:id', upload.single('foto'), (req, res) => {
    const { id } = req.params;
    const dados = req.body; // Dados enviados no corpo

    if (req.file) {
        dados.foto = req.file.filename; // Se houver nova foto, adiciona
    }

    const campos = Object.keys(dados); // ['nome', 'turma', ...]
    const valores = Object.values(dados); // ['João', '8A', ...]

    if (campos.length === 0) {
        return res.status(400).json({ message: 'Nenhum campo enviado para atualização.' });
    }

    // Monta a parte SET do SQL dinamicamente
    const setClause = campos.map(campo => `${campo} = ?`).join(', ');
    const query = `UPDATE estudantes SET ${setClause} WHERE id = ?`;
    valores.push(id); // ID vai no final da lista

    // Executa o update
    db.query(query, valores, (err, result) => {
        if (err) {
            console.error('Erro ao atualizar estudante:', err);
            return res.status(500).json({ message: 'Erro ao atualizar estudante' });
        }
        if (result.affectedRows > 0) {
            res.json({ message: 'Estudante atualizado com sucesso!' });
        } else {
            res.status(404).json({ message: 'Estudante não encontrado' });
        }
    });
});

// Deletar estudante por ID
app.delete('/estudantes/:id', (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM estudantes WHERE id = ?';

    db.query(query, [id], (err, result) => {
        if (err) {
            console.error('Erro ao deletar estudante:', err);
            return res.status(500).json({ message: 'Erro ao deletar estudante' });
        }
        if (result.affectedRows > 0) {
            res.json({ message: 'Estudante deletado com sucesso!' });
        } else {
            res.status(404).json({ message: 'Estudante não encontrado' });
        }
    });
});

// Inicia o servidor na porta 3000 (ou a porta do ambiente)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Servidor rodando na porta ${PORT}`);
});

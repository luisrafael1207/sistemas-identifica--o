const express = require('express'); // Framework web para Node.js
const cors = require('cors'); // Middleware para habilitar CORS
const multer = require('multer'); // Middleware para upload de arquivos
const mysql = require('mysql2'); // Cliente MySQL para Node.js
const fs = require('fs'); // Módulo para manipulação de arquivos
const session = require('express-session'); // Middleware para gerenciamento de sessões
const authRoutes = require('./routes/auth'); // Importa as rotas de autenticação

const app = express(); // Cria a aplicação Express

// Configurações básicas
app.use(cors({
    origin: '*',
    credentials: true
  }));
app.use(express.json()); // Habilita o uso de JSON no corpo das requisições
app.use(express.urlencoded({ extended: true })); // Habilita dados codificados em URL (formulários)

// Sessão
app.use(session({ // Configura sessão (cookie + memória local)
    secret: 'segredo_super_secreto', // Segredo para assinar sessões
    resave: false, // Evita salvar sessão sem alterações
    saveUninitialized: false, // Evita salvar sessões vazias
    cookie: { secure: false } // 'secure' false pois não usamos HTTPS localmente
}));

// Servir arquivos estáticos
app.use(express.static('public')); // Pasta pública com arquivos estáticos
app.use('/uploads', express.static('uploads')); // Disponibiliza imagens/fotos na rota /uploads

// Conexão com o banco de dados
const db = mysql.createConnection({ // Cria a conexão com o MySQL
    host: 'localhost',
    user: 'root',
    password: '12074811',
    database: 'identificacao_estudantes'
});

db.connect((err) => { // Tenta conectar ao banco
    if (err) {
        console.error('Erro na conexão com o banco de dados:', err); // Loga erro
        process.exit(1); // Encerra o processo se falhar
    }
    console.log('Conexão com o banco de dados estabelecida'); // Sucesso
});

global.db = db; // Torna a conexão acessível globalmente (não recomendado em apps grandes)

// Uploads
const upload = multer({ dest: 'uploads/' }); // Define pasta de destino para os uploads

// Autenticação
app.use('/auth', authRoutes); // Usa as rotas de autenticação (ex: login)

// Listar estudantes
app.get('/estudantes', (req, res) => {
    const filtro = req.query.filtro || ''; // Recebe o filtro da URL
    const query = 'SELECT * FROM estudantes WHERE nome LIKE ? OR turma LIKE ?'; // SQL com filtro
    const params = [`%${filtro}%`, `%${filtro}%`]; // Parametriza a busca

    db.query(query, params, (err, results) => { // Executa a query
        if (err) {
            console.error('Erro ao consultar estudantes:', err); // Loga erro
            return res.status(500).json({ message: 'Erro ao listar estudantes' }); // Retorna erro
        }
        res.json(results); // Retorna os estudantes encontrados
    });
});

// Detalhar estudante
app.get('/estudantes/:id', (req, res) => {
    const { id } = req.params; // Pega o ID da URL
    const query = 'SELECT * FROM estudantes WHERE id = ?'; // SQL para buscar pelo ID

    db.query(query, [id], (err, result) => { // Executa a query
        if (err) {
            console.error('Erro ao buscar detalhes do estudante:', err); // Loga erro
            return res.status(500).json({ message: 'Erro ao buscar detalhes' }); // Retorna erro
        }
        if (result.length > 0) {
            res.json(result[0]); // Retorna o estudante
        } else {
            res.status(404).json({ message: 'Estudante não encontrado' }); // Não achou
        }
    });
});

// Cadastrar estudante (corrigido)
app.post('/estudantes', upload.single('foto'), (req, res) => {
    const { nome, turma, email, telefone } = req.body; // Pega dados do corpo
    const foto = req.file ? req.file.filename : null; // Pega o nome do arquivo se houver

    if (!nome || !turma || !email || !telefone || !foto) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios.' }); // Validação
    }

    const query = 'INSERT INTO estudantes (nome, turma, email, telefone, foto) VALUES (?, ?, ?, ?, ?)'; // SQL insert
    db.query(query, [nome, turma, email, telefone, foto], (err, result) => {
        if (err) {
            console.error('Erro no banco:', err); // Loga erro
            return res.status(500).json({ message: 'Erro ao cadastrar estudante' }); // Retorna erro
        }
        res.status(201).json({ message: 'Estudante cadastrado com sucesso!', id: result.insertId }); // Sucesso
    });
});

// Editar estudante (corrigido)
app.put('/estudantes/:id', upload.single('foto'), (req, res) => {
    const { id } = req.params; // ID do estudante
    const { nome, turma, email, telefone } = req.body; // Dados atualizados
    const foto = req.file ? req.file.filename : null; // Nova foto (opcional)

    let query = 'UPDATE estudantes SET nome = ?, turma = ?, email = ?, telefone = ?'; // Parte inicial do update
    const params = [nome, turma, email, telefone]; // Parâmetros iniciais

    if (foto) {
        query += ', foto = ?'; // Se tiver nova foto, inclui no update
        params.push(foto); // Adiciona à lista de parâmetros
    }

    query += ' WHERE id = ?'; // Finaliza o update com a condição WHERE
    params.push(id); // Adiciona o ID ao final da lista de parâmetros

    db.query(query, params, (err, result) => { // Executa o update
        if (err) {
            console.error('Erro ao atualizar estudante:', err); // Loga erro
            return res.status(500).json({ message: 'Erro ao atualizar estudante' }); // Retorna erro
        }
        if (result.affectedRows > 0) {
            res.json({ message: 'Estudante atualizado com sucesso!' }); // Sucesso
        } else {
            res.status(404).json({ message: 'Estudante não encontrado' }); // ID não existe
        }
    });
});

// Deletar estudante
app.delete('/estudantes/:id', (req, res) => {
    const { id } = req.params; // ID do estudante
    const query = 'DELETE FROM estudantes WHERE id = ?'; // SQL delete

    db.query(query, [id], (err, result) => { // Executa o delete
        if (err) {
            console.error('Erro ao deletar estudante:', err); // Loga erro
            return res.status(500).json({ message: 'Erro ao deletar estudante' }); // Retorna erro
        }
        if (result.affectedRows > 0) {
            res.json({ message: 'Estudante deletado com sucesso!' }); // Sucesso
        } else {
            res.status(404).json({ message: 'Estudante não encontrado' }); // ID não existe
        }
    });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000; // Usa a porta do .env ou 3000 como padrão
app.listen(PORT, () => {
    console.log(`✅ Servidor rodando na porta ${PORT}`); // Informa que o servidor está rodando
});

require('dotenv').config(); // Carrega variáveis de ambiente do arquivo .env
const mysql = require('mysql2'); // Importa a biblioteca mysql2 para conexão com o banco de dados


// 🔄 Criando um pool de conexões (melhor performance)
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true, // Aguarda conexões livres no pool
    connectionLimit: 10, // Limite de conexões simultâneas
    queueLimit: 0 // Sem limite na fila de espera
});


// 📌 Testa a conexão
db.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Erro ao conectar ao banco de dados:', err.message);
    } else {
        console.log('✅ Banco de dados conectado com sucesso!');
        connection.release(); // Libera a conexão após o teste
    };
});


module.exports = db;

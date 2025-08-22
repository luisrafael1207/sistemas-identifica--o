require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'identificacao_estudantes',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function testarConexao() {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log('✅ Banco de dados conectado com sucesso!');
  } catch (err) {
    console.error('❌ Erro ao conectar ao banco de dados:', err.message);
    throw err;
  }
}

module.exports = pool; // exporta o pool direto para usar .execute(), .query(), etc
module.exports.testarConexao = testarConexao;

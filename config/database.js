// 数据库配置与连接
const mysql = require('mysql2/promise');

// 创建连接池
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 初始化数据库连接
async function initDb() {
  try {
    // 测试连接
    const connection = await pool.getConnection();
    console.log('数据库连接成功');
    connection.release();
    return true;
  } catch (error) {
    console.error('数据库连接失败:', error);
    throw error;
  }
}

// 导出连接池和初始化函数
module.exports = {
  pool,
  initDb
};
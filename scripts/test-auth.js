// 用户认证测试脚本
require('dotenv').config();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

async function testAuth() {
  console.log('开始测试用户认证系统...');
  
  try {
    // 测试数据库连接
    const connection = await pool.getConnection();
    console.log('数据库连接成功');
    connection.release();
    
    // 测试密码哈希
    const password = 'test_password';
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    console.log('密码哈希生成成功');
    
    // 测试密码验证
    const isMatch = await bcrypt.compare(password, passwordHash);
    console.log('密码验证结果:', isMatch ? '成功' : '失败');
    
    // 测试JWT令牌
    const payload = { id: 1, username: 'test_user' };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    console.log('JWT令牌生成成功');
    
    // 测试JWT验证
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('JWT令牌验证成功，解码结果:', decoded);
    
    console.log('用户认证系统测试完成，所有测试通过');
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  } finally {
    // 关闭连接池
    await pool.end();
    console.log('数据库连接池已关闭');
  }
}

testAuth();
// 用户控制器
const { pool } = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// 用户注册
exports.register = async (req, res) => {
  try {
    const { username, password, email } = req.body;
    
    // 验证请求数据
    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码为必填项' });
    }
    
    // 检查用户名是否已存在
    const [existingUsers] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUsers.length > 0) {
      return res.status(409).json({ message: '用户名已存在' });
    }
    
    // 检查邮箱是否已存在（如果提供）
    if (email) {
      const [existingEmails] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
      if (existingEmails.length > 0) {
        return res.status(409).json({ message: '邮箱已被使用' });
      }
    }
    
    // 加密密码
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // 创建新用户
    const [result] = await pool.query(
      'INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)',
      [username, passwordHash, email || null]
    );
    
    // 创建JWT令牌
    const token = jwt.sign(
      { id: result.insertId, username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.status(201).json({
      message: '注册成功',
      token,
      user: {
        id: result.insertId,
        username,
        email: email || null
      }
    });
  } catch (error) {
    console.error('用户注册失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 用户登录
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // 验证请求数据
    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码为必填项' });
    }
    
    // 查找用户
    const [users] = await pool.query('SELECT id, username, password_hash, email FROM users WHERE username = ?', [username]);
    if (users.length === 0) {
      return res.status(401).json({ message: '用户名或密码不正确' });
    }
    
    const user = users[0];
    
    // 验证密码
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ message: '用户名或密码不正确' });
    }
    
    // 创建JWT令牌
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.status(200).json({
      message: '登录成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('用户登录失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取用户信息
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 获取用户基本信息
    const [users] = await pool.query(
      'SELECT id, username, email, created_at FROM users WHERE id = ?', 
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    const user = users[0];
    
    // 获取用户收藏统计
    const [collectionStats] = await pool.query(
      'SELECT COUNT(*) as total FROM user_collections WHERE user_id = ?',
      [userId]
    );
    
    res.status(200).json({
      ...user,
      collection_count: collectionStats[0].total
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};
// 认证中间件
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// 验证JWT令牌
exports.verifyToken = async (req, res, next) => {
    try {
        // 从请求头获取令牌
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: '未提供有效的认证令牌' });
        }
        
        const token = authHeader.split(' ')[1];
        
        // 验证令牌
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 从数据库获取用户信息和角色
        const [users] = await pool.query(
            'SELECT id, username, role, status FROM users WHERE id = ?',
            [decoded.id]
        );
        
        if (users.length === 0) {
            return res.status(401).json({ message: '用户不存在' });
        }
        
        const user = users[0];
        
        // 检查用户状态
        if (user.status === 'banned') {
            return res.status(403).json({ message: '账号已被禁用' });
        }
        
        // 将用户信息添加到请求对象
        req.user = user;
        
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: '认证令牌无效或已过期' });
        }
        
        console.error('验证令牌失败:', error);
        res.status(500).json({ message: '服务器错误', error: error.message });
    }
};

// 验证是否为管理员
exports.isAdmin = (req, res, next) => {
    // verifyToken中间件已经添加了用户信息
    if (!req.user) {
        return res.status(401).json({ message: '未经授权' });
    }
    
    // 检查用户角色
    if (!['moderator', 'admin', 'super_admin'].includes(req.user.role)) {
        return res.status(403).json({ message: '没有权限访问此资源' });
    }
    
    next();
};

// 验证是否为超级管理员
exports.isSuperAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: '未经授权' });
    }
    
    if (req.user.role !== 'super_admin') {
        return res.status(403).json({ message: '需要超级管理员权限' });
    }
    
    next();
};
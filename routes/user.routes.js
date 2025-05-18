// 用户相关路由
const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// 用户注册
router.post('/register', userController.register);

// 用户登录
router.post('/login', userController.login);

// 获取用户信息（需要认证）
router.get('/profile', authMiddleware.verifyToken, userController.getUserProfile);

module.exports = router;
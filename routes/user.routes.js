// 用户相关路由
const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// 用户注册
router.post('/register', userController.register);

// 用户登录
router.post('/login', userController.login);

// 用户资料相关（需要认证）
router.get('/profile', authMiddleware.verifyToken, userController.getUserProfile);
router.put('/profile', authMiddleware.verifyToken, userController.updateProfile);

// 密码重置路由
router.post('/forgot-password', userController.requestPasswordReset);
router.get('/reset-password/:token', userController.verifyResetToken);
router.post('/reset-password', userController.resetPassword);

// 邮箱验证路由
router.get('/verify-email/:token', userController.verifyEmail);
router.post('/resend-verification', authMiddleware.verifyToken, userController.resendVerificationEmail);

// 搜索用户
router.get('/search', userController.searchUsers);

// 获取用户公开资料
router.get('/:userId/profile', userController.getPublicUserProfile);

module.exports = router;
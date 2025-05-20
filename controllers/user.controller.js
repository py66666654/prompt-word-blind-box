// 用户控制器
const { pool } = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

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
    
    // 生成邮箱验证令牌
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    // 创建新用户
    const [result] = await pool.query(
      'INSERT INTO users (username, password_hash, email, verification_token) VALUES (?, ?, ?, ?)',
      [username, passwordHash, email || null, email ? verificationToken : null]
    );
    
    // 如果提供了邮箱，发送验证邮件
    if (email) {
      // 创建邮件传输器
      const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });
      
      // 设置邮件内容
      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: '提示词盲盒 - 验证您的邮箱',
        html: `
          <h1>邮箱验证</h1>
          <p>您好 ${username},</p>
          <p>感谢您注册提示词盲盒。请点击下面的链接验证您的邮箱:</p>
          <a href="${verificationUrl}" target="_blank">验证邮箱</a>
          <p>如果您没有注册此账号，请忽略此邮件。</p>
        `
      };
      
      // 发送邮件
      await transporter.sendMail(mailOptions);
    }
    
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
      'SELECT id, username, email, email_verified, points, premium, created_at FROM users WHERE id = ?', 
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
    
    // 获取用户抽卡历史统计
    const [drawStats] = await pool.query(
      'SELECT COUNT(*) as total FROM draw_history WHERE user_id = ?',
      [userId]
    );
    
    res.status(200).json({
      ...user,
      collection_count: collectionStats[0].total,
      draw_count: drawStats[0].total
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 更新用户资料
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { email, currentPassword, newPassword, profile_image, bio } = req.body;
    
    // 获取用户当前信息
    const [users] = await pool.query(
      'SELECT email, password_hash FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    const user = users[0];
    let updates = [];
    let values = [];
    let emailChanged = false;
    
    // 更新邮箱
    if (email && email !== user.email) {
      // 检查邮箱是否已被使用
      const [existingEmails] = await pool.query(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, userId]
      );
      
      if (existingEmails.length > 0) {
        return res.status(409).json({ message: '邮箱已被其他用户使用' });
      }
      
      emailChanged = true;
      
      // 生成新的验证令牌
      const verificationToken = crypto.randomBytes(32).toString('hex');
      
      updates.push('email = ?', 'email_verified = ?', 'verification_token = ?');
      values.push(email, false, verificationToken);
      
      // 创建邮件传输器
      const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });
      
      // 设置邮件内容
      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: '提示词盲盒 - 验证您的新邮箱',
        html: `
          <h1>邮箱验证</h1>
          <p>您好，</p>
          <p>您的提示词盲盒账号刚刚更新了邮箱。请点击下面的链接验证您的新邮箱:</p>
          <a href="${verificationUrl}" target="_blank">验证邮箱</a>
          <p>如果您没有更新邮箱，请立即修改您的账号密码。</p>
        `
      };
      
      // 发送邮件
      await transporter.sendMail(mailOptions);
    }
    
    // 更新密码
    if (currentPassword && newPassword) {
      // 验证当前密码
      const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);
      if (!passwordMatch) {
        return res.status(401).json({ message: '当前密码不正确' });
      }
      
      // 加密新密码
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);
      
      updates.push('password_hash = ?');
      values.push(passwordHash);
    }
    
    // 更新头像URL
    if (profile_image !== undefined) {
      updates.push('profile_image = ?');
      values.push(profile_image);
    }
    
    // 更新个人简介
    if (bio !== undefined) {
      updates.push('bio = ?');
      values.push(bio);
    }
    
    // 如果没有要更新的内容
    if (updates.length === 0) {
      return res.status(400).json({ message: '没有提供要更新的信息' });
    }
    
    // 执行更新
    values.push(userId);
    await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    
    // 获取更新后的用户信息
    const [updatedUser] = await pool.query(
      'SELECT id, username, email, email_verified, profile_image, bio FROM users WHERE id = ?',
      [userId]
    );
    
    let responseMessage = '资料已更新';
    if (emailChanged) {
      responseMessage = '资料已更新，请验证您的新邮箱';
    }
    
    res.status(200).json({ 
      message: responseMessage,
      user: updatedUser[0]
    });
  } catch (error) {
    console.error('更新用户资料失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 请求密码重置
exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: '邮箱为必填项' });
    }
    
    // 查找用户
    const [users] = await pool.query('SELECT id, username FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      // 为安全起见，即使用户不存在也返回成功
      return res.status(200).json({ message: '如果该邮箱存在，重置链接已发送' });
    }
    
    const user = users[0];
    
    // 生成重置令牌和过期时间
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1小时后过期
    
    // 存储重置令牌和过期时间
    await pool.query(
      'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?',
      [resetToken, resetTokenExpiry, user.id]
    );
    
    // 创建邮件传输器
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
    
    // 设置邮件内容
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: '提示词盲盒 - 密码重置',
      html: `
        <h1>密码重置</h1>
        <p>您好 ${user.username},</p>
        <p>您请求了密码重置。点击下面的链接设置新密码:</p>
        <a href="${resetUrl}" target="_blank">重置密码</a>
        <p>该链接将在1小时后过期。</p>
        <p>如果您没有请求重置密码，请忽略此邮件。</p>
      `
    };
    
    // 发送邮件
    await transporter.sendMail(mailOptions);
    
    res.status(200).json({ message: '重置链接已发送到您的邮箱' });
  } catch (error) {
    console.error('请求密码重置失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 验证重置令牌
exports.verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params;
    
    if (!token) {
      return res.status(400).json({ message: '无效的重置令牌' });
    }
    
    // 查找具有此令牌且未过期的用户
    const [users] = await pool.query(
      'SELECT id FROM users WHERE reset_token = ? AND reset_token_expiry > NOW()',
      [token]
    );
    
    if (users.length === 0) {
      return res.status(400).json({ message: '重置令牌无效或已过期' });
    }
    
    res.status(200).json({ message: '重置令牌有效', valid: true });
  } catch (error) {
    console.error('验证重置令牌失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 重置密码
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({ message: '令牌和新密码为必填项' });
    }
    
    // 查找具有此令牌且未过期的用户
    const [users] = await pool.query(
      'SELECT id FROM users WHERE reset_token = ? AND reset_token_expiry > NOW()',
      [token]
    );
    
    if (users.length === 0) {
      return res.status(400).json({ message: '重置令牌无效或已过期' });
    }
    
    const user = users[0];
    
    // 加密新密码
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // 更新密码并清除重置令牌
    await pool.query(
      'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
      [passwordHash, user.id]
    );
    
    res.status(200).json({ message: '密码已成功重置' });
  } catch (error) {
    console.error('重置密码失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 邮箱验证
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    
    if (!token) {
      return res.status(400).json({ message: '无效的验证令牌' });
    }
    
    // 查找具有此验证令牌的用户
    const [users] = await pool.query(
      'SELECT id FROM users WHERE verification_token = ?',
      [token]
    );
    
    if (users.length === 0) {
      return res.status(400).json({ message: '验证令牌无效' });
    }
    
    const user = users[0];
    
    // 更新邮箱验证状态
    await pool.query(
      'UPDATE users SET email_verified = TRUE, verification_token = NULL WHERE id = ?',
      [user.id]
    );
    
    res.status(200).json({ message: '邮箱验证成功' });
  } catch (error) {
    console.error('邮箱验证失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 重新发送验证邮件
exports.resendVerificationEmail = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 获取用户信息
    const [users] = await pool.query(
      'SELECT username, email, email_verified FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    const user = users[0];
    
    // 检查邮箱是否已验证
    if (user.email_verified) {
      return res.status(400).json({ message: '邮箱已验证' });
    }
    
    // 检查是否存在邮箱
    if (!user.email) {
      return res.status(400).json({ message: '用户没有关联邮箱' });
    }
    
    // 生成新的验证令牌
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    // 更新验证令牌
    await pool.query(
      'UPDATE users SET verification_token = ? WHERE id = ?',
      [verificationToken, userId]
    );
    
    // 创建邮件传输器
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
    
    // 设置邮件内容
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: '提示词盲盒 - 验证您的邮箱',
      html: `
        <h1>邮箱验证</h1>
        <p>您好 ${user.username},</p>
        <p>请点击下面的链接验证您的邮箱:</p>
        <a href="${verificationUrl}" target="_blank">验证邮箱</a>
        <p>如果您没有请求此验证邮件，请忽略此邮件。</p>
      `
    };
    
    // 发送邮件
    await transporter.sendMail(mailOptions);
    
    res.status(200).json({ message: '验证邮件已重新发送' });
  } catch (error) {
    console.error('重新发送验证邮件失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 搜索用户
exports.searchUsers = async (req, res) => {
  try {
    const { query, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    if (!query || query.trim() === '') {
      return res.status(400).json({ message: '搜索关键词不能为空' });
    }
    
    // 获取匹配用户
    const [users] = await pool.query(`
      SELECT id, username, profile_image, bio, created_at 
      FROM users 
      WHERE username LIKE ? OR bio LIKE ?
      ORDER BY 
        CASE WHEN username = ? THEN 0
             WHEN username LIKE ? THEN 1
             WHEN username LIKE ? THEN 2
             ELSE 3
        END,
        created_at DESC
      LIMIT ? OFFSET ?
    `, [
      `%${query}%`, 
      `%${query}%`, 
      query, 
      `${query}%`, 
      `%${query}%`, 
      parseInt(limit), 
      parseInt(offset)
    ]);
    
    // 获取总匹配数以支持分页
    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM users WHERE username LIKE ? OR bio LIKE ?',
      [`%${query}%`, `%${query}%`]
    );
    
    const total = countResult[0].total;
    
    // 如果当前用户已登录，添加"我是否关注了该用户"的信息
    if (req.user) {
      const userId = req.user.id;
      
      // 获取当前用户关注的所有用户ID
      const [followingIds] = await pool.query(
        'SELECT followed_id FROM followers WHERE follower_id = ?',
        [userId]
      );
      
      const followingSet = new Set(followingIds.map(f => f.followed_id));
      
      // 为每个搜索结果添加是否关注标志
      users.forEach(user => {
        user.is_followed_by_me = followingSet.has(user.id);
      });
    }
    
    res.status(200).json({
      users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('搜索用户失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取公开用户资料（包含社交统计信息）
exports.getPublicUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user ? req.user.id : null;
    
    // 获取用户基本信息
    const [users] = await pool.query(`
      SELECT id, username, profile_image, bio, created_at
      FROM users 
      WHERE id = ?
    `, [userId]);
    
    if (users.length === 0) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    const user = users[0];
    
    // 获取社交统计信息
    
    // 1. 关注和粉丝数
    const [followStats] = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM followers WHERE follower_id = ?) as following_count,
        (SELECT COUNT(*) FROM followers WHERE followed_id = ?) as follower_count
    `, [userId, userId]);
    
    // 2. 收藏数
    const [collectionStats] = await pool.query(
      'SELECT COUNT(*) as collection_count FROM user_collections WHERE user_id = ?',
      [userId]
    );
    
    // 3. 评分数
    const [ratingStats] = await pool.query(
      'SELECT COUNT(*) as rating_count FROM ratings WHERE user_id = ?',
      [userId]
    );
    
    // 4. 评论数
    const [commentStats] = await pool.query(
      'SELECT COUNT(*) as comment_count FROM comments WHERE user_id = ?',
      [userId]
    );
    
    // 5. 分享数
    const [shareStats] = await pool.query(
      'SELECT COUNT(*) as share_count FROM shares WHERE user_id = ?',
      [userId]
    );
    
    // 6. 抽卡数
    const [drawStats] = await pool.query(
      'SELECT COUNT(*) as draw_count FROM draw_history WHERE user_id = ?',
      [userId]
    );
    
    // 7. 如果当前用户已登录，检查是否关注了目标用户
    let isFollowed = false;
    if (currentUserId) {
      const [followCheck] = await pool.query(
        'SELECT 1 FROM followers WHERE follower_id = ? AND followed_id = ?',
        [currentUserId, userId]
      );
      isFollowed = followCheck.length > 0;
    }
    
    // 8. 获取用户收藏的提示词
    const [collections] = await pool.query(`
      SELECT pc.id, pc.prompt_text, pc.preview_url, pt.name as type_name, 
        c.name as category_name, rl.name as rarity_name, rl.color_code,
        uc.collected_at
      FROM user_collections uc
      JOIN prompt_cards pc ON uc.prompt_card_id = pc.id
      JOIN prompt_types pt ON pc.type_id = pt.id
      JOIN categories c ON pc.category_id = c.id
      JOIN rarity_levels rl ON pc.rarity_level_id = rl.id
      WHERE uc.user_id = ?
      ORDER BY uc.collected_at DESC
      LIMIT 6
    `, [userId]);
    
    // 9. 获取用户的活动
    const [activities] = await pool.query(`
      SELECT ua.id, ua.activity_type, ua.created_at, ua.reference_id
      FROM user_activities ua
      WHERE ua.user_id = ?
      ORDER BY ua.created_at DESC
      LIMIT 10
    `, [userId]);
    
    res.status(200).json({
      ...user,
      stats: {
        following_count: followStats[0].following_count,
        follower_count: followStats[0].follower_count,
        collection_count: collectionStats[0].collection_count,
        rating_count: ratingStats[0].rating_count,
        comment_count: commentStats[0].comment_count,
        share_count: shareStats[0].share_count,
        draw_count: drawStats[0].draw_count
      },
      is_followed: isFollowed,
      recent_collections: collections,
      recent_activities: activities
    });
  } catch (error) {
    console.error('获取用户公开资料失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};
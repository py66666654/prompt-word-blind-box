// 分享控制器
const { pool } = require('../config/database');

// 创建分享记录
exports.sharePrompt = async (req, res) => {
  try {
    const userId = req.user.id;
    const { promptId } = req.params;
    const { platform, share_url } = req.body;

    // 验证请求数据
    if (!platform) {
      return res.status(400).json({ message: '分享平台为必填项' });
    }

    // 检查提示词是否存在
    const [prompts] = await pool.query('SELECT id FROM prompt_cards WHERE id = ?', [promptId]);
    if (prompts.length === 0) {
      return res.status(404).json({ message: '提示词不存在' });
    }

    // 创建分享记录
    const [result] = await pool.query(
      'INSERT INTO shares (user_id, prompt_card_id, platform, share_url) VALUES (?, ?, ?, ?)',
      [userId, promptId, platform, share_url || null]
    );

    // 记录活动
    await recordActivity(userId, 'share', result.insertId);

    res.status(201).json({
      message: '分享记录已创建',
      id: result.insertId
    });
  } catch (error) {
    console.error('创建分享记录失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取提示词的分享记录
exports.getPromptShares = async (req, res) => {
  try {
    const { promptId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // 检查提示词是否存在
    const [prompts] = await pool.query('SELECT id FROM prompt_cards WHERE id = ?', [promptId]);
    if (prompts.length === 0) {
      return res.status(404).json({ message: '提示词不存在' });
    }

    // 获取分享统计（按平台分组）
    const [stats] = await pool.query(`
      SELECT platform, COUNT(*) as count
      FROM shares
      WHERE prompt_card_id = ?
      GROUP BY platform
      ORDER BY count DESC
    `, [promptId]);

    // 获取分享记录详情
    const [shares] = await pool.query(`
      SELECT s.id, s.platform, s.share_url, s.created_at,
        u.id as user_id, u.username, u.profile_image
      FROM shares s
      JOIN users u ON s.user_id = u.id
      WHERE s.prompt_card_id = ?
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `, [promptId, parseInt(limit), parseInt(offset)]);

    // 获取总分享数以支持分页
    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM shares WHERE prompt_card_id = ?',
      [promptId]
    );

    const total = countResult[0].total;

    res.status(200).json({
      stats,
      shares,
      total_shares: total,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取分享记录失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取用户的分享记录
exports.getUserShares = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // 检查用户是否存在
    const [users] = await pool.query('SELECT id FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 获取用户分享记录（包含提示词信息）
    const [shares] = await pool.query(`
      SELECT s.id, s.platform, s.share_url, s.created_at,
        pc.id as prompt_id, pc.prompt_text, pc.preview_url,
        pt.name as type_name, c.name as category_name
      FROM shares s
      JOIN prompt_cards pc ON s.prompt_card_id = pc.id
      JOIN prompt_types pt ON pc.type_id = pt.id
      JOIN categories c ON pc.category_id = c.id
      WHERE s.user_id = ?
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `, [userId, parseInt(limit), parseInt(offset)]);

    // 获取总分享数以支持分页
    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM shares WHERE user_id = ?',
      [userId]
    );

    const total = countResult[0].total;

    res.status(200).json({
      shares,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取用户分享记录失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取分享统计
exports.getShareStats = async (req, res) => {
  try {
    // 获取平台分享统计
    const [platformStats] = await pool.query(`
      SELECT platform, COUNT(*) as count
      FROM shares
      GROUP BY platform
      ORDER BY count DESC
    `);

    // 获取最多分享的提示词
    const [topPrompts] = await pool.query(`
      SELECT pc.id, pc.prompt_text, pc.preview_url, 
        COUNT(s.id) as share_count, pt.name as type_name
      FROM shares s
      JOIN prompt_cards pc ON s.prompt_card_id = pc.id
      JOIN prompt_types pt ON pc.type_id = pt.id
      GROUP BY pc.id
      ORDER BY share_count DESC
      LIMIT 10
    `);

    // 获取总分享数
    const [totalResult] = await pool.query('SELECT COUNT(*) as total FROM shares');

    res.status(200).json({
      total_shares: totalResult[0].total,
      platform_stats: platformStats,
      top_shared_prompts: topPrompts
    });
  } catch (error) {
    console.error('获取分享统计失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 辅助函数：记录用户活动
async function recordActivity(userId, activityType, referenceId) {
  try {
    await pool.query(
      'INSERT INTO user_activities (user_id, activity_type, reference_id) VALUES (?, ?, ?)',
      [userId, activityType, referenceId]
    );
  } catch (error) {
    console.error('记录用户活动失败:', error);
    // 不抛出错误，避免影响主要功能
  }
}
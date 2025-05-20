// 评分控制器
const { pool } = require('../config/database');

// 创建或更新评分
exports.ratePrompt = async (req, res) => {
  try {
    const userId = req.user.id;
    const { promptId } = req.params;
    const { rating } = req.body;

    // 验证评分值
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: '评分必须在1-5之间' });
    }

    // 检查提示词是否存在
    const [prompts] = await pool.query('SELECT id FROM prompt_cards WHERE id = ?', [promptId]);
    if (prompts.length === 0) {
      return res.status(404).json({ message: '提示词不存在' });
    }

    // 检查用户是否已经评分过此提示词
    const [existingRatings] = await pool.query(
      'SELECT id FROM ratings WHERE user_id = ? AND prompt_card_id = ?',
      [userId, promptId]
    );

    if (existingRatings.length > 0) {
      // 更新现有评分
      await pool.query(
        'UPDATE ratings SET rating = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [rating, existingRatings[0].id]
      );

      // 记录活动
      await recordActivity(userId, 'rate', existingRatings[0].id);

      res.status(200).json({ message: '评分已更新', id: existingRatings[0].id });
    } else {
      // 插入新评分
      const [result] = await pool.query(
        'INSERT INTO ratings (user_id, prompt_card_id, rating) VALUES (?, ?, ?)',
        [userId, promptId, rating]
      );

      // 记录活动
      await recordActivity(userId, 'rate', result.insertId);

      res.status(201).json({ message: '评分已提交', id: result.insertId });
    }

    // 更新提示词的质量分数（基于所有评分的平均值）
    updatePromptQualityScore(promptId);
  } catch (error) {
    console.error('提交评分失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取提示词的评分
exports.getPromptRatings = async (req, res) => {
  try {
    const { promptId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // 检查提示词是否存在
    const [prompts] = await pool.query('SELECT id FROM prompt_cards WHERE id = ?', [promptId]);
    if (prompts.length === 0) {
      return res.status(404).json({ message: '提示词不存在' });
    }

    // 获取评分统计
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as rating_count,
        ROUND(AVG(rating), 1) as average_rating,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
      FROM ratings
      WHERE prompt_card_id = ?
    `, [promptId]);

    // 获取详细评分列表（包含用户信息）
    const [ratings] = await pool.query(`
      SELECT r.id, r.rating, r.created_at, r.updated_at,
        u.id as user_id, u.username, u.profile_image
      FROM ratings r
      JOIN users u ON r.user_id = u.id
      WHERE r.prompt_card_id = ?
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `, [promptId, parseInt(limit), parseInt(offset)]);

    // 获取总评分数以支持分页
    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM ratings WHERE prompt_card_id = ?',
      [promptId]
    );

    const total = countResult[0].total;

    res.status(200).json({
      stats: stats[0],
      ratings,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取评分失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取用户对提示词的评分
exports.getUserRating = async (req, res) => {
  try {
    const userId = req.user.id;
    const { promptId } = req.params;

    const [ratings] = await pool.query(
      'SELECT id, rating, created_at, updated_at FROM ratings WHERE user_id = ? AND prompt_card_id = ?',
      [userId, promptId]
    );

    if (ratings.length === 0) {
      return res.status(404).json({ message: '未找到评分' });
    }

    res.status(200).json(ratings[0]);
  } catch (error) {
    console.error('获取用户评分失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 删除评分
exports.deleteRating = async (req, res) => {
  try {
    const userId = req.user.id;
    const { promptId } = req.params;

    // 检查评分是否存在
    const [ratings] = await pool.query(
      'SELECT id FROM ratings WHERE user_id = ? AND prompt_card_id = ?',
      [userId, promptId]
    );

    if (ratings.length === 0) {
      return res.status(404).json({ message: '未找到评分' });
    }

    // 删除评分
    await pool.query(
      'DELETE FROM ratings WHERE user_id = ? AND prompt_card_id = ?',
      [userId, promptId]
    );

    // 更新提示词的质量分数
    updatePromptQualityScore(promptId);

    res.status(200).json({ message: '评分已删除' });
  } catch (error) {
    console.error('删除评分失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取用户的所有评分
exports.getUserRatings = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // 检查用户是否存在
    const [users] = await pool.query('SELECT id FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 获取用户评分（包含提示词信息）
    const [ratings] = await pool.query(`
      SELECT r.id, r.rating, r.created_at, r.updated_at,
        pc.id as prompt_id, pc.prompt_text, pc.preview_url,
        pt.name as type_name, c.name as category_name,
        rl.name as rarity_name, rl.color_code
      FROM ratings r
      JOIN prompt_cards pc ON r.prompt_card_id = pc.id
      JOIN prompt_types pt ON pc.type_id = pt.id
      JOIN categories c ON pc.category_id = c.id
      JOIN rarity_levels rl ON pc.rarity_level_id = rl.id
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `, [userId, parseInt(limit), parseInt(offset)]);

    // 获取总评分数以支持分页
    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM ratings WHERE user_id = ?',
      [userId]
    );

    const total = countResult[0].total;

    res.status(200).json({
      ratings,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取用户评分列表失败:', error);
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

// 辅助函数：更新提示词质量分数
async function updatePromptQualityScore(promptId) {
  try {
    // 获取该提示词的平均评分
    const [result] = await pool.query(`
      SELECT AVG(rating) * 20 as quality_score
      FROM ratings
      WHERE prompt_card_id = ?
    `, [promptId]);

    let qualityScore = result[0].quality_score;
    
    // 如果没有评分，保持原始分数
    if (!qualityScore) {
      return;
    }

    // 将评分四舍五入为整数
    qualityScore = Math.round(qualityScore);
    
    // 根据平均评分更新质量分数
    await pool.query(
      'UPDATE prompt_cards SET quality_score = ? WHERE id = ?',
      [qualityScore, promptId]
    );

    // 根据新的质量分数更新稀有度等级
    await updateRarityLevel(promptId, qualityScore);
  } catch (error) {
    console.error('更新提示词质量分数失败:', error);
  }
}

// 辅助函数：更新稀有度等级
async function updateRarityLevel(promptId, qualityScore) {
  try {
    // 根据质量分数找到对应的稀有度等级
    const [levels] = await pool.query(`
      SELECT id 
      FROM rarity_levels 
      WHERE ? BETWEEN min_score AND max_score
    `, [qualityScore]);

    if (levels.length > 0) {
      // 更新提示词的稀有度等级
      await pool.query(
        'UPDATE prompt_cards SET rarity_level_id = ? WHERE id = ?',
        [levels[0].id, promptId]
      );
    }
  } catch (error) {
    console.error('更新稀有度等级失败:', error);
  }
}
// 收藏控制器
const { pool } = require('../config/database');

// 获取用户收藏列表
exports.getUserCollections = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    
    const offset = (page - 1) * limit;
    
    // 获取用户收藏的提示词，按收藏时间排序
    const [rows] = await pool.query(`
      SELECT pc.*, c.name as category_name, uc.collected_at
      FROM user_collections uc
      JOIN prompt_cards pc ON uc.prompt_card_id = pc.id
      JOIN categories c ON pc.category_id = c.id
      WHERE uc.user_id = ?
      ORDER BY uc.collected_at DESC
      LIMIT ? OFFSET ?
    `, [userId, parseInt(limit), parseInt(offset)]);
    
    // 获取总数以支持分页
    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM user_collections WHERE user_id = ?',
      [userId]
    );
    
    const total = countResult[0].total;
    
    res.status(200).json({
      data: rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取用户收藏失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 添加提示词到收藏
exports.addToCollection = async (req, res) => {
  try {
    const userId = req.user.id;
    const { promptId } = req.params;
    
    // 检查提示词是否存在
    const [promptExists] = await pool.query(
      'SELECT id FROM prompt_cards WHERE id = ?',
      [promptId]
    );
    
    if (promptExists.length === 0) {
      return res.status(404).json({ message: '提示词不存在' });
    }
    
    // 检查是否已收藏
    const [existingCollection] = await pool.query(
      'SELECT id FROM user_collections WHERE user_id = ? AND prompt_card_id = ?',
      [userId, promptId]
    );
    
    if (existingCollection.length > 0) {
      return res.status(409).json({ message: '已经收藏过该提示词' });
    }
    
    // 添加到收藏
    await pool.query(
      'INSERT INTO user_collections (user_id, prompt_card_id) VALUES (?, ?)',
      [userId, promptId]
    );
    
    res.status(201).json({ message: '添加到收藏成功' });
  } catch (error) {
    console.error('添加收藏失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 从收藏中移除提示词
exports.removeFromCollection = async (req, res) => {
  try {
    const userId = req.user.id;
    const { promptId } = req.params;
    
    // 检查是否已收藏
    const [existingCollection] = await pool.query(
      'SELECT id FROM user_collections WHERE user_id = ? AND prompt_card_id = ?',
      [userId, promptId]
    );
    
    if (existingCollection.length === 0) {
      return res.status(404).json({ message: '未找到该收藏' });
    }
    
    // 从收藏中移除
    await pool.query(
      'DELETE FROM user_collections WHERE user_id = ? AND prompt_card_id = ?',
      [userId, promptId]
    );
    
    res.status(200).json({ message: '已从收藏中移除' });
  } catch (error) {
    console.error('移除收藏失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};
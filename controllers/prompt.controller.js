// 提示词控制器
const { pool } = require('../config/database');

// 获取随机提示词卡片，考虑质量分数作为权重
exports.getRandomPrompt = async (req, res) => {
  try {
    // 基础概率设置
    const highQualityProbability = 0.7; // 70%概率抽取高质量提示词
    
    let result;
    
    // 随机决定是否抽取高质量提示词
    if (Math.random() < highQualityProbability) {
      // 抽取高质量提示词（根据quality_score作为权重）
      const [rows] = await pool.query(`
        SELECT pc.*, c.name as category_name
        FROM prompt_cards pc
        JOIN categories c ON pc.category_id = c.id
        WHERE pc.quality_score > 80
        ORDER BY pc.quality_score DESC, RAND()
        LIMIT 1
      `);
      
      result = rows[0];
    } else {
      // 抽取普通提示词
      const [rows] = await pool.query(`
        SELECT pc.*, c.name as category_name
        FROM prompt_cards pc
        JOIN categories c ON pc.category_id = c.id
        ORDER BY RAND()
        LIMIT 1
      `);
      
      result = rows[0];
    }
    
    if (!result) {
      return res.status(404).json({ message: '没有找到提示词卡片' });
    }
    
    res.status(200).json(result);
  } catch (error) {
    console.error('获取随机提示词失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 根据类别获取提示词
exports.getPromptsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const offset = (page - 1) * limit;
    
    const [rows] = await pool.query(`
      SELECT pc.*, c.name as category_name
      FROM prompt_cards pc
      JOIN categories c ON pc.category_id = c.id
      WHERE pc.category_id = ?
      ORDER BY pc.quality_score DESC
      LIMIT ? OFFSET ?
    `, [categoryId, parseInt(limit), parseInt(offset)]);
    
    // 获取总数以支持分页
    const [countResult] = await pool.query(`
      SELECT COUNT(*) as total
      FROM prompt_cards
      WHERE category_id = ?
    `, [categoryId]);
    
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
    console.error('获取类别提示词失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取所有类别
exports.getAllCategories = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.*, COUNT(pc.id) as prompt_count
      FROM categories c
      LEFT JOIN prompt_cards pc ON c.id = pc.category_id
      GROUP BY c.id
      ORDER BY c.name
    `);
    
    res.status(200).json(rows);
  } catch (error) {
    console.error('获取所有类别失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取单个提示词详情
exports.getPromptById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [rows] = await pool.query(`
      SELECT pc.*, c.name as category_name
      FROM prompt_cards pc
      JOIN categories c ON pc.category_id = c.id
      WHERE pc.id = ?
    `, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: '提示词不存在' });
    }
    
    res.status(200).json(rows[0]);
  } catch (error) {
    console.error('获取提示词详情失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};
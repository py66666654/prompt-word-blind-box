/**
 * 抽卡系统控制器
 * 负责提示词盲盒抽取相关功能
 */
const { pool } = require('../config/database');
const { getUserDailyDrawsLimit } = require('../services/user.service');

/**
 * 稀有度阈值计算服务
 * 用于实现稀有度抽取概率和保底机制
 */
const rarityService = require('../services/rarity.service');

/**
 * 从指定卡池抽取提示词
 * 
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.drawPrompt = async (req, res) => {
  try {
    const userId = req.user.id;
    const { poolId = 1 } = req.body; // 默认使用标准卡池
    
    // 检查用户剩余抽取次数
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // 获取用户信息
      const [userRows] = await connection.execute(
        'SELECT daily_draws_remaining, premium FROM users WHERE id = ?',
        [userId]
      );
      
      if (userRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ message: '用户不存在' });
      }
      
      const user = userRows[0];
      
      // 检查剩余抽取次数
      if (user.daily_draws_remaining <= 0) {
        await connection.rollback();
        return res.status(403).json({ message: '今日抽取次数已用完' });
      }
      
      // 获取卡池信息
      const [poolRows] = await connection.execute(
        'SELECT * FROM card_pools WHERE id = ? AND active = TRUE',
        [poolId]
      );
      
      if (poolRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ message: '卡池不存在或未激活' });
      }
      
      const pool = poolRows[0];
      
      // 检查卡池使用权限
      if (pool.pool_type === 'contributor' && user.role !== 'contributor' && user.role !== 'admin') {
        await connection.rollback();
        return res.status(403).json({ message: '您没有权限使用此卡池' });
      }
      
      // 获取卡池稀有度提升信息
      let poolRarityBoost = await rarityService.getPoolRarityBoost(poolId);
      let rarityBoostFactor = poolRarityBoost.factor || 1.0;
      
      // 获取用户抽卡历史总数
      const [historyRows] = await connection.execute(
        'SELECT COUNT(*) as total_draws FROM draw_history WHERE user_id = ?',
        [userId]
      );
      
      const totalDraws = historyRows[0].total_draws;
      
      // 应用新手保底
      if (totalDraws < 10 && pool.pool_type === 'new_user') {
        rarityBoostFactor *= 1.5; // 新手卡池额外提升50%高稀有度概率
        console.log(`应用新手保底提升，稀有度提升系数: ${rarityBoostFactor}`);
      }
      
      // 计算用户保底情况和动态概率提升
      const pityInfo = await rarityService.calculatePityBoost(userId);
      
      // 记录保底状态（用于日志和调试）
      if (pityInfo.forcedRarityId) {
        console.log(`保底系统触发，保证抽取稀有度ID: ${pityInfo.forcedRarityId}`);
      } else if (pityInfo.dynamicBoostFactor > 1.0) {
        console.log(`动态提升激活，提升系数: ${pityInfo.dynamicBoostFactor}`);
      }
      
      // 确定抽取的稀有度
      const rarityId = await rarityService.determineRarity(rarityBoostFactor, pityInfo);
      
      // 根据稀有度抽取提示词
      let promptQuery = `
        SELECT pc.* FROM prompt_cards pc
        JOIN card_pool_prompts cpp ON pc.id = cpp.prompt_id
        WHERE cpp.pool_id = ? AND pc.rarity_level_id = ? AND pc.status = 'approved'
      `;
      
      // 如果是特定卡池，考虑卡池权重
      let params = [poolId, rarityId];
      
      if (pool.pool_type !== 'standard') {
        promptQuery += ` ORDER BY cpp.weight DESC, RAND()`;
      } else {
        promptQuery += ` ORDER BY RAND()`;
      }
      
      promptQuery += ` LIMIT 1`;
      
      const [promptRows] = await connection.execute(promptQuery, params);
      
      if (promptRows.length === 0) {
        // 如果当前稀有度没有可用提示词，回退到低一级稀有度
        const [fallbackRows] = await connection.execute(`
          SELECT pc.* FROM prompt_cards pc
          JOIN card_pool_prompts cpp ON pc.id = cpp.prompt_id
          WHERE cpp.pool_id = ? AND pc.rarity_level_id < ? AND pc.status = 'approved'
          ORDER BY pc.rarity_level_id DESC, RAND()
          LIMIT 1
        `, [poolId, rarityId]);
        
        if (fallbackRows.length === 0) {
          await connection.rollback();
          return res.status(404).json({ message: '没有可用的提示词' });
        }
        
        promptRows[0] = fallbackRows[0];
      }
      
      const promptCard = promptRows[0];
      
      // 记录抽卡历史
      await connection.execute(
        'INSERT INTO draw_history (user_id, prompt_card_id, draw_method) VALUES (?, ?, ?)',
        [userId, promptCard.id, pool.pool_type]
      );
      
      // 更新用户剩余抽取次数
      await connection.execute(
        'UPDATE users SET daily_draws_remaining = daily_draws_remaining - 1 WHERE id = ?',
        [userId]
      );
      
      // 获取提示词的完整信息（包括分类、类型和稀有度）
      const [fullPromptRows] = await connection.execute(`
        SELECT 
          pc.*,
          c.name as category_name,
          pt.name as type_name,
          rl.name as rarity_name,
          rl.color_code as rarity_color
        FROM prompt_cards pc
        LEFT JOIN categories c ON pc.category_id = c.id
        LEFT JOIN prompt_types pt ON pc.type_id = pt.id
        LEFT JOIN rarity_levels rl ON pc.rarity_level_id = rl.id
        WHERE pc.id = ?
      `, [promptCard.id]);
      
      // 如果是创意卡片类型（角色卡、世界卡、剧情卡），获取额外信息
      let extraCardData = null;
      
      if (promptCard.type_id === 6) { // 角色卡
        const [characterData] = await connection.execute(
          'SELECT * FROM character_cards WHERE prompt_id = ?',
          [promptCard.id]
        );
        
        if (characterData.length > 0) {
          extraCardData = characterData[0];
          
          // 获取角色卡标签
          const [tagRows] = await connection.execute(`
            SELECT ct.name FROM character_tags ct
            JOIN character_card_tags cct ON ct.id = cct.tag_id
            WHERE cct.character_card_id = ?
          `, [extraCardData.id]);
          
          extraCardData.tags = tagRows.map(row => row.name);
        }
      } else if (promptCard.type_id === 7) { // 世界卡
        const [worldData] = await connection.execute(
          'SELECT * FROM world_cards WHERE prompt_id = ?',
          [promptCard.id]
        );
        
        if (worldData.length > 0) {
          extraCardData = worldData[0];
          
          // 获取世界卡标签
          const [tagRows] = await connection.execute(`
            SELECT wt.name FROM world_tags wt
            JOIN world_card_tags wct ON wt.id = wct.tag_id
            WHERE wct.world_card_id = ?
          `, [extraCardData.id]);
          
          extraCardData.tags = tagRows.map(row => row.name);
        }
      } else if (promptCard.type_id === 8) { // 剧情卡
        const [plotData] = await connection.execute(
          'SELECT * FROM plot_cards WHERE prompt_id = ?',
          [promptCard.id]
        );
        
        if (plotData.length > 0) {
          extraCardData = plotData[0];
          
          // 获取剧情卡标签
          const [tagRows] = await connection.execute(`
            SELECT pt.name FROM plot_tags pt
            JOIN plot_card_tags pct ON pt.id = pct.tag_id
            WHERE pct.plot_card_id = ?
          `, [extraCardData.id]);
          
          extraCardData.tags = tagRows.map(row => row.name);
        }
      }
      
      // 提交事务
      await connection.commit();
      
      // 获取用户更新后的剩余抽取次数
      const [updatedUserRows] = await connection.execute(
        'SELECT daily_draws_remaining FROM users WHERE id = ?',
        [userId]
      );
      
      // 组装返回结果
      const result = {
        promptCard: fullPromptRows[0],
        remainingDraws: updatedUserRows[0].daily_draws_remaining,
        drawPool: pool.name,
        extraCardData
      };
      
      return res.json(result);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('抽取提示词出错:', error);
    return res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

/**
 * 获取用户抽取历史
 * 
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.getDrawHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    
    const offset = (page - 1) * limit;
    
    // 获取历史记录
    const [historyRows] = await pool.execute(`
      SELECT 
        dh.id, dh.drawn_at, dh.draw_method,
        pc.id as prompt_id, pc.prompt_text, pc.preview_url,
        rl.name as rarity_name, rl.color_code as rarity_color,
        pt.name as type_name, c.name as category_name,
        (SELECT COUNT(*) FROM user_collections uc WHERE uc.user_id = ? AND uc.prompt_card_id = pc.id) > 0 as is_collected
      FROM draw_history dh
      JOIN prompt_cards pc ON dh.prompt_card_id = pc.id
      LEFT JOIN rarity_levels rl ON pc.rarity_level_id = rl.id
      LEFT JOIN prompt_types pt ON pc.type_id = pt.id
      LEFT JOIN categories c ON pc.category_id = c.id
      WHERE dh.user_id = ?
      ORDER BY dh.drawn_at DESC
      LIMIT ? OFFSET ?
    `, [userId, userId, parseInt(limit), offset]);
    
    // 获取总记录数
    const [countRows] = await pool.execute(
      'SELECT COUNT(*) as total FROM draw_history WHERE user_id = ?',
      [userId]
    );
    
    const total = countRows[0].total;
    const totalPages = Math.ceil(total / limit);
    
    return res.json({
      history: historyRows,
      pagination: {
        total,
        totalPages,
        currentPage: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('获取抽取历史出错:', error);
    return res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

/**
 * 获取用户剩余抽取次数
 * 
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.getRemainingDraws = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 获取用户信息
    const [userRows] = await pool.execute(
      'SELECT daily_draws_remaining, daily_draws_max, premium FROM users WHERE id = ?',
      [userId]
    );
    
    if (userRows.length === 0) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    const user = userRows[0];
    
    // 获取下次重置时间（第二天0点）
    const now = new Date();
    const resetTime = new Date(now);
    resetTime.setDate(resetTime.getDate() + 1);
    resetTime.setHours(0, 0, 0, 0);
    
    return res.json({
      remainingDraws: user.daily_draws_remaining,
      maxDraws: user.daily_draws_max,
      nextResetTime: resetTime.toISOString(),
      premium: user.premium
    });
  } catch (error) {
    console.error('获取剩余抽取次数出错:', error);
    return res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

/**
 * 获取抽取统计数据
 * 
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.getDrawStats = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 获取按稀有度分组的抽取统计
    const [rarityStats] = await pool.execute(`
      SELECT 
        rl.id as rarity_id,
        rl.name as rarity_name,
        rl.color_code,
        COUNT(*) as count
      FROM draw_history dh
      JOIN prompt_cards pc ON dh.prompt_card_id = pc.id
      JOIN rarity_levels rl ON pc.rarity_level_id = rl.id
      WHERE dh.user_id = ?
      GROUP BY rl.id
      ORDER BY rl.id
    `, [userId]);
    
    // 获取按类型分组的抽取统计
    const [typeStats] = await pool.execute(`
      SELECT 
        pt.id as type_id,
        pt.name as type_name,
        COUNT(*) as count
      FROM draw_history dh
      JOIN prompt_cards pc ON dh.prompt_card_id = pc.id
      JOIN prompt_types pt ON pc.type_id = pt.id
      WHERE dh.user_id = ?
      GROUP BY pt.id
      ORDER BY count DESC
    `, [userId]);
    
    // 获取总抽取次数
    const [totalRows] = await pool.execute(
      'SELECT COUNT(*) as total FROM draw_history WHERE user_id = ?',
      [userId]
    );
    
    // 获取最近7天的抽取趋势
    const [trends] = await pool.execute(`
      SELECT 
        DATE(drawn_at) as date,
        COUNT(*) as count
      FROM draw_history
      WHERE user_id = ? AND drawn_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DATE(drawn_at)
      ORDER BY date
    `, [userId]);
    
    return res.json({
      totalDraws: totalRows[0].total,
      rarityStats,
      typeStats,
      trends
    });
  } catch (error) {
    console.error('获取抽取统计数据出错:', error);
    return res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

/**
 * 获取卡池信息
 * 
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.getCardPools = async (req, res) => {
  try {
    // 获取所有活跃卡池信息
    const [pools] = await pool.execute(`
      SELECT id, name, description, pool_type, image_url,
        start_time, end_time, requirements
      FROM card_pools
      WHERE active = TRUE
        AND (start_time IS NULL OR start_time <= NOW())
        AND (end_time IS NULL OR end_time >= NOW())
    `);
    
    // 获取每个卡池的提示词数量
    for (const pool of pools) {
      const [countRows] = await pool.execute(`
        SELECT COUNT(*) as count
        FROM card_pool_prompts
        WHERE pool_id = ?
      `, [pool.id]);
      
      pool.promptCount = countRows[0].count;
    }
    
    return res.json(pools);
  } catch (error) {
    console.error('获取卡池信息出错:', error);
    return res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

/**
 * 获取特定卡池信息
 * 
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.getCardPoolById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 获取卡池基本信息
    const [poolRows] = await pool.execute(`
      SELECT id, name, description, pool_type, image_url,
        start_time, end_time, requirements, rarity_boost
      FROM card_pools
      WHERE id = ? AND active = TRUE
    `, [id]);
    
    if (poolRows.length === 0) {
      return res.status(404).json({ message: '卡池不存在或未激活' });
    }
    
    const cardPool = poolRows[0];
    
    // 获取卡池稀有度分布统计
    const [rarityStats] = await pool.execute(`
      SELECT 
        rl.id as rarity_id,
        rl.name as rarity_name,
        rl.color_code,
        COUNT(*) as count
      FROM card_pool_prompts cpp
      JOIN prompt_cards pc ON cpp.prompt_id = pc.id
      JOIN rarity_levels rl ON pc.rarity_level_id = rl.id
      WHERE cpp.pool_id = ?
      GROUP BY rl.id
      ORDER BY rl.id
    `, [id]);
    
    // 获取卡池类型分布统计
    const [typeStats] = await pool.execute(`
      SELECT 
        pt.id as type_id,
        pt.name as type_name,
        COUNT(*) as count
      FROM card_pool_prompts cpp
      JOIN prompt_cards pc ON cpp.prompt_id = pc.id
      JOIN prompt_types pt ON pc.type_id = pt.id
      WHERE cpp.pool_id = ?
      GROUP BY pt.id
      ORDER BY count DESC
    `, [id]);
    
    // 如果有稀有度提升配置，解析JSON
    if (cardPool.rarity_boost) {
      try {
        cardPool.rarity_boost = JSON.parse(cardPool.rarity_boost);
      } catch (e) {
        cardPool.rarity_boost = { factor: 1.0 };
      }
    }
    
    // 组装结果
    const result = {
      ...cardPool,
      rarityStats,
      typeStats
    };
    
    return res.json(result);
  } catch (error) {
    console.error('获取卡池信息出错:', error);
    return res.status(500).json({ message: '服务器错误', error: error.message });
  }
};
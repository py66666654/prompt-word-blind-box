/**
 * 稀有度计算服务
 * 负责提示词稀有度概率计算和抽取逻辑
 */
const { pool } = require('../config/database');

/**
 * 获取所有稀有度级别及其概率
 * 
 * @returns {Promise<Array>} 所有稀有度级别数据
 */
const getRarityLevels = async () => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, name, min_score, max_score, probability FROM rarity_levels ORDER BY id'
    );
    return rows;
  } catch (error) {
    console.error('获取稀有度级别失败:', error);
    throw error;
  }
};

/**
 * 根据增益系数调整稀有度概率
 * 
 * @param {Array} rarityLevels - 原始稀有度级别数据
 * @param {Number} boostFactor - 稀有度概率增益系数 (> 1.0 增加高稀有度概率)
 * @returns {Array} 调整后的稀有度级别数据
 */
const adjustRarityProbabilities = (rarityLevels, boostFactor = 1.0) => {
  // 如果增益系数为1，无需调整
  if (boostFactor === 1.0) {
    return rarityLevels;
  }
  
  // 复制原始数据
  const adjusted = JSON.parse(JSON.stringify(rarityLevels));
  
  // 区分普通稀有度(1-3)和高稀有度(4-6)
  const normalRarities = adjusted.filter(r => r.id <= 3);
  const highRarities = adjusted.filter(r => r.id > 3);
  
  // 计算原始普通和高稀有度总概率
  const originalNormalProb = normalRarities.reduce((sum, r) => sum + r.probability, 0);
  const originalHighProb = highRarities.reduce((sum, r) => sum + r.probability, 0);
  
  // 增加高稀有度概率
  const newHighProb = Math.min(originalHighProb * boostFactor, 1.0);
  // 减少普通稀有度概率
  const newNormalProb = Math.max(1.0 - newHighProb, 0);
  
  // 保持高稀有度内部和普通稀有度内部的相对概率不变
  highRarities.forEach(r => {
    r.probability = (r.probability / originalHighProb) * newHighProb;
  });
  
  normalRarities.forEach(r => {
    r.probability = (r.probability / originalNormalProb) * newNormalProb;
  });
  
  return [...normalRarities, ...highRarities];
};

/**
 * 根据概率确定抽取的稀有度
 * 
 * @param {Number} boostFactor - 稀有度概率增益系数
 * @returns {Promise<Number>} 抽取的稀有度ID
 */
exports.determineRarity = async (boostFactor = 1.0) => {
  try {
    // 获取稀有度级别数据
    let rarityLevels = await getRarityLevels();
    
    // 应用增益系数调整概率
    rarityLevels = adjustRarityProbabilities(rarityLevels, boostFactor);
    
    // 随机数生成
    const randomValue = Math.random();
    
    // 累计概率
    let cumulativeProbability = 0;
    
    // 根据概率确定稀有度
    for (const rarity of rarityLevels) {
      cumulativeProbability += rarity.probability;
      if (randomValue <= cumulativeProbability) {
        return rarity.id;
      }
    }
    
    // 如果所有概率之和小于1，默认返回最低稀有度
    return rarityLevels[0].id;
  } catch (error) {
    console.error('确定稀有度失败:', error);
    // 出错时默认返回最低稀有度（ID为1）
    return 1;
  }
};

/**
 * 获取用户的抽卡保底情况
 * 
 * @param {Number} userId - 用户ID
 * @returns {Promise<Object>} 保底情况
 */
exports.getUserPityStatus = async (userId) => {
  try {
    // 获取系统保底配置
    const [configRows] = await pool.execute(
      'SELECT config_key, config_value FROM system_configs WHERE config_key IN (?, ?, ?)',
      ['PITY_SYSTEM_RARE', 'PITY_SYSTEM_EPIC', 'PITY_SYSTEM_LEGENDARY']
    );
    
    const pityConfig = {};
    configRows.forEach(row => {
      pityConfig[row.config_key] = parseInt(row.config_value);
    });
    
    // 获取用户抽卡历史中的保底相关数据
    const [historyRows] = await pool.execute(`
      WITH recent_draws AS (
        SELECT 
          dh.id,
          dh.drawn_at,
          pc.rarity_level_id,
          ROW_NUMBER() OVER(ORDER BY dh.drawn_at DESC) as draw_number
        FROM draw_history dh
        JOIN prompt_cards pc ON dh.prompt_card_id = pc.id
        WHERE dh.user_id = ?
        ORDER BY dh.drawn_at DESC
      )
      SELECT
        (SELECT COUNT(*) FROM recent_draws) as total_draws,
        (SELECT MIN(draw_number) FROM recent_draws WHERE rarity_level_id >= 4) as draws_since_rare,
        (SELECT MIN(draw_number) FROM recent_draws WHERE rarity_level_id >= 5) as draws_since_epic,
        (SELECT MIN(draw_number) FROM recent_draws WHERE rarity_level_id >= 6) as draws_since_legendary
    `, [userId]);
    
    if (historyRows.length === 0 || historyRows[0].total_draws === 0) {
      return {
        totalDraws: 0,
        drawsSinceRare: 0,
        drawsSinceEpic: 0,
        drawsSinceLegendary: 0,
        rareGuaranteeAt: pityConfig.PITY_SYSTEM_RARE,
        epicGuaranteeAt: pityConfig.PITY_SYSTEM_EPIC,
        legendaryGuaranteeAt: pityConfig.PITY_SYSTEM_LEGENDARY,
        rareProgress: 0,
        epicProgress: 0,
        legendaryProgress: 0
      };
    }
    
    const data = historyRows[0];
    
    // 计算各稀有度保底的进度
    const drawsSinceRare = data.draws_since_rare ? data.draws_since_rare - 1 : data.total_draws;
    const drawsSinceEpic = data.draws_since_epic ? data.draws_since_epic - 1 : data.total_draws;
    const drawsSinceLegendary = data.draws_since_legendary ? data.draws_since_legendary - 1 : data.total_draws;
    
    const rareProgress = Math.min(drawsSinceRare / pityConfig.PITY_SYSTEM_RARE, 1) * 100;
    const epicProgress = Math.min(drawsSinceEpic / pityConfig.PITY_SYSTEM_EPIC, 1) * 100;
    const legendaryProgress = Math.min(drawsSinceLegendary / pityConfig.PITY_SYSTEM_LEGENDARY, 1) * 100;
    
    return {
      totalDraws: data.total_draws,
      drawsSinceRare,
      drawsSinceEpic,
      drawsSinceLegendary,
      rareGuaranteeAt: pityConfig.PITY_SYSTEM_RARE,
      epicGuaranteeAt: pityConfig.PITY_SYSTEM_EPIC,
      legendaryGuaranteeAt: pityConfig.PITY_SYSTEM_LEGENDARY,
      rareProgress: Math.round(rareProgress),
      epicProgress: Math.round(epicProgress),
      legendaryProgress: Math.round(legendaryProgress)
    };
  } catch (error) {
    console.error('获取用户保底状态失败:', error);
    return {
      error: '获取保底状态失败',
      message: error.message
    };
  }
};

/**
 * 获取卡池的稀有度增益系数
 * 
 * @param {Number} poolId - 卡池ID
 * @returns {Promise<Number>} 稀有度增益系数
 */
exports.getPoolRarityBoost = async (poolId) => {
  try {
    const [rows] = await pool.execute(
      'SELECT rarity_boost FROM card_pools WHERE id = ?',
      [poolId]
    );
    
    if (rows.length === 0 || !rows[0].rarity_boost) {
      return 1.0;
    }
    
    const rarityBoost = JSON.parse(rows[0].rarity_boost);
    return rarityBoost.factor || 1.0;
  } catch (error) {
    console.error('获取卡池稀有度增益失败:', error);
    return 1.0;
  }
};
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
      'SELECT id, name, min_score, max_score, probability, color_code FROM rarity_levels ORDER BY id'
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
  
  // 根据PRD更新稀有度分组:
  // 普通/优质 (1-2): 常见稀有度
  // 精品/珍贵 (3-4): 较稀有
  // 稀有/传说 (5-6): 非常稀有
  const commonRarities = adjusted.filter(r => r.id <= 2);  // 普通、优质
  const uncommonRarities = adjusted.filter(r => r.id > 2 && r.id <= 4);  // 精品、珍贵
  const rareRarities = adjusted.filter(r => r.id > 4);  // 稀有、传说
  
  // 计算原始各组总概率
  const originalCommonProb = commonRarities.reduce((sum, r) => sum + r.probability, 0);
  const originalUncommonProb = uncommonRarities.reduce((sum, r) => sum + r.probability, 0);
  const originalRareProb = rareRarities.reduce((sum, r) => sum + r.probability, 0);
  
  // 计算提升后的高稀有度概率
  // 较稀有和非常稀有的组都会被提升，但提升幅度不同
  const newUncommonProb = Math.min(originalUncommonProb * (boostFactor * 0.7 + 0.3), originalUncommonProb * 3);
  const newRareProb = Math.min(originalRareProb * boostFactor, originalRareProb * 5);
  
  // 确保总概率为1
  const newCommonProb = Math.max(1.0 - newUncommonProb - newRareProb, 0);
  
  // 保持各稀有度组内部相对概率不变
  if (commonRarities.length > 0) {
    commonRarities.forEach(r => {
      r.probability = (r.probability / originalCommonProb) * newCommonProb;
    });
  }
  
  if (uncommonRarities.length > 0) {
    uncommonRarities.forEach(r => {
      r.probability = (r.probability / originalUncommonProb) * newUncommonProb;
    });
  }
  
  if (rareRarities.length > 0) {
    rareRarities.forEach(r => {
      r.probability = (r.probability / originalRareProb) * newRareProb;
    });
  }
  
  // 返回调整后的全部稀有度数据
  return [...commonRarities, ...uncommonRarities, ...rareRarities];
};

/**
 * 根据概率确定抽取的稀有度
 * 
 * @param {Number} boostFactor - 稀有度概率增益系数
 * @param {Object} pityInfo - 保底系统信息
 * @returns {Promise<Number>} 抽取的稀有度ID
 */
exports.determineRarity = async (boostFactor = 1.0, pityInfo = null) => {
  try {
    // 获取稀有度级别数据
    let rarityLevels = await getRarityLevels();
    
    // 检查保底系统是否触发
    if (pityInfo) {
      // 保底系统触发，直接返回对应稀有度
      if (pityInfo.forcedRarityId) {
        console.log(`保底系统触发，强制抽取稀有度ID: ${pityInfo.forcedRarityId}`);
        return pityInfo.forcedRarityId;
      }
      
      // 应用动态提升系数
      if (pityInfo.dynamicBoostFactor && pityInfo.dynamicBoostFactor > boostFactor) {
        boostFactor = pityInfo.dynamicBoostFactor;
        console.log(`应用保底动态提升，新增益系数: ${boostFactor}`);
      }
    }
    
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
 * 计算用户的保底情况和动态概率提升
 * 
 * @param {Number} userId - 用户ID
 * @returns {Promise<Object>} 保底情况和概率提升因子
 */
exports.calculatePityBoost = async (userId) => {
  try {
    // 获取系统保底配置
    const [configRows] = await pool.execute(
      'SELECT config_key, config_value FROM system_configs WHERE config_key IN (?, ?, ?, ?, ?)',
      [
        'PITY_SYSTEM_RARE', 
        'PITY_SYSTEM_EPIC', 
        'PITY_SYSTEM_LEGENDARY',
        'PITY_BOOST_INCREMENT',
        'PITY_BOOST_MAX'
      ]
    );
    
    const pityConfig = {};
    configRows.forEach(row => {
      pityConfig[row.config_key] = parseFloat(row.config_value);
    });
    
    // 默认值设置
    const pityThresholds = {
      rare: pityConfig.PITY_SYSTEM_RARE || 30,        // 珍贵保底
      epic: pityConfig.PITY_SYSTEM_EPIC || 60,        // 稀有保底
      legendary: pityConfig.PITY_SYSTEM_LEGENDARY || 100, // 传说保底
      boostIncrement: pityConfig.PITY_BOOST_INCREMENT || 0.05, // 每次未抽到高稀有度增加的提升系数
      boostMax: pityConfig.PITY_BOOST_MAX || 2.5      // 最大提升系数
    };
    
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
        forcedRarityId: null,
        dynamicBoostFactor: 1.0,
        pityProgress: {
          rare: 0,
          epic: 0,
          legendary: 0
        }
      };
    }
    
    const data = historyRows[0];
    
    // 计算各稀有度保底的进度
    const drawsSinceRare = data.draws_since_rare ? data.draws_since_rare - 1 : data.total_draws;
    const drawsSinceEpic = data.draws_since_epic ? data.draws_since_epic - 1 : data.total_draws;
    const drawsSinceLegendary = data.draws_since_legendary ? data.draws_since_legendary - 1 : data.total_draws;
    
    // 计算进度百分比
    const rareProgress = Math.min(drawsSinceRare / pityThresholds.rare, 1) * 100;
    const epicProgress = Math.min(drawsSinceEpic / pityThresholds.epic, 1) * 100;
    const legendaryProgress = Math.min(drawsSinceLegendary / pityThresholds.legendary, 1) * 100;
    
    // 检查是否触发任何保底
    let forcedRarityId = null;
    
    if (drawsSinceLegendary >= pityThresholds.legendary) {
      forcedRarityId = 6; // 传说
    } else if (drawsSinceEpic >= pityThresholds.epic) {
      forcedRarityId = 5; // 稀有
    } else if (drawsSinceRare >= pityThresholds.rare) {
      forcedRarityId = 4; // 珍贵
    }
    
    // 计算动态提升系数 - 抽取次数越多，提升系数越大
    // 以珍贵为基准（ID=4）计算动态提升
    const highestDrawsSince = drawsSinceRare;
    const baseBoostFactor = 1.0;
    
    // 每多抽10次增加boostIncrement的提升
    const increaseFactor = Math.floor(highestDrawsSince / 10) * pityThresholds.boostIncrement;
    const dynamicBoostFactor = Math.min(baseBoostFactor + increaseFactor, pityThresholds.boostMax);
    
    return {
      totalDraws: data.total_draws,
      drawsSinceRare,
      drawsSinceEpic,
      drawsSinceLegendary,
      forcedRarityId,
      dynamicBoostFactor,
      pityProgress: {
        rare: Math.round(rareProgress),
        epic: Math.round(epicProgress),
        legendary: Math.round(legendaryProgress)
      }
    };
  } catch (error) {
    console.error('计算用户保底提升失败:', error);
    return {
      error: '计算保底提升失败',
      message: error.message,
      forcedRarityId: null,
      dynamicBoostFactor: 1.0
    };
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
 * @returns {Promise<Object>} 稀有度增益配置
 */
exports.getPoolRarityBoost = async (poolId) => {
  try {
    const [rows] = await pool.execute(
      'SELECT rarity_boost FROM card_pools WHERE id = ?',
      [poolId]
    );
    
    if (rows.length === 0 || !rows[0].rarity_boost) {
      return {
        factor: 1.0,
        description: '标准概率'
      };
    }
    
    try {
      const rarityBoost = JSON.parse(rows[0].rarity_boost);
      return {
        factor: rarityBoost.factor || 1.0,
        description: rarityBoost.description || '标准概率'
      };
    } catch (e) {
      console.error('解析卡池稀有度增益JSON失败:', e);
      return {
        factor: 1.0,
        description: '标准概率'
      };
    }
  } catch (error) {
    console.error('获取卡池稀有度增益失败:', error);
    return {
      factor: 1.0,
      description: '标准概率'
    };
  }
};
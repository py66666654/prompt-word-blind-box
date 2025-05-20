// 排行榜控制器
const { pool } = require('../config/database');

// 初始化排行榜类型
exports.initializeLeaderboardTypes = async () => {
  try {
    // 检查是否已初始化
    const [existingTypes] = await pool.query(
      'SELECT COUNT(*) as count FROM leaderboard_types'
    );

    if (existingTypes[0].count > 0) {
      return { message: '排行榜类型已初始化', count: existingTypes[0].count };
    }

    // 定义排行榜类型
    const leaderboardTypes = [
      {
        name: '成就积分榜',
        description: '根据用户获得的成就积分排名',
        calculation_type: 'total',
        time_period: 'all_time'
      },
      {
        name: '成就积分周榜',
        description: '本周成就积分增长排名',
        calculation_type: 'total',
        time_period: 'weekly'
      },
      {
        name: '收藏数量榜',
        description: '用户收藏的提示词数量排名',
        calculation_type: 'count',
        time_period: 'all_time'
      },
      {
        name: '创作数量榜',
        description: '用户创建的提示词数量排名',
        calculation_type: 'count',
        time_period: 'all_time'
      },
      {
        name: '社交活跃榜',
        description: '用户社交互动（评论、评分、分享）次数排名',
        calculation_type: 'count',
        time_period: 'weekly'
      },
      {
        name: '影响力榜',
        description: '用户粉丝数量排名',
        calculation_type: 'count',
        time_period: 'all_time'
      },
      {
        name: '平均评分榜',
        description: '用户创建的提示词的平均评分排名',
        calculation_type: 'average',
        time_period: 'all_time'
      }
    ];

    // 创建排行榜类型
    for (const type of leaderboardTypes) {
      await pool.query(`
        INSERT INTO leaderboard_types (
          name, description, calculation_type, time_period
        ) VALUES (?, ?, ?, ?)
      `, [type.name, type.description, type.calculation_type, type.time_period]);
    }

    return { message: '排行榜类型初始化成功', count: leaderboardTypes.length };
  } catch (error) {
    console.error('初始化排行榜类型失败:', error);
    throw error;
  }
};

// 获取所有排行榜类型
exports.getAllLeaderboardTypes = async (req, res) => {
  try {
    const [types] = await pool.query(`
      SELECT id, name, description, calculation_type, time_period, created_at
      FROM leaderboard_types
      ORDER BY time_period, name
    `);

    res.status(200).json(types);
  } catch (error) {
    console.error('获取排行榜类型失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取排行榜数据
exports.getLeaderboard = async (req, res) => {
  try {
    const { typeId } = req.params;
    const { limit = 10 } = req.query;
    const currentUserId = req.user ? req.user.id : null;

    // 验证排行榜类型是否存在
    const [types] = await pool.query(
      'SELECT id, name, description, calculation_type, time_period FROM leaderboard_types WHERE id = ?',
      [typeId]
    );

    if (types.length === 0) {
      return res.status(404).json({ message: '排行榜类型不存在' });
    }

    const leaderboardType = types[0];

    // 获取当前时间周期
    let periodStart, periodEnd;
    const now = new Date();
    periodEnd = now.toISOString().split('T')[0]; // 今天的日期

    switch (leaderboardType.time_period) {
      case 'daily':
        periodStart = periodEnd;
        break;
      case 'weekly':
        // 计算本周开始日期（周一）
        const day = now.getDay() || 7; // 如果是周日，getDay()返回0，转为7
        const diff = day - 1; // 与周一的差距
        const monday = new Date(now);
        monday.setDate(now.getDate() - diff);
        periodStart = monday.toISOString().split('T')[0];
        break;
      case 'monthly':
        // 本月第一天
        periodStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        break;
      case 'all_time':
        // 使用一个很早的日期
        periodStart = '2000-01-01';
        break;
      default:
        periodStart = '2000-01-01';
    }

    // 获取排行榜数据
    let entries = [];
    
    // 查询最新的排行榜记录
    const [existingEntries] = await pool.query(`
      SELECT le.*, u.username, u.profile_image
      FROM leaderboard_entries le
      JOIN users u ON le.user_id = u.id
      WHERE le.leaderboard_type_id = ? 
      AND le.period_start = ? 
      AND le.period_end = ?
      ORDER BY le.rank
      LIMIT ?
    `, [typeId, periodStart, periodEnd, parseInt(limit)]);

    // 如果有有效的记录就直接使用
    if (existingEntries.length > 0) {
      entries = existingEntries;
    } else {
      // 否则需要计算并生成新的排行榜
      entries = await calculateLeaderboard(leaderboardType, periodStart, periodEnd, parseInt(limit));
    }

    // 如果用户已登录，获取当前用户的排名
    let userRank = null;
    if (currentUserId) {
      const [userEntry] = await pool.query(`
        SELECT rank, score
        FROM leaderboard_entries
        WHERE leaderboard_type_id = ? 
        AND period_start = ?
        AND period_end = ?
        AND user_id = ?
      `, [typeId, periodStart, periodEnd, currentUserId]);

      if (userEntry.length > 0) {
        userRank = userEntry[0];
      }
    }

    res.status(200).json({
      type: leaderboardType,
      period: {
        start: periodStart,
        end: periodEnd
      },
      entries,
      user_rank: userRank
    });
  } catch (error) {
    console.error('获取排行榜数据失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 计算排行榜数据
async function calculateLeaderboard(leaderboardType, periodStart, periodEnd, limit = 10) {
  try {
    const typeId = leaderboardType.id;
    let scores = [];

    // 根据不同排行榜类型计算分数
    switch (typeId) {
      case 1: // 成就积分榜
        const [achievementScores] = await pool.query(`
          SELECT 
            u.id as user_id, u.username, u.profile_image,
            SUM(al.points) as score
          FROM user_achievements ua
          JOIN achievement_levels al ON ua.achievement_level_id = al.id
          JOIN users u ON ua.user_id = u.id
          WHERE ua.unlocked = TRUE
          ${periodStart !== '2000-01-01' ? 'AND ua.unlocked_at >= ? AND ua.unlocked_at <= DATE_ADD(?, INTERVAL 1 DAY)' : ''}
          GROUP BY u.id
          ORDER BY score DESC
          LIMIT ?
        `, periodStart !== '2000-01-01' ? [periodStart, periodEnd, limit] : [limit]);
        scores = achievementScores;
        break;

      case 2: // 成就积分周榜
        const [weeklyAchievementScores] = await pool.query(`
          SELECT 
            u.id as user_id, u.username, u.profile_image,
            SUM(al.points) as score
          FROM user_achievements ua
          JOIN achievement_levels al ON ua.achievement_level_id = al.id
          JOIN users u ON ua.user_id = u.id
          WHERE ua.unlocked = TRUE
          AND ua.unlocked_at >= ? AND ua.unlocked_at <= DATE_ADD(?, INTERVAL 1 DAY)
          GROUP BY u.id
          ORDER BY score DESC
          LIMIT ?
        `, [periodStart, periodEnd, limit]);
        scores = weeklyAchievementScores;
        break;

      case 3: // 收藏数量榜
        const [collectionScores] = await pool.query(`
          SELECT 
            u.id as user_id, u.username, u.profile_image,
            COUNT(uc.id) as score
          FROM user_collections uc
          JOIN users u ON uc.user_id = u.id
          ${periodStart !== '2000-01-01' ? 'WHERE uc.collected_at >= ? AND uc.collected_at <= DATE_ADD(?, INTERVAL 1 DAY)' : ''}
          GROUP BY u.id
          ORDER BY score DESC
          LIMIT ?
        `, periodStart !== '2000-01-01' ? [periodStart, periodEnd, limit] : [limit]);
        scores = collectionScores;
        break;

      case 4: // 创作数量榜
        const [creationScores] = await pool.query(`
          SELECT 
            JSON_EXTRACT(pc.metadata, '$.created_by') as user_id_str,
            u.id as user_id, u.username, u.profile_image,
            COUNT(pc.id) as score
          FROM prompt_cards pc
          JOIN users u ON JSON_EXTRACT(pc.metadata, '$.created_by') = CAST(u.id AS CHAR)
          ${periodStart !== '2000-01-01' ? 'WHERE pc.created_at >= ? AND pc.created_at <= DATE_ADD(?, INTERVAL 1 DAY)' : ''}
          GROUP BY JSON_EXTRACT(pc.metadata, '$.created_by')
          ORDER BY score DESC
          LIMIT ?
        `, periodStart !== '2000-01-01' ? [periodStart, periodEnd, limit] : [limit]);
        scores = creationScores;
        break;

      case 5: // 社交活跃榜
        const [socialScores] = await pool.query(`
          SELECT 
            u.id as user_id, u.username, u.profile_image,
            COUNT(ua.id) as score
          FROM user_activities ua
          JOIN users u ON ua.user_id = u.id
          WHERE ua.activity_type IN ('comment', 'rate', 'share')
          ${periodStart !== '2000-01-01' ? 'AND ua.created_at >= ? AND ua.created_at <= DATE_ADD(?, INTERVAL 1 DAY)' : ''}
          GROUP BY u.id
          ORDER BY score DESC
          LIMIT ?
        `, periodStart !== '2000-01-01' ? [periodStart, periodEnd, limit] : [limit]);
        scores = socialScores;
        break;

      case 6: // 影响力榜
        const [followerScores] = await pool.query(`
          SELECT 
            u.id as user_id, u.username, u.profile_image,
            COUNT(f.id) as score
          FROM followers f
          JOIN users u ON f.followed_id = u.id
          ${periodStart !== '2000-01-01' ? 'WHERE f.created_at >= ? AND f.created_at <= DATE_ADD(?, INTERVAL 1 DAY)' : ''}
          GROUP BY u.id
          ORDER BY score DESC
          LIMIT ?
        `, periodStart !== '2000-01-01' ? [periodStart, periodEnd, limit] : [limit]);
        scores = followerScores;
        break;

      case 7: // 平均评分榜
        const [ratingScores] = await pool.query(`
          SELECT 
            JSON_EXTRACT(pc.metadata, '$.created_by') as user_id_str,
            u.id as user_id, u.username, u.profile_image,
            AVG(r.rating) as score,
            COUNT(r.id) as rating_count
          FROM ratings r
          JOIN prompt_cards pc ON r.prompt_card_id = pc.id
          JOIN users u ON JSON_EXTRACT(pc.metadata, '$.created_by') = CAST(u.id AS CHAR)
          ${periodStart !== '2000-01-01' ? 'WHERE r.created_at >= ? AND r.created_at <= DATE_ADD(?, INTERVAL 1 DAY)' : ''}
          GROUP BY JSON_EXTRACT(pc.metadata, '$.created_by')
          HAVING rating_count >= 3 -- 至少有3个评分才计入排名
          ORDER BY score DESC
          LIMIT ?
        `, periodStart !== '2000-01-01' ? [periodStart, periodEnd, limit] : [limit]);
        scores = ratingScores;
        break;

      default:
        throw new Error(`不支持的排行榜类型：${typeId}`);
    }

    // 为分数为空的情况提供默认值
    scores = scores.map(score => ({
      ...score,
      score: score.score || 0
    }));

    // 计算排名
    let rank = 1;
    let lastScore = null;
    let entries = [];

    for (let i = 0; i < scores.length; i++) {
      // 如果分数与上一名不同，排名递增
      if (lastScore !== null && scores[i].score !== lastScore) {
        rank = i + 1;
      }
      lastScore = scores[i].score;

      // 保存排行榜记录
      const [result] = await pool.query(`
        INSERT INTO leaderboard_entries (
          leaderboard_type_id, user_id, score, rank, period_start, period_end
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          score = VALUES(score),
          rank = VALUES(rank),
          updated_at = NOW()
      `, [typeId, scores[i].user_id, scores[i].score, rank, periodStart, periodEnd]);

      entries.push({
        id: result.insertId,
        leaderboard_type_id: typeId,
        user_id: scores[i].user_id,
        username: scores[i].username,
        profile_image: scores[i].profile_image,
        score: scores[i].score,
        rank,
        period_start: periodStart,
        period_end: periodEnd
      });
    }

    return entries;
  } catch (error) {
    console.error('计算排行榜数据失败:', error);
    throw error;
  }
}

// 更新所有排行榜
exports.updateAllLeaderboards = async () => {
  try {
    // 获取所有排行榜类型
    const [types] = await pool.query('SELECT id, time_period FROM leaderboard_types');

    // 获取当前日期
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // 遍历每种排行榜类型
    for (const type of types) {
      let periodStart;
      const periodEnd = today;

      // 根据排行榜类型确定起始日期
      switch (type.time_period) {
        case 'daily':
          periodStart = today;
          break;
        case 'weekly':
          // 计算本周开始日期（周一）
          const day = now.getDay() || 7;
          const diff = day - 1;
          const monday = new Date(now);
          monday.setDate(now.getDate() - diff);
          periodStart = monday.toISOString().split('T')[0];
          break;
        case 'monthly':
          // 本月第一天
          periodStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
          break;
        case 'all_time':
          periodStart = '2000-01-01';
          break;
        default:
          periodStart = '2000-01-01';
      }

      // 查找该排行榜的最新更新时间
      const [lastUpdate] = await pool.query(`
        SELECT MAX(updated_at) as last_update
        FROM leaderboard_entries
        WHERE leaderboard_type_id = ?
        AND period_start = ?
        AND period_end = ?
      `, [type.id, periodStart, periodEnd]);

      // 如果今天已经更新过且不是实时类型(all_time)，则跳过
      if (lastUpdate[0].last_update) {
        const lastUpdateDate = new Date(lastUpdate[0].last_update);
        if (lastUpdateDate.toISOString().split('T')[0] === today && type.time_period !== 'all_time') {
          continue;
        }
      }

      // 获取排行榜类型详情
      const [typeDetails] = await pool.query(
        'SELECT * FROM leaderboard_types WHERE id = ?',
        [type.id]
      );

      if (typeDetails.length === 0) continue;

      // 计算排行榜数据（100名）
      await calculateLeaderboard(typeDetails[0], periodStart, periodEnd, 100);
    }

    return { message: '排行榜更新成功', timestamp: new Date() };
  } catch (error) {
    console.error('更新所有排行榜失败:', error);
    throw error;
  }
};

// 获取用户在所有排行榜中的排名
exports.getUserRankings = async (req, res) => {
  try {
    const { userId } = req.params;

    // 验证用户是否存在
    const [users] = await pool.query('SELECT id FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 获取当前有效的排行榜周期
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // 计算各时间周期的开始日期
    const day = now.getDay() || 7;
    const diff = day - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diff);
    const weekStart = monday.toISOString().split('T')[0];
    
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const allTimeStart = '2000-01-01';

    // 构建时间周期数组
    const periods = [
      { period: 'daily', start: today, end: today },
      { period: 'weekly', start: weekStart, end: today },
      { period: 'monthly', start: monthStart, end: today },
      { period: 'all_time', start: allTimeStart, end: today }
    ];

    // 获取用户在所有排行榜中的排名
    const rankings = {};

    // 按时间周期组织
    for (const period of periods) {
      const [periodRankings] = await pool.query(`
        SELECT le.leaderboard_type_id, le.rank, le.score, lt.name, lt.description
        FROM leaderboard_entries le
        JOIN leaderboard_types lt ON le.leaderboard_type_id = lt.id
        WHERE le.user_id = ?
        AND le.period_start = ?
        AND le.period_end = ?
        AND lt.time_period = ?
      `, [userId, period.start, period.end, period.period]);

      rankings[period.period] = periodRankings;
    }

    res.status(200).json({
      user_id: parseInt(userId),
      rankings
    });
  } catch (error) {
    console.error('获取用户排名失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

module.exports = exports;
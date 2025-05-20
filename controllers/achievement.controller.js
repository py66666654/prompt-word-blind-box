// 成就系统控制器
const { pool } = require('../config/database');

// 获取所有成就类型
exports.getAllAchievementTypes = async (req, res) => {
  try {
    const [types] = await pool.query(`
      SELECT id, name, description, icon, category, created_at
      FROM achievement_types
      ORDER BY category, name
    `);

    res.status(200).json(types);
  } catch (error) {
    console.error('获取成就类型失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取成就类型详情（包含不同等级）
exports.getAchievementTypeDetails = async (req, res) => {
  try {
    const { typeId } = req.params;

    // 获取成就类型信息
    const [types] = await pool.query(`
      SELECT id, name, description, icon, category, created_at
      FROM achievement_types
      WHERE id = ?
    `, [typeId]);

    if (types.length === 0) {
      return res.status(404).json({ message: '成就类型不存在' });
    }

    // 获取该类型的所有等级
    const [levels] = await pool.query(`
      SELECT id, level, name, description, requirement, points, badge_url, created_at
      FROM achievement_levels
      WHERE achievement_type_id = ?
      ORDER BY level
    `, [typeId]);

    res.status(200).json({
      ...types[0],
      levels
    });
  } catch (error) {
    console.error('获取成就类型详情失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取用户成就
exports.getUserAchievements = async (req, res) => {
  try {
    const { userId } = req.params;

    // 验证用户是否存在
    const [users] = await pool.query('SELECT id FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 获取用户解锁的所有成就
    const [achievements] = await pool.query(`
      SELECT 
        ua.id, ua.current_progress, ua.unlocked, ua.unlocked_at,
        al.id as level_id, al.level, al.name as level_name, al.description as level_description,
        al.requirement, al.points, al.badge_url,
        at.id as type_id, at.name as type_name, at.description as type_description,
        at.icon, at.category
      FROM user_achievements ua
      JOIN achievement_levels al ON ua.achievement_level_id = al.id
      JOIN achievement_types at ON al.achievement_type_id = at.id
      WHERE ua.user_id = ?
      ORDER BY ua.unlocked DESC, at.category, al.level
    `, [userId]);

    // 获取用户总积分
    const [pointsResult] = await pool.query(`
      SELECT SUM(al.points) as total_points
      FROM user_achievements ua
      JOIN achievement_levels al ON ua.achievement_level_id = al.id
      WHERE ua.user_id = ? AND ua.unlocked = TRUE
    `, [userId]);

    const totalPoints = pointsResult[0].total_points || 0;

    // 按类别组织成就
    const achievementsByCategory = {};
    achievements.forEach(achievement => {
      if (!achievementsByCategory[achievement.category]) {
        achievementsByCategory[achievement.category] = [];
      }
      achievementsByCategory[achievement.category].push(achievement);
    });

    res.status(200).json({
      total_points: totalPoints,
      achievements_by_category: achievementsByCategory,
      achievements // 保留原始列表以兼容现有代码
    });
  } catch (error) {
    console.error('获取用户成就失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 自动检查和更新用户成就
exports.checkAndUpdateAchievements = async (userId) => {
  try {
    // 获取所有成就类型和等级
    const [achievementTypes] = await pool.query(`
      SELECT id, category 
      FROM achievement_types
    `);

    // 遍历每种成就类型，检查用户进度
    for (const type of achievementTypes) {
      await checkAchievementTypeProgress(userId, type.id, type.category);
    }

    return true;
  } catch (error) {
    console.error('检查成就进度失败:', error);
    return false;
  }
};

// 检查特定类型的成就进度
async function checkAchievementTypeProgress(userId, typeId, category) {
  try {
    // 获取该类型的所有等级
    const [levels] = await pool.query(`
      SELECT id, level, requirement
      FROM achievement_levels
      WHERE achievement_type_id = ?
      ORDER BY level
    `, [typeId]);

    if (levels.length === 0) return;

    // 根据成就类别获取用户的进度
    let currentProgress = 0;
    switch (category) {
      case 'collection':
        // 收藏数量
        const [collectionsCount] = await pool.query(
          'SELECT COUNT(*) as count FROM user_collections WHERE user_id = ?',
          [userId]
        );
        currentProgress = collectionsCount[0].count;
        break;
      
      case 'social':
        // 社交活动数量（评论、评分、分享、关注）
        const [socialActivitiesCount] = await pool.query(`
          SELECT COUNT(*) as count 
          FROM user_activities 
          WHERE user_id = ? AND activity_type IN ('comment', 'rate', 'share', 'follow')
        `, [userId]);
        currentProgress = socialActivitiesCount[0].count;
        break;
      
      case 'creation':
        // 创建的提示词数量
        const [creationsCount] = await pool.query(`
          SELECT COUNT(*) as count 
          FROM prompt_cards 
          WHERE metadata->>'$.created_by' = ?
        `, [userId.toString()]);
        currentProgress = creationsCount[0].count;
        break;
      
      case 'exploration':
        // 抽卡数量
        const [drawsCount] = await pool.query(
          'SELECT COUNT(*) as count FROM draw_history WHERE user_id = ?',
          [userId]
        );
        currentProgress = drawsCount[0].count;
        break;
      
      default:
        return;
    }

    // 遍历每个等级，更新或创建用户成就记录
    for (const level of levels) {
      // 检查用户是否已有该成就等级的记录
      const [existingAchievements] = await pool.query(`
        SELECT id, unlocked, current_progress
        FROM user_achievements
        WHERE user_id = ? AND achievement_level_id = ?
      `, [userId, level.id]);

      const unlocked = currentProgress >= level.requirement;

      if (existingAchievements.length > 0) {
        // 更新现有记录
        const achievement = existingAchievements[0];
        if (achievement.current_progress !== currentProgress || achievement.unlocked !== unlocked) {
          // 如果进度有变化或解锁状态有变化，则更新
          const unlockedNow = !achievement.unlocked && unlocked;
          await pool.query(`
            UPDATE user_achievements
            SET current_progress = ?, 
                unlocked = ?,
                unlocked_at = ${unlockedNow ? 'NOW()' : 'unlocked_at'},
                updated_at = NOW()
            WHERE id = ?
          `, [currentProgress, unlocked, achievement.id]);

          // 如果新解锁，创建通知并记录活动
          if (unlockedNow) {
            await createAchievementNotification(userId, level.id);
            await recordAchievementActivity(userId, level.id);
          }
        }
      } else {
        // 创建新记录
        const [result] = await pool.query(`
          INSERT INTO user_achievements (
            user_id, achievement_level_id, current_progress, unlocked, unlocked_at
          ) VALUES (
            ?, ?, ?, ?, ${unlocked ? 'NOW()' : 'NULL'}
          )
        `, [userId, level.id, currentProgress, unlocked]);

        // 如果直接解锁，创建通知并记录活动
        if (unlocked) {
          await createAchievementNotification(userId, level.id);
          await recordAchievementActivity(userId, level.id);
        }
      }
    }
  } catch (error) {
    console.error(`检查成就类型${typeId}进度失败:`, error);
    throw error;
  }
}

// 创建成就解锁通知
async function createAchievementNotification(userId, achievementLevelId) {
  try {
    // 获取成就等级名称
    const [levels] = await pool.query(`
      SELECT al.name as level_name, at.name as type_name
      FROM achievement_levels al
      JOIN achievement_types at ON al.achievement_type_id = at.id
      WHERE al.id = ?
    `, [achievementLevelId]);

    if (levels.length === 0) return;

    const level = levels[0];
    const message = `恭喜你获得了「${level.type_name} - ${level.level_name}」成就！`;

    // 创建通知
    await pool.query(`
      INSERT INTO notifications (
        user_id, notification_type, reference_id, message
      ) VALUES (
        ?, 'achievement', ?, ?
      )
    `, [userId, achievementLevelId, message]);
  } catch (error) {
    console.error('创建成就通知失败:', error);
  }
}

// 记录成就解锁活动
async function recordAchievementActivity(userId, achievementLevelId) {
  try {
    // 记录活动
    await pool.query(`
      INSERT INTO user_activities (
        user_id, activity_type, reference_id
      ) VALUES (
        ?, 'achievement', ?
      )
    `, [userId, achievementLevelId]);
  } catch (error) {
    console.error('记录成就活动失败:', error);
  }
}

// 获取未解锁的成就
exports.getLockedAchievements = async (req, res) => {
  try {
    const userId = req.user.id;

    // 获取已解锁的成就等级ID
    const [unlockedAchievements] = await pool.query(`
      SELECT achievement_level_id
      FROM user_achievements
      WHERE user_id = ? AND unlocked = TRUE
    `, [userId]);

    const unlockedIds = unlockedAchievements.map(a => a.achievement_level_id);
    const unlockedIdsStr = unlockedIds.length > 0 ? unlockedIds.join(',') : '0';

    // 获取用户进行中的成就
    const [inProgressAchievements] = await pool.query(`
      SELECT 
        ua.current_progress,
        al.id as level_id, al.level, al.name as level_name, al.description as level_description,
        al.requirement, al.points, al.badge_url,
        at.id as type_id, at.name as type_name, at.description as type_description,
        at.icon, at.category,
        (ua.current_progress / al.requirement) * 100 as progress_percentage
      FROM user_achievements ua
      JOIN achievement_levels al ON ua.achievement_level_id = al.id
      JOIN achievement_types at ON al.achievement_type_id = at.id
      WHERE ua.user_id = ? AND ua.unlocked = FALSE
      ORDER BY progress_percentage DESC, at.category, al.level
    `, [userId]);

    // 获取尚未开始的成就（系统中存在但用户没有记录的）
    const [lockedAchievements] = await pool.query(`
      SELECT 
        al.id as level_id, al.level, al.name as level_name, al.description as level_description,
        al.requirement, al.points, al.badge_url,
        at.id as type_id, at.name as type_name, at.description as type_description,
        at.icon, at.category,
        0 as current_progress,
        0 as progress_percentage
      FROM achievement_levels al
      JOIN achievement_types at ON al.achievement_type_id = at.id
      WHERE al.id NOT IN (
        SELECT achievement_level_id FROM user_achievements WHERE user_id = ?
      )
      ORDER BY at.category, al.level
    `, [userId]);

    // 合并进行中和尚未开始的成就
    const allLocked = [...inProgressAchievements, ...lockedAchievements];

    // 按类别组织成就
    const achievementsByCategory = {};
    allLocked.forEach(achievement => {
      if (!achievementsByCategory[achievement.category]) {
        achievementsByCategory[achievement.category] = [];
      }
      achievementsByCategory[achievement.category].push(achievement);
    });

    res.status(200).json({
      in_progress_count: inProgressAchievements.length,
      locked_count: lockedAchievements.length,
      achievements_by_category: achievementsByCategory,
      achievements: allLocked // 保留原始列表以兼容现有代码
    });
  } catch (error) {
    console.error('获取未解锁成就失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取最近解锁的成就
exports.getRecentlyUnlockedAchievements = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 5 } = req.query;

    // 验证用户是否存在
    const [users] = await pool.query('SELECT id FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 获取用户最近解锁的成就
    const [achievements] = await pool.query(`
      SELECT 
        ua.id, ua.unlocked_at,
        al.id as level_id, al.level, al.name as level_name, 
        al.points, al.badge_url,
        at.id as type_id, at.name as type_name, at.icon, at.category
      FROM user_achievements ua
      JOIN achievement_levels al ON ua.achievement_level_id = al.id
      JOIN achievement_types at ON al.achievement_type_id = at.id
      WHERE ua.user_id = ? AND ua.unlocked = TRUE
      ORDER BY ua.unlocked_at DESC
      LIMIT ?
    `, [userId, parseInt(limit)]);

    res.status(200).json(achievements);
  } catch (error) {
    console.error('获取最近解锁成就失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 初始化成就系统（创建预设成就类型和等级）
exports.initializeAchievementSystem = async () => {
  try {
    // 定义成就类型
    const achievementTypes = [
      {
        name: '收藏家',
        description: '收藏不同的提示词',
        icon: 'collection',
        category: 'collection'
      },
      {
        name: '社交达人',
        description: '积极参与社区互动',
        icon: 'social',
        category: 'social'
      },
      {
        name: '创作者',
        description: '创建原创提示词',
        icon: 'creation',
        category: 'creation'
      },
      {
        name: '探索者',
        description: '探索并抽取不同的提示词',
        icon: 'exploration',
        category: 'exploration'
      },
      {
        name: '评论达人',
        description: '发表评论分享你的见解',
        icon: 'comment',
        category: 'social'
      },
      {
        name: '评分专家',
        description: '为提示词评分',
        icon: 'rating',
        category: 'social'
      },
      {
        name: '分享达人',
        description: '分享提示词到社交平台',
        icon: 'share',
        category: 'social'
      },
      {
        name: '挑战王',
        description: '完成各种挑战',
        icon: 'challenge',
        category: 'exploration'
      }
    ];

    // 检查是否已经初始化
    const [existingTypes] = await pool.query(
      'SELECT COUNT(*) as count FROM achievement_types'
    );

    if (existingTypes[0].count > 0) {
      return { message: '成就系统已初始化', count: existingTypes[0].count };
    }

    // 创建成就类型
    for (const type of achievementTypes) {
      const [result] = await pool.query(
        'INSERT INTO achievement_types (name, description, icon, category) VALUES (?, ?, ?, ?)',
        [type.name, type.description, type.icon, type.category]
      );

      const typeId = result.insertId;

      // 创建该类型的不同等级
      const levels = [
        {
          level: 1,
          name: `初级${type.name}`,
          description: `初步达成${type.description}`,
          requirement: type.category === 'creation' ? 1 : 5,
          points: 10,
          badge_url: `badges/${type.category}_bronze.png`
        },
        {
          level: 2,
          name: `中级${type.name}`,
          description: `持续${type.description}`,
          requirement: type.category === 'creation' ? 5 : 25,
          points: 30,
          badge_url: `badges/${type.category}_silver.png`
        },
        {
          level: 3,
          name: `高级${type.name}`,
          description: `大量${type.description}`,
          requirement: type.category === 'creation' ? 20 : 100,
          points: 80,
          badge_url: `badges/${type.category}_gold.png`
        },
        {
          level: 4,
          name: `大师级${type.name}`,
          description: `成为${type.description}的大师`,
          requirement: type.category === 'creation' ? 50 : 500,
          points: 200,
          badge_url: `badges/${type.category}_platinum.png`
        }
      ];

      for (const level of levels) {
        await pool.query(
          'INSERT INTO achievement_levels (achievement_type_id, level, name, description, requirement, points, badge_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [typeId, level.level, level.name, level.description, level.requirement, level.points, level.badge_url]
        );
      }
    }

    return { message: '成就系统初始化成功', count: achievementTypes.length };
  } catch (error) {
    console.error('初始化成就系统失败:', error);
    throw error;
  }
};

// 初始化单个用户的成就
exports.initializeUserAchievements = async (userId) => {
  try {
    // 首先检查该用户是否已有成就记录
    const [existingAchievements] = await pool.query(
      'SELECT COUNT(*) as count FROM user_achievements WHERE user_id = ?',
      [userId]
    );

    if (existingAchievements[0].count > 0) {
      // 如果已有记录，仅检查和更新
      return await exports.checkAndUpdateAchievements(userId);
    }

    // 如果没有记录，初始化所有成就类型
    await exports.checkAndUpdateAchievements(userId);
    return true;
  } catch (error) {
    console.error('初始化用户成就失败:', error);
    return false;
  }
};

module.exports = exports;
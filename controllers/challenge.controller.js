// 挑战系统控制器
const { pool } = require('../config/database');

// 获取所有活跃的挑战
exports.getActiveChallenges = async (req, res) => {
  try {
    const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // 获取当前活跃的挑战
    const [challenges] = await pool.query(`
      SELECT c.*, ct.name as type_name, ct.description as type_description, 
        ct.icon, ct.requirement_type, ct.requirement_count, ct.points
      FROM challenges c
      JOIN challenge_types ct ON c.challenge_type_id = ct.id
      WHERE c.is_active = TRUE
      AND c.start_date <= ?
      AND c.end_date >= ?
      ORDER BY c.end_date ASC
    `, [currentTime, currentTime]);

    // 如果用户已登录，获取用户的挑战进度
    if (req.user) {
      const userId = req.user.id;
      
      for (let i = 0; i < challenges.length; i++) {
        const challenge = challenges[i];
        
        // 查询用户的挑战记录
        const [userChallenges] = await pool.query(`
          SELECT id, current_progress, completed, completed_at
          FROM user_challenges
          WHERE user_id = ? AND challenge_id = ?
        `, [userId, challenge.id]);
        
        if (userChallenges.length > 0) {
          challenge.user_progress = userChallenges[0].current_progress;
          challenge.user_completed = userChallenges[0].completed;
          challenge.user_completed_at = userChallenges[0].completed_at;
          challenge.progress_percentage = Math.min(100, Math.round((userChallenges[0].current_progress / challenge.requirement_count) * 100));
        } else {
          challenge.user_progress = 0;
          challenge.user_completed = false;
          challenge.user_completed_at = null;
          challenge.progress_percentage = 0;
        }
      }
    }

    res.status(200).json(challenges);
  } catch (error) {
    console.error('获取活跃挑战失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取用户的挑战记录
exports.getUserChallenges = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status = 'all', page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * parseInt(limit);

    // 构建查询条件
    let whereClause = 'WHERE uc.user_id = ?';
    const queryParams = [userId];

    if (status === 'completed') {
      whereClause += ' AND uc.completed = TRUE';
    } else if (status === 'in_progress') {
      whereClause += ' AND uc.completed = FALSE AND c.end_date >= NOW()';
    } else if (status === 'expired') {
      whereClause += ' AND uc.completed = FALSE AND c.end_date < NOW()';
    }

    // 获取用户挑战记录
    const [challenges] = await pool.query(`
      SELECT uc.id, uc.current_progress, uc.completed, uc.completed_at,
        c.id as challenge_id, c.title, c.description, c.start_date, c.end_date, c.is_active,
        ct.name as type_name, ct.icon, ct.requirement_type, ct.requirement_count, ct.points,
        ROUND((uc.current_progress / ct.requirement_count) * 100) as progress_percentage
      FROM user_challenges uc
      JOIN challenges c ON uc.challenge_id = c.id
      JOIN challenge_types ct ON c.challenge_type_id = ct.id
      ${whereClause}
      ORDER BY 
        CASE 
          WHEN c.end_date >= NOW() AND uc.completed = FALSE THEN 1 -- 进行中的挑战
          WHEN uc.completed = TRUE THEN 2 -- 已完成的挑战
          ELSE 3 -- 已过期的挑战
        END,
        c.end_date ASC
      LIMIT ? OFFSET ?
    `, [...queryParams, parseInt(limit), offset]);

    // 获取总记录数
    const [countResult] = await pool.query(`
      SELECT COUNT(*) as total
      FROM user_challenges uc
      JOIN challenges c ON uc.challenge_id = c.id
      ${whereClause}
    `, queryParams);

    const total = countResult[0].total;

    // 获取已完成挑战的总积分
    const [pointsResult] = await pool.query(`
      SELECT SUM(ct.points) as total_points
      FROM user_challenges uc
      JOIN challenges c ON uc.challenge_id = c.id
      JOIN challenge_types ct ON c.challenge_type_id = ct.id
      WHERE uc.user_id = ? AND uc.completed = TRUE
    `, [userId]);

    const totalPoints = pointsResult[0].total_points || 0;

    res.status(200).json({
      challenges,
      total_points: totalPoints,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取用户挑战记录失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取挑战详情
exports.getChallengeDetails = async (req, res) => {
  try {
    const { challengeId } = req.params;
    const userId = req.user ? req.user.id : null;

    // 获取挑战详情
    const [challenges] = await pool.query(`
      SELECT c.*, ct.name as type_name, ct.description as type_description, 
        ct.icon, ct.requirement_type, ct.requirement_count, ct.points
      FROM challenges c
      JOIN challenge_types ct ON c.challenge_type_id = ct.id
      WHERE c.id = ?
    `, [challengeId]);

    if (challenges.length === 0) {
      return res.status(404).json({ message: '挑战不存在' });
    }

    const challenge = challenges[0];

    // 如果用户已登录，获取用户的挑战进度
    if (userId) {
      const [userChallenges] = await pool.query(`
        SELECT id, current_progress, completed, completed_at
        FROM user_challenges
        WHERE user_id = ? AND challenge_id = ?
      `, [userId, challengeId]);
      
      if (userChallenges.length > 0) {
        challenge.user_progress = userChallenges[0].current_progress;
        challenge.user_completed = userChallenges[0].completed;
        challenge.user_completed_at = userChallenges[0].completed_at;
        challenge.progress_percentage = Math.min(100, Math.round((userChallenges[0].current_progress / challenge.requirement_count) * 100));
      } else {
        challenge.user_progress = 0;
        challenge.user_completed = false;
        challenge.user_completed_at = null;
        challenge.progress_percentage = 0;
      }
    }

    // 获取完成该挑战的用户数量
    const [completionStats] = await pool.query(`
      SELECT COUNT(*) as completed_count
      FROM user_challenges
      WHERE challenge_id = ? AND completed = TRUE
    `, [challengeId]);

    challenge.completed_count = completionStats[0].completed_count;

    // 获取最近完成的用户
    const [recentCompletions] = await pool.query(`
      SELECT uc.completed_at, u.id as user_id, u.username, u.profile_image
      FROM user_challenges uc
      JOIN users u ON uc.user_id = u.id
      WHERE uc.challenge_id = ? AND uc.completed = TRUE
      ORDER BY uc.completed_at DESC
      LIMIT 5
    `, [challengeId]);

    challenge.recent_completions = recentCompletions;

    res.status(200).json(challenge);
  } catch (error) {
    console.error('获取挑战详情失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 创建新挑战（仅管理员）
exports.createChallenge = async (req, res) => {
  try {
    // 此处应添加管理员权限验证
    const { title, description, challenge_type_id, start_date, end_date } = req.body;

    // 验证请求数据
    if (!title || !description || !challenge_type_id || !start_date || !end_date) {
      return res.status(400).json({ message: '标题、描述、类型和日期为必填项' });
    }

    // 验证挑战类型是否存在
    const [types] = await pool.query('SELECT id FROM challenge_types WHERE id = ?', [challenge_type_id]);
    if (types.length === 0) {
      return res.status(404).json({ message: '挑战类型不存在' });
    }

    // 创建新挑战
    const [result] = await pool.query(`
      INSERT INTO challenges (
        title, description, challenge_type_id, start_date, end_date, is_active
      ) VALUES (?, ?, ?, ?, ?, TRUE)
    `, [title, description, challenge_type_id, start_date, end_date]);

    // 获取新创建的挑战详情
    const [newChallenge] = await pool.query(`
      SELECT c.*, ct.name as type_name, ct.description as type_description, 
        ct.icon, ct.requirement_type, ct.requirement_count, ct.points
      FROM challenges c
      JOIN challenge_types ct ON c.challenge_type_id = ct.id
      WHERE c.id = ?
    `, [result.insertId]);

    res.status(201).json({
      message: '挑战创建成功',
      challenge: newChallenge[0]
    });
  } catch (error) {
    console.error('创建挑战失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 更新挑战进度
exports.updateChallengeProgress = async (userId, activityType, referenceId) => {
  try {
    // 获取当前时间
    const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // 获取与活动类型匹配的活跃挑战
    let requirementType;
    switch (activityType) {
      case 'collect':
        requirementType = 'collection';
        break;
      case 'rate':
      case 'comment':
      case 'share':
        requirementType = 'sharing';
        break;
      case 'draw':
        requirementType = 'exploration';
        break;
      default:
        return; // 不匹配任何挑战类型
    }

    // 查找匹配的活跃挑战
    const [activeChallenges] = await pool.query(`
      SELECT c.id, ct.requirement_count, ct.points
      FROM challenges c
      JOIN challenge_types ct ON c.challenge_type_id = ct.id
      WHERE c.is_active = TRUE
      AND c.start_date <= ?
      AND c.end_date >= ?
      AND ct.requirement_type = ?
    `, [currentTime, currentTime, requirementType]);

    if (activeChallenges.length === 0) return;

    // 更新用户的每个匹配挑战的进度
    for (const challenge of activeChallenges) {
      // 检查用户是否已有该挑战的记录
      const [userChallenges] = await pool.query(`
        SELECT id, current_progress, completed
        FROM user_challenges
        WHERE user_id = ? AND challenge_id = ?
      `, [userId, challenge.id]);

      if (userChallenges.length > 0) {
        // 如果挑战已完成，不再更新
        if (userChallenges[0].completed) continue;

        // 更新现有记录
        const newProgress = userChallenges[0].current_progress + 1;
        const completed = newProgress >= challenge.requirement_count;

        await pool.query(`
          UPDATE user_challenges
          SET current_progress = ?,
              completed = ?,
              completed_at = ${completed ? 'NOW()' : 'NULL'},
              updated_at = NOW()
          WHERE id = ?
        `, [newProgress, completed, userChallenges[0].id]);

        // 如果完成了挑战，创建通知并记录活动
        if (completed) {
          await createChallengeCompletionNotification(userId, challenge.id);
          await recordChallengeActivity(userId, challenge.id);
          // 可以在此处添加积分奖励逻辑
        }
      } else {
        // 创建新记录
        const [result] = await pool.query(`
          INSERT INTO user_challenges (
            user_id, challenge_id, current_progress, completed, completed_at
          ) VALUES (
            ?, ?, 1, ?, ${1 >= challenge.requirement_count ? 'NOW()' : 'NULL'}
          )
        `, [userId, challenge.id, 1 >= challenge.requirement_count]);

        // 如果直接完成了挑战
        if (1 >= challenge.requirement_count) {
          await createChallengeCompletionNotification(userId, challenge.id);
          await recordChallengeActivity(userId, challenge.id);
          // 可以在此处添加积分奖励逻辑
        }
      }
    }
  } catch (error) {
    console.error('更新挑战进度失败:', error);
  }
};

// 创建挑战完成通知
async function createChallengeCompletionNotification(userId, challengeId) {
  try {
    // 获取挑战标题
    const [challenges] = await pool.query('SELECT title FROM challenges WHERE id = ?', [challengeId]);
    if (challenges.length === 0) return;

    const message = `恭喜你完成了挑战「${challenges[0].title}」！`;

    // 创建通知
    await pool.query(`
      INSERT INTO notifications (
        user_id, notification_type, reference_id, message
      ) VALUES (
        ?, 'challenge', ?, ?
      )
    `, [userId, challengeId, message]);
  } catch (error) {
    console.error('创建挑战完成通知失败:', error);
  }
}

// 记录挑战完成活动
async function recordChallengeActivity(userId, challengeId) {
  try {
    // 记录活动
    await pool.query(`
      INSERT INTO user_activities (
        user_id, activity_type, reference_id
      ) VALUES (
        ?, 'challenge', ?
      )
    `, [userId, challengeId]);
  } catch (error) {
    console.error('记录挑战活动失败:', error);
  }
}

// 初始化挑战类型
exports.initializeChallengeTypes = async () => {
  try {
    // 检查是否已初始化
    const [existingTypes] = await pool.query(
      'SELECT COUNT(*) as count FROM challenge_types'
    );

    if (existingTypes[0].count > 0) {
      return { message: '挑战类型已初始化', count: existingTypes[0].count };
    }

    // 定义挑战类型
    const challengeTypes = [
      {
        name: '收藏达人',
        description: '收藏指定数量的提示词',
        icon: 'collection',
        requirement_type: 'collection',
        requirement_count: 10,
        points: 50
      },
      {
        name: '社交蝴蝶',
        description: '发表评论、评分或分享提示词',
        icon: 'social',
        requirement_type: 'sharing',
        requirement_count: 20,
        points: 80
      },
      {
        name: '创作先锋',
        description: '创建原创提示词',
        icon: 'creation',
        requirement_type: 'creation',
        requirement_count: 3,
        points: 100
      },
      {
        name: '探索者',
        description: '抽取指定数量的提示词',
        icon: 'exploration',
        requirement_type: 'exploration',
        requirement_count: 30,
        points: 60
      },
      {
        name: '评论家',
        description: '对提示词进行评论',
        icon: 'comment',
        requirement_type: 'sharing',
        requirement_count: 15,
        points: 70
      },
      {
        name: '分享达人',
        description: '分享提示词到社交平台',
        icon: 'share',
        requirement_type: 'sharing',
        requirement_count: 10,
        points: 60
      }
    ];

    // 创建挑战类型
    for (const type of challengeTypes) {
      await pool.query(`
        INSERT INTO challenge_types (
          name, description, icon, requirement_type, requirement_count, points
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        type.name, 
        type.description, 
        type.icon, 
        type.requirement_type, 
        type.requirement_count, 
        type.points
      ]);
    }

    return { message: '挑战类型初始化成功', count: challengeTypes.length };
  } catch (error) {
    console.error('初始化挑战类型失败:', error);
    throw error;
  }
};

// 创建周期性挑战
exports.createWeeklyChallenges = async () => {
  try {
    // 获取当前日期
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    
    // 计算本周的开始和结束日期
    const day = now.getDay() || 7; // getDay() 返回 0(周日) 到 6(周六)
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - day + 1); // 周一
    
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6); // 周日
    
    const weekStart = startDate.toISOString().slice(0, 10);
    const weekEnd = endDate.toISOString().slice(0, 10);
    
    // 构建挑战标题
    const weekNumber = Math.floor((now - new Date(now.getFullYear(), 0, 1)) / (7 * 24 * 60 * 60 * 1000)) + 1;
    const weekTitle = `第${weekNumber}周挑战`;
    
    // 检查本周的挑战是否已创建
    const [existingChallenges] = await pool.query(`
      SELECT id FROM challenges
      WHERE title LIKE ? AND start_date = ?
    `, [`${weekTitle}%`, weekStart]);
    
    if (existingChallenges.length > 0) {
      return { message: '本周挑战已存在', count: existingChallenges.length };
    }
    
    // 获取所有挑战类型
    const [challengeTypes] = await pool.query('SELECT * FROM challenge_types');
    
    // 随机选择3种类型创建本周挑战
    const selectedTypes = [];
    const usedIndices = new Set();
    
    while (selectedTypes.length < 3 && selectedTypes.length < challengeTypes.length) {
      const randomIndex = Math.floor(Math.random() * challengeTypes.length);
      if (!usedIndices.has(randomIndex)) {
        usedIndices.add(randomIndex);
        selectedTypes.push(challengeTypes[randomIndex]);
      }
    }
    
    // 创建挑战
    const createdChallenges = [];
    for (let i = 0; i < selectedTypes.length; i++) {
      const type = selectedTypes[i];
      const title = `${weekTitle}: ${type.name}`;
      const description = `本周挑战：${type.description}。完成后可获得${type.points}积分奖励！`;
      
      const [result] = await pool.query(`
        INSERT INTO challenges (
          title, description, challenge_type_id, start_date, end_date, is_active
        ) VALUES (?, ?, ?, ?, ?, TRUE)
      `, [title, description, type.id, weekStart, weekEnd]);
      
      createdChallenges.push({
        id: result.insertId,
        title,
        type: type.name
      });
    }
    
    return { 
      message: '本周挑战创建成功', 
      week: weekNumber,
      period: { start: weekStart, end: weekEnd },
      challenges: createdChallenges 
    };
  } catch (error) {
    console.error('创建周期性挑战失败:', error);
    throw error;
  }
};

module.exports = exports;
// 关注功能控制器
const { pool } = require('../config/database');

// 关注用户
exports.followUser = async (req, res) => {
  try {
    const followerId = req.user.id; // 当前登录用户（关注者）
    const { userId: followedId } = req.params; // 被关注用户

    // 验证被关注用户是否存在
    const [users] = await pool.query('SELECT id, username FROM users WHERE id = ?', [followedId]);
    if (users.length === 0) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 不能关注自己
    if (followerId === parseInt(followedId)) {
      return res.status(400).json({ message: '不能关注自己' });
    }

    // 检查是否已经关注
    const [existingFollows] = await pool.query(
      'SELECT id FROM followers WHERE follower_id = ? AND followed_id = ?',
      [followerId, followedId]
    );

    if (existingFollows.length > 0) {
      return res.status(409).json({ message: '已经关注了该用户' });
    }

    // 创建关注关系
    const [result] = await pool.query(
      'INSERT INTO followers (follower_id, followed_id) VALUES (?, ?)',
      [followerId, followedId]
    );

    // 记录活动
    await recordActivity(followerId, 'follow', followedId);

    // 创建通知
    await createNotification(
      followedId,
      followerId,
      'follow',
      result.insertId,
      `${req.user.username} 关注了你`
    );

    res.status(201).json({
      message: '关注成功',
      id: result.insertId,
      follower: {
        id: followerId,
        username: req.user.username
      },
      followed: {
        id: parseInt(followedId),
        username: users[0].username
      }
    });
  } catch (error) {
    console.error('关注用户失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 取消关注
exports.unfollowUser = async (req, res) => {
  try {
    const followerId = req.user.id;
    const { userId: followedId } = req.params;

    // 验证被关注用户是否存在
    const [users] = await pool.query('SELECT id FROM users WHERE id = ?', [followedId]);
    if (users.length === 0) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 检查是否已经关注
    const [existingFollows] = await pool.query(
      'SELECT id FROM followers WHERE follower_id = ? AND followed_id = ?',
      [followerId, followedId]
    );

    if (existingFollows.length === 0) {
      return res.status(404).json({ message: '未关注该用户' });
    }

    // 删除关注关系
    await pool.query(
      'DELETE FROM followers WHERE follower_id = ? AND followed_id = ?',
      [followerId, followedId]
    );

    res.status(200).json({ message: '已取消关注' });
  } catch (error) {
    console.error('取消关注失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取用户的关注列表
exports.getFollowing = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // 验证用户是否存在
    const [users] = await pool.query('SELECT id FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 获取关注的用户列表
    const [following] = await pool.query(`
      SELECT u.id, u.username, u.profile_image, u.bio, f.created_at as followed_at
      FROM followers f
      JOIN users u ON f.followed_id = u.id
      WHERE f.follower_id = ?
      ORDER BY f.created_at DESC
      LIMIT ? OFFSET ?
    `, [userId, parseInt(limit), parseInt(offset)]);

    // 获取总关注数以支持分页
    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM followers WHERE follower_id = ?',
      [userId]
    );

    const total = countResult[0].total;

    res.status(200).json({
      following,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取关注列表失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取用户的粉丝列表
exports.getFollowers = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // 验证用户是否存在
    const [users] = await pool.query('SELECT id FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 获取粉丝列表
    const [followers] = await pool.query(`
      SELECT u.id, u.username, u.profile_image, u.bio, f.created_at as followed_at
      FROM followers f
      JOIN users u ON f.follower_id = u.id
      WHERE f.followed_id = ?
      ORDER BY f.created_at DESC
      LIMIT ? OFFSET ?
    `, [userId, parseInt(limit), parseInt(offset)]);

    // 对于已登录用户，添加当前用户是否关注了这些粉丝的标志
    if (req.user) {
      const followerId = req.user.id;
      
      // 获取当前用户关注的所有用户ID
      const [followingIds] = await pool.query(
        'SELECT followed_id FROM followers WHERE follower_id = ?',
        [followerId]
      );
      
      const followingSet = new Set(followingIds.map(f => f.followed_id));
      
      // 为每个粉丝添加当前用户是否关注标志
      followers.forEach(follower => {
        follower.is_followed_by_me = followingSet.has(follower.id);
      });
    }

    // 获取总粉丝数以支持分页
    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM followers WHERE followed_id = ?',
      [userId]
    );

    const total = countResult[0].total;

    res.status(200).json({
      followers,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取粉丝列表失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 检查是否关注
exports.checkFollowStatus = async (req, res) => {
  try {
    const followerId = req.user.id;
    const { userId: followedId } = req.params;

    // 验证被关注用户是否存在
    const [users] = await pool.query('SELECT id FROM users WHERE id = ?', [followedId]);
    if (users.length === 0) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 检查是否已经关注
    const [existingFollows] = await pool.query(
      'SELECT id FROM followers WHERE follower_id = ? AND followed_id = ?',
      [followerId, followedId]
    );

    res.status(200).json({
      is_following: existingFollows.length > 0
    });
  } catch (error) {
    console.error('检查关注状态失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取用户关注数据统计
exports.getFollowStats = async (req, res) => {
  try {
    const { userId } = req.params;

    // 验证用户是否存在
    const [users] = await pool.query('SELECT id FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 获取关注和粉丝数量
    const [followingCount] = await pool.query(
      'SELECT COUNT(*) as count FROM followers WHERE follower_id = ?',
      [userId]
    );

    const [followerCount] = await pool.query(
      'SELECT COUNT(*) as count FROM followers WHERE followed_id = ?',
      [userId]
    );

    res.status(200).json({
      following_count: followingCount[0].count,
      follower_count: followerCount[0].count
    });
  } catch (error) {
    console.error('获取关注统计失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取用户的共同关注
exports.getMutualFollows = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    const { targetUserId } = req.params;

    // 验证目标用户是否存在
    const [users] = await pool.query('SELECT id FROM users WHERE id = ?', [targetUserId]);
    if (users.length === 0) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 如果用户未登录或查看的是自己的资料，则不计算共同关注
    if (!userId || parseInt(userId) === parseInt(targetUserId)) {
      return res.status(200).json({ mutual_follows: [] });
    }

    // 获取共同关注的用户
    const [mutualFollows] = await pool.query(`
      SELECT u.id, u.username, u.profile_image
      FROM followers f1
      JOIN followers f2 ON f1.followed_id = f2.followed_id
      JOIN users u ON f1.followed_id = u.id
      WHERE f1.follower_id = ? AND f2.follower_id = ?
      ORDER BY u.username
      LIMIT 10
    `, [userId, targetUserId]);

    res.status(200).json({
      mutual_follows: mutualFollows
    });
  } catch (error) {
    console.error('获取共同关注失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 推荐关注的用户
exports.getRecommendedUsers = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10 } = req.query;

    // 推荐1：目前关注的用户的关注（关注你关注的人的人）
    const [followingOfFollowing] = await pool.query(`
      SELECT DISTINCT u.id, u.username, u.profile_image, u.bio,
        COUNT(DISTINCT f_inner.follower_id) as mutual_followers
      FROM followers f_outer
      JOIN followers f_inner ON f_outer.followed_id = f_inner.follower_id
      JOIN users u ON f_inner.followed_id = u.id
      WHERE f_outer.follower_id = ?
        AND f_inner.followed_id != ?
        AND NOT EXISTS (
          SELECT 1 FROM followers f_check
          WHERE f_check.follower_id = ? AND f_check.followed_id = f_inner.followed_id
        )
      GROUP BY u.id
      ORDER BY mutual_followers DESC, u.username
      LIMIT ?
    `, [userId, userId, userId, parseInt(limit) / 2]);

    // 推荐2：有共同兴趣的用户（收藏了相同提示词的用户）
    const [similarInterests] = await pool.query(`
      SELECT DISTINCT u.id, u.username, u.profile_image, u.bio,
        COUNT(DISTINCT uc_others.prompt_card_id) as common_collections
      FROM user_collections uc_me
      JOIN user_collections uc_others ON uc_me.prompt_card_id = uc_others.prompt_card_id
      JOIN users u ON uc_others.user_id = u.id
      WHERE uc_me.user_id = ?
        AND uc_others.user_id != ?
        AND NOT EXISTS (
          SELECT 1 FROM followers f
          WHERE f.follower_id = ? AND f.followed_id = uc_others.user_id
        )
      GROUP BY u.id
      ORDER BY common_collections DESC, u.username
      LIMIT ?
    `, [userId, userId, userId, parseInt(limit) / 2]);

    // 合并推荐
    const recommendations = [...followingOfFollowing, ...similarInterests];
    
    // 删除重复
    const uniqueRecommendations = Array.from(
      new Map(recommendations.map(item => [item.id, item])).values()
    );

    res.status(200).json({
      recommended_users: uniqueRecommendations.slice(0, parseInt(limit))
    });
  } catch (error) {
    console.error('获取推荐用户失败:', error);
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

// 辅助函数：创建通知
async function createNotification(userId, senderId, notificationType, referenceId, message) {
  try {
    await pool.query(
      'INSERT INTO notifications (user_id, sender_id, notification_type, reference_id, message) VALUES (?, ?, ?, ?, ?)',
      [userId, senderId, notificationType, referenceId, message]
    );
  } catch (error) {
    console.error('创建通知失败:', error);
    // 不抛出错误，避免影响主要功能
  }
}
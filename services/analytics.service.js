// 分析服务
const { pool } = require('../config/database');

// 记录用户事件
async function recordUserEvent(userId, eventType, eventData = {}, sessionInfo = {}) {
  try {
    const { device_info, ip_address, user_agent, referrer, session_id } = sessionInfo;
    
    const [result] = await pool.query(`
      INSERT INTO user_events (
        user_id, event_type, event_data, device_info, ip_address, 
        user_agent, referrer, session_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId, 
      eventType, 
      JSON.stringify(eventData), 
      device_info || null, 
      ip_address || null,
      user_agent || null,
      referrer || null,
      session_id || null
    ]);
    
    // 如果是登录事件，更新用户活动分析表
    if (eventType === 'login') {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD格式
      
      // 更新用户活动分析
      await pool.query(`
        INSERT INTO user_activity_analytics (user_id, date, login_count)
        VALUES (?, ?, 1)
        ON DUPLICATE KEY UPDATE login_count = login_count + 1
      `, [userId, today]);
      
      // 更新平台统计
      await pool.query(`
        INSERT INTO platform_stats (date, active_users, total_sessions)
        VALUES (?, 1, 1)
        ON DUPLICATE KEY UPDATE 
          active_users = active_users + 1,
          total_sessions = total_sessions + 1
      `, [today]);
      
      // 更新用户保留天数
      await updateUserRetentionDays(userId);
    }
    
    // 如果是查看提示词事件，更新提示词浏览统计
    if (eventType === 'view_prompt' && eventData.prompt_id) {
      const today = new Date().toISOString().split('T')[0];
      
      // 更新用户活动分析
      await pool.query(`
        INSERT INTO user_activity_analytics (user_id, date, prompt_views)
        VALUES (?, ?, 1)
        ON DUPLICATE KEY UPDATE prompt_views = prompt_views + 1
      `, [userId, today]);
    }
    
    return result.insertId;
  } catch (error) {
    console.error('记录用户事件失败:', error);
    return null;
  }
}

// 更新用户保留天数
async function updateUserRetentionDays(userId) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // 获取用户上次登录日期
    const [lastLogin] = await pool.query(`
      SELECT date, retention_days
      FROM user_activity_analytics
      WHERE user_id = ?
      AND login_count > 0
      ORDER BY date DESC
      LIMIT 1
    `, [userId]);
    
    // 如果有上次登录记录
    if (lastLogin.length > 0) {
      const { date, retention_days } = lastLogin[0];
      const lastDate = new Date(date);
      const currentDate = new Date(today);
      
      // 计算日期差
      const diffTime = Math.abs(currentDate - lastDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // 如果是连续登录（昨天登录过）
      if (diffDays === 1) {
        // 更新连续登录天数
        await pool.query(`
          UPDATE user_activity_analytics
          SET retention_days = ?
          WHERE user_id = ? AND date = ?
        `, [retention_days + 1, userId, today]);
      } else {
        // 不是连续登录，重置为1
        await pool.query(`
          UPDATE user_activity_analytics
          SET retention_days = 1
          WHERE user_id = ? AND date = ?
        `, [userId, today]);
      }
    } else {
      // 首次登录，设置为1
      await pool.query(`
        INSERT INTO user_activity_analytics (user_id, date, retention_days)
        VALUES (?, ?, 1)
        ON DUPLICATE KEY UPDATE retention_days = 1
      `, [userId, today]);
    }
    
    return true;
  } catch (error) {
    console.error('更新用户保留天数失败:', error);
    return false;
  }
}

// 更新用户会话时长
async function updateSessionDuration(sessionId, durationSeconds) {
  try {
    if (!sessionId || durationSeconds <= 0) {
      return false;
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    // 查找会话对应的用户
    const [sessions] = await pool.query(`
      SELECT user_id FROM user_events
      WHERE session_id = ?
      LIMIT 1
    `, [sessionId]);
    
    if (sessions.length === 0) {
      return false;
    }
    
    const userId = sessions[0].user_id;
    
    // 更新用户活动分析
    await pool.query(`
      UPDATE user_activity_analytics
      SET time_spent_seconds = time_spent_seconds + ?
      WHERE user_id = ? AND date = ?
    `, [durationSeconds, userId, today]);
    
    // 更新平台统计
    await pool.query(`
      UPDATE platform_stats
      SET avg_session_duration_seconds = (
        (avg_session_duration_seconds * total_sessions + ?) / total_sessions
      )
      WHERE date = ?
    `, [durationSeconds, today]);
    
    return true;
  } catch (error) {
    console.error('更新会话时长失败:', error);
    return false;
  }
}

// 获取用户活动统计
async function getUserActivityStats(userId, timeframe = 30) {
  try {
    // 计算开始日期
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeframe);
    const startDateStr = startDate.toISOString().split('T')[0];
    
    // 获取用户活动统计
    const [activities] = await pool.query(`
      SELECT
        SUM(login_count) AS total_logins,
        SUM(prompt_views) AS total_views,
        SUM(prompt_draws) AS total_draws,
        SUM(comments_created) AS total_comments,
        SUM(ratings_given) AS total_ratings,
        SUM(collections_made) AS total_collections,
        SUM(reports_submitted) AS total_reports,
        SUM(collaborations_joined) AS total_collaborations,
        SUM(challenges_participated) AS total_challenges,
        SUM(social_interactions) AS total_social,
        SUM(time_spent_seconds) AS total_time,
        MAX(retention_days) AS max_retention,
        COUNT(DISTINCT date) AS active_days
      FROM user_activity_analytics
      WHERE user_id = ? AND date >= ?
    `, [userId, startDateStr]);
    
    // 获取用户参与度分数
    const [engagement] = await pool.query(`
      SELECT * FROM user_engagement_metrics
      WHERE user_id = ?
    `, [userId]);
    
    // 获取用户分段
    const [segments] = await pool.query(`
      SELECT s.name, s.description
      FROM user_segment_mappings m
      JOIN user_segments s ON m.segment_id = s.id
      WHERE m.user_id = ?
    `, [userId]);
    
    // 获取用户行为预测
    const [predictions] = await pool.query(`
      SELECT * FROM user_behavior_predictions
      WHERE user_id = ?
      ORDER BY prediction_date DESC
      LIMIT 1
    `, [userId]);
    
    // 组合结果
    return {
      activities: activities[0] || {},
      engagement: engagement[0] || {},
      segments: segments,
      predictions: predictions[0] || null,
      timeframe
    };
  } catch (error) {
    console.error('获取用户活动统计失败:', error);
    return null;
  }
}

// 获取内容热度统计
async function getContentPopularityStats(contentType, contentId, timeframe = 30) {
  try {
    // 计算开始日期
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeframe);
    const startDateStr = startDate.toISOString().split('T')[0];
    
    // 获取内容热度统计
    const [metrics] = await pool.query(`
      SELECT
        date,
        views,
        draws,
        ratings_count,
        average_rating,
        comments_count,
        shares_count,
        collections_count,
        reports_count,
        popularity_score
      FROM content_popularity_metrics
      WHERE content_type = ? AND content_id = ? AND date >= ?
      ORDER BY date ASC
    `, [contentType, contentId, startDateStr]);
    
    // 计算累计统计
    let totals = {
      total_views: 0,
      total_draws: 0,
      total_ratings: 0,
      avg_rating: 0,
      total_comments: 0,
      total_shares: 0,
      total_collections: 0,
      total_reports: 0,
      avg_popularity: 0
    };
    
    if (metrics.length > 0) {
      // 计算累计值
      metrics.forEach(metric => {
        totals.total_views += metric.views || 0;
        totals.total_draws += metric.draws || 0;
        totals.total_ratings += metric.ratings_count || 0;
        totals.total_comments += metric.comments_count || 0;
        totals.total_shares += metric.shares_count || 0;
        totals.total_collections += metric.collections_count || 0;
        totals.total_reports += metric.reports_count || 0;
      });
      
      // 计算平均值
      if (totals.total_ratings > 0) {
        // 加权平均评分
        totals.avg_rating = metrics.reduce((sum, m) => sum + (m.average_rating || 0) * (m.ratings_count || 0), 0) / totals.total_ratings;
      }
      
      totals.avg_popularity = metrics.reduce((sum, m) => sum + (m.popularity_score || 0), 0) / metrics.length;
    }
    
    // 获取针对该内容的用户细分
    const [audience] = await pool.query(`
      WITH content_users AS (
        -- 根据内容类型获取相关用户
        SELECT DISTINCT
          CASE
            WHEN ? = 'prompt' THEN (
              SELECT DISTINCT user_id 
              FROM user_events 
              WHERE event_type = 'view_prompt' 
              AND JSON_EXTRACT(event_data, '$.prompt_id') = ?
            )
            WHEN ? = 'collection' THEN (
              SELECT DISTINCT user_id 
              FROM user_collections 
              WHERE collection_id = ?
            )
            -- 其他内容类型类似...
          END AS user_id
      )
      SELECT 
        s.name AS segment,
        COUNT(DISTINCT m.user_id) AS user_count
      FROM content_users cu
      JOIN user_segment_mappings m ON cu.user_id = m.user_id
      JOIN user_segments s ON m.segment_id = s.id
      GROUP BY s.name
    `, [contentType, contentId, contentType, contentId]);
    
    return {
      daily_metrics: metrics,
      totals,
      audience,
      timeframe
    };
  } catch (error) {
    console.error('获取内容热度统计失败:', error);
    return null;
  }
}

// 获取平台统计
async function getPlatformStats(timeframe = 30, metrics = null) {
  try {
    // 计算开始日期
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeframe);
    const startDateStr = startDate.toISOString().split('T')[0];
    
    // 默认指标
    const defaultMetrics = [
      'active_users', 'new_users', 'total_sessions', 'avg_session_duration_seconds',
      'prompt_draws', 'comments_created', 'ratings_given', 'collections_made'
    ];
    
    // 使用提供的指标或默认指标
    const metricsToFetch = metrics || defaultMetrics;
    
    // 构建查询字段
    const fields = ['date'].concat(
      metricsToFetch.filter(m => defaultMetrics.includes(m))
    ).join(', ');
    
    // 获取平台统计
    const [stats] = await pool.query(`
      SELECT ${fields}
      FROM platform_stats
      WHERE date >= ?
      ORDER BY date ASC
    `, [startDateStr]);
    
    // 获取用户增长统计
    const [growth] = await pool.query(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m-%d') AS date,
        COUNT(*) AS new_users
      FROM users
      WHERE created_at >= ?
      GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
      ORDER BY date ASC
    `, [startDateStr]);
    
    // 获取用户保留统计
    const [retention] = await pool.query(`
      SELECT 
        cohort_date, 
        users_count,
        day_1_retention,
        day_7_retention,
        day_30_retention,
        day_90_retention
      FROM user_retention_metrics
      WHERE cohort_date >= ?
      ORDER BY cohort_date ASC
    `, [startDateStr]);
    
    // 获取总指标
    const [totals] = await pool.query(`
      SELECT
        SUM(active_users) AS total_active_users,
        SUM(new_users) AS total_new_users,
        SUM(total_sessions) AS total_sessions_count,
        AVG(avg_session_duration_seconds) AS overall_avg_session,
        SUM(prompt_draws) AS total_draws,
        SUM(comments_created) AS total_comments,
        SUM(ratings_given) AS total_ratings,
        SUM(collections_made) AS total_collections
      FROM platform_stats
      WHERE date >= ?
    `, [startDateStr]);
    
    // 获取用户分段分布
    const [segments] = await pool.query(`
      SELECT 
        s.name, 
        COUNT(m.user_id) AS user_count,
        COUNT(m.user_id) / (SELECT COUNT(*) FROM users) * 100 AS percentage
      FROM user_segments s
      LEFT JOIN user_segment_mappings m ON s.id = m.segment_id
      GROUP BY s.id, s.name
      ORDER BY user_count DESC
    `);
    
    return {
      daily_stats: stats,
      user_growth: growth,
      user_retention: retention,
      totals: totals[0] || {},
      user_segments: segments,
      timeframe
    };
  } catch (error) {
    console.error('获取平台统计失败:', error);
    return null;
  }
}

// 执行自定义报告
async function runCustomReport(reportId) {
  try {
    // 获取报告配置
    const [reports] = await pool.query(`
      SELECT * FROM custom_reports WHERE id = ?
    `, [reportId]);
    
    if (reports.length === 0) {
      throw new Error('报告不存在');
    }
    
    const report = reports[0];
    const { report_type, query_params } = report;
    const params = JSON.parse(query_params);
    
    // 记录报告生成开始
    const [result] = await pool.query(`
      INSERT INTO report_generation_history (
        report_id, status, started_at
      ) VALUES (?, 'processing', NOW())
    `, [reportId]);
    
    const generationId = result.insertId;
    let reportData;
    
    // 根据报告类型执行不同查询
    switch (report_type) {
      case 'user':
        reportData = await generateUserReport(params);
        break;
      case 'content':
        reportData = await generateContentReport(params);
        break;
      case 'activity':
        reportData = await generateActivityReport(params);
        break;
      case 'moderation':
        reportData = await generateModerationReport(params);
        break;
      case 'platform':
        reportData = await generatePlatformReport(params);
        break;
      default:
        throw new Error(`不支持的报告类型: ${report_type}`);
    }
    
    // 更新报告生成状态为成功
    await pool.query(`
      UPDATE report_generation_history
      SET 
        status = 'completed',
        result_data = ?,
        completed_at = NOW()
      WHERE id = ?
    `, [JSON.stringify(reportData), generationId]);
    
    return {
      report_id: reportId,
      generation_id: generationId,
      status: 'completed',
      data: reportData
    };
  } catch (error) {
    console.error('执行自定义报告失败:', error);
    
    // 更新报告生成状态为失败
    if (reportId && error.generationId) {
      await pool.query(`
        UPDATE report_generation_history
        SET 
          status = 'failed',
          error_message = ?,
          completed_at = NOW()
        WHERE id = ?
      `, [error.message, error.generationId]);
    }
    
    return {
      status: 'failed',
      error: error.message
    };
  }
}

// 生成用户报告
async function generateUserReport(params) {
  const { timeframe_days = 30, metrics = [], group_by = 'date', segment_id = null } = params;
  
  // 计算开始日期
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeframe_days);
  const startDateStr = startDate.toISOString().split('T')[0];
  
  // 构建查询
  let query, queryParams;
  
  if (group_by === 'cohort_date') {
    // 用户队列报告
    query = `
      SELECT 
        cohort_date,
        users_count AS new_users,
        day_1_retention,
        ROUND(day_1_retention / users_count * 100, 2) AS day_1_percentage,
        day_7_retention,
        ROUND(day_7_retention / users_count * 100, 2) AS day_7_percentage,
        day_30_retention,
        ROUND(day_30_retention / users_count * 100, 2) AS day_30_percentage
      FROM user_retention_metrics
      WHERE cohort_date >= ?
      ORDER BY cohort_date ASC
    `;
    queryParams = [startDateStr];
  } else if (segment_id) {
    // 特定用户分段的统计
    query = `
      SELECT 
        DATE(a.date) AS date,
        COUNT(DISTINCT a.user_id) AS active_users,
        SUM(a.login_count) AS logins,
        SUM(a.prompt_draws) AS draws,
        SUM(a.comments_created) AS comments,
        SUM(a.social_interactions) AS social_actions
      FROM user_activity_analytics a
      JOIN user_segment_mappings m ON a.user_id = m.user_id
      WHERE m.segment_id = ? AND a.date >= ?
      GROUP BY DATE(a.date)
      ORDER BY date ASC
    `;
    queryParams = [segment_id, startDateStr];
  } else {
    // 默认用户活动报告
    query = `
      SELECT 
        DATE(a.date) AS date,
        COUNT(DISTINCT a.user_id) AS active_users,
        SUM(a.login_count) AS logins,
        SUM(a.prompt_draws) AS draws,
        SUM(a.comments_created) AS comments,
        SUM(a.social_interactions) AS social_actions
      FROM user_activity_analytics a
      WHERE a.date >= ?
      GROUP BY DATE(a.date)
      ORDER BY date ASC
    `;
    queryParams = [startDateStr];
  }
  
  // 执行查询
  const [results] = await pool.query(query, queryParams);
  
  // 获取用户分段分布
  const [segments] = await pool.query(`
    SELECT 
      s.name, 
      COUNT(m.user_id) AS user_count
    FROM user_segments s
    LEFT JOIN user_segment_mappings m ON s.id = m.segment_id
    GROUP BY s.id, s.name
    ORDER BY user_count DESC
  `);
  
  // 获取用户参与度分布
  const [engagement] = await pool.query(`
    SELECT 
      CASE 
        WHEN engagement_score >= 8 THEN '高度活跃 (8-10)'
        WHEN engagement_score >= 5 THEN '中度活跃 (5-8)'
        WHEN engagement_score >= 2 THEN '低度活跃 (2-5)'
        ELSE '非活跃 (0-2)'
      END AS engagement_level,
      COUNT(*) AS user_count
    FROM user_engagement_metrics
    GROUP BY engagement_level
    ORDER BY MIN(engagement_score) DESC
  `);
  
  return {
    data: results,
    segments,
    engagement,
    timeframe: timeframe_days
  };
}

// 生成内容报告
async function generateContentReport(params) {
  const { 
    timeframe_days = 30, 
    content_type = 'prompt', 
    top_n = 20, 
    sort_by = 'popularity_score', 
    metrics = [] 
  } = params;
  
  // 计算开始日期
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeframe_days);
  const startDateStr = startDate.toISOString().split('T')[0];
  
  // 获取热门内容
  const [topContent] = await pool.query(`
    SELECT
      content_id,
      SUM(views) AS total_views,
      SUM(draws) AS total_draws,
      SUM(ratings_count) AS total_ratings,
      AVG(average_rating) AS avg_rating,
      SUM(comments_count) AS total_comments,
      SUM(shares_count) AS total_shares,
      SUM(collections_count) AS total_collections,
      AVG(popularity_score) AS avg_popularity
    FROM content_popularity_metrics
    WHERE content_type = ? AND date >= ?
    GROUP BY content_id
    ORDER BY ${sort_by === 'popularity_score' ? 'avg_popularity' : 'total_' + sort_by} DESC
    LIMIT ?
  `, [content_type, startDateStr, top_n]);
  
  // 获取内容详情
  const contentIds = topContent.map(c => c.content_id);
  
  let contentDetails = [];
  if (contentIds.length > 0) {
    // 不同内容类型的查询
    let detailQuery;
    
    if (content_type === 'prompt') {
      detailQuery = `
        SELECT 
          p.id, 
          p.prompt_text AS title, 
          p.quality_score,
          t.name AS type_name,
          c.name AS category_name,
          r.name AS rarity_name
        FROM prompt_cards p
        LEFT JOIN prompt_types t ON p.type_id = t.id
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN rarity_levels r ON p.rarity_level_id = r.id
        WHERE p.id IN (?)
      `;
    } else if (content_type === 'collection') {
      detailQuery = `
        SELECT 
          id, 
          title,
          description,
          user_id AS creator_id
        FROM collections
        WHERE id IN (?)
      `;
    }
    // 其他内容类型...
    
    if (detailQuery) {
      [contentDetails] = await pool.query(detailQuery, [contentIds]);
    }
  }
  
  // 合并详情
  const enrichedContent = topContent.map(content => {
    const details = contentDetails.find(d => d.id === content.content_id) || {};
    return { ...content, ...details };
  });
  
  // 获取内容发布趋势
  const [publishTrend] = await pool.query(`
    SELECT 
      DATE_FORMAT(created_at, '%Y-%m-%d') AS date,
      COUNT(*) AS count
    FROM ${content_type === 'prompt' ? 'prompt_cards' : (content_type + 's')}
    WHERE created_at >= ?
    GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
    ORDER BY date ASC
  `, [startDateStr]);
  
  // 获取内容类型分布
  let typesDistribution = [];
  
  if (content_type === 'prompt') {
    [typesDistribution] = await pool.query(`
      SELECT 
        t.name AS type_name, 
        COUNT(p.id) AS count
      FROM prompt_cards p
      JOIN prompt_types t ON p.type_id = t.id
      WHERE p.created_at >= ?
      GROUP BY t.id, t.name
      ORDER BY count DESC
    `, [startDateStr]);
  }
  
  return {
    top_content: enrichedContent,
    publish_trend: publishTrend,
    types_distribution: typesDistribution,
    timeframe: timeframe_days
  };
}

// 生成活动报告
async function generateActivityReport(params) {
  const { timeframe_days = 30, activity_types = [], group_by = 'date' } = params;
  
  // 计算开始日期
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeframe_days);
  const startDateStr = startDate.toISOString().split('T')[0];
  
  // 默认活动类型
  const defaultTypes = ['login', 'view_prompt', 'draw_prompt', 'comment', 'rate', 'share', 'collect'];
  
  // 使用提供的活动类型或默认类型
  const typesToFetch = activity_types.length > 0 ? activity_types : defaultTypes;
  
  // 按日期分组的活动数量
  const [dailyActivities] = await pool.query(`
    SELECT 
      DATE(created_at) AS date,
      event_type,
      COUNT(*) AS count
    FROM user_events
    WHERE DATE(created_at) >= ? AND event_type IN (?)
    GROUP BY DATE(created_at), event_type
    ORDER BY date ASC, event_type
  `, [startDateStr, typesToFetch]);
  
  // 按小时分组的活动数量（用于确定高峰时段）
  const [hourlyActivities] = await pool.query(`
    SELECT 
      HOUR(created_at) AS hour,
      COUNT(*) AS count
    FROM user_events
    WHERE DATE(created_at) >= ? AND event_type IN (?)
    GROUP BY HOUR(created_at)
    ORDER BY hour
  `, [startDateStr, typesToFetch]);
  
  // 活动路径分析（用户行为序列）
  const [userPaths] = await pool.query(`
    WITH user_session_events AS (
      SELECT
        user_id,
        session_id,
        event_type,
        created_at,
        ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY created_at) AS event_order
      FROM user_events
      WHERE DATE(created_at) >= ? AND session_id IS NOT NULL
    )
    SELECT
      e1.event_type AS first_event,
      e2.event_type AS second_event,
      COUNT(*) AS transition_count
    FROM user_session_events e1
    JOIN user_session_events e2 ON e1.session_id = e2.session_id
      AND e1.event_order = e2.event_order - 1
    GROUP BY e1.event_type, e2.event_type
    ORDER BY transition_count DESC
    LIMIT 20
  `, [startDateStr]);
  
  return {
    daily_activities: dailyActivities,
    hourly_distribution: hourlyActivities,
    user_paths: userPaths,
    timeframe: timeframe_days
  };
}

// 生成审核报告
async function generateModerationReport(params) {
  const { timeframe_days = 30, include_reports = true } = params;
  
  // 计算开始日期
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeframe_days);
  const startDateStr = startDate.toISOString().split('T')[0];
  
  // 按日期获取审核活动
  const [moderationActivity] = await pool.query(`
    SELECT 
      DATE(created_at) AS date,
      action,
      COUNT(*) AS count
    FROM moderation_logs
    WHERE DATE(created_at) >= ?
    GROUP BY DATE(created_at), action
    ORDER BY date ASC, action
  `, [startDateStr]);
  
  // 内容状态变更统计
  const [statusChanges] = await pool.query(`
    SELECT 
      previous_status,
      new_status,
      COUNT(*) AS count
    FROM moderation_logs
    WHERE DATE(created_at) >= ?
    GROUP BY previous_status, new_status
    ORDER BY count DESC
  `, [startDateStr]);
  
  // 审核员活动统计
  const [moderatorActivity] = await pool.query(`
    SELECT 
      u.id AS moderator_id,
      u.username AS moderator_name,
      COUNT(*) AS total_actions,
      SUM(CASE WHEN ml.action = 'approve' THEN 1 ELSE 0 END) AS approvals,
      SUM(CASE WHEN ml.action = 'reject' THEN 1 ELSE 0 END) AS rejections,
      SUM(CASE WHEN ml.action = 'flag' THEN 1 ELSE 0 END) AS flags
    FROM moderation_logs ml
    JOIN users u ON ml.moderator_id = u.id
    WHERE DATE(ml.created_at) >= ?
    GROUP BY u.id, u.username
    ORDER BY total_actions DESC
  `, [startDateStr]);
  
  // 如果需要包含举报统计
  let reportStats = [];
  let topReportedContent = [];
  
  if (include_reports) {
    // 举报类型统计
    [reportStats] = await pool.query(`
      SELECT 
        rt.name AS report_type,
        COUNT(cr.id) AS total_reports,
        SUM(CASE WHEN cr.status = 'resolved' THEN 1 ELSE 0 END) AS resolved,
        SUM(CASE WHEN cr.status = 'rejected' THEN 1 ELSE 0 END) AS rejected,
        COUNT(DISTINCT cr.reporter_id) AS unique_reporters
      FROM content_reports cr
      JOIN report_types rt ON cr.report_type_id = rt.id
      WHERE DATE(cr.created_at) >= ?
      GROUP BY rt.id, rt.name
      ORDER BY total_reports DESC
    `, [startDateStr]);
    
    // 被举报最多的内容
    [topReportedContent] = await pool.query(`
      SELECT 
        cr.content_type,
        cr.content_id,
        COUNT(*) AS report_count,
        GROUP_CONCAT(DISTINCT rt.name SEPARATOR ', ') AS report_types
      FROM content_reports cr
      JOIN report_types rt ON cr.report_type_id = rt.id
      WHERE DATE(cr.created_at) >= ?
      GROUP BY cr.content_type, cr.content_id
      ORDER BY report_count DESC
      LIMIT 10
    `, [startDateStr]);
  }
  
  return {
    moderation_activity: moderationActivity,
    status_changes: statusChanges,
    moderator_activity: moderatorActivity,
    report_stats: reportStats,
    top_reported_content: topReportedContent,
    timeframe: timeframe_days
  };
}

// 生成平台报告
async function generatePlatformReport(params) {
  const { timeframe_days = 30, metrics = [] } = params;
  
  // 调用平台统计函数
  return await getPlatformStats(timeframe_days, metrics);
}

// 创建用户事件记录中间件
function createUserEventMiddleware(eventType) {
  return (req, res, next) => {
    // 如果用户已登录
    if (req.user && req.user.id) {
      // 收集会话信息
      const sessionInfo = {
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.headers['user-agent'],
        referrer: req.headers.referer,
        session_id: req.cookies.session_id || req.headers['x-session-id'] || null
      };
      
      // 从请求中提取事件数据
      const eventData = {};
      
      // 根据不同事件类型填充数据
      switch (eventType) {
        case 'view_prompt':
          if (req.params.promptId) {
            eventData.prompt_id = req.params.promptId;
          }
          break;
        case 'draw_prompt':
          if (req.params.promptId) {
            eventData.prompt_id = req.params.promptId;
          }
          break;
        case 'rate_prompt':
          if (req.params.promptId && req.body.rating) {
            eventData.prompt_id = req.params.promptId;
            eventData.rating = req.body.rating;
          }
          break;
        // 其他事件类型...
      }
      
      // 记录事件（但不等待完成，继续处理请求）
      recordUserEvent(req.user.id, eventType, eventData, sessionInfo)
        .catch(err => console.error(`记录用户事件失败: ${err.message}`));
    }
    
    // 继续处理请求
    next();
  };
}

module.exports = {
  recordUserEvent,
  updateUserRetentionDays,
  updateSessionDuration,
  getUserActivityStats,
  getContentPopularityStats,
  getPlatformStats,
  runCustomReport,
  createUserEventMiddleware
};
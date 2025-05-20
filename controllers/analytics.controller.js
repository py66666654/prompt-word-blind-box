// 分析控制器
const { pool } = require('../config/database');
const analyticsService = require('../services/analytics.service');

// 记录用户事件
exports.recordEvent = async (req, res) => {
  try {
    const userId = req.user.id;
    const { event_type, event_data } = req.body;
    
    if (!event_type) {
      return res.status(400).json({ message: '事件类型为必填项' });
    }
    
    // 收集会话信息
    const sessionInfo = {
      device_info: req.body.device_info,
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.headers['user-agent'],
      referrer: req.headers.referer || req.body.referrer,
      session_id: req.cookies.session_id || req.headers['x-session-id'] || req.body.session_id
    };
    
    // 记录事件
    const eventId = await analyticsService.recordUserEvent(
      userId, 
      event_type, 
      event_data || {}, 
      sessionInfo
    );
    
    if (!eventId) {
      return res.status(500).json({ message: '记录事件失败' });
    }
    
    res.status(201).json({ 
      message: '事件已记录',
      event_id: eventId
    });
  } catch (error) {
    console.error('记录事件失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 更新会话时长
exports.updateSessionDuration = async (req, res) => {
  try {
    const { session_id, duration_seconds } = req.body;
    
    if (!session_id || !duration_seconds) {
      return res.status(400).json({ message: '会话ID和时长为必填项' });
    }
    
    // 确保时长是有效数字
    const duration = parseInt(duration_seconds, 10);
    if (isNaN(duration) || duration <= 0) {
      return res.status(400).json({ message: '时长必须是正数' });
    }
    
    // 更新会话时长
    const result = await analyticsService.updateSessionDuration(session_id, duration);
    
    if (!result) {
      return res.status(500).json({ message: '更新会话时长失败' });
    }
    
    res.status(200).json({ message: '会话时长已更新' });
  } catch (error) {
    console.error('更新会话时长失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取用户活动统计
exports.getUserStats = async (req, res) => {
  try {
    // 验证请求用户权限
    const { userId } = req.params;
    const requesterId = req.user.id;
    const requesterRole = req.user.role;
    
    // 检查权限：只能查看自己的或管理员可以查看所有
    if (userId != requesterId && !['moderator', 'admin', 'super_admin'].includes(requesterRole)) {
      return res.status(403).json({ message: '没有权限查看该用户的统计信息' });
    }
    
    // 获取时间范围参数
    const { timeframe = 30 } = req.query;
    const timeframeInt = parseInt(timeframe, 10) || 30;
    
    // 获取用户统计
    const stats = await analyticsService.getUserActivityStats(userId, timeframeInt);
    
    if (!stats) {
      return res.status(404).json({ message: '未找到用户统计数据' });
    }
    
    res.status(200).json(stats);
  } catch (error) {
    console.error('获取用户统计失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取内容热度统计
exports.getContentStats = async (req, res) => {
  try {
    const { contentType, contentId } = req.params;
    const { timeframe = 30 } = req.query;
    const timeframeInt = parseInt(timeframe, 10) || 30;
    
    // 验证内容类型
    if (!['prompt', 'collection', 'collaborative', 'challenge'].includes(contentType)) {
      return res.status(400).json({ message: '无效的内容类型' });
    }
    
    // 获取内容统计
    const stats = await analyticsService.getContentPopularityStats(
      contentType,
      contentId,
      timeframeInt
    );
    
    if (!stats) {
      return res.status(404).json({ message: '未找到内容统计数据' });
    }
    
    res.status(200).json(stats);
  } catch (error) {
    console.error('获取内容统计失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取平台统计（管理员专用）
exports.getPlatformStats = async (req, res) => {
  try {
    // 验证用户是否有管理员权限
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: '没有权限访问此资源' });
    }
    
    // 获取参数
    const { timeframe = 30, metrics } = req.query;
    const timeframeInt = parseInt(timeframe, 10) || 30;
    
    // 解析指标数组
    let metricsArray = null;
    if (metrics) {
      try {
        metricsArray = JSON.parse(metrics);
      } catch (e) {
        // 如果不是有效的JSON，尝试将其作为逗号分隔的字符串拆分
        metricsArray = metrics.split(',').map(m => m.trim());
      }
    }
    
    // 获取平台统计
    const stats = await analyticsService.getPlatformStats(
      timeframeInt,
      metricsArray
    );
    
    if (!stats) {
      return res.status(500).json({ message: '获取平台统计失败' });
    }
    
    res.status(200).json(stats);
  } catch (error) {
    console.error('获取平台统计失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取自定义报告列表（管理员专用）
exports.getCustomReports = async (req, res) => {
  try {
    // 验证用户权限
    const userId = req.user.id;
    const userRole = req.user.role;
    const isAdmin = ['admin', 'super_admin'].includes(userRole);
    
    // 构建查询条件
    let whereClause = '';
    const queryParams = [];
    
    // 如果不是管理员，只能看到自己创建的或公开的报告
    if (!isAdmin) {
      whereClause = 'WHERE creator_id = ? OR is_public = TRUE';
      queryParams.push(userId);
    }
    
    // 获取报告列表
    const [reports] = await pool.query(`
      SELECT 
        r.id, r.name, r.description, r.report_type, 
        r.is_public, r.created_at, r.updated_at,
        u.username as creator_name,
        u.id as creator_id,
        (
          SELECT status
          FROM report_generation_history
          WHERE report_id = r.id
          ORDER BY id DESC
          LIMIT 1
        ) as last_generation_status,
        (
          SELECT completed_at
          FROM report_generation_history
          WHERE report_id = r.id
          ORDER BY id DESC
          LIMIT 1
        ) as last_generated_at
      FROM custom_reports r
      JOIN users u ON r.creator_id = u.id
      ${whereClause}
      ORDER BY r.updated_at DESC
    `, queryParams);
    
    res.status(200).json(reports);
  } catch (error) {
    console.error('获取自定义报告列表失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取自定义报告详情
exports.getCustomReportById = async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const isAdmin = ['admin', 'super_admin'].includes(userRole);
    
    // 获取报告详情
    const [reports] = await pool.query(`
      SELECT 
        r.id, r.name, r.description, r.report_type, 
        r.query_params, r.visualization_settings,
        r.schedule, r.is_public, 
        r.created_at, r.updated_at,
        u.username as creator_name,
        u.id as creator_id
      FROM custom_reports r
      JOIN users u ON r.creator_id = u.id
      WHERE r.id = ?
    `, [reportId]);
    
    if (reports.length === 0) {
      return res.status(404).json({ message: '报告不存在' });
    }
    
    const report = reports[0];
    
    // 验证访问权限
    if (!isAdmin && report.creator_id !== userId && !report.is_public) {
      return res.status(403).json({ message: '没有权限访问该报告' });
    }
    
    // 获取最新的报告生成历史
    const [generations] = await pool.query(`
      SELECT
        id, status, result_data, error_message,
        started_at, completed_at
      FROM report_generation_history
      WHERE report_id = ?
      ORDER BY id DESC
      LIMIT 5
    `, [reportId]);
    
    // 解析查询参数和可视化设置
    if (report.query_params) {
      try {
        report.query_params = JSON.parse(report.query_params);
      } catch (e) {
        report.query_params = {};
      }
    }
    
    if (report.visualization_settings) {
      try {
        report.visualization_settings = JSON.parse(report.visualization_settings);
      } catch (e) {
        report.visualization_settings = {};
      }
    }
    
    // 解析最新生成的报告数据
    if (generations.length > 0 && generations[0].result_data) {
      try {
        generations[0].result_data = JSON.parse(generations[0].result_data);
      } catch (e) {
        generations[0].result_data = null;
      }
    }
    
    res.status(200).json({
      ...report,
      generations
    });
  } catch (error) {
    console.error('获取自定义报告详情失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 创建或更新自定义报告（管理员专用）
exports.saveCustomReport = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // 验证是否有管理员权限
    if (!['admin', 'super_admin'].includes(userRole)) {
      return res.status(403).json({ message: '没有权限创建或编辑报告' });
    }
    
    const { 
      reportId, name, description, report_type, 
      query_params, visualization_settings, schedule, is_public 
    } = req.body;
    
    // 验证必填字段
    if (!name || !report_type) {
      return res.status(400).json({ message: '名称和报告类型为必填项' });
    }
    
    // 验证报告类型
    if (!['user', 'content', 'activity', 'moderation', 'platform'].includes(report_type)) {
      return res.status(400).json({ message: '无效的报告类型' });
    }
    
    // 确保查询参数和可视化设置是有效的JSON
    let queryParamsJson, visualizationSettingsJson;
    
    try {
      queryParamsJson = query_params ? JSON.stringify(query_params) : '{}';
    } catch (e) {
      return res.status(400).json({ message: '查询参数必须是有效的JSON对象' });
    }
    
    try {
      visualizationSettingsJson = visualization_settings ? JSON.stringify(visualization_settings) : '{}';
    } catch (e) {
      return res.status(400).json({ message: '可视化设置必须是有效的JSON对象' });
    }
    
    let result;
    
    if (reportId) {
      // 更新现有报告
      // 验证是否有权限更新
      const [reports] = await pool.query(
        'SELECT creator_id FROM custom_reports WHERE id = ?',
        [reportId]
      );
      
      if (reports.length === 0) {
        return res.status(404).json({ message: '报告不存在' });
      }
      
      // 只有创建者和超级管理员可以编辑
      if (reports[0].creator_id !== userId && userRole !== 'super_admin') {
        return res.status(403).json({ message: '没有权限编辑该报告' });
      }
      
      // 更新报告
      [result] = await pool.query(`
        UPDATE custom_reports
        SET 
          name = ?,
          description = ?,
          report_type = ?,
          query_params = ?,
          visualization_settings = ?,
          schedule = ?,
          is_public = ?,
          updated_at = NOW()
        WHERE id = ?
      `, [
        name, 
        description || null, 
        report_type, 
        queryParamsJson, 
        visualizationSettingsJson, 
        schedule || null, 
        is_public || false, 
        reportId
      ]);
      
      res.status(200).json({
        message: '报告已更新',
        report_id: reportId
      });
    } else {
      // 创建新报告
      [result] = await pool.query(`
        INSERT INTO custom_reports (
          name, description, creator_id, report_type,
          query_params, visualization_settings, schedule, is_public
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        name, 
        description || null, 
        userId, 
        report_type, 
        queryParamsJson, 
        visualizationSettingsJson, 
        schedule || null, 
        is_public || false
      ]);
      
      res.status(201).json({
        message: '报告已创建',
        report_id: result.insertId
      });
    }
  } catch (error) {
    console.error('保存自定义报告失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 运行自定义报告
exports.runCustomReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const isAdmin = ['admin', 'super_admin'].includes(userRole);
    
    // 获取报告详情
    const [reports] = await pool.query(
      'SELECT id, name, creator_id, is_public FROM custom_reports WHERE id = ?',
      [reportId]
    );
    
    if (reports.length === 0) {
      return res.status(404).json({ message: '报告不存在' });
    }
    
    // 验证访问权限
    if (!isAdmin && reports[0].creator_id !== userId && !reports[0].is_public) {
      return res.status(403).json({ message: '没有权限运行该报告' });
    }
    
    // 运行报告
    const result = await analyticsService.runCustomReport(reportId);
    
    if (result.status === 'failed') {
      return res.status(500).json({
        message: '报告运行失败',
        error: result.error
      });
    }
    
    res.status(200).json(result);
  } catch (error) {
    console.error('运行报告失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 删除自定义报告
exports.deleteCustomReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // 获取报告详情
    const [reports] = await pool.query(
      'SELECT creator_id FROM custom_reports WHERE id = ?',
      [reportId]
    );
    
    if (reports.length === 0) {
      return res.status(404).json({ message: '报告不存在' });
    }
    
    // 只有创建者和超级管理员可以删除
    if (reports[0].creator_id !== userId && userRole !== 'super_admin') {
      return res.status(403).json({ message: '没有权限删除该报告' });
    }
    
    // 删除报告
    await pool.query('DELETE FROM custom_reports WHERE id = ?', [reportId]);
    
    res.status(200).json({ message: '报告已删除' });
  } catch (error) {
    console.error('删除报告失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取用户分段列表（管理员专用）
exports.getUserSegments = async (req, res) => {
  try {
    // 验证用户是否有管理员权限
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: '没有权限访问此资源' });
    }
    
    // 获取用户分段列表
    const [segments] = await pool.query(`
      SELECT 
        s.id, s.name, s.description, s.segment_criteria,
        s.is_dynamic, s.created_at, s.updated_at,
        COUNT(m.user_id) AS user_count
      FROM user_segments s
      LEFT JOIN user_segment_mappings m ON s.id = m.segment_id
      GROUP BY s.id
      ORDER BY user_count DESC
    `);
    
    // 解析分段条件
    for (const segment of segments) {
      if (segment.segment_criteria) {
        try {
          segment.segment_criteria = JSON.parse(segment.segment_criteria);
        } catch (e) {
          segment.segment_criteria = {};
        }
      }
    }
    
    res.status(200).json(segments);
  } catch (error) {
    console.error('获取用户分段列表失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 创建或更新用户分段（管理员专用）
exports.saveUserSegment = async (req, res) => {
  try {
    // 验证用户是否有管理员权限
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: '没有权限访问此资源' });
    }
    
    const { segmentId, name, description, segment_criteria, is_dynamic } = req.body;
    
    // 验证必填字段
    if (!name) {
      return res.status(400).json({ message: '分段名称为必填项' });
    }
    
    // 确保分段条件是有效的JSON
    let criteriaJson;
    try {
      criteriaJson = segment_criteria ? JSON.stringify(segment_criteria) : '{}';
    } catch (e) {
      return res.status(400).json({ message: '分段条件必须是有效的JSON对象' });
    }
    
    let result;
    
    if (segmentId) {
      // 更新现有分段
      [result] = await pool.query(`
        UPDATE user_segments
        SET 
          name = ?,
          description = ?,
          segment_criteria = ?,
          is_dynamic = ?,
          updated_at = NOW()
        WHERE id = ?
      `, [
        name, 
        description || null, 
        criteriaJson, 
        is_dynamic !== undefined ? is_dynamic : true, 
        segmentId
      ]);
      
      // 如果是动态分段，重新计算用户映射
      if (is_dynamic) {
        await recalculateSegmentUsers(segmentId, JSON.parse(criteriaJson));
      }
      
      res.status(200).json({
        message: '用户分段已更新',
        segment_id: segmentId
      });
    } else {
      // 创建新分段
      [result] = await pool.query(`
        INSERT INTO user_segments (
          name, description, segment_criteria, is_dynamic
        ) VALUES (?, ?, ?, ?)
      `, [
        name, 
        description || null, 
        criteriaJson, 
        is_dynamic !== undefined ? is_dynamic : true
      ]);
      
      const newSegmentId = result.insertId;
      
      // 如果是动态分段，计算用户映射
      if (is_dynamic !== false) {
        await recalculateSegmentUsers(newSegmentId, JSON.parse(criteriaJson));
      }
      
      res.status(201).json({
        message: '用户分段已创建',
        segment_id: newSegmentId
      });
    }
  } catch (error) {
    console.error('保存用户分段失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 重新计算分段用户
async function recalculateSegmentUsers(segmentId, criteria) {
  // 清除现有映射
  await pool.query('DELETE FROM user_segment_mappings WHERE segment_id = ?', [segmentId]);
  
  // 根据条件构建查询
  let whereClause = '';
  const queryParams = [segmentId];
  
  // 解析各种条件类型
  if (criteria.registration_max_days) {
    whereClause += whereClause ? ' AND ' : ' WHERE ';
    whereClause += 'created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)';
    queryParams.push(criteria.registration_max_days);
  }
  
  if (criteria.login_min_count && criteria.timeframe_days) {
    whereClause += whereClause ? ' AND ' : ' WHERE ';
    whereClause += 'id IN (SELECT user_id FROM user_activity_analytics WHERE date >= DATE_SUB(CURRENT_DATE, INTERVAL ? DAY) GROUP BY user_id HAVING SUM(login_count) >= ?)';
    queryParams.push(criteria.timeframe_days, criteria.login_min_count);
  }
  
  if (criteria.premium !== undefined) {
    whereClause += whereClause ? ' AND ' : ' WHERE ';
    whereClause += 'premium = ?';
    queryParams.push(criteria.premium ? 1 : 0);
  }
  
  if (criteria.engagement_percentile) {
    whereClause += whereClause ? ' AND ' : ' WHERE ';
    whereClause += 'id IN (SELECT user_id FROM user_engagement_metrics WHERE engagement_score >= (SELECT engagement_score FROM user_engagement_metrics ORDER BY engagement_score DESC LIMIT 1 OFFSET (SELECT COUNT(*) * (1 - ? / 100) FROM user_engagement_metrics)))';
    queryParams.push(criteria.engagement_percentile);
  }
  
  // 执行插入
  const query = `
    INSERT INTO user_segment_mappings (segment_id, user_id)
    SELECT ?, id FROM users ${whereClause}
  `;
  
  await pool.query(query, queryParams);
}

// 手动添加用户到分段
exports.addUserToSegment = async (req, res) => {
  try {
    // 验证用户是否有管理员权限
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: '没有权限访问此资源' });
    }
    
    const { segmentId, userIds } = req.body;
    
    if (!segmentId || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: '分段ID和用户ID列表为必填项' });
    }
    
    // 验证分段是否存在
    const [segments] = await pool.query(
      'SELECT id FROM user_segments WHERE id = ?',
      [segmentId]
    );
    
    if (segments.length === 0) {
      return res.status(404).json({ message: '分段不存在' });
    }
    
    // 验证用户是否存在
    const [users] = await pool.query(
      'SELECT id FROM users WHERE id IN (?)',
      [userIds]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ message: '未找到有效用户' });
    }
    
    // 获取现有映射
    const [existingMappings] = await pool.query(
      'SELECT user_id FROM user_segment_mappings WHERE segment_id = ? AND user_id IN (?)',
      [segmentId, userIds]
    );
    
    const existingUserIds = existingMappings.map(m => m.user_id);
    
    // 过滤出新用户
    const newUserIds = userIds.filter(id => !existingUserIds.includes(parseInt(id)));
    
    if (newUserIds.length === 0) {
      return res.status(200).json({ message: '所有用户已在分段中', added_count: 0 });
    }
    
    // 添加用户到分段
    const values = newUserIds.map(userId => [segmentId, userId]);
    await pool.query(
      'INSERT INTO user_segment_mappings (segment_id, user_id) VALUES ?',
      [values]
    );
    
    res.status(200).json({
      message: '用户已添加到分段',
      added_count: newUserIds.length
    });
  } catch (error) {
    console.error('添加用户到分段失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 从分段中删除用户
exports.removeUserFromSegment = async (req, res) => {
  try {
    // 验证用户是否有管理员权限
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: '没有权限访问此资源' });
    }
    
    const { segmentId, userId } = req.params;
    
    // 验证分段是否存在
    const [segments] = await pool.query(
      'SELECT id FROM user_segments WHERE id = ?',
      [segmentId]
    );
    
    if (segments.length === 0) {
      return res.status(404).json({ message: '分段不存在' });
    }
    
    // 删除映射
    await pool.query(
      'DELETE FROM user_segment_mappings WHERE segment_id = ? AND user_id = ?',
      [segmentId, userId]
    );
    
    res.status(200).json({ message: '用户已从分段中移除' });
  } catch (error) {
    console.error('从分段中移除用户失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

module.exports = exports;
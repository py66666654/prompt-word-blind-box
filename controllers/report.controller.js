// 举报系统控制器
const { pool } = require('../config/database');
const { createNotification } = require('./notification.controller');

// 创建新举报
exports.createReport = async (req, res) => {
  try {
    const reporterId = req.user.id;
    const { reportTypeId, contentType, contentId, description } = req.body;
    
    if (!reportTypeId || !contentType || !contentId) {
      return res.status(400).json({ message: '举报类型、内容类型和内容ID为必填项' });
    }
    
    // 验证举报类型是否存在
    const [reportTypes] = await pool.query(
      'SELECT * FROM report_types WHERE id = ?',
      [reportTypeId]
    );
    
    if (reportTypes.length === 0) {
      return res.status(404).json({ message: '举报类型不存在' });
    }
    
    // 验证被举报的内容是否存在
    let contentTable;
    switch (contentType) {
      case 'prompt':
        contentTable = 'prompt_cards';
        break;
      case 'comment':
        contentTable = 'comments';
        break;
      case 'user':
        contentTable = 'users';
        break;
      case 'collaborative':
        contentTable = 'collaborative_prompts';
        break;
      default:
        return res.status(400).json({ message: '无效的内容类型' });
    }
    
    const [content] = await pool.query(
      `SELECT * FROM ${contentTable} WHERE id = ?`,
      [contentId]
    );
    
    if (content.length === 0) {
      return res.status(404).json({ message: '被举报的内容不存在' });
    }
    
    // 检查用户是否已举报过该内容
    const [existingReports] = await pool.query(
      'SELECT * FROM content_reports WHERE reporter_id = ? AND content_type = ? AND content_id = ? AND status != "rejected"',
      [reporterId, contentType, contentId]
    );
    
    if (existingReports.length > 0) {
      return res.status(400).json({ message: '您已经举报过该内容' });
    }
    
    // 创建举报记录
    const [result] = await pool.query(
      'INSERT INTO content_reports (reporter_id, report_type_id, content_type, content_id, description) VALUES (?, ?, ?, ?, ?)',
      [reporterId, reportTypeId, contentType, contentId, description]
    );
    
    // 获取报告类型信息
    const reportType = reportTypes[0];
    
    // 如果举报类型配置为自动标记，则更新内容状态
    if (reportType.auto_flag) {
      await pool.query(
        `UPDATE ${contentTable} SET status = 'flagged' WHERE id = ?`,
        [contentId]
      );
      
      // 记录审核日志
      await pool.query(
        'INSERT INTO moderation_logs (moderator_id, content_type, content_id, action, previous_status, new_status, notes) VALUES (NULL, ?, ?, ?, ?, ?, ?)',
        [contentType, contentId, 'flag', 'approved', 'flagged', `系统自动标记: ${reportType.name}`]
      );
    }
    
    // 通知管理员
    const [moderators] = await pool.query(
      'SELECT id FROM users WHERE role IN ("moderator", "admin", "super_admin")'
    );
    
    // 获取举报者用户名
    const [reporter] = await pool.query(
      'SELECT username FROM users WHERE id = ?',
      [reporterId]
    );
    
    for (const moderator of moderators) {
      createNotification(
        moderator.id,
        reporterId,
        'system',
        result.insertId,
        `新举报需要审核：用户 ${reporter[0].username} 举报了一个${contentType === 'prompt' ? '提示词' : contentType === 'comment' ? '评论' : contentType === 'user' ? '用户' : '协作提示词'}`
      );
    }
    
    res.status(201).json({
      message: '举报已提交',
      reportId: result.insertId
    });
  } catch (error) {
    console.error('创建举报失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取举报列表（仅限管理员）
exports.getReports = async (req, res) => {
  try {
    // 验证用户是否有管理员权限
    if (!['moderator', 'admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: '没有权限访问此资源' });
    }
    
    const { status, contentType, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * parseInt(limit);
    
    // 构建查询条件
    let whereClause = '';
    const queryParams = [];
    
    if (status) {
      whereClause += 'WHERE cr.status = ?';
      queryParams.push(status);
    } else {
      whereClause += 'WHERE 1=1';
    }
    
    if (contentType) {
      whereClause += ' AND cr.content_type = ?';
      queryParams.push(contentType);
    }
    
    // 获取举报列表
    const [reports] = await pool.query(`
      SELECT 
        cr.id, cr.content_type, cr.content_id, cr.description, cr.status, cr.created_at,
        rt.name as report_type, rt.severity,
        reporter.id as reporter_id, reporter.username as reporter_username,
        resolver.id as resolver_id, resolver.username as resolver_username,
        cr.resolution_notes, cr.resolved_at
      FROM content_reports cr
      JOIN report_types rt ON cr.report_type_id = rt.id
      JOIN users reporter ON cr.reporter_id = reporter.id
      LEFT JOIN users resolver ON cr.resolved_by = resolver.id
      ${whereClause}
      ORDER BY 
        CASE 
          WHEN cr.status = 'pending' THEN 1
          WHEN cr.status = 'under_review' THEN 2
          WHEN cr.status = 'resolved' THEN 3
          WHEN cr.status = 'rejected' THEN 4
        END,
        rt.severity DESC,
        cr.created_at DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, parseInt(limit), offset]);
    
    // 获取总举报数以支持分页
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM content_reports cr ${whereClause}`,
      queryParams
    );
    
    const total = countResult[0].total;
    
    // 获取内容详情
    for (const report of reports) {
      let contentTable;
      let contentFields;
      
      switch (report.content_type) {
        case 'prompt':
          contentTable = 'prompt_cards';
          contentFields = 'id, prompt_text as content, status';
          break;
        case 'comment':
          contentTable = 'comments';
          contentFields = 'id, comment_text as content, status';
          break;
        case 'user':
          contentTable = 'users';
          contentFields = 'id, username as content, status';
          break;
        case 'collaborative':
          contentTable = 'collaborative_prompts';
          contentFields = 'id, title as content, status';
          break;
      }
      
      const [content] = await pool.query(
        `SELECT ${contentFields} FROM ${contentTable} WHERE id = ?`,
        [report.content_id]
      );
      
      if (content.length > 0) {
        report.content_details = content[0];
      }
    }
    
    res.status(200).json({
      reports,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取举报列表失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取单个举报详情（仅限管理员）
exports.getReportById = async (req, res) => {
  try {
    // 验证用户是否有管理员权限
    if (!['moderator', 'admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: '没有权限访问此资源' });
    }
    
    const { reportId } = req.params;
    
    // 获取举报详情
    const [reports] = await pool.query(`
      SELECT 
        cr.id, cr.content_type, cr.content_id, cr.description, cr.status, cr.created_at,
        rt.id as report_type_id, rt.name as report_type, rt.description as report_type_description, rt.severity,
        reporter.id as reporter_id, reporter.username as reporter_username,
        resolver.id as resolver_id, resolver.username as resolver_username,
        cr.resolution_notes, cr.resolved_at
      FROM content_reports cr
      JOIN report_types rt ON cr.report_type_id = rt.id
      JOIN users reporter ON cr.reporter_id = reporter.id
      LEFT JOIN users resolver ON cr.resolved_by = resolver.id
      WHERE cr.id = ?
    `, [reportId]);
    
    if (reports.length === 0) {
      return res.status(404).json({ message: '举报不存在' });
    }
    
    const report = reports[0];
    
    // 获取内容详情
    let contentTable;
    let contentFields;
    
    switch (report.content_type) {
      case 'prompt':
        contentTable = 'prompt_cards';
        contentFields = 'id, prompt_text as content, status, admin_notes, created_at, source';
        break;
      case 'comment':
        contentTable = 'comments';
        contentFields = 'id, comment_text as content, status, admin_notes, created_at, user_id';
        break;
      case 'user':
        contentTable = 'users';
        contentFields = 'id, username as content, status, created_at, bio, profile_image';
        break;
      case 'collaborative':
        contentTable = 'collaborative_prompts';
        contentFields = 'id, title as content, status, description, created_at, created_by';
        break;
    }
    
    const [content] = await pool.query(
      `SELECT ${contentFields} FROM ${contentTable} WHERE id = ?`,
      [report.content_id]
    );
    
    if (content.length > 0) {
      report.content_details = content[0];
    }
    
    // 获取内容创建者信息
    if (report.content_type === 'comment' && content.length > 0) {
      const [creator] = await pool.query(
        'SELECT id, username FROM users WHERE id = ?',
        [content[0].user_id]
      );
      
      if (creator.length > 0) {
        report.content_creator = creator[0];
      }
    } else if (report.content_type === 'collaborative' && content.length > 0) {
      const [creator] = await pool.query(
        'SELECT id, username FROM users WHERE id = ?',
        [content[0].created_by]
      );
      
      if (creator.length > 0) {
        report.content_creator = creator[0];
      }
    }
    
    // 获取相关审核日志
    const [moderationLogs] = await pool.query(`
      SELECT 
        ml.id, ml.action, ml.previous_status, ml.new_status, ml.notes, ml.created_at,
        u.id as moderator_id, u.username as moderator_username
      FROM moderation_logs ml
      LEFT JOIN users u ON ml.moderator_id = u.id
      WHERE ml.content_type = ? AND ml.content_id = ?
      ORDER BY ml.created_at DESC
    `, [report.content_type, report.content_id]);
    
    report.moderation_logs = moderationLogs;
    
    res.status(200).json(report);
  } catch (error) {
    console.error('获取举报详情失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 更新举报状态（仅限管理员）
exports.updateReportStatus = async (req, res) => {
  try {
    // 验证用户是否有管理员权限
    if (!['moderator', 'admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: '没有权限访问此资源' });
    }
    
    const { reportId } = req.params;
    const { status, resolutionNotes } = req.body;
    
    if (!status || !['under_review', 'resolved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: '无效的状态值' });
    }
    
    // 获取报告信息
    const [reports] = await pool.query(
      'SELECT * FROM content_reports WHERE id = ?',
      [reportId]
    );
    
    if (reports.length === 0) {
      return res.status(404).json({ message: '举报不存在' });
    }
    
    const report = reports[0];
    
    // 如果报告已处理，则不允许再次更新
    if (report.status === 'resolved' || report.status === 'rejected') {
      return res.status(400).json({ message: '该举报已处理，无法再次更新' });
    }
    
    const moderatorId = req.user.id;
    const updateFields = [];
    const updateParams = [];
    
    updateFields.push('status = ?');
    updateParams.push(status);
    
    if (resolutionNotes) {
      updateFields.push('resolution_notes = ?');
      updateParams.push(resolutionNotes);
    }
    
    // 如果状态是resolved或rejected，则设置解决时间和解决人
    if (status === 'resolved' || status === 'rejected') {
      updateFields.push('resolved_at = NOW(), resolved_by = ?');
      updateParams.push(moderatorId);
    }
    
    // 更新报告状态
    await pool.query(
      `UPDATE content_reports SET ${updateFields.join(', ')} WHERE id = ?`,
      [...updateParams, reportId]
    );
    
    // 如果状态变更为resolved，则通知举报者
    if (status === 'resolved') {
      await createNotification(
        report.reporter_id,
        moderatorId,
        'system',
        reportId,
        `您的举报已被处理`
      );
    }
    
    res.status(200).json({ message: '举报状态已更新' });
  } catch (error) {
    console.error('更新举报状态失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 执行内容审核操作（仅限管理员）
exports.moderateContent = async (req, res) => {
  try {
    // 验证用户是否有管理员权限
    if (!['moderator', 'admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: '没有权限访问此资源' });
    }
    
    const { contentType, contentId } = req.params;
    const { action, adminNotes } = req.body;
    
    if (!action || !['approve', 'reject', 'flag'].includes(action)) {
      return res.status(400).json({ message: '无效的操作' });
    }
    
    // 验证内容类型
    let contentTable;
    let contentCreatorField;
    
    switch (contentType) {
      case 'prompt':
        contentTable = 'prompt_cards';
        contentCreatorField = null; // 提示词没有创建者字段
        break;
      case 'comment':
        contentTable = 'comments';
        contentCreatorField = 'user_id';
        break;
      case 'user':
        contentTable = 'users';
        contentCreatorField = null;
        break;
      case 'collaborative':
        contentTable = 'collaborative_prompts';
        contentCreatorField = 'created_by';
        break;
      default:
        return res.status(400).json({ message: '无效的内容类型' });
    }
    
    // 获取内容信息
    const [contents] = await pool.query(
      `SELECT * FROM ${contentTable} WHERE id = ?`,
      [contentId]
    );
    
    if (contents.length === 0) {
      return res.status(404).json({ message: '内容不存在' });
    }
    
    const content = contents[0];
    const previousStatus = content.status || 'pending';
    let newStatus;
    
    // 根据操作设置新状态
    switch (action) {
      case 'approve':
        newStatus = 'approved';
        break;
      case 'reject':
        newStatus = 'rejected';
        break;
      case 'flag':
        newStatus = 'flagged';
        break;
    }
    
    // 更新内容状态
    const updateFields = ['status = ?'];
    const updateParams = [newStatus];
    
    if (adminNotes) {
      updateFields.push('admin_notes = ?');
      updateParams.push(adminNotes);
    }
    
    await pool.query(
      `UPDATE ${contentTable} SET ${updateFields.join(', ')} WHERE id = ?`,
      [...updateParams, contentId]
    );
    
    // 记录审核日志
    await pool.query(
      'INSERT INTO moderation_logs (moderator_id, content_type, content_id, action, previous_status, new_status, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, contentType, contentId, action, previousStatus, newStatus, adminNotes || null]
    );
    
    // 如果内容被拒绝，则通知内容创建者（如果有）
    if (action === 'reject' && contentCreatorField) {
      const creatorId = content[contentCreatorField];
      if (creatorId) {
        let contentTypeName;
        switch (contentType) {
          case 'comment':
            contentTypeName = '评论';
            break;
          case 'collaborative':
            contentTypeName = '协作提示词';
            break;
          default:
            contentTypeName = '内容';
        }
        
        await createNotification(
          creatorId,
          req.user.id,
          'system',
          contentId,
          `您的${contentTypeName}因违反社区规则已被移除`
        );
      }
    }
    
    // 自动处理相关举报
    if (action === 'approve' || action === 'reject') {
      await pool.query(
        'UPDATE content_reports SET status = ?, resolved_by = ?, resolved_at = NOW(), resolution_notes = ? WHERE content_type = ? AND content_id = ? AND status IN ("pending", "under_review")',
        [
          action === 'approve' ? 'rejected' : 'resolved',
          req.user.id,
          action === 'approve' ? '内容已审核并批准' : '内容已审核并移除',
          contentType,
          contentId
        ]
      );
    }
    
    res.status(200).json({ message: `内容已${action === 'approve' ? '批准' : action === 'reject' ? '拒绝' : '标记'}` });
  } catch (error) {
    console.error('执行内容审核操作失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取举报类型列表
exports.getReportTypes = async (req, res) => {
  try {
    const [reportTypes] = await pool.query(
      'SELECT * FROM report_types ORDER BY severity DESC, name'
    );
    
    res.status(200).json(reportTypes);
  } catch (error) {
    console.error('获取举报类型失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取社区指南
exports.getCommunityGuidelines = async (req, res) => {
  try {
    const [guidelines] = await pool.query(
      'SELECT * FROM community_guidelines WHERE is_active = TRUE ORDER BY category, title'
    );
    
    // 按分类组织
    const categorized = {};
    
    for (const guideline of guidelines) {
      if (!categorized[guideline.category]) {
        categorized[guideline.category] = [];
      }
      
      categorized[guideline.category].push(guideline);
    }
    
    res.status(200).json({
      categories: Object.keys(categorized),
      guidelines: categorized
    });
  } catch (error) {
    console.error('获取社区指南失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取内容审核统计信息（仅限管理员）
exports.getModerationStats = async (req, res) => {
  try {
    // 验证用户是否有管理员权限
    if (!['moderator', 'admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: '没有权限访问此资源' });
    }
    
    // 获取各种统计数据
    const [pendingReports] = await pool.query(
      'SELECT COUNT(*) as count FROM content_reports WHERE status = "pending"'
    );
    
    const [reviewReports] = await pool.query(
      'SELECT COUNT(*) as count FROM content_reports WHERE status = "under_review"'
    );
    
    const [resolvedReports] = await pool.query(
      'SELECT COUNT(*) as count FROM content_reports WHERE status = "resolved"'
    );
    
    const [rejectedReports] = await pool.query(
      'SELECT COUNT(*) as count FROM content_reports WHERE status = "rejected"'
    );
    
    const [reportsByType] = await pool.query(`
      SELECT rt.name, COUNT(cr.id) as count
      FROM content_reports cr
      JOIN report_types rt ON cr.report_type_id = rt.id
      GROUP BY rt.name
      ORDER BY count DESC
    `);
    
    const [reportsByContentType] = await pool.query(`
      SELECT content_type, COUNT(*) as count
      FROM content_reports
      GROUP BY content_type
      ORDER BY count DESC
    `);
    
    const [recentActivity] = await pool.query(`
      SELECT 
        ml.id, ml.content_type, ml.action, ml.created_at,
        u.username as moderator
      FROM moderation_logs ml
      LEFT JOIN users u ON ml.moderator_id = u.id
      ORDER BY ml.created_at DESC
      LIMIT 10
    `);
    
    // 获取待审核内容数量
    const [pendingPrompts] = await pool.query(
      'SELECT COUNT(*) as count FROM prompt_cards WHERE status = "pending"'
    );
    
    const [flaggedComments] = await pool.query(
      'SELECT COUNT(*) as count FROM comments WHERE status = "flagged"'
    );
    
    res.status(200).json({
      reports: {
        pending: pendingReports[0].count,
        under_review: reviewReports[0].count,
        resolved: resolvedReports[0].count,
        rejected: rejectedReports[0].count,
        by_type: reportsByType,
        by_content_type: reportsByContentType
      },
      pending_review: {
        prompts: pendingPrompts[0].count,
        comments: flaggedComments[0].count
      },
      recent_activity: recentActivity
    });
  } catch (error) {
    console.error('获取审核统计信息失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

module.exports = exports;
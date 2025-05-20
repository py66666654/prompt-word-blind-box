// 内容过滤服务
const { pool } = require('../config/database');

// 初始化过滤规则缓存
let filterRules = [];
let lastRuleUpdateTime = 0;
const CACHE_EXPIRY = 300000; // 5分钟缓存过期

// 加载过滤规则
async function loadFilterRules() {
  try {
    // 检查缓存是否过期
    const now = Date.now();
    if (filterRules.length > 0 && now - lastRuleUpdateTime < CACHE_EXPIRY) {
      return filterRules;
    }
    
    // 重新加载规则
    const [rules] = await pool.query(
      'SELECT * FROM content_filter_rules WHERE is_active = TRUE ORDER BY severity DESC'
    );
    
    filterRules = rules;
    lastRuleUpdateTime = now;
    
    console.log(`已加载 ${rules.length} 条内容过滤规则`);
    return rules;
  } catch (error) {
    console.error('加载过滤规则失败:', error);
    return [];
  }
}

// 应用关键词过滤规则
function applyKeywordFilter(content, rule) {
  if (!content || !rule.pattern) return false;
  
  // 关键词过滤使用逗号分隔的关键词列表
  const keywords = rule.pattern.split(',').map(kw => kw.trim());
  
  // 检查内容是否包含任何关键词
  for (const keyword of keywords) {
    if (keyword && content.includes(keyword)) {
      return {
        matched: true,
        keyword: keyword
      };
    }
  }
  
  return false;
}

// 应用正则表达式过滤规则
function applyRegexFilter(content, rule) {
  if (!content || !rule.pattern) return false;
  
  try {
    // 创建正则表达式对象
    const regex = new RegExp(rule.pattern, 'i');
    
    // 检查内容是否匹配正则表达式
    const match = content.match(regex);
    if (match) {
      return {
        matched: true,
        match: match[0]
      };
    }
    
    return false;
  } catch (error) {
    console.error('正则表达式过滤失败:', error);
    return false;
  }
}

// 应用AI模型过滤 (模拟，实际实现需要集成AI服务)
// 注意：这是一个假的实现，实际生产中需要集成真实的AI内容检测服务
function applyAIModelFilter(content, rule) {
  if (!content || !rule.pattern) return false;
  
  // 这里应该调用AI内容审核API
  // 以下是模拟实现，随机返回匹配结果
  const mockCategories = ['垃圾信息', '暴力内容', '成人内容', '仇恨言论'];
  const mockConfidence = Math.random();
  
  // 模拟有5%的内容会被标记
  if (mockConfidence > 0.95) {
    const randomCategory = mockCategories[Math.floor(Math.random() * mockCategories.length)];
    return {
      matched: true,
      category: randomCategory,
      confidence: mockConfidence
    };
  }
  
  return false;
}

// 过滤内容并返回结果
async function filterContent(content, contentType) {
  if (!content) return { passed: true };
  
  // 加载过滤规则
  const rules = await loadFilterRules();
  
  // 应用过滤规则
  for (const rule of rules) {
    let result = false;
    
    // 根据规则类型应用不同的过滤方法
    switch (rule.filter_type) {
      case 'keyword':
        result = applyKeywordFilter(content, rule);
        break;
      case 'regex':
        result = applyRegexFilter(content, rule);
        break;
      case 'ai_model':
        result = applyAIModelFilter(content, rule);
        break;
    }
    
    // 如果命中规则，返回结果
    if (result && result.matched) {
      return {
        passed: false,
        rule: rule,
        match: result
      };
    }
  }
  
  // 所有规则都通过
  return { passed: true };
}

// 记录自动过滤日志
async function logFilterAction(contentType, contentId, rule, match) {
  try {
    // 获取内容之前的状态
    let previousStatus = 'pending';
    let contentTable;
    
    switch (contentType) {
      case 'prompt':
        contentTable = 'prompt_cards';
        break;
      case 'comment':
        contentTable = 'comments';
        break;
      case 'collaborative':
        contentTable = 'collaborative_prompts';
        break;
      default:
        return;
    }
    
    const [contents] = await pool.query(
      `SELECT status FROM ${contentTable} WHERE id = ?`,
      [contentId]
    );
    
    if (contents.length > 0) {
      previousStatus = contents[0].status || 'pending';
    }
    
    // 确定新状态
    let newStatus, action;
    
    switch (rule.action) {
      case 'flag':
        newStatus = 'flagged';
        action = 'flag';
        break;
      case 'reject':
        newStatus = 'rejected';
        action = 'reject';
        break;
      case 'require_review':
        newStatus = 'pending';
        action = 'flag';
        break;
      default:
        newStatus = 'pending';
        action = 'flag';
    }
    
    // 记录日志
    const matchDetails = JSON.stringify(match);
    const notes = `自动过滤: 规则 "${rule.name}" 匹配 ${matchDetails}`;
    
    await pool.query(
      'INSERT INTO moderation_logs (moderator_id, content_type, content_id, action, previous_status, new_status, notes) VALUES (NULL, ?, ?, ?, ?, ?, ?)',
      [contentType, contentId, action, previousStatus, newStatus, notes]
    );
    
    return { previousStatus, newStatus };
  } catch (error) {
    console.error('记录过滤日志失败:', error);
    return null;
  }
}

// 更新内容状态
async function updateContentStatus(contentType, contentId, status) {
  try {
    let contentTable;
    
    switch (contentType) {
      case 'prompt':
        contentTable = 'prompt_cards';
        break;
      case 'comment':
        contentTable = 'comments';
        break;
      case 'collaborative':
        contentTable = 'collaborative_prompts';
        break;
      default:
        return false;
    }
    
    await pool.query(
      `UPDATE ${contentTable} SET status = ? WHERE id = ?`,
      [status, contentId]
    );
    
    return true;
  } catch (error) {
    console.error('更新内容状态失败:', error);
    return false;
  }
}

// 自动过滤并处理内容
async function autoFilterContent(content, contentType, contentId) {
  // 使用过滤器检查内容
  const filterResult = await filterContent(content, contentType);
  
  // 如果内容没有通过过滤器
  if (!filterResult.passed) {
    // 记录过滤日志
    const logResult = await logFilterAction(
      contentType,
      contentId,
      filterResult.rule,
      filterResult.match
    );
    
    if (logResult) {
      // 更新内容状态
      let newStatus;
      
      switch (filterResult.rule.action) {
        case 'flag':
          newStatus = 'flagged';
          break;
        case 'reject':
          newStatus = 'rejected';
          break;
        case 'require_review':
          newStatus = 'pending';
          break;
        default:
          newStatus = 'pending';
      }
      
      await updateContentStatus(contentType, contentId, newStatus);
      
      return {
        passed: false,
        rule: filterResult.rule,
        action: filterResult.rule.action,
        match: filterResult.match,
        prevStatus: logResult.previousStatus,
        newStatus: logResult.newStatus
      };
    }
  }
  
  return { passed: true };
}

// 通知管理员关于被过滤的内容
async function notifyModeratorsAboutFilteredContent(contentType, contentId, result) {
  try {
    // 获取管理员用户列表
    const [moderators] = await pool.query(
      'SELECT id FROM users WHERE role IN ("moderator", "admin", "super_admin")'
    );
    
    // 如果没有管理员，则退出
    if (moderators.length === 0) {
      return;
    }
    
    // 准备通知消息
    let contentTypeName;
    switch (contentType) {
      case 'prompt':
        contentTypeName = '提示词';
        break;
      case 'comment':
        contentTypeName = '评论';
        break;
      case 'collaborative':
        contentTypeName = '协作提示词';
        break;
      default:
        contentTypeName = '内容';
    }
    
    const message = `系统检测到一条${contentTypeName}违反了规则 "${result.rule.name}"${result.match.keyword ? `，包含关键词: ${result.match.keyword}` : ''}，已被${result.newStatus === 'flagged' ? '标记' : result.newStatus === 'rejected' ? '拒绝' : '置为待审核'}`;
    
    // 导入通知控制器
    const { createNotification } = require('../controllers/notification.controller');
    
    // 向每个管理员发送通知
    for (const moderator of moderators) {
      await createNotification(
        moderator.id,
        null,
        'system',
        contentId,
        message
      );
    }
  } catch (error) {
    console.error('通知管理员失败:', error);
  }
}

// 使用中间件实现自动内容过滤
function createContentFilterMiddleware(contentField) {
  return async function(req, res, next) {
    // 跳过删除请求
    if (req.method === 'DELETE') {
      return next();
    }
    
    try {
      // 获取请求中的内容
      const content = req.body[contentField];
      
      // 如果没有内容，或者用户是管理员/超管，则跳过过滤
      if (!content || ['moderator', 'admin', 'super_admin'].includes(req.user?.role)) {
        return next();
      }
      
      // 在创建内容之前，预先检查内容
      // 这里只进行检查，但不执行操作，因为还没有内容ID
      const filterResult = await filterContent(content);
      
      // 如果内容被拒绝，则阻止请求
      if (!filterResult.passed && filterResult.rule.action === 'reject') {
        return res.status(403).json({
          message: '内容已被系统过滤，因为它可能违反了社区规则',
          reason: filterResult.rule.name
        });
      }
      
      // 设置过滤结果到请求对象，以便后续中间件使用
      req.contentFilterResult = filterResult;
      
      // 继续处理请求
      next();
    } catch (error) {
      console.error('内容过滤中间件错误:', error);
      next();
    }
  };
}

module.exports = {
  filterContent,
  autoFilterContent,
  notifyModeratorsAboutFilteredContent,
  createContentFilterMiddleware
};
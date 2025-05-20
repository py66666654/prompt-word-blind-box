// 分析数据更新脚本
const { pool } = require('../config/database');

// 更新内容热度指标
async function updateContentPopularityMetrics() {
  try {
    console.log('开始更新内容热度指标...');
    
    // 获取昨天的日期
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    
    // 调用存储过程
    await pool.query('CALL update_content_popularity_metrics(?)', [dateStr]);
    
    console.log(`内容热度指标已更新，日期: ${dateStr}`);
    
    return true;
  } catch (error) {
    console.error('更新内容热度指标失败:', error);
    return false;
  }
}

// 更新用户参与度指标
async function updateUserEngagementMetrics() {
  try {
    console.log('开始更新用户参与度指标...');
    
    // 调用存储过程
    await pool.query('CALL update_user_engagement_metrics()');
    
    console.log('用户参与度指标已更新');
    
    return true;
  } catch (error) {
    console.error('更新用户参与度指标失败:', error);
    return false;
  }
}

// 计算用户保留指标
async function calculateUserRetentionMetrics() {
  try {
    console.log('开始计算用户保留指标...');
    
    // 获取日期范围（过去90天）
    const dates = [];
    for (let i = 1; i <= 90; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }
    
    // 为每个日期计算保留指标
    for (const date of dates) {
      await pool.query('CALL calculate_user_retention_metrics(?)', [date]);
    }
    
    console.log('用户保留指标已计算');
    
    return true;
  } catch (error) {
    console.error('计算用户保留指标失败:', error);
    return false;
  }
}

// 更新用户分段
async function updateUserSegments() {
  try {
    console.log('开始更新用户分段...');
    
    // 获取所有动态分段
    const [segments] = await pool.query(`
      SELECT id, segment_criteria 
      FROM user_segments 
      WHERE is_dynamic = TRUE
    `);
    
    // 为每个分段更新用户
    for (const segment of segments) {
      // 清除现有映射
      await pool.query(
        'DELETE FROM user_segment_mappings WHERE segment_id = ?',
        [segment.id]
      );
      
      let criteria;
      try {
        criteria = JSON.parse(segment.segment_criteria);
      } catch (e) {
        console.warn(`分段 ${segment.id} 的条件无效: ${segment.segment_criteria}`);
        continue;
      }
      
      // 根据条件构建查询
      let whereClause = '';
      const queryParams = [segment.id];
      
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
      
      const [result] = await pool.query(query, queryParams);
      console.log(`分段 ${segment.id} 已更新, 添加了 ${result.affectedRows} 个用户`);
    }
    
    console.log('用户分段已更新');
    
    return true;
  } catch (error) {
    console.error('更新用户分段失败:', error);
    return false;
  }
}

// 运行计划报告
async function runScheduledReports() {
  try {
    console.log('开始运行计划报告...');
    
    // 获取今天的星期几和日期
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0-6, 0代表星期日
    const dayOfMonth = now.getDate(); // 1-31
    
    // 获取需要运行的报告
    const [reports] = await pool.query(`
      SELECT id, name, schedule
      FROM custom_reports
      WHERE schedule IS NOT NULL
    `);
    
    // 检查每个报告是否需要运行
    for (const report of reports) {
      let shouldRun = false;
      
      switch (report.schedule) {
        case 'daily':
          shouldRun = true;
          break;
        case 'weekly':
          shouldRun = (dayOfWeek === 1); // 每周一
          break;
        case 'monthly':
          shouldRun = (dayOfMonth === 1); // 每月1号
          break;
        case 'weekday':
          shouldRun = (dayOfWeek >= 1 && dayOfWeek <= 5); // 周一至周五
          break;
      }
      
      if (shouldRun) {
        console.log(`运行报告: ${report.name} (ID: ${report.id})`);
        
        // 记录报告生成开始
        const [result] = await pool.query(`
          INSERT INTO report_generation_history (
            report_id, status, started_at
          ) VALUES (?, 'processing', NOW())
        `, [report.id]);
        
        const generationId = result.insertId;
        
        try {
          // 获取报告配置
          const [reportConfig] = await pool.query(`
            SELECT report_type, query_params
            FROM custom_reports
            WHERE id = ?
          `, [report.id]);
          
          if (reportConfig.length === 0) {
            throw new Error('报告配置不存在');
          }
          
          let reportData;
          const config = reportConfig[0];
          const params = JSON.parse(config.query_params);
          
          // 根据报告类型执行不同查询
          switch (config.report_type) {
            case 'user':
              // 实现用户报告逻辑...
              break;
            case 'content':
              // 实现内容报告逻辑...
              break;
            case 'activity':
              // 实现活动报告逻辑...
              break;
            case 'moderation':
              // 实现审核报告逻辑...
              break;
            case 'platform':
              // 实现平台报告逻辑...
              break;
            default:
              throw new Error(`不支持的报告类型: ${config.report_type}`);
          }
          
          // 更新报告生成状态为成功
          await pool.query(`
            UPDATE report_generation_history
            SET 
              status = 'completed',
              result_data = ?,
              completed_at = NOW()
            WHERE id = ?
          `, [JSON.stringify(reportData || {}), generationId]);
        } catch (e) {
          console.error(`运行报告 ${report.id} 失败:`, e);
          
          // 更新报告生成状态为失败
          await pool.query(`
            UPDATE report_generation_history
            SET 
              status = 'failed',
              error_message = ?,
              completed_at = NOW()
            WHERE id = ?
          `, [e.message, generationId]);
        }
      }
    }
    
    console.log('计划报告运行完成');
    
    return true;
  } catch (error) {
    console.error('运行计划报告失败:', error);
    return false;
  }
}

// 主函数
async function main() {
  try {
    console.log('开始运行分析数据更新任务...');
    
    // 更新内容热度指标
    await updateContentPopularityMetrics();
    
    // 更新用户参与度指标
    await updateUserEngagementMetrics();
    
    // 计算用户保留指标
    await calculateUserRetentionMetrics();
    
    // 更新用户分段
    await updateUserSegments();
    
    // 运行计划报告
    await runScheduledReports();
    
    console.log('分析数据更新任务完成');
    
    // 关闭数据库连接池
    await pool.end();
    
    process.exit(0);
  } catch (error) {
    console.error('分析数据更新任务失败:', error);
    
    // 关闭数据库连接池
    await pool.end();
    
    process.exit(1);
  }
}

// 执行主函数
main();
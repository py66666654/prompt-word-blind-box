-- 用户报告和分析系统数据库扩展

USE prompt_blind_box_db;

-- 用户活动分析表
CREATE TABLE IF NOT EXISTS user_activity_analytics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    date DATE NOT NULL,
    login_count INT DEFAULT 0,
    prompt_views INT DEFAULT 0,
    prompt_draws INT DEFAULT 0,
    comments_created INT DEFAULT 0,
    ratings_given INT DEFAULT 0,
    collections_made INT DEFAULT 0,
    reports_submitted INT DEFAULT 0,
    collaborations_joined INT DEFAULT 0,
    challenges_participated INT DEFAULT 0,
    social_interactions INT DEFAULT 0, -- 评论、评分、分享等社交互动总和
    time_spent_seconds INT DEFAULT 0, -- 估计用户在平台上花费的时间
    retention_days INT DEFAULT 0, -- 连续活跃天数
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (user_id, date)
);

-- 用户行为事件表
CREATE TABLE IF NOT EXISTS user_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- login, view_prompt, draw_prompt, rate, comment, share, etc.
    event_data JSON, -- 事件相关的详细数据
    device_info VARCHAR(255), -- 设备信息
    ip_address VARCHAR(45), -- IP地址
    user_agent TEXT, -- 用户代理
    referrer VARCHAR(255), -- 来源页面
    session_id VARCHAR(100), -- 会话ID
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 平台统计汇总表
CREATE TABLE IF NOT EXISTS platform_stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    active_users INT DEFAULT 0, -- 当日活跃用户数
    new_users INT DEFAULT 0, -- 新注册用户数
    total_sessions INT DEFAULT 0, -- 总会话数
    avg_session_duration_seconds INT DEFAULT 0, -- 平均会话时长
    prompt_draws INT DEFAULT 0, -- 抽取提示词次数
    comments_created INT DEFAULT 0, -- 创建的评论数
    ratings_given INT DEFAULT 0, -- 给出的评分数
    collections_made INT DEFAULT 0, -- 收藏次数
    reports_submitted INT DEFAULT 0, -- 提交的举报数
    collaborations_created INT DEFAULT 0, -- 创建的协作
    challenges_completed INT DEFAULT 0, -- 完成的挑战
    UNIQUE (date)
);

-- 用户分段表
CREATE TABLE IF NOT EXISTS user_segments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL, -- 分段名称
    description TEXT,
    segment_criteria JSON, -- 分段条件
    is_dynamic BOOLEAN DEFAULT TRUE, -- 是否动态更新
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE (name)
);

-- 用户分段映射表
CREATE TABLE IF NOT EXISTS user_segment_mappings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    segment_id INT NOT NULL,
    user_id INT NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (segment_id) REFERENCES user_segments(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (segment_id, user_id)
);

-- 自定义报告表
CREATE TABLE IF NOT EXISTS custom_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    creator_id INT NOT NULL,
    report_type ENUM('user', 'content', 'activity', 'moderation', 'platform') NOT NULL,
    query_params JSON, -- 查询参数
    visualization_settings JSON, -- 可视化设置
    schedule VARCHAR(50), -- 计划执行时间（如daily, weekly, monthly）
    is_public BOOLEAN DEFAULT FALSE, -- 是否公开
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 报告生成历史
CREATE TABLE IF NOT EXISTS report_generation_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_id INT NOT NULL,
    status ENUM('pending', 'processing', 'completed', 'failed') NOT NULL,
    result_data JSON, -- 报告结果数据
    error_message TEXT, -- 错误信息
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (report_id) REFERENCES custom_reports(id) ON DELETE CASCADE
);

-- 内容热度分析表
CREATE TABLE IF NOT EXISTS content_popularity_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    content_type ENUM('prompt', 'collection', 'collaborative', 'challenge') NOT NULL,
    content_id INT NOT NULL,
    date DATE NOT NULL,
    views INT DEFAULT 0,
    draws INT DEFAULT 0, -- 仅用于prompt
    ratings_count INT DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    comments_count INT DEFAULT 0,
    shares_count INT DEFAULT 0,
    collections_count INT DEFAULT 0, -- 仅用于prompt，被收藏的次数
    reports_count INT DEFAULT 0,
    popularity_score DECIMAL(10,4) DEFAULT 0.0000, -- 基于上述指标计算的总体热度分数
    UNIQUE (content_type, content_id, date)
);

-- 用户保留和流失分析表
CREATE TABLE IF NOT EXISTS user_retention_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cohort_date DATE NOT NULL, -- 用户注册/首次访问的日期（队列）
    users_count INT NOT NULL, -- 该队列的用户数
    day_1_retention INT DEFAULT 0, -- 1天后的保留用户数
    day_7_retention INT DEFAULT 0, -- 7天后的保留用户数
    day_30_retention INT DEFAULT 0, -- 30天后的保留用户数
    day_90_retention INT DEFAULT 0, -- 90天后的保留用户数
    UNIQUE (cohort_date)
);

-- 用户参与度指标表
CREATE TABLE IF NOT EXISTS user_engagement_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    engagement_score DECIMAL(10,4) DEFAULT 0.0000, -- 总体参与度分数
    activity_frequency DECIMAL(10,4) DEFAULT 0.0000, -- 活动频率
    content_creation_score DECIMAL(10,4) DEFAULT 0.0000, -- 内容创建分数
    social_interaction_score DECIMAL(10,4) DEFAULT 0.0000, -- 社交互动分数
    platform_usage_score DECIMAL(10,4) DEFAULT 0.0000, -- 平台使用分数
    retention_score DECIMAL(10,4) DEFAULT 0.0000, -- 保留度分数
    last_calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (user_id)
);

-- 用户行为预测表
CREATE TABLE IF NOT EXISTS user_behavior_predictions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    churn_probability DECIMAL(5,4) DEFAULT 0.0000, -- 流失概率
    upgrade_probability DECIMAL(5,4) DEFAULT 0.0000, -- 升级至高级账户概率
    next_login_prediction DATETIME, -- 预计下次登录时间
    activity_prediction JSON, -- 预测的活动
    prediction_date DATE NOT NULL, -- 预测的日期
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (user_id, prediction_date)
);

-- A/B测试表
CREATE TABLE IF NOT EXISTS ab_tests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    start_date DATETIME NOT NULL,
    end_date DATETIME,
    status ENUM('draft', 'active', 'completed', 'cancelled') DEFAULT 'draft',
    variants JSON NOT NULL, -- 测试变体
    metrics JSON NOT NULL, -- 要测量的指标
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (name)
);

-- A/B测试用户分配表
CREATE TABLE IF NOT EXISTS ab_test_user_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    test_id INT NOT NULL,
    user_id INT NOT NULL,
    variant VARCHAR(100) NOT NULL, -- 分配的变体
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (test_id) REFERENCES ab_tests(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (test_id, user_id)
);

-- A/B测试结果表
CREATE TABLE IF NOT EXISTS ab_test_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    test_id INT NOT NULL,
    variant VARCHAR(100) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    confidence_level DECIMAL(5,4),
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (test_id) REFERENCES ab_tests(id) ON DELETE CASCADE
);

-- 创建活动事件触发器
DELIMITER //
CREATE TRIGGER IF NOT EXISTS after_activity_insert
AFTER INSERT ON user_activities
FOR EACH ROW
BEGIN
    -- 更新用户活动分析
    INSERT INTO user_activity_analytics (user_id, date, 
        prompt_draws, comments_created, ratings_given, collections_made, social_interactions)
    VALUES (
        NEW.user_id, 
        DATE(NEW.created_at),
        IF(NEW.activity_type = 'draw', 1, 0),
        IF(NEW.activity_type = 'comment', 1, 0),
        IF(NEW.activity_type = 'rate', 1, 0),
        IF(NEW.activity_type = 'collect', 1, 0),
        IF(NEW.activity_type IN ('comment', 'rate', 'share', 'follow'), 1, 0)
    )
    ON DUPLICATE KEY UPDATE
        prompt_draws = prompt_draws + IF(NEW.activity_type = 'draw', 1, 0),
        comments_created = comments_created + IF(NEW.activity_type = 'comment', 1, 0),
        ratings_given = ratings_given + IF(NEW.activity_type = 'rate', 1, 0),
        collections_made = collections_made + IF(NEW.activity_type = 'collect', 1, 0),
        social_interactions = social_interactions + IF(NEW.activity_type IN ('comment', 'rate', 'share', 'follow'), 1, 0);
        
    -- 更新平台统计
    INSERT INTO platform_stats (date, 
        prompt_draws, comments_created, ratings_given, collections_made)
    VALUES (
        DATE(NEW.created_at),
        IF(NEW.activity_type = 'draw', 1, 0),
        IF(NEW.activity_type = 'comment', 1, 0),
        IF(NEW.activity_type = 'rate', 1, 0),
        IF(NEW.activity_type = 'collect', 1, 0)
    )
    ON DUPLICATE KEY UPDATE
        prompt_draws = prompt_draws + IF(NEW.activity_type = 'draw', 1, 0),
        comments_created = comments_created + IF(NEW.activity_type = 'comment', 1, 0),
        ratings_given = ratings_given + IF(NEW.activity_type = 'rate', 1, 0),
        collections_made = collections_made + IF(NEW.activity_type = 'collect', 1, 0);
END//
DELIMITER ;

-- 创建存储过程：更新内容热度指标
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS update_content_popularity_metrics(p_date DATE)
BEGIN
    -- 更新提示词热度指标
    INSERT INTO content_popularity_metrics (
        content_type, content_id, date, views, draws, ratings_count, 
        average_rating, comments_count, shares_count, collections_count, 
        reports_count, popularity_score
    )
    WITH prompt_metrics AS (
        SELECT
            pc.id,
            COALESCE(views.count, 0) AS views_count,
            COALESCE(draws.count, 0) AS draws_count,
            COALESCE(ratings.count, 0) AS ratings_count,
            COALESCE(ratings.avg_rating, 0) AS avg_rating,
            COALESCE(comments.count, 0) AS comments_count,
            COALESCE(shares.count, 0) AS shares_count,
            COALESCE(collections.count, 0) AS collections_count,
            COALESCE(reports.count, 0) AS reports_count
        FROM prompt_cards pc
        LEFT JOIN (
            SELECT prompt_card_id, COUNT(*) AS count
            FROM user_events
            WHERE event_type = 'view_prompt'
            AND DATE(created_at) = p_date
            GROUP BY prompt_card_id
        ) views ON pc.id = views.prompt_card_id
        LEFT JOIN (
            SELECT prompt_card_id, COUNT(*) AS count
            FROM draw_history
            WHERE DATE(drawn_at) = p_date
            GROUP BY prompt_card_id
        ) draws ON pc.id = draws.prompt_card_id
        LEFT JOIN (
            SELECT prompt_card_id, COUNT(*) AS count, AVG(rating) AS avg_rating
            FROM ratings
            WHERE DATE(created_at) = p_date
            GROUP BY prompt_card_id
        ) ratings ON pc.id = ratings.prompt_card_id
        LEFT JOIN (
            SELECT prompt_card_id, COUNT(*) AS count
            FROM comments
            WHERE DATE(created_at) = p_date
            GROUP BY prompt_card_id
        ) comments ON pc.id = comments.prompt_card_id
        LEFT JOIN (
            SELECT prompt_card_id, COUNT(*) AS count
            FROM shares
            WHERE DATE(created_at) = p_date
            GROUP BY prompt_card_id
        ) shares ON pc.id = shares.prompt_card_id
        LEFT JOIN (
            SELECT prompt_card_id, COUNT(*) AS count
            FROM user_collections
            WHERE DATE(collected_at) = p_date
            GROUP BY prompt_card_id
        ) collections ON pc.id = collections.prompt_card_id
        LEFT JOIN (
            SELECT content_id, COUNT(*) AS count
            FROM content_reports
            WHERE content_type = 'prompt' AND DATE(created_at) = p_date
            GROUP BY content_id
        ) reports ON pc.id = reports.content_id
    )
    SELECT
        'prompt' AS content_type,
        id AS content_id,
        p_date AS date,
        views_count,
        draws_count,
        ratings_count,
        avg_rating,
        comments_count,
        shares_count,
        collections_count,
        reports_count,
        -- 计算热度分数：权重可以根据业务需求调整
        (views_count * 0.1) + 
        (draws_count * 0.3) + 
        (ratings_count * 0.1) + 
        (avg_rating * 10) + 
        (comments_count * 0.5) + 
        (shares_count * 0.7) + 
        (collections_count * 0.8) -
        (reports_count * 2) AS popularity_score
    FROM prompt_metrics
    WHERE 
        views_count > 0 OR draws_count > 0 OR ratings_count > 0 OR 
        comments_count > 0 OR shares_count > 0 OR collections_count > 0
    ON DUPLICATE KEY UPDATE
        views = VALUES(views),
        draws = VALUES(draws),
        ratings_count = VALUES(ratings_count),
        average_rating = VALUES(average_rating),
        comments_count = VALUES(comments_count),
        shares_count = VALUES(shares_count),
        collections_count = VALUES(collections_count),
        reports_count = VALUES(reports_count),
        popularity_score = VALUES(popularity_score);
        
    -- 其他内容类型（collections, collaborative, challenge）的更新逻辑类似
    -- 此处省略...
END//
DELIMITER ;

-- 创建存储过程：更新用户参与度指标
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS update_user_engagement_metrics()
BEGIN
    REPLACE INTO user_engagement_metrics (
        user_id, 
        engagement_score, 
        activity_frequency, 
        content_creation_score, 
        social_interaction_score, 
        platform_usage_score, 
        retention_score,
        last_calculated_at
    )
    SELECT
        u.id,
        -- 总体参与度分数（各项分数的加权平均值）
        (activity_freq * 0.2 + content_score * 0.3 + social_score * 0.25 + usage_score * 0.15 + retention * 0.1) AS engagement_score,
        activity_freq,
        content_score,
        social_score,
        usage_score,
        retention,
        NOW()
    FROM users u
    LEFT JOIN (
        -- 活动频率分数
        SELECT
            user_id,
            COUNT(*) / DATEDIFF(CURRENT_DATE, MIN(date)) AS avg_daily_activities,
            LEAST(COUNT(*) / DATEDIFF(CURRENT_DATE, MIN(date)) * 5, 10) AS activity_freq
        FROM user_activity_analytics
        WHERE date >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)
        GROUP BY user_id
    ) activity ON u.id = activity.user_id
    LEFT JOIN (
        -- 内容创建分数
        SELECT
            user_id,
            SUM(comments_created * 2 + collaborations_joined * 5) AS content_score
        FROM user_activity_analytics
        WHERE date >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)
        GROUP BY user_id
    ) content ON u.id = content.user_id
    LEFT JOIN (
        -- 社交互动分数
        SELECT
            user_id,
            SUM(ratings_given + social_interactions * 2) AS social_score
        FROM user_activity_analytics
        WHERE date >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)
        GROUP BY user_id
    ) social ON u.id = social.user_id
    LEFT JOIN (
        -- 平台使用分数
        SELECT
            user_id,
            SUM(login_count + prompt_views + prompt_draws * 3) AS usage_score
        FROM user_activity_analytics
        WHERE date >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)
        GROUP BY user_id
    ) usage ON u.id = usage.user_id
    LEFT JOIN (
        -- 保留度分数
        SELECT
            user_id,
            MAX(retention_days) AS retention
        FROM user_activity_analytics
        WHERE date >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)
        GROUP BY user_id
    ) ret ON u.id = ret.user_id
    WHERE u.created_at <= DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY); -- 排除新用户
END//
DELIMITER ;

-- 创建存储过程：计算用户保留指标
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS calculate_user_retention_metrics(p_date DATE)
BEGIN
    -- 获取特定队列（注册日期）的用户数量
    SET @cohort_users = (
        SELECT COUNT(*) 
        FROM users 
        WHERE DATE(created_at) = p_date
    );
    
    -- 如果有用户，则计算保留指标
    IF @cohort_users > 0 THEN
        -- 计算1天后的保留
        SET @day1_retention = (
            SELECT COUNT(DISTINCT user_id)
            FROM user_events
            WHERE user_id IN (SELECT id FROM users WHERE DATE(created_at) = p_date)
            AND DATE(created_at) = DATE_ADD(p_date, INTERVAL 1 DAY)
        );
        
        -- 计算7天后的保留
        SET @day7_retention = (
            SELECT COUNT(DISTINCT user_id)
            FROM user_events
            WHERE user_id IN (SELECT id FROM users WHERE DATE(created_at) = p_date)
            AND DATE(created_at) = DATE_ADD(p_date, INTERVAL 7 DAY)
        );
        
        -- 计算30天后的保留
        SET @day30_retention = (
            SELECT COUNT(DISTINCT user_id)
            FROM user_events
            WHERE user_id IN (SELECT id FROM users WHERE DATE(created_at) = p_date)
            AND DATE(created_at) = DATE_ADD(p_date, INTERVAL 30 DAY)
        );
        
        -- 计算90天后的保留
        SET @day90_retention = (
            SELECT COUNT(DISTINCT user_id)
            FROM user_events
            WHERE user_id IN (SELECT id FROM users WHERE DATE(created_at) = p_date)
            AND DATE(created_at) = DATE_ADD(p_date, INTERVAL 90 DAY)
        );
        
        -- 更新或插入保留指标
        INSERT INTO user_retention_metrics (
            cohort_date, users_count, day_1_retention, day_7_retention, 
            day_30_retention, day_90_retention
        )
        VALUES (
            p_date, @cohort_users, @day1_retention, @day7_retention, 
            @day30_retention, @day90_retention
        )
        ON DUPLICATE KEY UPDATE
            users_count = VALUES(users_count),
            day_1_retention = VALUES(day_1_retention),
            day_7_retention = VALUES(day_7_retention),
            day_30_retention = VALUES(day_30_retention),
            day_90_retention = VALUES(day_90_retention);
    END IF;
END//
DELIMITER ;

-- 创建事件：每日更新内容热度指标
CREATE EVENT IF NOT EXISTS daily_update_content_popularity
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP + INTERVAL 1 HOUR
DO
    CALL update_content_popularity_metrics(DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY));

-- 创建事件：每周更新用户参与度指标
CREATE EVENT IF NOT EXISTS weekly_update_user_engagement
ON SCHEDULE EVERY 1 WEEK
STARTS CURRENT_TIMESTAMP + INTERVAL 1 DAY
DO
    CALL update_user_engagement_metrics();

-- 创建基础用户分段
INSERT IGNORE INTO user_segments (name, description, segment_criteria, is_dynamic)
VALUES
('新用户', '注册不超过30天的用户', 
JSON_OBJECT('registration_max_days', 30), TRUE),

('活跃用户', '30天内有超过5次登录的用户', 
JSON_OBJECT('login_min_count', 5, 'timeframe_days', 30), TRUE),

('高级用户', '已升级为高级账户的用户',
JSON_OBJECT('premium', TRUE), TRUE),

('内容创作者', '创建了评论或协作提示词的用户',
JSON_OBJECT('min_comments', 1, 'OR', JSON_OBJECT('min_collaborations', 1)), TRUE),

('高参与度用户', '参与度评分在前20%的用户',
JSON_OBJECT('engagement_percentile', 80), TRUE),

('流失风险用户', '最近30天仅登录1次且之前活跃的用户',
JSON_OBJECT('recent_logins_max', 1, 'timeframe_days', 30, 'previous_active', TRUE), TRUE);

-- 创建默认自定义报告
INSERT IGNORE INTO custom_reports (name, description, creator_id, report_type, query_params, visualization_settings, is_public)
VALUES
(
    '平台活跃度报告', 
    '显示过去30天的日活用户、会话时长和关键活动指标',
    1, -- 假设ID为1的用户是系统管理员
    'platform',
    JSON_OBJECT(
        'timeframe_days', 30,
        'metrics', JSON_ARRAY('active_users', 'avg_session_duration', 'prompt_draws', 'social_interactions'),
        'group_by', 'date'
    ),
    JSON_OBJECT(
        'chart_type', 'line',
        'x_axis', 'date',
        'y_axis', 'value',
        'series', 'metric'
    ),
    TRUE
),
(
    '用户增长与保留报告',
    '展示用户增长趋势和各时期的保留率',
    1,
    'user',
    JSON_OBJECT(
        'timeframe_days', 90,
        'metrics', JSON_ARRAY('new_users', 'retention_day_1', 'retention_day_7', 'retention_day_30'),
        'group_by', 'cohort_date'
    ),
    JSON_OBJECT(
        'chart_type', 'combo',
        'x_axis', 'cohort_date',
        'y_axis', JSON_ARRAY('value', 'percentage'),
        'series', 'metric'
    ),
    TRUE
),
(
    '内容绩效报告',
    '分析最受欢迎内容的特征和表现',
    1,
    'content',
    JSON_OBJECT(
        'timeframe_days', 30,
        'content_type', 'prompt',
        'top_n', 20,
        'sort_by', 'popularity_score',
        'metrics', JSON_ARRAY('views', 'draws', 'average_rating', 'collections_count')
    ),
    JSON_OBJECT(
        'chart_type', 'bar',
        'x_axis', 'content_id',
        'y_axis', 'value',
        'series', 'metric'
    ),
    TRUE
),
(
    '审核活动报告',
    '跟踪内容审核活动和社区健康指标',
    1,
    'moderation',
    JSON_OBJECT(
        'timeframe_days', 30,
        'metrics', JSON_ARRAY('reports_submitted', 'content_approved', 'content_rejected', 'average_resolution_time'),
        'group_by', 'date'
    ),
    JSON_OBJECT(
        'chart_type', 'line',
        'x_axis', 'date',
        'y_axis', 'value',
        'series', 'metric'
    ),
    TRUE
);
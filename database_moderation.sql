-- 内容审核和社区管理数据库扩展

USE prompt_blind_box_db;

-- 内容状态表 - 定义内容可能的状态
CREATE TABLE IF NOT EXISTS content_status (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 举报类型表 - 定义可能的举报原因
CREATE TABLE IF NOT EXISTS report_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    severity INT NOT NULL DEFAULT 1, -- 严重程度，1-5
    auto_flag BOOLEAN DEFAULT FALSE, -- 是否自动标记内容
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 内容举报表 - 用户举报的内容
CREATE TABLE IF NOT EXISTS content_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reporter_id INT NOT NULL, -- 举报者
    report_type_id INT NOT NULL, -- 举报类型
    content_type ENUM('prompt', 'comment', 'user', 'collaborative') NOT NULL, -- 内容类型
    content_id INT NOT NULL, -- 被举报的内容ID
    description TEXT, -- 举报描述
    status ENUM('pending', 'under_review', 'resolved', 'rejected') DEFAULT 'pending', -- 举报状态
    resolution_notes TEXT, -- 处理说明
    resolved_by INT, -- 处理人ID
    resolved_at TIMESTAMP NULL, -- 处理时间
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (report_type_id) REFERENCES report_types(id),
    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 内容审核日志 - 记录审核活动
CREATE TABLE IF NOT EXISTS moderation_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    moderator_id INT, -- 审核员ID，NULL表示系统自动操作
    content_type ENUM('prompt', 'comment', 'user', 'collaborative', 'report') NOT NULL, -- 内容类型
    content_id INT NOT NULL, -- 内容ID
    action ENUM('flag', 'approve', 'reject', 'ban', 'warn', 'edit', 'delete') NOT NULL, -- 执行的操作
    previous_status VARCHAR(50), -- 之前的状态
    new_status VARCHAR(50), -- 更新后的状态
    notes TEXT, -- 审核说明
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (moderator_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 自动内容过滤规则表
CREATE TABLE IF NOT EXISTS content_filter_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    filter_type ENUM('keyword', 'regex', 'ai_model') NOT NULL, -- 过滤类型
    pattern TEXT NOT NULL, -- 过滤模式（关键词、正则表达式或AI模型配置）
    action ENUM('flag', 'reject', 'require_review') NOT NULL, -- 匹配时执行的操作
    severity INT NOT NULL DEFAULT 1, -- 严重程度，1-5
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 更新提示词卡片表，添加审核状态
ALTER TABLE prompt_cards
ADD COLUMN status ENUM('pending', 'approved', 'rejected', 'flagged') DEFAULT 'pending' AFTER metadata,
ADD COLUMN admin_notes TEXT AFTER status;

-- 更新评论表，添加审核状态
ALTER TABLE comments
ADD COLUMN status ENUM('pending', 'approved', 'rejected', 'flagged') DEFAULT 'approved' AFTER updated_at,
ADD COLUMN admin_notes TEXT AFTER status;

-- 用户处罚记录表
CREATE TABLE IF NOT EXISTS user_penalties (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    penalty_type ENUM('warning', 'temp_ban', 'perm_ban', 'content_restriction') NOT NULL,
    reason TEXT NOT NULL,
    issued_by INT, -- 实施处罚的管理员
    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP NULL, -- NULL表示永久处罚
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (issued_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 更新用户表，添加角色和状态
ALTER TABLE users
ADD COLUMN role ENUM('user', 'moderator', 'admin', 'super_admin') DEFAULT 'user' AFTER premium,
ADD COLUMN status ENUM('active', 'warned', 'restricted', 'banned') DEFAULT 'active' AFTER role;

-- 社区指南表
CREATE TABLE IF NOT EXISTS community_guidelines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 插入内容状态数据
INSERT INTO content_status (name, description) VALUES
('pending', '内容等待审核'),
('approved', '内容已批准显示'),
('rejected', '内容被拒绝'),
('flagged', '内容被标记需要审核');

-- 插入举报类型数据
INSERT INTO report_types (name, description, severity, auto_flag) VALUES
('inappropriate_content', '不适当或冒犯性内容', 3, TRUE),
('hate_speech', '仇恨言论或歧视内容', 5, TRUE),
('spam', '垃圾信息或广告', 2, TRUE),
('misinformation', '虚假或误导性信息', 3, FALSE),
('copyright_violation', '侵犯版权内容', 4, FALSE),
('personal_information', '泄露个人信息', 5, TRUE),
('harassment', '骚扰或攻击性内容', 4, TRUE),
('violence', '暴力或血腥内容', 4, TRUE),
('illegal_activity', '宣传非法活动', 5, TRUE),
('other', '其他问题', 1, FALSE);

-- 插入内容过滤规则示例
INSERT INTO content_filter_rules (name, description, filter_type, pattern, action, severity) VALUES
('敏感词过滤', '过滤常见敏感词', 'keyword', '色情,赌博,毒品,诈骗', 'flag', 3),
('垃圾广告过滤', '过滤广告链接模式', 'regex', '(http|https)://[^\s/$.?#].[^\s]*\\s*(联系|咨询|推广|促销)', 'reject', 2),
('个人信息过滤', '过滤手机号和身份证格式', 'regex', '(1[3-9]\\d{9})|(\\d{17}[0-9Xx])', 'require_review', 4);

-- 插入社区指南
INSERT INTO community_guidelines (title, content, category, is_active) VALUES
('尊重他人', '请尊重所有社区成员。不允许人身攻击、骚扰或歧视性言论。', '行为准则', TRUE),
('内容质量', '分享有价值的提示词和评论。避免重复内容和垃圾信息。', '内容标准', TRUE),
('版权与原创', '请只分享您有权分享的内容。尊重知识产权和著作权。', '法律合规', TRUE),
('隐私保护', '不要分享他人的个人信息。保护自己和他人的隐私。', '隐私安全', TRUE),
('适当内容', '所有内容应适合所有年龄段。不允许成人内容、暴力或其他不适当内容。', '内容标准', TRUE);
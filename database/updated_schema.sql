-- 提示词盲盒数据库完整架构
-- 基于需求文档重新设计的数据库架构

-- 创建数据库
CREATE DATABASE IF NOT EXISTS prompt_blind_box_db;
USE prompt_blind_box_db;

-- 提示词类型表
CREATE TABLE IF NOT EXISTS prompt_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 提示词稀有度等级表
CREATE TABLE IF NOT EXISTS rarity_levels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    min_score INT NOT NULL, -- 该等级的最低分数
    max_score INT NOT NULL, -- 该等级的最高分数
    probability DECIMAL(10,8) NOT NULL, -- 抽中该等级的概率
    color_code VARCHAR(20) NOT NULL, -- 用于前端显示
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 提示词分类表
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 提示词卡片表
CREATE TABLE IF NOT EXISTS prompt_cards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    prompt_text TEXT NOT NULL,
    preview_url VARCHAR(255),
    category_id INT,
    type_id INT, -- 提示词类型：图像生成、文字对话、视频生成、音频生成、agent、角色卡、世界卡、剧情卡等
    quality_score INT DEFAULT 50, -- 0-100分，用于权重计算
    rarity_level_id INT, -- 稀有度等级关联
    source VARCHAR(255), -- 提示词来源
    is_ai_generated BOOLEAN DEFAULT FALSE, -- 是否由AI生成
    submitted_by_user_id INT, -- 提交用户ID
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved', -- 审核状态
    admin_notes TEXT, -- 管理员备注
    metadata JSON, -- 额外元数据
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (type_id) REFERENCES prompt_types(id),
    FOREIGN KEY (rarity_level_id) REFERENCES rarity_levels(id)
);

-- 角色卡扩展表
CREATE TABLE IF NOT EXISTS character_cards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    prompt_id INT NOT NULL,
    character_name VARCHAR(100) NOT NULL,
    character_type ENUM('protagonist', 'antagonist', 'supporting', 'npc') NOT NULL,
    physical_traits TEXT NOT NULL, -- 外貌特征
    personality TEXT NOT NULL, -- 性格特征
    background TEXT NOT NULL, -- 背景故事
    abilities TEXT, -- 能力特长
    relationships TEXT, -- 关系网络
    motives TEXT NOT NULL, -- 核心动机
    dialogue_style TEXT, -- 对话风格
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (prompt_id) REFERENCES prompt_cards(id) ON DELETE CASCADE
);

-- 世界卡扩展表
CREATE TABLE IF NOT EXISTS world_cards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    prompt_id INT NOT NULL,
    world_name VARCHAR(100) NOT NULL,
    world_type ENUM('fantasy', 'scifi', 'historical', 'modern', 'cyberpunk', 'steampunk', 'postapocalyptic', 'mythology', 'other') NOT NULL,
    time_period TEXT NOT NULL, -- 时空背景
    geography TEXT NOT NULL, -- 地理环境
    culture TEXT NOT NULL, -- 文化特色
    technology TEXT, -- 科技水平
    systems TEXT NOT NULL, -- 社会和法则体系
    history TEXT, -- 历史脉络
    key_locations TEXT, -- 关键场景
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (prompt_id) REFERENCES prompt_cards(id) ON DELETE CASCADE
);

-- 剧情卡扩展表
CREATE TABLE IF NOT EXISTS plot_cards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    prompt_id INT NOT NULL,
    plot_title VARCHAR(100) NOT NULL,
    plot_stage ENUM('beginning', 'conflict', 'climax', 'resolution') NOT NULL, -- 故事阶段
    conflict_type VARCHAR(50) NOT NULL, -- 冲突类型
    emotional_arc TEXT NOT NULL, -- 情感变化
    plot_points TEXT NOT NULL, -- 情节点
    twists TEXT, -- 转折点
    potential_endings TEXT, -- 可能的结局
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (prompt_id) REFERENCES prompt_cards(id) ON DELETE CASCADE
);

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE,
    avatar_url VARCHAR(255),
    bio TEXT,
    points INT DEFAULT 0, -- 用户积分，可用于获取额外抽取次数
    premium BOOLEAN DEFAULT FALSE, -- 是否为高级用户
    daily_draws_remaining INT DEFAULT 3, -- 每日剩余抽卡次数
    daily_draws_max INT DEFAULT 3, -- 每日最大抽卡次数
    submission_limit INT DEFAULT 5, -- 每日提交上限
    role ENUM('guest', 'user', 'contributor', 'admin') DEFAULT 'user',
    email_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 用户收藏表
CREATE TABLE IF NOT EXISTS user_collections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    prompt_card_id INT NOT NULL,
    collection_group VARCHAR(50) DEFAULT 'default', -- 收藏分组
    notes TEXT, -- 用户备注
    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (prompt_card_id) REFERENCES prompt_cards(id) ON DELETE CASCADE,
    UNIQUE (user_id, prompt_card_id) -- 防止重复收藏
);

-- 抽卡历史记录表
CREATE TABLE IF NOT EXISTS draw_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    prompt_card_id INT NOT NULL,
    draw_method VARCHAR(50) DEFAULT 'standard', -- 抽取方式：standard, special_pool, etc.
    drawn_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (prompt_card_id) REFERENCES prompt_cards(id) ON DELETE CASCADE
);

-- 卡池表
CREATE TABLE IF NOT EXISTS card_pools (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    pool_type ENUM('standard', 'theme', 'new_user', 'contributor', 'time_limited') NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    start_time TIMESTAMP NULL,
    end_time TIMESTAMP NULL,
    rarity_boost JSON, -- 稀有度提升配置
    requirements TEXT, -- 参与要求
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 卡池-提示词关联表
CREATE TABLE IF NOT EXISTS card_pool_prompts (
    pool_id INT NOT NULL,
    prompt_id INT NOT NULL,
    weight DECIMAL(10,4) DEFAULT 1.0, -- 在该卡池中的权重
    PRIMARY KEY (pool_id, prompt_id),
    FOREIGN KEY (pool_id) REFERENCES card_pools(id) ON DELETE CASCADE,
    FOREIGN KEY (prompt_id) REFERENCES prompt_cards(id) ON DELETE CASCADE
);

-- 标签表
CREATE TABLE IF NOT EXISTS tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    category VARCHAR(50), -- 标签分类
    UNIQUE (name)
);

-- 提示词-标签关联表
CREATE TABLE IF NOT EXISTS prompt_tags (
    prompt_id INT NOT NULL,
    tag_id INT NOT NULL,
    PRIMARY KEY (prompt_id, tag_id),
    FOREIGN KEY (prompt_id) REFERENCES prompt_cards(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- 角色卡标签表
CREATE TABLE IF NOT EXISTS character_tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    category VARCHAR(50), -- 标签分类
    UNIQUE (name)
);

-- 角色卡-标签关联表
CREATE TABLE IF NOT EXISTS character_card_tags (
    character_card_id INT NOT NULL,
    tag_id INT NOT NULL,
    PRIMARY KEY (character_card_id, tag_id),
    FOREIGN KEY (character_card_id) REFERENCES character_cards(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES character_tags(id) ON DELETE CASCADE
);

-- 世界卡标签表
CREATE TABLE IF NOT EXISTS world_tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    category VARCHAR(50), -- 标签分类
    UNIQUE (name)
);

-- 世界卡-标签关联表
CREATE TABLE IF NOT EXISTS world_card_tags (
    world_card_id INT NOT NULL,
    tag_id INT NOT NULL,
    PRIMARY KEY (world_card_id, tag_id),
    FOREIGN KEY (world_card_id) REFERENCES world_cards(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES world_tags(id) ON DELETE CASCADE
);

-- 剧情卡标签表
CREATE TABLE IF NOT EXISTS plot_tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    category VARCHAR(50), -- 标签分类
    UNIQUE (name)
);

-- 剧情卡-标签关联表
CREATE TABLE IF NOT EXISTS plot_card_tags (
    plot_card_id INT NOT NULL,
    tag_id INT NOT NULL,
    PRIMARY KEY (plot_card_id, tag_id),
    FOREIGN KEY (plot_card_id) REFERENCES plot_cards(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES plot_tags(id) ON DELETE CASCADE
);

-- 创意卡片组合表
CREATE TABLE IF NOT EXISTS creative_card_combinations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    character_card_id INT,
    world_card_id INT,
    plot_card_id INT,
    content TEXT, -- 组合创作的内容
    notes TEXT,
    public BOOLEAN DEFAULT FALSE, -- 是否公开
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (character_card_id) REFERENCES character_cards(id) ON DELETE SET NULL,
    FOREIGN KEY (world_card_id) REFERENCES world_cards(id) ON DELETE SET NULL,
    FOREIGN KEY (plot_card_id) REFERENCES plot_cards(id) ON DELETE SET NULL
);

-- 评论表
CREATE TABLE IF NOT EXISTS comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    prompt_id INT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (prompt_id) REFERENCES prompt_cards(id) ON DELETE CASCADE
);

-- 点赞表
CREATE TABLE IF NOT EXISTS likes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    prompt_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (prompt_id) REFERENCES prompt_cards(id) ON DELETE CASCADE,
    UNIQUE (user_id, prompt_id)
);

-- 成就表
CREATE TABLE IF NOT EXISTS achievements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    category ENUM('collection', 'creation', 'exploration', 'creative_master', 'community', 'special') NOT NULL,
    requirement TEXT NOT NULL, -- 成就达成条件描述
    badge_image_url VARCHAR(255), -- 徽章图片URL
    required_count INT DEFAULT 1, -- 达成所需数量
    points INT DEFAULT 10, -- 成就点数
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 用户成就表
CREATE TABLE IF NOT EXISTS user_achievements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    achievement_id INT NOT NULL,
    current_progress INT DEFAULT 0, -- 当前进度
    achieved BOOLEAN DEFAULT FALSE, -- 是否已达成
    achieved_at TIMESTAMP NULL, -- 达成时间
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
    UNIQUE (user_id, achievement_id)
);

-- 活动表
CREATE TABLE IF NOT EXISTS activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    activity_type ENUM('collection', 'creation', 'competition', 'community', 'special') NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    rewards TEXT NOT NULL, -- 奖励描述
    rules TEXT NOT NULL, -- 活动规则
    participation_requirement TEXT, -- 参与要求
    image_url VARCHAR(255), -- 活动图片
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 用户活动参与表
CREATE TABLE IF NOT EXISTS user_activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    activity_id INT NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    progress TEXT, -- 活动进度
    completed BOOLEAN DEFAULT FALSE,
    rewards_claimed BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
    UNIQUE (user_id, activity_id)
);

-- 系统通知表
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    notification_type ENUM('system', 'achievement', 'activity', 'comment', 'like', 'admin') NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    related_id INT, -- 相关实体ID
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 用户日志表
CREATE TABLE IF NOT EXISTS user_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    action VARCHAR(50) NOT NULL,
    details TEXT,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 系统配置表
CREATE TABLE IF NOT EXISTS system_configs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(50) NOT NULL,
    config_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE (config_key)
);

-- 邀请码表
CREATE TABLE IF NOT EXISTS invitation_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    created_by_user_id INT,
    used_by_user_id INT,
    expiry_date TIMESTAMP,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP NULL,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (used_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE (code)
);

-- 插入提示词类型数据
INSERT INTO prompt_types (name, description, icon) VALUES
('image', '图像生成提示词', 'image'),
('text', '文字对话提示词', 'text'),
('video', '视频生成提示词', 'video'),
('audio', '音频生成提示词', 'audio'),
('agent', 'AI智能体提示词', 'robot'),
('character', '角色卡提示词', 'user'),
('world', '世界卡提示词', 'globe'),
('plot', '剧情卡提示词', 'book');

-- 插入稀有度等级数据
INSERT INTO rarity_levels (name, description, min_score, max_score, probability, color_code) VALUES
('寻常', '基础提示词，适合入门使用', 0, 39, 0.500000, '#AAAAAA'),
('常见', '标准创意元素', 40, 69, 0.300000, '#5555FF'),
('新奇', '独特风格元素', 70, 84, 0.150000, '#AA55AA'),
('珍贵', '专业级提示词，效果出众', 85, 94, 0.040000, '#FFAA00'),
('稀有', '极为稀有的顶级提示词', 95, 98, 0.009000, '#00DD00'),
('传说', '传说级别提示词，价值连城', 99, 100, 0.001000, '#FF5555');

-- 插入示例分类数据
INSERT INTO categories (name, description, icon) VALUES
('人物', '人物描述相关提示词', 'person'),
('风景', '自然和城市景观相关提示词', 'landscape'),
('艺术风格', '特定艺术风格相关提示词', 'palette'),
('概念艺术', '概念和想法相关提示词', 'idea'),
('科幻', '科幻元素相关提示词', 'rocket'),
('奇幻', '奇幻和魔法元素相关提示词', 'dragon'),
('人工智能', 'AI和技术相关提示词', 'cpu'),
('情感', '情感和氛围相关提示词', 'heart');

-- 插入默认卡池
INSERT INTO card_pools (name, description, pool_type, active) VALUES
('标准卡池', '包含所有已上线提示词的标准卡池', 'standard', TRUE),
('新手卡池', '为新用户提供的特殊卡池，提高稀有提示词概率', 'new_user', TRUE),
('贡献者卡池', '为活跃贡献者提供的特殊卡池', 'contributor', TRUE);

-- 插入系统配置
INSERT INTO system_configs (config_key, config_value, description) VALUES
('DAILY_DRAWS_DEFAULT', '3', '普通用户每日默认抽取次数'),
('DAILY_DRAWS_PREMIUM', '10', '高级用户每日默认抽取次数'),
('DAILY_SUBMISSION_LIMIT', '5', '普通用户每日提交上限'),
('DAILY_SUBMISSION_LIMIT_CONTRIBUTOR', '20', '贡献者用户每日提交上限'),
('PITY_SYSTEM_RARE', '50', '珍贵保底次数'),
('PITY_SYSTEM_EPIC', '200', '稀有保底次数'),
('PITY_SYSTEM_LEGENDARY', '500', '传说保底次数');
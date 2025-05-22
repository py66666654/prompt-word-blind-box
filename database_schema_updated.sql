-- 提示词盲盒数据库架构（更新版）

-- 创建数据库
CREATE DATABASE IF NOT EXISTS prompt_blind_box_db;
USE prompt_blind_box_db;

-- 系统配置表
CREATE TABLE IF NOT EXISTS system_configs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(50) NOT NULL,
    config_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE (config_key)
);

-- 提示词类型表
CREATE TABLE IF NOT EXISTS prompt_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 提示词质量等级表
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

-- 提示词卡片表（更新）
CREATE TABLE IF NOT EXISTS prompt_cards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    prompt_text TEXT NOT NULL,
    preview_url VARCHAR(255),
    category_id INT,
    type_id INT, -- 提示词类型：图像生成、文字对话、视频生成、音频生成、agent等
    quality_score INT DEFAULT 50, -- 0-100分，用于权重计算
    rarity_level_id INT, -- 稀有度等级关联
    source VARCHAR(255), -- 提示词来源
    is_ai_generated BOOLEAN DEFAULT FALSE, -- 是否由AI生成
    metadata JSON, -- 额外元数据
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (type_id) REFERENCES prompt_types(id),
    FOREIGN KEY (rarity_level_id) REFERENCES rarity_levels(id)
);

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE,
    points INT DEFAULT 0, -- 用户积分，可用于抽取特定类型卡片
    premium BOOLEAN DEFAULT FALSE, -- 是否为高级用户
    profile_image VARCHAR(255), -- 用户头像URL
    bio TEXT, -- 用户简介
    reset_token VARCHAR(255) DEFAULT NULL, -- 密码重置令牌
    reset_token_expiry DATETIME DEFAULT NULL, -- 密码重置令牌过期时间
    email_verified BOOLEAN DEFAULT FALSE, -- 邮箱是否已验证
    verification_token VARCHAR(255) DEFAULT NULL, -- 邮箱验证令牌
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 用户收藏表
CREATE TABLE IF NOT EXISTS user_collections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    prompt_card_id INT NOT NULL,
    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (prompt_card_id) REFERENCES prompt_cards(id),
    UNIQUE (user_id, prompt_card_id) -- 防止重复收藏
);

-- 抽卡历史记录表
CREATE TABLE IF NOT EXISTS draw_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    prompt_card_id INT NOT NULL,
    drawn_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (prompt_card_id) REFERENCES prompt_cards(id)
);

-- 社交互动系统 - 新增表

-- 提示词评分表
CREATE TABLE IF NOT EXISTS ratings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    prompt_card_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5), -- 1-5星评分
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (prompt_card_id) REFERENCES prompt_cards(id),
    UNIQUE (user_id, prompt_card_id) -- 每个用户对每个提示词只能有一个评分
);

-- 提示词评论表
CREATE TABLE IF NOT EXISTS comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    prompt_card_id INT NOT NULL,
    comment_text TEXT NOT NULL,
    parent_id INT DEFAULT NULL, -- 用于嵌套评论，NULL表示顶级评论
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (prompt_card_id) REFERENCES prompt_cards(id),
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);

-- 分享记录表
CREATE TABLE IF NOT EXISTS shares (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    prompt_card_id INT NOT NULL,
    platform VARCHAR(50) NOT NULL, -- 分享平台：wechat, weibo, twitter等
    share_url VARCHAR(255), -- 分享链接
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (prompt_card_id) REFERENCES prompt_cards(id)
);

-- 用户关注表
CREATE TABLE IF NOT EXISTS followers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    follower_id INT NOT NULL, -- 关注者
    followed_id INT NOT NULL, -- 被关注者
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (followed_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (follower_id, followed_id) -- 防止重复关注
);

-- 用户活动表（用于活动流）
CREATE TABLE IF NOT EXISTS user_activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    activity_type ENUM('draw', 'rate', 'comment', 'share', 'follow', 'collect', 'achievement', 'challenge') NOT NULL, -- 活动类型
    reference_id INT NOT NULL, -- 相关记录ID（根据activity_type指向不同表）
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 通知表
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL, -- 接收通知的用户
    sender_id INT, -- 触发通知的用户（可为NULL，系统通知）
    notification_type ENUM('comment', 'rating', 'follow', 'system', 'achievement', 'challenge') NOT NULL,
    reference_id INT, -- 相关记录ID
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 成就系统表

-- 成就类型表
CREATE TABLE IF NOT EXISTS achievement_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(255), -- 成就图标URL
    category ENUM('collection', 'social', 'creation', 'exploration') NOT NULL, -- 成就类别
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 成就等级表
CREATE TABLE IF NOT EXISTS achievement_levels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    achievement_type_id INT NOT NULL,
    level INT NOT NULL, -- 1, 2, 3 等级
    name VARCHAR(50) NOT NULL, -- 例如：青铜收藏家, 白银收藏家, 黄金收藏家
    description TEXT NOT NULL,
    requirement INT NOT NULL, -- 达成该等级需要的数量
    points INT NOT NULL, -- 获得的积分
    badge_url VARCHAR(255), -- 徽章图片URL
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (achievement_type_id) REFERENCES achievement_types(id) ON DELETE CASCADE,
    UNIQUE (achievement_type_id, level)
);

-- 用户成就表
CREATE TABLE IF NOT EXISTS user_achievements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    achievement_level_id INT NOT NULL,
    current_progress INT NOT NULL DEFAULT 0, -- 当前进度
    unlocked BOOLEAN DEFAULT FALSE, -- 是否已解锁
    unlocked_at TIMESTAMP NULL, -- 解锁时间
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (achievement_level_id) REFERENCES achievement_levels(id) ON DELETE CASCADE,
    UNIQUE (user_id, achievement_level_id)
);

-- 排行榜系统表

-- 排行榜类型表
CREATE TABLE IF NOT EXISTS leaderboard_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    calculation_type ENUM('total', 'average', 'count') NOT NULL, -- 计算方式
    time_period ENUM('daily', 'weekly', 'monthly', 'all_time') NOT NULL, -- 时间范围
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 排行榜记录表
CREATE TABLE IF NOT EXISTS leaderboard_entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    leaderboard_type_id INT NOT NULL,
    user_id INT NOT NULL,
    score DECIMAL(10,2) NOT NULL, -- 分数
    rank INT NOT NULL, -- 排名
    period_start DATE NOT NULL, -- 周期开始日期
    period_end DATE NOT NULL, -- 周期结束日期
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (leaderboard_type_id) REFERENCES leaderboard_types(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (leaderboard_type_id, user_id, period_start, period_end)
);

-- 挑战系统表

-- 挑战类型表
CREATE TABLE IF NOT EXISTS challenge_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(255),
    requirement_type ENUM('collection', 'creation', 'rating', 'sharing') NOT NULL,
    requirement_count INT NOT NULL, -- 完成挑战需要的数量
    points INT NOT NULL, -- 完成后获得的积分
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 挑战活动表
CREATE TABLE IF NOT EXISTS challenges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    challenge_type_id INT NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (challenge_type_id) REFERENCES challenge_types(id) ON DELETE CASCADE
);

-- 用户挑战表
CREATE TABLE IF NOT EXISTS user_challenges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    challenge_id INT NOT NULL,
    current_progress INT NOT NULL DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE,
    UNIQUE (user_id, challenge_id)
);

-- 协作提示词表
CREATE TABLE IF NOT EXISTS collaborative_prompts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    base_prompt_text TEXT NOT NULL,
    category_id INT,
    type_id INT,
    status ENUM('draft', 'active', 'completed', 'archived') DEFAULT 'draft',
    created_by INT NOT NULL,
    completed_prompt_id INT NULL, -- 最终完成的提示词ID
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (type_id) REFERENCES prompt_types(id),
    FOREIGN KEY (completed_prompt_id) REFERENCES prompt_cards(id) ON DELETE SET NULL
);

-- 协作参与者表
CREATE TABLE IF NOT EXISTS collaborative_participants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    collaborative_prompt_id INT NOT NULL,
    user_id INT NOT NULL,
    role ENUM('creator', 'editor', 'viewer') DEFAULT 'editor',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (collaborative_prompt_id) REFERENCES collaborative_prompts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (collaborative_prompt_id, user_id)
);

-- 协作修改表
CREATE TABLE IF NOT EXISTS collaborative_edits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    collaborative_prompt_id INT NOT NULL,
    user_id INT NOT NULL,
    edited_text TEXT NOT NULL,
    edit_comment TEXT,
    approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (collaborative_prompt_id) REFERENCES collaborative_prompts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 插入提示词类型数据
INSERT INTO prompt_types (name, description, icon) VALUES
('image', '图像生成提示词', 'image'),
('text', '文字对话提示词', 'text'),
('video', '视频生成提示词', 'video'),
('audio', '音频生成提示词', 'audio'),
('agent', 'AI智能体提示词', 'robot');

-- 插入稀有度等级数据
INSERT INTO rarity_levels (name, description, min_score, max_score, probability, color_code) VALUES
('普通', '基础提示词，适合入门使用', 0, 39, 0.450000, '#AAAAAA'),
('优质', '优化过的提示词，有一定参考价值', 40, 69, 0.350000, '#55AA55'),
('精品', '经过精心设计的高质量提示词', 70, 84, 0.150000, '#5555FF'),
('珍贵', '专业级提示词，效果出众', 85, 94, 0.045000, '#AA55AA'),
('稀有', '极为稀有的顶级提示词', 95, 98, 0.004900, '#FFAA00'),
('传说', '传说级别提示词，价值连城', 99, 100, 0.000100, '#FF5555');

-- 插入示例分类数据
INSERT INTO categories (name, description, icon) VALUES
('人物', '人物描述相关提示词', 'person'),
('风景', '自然和城市景观相关提示词', 'landscape'),
('艺术风格', '特定艺术风格相关提示词', 'palette'),
('概念艺术', '概念和想法相关提示词', 'idea'),
('科幻', '科幻元素相关提示词', 'rocket');

-- 插入系统配置
INSERT INTO system_configs (config_key, config_value, description) VALUES
('DAILY_DRAWS_DEFAULT', '3', '普通用户每日默认抽取次数'),
('DAILY_DRAWS_PREMIUM', '10', '高级用户每日默认抽取次数'),
('DAILY_SUBMISSION_LIMIT', '5', '普通用户每日提交上限'),
('DAILY_SUBMISSION_LIMIT_CONTRIBUTOR', '20', '贡献者用户每日提交上限'),
('PITY_SYSTEM_RARE', '30', '珍贵保底次数 (稀有度4)'),
('PITY_SYSTEM_EPIC', '60', '稀有保底次数 (稀有度5)'),
('PITY_SYSTEM_LEGENDARY', '100', '传说保底次数 (稀有度6)'),
('PITY_BOOST_INCREMENT', '0.05', '每10抽未获得珍贵及以上稀有度时增加的提升系数'),
('PITY_BOOST_MAX', '2.5', '动态保底最大提升系数');

-- 插入示例提示词数据
-- 图像生成提示词
INSERT INTO prompt_cards (prompt_text, preview_url, category_id, type_id, quality_score, rarity_level_id, source, is_ai_generated) VALUES
('一位身穿华丽宫廷服饰的年轻女子，站在古堡阳台上，远望雪山，细腻的皮肤纹理，柔和的自然光线，8k超高清质量，电影感镜头', 'https://placehold.co/600x400/4a6bdf/ffffff?text=宫廷女子预览', 1, 1, 65, 2, 'Midjourney优质案例', FALSE),
('潮汐涌动的海岸线，岩石形成的自然拱门，夕阳映照下金色的海面，远处有轮船剪影，电影级HDR，广角镜头', 'https://placehold.co/600x400/4a6bdf/ffffff?text=海岸日落预览', 2, 1, 78, 3, 'Stable Diffusion艺术社区', FALSE),
('微缩城市模型，极致细节的建筑群，人们如蚂蚁般穿行，倾斜移轴镜头效果，清晰锐利，摄影级别照片质感', 'https://placehold.co/600x400/4a6bdf/ffffff?text=微缩城市预览', 2, 1, 88, 4, 'DALL-E精选', FALSE),
('1980年代赛博朋克风格动画，霓虹灯闪烁的未来城市，高科技与低生活，雨夜，反射在湿润街道上的灯光，手绘2D动画风格，饱和色彩', 'https://placehold.co/600x400/4a6bdf/ffffff?text=赛博朋克预览', 3, 1, 92, 4, 'Midjourney精选作品', FALSE),
('深海水下古文明遗迹，巨石柱廊，古老的象形文字雕刻，珊瑚和海藻部分覆盖，蓝绿色的神秘光芒，水下摄影，光线透过水面形成光束', 'https://placehold.co/600x400/4a6bdf/ffffff?text=深海遗迹预览', 4, 1, 95, 5, 'AI艺术竞赛获奖作品', FALSE),
('极致超现实主义作品：一个无限循环的埃舍尔风格楼梯迷宫，穿着维多利亚时代服饰的人们在不同重力方向行走，物理规则被扭曲，黑白对比强烈，光影精细，8K细节，电影级渲染', 'https://placehold.co/600x400/4a6bdf/ffffff?text=超现实迷宫预览', 3, 1, 99, 6, '国际AI艺术大师作品', FALSE),

-- 文字对话提示词
('你是一位经验丰富的文学评论家和写作指导。请分析我提供的文本，指出其中的优点和需要改进的地方。关注叙事结构、人物发展、语言使用和整体主题。提供具体的修改建议并举例说明如何改进。', 'https://placehold.co/600x400/4a6bdf/ffffff?text=文学评论预览', 4, 2, 75, 3, '专业写作指南', FALSE),
('你是一个友好的心理健康顾问。请根据我分享的情况提供支持性的回应和实用建议。保持温和且不评判的语气。提供科学支持的策略，但明确你不能替代专业医疗建议。', 'https://placehold.co/600x400/4a6bdf/ffffff?text=心理健康预览', 1, 2, 89, 4, '心理健康指南', FALSE),
('你是一位世界级象棋大师。请分析我描述的棋盘局面，建议下一步最优走法，并解释战略理由。考虑开局理论、中盘策略或残局技巧，取决于当前局面。对可能的应对和几步后的局面提供见解。', 'https://placehold.co/600x400/4a6bdf/ffffff?text=象棋大师预览', 4, 2, 82, 3, '国际象棋研究', FALSE),

-- 视频生成提示词
('海浪缓缓拍打沙滩，日落时分，金色阳光在海面上舞动，远处有几艘帆船缓缓移动，海鸥在低空飞过，轻松舒缓的氛围，4K高清', 'https://placehold.co/600x400/4a6bdf/ffffff?text=海滩日落视频预览', 2, 3, 68, 2, 'Runway示例', FALSE),
('空中俯视繁忙的城市十字路口，车流川流不息，行人穿行，灯光变换，从白天过渡到黄昏再到夜晚，延时摄影效果，动态变化', 'https://placehold.co/600x400/4a6bdf/ffffff?text=城市十字路口预览', 2, 3, 93, 4, 'Pika获奖作品', FALSE),
('微观世界：水滴落入水面的超慢动作，捕捉每一个涟漪和水花的细节，高速摄影风格，光线折射通过水滴形成彩虹效果，8K分辨率，震撼视觉效果', 'https://placehold.co/600x400/4a6bdf/ffffff?text=水滴特写预览', 4, 3, 97, 5, '高端视频制作工作室', FALSE),

-- 音频生成提示词
('创作一段冥想背景音乐，包含柔和的自然声音，如轻柔的流水声和远处的鸟鸣，结合环境氛围和低频音调，营造平静放松的氛围', 'https://placehold.co/600x400/4a6bdf/ffffff?text=冥想音乐预览', 4, 4, 71, 3, 'Suno创作示例', FALSE),
('创作一段科幻电影预告片风格的背景音乐，包含史诗般的管弦乐元素，紧张的电子节拍，和戏剧性的音效转场，营造紧张感和宏大感', 'https://placehold.co/600x400/4a6bdf/ffffff?text=科幻音乐预览', 5, 4, 85, 4, 'Suno精选作品', FALSE),
('创作一段融合爵士和电子元素的实验性音乐，即兴萨克斯风旋律，不规则节奏打击乐，现代合成器音色，复杂和声进行，适合前卫艺术展览', 'https://placehold.co/600x400/4a6bdf/ffffff?text=实验音乐预览', 3, 4, 98, 5, '专业音乐制作人作品', FALSE),

-- Agent提示词
('你是一位专业的数据科学研究助手。请帮我分析以下数据集，识别关键趋势和模式，生成描述性统计数据，并创建可视化代码。提出数据驱动的见解和进一步研究的建议。', 'https://placehold.co/600x400/4a6bdf/ffffff?text=数据科学预览', 4, 5, 79, 3, 'Data Science Guide', FALSE),
('你是一个高效的项目管理助手。请帮我将这个大型项目分解为可管理的任务，创建时间表，识别关键依赖项和风险，并提出适当的追踪机制。使用敏捷或瀑布方法，根据项目性质选择。', 'https://placehold.co/600x400/4a6bdf/ffffff?text=项目管理预览', 4, 5, 83, 3, 'PM Best Practices', FALSE),
('你是一个创新的产品设计顾问。请根据我提供的用户问题和市场机会，制定产品概念。概述核心功能，目标用户，价值主张，以及可行性考虑。提供低保真原型和测试策略。', 'https://placehold.co/600x400/4a6bdf/ffffff?text=产品设计预览', 4, 5, 91, 4, 'Product Design Institute', FALSE),
('你是一个自主研究代理。你的任务是研究我给定的复杂主题，找到高质量信息来源，综合关键发现和不同观点，识别知识差距和误解，并以结构化格式提供全面分析。展示批判性思维和信息素养。', 'https://placehold.co/600x400/4a6bdf/ffffff?text=研究代理预览', 4, 5, 96, 5, 'AI Research Framework', FALSE);
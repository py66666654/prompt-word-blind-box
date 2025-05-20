-- 成就系统相关表

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

-- 用户徽章展示偏好
CREATE TABLE IF NOT EXISTS user_badge_display (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    achievement_id INT NOT NULL,
    display_order INT NOT NULL, -- 展示顺序
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
    UNIQUE (user_id, achievement_id)
);

-- 插入收藏家系列成就
INSERT INTO achievements (name, description, category, requirement, badge_image_url, required_count, points) VALUES
('初级收藏家', '收集10个提示词', 'collection', '收集任意10个提示词', 'https://placehold.co/200x200/4a6bdf/ffffff?text=初级收藏家', 10, 10),
('资深收藏家', '收集100个提示词', 'collection', '收集任意100个提示词', 'https://placehold.co/200x200/4a6bdf/ffffff?text=资深收藏家', 100, 30),
('提示词专家', '收集10个稀有及以上级别提示词', 'collection', '收集10个稀有或传说级别提示词', 'https://placehold.co/200x200/ffaa00/ffffff?text=提示词专家', 10, 50),
('传说收藏家', '收集所有稀有度级别的提示词各1个', 'collection', '收集从普通到传说各稀有度的提示词各至少1个', 'https://placehold.co/200x200/ff5555/ffffff?text=传说收藏家', 6, 100),
('图像达人', '收集20个图像类提示词', 'collection', '收集20个图像生成类提示词', 'https://placehold.co/200x200/4a6bdf/ffffff?text=图像达人', 20, 20),
('对话大师', '收集20个文字对话类提示词', 'collection', '收集20个文字对话类提示词', 'https://placehold.co/200x200/4a6bdf/ffffff?text=对话大师', 20, 20),
('视频先锋', '收集10个视频生成类提示词', 'collection', '收集10个视频生成类提示词', 'https://placehold.co/200x200/4a6bdf/ffffff?text=视频先锋', 10, 30),
('声音艺术家', '收集10个音频生成类提示词', 'collection', '收集10个音频生成类提示词', 'https://placehold.co/200x200/4a6bdf/ffffff?text=声音艺术家', 10, 30),
('Agent探索者', '收集10个Agent应用类提示词', 'collection', '收集10个Agent应用类提示词', 'https://placehold.co/200x200/4a6bdf/ffffff?text=Agent探索者', 10, 30);

-- 插入创作者系列成就
INSERT INTO achievements (name, description, category, requirement, badge_image_url, required_count, points) VALUES
('创意萌芽', '成功提交1个提示词', 'creation', '成功提交1个通过审核的提示词', 'https://placehold.co/200x200/55aa55/ffffff?text=创意萌芽', 1, 20),
('灵感之泉', '成功提交10个提示词', 'creation', '成功提交10个通过审核的提示词', 'https://placehold.co/200x200/55aa55/ffffff?text=灵感之泉', 10, 50),
('创意大师', '提交的提示词被收藏超过100次', 'creation', '你提交的提示词总共被其他用户收藏超过100次', 'https://placehold.co/200x200/55aa55/ffffff?text=创意大师', 100, 100),
('流行创作者', '单个提示词被收藏超过50次', 'creation', '你提交的某个提示词被其他用户收藏超过50次', 'https://placehold.co/200x200/55aa55/ffffff?text=流行创作者', 50, 80),
('珍品创造者', '成功提交1个被评为稀有或传说级别的提示词', 'creation', '提交并通过审核的提示词中有1个被评为稀有或传说级别', 'https://placehold.co/200x200/ffaa00/ffffff?text=珍品创造者', 1, 100),
('灵感共享者', '分享提示词到社交媒体10次', 'creation', '将你的提示词或收藏分享到社交媒体10次', 'https://placehold.co/200x200/55aa55/ffffff?text=灵感共享者', 10, 30);

-- 插入探索者系列成就
INSERT INTO achievements (name, description, category, requirement, badge_image_url, required_count, points) VALUES
('初次探索', '完成首次抽取', 'exploration', '首次抽取提示词盲盒', 'https://placehold.co/200x200/5555ff/ffffff?text=初次探索', 1, 5),
('坚持不懈', '连续10天登录', 'exploration', '连续10天登录应用', 'https://placehold.co/200x200/5555ff/ffffff?text=坚持不懈', 10, 30),
('幸运之星', '一天内抽取到2个稀有及以上提示词', 'exploration', '在同一日内抽取到2个稀有或传说级别提示词', 'https://placehold.co/200x200/ffaa00/ffffff?text=幸运之星', 2, 50),
('抽卡狂热者', '累计抽取100次提示词', 'exploration', '累计抽取100次提示词盲盒', 'https://placehold.co/200x200/5555ff/ffffff?text=抽卡狂热者', 100, 50),
('传说猎人', '抽取到1个传说级提示词', 'exploration', '成功抽取到1个传说级别的提示词', 'https://placehold.co/200x200/ff5555/ffffff?text=传说猎人', 1, 100),
('类型探索者', '抽取所有类型的提示词各1个', 'exploration', '抽取到图像、文字、视频、音频、Agent各类型提示词各至少1个', 'https://placehold.co/200x200/5555ff/ffffff?text=类型探索者', 5, 50);

-- 插入创意大师系列成就
INSERT INTO achievements (name, description, category, requirement, badge_image_url, required_count, points) VALUES
('角色塑造师', '收集10个角色卡', 'creative_master', '收集10个角色卡提示词', 'https://placehold.co/200x200/aa55aa/ffffff?text=角色塑造师', 10, 40),
('世界构建者', '收集10个世界卡', 'creative_master', '收集10个世界卡提示词', 'https://placehold.co/200x200/aa55aa/ffffff?text=世界构建者', 10, 40),
('故事编织者', '收集10个剧情卡', 'creative_master', '收集10个剧情卡提示词', 'https://placehold.co/200x200/aa55aa/ffffff?text=故事编织者', 10, 40),
('创意宇宙', '成功组合使用角色卡、世界卡和剧情卡创作内容', 'creative_master', '使用创意工作室成功组合角色卡、世界卡和剧情卡创作并保存内容', 'https://placehold.co/200x200/aa55aa/ffffff?text=创意宇宙', 1, 60),
('科幻巨匠', '收集5个科幻主题的创意卡片', 'creative_master', '收集5个带有科幻标签的角色卡、世界卡或剧情卡', 'https://placehold.co/200x200/aa55aa/ffffff?text=科幻巨匠', 5, 30),
('奇幻大师', '收集5个奇幻主题的创意卡片', 'creative_master', '收集5个带有奇幻标签的角色卡、世界卡或剧情卡', 'https://placehold.co/200x200/aa55aa/ffffff?text=奇幻大师', 5, 30),
('冒险设计师', '创建3个不同组合的创意卡片组合', 'creative_master', '在创意工作室保存3个不同的角色卡、世界卡和剧情卡组合', 'https://placehold.co/200x200/aa55aa/ffffff?text=冒险设计师', 3, 50);

-- 插入社区活动成就
INSERT INTO achievements (name, description, category, requirement, badge_image_url, required_count, points) VALUES
('社区新星', '参与首个社区活动', 'community', '首次参与平台举办的社区活动', 'https://placehold.co/200x200/54bdf9/ffffff?text=社区新星', 1, 20),
('活动达人', '参与10个社区活动', 'community', '参与10个不同的社区活动', 'https://placehold.co/200x200/54bdf9/ffffff?text=活动达人', 10, 50),
('获奖创作者', '在创作挑战中获得一次奖项', 'community', '在平台创作挑战活动中获得任意奖项', 'https://placehold.co/200x200/54bdf9/ffffff?text=获奖创作者', 1, 80),
('社区贡献者', '评论或点赞其他用户提示词50次', 'community', '对其他用户分享的提示词进行评论或点赞共计50次', 'https://placehold.co/200x200/54bdf9/ffffff?text=社区贡献者', 50, 30),
('推广大使', '成功邀请5位新用户注册', 'community', '通过你的邀请链接成功注册5位新用户', 'https://placehold.co/200x200/54bdf9/ffffff?text=推广大使', 5, 50);

-- 插入特殊成就
INSERT INTO achievements (name, description, category, requirement, badge_image_url, required_count, points) VALUES
('创始会员', '在平台公测期间注册', 'special', '在2025年6月前完成账号注册', 'https://placehold.co/200x200/ffd700/000000?text=创始会员', 1, 100),
('提示词百科全书', '拥有所有类型和主题的提示词', 'special', '收集所有提示词类型和主要主题分类的提示词', 'https://placehold.co/200x200/ffd700/000000?text=百科全书', 1, 200),
('完美收藏家', '收集平台上50%以上的提示词', 'special', '收集当前平台上发布的50%以上的提示词', 'https://placehold.co/200x200/ffd700/000000?text=完美收藏家', 1, 300);
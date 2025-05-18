-- 提示词卡片库数据库架构

-- 创建数据库
CREATE DATABASE IF NOT EXISTS prompt_blind_box_db;
USE prompt_blind_box_db;

-- 提示词分类表
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 提示词卡片表
CREATE TABLE IF NOT EXISTS prompt_cards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    prompt_text TEXT NOT NULL,
    preview_url VARCHAR(255),
    category_id INT,
    quality_score INT DEFAULT 0, -- 0-100，用于权重计算，分数越高抽到概率越大
    source VARCHAR(255), -- 提示词来源
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE,
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

-- 插入示例分类数据
INSERT INTO categories (name, description) VALUES
('人物', '人物描述相关提示词'),
('风景', '自然和城市景观相关提示词'),
('艺术风格', '特定艺术风格相关提示词'),
('概念艺术', '概念和想法相关提示词'),
('科幻', '科幻元素相关提示词');

-- 插入示例高质量提示词数据
INSERT INTO prompt_cards (prompt_text, preview_url, category_id, quality_score, source) VALUES
('一位身穿华丽宫廷服饰的年轻女子，站在古堡阳台上，远望雪山，细腻的皮肤纹理，柔和的自然光线，8k超高清质量，电影感镜头', 'https://placehold.co/600x400/4a6bdf/ffffff?text=宫廷女子预览', 1, 90, 'Midjourney优质案例'),
('潮汐涌动的海岸线，岩石形成的自然拱门，夕阳映照下金色的海面，远处有轮船剪影，电影级HDR，广角镜头', 'https://placehold.co/600x400/4a6bdf/ffffff?text=海岸日落预览', 2, 85, 'Stable Diffusion艺术社区'),
('微缩城市模型，极致细节的建筑群，人们如蚂蚁般穿行，倾斜移轴镜头效果，清晰锐利，摄影级别照片质感', 'https://placehold.co/600x400/4a6bdf/ffffff?text=微缩城市预览', 2, 88, 'DALL-E精选'),
('1980年代赛博朋克风格动画，霓虹灯闪烁的未来城市，高科技与低生活，雨夜，反射在湿润街道上的灯光，手绘2D动画风格，饱和色彩', 'https://placehold.co/600x400/4a6bdf/ffffff?text=赛博朋克预览', 3, 92, 'Midjourney精选作品'),
('深海水下古文明遗迹，巨石柱廊，古老的象形文字雕刻，珊瑚和海藻部分覆盖，蓝绿色的神秘光芒，水下摄影，光线透过水面形成光束', 'https://placehold.co/600x400/4a6bdf/ffffff?text=深海遗迹预览', 4, 95, 'AI艺术竞赛获奖作品'),
('宇宙飞船内部控制室，全息投影显示屏，未来科技界面，宇航员操作复杂控制台，星空可见于大型观察窗，蓝色和橙色的对比色调，科幻电影镜头', 'https://placehold.co/600x400/4a6bdf/ffffff?text=飞船控制室预览', 5, 87, 'NASA概念艺术改编'),
('空中花园城市，巨大的垂直花园建筑群，瀑布从高楼之间流下，绿植覆盖的阳台，飞行器穿梭，明亮的阳光，建筑效果图风格，清晰细节', 'https://placehold.co/600x400/4a6bdf/ffffff?text=空中花园预览', 2, 91, '未来城市设计大赛'),
('生物发光森林，各种奇幻植物和蘑菇发出蓝色和紫色的光芒，神秘雾气，小生物穿行，魔幻现实主义风格，细致质感，梦幻色调', 'https://placehold.co/600x400/4a6bdf/ffffff?text=发光森林预览', 4, 89, 'AI创意艺术馆'),
('战场上的未来士兵，高科技动力装甲，头盔HUD界面，手持能量武器，背景是废墟和战争迷雾，戏剧性照明，电影场景感，4K质量', 'https://placehold.co/600x400/4a6bdf/ffffff?text=未来士兵预览', 5, 86, '游戏概念设计集');
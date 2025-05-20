-- 角色卡扩展架构

-- 角色卡表
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

-- 插入示例角色卡标签
INSERT INTO character_tags (name, category) VALUES
('英雄', '角色类型'),
('反派', '角色类型'),
('导师', '角色类型'),
('盟友', '角色类型'),
('复杂', '性格'),
('善良', '性格'),
('邪恶', '性格'),
('古代', '时代'),
('现代', '时代'),
('未来', '时代'),
('科幻', '风格'),
('奇幻', '风格'),
('军事', '风格'),
('浪漫', '风格'),
('悲剧', '风格'),
('喜剧', '风格');

-- 插入示例角色卡数据
INSERT INTO prompt_cards (prompt_text, preview_url, category_id, type_id, quality_score, rarity_level_id, source, is_ai_generated) VALUES
('# 神秘侦探角色卡
姓名：亚瑟·布莱克
性别：男
年龄：38岁
职业：私人侦探

## 外貌特征
身材高瘦，总是穿着深色风衣，饱经风霜的面容上永远带着一丝若有若无的微笑。灰绿色的眼睛锐利如刀，能洞察细节。左眼角有一道细小的疤痕，浅色短发略有灰白，总是略显凌乱。举手投足间透露出警觉与从容。

## 性格特点
- 高度观察力与直觉，往往能看透常人忽略的细节
- 孤僻内向，难以建立亲密关系
- 对正义有执着的追求，但方法常常游走在灰色地带
- 幽默感独特，常用黑色幽默缓解紧张局面
- 偏执且完美主义，对自己要求极高

## 背景故事
曾是警察精英，在一次卧底行动中失去搭档，同时被冤枉涉嫌贪污。虽最终洗清冤屈，但选择离开警队成为私家侦探。多年来专注解决警方无暇顾及的悬案，尤其是与连环犯罪相关的案件，在城市地下世界建立广泛人脉。内心深处仍然因为搭档之死感到愧疚，这成为他不懈追求真相的动力。

## 能力特长
- 出色的逻辑推理和归纳能力
- 精通多种格斗技巧，特别是实用防身术
- 掌握基础法医学知识
- 熟悉城市的每一个角落，特别是暗处的世界
- 过目不忘的记忆力

## 关系网络
- 警局内部有几位仍然信任他的老同事，提供非官方协助
- 街头流浪者组成的情报网络，他们是他重要的眼睛和耳朵
- 一位法医朋友，偶尔提供专业咨询
- 神秘的高层人物"M"，偶尔提供案件线索，真实身份成谜

## 核心动机
寻求真相与正义，特别是为那些被体制遗忘的受害者。同时也在每个案件中寻找赎罪的可能，试图填补内心因搭档之死而留下的空洞。

## 对话风格
简练而直接，常常使用专业术语。喜欢用反问句引导思考，偶尔流露出对人性黑暗面的深刻洞察。在压力下会展现出一种特有的冷幽默，往往让对话充满张力。', 'https://placehold.co/600x400/4a6bdf/ffffff?text=神秘侦探预览', 1, 6, 85, 4, '侦探故事创作集', FALSE);

-- 获取最后插入的提示词ID
SET @last_prompt_id = LAST_INSERT_ID();

-- 插入对应的角色卡详细信息
INSERT INTO character_cards 
(prompt_id, character_name, character_type, physical_traits, personality, background, abilities, relationships, motives, dialogue_style) 
VALUES 
(@last_prompt_id, '亚瑟·布莱克', 'protagonist', 
'身材高瘦，总是穿着深色风衣，饱经风霜的面容上永远带着一丝若有若无的微笑。灰绿色的眼睛锐利如刀，能洞察细节。左眼角有一道细小的疤痕，浅色短发略有灰白，总是略显凌乱。举手投足间透露出警觉与从容。',
'高度观察力与直觉，往往能看透常人忽略的细节。孤僻内向，难以建立亲密关系。对正义有执着的追求，但方法常常游走在灰色地带。幽默感独特，常用黑色幽默缓解紧张局面。偏执且完美主义，对自己要求极高。',
'曾是警察精英，在一次卧底行动中失去搭档，同时被冤枉涉嫌贪污。虽最终洗清冤屈，但选择离开警队成为私家侦探。多年来专注解决警方无暇顾及的悬案，尤其是与连环犯罪相关的案件，在城市地下世界建立广泛人脉。内心深处仍然因为搭档之死感到愧疚，这成为他不懈追求真相的动力。',
'出色的逻辑推理和归纳能力。精通多种格斗技巧，特别是实用防身术。掌握基础法医学知识。熟悉城市的每一个角落，特别是暗处的世界。过目不忘的记忆力。',
'警局内部有几位仍然信任他的老同事，提供非官方协助。街头流浪者组成的情报网络，他们是他重要的眼睛和耳朵。一位法医朋友，偶尔提供专业咨询。神秘的高层人物"M"，偶尔提供案件线索，真实身份成谜。',
'寻求真相与正义，特别是为那些被体制遗忘的受害者。同时也在每个案件中寻找赎罪的可能，试图填补内心因搭档之死而留下的空洞。',
'简练而直接，常常使用专业术语。喜欢用反问句引导思考，偶尔流露出对人性黑暗面的深刻洞察。在压力下会展现出一种特有的冷幽默，往往让对话充满张力。');

-- 获取最后插入的角色卡ID
SET @last_character_id = LAST_INSERT_ID();

-- 添加角色卡标签关联
INSERT INTO character_card_tags (character_card_id, tag_id) 
SELECT @last_character_id, id FROM character_tags WHERE name IN ('复杂', '现代', '神秘');

-- 再插入一个示例角色卡
INSERT INTO prompt_cards (prompt_text, preview_url, category_id, type_id, quality_score, rarity_level_id, source, is_ai_generated) VALUES
('# 魔法学院天才学生角色卡
姓名：莉娜·星辰
性别：女
年龄：19岁
身份：皇家魔法学院高级学生

## 外貌特征
身材娇小但姿态优雅，有着异于常人的银紫色长发，发梢会随情绪变化微微发光。眼睛是深紫色，眼中偶尔闪过星光般的魔法痕迹。肤色白皙，右脸颊有一枚星形胎记。通常穿着定制的学院长袍，袍子边缘绣有星光魔法纹路。手指纤长，适合精细的魔法操作。

## 性格特点
- 高度自信，接近傲慢的边缘
- 对魔法研究有着近乎痴迷的热情
- 在学术上极具竞争力，不允许自己失败
- 表面冷漠，实则情感丰富但不善表达
- 在亲近的人面前会展现出少有的幽默感
- 对规则有选择性遵守的态度，认为天才应有特权

## 背景故事
出身于没落的古老魔法家族，家族曾因研究禁忌魔法而声名狼藉。莉娜从小展现出惊人的魔法天赋，五岁时就能自如控制元素魔法。进入皇家魔法学院后，她迅速成为顶尖学生，专注于研究被遗忘的古代星辰魔法，希望借此恢复家族荣光。然而，她的血统和研究方向让她备受争议，既有狂热追随者，也有警惕防备者。家族历史中隐藏的秘密始终如影随形，她内心深处怀疑自己非凡能力的真正来源。

## 能力特长
- 罕见的星辰魔法天赋，能操纵星能和空间
- 魔法理论研究方面有超越导师的洞察力
- 惊人的法术记忆力，能在一次阅读后记住复杂咒语
- 创新能力出众，常能将不同魔法流派知识融会贯通
- 在危机中有着异常冷静的判断力

## 关系网络
- 学院院长是她的导师兼监护人，关系亦师亦父
- 有一个天赋平平但忠诚的室友，是少数了解她脆弱一面的人
- 与魔法史教授关系紧张，后者曾参与调查她家族的丑闻
- 一位神秘的通信者定期给她寄来古代魔法文献，身份不明
- 学院中有一个暗中崇拜她的学生团体"星辰会"

## 核心动机
洗刷家族污名，证明自己的价值，同时寻找自己血脉中魔法力量的真相。她渴望被认可，不仅是作为一个天才，更是作为一个不被家族历史定义的个体。

## 对话风格
言辞精准而学术化，经常使用魔法术语。对不熟悉的人保持礼貌但疏离，在谈到自己专业领域时会变得热情洋溢。在压力下容易说出尖刻话语，事后往往懊悔但难以道歉。偶尔会流露出对凡人世界的好奇和不解。', 'https://placehold.co/600x400/4a6bdf/ffffff?text=魔法学院学生预览', 1, 6, 92, 4, '奇幻角色设定集', FALSE);

-- 获取最后插入的提示词ID
SET @last_prompt_id = LAST_INSERT_ID();

-- 插入对应的角色卡详细信息
INSERT INTO character_cards 
(prompt_id, character_name, character_type, physical_traits, personality, background, abilities, relationships, motives, dialogue_style) 
VALUES 
(@last_prompt_id, '莉娜·星辰', 'protagonist', 
'身材娇小但姿态优雅，有着异于常人的银紫色长发，发梢会随情绪变化微微发光。眼睛是深紫色，眼中偶尔闪过星光般的魔法痕迹。肤色白皙，右脸颊有一枚星形胎记。通常穿着定制的学院长袍，袍子边缘绣有星光魔法纹路。手指纤长，适合精细的魔法操作。',
'高度自信，接近傲慢的边缘。对魔法研究有着近乎痴迷的热情。在学术上极具竞争力，不允许自己失败。表面冷漠，实则情感丰富但不善表达。在亲近的人面前会展现出少有的幽默感。对规则有选择性遵守的态度，认为天才应有特权。',
'出身于没落的古老魔法家族，家族曾因研究禁忌魔法而声名狼藉。莉娜从小展现出惊人的魔法天赋，五岁时就能自如控制元素魔法。进入皇家魔法学院后，她迅速成为顶尖学生，专注于研究被遗忘的古代星辰魔法，希望借此恢复家族荣光。然而，她的血统和研究方向让她备受争议，既有狂热追随者，也有警惕防备者。家族历史中隐藏的秘密始终如影随形，她内心深处怀疑自己非凡能力的真正来源。',
'罕见的星辰魔法天赋，能操纵星能和空间。魔法理论研究方面有超越导师的洞察力。惊人的法术记忆力，能在一次阅读后记住复杂咒语。创新能力出众，常能将不同魔法流派知识融会贯通。在危机中有着异常冷静的判断力。',
'学院院长是她的导师兼监护人，关系亦师亦父。有一个天赋平平但忠诚的室友，是少数了解她脆弱一面的人。与魔法史教授关系紧张，后者曾参与调查她家族的丑闻。一位神秘的通信者定期给她寄来古代魔法文献，身份不明。学院中有一个暗中崇拜她的学生团体"星辰会"。',
'洗刷家族污名，证明自己的价值，同时寻找自己血脉中魔法力量的真相。她渴望被认可，不仅是作为一个天才，更是作为一个不被家族历史定义的个体。',
'言辞精准而学术化，经常使用魔法术语。对不熟悉的人保持礼貌但疏离，在谈到自己专业领域时会变得热情洋溢。在压力下容易说出尖刻话语，事后往往懊悔但难以道歉。偶尔会流露出对凡人世界的好奇和不解。');

-- 获取最后插入的角色卡ID
SET @last_character_id = LAST_INSERT_ID();

-- 添加角色卡标签关联
INSERT INTO character_card_tags (character_card_id, tag_id) 
SELECT @last_character_id, id FROM character_tags WHERE name IN ('复杂', '奇幻');

-- 更新prompt_types表，添加创意卡片类型
INSERT INTO prompt_types (name, description, icon) VALUES
('character', '角色卡提示词', 'user'),
('world', '世界卡提示词', 'globe'),
('plot', '剧情卡提示词', 'book');
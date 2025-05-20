-- 剧情卡扩展架构

-- 剧情卡表
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

-- 创意卡片组合表（可关联角色卡、世界卡、剧情卡）
CREATE TABLE IF NOT EXISTS creative_card_combinations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    character_card_id INT,
    world_card_id INT,
    plot_card_id INT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (character_card_id) REFERENCES character_cards(id) ON DELETE SET NULL,
    FOREIGN KEY (world_card_id) REFERENCES world_cards(id) ON DELETE SET NULL,
    FOREIGN KEY (plot_card_id) REFERENCES plot_cards(id) ON DELETE SET NULL
);

-- 插入示例剧情卡标签
INSERT INTO plot_tags (name, category) VALUES
('个人成长', '主题'),
('复仇', '主题'),
('救赎', '主题'),
('背叛', '主题'),
('发现', '主题'),
('命运', '主题'),
('爱情', '类型'),
('冒险', '类型'),
('悬疑', '类型'),
('战争', '类型'),
('家庭', '类型'),
('英雄旅程', '结构'),
('三幕式', '结构'),
('悲剧', '结局'),
('喜剧', '结局'),
('开放式', '结局'),
('圆满', '结局'),
('黑暗', '基调'),
('希望', '基调'),
('讽刺', '基调'),
('浪漫', '基调');

-- 插入示例剧情卡数据
INSERT INTO prompt_cards (prompt_text, preview_url, category_id, type_id, quality_score, rarity_level_id, source, is_ai_generated) VALUES
('# 命运转折点剧情卡
## 基本信息
剧情标题：命运的分岔口
剧情阶段：转折点/高潮
冲突类型：内心冲突与道德抉择

## 核心情节
主角面临一个能改变一切的决定时刻，两条截然不同的道路摆在面前。一方是安全但可能背叛自己原则的选择，另一方是正义但充满未知危险的选择。当主角挣扎于这个决定时，过去的人物或事件以意想不到的方式重返故事，为决定增添了更复杂的层面。主角必须在有限时间内做出选择，而每一刻的犹豫都可能带来新的后果。

## 情感变化轨迹
- 起点：困惑与压力，被选择的重量压得喘不过气
- 发展：深度反思与自我怀疑，质疑过去所有决定
- 转折：关键领悟时刻，通常由意外线索或对话触发
- 高潮：面对真实自我，接受无论选择什么都会有所失去
- 余波：选择后的初步结果与情感适应，无论喜悦还是遗憾

## 关键情节点
1. **逼近的最后期限**：建立时间压力，强调选择的紧迫性
2. **过去的幽灵**：重要人物或过去事件的回归，增加情感复杂性
3. **误导转折**：看似明确的路径突然变得复杂或不可靠
4. **真相揭示**：关键信息的揭露，改变对全局的理解
5. **牺牲时刻**：认识到任何选择都需要放弃某些重要的东西
6. **决定时刻**：最终决定和立即后果的戏剧性展示

## 可能的转折点
- **意外盟友**：一个意想不到的人物提供关键帮助或观点
- **隐藏动机**：发现看似明确的选择背后有更深层次的阴谋
- **意外能力**：主角发现自己拥有之前未意识到的能力或资源
- **道德灰色地带**：原本清晰的对错界限变得模糊
- **双重背叛**：信任的人的意外背叛，或敌人的意外援助

## 可能的结局走向
1. **勇敢抉择**：选择风险较高但原则上正确的路径，面对未知后果
2. **妥协之路**：选择安全但需要妥协的路径，导致内心冲突
3. **第三条路**：在危急关头发现或创造出意想不到的第三种选择
4. **延迟决定**：试图推迟选择，导致命运由外部力量决定
5. **自我牺牲**：做出个人牺牲以保全更重要的价值或他人

## 主题探索
- 原则与务实之间的平衡
- 过去如何塑造当下决定
- 何时坚持己见，何时做出妥协
- 选择的真正成本与价值
- 命运与个人意志的相互作用

## 灵活应用指南
- 可适用于任何需要强烈道德抉择的场景
- 适合展示角色成长的关键转折点
- 可以根据故事类型调整紧迫感和后果的严重性
- 转折点可以被安排在故事的中间或接近高潮处
- 决定可以明确展示，也可以通过后果间接揭示', 'https://placehold.co/600x400/4a6bdf/ffffff?text=命运转折点预览', 4, 8, 85, 4, '剧情架构设计集', FALSE);

-- 获取最后插入的提示词ID
SET @last_prompt_id = LAST_INSERT_ID();

-- 插入对应的剧情卡详细信息
INSERT INTO plot_cards 
(prompt_id, plot_title, plot_stage, conflict_type, emotional_arc, plot_points, twists, potential_endings) 
VALUES 
(@last_prompt_id, '命运的分岔口', 'climax', '内心冲突与道德抉择', 
'起点：困惑与压力，被选择的重量压得喘不过气。发展：深度反思与自我怀疑，质疑过去所有决定。转折：关键领悟时刻，通常由意外线索或对话触发。高潮：面对真实自我，接受无论选择什么都会有所失去。余波：选择后的初步结果与情感适应，无论喜悦还是遗憾。',
'逼近的最后期限：建立时间压力，强调选择的紧迫性。过去的幽灵：重要人物或过去事件的回归，增加情感复杂性。误导转折：看似明确的路径突然变得复杂或不可靠。真相揭示：关键信息的揭露，改变对全局的理解。牺牲时刻：认识到任何选择都需要放弃某些重要的东西。决定时刻：最终决定和立即后果的戏剧性展示。',
'意外盟友：一个意想不到的人物提供关键帮助或观点。隐藏动机：发现看似明确的选择背后有更深层次的阴谋。意外能力：主角发现自己拥有之前未意识到的能力或资源。道德灰色地带：原本清晰的对错界限变得模糊。双重背叛：信任的人的意外背叛，或敌人的意外援助。',
'勇敢抉择：选择风险较高但原则上正确的路径，面对未知后果。妥协之路：选择安全但需要妥协的路径，导致内心冲突。第三条路：在危急关头发现或创造出意想不到的第三种选择。延迟决定：试图推迟选择，导致命运由外部力量决定。自我牺牲：做出个人牺牲以保全更重要的价值或他人。');

-- 获取最后插入的剧情卡ID
SET @last_plot_id = LAST_INSERT_ID();

-- 添加剧情卡标签关联
INSERT INTO plot_card_tags (plot_card_id, tag_id) 
SELECT @last_plot_id, id FROM plot_tags WHERE name IN ('个人成长', '命运', '三幕式');

-- 再插入一个示例剧情卡
INSERT INTO prompt_cards (prompt_text, preview_url, category_id, type_id, quality_score, rarity_level_id, source, is_ai_generated) VALUES
('# 阴谋揭露剧情卡
## 基本信息
剧情标题：隐藏真相
剧情阶段：冲突发展/转折
冲突类型：阴谋揭露与信任危机

## 核心情节
主角在无意中发现一个令人不安的线索，指向一个他们信任的组织或关键人物正在进行的秘密阴谋。随着调查深入，证据越来越多，但同时反抗证据的声音和障碍也不断增加。主角面临是否相信这些发现，以及如何在可能遭受严重后果的情况下揭露真相的艰难抉择。真相的揭露将改变主角对世界的认知，并迫使他们重新评估关键关系。

## 情感变化轨迹
- 起点：怀疑与不确定，想相信最好的可能性
- 发展：逐渐增长的恐惧和愤怒，对被欺骗的感觉
- 转折：孤立与绝望，发现看似无路可走
- 高潮：勇气与决心，决定无论代价如何都站在真相一边
- 余波：重新评估关系与信念，世界观的根本转变

## 关键情节点
1. **初始发现**：无意中接触到的可疑信息或事件
2. **表面调查**：初步寻求确认，得到表面上的解释
3. **深层挖掘**：发现第一个确凿证据，不容忽视的问题
4. **阻力与威胁**：来自相关方的压力，试图阻止调查
5. **真相确认**：找到决定性证据，确认阴谋的存在
6. **面临抉择**：决定如何处理这个真相，以及如何行动

## 可能的转折点
- **内部帮手**：一个内部人员冒险提供关键信息
- **双重阴谋**：发现表面阴谋下还有更深层次的计划
- **错误假设**：一个关键假设被证明是错误的，改变调查方向
- **时间压力**：发现阴谋即将在特定时间点实施，增加紧迫感
- **身份揭露**：主角自身与阴谋有意想不到的联系

## 可能的结局走向
1. **公开揭露**：冒险公开真相，面对随之而来的冲突和后果
2. **隐秘抵抗**：决定从内部悄悄阻止阴谋，不公开真相
3. **被迫妥协**：发现揭露真相的代价过高，被迫选择沉默或合作
4. **重塑联盟**：找到其他被欺骗的人，组成新的联盟共同对抗
5. **转变视角**：了解阴谋背后的原因，对情况有更复杂的理解

## 主题探索
- 真相的代价与价值
- 机构权力与个人道德的冲突
- 信任一旦破裂是否能够重建
- 安全感与真实之间的权衡
- 在不确定性中的道德决策

## 灵活应用指南
- 适用于政治惊悚、间谍、公司阴谋或家族秘密等设定
- 可以根据需要调整阴谋的规模，从个人欺骗到全球阴谋
- 节奏可快可慢，取决于故事整体风格
- 可以增加多层欺骗和误导，提高复杂性
- 主角可以是专业调查者或普通人偶然卷入', 'https://placehold.co/600x400/4a6bdf/ffffff?text=阴谋揭露预览', 4, 8, 88, 4, '剧情架构设计集', FALSE);

-- 获取最后插入的提示词ID
SET @last_prompt_id = LAST_INSERT_ID();

-- 插入对应的剧情卡详细信息
INSERT INTO plot_cards 
(prompt_id, plot_title, plot_stage, conflict_type, emotional_arc, plot_points, twists, potential_endings) 
VALUES 
(@last_prompt_id, '隐藏真相', 'conflict', '阴谋揭露与信任危机', 
'起点：怀疑与不确定，想相信最好的可能性。发展：逐渐增长的恐惧和愤怒，对被欺骗的感觉。转折：孤立与绝望，发现看似无路可走。高潮：勇气与决心，决定无论代价如何都站在真相一边。余波：重新评估关系与信念，世界观的根本转变。',
'初始发现：无意中接触到的可疑信息或事件。表面调查：初步寻求确认，得到表面上的解释。深层挖掘：发现第一个确凿证据，不容忽视的问题。阻力与威胁：来自相关方的压力，试图阻止调查。真相确认：找到决定性证据，确认阴谋的存在。面临抉择：决定如何处理这个真相，以及如何行动。',
'内部帮手：一个内部人员冒险提供关键信息。双重阴谋：发现表面阴谋下还有更深层次的计划。错误假设：一个关键假设被证明是错误的，改变调查方向。时间压力：发现阴谋即将在特定时间点实施，增加紧迫感。身份揭露：主角自身与阴谋有意想不到的联系。',
'公开揭露：冒险公开真相，面对随之而来的冲突和后果。隐秘抵抗：决定从内部悄悄阻止阴谋，不公开真相。被迫妥协：发现揭露真相的代价过高，被迫选择沉默或合作。重塑联盟：找到其他被欺骗的人，组成新的联盟共同对抗。转变视角：了解阴谋背后的原因，对情况有更复杂的理解。');

-- 获取最后插入的剧情卡ID
SET @last_plot_id = LAST_INSERT_ID();

-- 添加剧情卡标签关联
INSERT INTO plot_card_tags (plot_card_id, tag_id) 
SELECT @last_plot_id, id FROM plot_tags WHERE name IN ('背叛', '悬疑', '黑暗');
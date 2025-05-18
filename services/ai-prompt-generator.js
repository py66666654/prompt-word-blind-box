// AI提示词生成服务
const { pool } = require('../config/database');

// 模板库（用于构建AI生成的提示词）
const templates = {
    image: [
        { template: "{adjective} {subject} 在 {setting}，{lighting} 光线，{style} 风格，{resolution} 分辨率", complexity: "simple" },
        { template: "{adjective} {subject}，身处{setting}，周围是{surrounding}，{time_of_day}，{lighting} 光线，{camera} 视角，{style} 风格，{resolution} 分辨率", complexity: "medium" },
        { template: "一幅展现 {adjective} {subject} 的{style}作品，场景是{setting}，{time_of_day}，{surrounding}环绕，{lighting}光线照射，{weather}天气，{camera}视角，{color_scheme}配色，{resolution}分辨率，{additional_effect}", complexity: "complex" }
    ],
    text: [
        { template: "你是一位{expertise}专家。请{action}关于{subject}的内容。", complexity: "simple" },
        { template: "你是一位经验丰富的{expertise}专家。请{action}关于{subject}的内容，重点关注{focus_point}。使用{tone}的语气。", complexity: "medium" },
        { template: "你是一位世界级的{expertise}专家，拥有多年经验。请{action}关于{subject}的全面分析，特别关注{focus_point}。在回答中纳入{perspective}的视角，使用{tone}的语气，并确保{special_instruction}。", complexity: "complex" }
    ],
    video: [
        { template: "{subject}在{setting}中，{motion}，{lighting}光线，{time_span}，{resolution}分辨率", complexity: "simple" },
        { template: "{subject}在{setting}中{motion}，{time_of_day}，{lighting}光线，{camera_movement}，{time_span}，{resolution}分辨率，{style}风格", complexity: "medium" },
        { template: "一段展现{subject}在{setting}中{motion}的视频，{time_of_day}，{weather}天气，{lighting}光线，{camera_movement}，{transition}转场，{time_span}，{color_grading}色调，{resolution}分辨率，{style}风格，{sound_design}音效", complexity: "complex" }
    ],
    audio: [
        { template: "{genre}风格的音乐，带有{instrument}演奏，{mood}氛围", complexity: "simple" },
        { template: "{genre}风格的音乐，主要由{instrument}演奏，辅以{secondary_instrument}，{tempo}节奏，营造{mood}氛围", complexity: "medium" },
        { template: "一段融合{genre}和{secondary_genre}的音乐作品，由{instrument}主导，{secondary_instrument}和{tertiary_instrument}辅助，{tempo}节奏变化，{time_signature}拍号，{key}调性，{dynamics}力度变化，整体营造{mood}氛围，适合{usage_scenario}", complexity: "complex" }
    ],
    agent: [
        { template: "你是一个{role}。你的任务是{task}。", complexity: "simple" },
        { template: "你是一个专业的{role}。你的任务是{task}，重点关注{focus_area}，并确保{requirement}。", complexity: "medium" },
        { template: "你是一个经验丰富的{role}，专长于{specialization}。你的主要任务是{task}，需要特别关注{focus_area}，确保{requirement}，并应用{methodology}方法。在执行过程中，请{special_instruction}，并在最后{output_format}。", complexity: "complex" }
    ]
};

// 词汇库（用于填充模板）
const vocabulary = {
    // 图像提示词词汇
    image: {
        adjective: ["神秘的", "宏伟的", "微小的", "古老的", "未来派的", "梦幻的", "写实的", "抽象的", "超现实的", "荒凉的", "繁华的", "宁静的", "动感的", "精致的", "粗犷的"],
        subject: ["风景", "人物肖像", "城市街道", "宇宙场景", "海底世界", "森林", "山脉", "机械结构", "动物", "花卉植物", "建筑物", "交通工具", "食物", "幻想生物", "艺术品"],
        setting: ["城市中心", "荒野", "海边", "山顶", "沙漠", "热带雨林", "太空站", "古代遗迹", "现代实验室", "地下洞穴", "浮空城市", "冰川", "火山口", "童话城堡", "外星环境"],
        surrounding: ["繁茂的植被", "破败的建筑", "先进的科技设备", "漂浮的岩石", "流动的水体", "迷雾", "霓虹灯", "星云", "古老的雕像", "飞行的生物", "漫天的星辰", "垂直的悬崖", "巨型水晶"],
        time_of_day: ["黎明", "正午", "黄昏", "午夜", "蓝调时分", "黄金时段", "月光下", "星空下"],
        lighting: ["柔和的", "强烈的", "自然的", "霓虹", "烛光", "逆光", "侧光", "顶光", "环境光", "体积光", "聚光", "散射光"],
        weather: ["晴朗", "多云", "雨天", "雪天", "雾霾", "雷暴", "沙尘暴", "极光"],
        camera: ["广角", "微距", "鱼眼", "长焦", "航拍", "低角度", "高角度", "第一人称", "全景", "倾斜移轴"],
        style: ["油画", "水彩画", "素描", "像素艺术", "赛博朋克", "蒸汽朋克", "波普艺术", "极简主义", "印象派", "超现实主义", "立体主义", "浮世绘", "黑白摄影", "动漫", "3D渲染"],
        resolution: ["8K", "4K", "高清", "超高清", "摄影级别", "精细纹理"],
        color_scheme: ["单色调", "互补色", "暖色调", "冷色调", "高对比度", "低饱和度", "鲜艳色彩", "柔和色调", "复古色板"],
        additional_effect: ["景深效果", "运动模糊", "光晕", "光斑", "颗粒感", "烟雾效果", "水面反射", "玻璃折射", "细节丰富"]
    },
    
    // 文字对话提示词词汇
    text: {
        expertise: ["文学", "历史", "科学", "心理学", "哲学", "经济学", "营销", "医学", "法律", "教育", "职业发展", "个人成长", "技术", "艺术鉴赏", "文化研究", "数据分析"],
        action: ["分析", "解释", "提供建议", "创建指南", "回答问题", "评估", "总结", "比较", "预测", "批判性思考", "辩论", "策划", "教授", "简化复杂概念"],
        subject: ["现代文学趋势", "历史事件影响", "科学发现", "心理健康策略", "哲学思想流派", "经济政策", "品牌策略", "医疗进展", "法律条款解释", "教育方法", "职业规划", "自我提升技巧", "新兴技术", "艺术流派", "跨文化现象", "数据可视化"],
        focus_point: ["长期影响", "实际应用", "关键原则", "常见误解", "最新研究", "历史背景", "未来趋势", "伦理考量", "最佳实践", "案例研究", "理论基础", "创新方向"],
        tone: ["专业", "友好", "教育性", "批判性", "鼓励", "客观", "热情", "权威", "对话式", "幽默", "严肃", "简洁"],
        perspective: ["历史", "跨文化", "跨学科", "未来主义", "实用主义", "理论", "社会", "经济", "技术", "伦理", "环境", "个人"],
        special_instruction: ["提供实际示例", "引用可靠来源", "包含数据支持", "使用简单语言", "提供视觉辅助说明", "添加行动步骤", "解答常见问题", "预测潜在问题"]
    },
    
    // 视频生成提示词词汇
    video: {
        subject: ["自然风光", "城市生活", "人物特写", "动物行为", "机械运动", "舞蹈表演", "体育活动", "科学实验", "建筑细节", "艺术创作过程", "交通流", "自然现象", "食物制作", "文化庆典"],
        setting: ["城市街道", "自然公园", "海滩", "山区", "森林", "沙漠", "实验室", "工作室", "体育场", "博物馆", "餐厅", "办公室", "工厂", "太空", "水下"],
        motion: ["缓慢移动", "快速运动", "舞动", "漂浮", "旋转", "跳跃", "下落", "流动", "爆发", "生长", "消散", "穿梭", "波动"],
        time_of_day: ["清晨", "正午", "黄昏", "夜晚", "日出", "日落", "蓝调时分", "星空下"],
        lighting: ["自然", "人工", "柔和", "强烈", "彩色", "霓虹", "逆光", "侧光", "顶光", "环境光", "体积光"],
        weather: ["晴朗", "多云", "雨天", "雪天", "雾气", "雷暴", "阳光明媚", "阴天"],
        camera_movement: ["稳定", "慢速平移", "快速平移", "俯拍", "仰拍", "跟踪镜头", "环绕", "空中俯视", "摇晃", "变焦", "定格", "滑轨", "360度旋转"],
        time_span: ["实时", "延时摄影", "慢动作", "快动作", "静止帧", "时间片段", "循环", "昼夜交替"],
        transition: ["淡入淡出", "切换", "溶解", "擦除", "滑动", "缩放", "翻转", "分割屏幕", "形态变换"],
        color_grading: ["自然色调", "高对比度", "单色调", "冷色调", "暖色调", "复古风格", "电影级色彩", "饱和", "去饱和", "HDR效果"],
        resolution: ["4K", "8K", "高清", "影院级质量", "标准分辨率", "超高清"],
        style: ["纪录片", "电影级", "动画", "微电影", "MV", "广告片", "实验性", "极简主义", "艺术片", "科幻风"],
        sound_design: ["环境音", "配乐", "无声", "语音解说", "自然音效", "合成音效", "节奏音效", "3D音效", "ASMR音效"]
    },
    
    // 音频生成提示词词汇
    audio: {
        genre: ["古典", "爵士", "电子", "摇滚", "民谣", "嘻哈", "环境", "实验", "世界音乐", "流行", "蓝调", "乡村", "金属"],
        secondary_genre: ["古典", "爵士", "电子", "摇滚", "民谣", "嘻哈", "环境", "实验", "世界音乐", "流行", "蓝调", "乡村", "金属"],
        instrument: ["钢琴", "吉他", "小提琴", "电子合成器", "萨克斯风", "鼓", "贝斯", "竖琴", "大提琴", "单簧管", "电子鼓", "风琴", "口哨", "长笛"],
        secondary_instrument: ["钢琴", "吉他", "小提琴", "电子合成器", "萨克斯风", "鼓", "贝斯", "竖琴", "大提琴", "单簧管", "电子鼓", "风琴", "口哨", "长笛"],
        tertiary_instrument: ["钢琴", "吉他", "小提琴", "电子合成器", "萨克斯风", "鼓", "贝斯", "竖琴", "大提琴", "单簧管", "电子鼓", "风琴", "口哨", "长笛"],
        tempo: ["缓慢", "中等", "快速", "变速", "渐快", "渐慢", "律动", "自由节奏", "稳定", "波动", "脉冲"],
        mood: ["放松", "激动", "忧郁", "欢快", "神秘", "紧张", "梦幻", "怀旧", "壮丽", "恐怖", "平静", "温暖", "冷酷", "奇幻"],
        time_signature: ["4/4", "3/4", "6/8", "5/4", "7/8", "不规则", "变拍"],
        key: ["C大调", "A小调", "G大调", "E小调", "F大调", "D小调", "降B大调", "升F小调", "转调", "无调性"],
        dynamics: ["渐强", "渐弱", "强弱对比", "持续强", "持续弱", "中等力度", "突强", "突弱", "波动"],
        usage_scenario: ["冥想", "工作背景", "电影配乐", "游戏音效", "广告", "舞蹈表演", "艺术展览", "健身训练", "睡眠辅助", "旅行视频"]
    },
    
    // Agent提示词词汇
    agent: {
        role: ["研究助手", "创意顾问", "项目经理", "教育导师", "技术专家", "数据分析师", "内容创作者", "问题解决专家", "战略规划师", "编程助手", "设计顾问", "市场分析师", "财务顾问", "心理健康支持者"],
        specialization: ["数据科学", "创意写作", "软件开发", "教育技术", "人工智能", "市场营销", "财务分析", "心理咨询", "用户体验设计", "产品管理", "研究方法", "战略规划", "内容策划", "系统架构"],
        task: ["分析数据", "创建内容", "开发解决方案", "教授概念", "解决问题", "设计原型", "规划项目", "评估选项", "生成创意", "优化流程", "回答问题", "创建报告", "制定策略", "提供建议"],
        focus_area: ["效率", "创新", "准确性", "用户体验", "成本效益", "可扩展性", "实用性", "教育价值", "技术可行性", "市场适应性", "长期可持续性", "最佳实践", "伦理考量", "理论基础"],
        requirement: ["考虑多种观点", "提供具体示例", "引用可靠来源", "适应不同技能水平", "关注实际应用", "考虑边缘情况", "优先考虑简单解决方案", "包含详细说明", "支持跨学科方法", "考虑资源限制"],
        methodology: ["设计思维", "敏捷开发", "系统思考", "实证研究", "用户中心设计", "迭代方法", "结构化分析", "创意思维", "协作方法", "比较分析", "案例研究", "实验方法"],
        special_instruction: ["提供逐步指导", "包含替代方案", "使用可视化元素", "考虑不同水平的专业知识", "关注实际情况", "预测潜在问题", "提供简短摘要", "保持客观中立", "表达复杂想法时使用隐喻", "在适当时添加幽默元素"],
        output_format: ["提供结构化总结", "以常见问题解答格式呈现", "包含执行摘要", "添加视觉表示", "提供检查清单", "包含资源列表", "添加后续步骤建议", "为进一步学习提供资源", "包含决策树"]
    }
};

// 从数组中随机选择一个元素
function getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

// 从词汇库中填充模板
function fillTemplate(template, type) {
    const words = template.match(/{([^}]+)}/g);
    
    if (!words) return template;
    
    let filledTemplate = template;
    const typeVocabulary = vocabulary[type];
    
    if (!typeVocabulary) return template;
    
    words.forEach(word => {
        const key = word.slice(1, -1); // 移除 { }
        if (typeVocabulary[key]) {
            const replacement = getRandomElement(typeVocabulary[key]);
            filledTemplate = filledTemplate.replace(word, replacement);
        }
    });
    
    return filledTemplate;
}

// 生成随机质量分数（根据复杂性）
function generateQualityScore(complexity) {
    switch (complexity) {
        case 'simple':
            // 生成0-50之间的分数
            return Math.floor(Math.random() * 51);
        case 'medium':
            // 生成30-70之间的分数
            return Math.floor(Math.random() * 41) + 30;
        case 'complex':
            // 生成50-90之间的分数
            return Math.floor(Math.random() * 41) + 50;
        default:
            return Math.floor(Math.random() * 101);
    }
}

// 使用预设图片作为预览
// 实际应用中可能会调用AI图像生成API，但这里简化为静态图片
function getPreviewUrl(type, score) {
    // 这里使用占位图片，实际应用中可能会有不同的预览图
    return `https://placehold.co/600x400/4a6bdf/ffffff?text=AI生成的${type}提示词`;
}

// 获取与分数对应的稀有度等级ID
async function getRarityLevelId(score) {
    try {
        const [rows] = await pool.query(`
            SELECT id 
            FROM rarity_levels 
            WHERE min_score <= ? AND max_score >= ?
            LIMIT 1
        `, [score, score]);
        
        if (rows.length > 0) {
            return rows[0].id;
        }
        
        // 默认返回普通等级（最低等级）
        return 1;
    } catch (error) {
        console.error('获取稀有度等级失败:', error);
        return 1; // 出错时返回默认等级
    }
}

// 生成AI提示词
async function generateAIPrompt(type) {
    try {
        // 验证类型是否有效
        if (!templates[type]) {
            throw new Error(`无效的提示词类型: ${type}`);
        }
        
        // 随机选择一个复杂度
        const templateObject = getRandomElement(templates[type]);
        const { template, complexity } = templateObject;
        
        // 填充模板
        const promptText = fillTemplate(template, type);
        
        // 生成质量分数
        const qualityScore = generateQualityScore(complexity);
        
        // 获取预览图URL
        const previewUrl = getPreviewUrl(type, qualityScore);
        
        // 获取与分数对应的稀有度等级
        const rarityLevelId = await getRarityLevelId(qualityScore);
        
        // 获取该类型的ID
        const [typeRows] = await pool.query('SELECT id FROM prompt_types WHERE name = ?', [type]);
        const typeId = (typeRows.length > 0) ? typeRows[0].id : 1; // 默认为1
        
        // 随机选择一个分类ID
        const [categoryRows] = await pool.query('SELECT id FROM categories');
        const categoryId = getRandomElement(categoryRows).id;
        
        // 创建提示词记录
        const [result] = await pool.query(`
            INSERT INTO prompt_cards (
                prompt_text, 
                preview_url, 
                category_id, 
                type_id, 
                quality_score, 
                rarity_level_id, 
                source, 
                is_ai_generated
            ) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)
        `, [promptText, previewUrl, categoryId, typeId, qualityScore, rarityLevelId, 'AI自动生成']);
        
        // 获取新创建的提示词
        const [promptRows] = await pool.query(`
            SELECT pc.*, pt.name as type_name, c.name as category_name, rl.name as rarity_name, rl.color_code
            FROM prompt_cards pc
            JOIN prompt_types pt ON pc.type_id = pt.id
            JOIN categories c ON pc.category_id = c.id
            JOIN rarity_levels rl ON pc.rarity_level_id = rl.id
            WHERE pc.id = ?
        `, [result.insertId]);
        
        return promptRows[0];
    } catch (error) {
        console.error('生成AI提示词失败:', error);
        throw error;
    }
}

// 根据类型生成AI提示词
async function generatePromptByType(type) {
    return await generateAIPrompt(type);
}

// 生成随机类型的AI提示词
async function generateRandomPrompt() {
    const types = Object.keys(templates);
    const randomType = getRandomElement(types);
    return await generateAIPrompt(randomType);
}

module.exports = {
    generatePromptByType,
    generateRandomPrompt
};
// 提示词控制器（更新版）
const { pool } = require('../config/database');

// 随机选择函数（基于权重）
function weightedRandom(items, weights) {
    // 计算权重总和
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    
    // 生成随机数
    let random = Math.random() * totalWeight;
    
    // 根据权重选择项目
    for (let i = 0; i < items.length; i++) {
        random -= weights[i];
        if (random <= 0) {
            return items[i];
        }
    }
    
    // 默认返回最后一项（以防万一）
    return items[items.length - 1];
}

// 获取随机提示词卡片，使用分层概率
exports.getRandomPrompt = async (req, res) => {
    try {
        // Step 1: 首先决定是抽取AI生成的提示词(50%)还是预设提示词(50%)
        const useAiGenerated = Math.random() < 0.5;
        
        if (useAiGenerated) {
            // 获取所有AI生成的提示词
            const [aiPrompts] = await pool.query(`
                SELECT pc.*, pt.name as type_name, c.name as category_name, rl.name as rarity_name, rl.color_code
                FROM prompt_cards pc
                JOIN prompt_types pt ON pc.type_id = pt.id
                JOIN categories c ON pc.category_id = c.id
                JOIN rarity_levels rl ON pc.rarity_level_id = rl.id
                WHERE pc.is_ai_generated = TRUE
                ORDER BY RAND()
                LIMIT 1
            `);
            
            if (aiPrompts.length > 0) {
                return res.status(200).json({
                    ...aiPrompts[0],
                    is_ai_generated: true
                });
            }
            
            // 如果没有AI生成的提示词，继续使用预设提示词
        }
        
        // Step 2: 获取所有稀有度等级及其概率
        const [rarityLevels] = await pool.query(`
            SELECT id, name, probability
            FROM rarity_levels
            ORDER BY min_score
        `);
        
        if (rarityLevels.length === 0) {
            return res.status(404).json({ message: '没有找到稀有度等级数据' });
        }
        
        // 提取稀有度ID和概率
        const rarityIds = rarityLevels.map(level => level.id);
        const rarityProbabilities = rarityLevels.map(level => parseFloat(level.probability));
        
        // Step 3: 根据概率选择一个稀有度等级
        const selectedRarityId = weightedRandom(rarityIds, rarityProbabilities);
        
        // Step 4: 获取所选稀有度的所有提示词
        const [promptsOfRarity] = await pool.query(`
            SELECT pc.*, pt.name as type_name, c.name as category_name, rl.name as rarity_name, rl.color_code
            FROM prompt_cards pc
            JOIN prompt_types pt ON pc.type_id = pt.id
            JOIN categories c ON pc.category_id = c.id
            JOIN rarity_levels rl ON pc.rarity_level_id = rl.id
            WHERE pc.rarity_level_id = ? AND pc.is_ai_generated = FALSE
            ORDER BY RAND()
            LIMIT 1
        `, [selectedRarityId]);
        
        if (promptsOfRarity.length === 0) {
            // 如果所选稀有度没有提示词，随机抽取任何稀有度的提示词
            const [anyPrompt] = await pool.query(`
                SELECT pc.*, pt.name as type_name, c.name as category_name, rl.name as rarity_name, rl.color_code
                FROM prompt_cards pc
                JOIN prompt_types pt ON pc.type_id = pt.id
                JOIN categories c ON pc.category_id = c.id
                JOIN rarity_levels rl ON pc.rarity_level_id = rl.id
                WHERE pc.is_ai_generated = FALSE
                ORDER BY RAND()
                LIMIT 1
            `);
            
            if (anyPrompt.length === 0) {
                return res.status(404).json({ message: '没有找到提示词卡片' });
            }
            
            return res.status(200).json({
                ...anyPrompt[0],
                is_ai_generated: false
            });
        }
        
        res.status(200).json({
            ...promptsOfRarity[0],
            is_ai_generated: false
        });
    } catch (error) {
        console.error('获取随机提示词失败:', error);
        res.status(500).json({ message: '服务器错误', error: error.message });
    }
};

// 按类型获取随机提示词
exports.getRandomPromptByType = async (req, res) => {
    try {
        const { typeId } = req.params;
        
        // 获取指定类型的随机提示词
        const [promptsOfType] = await pool.query(`
            SELECT pc.*, pt.name as type_name, c.name as category_name, rl.name as rarity_name, rl.color_code
            FROM prompt_cards pc
            JOIN prompt_types pt ON pc.type_id = pt.id
            JOIN categories c ON pc.category_id = c.id
            JOIN rarity_levels rl ON pc.rarity_level_id = rl.id
            WHERE pc.type_id = ?
            ORDER BY RAND()
            LIMIT 1
        `, [typeId]);
        
        if (promptsOfType.length === 0) {
            return res.status(404).json({ message: '该类型没有提示词卡片' });
        }
        
        res.status(200).json(promptsOfType[0]);
    } catch (error) {
        console.error('按类型获取随机提示词失败:', error);
        res.status(500).json({ message: '服务器错误', error: error.message });
    }
};

// 获取所有提示词类型
exports.getAllPromptTypes = async (req, res) => {
    try {
        const [types] = await pool.query(`
            SELECT pt.*, COUNT(pc.id) as prompt_count
            FROM prompt_types pt
            LEFT JOIN prompt_cards pc ON pt.id = pc.type_id
            GROUP BY pt.id
            ORDER BY pt.name
        `);
        
        res.status(200).json(types);
    } catch (error) {
        console.error('获取提示词类型失败:', error);
        res.status(500).json({ message: '服务器错误', error: error.message });
    }
};

// 获取所有稀有度等级
exports.getAllRarityLevels = async (req, res) => {
    try {
        const [levels] = await pool.query(`
            SELECT rl.*, COUNT(pc.id) as prompt_count
            FROM rarity_levels rl
            LEFT JOIN prompt_cards pc ON rl.id = pc.rarity_level_id
            GROUP BY rl.id
            ORDER BY rl.min_score
        `);
        
        res.status(200).json(levels);
    } catch (error) {
        console.error('获取稀有度等级失败:', error);
        res.status(500).json({ message: '服务器错误', error: error.message });
    }
};

// 根据类别获取提示词
exports.getPromptsByCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        const { page = 1, limit = 10, typeId, rarityId } = req.query;
        
        const offset = (page - 1) * limit;
        const params = [categoryId];
        
        // 构建查询条件
        let whereClause = 'WHERE pc.category_id = ?';
        
        if (typeId) {
            whereClause += ' AND pc.type_id = ?';
            params.push(typeId);
        }
        
        if (rarityId) {
            whereClause += ' AND pc.rarity_level_id = ?';
            params.push(rarityId);
        }
        
        // 查询提示词
        const [rows] = await pool.query(`
            SELECT pc.*, pt.name as type_name, c.name as category_name, rl.name as rarity_name, rl.color_code
            FROM prompt_cards pc
            JOIN prompt_types pt ON pc.type_id = pt.id
            JOIN categories c ON pc.category_id = c.id
            JOIN rarity_levels rl ON pc.rarity_level_id = rl.id
            ${whereClause}
            ORDER BY pc.quality_score DESC
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), parseInt(offset)]);
        
        // 获取总数以支持分页
        const [countResult] = await pool.query(`
            SELECT COUNT(*) as total
            FROM prompt_cards pc
            ${whereClause}
        `, params);
        
        const total = countResult[0].total;
        
        res.status(200).json({
            data: rows,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('获取类别提示词失败:', error);
        res.status(500).json({ message: '服务器错误', error: error.message });
    }
};

// 获取所有类别
exports.getAllCategories = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT c.*, COUNT(pc.id) as prompt_count
            FROM categories c
            LEFT JOIN prompt_cards pc ON c.id = pc.category_id
            GROUP BY c.id
            ORDER BY c.name
        `);
        
        res.status(200).json(rows);
    } catch (error) {
        console.error('获取所有类别失败:', error);
        res.status(500).json({ message: '服务器错误', error: error.message });
    }
};

// 获取单个提示词详情
exports.getPromptById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const [rows] = await pool.query(`
            SELECT pc.*, pt.name as type_name, c.name as category_name, rl.name as rarity_name, rl.color_code
            FROM prompt_cards pc
            JOIN prompt_types pt ON pc.type_id = pt.id
            JOIN categories c ON pc.category_id = c.id
            JOIN rarity_levels rl ON pc.rarity_level_id = rl.id
            WHERE pc.id = ?
        `, [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ message: '提示词不存在' });
        }
        
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('获取提示词详情失败:', error);
        res.status(500).json({ message: '服务器错误', error: error.message });
    }
};
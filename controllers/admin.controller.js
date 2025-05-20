// 管理员控制器
const { pool } = require('../config/database');
const { generatePromptByType, generateRandomPrompt } = require('../services/ai-prompt-generator');
const { autoFilterContent } = require('../services/content-filter.service');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// 获取仪表盘数据
exports.getDashboardData = async (req, res) => {
    try {
        // 验证用户是否有管理员权限
        if (!['moderator', 'admin', 'super_admin'].includes(req.user.role)) {
            return res.status(403).json({ message: '没有权限访问此资源' });
        }

        // 获取提示词总数
        const [promptCount] = await pool.query('SELECT COUNT(*) as count FROM prompt_cards');
        
        // 获取用户总数
        const [userCount] = await pool.query('SELECT COUNT(*) as count FROM users');
        
        // 获取今日抽卡次数
        const [drawCount] = await pool.query(`
            SELECT COUNT(*) as count FROM draw_history 
            WHERE DATE(drawn_at) = CURDATE()
        `);
        
        // 获取待审核内容数
        const [pendingCount] = await pool.query(`
            SELECT COUNT(*) as count FROM prompt_cards 
            WHERE status = 'pending'
        `);
        
        // 获取用户增长趋势（过去7天）
        const [userGrowth] = await pool.query(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as count
            FROM users
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date
        `);
        
        // 获取提示词类型分布
        const [typeDistribution] = await pool.query(`
            SELECT 
                pt.name,
                COUNT(pc.id) as count
            FROM prompt_cards pc
            JOIN prompt_types pt ON pc.type_id = pt.id
            GROUP BY pt.id
            ORDER BY count DESC
        `);
        
        // 获取最近活动
        const [recentActivities] = await pool.query(`
            SELECT 
                'prompt_added' as type,
                id,
                created_at,
                SUBSTRING(prompt_text, 1, 50) as description,
                source
            FROM prompt_cards
            ORDER BY created_at DESC
            LIMIT 5
        `);
        
        res.status(200).json({
            counts: {
                prompts: promptCount[0].count,
                users: userCount[0].count,
                draws_today: drawCount[0].count,
                pending_content: pendingCount[0].count
            },
            user_growth: userGrowth,
            type_distribution: typeDistribution,
            recent_activities: recentActivities
        });
    } catch (error) {
        console.error('获取仪表盘数据失败:', error);
        res.status(500).json({ message: '服务器错误', error: error.message });
    }
};

// 获取提示词列表 (包含筛选和分页)
exports.getPrompts = async (req, res) => {
    try {
        // 验证用户是否有管理员权限
        if (!['moderator', 'admin', 'super_admin'].includes(req.user.role)) {
            return res.status(403).json({ message: '没有权限访问此资源' });
        }
        
        // 获取查询参数
        const { 
            page = 1, 
            limit = 10,
            categoryId,
            typeId,
            rarityId,
            status,
            isAiGenerated,
            search,
            sortBy = 'created_at',
            sortOrder = 'desc'
        } = req.query;
        
        // 计算偏移量
        const offset = (page - 1) * parseInt(limit);
        
        // 构建查询条件
        const conditions = [];
        const params = [];
        
        if (categoryId) {
            conditions.push('pc.category_id = ?');
            params.push(categoryId);
        }
        
        if (typeId) {
            conditions.push('pc.type_id = ?');
            params.push(typeId);
        }
        
        if (rarityId) {
            conditions.push('pc.rarity_level_id = ?');
            params.push(rarityId);
        }
        
        if (status) {
            conditions.push('pc.status = ?');
            params.push(status);
        }
        
        if (isAiGenerated !== undefined) {
            conditions.push('pc.is_ai_generated = ?');
            params.push(isAiGenerated === 'true' || isAiGenerated === true);
        }
        
        if (search) {
            conditions.push('(pc.prompt_text LIKE ? OR pc.source LIKE ?)');
            params.push(`%${search}%`, `%${search}%`);
        }
        
        // 构建WHERE子句
        const whereClause = conditions.length > 0 
            ? `WHERE ${conditions.join(' AND ')}` 
            : '';
        
        // 验证并处理排序
        const allowedSortFields = ['id', 'created_at', 'quality_score', 'status'];
        const allowedSortOrders = ['asc', 'desc'];
        
        const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
        const validSortOrder = allowedSortOrders.includes(sortOrder.toLowerCase()) 
            ? sortOrder.toLowerCase() 
            : 'desc';
        
        // 查询提示词数据
        const [rows] = await pool.query(`
            SELECT 
                pc.id, pc.prompt_text, pc.preview_url, pc.quality_score, 
                pc.source, pc.is_ai_generated, pc.status, pc.created_at,
                c.id as category_id, c.name as category_name,
                pt.id as type_id, pt.name as type_name,
                rl.id as rarity_level_id, rl.name as rarity_name, rl.color_code
            FROM prompt_cards pc
            JOIN categories c ON pc.category_id = c.id
            JOIN prompt_types pt ON pc.type_id = pt.id
            JOIN rarity_levels rl ON pc.rarity_level_id = rl.id
            ${whereClause}
            ORDER BY pc.${validSortBy} ${validSortOrder}
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), offset]);
        
        // 获取总记录数
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
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('获取提示词列表失败:', error);
        res.status(500).json({ message: '服务器错误', error: error.message });
    }
};

// 获取单个提示词详情
exports.getPromptById = async (req, res) => {
    try {
        // 验证用户是否有管理员权限
        if (!['moderator', 'admin', 'super_admin'].includes(req.user.role)) {
            return res.status(403).json({ message: '没有权限访问此资源' });
        }
        
        const { promptId } = req.params;
        
        // 获取提示词详情
        const [prompt] = await pool.query(`
            SELECT 
                pc.id, pc.prompt_text, pc.preview_url, pc.quality_score, 
                pc.source, pc.is_ai_generated, pc.status, pc.created_at,
                c.id as category_id, c.name as category_name,
                pt.id as type_id, pt.name as type_name,
                rl.id as rarity_level_id, rl.name as rarity_name, rl.color_code
            FROM prompt_cards pc
            JOIN categories c ON pc.category_id = c.id
            JOIN prompt_types pt ON pc.type_id = pt.id
            JOIN rarity_levels rl ON pc.rarity_level_id = rl.id
            WHERE pc.id = ?
        `, [promptId]);
        
        if (prompt.length === 0) {
            return res.status(404).json({ message: '提示词不存在' });
        }
        
        res.status(200).json(prompt[0]);
    } catch (error) {
        console.error('获取提示词详情失败:', error);
        res.status(500).json({ message: '服务器错误', error: error.message });
    }
};

// 创建新提示词
exports.createPrompt = async (req, res) => {
    try {
        // 验证用户是否有管理员权限
        if (!['admin', 'super_admin'].includes(req.user.role)) {
            return res.status(403).json({ message: '没有权限访问此资源' });
        }
        
        const { 
            prompt_text, 
            category_id, 
            type_id, 
            quality_score,
            preview_url,
            source,
            is_ai_generated,
            status = 'pending' 
        } = req.body;
        
        // 验证必填字段
        if (!prompt_text || !category_id || !type_id) {
            return res.status(400).json({ message: '提示词内容、分类和类型为必填项' });
        }
        
        // 验证字段类型和范围
        if (quality_score < 0 || quality_score > 100) {
            return res.status(400).json({ message: '质量分数必须在0-100之间' });
        }
        
        // 获取对应的稀有度等级
        const [rarityLevels] = await pool.query(`
            SELECT id FROM rarity_levels
            WHERE min_score <= ? AND max_score >= ?
            LIMIT 1
        `, [quality_score, quality_score]);
        
        if (rarityLevels.length === 0) {
            return res.status(400).json({ message: '无法确定稀有度等级' });
        }
        
        const rarityLevelId = rarityLevels[0].id;
        
        // 创建提示词
        const [result] = await pool.query(`
            INSERT INTO prompt_cards (
                prompt_text,
                category_id,
                type_id,
                quality_score,
                rarity_level_id,
                preview_url,
                source,
                is_ai_generated,
                status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            prompt_text,
            category_id,
            type_id,
            quality_score,
            rarityLevelId,
            preview_url || null,
            source || null,
            is_ai_generated === true,
            status
        ]);
        
        // 执行内容过滤检查
        await autoFilterContent(prompt_text, 'prompt', result.insertId);
        
        // 获取新创建的提示词
        const [newPrompt] = await pool.query(`
            SELECT 
                pc.id, pc.prompt_text, pc.preview_url, pc.quality_score, 
                pc.source, pc.is_ai_generated, pc.status, pc.created_at,
                c.id as category_id, c.name as category_name,
                pt.id as type_id, pt.name as type_name,
                rl.id as rarity_level_id, rl.name as rarity_name, rl.color_code
            FROM prompt_cards pc
            JOIN categories c ON pc.category_id = c.id
            JOIN prompt_types pt ON pc.type_id = pt.id
            JOIN rarity_levels rl ON pc.rarity_level_id = rl.id
            WHERE pc.id = ?
        `, [result.insertId]);
        
        res.status(201).json({
            message: '提示词创建成功',
            prompt: newPrompt[0]
        });
    } catch (error) {
        console.error('创建提示词失败:', error);
        res.status(500).json({ message: '服务器错误', error: error.message });
    }
};

// 更新提示词
exports.updatePrompt = async (req, res) => {
    try {
        // 验证用户是否有管理员权限
        if (!['admin', 'super_admin'].includes(req.user.role)) {
            return res.status(403).json({ message: '没有权限访问此资源' });
        }
        
        const { promptId } = req.params;
        const { 
            prompt_text, 
            category_id, 
            type_id, 
            quality_score,
            preview_url,
            source,
            is_ai_generated,
            status
        } = req.body;
        
        // 验证提示词是否存在
        const [existingPrompt] = await pool.query('SELECT id FROM prompt_cards WHERE id = ?', [promptId]);
        
        if (existingPrompt.length === 0) {
            return res.status(404).json({ message: '提示词不存在' });
        }
        
        // 验证必填字段
        if (!prompt_text || !category_id || !type_id) {
            return res.status(400).json({ message: '提示词内容、分类和类型为必填项' });
        }
        
        // 验证字段类型和范围
        if (quality_score < 0 || quality_score > 100) {
            return res.status(400).json({ message: '质量分数必须在0-100之间' });
        }
        
        // 获取对应的稀有度等级
        const [rarityLevels] = await pool.query(`
            SELECT id FROM rarity_levels
            WHERE min_score <= ? AND max_score >= ?
            LIMIT 1
        `, [quality_score, quality_score]);
        
        if (rarityLevels.length === 0) {
            return res.status(400).json({ message: '无法确定稀有度等级' });
        }
        
        const rarityLevelId = rarityLevels[0].id;
        
        // 更新提示词
        await pool.query(`
            UPDATE prompt_cards SET
                prompt_text = ?,
                category_id = ?,
                type_id = ?,
                quality_score = ?,
                rarity_level_id = ?,
                preview_url = ?,
                source = ?,
                is_ai_generated = ?,
                status = ?
            WHERE id = ?
        `, [
            prompt_text,
            category_id,
            type_id,
            quality_score,
            rarityLevelId,
            preview_url || null,
            source || null,
            is_ai_generated === true,
            status,
            promptId
        ]);
        
        // 如果内容发生变化，执行内容过滤检查
        await autoFilterContent(prompt_text, 'prompt', promptId);
        
        // 获取更新后的提示词
        const [updatedPrompt] = await pool.query(`
            SELECT 
                pc.id, pc.prompt_text, pc.preview_url, pc.quality_score, 
                pc.source, pc.is_ai_generated, pc.status, pc.created_at,
                c.id as category_id, c.name as category_name,
                pt.id as type_id, pt.name as type_name,
                rl.id as rarity_level_id, rl.name as rarity_name, rl.color_code
            FROM prompt_cards pc
            JOIN categories c ON pc.category_id = c.id
            JOIN prompt_types pt ON pc.type_id = pt.id
            JOIN rarity_levels rl ON pc.rarity_level_id = rl.id
            WHERE pc.id = ?
        `, [promptId]);
        
        res.status(200).json({
            message: '提示词更新成功',
            prompt: updatedPrompt[0]
        });
    } catch (error) {
        console.error('更新提示词失败:', error);
        res.status(500).json({ message: '服务器错误', error: error.message });
    }
};

// 删除提示词
exports.deletePrompt = async (req, res) => {
    try {
        // 验证用户是否有管理员权限
        if (!['admin', 'super_admin'].includes(req.user.role)) {
            return res.status(403).json({ message: '没有权限访问此资源' });
        }
        
        const { promptId } = req.params;
        
        // 验证提示词是否存在
        const [existingPrompt] = await pool.query('SELECT id FROM prompt_cards WHERE id = ?', [promptId]);
        
        if (existingPrompt.length === 0) {
            return res.status(404).json({ message: '提示词不存在' });
        }
        
        // 删除提示词
        await pool.query('DELETE FROM prompt_cards WHERE id = ?', [promptId]);
        
        res.status(200).json({ message: '提示词删除成功' });
    } catch (error) {
        console.error('删除提示词失败:', error);
        res.status(500).json({ message: '服务器错误', error: error.message });
    }
};

// 批量删除提示词
exports.bulkDeletePrompts = async (req, res) => {
    try {
        // 验证用户是否有管理员权限
        if (!['admin', 'super_admin'].includes(req.user.role)) {
            return res.status(403).json({ message: '没有权限访问此资源' });
        }
        
        const { promptIds } = req.body;
        
        if (!Array.isArray(promptIds) || promptIds.length === 0) {
            return res.status(400).json({ message: '未提供有效的提示词ID列表' });
        }
        
        // 执行批量删除
        const [result] = await pool.query(
            'DELETE FROM prompt_cards WHERE id IN (?)',
            [promptIds]
        );
        
        res.status(200).json({
            message: '批量删除成功',
            deleted_count: result.affectedRows
        });
    } catch (error) {
        console.error('批量删除提示词失败:', error);
        res.status(500).json({ message: '服务器错误', error: error.message });
    }
};

// 批量生成AI提示词
exports.generateAiPrompts = async (req, res) => {
    try {
        // 验证用户是否有管理员权限
        if (!['admin', 'super_admin'].includes(req.user.role)) {
            return res.status(403).json({ message: '没有权限访问此资源' });
        }
        
        const { type, count = 1, auto_approve = false } = req.body;
        
        // 验证数量限制
        if (count < 1 || count > 20) {
            return res.status(400).json({ message: '生成数量必须在1-20之间' });
        }
        
        // 生成提示词
        const generatedPrompts = [];
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < count; i++) {
            try {
                let result;
                
                if (type) {
                    // 生成指定类型的提示词
                    result = await generatePromptByType(type);
                } else {
                    // 生成随机类型的提示词
                    result = await generateRandomPrompt();
                }
                
                // 如果需要自动审核
                if (auto_approve && result) {
                    await pool.query(
                        'UPDATE prompt_cards SET status = "approved" WHERE id = ?',
                        [result.id]
                    );
                    
                    result.status = 'approved';
                }
                
                if (result) {
                    generatedPrompts.push(result);
                    successCount++;
                }
            } catch (error) {
                console.error(`生成提示词 ${i+1}/${count} 失败:`, error);
                errorCount++;
            }
        }
        
        res.status(200).json({
            message: `成功生成 ${successCount} 条AI提示词，失败 ${errorCount} 条`,
            generated_count: successCount,
            error_count: errorCount,
            prompts: generatedPrompts
        });
    } catch (error) {
        console.error('批量生成AI提示词失败:', error);
        res.status(500).json({ message: '服务器错误', error: error.message });
    }
};

// 预览生成AI提示词
exports.previewAiPrompt = async (req, res) => {
    try {
        // 验证用户是否有管理员权限
        if (!['moderator', 'admin', 'super_admin'].includes(req.user.role)) {
            return res.status(403).json({ message: '没有权限访问此资源' });
        }
        
        const { type } = req.body;
        
        let result;
        
        if (type) {
            // 生成指定类型的提示词
            result = await generatePromptByType(type);
        } else {
            // 生成随机类型的提示词
            result = await generateRandomPrompt();
        }
        
        // 删除生成的提示词（仅用于预览）
        if (result && result.id) {
            await pool.query('DELETE FROM prompt_cards WHERE id = ?', [result.id]);
        }
        
        res.status(200).json({
            prompt_text: result.prompt_text,
            type: result.type_name,
            quality_score: result.quality_score,
            rarity: result.rarity_name
        });
    } catch (error) {
        console.error('预览生成AI提示词失败:', error);
        res.status(500).json({ message: '服务器错误', error: error.message });
    }
};

// 批量导入提示词
exports.importPrompts = async (req, res) => {
    try {
        // 验证用户是否有管理员权限
        if (!['admin', 'super_admin'].includes(req.user.role)) {
            return res.status(403).json({ message: '没有权限访问此资源' });
        }
        
        const { text_content, default_category_id, default_type_id, auto_approve } = req.body;
        const csvFile = req.files && req.files.csv_file;
        const jsonFile = req.files && req.files.json_file;
        
        // 判断导入来源
        let promptsToImport = [];
        
        // 处理文本内容导入
        if (text_content) {
            const lines = text_content.split('\n').filter(line => line.trim());
            
            promptsToImport = lines.map(line => ({
                prompt_text: line.trim(),
                category_id: default_category_id || 1,
                type_id: default_type_id || 1
            }));
        }
        
        // 处理CSV文件导入
        if (csvFile) {
            const results = [];
            const fileStream = fs.createReadStream(csvFile.tempFilePath);
            
            await new Promise((resolve, reject) => {
                fileStream
                    .pipe(csv())
                    .on('data', (data) => results.push(data))
                    .on('end', resolve)
                    .on('error', reject);
            });
            
            promptsToImport = results.map(row => ({
                prompt_text: row.prompt_text,
                category_id: row.category_id || default_category_id || 1,
                type_id: row.type_id || default_type_id || 1,
                quality_score: row.quality_score || 50,
                source: row.source || null
            }));
        }
        
        // 处理JSON文件导入
        if (jsonFile) {
            const fileContent = fs.readFileSync(jsonFile.tempFilePath, 'utf8');
            const jsonData = JSON.parse(fileContent);
            
            if (Array.isArray(jsonData)) {
                promptsToImport = jsonData.map(item => ({
                    prompt_text: item.prompt_text,
                    category_id: item.category_id || default_category_id || 1,
                    type_id: item.type_id || default_type_id || 1,
                    quality_score: item.quality_score || 50,
                    source: item.source || null
                }));
            }
        }
        
        // 验证是否有提示词要导入
        if (promptsToImport.length === 0) {
            return res.status(400).json({ message: '没有有效的提示词数据可导入' });
        }
        
        // 批量导入提示词
        let successCount = 0;
        let errorCount = 0;
        
        for (const prompt of promptsToImport) {
            try {
                // 验证必填字段
                if (!prompt.prompt_text) {
                    errorCount++;
                    continue;
                }
                
                // 计算质量分数（如果未提供）
                const qualityScore = prompt.quality_score || Math.floor(Math.random() * 101);
                
                // 获取对应的稀有度等级
                const [rarityLevels] = await pool.query(`
                    SELECT id FROM rarity_levels
                    WHERE min_score <= ? AND max_score >= ?
                    LIMIT 1
                `, [qualityScore, qualityScore]);
                
                if (rarityLevels.length === 0) {
                    errorCount++;
                    continue;
                }
                
                // 设置状态
                const status = auto_approve ? 'approved' : 'pending';
                
                // 插入提示词
                await pool.query(`
                    INSERT INTO prompt_cards (
                        prompt_text,
                        category_id,
                        type_id,
                        quality_score,
                        rarity_level_id,
                        source,
                        is_ai_generated,
                        status
                    ) VALUES (?, ?, ?, ?, ?, ?, FALSE, ?)
                `, [
                    prompt.prompt_text,
                    prompt.category_id,
                    prompt.type_id,
                    qualityScore,
                    rarityLevels[0].id,
                    prompt.source || null,
                    status
                ]);
                
                successCount++;
            } catch (error) {
                console.error('导入提示词失败:', error);
                errorCount++;
            }
        }
        
        res.status(200).json({
            message: `成功导入 ${successCount} 条提示词，失败 ${errorCount} 条`,
            imported_count: successCount,
            error_count: errorCount
        });
    } catch (error) {
        console.error('批量导入提示词失败:', error);
        res.status(500).json({ message: '服务器错误', error: error.message });
    }
};

// 导出提示词模板
exports.exportPromptTemplate = async (req, res) => {
    try {
        // 验证用户是否有管理员权限
        if (!['moderator', 'admin', 'super_admin'].includes(req.user.role)) {
            return res.status(403).json({ message: '没有权限访问此资源' });
        }
        
        const { format } = req.params;
        
        if (format === 'csv') {
            // 生成CSV模板
            const csvContent = 'prompt_text,category_id,type_id,quality_score,source\n' +
                              '"提示词内容示例",1,1,75,"来源示例"';
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="prompt_template.csv"');
            res.status(200).send(csvContent);
        } else if (format === 'json') {
            // 生成JSON模板
            const jsonTemplate = [
                {
                    prompt_text: "提示词内容示例1",
                    category_id: 1,
                    type_id: 1,
                    quality_score: 75,
                    source: "来源示例1"
                },
                {
                    prompt_text: "提示词内容示例2",
                    category_id: 2,
                    type_id: 2,
                    quality_score: 85,
                    source: "来源示例2"
                }
            ];
            
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', 'attachment; filename="prompt_template.json"');
            res.status(200).json(jsonTemplate);
        } else {
            res.status(400).json({ message: '不支持的格式' });
        }
    } catch (error) {
        console.error('导出提示词模板失败:', error);
        res.status(500).json({ message: '服务器错误', error: error.message });
    }
};

module.exports = exports;
// 管理员后台脚本

// DOM 加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 初始化导航
    initNavigation();
    
    // 初始化表单事件
    initFormEvents();
    
    // 初始化弹窗
    initModals();
    
    // 初始化表格操作
    initTableActions();
    
    // 加载提示词数据
    loadPrompts();
    
    // 加载分类和类型数据
    loadCategories();
    loadPromptTypes();
    loadRarityLevels();
});

// 初始化导航
function initNavigation() {
    const navLinks = document.querySelectorAll('.admin-nav a');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 移除所有激活状态
            navLinks.forEach(l => l.classList.remove('active'));
            
            // 添加当前激活状态
            this.classList.add('active');
            
            // 获取目标部分的数据属性
            const section = this.getAttribute('data-section');
            
            // 隐藏所有部分
            document.querySelectorAll('.admin-section').forEach(s => {
                s.style.display = 'none';
            });
            
            // 显示目标部分
            if (section) {
                document.getElementById(`${section}-section`).style.display = 'block';
            } else {
                // 默认显示仪表盘
                document.getElementById('dashboard-section').style.display = 'block';
            }
        });
    });
}

// 初始化表单事件
function initFormEvents() {
    // 质量分数滑块和输入同步
    const qualityInput = document.getElementById('prompt-quality');
    const qualitySlider = document.getElementById('quality-slider');
    const rarityIndicator = document.getElementById('rarity-indicator');
    const rarityInput = document.getElementById('prompt-rarity');
    
    if (qualityInput && qualitySlider) {
        // 同步滑块和输入框
        qualityInput.addEventListener('input', function() {
            qualitySlider.value = this.value;
            updateRarityFromQuality(this.value);
        });
        
        qualitySlider.addEventListener('input', function() {
            qualityInput.value = this.value;
            updateRarityFromQuality(this.value);
        });
        
        // 初始更新稀有度显示
        updateRarityFromQuality(qualityInput.value);
    }
    
    // 提示词内容字符计数
    const promptText = document.getElementById('prompt-text');
    const charCount = document.getElementById('char-count');
    
    if (promptText && charCount) {
        promptText.addEventListener('input', function() {
            charCount.textContent = this.value.length;
            
            // 超过字符限制变红
            if (this.value.length > 2000) {
                charCount.style.color = 'var(--danger-color)';
            } else {
                charCount.style.color = 'var(--gray-dark)';
            }
        });
    }
    
    // 表单提交处理
    const promptForm = document.getElementById('prompt-form');
    
    if (promptForm) {
        promptForm.addEventListener('submit', function(e) {
            e.preventDefault();
            savePrompt();
        });
    }
    
    // 上传按钮事件
    const uploadPreviewBtn = document.getElementById('upload-preview');
    
    if (uploadPreviewBtn) {
        uploadPreviewBtn.addEventListener('click', function() {
            // 这里可以调用上传图片的功能
            // 实际项目中可以创建一个file input并触发点击
            showToast('提示', '图片上传功能尚未实现', 'info');
        });
    }
    
    // 生成AI提示词表单
    const generateAiForm = document.getElementById('generate-ai-form');
    
    if (generateAiForm) {
        generateAiForm.addEventListener('submit', function(e) {
            e.preventDefault();
            generateAiPrompts();
        });
    }
    
    // 预览生成
    const previewGeneration = document.getElementById('preview-generation');
    
    if (previewGeneration) {
        previewGeneration.addEventListener('click', function() {
            previewAiPrompt();
        });
    }
    
    // 批量导入表单
    const batchImportBtn = document.getElementById('start-import');
    
    if (batchImportBtn) {
        batchImportBtn.addEventListener('click', function() {
            importPrompts();
        });
    }
    
    // 文件上传按钮
    const csvUploadBtn = document.getElementById('csv-upload-btn');
    const jsonUploadBtn = document.getElementById('json-upload-btn');
    const csvFileInput = document.getElementById('csv-file-input');
    const jsonFileInput = document.getElementById('json-file-input');
    
    if (csvUploadBtn && csvFileInput) {
        csvUploadBtn.addEventListener('click', function() {
            csvFileInput.click();
        });
        
        csvFileInput.addEventListener('change', function() {
            if (this.files.length > 0) {
                csvUploadBtn.textContent = this.files[0].name;
            }
        });
    }
    
    if (jsonUploadBtn && jsonFileInput) {
        jsonUploadBtn.addEventListener('click', function() {
            jsonFileInput.click();
        });
        
        jsonFileInput.addEventListener('change', function() {
            if (this.files.length > 0) {
                jsonUploadBtn.textContent = this.files[0].name;
            }
        });
    }
    
    // 筛选应用按钮
    const applyFilterBtn = document.getElementById('apply-filter');
    
    if (applyFilterBtn) {
        applyFilterBtn.addEventListener('click', function() {
            loadPrompts();
        });
    }
}

// 根据质量分数更新稀有度显示
function updateRarityFromQuality(qualityScore) {
    const score = parseInt(qualityScore);
    const rarityIndicator = document.getElementById('rarity-indicator');
    const rarityInput = document.getElementById('prompt-rarity');
    
    let rarity = '';
    let color = '';
    
    if (score <= 39) {
        rarity = '普通';
        color = '#AAAAAA';
    } else if (score <= 69) {
        rarity = '优质';
        color = '#55AA55';
    } else if (score <= 84) {
        rarity = '精品';
        color = '#5555FF';
    } else if (score <= 94) {
        rarity = '珍贵';
        color = '#AA55AA';
    } else if (score <= 98) {
        rarity = '稀有';
        color = '#FFAA00';
    } else {
        rarity = '传说';
        color = '#FF5555';
    }
    
    if (rarityIndicator) {
        rarityIndicator.textContent = rarity;
        rarityIndicator.style.backgroundColor = color;
    }
    
    if (rarityInput) {
        rarityInput.value = rarity;
    }
}

// 初始化弹窗
function initModals() {
    // 添加提示词按钮
    const addPromptBtn = document.getElementById('add-prompt-btn');
    const promptModal = document.getElementById('prompt-modal');
    
    if (addPromptBtn && promptModal) {
        addPromptBtn.addEventListener('click', function() {
            // 重置表单
            resetPromptForm();
            
            // 设置标题为添加
            document.getElementById('modal-title').textContent = '添加提示词';
            
            // 显示弹窗
            promptModal.style.display = 'flex';
        });
    }
    
    // 生成AI提示词按钮
    const generateAiPromptBtn = document.getElementById('generate-ai-prompt-btn');
    const generateAiModal = document.getElementById('generate-ai-modal');
    
    if (generateAiPromptBtn && generateAiModal) {
        generateAiPromptBtn.addEventListener('click', function() {
            // 重置表单
            document.getElementById('generate-ai-form').reset();
            document.getElementById('generation-preview-content').innerHTML = '<p>点击"生成预览"查看一个示例</p>';
            
            // 显示弹窗
            generateAiModal.style.display = 'flex';
        });
    }
    
    // 批量导入按钮
    const batchImportBtn = document.getElementById('batch-import-btn');
    const batchImportModal = document.getElementById('batch-import-modal');
    
    if (batchImportBtn && batchImportModal) {
        batchImportBtn.addEventListener('click', function() {
            // 重置表单
            document.getElementById('import-textarea').value = '';
            document.getElementById('csv-upload-btn').textContent = '选择CSV文件';
            document.getElementById('json-upload-btn').textContent = '选择JSON文件';
            document.getElementById('csv-file-input').value = '';
            document.getElementById('json-file-input').value = '';
            
            // 显示弹窗
            batchImportModal.style.display = 'flex';
        });
    }
    
    // 关闭按钮
    const closeButtons = document.querySelectorAll('.close-button');
    
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            // 获取最近的弹窗
            const modal = this.closest('.modal');
            
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // 取消按钮
    const cancelButtons = document.querySelectorAll('#cancel-prompt, #cancel-generation, #cancel-import, #close-view, #cancel-delete');
    
    cancelButtons.forEach(button => {
        button.addEventListener('click', function() {
            // 获取最近的弹窗
            const modal = this.closest('.modal');
            
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // 点击弹窗外部关闭
    const modals = document.querySelectorAll('.modal');
    
    modals.forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
    });
}

// 初始化表格操作
function initTableActions() {
    // 全选切换
    const selectAll = document.getElementById('select-all');
    
    if (selectAll) {
        selectAll.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('.row-select');
            
            checkboxes.forEach(checkbox => {
                checkbox.checked = this.checked;
            });
        });
    }
    
    // 委托事件监听表格操作按钮
    const promptsTableBody = document.getElementById('prompts-table-body');
    
    if (promptsTableBody) {
        promptsTableBody.addEventListener('click', function(e) {
            // 查找最近的按钮
            const button = e.target.closest('button');
            
            if (!button) return;
            
            // 获取提示词ID
            const promptId = button.getAttribute('data-id');
            
            // 根据按钮类型执行相应操作
            if (button.classList.contains('edit-button')) {
                editPrompt(promptId);
            } else if (button.classList.contains('view-button')) {
                viewPrompt(promptId);
            } else if (button.classList.contains('delete-button')) {
                confirmDeletePrompt(promptId);
            }
        });
    }
    
    // 确认删除按钮
    const confirmDeleteBtn = document.getElementById('confirm-delete');
    
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', function() {
            const promptId = this.getAttribute('data-id');
            deletePrompt(promptId);
        });
    }
    
    // 从查看弹窗编辑按钮
    const editFromViewBtn = document.getElementById('edit-from-view');
    
    if (editFromViewBtn) {
        editFromViewBtn.addEventListener('click', function() {
            const promptId = document.getElementById('view-prompt-id').textContent;
            
            // 关闭查看弹窗
            document.getElementById('view-prompt-modal').style.display = 'none';
            
            // 打开编辑弹窗
            editPrompt(promptId);
        });
    }
}

// 加载提示词数据
function loadPrompts() {
    // 获取筛选条件
    const categoryFilter = document.getElementById('category-filter').value;
    const typeFilter = document.getElementById('type-filter').value;
    const rarityFilter = document.getElementById('rarity-filter').value;
    const statusFilter = document.getElementById('status-filter').value;
    const aiFilter = document.getElementById('ai-filter').value;
    
    // 构建查询参数
    const params = new URLSearchParams();
    
    if (categoryFilter) params.append('categoryId', categoryFilter);
    if (typeFilter) params.append('typeId', typeFilter);
    if (rarityFilter) params.append('rarityId', rarityFilter);
    if (statusFilter) params.append('status', statusFilter);
    if (aiFilter !== '') params.append('isAiGenerated', aiFilter);
    
    // 当前页码
    params.append('page', 1);
    params.append('limit', 10);
    
    // 在实际项目中, 这里会通过API调用获取提示词列表
    // 示例代码使用模拟数据
    
    // 模拟API调用
    console.log(`调用API: /api/admin/prompts?${params.toString()}`);
    
    // 实际项目中使用以下代码:
    /*
    fetch(`/api/admin/prompts?${params.toString()}`)
        .then(response => response.json())
        .then(data => {
            renderPromptTable(data);
        })
        .catch(error => {
            console.error('加载提示词失败:', error);
            showToast('错误', '加载提示词失败', 'error');
        });
    */
    
    // 模拟数据
    setTimeout(() => {
        const mockData = {
            data: [
                {
                    id: 1,
                    prompt_text: '一位身穿华丽宫廷服饰的年轻女子，站在古堡阳台上，远望雪山，细腻的皮肤纹理，柔和的自然光线，8k超高清质量，电影感镜头',
                    preview_url: 'https://placehold.co/600x400/4a6bdf/ffffff?text=宫廷女子预览',
                    category_name: '人物',
                    type_name: '图像',
                    rarity_name: '优质',
                    color_code: '#55AA55',
                    quality_score: 65,
                    source: 'Midjourney优质案例',
                    is_ai_generated: false,
                    status: 'approved',
                    created_at: '2023-05-10 14:30:25'
                },
                {
                    id: 2,
                    prompt_text: '潮汐涌动的海岸线，岩石形成的自然拱门，夕阳映照下金色的海面，远处有轮船剪影，电影级HDR，广角镜头',
                    preview_url: 'https://placehold.co/600x400/4a6bdf/ffffff?text=海岸日落预览',
                    category_name: '风景',
                    type_name: '图像',
                    rarity_name: '精品',
                    color_code: '#5555FF',
                    quality_score: 78,
                    source: 'Stable Diffusion艺术社区',
                    is_ai_generated: false,
                    status: 'approved',
                    created_at: '2023-05-09 11:15:36'
                },
                {
                    id: 3,
                    prompt_text: '微缩城市模型，极致细节的建筑群，人们如蚂蚁般穿行，倾斜移轴镜头效果，清晰锐利，摄影级别照片质感',
                    preview_url: 'https://placehold.co/600x400/4a6bdf/ffffff?text=微缩城市预览',
                    category_name: '风景',
                    type_name: '图像',
                    rarity_name: '珍贵',
                    color_code: '#AA55AA',
                    quality_score: 88,
                    source: 'DALL-E精选',
                    is_ai_generated: false,
                    status: 'pending',
                    created_at: '2023-05-08 09:45:18'
                },
                {
                    id: 4,
                    prompt_text: '创作一段冥想背景音乐，包含柔和的自然声音，如轻柔的流水声和远处的鸟鸣，结合环境氛围和低频音调，营造平静放松的氛围',
                    preview_url: 'https://placehold.co/600x400/4a6bdf/ffffff?text=冥想音乐预览',
                    category_name: '概念艺术',
                    type_name: '音频',
                    rarity_name: '精品',
                    color_code: '#5555FF',
                    quality_score: 71,
                    source: 'AI自动生成',
                    is_ai_generated: true,
                    status: 'approved',
                    created_at: '2023-05-07 16:20:42'
                }
            ],
            pagination: {
                total: 120,
                page: 1,
                limit: 10,
                pages: 12
            }
        };
        
        renderPromptTable(mockData);
    }, 300);
}

// 渲染提示词表格
function renderPromptTable(data) {
    const promptsTableBody = document.getElementById('prompts-table-body');
    const paginationInfo = document.querySelector('.pagination-info');
    const paginationControls = document.querySelector('.pagination-controls');
    
    if (!promptsTableBody) return;
    
    // 清空表格
    promptsTableBody.innerHTML = '';
    
    // 添加数据行
    data.data.forEach(prompt => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td><input type="checkbox" class="row-select"></td>
            <td>${prompt.id}</td>
            <td><img src="${prompt.preview_url}" alt="预览图" class="preview-thumbnail"></td>
            <td class="prompt-text">${prompt.prompt_text}</td>
            <td>${prompt.category_name}</td>
            <td>${prompt.type_name}</td>
            <td><span class="rarity-badge" style="background-color: ${prompt.color_code};">${prompt.rarity_name}</span></td>
            <td>${prompt.quality_score}</td>
            <td>${prompt.is_ai_generated ? 'AI生成' : '手动添加'}</td>
            <td><span class="status-badge ${prompt.status}">${getStatusText(prompt.status)}</span></td>
            <td>${formatDate(prompt.created_at)}</td>
            <td>
                <div class="action-buttons">
                    <button class="icon-button edit-button" data-id="${prompt.id}" title="编辑">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="icon-button view-button" data-id="${prompt.id}" title="查看">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="icon-button delete-button" data-id="${prompt.id}" title="删除">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        promptsTableBody.appendChild(row);
    });
    
    // 更新分页信息
    if (paginationInfo && data.pagination) {
        const { total, page, limit } = data.pagination;
        const start = (page - 1) * limit + 1;
        const end = Math.min(page * limit, total);
        
        paginationInfo.textContent = `显示 ${start}-${end} 共 ${total} 条`;
    }
    
    // 更新分页控件
    if (paginationControls && data.pagination) {
        // 这里可以实现分页控件的更新
        // 实际项目中根据需求实现
    }
}

// 加载分类数据
function loadCategories() {
    // 模拟API调用
    console.log('调用API: /api/categories');
    
    // 实际项目中使用以下代码:
    /*
    fetch('/api/categories')
        .then(response => response.json())
        .then(data => {
            populateCategoryDropdowns(data);
        })
        .catch(error => {
            console.error('加载分类失败:', error);
        });
    */
    
    // 模拟数据
    setTimeout(() => {
        const mockData = [
            { id: 1, name: '人物' },
            { id: 2, name: '风景' },
            { id: 3, name: '艺术风格' },
            { id: 4, name: '概念艺术' },
            { id: 5, name: '科幻' }
        ];
        
        populateCategoryDropdowns(mockData);
    }, 100);
}

// 填充分类下拉框
function populateCategoryDropdowns(categories) {
    const dropdowns = [
        document.getElementById('category-filter'),
        document.getElementById('prompt-category'),
        document.getElementById('import-category')
    ];
    
    dropdowns.forEach(dropdown => {
        if (!dropdown) return;
        
        // 保留第一个选项（"全部分类"或"选择分类"）
        const firstOption = dropdown.options[0];
        dropdown.innerHTML = '';
        dropdown.appendChild(firstOption);
        
        // 添加分类选项
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            dropdown.appendChild(option);
        });
    });
}

// 加载提示词类型数据
function loadPromptTypes() {
    // 模拟API调用
    console.log('调用API: /api/prompt-types');
    
    // 实际项目中使用以下代码:
    /*
    fetch('/api/prompt-types')
        .then(response => response.json())
        .then(data => {
            populateTypeDropdowns(data);
        })
        .catch(error => {
            console.error('加载提示词类型失败:', error);
        });
    */
    
    // 模拟数据
    setTimeout(() => {
        const mockData = [
            { id: 1, name: '图像' },
            { id: 2, name: '文本' },
            { id: 3, name: '视频' },
            { id: 4, name: '音频' },
            { id: 5, name: 'Agent' }
        ];
        
        populateTypeDropdowns(mockData);
    }, 100);
}

// 填充类型下拉框
function populateTypeDropdowns(types) {
    const dropdowns = [
        document.getElementById('type-filter'),
        document.getElementById('prompt-type'),
        document.getElementById('import-type')
    ];
    
    dropdowns.forEach(dropdown => {
        if (!dropdown) return;
        
        // 保留第一个选项
        const firstOption = dropdown.options[0];
        dropdown.innerHTML = '';
        dropdown.appendChild(firstOption);
        
        // 添加类型选项
        types.forEach(type => {
            const option = document.createElement('option');
            option.value = type.id;
            option.textContent = type.name;
            dropdown.appendChild(option);
        });
    });
    
    // 同时填充AI生成类型下拉框
    const aiPromptType = document.getElementById('ai-prompt-type');
    
    if (aiPromptType) {
        // 保留第一个选项
        const firstOption = aiPromptType.options[0];
        aiPromptType.innerHTML = '';
        aiPromptType.appendChild(firstOption);
        
        // 添加类型选项，使用小写名称作为值
        types.forEach(type => {
            const option = document.createElement('option');
            option.value = type.name.toLowerCase();
            option.textContent = type.name;
            aiPromptType.appendChild(option);
        });
    }
}

// 加载稀有度等级数据
function loadRarityLevels() {
    // 模拟API调用
    console.log('调用API: /api/rarity-levels');
    
    // 实际项目中使用以下代码:
    /*
    fetch('/api/rarity-levels')
        .then(response => response.json())
        .then(data => {
            populateRarityDropdowns(data);
        })
        .catch(error => {
            console.error('加载稀有度等级失败:', error);
        });
    */
    
    // 模拟数据
    setTimeout(() => {
        const mockData = [
            { id: 1, name: '普通', min_score: 0, max_score: 39, color_code: '#AAAAAA' },
            { id: 2, name: '优质', min_score: 40, max_score: 69, color_code: '#55AA55' },
            { id: 3, name: '精品', min_score: 70, max_score: 84, color_code: '#5555FF' },
            { id: 4, name: '珍贵', min_score: 85, max_score: 94, color_code: '#AA55AA' },
            { id: 5, name: '稀有', min_score: 95, max_score: 98, color_code: '#FFAA00' },
            { id: 6, name: '传说', min_score: 99, max_score: 100, color_code: '#FF5555' }
        ];
        
        populateRarityDropdowns(mockData);
    }, 100);
}

// 填充稀有度下拉框
function populateRarityDropdowns(rarityLevels) {
    const dropdown = document.getElementById('rarity-filter');
    
    if (!dropdown) return;
    
    // 保留第一个选项
    const firstOption = dropdown.options[0];
    dropdown.innerHTML = '';
    dropdown.appendChild(firstOption);
    
    // 添加稀有度选项
    rarityLevels.forEach(rarity => {
        const option = document.createElement('option');
        option.value = rarity.id;
        option.textContent = rarity.name;
        dropdown.appendChild(option);
    });
}

// 重置提示词表单
function resetPromptForm() {
    const form = document.getElementById('prompt-form');
    const promptId = document.getElementById('prompt-id');
    
    if (form) {
        form.reset();
        
        // 重置隐藏ID
        if (promptId) {
            promptId.value = '';
        }
        
        // 重置质量分数及相关显示
        const qualityInput = document.getElementById('prompt-quality');
        const qualitySlider = document.getElementById('quality-slider');
        
        if (qualityInput && qualitySlider) {
            qualityInput.value = 50;
            qualitySlider.value = 50;
            updateRarityFromQuality(50);
        }
        
        // 重置字符计数
        const charCount = document.getElementById('char-count');
        
        if (charCount) {
            charCount.textContent = '0';
            charCount.style.color = 'var(--gray-dark)';
        }
    }
}

// 保存提示词
function savePrompt() {
    // 获取表单数据
    const promptId = document.getElementById('prompt-id').value;
    const promptText = document.getElementById('prompt-text').value;
    const categoryId = document.getElementById('prompt-category').value;
    const typeId = document.getElementById('prompt-type').value;
    const qualityScore = document.getElementById('prompt-quality').value;
    const previewUrl = document.getElementById('prompt-preview').value;
    const source = document.getElementById('prompt-source').value;
    const isAiGenerated = document.getElementById('prompt-ai-generated').checked;
    const status = document.getElementById('prompt-status').value;
    
    // 验证必填字段
    if (!promptText || !categoryId || !typeId) {
        showToast('错误', '请填写必填字段', 'error');
        return;
    }
    
    // 验证字符数限制
    if (promptText.length > 2000) {
        showToast('错误', '提示词内容超过2000字符限制', 'error');
        return;
    }
    
    // 构建提交数据
    const promptData = {
        prompt_text: promptText,
        category_id: parseInt(categoryId),
        type_id: parseInt(typeId),
        quality_score: parseInt(qualityScore),
        preview_url: previewUrl || null,
        source: source || null,
        is_ai_generated: isAiGenerated,
        status: status
    };
    
    console.log('提示词数据:', promptData);
    
    // 是新增还是更新
    const isNew = !promptId;
    
    // 模拟API调用
    const apiUrl = isNew ? '/api/admin/prompts' : `/api/admin/prompts/${promptId}`;
    const method = isNew ? 'POST' : 'PUT';
    
    console.log(`调用API: ${apiUrl}, 方法: ${method}`);
    
    // 实际项目中使用以下代码:
    /*
    fetch(apiUrl, {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(promptData)
    })
        .then(response => response.json())
        .then(data => {
            showToast('成功', isNew ? '提示词添加成功' : '提示词更新成功', 'success');
            
            // 关闭弹窗
            document.getElementById('prompt-modal').style.display = 'none';
            
            // 重新加载提示词列表
            loadPrompts();
        })
        .catch(error => {
            console.error('保存提示词失败:', error);
            showToast('错误', '保存提示词失败', 'error');
        });
    */
    
    // 模拟成功响应
    setTimeout(() => {
        showToast('成功', isNew ? '提示词添加成功' : '提示词更新成功', 'success');
        
        // 关闭弹窗
        document.getElementById('prompt-modal').style.display = 'none';
        
        // 重新加载提示词列表
        loadPrompts();
    }, 500);
}

// 编辑提示词
function editPrompt(promptId) {
    console.log(`编辑提示词: ${promptId}`);
    
    // 模拟API调用
    const apiUrl = `/api/admin/prompts/${promptId}`;
    
    console.log(`调用API: ${apiUrl}`);
    
    // 实际项目中使用以下代码:
    /*
    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            fillPromptForm(data);
            
            // 设置标题为编辑
            document.getElementById('modal-title').textContent = '编辑提示词';
            
            // 显示弹窗
            document.getElementById('prompt-modal').style.display = 'flex';
        })
        .catch(error => {
            console.error('获取提示词详情失败:', error);
            showToast('错误', '获取提示词详情失败', 'error');
        });
    */
    
    // 模拟数据
    setTimeout(() => {
        // 使用模拟数据，实际项目中会从API获取
        const mockPrompt = {
            id: promptId,
            prompt_text: '微缩城市模型，极致细节的建筑群，人们如蚂蚁般穿行，倾斜移轴镜头效果，清晰锐利，摄影级别照片质感',
            category_id: 2,
            type_id: 1,
            quality_score: 88,
            preview_url: 'https://placehold.co/600x400/4a6bdf/ffffff?text=微缩城市预览',
            source: 'DALL-E精选',
            is_ai_generated: false,
            status: 'pending'
        };
        
        fillPromptForm(mockPrompt);
        
        // 设置标题为编辑
        document.getElementById('modal-title').textContent = '编辑提示词';
        
        // 显示弹窗
        document.getElementById('prompt-modal').style.display = 'flex';
    }, 300);
}

// 填充提示词表单
function fillPromptForm(prompt) {
    // 设置ID
    document.getElementById('prompt-id').value = prompt.id;
    
    // 填充表单字段
    document.getElementById('prompt-text').value = prompt.prompt_text;
    document.getElementById('prompt-category').value = prompt.category_id;
    document.getElementById('prompt-type').value = prompt.type_id;
    document.getElementById('prompt-quality').value = prompt.quality_score;
    document.getElementById('quality-slider').value = prompt.quality_score;
    document.getElementById('prompt-preview').value = prompt.preview_url || '';
    document.getElementById('prompt-source').value = prompt.source || '';
    document.getElementById('prompt-ai-generated').checked = prompt.is_ai_generated;
    document.getElementById('prompt-status').value = prompt.status;
    
    // 更新稀有度显示
    updateRarityFromQuality(prompt.quality_score);
    
    // 更新字符计数
    const charCount = document.getElementById('char-count');
    if (charCount) {
        charCount.textContent = prompt.prompt_text.length;
        
        if (prompt.prompt_text.length > 2000) {
            charCount.style.color = 'var(--danger-color)';
        } else {
            charCount.style.color = 'var(--gray-dark)';
        }
    }
}

// 查看提示词详情
function viewPrompt(promptId) {
    console.log(`查看提示词: ${promptId}`);
    
    // 模拟API调用
    const apiUrl = `/api/admin/prompts/${promptId}`;
    
    console.log(`调用API: ${apiUrl}`);
    
    // 实际项目中使用以下代码:
    /*
    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            fillPromptViewModal(data);
            
            // 显示查看弹窗
            document.getElementById('view-prompt-modal').style.display = 'flex';
        })
        .catch(error => {
            console.error('获取提示词详情失败:', error);
            showToast('错误', '获取提示词详情失败', 'error');
        });
    */
    
    // 模拟数据
    setTimeout(() => {
        // 根据ID查找不同的模拟数据
        let mockPrompt;
        
        if (promptId == 1) {
            mockPrompt = {
                id: 1,
                prompt_text: '一位身穿华丽宫廷服饰的年轻女子，站在古堡阳台上，远望雪山，细腻的皮肤纹理，柔和的自然光线，8k超高清质量，电影感镜头',
                preview_url: 'https://placehold.co/600x400/4a6bdf/ffffff?text=宫廷女子预览',
                category_name: '人物',
                type_name: '图像',
                rarity_name: '优质',
                color_code: '#55AA55',
                quality_score: 65,
                source: 'Midjourney优质案例',
                is_ai_generated: false,
                status: 'approved',
                created_at: '2023-05-10 14:30:25'
            };
        } else {
            mockPrompt = {
                id: promptId,
                prompt_text: '微缩城市模型，极致细节的建筑群，人们如蚂蚁般穿行，倾斜移轴镜头效果，清晰锐利，摄影级别照片质感',
                preview_url: 'https://placehold.co/600x400/4a6bdf/ffffff?text=微缩城市预览',
                category_name: '风景',
                type_name: '图像',
                rarity_name: '珍贵',
                color_code: '#AA55AA',
                quality_score: 88,
                source: 'DALL-E精选',
                is_ai_generated: false,
                status: 'pending',
                created_at: '2023-05-08 09:45:18'
            };
        }
        
        fillPromptViewModal(mockPrompt);
        
        // 显示查看弹窗
        document.getElementById('view-prompt-modal').style.display = 'flex';
    }, 300);
}

// 填充提示词查看弹窗
function fillPromptViewModal(prompt) {
    // 设置ID和基本信息
    document.getElementById('view-prompt-id').textContent = prompt.id;
    document.getElementById('view-prompt-text').textContent = prompt.prompt_text;
    document.getElementById('view-prompt-category').textContent = prompt.category_name;
    document.getElementById('view-prompt-type').textContent = prompt.type_name;
    document.getElementById('view-prompt-quality').textContent = prompt.quality_score;
    document.getElementById('view-prompt-source').textContent = prompt.is_ai_generated ? 'AI生成' : (prompt.source || '手动添加');
    document.getElementById('view-preview-image').src = prompt.preview_url || 'https://placehold.co/600x400/4a6bdf/ffffff?text=无预览图';
    document.getElementById('view-prompt-created').textContent = formatDate(prompt.created_at);
    
    // 设置稀有度标签
    const rarityBadge = `<span class="rarity-badge" style="background-color: ${prompt.color_code};">${prompt.rarity_name}</span>`;
    document.getElementById('view-prompt-rarity').innerHTML = rarityBadge;
    
    // 设置状态标签
    const statusBadge = `<span class="status-badge ${prompt.status}">${getStatusText(prompt.status)}</span>`;
    document.getElementById('view-prompt-status').innerHTML = statusBadge;
}

// 确认删除提示词
function confirmDeletePrompt(promptId) {
    console.log(`准备删除提示词: ${promptId}`);
    
    // 设置确认按钮的数据ID
    document.getElementById('confirm-delete').setAttribute('data-id', promptId);
    
    // 显示确认弹窗
    document.getElementById('confirm-delete-modal').style.display = 'flex';
}

// 删除提示词
function deletePrompt(promptId) {
    console.log(`删除提示词: ${promptId}`);
    
    // 模拟API调用
    const apiUrl = `/api/admin/prompts/${promptId}`;
    
    console.log(`调用API: ${apiUrl}, 方法: DELETE`);
    
    // 实际项目中使用以下代码:
    /*
    fetch(apiUrl, {
        method: 'DELETE'
    })
        .then(response => response.json())
        .then(data => {
            showToast('成功', '提示词删除成功', 'success');
            
            // 关闭确认弹窗
            document.getElementById('confirm-delete-modal').style.display = 'none';
            
            // 重新加载提示词列表
            loadPrompts();
        })
        .catch(error => {
            console.error('删除提示词失败:', error);
            showToast('错误', '删除提示词失败', 'error');
        });
    */
    
    // 模拟成功响应
    setTimeout(() => {
        showToast('成功', '提示词删除成功', 'success');
        
        // 关闭确认弹窗
        document.getElementById('confirm-delete-modal').style.display = 'none';
        
        // 重新加载提示词列表
        loadPrompts();
    }, 500);
}

// 生成AI提示词
function generateAiPrompts() {
    const promptType = document.getElementById('ai-prompt-type').value;
    const promptCount = document.getElementById('ai-prompt-count').value;
    const autoApprove = document.getElementById('ai-prompt-auto-approve').checked;
    
    console.log(`生成AI提示词: 类型=${promptType}, 数量=${promptCount}, 自动审核=${autoApprove}`);
    
    // 验证输入
    if (promptCount < 1 || promptCount > 20) {
        showToast('错误', '请输入1-20之间的生成数量', 'error');
        return;
    }
    
    // 模拟API调用
    const apiUrl = '/api/admin/prompts/generate';
    
    console.log(`调用API: ${apiUrl}, 方法: POST`);
    
    // 构建请求数据
    const requestData = {
        type: promptType || null,
        count: parseInt(promptCount),
        auto_approve: autoApprove
    };
    
    // 实际项目中使用以下代码:
    /*
    fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
    })
        .then(response => response.json())
        .then(data => {
            showToast('成功', `成功生成 ${data.generated_count} 条AI提示词`, 'success');
            
            // 关闭生成弹窗
            document.getElementById('generate-ai-modal').style.display = 'none';
            
            // 重新加载提示词列表
            loadPrompts();
        })
        .catch(error => {
            console.error('生成AI提示词失败:', error);
            showToast('错误', '生成AI提示词失败', 'error');
        });
    */
    
    // 模拟成功响应
    setTimeout(() => {
        showToast('成功', `成功生成 ${promptCount} 条AI提示词`, 'success');
        
        // 关闭生成弹窗
        document.getElementById('generate-ai-modal').style.display = 'none';
        
        // 重新加载提示词列表
        loadPrompts();
    }, 1000);
}

// 预览AI提示词生成
function previewAiPrompt() {
    const promptType = document.getElementById('ai-prompt-type').value;
    
    console.log(`预览AI提示词生成: 类型=${promptType || '随机'}`);
    
    // 模拟API调用
    const apiUrl = '/api/admin/prompts/generate/preview';
    
    console.log(`调用API: ${apiUrl}, 方法: POST`);
    
    // 构建请求数据
    const requestData = {
        type: promptType || null
    };
    
    // 实际项目中使用以下代码:
    /*
    fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
    })
        .then(response => response.json())
        .then(data => {
            document.getElementById('generation-preview-content').textContent = data.prompt_text;
        })
        .catch(error => {
            console.error('预览AI提示词失败:', error);
            showToast('错误', '预览生成失败', 'error');
        });
    */
    
    // 模拟响应数据
    setTimeout(() => {
        // 根据类型生成不同的示例
        let previewText;
        
        if (promptType === 'image') {
            previewText = '荒凉的沙漠景观，巨大的砂岩峡谷，夕阳照射下的金黄色光芒，广阔的天空中云层变幻，远处有微小的旅行者身影，电影级镜头，高清细节';
        } else if (promptType === 'text') {
            previewText = '你是一位文学鉴赏专家。请分析我提供的文本，重点关注叙事结构和修辞手法。使用专业但平易近人的语气，并提供具体例子支持你的分析。';
        } else if (promptType === 'video') {
            previewText = '城市夜景延时摄影，霓虹灯光在雨后湿润的街道上倒映，车流形成光线轨迹，从日落到深夜的时间变化，4K超高清分辨率，电影调色风格';
        } else if (promptType === 'audio') {
            previewText = '创作一段融合爵士和电子元素的音乐，中等节奏，钢琴主导，电子合成器辅助，逐渐增强的动态变化，营造神秘而温暖的氛围';
        } else if (promptType === 'agent') {
            previewText = '你是一个专业的数据分析助手。你的任务是分析我提供的数据集，重点关注趋势和异常值，确保考虑季节性因素。使用可视化方法清晰地传达发现，并提供具体的行动建议。';
        } else {
            // 随机类型
            previewText = '极致超现实主义场景：一座漂浮在云海上的古代图书馆，书架蜿蜒至无限远处，不同时代装束的学者在违背物理规则的楼梯上行走，阳光穿过彩色玻璃窗投射奇特的几何图案，8K超高清细节';
        }
        
        document.getElementById('generation-preview-content').textContent = previewText;
    }, 500);
}

// 批量导入提示词
function importPrompts() {
    console.log('批量导入提示词');
    
    // 获取导入来源
    const csvFile = document.getElementById('csv-file-input').files[0];
    const jsonFile = document.getElementById('json-file-input').files[0];
    const textContent = document.getElementById('import-textarea').value;
    
    // 获取默认设置
    const defaultCategory = document.getElementById('import-category').value;
    const defaultType = document.getElementById('import-type').value;
    const autoApprove = document.getElementById('import-auto-approve').checked;
    
    // 验证至少有一种导入来源
    if (!csvFile && !jsonFile && !textContent.trim()) {
        showToast('错误', '请提供导入数据', 'error');
        return;
    }
    
    // 构建表单数据
    const formData = new FormData();
    
    if (csvFile) {
        formData.append('csv_file', csvFile);
    }
    
    if (jsonFile) {
        formData.append('json_file', jsonFile);
    }
    
    if (textContent.trim()) {
        formData.append('text_content', textContent);
    }
    
    if (defaultCategory) {
        formData.append('default_category_id', defaultCategory);
    }
    
    if (defaultType) {
        formData.append('default_type_id', defaultType);
    }
    
    formData.append('auto_approve', autoApprove);
    
    // 模拟API调用
    const apiUrl = '/api/admin/prompts/import';
    
    console.log(`调用API: ${apiUrl}, 方法: POST (multipart/form-data)`);
    
    // 实际项目中使用以下代码:
    /*
    fetch(apiUrl, {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            showToast('成功', `成功导入 ${data.imported_count} 条提示词`, 'success');
            
            // 关闭导入弹窗
            document.getElementById('batch-import-modal').style.display = 'none';
            
            // 重新加载提示词列表
            loadPrompts();
        })
        .catch(error => {
            console.error('导入提示词失败:', error);
            showToast('错误', '导入提示词失败', 'error');
        });
    */
    
    // 模拟成功响应
    setTimeout(() => {
        // 随机导入数量
        const importedCount = Math.floor(Math.random() * 10) + 5;
        
        showToast('成功', `成功导入 ${importedCount} 条提示词`, 'success');
        
        // 关闭导入弹窗
        document.getElementById('batch-import-modal').style.display = 'none';
        
        // 重新加载提示词列表
        loadPrompts();
    }, 1000);
}

// 显示吐司通知
function showToast(title, message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    
    if (!toastContainer) return;
    
    // 创建吐司元素
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // 设置图标
    let icon;
    switch (type) {
        case 'success':
            icon = 'bi-check-circle-fill';
            break;
        case 'error':
            icon = 'bi-exclamation-circle-fill';
            break;
        case 'warning':
            icon = 'bi-exclamation-triangle-fill';
            break;
        default:
            icon = 'bi-info-circle-fill';
    }
    
    // 设置内容
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="bi ${icon}"></i>
        </div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close">&times;</button>
    `;
    
    // 添加到容器
    toastContainer.appendChild(toast);
    
    // 添加关闭事件
    const closeBtn = toast.querySelector('.toast-close');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            toast.remove();
        });
    }
    
    // 自动关闭
    setTimeout(() => {
        if (toast.parentNode) {
            toast.classList.add('toast-hide');
            
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }
    }, 5000);
}

// 格式化日期
function formatDate(dateString) {
    if (!dateString) return '';
    
    // 简单格式化，实际项目中可能需要更复杂的处理
    const date = new Date(dateString);
    
    // 检查日期是否有效
    if (isNaN(date.getTime())) {
        // 尝试处理 MySQL 日期格式
        const parts = dateString.split(/[- :]/);
        if (parts.length >= 6) {
            return `${parts[0]}-${parts[1]}-${parts[2]}`;
        }
        
        return dateString;
    }
    
    // 格式化为 YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

// 获取状态文本
function getStatusText(status) {
    switch (status) {
        case 'approved':
            return '已审核';
        case 'pending':
            return '待审核';
        case 'rejected':
            return '已拒绝';
        case 'flagged':
            return '已标记';
        default:
            return status;
    }
}
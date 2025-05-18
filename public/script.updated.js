// 提示词盲盒主脚本（更新版）
class PromptBlindBox {
    constructor() {
        // DOM元素
        this.drawCardBtn = document.getElementById('draw-card');
        this.viewCollectionBtn = document.getElementById('view-collection');
        this.viewCategoriesBtn = document.getElementById('view-categories');
        this.viewTypesBtn = document.getElementById('view-types');
        this.viewRarityLevelsBtn = document.getElementById('view-rarity-levels');
        this.backToDrawBtn = document.getElementById('back-to-draw');
        this.backFromCategoriesBtn = document.getElementById('back-from-categories');
        this.backToCategoriesBtn = document.getElementById('back-to-categories');
        this.backFromTypesBtn = document.getElementById('back-from-types');
        this.backToTypesBtn = document.getElementById('back-to-types');
        this.backFromRarityLevelsBtn = document.getElementById('back-from-rarity-levels');
        
        this.cardContainer = document.getElementById('card-container');
        this.collectionContainer = document.getElementById('collection-container');
        this.categoriesContainer = document.getElementById('categories-container');
        this.categoryPromptsContainer = document.getElementById('category-prompts-container');
        this.typesContainer = document.getElementById('types-container');
        this.typePromptsContainer = document.getElementById('type-prompts-container');
        this.rarityLevelsContainer = document.getElementById('rarity-levels-container');
        
        this.collectionGrid = document.getElementById('collection-grid');
        this.categoriesGrid = document.getElementById('categories-grid');
        this.categoryPromptsGrid = document.getElementById('category-prompts-grid');
        this.typesGrid = document.getElementById('types-grid');
        this.typePromptsGrid = document.getElementById('type-prompts-grid');
        this.rarityLevelsGrid = document.getElementById('rarity-levels-grid');
        
        this.collectionPagination = document.getElementById('collection-pagination');
        this.categoryPagination = document.getElementById('category-pagination');
        this.typePagination = document.getElementById('type-pagination');
        
        this.categoryTitle = document.getElementById('category-title');
        this.typeTitle = document.getElementById('type-title');
        
        this.categoryFilter = document.getElementById('category-filter');
        this.typeFilter = document.getElementById('type-filter');
        this.rarityFilter = document.getElementById('rarity-filter');
        
        this.cardTemplate = document.getElementById('card-template');
        this.categoryTemplate = document.getElementById('category-template');
        this.typeTemplate = document.getElementById('type-template');
        this.rarityTemplate = document.getElementById('rarity-template');
        
        // 状态管理
        this.currentPrompt = null;
        this.currentCategoryId = null;
        this.currentTypeId = null;
        this.collectionPage = 1;
        this.categoryPromptsPage = 1;
        this.typePromptsPage = 1;
        
        // 缓存数据
        this.categories = [];
        this.types = [];
        this.rarityLevels = [];
        
        // 绑定事件处理程序
        this.bindEvents();
        
        // 加载过滤器数据
        this.loadFilterData();
    }
    
    // 绑定事件处理程序
    bindEvents() {
        // 抽卡按钮
        this.drawCardBtn.addEventListener('click', () => {
            this.drawCard();
        });
        
        // 查看收藏按钮
        this.viewCollectionBtn.addEventListener('click', () => {
            this.showCollection();
        });
        
        // 查看分类按钮
        this.viewCategoriesBtn.addEventListener('click', () => {
            this.showCategories();
        });
        
        // 查看类型按钮
        this.viewTypesBtn.addEventListener('click', () => {
            this.showTypes();
        });
        
        // 查看稀有度按钮
        this.viewRarityLevelsBtn.addEventListener('click', () => {
            this.showRarityLevels();
        });
        
        // 各种返回按钮
        this.backToDrawBtn.addEventListener('click', () => {
            this.showDrawCards();
        });
        
        this.backFromCategoriesBtn.addEventListener('click', () => {
            this.showDrawCards();
        });
        
        this.backToCategoriesBtn.addEventListener('click', () => {
            this.showCategories();
        });
        
        this.backFromTypesBtn.addEventListener('click', () => {
            this.showDrawCards();
        });
        
        this.backToTypesBtn.addEventListener('click', () => {
            this.showTypes();
        });
        
        this.backFromRarityLevelsBtn.addEventListener('click', () => {
            this.showDrawCards();
        });
        
        // 过滤器事件
        if (this.categoryFilter) {
            this.categoryFilter.addEventListener('change', () => {
                this.applyFilters();
            });
        }
        
        if (this.typeFilter) {
            this.typeFilter.addEventListener('change', () => {
                this.applyFilters();
            });
        }
        
        if (this.rarityFilter) {
            this.rarityFilter.addEventListener('change', () => {
                this.applyFilters();
            });
        }
    }
    
    // 加载过滤器数据
    async loadFilterData() {
        try {
            // 获取所有分类
            this.categories = await api.getCategories();
            
            // 获取所有类型
            this.types = await api.getPromptTypes();
            
            // 获取所有稀有度等级
            this.rarityLevels = await api.getRarityLevels();
            
            // 填充过滤器下拉菜单
            this.populateFilters();
        } catch (error) {
            console.error('加载过滤器数据失败:', error);
        }
    }
    
    // 填充过滤器下拉菜单
    populateFilters() {
        // 填充分类过滤器
        if (this.categoryFilter) {
            this.categoryFilter.innerHTML = '<option value="">所有分类</option>';
            this.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                this.categoryFilter.appendChild(option);
            });
        }
        
        // 填充类型过滤器
        if (this.typeFilter) {
            this.typeFilter.innerHTML = '<option value="">所有类型</option>';
            this.types.forEach(type => {
                const option = document.createElement('option');
                option.value = type.id;
                option.textContent = type.name;
                this.typeFilter.appendChild(option);
            });
        }
        
        // 填充稀有度过滤器
        if (this.rarityFilter) {
            this.rarityFilter.innerHTML = '<option value="">所有稀有度</option>';
            this.rarityLevels.forEach(rarity => {
                const option = document.createElement('option');
                option.value = rarity.id;
                option.textContent = rarity.name;
                this.rarityFilter.appendChild(option);
            });
        }
    }
    
    // 应用过滤器
    applyFilters() {
        // 根据当前视图应用不同的过滤器
        if (this.categoryPromptsContainer.style.display !== 'none') {
            // 正在查看分类提示词
            this.renderCategoryPrompts(1);
        } else if (this.typePromptsContainer.style.display !== 'none') {
            // 正在查看类型提示词
            this.renderTypePrompts(1);
        }
    }
    
    // 抽取一张卡片
    async drawCard() {
        try {
            // 显示加载提示
            this.cardContainer.innerHTML = `
                <div class="loading">
                    <div class="loading-spinner"></div>
                    <p>正在抽取卡片...</p>
                </div>
            `;
            
            // 从API获取随机提示词
            const promptData = await api.getRandomPrompt();
            this.currentPrompt = promptData;
            
            // 清空现有卡片
            this.cardContainer.innerHTML = '';
            
            // 创建卡片
            const cardElement = this.createCard(promptData);
            
            // 将卡片添加到容器
            this.cardContainer.appendChild(cardElement);
            
            // 添加翻转卡片的事件监听器
            cardElement.addEventListener('click', function() {
                this.classList.toggle('flipped');
            });
            
            // 添加收藏按钮事件监听器
            const collectBtn = cardElement.querySelector('.collect-btn');
            collectBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // 防止触发卡片翻转
                this.collectCard(promptData.id);
            });
        } catch (error) {
            console.error('抽卡失败:', error);
            this.cardContainer.innerHTML = `
                <div class="error">
                    <p>抽卡失败: ${error.message}</p>
                    <button onclick="app.drawCard()">重试</button>
                </div>
            `;
        }
    }
    
    // 创建卡片元素
    createCard(promptData) {
        // 克隆模板
        const cardClone = this.cardTemplate.content.cloneNode(true);
        const card = cardClone.querySelector('.card');
        
        // 填充提示词内容
        const promptText = card.querySelector('.prompt-text');
        promptText.textContent = promptData.prompt_text;
        
        // 设置稀有度颜色
        if (promptData.color_code) {
            card.style.borderColor = promptData.color_code;
            
            // 添加稀有度标记
            const rarityLabel = card.querySelector('.rarity-label');
            if (rarityLabel) {
                rarityLabel.textContent = promptData.rarity_name;
                rarityLabel.style.backgroundColor = promptData.color_code;
                rarityLabel.style.color = this.getContrastColor(promptData.color_code);
            }
        }
        
        // 填充分类标签
        const categoryLabel = card.querySelector('.category-label');
        if (categoryLabel && promptData.category_name) {
            categoryLabel.textContent = promptData.category_name;
        }
        
        // 填充类型标签
        const typeLabel = card.querySelector('.type-label');
        if (typeLabel && promptData.type_name) {
            typeLabel.textContent = promptData.type_name;
        }
        
        // 标记AI生成的提示词
        if (promptData.is_ai_generated) {
            const aiBadge = document.createElement('div');
            aiBadge.className = 'ai-generated-badge';
            aiBadge.textContent = 'AI生成';
            card.appendChild(aiBadge);
        }
        
        // 填充预览图
        const previewImg = card.querySelector('.preview-image img');
        previewImg.src = promptData.preview_url;
        previewImg.alt = `提示词${promptData.id}的预览图`;
        
        return card;
    }
    
    // 获取与背景色对比的文本颜色
    getContrastColor(hexColor) {
        // 移除#前缀
        if (hexColor.startsWith('#')) {
            hexColor = hexColor.slice(1);
        }
        
        // 转换为RGB
        const r = parseInt(hexColor.substr(0, 2), 16);
        const g = parseInt(hexColor.substr(2, 2), 16);
        const b = parseInt(hexColor.substr(4, 2), 16);
        
        // 计算亮度
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        
        // 返回黑色或白色，取决于背景色的亮度
        return brightness > 125 ? '#000000' : '#FFFFFF';
    }
    
    // 收藏卡片
    async collectCard(promptId) {
        try {
            await api.addToCollection(promptId);
            showNotification('已添加到收藏！', 'success');
        } catch (error) {
            console.error('收藏失败:', error);
            showNotification(error.message || '收藏失败', 'error');
        }
    }
    
    // 显示收藏界面
    async showCollection() {
        try {
            // 隐藏其他容器
            this.hideAllContainers();
            this.collectionContainer.style.display = 'block';
            
            // 显示加载提示
            this.collectionGrid.innerHTML = `
                <div class="loading">
                    <div class="loading-spinner"></div>
                    <p>正在加载收藏...</p>
                </div>
            `;
            
            // 重置分页
            this.collectionPage = 1;
            
            // 渲染收藏的卡片
            await this.renderCollection();
        } catch (error) {
            console.error('显示收藏失败:', error);
            this.collectionGrid.innerHTML = `
                <div class="error">
                    <p>加载收藏失败: ${error.message}</p>
                    <button onclick="app.showCollection()">重试</button>
                </div>
            `;
        }
    }
    
    // 显示分类界面
    async showCategories() {
        try {
            // 隐藏其他容器
            this.hideAllContainers();
            this.categoriesContainer.style.display = 'block';
            
            // 显示加载提示
            this.categoriesGrid.innerHTML = `
                <div class="loading">
                    <div class="loading-spinner"></div>
                    <p>正在加载分类...</p>
                </div>
            `;
            
            // 获取所有分类
            const categories = await api.getCategories();
            
            // 渲染分类列表
            this.renderCategories(categories);
        } catch (error) {
            console.error('显示分类失败:', error);
            this.categoriesGrid.innerHTML = `
                <div class="error">
                    <p>加载分类失败: ${error.message}</p>
                    <button onclick="app.showCategories()">重试</button>
                </div>
            `;
        }
    }
    
    // 显示类型界面
    async showTypes() {
        try {
            // 隐藏其他容器
            this.hideAllContainers();
            this.typesContainer.style.display = 'block';
            
            // 显示加载提示
            this.typesGrid.innerHTML = `
                <div class="loading">
                    <div class="loading-spinner"></div>
                    <p>正在加载提示词类型...</p>
                </div>
            `;
            
            // 获取所有类型
            const types = await api.getPromptTypes();
            
            // 渲染类型列表
            this.renderTypes(types);
        } catch (error) {
            console.error('显示类型失败:', error);
            this.typesGrid.innerHTML = `
                <div class="error">
                    <p>加载类型失败: ${error.message}</p>
                    <button onclick="app.showTypes()">重试</button>
                </div>
            `;
        }
    }
    
    // 显示稀有度等级界面
    async showRarityLevels() {
        try {
            // 隐藏其他容器
            this.hideAllContainers();
            this.rarityLevelsContainer.style.display = 'block';
            
            // 显示加载提示
            this.rarityLevelsGrid.innerHTML = `
                <div class="loading">
                    <div class="loading-spinner"></div>
                    <p>正在加载稀有度等级...</p>
                </div>
            `;
            
            // 获取所有稀有度等级
            const rarityLevels = await api.getRarityLevels();
            
            // 渲染稀有度等级列表
            this.renderRarityLevels(rarityLevels);
        } catch (error) {
            console.error('显示稀有度等级失败:', error);
            this.rarityLevelsGrid.innerHTML = `
                <div class="error">
                    <p>加载稀有度等级失败: ${error.message}</p>
                    <button onclick="app.showRarityLevels()">重试</button>
                </div>
            `;
        }
    }
    
    // 显示分类下的提示词
    async showCategoryPrompts(categoryId, categoryName) {
        try {
            // 保存当前分类ID
            this.currentCategoryId = categoryId;
            
            // 设置分类标题
            this.categoryTitle.textContent = `${categoryName} - 提示词列表`;
            
            // 隐藏其他容器
            this.hideAllContainers();
            this.categoryPromptsContainer.style.display = 'block';
            
            // 显示加载提示
            this.categoryPromptsGrid.innerHTML = `
                <div class="loading">
                    <div class="loading-spinner"></div>
                    <p>正在加载提示词...</p>
                </div>
            `;
            
            // 重置分页
            this.categoryPromptsPage = 1;
            
            // 渲染分类下的提示词
            await this.renderCategoryPrompts();
        } catch (error) {
            console.error('显示分类提示词失败:', error);
            this.categoryPromptsGrid.innerHTML = `
                <div class="error">
                    <p>加载提示词失败: ${error.message}</p>
                    <button onclick="app.showCategoryPrompts('${categoryId}', '${categoryName}')">重试</button>
                </div>
            `;
        }
    }
    
    // 显示类型下的提示词
    async showTypePrompts(typeId, typeName) {
        try {
            // 保存当前类型ID
            this.currentTypeId = typeId;
            
            // 设置类型标题
            this.typeTitle.textContent = `${typeName} - 提示词列表`;
            
            // 隐藏其他容器
            this.hideAllContainers();
            this.typePromptsContainer.style.display = 'block';
            
            // 显示加载提示
            this.typePromptsGrid.innerHTML = `
                <div class="loading">
                    <div class="loading-spinner"></div>
                    <p>正在加载提示词...</p>
                </div>
            `;
            
            // 重置分页
            this.typePromptsPage = 1;
            
            // 渲染类型下的提示词
            await this.renderTypePrompts();
        } catch (error) {
            console.error('显示类型提示词失败:', error);
            this.typePromptsGrid.innerHTML = `
                <div class="error">
                    <p>加载提示词失败: ${error.message}</p>
                    <button onclick="app.showTypePrompts('${typeId}', '${typeName}')">重试</button>
                </div>
            `;
        }
    }
    
    // 显示抽卡界面
    showDrawCards() {
        this.hideAllContainers();
        this.cardContainer.style.display = 'flex';
    }
    
    // 隐藏所有容器
    hideAllContainers() {
        this.cardContainer.style.display = 'none';
        this.collectionContainer.style.display = 'none';
        this.categoriesContainer.style.display = 'none';
        this.categoryPromptsContainer.style.display = 'none';
        this.typesContainer.style.display = 'none';
        this.typePromptsContainer.style.display = 'none';
        this.rarityLevelsContainer.style.display = 'none';
    }
    
    // 渲染收藏的卡片
    async renderCollection(page = 1) {
        try {
            // 清空收藏网格
            this.collectionGrid.innerHTML = '';
            
            // 获取用户收藏
            const { data: collectedCards, pagination } = await api.getUserCollections(page);
            
            if (collectedCards.length === 0) {
                this.collectionGrid.innerHTML = '<p>你还没有收藏任何卡片。</p>';
                this.collectionPagination.innerHTML = '';
                return;
            }
            
            // 渲染每张收藏的卡片
            collectedCards.forEach(card => {
                const collectionCard = document.createElement('div');
                collectionCard.className = 'collection-card';
                
                // 添加稀有度指示器
                if (card.color_code) {
                    const rarityIndicator = document.createElement('div');
                    rarityIndicator.className = 'rarity-indicator';
                    rarityIndicator.style.backgroundColor = card.color_code;
                    rarityIndicator.textContent = card.rarity_name;
                    collectionCard.appendChild(rarityIndicator);
                }
                
                // 添加AI生成标记
                if (card.is_ai_generated) {
                    const aiBadge = document.createElement('div');
                    aiBadge.className = 'ai-generated-badge';
                    aiBadge.textContent = 'AI生成';
                    collectionCard.appendChild(aiBadge);
                }
                
                collectionCard.innerHTML += `
                    <h3>提示词</h3>
                    <div class="prompt-text-container">
                        <p class="prompt-text">${card.prompt_text}</p>
                    </div>
                    <div class="preview-image">
                        <img src="${card.preview_url}" alt="预览图">
                    </div>
                    <div class="card-metadata">
                        <span class="type-label">${card.type_name}</span>
                        <span class="category-label">${card.category_name}</span>
                    </div>
                    <button class="remove-btn">移除收藏</button>
                `;
                
                // 添加移除收藏按钮事件
                const removeBtn = collectionCard.querySelector('.remove-btn');
                removeBtn.addEventListener('click', () => {
                    this.removeFromCollection(card.id);
                });
                
                this.collectionGrid.appendChild(collectionCard);
            });
            
            // 渲染分页控件
            this.renderPagination(this.collectionPagination, pagination, (newPage) => {
                this.collectionPage = newPage;
                this.renderCollection(newPage);
            });
        } catch (error) {
            console.error('渲染收藏失败:', error);
            this.collectionGrid.innerHTML = `
                <div class="error">
                    <p>加载收藏失败: ${error.message}</p>
                    <button onclick="app.renderCollection(${page})">重试</button>
                </div>
            `;
        }
    }
    
    // 从收藏中移除
    async removeFromCollection(promptId) {
        try {
            await api.removeFromCollection(promptId);
            showNotification('已从收藏中移除', 'success');
            
            // 刷新收藏列表
            await this.renderCollection(this.collectionPage);
        } catch (error) {
            console.error('移除收藏失败:', error);
            showNotification(error.message || '移除失败', 'error');
        }
    }
    
    // 渲染分类
    renderCategories(categories) {
        // 清空分类网格
        this.categoriesGrid.innerHTML = '';
        
        if (categories.length === 0) {
            this.categoriesGrid.innerHTML = '<p>暂无分类数据。</p>';
            return;
        }
        
        // 渲染每个分类
        categories.forEach(category => {
            // 克隆模板
            const categoryClone = this.categoryTemplate.content.cloneNode(true);
            const categoryCard = categoryClone.querySelector('.category-card');
            
            // 填充分类数据
            const categoryName = categoryCard.querySelector('.category-name');
            categoryName.textContent = category.name;
            
            const promptCount = categoryCard.querySelector('.prompt-count span');
            promptCount.textContent = category.prompt_count;
            
            // 添加图标（如果有）
            const categoryIcon = categoryCard.querySelector('.category-icon');
            if (categoryIcon && category.icon) {
                categoryIcon.textContent = category.icon;
            }
            
            // 添加点击事件
            categoryCard.addEventListener('click', () => {
                this.showCategoryPrompts(category.id, category.name);
            });
            
            // 将分类卡片添加到网格
            this.categoriesGrid.appendChild(categoryCard);
        });
    }
    
    // 渲染类型
    renderTypes(types) {
        // 清空类型网格
        this.typesGrid.innerHTML = '';
        
        if (types.length === 0) {
            this.typesGrid.innerHTML = '<p>暂无类型数据。</p>';
            return;
        }
        
        // 渲染每个类型
        types.forEach(type => {
            // 克隆模板
            const typeClone = this.typeTemplate.content.cloneNode(true);
            const typeCard = typeClone.querySelector('.type-card');
            
            // 填充类型数据
            const typeName = typeCard.querySelector('.type-name');
            typeName.textContent = type.name;
            
            const promptCount = typeCard.querySelector('.prompt-count span');
            promptCount.textContent = type.prompt_count;
            
            // 添加图标（如果有）
            const typeIcon = typeCard.querySelector('.type-icon');
            if (typeIcon && type.icon) {
                typeIcon.textContent = type.icon;
            }
            
            // 添加点击事件
            typeCard.addEventListener('click', () => {
                this.showTypePrompts(type.id, type.name);
            });
            
            // 将类型卡片添加到网格
            this.typesGrid.appendChild(typeCard);
        });
    }
    
    // 渲染稀有度等级
    renderRarityLevels(rarityLevels) {
        // 清空稀有度网格
        this.rarityLevelsGrid.innerHTML = '';
        
        if (rarityLevels.length === 0) {
            this.rarityLevelsGrid.innerHTML = '<p>暂无稀有度数据。</p>';
            return;
        }
        
        // 渲染每个稀有度等级
        rarityLevels.forEach(rarity => {
            // 克隆模板
            const rarityClone = this.rarityTemplate.content.cloneNode(true);
            const rarityCard = rarityClone.querySelector('.rarity-card');
            
            // 设置卡片颜色
            if (rarity.color_code) {
                rarityCard.style.borderColor = rarity.color_code;
                
                const rarityName = rarityCard.querySelector('.rarity-name');
                rarityName.style.color = rarity.color_code;
            }
            
            // 填充稀有度数据
            const rarityName = rarityCard.querySelector('.rarity-name');
            rarityName.textContent = rarity.name;
            
            const promptCount = rarityCard.querySelector('.prompt-count span');
            promptCount.textContent = rarity.prompt_count;
            
            const rarityProbability = rarityCard.querySelector('.rarity-probability span');
            const probability = parseFloat(rarity.probability) * 100;
            rarityProbability.textContent = probability.toFixed(6) + '%';
            
            const rarityInfo = rarityCard.querySelector('.rarity-info');
            rarityInfo.textContent = rarity.description || `质量分数范围: ${rarity.min_score}-${rarity.max_score}`;
            
            // 将稀有度卡片添加到网格
            this.rarityLevelsGrid.appendChild(rarityCard);
        });
    }
    
    // 渲染分类下的提示词
    async renderCategoryPrompts(page = 1) {
        try {
            // 清空提示词网格
            this.categoryPromptsGrid.innerHTML = '';
            
            // 获取过滤器值
            const typeId = this.typeFilter ? this.typeFilter.value : '';
            const rarityId = this.rarityFilter ? this.rarityFilter.value : '';
            
            // 获取分类下的提示词
            const { data: prompts, pagination } = await api.getPromptsByCategory(
                this.currentCategoryId, 
                page,
                typeId,
                rarityId
            );
            
            if (prompts.length === 0) {
                this.categoryPromptsGrid.innerHTML = '<p>该分类下暂无提示词。</p>';
                this.categoryPagination.innerHTML = '';
                return;
            }
            
            // 渲染每个提示词
            prompts.forEach(prompt => {
                const promptCard = document.createElement('div');
                promptCard.className = 'collection-card';
                
                // 添加稀有度指示器
                if (prompt.color_code) {
                    const rarityIndicator = document.createElement('div');
                    rarityIndicator.className = 'rarity-indicator';
                    rarityIndicator.style.backgroundColor = prompt.color_code;
                    rarityIndicator.textContent = prompt.rarity_name;
                    promptCard.appendChild(rarityIndicator);
                }
                
                // 添加AI生成标记
                if (prompt.is_ai_generated) {
                    const aiBadge = document.createElement('div');
                    aiBadge.className = 'ai-generated-badge';
                    aiBadge.textContent = 'AI生成';
                    promptCard.appendChild(aiBadge);
                }
                
                promptCard.innerHTML += `
                    <h3>提示词</h3>
                    <div class="prompt-text-container">
                        <p class="prompt-text">${prompt.prompt_text}</p>
                    </div>
                    <div class="preview-image">
                        <img src="${prompt.preview_url}" alt="预览图">
                    </div>
                    <div class="card-metadata">
                        <span class="type-label">${prompt.type_name}</span>
                    </div>
                    <button class="collect-btn">收藏</button>
                `;
                
                // 添加收藏按钮事件
                const collectBtn = promptCard.querySelector('.collect-btn');
                collectBtn.addEventListener('click', () => {
                    this.collectCard(prompt.id);
                });
                
                this.categoryPromptsGrid.appendChild(promptCard);
            });
            
            // 渲染分页控件
            this.renderPagination(this.categoryPagination, pagination, (newPage) => {
                this.categoryPromptsPage = newPage;
                this.renderCategoryPrompts(newPage);
            });
        } catch (error) {
            console.error('渲染分类提示词失败:', error);
            this.categoryPromptsGrid.innerHTML = `
                <div class="error">
                    <p>加载提示词失败: ${error.message}</p>
                    <button onclick="app.renderCategoryPrompts(${page})">重试</button>
                </div>
            `;
        }
    }
    
    // 渲染类型下的提示词
    async renderTypePrompts(page = 1) {
        try {
            // 清空提示词网格
            this.typePromptsGrid.innerHTML = '';
            
            // 获取过滤器值
            const categoryId = this.categoryFilter ? this.categoryFilter.value : '';
            const rarityId = this.rarityFilter ? this.rarityFilter.value : '';
            
            // 获取类型下的提示词（通过分类API，过滤类型）
            const { data: prompts, pagination } = await api.getPromptsByCategory(
                categoryId || 1, // 如果没有选择分类，使用ID 1
                page,
                this.currentTypeId,
                rarityId
            );
            
            if (prompts.length === 0) {
                this.typePromptsGrid.innerHTML = '<p>该类型下暂无提示词。</p>';
                this.typePagination.innerHTML = '';
                return;
            }
            
            // 渲染每个提示词
            prompts.forEach(prompt => {
                const promptCard = document.createElement('div');
                promptCard.className = 'collection-card';
                
                // 添加稀有度指示器
                if (prompt.color_code) {
                    const rarityIndicator = document.createElement('div');
                    rarityIndicator.className = 'rarity-indicator';
                    rarityIndicator.style.backgroundColor = prompt.color_code;
                    rarityIndicator.textContent = prompt.rarity_name;
                    promptCard.appendChild(rarityIndicator);
                }
                
                // 添加AI生成标记
                if (prompt.is_ai_generated) {
                    const aiBadge = document.createElement('div');
                    aiBadge.className = 'ai-generated-badge';
                    aiBadge.textContent = 'AI生成';
                    promptCard.appendChild(aiBadge);
                }
                
                promptCard.innerHTML += `
                    <h3>提示词</h3>
                    <div class="prompt-text-container">
                        <p class="prompt-text">${prompt.prompt_text}</p>
                    </div>
                    <div class="preview-image">
                        <img src="${prompt.preview_url}" alt="预览图">
                    </div>
                    <div class="card-metadata">
                        <span class="category-label">${prompt.category_name}</span>
                    </div>
                    <button class="collect-btn">收藏</button>
                `;
                
                // 添加收藏按钮事件
                const collectBtn = promptCard.querySelector('.collect-btn');
                collectBtn.addEventListener('click', () => {
                    this.collectCard(prompt.id);
                });
                
                this.typePromptsGrid.appendChild(promptCard);
            });
            
            // 渲染分页控件
            this.renderPagination(this.typePagination, pagination, (newPage) => {
                this.typePromptsPage = newPage;
                this.renderTypePrompts(newPage);
            });
        } catch (error) {
            console.error('渲染类型提示词失败:', error);
            this.typePromptsGrid.innerHTML = `
                <div class="error">
                    <p>加载提示词失败: ${error.message}</p>
                    <button onclick="app.renderTypePrompts(${page})">重试</button>
                </div>
            `;
        }
    }
    
    // 渲染分页控件
    renderPagination(container, pagination, callback) {
        container.innerHTML = '';
        
        if (!pagination || pagination.pages <= 1) {
            return;
        }
        
        // 创建分页按钮
        const createPageButton = (page, text, isActive = false) => {
            const button = document.createElement('button');
            button.textContent = text;
            if (isActive) {
                button.classList.add('active');
            }
            button.addEventListener('click', () => {
                callback(page);
            });
            return button;
        };
        
        // 上一页按钮
        if (pagination.page > 1) {
            container.appendChild(createPageButton(pagination.page - 1, '上一页'));
        }
        
        // 页码按钮
        const maxVisiblePages = 5;
        let startPage = Math.max(1, pagination.page - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(pagination.pages, startPage + maxVisiblePages - 1);
        
        // 调整起始页，确保显示正确数量的页码
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            container.appendChild(createPageButton(i, i.toString(), i === pagination.page));
        }
        
        // 下一页按钮
        if (pagination.page < pagination.pages) {
            container.appendChild(createPageButton(pagination.page + 1, '下一页'));
        }
    }
}

// 初始化应用
let app;
window.addEventListener('DOMContentLoaded', () => {
    app = new PromptBlindBox();
});
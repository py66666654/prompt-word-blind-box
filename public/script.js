// 提示词盲盒主脚本
class PromptBlindBox {
    constructor() {
        // DOM元素
        this.drawCardBtn = document.getElementById('draw-card');
        this.viewCollectionBtn = document.getElementById('view-collection');
        this.viewCategoriesBtn = document.getElementById('view-categories');
        this.backToDrawBtn = document.getElementById('back-to-draw');
        this.backFromCategoriesBtn = document.getElementById('back-from-categories');
        this.backToCategoriesBtn = document.getElementById('back-to-categories');
        this.cardContainer = document.getElementById('card-container');
        this.collectionContainer = document.getElementById('collection-container');
        this.categoriesContainer = document.getElementById('categories-container');
        this.categoryPromptsContainer = document.getElementById('category-prompts-container');
        this.collectionGrid = document.getElementById('collection-grid');
        this.categoriesGrid = document.getElementById('categories-grid');
        this.categoryPromptsGrid = document.getElementById('category-prompts-grid');
        this.collectionPagination = document.getElementById('collection-pagination');
        this.categoryPagination = document.getElementById('category-pagination');
        this.categoryTitle = document.getElementById('category-title');
        this.cardTemplate = document.getElementById('card-template');
        this.categoryTemplate = document.getElementById('category-template');
        
        // 状态管理
        this.currentPrompt = null;
        this.currentCategoryId = null;
        this.collectionPage = 1;
        this.categoryPromptsPage = 1;
        
        // 绑定事件处理程序
        this.bindEvents();
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
        
        // 返回抽卡界面按钮
        this.backToDrawBtn.addEventListener('click', () => {
            this.showDrawCards();
        });
        
        // 返回抽卡界面（从分类）按钮
        this.backFromCategoriesBtn.addEventListener('click', () => {
            this.showDrawCards();
        });
        
        // 返回分类界面按钮
        this.backToCategoriesBtn.addEventListener('click', () => {
            this.showCategories();
        });
    }
    
    // 抽取一张卡片
    async drawCard() {
        try {
            // 显示加载提示
            this.cardContainer.innerHTML = '<div class="loading">正在抽取卡片...</div>';
            
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
            this.cardContainer.innerHTML = `<div class="error">抽卡失败: ${error.message}</div>`;
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
        
        // 填充分类标签
        const categoryLabel = card.querySelector('.category-label');
        categoryLabel.textContent = promptData.category_name;
        
        // 填充预览图
        const previewImg = card.querySelector('.preview-image img');
        previewImg.src = promptData.preview_url;
        previewImg.alt = `提示词${promptData.id}的预览图`;
        
        return card;
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
            this.cardContainer.style.display = 'none';
            this.categoriesContainer.style.display = 'none';
            this.categoryPromptsContainer.style.display = 'none';
            this.collectionContainer.style.display = 'block';
            
            // 显示加载提示
            this.collectionGrid.innerHTML = '<div class="loading">正在加载收藏...</div>';
            
            // 重置分页
            this.collectionPage = 1;
            
            // 渲染收藏的卡片
            await this.renderCollection();
        } catch (error) {
            console.error('显示收藏失败:', error);
            this.collectionGrid.innerHTML = `<div class="error">加载收藏失败: ${error.message}</div>`;
        }
    }
    
    // 显示分类界面
    async showCategories() {
        try {
            // 隐藏其他容器
            this.cardContainer.style.display = 'none';
            this.collectionContainer.style.display = 'none';
            this.categoryPromptsContainer.style.display = 'none';
            this.categoriesContainer.style.display = 'block';
            
            // 显示加载提示
            this.categoriesGrid.innerHTML = '<div class="loading">正在加载分类...</div>';
            
            // 获取所有分类
            const categories = await api.getCategories();
            
            // 渲染分类列表
            this.renderCategories(categories);
        } catch (error) {
            console.error('显示分类失败:', error);
            this.categoriesGrid.innerHTML = `<div class="error">加载分类失败: ${error.message}</div>`;
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
            this.cardContainer.style.display = 'none';
            this.collectionContainer.style.display = 'none';
            this.categoriesContainer.style.display = 'none';
            this.categoryPromptsContainer.style.display = 'block';
            
            // 显示加载提示
            this.categoryPromptsGrid.innerHTML = '<div class="loading">正在加载提示词...</div>';
            
            // 重置分页
            this.categoryPromptsPage = 1;
            
            // 渲染分类下的提示词
            await this.renderCategoryPrompts();
        } catch (error) {
            console.error('显示分类提示词失败:', error);
            this.categoryPromptsGrid.innerHTML = `<div class="error">加载提示词失败: ${error.message}</div>`;
        }
    }
    
    // 显示抽卡界面
    showDrawCards() {
        this.cardContainer.style.display = 'flex';
        this.collectionContainer.style.display = 'none';
        this.categoriesContainer.style.display = 'none';
        this.categoryPromptsContainer.style.display = 'none';
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
                
                collectionCard.innerHTML = `
                    <h3>提示词</h3>
                    <div class="prompt-text-container">
                        <p class="prompt-text">${card.prompt_text}</p>
                    </div>
                    <div class="preview-image">
                        <img src="${card.preview_url}" alt="预览图">
                    </div>
                    <div class="card-category">
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
            this.collectionGrid.innerHTML = `<div class="error">加载收藏失败: ${error.message}</div>`;
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
            
            // 添加点击事件
            categoryCard.addEventListener('click', () => {
                this.showCategoryPrompts(category.id, category.name);
            });
            
            // 将分类卡片添加到网格
            this.categoriesGrid.appendChild(categoryCard);
        });
    }
    
    // 渲染分类下的提示词
    async renderCategoryPrompts(page = 1) {
        try {
            // 清空提示词网格
            this.categoryPromptsGrid.innerHTML = '';
            
            // 获取分类下的提示词
            const { data: prompts, pagination } = await api.getPromptsByCategory(this.currentCategoryId, page);
            
            if (prompts.length === 0) {
                this.categoryPromptsGrid.innerHTML = '<p>该分类下暂无提示词。</p>';
                this.categoryPagination.innerHTML = '';
                return;
            }
            
            // 渲染每个提示词
            prompts.forEach(prompt => {
                const promptCard = document.createElement('div');
                promptCard.className = 'collection-card';
                
                promptCard.innerHTML = `
                    <h3>提示词</h3>
                    <div class="prompt-text-container">
                        <p class="prompt-text">${prompt.prompt_text}</p>
                    </div>
                    <div class="preview-image">
                        <img src="${prompt.preview_url}" alt="预览图">
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
            this.categoryPromptsGrid.innerHTML = `<div class="error">加载提示词失败: ${error.message}</div>`;
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
window.addEventListener('DOMContentLoaded', () => {
    const app = new PromptBlindBox();
});
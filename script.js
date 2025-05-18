// 示例提示词数据（实际应用中可能会从API获取）
const promptData = [
    {
        id: 1,
        prompt: "一个机械风格的未来城市，高耸的金属塔楼，霓虹灯闪烁，飞行器穿梭其中",
        previewUrl: "https://placehold.co/600x400/4a6bdf/ffffff?text=未来城市预览"
    },
    {
        id: 2,
        prompt: "一个魔法森林，巨大的蘑菇树，发光的植物，小精灵在其中飞舞",
        previewUrl: "https://placehold.co/600x400/4a6bdf/ffffff?text=魔法森林预览"
    },
    {
        id: 3,
        prompt: "一位科幻战士，穿着高科技装甲，手持能量武器，背景是太空战场",
        previewUrl: "https://placehold.co/600x400/4a6bdf/ffffff?text=科幻战士预览"
    },
    {
        id: 4,
        prompt: "水下古代城市遗迹，破损的石柱和雕像，五彩斑斓的鱼群穿梭，阳光透过水面形成光束",
        previewUrl: "https://placehold.co/600x400/4a6bdf/ffffff?text=水下遗迹预览"
    },
    {
        id: 5,
        prompt: "一个非常非常长的提示词，包含大量细节描述，以测试卡片如何处理超长文本。这个场景描述了一个神秘的古代图书馆，书架高耸入云，每一本书都散发着淡淡的魔法光芒。图书管理员是一位年迈的精灵，有着锐利的眼睛和长长的银发。图书馆的穹顶是由水晶制成，日光透过时会投射出彩虹般的光束。这里的每一本书都含有一个完整的世界，当你阅读时，你会被暂时传送到那个世界体验故事。图书馆的中央有一个巨大的沙漏，沙子流动的速度会根据外面世界的和平程度而变化。",
        previewUrl: "https://placehold.co/600x400/4a6bdf/ffffff?text=古代图书馆预览"
    }
];

// 获取DOM元素
const drawCardBtn = document.getElementById('draw-card');
const viewCollectionBtn = document.getElementById('view-collection');
const backToDrawBtn = document.getElementById('back-to-draw');
const cardContainer = document.getElementById('card-container');
const collectionContainer = document.getElementById('collection-container');
const collectionGrid = document.getElementById('collection-grid');
const cardTemplate = document.getElementById('card-template');

// 存储已收藏的卡片
let collectedCards = [];
// 追踪已抽取的卡片索引，避免重复
let drawnIndices = [];

// 初始化应用
function init() {
    // 从本地存储加载收藏
    loadCollection();
    
    // 添加事件监听器
    drawCardBtn.addEventListener('click', drawCard);
    viewCollectionBtn.addEventListener('click', showCollection);
    backToDrawBtn.addEventListener('click', showDrawCards);
    
    // 初始显示抽卡界面
    showDrawCards();
}

// 抽取一张卡片
function drawCard() {
    // 清空现有卡片
    cardContainer.innerHTML = '';
    
    // 如果所有卡片都抽过一遍，则重置
    if (drawnIndices.length === promptData.length) {
        drawnIndices = [];
    }
    
    // 随机选择一个未抽取过的卡片索引
    let randomIndex;
    do {
        randomIndex = Math.floor(Math.random() * promptData.length);
    } while (drawnIndices.includes(randomIndex));
    
    drawnIndices.push(randomIndex);
    
    // 获取提示词数据
    const promptItem = promptData[randomIndex];
    
    // 创建卡片
    const cardElement = createCard(promptItem);
    
    // 将卡片添加到容器
    cardContainer.appendChild(cardElement);
    
    // 添加翻转卡片的事件监听器
    cardElement.addEventListener('click', function() {
        this.classList.toggle('flipped');
    });
    
    // 添加收藏按钮事件监听器
    const collectBtn = cardElement.querySelector('.collect-btn');
    collectBtn.addEventListener('click', function(e) {
        e.stopPropagation(); // 防止触发卡片翻转
        collectCard(promptItem);
    });
}

// 创建卡片元素
function createCard(promptItem) {
    // 克隆模板
    const cardClone = cardTemplate.content.cloneNode(true);
    const card = cardClone.querySelector('.card');
    
    // 填充提示词内容
    const promptText = card.querySelector('.prompt-text');
    promptText.textContent = promptItem.prompt;
    
    // 填充预览图
    const previewImg = card.querySelector('.preview-image img');
    previewImg.src = promptItem.previewUrl;
    previewImg.alt = `提示词${promptItem.id}的预览图`;
    
    return card;
}

// 收藏卡片
function collectCard(promptItem) {
    // 检查是否已收藏
    if (!collectedCards.some(card => card.id === promptItem.id)) {
        collectedCards.push(promptItem);
        saveCollection();
        alert('已添加到收藏！');
    } else {
        alert('这张卡片已经在收藏中了！');
    }
}

// 显示收藏界面
function showCollection() {
    cardContainer.style.display = 'none';
    collectionContainer.style.display = 'block';
    drawCardBtn.style.display = 'none';
    viewCollectionBtn.style.display = 'none';
    
    // 渲染收藏的卡片
    renderCollection();
}

// 显示抽卡界面
function showDrawCards() {
    cardContainer.style.display = 'flex';
    collectionContainer.style.display = 'none';
    drawCardBtn.style.display = 'inline-block';
    viewCollectionBtn.style.display = 'inline-block';
}

// 渲染收藏的卡片
function renderCollection() {
    collectionGrid.innerHTML = '';
    
    if (collectedCards.length === 0) {
        collectionGrid.innerHTML = '<p>你还没有收藏任何卡片。</p>';
        return;
    }
    
    collectedCards.forEach(card => {
        const collectionCard = document.createElement('div');
        collectionCard.className = 'collection-card';
        
        collectionCard.innerHTML = `
            <h3>提示词</h3>
            <div class="prompt-text-container">
                <p class="prompt-text">${card.prompt}</p>
            </div>
            <div class="preview-image">
                <img src="${card.previewUrl}" alt="预览图">
            </div>
            <button class="remove-btn">移除收藏</button>
        `;
        
        // 添加移除收藏按钮事件
        const removeBtn = collectionCard.querySelector('.remove-btn');
        removeBtn.addEventListener('click', () => {
            removeFromCollection(card.id);
        });
        
        collectionGrid.appendChild(collectionCard);
    });
}

// 从收藏中移除
function removeFromCollection(cardId) {
    collectedCards = collectedCards.filter(card => card.id !== cardId);
    saveCollection();
    renderCollection();
}

// 保存收藏到本地存储
function saveCollection() {
    localStorage.setItem('promptCollection', JSON.stringify(collectedCards));
}

// 从本地存储加载收藏
function loadCollection() {
    const storedCollection = localStorage.getItem('promptCollection');
    if (storedCollection) {
        collectedCards = JSON.parse(storedCollection);
    }
}

// 初始化应用
window.addEventListener('DOMContentLoaded', init);
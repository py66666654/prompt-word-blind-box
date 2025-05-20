# 提示词盲盒（Prompt Word Blind Box）

![提示词盲盒](https://placehold.co/800x200/4a6bdf/ffffff?text=提示词盲盒)

提示词盲盒是一个创新的Web应用，让用户以盲盒形式随机抽取、收集和分享AI提示词，拥有完整的社交互动功能和管理员后台系统。

## ✨ 主要特色

- **抽卡系统**：随机抽取提示词，正面显示内容，背面显示预览图，带有精美翻转动画
- **多层稀有度**：六个稀有度等级，从普通到传说级，概率从50%到0.001%不等
- **收藏系统**：收集喜欢的提示词，打造个人专属提示词库
- **社交互动**：评分、评论、分享、关注用户，查看排行榜和个人动态
- **创意组合**：角色卡、世界卡、剧情卡可自由组合，激发创作灵感
- **成就系统**：完成各种挑战解锁成就，提高参与度和留存率
- **协作创作**：多人协作优化提示词，共同打造高质量内容
- **AI生成系统**：自动生成高质量提示词，持续丰富内容库
- **完整后台**：功能齐全的管理员界面，可视化管理所有内容

## 🎮 用户功能

### 盲盒抽卡功能
- 随机抽取不同类型的提示词（图像、文本、视频、音频、Agent）
- 基于分层概率的稀有度系统，越稀有的提示词越难抽到
- 50%概率抽到人工精选提示词，50%概率抽到AI自动生成提示词
- 抽卡历史记录查看，可以看到所有抽过的卡片

### 浏览与收藏
- 按分类、类型、稀有度浏览所有提示词
- 收藏喜欢的提示词到个人收藏夹
- 可视化展示收藏进度和稀有度分布

### 社交互动系统
- 为提示词评分和评论
- 分享提示词到社交媒体
- 关注其他用户，查看其活动和收藏
- 个人主页展示用户成就、收藏和活动
- 实时通知系统，获取互动和系统消息

### 创意卡片系统
- 角色卡：人物特征、性格、背景故事、动机等
- 世界卡：世界观、环境、文化、科技/魔法体系等
- 剧情卡：情节设计、转折点、结局方向等
- 三种卡片自由组合，构建完整创意框架

### 挑战与成就
- 日常、周常、特殊挑战系统
- 成就解锁机制，展示用户成长轨迹
- 排行榜系统，展示抽卡、收藏、评分等多种榜单

### 协作创作
- 创建协作提示词项目
- 邀请其他用户共同优化提示词
- 版本历史记录，追踪改进过程
- 完成后将协作成果添加到提示词库

## 🛠️ 管理员功能

### 管理员后台
- 直观的数据仪表盘，展示系统关键指标
- 可视化图表分析用户活动和内容分布
- 完整用户和内容管理界面

### 提示词管理
- 浏览、筛选、搜索所有提示词
- 添加、编辑、删除提示词
- 批量生成AI提示词，可指定类型和数量
- 批量导入提示词（CSV、JSON、文本）
- 设置提示词质量分数和稀有度

### 内容审核系统
- 审核用户生成内容和AI生成内容
- 自动内容过滤机制，标记可能违规内容
- 处理用户举报，维护社区环境
- 实时监控系统健康状态

### 用户管理
- 查看用户信息和活动历史
- 管理用户权限和状态
- 处理用户违规行为（警告、禁言等）
- 发送系统通知和广播

## 💻 技术栈

- **前端**：HTML5, CSS3, JavaScript
- **后端**：Node.js, Express.js
- **数据库**：MySQL
- **认证**：JWT token
- **实时通信**：WebSocket

## 📊 稀有度系统

| 稀有度 | 质量分数 | 抽取概率 | 颜色标识 |
|-------|---------|---------|--------|
| 普通 | 0-39 | 50% | #AAAAAA |
| 优质 | 40-69 | 39% | #55AA55 |
| 精品 | 70-84 | 9% | #5555FF |
| 珍贵 | 85-94 | 1.9% | #AA55AA |
| 稀有 | 95-98 | 0.099% | #FFAA00 |
| 传说 | 99-100 | 0.001% | #FF5555 |

## 🚀 快速开始

### 前提条件
- Node.js (v14+)
- MySQL (v8+)

### 安装步骤

1. **克隆仓库**
   ```bash
   git clone https://github.com/py66666654/prompt-word-blind-box.git
   cd prompt-word-blind-box
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置环境变量**
   ```bash
   cp .env.example .env
   # 编辑.env文件，填写数据库连接信息和JWT密钥
   ```

4. **初始化数据库**
   ```bash
   # 使用MySQL客户端执行SQL脚本
   mysql -u your_username -p < database_schema_updated.sql
   
   # 导入示例数据（可选）
   mysql -u your_username -p your_database < database/character_cards.sql
   mysql -u your_username -p your_database < database/world_cards.sql
   mysql -u your_username -p your_database < database/plot_cards.sql
   ```

5. **启动服务器**
   ```bash
   npm start
   ```

6. **访问应用**
   ```
   前台: http://localhost:3000
   后台: http://localhost:3000/admin-dashboard.html
   ```

## 📁 项目结构

```
prompt-word-blind-box/
├── config/             # 配置文件
├── controllers/        # 控制器
│   ├── prompt.controller.updated.js  # 提示词控制器
│   ├── admin.controller.js           # 管理员控制器
│   └── ...                           # 其他控制器
├── middlewares/        # 中间件
├── routes/             # 路由
│   ├── admin.routes.js              # 管理员API路由
│   └── ...                          # 其他路由
├── services/           # 服务
│   ├── ai-prompt-generator.js       # AI提示词生成服务
│   └── ...                          # 其他服务
├── public/             # 前端文件
│   ├── index.html                   # 主页
│   ├── admin-dashboard.html         # 管理员后台
│   ├── admin-styles.css             # 管理员后台样式
│   ├── admin-script.js              # 管理员后台脚本
│   └── ...                          # 其他前端文件
├── database/           # 数据库脚本
│   ├── character_cards.sql          # 角色卡数据
│   ├── world_cards.sql              # 世界卡数据
│   └── plot_cards.sql               # 剧情卡数据
├── docs/               # 项目文档
├── .env.example        # 环境变量示例
├── database_schema_updated.sql      # 数据库架构
├── package.json        # 项目依赖
└── server.js           # 服务器入口文件
```

## 🧑‍💻 开发指南

### 添加新的提示词

#### 通过管理员界面（推荐）
1. 登录管理员后台 (`/admin-dashboard.html`)
2. 进入"提示词管理"部分
3. 点击"添加提示词"或"批量导入"

#### 通过数据库脚本
1. 编辑 `database_schema_updated.sql` 文件
2. 在 `prompt_cards` 表中添加新的提示词记录
3. 重新执行SQL脚本或手动添加到数据库

### 修改稀有度概率
1. 编辑 `database_schema_updated.sql` 文件中的 `rarity_levels` 表
2. 修改 `probability` 字段的值
3. 更新数据库记录

### 创建新的创意卡片
1. 登录管理员后台
2. 选择相应的卡片类型（角色卡、世界卡、剧情卡）
3. 点击"添加卡片"并填写信息

或通过SQL文件：
1. 编辑对应的SQL文件（`character_cards.sql`、`world_cards.sql`或`plot_cards.sql`）
2. 添加新的卡片记录
3. 执行SQL文件更新数据库

## 🤝 贡献指南

1. Fork 仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建一个 Pull Request

## 📝 许可证

MIT License

## 📬 联系方式

如有问题或建议，请提交 issue 或通过以下方式联系我：

- GitHub Issues: [提交问题](https://github.com/py66666654/prompt-word-blind-box/issues)
- Email: 452367132@qq.com

---

祝您抽到传说级提示词！✨
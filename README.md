# 提示词盲盒（Prompt Word Blind Box）

提示词盲盒是一个创新的网页应用，让用户可以随机抽取各种类型的AI提示词，并以盲盒的形式呈现，增加趣味性和收藏价值。

## 功能特点

- **盲盒抽卡系统**：随机抽取提示词，正面显示提示词，背面显示预览结果
- **分层概率**：不同稀有度的提示词有不同的抽取概率，传说级别极为稀有（0.001%）
- **多种提示词类型**：支持图像生成、文字对话、视频生成、音频生成和Agent提示词
- **数字藏品系统**：用户可以收藏喜欢的提示词卡片
- **AI自动生成**：50%概率抽取AI自动生成的提示词
- **分类浏览**：按分类、类型、稀有度浏览提示词
- **精美UI**：卡片翻转动画，稀有度颜色标识，长提示词滚动查看

## 技术栈

- **前端**：HTML5, CSS3, JavaScript (原生)
- **后端**：Node.js, Express.js
- **数据库**：MySQL
- **认证**：JWT token

## 稀有度等级和概率

| 稀有度 | 质量分数 | 抽取概率 | 特点 |
|-------|---------|---------|------|
| 普通 | 0-39 | 50% | 基础提示词，适合入门使用 |
| 优质 | 40-69 | 39% | 优化过的提示词，有一定参考价值 |
| 精品 | 70-84 | 9% | 经过精心设计的高质量提示词 |
| 珍贵 | 85-94 | 1.9% | 专业级提示词，效果出众 |
| 稀有 | 95-98 | 0.099% | 极为稀有的顶级提示词 |
| 传说 | 99-100 | 0.001% | 传说级别提示词，价值连城 |

## 安装与使用

### 前提条件

- Node.js (v14+)
- MySQL (v8+)

### 安装步骤

1. 克隆仓库
   ```bash
   git clone https://github.com/your-username/prompt-word-blind-box.git
   cd prompt-word-blind-box
   ```

2. 安装依赖
   ```bash
   npm install
   ```

3. 配置环境变量
   ```bash
   cp .env.example .env
   # 编辑.env文件，填写数据库连接信息
   ```

4. 初始化数据库
   ```bash
   # 使用MySQL客户端执行SQL脚本
   mysql -u your_username -p < database_schema_updated.sql
   ```

5. 启动服务器
   ```bash
   npm start
   ```

6. 访问应用
   ```
   http://localhost:3000
   ```

## 开发者指南

### 项目结构

```
prompt-word-blind-box/
├── config/             # 配置文件
├── controllers/        # 控制器
├── middlewares/        # 中间件
├── routes/             # 路由
├── services/           # 服务
├── public/             # 前端文件
│   ├── index.html      # 主HTML文件
│   ├── styles.css      # 样式文件
│   ├── script.js       # 主脚本文件
│   ├── api.js          # API封装
│   └── auth.js         # 认证逻辑
├── .env.example        # 环境变量示例
├── database_schema.sql # 数据库架构
├── package.json        # 项目依赖
└── server.js           # 服务器入口文件
```

### 添加新的提示词

1. 编辑 `database_schema_updated.sql` 文件
2. 在 `prompt_cards` 表中添加新的提示词记录
3. 重新执行SQL脚本或手动添加到数据库

### 修改稀有度概率

1. 编辑 `database_schema_updated.sql` 文件中的 `rarity_levels` 表
2. 修改 `probability` 字段的值
3. 更新数据库记录

## 贡献指南

1. Fork 仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建一个 Pull Request

## 许可证

MIT License

## 联系方式

如有问题或建议，请提交 issue 或通过以下方式联系我：

- 邮箱：your-email@example.com
- 网站：your-website.com

---

祝您抽到传说级提示词！
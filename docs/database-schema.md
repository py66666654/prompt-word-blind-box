# 提示词盲盒数据库架构设计

## 数据库概述

提示词盲盒应用使用MySQL关系型数据库存储所有应用数据，包括用户信息、提示词内容、收藏记录和社交互动数据。数据库设计遵循规范化原则，确保数据完整性和高效查询性能。

## 数据库设置

- **数据库名称**: `prompt_blind_box_db`
- **字符集**: `utf8mb4`
- **排序规则**: `utf8mb4_unicode_ci`

## 主要数据表

### 核心功能表

#### 提示词类型表 (prompt_types)

存储不同类型的提示词分类（如图像、文字、视频等）。

| 字段名 | 类型 | 描述 | 约束 |
|-------|------|------|------|
| id | INT | 类型ID | PRIMARY KEY, AUTO_INCREMENT |
| name | VARCHAR(50) | 类型名称 | NOT NULL |
| description | TEXT | 类型描述 | |
| icon | VARCHAR(50) | 类型图标 | |
| created_at | TIMESTAMP | 创建时间 | DEFAULT CURRENT_TIMESTAMP |

#### 提示词质量等级表 (rarity_levels)

定义提示词的稀有度等级及其概率权重。

| 字段名 | 类型 | 描述 | 约束 |
|-------|------|------|------|
| id | INT | 等级ID | PRIMARY KEY, AUTO_INCREMENT |
| name | VARCHAR(50) | 等级名称 | NOT NULL |
| description | TEXT | 等级描述 | |
| min_score | INT | 该等级的最低分数 | NOT NULL |
| max_score | INT | 该等级的最高分数 | NOT NULL |
| probability | DECIMAL(10,8) | 抽中该等级的概率 | NOT NULL |
| color_code | VARCHAR(20) | 用于前端显示的颜色代码 | NOT NULL |
| created_at | TIMESTAMP | 创建时间 | DEFAULT CURRENT_TIMESTAMP |

#### 提示词分类表 (categories)

存储提示词的主题分类（如人物、风景、艺术风格等）。

| 字段名 | 类型 | 描述 | 约束 |
|-------|------|------|------|
| id | INT | 分类ID | PRIMARY KEY, AUTO_INCREMENT |
| name | VARCHAR(50) | 分类名称 | NOT NULL |
| description | TEXT | 分类描述 | |
| icon | VARCHAR(50) | 分类图标 | |
| created_at | TIMESTAMP | 创建时间 | DEFAULT CURRENT_TIMESTAMP |

#### 提示词卡片表 (prompt_cards)

存储所有提示词卡片的详细信息。

| 字段名 | 类型 | 描述 | 约束 |
|-------|------|------|------|
| id | INT | 提示词ID | PRIMARY KEY, AUTO_INCREMENT |
| prompt_text | TEXT | 提示词文本内容 | NOT NULL |
| preview_url | VARCHAR(255) | 预览图片URL | |
| category_id | INT | 分类ID | FOREIGN KEY -> categories(id) |
| type_id | INT | 提示词类型ID | FOREIGN KEY -> prompt_types(id) |
| quality_score | INT | 质量分数(0-100) | DEFAULT 50 |
| rarity_level_id | INT | 稀有度等级ID | FOREIGN KEY -> rarity_levels(id) |
| source | VARCHAR(255) | 提示词来源 | |
| is_ai_generated | BOOLEAN | 是否由AI生成 | DEFAULT FALSE |
| metadata | JSON | 额外元数据 | |
| created_at | TIMESTAMP | 创建时间 | DEFAULT CURRENT_TIMESTAMP |

### 用户相关表

#### 用户表 (users)

存储用户账户信息。

| 字段名 | 类型 | 描述 | 约束 |
|-------|------|------|------|
| id | INT | 用户ID | PRIMARY KEY, AUTO_INCREMENT |
| username | VARCHAR(50) | 用户名 | NOT NULL, UNIQUE |
| password_hash | VARCHAR(255) | 密码哈希 | NOT NULL |
| email | VARCHAR(100) | 电子邮箱 | UNIQUE |
| points | INT | 用户积分 | DEFAULT 0 |
| premium | BOOLEAN | 是否为高级用户 | DEFAULT FALSE |
| profile_image | VARCHAR(255) | 用户头像URL | |
| bio | TEXT | 用户简介 | |
| reset_token | VARCHAR(255) | 密码重置令牌 | DEFAULT NULL |
| reset_token_expiry | DATETIME | 密码重置令牌过期时间 | DEFAULT NULL |
| email_verified | BOOLEAN | 邮箱是否已验证 | DEFAULT FALSE |
| verification_token | VARCHAR(255) | 邮箱验证令牌 | DEFAULT NULL |
| created_at | TIMESTAMP | 创建时间 | DEFAULT CURRENT_TIMESTAMP |

#### 用户收藏表 (user_collections)

记录用户收藏的提示词卡片。

| 字段名 | 类型 | 描述 | 约束 |
|-------|------|------|------|
| id | INT | 收藏记录ID | PRIMARY KEY, AUTO_INCREMENT |
| user_id | INT | 用户ID | FOREIGN KEY -> users(id) |
| prompt_card_id | INT | 提示词卡片ID | FOREIGN KEY -> prompt_cards(id) |
| collected_at | TIMESTAMP | 收藏时间 | DEFAULT CURRENT_TIMESTAMP |
|  |  |  | UNIQUE (user_id, prompt_card_id) |

#### 抽卡历史记录表 (draw_history)

记录用户抽取提示词卡片的历史。

| 字段名 | 类型 | 描述 | 约束 |
|-------|------|------|------|
| id | INT | 记录ID | PRIMARY KEY, AUTO_INCREMENT |
| user_id | INT | 用户ID | FOREIGN KEY -> users(id) |
| prompt_card_id | INT | 提示词卡片ID | FOREIGN KEY -> prompt_cards(id) |
| drawn_at | TIMESTAMP | 抽取时间 | DEFAULT CURRENT_TIMESTAMP |

### 社交互动表

#### 提示词评分表 (ratings)

记录用户对提示词的评分。

| 字段名 | 类型 | 描述 | 约束 |
|-------|------|------|------|
| id | INT | 评分ID | PRIMARY KEY, AUTO_INCREMENT |
| user_id | INT | 用户ID | FOREIGN KEY -> users(id) |
| prompt_card_id | INT | 提示词卡片ID | FOREIGN KEY -> prompt_cards(id) |
| rating | INT | 评分(1-5) | NOT NULL, CHECK (rating BETWEEN 1 AND 5) |
| created_at | TIMESTAMP | 创建时间 | DEFAULT CURRENT_TIMESTAMP |
| updated_at | TIMESTAMP | 更新时间 | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP |
|  |  |  | UNIQUE (user_id, prompt_card_id) |

#### 提示词评论表 (comments)

存储用户对提示词的评论，支持嵌套回复。

| 字段名 | 类型 | 描述 | 约束 |
|-------|------|------|------|
| id | INT | 评论ID | PRIMARY KEY, AUTO_INCREMENT |
| user_id | INT | 用户ID | FOREIGN KEY -> users(id) |
| prompt_card_id | INT | 提示词卡片ID | FOREIGN KEY -> prompt_cards(id) |
| comment_text | TEXT | 评论内容 | NOT NULL |
| parent_id | INT | 父评论ID | FOREIGN KEY -> comments(id), DEFAULT NULL |
| created_at | TIMESTAMP | 创建时间 | DEFAULT CURRENT_TIMESTAMP |
| updated_at | TIMESTAMP | 更新时间 | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP |

#### 分享记录表 (shares)

记录用户分享提示词的行为。

| 字段名 | 类型 | 描述 | 约束 |
|-------|------|------|------|
| id | INT | 分享ID | PRIMARY KEY, AUTO_INCREMENT |
| user_id | INT | 用户ID | FOREIGN KEY -> users(id) |
| prompt_card_id | INT | 提示词卡片ID | FOREIGN KEY -> prompt_cards(id) |
| platform | VARCHAR(50) | 分享平台 | NOT NULL |
| share_url | VARCHAR(255) | 分享链接 | |
| created_at | TIMESTAMP | 创建时间 | DEFAULT CURRENT_TIMESTAMP |

#### 用户关注表 (followers)

记录用户之间的关注关系。

| 字段名 | 类型 | 描述 | 约束 |
|-------|------|------|------|
| id | INT | 关注ID | PRIMARY KEY, AUTO_INCREMENT |
| follower_id | INT | 关注者ID | FOREIGN KEY -> users(id) |
| followed_id | INT | 被关注者ID | FOREIGN KEY -> users(id) |
| created_at | TIMESTAMP | 创建时间 | DEFAULT CURRENT_TIMESTAMP |
|  |  |  | UNIQUE (follower_id, followed_id) |

#### 用户活动表 (user_activities)

记录用户的各种活动，用于生成活动流。

| 字段名 | 类型 | 描述 | 约束 |
|-------|------|------|------|
| id | INT | 活动ID | PRIMARY KEY, AUTO_INCREMENT |
| user_id | INT | 用户ID | FOREIGN KEY -> users(id) |
| activity_type | ENUM | 活动类型 | NOT NULL |
| reference_id | INT | 相关记录ID | NOT NULL |
| created_at | TIMESTAMP | 创建时间 | DEFAULT CURRENT_TIMESTAMP |

#### 通知表 (notifications)

存储用户接收的通知信息。

| 字段名 | 类型 | 描述 | 约束 |
|-------|------|------|------|
| id | INT | 通知ID | PRIMARY KEY, AUTO_INCREMENT |
| user_id | INT | 接收通知的用户ID | FOREIGN KEY -> users(id) |
| sender_id | INT | 触发通知的用户ID | FOREIGN KEY -> users(id), DEFAULT NULL |
| notification_type | ENUM | 通知类型 | NOT NULL |
| reference_id | INT | 相关记录ID | |
| message | TEXT | 通知消息内容 | NOT NULL |
| is_read | BOOLEAN | 是否已读 | DEFAULT FALSE |
| created_at | TIMESTAMP | 创建时间 | DEFAULT CURRENT_TIMESTAMP |

### 成就与挑战表

#### 成就类型表 (achievement_types)

定义各种成就类型。

| 字段名 | 类型 | 描述 | 约束 |
|-------|------|------|------|
| id | INT | 成就类型ID | PRIMARY KEY, AUTO_INCREMENT |
| name | VARCHAR(50) | 成就名称 | NOT NULL |
| description | TEXT | 成就描述 | NOT NULL |
| icon | VARCHAR(255) | 成就图标URL | |
| category | ENUM | 成就类别 | NOT NULL |
| created_at | TIMESTAMP | 创建时间 | DEFAULT CURRENT_TIMESTAMP |

#### 成就等级表 (achievement_levels)

定义成就的不同等级和要求。

| 字段名 | 类型 | 描述 | 约束 |
|-------|------|------|------|
| id | INT | 成就等级ID | PRIMARY KEY, AUTO_INCREMENT |
| achievement_type_id | INT | 成就类型ID | FOREIGN KEY -> achievement_types(id) |
| level | INT | 等级 | NOT NULL |
| name | VARCHAR(50) | 等级名称 | NOT NULL |
| description | TEXT | 等级描述 | NOT NULL |
| requirement | INT | 达成该等级需要的数量 | NOT NULL |
| points | INT | 获得的积分 | NOT NULL |
| badge_url | VARCHAR(255) | 徽章图片URL | |
| created_at | TIMESTAMP | 创建时间 | DEFAULT CURRENT_TIMESTAMP |
|  |  |  | UNIQUE (achievement_type_id, level) |

#### 用户成就表 (user_achievements)

记录用户的成就进度和状态。

| 字段名 | 类型 | 描述 | 约束 |
|-------|------|------|------|
| id | INT | 记录ID | PRIMARY KEY, AUTO_INCREMENT |
| user_id | INT | 用户ID | FOREIGN KEY -> users(id) |
| achievement_level_id | INT | 成就等级ID | FOREIGN KEY -> achievement_levels(id) |
| current_progress | INT | 当前进度 | NOT NULL DEFAULT 0 |
| unlocked | BOOLEAN | 是否已解锁 | DEFAULT FALSE |
| unlocked_at | TIMESTAMP | 解锁时间 | NULL |
| created_at | TIMESTAMP | 创建时间 | DEFAULT CURRENT_TIMESTAMP |
| updated_at | TIMESTAMP | 更新时间 | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP |
|  |  |  | UNIQUE (user_id, achievement_level_id) |

#### 排行榜类型表 (leaderboard_types)

定义不同类型的排行榜。

| 字段名 | 类型 | 描述 | 约束 |
|-------|------|------|------|
| id | INT | 排行榜类型ID | PRIMARY KEY, AUTO_INCREMENT |
| name | VARCHAR(50) | 排行榜名称 | NOT NULL |
| description | TEXT | 排行榜描述 | NOT NULL |
| calculation_type | ENUM | 计算方式 | NOT NULL |
| time_period | ENUM | 时间范围 | NOT NULL |
| created_at | TIMESTAMP | 创建时间 | DEFAULT CURRENT_TIMESTAMP |

#### 排行榜记录表 (leaderboard_entries)

存储各排行榜中的用户排名记录。

| 字段名 | 类型 | 描述 | 约束 |
|-------|------|------|------|
| id | INT | 记录ID | PRIMARY KEY, AUTO_INCREMENT |
| leaderboard_type_id | INT | 排行榜类型ID | FOREIGN KEY -> leaderboard_types(id) |
| user_id | INT | 用户ID | FOREIGN KEY -> users(id) |
| score | DECIMAL(10,2) | 分数 | NOT NULL |
| rank | INT | 排名 | NOT NULL |
| period_start | DATE | 周期开始日期 | NOT NULL |
| period_end | DATE | 周期结束日期 | NOT NULL |
| created_at | TIMESTAMP | 创建时间 | DEFAULT CURRENT_TIMESTAMP |
| updated_at | TIMESTAMP | 更新时间 | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP |
|  |  |  | UNIQUE (leaderboard_type_id, user_id, period_start, period_end) |

#### 挑战类型表 (challenge_types)

定义不同类型的挑战任务。

| 字段名 | 类型 | 描述 | 约束 |
|-------|------|------|------|
| id | INT | 挑战类型ID | PRIMARY KEY, AUTO_INCREMENT |
| name | VARCHAR(100) | 挑战名称 | NOT NULL |
| description | TEXT | 挑战描述 | NOT NULL |
| icon | VARCHAR(255) | 挑战图标URL | |
| requirement_type | ENUM | 完成条件类型 | NOT NULL |
| requirement_count | INT | 完成挑战需要的数量 | NOT NULL |
| points | INT | 完成后获得的积分 | NOT NULL |
| created_at | TIMESTAMP | 创建时间 | DEFAULT CURRENT_TIMESTAMP |

#### 挑战活动表 (challenges)

管理当前和历史挑战活动。

| 字段名 | 类型 | 描述 | 约束 |
|-------|------|------|------|
| id | INT | 挑战ID | PRIMARY KEY, AUTO_INCREMENT |
| challenge_type_id | INT | 挑战类型ID | FOREIGN KEY -> challenge_types(id) |
| title | VARCHAR(100) | 挑战标题 | NOT NULL |
| description | TEXT | 挑战描述 | NOT NULL |
| start_date | DATETIME | 开始日期 | NOT NULL |
| end_date | DATETIME | 结束日期 | NOT NULL |
| is_active | BOOLEAN | 是否激活 | DEFAULT TRUE |
| created_at | TIMESTAMP | 创建时间 | DEFAULT CURRENT_TIMESTAMP |

#### 用户挑战表 (user_challenges)

记录用户参与挑战的进度和状态。

| 字段名 | 类型 | 描述 | 约束 |
|-------|------|------|------|
| id | INT | 记录ID | PRIMARY KEY, AUTO_INCREMENT |
| user_id | INT | 用户ID | FOREIGN KEY -> users(id) |
| challenge_id | INT | 挑战ID | FOREIGN KEY -> challenges(id) |
| current_progress | INT | 当前进度 | NOT NULL DEFAULT 0 |
| completed | BOOLEAN | 是否已完成 | DEFAULT FALSE |
| completed_at | TIMESTAMP | 完成时间 | NULL |
| created_at | TIMESTAMP | 创建时间 | DEFAULT CURRENT_TIMESTAMP |
| updated_at | TIMESTAMP | 更新时间 | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP |
|  |  |  | UNIQUE (user_id, challenge_id) |

### 协作功能表

#### 协作提示词表 (collaborative_prompts)

存储用户协作创建的提示词项目。

| 字段名 | 类型 | 描述 | 约束 |
|-------|------|------|------|
| id | INT | 协作项目ID | PRIMARY KEY, AUTO_INCREMENT |
| title | VARCHAR(100) | 项目标题 | NOT NULL |
| description | TEXT | 项目描述 | |
| base_prompt_text | TEXT | 基础提示词文本 | NOT NULL |
| category_id | INT | 分类ID | FOREIGN KEY -> categories(id) |
| type_id | INT | 提示词类型ID | FOREIGN KEY -> prompt_types(id) |
| status | ENUM | 项目状态 | DEFAULT 'draft' |
| created_by | INT | 创建者ID | FOREIGN KEY -> users(id) |
| completed_prompt_id | INT | 最终完成的提示词ID | FOREIGN KEY -> prompt_cards(id), NULL |
| created_at | TIMESTAMP | 创建时间 | DEFAULT CURRENT_TIMESTAMP |
| updated_at | TIMESTAMP | 更新时间 | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP |

#### 协作参与者表 (collaborative_participants)

记录协作项目的参与者及其角色。

| 字段名 | 类型 | 描述 | 约束 |
|-------|------|------|------|
| id | INT | 记录ID | PRIMARY KEY, AUTO_INCREMENT |
| collaborative_prompt_id | INT | 协作项目ID | FOREIGN KEY -> collaborative_prompts(id) |
| user_id | INT | 用户ID | FOREIGN KEY -> users(id) |
| role | ENUM | 角色 | DEFAULT 'editor' |
| joined_at | TIMESTAMP | 加入时间 | DEFAULT CURRENT_TIMESTAMP |
|  |  |  | UNIQUE (collaborative_prompt_id, user_id) |

#### 协作修改表 (collaborative_edits)

记录对协作提示词的修改建议。

| 字段名 | 类型 | 描述 | 约束 |
|-------|------|------|------|
| id | INT | 修改记录ID | PRIMARY KEY, AUTO_INCREMENT |
| collaborative_prompt_id | INT | 协作项目ID | FOREIGN KEY -> collaborative_prompts(id) |
| user_id | INT | 用户ID | FOREIGN KEY -> users(id) |
| edited_text | TEXT | 修改后的文本 | NOT NULL |
| edit_comment | TEXT | 修改说明 | |
| approved | BOOLEAN | 是否已批准 | DEFAULT FALSE |
| created_at | TIMESTAMP | 创建时间 | DEFAULT CURRENT_TIMESTAMP |

## 实体关系图 (ERD)

```
+----------------+      +---------------+       +----------------+
| prompt_types   |      | rarity_levels |       | categories     |
+----------------+      +---------------+       +----------------+
| id             |      | id            |       | id             |
| name           |      | name          |       | name           |
| description    |      | description   |       | description    |
| icon           |      | min_score     |       | icon           |
| created_at     |      | max_score     |       | created_at     |
+----------------+      | probability   |       +----------------+
       |                | color_code    |                |
       |                | created_at    |                |
       |                +---------------+                |
       |                       |                         |
       |                       |                         |
       v                       v                         v
+-----------------------------------------------------------------------+
| prompt_cards                                                          |
+-----------------------------------------------------------------------+
| id             | category_id     | type_id        | rarity_level_id   |
| prompt_text    | preview_url     | quality_score  | source            |
| is_ai_generated| metadata        | created_at     |                   |
+-----------------------------------------------------------------------+
       |                                                |
       |                                                |
       |                      +------------------------+|
       |                      |                         |
       v                      v                         v
+----------------+    +----------------+     +------------------+
| users          |    | draw_history   |     | user_collections |
+----------------+    +----------------+     +------------------+
| id             |    | id             |     | id               |
| username       |    | user_id        |     | user_id          |
| password_hash  |    | prompt_card_id |     | prompt_card_id   |
| email          |    | drawn_at       |     | collected_at     |
| points         |    +----------------+     +------------------+
| premium        |            |                       |
| profile_image  |            |                       |
| bio            |            |                       |
| reset_token    +------------+-----------------------+
| email_verified |            |                       |
| created_at     |            |                       |
+----------------+            |                       |
       |                      |                       |
       +----------------------+                       |
       |                                              |
       v                                              v
+---------------------+   +--------------------+   +--------------------+
| ratings             |   | comments           |   | shares             |
+---------------------+   +--------------------+   +--------------------+
| id                  |   | id                 |   | id                 |
| user_id             |   | user_id            |   | user_id            |
| prompt_card_id      |   | prompt_card_id     |   | prompt_card_id     |
| rating              |   | comment_text       |   | platform           |
| created_at          |   | parent_id          |   | share_url          |
| updated_at          |   | created_at         |   | created_at         |
+---------------------+   | updated_at         |   +--------------------+
                          +--------------------+
```

## 索引和性能优化

为提高查询性能，数据库中设置了以下索引：

1. **提示词卡片表 (prompt_cards)**
   - `category_id`、`type_id`、`rarity_level_id` 上创建索引
   - `quality_score` 上创建索引（用于排序）
   - `is_ai_generated` 上创建索引（用于筛选）

2. **用户收藏表 (user_collections)**
   - `user_id` 和 `prompt_card_id` 组合索引

3. **评论表 (comments)**
   - `prompt_card_id` 上创建索引（用于查询特定提示词的评论）
   - `user_id` 上创建索引（用于查询用户的评论）
   - `parent_id` 上创建索引（用于查询回复）

4. **活动表 (user_activities)**
   - `user_id` 和 `created_at` 组合索引（用于时间线查询）
   - `activity_type` 上创建索引（用于筛选活动类型）

5. **通知表 (notifications)**
   - `user_id` 和 `is_read` 组合索引（用于查询未读通知）
   - `created_at` 上创建索引（用于排序）

## 数据关系说明

### 一对多关系

- 每个用户可以收藏多个提示词卡片
- 每个提示词可以有多个评论
- 每个分类可以包含多个提示词卡片
- 每个稀有度等级可以关联多个提示词卡片
- 每个提示词类型可以关联多个提示词卡片
- 每个成就类型可以有多个等级
- 每个挑战类型可以创建多个挑战活动

### 多对多关系

- 用户与提示词卡片（通过收藏表）
- 用户与用户（通过关注表）
- 用户与成就（通过用户成就表）
- 用户与挑战（通过用户挑战表）
- 用户与协作项目（通过参与者表）

### 自引用关系

- 评论表中的 `parent_id` 字段引用同表 `id` 字段，用于实现嵌套回复功能

## 数据完整性约束

1. **外键约束**
   - 所有关联表之间使用外键约束，确保引用完整性
   - 使用 `ON DELETE CASCADE` 或 `ON DELETE SET NULL` 适当处理删除操作

2. **唯一约束**
   - 用户名和电子邮箱唯一
   - 用户收藏表中用户ID和提示词ID组合唯一
   - 用户关注表中关注者ID和被关注者ID组合唯一
   - 用户成就表中用户ID和成就等级ID组合唯一
   - 用户挑战表中用户ID和挑战ID组合唯一

3. **检查约束**
   - 评分范围限制在1-5之间
   - 质量分数范围限制在0-100之间
   - 稀有度等级的最小分数小于等于最大分数

## 初始数据

系统初始化时，预设以下数据：

1. **提示词类型**：image, text, video, audio, agent

2. **稀有度等级**：
   - 普通 (0-39分, 50%概率)
   - 优质 (40-69分, 39%概率)
   - 精品 (70-84分, 9%概率)
   - 珍贵 (85-94分, 1.9%概率)
   - 稀有 (95-98分, 0.099%概率)
   - 传说 (99-100分, 0.001%概率)

3. **提示词分类**：人物, 风景, 艺术风格, 概念艺术, 科幻

4. **示例提示词**：每个类型和分类至少有一些示例提示词

5. **成就类型和等级**：根据应用需求预设

## 数据库维护

### 备份策略

- 每日完整备份
- 定时增量备份
- 备份文件加密存储

### 性能监控

- 定期检查慢查询日志
- 优化高频查询
- 根据数据增长调整索引策略

### 数据迁移

使用版本化的数据库迁移脚本管理架构变更，确保平滑升级。
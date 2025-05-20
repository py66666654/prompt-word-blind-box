# 提示词盲盒 API 文档

## API 概述

提示词盲盒 API 是一组 RESTful 端点，允许客户端与提示词盲盒应用程序的核心功能进行交互。API 使用 JSON 作为数据交换格式，并使用 JWT（JSON Web Tokens）进行认证。

### 基本信息

- **基础 URL**: `http://localhost:3000/api`（开发环境）
- **认证方式**: Bearer Token (JWT)
- **响应格式**: JSON

### 通用响应格式

所有API响应都遵循以下格式：

**成功响应**:
```json
{
  "data": {...}  // 返回的数据对象或数组
}
```

或者带分页的响应:
```json
{
  "data": [...],  // 数据数组
  "pagination": {
    "total": 100,  // 总记录数
    "page": 1,     // 当前页码
    "limit": 10,   // 每页记录数
    "pages": 10    // 总页数
  }
}
```

**错误响应**:
```json
{
  "message": "错误描述",
  "error": "详细错误信息" // 可选
}
```

### 认证

所有需要认证的接口都需要在请求头中包含 JWT 令牌：

```
Authorization: Bearer <your_token>
```

## API 端点

### 健康检查

#### GET /health

检查 API 服务是否正常运行。

**响应示例**:
```json
{
  "status": "ok",
  "message": "API运行正常"
}
```

### 用户认证

#### POST /users/register

注册新用户。

**请求体**:
```json
{
  "username": "user123",
  "password": "secure_password",
  "email": "user@example.com"
}
```

**响应示例**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "user123",
    "email": "user@example.com",
    "points": 0,
    "premium": false,
    "created_at": "2023-01-01T00:00:00Z"
  }
}
```

#### POST /users/login

用户登录。

**请求体**:
```json
{
  "username": "user123",
  "password": "secure_password"
}
```

**响应示例**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "user123",
    "email": "user@example.com",
    "points": 100,
    "premium": false,
    "created_at": "2023-01-01T00:00:00Z"
  }
}
```

#### GET /users/profile

获取当前登录用户的个人资料。

**认证要求**: 是

**响应示例**:
```json
{
  "id": 1,
  "username": "user123",
  "email": "user@example.com",
  "points": 100,
  "premium": false,
  "profile_image": "https://example.com/profile.jpg",
  "bio": "AI提示词爱好者",
  "email_verified": true,
  "created_at": "2023-01-01T00:00:00Z"
}
```

#### PUT /users/profile

更新当前用户的个人资料。

**认证要求**: 是

**请求体**:
```json
{
  "profile_image": "https://example.com/new_profile.jpg",
  "bio": "专业提示词收藏家"
}
```

**响应示例**:
```json
{
  "message": "个人资料已更新",
  "user": {
    "id": 1,
    "username": "user123",
    "email": "user@example.com",
    "profile_image": "https://example.com/new_profile.jpg",
    "bio": "专业提示词收藏家",
    "email_verified": true,
    "created_at": "2023-01-01T00:00:00Z"
  }
}
```

#### POST /users/forgot-password

请求密码重置链接。

**请求体**:
```json
{
  "email": "user@example.com"
}
```

**响应示例**:
```json
{
  "message": "如果该邮箱存在，重置密码的链接已发送"
}
```

#### POST /users/reset-password

使用重置令牌更新密码。

**请求体**:
```json
{
  "token": "reset_token_here",
  "password": "new_secure_password"
}
```

**响应示例**:
```json
{
  "message": "密码已重置"
}
```

#### GET /users/verify-email/:token

验证用户邮箱。

**参数**:
- `token`: 邮箱验证令牌

**响应示例**:
```json
{
  "message": "邮箱已验证"
}
```

#### POST /users/resend-verification

重新发送邮箱验证链接。

**认证要求**: 是

**响应示例**:
```json
{
  "message": "验证邮件已发送"
}
```

### 提示词

#### GET /prompts/random

获取随机提示词卡片。

**认证要求**: 是

**响应示例**:
```json
{
  "id": 123,
  "prompt_text": "一位身穿华丽宫廷服饰的年轻女子，站在古堡阳台上，远望雪山，细腻的皮肤纹理，柔和的自然光线，8k超高清质量，电影感镜头",
  "preview_url": "https://example.com/preview123.jpg",
  "category_id": 1,
  "category_name": "人物",
  "type_id": 1,
  "type_name": "image",
  "quality_score": 65,
  "rarity_level_id": 2,
  "rarity_name": "优质",
  "color_code": "#55AA55",
  "source": "Midjourney优质案例",
  "is_ai_generated": false,
  "created_at": "2023-01-01T00:00:00Z"
}
```

#### GET /prompts/random/type/:typeId

获取指定类型的随机提示词。

**参数**:
- `typeId`: 提示词类型ID

**认证要求**: 是

**响应示例**:
```json
{
  "id": 456,
  "prompt_text": "创作一段冥想背景音乐，包含柔和的自然声音，如轻柔的流水声和远处的鸟鸣，结合环境氛围和低频音调，营造平静放松的氛围",
  "preview_url": "https://example.com/preview456.jpg",
  "category_id": 4,
  "category_name": "概念艺术",
  "type_id": 4,
  "type_name": "audio",
  "quality_score": 71,
  "rarity_level_id": 3,
  "rarity_name": "精品",
  "color_code": "#5555FF",
  "source": "Suno创作示例",
  "is_ai_generated": false,
  "created_at": "2023-01-01T00:00:00Z"
}
```

#### POST /prompts/generate/ai

强制生成新的AI提示词（测试用）。

**认证要求**: 是

**请求体**:
```json
{
  "type": "image" // 可选，指定生成的提示词类型
}
```

**响应示例**:
```json
{
  "id": 789,
  "prompt_text": "神秘的风景在荒野中，柔和的光线，水彩画风格，4K分辨率",
  "preview_url": "https://example.com/preview789.jpg",
  "category_id": 2,
  "category_name": "风景",
  "type_id": 1,
  "type_name": "image",
  "quality_score": 45,
  "rarity_level_id": 2,
  "rarity_name": "优质",
  "color_code": "#55AA55",
  "source": "AI自动生成",
  "is_ai_generated": true,
  "created_at": "2023-01-01T00:00:00Z"
}
```

#### GET /prompts/categories

获取所有提示词分类。

**认证要求**: 否

**响应示例**:
```json
[
  {
    "id": 1,
    "name": "人物",
    "description": "人物描述相关提示词",
    "icon": "person",
    "prompt_count": 25,
    "created_at": "2023-01-01T00:00:00Z"
  },
  {
    "id": 2,
    "name": "风景",
    "description": "自然和城市景观相关提示词",
    "icon": "landscape",
    "prompt_count": 30,
    "created_at": "2023-01-01T00:00:00Z"
  }
]
```

#### GET /prompts/types

获取所有提示词类型。

**认证要求**: 否

**响应示例**:
```json
[
  {
    "id": 1,
    "name": "image",
    "description": "图像生成提示词",
    "icon": "image",
    "prompt_count": 50,
    "created_at": "2023-01-01T00:00:00Z"
  },
  {
    "id": 2,
    "name": "text",
    "description": "文字对话提示词",
    "icon": "text",
    "prompt_count": 30,
    "created_at": "2023-01-01T00:00:00Z"
  }
]
```

#### GET /prompts/rarity-levels

获取所有稀有度等级。

**认证要求**: 否

**响应示例**:
```json
[
  {
    "id": 1,
    "name": "普通",
    "description": "基础提示词，适合入门使用",
    "min_score": 0,
    "max_score": 39,
    "probability": 0.5,
    "color_code": "#AAAAAA",
    "prompt_count": 60,
    "created_at": "2023-01-01T00:00:00Z"
  },
  {
    "id": 2,
    "name": "优质",
    "description": "优化过的提示词，有一定参考价值",
    "min_score": 40,
    "max_score": 69,
    "probability": 0.39,
    "color_code": "#55AA55",
    "prompt_count": 30,
    "created_at": "2023-01-01T00:00:00Z"
  }
]
```

#### GET /prompts/category/:categoryId

获取指定分类的提示词。

**参数**:
- `categoryId`: 分类ID

**查询参数**:
- `page`: 页码（默认: 1）
- `limit`: 每页数量（默认: 10）
- `typeId`: 筛选特定类型（可选）
- `rarityId`: 筛选特定稀有度（可选）

**认证要求**: 否

**响应示例**:
```json
{
  "data": [
    {
      "id": 123,
      "prompt_text": "一位身穿华丽宫廷服饰的年轻女子，站在古堡阳台上，远望雪山，细腻的皮肤纹理，柔和的自然光线，8k超高清质量，电影感镜头",
      "preview_url": "https://example.com/preview123.jpg",
      "category_id": 1,
      "category_name": "人物",
      "type_id": 1,
      "type_name": "image",
      "quality_score": 65,
      "rarity_level_id": 2,
      "rarity_name": "优质",
      "color_code": "#55AA55",
      "source": "Midjourney优质案例",
      "is_ai_generated": false,
      "created_at": "2023-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "pages": 3
  }
}
```

#### GET /prompts/:id

获取单个提示词详情。

**参数**:
- `id`: 提示词ID

**认证要求**: 否

**响应示例**:
```json
{
  "id": 123,
  "prompt_text": "一位身穿华丽宫廷服饰的年轻女子，站在古堡阳台上，远望雪山，细腻的皮肤纹理，柔和的自然光线，8k超高清质量，电影感镜头",
  "preview_url": "https://example.com/preview123.jpg",
  "category_id": 1,
  "category_name": "人物",
  "type_id": 1,
  "type_name": "image",
  "quality_score": 65,
  "rarity_level_id": 2,
  "rarity_name": "优质",
  "color_code": "#55AA55",
  "source": "Midjourney优质案例",
  "is_ai_generated": false,
  "metadata": {
    "tags": ["人物", "女性", "宫廷", "风景", "电影感"],
    "additional_info": "适合生成写实人物肖像"
  },
  "created_at": "2023-01-01T00:00:00Z"
}
```

### 收藏管理

#### GET /collections

获取当前用户的提示词收藏。

**查询参数**:
- `page`: 页码（默认: 1）
- `limit`: 每页数量（默认: 10）

**认证要求**: 是

**响应示例**:
```json
{
  "data": [
    {
      "id": 123,
      "prompt_text": "一位身穿华丽宫廷服饰的年轻女子，站在古堡阳台上，远望雪山，细腻的皮肤纹理，柔和的自然光线，8k超高清质量，电影感镜头",
      "preview_url": "https://example.com/preview123.jpg",
      "category_id": 1,
      "category_name": "人物",
      "type_id": 1,
      "type_name": "image",
      "quality_score": 65,
      "rarity_level_id": 2,
      "rarity_name": "优质",
      "color_code": "#55AA55",
      "collected_at": "2023-01-02T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 15,
    "page": 1,
    "limit": 10,
    "pages": 2
  }
}
```

#### POST /collections/:promptId

添加提示词到收藏。

**参数**:
- `promptId`: 提示词ID

**认证要求**: 是

**响应示例**:
```json
{
  "message": "提示词已添加到收藏",
  "collection_id": 456
}
```

#### DELETE /collections/:promptId

从收藏中移除提示词。

**参数**:
- `promptId`: 提示词ID

**认证要求**: 是

**响应示例**:
```json
{
  "message": "提示词已从收藏中移除"
}
```

#### GET /collections/history

获取收藏历史记录。

**查询参数**:
- `page`: 页码（默认: 1）
- `limit`: 每页数量（默认: 10）

**认证要求**: 是

**响应示例**:
```json
{
  "data": [
    {
      "id": 789,
      "prompt_id": 123,
      "prompt_text": "一位身穿华丽宫廷服饰的年轻女子，站在古堡阳台上，远望雪山，细腻的皮肤纹理，柔和的自然光线，8k超高清质量，电影感镜头",
      "rarity_name": "优质",
      "action": "collected",
      "created_at": "2023-01-02T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 15,
    "page": 1,
    "limit": 10,
    "pages": 2
  }
}
```

### 抽卡历史

#### GET /draws/history

获取用户抽卡历史。

**查询参数**:
- `page`: 页码（默认: 1）
- `limit`: 每页数量（默认: 10）

**认证要求**: 是

**响应示例**:
```json
{
  "data": [
    {
      "id": 123,
      "prompt_id": 456,
      "prompt_text": "一位身穿华丽宫廷服饰的年轻女子，站在古堡阳台上，远望雪山，细腻的皮肤纹理，柔和的自然光线，8k超高清质量，电影感镜头",
      "rarity_name": "优质",
      "drawn_at": "2023-01-02T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 30,
    "page": 1,
    "limit": 10,
    "pages": 3
  }
}
```

### 评分系统

#### POST /ratings/:promptId

给提示词评分。

**参数**:
- `promptId`: 提示词ID

**请求体**:
```json
{
  "rating": 5 // 1-5的评分
}
```

**认证要求**: 是

**响应示例**:
```json
{
  "message": "评分成功",
  "average_rating": 4.5,
  "ratings_count": 10
}
```

#### GET /ratings/:promptId

获取提示词的评分信息。

**参数**:
- `promptId`: 提示词ID

**认证要求**: 否

**响应示例**:
```json
{
  "average_rating": 4.5,
  "ratings_count": 10,
  "user_rating": 5 // 如果用户已登录且已评分
}
```

### 评论系统

#### GET /comments/:promptId

获取提示词的评论。

**参数**:
- `promptId`: 提示词ID

**查询参数**:
- `page`: 页码（默认: 1）
- `limit`: 每页数量（默认: 10）

**认证要求**: 否

**响应示例**:
```json
{
  "data": [
    {
      "id": 123,
      "user_id": 456,
      "username": "user123",
      "prompt_id": 789,
      "comment_text": "这个提示词效果很好，生成的图像非常精美！",
      "parent_id": null,
      "created_at": "2023-01-02T00:00:00Z",
      "updated_at": "2023-01-02T00:00:00Z",
      "replies": [
        {
          "id": 124,
          "user_id": 457,
          "username": "user456",
          "prompt_id": 789,
          "comment_text": "我也这么认为，尤其是光线效果",
          "parent_id": 123,
          "created_at": "2023-01-02T01:00:00Z",
          "updated_at": "2023-01-02T01:00:00Z"
        }
      ]
    }
  ],
  "pagination": {
    "total": 5,
    "page": 1,
    "limit": 10,
    "pages": 1
  }
}
```

#### POST /comments/:promptId

添加评论到提示词。

**参数**:
- `promptId`: 提示词ID

**请求体**:
```json
{
  "comment_text": "这个提示词效果很好，生成的图像非常精美！",
  "parent_id": null // 可选，回复其他评论时设置
}
```

**认证要求**: 是

**响应示例**:
```json
{
  "message": "评论已添加",
  "comment": {
    "id": 123,
    "user_id": 456,
    "username": "user123",
    "prompt_id": 789,
    "comment_text": "这个提示词效果很好，生成的图像非常精美！",
    "parent_id": null,
    "created_at": "2023-01-02T00:00:00Z",
    "updated_at": "2023-01-02T00:00:00Z"
  }
}
```

#### PUT /comments/:commentId

更新评论。

**参数**:
- `commentId`: 评论ID

**请求体**:
```json
{
  "comment_text": "更新后的评论内容"
}
```

**认证要求**: 是（只能更新自己的评论）

**响应示例**:
```json
{
  "message": "评论已更新",
  "comment": {
    "id": 123,
    "comment_text": "更新后的评论内容",
    "updated_at": "2023-01-02T02:00:00Z"
  }
}
```

#### DELETE /comments/:commentId

删除评论。

**参数**:
- `commentId`: 评论ID

**认证要求**: 是（只能删除自己的评论）

**响应示例**:
```json
{
  "message": "评论已删除"
}
```

### 用户活动

#### GET /activities

获取活动流。

**查询参数**:
- `page`: 页码（默认: 1）
- `limit`: 每页数量（默认: 10）
- `filter`: 活动类型筛选（可选）

**认证要求**: 是

**响应示例**:
```json
{
  "data": [
    {
      "id": 123,
      "user_id": 456,
      "username": "user123",
      "activity_type": "comment",
      "reference_id": 789,
      "prompt_id": 101,
      "prompt_text": "提示词摘要...",
      "details": {
        "comment_text": "这个提示词效果很好！"
      },
      "created_at": "2023-01-02T00:00:00Z"
    },
    {
      "id": 124,
      "user_id": 456,
      "username": "user123",
      "activity_type": "collect",
      "reference_id": 790,
      "prompt_id": 102,
      "prompt_text": "提示词摘要...",
      "created_at": "2023-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "pages": 3
  }
}
```

### 成就系统

#### GET /achievements

获取所有可用成就。

**认证要求**: 是

**响应示例**:
```json
{
  "data": [
    {
      "id": 1,
      "name": "收藏家",
      "description": "收藏提示词的成就",
      "icon": "collection_icon.png",
      "category": "collection",
      "levels": [
        {
          "id": 1,
          "level": 1,
          "name": "青铜收藏家",
          "description": "收藏10个提示词",
          "requirement": 10,
          "points": 50,
          "badge_url": "bronze_collector.png"
        },
        {
          "id": 2,
          "level": 2,
          "name": "白银收藏家",
          "description": "收藏50个提示词",
          "requirement": 50,
          "points": 100,
          "badge_url": "silver_collector.png"
        }
      ]
    }
  ]
}
```

#### GET /achievements/user

获取用户的成就进度。

**认证要求**: 是

**响应示例**:
```json
{
  "data": [
    {
      "id": 1,
      "achievement_level_id": 1,
      "achievement_name": "收藏家",
      "level_name": "青铜收藏家",
      "description": "收藏10个提示词",
      "current_progress": 7,
      "requirement": 10,
      "unlocked": false,
      "badge_url": "bronze_collector.png",
      "points": 50
    }
  ]
}
```

### 排行榜系统

#### GET /leaderboards/:type

获取特定类型的排行榜。

**参数**:
- `type`: 排行榜类型（如 "collectors", "ratings", "comments"）

**查询参数**:
- `period`: 时间范围（"daily", "weekly", "monthly", "all_time"，默认: "weekly"）
- `limit`: 返回记录数（默认: 10）

**认证要求**: 否

**响应示例**:
```json
{
  "type": "collectors",
  "period": "weekly",
  "period_start": "2023-01-01T00:00:00Z",
  "period_end": "2023-01-07T23:59:59Z",
  "data": [
    {
      "rank": 1,
      "user_id": 123,
      "username": "user123",
      "score": 25,
      "profile_image": "https://example.com/profile.jpg"
    },
    {
      "rank": 2,
      "user_id": 456,
      "username": "user456",
      "score": 18,
      "profile_image": "https://example.com/profile2.jpg"
    }
  ],
  "user_rank": {
    "rank": 5,
    "score": 10
  }
}
```

### 挑战系统

#### GET /challenges

获取当前可用的挑战。

**认证要求**: 是

**响应示例**:
```json
{
  "data": [
    {
      "id": 1,
      "title": "收藏大师",
      "description": "一周内收藏20个不同类型的提示词",
      "challenge_type": {
        "id": 1,
        "name": "收藏挑战",
        "requirement_type": "collection",
        "requirement_count": 20
      },
      "start_date": "2023-01-01T00:00:00Z",
      "end_date": "2023-01-07T23:59:59Z",
      "is_active": true,
      "points": 200,
      "user_progress": {
        "current_progress": 5,
        "completed": false
      }
    }
  ]
}
```

#### GET /challenges/history

获取用户的挑战历史。

**认证要求**: 是

**响应示例**:
```json
{
  "data": [
    {
      "id": 1,
      "challenge_id": 1,
      "title": "收藏大师",
      "description": "一周内收藏20个不同类型的提示词",
      "current_progress": 20,
      "requirement": 20,
      "completed": true,
      "completed_at": "2023-01-05T00:00:00Z",
      "points_earned": 200
    }
  ]
}
```

### 通知系统

#### GET /notifications

获取用户的通知。

**查询参数**:
- `page`: 页码（默认: 1）
- `limit`: 每页数量（默认: 10）
- `unread_only`: 是否只返回未读通知（可选，默认: false）

**认证要求**: 是

**响应示例**:
```json
{
  "data": [
    {
      "id": 1,
      "notification_type": "comment",
      "sender_id": 123,
      "sender_username": "user123",
      "reference_id": 456,
      "message": "用户 user123 评论了你的提示词",
      "details": {
        "prompt_id": 789,
        "prompt_text": "提示词摘要...",
        "comment_text": "这个提示词效果很好！"
      },
      "is_read": false,
      "created_at": "2023-01-02T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 5,
    "page": 1,
    "limit": 10,
    "pages": 1
  },
  "unread_count": 3
}
```

#### PUT /notifications/:notificationId/read

将通知标记为已读。

**参数**:
- `notificationId`: 通知ID

**认证要求**: 是

**响应示例**:
```json
{
  "message": "通知已标记为已读"
}
```

#### PUT /notifications/read-all

将所有通知标记为已读。

**认证要求**: 是

**响应示例**:
```json
{
  "message": "所有通知已标记为已读",
  "updated_count": 5
}
```

### 协作提示词

#### GET /collaborative

获取用户参与的协作提示词项目。

**认证要求**: 是

**响应示例**:
```json
{
  "data": [
    {
      "id": 1,
      "title": "终极风景提示词",
      "description": "创建一个完美的风景图像生成提示词",
      "base_prompt_text": "美丽的风景，自然光线",
      "category_name": "风景",
      "type_name": "image",
      "status": "active",
      "created_by_username": "user123",
      "participant_count": 5,
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-02T00:00:00Z"
    }
  ]
}
```

#### POST /collaborative

创建新的协作提示词项目。

**请求体**:
```json
{
  "title": "终极风景提示词",
  "description": "创建一个完美的风景图像生成提示词",
  "base_prompt_text": "美丽的风景，自然光线",
  "category_id": 2,
  "type_id": 1
}
```

**认证要求**: 是

**响应示例**:
```json
{
  "message": "协作项目已创建",
  "collaborative": {
    "id": 1,
    "title": "终极风景提示词",
    "description": "创建一个完美的风景图像生成提示词",
    "base_prompt_text": "美丽的风景，自然光线",
    "category_id": 2,
    "category_name": "风景",
    "type_id": 1,
    "type_name": "image",
    "status": "active",
    "created_by": 123,
    "created_by_username": "user123",
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z"
  }
}
```

#### GET /collaborative/:id

获取协作提示词项目详情。

**参数**:
- `id`: 协作项目ID

**认证要求**: 是

**响应示例**:
```json
{
  "id": 1,
  "title": "终极风景提示词",
  "description": "创建一个完美的风景图像生成提示词",
  "base_prompt_text": "美丽的风景，自然光线",
  "category_id": 2,
  "category_name": "风景",
  "type_id": 1,
  "type_name": "image",
  "status": "active",
  "created_by": 123,
  "created_by_username": "user123",
  "participants": [
    {
      "user_id": 123,
      "username": "user123",
      "role": "creator",
      "joined_at": "2023-01-01T00:00:00Z"
    },
    {
      "user_id": 456,
      "username": "user456",
      "role": "editor",
      "joined_at": "2023-01-01T01:00:00Z"
    }
  ],
  "edits": [
    {
      "id": 1,
      "user_id": 456,
      "username": "user456",
      "edited_text": "美丽的自然风景，山脉和湖泊，柔和的自然光线，高清细节",
      "edit_comment": "添加了更多细节描述",
      "approved": false,
      "created_at": "2023-01-01T02:00:00Z"
    }
  ],
  "created_at": "2023-01-01T00:00:00Z",
  "updated_at": "2023-01-01T00:00:00Z"
}
```

#### POST /collaborative/:id/join

加入协作提示词项目。

**参数**:
- `id`: 协作项目ID

**认证要求**: 是

**响应示例**:
```json
{
  "message": "已加入协作项目",
  "role": "editor"
}
```

#### POST /collaborative/:id/edits

提交协作提示词编辑。

**参数**:
- `id`: 协作项目ID

**请求体**:
```json
{
  "edited_text": "美丽的自然风景，山脉和湖泊，柔和的自然光线，高清细节",
  "edit_comment": "添加了更多细节描述"
}
```

**认证要求**: 是

**响应示例**:
```json
{
  "message": "编辑已提交",
  "edit": {
    "id": 1,
    "user_id": 456,
    "username": "user456",
    "edited_text": "美丽的自然风景，山脉和湖泊，柔和的自然光线，高清细节",
    "edit_comment": "添加了更多细节描述",
    "approved": false,
    "created_at": "2023-01-01T02:00:00Z"
  }
}
```

#### PUT /collaborative/:id/edits/:editId/approve

批准协作提示词编辑。

**参数**:
- `id`: 协作项目ID
- `editId`: 编辑ID

**认证要求**: 是（项目创建者）

**响应示例**:
```json
{
  "message": "编辑已批准",
  "updated_prompt": "美丽的自然风景，山脉和湖泊，柔和的自然光线，高清细节"
}
```

#### PUT /collaborative/:id/complete

完成协作提示词项目并创建最终提示词。

**参数**:
- `id`: 协作项目ID

**认证要求**: 是（项目创建者）

**响应示例**:
```json
{
  "message": "协作项目已完成",
  "prompt": {
    "id": 123,
    "prompt_text": "美丽的自然风景，山脉和湖泊，柔和的自然光线，高清细节",
    "preview_url": "https://example.com/preview123.jpg",
    "category_id": 2,
    "category_name": "风景",
    "type_id": 1,
    "type_name": "image",
    "quality_score": 80,
    "rarity_level_id": 3,
    "rarity_name": "精品",
    "source": "协作项目 #1",
    "is_ai_generated": false,
    "created_at": "2023-01-02T00:00:00Z"
  }
}
```

## 错误代码

| 状态码 | 描述 |
|-------|------|
| 400 | 请求参数错误 |
| 401 | 认证失败或令牌已过期 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 409 | 资源冲突 |
| 500 | 服务器内部错误 |

## 限流策略

API实施以下限流策略以保护服务：

- 每个IP每分钟最多100个请求
- 每个用户每小时最多10次抽卡请求
- 每个用户每天最多50次评论请求

超过限制时，API将返回`429 Too Many Requests`状态码。
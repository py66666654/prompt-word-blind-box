# 提示词盲盒 - 社交功能 API 文档

本文档详细说明提示词盲盒应用的社交功能相关API接口。

## 目录

1. [通用说明](#通用说明)
2. [评分系统](#评分系统)
3. [评论系统](#评论系统)
4. [分享功能](#分享功能)
5. [关注功能](#关注功能)
6. [活动流](#活动流)
7. [通知系统](#通知系统)
8. [用户搜索](#用户搜索)
9. [用户资料](#用户资料)
10. [成就系统](#成就系统)
11. [排行榜系统](#排行榜系统)
12. [挑战系统](#挑战系统)
13. [协作创作](#协作创作)

## 通用说明

### 基础URL
```
/api
```

### 认证
大部分社交功能需要用户认证。在需要认证的请求中，需要在HTTP请求头中包含JWT令牌：

```
Authorization: Bearer <jwt_token>
```

### 响应格式
所有API响应使用JSON格式。成功的请求通常具有200-299的HTTP状态码。错误响应中会包含`message`字段，用于说明错误原因。

### 分页
支持分页的API接受以下查询参数：
- `page`: 页码，从1开始，默认为1
- `limit`: 每页显示的条目数，默认因API而异

分页响应格式：
```json
{
  "data": [...],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "pages": 5
  }
}
```

## 评分系统

### 提交评分

**请求**:
```
POST /api/ratings/prompts/:promptId
```

**需要认证**: 是

**请求体**:
```json
{
  "rating": 5  // 评分，1-5整数
}
```

**响应**:
```json
{
  "message": "评分已提交",
  "id": 123
}
```

### 获取提示词的评分

**请求**:
```
GET /api/ratings/prompts/:promptId
```

**查询参数**:
- `page`: 页码，默认1
- `limit`: 每页显示数，默认10

**响应**:
```json
{
  "stats": {
    "rating_count": 50,
    "average_rating": 4.5,
    "five_star": 30,
    "four_star": 15,
    "three_star": 3,
    "two_star": 2,
    "one_star": 0
  },
  "ratings": [
    {
      "id": 123,
      "rating": 5,
      "created_at": "2023-07-15T12:30:45Z",
      "updated_at": "2023-07-15T12:30:45Z",
      "user_id": 456,
      "username": "user123",
      "profile_image": "https://example.com/avatar.jpg"
    },
    // ...
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 10,
    "pages": 5
  }
}
```

### 获取用户的评分

**请求**:
```
GET /api/ratings/my/prompts/:promptId
```

**需要认证**: 是

**响应**:
```json
{
  "id": 123,
  "rating": 4,
  "created_at": "2023-07-15T12:30:45Z",
  "updated_at": "2023-07-15T12:30:45Z"
}
```

### 删除评分

**请求**:
```
DELETE /api/ratings/prompts/:promptId
```

**需要认证**: 是

**响应**:
```json
{
  "message": "评分已删除"
}
```

### 获取用户的所有评分

**请求**:
```
GET /api/ratings/users/:userId
```

**查询参数**:
- `page`: 页码，默认1
- `limit`: 每页显示数，默认10

**响应**:
```json
{
  "ratings": [
    {
      "id": 123,
      "rating": 5,
      "created_at": "2023-07-15T12:30:45Z",
      "updated_at": "2023-07-15T12:30:45Z",
      "prompt_id": 789,
      "prompt_text": "提示词内容...",
      "preview_url": "https://example.com/preview.jpg",
      "type_name": "image",
      "category_name": "人物",
      "rarity_name": "精品",
      "color_code": "#5555FF"
    },
    // ...
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "pages": 3
  }
}
```

## 评论系统

### 添加评论

**请求**:
```
POST /api/comments/prompts/:promptId
```

**需要认证**: 是

**请求体**:
```json
{
  "comment_text": "这是一条评论",
  "parent_id": null  // 可选，父评论ID，用于回复评论
}
```

**响应**:
```json
{
  "message": "评论已添加",
  "comment": {
    "id": 123,
    "comment_text": "这是一条评论",
    "created_at": "2023-07-15T12:30:45Z",
    "user_id": 456,
    "username": "user123",
    "profile_image": "https://example.com/avatar.jpg",
    "parent_id": null
  }
}
```

### 获取提示词的评论

**请求**:
```
GET /api/comments/prompts/:promptId
```

**查询参数**:
- `page`: 页码，默认1
- `limit`: 每页显示数，默认10

**响应**:
```json
{
  "comments": [
    {
      "id": 123,
      "comment_text": "这是一条评论",
      "created_at": "2023-07-15T12:30:45Z",
      "updated_at": "2023-07-15T12:30:45Z",
      "user_id": 456,
      "username": "user123",
      "profile_image": "https://example.com/avatar.jpg",
      "reply_count": 2
    },
    // ...
  ],
  "pagination": {
    "total": 30,
    "page": 1,
    "limit": 10,
    "pages": 3
  }
}
```

### 获取评论的回复

**请求**:
```
GET /api/comments/:commentId/replies
```

**查询参数**:
- `page`: 页码，默认1
- `limit`: 每页显示数，默认10

**响应**:
```json
{
  "replies": [
    {
      "id": 124,
      "comment_text": "这是一条回复",
      "created_at": "2023-07-15T12:35:45Z",
      "updated_at": "2023-07-15T12:35:45Z",
      "user_id": 789,
      "username": "user456",
      "profile_image": "https://example.com/avatar2.jpg"
    },
    // ...
  ],
  "pagination": {
    "total": 2,
    "page": 1,
    "limit": 10,
    "pages": 1
  }
}
```

### 更新评论

**请求**:
```
PUT /api/comments/:commentId
```

**需要认证**: 是

**请求体**:
```json
{
  "comment_text": "更新后的评论内容"
}
```

**响应**:
```json
{
  "message": "评论已更新",
  "id": 123
}
```

### 删除评论

**请求**:
```
DELETE /api/comments/:commentId
```

**需要认证**: 是

**响应**:
```json
{
  "message": "评论已删除"
}
```

### 获取用户的所有评论

**请求**:
```
GET /api/comments/users/:userId
```

**查询参数**:
- `page`: 页码，默认1
- `limit`: 每页显示数，默认10

**响应**:
```json
{
  "comments": [
    {
      "id": 123,
      "comment_text": "这是一条评论",
      "created_at": "2023-07-15T12:30:45Z",
      "updated_at": "2023-07-15T12:30:45Z",
      "parent_id": null,
      "prompt_id": 789,
      "prompt_text": "提示词内容...",
      "preview_url": "https://example.com/preview.jpg",
      "type_name": "image",
      "category_name": "人物"
    },
    // ...
  ],
  "pagination": {
    "total": 15,
    "page": 1,
    "limit": 10,
    "pages": 2
  }
}
```

## 分享功能

### 创建分享记录

**请求**:
```
POST /api/shares/prompts/:promptId
```

**需要认证**: 是

**请求体**:
```json
{
  "platform": "wechat",  // 分享平台
  "share_url": "https://example.com/shared/123"  // 可选，分享链接
}
```

**响应**:
```json
{
  "message": "分享记录已创建",
  "id": 123
}
```

### 获取提示词的分享记录

**请求**:
```
GET /api/shares/prompts/:promptId
```

**查询参数**:
- `page`: 页码，默认1
- `limit`: 每页显示数，默认10

**响应**:
```json
{
  "stats": [
    {
      "platform": "wechat",
      "count": 25
    },
    {
      "platform": "weibo",
      "count": 15
    },
    // ...
  ],
  "shares": [
    {
      "id": 123,
      "platform": "wechat",
      "share_url": "https://example.com/shared/123",
      "created_at": "2023-07-15T12:30:45Z",
      "user_id": 456,
      "username": "user123",
      "profile_image": "https://example.com/avatar.jpg"
    },
    // ...
  ],
  "total_shares": 40,
  "pagination": {
    "total": 40,
    "page": 1,
    "limit": 10,
    "pages": 4
  }
}
```

### 获取用户的分享记录

**请求**:
```
GET /api/shares/users/:userId
```

**查询参数**:
- `page`: 页码，默认1
- `limit`: 每页显示数，默认10

**响应**:
```json
{
  "shares": [
    {
      "id": 123,
      "platform": "wechat",
      "share_url": "https://example.com/shared/123",
      "created_at": "2023-07-15T12:30:45Z",
      "prompt_id": 789,
      "prompt_text": "提示词内容...",
      "preview_url": "https://example.com/preview.jpg",
      "type_name": "image",
      "category_name": "人物"
    },
    // ...
  ],
  "pagination": {
    "total": 20,
    "page": 1,
    "limit": 10,
    "pages": 2
  }
}
```

### 获取分享统计

**请求**:
```
GET /api/shares/stats
```

**响应**:
```json
{
  "total_shares": 1500,
  "platform_stats": [
    {
      "platform": "wechat",
      "count": 800
    },
    {
      "platform": "weibo",
      "count": 450
    },
    // ...
  ],
  "top_shared_prompts": [
    {
      "id": 123,
      "prompt_text": "提示词内容...",
      "preview_url": "https://example.com/preview.jpg",
      "share_count": 75,
      "type_name": "image"
    },
    // ...
  ]
}
```

## 关注功能

### 关注用户

**请求**:
```
POST /api/follows/users/:userId
```

**需要认证**: 是

**响应**:
```json
{
  "message": "关注成功",
  "id": 123,
  "follower": {
    "id": 456,
    "username": "user123"
  },
  "followed": {
    "id": 789,
    "username": "user456"
  }
}
```

### 取消关注

**请求**:
```
DELETE /api/follows/users/:userId
```

**需要认证**: 是

**响应**:
```json
{
  "message": "已取消关注"
}
```

### 获取用户的关注列表

**请求**:
```
GET /api/follows/users/:userId/following
```

**查询参数**:
- `page`: 页码，默认1
- `limit`: 每页显示数，默认20

**响应**:
```json
{
  "following": [
    {
      "id": 789,
      "username": "user456",
      "profile_image": "https://example.com/avatar2.jpg",
      "bio": "用户简介...",
      "followed_at": "2023-07-15T12:30:45Z"
    },
    // ...
  ],
  "pagination": {
    "total": 35,
    "page": 1,
    "limit": 20,
    "pages": 2
  }
}
```

### 获取用户的粉丝列表

**请求**:
```
GET /api/follows/users/:userId/followers
```

**查询参数**:
- `page`: 页码，默认1
- `limit`: 每页显示数，默认20

**响应**:
```json
{
  "followers": [
    {
      "id": 456,
      "username": "user123",
      "profile_image": "https://example.com/avatar.jpg",
      "bio": "用户简介...",
      "followed_at": "2023-07-15T12:30:45Z",
      "is_followed_by_me": true  // 仅当已登录用户时才有此字段
    },
    // ...
  ],
  "pagination": {
    "total": 42,
    "page": 1,
    "limit": 20,
    "pages": 3
  }
}
```

### 检查关注状态

**请求**:
```
GET /api/follows/users/:userId/status
```

**需要认证**: 是

**响应**:
```json
{
  "is_following": true
}
```

### 获取用户关注统计

**请求**:
```
GET /api/follows/users/:userId/stats
```

**响应**:
```json
{
  "following_count": 35,
  "follower_count": 42
}
```

### 获取共同关注

**请求**:
```
GET /api/follows/users/:targetUserId/mutual
```

**响应**:
```json
{
  "mutual_follows": [
    {
      "id": 123,
      "username": "user789",
      "profile_image": "https://example.com/avatar3.jpg"
    },
    // ...
  ]
}
```

### 获取推荐关注

**请求**:
```
GET /api/follows/recommendations
```

**需要认证**: 是

**查询参数**:
- `limit`: 推荐数量，默认10

**响应**:
```json
{
  "recommended_users": [
    {
      "id": 123,
      "username": "user789",
      "profile_image": "https://example.com/avatar3.jpg",
      "bio": "用户简介...",
      "mutual_followers": 3
    },
    // ...
  ]
}
```

## 活动流

### 获取用户活动流

**请求**:
```
GET /api/activities/users/:userId
```

**查询参数**:
- `page`: 页码，默认1
- `limit`: 每页显示数，默认20

**响应**:
```json
{
  "activities": [
    {
      "id": 123,
      "activity_type": "comment",
      "created_at": "2023-07-15T12:30:45Z",
      "reference_id": 456,
      "activity_data": {
        "comment_text": "评论内容...",
        "prompt_id": 789,
        "prompt_text": "提示词内容...",
        "preview_url": "https://example.com/preview.jpg"
      }
    },
    {
      "id": 124,
      "activity_type": "rate",
      "created_at": "2023-07-15T12:25:45Z",
      "reference_id": 457,
      "activity_data": {
        "rating": 5,
        "prompt_id": 790,
        "prompt_text": "提示词内容...",
        "preview_url": "https://example.com/preview2.jpg"
      }
    },
    // ...
  ],
  "pagination": {
    "total": 85,
    "page": 1,
    "limit": 20,
    "pages": 5
  }
}
```

### 获取关注用户的活动流

**请求**:
```
GET /api/activities/following
```

**需要认证**: 是

**查询参数**:
- `page`: 页码，默认1
- `limit`: 每页显示数，默认20

**响应**:
```json
{
  "activities": [
    {
      "id": 123,
      "activity_type": "comment",
      "created_at": "2023-07-15T12:30:45Z",
      "reference_id": 456,
      "user_id": 789,
      "username": "user456",
      "profile_image": "https://example.com/avatar2.jpg",
      "activity_data": {
        "comment_text": "评论内容...",
        "prompt_id": 101,
        "prompt_text": "提示词内容...",
        "preview_url": "https://example.com/preview.jpg"
      }
    },
    // ...
  ],
  "pagination": {
    "total": 120,
    "page": 1,
    "limit": 20,
    "pages": 6
  }
}
```

### 获取热门活动流

**请求**:
```
GET /api/activities/popular
```

**查询参数**:
- `page`: 页码，默认1
- `limit`: 每页显示数，默认20
- `timeframe`: 时间范围，可选值："day"、"week"、"month"，默认"week"

**响应**:
```json
{
  "activities": [
    {
      "id": 123,
      "activity_type": "rate",
      "created_at": "2023-07-15T12:30:45Z",
      "reference_id": 456,
      "user_id": 789,
      "username": "user456",
      "profile_image": "https://example.com/avatar2.jpg",
      "activity_data": {
        "rating": 5,
        "prompt_id": 101,
        "prompt_text": "提示词内容...",
        "preview_url": "https://example.com/preview.jpg",
        "quality_score": 95
      }
    },
    // ...
  ],
  "pagination": {
    "page": 1,
    "limit": 20
  }
}
```

## 通知系统

### 获取用户通知

**请求**:
```
GET /api/activities/notifications
```

**需要认证**: 是

**查询参数**:
- `page`: 页码，默认1
- `limit`: 每页显示数，默认20
- `unread_only`: 是否只显示未读通知，布尔值，默认false

**响应**:
```json
{
  "notifications": [
    {
      "id": 123,
      "notification_type": "comment",
      "message": "有用户评论了你的提示词",
      "reference_id": 456,
      "is_read": false,
      "created_at": "2023-07-15T12:30:45Z",
      "sender_id": 789,
      "sender_username": "user456",
      "sender_profile_image": "https://example.com/avatar2.jpg"
    },
    // ...
  ],
  "unread_count": 5,
  "pagination": {
    "total": 30,
    "page": 1,
    "limit": 20,
    "pages": 2
  }
}
```

### 标记通知为已读

**请求**:
```
PUT /api/activities/notifications/:notificationId/read
```

**需要认证**: 是

**响应**:
```json
{
  "message": "通知已标记为已读"
}
```

### 标记所有通知为已读

**请求**:
```
PUT /api/activities/notifications/read-all
```

**需要认证**: 是

**响应**:
```json
{
  "message": "所有通知已标记为已读"
}
```

### 删除通知

**请求**:
```
DELETE /api/activities/notifications/:notificationId
```

**需要认证**: 是

**响应**:
```json
{
  "message": "通知已删除"
}
```

## 用户搜索

### 搜索用户

**请求**:
```
GET /api/users/search
```

**查询参数**:
- `query`: 搜索关键词（必填）
- `page`: 页码，默认1
- `limit`: 每页显示数，默认20

**响应**:
```json
{
  "users": [
    {
      "id": 123,
      "username": "user123",
      "profile_image": "https://example.com/avatar.jpg",
      "bio": "用户简介...",
      "created_at": "2023-02-10T08:15:30Z",
      "is_followed_by_me": true  // 仅当已登录用户时才有此字段
    },
    // ...
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 20,
    "pages": 2
  }
}
```

## 用户资料

### 获取公开用户资料

**请求**:
```
GET /api/users/:userId/profile
```

**响应**:
```json
{
  "id": 123,
  "username": "user123",
  "profile_image": "https://example.com/avatar.jpg",
  "bio": "用户简介...",
  "created_at": "2023-02-10T08:15:30Z",
  "stats": {
    "following_count": 35,
    "follower_count": 42,
    "collection_count": 67,
    "rating_count": 89,
    "comment_count": 123,
    "share_count": 45,
    "draw_count": 234
  },
  "is_followed": true,  // 仅当已登录用户时才有此字段
  "recent_collections": [
    {
      "id": 456,
      "prompt_text": "提示词内容...",
      "preview_url": "https://example.com/preview.jpg",
      "type_name": "image",
      "category_name": "人物",
      "rarity_name": "精品",
      "color_code": "#5555FF",
      "collected_at": "2023-07-15T12:30:45Z"
    },
    // ...
  ],
  "recent_activities": [
    {
      "id": 789,
      "activity_type": "comment",
      "created_at": "2023-07-15T12:30:45Z",
      "reference_id": 101
    },
    // ...
  ]
}
```

### 更新用户资料

**请求**:
```
PUT /api/users/profile
```

**需要认证**: 是

**请求体**:
```json
{
  "email": "new@example.com",  // 可选
  "currentPassword": "old-password",  // 可选，但更新密码时必须
  "newPassword": "new-password",  // 可选，但更新密码时必须
  "profile_image": "https://example.com/new-avatar.jpg",  // 可选
  "bio": "新的用户简介"  // 可选
}
```

**响应**:
```json
{
  "message": "资料已更新",
  "user": {
    "id": 123,
    "username": "user123",
    "email": "new@example.com",
    "email_verified": false,
    "profile_image": "https://example.com/new-avatar.jpg",
    "bio": "新的用户简介"
  }
}
```

## 错误代码

| 状态码 | 描述 |
| ------ | ---- |
| 400 | 请求参数错误 |
| 401 | 未认证或认证失败 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 409 | 资源冲突（例如，已存在的关注关系） |
| 500 | 服务器错误 |## 成就系统

成就系统允许用户通过特定行为解锁不同的成就，获得积分和徽章。

### 获取所有成就类型

**请求**:
```
GET /api/achievements/types
```

**响应**:
```json
[
  {
    "id": 1,
    "name": "收藏家",
    "description": "收藏不同的提示词",
    "icon": "collection",
    "category": "collection",
    "created_at": "2023-07-15T12:30:45Z"
  },
  // ...
]
```

### 获取成就类型详情

**请求**:
```
GET /api/achievements/types/:typeId
```

**响应**:
```json
{
  "id": 1,
  "name": "收藏家",
  "description": "收藏不同的提示词",
  "icon": "collection",
  "category": "collection",
  "created_at": "2023-07-15T12:30:45Z",
  "levels": [
    {
      "id": 1,
      "level": 1,
      "name": "初级收藏家",
      "description": "初步达成收藏不同的提示词",
      "requirement": 5,
      "points": 10,
      "badge_url": "badges/collection_bronze.png",
      "created_at": "2023-07-15T12:30:45Z"
    },
    // ...
  ]
}
```

### 获取用户成就

**请求**:
```
GET /api/achievements/users/:userId
```

**响应**:
```json
{
  "total_points": 120,
  "achievements_by_category": {
    "collection": [
      {
        "id": 123,
        "current_progress": 15,
        "unlocked": true,
        "unlocked_at": "2023-07-20T08:15:30Z",
        "level_id": 1,
        "level": 1,
        "level_name": "初级收藏家",
        "level_description": "初步达成收藏不同的提示词",
        "requirement": 5,
        "points": 10,
        "badge_url": "badges/collection_bronze.png",
        "type_id": 1,
        "type_name": "收藏家",
        "type_description": "收藏不同的提示词",
        "icon": "collection",
        "category": "collection"
      },
      // ...
    ],
    "social": [
      // ...
    ]
  },
  "achievements": [
    // 所有成就的平铺列表
  ]
}
```

### 获取未解锁的成就

**请求**:
```
GET /api/achievements/locked
```

**需要认证**: 是

**响应**:
```json
{
  "in_progress_count": 5,
  "locked_count": 10,
  "achievements_by_category": {
    "collection": [
      {
        "level_id": 3,
        "level": 3,
        "level_name": "高级收藏家",
        "level_description": "大量收藏不同的提示词",
        "requirement": 100,
        "points": 80,
        "badge_url": "badges/collection_gold.png",
        "type_id": 1,
        "type_name": "收藏家",
        "type_description": "收藏不同的提示词",
        "icon": "collection",
        "category": "collection",
        "current_progress": 45,
        "progress_percentage": 45
      },
      // ...
    ]
  },
  "achievements": [
    // 所有未解锁成就的平铺列表
  ]
}
```

### 获取最近解锁的成就

**请求**:
```
GET /api/achievements/users/:userId/recent
```

**查询参数**:
- `limit`: 返回的成就数量，默认5

**响应**:
```json
[
  {
    "id": 123,
    "unlocked_at": "2023-07-20T08:15:30Z",
    "level_id": 1,
    "level": 1,
    "level_name": "初级收藏家",
    "points": 10,
    "badge_url": "badges/collection_bronze.png",
    "type_id": 1,
    "type_name": "收藏家",
    "icon": "collection",
    "category": "collection"
  },
  // ...
]
```

## 排行榜系统

排行榜系统显示不同类别中表现最好的用户。

### 获取所有排行榜类型

**请求**:
```
GET /api/leaderboards/types
```

**响应**:
```json
[
  {
    "id": 1,
    "name": "成就积分榜",
    "description": "根据用户获得的成就积分排名",
    "calculation_type": "total",
    "time_period": "all_time",
    "created_at": "2023-07-15T12:30:45Z"
  },
  // ...
]
```

### 获取排行榜数据

**请求**:
```
GET /api/leaderboards/:typeId
```

**查询参数**:
- `limit`: 返回的排名数量，默认10

**响应**:
```json
{
  "type": {
    "id": 1,
    "name": "成就积分榜",
    "description": "根据用户获得的成就积分排名",
    "calculation_type": "total",
    "time_period": "all_time"
  },
  "period": {
    "start": "2000-01-01",
    "end": "2023-07-25"
  },
  "entries": [
    {
      "id": 123,
      "leaderboard_type_id": 1,
      "user_id": 456,
      "username": "user123",
      "profile_image": "https://example.com/avatar.jpg",
      "score": 450,
      "rank": 1,
      "period_start": "2000-01-01",
      "period_end": "2023-07-25"
    },
    // ...
  ],
  "user_rank": {
    "rank": 25,
    "score": 120
  }
}
```

### 获取用户排名

**请求**:
```
GET /api/leaderboards/users/:userId/rankings
```

**响应**:
```json
{
  "user_id": 456,
  "rankings": {
    "daily": [
      {
        "leaderboard_type_id": 1,
        "rank": 15,
        "score": 20,
        "name": "成就积分榜",
        "description": "根据用户获得的成就积分排名"
      },
      // ...
    ],
    "weekly": [
      // ...
    ],
    "monthly": [
      // ...
    ],
    "all_time": [
      // ...
    ]
  }
}
```

## 挑战系统

挑战系统提供定期更新的任务，用户可以完成这些任务获得奖励。

### 获取活跃的挑战

**请求**:
```
GET /api/challenges/active
```

**响应**:
```json
[
  {
    "id": 1,
    "challenge_type_id": 2,
    "title": "第25周挑战: 社交蝴蝶",
    "description": "本周挑战：发表评论、评分或分享提示词。完成后可获得80积分奖励！",
    "start_date": "2023-07-17T00:00:00Z",
    "end_date": "2023-07-23T23:59:59Z",
    "is_active": true,
    "created_at": "2023-07-17T00:00:00Z",
    "type_name": "社交蝴蝶",
    "type_description": "发表评论、评分或分享提示词",
    "icon": "social",
    "requirement_type": "sharing",
    "requirement_count": 20,
    "points": 80,
    "user_progress": 12,
    "user_completed": false,
    "user_completed_at": null,
    "progress_percentage": 60
  },
  // ...
]
```

### 获取用户的挑战记录

**请求**:
```
GET /api/challenges/my
```

**需要认证**: 是

**查询参数**:
- `status`: 挑战状态，可选值："all"、"completed"、"in_progress"、"expired"，默认"all"
- `page`: 页码，默认1
- `limit`: 每页显示数，默认10

**响应**:
```json
{
  "challenges": [
    {
      "id": 123,
      "current_progress": 20,
      "completed": true,
      "completed_at": "2023-07-20T15:30:00Z",
      "challenge_id": 1,
      "title": "第24周挑战: 收藏达人",
      "description": "本周挑战：收藏指定数量的提示词。完成后可获得50积分奖励！",
      "start_date": "2023-07-10T00:00:00Z",
      "end_date": "2023-07-16T23:59:59Z",
      "is_active": false,
      "type_name": "收藏达人",
      "icon": "collection",
      "requirement_type": "collection",
      "requirement_count": 10,
      "points": 50,
      "progress_percentage": 100
    },
    // ...
  ],
  "total_points": 180,
  "pagination": {
    "total": 8,
    "page": 1,
    "limit": 10,
    "pages": 1
  }
}
```

### 获取挑战详情

**请求**:
```
GET /api/challenges/:challengeId
```

**响应**:
```json
{
  "id": 1,
  "challenge_type_id": 2,
  "title": "第25周挑战: 社交蝴蝶",
  "description": "本周挑战：发表评论、评分或分享提示词。完成后可获得80积分奖励！",
  "start_date": "2023-07-17T00:00:00Z",
  "end_date": "2023-07-23T23:59:59Z",
  "is_active": true,
  "created_at": "2023-07-17T00:00:00Z",
  "type_name": "社交蝴蝶",
  "type_description": "发表评论、评分或分享提示词",
  "icon": "social",
  "requirement_type": "sharing",
  "requirement_count": 20,
  "points": 80,
  "user_progress": 12,
  "user_completed": false,
  "user_completed_at": null,
  "progress_percentage": 60,
  "completed_count": 35,
  "recent_completions": [
    {
      "completed_at": "2023-07-20T18:45:12Z",
      "user_id": 789,
      "username": "user456",
      "profile_image": "https://example.com/avatar2.jpg"
    },
    // ...
  ]
}
```

### 创建新挑战（仅管理员）

**请求**:
```
POST /api/challenges
```

**需要认证**: 是

**请求体**:
```json
{
  "title": "特别挑战: 创作先锋",
  "description": "特别挑战：创建原创提示词。完成后可获得100积分奖励！",
  "challenge_type_id": 3,
  "start_date": "2023-07-25T00:00:00Z",
  "end_date": "2023-08-01T23:59:59Z"
}
```

**响应**:
```json
{
  "message": "挑战创建成功",
  "challenge": {
    "id": 5,
    "title": "特别挑战: 创作先锋",
    "description": "特别挑战：创建原创提示词。完成后可获得100积分奖励！",
    "challenge_type_id": 3,
    "start_date": "2023-07-25T00:00:00Z",
    "end_date": "2023-08-01T23:59:59Z",
    "is_active": true,
    "created_at": "2023-07-24T10:15:30Z",
    "type_name": "创作先锋",
    "type_description": "创建原创提示词",
    "icon": "creation",
    "requirement_type": "creation",
    "requirement_count": 3,
    "points": 100
  }
}
```

## 协作创作

协作创作允许多个用户共同创建和改进提示词。

### 创建协作提示词

**请求**:
```
POST /api/collaborative
```

**需要认证**: 是

**请求体**:
```json
{
  "title": "探索太空的AI画作提示词",
  "description": "一个用于生成太空探索相关AI绘画的高质量提示词",
  "base_prompt_text": "一位宇航员站在未知星球表面，远处有壮观的星云和行星环，使用电影级光效和科幻风格",
  "category_id": 5,
  "type_id": 1
}
```

**响应**:
```json
{
  "message": "协作提示词创建成功",
  "collaborative_prompt": {
    "id": 1,
    "title": "探索太空的AI画作提示词",
    "description": "一个用于生成太空探索相关AI绘画的高质量提示词",
    "base_prompt_text": "一位宇航员站在未知星球表面，远处有壮观的星云和行星环，使用电影级光效和科幻风格",
    "category_id": 5,
    "category_name": "科幻",
    "type_id": 1,
    "type_name": "image",
    "status": "draft",
    "created_by": 456,
    "creator_username": "user123",
    "creator_profile_image": "https://example.com/avatar.jpg",
    "completed_prompt_id": null,
    "created_at": "2023-07-24T10:15:30Z",
    "updated_at": "2023-07-24T10:15:30Z"
  }
}
```

### 获取协作提示词详情

**请求**:
```
GET /api/collaborative/:promptId
```

**响应**:
```json
{
  "id": 1,
  "title": "探索太空的AI画作提示词",
  "description": "一个用于生成太空探索相关AI绘画的高质量提示词",
  "base_prompt_text": "一位宇航员站在未知星球表面，远处有壮观的星云和行星环，使用电影级光效和科幻风格，8K超高清质量",
  "category_id": 5,
  "category_name": "科幻",
  "type_id": 1,
  "type_name": "image",
  "status": "active",
  "created_by": 456,
  "creator_username": "user123",
  "creator_profile_image": "https://example.com/avatar.jpg",
  "completed_prompt_id": null,
  "created_at": "2023-07-24T10:15:30Z",
  "updated_at": "2023-07-24T11:30:15Z",
  "participants": [
    {
      "role": "creator",
      "joined_at": "2023-07-24T10:15:30Z",
      "user_id": 456,
      "username": "user123",
      "profile_image": "https://example.com/avatar.jpg"
    },
    {
      "role": "editor",
      "joined_at": "2023-07-24T10:25:45Z",
      "user_id": 789,
      "username": "user456",
      "profile_image": "https://example.com/avatar2.jpg"
    }
  ],
  "edits": [
    {
      "id": 1,
      "collaborative_prompt_id": 1,
      "user_id": 789,
      "username": "user456",
      "profile_image": "https://example.com/avatar2.jpg",
      "edited_text": "一位宇航员站在未知星球表面，远处有壮观的星云和行星环，使用电影级光效和科幻风格，8K超高清质量",
      "edit_comment": "添加了8K超高清质量，以获得更好的画面效果",
      "approved": true,
      "created_at": "2023-07-24T11:30:15Z"
    }
  ],
  "user_role": "editor",
  "can_view": true,
  "can_edit": true
}
```

### 提交编辑建议

**请求**:
```
POST /api/collaborative/:promptId/edits
```

**需要认证**: 是

**请求体**:
```json
{
  "edited_text": "一位宇航员站在未知星球表面，远处有壮观的星云和行星环，使用电影级光效和科幻风格，8K超高清质量，添加体积光和大气散射效果",
  "edit_comment": "添加了体积光和大气散射效果，使画面更有氛围感"
}
```

**响应**:
```json
{
  "message": "编辑提交成功",
  "edit": {
    "id": 2,
    "collaborative_prompt_id": 1,
    "user_id": 789,
    "username": "user456",
    "profile_image": "https://example.com/avatar2.jpg",
    "edited_text": "一位宇航员站在未知星球表面，远处有壮观的星云和行星环，使用电影级光效和科幻风格，8K超高清质量，添加体积光和大气散射效果",
    "edit_comment": "添加了体积光和大气散射效果，使画面更有氛围感",
    "approved": false,
    "created_at": "2023-07-24T14:20:30Z"
  }
}
```

### 审核编辑建议

**请求**:
```
PUT /api/collaborative/edits/:editId/review
```

**需要认证**: 是

**请求体**:
```json
{
  "approved": true
}
```

**响应**:
```json
{
  "message": "编辑已批准",
  "edit_id": 2,
  "approved": true
}
```

### 邀请参与者

**请求**:
```
POST /api/collaborative/:promptId/participants
```

**需要认证**: 是

**请求体**:
```json
{
  "targetUserId": 101,
  "role": "editor"
}
```

**响应**:
```json
{
  "message": "参与者邀请成功",
  "role": "editor"
}
```

### 获取用户的协作提示词

**请求**:
```
GET /api/collaborative/user/my
```

**需要认证**: 是

**查询参数**:
- `status`: 协作提示词状态，可选值："all"、"draft"、"active"、"completed"、"archived"，默认"all"
- `page`: 页码，默认1
- `limit`: 每页显示数，默认10

**响应**:
```json
{
  "prompts": [
    {
      "id": 1,
      "title": "探索太空的AI画作提示词",
      "description": "一个用于生成太空探索相关AI绘画的高质量提示词",
      "status": "active",
      "created_at": "2023-07-24T10:15:30Z",
      "updated_at": "2023-07-24T14:20:30Z",
      "user_role": "editor",
      "category_name": "科幻",
      "type_name": "image",
      "creator_username": "user123",
      "creator_profile_image": "https://example.com/avatar.jpg",
      "participant_count": 3,
      "edit_count": 5
    },
    // ...
  ],
  "pagination": {
    "total": 5,
    "page": 1,
    "limit": 10,
    "pages": 1
  }
}
```

### 退出协作提示词

**请求**:
```
DELETE /api/collaborative/:promptId/leave
```

**需要认证**: 是

**响应**:
```json
{
  "message": "已退出协作提示词"
}
```

### 完成协作提示词

**请求**:
```
PUT /api/collaborative/:promptId/complete
```

**需要认证**: 是

**响应**:
```json
{
  "message": "协作提示词已完成并转换为正式提示词卡片",
  "prompt_card": {
    "id": 456,
    "prompt_text": "一位宇航员站在未知星球表面，远处有壮观的星云和行星环，使用电影级光效和科幻风格，8K超高清质量，添加体积光和大气散射效果",
    "category_id": 5,
    "type_id": 1,
    "quality_score": 85,
    "rarity_level_id": 4,
    "source": "协作创作",
    "is_ai_generated": false,
    "metadata": {
      "collaborative": true,
      "collaborative_id": 1,
      "created_by": 456,
      "contributors": [
        {
          "id": 789,
          "username": "user456"
        }
      ]
    },
    "created_at": "2023-07-25T09:30:00Z",
    "category_name": "科幻",
    "type_name": "image",
    "rarity_name": "珍贵",
    "color_code": "#AA55AA"
  }
}
```

### 归档或删除协作提示词

**请求**:
```
POST /api/collaborative/:promptId/action
```

**需要认证**: 是

**请求体**:
```json
{
  "action": "archive"  // 或 "delete"
}
```

**响应**:
```json
{
  "message": "协作提示词已归档"
}
```

### 获取公开的协作提示词

**请求**:
```
GET /api/collaborative
```

**查询参数**:
- `status`: 状态筛选，可选值："all"、"active"、"completed"、"archived"，默认"active"
- `page`: 页码，默认1
- `limit`: 每页显示数，默认10

**响应**:
```json
{
  "prompts": [
    {
      "id": 1,
      "title": "探索太空的AI画作提示词",
      "description": "一个用于生成太空探索相关AI绘画的高质量提示词",
      "status": "active",
      "created_at": "2023-07-24T10:15:30Z",
      "updated_at": "2023-07-24T14:20:30Z",
      "category_name": "科幻",
      "type_name": "image",
      "creator_id": 456,
      "creator_username": "user123",
      "creator_profile_image": "https://example.com/avatar.jpg",
      "participant_count": 3,
      "edit_count": 5
    },
    // ...
  ],
  "pagination": {
    "total": 12,
    "page": 1,
    "limit": 10,
    "pages": 2
  }
}
```
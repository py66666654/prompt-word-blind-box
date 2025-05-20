## 成就系统

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
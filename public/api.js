// API请求封装
class Api {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
        this.token = localStorage.getItem('auth_token');
    }

    // 设置认证令牌
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('auth_token', token);
        } else {
            localStorage.removeItem('auth_token');
        }
    }

    // 获取请求头
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    }

    // 处理API响应
    async handleResponse(response) {
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || '请求失败');
        }

        return data;
    }

    // API请求方法
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        
        const fetchOptions = {
            ...options,
            headers: this.getHeaders()
        };

        try {
            const response = await fetch(url, fetchOptions);
            return await this.handleResponse(response);
        } catch (error) {
            console.error('API请求错误:', error);
            throw error;
        }
    }

    // 获取随机提示词
    async getRandomPrompt() {
        return this.request('/prompts/random');
    }

    // 获取所有分类
    async getCategories() {
        return this.request('/prompts/categories');
    }

    // 根据分类ID获取提示词
    async getPromptsByCategory(categoryId, page = 1, limit = 10) {
        return this.request(`/prompts/category/${categoryId}?page=${page}&limit=${limit}`);
    }

    // 获取单个提示词详情
    async getPromptById(promptId) {
        return this.request(`/prompts/${promptId}`);
    }

    // 获取用户收藏
    async getUserCollections(page = 1, limit = 10) {
        return this.request(`/collections?page=${page}&limit=${limit}`);
    }

    // 添加提示词到收藏
    async addToCollection(promptId) {
        return this.request(`/collections/${promptId}`, {
            method: 'POST'
        });
    }

    // 从收藏中移除提示词
    async removeFromCollection(promptId) {
        return this.request(`/collections/${promptId}`, {
            method: 'DELETE'
        });
    }

    // 用户注册
    async register(userData) {
        return this.request('/users/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    // 用户登录
    async login(credentials) {
        return this.request('/users/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
    }

    // 获取用户信息
    async getUserProfile() {
        return this.request('/users/profile');
    }
    
    // 更新用户资料
    async updateProfile(profileData) {
        return this.request('/users/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
    }
    
    // 获取用户统计数据
    async getUserStats() {
        return this.request('/users/stats');
    }
    
    // 获取收藏历史
    async getCollectionHistory(page = 1, limit = 10) {
        return this.request(`/collections/history?page=${page}&limit=${limit}`);
    }
    
    // 获取抽取历史
    async getDrawHistory(page = 1, limit = 10) {
        return this.request(`/draws/history?page=${page}&limit=${limit}`);
    }
    
    // 请求密码重置
    async requestPasswordReset(email) {
        return this.request('/users/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    }
    
    // 验证重置令牌
    async verifyResetToken(token) {
        return this.request(`/users/reset-password/${token}`);
    }
    
    // 重置密码
    async resetPassword(token, password) {
        return this.request('/users/reset-password', {
            method: 'POST',
            body: JSON.stringify({ token, password })
        });
    }
    
    // 验证邮箱
    async verifyEmail(token) {
        return this.request(`/users/verify-email/${token}`);
    }
    
    // 重新发送验证邮件
    async resendVerificationEmail() {
        return this.request('/users/resend-verification', {
            method: 'POST'
        });
    }
}

// 创建API实例
const api = new Api(CONFIG.API_BASE_URL);
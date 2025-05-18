// 认证处理
class Auth {
    constructor() {
        this.token = localStorage.getItem('auth_token');
        this.user = JSON.parse(localStorage.getItem('user') || 'null');
        
        // DOM元素
        this.authContainer = document.getElementById('auth-container');
        this.appContainer = document.getElementById('app-container');
        this.loginForm = document.getElementById('login-form');
        this.registerForm = document.getElementById('register-form');
        this.loginFormElement = document.getElementById('login-form-element');
        this.registerFormElement = document.getElementById('register-form-element');
        this.showRegisterLink = document.getElementById('show-register');
        this.showLoginLink = document.getElementById('show-login');
        this.logoutBtn = document.getElementById('logout');
        
        // 绑定事件处理程序
        this.bindEvents();
        
        // 检查当前认证状态
        this.checkAuthState();
    }
    
    // 绑定事件处理程序
    bindEvents() {
        // 登录表单提交
        this.loginFormElement.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
        
        // 注册表单提交
        this.registerFormElement.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });
        
        // 切换表单显示
        this.showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.showRegisterForm();
        });
        
        this.showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.showLoginForm();
        });
        
        // 退出登录
        this.logoutBtn.addEventListener('click', () => {
            this.logout();
        });
    }
    
    // 检查当前认证状态
    checkAuthState() {
        if (this.token) {
            this.verifyToken()
                .then(valid => {
                    if (valid) {
                        this.showApp();
                    } else {
                        this.showAuth();
                    }
                })
                .catch(() => {
                    this.showAuth();
                });
        } else {
            this.showAuth();
        }
    }
    
    // 验证令牌是否有效
    async verifyToken() {
        try {
            // 尝试获取用户信息，如果成功则令牌有效
            const userData = await api.getUserProfile();
            this.user = userData;
            localStorage.setItem('user', JSON.stringify(userData));
            return true;
        } catch (error) {
            console.error('令牌验证失败:', error);
            this.clearAuth();
            return false;
        }
    }
    
    // 登录处理
    async handleLogin() {
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        
        if (!username || !password) {
            showNotification('请填写用户名和密码', 'error');
            return;
        }
        
        try {
            const response = await api.login({ username, password });
            this.setAuth(response.token, response.user);
            showNotification('登录成功', 'success');
            this.showApp();
        } catch (error) {
            showNotification(error.message || '登录失败', 'error');
        }
    }
    
    // 注册处理
    async handleRegister() {
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        
        if (!username || !password) {
            showNotification('请填写用户名和密码', 'error');
            return;
        }
        
        try {
            const response = await api.register({ username, email, password });
            this.setAuth(response.token, response.user);
            showNotification('注册成功', 'success');
            this.showApp();
        } catch (error) {
            showNotification(error.message || '注册失败', 'error');
        }
    }
    
    // 设置认证信息
    setAuth(token, user) {
        this.token = token;
        this.user = user;
        
        // 保存到localStorage
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        // 设置API令牌
        api.setToken(token);
    }
    
    // 清除认证信息
    clearAuth() {
        this.token = null;
        this.user = null;
        
        // 清除localStorage
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        
        // 清除API令牌
        api.setToken(null);
    }
    
    // 退出登录
    logout() {
        this.clearAuth();
        showNotification('已退出登录', 'info');
        this.showAuth();
    }
    
    // 显示登录表单
    showLoginForm() {
        this.loginForm.style.display = 'block';
        this.registerForm.style.display = 'none';
    }
    
    // 显示注册表单
    showRegisterForm() {
        this.loginForm.style.display = 'none';
        this.registerForm.style.display = 'block';
    }
    
    // 显示应用界面
    showApp() {
        this.authContainer.style.display = 'none';
        this.appContainer.style.display = 'block';
    }
    
    // 显示认证界面
    showAuth() {
        this.authContainer.style.display = 'flex';
        this.appContainer.style.display = 'none';
        this.showLoginForm();
    }
}

// 通知功能
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    // 3秒后隐藏通知
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// 初始化认证
const auth = new Auth();
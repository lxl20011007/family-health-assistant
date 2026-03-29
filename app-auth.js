/**
 * 家庭健康助手 - 认证管理模块
 * 处理用户登录、注册、会话管理等
 */

class AuthManager {
    constructor(app) {
        this.app = app;
        this.supabase = window.supabaseManager;
        this.isAuthenticated = false;
        this.currentUser = null;
        
        // 绑定事件
        this.bindAuthEvents();
        
        // 初始化认证状态
        this.initAuth();
    }

    // 初始化认证状态
    async initAuth() {
        console.log('Auth: 初始化认证状态');
        
        // 检查是否有保存的 Supabase 配置
        const config = this.supabase.loadConfig();
        if (!config.url || !config.anonKey) {
            console.log('Auth: 未配置 Supabase，显示本地模式');
            this.showLocalMode();
            return;
        }

        // 初始化 Supabase 客户端
        const initialized = this.supabase.initialize(config.url, config.anonKey);
        if (!initialized) {
            console.error('Auth: Supabase 初始化失败');
            this.showLocalMode();
            return;
        }

        // 监听认证状态变化
        this.supabase.onAuthStateChange((event, user) => {
            console.log(`Auth: 认证状态变化 - ${event}`, user);
            this.handleAuthStateChange(event, user);
        });

        // 尝试恢复会话
        await this.supabase.getSession();
    }

    // 处理认证状态变化
    handleAuthStateChange(event, user) {
        if (event === 'SIGNED_IN' && user) {
            this.isAuthenticated = true;
            this.currentUser = user;
            this.showAuthenticatedUI();
            this.app.onUserAuthenticated();
        } else if (event === 'SIGNED_OUT') {
            this.isAuthenticated = false;
            this.currentUser = null;
            this.showUnauthenticatedUI();
            this.app.onUserSignedOut();
        }
    }

    // 显示本地模式（未登录）
    showLocalMode() {
        console.log('Auth: 显示本地模式');
        this.isAuthenticated = false;
        this.currentUser = null;
        
        // 显示登录按钮
        document.getElementById('loginBtn').style.display = 'block';
        document.getElementById('userInfo').style.display = 'none';
        
        // 启用本地功能
        this.app.enableLocalMode();
    }

    // 显示已认证的 UI
    showAuthenticatedUI() {
        console.log('Auth: 显示已认证 UI');
        
        // 更新用户信息显示
        const userInfo = this.supabase.getUserInfo();
        if (userInfo) {
            document.getElementById('userEmail').textContent = userInfo.email;
            document.getElementById('userInfo').style.display = 'flex';
            document.getElementById('loginBtn').style.display = 'none';
        }
        
        // 显示家庭按钮
        const familyBtn = document.getElementById('familyBtn');
        if (familyBtn) {
            familyBtn.style.display = 'block';
        }
        
        // 检查是否需要配置云同步
        this.checkCloudSyncConfig();
    }

    // 显示未认证的 UI
    showUnauthenticatedUI() {
        console.log('Auth: 显示未认证 UI');
        
        // 显示登录按钮
        document.getElementById('loginBtn').style.display = 'block';
        document.getElementById('userInfo').style.display = 'none';
        
        // 隐藏家庭按钮
        const familyBtn = document.getElementById('familyBtn');
        if (familyBtn) {
            familyBtn.style.display = 'none';
        }
        
        // 隐藏云同步配置提示
        document.getElementById('cloudSyncInfo').style.display = 'none';
    }

    // 检查云同步配置
    checkCloudSyncConfig() {
        const config = this.supabase.loadConfig();
        if (config.url && config.anonKey) {
            console.log('Auth: 云同步已配置');
            // 云同步已配置，可以开始同步数据
            this.app.startCloudSync();
        } else {
            console.log('Auth: 云同步未配置');
            // 显示配置提示
            document.getElementById('cloudSyncInfo').style.display = 'block';
        }
    }

    // 绑定认证相关事件
    bindAuthEvents() {
        // 延迟绑定，确保 DOM 已加载
        setTimeout(() => {
            // 登录按钮点击
            const loginBtn = document.getElementById('loginBtn');
            if (loginBtn) {
                loginBtn.addEventListener('click', () => this.showAuthModal());
            }

            // 退出登录按钮
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => this.signOut());
            }

            // 登录/注册标签切换
            const loginTabBtn = document.getElementById('loginTabBtn');
            if (loginTabBtn) {
                loginTabBtn.addEventListener('click', () => this.switchAuthTab('login'));
            }

            const registerTabBtn = document.getElementById('registerTabBtn');
            if (registerTabBtn) {
                registerTabBtn.addEventListener('click', () => this.switchAuthTab('register'));
            }

            // 登录提交
            const loginSubmitBtn = document.getElementById('loginSubmitBtn');
            if (loginSubmitBtn) {
                loginSubmitBtn.addEventListener('click', () => this.signIn());
            }

            // 注册提交
            const registerSubmitBtn = document.getElementById('registerSubmitBtn');
            if (registerSubmitBtn) {
                registerSubmitBtn.addEventListener('click', () => this.signUp());
            }

            // 配置云同步按钮
            const configureCloudSyncBtn = document.getElementById('configureCloudSyncBtn');
            if (configureCloudSyncBtn) {
                configureCloudSyncBtn.addEventListener('click', () => {
                    this.closeAuthModal();
                    setTimeout(() => {
                        if (this.app?.showCloudSyncModal) {
                            this.app.showCloudSyncModal();
                        }
                    }, 300);
                });
            }

            // 监听 Enter 键
            const loginEmail = document.getElementById('loginEmail');
            if (loginEmail) {
                loginEmail.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.signIn();
                });
            }

            const loginPassword = document.getElementById('loginPassword');
            if (loginPassword) {
                loginPassword.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.signIn();
                });
            }

            const registerEmail = document.getElementById('registerEmail');
            if (registerEmail) {
                registerEmail.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.signUp();
                });
            }

            const registerPassword = document.getElementById('registerPassword');
            if (registerPassword) {
                registerPassword.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.signUp();
                });
            }

            const confirmPassword = document.getElementById('confirmPassword');
            if (confirmPassword) {
                confirmPassword.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.signUp();
                });
            }

            console.log('Auth: 事件绑定完成');
        }, 100);
    }

    // 显示认证模态框
    showAuthModal() {
        // 重置表单
        this.resetAuthForms();
        
        // 显示模态框
        document.getElementById('authModal').style.display = 'block';
        document.getElementById('loginEmail').focus();
    }

    // 关闭认证模态框
    closeAuthModal() {
        document.getElementById('authModal').style.display = 'none';
        this.resetAuthForms();
    }

    // 切换登录/注册标签
    switchAuthTab(tab) {
        const loginTab = document.getElementById('loginTabBtn');
        const registerTab = document.getElementById('registerTabBtn');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');

        if (tab === 'login') {
            loginTab.classList.add('active');
            registerTab.classList.remove('active');
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
        } else {
            loginTab.classList.remove('active');
            registerTab.classList.add('active');
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
        }
    }

    // 重置认证表单
    resetAuthForms() {
        // 清空输入框
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
        document.getElementById('registerEmail').value = '';
        document.getElementById('registerPassword').value = '';
        document.getElementById('confirmPassword').value = '';
        
        // 清空消息
        document.getElementById('loginMessage').textContent = '';
        document.getElementById('loginMessage').className = 'auth-message';
        document.getElementById('registerMessage').textContent = '';
        document.getElementById('registerMessage').className = 'auth-message';
        
        // 隐藏云同步配置提示
        document.getElementById('cloudSyncInfo').style.display = 'none';
        
        // 切换到登录标签
        this.switchAuthTab('login');
    }

    // 显示认证消息
    showAuthMessage(elementId, message, type = 'info') {
        const element = document.getElementById(elementId);
        element.textContent = message;
        element.className = `auth-message ${type}`;
        
        // 自动隐藏成功消息
        if (type === 'success') {
            setTimeout(() => {
                element.textContent = '';
                element.className = 'auth-message';
            }, 3000);
        }
    }

    // 登录
    async signIn() {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value.trim();

        // 验证输入
        if (!email || !password) {
            this.showAuthMessage('loginMessage', '请输入邮箱和密码', 'error');
            return;
        }

        // 显示加载状态
        const btn = document.getElementById('loginSubmitBtn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 登录中...';
        btn.disabled = true;

        try {
            const result = await this.supabase.signIn(email, password);
            
            if (result.success) {
                this.showAuthMessage('loginMessage', '登录成功！', 'success');
                setTimeout(() => {
                    this.closeAuthModal();
                }, 1500);
            } else {
                this.showAuthMessage('loginMessage', result.error || '登录失败', 'error');
            }
        } catch (error) {
            console.error('Auth: 登录错误', error);
            this.showAuthMessage('loginMessage', '登录失败：' + error.message, 'error');
        } finally {
            // 恢复按钮状态
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    // 注册
    async signUp() {
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value.trim();
        const confirmPassword = document.getElementById('confirmPassword').value.trim();

        // 验证输入
        if (!email || !password || !confirmPassword) {
            this.showAuthMessage('registerMessage', '请填写所有字段', 'error');
            return;
        }

        if (password.length < 6) {
            this.showAuthMessage('registerMessage', '密码至少需要6位字符', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showAuthMessage('registerMessage', '两次输入的密码不一致', 'error');
            return;
        }

        // 显示加载状态
        const btn = document.getElementById('registerSubmitBtn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 注册中...';
        btn.disabled = true;

        try {
            const result = await this.supabase.signUp(email, password);
            
            if (result.success) {
                this.showAuthMessage('registerMessage', '注册成功！请检查邮箱验证邮件', 'success');
                
                // 自动切换到登录标签
                setTimeout(() => {
                    this.switchAuthTab('login');
                    document.getElementById('loginEmail').value = email;
                    document.getElementById('loginPassword').value = '';
                    document.getElementById('loginPassword').focus();
                }, 2000);
            } else {
                this.showAuthMessage('registerMessage', result.error || '注册失败', 'error');
            }
        } catch (error) {
            console.error('Auth: 注册错误', error);
            this.showAuthMessage('registerMessage', '注册失败：' + error.message, 'error');
        } finally {
            // 恢复按钮状态
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    // 退出登录
    async signOut() {
        if (confirm('确定要退出登录吗？')) {
            try {
                await this.supabase.signOut();
                this.showAuthMessage('loginMessage', '已退出登录', 'success');
            } catch (error) {
                console.error('Auth: 退出登录错误', error);
                alert('退出登录失败：' + error.message);
            }
        }
    }

    // 检查是否已认证
    isUserAuthenticated() {
        return this.isAuthenticated;
    }

    // 获取当前用户信息
    getCurrentUser() {
        return this.currentUser;
    }

    // 获取用户 ID
    getUserId() {
        return this.currentUser?.id;
    }

    // 获取用户邮箱
    getUserEmail() {
        return this.currentUser?.email;
    }
}

// 导出 AuthManager
window.AuthManager = AuthManager;
/**
 * Supabase云同步客户端
 * 为家庭健康助手应用提供云数据同步功能
 * 支持：用户认证、数据同步、实时订阅
 */

class SupabaseClient {
    constructor() {
        this.supabase = null;
        this.isConnected = false;
        this.isAuthenticated = false;
        this.currentUser = null;
        this.config = this.loadConfig();
        this.syncQueue = [];
        this.isOnline = navigator.onLine;
        this.authListeners = [];
        this.initialize();
        this.setupEventListeners();
    }

    /**
     * 加载保存的Supabase配置
     */
    loadConfig() {
        const saved = localStorage.getItem('supabase_config');
        return saved ? JSON.parse(saved) : { url: '', anonKey: '' };
    }

    /**
     * 保存配置到localStorage
     */
    saveConfig(url, anonKey) {
        this.config = { url, anonKey };
        localStorage.setItem('supabase_config', JSON.stringify(this.config));
    }

    /**
     * 清除配置
     */
    clearConfig() {
        this.config = { url: '', anonKey: '' };
        localStorage.removeItem('supabase_config');
    }

    /**
     * 初始化Supabase客户端
     */
    initialize() {
        if (!this.config.url || !this.config.anonKey) {
            console.log('Supabase: 未配置，跳过初始化');
            return false;
        }

        try {
            // 动态加载Supabase库（如果尚未加载）
            if (typeof supabase === 'undefined') {
                console.error('Supabase库未加载，请检查index.html中的script标签');
                return false;
            }

            this.supabase = supabase.createClient(this.config.url, this.config.anonKey);
            console.log('Supabase: 客户端初始化成功');
            
            // 设置认证状态监听器
            this.supabase.auth.onAuthStateChange((event, session) => {
                console.log('Supabase: 认证状态变化', event, session?.user?.email);
                if (event === 'SIGNED_IN' && session?.user) {
                    this.isAuthenticated = true;
                    this.currentUser = session.user;
                } else if (event === 'SIGNED_OUT') {
                    this.isAuthenticated = false;
                    this.currentUser = null;
                }
                // 通知所有监听器
                this.notifyAuthListeners(event, session?.user || this.currentUser);
            });
            
            // 测试连接
            this.testConnection().then(success => {
                if (success) {
                    this.isConnected = true;
                    this.updateUIStatus('connected');
                    this.processSyncQueue();
                }
            });
            
            return true;
        } catch (error) {
            console.error('Supabase: 初始化失败', error);
            this.updateUIStatus('error');
            return false;
        }
    }

    /**
     * 测试连接
     */
    async testConnection() {
        if (!this.supabase) return false;
        try {
            const { data, error } = await this.supabase
                .from('family_members')
                .select('count')
                .limit(1);
            if (error) throw error;
            console.log('Supabase: 连接测试成功');
            return true;
        } catch (error) {
            console.error('Supabase: 连接测试失败', error);
            return false;
        }
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 监听网络状态变化
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('Supabase: 网络恢复，尝试同步队列');
            this.processSyncQueue();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('Supabase: 网络断开，进入离线模式');
        });
    }

    /**
     * 更新UI状态指示器
     */
    updateUIStatus(status) {
        const indicator = document.querySelector('#cloudSyncModal .status-indicator');
        const statusText = document.querySelector('#cloudSyncModal .status-text');
        if (!indicator || !statusText) return;

        indicator.className = 'status-indicator';
        switch (status) {
            case 'connected':
                indicator.classList.add('connected');
                statusText.textContent = '已连接到云同步';
                break;
            case 'connecting':
                indicator.classList.add('connecting');
                statusText.textContent = '正在连接...';
                break;
            case 'error':
                indicator.style.background = '#dc3545';
                statusText.textContent = '连接失败';
                break;
            default:
                statusText.textContent = '未配置';
        }
    }

    /**
     * 保存并启用云同步
     */
    async enableSync(url, anonKey) {
        this.updateUIStatus('connecting');
        this.saveConfig(url, anonKey);

        // 重新初始化
        this.supabase = null;
        this.initialize();

        // 等待初始化完成
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (this.isConnected) {
            // 启动初始数据同步
            await this.fullSync();
            return { success: true, message: '云同步已启用' };
        } else {
            this.clearConfig();
            return { success: false, message: '连接失败，请检查配置' };
        }
    }

    /**
     * 禁用云同步
     */
    disableSync() {
        this.supabase = null;
        this.isConnected = false;
        this.clearConfig();
        this.updateUIStatus('disconnected');
    }

    /**
     * 将本地数据推送到云端
     * 自动添加 family_id（如果用户已加入家庭）
     */
    async pushToCloud(table, record, localId) {
        if (!this.supabase || !this.isOnline) {
            // 加入同步队列稍后重试
            this.syncQueue.push({ action: 'push', table, record, localId });
            return { queued: true };
        }

        try {
            // 如果用户有家庭，自动添加 family_id
            let cloudRecord = { ...record };
            if (this.currentFamily?.id) {
                cloudRecord.family_id = this.currentFamily.id;
            }
            cloudRecord.updated_at = new Date().toISOString();

            const { data, error } = await this.supabase
                .from(table)
                .upsert(cloudRecord, { onConflict: 'id' });

            if (error) throw error;
            return { success: true, cloudId: data[0]?.id };
        } catch (error) {
            console.error(`Supabase: 上传${table}失败`, error);
            this.syncQueue.push({ action: 'push', table, record, localId });
            return { error: error.message };
        }
    }

    /**
     * 从云端删除数据
     */
    async deleteFromCloud(table, recordId) {
        if (!this.supabase || !this.isOnline) {
            // 加入同步队列稍后重试
            this.syncQueue.push({ action: 'delete', table, recordId });
            return { queued: true };
        }

        try {
            const { error } = await this.supabase
                .from(table)
                .delete()
                .eq('id', recordId);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error(`Supabase: 删除${table}失败`, error);
            this.syncQueue.push({ action: 'delete', table, recordId });
            return { error: error.message };
        }
    }

    /**
     * 从云端拉取数据
     * 自动按 family_id 过滤（如果用户已加入家庭）
     */
    async pullFromCloud(table, lastSyncTime = null) {
        if (!this.supabase || !this.isOnline) return { offline: true };

        try {
            let query = this.supabase.from(table).select('*');
            
            // 如果用户有家庭，按 family_id 过滤
            if (this.currentFamily?.id) {
                query = query.eq('family_id', this.currentFamily.id);
            }
            
            if (lastSyncTime) {
                query = query.gt('updated_at', lastSyncTime);
            }
            const { data, error } = await query;
            if (error) throw error;
            return { data };
        } catch (error) {
            console.error(`Supabase: 下载${table}失败`, error);
            return { error: error.message };
        }
    }

    /**
     * 将本地记录转换为云端记录
     */
    convertToCloudRecord(localData, table) {
        const cloudRecord = { ...localData };
        // 如果本地有本地ID，生成云端ID
        if (localData.id && !localData.id.startsWith('cloud_')) {
            cloudRecord.id = `local_${localData.id}`;
        }
        cloudRecord.created_at = cloudRecord.created_at || new Date().toISOString();
        cloudRecord.updated_at = new Date().toISOString();
        return cloudRecord;
    }

    /**
     * 全量同步：拉取云端所有数据并合并
     */
    async fullSync() {
        console.log('Supabase: 开始全量同步');
        const tables = ['family_members', 'health_records', 'diet_records', 'exercise_records'];
        const results = {};

        for (const table of tables) {
            const cloudData = await this.pullFromCloud(table);
            if (cloudData.data) {
                results[table] = cloudData.data;
                // TODO: 合并到localStorage
                console.log(`Supabase: 同步${table} - ${cloudData.data.length}条记录`);
            }
        }

        return results;
    }

    /**
     * 处理同步队列
     */
    async processSyncQueue() {
        if (!this.isOnline || !this.supabase || this.syncQueue.length === 0) return;

        console.log(`Supabase: 处理${this.syncQueue.length}条待同步记录`);
        const queue = [...this.syncQueue];
        this.syncQueue = [];

        for (const item of queue) {
            const result = await this.pushToCloud(item.table, item.record, item.localId);
            if (result.error) {
                this.syncQueue.push(item); // 重新入队
            }
        }
    }

    // ==================== 用户认证方法 ====================

    /**
     * 注册新用户
     */
    async signUp(email, password) {
        if (!this.supabase) {
            return { success: false, error: 'Supabase 未初始化' };
        }

        try {
            const { data, error } = await this.supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: window.location.origin
                }
            });

            if (error) throw error;

            console.log('Supabase: 注册成功，请检查邮箱验证');
            return { 
                success: true, 
                message: '注册成功！请检查邮箱完成验证',
                user: data.user 
            };
        } catch (error) {
            console.error('Supabase: 注册失败', error);
            return { 
                success: false, 
                error: this.translateAuthError(error.message) 
            };
        }
    }

    /**
     * 用户登录
     */
    async signIn(email, password) {
        if (!this.supabase) {
            return { success: false, error: 'Supabase 未初始化' };
        }

        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            this.isAuthenticated = true;
            this.currentUser = data.user;
            console.log('Supabase: 登录成功', data.user.email);
            
            // 通知监听器
            this.notifyAuthListeners('SIGNED_IN', data.user);
            
            return { success: true, user: data.user };
        } catch (error) {
            console.error('Supabase: 登录失败', error);
            return { 
                success: false, 
                error: this.translateAuthError(error.message) 
            };
        }
    }

    /**
     * 用户退出登录
     */
    async signOut() {
        if (!this.supabase) {
            return { success: false, error: 'Supabase 未初始化' };
        }

        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;

            this.isAuthenticated = false;
            this.currentUser = null;
            console.log('Supabase: 已退出登录');
            
            // 通知监听器
            this.notifyAuthListeners('SIGNED_OUT', null);
            
            return { success: true };
        } catch (error) {
            console.error('Supabase: 退出登录失败', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 获取当前会话
     */
    async getSession() {
        if (!this.supabase) return null;

        try {
            const { data: { session }, error } = await this.supabase.auth.getSession();
            if (error) throw error;

            if (session?.user) {
                this.isAuthenticated = true;
                this.currentUser = session.user;
                console.log('Supabase: 恢复会话', session.user.email);
                // 通知监听器更新 UI
                this.notifyAuthListeners('SIGNED_IN', session.user);
            }

            return session;
        } catch (error) {
            console.error('Supabase: 获取会话失败', error);
            return null;
        }
    }

    /**
     * 获取当前用户信息
     */
    getUserInfo() {
        if (!this.currentUser) return null;
        
        return {
            id: this.currentUser.id,
            email: this.currentUser.email,
            createdAt: this.currentUser.created_at
        };
    }

    /**
     * 获取用户ID
     */
    getUserId() {
        return this.currentUser?.id || null;
    }

    /**
     * 检查是否已认证
     */
    isUserAuthenticated() {
        return this.isAuthenticated && this.currentUser !== null;
    }

    /**
     * 注册认证状态监听器
     */
    onAuthStateChange(callback) {
        this.authListeners.push(callback);
        
        // 如果已经有用户，立即通知
        if (this.isAuthenticated && this.currentUser) {
            callback('SIGNED_IN', this.currentUser);
        }
        
        // 返回取消订阅函数
        return () => {
            const index = this.authListeners.indexOf(callback);
            if (index > -1) {
                this.authListeners.splice(index, 1);
            }
        };
    }

    /**
     * 通知所有认证监听器
     */
    notifyAuthListeners(event, user) {
        this.authListeners.forEach(callback => {
            try {
                callback(event, user);
            } catch (error) {
                console.error('Supabase: 认证监听器错误', error);
            }
        });
    }

    /**
     * 翻译认证错误信息为中文
     */
    translateAuthError(message) {
        const errorMap = {
            'Invalid login credentials': '邮箱或密码错误',
            'Email not confirmed': '邮箱未验证，请检查邮箱',
            'User already registered': '该邮箱已注册',
            'Password should be at least 6 characters': '密码至少需要6位字符',
            'Unable to validate email address': '邮箱格式不正确',
            'Signups not allowed': '注册功能未开启',
            'Email link is invalid or has expired': '验证链接已过期，请重新发送'
        };

        for (const [key, value] of Object.entries(errorMap)) {
            if (message.includes(key)) {
                return value;
            }
        }

        return message;
    }

    // ==================== 用户数据隔离方法 ====================

    /**
     * 获取用户专属数据（带用户ID过滤）
     */
    async getUserData(table) {
        if (!this.supabase || !this.isAuthenticated) {
            return { error: '未登录' };
        }

        const userId = this.getUserId();
        if (!userId) return { error: '无法获取用户ID' };

        try {
            const { data, error } = await this.supabase
                .from(table)
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { data };
        } catch (error) {
            console.error(`Supabase: 获取${table}失败`, error);
            return { error: error.message };
        }
    }

    /**
     * 保存用户数据（自动添加用户ID）
     */
    async saveUserData(table, record) {
        if (!this.supabase || !this.isAuthenticated) {
            return { error: '未登录', queued: false };
        }

        const userId = this.getUserId();
        if (!userId) return { error: '无法获取用户ID' };

        // 自动添加用户ID和时间戳
        const recordWithUser = {
            ...record,
            user_id: userId,
            updated_at: new Date().toISOString()
        };

        if (!record.id) {
            recordWithUser.created_at = new Date().toISOString();
        }

        try {
            const { data, error } = await this.supabase
                .from(table)
                .upsert(recordWithUser, { onConflict: 'id' });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error(`Supabase: 保存${table}失败`, error);
            return { error: error.message };
        }
    }

    /**
     * 删除用户数据
     */
    async deleteUserData(table, recordId) {
        if (!this.supabase || !this.isAuthenticated) {
            return { error: '未登录' };
        }

        const userId = this.getUserId();
        if (!userId) return { error: '无法获取用户ID' };

        try {
            const { error } = await this.supabase
                .from(table)
                .delete()
                .eq('id', recordId)
                .eq('user_id', userId); // 确保只能删除自己的数据

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error(`Supabase: 删除${table}失败`, error);
            return { error: error.message };
        }
    }

    // ==================== 家庭组功能 ====================

    /**
     * 创建家庭
     */
    async createFamily(name) {
        console.log('Supabase: 开始创建家庭', name);
        
        if (!this.supabase || !this.isAuthenticated) {
            console.log('Supabase: 未登录');
            return { success: false, error: '未登录' };
        }

        const userId = this.getUserId();
        console.log('Supabase: 当前用户ID', userId);
        console.log('Supabase: 当前用户', this.currentUser);
        
        if (!userId) return { success: false, error: '无法获取用户ID' };

        try {
            console.log('Supabase: 插入家庭数据', { name, owner_id: userId });
            
            // 创建家庭
            const { data: family, error: familyError } = await this.supabase
                .from('families')
                .insert({ name, owner_id: userId })
                .select()
                .single();

            if (familyError) {
                console.error('Supabase: 创建家庭失败', familyError);
                throw familyError;
            }

            console.log('Supabase: 家庭创建成功，插入成员关系');
            
            // 创建者自动加入家庭
            const { error: joinError } = await this.supabase
                .from('family_users')
                .insert({ family_id: family.id, user_id: userId, role: 'owner' });

            if (joinError) {
                console.error('Supabase: 加入家庭失败', joinError);
                throw joinError;
            }

            this.currentFamily = family;
            console.log('Supabase: 完成', family);
            
            return { success: true, family };
        } catch (error) {
            console.error('Supabase: 创建家庭失败', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 通过邀请码加入家庭
     */
    async joinFamily(inviteCode) {
        if (!this.supabase || !this.isAuthenticated) {
            return { success: false, error: '未登录' };
        }

        const userId = this.getUserId();
        if (!userId) return { success: false, error: '无法获取用户ID' };

        try {
            // 查找家庭
            const { data: family, error: findError } = await this.supabase
                .from('families')
                .select('*')
                .eq('invite_code', inviteCode.toUpperCase())
                .single();

            if (findError || !family) {
                return { success: false, error: '邀请码无效' };
            }

            // 检查是否已加入
            const { data: existing } = await this.supabase
                .from('family_users')
                .select('id')
                .eq('family_id', family.id)
                .eq('user_id', userId)
                .single();

            if (existing) {
                this.currentFamily = family;
                return { success: true, family, message: '你已经是该家庭成员' };
            }

            // 加入家庭
            const { error: joinError } = await this.supabase
                .from('family_users')
                .insert({ family_id: family.id, user_id: userId, role: 'member' });

            if (joinError) throw joinError;

            this.currentFamily = family;
            console.log('Supabase: 成功加入家庭', family);
            
            return { success: true, family };
        } catch (error) {
            console.error('Supabase: 加入家庭失败', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 获取当前用户的家庭
     */
    async getCurrentFamily() {
        if (!this.supabase || !this.isAuthenticated) {
            return null;
        }

        try {
            const { data, error } = await this.supabase
                .from('families')
                .select('*, family_users!inner(*)')
                .eq('family_users.user_id', this.getUserId())
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // 没有加入任何家庭
                    return null;
                }
                throw error;
            }

            this.currentFamily = data;
            return data;
        } catch (error) {
            console.error('Supabase: 获取家庭信息失败', error);
            return null;
        }
    }

    /**
     * 获取家庭成员列表（同一家庭的所有用户）
     */
    async getFamilyMembers() {
        if (!this.supabase || !this.isAuthenticated || !this.currentFamily) {
            return { error: '未登录或未加入家庭' };
        }

        try {
            const { data, error } = await this.supabase
                .from('family_users')
                .select(`
                    id,
                    role,
                    joined_at,
                    user_id
                `)
                .eq('family_id', this.currentFamily.id);

            if (error) throw error;
            return { data };
        } catch (error) {
            console.error('Supabase: 获取家庭成员失败', error);
            return { error: error.message };
        }
    }

    /**
     * 检查用户是否已加入家庭
     */
    hasFamily() {
        return this.currentFamily !== null;
    }

    /**
     * 获取当前家庭ID
     */
    getFamilyId() {
        return this.currentFamily?.id || null;
    }

    /**
     * 获取邀请码
     */
    getInviteCode() {
        return this.currentFamily?.invite_code || null;
    }

    /**
     * 退出当前家庭
     */
    async leaveFamily() {
        if (!this.supabase || !this.isAuthenticated) {
            return { success: false, error: '未登录' };
        }

        if (!this.currentFamily) {
            return { success: false, error: '未加入任何家庭' };
        }

        try {
            const { error } = await this.supabase
                .from('family_users')
                .delete()
                .eq('family_id', this.currentFamily.id)
                .eq('user_id', this.getUserId());

            if (error) throw error;

            this.currentFamily = null;
            console.log('Supabase: 已退出家庭');
            
            return { success: true };
        } catch (error) {
            console.error('Supabase: 退出家庭失败', error);
            return { success: false, error: error.message };
        }
    }

    // ==================== 家庭数据操作（替代原来的用户数据操作）====================

    /**
     * 获取家庭数据
     */
    async getFamilyData(table) {
        if (!this.supabase || !this.isAuthenticated) {
            return { error: '未登录' };
        }

        if (!this.currentFamily) {
            return { error: '未加入家庭' };
        }

        try {
            const { data, error } = await this.supabase
                .from(table)
                .select('*')
                .eq('family_id', this.currentFamily.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { data };
        } catch (error) {
            console.error(`Supabase: 获取${table}失败`, error);
            return { error: error.message };
        }
    }

    /**
     * 保存家庭数据（自动添加 family_id）
     */
    async saveFamilyData(table, record) {
        if (!this.supabase || !this.isAuthenticated) {
            return { error: '未登录' };
        }

        if (!this.currentFamily) {
            return { error: '未加入家庭，请先创建或加入一个家庭' };
        }

        // 自动添加 family_id 和时间戳
        const recordWithFamily = {
            ...record,
            family_id: this.currentFamily.id,
            updated_at: new Date().toISOString()
        };

        if (!record.id) {
            recordWithFamily.created_at = new Date().toISOString();
        }

        try {
            const { data, error } = await this.supabase
                .from(table)
                .upsert(recordWithFamily, { onConflict: 'id' });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error(`Supabase: 保存${table}失败`, error);
            return { error: error.message };
        }
    }

    /**
     * 删除家庭数据
     */
    async deleteFamilyData(table, recordId) {
        if (!this.supabase || !this.isAuthenticated) {
            return { error: '未登录' };
        }

        if (!this.currentFamily) {
            return { error: '未加入家庭' };
        }

        try {
            const { error } = await this.supabase
                .from(table)
                .delete()
                .eq('id', recordId);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error(`Supabase: 删除${table}失败`, error);
            return { error: error.message };
        }
    }
}

// 导出单例
const supabaseClient = new SupabaseClient();

// 供外部调用（兼容两种命名）
window.supabaseClient = supabaseClient;
window.supabaseManager = supabaseClient;
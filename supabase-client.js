/**
 * Supabase云同步客户端
 * 为家庭健康助手应用提供云数据同步功能
 */

class SupabaseClient {
    constructor() {
        this.supabase = null;
        this.isConnected = false;
        this.config = this.loadConfig();
        this.syncQueue = [];
        this.isOnline = navigator.onLine;
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
            return;
        }

        try {
            // 动态加载Supabase库（如果尚未加载）
            if (typeof supabase === 'undefined') {
                console.error('Supabase库未加载，请检查index.html中的script标签');
                return;
            }

            this.supabase = supabase.createClient(this.config.url, this.config.anonKey);
            console.log('Supabase: 客户端初始化成功');
            this.testConnection().then(success => {
                if (success) {
                    this.isConnected = true;
                    this.updateUIStatus('connected');
                    this.processSyncQueue();
                }
            });
        } catch (error) {
            console.error('Supabase: 初始化失败', error);
            this.updateUIStatus('error');
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
     */
    async pushToCloud(table, record, localId) {
        if (!this.supabase || !this.isOnline) {
            // 加入同步队列稍后重试
            this.syncQueue.push({ action: 'push', table, record, localId });
            return { queued: true };
        }

        try {
            const { data, error } = await this.supabase
                .from(table)
                .upsert(record, { onConflict: 'id' });

            if (error) throw error;
            return { success: true, cloudId: data[0]?.id };
        } catch (error) {
            console.error(`Supabase: 上传${table}失败`, error);
            this.syncQueue.push({ action: 'push', table, record, localId });
            return { error: error.message };
        }
    }

    /**
     * 从云端拉取数据
     */
    async pullFromCloud(table, lastSyncTime = null) {
        if (!this.supabase || !this.isOnline) return { offline: true };

        try {
            let query = this.supabase.from(table).select('*');
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
}

// 导出单例
const supabaseClient = new SupabaseClient();

// 供外部调用
window.supabaseClient = supabaseClient;
/**
 * 家庭健康助手 - 集成版应用
 * 集成认证 + 云同步 + 实时同步
 */

class FamilyHealthAppIntegrated {
    constructor() {
        this.currentMemberId = null;
        this.authManager = null;
        this.supabase = null;
        this.isCloudSyncEnabled = false;
        this.isLocalMode = true;
        
        // 初始化
        this.init();
    }

    // 初始化应用
    async init() {
        console.log('App: 初始化集成版应用');
        
        // 初始化认证管理器
        this.authManager = new AuthManager(this);
        
        // 等待认证管理器初始化完成
        setTimeout(() => {
            this.bindEvents();
            this.loadInitialData();
            this.updateStats();
            
            // 设置日期默认值为今天
            const today = new Date().toISOString().split('T')[0];
            const dietDateEl = document.getElementById('dietDate');
            if (dietDateEl) dietDateEl.value = today;
            const exerciseDateEl = document.getElementById('exerciseDate');
            if (exerciseDateEl) exerciseDateEl.value = today;
        }, 500);
    }

    // 用户认证成功时的回调
    onUserAuthenticated() {
        console.log('App: 用户已认证');
        this.supabase = window.supabaseManager;
        this.isLocalMode = false;
        
        // 设置实时同步监听
        this.setupRealtimeListeners();
        
        // 加载云端数据
        this.loadCloudData();
        
        // 检查是否需要导入本地数据
        this.checkLocalDataImport();
    }

    // 用户退出登录时的回调
    onUserSignedOut() {
        console.log('App: 用户已退出登录');
        this.isLocalMode = true;
        this.isCloudSyncEnabled = false;
        
        // 重新加载本地数据
        this.loadMembers();
        this.updateStats();
    }

    // 启用本地模式
    enableLocalMode() {
        console.log('App: 启用本地模式');
        this.isLocalMode = true;
        this.isCloudSyncEnabled = false;
        
        // 加载本地数据
        this.loadMembers();
        this.updateStats();
    }

    // 开始云同步
    startCloudSync() {
        console.log('App: 开始云同步');
        this.isCloudSyncEnabled = true;
        
        // 设置实时同步监听
        this.setupRealtimeListeners();
        
        // 加载云端数据
        this.loadCloudData();
        
        // 检查是否需要导入本地数据
        this.checkLocalDataImport();
    }

    // 设置实时同步监听
    setupRealtimeListeners() {
        if (!this.supabase) return;
        
        // 监听数据变化
        this.supabase.onDataChange((table, payload) => {
            console.log(`App: 收到实时更新 - ${table}`, payload);
            this.handleRealtimeUpdate(table, payload);
        });
    }

    // 处理实时更新
    handleRealtimeUpdate(table, payload) {
        switch (table) {
            case 'family_members':
                this.handleMembersUpdate(payload);
                break;
            case 'health_records':
                this.handleHealthRecordsUpdate(payload);
                break;
            case 'diet_records':
                this.handleDietRecordsUpdate(payload);
                break;
            case 'exercise_records':
                this.handleExerciseRecordsUpdate(payload);
                break;
            case 'medications':
                this.handleMedicationsUpdate(payload);
                break;
            case 'ai_chat_sessions':
                this.handleAIChatSessionsUpdate(payload);
                break;
            case 'ai_chat_messages':
                this.handleAIChatMessagesUpdate(payload);
                break;
        }
        
        // 更新统计信息
        this.updateStats();
    }

    // 处理家庭成员更新
    handleMembersUpdate(payload) {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        
        if (eventType === 'INSERT') {
            // 新成员添加
            this.loadMembers();
        } else if (eventType === 'UPDATE') {
            // 成员更新
            this.loadMembers();
        } else if (eventType === 'DELETE') {
            // 成员删除
            this.loadMembers();
            
            // 如果删除的是当前选中的成员，清空选择
            if (oldRecord && oldRecord.id === this.currentMemberId) {
                this.currentMemberId = null;
                document.getElementById('memberSelect').value = '';
            }
        }
    }

    // 处理健康记录更新
    handleHealthRecordsUpdate(payload) {
        this.loadHealthRecords();
    }

    // 处理饮食记录更新
    handleDietRecordsUpdate(payload) {
        this.loadDietRecords();
    }

    // 处理运动记录更新
    handleExerciseRecordsUpdate(payload) {
        this.loadExercises();
    }

    // 处理用药提醒更新
    handleMedicationsUpdate(payload) {
        this.loadMedications();
    }

    // 处理 AI 聊天会话更新
    handleAIChatSessionsUpdate(payload) {
        // 如果需要，可以在这里处理 AI 聊天会话的实时更新
    }

    // 处理 AI 聊天消息更新
    handleAIChatMessagesUpdate(payload) {
        // 如果需要，可以在这里处理 AI 聊天消息的实时更新
    }

    // 加载初始数据
    loadInitialData() {
        if (this.isLocalMode) {
            this.loadMembers();
        }
        // 如果已认证，数据会在 onUserAuthenticated 中加载
    }

    // 加载云端数据
    async loadCloudData() {
        if (!this.supabase || !this.supabase.isAuthenticated) {
            return;
        }

        try {
            console.log('App: 加载云端数据');
            
            // 并行加载所有数据
            const [
                members,
                healthRecords,
                dietRecords,
                exercises,
                medications
            ] = await Promise.all([
                this.supabase.getMembers(),
                this.supabase.getHealthRecords(),
                this.supabase.getDietRecords(),
                this.supabase.getExerciseRecords(),
                this.supabase.getMedications()
            ]);

            // 保存到本地存储（作为缓存）
            localStorage.setItem('members', JSON.stringify(members));
            localStorage.setItem('health_records', JSON.stringify(healthRecords));
            localStorage.setItem('diet_records', JSON.stringify(dietRecords));
            localStorage.setItem('exercises', JSON.stringify(exercises));
            localStorage.setItem('medications', JSON.stringify(medications));

            // 更新 UI
            this.loadMembers();
            this.loadHealthRecords();
            this.loadDietRecords();
            this.loadExercises();
            this.loadMedications();
            
            console.log('App: 云端数据加载完成');
        } catch (error) {
            console.error('App: 加载云端数据失败', error);
        }
    }

    // 检查是否需要导入本地数据
    async checkLocalDataImport() {
        if (!this.supabase || !this.supabase.isAuthenticated) {
            return;
        }

        // 检查是否有本地数据需要导入
        const hasLocalData = 
            localStorage.getItem('members') ||
            localStorage.getItem('health_records') ||
            localStorage.getItem('diet_records') ||
            localStorage.getItem('exercises') ||
            localStorage.getItem('medications');

        if (hasLocalData) {
            const shouldImport = confirm('检测到本地数据，是否导入到云端？\n\n导入后，您的数据将在所有设备上同步。');
            if (shouldImport) {
                await this.importLocalDataToCloud();
            }
        }
    }

    // 导入本地数据到云端
    async importLocalDataToCloud() {
        if (!this.supabase || !this.supabase.isAuthenticated) {
            return;
        }

        try {
            const result = await this.supabase.importLocalDataToCloud();
            if (result.success) {
                alert(`✅ 成功导入 ${result.count} 条数据到云端！`);
                
                // 重新加载云端数据
                await this.loadCloudData();
            } else {
                alert('❌ 导入失败：' + result.error);
            }
        } catch (error) {
            console.error('App: 导入本地数据失败', error);
            alert('❌ 导入失败：' + error.message);
        }
    }

    // ==================== 数据操作方法（兼容本地和云端） ====================

    // 获取家庭成员
    getMembers() {
        if (this.isLocalMode) {
            return JSON.parse(localStorage.getItem('members') || '[]');
        } else {
            // 从本地缓存获取
            return JSON.parse(localStorage.getItem('members') || '[]');
        }
    }

    // 保存家庭成员
    async saveMembers(members) {
        if (this.isLocalMode) {
            localStorage.setItem('members', JSON.stringify(members));
        } else if (this.supabase && this.supabase.isAuthenticated) {
            // 云端模式下，数据通过实时同步更新
            // 这里只需要更新本地缓存
            localStorage.setItem('members', JSON.stringify(members));
        }
    }

    // 添加家庭成员
    async addMember(member) {
        if (this.isLocalMode) {
            // 本地模式
            const members = this.getMembers();
            members.push(member);
            this.saveMembers(members);
            return member.id;
        } else if (this.supabase && this.supabase.isAuthenticated) {
            // 云端模式
            try {
                const id = await this.supabase.addMember(member);
                return id;
            } catch (error) {
                console.error('App: 添加家庭成员失败', error);
                throw error;
            }
        }
    }

    // 更新家庭成员
    async updateMember(id, updates) {
        if (this.isLocalMode) {
            // 本地模式
            const members = this.getMembers();
            const index = members.findIndex(m => m.id === id);
            if (index !== -1) {
                members[index] = { ...members[index], ...updates };
                this.saveMembers(members);
            }
        } else if (this.supabase && this.supabase.isAuthenticated) {
            // 云端模式
            try {
                await this.supabase.updateMember(id, updates);
            } catch (error) {
                console.error('App: 更新家庭成员失败', error);
                throw error;
            }
        }
    }

    // 删除家庭成员
    async deleteMember(id) {
        if (this.isLocalMode) {
            // 本地模式
            const members = this.getMembers();
            const filtered = members.filter(m => m.id !== id);
            this.saveMembers(filtered);
        } else if (this.supabase && this.supabase.isAuthenticated) {
            // 云端模式
            try {
                await this.supabase.deleteMember(id);
            } catch (error) {
                console.error('App: 删除家庭成员失败', error);
                throw error;
            }
        }
    }

    // 类似的方法需要为其他数据表实现...
    // 健康记录、饮食记录、运动记录、用药提醒等

    // ==================== 绑定事件 ====================

    bindEvents() {
        // 绑定现有的事件（从原来的 app.js 复制）
        this.bindExistingEvents();
        
        // 绑定云同步相关事件
        this.bindCloudSyncEvents();
    }

    // 绑定现有的事件
    bindExistingEvents() {
        // 这里复制原来 app.js 中的事件绑定代码
        // 由于代码较长，这里只显示关键部分
        
        // 成员选择器
        document.getElementById('memberSelect').addEventListener('change', (e) => {
            this.currentMemberId = e.target.value;
            this.loadHealthRecords();
            this.loadDietRecords();
            this.loadExercises();
            this.loadMedications();
        });

        // 添加成员按钮
        document.getElementById('addMemberBtn').addEventListener('click', () => {
            this.showAddMemberModal();
        });

        // 添加新成员按钮
        document.getElementById('newMemberBtn').addEventListener('click', () => {
            this.showAddMemberModal();
        });

        // 底部导航
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const tab = e.currentTarget.dataset.tab;
                this.switchTab(tab);
            });
        });

        // 云同步按钮
        document.getElementById('cloudSyncBtn').addEventListener('click', () => {
            this.showCloudSyncModal();
        });

        // 清空所有数据按钮
        document.getElementById('clearAllDataBtn').addEventListener('click', () => {
            this.showClearDataModal();
        });

        // 模态框关闭按钮
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal') || e.target.classList.contains('close-btn')) {
                const modal = e.target.closest('.modal');
                if (modal) {
                    modal.style.display = 'none';
                }
            }
        });
    }

    // 绑定云同步相关事件
    bindCloudSyncEvents() {
        // 测试连接按钮
        document.getElementById('testConnectionBtn').addEventListener('click', () => {
            this.testCloudConnection();
        });

        // 保存云同步配置
        document.getElementById('saveCloudConfigBtn').addEventListener('click', () => {
            this.saveCloudConfig();
        });

        // 禁用云同步
        document.getElementById('disableCloudSyncBtn').addEventListener('click', () => {
            this.disableCloudSync();
        });
    }

    // ==================== 云同步相关方法 ====================

    // 显示云同步模态框
    showCloudSyncModal() {
        const config = this.supabase ? this.supabase.loadConfig() : { url: '', anonKey: '' };
        
        document.getElementById('supabaseUrlInput').value = config.url || '';
        document.getElementById('supabaseKeyInput').value = config.anonKey || '';
        
        // 更新连接状态
        this.updateCloudSyncStatus();
        
        document.getElementById('cloudSyncModal').style.display = 'block';
    }

    // 更新云同步状态显示
    updateCloudSyncStatus() {
        const statusEl = document.getElementById('syncStatus');
        const statusText = statusEl.querySelector('.status-text');
        const indicator = statusEl.querySelector('.status-indicator');
        
        if (this.supabase && this.supabase.isAuthenticated) {
            statusText.textContent = '已连接（已登录）';
            indicator.className = 'status-indicator connected';
            document.getElementById('disableCloudSyncBtn').style.display = 'block';
        } else if (this.supabase && this.supabase.isReady) {
            statusText.textContent = '已连接（未登录）';
            indicator.className = 'status-indicator connected';
            document.getElementById('disableCloudSyncBtn').style.display = 'block';
        } else {
            statusText.textContent = '未连接';
            indicator.className = 'status-indicator disconnected';
            document.getElementById('disableCloudSyncBtn').style.display = 'none';
        }
    }

    // 测试云连接
    async testCloudConnection() {
        const url = document.getElementById('supabaseUrlInput').value.trim();
        const anonKey = document.getElementById('supabaseKeyInput').value.trim();
        
        if (!url || !anonKey) {
            alert('请输入 Supabase URL 和 API Key');
            return;
        }

        try {
            // 创建临时 Supabase 客户端进行测试
            const tempSupabase = supabase.createClient(url, anonKey);
            const { data, error } = await tempSupabase.from('family_members').select('count').limit(1);
            
            if (error) throw error;
            
            alert('✅ 连接测试成功！\n\nSupabase 配置正确，可以保存配置。');
        } catch (error) {
            console.error('连接测试失败:', error);
            alert('❌ 连接测试失败：\n\n' + error.message + '\n\n请检查：\n1. URL 和 API Key 是否正确\n2. 是否已执行建表脚本\n3. 网络连接是否正常');
        }
    }

    // 保存云同步配置
    async saveCloudConfig() {
        const url = document.getElementById('supabaseUrlInput').value.trim();
        const anonKey = document.getElementById('supabaseKeyInput').value.trim();
        
        if (!url || !anonKey) {
            alert('请输入 Supabase URL 和 API Key');
            return;
        }

        try {
            // 保存配置
            if (this.supabase) {
                this.supabase.saveConfig(url, anonKey);
                const initialized = this.supabase.initialize(url, anonKey);
                
                if (initialized) {
                    alert('✅ 云同步配置已保存！\n\n请登录以启用数据同步。');
                    this.closeModal('cloudSyncModal');
                    
                    // 显示登录模态框
                    setTimeout(() => {
                        this.authManager.showAuthModal();
                    }, 500);
                } else {
                    alert('❌ 初始化失败，请检查配置');
                }
            } else {
                alert('❌ Supabase 客户端未初始化');
            }
        } catch (error) {
            console.error('保存配置失败:', error);
            alert('❌ 保存配置失败：' + error.message);
        }
    }

    // 禁用云同步
    disableCloudSync() {
        if (confirm('确定要禁用云同步吗？\n\n禁用后，数据将仅保存在本地。')) {
            if (this.supabase) {
                this.supabase.signOut();
                this.supabase.saveConfig('', '');
                this.supabase = null;
            }
            
            this.isCloudSyncEnabled = false;
            this.isLocalMode = true;
            
            alert('✅ 云同步已禁用');
            this.closeModal('cloudSyncModal');
            
            // 重新加载本地数据
            this.loadMembers();
            this.updateStats();
        }
    }

    // ==================== 工具方法 ====================

    // 关闭模态框
    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    // 切换标签页
    switchTab(tabName) {
        // 隐藏所有标签内容
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // 显示选中的标签内容
        const activeTab = document.getElementById(tabName);
        if (activeTab) {
            activeTab.classList.add('active');
        }
        
        // 更新导航项状态
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.tab === tabName) {
                item.classList.add('active');
            }
        });
    }

    // 显示添加成员模态框
    showAddMemberModal() {
        // 创建模态框 HTML
        const modalHtml = `
            <div class="modal" id="addMemberModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-user-plus"></i> 添加家庭成员</h3>
                        <button class="close-btn">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label for="memberName">姓名:</label>
                            <input type="text" id="memberName" placeholder="请输入姓名" required>
                        </div>
                        <div class="form-group">
                            <label for="memberGender">性别:</label>
                            <select id="memberGender" required>
                                <option value="">请选择性别</option>
                                <option value="male">男</option>
                                <option value="female">女</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="memberBirthDate">出生日期:</label>
                            <input type="date" id="memberBirthDate" required>
                        </div>
                        <div class="form-group">
                            <label for="memberNotes">备注:</label>
                            <textarea id="memberNotes" placeholder="可选的备注信息" rows="3"></textarea>
                        </div>
                        <div class="form-actions">
                            <button id="cancelAddMemberBtn" class="btn btn-secondary">取消</button>
                            <button id="saveMemberBtn" class="btn btn-primary">保存</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 添加到模态框容器
        document.getElementById('modalContainer').innerHTML = modalHtml;
        
        // 显示模态框
        const modal = document.getElementById('addMemberModal');
        modal.style.display = 'block';
        
        // 设置默认日期（18年前）
        const today = new Date();
        const defaultDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
        document.getElementById('memberBirthDate').value = defaultDate.toISOString().split('T')[0];
        
        // 绑定事件
        document.querySelector('#addMemberModal .close-btn').addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        document.getElementById('cancelAddMemberBtn').addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        document.getElementById('saveMemberBtn').addEventListener('click', () => {
            this.saveNewMember();
        });
        
        // 点击模态框背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
        
        // 聚焦到姓名输入框
        setTimeout(() => {
            document.getElementById('memberName').focus();
        }, 100);
    }

    // 保存新成员
    async saveNewMember() {
        const name = document.getElementById('memberName').value.trim();
        const gender = document.getElementById('memberGender').value;
        const birthDate = document.getElementById('memberBirthDate').value;
        const notes = document.getElementById('memberNotes').value.trim();
        
        // 验证输入
        if (!name) {
            alert('请输入姓名');
            return;
        }
        
        if (!gender) {
            alert('请选择性别');
            return;
        }
        
        if (!birthDate) {
            alert('请选择出生日期');
            return;
        }
        
        try {
            const member = {
                id: Date.now().toString(),
                name: name,
                gender: gender,
                birthDate: birthDate,
                notes: notes,
                createdAt: new Date().toISOString()
            };
            
            await this.addMember(member);
            
            // 关闭模态框
            document.getElementById('addMemberModal').style.display = 'none';
            
            // 重新加载成员列表
            this.loadMembers();
            this.updateStats();
            
            // 选中新添加的成员
            this.currentMemberId = member.id;
            document.getElementById('memberSelect').value = member.id;
            
            alert('✅ 家庭成员添加成功！');
        } catch (error) {
            console.error('添加成员失败:', error);
            alert('❌ 添加成员失败：' + error.message);
        }
    }

    // 加载成员列表
    loadMembers() {
        const members = this.getMembers();
        const memberSelect = document.getElementById('memberSelect');
        const memberList = document.getElementById('memberList');
        
        // 更新下拉选择器
        memberSelect.innerHTML = '<option value="">请选择家庭成员</option>';
        members.forEach(member => {
            const option = document.createElement('option');
            option.value = member.id;
            option.textContent = member.name;
            if (member.id === this.currentMemberId) {
                option.selected = true;
            }
            memberSelect.appendChild(option);
        });
        
        // 更新成员列表
        if (members.length === 0) {
            memberList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-friends"></i>
                    <p>暂无家庭成员，请点击上方按钮添加</p>
                </div>
            `;
        } else {
            let html = '';
            members.forEach(member => {
                const age = this.calculateAge(member.birthDate);
                html += `
                    <div class="member-card" data-id="${member.id}">
                        <div class="member-info">
                            <div class="member-name">${member.name}</div>
                            <div class="member-details">
                                <span class="member-gender">${member.gender === 'male' ? '男' : '女'}</span>
                                <span class="member-age">${age}岁</span>
                                ${member.notes ? `<span class="member-notes">${member.notes}</span>` : ''}
                            </div>
                        </div>
                        <div class="member-actions">
                            <button class="btn btn-icon btn-sm edit-member" title="编辑">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-icon btn-sm delete-member" title="删除">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
            memberList.innerHTML = html;
            
            // 绑定成员卡片事件
            this.bindMemberCardEvents();
        }
    }

    // 计算年龄
    calculateAge(birthDate) {
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        
        return age;
    }

    // 绑定成员卡片事件
    bindMemberCardEvents() {
        // 编辑成员
        document.querySelectorAll('.edit-member').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = e.target.closest('.member-card');
                const memberId = card.dataset.id;
                this.editMember(memberId);
            });
        });
        
        // 删除成员
        document.querySelectorAll('.delete-member').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = e.target.closest('.member-card');
                const memberId = card.dataset.id;
                this.deleteMemberConfirm(memberId);
            });
        });
    }

    // 编辑成员
    editMember(memberId) {
        const members = this.getMembers();
        const member = members.find(m => m.id === memberId);
        
        if (!member) return;
        
        // 创建编辑模态框
        const modalHtml = `
            <div class="modal" id="editMemberModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-user-edit"></i> 编辑家庭成员</h3>
                        <button class="close-btn">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label for="editMemberName">姓名:</label>
                            <input type="text" id="editMemberName" value="${member.name}" required>
                        </div>
                        <div class="form-group">
                            <label for="editMemberGender">性别:</label>
                            <select id="editMemberGender" required>
                                <option value="male" ${member.gender === 'male' ? 'selected' : ''}>男</option>
                                <option value="female" ${member.gender === 'female' ? 'selected' : ''}>女</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="editMemberBirthDate">出生日期:</label>
                            <input type="date" id="editMemberBirthDate" value="${member.birthDate}" required>
                        </div>
                        <div class="form-group">
                            <label for="editMemberNotes">备注:</label>
                            <textarea id="editMemberNotes" rows="3">${member.notes || ''}</textarea>
                        </div>
                        <div class="form-actions">
                            <button id="cancelEditMemberBtn" class="btn btn-secondary">取消</button>
                            <button id="updateMemberBtn" class="btn btn-primary">更新</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('modalContainer').innerHTML = modalHtml;
        const modal = document.getElementById('editMemberModal');
        modal.style.display = 'block';
        
        // 绑定事件
        document.querySelector('#editMemberModal .close-btn').addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        document.getElementById('cancelEditMemberBtn').addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        document.getElementById('updateMemberBtn').addEventListener('click', async () => {
            const name = document.getElementById('editMemberName').value.trim();
            const gender = document.getElementById('editMemberGender').value;
            const birthDate = document.getElementById('editMemberBirthDate').value;
            const notes = document.getElementById('editMemberNotes').value.trim();
            
            if (!name || !gender || !birthDate) {
                alert('请填写所有必填项');
                return;
            }
            
            try {
                await this.updateMember(memberId, { name, gender, birthDate, notes });
                modal.style.display = 'none';
                this.loadMembers();
                alert('✅ 成员信息已更新！');
            } catch (error) {
                console.error('更新成员失败:', error);
                alert('❌ 更新成员失败：' + error.message);
            }
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    // 确认删除成员
    deleteMemberConfirm(memberId) {
        const members = this.getMembers();
        const member = members.find(m => m.id === memberId);
        
        if (!member) return;
        
        if (confirm(`确定要删除 "${member.name}" 吗？\n\n此操作将删除该成员的所有健康记录、饮食记录、运动记录和用药提醒。`)) {
            this.deleteMember(memberId);
            this.loadMembers();
            this.updateStats();
            
            // 如果删除的是当前选中的成员，清空选择
            if (memberId === this.currentMemberId) {
                this.currentMemberId = null;
                document.getElementById('memberSelect').value = '';
                this.loadHealthRecords();
                this.loadDietRecords();
                this.loadExercises();
                this.loadMedications();
            }
            
            alert('✅ 成员已删除！');
        }
    }

    // 显示清空数据模态框
    showClearDataModal() {
        const modalHtml = `
            <div class="modal" id="clearDataModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-exclamation-triangle"></i> 清空所有数据</h3>
                        <button class="close-btn">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="warning-box">
                            <i class="fas fa-exclamation-circle"></i>
                            <h4>警告！此操作不可撤销</h4>
                            <p>这将删除所有本地和云端的数据，包括：</p>
                            <ul>
                                <li>所有家庭成员信息</li>
                                <li>所有健康记录</li>
                                <li>所有饮食记录</li>
                                <li>所有运动记录</li>
                                <li>所有用药提醒</li>
                                <li>所有AI聊天记录</li>
                            </ul>
                            <p><strong>请谨慎操作！</strong></p>
                        </div>
                        <div class="confirmation-checkbox">
                            <input type="checkbox" id="confirmClearData">
                            <label for="confirmClearData">我确认要清空所有数据</label>
                        </div>
                        <div class="form-actions">
                            <button id="cancelClearDataBtn" class="btn btn-secondary">取消</button>
                            <button id="confirmClearDataBtn" class="btn btn-danger" disabled>确认清空</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('modalContainer').innerHTML = modalHtml;
        const modal = document.getElementById('clearDataModal');
        modal.style.display = 'block';
        
        // 绑定确认复选框
        document.getElementById('confirmClearData').addEventListener('change', (e) => {
            document.getElementById('confirmClearDataBtn').disabled = !e.target.checked;
        });
        
        // 绑定事件
        document.querySelector('#clearDataModal .close-btn').addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        document.getElementById('cancelClearDataBtn').addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        document.getElementById('confirmClearDataBtn').addEventListener('click', () => {
            this.clearAllData();
            modal.style.display = 'none';
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    // 清空所有数据
    async clearAllData() {
        try {
            // 清空本地存储
            localStorage.removeItem('members');
            localStorage.removeItem('health_records');
            localStorage.removeItem('diet_records');
            localStorage.removeItem('exercises');
            localStorage.removeItem('medications');
            
            // 如果已登录，也清空云端数据
            if (this.supabase && this.supabase.isAuthenticated) {
                // 这里可以添加清空云端数据的逻辑
                // 注意：清空云端数据需要谨慎，可能需要逐条删除
                alert('⚠️ 云端数据清空功能需要单独实现\n\n本地数据已清空。');
            }
            
            // 重置状态
            this.currentMemberId = null;
            document.getElementById('memberSelect').value = '';
            
            // 重新加载
            this.loadMembers();
            this.loadHealthRecords();
            this.loadDietRecords();
            this.loadExercises();
            this.loadMedications();
            this.updateStats();
            
            alert('✅ 所有本地数据已清空！');
        } catch (error) {
            console.error('清空数据失败:', error);
            alert('❌ 清空数据失败：' + error.message);
        }
    }

    // 加载健康记录（示例方法，需要根据实际情况实现）
    loadHealthRecords() {
        // 这里实现加载健康记录的逻辑
        console.log('加载健康记录');
    }

    // 加载饮食记录（示例方法，需要根据实际情况实现）
    loadDietRecords() {
        // 这里实现加载饮食记录的逻辑
        console.log('加载饮食记录');
    }

    // 加载运动记录（示例方法，需要根据实际情况实现）
    loadExercises() {
        // 这里实现加载运动记录的逻辑
        console.log('加载运动记录');
    }

    // 加载用药提醒（示例方法，需要根据实际情况实现）
    loadMedications() {
        // 这里实现加载用药提醒的逻辑
        console.log('加载用药提醒');
    }

    // 更新统计信息
    updateStats() {
        const members = this.getMembers();
        const healthRecords = JSON.parse(localStorage.getItem('health_records') || '[]');
        const dietRecords = JSON.parse(localStorage.getItem('diet_records') || '[]');
        const exercises = JSON.parse(localStorage.getItem('exercises') || '[]');
        
        document.getElementById('memberCount').textContent = members.length;
        document.getElementById('healthRecordCount').textContent = healthRecords.length;
        document.getElementById('dietCount').textContent = dietRecords.length;
        document.getElementById('exerciseCount').textContent = exercises.length;
    }
}

// 创建应用实例
window.app = new FamilyHealthAppIntegrated();

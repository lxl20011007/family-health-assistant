// 家庭健康助手应用 - 主逻辑
class FamilyHealthApp {
    constructor() {
        this.currentMemberId = null;
        this.authManager = null;
        this.familyManager = null;
        this.init();
    }

    // 初始化应用
    init() {
        // 延迟初始化，确保 DOM 已加载
        setTimeout(() => {
            this.bindEvents();
            this.loadMembers();
            this.updateStats();

            // 设置日期默认值为今天
            const today = new Date().toISOString().split('T')[0];
            const dietDateEl = document.getElementById('dietDate');
            if (dietDateEl) dietDateEl.value = today;
            const exerciseDateEl = document.getElementById('exerciseDate');
            if (exerciseDateEl) exerciseDateEl.value = today;
            
            // 🔥 关键：启动自动同步机制
            this.startAutoSync();
            
            // 初始化认证管理器
            this.initAuth();
        }, 50);
    }
    
    // 初始化认证管理器
    initAuth() {
        // 等待 DOM 和 supabaseClient 加载完成
        if (typeof AuthManager !== 'undefined') {
            this.authManager = new AuthManager(this);
            console.log('App: 认证管理器已初始化');
        } else {
            console.warn('App: AuthManager 未加载');
        }
    }
    
    // 初始化家庭管理器
    initFamilyManager() {
        if (typeof FamilyManager !== 'undefined') {
            this.familyManager = new FamilyManager(this);
            // 保存到全局作用域供 HTML 调用
            window.familyManager = this.familyManager;
            console.log('App: 家庭管理器已初始化');
        } else {
            console.warn('App: FamilyManager 未加载');
        }
    }
    
    // 用户登录成功回调
    onUserAuthenticated() {
        console.log('App: 用户已登录');
        this.updateUIForAuthenticatedUser();
        
        // 初始化家庭管理器
        this.initFamilyManager();
        
        // 更新家庭按钮状态
        if (this.familyManager) {
            this.familyManager.onUserAuthenticated();
        }
    }
    
    // 用户退出登录回调
    onUserSignedOut() {
        console.log('App: 用户已退出');
        this.updateUIForUnauthenticatedUser();
        
        // 更新家庭按钮状态
        if (this.familyManager) {
            this.familyManager.onUserSignedOut();
        }
    }
    
    // 启用本地模式（未登录时）
    enableLocalMode() {
        console.log('App: 启用本地模式');
        // 本地模式下仍然可以使用应用，数据保存在 localStorage
    }
    
    // 开始云同步
    startCloudSync() {
        console.log('App: 开始云同步（已禁用）');
        // this.uploadAllLocalDataToCloud(); // 完全禁用
    }
    
    // 加入家庭后的回调
    onFamilyJoined() {
        console.log('App: 已加入家庭，同步已禁用');
        // this.uploadAllLocalDataToCloud(); // 完全禁用
        this.loadMembers();
    }
    
    // 退出家庭后的回调
    onFamilyLeft() {
        console.log('App: 已退出家庭');
        // 清空界面数据
        this.currentMemberId = null;
        this.loadMembers();
    }
    
    // 更新已登录用户的 UI
    updateUIForAuthenticatedUser() {
        // 可以在这里显示用户专属功能
        console.log('App: 更新已认证用户 UI');
    }
    
    // 更新未登录用户的 UI
    updateUIForUnauthenticatedUser() {
        console.log('App: 更新未认证用户 UI');
    }

    // 启动自动同步机制
    startAutoSync() {
        // 🔥 关键：首次启用云同步时，上传所有本地数据
        this.uploadAllLocalDataToCloud();

        // 每 30 秒检查一次是否需要同步
        // 完全禁用自动同步定时器
        // setInterval(() => {
        //     this.autoSyncFromCloud();
        // }, 30000);

        // 页面获得焦点时立即同步（完全禁用）
        // window.addEventListener('focus', () => {
        //     this.autoSyncFromCloud();
        // });

        // 页面可见性变化时同步（完全禁用）
        // document.addEventListener('visibilitychange', () => {
        //     if (!document.hidden) {
        //         this.autoSyncFromCloud();
        //     }
        // });
    }

    // 上传所有本地数据到云端（首次同步）
    async uploadAllLocalDataToCloud() {
        if (typeof supabaseClient === 'undefined' || !supabaseClient.isConnected) {
            console.warn('⚠️ Supabase 未连接');
            return Promise.resolve();
        }

        // 检查是否已同步过
        const lastSyncTime = localStorage.getItem('lastSyncTime');
        const lastSync = lastSyncTime ? new Date(lastSyncTime) : null;
        console.log('========== 同步开始 ==========');
        console.log('上次同步时间:', lastSync ? lastSync.toLocaleString() : '从未同步');

        try {
            console.log('🔄 开始检查需要同步的数据...');

            // 上传家庭成员 - 只同步新增或未同步的
            const members = this.getMembers();
            let membersSynced = 0;
            for (const member of members) {
                const createdAt = member.createdAt ? new Date(member.createdAt) : new Date();
                const isNew = !lastSync || createdAt.getTime() > lastSync.getTime();
                const notSynced = !member.synced;
                
                console.log(`成员 ${member.name}: createdAt=${createdAt.toLocaleString()}, isNew=${isNew}, notSynced=${notSynced}`);
                
                if (isNew || notSynced) {
                    await this.syncMemberToCloud(member, 'create');
                    member.synced = true;
                    membersSynced++;
                    console.log(`  → 需要同步`);
                } else {
                    console.log(`  → 跳过（已同步）`);
                }
            }
            // 保存同步状态
            if (membersSynced > 0) {
                this.saveMembers(members);
            }
            console.log(`📤 本次同步了 ${membersSynced} 个家庭成员`);

            // 更新同步时间
            localStorage.setItem('lastSyncTime', new Date().toISOString());
            console.log('========== 同步完成 ==========');
            
            return Promise.resolve();
        } catch (error) {
            console.error('❌ 上传本地数据失败:', error);
            return Promise.reject(error);
        }
    }

    // 从云端下载所有数据到本地
    async downloadAllDataFromCloud() {
        if (typeof supabaseClient === 'undefined' || !supabaseClient.isConnected) {
            console.warn('⚠️ Supabase 未连接');
            return Promise.resolve();
        }

        try {
            console.log('========== 开始从云端下载数据 ==========');

            // 下载家庭成员
            const membersResult = await supabaseClient.pullFromCloud('family_members');
            if (membersResult.data && membersResult.data.length > 0) {
                const cloudMembers = membersResult.data.map(m => ({
                    id: m.id,
                    name: m.name,
                    gender: m.gender,
                    birthDate: m.birth_date,
                    notes: m.notes,
                    createdAt: m.created_at,
                    synced: true
                }));
                // 合并本地和云端数据（云端优先）
                const localMembers = this.getMembers();
                const merged = [...cloudMembers];
                for (const local of localMembers) {
                    if (!merged.find(m => m.id === local.id)) {
                        merged.push(local);
                    }
                }
                this.saveMembers(merged);
                console.log(`📥 下载了 ${cloudMembers.length} 个家庭成员`);
            }

            // 下载健康记录
            const healthResult = await supabaseClient.pullFromCloud('health_records');
            if (healthResult.data && healthResult.data.length > 0) {
                const cloudRecords = healthResult.data.map(r => ({
                    id: r.id,
                    memberId: r.member_id,
                    type: r.record_type,
                    value: r.value,
                    unit: r.unit,
                    date: r.recorded_at,
                    notes: r.notes,
                    createdAt: r.created_at,
                    synced: true
                }));
                const localRecords = this.getHealthRecords();
                const merged = [...cloudRecords];
                for (const local of localRecords) {
                    if (!merged.find(r => r.id === local.id)) {
                        merged.push(local);
                    }
                }
                this.saveHealthRecords(merged);
                console.log(`📥 下载了 ${cloudRecords.length} 条健康记录`);
            }

            // 下载饮食记录
            const dietResult = await supabaseClient.pullFromCloud('diet_records');
            if (dietResult.data && dietResult.data.length > 0) {
                const cloudRecords = dietResult.data.map(r => ({
                    id: r.id,
                    memberId: r.member_id,
                    mealType: r.meal_type,
                    date: r.date,
                    foodName: r.food_name,
                    quantity: r.quantity,
                    unit: r.unit,
                    nutrition: {
                        calories: r.calories,
                        protein: r.protein,
                        fat: r.fat,
                        carbs: r.carbs,
                        fiber: r.fiber
                    },
                    createdAt: r.created_at,
                    synced: true
                }));
                const localRecords = this.getDietRecords();
                const merged = [...cloudRecords];
                for (const local of localRecords) {
                    if (!merged.find(r => r.id === local.id)) {
                        merged.push(local);
                    }
                }
                this.saveDietRecords(merged);
                console.log(`📥 下载了 ${cloudRecords.length} 条饮食记录`);
            }

            // 下载运动记录
            const exerciseResult = await supabaseClient.pullFromCloud('exercise_records');
            if (exerciseResult.data && exerciseResult.data.length > 0) {
                const cloudRecords = exerciseResult.data.map(r => ({
                    id: r.id,
                    memberId: r.member_id,
                    type: r.exercise_type,
                    duration: r.duration_minutes,
                    caloriesBurned: r.calories_burned,
                    exerciseDate: r.recorded_at,
                    notes: r.notes,
                    createdAt: r.created_at,
                    synced: true
                }));
                const localRecords = this.getExercises();
                const merged = [...cloudRecords];
                for (const local of localRecords) {
                    if (!merged.find(r => r.id === local.id)) {
                        merged.push(local);
                    }
                }
                this.saveExercises(merged);
                console.log(`📥 下载了 ${cloudRecords.length} 条运动记录`);
            }

            // 更新同步时间
            localStorage.setItem('lastSyncTime', new Date().toISOString());

            // 刷新页面显示
            this.loadMembers();
            this.loadHealthRecords();
            this.loadDietRecords();
            this.loadExercises();
            this.updateStats();

            console.log('========== 云端数据下载完成 ==========');
            return Promise.resolve();

        } catch (error) {
            console.error('❌ 从云端下载数据失败:', error);
            return Promise.reject(error);
        }
    }

    // 同步饮食记录到云端
    async syncDietRecordToCloud(record) {
        if (typeof supabaseClient === 'undefined' || !supabaseClient.isConnected) {
            return;
        }

        try {
            const cloudRecord = {
                id: record.id,
                member_id: record.memberId,
                meal_type: record.mealType,
                date: record.date,
                food_name: record.foodName,
                quantity: record.quantity,
                unit: record.unit,
                calories: record.nutrition?.calories,
                protein: record.nutrition?.protein,
                fat: record.nutrition?.fat,
                carbs: record.nutrition?.carbs,
                fiber: record.nutrition?.fiber,
                created_at: record.createdAt,
                updated_at: new Date().toISOString()
            };

            await supabaseClient.pushToCloud('diet_records', cloudRecord, record.id);
        } catch (error) {
            console.error('❌ 饮食记录同步失败:', error);
        }
    }

    // 自动从云端同步数据
    async autoSyncFromCloud() {
        if (typeof supabaseClient === 'undefined' || !supabaseClient.isConnected) {
            return;
        }

        try {
            console.log('🔄 开始自动同步数据...');

            // 暂时禁用自动同步，避免数据暴增
            console.log('⚠️ 自动同步已临时禁用，请手动同步');
            return;

            // 拉取所有数据
            await this.syncFamilyMembers();
            await this.syncHealthRecords();
            await this.syncDietRecords();
            await this.syncExerciseRecords();

            // 刷新当前页面显示
            this.loadMembers();
            this.loadHealthRecords();
            this.loadDietRecords();
            this.loadExercises();
            this.updateStats();

            console.log('✅ 自动同步完成');
        } catch (error) {
            console.error('❌ 自动同步失败:', error);
        }
    }

    // 绑定事件
    bindEvents() {
        // 延迟绑定，确保 DOM 已加载
        setTimeout(() => {
            // 底部导航栏
            document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    const tab = e.currentTarget.dataset.tab;
                    this.switchTab(tab);
                });
            });

            // 添加成员按钮
            const addMemberBtn = document.getElementById('addMemberBtn');
            if (addMemberBtn) {
                addMemberBtn.addEventListener('click', () => this.showAddMemberModal());
            }
            
            const newMemberBtn = document.getElementById('newMemberBtn');
            if (newMemberBtn) {
                newMemberBtn.addEventListener('click', () => this.showAddMemberModal());
            }

            // 成员下拉菜单
            const memberDropdownBtn = document.getElementById('memberDropdownBtn');
            const memberDropdownMenu = document.getElementById('memberDropdownMenu');
            const addMemberMenuBtn = document.getElementById('addMemberMenuBtn');
            const manageMembersMenuBtn = document.getElementById('manageMembersMenuBtn');
            
            if (memberDropdownBtn) {
                memberDropdownBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleMemberDropdown();
                });
            }
            
            if (addMemberMenuBtn) {
                addMemberMenuBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.hideMemberDropdown();
                    this.showAddMemberModal();
                });
            }
            
            if (manageMembersMenuBtn) {
                manageMembersMenuBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.hideMemberDropdown();
                    this.switchTab('members');
                });
            }
            
            // 点击其他地方关闭下拉菜单
            document.addEventListener('click', () => {
                this.hideMemberDropdown();
            });

            // 添加健康记录按钮
            const addHealthBtn = document.getElementById('addHealthBtn');
            if (addHealthBtn) {
                addHealthBtn.addEventListener('click', () => this.showAddHealthModal());
            }

            // 添加饮食记录按钮
            const addDietBtn = document.getElementById('addDietBtn');
            if (addDietBtn) {
                addDietBtn.addEventListener('click', () => this.showAddDietModal());
            }

            // 添加运动记录按钮
            const addExerciseBtn = document.getElementById('addExerciseBtn');
            if (addExerciseBtn) {
                addExerciseBtn.addEventListener('click', () => this.showAddExerciseModal());
            }

            // 云同步配置按钮
            const cloudConfigBtn = document.getElementById('cloudConfigBtn');
            if (cloudConfigBtn) {
                cloudConfigBtn.addEventListener('click', () => this.showCloudSyncModal());
            }

            // 云同步开关按钮 - 更可靠的事件绑定
            const cloudSyncToggle = document.getElementById('cloudSyncToggle');
            if (cloudSyncToggle) {
                // 先移除所有现有的事件监听器
                const newToggle = cloudSyncToggle.cloneNode(true);
                cloudSyncToggle.parentNode.replaceChild(newToggle, cloudSyncToggle);
                
                // 重新绑定事件
                newToggle.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🔄 云同步开关被点击');
                    
                    if (!window.supabaseClient) {
                        console.error('Supabase 客户端未初始化');
                        alert('请先配置云同步');
                        return;
                    }
                    
                    // 切换状态
                    window.supabaseClient.isOnline = !window.supabaseClient.isOnline;
                    const isOnline = window.supabaseClient.isOnline;
                    console.log('云同步状态:', isOnline ? '开启' : '关闭');
                    
                    // 直接更新样式
                    newToggle.classList.remove('cloud-sync-on', 'cloud-sync-off');
                    if (isOnline) {
                        newToggle.classList.add('cloud-sync-on');
                        newToggle.style.color = '#4CAF50';
                        newToggle.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
                        newToggle.style.borderColor = '#4CAF50';
                        newToggle.title = '云同步已开启（点击关闭）';
                        
                        // 弹出选择：上传还是下载
                        const choice = confirm(
                            '请选择同步方向：\n\n' +
                            '点击【确定】= 上传本地数据到云端\n' +
                            '点击【取消】= 从云端下载数据到本地'
                        );
                        
                        if (choice) {
                            // 上传
                            console.log('🔄 开始上传数据到云端...');
                            this.uploadAllLocalDataToCloud().then(() => {
                                console.log('✅ 上传完成');
                                alert('数据已上传到云端！');
                            }).catch(err => {
                                console.error('❌ 上传失败:', err);
                                alert('上传失败：' + err.message);
                            });
                        } else {
                            // 下载
                            console.log('🔄 开始从云端下载数据...');
                            this.downloadAllDataFromCloud().then(() => {
                                console.log('✅ 下载完成');
                                alert('云端数据已同步到本地！');
                            }).catch(err => {
                                console.error('❌ 下载失败:', err);
                                alert('下载失败：' + err.message);
                            });
                        }
                        
                    } else {
                        newToggle.classList.add('cloud-sync-off');
                        newToggle.style.color = '#f44336';
                        newToggle.style.backgroundColor = 'rgba(244, 67, 54, 0.1)';
                        newToggle.style.borderColor = '#f44336';
                        newToggle.title = '云同步已关闭（点击开启）';
                        console.log('🔴 云同步已关闭');
                    }
                });
                
                console.log('✅ 云同步开关事件绑定完成');
            }
                });
                
                console.log('✅ 云同步开关事件绑定完成');
            }

            // 健康记录筛选
            const healthFilter = document.getElementById('healthFilter');
            if (healthFilter) {
                healthFilter.addEventListener('change', () => this.loadHealthRecords());
            }

            // 饮食日期筛选
            const dietDate = document.getElementById('dietDate');
            if (dietDate) {
                dietDate.addEventListener('change', () => this.loadDietRecords());
            }

            // 运动日期筛选
            const exerciseDate = document.getElementById('exerciseDate');
            if (exerciseDate) {
                exerciseDate.addEventListener('change', () => this.loadExercises());
            }

            console.log('App: 事件绑定完成');
        }, 100);
    }

    // 切换标签页
    switchTab(tabName) {
        // 更新底部导航栏激活状态
        document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.tab === tabName) {
                item.classList.add('active');
            }
        });

        // 显示对应的内容区域
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
            if (content.id === tabName) {
                content.classList.add('active');
            }
        });
        
        // 加载对应标签页的数据
        if (tabName === 'diet') {
            this.loadDietRecords();
        } else if (tabName === 'ai-consultation') {
            // 确保AI助手已初始化
            if (typeof aiAssistant !== 'undefined' && aiAssistant) {
                aiAssistant.updateUI();
            }
        }
    }

    // 数据存储相关方法
    // ====================

    // 获取所有成员
    getMembers() {
        return JSON.parse(localStorage.getItem('family_members') || '[]');
    }

    // 保存成员
    saveMembers(members) {
        localStorage.setItem('family_members', JSON.stringify(members));
    }

    // 获取健康记录
    getHealthRecords(memberId = null) {
        const records = JSON.parse(localStorage.getItem('health_records') || '[]');
        if (memberId) {
            return records.filter(record => record.memberId === memberId);
        }
        return records;
    }

    // 保存健康记录
    saveHealthRecords(records) {
        localStorage.setItem('health_records', JSON.stringify(records));
    }

    // 获取用药提醒
    getMedications(memberId = null) {
        const medications = JSON.parse(localStorage.getItem('medications') || '[]');
        if (memberId) {
            return medications.filter(med => med.memberId === memberId);
        }
        return medications;
    }

    // 保存用药提醒
    saveMedications(medications) {
        localStorage.setItem('medications', JSON.stringify(medications));
    }

    // 获取运动记录
    getExercises(memberId = null) {
        const exercises = JSON.parse(localStorage.getItem('exercises') || '[]');
        if (memberId) {
            return exercises.filter(exercise => exercise.memberId === memberId);
        }
        return exercises;
    }

    // 保存运动记录
    saveExercises(exercises) {
        localStorage.setItem('exercises', JSON.stringify(exercises));
    }

    // ==================== 饮食管理方法 ====================
    
    // 获取饮食记录
    getDietRecords(memberId = null, date = null) {
        const records = JSON.parse(localStorage.getItem('diet_records') || '[]');
        let filtered = records;
        
        if (memberId) {
            filtered = filtered.filter(record => record.memberId === memberId);
        }
        
        if (date) {
            filtered = filtered.filter(record => record.date === date);
        }
        
        return filtered;
    }

    // 保存饮食记录
    saveDietRecords(records) {
        localStorage.setItem('diet_records', JSON.stringify(records));
    }

    // 添加饮食记录
    addDietRecord(record) {
        const records = this.getDietRecords();
        record.id = Date.now().toString();
        record.createdAt = new Date().toISOString();
        records.push(record);
        this.saveDietRecords(records);
        
        // 同步到云端
        if (typeof supabaseClient !== 'undefined' && supabaseClient.isConnected) {
            const cloudRecord = {
                id: record.id,
                member_id: record.memberId,
                meal_type: record.mealType,
                date: record.date,
                food_name: record.foodName,
                quantity: record.quantity,
                unit: record.unit,
                calories: record.nutrition?.calories,
                protein: record.nutrition?.protein,
                fat: record.nutrition?.fat,
                carbs: record.nutrition?.carbs,
                fiber: record.nutrition?.fiber,
                created_at: record.createdAt,
                updated_at: new Date().toISOString()
            };
            supabaseClient.pushToCloud('diet_records', cloudRecord, record.id);
        }
        
        // 更新统计
        this.updateStats();
        this.loadDietRecords();
        
        return record;
    }

    // 删除饮食记录
    deleteDietRecord(recordId) {
        const records = this.getDietRecords();
        const filtered = records.filter(record => record.id !== recordId);
        this.saveDietRecords(filtered);
        
        this.updateStats();
        this.loadDietRecords();

        // 🔥 关键：同步删除到云端
        this.deleteDietRecordFromCloud(recordId);
    }

    // 从云端删除饮食记录
    async deleteDietRecordFromCloud(recordId) {
        if (typeof supabaseClient === 'undefined' || !supabaseClient.isConnected) {
            console.log('云同步未启用，跳过删除');
            return;
        }

        try {
            await supabaseClient.deleteFromCloud('diet_records', recordId);
            console.log('✅ 饮食记录已从云端删除');
        } catch (error) {
            console.error('❌ 饮食记录删除失败:', error);
        }
    }

    // 计算每日营养汇总
    calculateDailyNutrition(records) {
        const summary = {
            breakfast: { carbs: 0, protein: 0, fat: 0, fiber: 0, calories: 0 },
            lunch: { carbs: 0, protein: 0, fat: 0, fiber: 0, calories: 0 },
            dinner: { carbs: 0, protein: 0, fat: 0, fiber: 0, calories: 0 },
            snack: { carbs: 0, protein: 0, fat: 0, fiber: 0, calories: 0 },
            total: { carbs: 0, protein: 0, fat: 0, fiber: 0, calories: 0 }
        };
        
        records.forEach(record => {
            const mealType = record.mealType;
            const nutrition = record.nutrition;
            
            if (summary[mealType]) {
                summary[mealType].carbs += nutrition.carbs;
                summary[mealType].protein += nutrition.protein;
                summary[mealType].fat += nutrition.fat;
                summary[mealType].fiber += nutrition.fiber;
                summary[mealType].calories += nutrition.calories;
            }
            
            summary.total.carbs += nutrition.carbs;
            summary.total.protein += nutrition.protein;
            summary.total.fat += nutrition.fat;
            summary.total.fiber += nutrition.fiber;
            summary.total.calories += nutrition.calories;
        });
        
        // 四舍五入到1位小数
        Object.keys(summary).forEach(meal => {
            Object.keys(summary[meal]).forEach(nutrient => {
                summary[meal][nutrient] = Math.round(summary[meal][nutrient] * 10) / 10;
            });
        });
        
        return summary;
    }

    // 加载饮食记录
    loadDietRecords() {
        if (!this.currentMemberId) {
            this.showDietEmptyState('请先选择家庭成员');
            return;
        }
        
        const date = document.getElementById('dietDate') ? document.getElementById('dietDate').value : new Date().toISOString().split('T')[0];
        const records = this.getDietRecords(this.currentMemberId, date);
        
        if (records.length === 0) {
            this.showDietEmptyState('暂无饮食记录');
            return;
        }
        
        // 显示营养汇总
        this.renderDietSummary(records);
        
        // 显示饮食记录列表
        this.renderDietList(records);
    }

    // 显示饮食空状态
    showDietEmptyState(message) {
        const summaryDiv = document.getElementById('dietSummary');
        const listDiv = document.getElementById('dietList');
        
        if (summaryDiv) {
            summaryDiv.innerHTML = `
                <div class="empty-summary">
                    <i class="fas fa-chart-pie"></i>
                    <p>${message}</p>
                </div>
            `;
        }
        
        if (listDiv) {
            listDiv.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-utensils"></i>
                    <p>${message}</p>
                </div>
            `;
        }
    }

    // 渲染营养汇总
    renderDietSummary(records) {
        const summary = this.calculateDailyNutrition(records);
        const summaryDiv = document.getElementById('dietSummary');
        if (!summaryDiv) return;
        
        summaryDiv.innerHTML = `
            <div class="nutrition-summary">
                <h3><i class="fas fa-chart-pie"></i> 今日营养汇总</h3>
                <div class="summary-cards">
                    <div class="summary-card">
                        <div class="summary-label">总热量</div>
                        <div class="summary-value calories">${summary.total.calories} kcal</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-label">碳水</div>
                        <div class="summary-value carbs">${summary.total.carbs} g</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-label">蛋白质</div>
                        <div class="summary-value protein">${summary.total.protein} g</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-label">脂肪</div>
                        <div class="summary-value fat">${summary.total.fat} g</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-label">膳食纤维</div>
                        <div class="summary-value fiber">${summary.total.fiber} g</div>
                    </div>
                </div>
                
                <div class="meal-breakdown">
                    <h4>各餐分布：</h4>
                    <div class="meal-cards">
                        ${['breakfast', 'lunch', 'dinner', 'snack'].map(meal => {
                            const mealName = {
                                breakfast: '早餐',
                                lunch: '午餐', 
                                dinner: '晚餐',
                                snack: '加餐'
                            }[meal];
                            
                            if (summary[meal].calories === 0) return '';
                            
                            return `
                                <div class="meal-card">
                                    <div class="meal-name">${mealName}</div>
                                    <div class="meal-calories">${summary[meal].calories} kcal</div>
                                    <div class="meal-details">
                                        <span>C:${summary[meal].carbs}g</span>
                                        <span>P:${summary[meal].protein}g</span>
                                        <span>F:${summary[meal].fat}g</span>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    // 渲染饮食记录列表 - 同一餐的食物分组显示
    renderDietList(records) {
        const listDiv = document.getElementById('dietList');
        if (!listDiv) return;
        
        // 按餐次分组
        const mealGroups = {};
        records.forEach(record => {
            const key = `${record.date}_${record.mealType}_${record.time}`;
            if (!mealGroups[key]) {
                mealGroups[key] = {
                    mealType: record.mealType,
                    time: record.time,
                    date: record.date,
                    notes: record.notes,
                    totalNutrition: record.mealTotalNutrition || null,
                    records: []
                };
            }
            mealGroups[key].records.push(record);
        });
        
        const mealNames = {
            breakfast: '早餐',
            lunch: '午餐',
            dinner: '晚餐',
            snack: '加餐'
        };
        
        const mealIcons = {
            breakfast: 'fa-sun',
            lunch: 'fa-cloud-sun',
            dinner: 'fa-moon',
            snack: 'fa-cookie'
        };
        
        // 按时间排序
        const sortedGroups = Object.values(mealGroups).sort((a, b) => {
            const timeA = a.time || '00:00';
            const timeB = b.time || '00:00';
            return timeA.localeCompare(timeB);
        });
        
        listDiv.innerHTML = sortedGroups.map(group => {
            const mealName = mealNames[group.mealType] || '加餐';
            const mealIcon = mealIcons[group.mealType] || 'fa-utensils';
            const time = group.time || '未记录时间';
            
            // 计算本餐总营养
            let totalCal = 0, totalCarbs = 0, totalProtein = 0, totalFat = 0, totalFiber = 0;
            const foodItems = group.records.map(record => {
                totalCal += record.nutrition.calories;
                totalCarbs += record.nutrition.carbs;
                totalProtein += record.nutrition.protein;
                totalFat += record.nutrition.fat;
                totalFiber += record.nutrition.fiber;
                return `
                    <div class="meal-food-item">
                        <span class="food-name">${record.foodName}</span>
                        <span class="food-qty">${record.quantity}${record.unit}</span>
                        <span class="food-cal">${record.nutrition.calories} kcal</span>
                    </div>
                `;
            }).join('');
            
            // 收集所有记录ID用于删除
            const allIds = group.records.map(r => `"${r.id}"`).join(',');
            
            return `
                <div class="diet-record meal-group" data-ids='${allIds}'>
                    <div class="diet-record-header">
                        <div class="diet-meal-info">
                            <span class="meal-badge ${group.mealType}">
                                <i class="fas ${mealIcon}"></i> ${mealName}
                            </span>
                            <span class="diet-time">${time}</span>
                        </div>
                        <button class="btn-icon delete-diet-group" data-ids='${allIds}'>
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    
                    <div class="meal-food-list">
                        ${foodItems}
                    </div>
                    
                    <div class="diet-nutrition meal-total">
                        <div class="nutrient highlight">
                            <span class="nutrient-label">总热量</span>
                            <span class="nutrient-value calories">${Math.round(totalCal)} kcal</span>
                        </div>
                        <div class="nutrient">
                            <span class="nutrient-label">碳水</span>
                            <span class="nutrient-value">${Math.round(totalCarbs * 10) / 10} g</span>
                        </div>
                        <div class="nutrient">
                            <span class="nutrient-label">蛋白质</span>
                            <span class="nutrient-value">${Math.round(totalProtein * 10) / 10} g</span>
                        </div>
                        <div class="nutrient">
                            <span class="nutrient-label">脂肪</span>
                            <span class="nutrient-value">${Math.round(totalFat * 10) / 10} g</span>
                        </div>
                        <div class="nutrient">
                            <span class="nutrient-label">纤维</span>
                            <span class="nutrient-value">${Math.round(totalFiber * 10) / 10} g</span>
                        </div>
                    </div>
                    
                    ${group.notes ? `
                        <div class="diet-notes">
                            <i class="fas fa-sticky-note"></i> ${group.notes}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
        
        // 绑定删除按钮事件（整餐删除）
        listDiv.querySelectorAll('.delete-diet-group').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const ids = JSON.parse(e.currentTarget.dataset.ids);
                if (confirm(`确定要删除这餐（共${ids.length}条记录）的饮食记录吗？`)) {
                    ids.forEach(id => this.deleteDietRecord(id));
                }
            });
        });
    }

    // 成员管理相关方法
    // ====================

    // 加载成员列表
    loadMembers() {
        const members = this.getMembers();
        const memberList = document.getElementById('memberList');

        // 清空成员列表
        if (memberList) {
            memberList.innerHTML = '';
        }

        // 更新下拉菜单
        this.updateMemberDropdownMenu();

        if (members.length === 0) {
            if (memberList) {
                memberList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-user-friends"></i>
                        <p>暂无家庭成员，请点击上方按钮添加</p>
                    </div>
                `;
            }
            return;
        }

        // 填充成员列表卡片
        if (memberList) {
            members.forEach(member => {
                const memberCard = this.createMemberCard(member);
                memberList.appendChild(memberCard);
            });
        }
    }

    // 创建成员卡片
    createMemberCard(member) {
        const card = document.createElement('div');
        card.className = 'card member-card';
        card.innerHTML = `
            <div class="member-card-header">
                <div class="member-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="member-info">
                    <h3>${member.name}</h3>
                    <p>${member.gender === 'male' ? '男' : '女'} · ${this.calculateAge(member.birthDate)}岁</p>
                </div>
            </div>
            <div class="member-card-body">
                <div class="member-detail">
                    <span><i class="fas fa-birthday-cake"></i> 出生日期</span>
                    <span>${member.birthDate}</span>
                </div>
                ${member.notes ? `<div class="member-detail"><span><i class="fas fa-sticky-note"></i> 备注</span><span>${member.notes}</span></div>` : ''}
            </div>
            <div class="member-card-footer">
                <button class="btn btn-secondary btn-sm edit-member" data-id="${member.id}">
                    <i class="fas fa-edit"></i> 编辑
                </button>
                <button class="btn btn-outline-danger btn-sm delete-member" data-id="${member.id}">
                    <i class="fas fa-trash"></i> 删除
                </button>
            </div>
        `;

        // 绑定编辑和删除事件
        const editBtn = card.querySelector('.edit-member');
        const deleteBtn = card.querySelector('.delete-member');
        
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showEditMemberModal(member.id);
            });
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteMember(member.id);
            });
        }

        return card;
    }

    // 计算年龄
    calculateAge(birthDate) {
        const birth = new Date(birthDate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        
        return age;
    }

    // 更新成员选择器
    updateMemberSelect() {
        const members = this.getMembers();
        const memberSelect = document.getElementById('memberSelect');
        
        if (memberSelect) {
            memberSelect.innerHTML = '<option value="">请选择家庭成员</option>';
            members.forEach(member => {
                const option = document.createElement('option');
                option.value = member.id;
                option.textContent = `${member.name} (${member.gender === 'male' ? '男' : '女'}, ${this.calculateAge(member.birthDate)}岁)`;
                if (member.id === this.currentMemberId) {
                    option.selected = true;
                }
                memberSelect.appendChild(option);
            });
        }
        
        // 更新下拉菜单
        this.updateMemberDropdownMenu();
    }
    
    // 切换成员下拉菜单
    toggleMemberDropdown() {
        const menu = document.getElementById('memberDropdownMenu');
        if (menu) {
            if (menu.style.display === 'none' || !menu.classList.contains('show')) {
                this.updateMemberDropdownMenu();
                menu.style.display = 'block';
                menu.classList.add('show');
            } else {
                this.hideMemberDropdown();
            }
        }
    }
    
    // 隐藏成员下拉菜单
    hideMemberDropdown() {
        const menu = document.getElementById('memberDropdownMenu');
        if (menu) {
            menu.style.display = 'none';
            menu.classList.remove('show');
        }
    }
    
    // 更新成员下拉菜单
    updateMemberDropdownMenu() {
        const members = this.getMembers();
        const menuList = document.getElementById('memberMenuList');
        const selectedNameSpan = document.getElementById('selectedMemberName');
        
        if (selectedNameSpan) {
            if (this.currentMemberId) {
                const currentMember = members.find(m => m.id === this.currentMemberId);
                selectedNameSpan.textContent = currentMember ? currentMember.name : '选择成员';
            } else {
                selectedNameSpan.textContent = '选择成员';
            }
        }
        
        if (menuList) {
            if (members.length === 0) {
                menuList.innerHTML = '<div class="dropdown-item" style="color: #999;">暂无成员</div>';
                return;
            }
            
            menuList.innerHTML = members.map(member => `
                <div class="member-menu-item ${member.id === this.currentMemberId ? 'selected' : ''}" data-id="${member.id}">
                    <div class="member-menu-item-info">
                        <i class="fas fa-user"></i>
                        <span>${member.name} (${member.gender === 'male' ? '男' : '女'}, ${this.calculateAge(member.birthDate)}岁)</span>
                    </div>
                    <div class="member-menu-item-actions">
                        <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); app.showEditMemberModal('${member.id}'); app.hideMemberDropdown();">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); app.deleteMember('${member.id}'); app.hideMemberDropdown();">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');
            
            // 添加点击选中事件
            menuList.querySelectorAll('.member-menu-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    if (!e.target.closest('.member-menu-item-actions')) {
                        this.currentMemberId = item.dataset.id;
                        this.hideMemberDropdown();
                        this.loadHealthRecords();
                        this.loadDietRecords();
                        this.loadExercises();
                    }
                });
            });
        }
    }

    // 显示添加成员模态框
    showAddMemberModal(memberId = null) {
        const member = memberId ? this.getMembers().find(m => m.id === memberId) : null;
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">${member ? '编辑家庭成员' : '添加家庭成员'}</h3>
                    <button class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="memberForm">
                        <div class="form-group">
                            <label for="memberName">姓名 *</label>
                            <input type="text" id="memberName" class="form-control" required 
                                   value="${member ? member.name : ''}">
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="memberGender">性别 *</label>
                                <select id="memberGender" class="form-control" required>
                                    <option value="">请选择</option>
                                    <option value="male" ${member && member.gender === 'male' ? 'selected' : ''}>男</option>
                                    <option value="female" ${member && member.gender === 'female' ? 'selected' : ''}>女</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="memberBirthDate">出生日期 *</label>
                                <input type="date" id="memberBirthDate" class="form-control" required
                                       value="${member ? member.birthDate : ''}">
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="memberNotes">备注</label>
                            <textarea id="memberNotes" class="form-control" rows="3">${member ? member.notes || '' : ''}</textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary close-modal">取消</button>
                    <button type="submit" class="btn btn-primary" id="submitBtn">${member ? '更新' : '添加'}</button>
                </div>
            </div>
        `;

        document.getElementById('modalContainer').appendChild(modal);

        // 绑定事件
        const closeBtn = modal.querySelector('.close-btn');
        const closeModalBtn = modal.querySelector('.close-modal');
        const form = modal.querySelector('#memberForm');
        const submitBtn = modal.querySelector('#submitBtn');

        const closeModal = () => {
            modal.remove();
        };

        closeBtn.addEventListener('click', closeModal);
        closeModalBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        submitBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.saveMember(memberId);
            closeModal();
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
        });
    }

    // 显示编辑成员模态框
    showEditMemberModal(memberId) {
        this.showAddMemberModal(memberId);
    }

    // 保存成员
    saveMember(memberId = null) {
        const name = document.getElementById('memberName').value.trim();
        const gender = document.getElementById('memberGender').value;
        const birthDate = document.getElementById('memberBirthDate').value;
        const notes = document.getElementById('memberNotes').value.trim();

        if (!name || !gender || !birthDate) {
            alert('请填写所有必填项！');
            return;
        }

        const members = this.getMembers();
        let newMember = null;
        let action = 'create';
        
        if (memberId) {
            // 更新现有成员
            const index = members.findIndex(m => m.id === memberId);
            if (index !== -1) {
                members[index] = { ...members[index], name, gender, birthDate, notes };
                newMember = members[index];
                action = 'update';
            }
        } else {
            // 添加新成员
            newMember = {
                id: Date.now().toString(),
                name,
                gender,
                birthDate,
                notes,
                createdAt: new Date().toISOString()
            };
            members.push(newMember);
            this.currentMemberId = newMember.id;
        }

        this.saveMembers(members);
        this.loadMembers();
        this.updateMemberSelect();
        this.updateStats();
        
        // 🔥 关键：立即同步到云端
        this.syncMemberToCloud(newMember, action);
        
        // 切换到成员管理标签页
        this.switchTab('members');
    }

    // 同步成员到云端
    async syncMemberToCloud(member, action = 'create') {
        if (typeof supabaseClient === 'undefined' || !supabaseClient.isConnected) {
            console.log('云同步未启用，跳过同步');
            return;
        }

        try {
            const cloudMember = {
                id: member.id,
                name: member.name,
                gender: member.gender,
                birth_date: member.birthDate,
                notes: member.notes,
                created_at: member.createdAt || new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            if (action === 'create') {
                await supabaseClient.pushToCloud('family_members', cloudMember, member.id);
                console.log('✅ 家庭成员已同步到云端');
            } else if (action === 'update') {
                await supabaseClient.pushToCloud('family_members', cloudMember, member.id);
                console.log('✅ 家庭成员已更新到云端');
            }
        } catch (error) {
            console.error('❌ 家庭成员同步失败:', error);
        }
    }

    // 删除成员
    deleteMember(memberId) {
        if (!confirm('确定要删除这个家庭成员吗？同时会删除该成员的所有健康记录、用药提醒和运动记录。')) {
            return;
        }

        // 删除成员
        let members = this.getMembers();
        members = members.filter(m => m.id !== memberId);
        this.saveMembers(members);

        // 删除相关健康记录
        let healthRecords = this.getHealthRecords();
        healthRecords = healthRecords.filter(record => record.memberId !== memberId);
        this.saveHealthRecords(healthRecords);

        // 删除相关用药提醒
        let medications = this.getMedications();
        medications = medications.filter(med => med.memberId !== memberId);
        this.saveMedications(medications);

        // 删除相关运动记录
        let exercises = this.getExercises();
        exercises = exercises.filter(exercise => exercise.memberId !== memberId);
        this.saveExercises(exercises);

        // 如果删除的是当前选中的成员，清空选择
        if (this.currentMemberId === memberId) {
            this.currentMemberId = null;
        }

        this.loadMembers();
        this.updateMemberSelect();
        this.loadHealthRecords();
        this.loadMedications();
        this.loadExercises();
        this.updateStats();

        // 🔥 关键：同步删除到云端
        this.deleteMemberFromCloud(memberId);
    }

    // 从云端删除成员
    async deleteMemberFromCloud(memberId) {
        if (typeof supabaseClient === 'undefined' || !supabaseClient.isConnected) {
            console.log('云同步未启用，跳过删除');
            return;
        }

        try {
            await supabaseClient.deleteFromCloud('family_members', memberId);
            console.log('✅ 家庭成员已从云端删除');
        } catch (error) {
            console.error('❌ 家庭成员删除失败:', error);
        }
    }

    // 健康记录相关方法
    // ====================

    // 加载健康记录
    loadHealthRecords() {
        if (!this.currentMemberId) {
            document.getElementById('healthList').innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-heartbeat"></i>
                    <p>请先选择家庭成员</p>
                </div>
            `;
            return;
        }

        const records = this.getHealthRecords(this.currentMemberId);
        const filterType = document.getElementById('healthFilter').value;
        const filteredRecords = filterType === 'all' 
            ? records 
            : records.filter(record => record.type === filterType);

        const healthList = document.getElementById('healthList');
        healthList.innerHTML = '';

        if (filteredRecords.length === 0) {
            healthList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-heartbeat"></i>
                    <p>暂无健康记录，点击上方按钮添加</p>
                </div>
            `;
            return;
        }

        // 按时间倒序排序
        filteredRecords.sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt));

        filteredRecords.forEach(record => {
            const recordCard = this.createHealthRecordCard(record);
            healthList.appendChild(recordCard);
        });
    }

    // 创建健康记录卡片
    createHealthRecordCard(record) {
        const card = document.createElement('div');
        card.className = 'card health-item';
        
        let valueDisplay = '';
        let typeClass = '';
        let icon = '❤️';
        let statusBadge = '';
        
        switch (record.type) {
            case 'blood_pressure':
                valueDisplay = `${record.systolic}/${record.diastolic} mmHg`;
                typeClass = 'blood-pressure';
                icon = '🩸';
                break;
            case 'blood_sugar':
                valueDisplay = `${record.value} mmol/L`;
                typeClass = 'blood-sugar';
                icon = '🍬';
                break;
            case 'heart_rate':
                valueDisplay = `${record.value} 次/分`;
                typeClass = 'heart-rate';
                icon = '💓';
                break;
            case 'height':
                valueDisplay = `${record.value} cm`;
                typeClass = 'height';
                icon = '📏';
                break;
            case 'weight':
                valueDisplay = `${record.value} kg`;
                typeClass = 'weight';
                icon = '⚖️';
                break;
            case 'bmi':
                valueDisplay = `${record.value} kg/m²`;
                typeClass = 'bmi';
                icon = '📊';
                
                // 添加 BMI 状态标签
                const bmiStatus = this.getBMIStatus(record.value);
                statusBadge = `<span class="bmi-status-badge ${bmiStatus.class}">${bmiStatus.text}</span>`;
                break;
        }

        const typeText = {
            blood_pressure: '血压',
            blood_sugar: '血糖',
            heart_rate: '心率',
            height: '身高',
            weight: '体重',
            bmi: 'BMI'
        }[record.type];

        card.innerHTML = `
            <div class="card-header">
                <div class="card-title">
                    <span style="font-size: 1.2rem;">${icon}</span> ${typeText}记录
                </div>
                <div class="card-actions">
                    <button class="btn btn-danger btn-sm delete-health" data-id="${record.id}">
                        <i class="fas fa-trash"></i> 删除
                    </button>
                </div>
            </div>
            <div class="card-body">
                <div class="value">${valueDisplay}</div>
                <span class="type ${typeClass}">${typeText}</span>
                ${statusBadge}
                ${record.notes ? `<p class="mt-2">备注：${record.notes}</p>` : ''}
            </div>
            <div class="card-footer">
                <span>记录时间：${new Date(record.recordedAt).toLocaleString()}</span>
            </div>
        `;

        card.querySelector('.delete-health').addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteHealthRecord(record.id);
        });

        return card;
    }

    // 获取 BMI 状态
    getBMIStatus(bmi) {
        if (bmi < 18.5) {
            return {
                text: '体重过低',
                class: 'bmi-low'
            };
        } else if (bmi < 25) {
            return {
                text: '正常体重',
                class: 'bmi-normal'
            };
        } else if (bmi < 30) {
            return {
                text: '超重',
                class: 'bmi-overweight'
            };
        } else {
            return {
                text: '肥胖',
                class: 'bmi-obese'
            };
        }
    }

    // 显示添加健康记录模态框
    showAddHealthModal() {
        if (!this.currentMemberId) {
            alert('请先选择家庭成员！');
            return;
        }

        const member = this.getMembers().find(m => m.id === this.currentMemberId);
        const age = member ? this.calculateAge(member.birthDate) : null;

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay active';
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">添加健康记录</h3>
                    <button class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="healthForm">
                        <div class="form-group">
                            <label for="healthType">记录类型 *</label>
                            <select id="healthType" class="form-control" required>
                                <option value="">请选择</option>
                                <option value="blood_pressure">血压</option>
                                <option value="blood_sugar">血糖</option>
                                <option value="heart_rate">心率</option>
                                <option value="height">身高</option>
                                <option value="weight">体重</option>
                                <option value="bmi">BMI</option>
                            </select>
                        </div>
                        
                        <!-- 血压字段 -->
                        <div id="bloodPressureFields" class="form-row" style="display: none;">
                            <div class="form-group">
                                <label for="systolic">收缩压 (mmHg) *</label>
                                <input type="number" id="systolic" class="form-control" min="50" max="250">
                            </div>
                            <div class="form-group">
                                <label for="diastolic">舒张压 (mmHg) *</label>
                                <input type="number" id="diastolic" class="form-control" min="30" max="150">
                            </div>
                        </div>
                        
                        <!-- 其他单值字段 -->
                        <div id="otherHealthFields" class="form-group" style="display: none;">
                            <label for="healthValue">数值 *</label>
                            <input type="number" id="healthValue" class="form-control" step="0.1">
                            <small id="healthUnit"></small>
                        </div>
                        
                        <!-- BMI 自动计算提示 -->
                        <div id="bmiAutoCalcInfo" class="bmi-calc-info" style="display: none;">
                            <p style="color: #667eea; font-weight: 500; margin-bottom: 10px;">
                                💡 提示：输入身高和体重后，可自动计算 BMI
                            </p>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="heightForBMI">身高 (cm)</label>
                                    <input type="number" id="heightForBMI" class="form-control" step="0.1" placeholder="例：170">
                                </div>
                                <div class="form-group">
                                    <label for="weightForBMI">体重 (kg)</label>
                                    <input type="number" id="weightForBMI" class="form-control" step="0.1" placeholder="例：65">
                                </div>
                            </div>
                            <button type="button" class="btn btn-secondary" id="calcBMIBtn" style="width: 100%; margin-top: 10px;">
                                <i class="fas fa-calculator"></i> 计算 BMI
                            </button>
                            <div id="bmiResult" style="display: none; margin-top: 10px; padding: 10px; background: #f0f3ff; border-radius: 8px; text-align: center;">
                                <p style="color: #667eea; font-weight: 600; font-size: 1.1rem;" id="bmiResultValue"></p>
                                <p style="color: #999; font-size: 0.85rem;" id="bmiResultStatus"></p>
                            </div>
                        </div>
                        
                        <!-- 正常值参考 -->
                        <div id="normalRangeInfo" class="normal-range-box" style="display: none;">
                            <h4>📊 年龄段正常值参考</h4>
                            <div id="normalRangeContent"></div>
                        </div>
                        
                        <div class="form-group">
                            <label for="healthNotes">备注</label>
                            <textarea id="healthNotes" class="form-control" rows="2"></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label for="recordedAt">记录时间</label>
                            <input type="datetime-local" id="recordedAt" class="form-control" 
                                   value="${new Date().toISOString().slice(0, 16)}">
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary close-modal">取消</button>
                    <button type="submit" class="btn btn-primary" id="submitHealthBtn">添加记录</button>
                </div>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // 绑定事件
        const closeBtn = modal.querySelector('.close-btn');
        const closeModalBtn = modal.querySelector('.close-modal');
        const form = modal.querySelector('#healthForm');
        const healthTypeSelect = modal.querySelector('#healthType');
        const submitBtn = modal.querySelector('#submitHealthBtn');
        const calcBMIBtn = modal.querySelector('#calcBMIBtn');
        const heightForBMI = modal.querySelector('#heightForBMI');
        const weightForBMI = modal.querySelector('#weightForBMI');

        const closeModal = () => {
            overlay.remove();
        };

        closeBtn.addEventListener('click', closeModal);
        closeModalBtn.addEventListener('click', closeModal);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });

        // 根据类型显示不同的输入字段和正常值
        healthTypeSelect.addEventListener('change', (e) => {
            const type = e.target.value;
            const bpFields = modal.querySelector('#bloodPressureFields');
            const otherFields = modal.querySelector('#otherHealthFields');
            const normalRangeInfo = modal.querySelector('#normalRangeInfo');
            const normalRangeContent = modal.querySelector('#normalRangeContent');
            const healthUnit = modal.querySelector('#healthUnit');
            const bmiAutoCalcInfo = modal.querySelector('#bmiAutoCalcInfo');
            
            bpFields.style.display = type === 'blood_pressure' ? 'flex' : 'none';
            otherFields.style.display = (type !== 'blood_pressure' && type !== '' && type !== 'bmi') ? 'block' : 'none';
            bmiAutoCalcInfo.style.display = type === 'bmi' ? 'block' : 'none';
            
            // 显示正常值参考
            if (type && age) {
                const normalRange = this.getNormalHealthRange(type, age);
                if (normalRange) {
                    normalRangeInfo.style.display = 'block';
                    normalRangeContent.innerHTML = normalRange.html;
                    healthUnit.textContent = normalRange.unit || '';
                } else {
                    normalRangeInfo.style.display = 'none';
                }
            } else {
                normalRangeInfo.style.display = 'none';
            }
        });

        // BMI 自动计算
        calcBMIBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const height = parseFloat(heightForBMI.value);
            const weight = parseFloat(weightForBMI.value);
            
            if (!height || !weight || height <= 0 || weight <= 0) {
                alert('请输入有效的身高和体重！');
                return;
            }
            
            if (height < 50 || height > 250) {
                alert('身高应在50-250cm之间！');
                return;
            }
            
            if (weight < 10 || weight > 300) {
                alert('体重应在10-300kg之间！');
                return;
            }
            
            // 计算 BMI
            const heightInMeters = height / 100;
            const bmi = (weight / (heightInMeters * heightInMeters)).toFixed(1);
            
            // 判断 BMI 状态
            let status = '';
            let statusColor = '';
            if (bmi < 18.5) {
                status = '体重过低';
                statusColor = '#ff9800';
            } else if (bmi < 25) {
                status = '正常体重';
                statusColor = '#4CAF50';
            } else if (bmi < 30) {
                status = '超重';
                statusColor = '#ff9800';
            } else {
                status = '肥胖';
                statusColor = '#f44336';
            }
            
            // 显示结果
            const bmiResult = modal.querySelector('#bmiResult');
            const bmiResultValue = modal.querySelector('#bmiResultValue');
            const bmiResultStatus = modal.querySelector('#bmiResultStatus');
            
            bmiResultValue.textContent = `BMI: ${bmi}`;
            bmiResultValue.style.color = statusColor;
            bmiResultStatus.textContent = status;
            bmiResult.style.display = 'block';
            
            // 自动填入 healthValue
            const healthValue = modal.querySelector('#healthValue');
            healthValue.value = bmi;
        });

        // 实时计算 BMI（可选）
        heightForBMI.addEventListener('input', () => {
            const height = parseFloat(heightForBMI.value);
            const weight = parseFloat(weightForBMI.value);
            
            if (height > 0 && weight > 0) {
                const heightInMeters = height / 100;
                const bmi = (weight / (heightInMeters * heightInMeters)).toFixed(1);
                
                let status = '';
                let statusColor = '';
                if (bmi < 18.5) {
                    status = '体重过低';
                    statusColor = '#ff9800';
                } else if (bmi < 25) {
                    status = '正常体重';
                    statusColor = '#4CAF50';
                } else if (bmi < 30) {
                    status = '超重';
                    statusColor = '#ff9800';
                } else {
                    status = '肥胖';
                    statusColor = '#f44336';
                }
                
                const bmiResult = modal.querySelector('#bmiResult');
                const bmiResultValue = modal.querySelector('#bmiResultValue');
                const bmiResultStatus = modal.querySelector('#bmiResultStatus');
                
                bmiResultValue.textContent = `BMI: ${bmi}`;
                bmiResultValue.style.color = statusColor;
                bmiResultStatus.textContent = status;
                bmiResult.style.display = 'block';
                
                const healthValue = modal.querySelector('#healthValue');
                healthValue.value = bmi;
            }
        });

        weightForBMI.addEventListener('input', () => {
            const height = parseFloat(heightForBMI.value);
            const weight = parseFloat(weightForBMI.value);
            
            if (height > 0 && weight > 0) {
                const heightInMeters = height / 100;
                const bmi = (weight / (heightInMeters * heightInMeters)).toFixed(1);
                
                let status = '';
                let statusColor = '';
                if (bmi < 18.5) {
                    status = '体重过低';
                    statusColor = '#ff9800';
                } else if (bmi < 25) {
                    status = '正常体重';
                    statusColor = '#4CAF50';
                } else if (bmi < 30) {
                    status = '超重';
                    statusColor = '#ff9800';
                } else {
                    status = '肥胖';
                    statusColor = '#f44336';
                }
                
                const bmiResult = modal.querySelector('#bmiResult');
                const bmiResultValue = modal.querySelector('#bmiResultValue');
                const bmiResultStatus = modal.querySelector('#bmiResultStatus');
                
                bmiResultValue.textContent = `BMI: ${bmi}`;
                bmiResultValue.style.color = statusColor;
                bmiResultStatus.textContent = status;
                bmiResult.style.display = 'block';
                
                const healthValue = modal.querySelector('#healthValue');
                healthValue.value = bmi;
            }
        });

        submitBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.saveHealthRecord();
            closeModal();
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
        });
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

    // 获取年龄段的正常值范围
    getNormalHealthRange(type, age) {
        const ranges = {
            blood_pressure: {
                unit: 'mmHg',
                html: `
                    <p><strong>收缩压：</strong>90-120 mmHg</p>
                    <p><strong>舒张压：</strong>60-80 mmHg</p>
                    <p style="font-size: 0.85rem; color: #666;">正常血压对所有年龄段基本相同</p>
                `
            },
            blood_sugar: {
                unit: 'mmol/L',
                html: `
                    <p><strong>空腹血糖：</strong>3.9-6.1 mmol/L</p>
                    <p><strong>餐后2小时：</strong>&lt;7.8 mmol/L</p>
                    <p style="font-size: 0.85rem; color: #666;">正常血糖对所有年龄段基本相同</p>
                `
            },
            heart_rate: {
                unit: '次/分',
                html: this.getHeartRateRange(age)
            },
            height: {
                unit: 'cm',
                html: `<p style="font-size: 0.85rem; color: #666;">身高因人而异，无统一标准</p>`
            },
            weight: {
                unit: 'kg',
                html: `<p style="font-size: 0.85rem; color: #666;">体重因人而异，建议结合BMI评估</p>`
            },
            bmi: {
                unit: 'kg/m²',
                html: `
                    <p><strong>体重过低：</strong>&lt;18.5</p>
                    <p><strong>正常体重：</strong>18.5-24.9</p>
                    <p><strong>超重：</strong>25.0-29.9</p>
                    <p><strong>肥胖：</strong>≥30.0</p>
                `
            }
        };
        
        return ranges[type] || null;
    }

    // 获取心率正常范围（根据年龄）
    getHeartRateRange(age) {
        let range = '';
        
        if (age < 1) {
            range = '100-160 次/分';
        } else if (age < 3) {
            range = '80-130 次/分';
        } else if (age < 6) {
            range = '70-110 次/分';
        } else if (age < 12) {
            range = '60-100 次/分';
        } else if (age < 18) {
            range = '55-100 次/分';
        } else if (age < 60) {
            range = '60-100 次/分';
        } else {
            range = '60-100 次/分（可能偏低）';
        }
        
        return `<p><strong>正常心率：</strong>${range}</p>`;
    }

    // 保存健康记录
    saveHealthRecord() {
        const type = document.getElementById('healthType').value;
        const notes = document.getElementById('healthNotes').value.trim();
        const recordedAt = document.getElementById('recordedAt').value;

        let value, systolic, diastolic;

        if (type === 'blood_pressure') {
            systolic = parseInt(document.getElementById('systolic').value);
            diastolic = parseInt(document.getElementById('diastolic').value);
            
            if (!systolic || !diastolic || systolic < 50 || systolic > 250 || diastolic < 30 || diastolic > 150) {
                alert('请输入有效的血压值！');
                return;
            }
        } else if (type) {
            value = parseFloat(document.getElementById('healthValue').value);
            
            if (!value || value <= 0) {
                alert('请输入有效的数值！');
                return;
            }
            
            // 验证各类型的数值范围
            if (type === 'blood_sugar' && (value < 1 || value > 30)) {
                alert('血糖值应在1-30 mmol/L之间！');
                return;
            }
            
            if (type === 'heart_rate' && (value < 30 || value > 200)) {
                alert('心率值应在30-200次/分之间！');
                return;
            }
            
            if (type === 'height' && (value < 50 || value > 250)) {
                alert('身高应在50-250cm之间！');
                return;
            }
            
            if (type === 'weight' && (value < 10 || value > 300)) {
                alert('体重应在10-300kg之间！');
                return;
            }
            
            if (type === 'bmi' && (value < 10 || value > 60)) {
                alert('BMI应在10-60之间！');
                return;
            }
        }

        const records = this.getHealthRecords();
        const newRecord = {
            id: Date.now().toString(),
            memberId: this.currentMemberId,
            type,
            value: type !== 'blood_pressure' ? value : null,
            systolic: type === 'blood_pressure' ? systolic : null,
            diastolic: type === 'blood_pressure' ? diastolic : null,
            notes,
            recordedAt: recordedAt || new Date().toISOString(),
            createdAt: new Date().toISOString()
        };

        records.push(newRecord);
        this.saveHealthRecords(records);
        this.loadHealthRecords();
        this.updateStats();
        alert('✅ 健康记录已添加！');
        
        // 🔥 关键：立即同步到云端
        this.syncHealthRecordToCloud(newRecord);
    }

    // 同步单条健康记录到云端
    async syncHealthRecordToCloud(record) {
        if (typeof supabaseClient === 'undefined' || !supabaseClient.isConnected) {
            console.log('云同步未启用，跳过同步');
            return;
        }

        try {
            const cloudRecord = {
                id: record.id,
                member_id: record.memberId,
                type: record.type,
                value: record.value,
                secondary_value: record.systolic || record.diastolic || null,
                recorded_at: record.recordedAt ? record.recordedAt.split('T')[0] : new Date().toISOString().split('T')[0],
                notes: record.notes,
                created_at: record.createdAt,
                updated_at: new Date().toISOString()
            };

            await supabaseClient.pushToCloud('health_records', cloudRecord, record.id);
            console.log('✅ 健康记录已同步到云端');
        } catch (error) {
            console.error('❌ 健康记录同步失败:', error);
        }
    }

    // 删除健康记录
    deleteHealthRecord(recordId) {
        if (!confirm('确定要删除这条健康记录吗？')) {
            return;
        }

        let records = this.getHealthRecords();
        records = records.filter(record => record.id !== recordId);
        this.saveHealthRecords(records);
        this.loadHealthRecords();
        this.updateStats();

        // 🔥 关键：同步删除到云端
        this.deleteHealthRecordFromCloud(recordId);
    }

    // 从云端删除健康记录
    async deleteHealthRecordFromCloud(recordId) {
        if (typeof supabaseClient === 'undefined' || !supabaseClient.isConnected) {
            console.log('云同步未启用，跳过删除');
            return;
        }

        try {
            await supabaseClient.deleteFromCloud('health_records', recordId);
            console.log('✅ 健康记录已从云端删除');
        } catch (error) {
            console.error('❌ 健康记录删除失败:', error);
        }
    }

    // 用药提醒相关方法
    // ====================

    // 加载用药提醒
    loadMedications() {
        if (!this.currentMemberId) {
            document.getElementById('medicationList').innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-prescription-bottle-alt"></i>
                    <p>请先选择家庭成员</p>
                </div>
            `;
            return;
        }

        const medications = this.getMedications(this.currentMemberId);
        const medicationList = document.getElementById('medicationList');
        medicationList.innerHTML = '';

        if (medications.length === 0) {
            medicationList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-prescription-bottle-alt"></i>
                    <p>暂无用药提醒，点击上方按钮添加</p>
                </div>
            `;
            return;
        }

        medications.forEach(medication => {
            const medCard = this.createMedicationCard(medication);
            medicationList.appendChild(medCard);
        });
    }

    // 创建用药提醒卡片
    createMedicationCard(medication) {
        const card = document.createElement('div');
        card.className = 'card medication-item';
        
        const times = medication.times.map(time => time.slice(0, 5)).join(', ');
        const statusClass = medication.active ? 'status-active' : 'status-inactive';
        const statusText = medication.active ? '启用中' : '已停用';

        card.innerHTML = `
            <div class="card-header">
                <div class="card-title">
                    <i class="fas fa-pills"></i> ${medication.name}
                </div>
                <div class="card-actions">
                    <button class="btn btn-secondary btn-sm toggle-medication" data-id="${medication.id}">
                        <i class="fas fa-power-off"></i> ${medication.active ? '停用' : '启用'}
                    </button>
                    <button class="btn btn-danger btn-sm delete-medication" data-id="${medication.id}">
                        <i class="fas fa-trash"></i> 删除
                    </button>
                </div>
            </div>
            <div class="card-body">
                <div class="time">${times}</div>
                <p><strong>用法用量：</strong>${medication.dosage}</p>
                <span class="status ${statusClass}">${statusText}</span>
                ${medication.notes ? `<p class="mt-2">备注：${medication.notes}</p>` : ''}
            </div>
            <div class="card-footer">
                <span>创建时间：${new Date(medication.createdAt).toLocaleDateString()}</span>
            </div>
        `;

        card.querySelector('.toggle-medication').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMedication(medication.id);
        });

        card.querySelector('.delete-medication').addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteMedication(medication.id);
        });

        return card;
    }

    // 显示添加用药提醒模态框
    showAddMedicationModal() {
        if (!this.currentMemberId) {
            alert('请先选择家庭成员！');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">添加用药提醒</h3>
                    <button class="close-btn">&times;</button>
                </div>
                <form id="medicationForm">
                    <div class="form-group">
                        <label for="medicationName">药品名称 *</label>
                        <input type="text" id="medicationName" class="form-control" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="medicationDosage">用法用量 *</label>
                        <input type="text" id="medicationDosage" class="form-control" required 
                               placeholder="例如：每次1片，每日2次">
                    </div>
                    
                    <div class="form-group">
                        <label for="medicationTimes">提醒时间 *</label>
                        <div id="timeInputs">
                            <div class="form-row time-input">
                                <input type="time" class="form-control time-field" required>
                                <button type="button" class="btn btn-secondary btn-sm remove-time" style="display: none;">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                        <button type="button" id="addTimeBtn" class="btn btn-secondary btn-sm mt-2">
                            <i class="fas fa-plus"></i> 添加时间
                        </button>
                    </div>
                    
                    <div class="form-group">
                        <label for="medicationNotes">备注</label>
                        <textarea id="medicationNotes" class="form-control" rows="3"></textarea>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary close-modal">取消</button>
                        <button type="submit" class="btn btn-primary">添加提醒</button>
                    </div>
                </form>
            </div>
        `;

        document.getElementById('modalContainer').appendChild(modal);

        // 绑定事件
        const closeBtn = modal.querySelector('.close-btn');
        const closeModalBtn = modal.querySelector('.close-modal');
        const form = modal.querySelector('#medicationForm');
        const addTimeBtn = modal.querySelector('#addTimeBtn');
        const timeInputs = modal.querySelector('#timeInputs');

        const closeModal = () => {
            modal.remove();
        };

        closeBtn.addEventListener('click', closeModal);
        closeModalBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // 添加时间输入框
        addTimeBtn.addEventListener('click', () => {
            const timeInput = document.createElement('div');
            timeInput.className = 'form-row time-input mt-2';
            timeInput.innerHTML = `
                <input type="time" class="form-control time-field" required>
                <button type="button" class="btn btn-secondary btn-sm remove-time">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            timeInputs.appendChild(timeInput);
            
            // 绑定删除事件
            timeInput.querySelector('.remove-time').addEventListener('click', (e) => {
                e.target.closest('.time-input').remove();
            });
        });

        // 绑定删除事件给第一个时间输入框的删除按钮（初始隐藏）
        const firstRemoveBtn = timeInputs.querySelector('.remove-time');
        if (firstRemoveBtn) {
            firstRemoveBtn.addEventListener('click', (e) => {
                e.target.closest('.time-input').remove();
            });
        }

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveMedication();
            closeModal();
        });
    }

    // 保存用药提醒
    saveMedication() {
        const name = document.getElementById('medicationName').value.trim();
        const dosage = document.getElementById('medicationDosage').value.trim();
        const notes = document.getElementById('medicationNotes').value.trim();
        
        const timeFields = document.querySelectorAll('.time-field');
        const times = Array.from(timeFields)
            .map(field => field.value)
            .filter(time => time);

        if (!name || !dosage || times.length === 0) {
            alert('请填写所有必填项！');
            return;
        }

        const medications = this.getMedications();
        const newMedication = {
            id: Date.now().toString(),
            memberId: this.currentMemberId,
            name,
            dosage,
            times,
            notes,
            active: true,
            createdAt: new Date().toISOString()
        };

        medications.push(newMedication);
        this.saveMedications(medications);
        this.loadMedications();
        this.updateStats();

        // 🔥 关键：立即同步到云端
        this.syncMedicationToCloud(newMedication);
    }

    // 同步用药提醒到云端
    async syncMedicationToCloud(medication) {
        if (typeof supabaseClient === 'undefined' || !supabaseClient.isConnected) {
            console.log('云同步未启用，跳过同步');
            return;
        }

        try {
            const cloudRecord = {
                id: medication.id,
                member_id: medication.memberId,
                name: medication.name,
                dosage: medication.dosage,
                times: medication.times.join(','),
                notes: medication.notes,
                active: medication.active,
                created_at: medication.createdAt,
                updated_at: new Date().toISOString()
            };

            await supabaseClient.pushToCloud('medications', cloudRecord, medication.id);
            console.log('✅ 用药提醒已同步到云端');
        } catch (error) {
            console.error('❌ 用药提醒同步失败:', error);
        }
    }

    // 切换用药提醒状态
    toggleMedication(medicationId) {
        const medications = this.getMedications();
        const index = medications.findIndex(med => med.id === medicationId);
        
        if (index !== -1) {
            medications[index].active = !medications[index].active;
            this.saveMedications(medications);
            this.loadMedications();

            // 🔥 关键：同步状态变化到云端
            this.syncMedicationStatusToCloud(medications[index]);
        }
    }

    // 同步用药提醒状态到云端
    async syncMedicationStatusToCloud(medication) {
        if (typeof supabaseClient === 'undefined' || !supabaseClient.isConnected) {
            console.log('云同步未启用，跳过同步');
            return;
        }

        try {
            const cloudRecord = {
                id: medication.id,
                member_id: medication.memberId,
                name: medication.name,
                dosage: medication.dosage,
                times: medication.times.join(','),
                notes: medication.notes,
                active: medication.active,
                created_at: medication.createdAt,
                updated_at: new Date().toISOString()
            };

            await supabaseClient.pushToCloud('medications', cloudRecord, medication.id);
            console.log('✅ 用药提醒状态已同步到云端');
        } catch (error) {
            console.error('❌ 用药提醒状态同步失败:', error);
        }
    }

    // 删除用药提醒
    deleteMedication(medicationId) {
        if (!confirm('确定要删除这个用药提醒吗？')) {
            return;
        }

        let medications = this.getMedications();
        medications = medications.filter(med => med.id !== medicationId);
        this.saveMedications(medications);
        this.loadMedications();
        this.updateStats();

        // 🔥 关键：同步删除到云端
        this.deleteMedicationFromCloud(medicationId);
    }

    // 从云端删除用药提醒
    async deleteMedicationFromCloud(medicationId) {
        if (typeof supabaseClient === 'undefined' || !supabaseClient.isConnected) {
            console.log('云同步未启用，跳过删除');
            return;
        }

        try {
            await supabaseClient.deleteFromCloud('medications', medicationId);
            console.log('✅ 用药提醒已从云端删除');
        } catch (error) {
            console.error('❌ 用药提醒删除失败:', error);
        }
    }

    // 检查用药提醒
    checkMedicationReminders() {
        if (!this.currentMemberId) return;

        const medications = this.getMedications(this.currentMemberId);
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes(); // 转换为分钟数

        medications.forEach(medication => {
            if (!medication.active) return;

            medication.times.forEach(timeStr => {
                const [hours, minutes] = timeStr.split(':').map(Number);
                const reminderTime = hours * 60 + minutes;
                
                // 检查是否在当前时间的±5分钟内
                if (Math.abs(currentTime - reminderTime) <= 5) {
                    // 检查今天是否已经提醒过
                    const lastRemindedKey = `last_reminded_${medication.id}_${timeStr}`;
                    const lastReminded = localStorage.getItem(lastRemindedKey);
                    const today = now.toDateString();
                    
                    if (lastReminded !== today) {
                        // 显示提醒
                        this.showMedicationReminder(medication, timeStr);
                        // 记录今天已经提醒过
                        localStorage.setItem(lastRemindedKey, today);
                    }
                }
            });
        });
    }

    // 显示用药提醒
    showMedicationReminder(medication, timeStr) {
        // 创建提醒通知
        const reminder = document.createElement('div');
        reminder.className = 'medication-reminder';
        reminder.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            border-left: 5px solid #4CAF50;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            z-index: 1001;
            max-width: 400px;
            animation: slideInRight 0.3s ease;
        `;
        
        reminder.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h4 style="margin: 0; color: #333;">
                    <i class="fas fa-bell" style="color: #4CAF50;"></i> 用药提醒
                </h4>
                <button class="close-reminder" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #999;">
                    &times;
                </button>
            </div>
            <p style="margin: 10px 0; color: #555;">
                <strong>${timeStr}</strong> - ${medication.name}
            </p>
            <p style="margin: 5px 0; color: #666;">${medication.dosage}</p>
            <button class="btn btn-primary btn-sm" style="margin-top: 10px;">
                已服药
            </button>
        `;

        document.body.appendChild(reminder);

        // 绑定关闭事件
        const closeBtn = reminder.querySelector('.close-reminder');
        const confirmBtn = reminder.querySelector('.btn');

        const closeReminder = () => {
            reminder.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => reminder.remove(), 300);
        };

        closeBtn.addEventListener('click', closeReminder);
        confirmBtn.addEventListener('click', closeReminder);

        // 5分钟后自动关闭
        setTimeout(closeReminder, 5 * 60 * 1000);
    }

    // 运动记录相关方法
    // ====================

    // 加载运动记录 - 按日期筛选并显示总热量
    loadExercises() {
        if (!this.currentMemberId) {
            document.getElementById('exerciseList').innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-dumbbell"></i>
                    <p>请先选择家庭成员</p>
                </div>
            `;
            return;
        }

        const date = document.getElementById('exerciseDate') ? document.getElementById('exerciseDate').value : new Date().toISOString().split('T')[0];
        const exercises = this.getExercises(this.currentMemberId);
        const filteredExercises = exercises.filter(ex => ex.exerciseDate === date);

        const exerciseList = document.getElementById('exerciseList');
        exerciseList.innerHTML = '';

        if (filteredExercises.length === 0) {
            exerciseList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-dumbbell"></i>
                    <p>暂无运动记录，点击上方按钮添加</p>
                </div>
            `;
            this.renderExerciseSummary([]);
            return;
        }

        // 按时间倒序排序
        filteredExercises.sort((a, b) => (b.time || '00:00').localeCompare(a.time || '00:00'));

        // 显示汇总
        this.renderExerciseSummary(filteredExercises);

        // 显示记录列表
        filteredExercises.forEach(exercise => {
            const exerciseCard = this.createExerciseCard(exercise);
            exerciseList.appendChild(exerciseCard);
        });
    }

    // 渲染运动汇总
    renderExerciseSummary(exercises) {
        const summaryDiv = document.getElementById('exerciseSummary');
        if (!summaryDiv) return;

        if (exercises.length === 0) {
            summaryDiv.innerHTML = '';
            return;
        }

        let totalCalories = 0;
        let totalDuration = 0;

        exercises.forEach(ex => {
            totalCalories += ex.caloriesBurned || 0;
            totalDuration += ex.duration || 0;
        });

        const hours = Math.floor(totalDuration / 60);
        const minutes = totalDuration % 60;
        const durationText = hours > 0
            ? `${hours}小时${minutes}分钟`
            : `${minutes}分钟`;

        summaryDiv.innerHTML = `
            <div class="exercise-summary-card">
                <h3><i class="fas fa-chart-bar"></i> 今日运动汇总</h3>
                <div class="summary-stats">
                    <div class="stat-item">
                        <div class="stat-label">总运动时长</div>
                        <div class="stat-value">${durationText}</div>
                    </div>
                    <div class="stat-item highlight">
                        <div class="stat-label">总热量消耗</div>
                        <div class="stat-value">${totalCalories} kcal</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">运动项目数</div>
                        <div class="stat-value">${exercises.length}</div>
                    </div>
                </div>
            </div>
        `;
    }

    // 创建运动记录卡片
    createExerciseCard(exercise) {
        const card = document.createElement('div');
        card.className = 'card exercise-item';

        const duration = exercise.duration >= 60
            ? `${Math.floor(exercise.duration / 60)}小时${exercise.duration % 60}分钟`
            : `${exercise.duration}分钟`;

        const exerciseData = (typeof EXERCISE_DATABASE !== 'undefined') ? (EXERCISE_DATABASE[exercise.type] || { icon: 'fa-dumbbell', name: exercise.type }) : { icon: 'fa-dumbbell', name: exercise.type };
        const icon = exerciseData.icon || 'fa-dumbbell';

        card.innerHTML = `
            <div class="card-header">
                <div class="card-title">
                    <i class="fas ${icon}"></i> ${exercise.type}
                </div>
                <div class="card-actions">
                    <button class="btn btn-danger btn-sm delete-exercise" data-id="${exercise.id}">
                        <i class="fas fa-trash"></i> 删除
                    </button>
                </div>
            </div>
            <div class="card-body">
                <div class="exercise-info">
                    <div class="info-item">
                        <span class="info-label"><i class="fas fa-hourglass-end"></i> 运动时长</span>
                        <span class="info-value">${duration}</span>
                    </div>
                    <div class="info-item highlight">
                        <span class="info-label"><i class="fas fa-fire"></i> 热量消耗</span>
                        <span class="info-value">${exercise.caloriesBurned} kcal</span>
                    </div>
                </div>
                ${exercise.notes ? `<p class="mt-2"><i class="fas fa-sticky-note"></i> ${exercise.notes}</p>` : ''}
            </div>
            <div class="card-footer">
                <span><i class="fas fa-calendar"></i> ${new Date(exercise.exerciseDate).toLocaleDateString()}</span>
                ${exercise.time ? `<span><i class="fas fa-clock"></i> ${exercise.time}</span>` : ''}
            </div>
        `;

        card.querySelector('.delete-exercise').addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteExercise(exercise.id);
        });

        return card;
    }

    // 显示添加饮食记录模态框 - 支持多食物和一键选择餐次
    showAddDietModal() {
        if (!this.currentMemberId) {
            alert('请先选择家庭成员');
            return;
        }
        
        // 获取当前时间，自动判断餐次
        const now = new Date();
        const currentHour = now.getHours();
        let defaultMealType = 'snack';
        if (currentHour >= 5 && currentHour < 10) {
            defaultMealType = 'breakfast';
        } else if (currentHour >= 10 && currentHour < 14) {
            defaultMealType = 'lunch';
        } else if (currentHour >= 17 && currentHour < 21) {
            defaultMealType = 'dinner';
        } else {
            defaultMealType = 'snack';
        }
        
        // 获取食物列表和单位列表
        const foodList = getFoodList ? getFoodList() : ['米饭', '面条', '鸡蛋', '鸡胸肉', '青菜', '苹果'];
        const unitList = getUnitList ? getUnitList() : ['g', 'ml', '个', '碗'];
        
        const foodOptions = foodList.map(food => `<option value="${food}">${food}</option>`).join('');
        const unitOptions = unitList.map(unit => `<option value="${unit}">${unit}</option>`).join('');
        
        const modalHTML = `
            <div class="modal-overlay active">
                <div class="modal diet-modal">
                    <div class="modal-header">
                        <h3><i class="fas fa-utensils"></i> 添加饮食记录</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <!-- 餐次快速选择按钮 -->
                        <div class="meal-type-selector">
                            <label><i class="fas fa-clock"></i> 选择餐次</label>
                            <div class="meal-buttons">
                                <button type="button" class="meal-btn ${defaultMealType === 'breakfast' ? 'active' : ''}" data-type="breakfast">
                                    <i class="fas fa-sun"></i> 早餐
                                </button>
                                <button type="button" class="meal-btn ${defaultMealType === 'lunch' ? 'active' : ''}" data-type="lunch">
                                    <i class="fas fa-cloud-sun"></i> 午餐
                                </button>
                                <button type="button" class="meal-btn ${defaultMealType === 'dinner' ? 'active' : ''}" data-type="dinner">
                                    <i class="fas fa-moon"></i> 晚餐
                                </button>
                                <button type="button" class="meal-btn ${defaultMealType === 'snack' ? 'active' : ''}" data-type="snack">
                                    <i class="fas fa-cookie"></i> 加餐
                                </button>
                            </div>
                            <input type="hidden" id="dietMealType" value="${defaultMealType}">
                        </div>
                        
                        <!-- 食物列表 -->
                        <div class="food-list-container" id="foodListContainer">
                            <!-- 初始一条食物记录 -->
                            <div class="food-item" data-index="0">
                                <div class="food-item-header">
                                    <span class="food-item-title">食物 1</span>
                                    <button type="button" class="btn-remove-food" style="display:none;"><i class="fas fa-times"></i></button>
                                </div>
                                <div class="food-item-body">
                                    <div class="form-group">
                                        <label><i class="fas fa-apple-alt"></i> 食物名称</label>
                                        <select class="food-select form-control">
                                            <option value="">请选择食物</option>
                                            ${foodOptions}
                                            <option value="__custom__">✏️ 其他（手动输入）</option>
                                        </select>
                                        <input type="text" class="food-custom-input form-control" placeholder="请输入食物名称" style="display:none; margin-top:6px;">
                                    </div>
                                    <div class="form-row">
                                        <div class="form-group col-6">
                                            <label><i class="fas fa-weight"></i> 数量</label>
                                            <input type="number" class="food-quantity form-control" value="100" min="1">
                                        </div>
                                        <div class="form-group col-6">
                                            <label><i class="fas fa-ruler"></i> 单位</label>
                                            <select class="food-unit form-control">
                                                ${unitOptions}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 添加食物按钮 -->
                        <button type="button" class="btn btn-secondary btn-block" id="addFoodBtn">
                            <i class="fas fa-plus"></i> 添加更多食物
                        </button>
                        
                        <!-- 总热量统计 -->
                        <div class="total-nutrition" id="totalNutrition">
                            <h4><i class="fas fa-chart-pie"></i> 本餐总计</h4>
                            <div class="total-cards">
                                <div class="total-card">
                                    <div class="total-label">热量</div>
                                    <div class="total-value calories" id="totalCalories">0 kcal</div>
                                </div>
                                <div class="total-card">
                                    <div class="total-label">碳水</div>
                                    <div class="total-value" id="totalCarbs">0 g</div>
                                </div>
                                <div class="total-card">
                                    <div class="total-label">蛋白质</div>
                                    <div class="total-value" id="totalProtein">0 g</div>
                                </div>
                                <div class="total-card">
                                    <div class="total-label">脂肪</div>
                                    <div class="total-value" id="totalFat">0 g</div>
                                </div>
                                <div class="total-card">
                                    <div class="total-label">膳食纤维</div>
                                    <div class="total-value" id="totalFiber">0 g</div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 备注 -->
                        <div class="form-group">
                            <label for="dietNotes"><i class="fas fa-sticky-note"></i> 备注（可选）</label>
                            <textarea id="dietNotes" class="form-control" rows="2" placeholder="例如：烹饪方式、特殊调料等"></textarea>
                        </div>
                        
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" id="cancelDietBtn">取消</button>
                            <button type="button" class="btn btn-primary" id="saveDietBtn">
                                <i class="fas fa-save"></i> 保存本餐记录
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const modalContainer = document.getElementById('modalContainer');
        modalContainer.innerHTML = modalHTML;
        
        // 存储食物列表
        let foodItems = [{ name: '', quantity: 100, unit: 'g' }];
        
        // 绑定事件
        const modalOverlay = modalContainer.querySelector('.modal-overlay');
        const closeBtn = modalContainer.querySelector('.modal-close');
        const cancelBtn = modalContainer.querySelector('#cancelDietBtn');
        const saveBtn = modalContainer.querySelector('#saveDietBtn');
        const addFoodBtn = modalContainer.querySelector('#addFoodBtn');
        const foodListContainer = modalContainer.querySelector('#foodListContainer');
        
        // 关闭模态框
        const closeModal = () => {
            modalContainer.innerHTML = '';
        };
        
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeModal();
        });
        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        
        // 餐次按钮点击
        const mealBtns = modalContainer.querySelectorAll('.meal-btn');
        const mealTypeInput = modalContainer.querySelector('#dietMealType');
        mealBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                mealBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                mealTypeInput.value = btn.dataset.type;
            });
        });
        
        // 计算总营养
        const calculateTotalNutrition = () => {
            let total = { carbs: 0, protein: 0, fat: 0, fiber: 0, calories: 0 };
            const foodSelects = foodListContainer.querySelectorAll('.food-item');
            
            foodSelects.forEach((item, index) => {
                const selectVal = item.querySelector('.food-select').value;
                const customVal = item.querySelector('.food-custom-input').value.trim();
                const foodName = selectVal === '__custom__' ? customVal : selectVal;
                const quantity = parseFloat(item.querySelector('.food-quantity').value) || 0;
                const unit = item.querySelector('.food-unit').value;
                
                if (foodName && quantity > 0) {
                    const nutrition = calculateNutrition ? calculateNutrition(foodName, quantity, unit) : {
                        calories: Math.round(quantity * 1.25),
                        carbs: Math.round(quantity * 0.15),
                        protein: Math.round(quantity * 0.05),
                        fat: Math.round(quantity * 0.05),
                        fiber: Math.round(quantity * 0.02)
                    };
                    total.calories += nutrition.calories;
                    total.carbs += nutrition.carbs;
                    total.protein += nutrition.protein;
                    total.fat += nutrition.fat;
                    total.fiber += nutrition.fiber;
                }
            });
            
            // 更新显示
            document.getElementById('totalCalories').textContent = `${Math.round(total.calories)} kcal`;
            document.getElementById('totalCarbs').textContent = `${Math.round(total.carbs * 10) / 10} g`;
            document.getElementById('totalProtein').textContent = `${Math.round(total.protein * 10) / 10} g`;
            document.getElementById('totalFat').textContent = `${Math.round(total.fat * 10) / 10} g`;
            document.getElementById('totalFiber').textContent = `${Math.round(total.fiber * 10) / 10} g`;
            
            return total;
        };
        
        // 绑定食物输入变化事件
        const bindFoodItemEvents = (item, index) => {
            const foodSelect = item.querySelector('.food-select');
            const customInput = item.querySelector('.food-custom-input');
            const quantityInput = item.querySelector('.food-quantity');
            const unitSelect = item.querySelector('.food-unit');
            const removeBtn = item.querySelector('.btn-remove-food');
            
            // 选择"其他"时显示手动输入框
            foodSelect.addEventListener('change', () => {
                if (foodSelect.value === '__custom__') {
                    customInput.style.display = 'block';
                    customInput.focus();
                } else {
                    customInput.style.display = 'none';
                    customInput.value = '';
                }
                calculateTotalNutrition();
            });
            customInput.addEventListener('input', () => calculateTotalNutrition());
            
            const handler = () => calculateTotalNutrition();
            quantityInput.addEventListener('input', handler);
            unitSelect.addEventListener('change', handler);
            
            // 删除按钮
            removeBtn.addEventListener('click', () => {
                const items = foodListContainer.querySelectorAll('.food-item');
                if (items.length > 1) {
                    item.remove();
                    calculateTotalNutrition();
                    updateFoodItemTitles();
                }
            });
        };
        
        // 更新食物项标题
        const updateFoodItemTitles = () => {
            const items = foodListContainer.querySelectorAll('.food-item');
            items.forEach((item, index) => {
                item.querySelector('.food-item-title').textContent = `食物 ${index + 1}`;
                const removeBtn = item.querySelector('.btn-remove-food');
                removeBtn.style.display = items.length > 1 ? 'block' : 'none';
            });
        };
        
        // 添加更多食物
        addFoodBtn.addEventListener('click', () => {
            const itemCount = foodListContainer.querySelectorAll('.food-item').length;
            const newItem = document.createElement('div');
            newItem.className = 'food-item';
            newItem.setAttribute('data-index', itemCount);
            newItem.innerHTML = `
                <div class="food-item-header">
                    <span class="food-item-title">食物 ${itemCount + 1}</span>
                    <button type="button" class="btn-remove-food"><i class="fas fa-times"></i></button>
                </div>
                <div class="food-item-body">
                    <div class="form-group">
                        <label><i class="fas fa-apple-alt"></i> 食物名称</label>
                        <select class="food-select form-control">
                            <option value="">请选择食物</option>
                            ${foodOptions}
                            <option value="__custom__">✏️ 其他（手动输入）</option>
                        </select>
                        <input type="text" class="food-custom-input form-control" placeholder="请输入食物名称" style="display:none; margin-top:6px;">
                    </div>
                    <div class="form-row">
                        <div class="form-group col-6">
                            <label><i class="fas fa-weight"></i> 数量</label>
                            <input type="number" class="food-quantity form-control" value="100" min="1">
                        </div>
                        <div class="form-group col-6">
                            <label><i class="fas fa-ruler"></i> 单位</label>
                            <select class="food-unit form-control">
                                ${unitOptions}
                            </select>
                        </div>
                    </div>
                </div>
            `;
            foodListContainer.appendChild(newItem);
            bindFoodItemEvents(newItem, itemCount);
            updateFoodItemTitles();
        });
        
        // 绑定初始食物项事件
        bindFoodItemEvents(foodListContainer.querySelector('.food-item'), 0);
        updateFoodItemTitles();
        
        // 保存记录
        saveBtn.addEventListener('click', () => {
            const mealType = mealTypeInput.value;
            const notes = modalContainer.querySelector('#dietNotes').value;
            const time = new Date().toTimeString().slice(0, 5);
            const date = new Date().toISOString().split('T')[0];
            
            // 收集所有食物数据
            const foods = [];
            const foodSelects = foodListContainer.querySelectorAll('.food-item');
            
            foodSelects.forEach(item => {
                const selectVal = item.querySelector('.food-select').value;
                const customVal = item.querySelector('.food-custom-input').value.trim();
                const foodName = selectVal === '__custom__' ? customVal : selectVal;
                const quantity = parseFloat(item.querySelector('.food-quantity').value) || 0;
                const unit = item.querySelector('.food-unit').value;
                
                if (foodName && quantity > 0) {
                    const nutrition = calculateNutrition ? calculateNutrition(foodName, quantity, unit) : {
                        calories: Math.round(quantity * 1.25),
                        carbs: Math.round(quantity * 0.15),
                        protein: Math.round(quantity * 0.05),
                        fat: Math.round(quantity * 0.05),
                        fiber: Math.round(quantity * 0.02)
                    };
                    foods.push({
                        name: foodName,
                        quantity: quantity,
                        unit: unit,
                        nutrition: nutrition
                    });
                }
            });
            
            if (foods.length === 0) {
                alert('请至少添加一种食物！');
                return;
            }
            
            // 计算总营养
            const totalNutrition = {
                calories: 0,
                carbs: 0,
                protein: 0,
                fat: 0,
                fiber: 0
            };
            
            foods.forEach(food => {
                totalNutrition.calories += food.nutrition.calories;
                totalNutrition.carbs += food.nutrition.carbs;
                totalNutrition.protein += food.nutrition.protein;
                totalNutrition.fat += food.nutrition.fat;
                totalNutrition.fiber += food.nutrition.fiber;
            });
            
            // 为每种食物创建一条记录
            foods.forEach(food => {
                const record = {
                    memberId: this.currentMemberId,
                    foodName: food.name,
                    quantity: food.quantity,
                    unit: food.unit,
                    mealType: mealType,
                    time: time,
                    date: date,
                    nutrition: food.nutrition,
                    notes: notes,
                    mealTotalNutrition: totalNutrition // 存储本餐总营养
                };
                this.addDietRecord(record);
            });
            
            closeModal();
            alert(`饮食记录已保存！本餐共 ${foods.length} 种食物，总热量 ${Math.round(totalNutrition.calories)} kcal`);
        });
        
        // 初始计算
        calculateTotalNutrition();
    }

    // 显示添加运动记录模态框
    showAddExerciseModal() {
        if (!this.currentMemberId) {
            alert('请先选择家庭成员！');
            return;
        }

        // 获取运动类型列表
        const exerciseTypes = typeof getExerciseTypeList === 'function' ? getExerciseTypeList() : [
            { name: '跑步', icon: 'fa-running', caloriesPerMin: 10 },
            { name: '快走', icon: 'fa-person-walking', caloriesPerMin: 5 },
            { name: '游泳', icon: 'fa-person-swimming', caloriesPerMin: 11 },
            { name: '健身房', icon: 'fa-dumbbell', caloriesPerMin: 9 }
        ];

        const exerciseOptions = exerciseTypes.map(ex =>
            `<option value="${ex.name}">${ex.name}（约${ex.caloriesPerMin}kcal/分钟）</option>`
        ).join('');

        const modalContainer = document.getElementById('modalContainer');
        modalContainer.innerHTML = `
            <div class="modal-overlay active">
                <div class="modal">
                    <div class="modal-header">
                        <h3><i class="fas fa-running"></i> 添加运动记录</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="exerciseForm">
                            <div class="form-group">
                                <label for="exerciseType"><i class="fas fa-dumbbell"></i> 运动类型 *</label>
                                <select id="exerciseType" class="form-control" required>
                                    <option value="">请选择运动类型</option>
                                    ${exerciseOptions}
                                    <option value="__custom__">✏️ 其他（手动输入）</option>
                                </select>
                                <input type="text" id="exerciseCustomType" class="form-control" placeholder="请输入运动类型" style="display:none; margin-top:6px;">
                            </div>

                            <div class="form-group">
                                <label for="exerciseDuration"><i class="fas fa-hourglass-end"></i> 运动时长 (分钟) *</label>
                                <input type="number" id="exerciseDuration" class="form-control" required
                                       min="1" max="600" placeholder="例如：30" value="30">
                            </div>

                            <!-- 热量预估 -->
                            <div class="exercise-calorie-preview" id="exerciseCaloriePreview">
                                <h4><i class="fas fa-fire"></i> 预估热量消耗</h4>
                                <div class="calorie-display">
                                    <span class="calorie-number" id="previewCalories">0</span>
                                    <span class="calorie-unit">kcal</span>
                                </div>
                                <small class="calorie-note">* 按70kg体重估算，实际消耗因体重和强度而异</small>
                            </div>

                            <div class="form-group">
                                <label for="exerciseNotes"><i class="fas fa-sticky-note"></i> 备注（可选）</label>
                                <textarea id="exerciseNotes" class="form-control" rows="2" placeholder="例如：运动强度、感觉等"></textarea>
                            </div>

                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" id="cancelExerciseBtn">取消</button>
                                <button type="submit" class="btn btn-primary">保存记录</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        // 绑定事件
        const modalOverlay = modalContainer.querySelector('.modal-overlay');
        const closeBtn = modalContainer.querySelector('.modal-close');
        const cancelBtn = modalContainer.querySelector('#cancelExerciseBtn');
        const form = modalContainer.querySelector('#exerciseForm');
        const typeSelect = modalContainer.querySelector('#exerciseType');
        const customInput = modalContainer.querySelector('#exerciseCustomType');
        const durationInput = modalContainer.querySelector('#exerciseDuration');
        const calorieDisplay = modalContainer.querySelector('#previewCalories');
        const notesInput = modalContainer.querySelector('#exerciseNotes');

        const closeModal = () => {
            modalContainer.innerHTML = '';
        };

        // 更新热量预览（必须在使用前定义）
        const updateCaloriePreview = () => {
            const selectVal = typeSelect.value;
            const customVal = customInput.value.trim();
            const exerciseName = selectVal === '__custom__' ? customVal : selectVal;
            const duration = parseInt(durationInput.value) || 0;

            if (exerciseName && duration > 0 && typeof calculateExerciseCalories === 'function') {
                const calories = calculateExerciseCalories(exerciseName, duration);
                calorieDisplay.textContent = calories;
            } else {
                calorieDisplay.textContent = '0';
            }
        };

        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeModal();
        });
        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);

        // 选择"其他"时显示输入框
        typeSelect.addEventListener('change', () => {
            if (typeSelect.value === '__custom__') {
                customInput.style.display = 'block';
                customInput.focus();
            } else {
                customInput.style.display = 'none';
                customInput.value = '';
            }
            updateCaloriePreview();
        });
        customInput.addEventListener('input', updateCaloriePreview);
        durationInput.addEventListener('input', updateCaloriePreview);

        // 表单提交
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const selectVal = typeSelect.value;
            const customVal = customInput.value.trim();
            const exType = selectVal === '__custom__' ? customVal : selectVal;
            const duration = parseInt(durationInput.value);
            const notes = notesInput ? notesInput.value.trim() : '';

            if (!exType) {
                alert('请选择或输入运动类型！');
                return;
            }
            if (!duration || duration < 1) {
                alert('请输入有效的运动时长！');
                return;
            }

            const caloriesBurned = typeof calculateExerciseCalories === 'function'
                ? calculateExerciseCalories(exType, duration)
                : Math.round(duration * 7);

            const exercises = this.getExercises();
            const newExercise = {
                id: Date.now().toString(),
                memberId: this.currentMemberId,
                type: exType,
                duration: duration,
                exerciseDate: new Date().toISOString().split('T')[0],
                time: new Date().toTimeString().slice(0, 5),
                caloriesBurned: caloriesBurned,
                notes: notes,
                createdAt: new Date().toISOString()
            };

            exercises.push(newExercise);
            this.saveExercises(exercises);
            this.loadExercises();
            this.updateStats();

            // 🔥 关键：立即同步到云端
            this.syncExerciseToCloud(newExercise);

            closeModal();
        });
    }

    // 同步运动记录到云端
    async syncExerciseToCloud(exercise) {
        if (typeof supabaseClient === 'undefined' || !supabaseClient.isConnected) {
            console.log('云同步未启用，跳过同步');
            return;
        }

        try {
            const cloudRecord = {
                id: exercise.id,
                member_id: exercise.memberId,
                type: exercise.type,
                duration: exercise.duration,
                exercise_date: exercise.exerciseDate,
                time: exercise.time,
                calories_burned: exercise.caloriesBurned,
                notes: exercise.notes,
                created_at: exercise.createdAt,
                updated_at: new Date().toISOString()
            };

            await supabaseClient.pushToCloud('exercise_records', cloudRecord, exercise.id);
            console.log('✅ 运动记录已同步到云端');
        } catch (error) {
            console.error('❌ 运动记录同步失败:', error);
        }
    }

    // 删除运动记录
    deleteExercise(exerciseId) {
        if (!confirm('确定要删除这条运动记录吗？')) {
            return;
        }

        let exercises = this.getExercises();
        exercises = exercises.filter(exercise => exercise.id !== exerciseId);
        this.saveExercises(exercises);
        this.loadExercises();
        this.updateStats();

        // 🔥 关键：同步删除到云端
        this.deleteExerciseFromCloud(exerciseId);
    }

    // 从云端删除运动记录
    async deleteExerciseFromCloud(exerciseId) {
        if (typeof supabaseClient === 'undefined' || !supabaseClient.isConnected) {
            console.log('云同步未启用，跳过删除');
            return;
        }

        try {
            await supabaseClient.deleteFromCloud('exercise_records', exerciseId);
            console.log('✅ 运动记录已从云端删除');
        } catch (error) {
            console.error('❌ 运动记录删除失败:', error);
        }
    }

    // 统计相关方法
    // ====================

    // 更新统计信息
    updateStats() {
        const members = this.getMembers();
        const healthRecords = this.getHealthRecords();
        const dietRecords = this.getDietRecords();
        const exercises = this.getExercises();

        document.getElementById('memberCount').textContent = members.length;
        document.getElementById('healthRecordCount').textContent = healthRecords.length;
        document.getElementById('dietCount').textContent = dietRecords.length;
        document.getElementById('exerciseCount').textContent = exercises.length;
    }

    // 添加CSS动画
    addCSSAnimations() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
            
            .mt-2 { margin-top: 0.5rem; }
        `;
        document.head.appendChild(style);
    }

    // ==================== 云同步方法 ====================

    // 显示云同步设置模态框
    showCloudSyncModal() {
        const modal = document.getElementById('cloudSyncModal');
        if (!modal) {
            alert('云同步模态框未找到');
            return;
        }

        // 显示模态框
        modal.style.display = 'flex';

        // 加载已保存的配置并填入输入框
        const savedConfig = JSON.parse(localStorage.getItem('supabase_config') || '{}');
        const urlInput = document.getElementById('supabaseUrlInput');
        const keyInput = document.getElementById('supabaseKeyInput');

        if (urlInput && savedConfig.url) {
            urlInput.value = savedConfig.url;
        }

        if (keyInput && savedConfig.key) {
            keyInput.value = savedConfig.key;
        }

        // 绑定按钮事件
        const testBtn = document.getElementById('testConnectionBtn');
        const saveBtn = document.getElementById('saveCloudConfigBtn');
        const disableBtn = document.getElementById('disableCloudSyncBtn');
        const closeBtn = modal.querySelector('.close-btn');

        if (testBtn) {
            testBtn.onclick = () => this.testCloudConnection();
        }

        if (saveBtn) {
            saveBtn.onclick = () => this.saveCloudConfig();
        }

        if (disableBtn) {
            disableBtn.onclick = () => this.disableCloudSync();
        }

        if (closeBtn) {
            closeBtn.onclick = () => {
                modal.style.display = 'none';
            };
        }

        // 点击模态框外部关闭
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        };
    }

    // 测试云连接
    async testCloudConnection() {
        const urlInput = document.getElementById('supabaseUrlInput');
        const keyInput = document.getElementById('supabaseKeyInput');
        const url = urlInput?.value.trim();
        const key = keyInput?.value.trim();

        if (!url || !key) {
            alert('请输入 URL 和 API Key');
            return;
        }

        if (typeof supabaseClient === 'undefined') {
            alert('Supabase 客户端未加载');
            return;
        }

        try {
            // 临时配置并测试
            supabaseClient.saveConfig(url, key);
            supabaseClient.supabase = null;
            supabaseClient.initialize();

            // 等待初始化
            await new Promise(resolve => setTimeout(resolve, 1000));

            if (supabaseClient.isConnected) {
                alert('✅ 连接成功！');
                this.updateCloudSyncUI(true);
            } else {
                alert('❌ 连接失败，请检查 URL 和 Key');
                this.updateCloudSyncUI(false);
            }
        } catch (error) {
            alert(`❌ 连接失败: ${error.message}`);
            this.updateCloudSyncUI(false);
        }
    }

    // 保存云配置
    async saveCloudConfig() {
        const urlInput = document.getElementById('supabaseUrlInput');
        const keyInput = document.getElementById('supabaseKeyInput');
        const url = urlInput?.value.trim();
        const key = keyInput?.value.trim();

        // 获取已保存的配置
        const savedConfig = JSON.parse(localStorage.getItem('supabase_config') || '{}');

        // 如果 URL 为空，使用已保存的 URL
        const finalUrl = url || savedConfig.url;
        // 如果 Key 为空，使用已保存的 Key
        const finalKey = key || savedConfig.key;

        // 检查是否有完整的配置
        if (!finalUrl || !finalKey) {
            alert('请输入 URL 和 API Key');
            return;
        }

        if (typeof supabaseClient === 'undefined') {
            alert('Supabase 客户端未加载');
            return;
        }

        try {
            const result = await supabaseClient.enableSync(finalUrl, finalKey);
            
            if (result.success) {
                alert('✅ 云同步已启用！开始同步数据...');
                this.updateCloudSyncUI(true);
                
                // 开始同步
                this.syncWithCloud();
            } else {
                alert(`❌ ${result.message}`);
                this.updateCloudSyncUI(false);
            }
        } catch (error) {
            alert(`❌ 启用失败: ${error.message}`);
            this.updateCloudSyncUI(false);
        }
    }

    // 禁用云同步
    disableCloudSync() {
        if (!confirm('确定要禁用云同步吗？本地数据不会删除。')) {
            return;
        }

        if (typeof supabaseClient !== 'undefined') {
            supabaseClient.disableSync();
        }

        alert('✅ 云同步已禁用');
        this.updateCloudSyncUI(false);

        // 关闭模态框
        const modal = document.getElementById('cloudSyncModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // 更新云同步 UI
    updateCloudSyncUI(isConnected) {
        const indicator = document.querySelector('#cloudSyncModal .status-indicator');
        const statusText = document.querySelector('#cloudSyncModal .status-text');
        const disableBtn = document.getElementById('disableCloudSyncBtn');

        if (indicator) {
            indicator.className = 'status-indicator';
            if (isConnected) {
                indicator.classList.add('connected');
                indicator.style.background = '#4CAF50';
            } else {
                indicator.style.background = '#999';
            }
        }

        if (statusText) {
            statusText.textContent = isConnected ? '已连接到云同步' : '未连接';
        }

        if (disableBtn) {
            disableBtn.style.display = isConnected ? 'block' : 'none';
        }
    }

    // 与云端同步数据
    async syncWithCloud() {
        if (typeof supabaseClient === 'undefined' || !supabaseClient.isConnected) {
            return;
        }

        console.log('开始与云端同步数据...');

        try {
            // 1. 同步家庭成员
            await this.syncFamilyMembers();
            
            // 2. 同步健康记录
            await this.syncHealthRecords();
            
            // 3. 同步饮食记录
            await this.syncDietRecords();
            
            // 4. 同步运动记录
            await this.syncExerciseRecords();

            console.log('云同步完成');
        } catch (error) {
            console.error('云同步失败:', error);
        }
    }

    // 显示清空数据确认模态框
    showClearDataModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        
        const content = document.createElement('div');
        content.className = 'modal';
        content.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">⚠️ 清空所有数据</h3>
                    <button class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                        <p style="color: #856404; margin: 0; font-weight: 500;">
                            ⚠️ 警告：此操作不可撤销！
                        </p>
                    </div>
                    <p style="color: #555; line-height: 1.6; margin-bottom: 16px;">
                        你即将删除以下所有数据：
                    </p>
                    <ul style="color: #666; margin-bottom: 16px; padding-left: 20px;">
                        <li>所有家庭成员信息</li>
                        <li>所有健康记录</li>
                        <li>所有饮食记录</li>
                        <li>所有运动记录</li>
                        <li>所有用药提醒</li>
                    </ul>
                    <p style="color: #d32f2f; font-weight: 500; margin-bottom: 16px;">
                        本地和云端的数据都会被删除！
                    </p>
                    <div class="form-group">
                        <label style="color: #555; font-weight: 500;">
                            <input type="checkbox" id="confirmDelete" style="margin-right: 8px;">
                            我已确认，要删除所有数据
                        </label>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary close-modal">取消</button>
                    <button type="button" class="btn btn-danger" id="confirmClearBtn" disabled>
                        确认删除所有数据
                    </button>
                </div>
            </div>
        `;

        modal.appendChild(content);
        document.body.appendChild(modal);

        const closeBtn = content.querySelector('.close-btn');
        const closeModalBtn = content.querySelector('.close-modal');
        const confirmCheckbox = content.querySelector('#confirmDelete');
        const confirmBtn = content.querySelector('#confirmClearBtn');

        const closeModal = () => {
            modal.remove();
        };

        closeBtn.addEventListener('click', closeModal);
        closeModalBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // 只有勾选了确认框才能点击删除按钮
        confirmCheckbox.addEventListener('change', (e) => {
            confirmBtn.disabled = !e.target.checked;
        });

        confirmBtn.addEventListener('click', async () => {
            await this.clearAllData();
            closeModal();
        });
    }

    // 清空所有数据
    async clearAllData() {
        try {
            console.log('🗑️ 开始清空所有数据...');

            // 清空本地数据
            localStorage.removeItem('members');
            localStorage.removeItem('health_records');
            localStorage.removeItem('diet_records');
            localStorage.removeItem('exercises');
            localStorage.removeItem('medications');

            console.log('✅ 本地数据已清空');

            // 清空云端数据
            if (typeof supabaseClient !== 'undefined' && supabaseClient.isConnected) {
                await this.clearCloudData();
            }

            // 重置应用状态
            this.currentMemberId = null;
            this.loadMembers();
            this.loadHealthRecords();
            this.loadDietRecords();
            this.loadExercises();
            this.loadMedications();
            this.updateStats();

            alert('✅ 所有数据已成功清空！');
            console.log('✅ 所有数据清空完成');
        } catch (error) {
            console.error('❌ 清空数据失败:', error);
            alert('❌ 清空数据失败，请重试');
        }
    }

    // 清空云端数据
    async clearCloudData() {
        if (typeof supabaseClient === 'undefined' || !supabaseClient.isConnected) {
            return;
        }

        try {
            console.log('🗑️ 开始清空云端数据...');

            // 删除所有表中的数据
            const tables = ['family_members', 'health_records', 'diet_records', 'exercise_records', 'medications'];

            for (const table of tables) {
                try {
                    const { error } = await supabaseClient.supabase
                        .from(table)
                        .delete()
                        .neq('id', ''); // 删除所有行

                    if (error) {
                        console.warn(`⚠️ 删除${table}失败:`, error);
                    } else {
                        console.log(`✅ ${table}已清空`);
                    }
                } catch (err) {
                    console.warn(`⚠️ 删除${table}异常:`, err);
                }
            }

            console.log('✅ 云端数据已清空');
        } catch (error) {
            console.error('❌ 清空云端数据失败:', error);
        }
    }

    // 同步家庭成员
    async syncFamilyMembers() {
        const members = this.getMembers();
        
        // 上传本地新增的成员（只上传本地有但云端没有的）
        for (const member of members) {
            // 检查是否是有效的 UUID
            if (!this.isValidUUID(member.id)) continue;
            
            const cloudRecord = {
                id: member.id,
                name: member.name,
                gender: member.gender,
                birth_date: member.birthDate,
                notes: member.notes,
                created_at: member.createdAt,
                updated_at: new Date().toISOString()
            };

            const result = await supabaseClient.pushToCloud('family_members', cloudRecord, member.id);
            if (result.success) {
                console.log(`家庭成员 ${member.name} 已同步到云端`);
            }
        }

        // 从云端拉取最新数据
        const cloudData = await supabaseClient.pullFromCloud('family_members');
        if (cloudData.data && cloudData.data.length > 0) {
            // 只拉取，不合并（避免循环）
            // 如果本地没有数据，才从云端下载
            if (members.length === 0) {
                const localMembers = cloudData.data.map(m => ({
                    id: m.id,
                    name: m.name,
                    gender: m.gender,
                    birthDate: m.birth_date,
                    notes: m.notes,
                    createdAt: m.created_at
                }));
                this.saveMembers(localMembers);
                this.loadMembers();
                console.log(`从云端下载了 ${localMembers.length} 个家庭成员`);
            }
        }
    }
    
    // 检查是否是有效的 UUID
    isValidUUID(uuid) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }
    
    // 清理云端重复数据（保留最新的）
    async cleanupDuplicateRecords() {
        console.log('🔧 开始清理重复数据...');
        
        // 获取云端所有家庭成员
        const cloudData = await supabaseClient.pullFromCloud('family_members');
        if (!cloudData.data || cloudData.data.length === 0) return;
        
        // 按 name 分组，保留最新的
        const nameGroups = {};
        for (const member of cloudData.data) {
            if (!nameGroups[member.name]) {
                nameGroups[member.name] = [];
            }
            nameGroups[member.name].push(member);
        }
        
        // 删除重复的（保留 updated_at 最新的）
        let deletedCount = 0;
        for (const name in nameGroups) {
            const group = nameGroups[name];
            if (group.length > 1) {
                // 按 updated_at 排序
                group.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
                // 删除除了第一个以外的所有记录
                for (let i = 1; i < group.length; i++) {
                    await supabaseClient.deleteFromCloud('family_members', group[i].id);
                    deletedCount++;
                }
            }
        }
        
        console.log(`✅ 清理完成，删除了 ${deletedCount} 条重复记录`);
    }

    // 合并家庭成员数据
    mergeFamilyMembers(cloudMembers) {
        const localMembers = this.getMembers();
        const merged = [...localMembers];

        for (const cloudMember of cloudMembers) {
            const existingIndex = merged.findIndex(m => m.id === cloudMember.id);
            if (existingIndex === -1) {
                // 新成员，添加到本地
                merged.push(cloudMember);
            } else {
                // 更新现有成员
                merged[existingIndex] = cloudMember;
            }
        }

        this.saveMembers(merged);
        this.loadMembers();
    }

    // 同步健康记录
    async syncHealthRecords() {
        const records = this.getHealthRecords();
        
        for (const record of records) {
            const cloudRecord = {
                id: record.id,
                member_id: record.memberId,
                type: record.type,
                value: record.value,
                secondary_value: record.systolic || record.diastolic || null,
                recorded_at: record.recordedAt ? record.recordedAt.split('T')[0] : new Date().toISOString().split('T')[0],
                notes: record.notes,
                created_at: record.createdAt,
                updated_at: new Date().toISOString()
            };

            await supabaseClient.pushToCloud('health_records', cloudRecord, record.id);
        }

        // 从云端拉取最新数据
        const cloudData = await supabaseClient.pullFromCloud('health_records');
        if (cloudData.data) {
            const localRecords = cloudData.data.map(r => ({
                id: r.id,
                memberId: r.member_id,
                type: r.type,
                value: r.value,
                systolic: r.secondary_value,
                diastolic: r.secondary_value,
                recordedAt: r.recorded_at,
                notes: r.notes,
                createdAt: r.created_at
            }));

            this.mergeHealthRecords(localRecords);
        }
    }

    // 合并健康记录
    mergeHealthRecords(cloudRecords) {
        const localRecords = this.getHealthRecords();
        const merged = [...localRecords];

        for (const cloudRecord of cloudRecords) {
            const existingIndex = merged.findIndex(r => r.id === cloudRecord.id);
            if (existingIndex === -1) {
                merged.push(cloudRecord);
            } else {
                merged[existingIndex] = cloudRecord;
            }
        }

        this.saveHealthRecords(merged);
        this.loadHealthRecords();
    }

    // 同步饮食记录
    async syncDietRecords() {
        const records = this.getDietRecords();
        
        for (const record of records) {
            const cloudRecord = {
                id: record.id,
                member_id: record.memberId,
                meal_type: record.mealType,
                date: record.date,
                food_name: record.foodName,
                quantity: record.quantity,
                unit: record.unit,
                calories: record.nutrition?.calories,
                protein: record.nutrition?.protein,
                fat: record.nutrition?.fat,
                carbs: record.nutrition?.carbs,
                fiber: record.nutrition?.fiber,
                created_at: record.createdAt,
                updated_at: new Date().toISOString()
            };

            await supabaseClient.pushToCloud('diet_records', cloudRecord, record.id);
        }

        // 从云端拉取最新数据
        const cloudData = await supabaseClient.pullFromCloud('diet_records');
        if (cloudData.data) {
            const localRecords = cloudData.data.map(r => ({
                id: r.id,
                memberId: r.member_id,
                mealType: r.meal_type,
                date: r.date,
                foodName: r.food_name,
                quantity: r.quantity,
                unit: r.unit,
                nutrition: {
                    calories: r.calories,
                    protein: r.protein,
                    fat: r.fat,
                    carbs: r.carbs,
                    fiber: r.fiber
                },
                createdAt: r.created_at
            }));

            this.mergeDietRecords(localRecords);
        }
    }

    // 合并饮食记录
    mergeDietRecords(cloudRecords) {
        const localRecords = this.getDietRecords();
        const merged = [...localRecords];

        for (const cloudRecord of cloudRecords) {
            const existingIndex = merged.findIndex(r => r.id === cloudRecord.id);
            if (existingIndex === -1) {
                merged.push(cloudRecord);
            } else {
                merged[existingIndex] = cloudRecord;
            }
        }

        this.saveDietRecords(merged);
        this.loadDietRecords();
    }

    // 同步运动记录
    async syncExerciseRecords() {
        const records = this.getExercises();
        
        for (const record of records) {
            const cloudRecord = {
                id: record.id,
                member_id: record.memberId,
                exercise_type: record.type,
                duration_minutes: record.duration,
                calories_burned: record.caloriesBurned,
                recorded_at: record.exerciseDate,
                notes: record.notes,
                created_at: record.createdAt,
                updated_at: new Date().toISOString()
            };

            await supabaseClient.pushToCloud('exercise_records', cloudRecord, record.id);
        }

        // 从云端拉取最新数据
        const cloudData = await supabaseClient.pullFromCloud('exercise_records');
        if (cloudData.data) {
            const localRecords = cloudData.data.map(r => ({
                id: r.id,
                memberId: r.member_id,
                type: r.exercise_type,
                duration: r.duration_minutes,
                caloriesBurned: r.calories_burned,
                exerciseDate: r.recorded_at,
                notes: r.notes,
                createdAt: r.created_at
            }));

            this.mergeExerciseRecords(localRecords);
        }
    }

    // 合并运动记录
    mergeExerciseRecords(cloudRecords) {
        const localRecords = this.getExercises();
        const merged = [...localRecords];

        for (const cloudRecord of cloudRecords) {
            const existingIndex = merged.findIndex(r => r.id === cloudRecord.id);
            if (existingIndex === -1) {
                merged.push(cloudRecord);
            } else {
                merged[existingIndex] = cloudRecord;
            }
        }

        this.saveExercises(merged);
        this.loadExercises();
    }
    
    // 切换云同步开关
    toggleCloudSync() {
        console.log('=== toggleCloudSync 开始 ===');
        console.log('this:', this);
        console.log('window.supabaseClient:', window.supabaseClient);
        
        const supabaseClient = window.supabaseClient;
        if (!supabaseClient) {
            console.error('❌ Supabase 客户端未找到');
            return;
        }
        
        // 检查是否已认证
        const isAuthenticated = supabaseClient.isAuthenticated || 
                               (supabaseClient.currentUser && supabaseClient.currentUser.id);
        
        console.log('认证状态:', isAuthenticated, 'currentUser:', supabaseClient.currentUser);
        
        if (!isAuthenticated) {
            console.error('❌ 用户未认证');
            return;
        }
        
        console.log('切换前 isOnline:', supabaseClient.isOnline);
        
        // 切换状态
        supabaseClient.isOnline = !supabaseClient.isOnline;
        
        console.log('切换后 isOnline:', supabaseClient.isOnline);
        console.log('调用 updateButtonStyle...');
        
        // 直接更新按钮，不依赖 this 上下文
        this.updateButtonStyle();
        
        console.log('=== toggleCloudSync 结束 ===');
    }
    
    // 直接更新按钮样式
    updateButtonStyle() {
        console.log('=== updateButtonStyle 开始 ===');
        
        const toggleBtn = document.getElementById('cloudSyncToggle');
        const supabaseClient = window.supabaseClient;
        
        console.log('按钮元素:', toggleBtn);
        console.log('Supabase 客户端:', supabaseClient);
        console.log('当前 isOnline:', supabaseClient?.isOnline);
        
        if (!toggleBtn) {
            console.error('❌ 按钮元素未找到');
            return;
        }
        
        if (!supabaseClient) {
            console.error('❌ Supabase 客户端未找到');
            return;
        }
        
        // 移除所有样式
        toggleBtn.classList.remove('cloud-sync-on', 'cloud-sync-off');
        console.log('移除样式后的 class:', toggleBtn.className);
        
        if (supabaseClient.isOnline) {
            toggleBtn.classList.add('cloud-sync-on');
            toggleBtn.title = '云同步已开启（点击关闭）';
            console.log('✅ 按钮设置为绿色（开启）');
        } else {
            toggleBtn.classList.add('cloud-sync-off');
            toggleBtn.title = '云同步已关闭（点击开启）';
            console.log('🔴 按钮设置为红色（关闭）');
        }
        
        console.log('最终 class:', toggleBtn.className);
        console.log('=== updateButtonStyle 结束 ===');
    }
    
    // 更新云同步开关显示
    updateCloudSyncToggle() {
        console.log('updateCloudSyncToggle 被调用');
        
        const toggleBtn = document.getElementById('cloudSyncToggle');
        if (!toggleBtn) {
            console.error('云同步开关按钮未找到');
            return;
        }
        
        // 重置所有样式
        toggleBtn.classList.remove('cloud-sync-on', 'cloud-sync-off', 'cloud-sync-disabled');
        
        // 检查 Supabase 客户端状态
        const supabaseClient = window.supabaseClient;
        if (!supabaseClient) {
            console.error('Supabase 客户端未找到');
            toggleBtn.classList.add('cloud-sync-disabled');
            toggleBtn.title = 'Supabase 未初始化';
            return;
        }
        
        // 检查是否已认证
        const isAuthenticated = supabaseClient.isAuthenticated || 
                               (supabaseClient.currentUser && supabaseClient.currentUser.id);
        
        if (!isAuthenticated) {
            console.log('用户未认证');
            toggleBtn.classList.add('cloud-sync-disabled');
            toggleBtn.title = '未登录，无法使用云同步';
            return;
        }
        
        console.log('当前 isOnline 状态:', supabaseClient.isOnline);
        
        // 根据 isOnline 状态显示
        if (supabaseClient.isOnline) {
            console.log('设置为绿色（开启）');
            toggleBtn.classList.add('cloud-sync-on');
            toggleBtn.title = '云同步已开启（点击关闭）';
        } else {
            console.log('设置为红色（关闭）');
            toggleBtn.classList.add('cloud-sync-off');
            toggleBtn.title = '云同步已关闭（点击开启）';
        }
        
        console.log('按钮最终样式:', toggleBtn.className);
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    const app = new FamilyHealthApp();
    app.addCSSAnimations();
    
    // 初始化云同步开关状态
    setTimeout(() => {
        if (app.updateCloudSyncToggle) {
            app.updateCloudSyncToggle();
        }
    }, 1000);
});
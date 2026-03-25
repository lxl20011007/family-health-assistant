// 家庭健康助手应用 - 主逻辑
class FamilyHealthApp {
    constructor() {
        this.currentMemberId = null;
        this.init();
    }

    // 初始化应用
    init() {
        this.bindEvents();
        this.loadMembers();
        this.updateStats();
        
        // 移除用药提醒检查
        // this.checkMedicationReminders();
        // setInterval(() => this.checkMedicationReminders(), 30000);
    }

    // 绑定事件
    bindEvents() {
        // 侧边栏导航
        document.querySelectorAll('.sidebar li').forEach(item => {
            item.addEventListener('click', (e) => {
                const tab = e.currentTarget.dataset.tab;
                this.switchTab(tab);
            });
        });

        // 添加成员按钮
        document.getElementById('addMemberBtn').addEventListener('click', () => this.showAddMemberModal());
        document.getElementById('newMemberBtn').addEventListener('click', () => this.showAddMemberModal());

        // 成员选择器
        document.getElementById('memberSelect').addEventListener('change', (e) => {
            this.currentMemberId = e.target.value;
            this.updateMemberSelect();
            this.loadHealthRecords();
            this.loadDietRecords();
            this.loadExercises();
        });

        // 添加健康记录按钮
        document.getElementById('addHealthBtn').addEventListener('click', () => this.showAddHealthModal());

        // 添加饮食记录按钮
        document.getElementById('addDietBtn').addEventListener('click', () => this.showAddDietModal());

        // 添加运动记录按钮
        document.getElementById('addExerciseBtn').addEventListener('click', () => this.showAddExerciseModal());

        // 健康记录筛选
        document.getElementById('healthFilter').addEventListener('change', () => this.loadHealthRecords());
        
        // 饮食日期筛选
        document.getElementById('dietDate').addEventListener('change', () => this.loadDietRecords());
    }

    // 切换标签页
    switchTab(tabName) {
        // 更新侧边栏激活状态
        document.querySelectorAll('.sidebar li').forEach(item => {
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

    // 渲染饮食记录列表
    renderDietList(records) {
        const listDiv = document.getElementById('dietList');
        if (!listDiv) return;
        
        listDiv.innerHTML = records.map(record => {
            const mealName = {
                breakfast: '早餐',
                lunch: '午餐',
                dinner: '晚餐',
                snack: '加餐'
            }[record.mealType];
            
            const time = record.time || '未记录时间';
            const nutrition = record.nutrition;
            
            return `
                <div class="diet-record" data-id="${record.id}">
                    <div class="diet-record-header">
                        <div class="diet-meal-info">
                            <span class="meal-badge ${record.mealType}">${mealName}</span>
                            <span class="diet-time">${time}</span>
                        </div>
                        <button class="btn-icon delete-diet" data-id="${record.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    
                    <div class="diet-food">
                        <strong>${record.foodName}</strong>
                        <span class="diet-quantity">${record.quantity}${record.unit}</span>
                    </div>
                    
                    <div class="diet-nutrition">
                        <div class="nutrient">
                            <span class="nutrient-label">热量</span>
                            <span class="nutrient-value calories">${nutrition.calories} kcal</span>
                        </div>
                        <div class="nutrient">
                            <span class="nutrient-label">碳水</span>
                            <span class="nutrient-value carbs">${nutrition.carbs} g</span>
                        </div>
                        <div class="nutrient">
                            <span class="nutrient-label">蛋白质</span>
                            <span class="nutrient-value protein">${nutrition.protein} g</span>
                        </div>
                        <div class="nutrient">
                            <span class="nutrient-label">脂肪</span>
                            <span class="nutrient-value fat">${nutrition.fat} g</span>
                        </div>
                        <div class="nutrient">
                            <span class="nutrient-label">膳食纤维</span>
                            <span class="nutrient-value fiber">${nutrition.fiber} g</span>
                        </div>
                    </div>
                    
                    ${record.notes ? `
                        <div class="diet-notes">
                            <i class="fas fa-sticky-note"></i> ${record.notes}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
        
        // 绑定删除按钮事件
        listDiv.querySelectorAll('.delete-diet').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const recordId = e.currentTarget.dataset.id;
                if (confirm('确定要删除这条饮食记录吗？')) {
                    this.deleteDietRecord(recordId);
                }
            });
        });
    }

    // 成员管理相关方法
    // ====================

    // 加载成员列表
    loadMembers() {
        const members = this.getMembers();
        const memberSelect = document.getElementById('memberSelect');
        const memberList = document.getElementById('memberList');

        // 清空选择器和列表
        memberSelect.innerHTML = '<option value="">请选择家庭成员</option>';
        memberList.innerHTML = '';

        if (members.length === 0) {
            memberList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-friends"></i>
                    <p>暂无家庭成员，请点击上方按钮添加</p>
                </div>
            `;
            return;
        }

        // 填充选择器
        members.forEach(member => {
            const option = document.createElement('option');
            option.value = member.id;
            option.textContent = `${member.name} (${member.gender === 'male' ? '男' : '女'}, ${this.calculateAge(member.birthDate)}岁)`;
            if (member.id === this.currentMemberId) {
                option.selected = true;
            }
            memberSelect.appendChild(option);
        });

        // 填充成员列表
        members.forEach(member => {
            const memberCard = this.createMemberCard(member);
            memberList.appendChild(memberCard);
        });
    }

    // 创建成员卡片
    createMemberCard(member) {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-header">
                <div class="card-title">
                    <i class="fas fa-user"></i> ${member.name}
                </div>
                <div class="card-actions">
                    <button class="btn btn-secondary btn-sm edit-member" data-id="${member.id}">
                        <i class="fas fa-edit"></i> 编辑
                    </button>
                    <button class="btn btn-danger btn-sm delete-member" data-id="${member.id}">
                        <i class="fas fa-trash"></i> 删除
                    </button>
                </div>
            </div>
            <div class="card-body">
                <p><strong>性别：</strong>${member.gender === 'male' ? '男' : '女'}</p>
                <p><strong>出生日期：</strong>${member.birthDate}</p>
                <p><strong>年龄：</strong>${this.calculateAge(member.birthDate)}岁</p>
                ${member.notes ? `<p><strong>备注：</strong>${member.notes}</p>` : ''}
            </div>
        `;

        // 绑定编辑和删除事件
        card.querySelector('.edit-member').addEventListener('click', (e) => {
            e.stopPropagation();
            this.showEditMemberModal(member.id);
        });

        card.querySelector('.delete-member').addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteMember(member.id);
        });

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
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary close-modal">取消</button>
                        <button type="submit" class="btn btn-primary">${member ? '更新' : '添加'}</button>
                    </div>
                </form>
            </div>
        `;

        document.getElementById('modalContainer').appendChild(modal);

        // 绑定事件
        const closeBtn = modal.querySelector('.close-btn');
        const closeModalBtn = modal.querySelector('.close-modal');
        const form = modal.querySelector('#memberForm');

        const closeModal = () => {
            modal.remove();
        };

        closeBtn.addEventListener('click', closeModal);
        closeModalBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveMember(memberId);
            closeModal();
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
        
        if (memberId) {
            // 更新现有成员
            const index = members.findIndex(m => m.id === memberId);
            if (index !== -1) {
                members[index] = { ...members[index], name, gender, birthDate, notes };
            }
        } else {
            // 添加新成员
            const newMember = {
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
        
        // 切换到成员管理标签页
        this.switchTab('members');
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
        
        switch (record.type) {
            case 'blood_pressure':
                valueDisplay = `${record.systolic}/${record.diastolic} mmHg`;
                typeClass = 'blood-pressure';
                break;
            case 'blood_sugar':
                valueDisplay = `${record.value} mmol/L`;
                typeClass = 'blood-sugar';
                break;
            case 'heart_rate':
                valueDisplay = `${record.value} 次/分`;
                typeClass = 'heart-rate';
                break;
        }

        const typeText = {
            blood_pressure: '血压',
            blood_sugar: '血糖',
            heart_rate: '心率'
        }[record.type];

        card.innerHTML = `
            <div class="card-header">
                <div class="card-title">
                    <i class="fas fa-heart"></i> ${typeText}记录
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

    // 显示添加健康记录模态框
    showAddHealthModal() {
        if (!this.currentMemberId) {
            alert('请先选择家庭成员！');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">添加健康记录</h3>
                    <button class="close-btn">&times;</button>
                </div>
                <form id="healthForm">
                    <div class="form-group">
                        <label for="healthType">记录类型 *</label>
                        <select id="healthType" class="form-control" required>
                            <option value="">请选择</option>
                            <option value="blood_pressure">血压</option>
                            <option value="blood_sugar">血糖</option>
                            <option value="heart_rate">心率</option>
                        </select>
                    </div>
                    
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
                    
                    <div id="otherHealthFields" class="form-group" style="display: none;">
                        <label for="healthValue">数值 *</label>
                        <input type="number" id="healthValue" class="form-control" step="0.1">
                    </div>
                    
                    <div class="form-group">
                        <label for="healthNotes">备注</label>
                        <textarea id="healthNotes" class="form-control" rows="3"></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="recordedAt">记录时间</label>
                        <input type="datetime-local" id="recordedAt" class="form-control" 
                               value="${new Date().toISOString().slice(0, 16)}">
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary close-modal">取消</button>
                        <button type="submit" class="btn btn-primary">添加记录</button>
                    </div>
                </form>
            </div>
        `;

        document.getElementById('modalContainer').appendChild(modal);

        // 绑定事件
        const closeBtn = modal.querySelector('.close-btn');
        const closeModalBtn = modal.querySelector('.close-modal');
        const form = modal.querySelector('#healthForm');
        const healthTypeSelect = modal.querySelector('#healthType');

        const closeModal = () => {
            modal.remove();
        };

        closeBtn.addEventListener('click', closeModal);
        closeModalBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // 根据类型显示不同的输入字段
        healthTypeSelect.addEventListener('change', (e) => {
            const type = e.target.value;
            const bpFields = modal.querySelector('#bloodPressureFields');
            const otherFields = modal.querySelector('#otherHealthFields');
            
            bpFields.style.display = type === 'blood_pressure' ? 'flex' : 'none';
            otherFields.style.display = type !== 'blood_pressure' ? 'block' : 'none';
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveHealthRecord();
            closeModal();
        });
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
        } else {
            value = parseFloat(document.getElementById('healthValue').value);
            
            if (!value) {
                alert('请输入有效的数值！');
                return;
            }
            
            if (type === 'blood_sugar' && (value < 1 || value > 30)) {
                alert('血糖值应在1-30 mmol/L之间！');
                return;
            }
            
            if (type === 'heart_rate' && (value < 30 || value > 200)) {
                alert('心率值应在30-200次/分之间！');
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
    }

    // 切换用药提醒状态
    toggleMedication(medicationId) {
        const medications = this.getMedications();
        const index = medications.findIndex(med => med.id === medicationId);
        
        if (index !== -1) {
            medications[index].active = !medications[index].active;
            this.saveMedications(medications);
            this.loadMedications();
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

    // 加载运动记录
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

        const exercises = this.getExercises(this.currentMemberId);
        const exerciseList = document.getElementById('exerciseList');
        exerciseList.innerHTML = '';

        if (exercises.length === 0) {
            exerciseList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-dumbbell"></i>
                    <p>暂无运动记录，点击上方按钮添加</p>
                </div>
            `;
            return;
        }

        // 按日期倒序排序
        exercises.sort((a, b) => new Date(b.exerciseDate) - new Date(a.exerciseDate));

        exercises.forEach(exercise => {
            const exerciseCard = this.createExerciseCard(exercise);
            exerciseList.appendChild(exerciseCard);
        });
    }

    // 创建运动记录卡片
    createExerciseCard(exercise) {
        const card = document.createElement('div');
        card.className = 'card exercise-item';
        
        const duration = exercise.duration >= 60 
            ? `${Math.floor(exercise.duration / 60)}小时${exercise.duration % 60}分钟`
            : `${exercise.duration}分钟`;

        card.innerHTML = `
            <div class="card-header">
                <div class="card-title">
                    <i class="fas fa-running"></i> ${exercise.type}
                </div>
                <div class="card-actions">
                    <button class="btn btn-danger btn-sm delete-exercise" data-id="${exercise.id}">
                        <i class="fas fa-trash"></i> 删除
                    </button>
                </div>
            </div>
            <div class="card-body">
                <div class="duration">${duration}</div>
                ${exercise.notes ? `<p class="mt-2">备注：${exercise.notes}</p>` : ''}
            </div>
            <div class="card-footer">
                <span>运动日期：${new Date(exercise.exerciseDate).toLocaleDateString()}</span>
            </div>
        `;

        card.querySelector('.delete-exercise').addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteExercise(exercise.id);
        });

        return card;
    }

    // 显示添加饮食记录模态框
    showAddDietModal() {
        if (!this.currentMemberId) {
            alert('请先选择家庭成员');
            return;
        }
        
        // 获取食物列表和单位列表
        const foodList = getFoodList ? getFoodList() : ['米饭', '面条', '鸡蛋', '鸡胸肉', '青菜', '苹果'];
        const unitList = getUnitList ? getUnitList() : ['g', 'ml', '个', '碗'];
        const mealTypeList = getMealTypeList ? getMealTypeList() : [
            { value: 'breakfast', label: '早餐' },
            { value: 'lunch', label: '午餐' },
            { value: 'dinner', label: '晚餐' },
            { value: 'snack', label: '加餐' }
        ];
        
        const foodOptions = foodList.map(food => `<option value="${food}">${food}</option>`).join('');
        const unitOptions = unitList.map(unit => `<option value="${unit}">${unit}</option>`).join('');
        const mealOptions = mealTypeList.map(meal => `<option value="${meal.value}">${meal.label}</option>`).join('');
        
        const modalHTML = `
            <div class="modal-overlay active">
                <div class="modal">
                    <div class="modal-header">
                        <h3><i class="fas fa-utensils"></i> 添加饮食记录</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="dietForm">
                            <div class="form-group">
                                <label for="dietMealType"><i class="fas fa-clock"></i> 餐次</label>
                                <select id="dietMealType" class="form-control" required>
                                    ${mealOptions}
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="dietTime"><i class="fas fa-clock"></i> 时间</label>
                                <input type="time" id="dietTime" class="form-control" value="${new Date().toTimeString().slice(0,5)}" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="dietFood"><i class="fas fa-apple-alt"></i> 食物名称</label>
                                <select id="dietFood" class="form-control" required>
                                    <option value="">请选择食物</option>
                                    ${foodOptions}
                                </select>
                                <small class="form-text">或输入自定义食物名称</small>
                                <input type="text" id="dietCustomFood" class="form-control mt-1" placeholder="输入自定义食物名称">
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group col-6">
                                    <label for="dietQuantity"><i class="fas fa-weight"></i> 数量</label>
                                    <input type="number" id="dietQuantity" class="form-control" value="100" min="1" step="1" required>
                                </div>
                                <div class="form-group col-6">
                                    <label for="dietUnit"><i class="fas fa-ruler"></i> 单位</label>
                                    <select id="dietUnit" class="form-control" required>
                                        ${unitOptions}
                                    </select>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="dietNotes"><i class="fas fa-sticky-note"></i> 备注（可选）</label>
                                <textarea id="dietNotes" class="form-control" rows="2" placeholder="例如：烹饪方式、特殊调料等"></textarea>
                            </div>
                            
                            <div class="nutrition-preview" id="nutritionPreview">
                                <h4><i class="fas fa-calculator"></i> 营养估算</h4>
                                <div class="preview-cards">
                                    <div class="preview-card">
                                        <div class="preview-label">热量</div>
                                        <div class="preview-value" id="previewCalories">0 kcal</div>
                                    </div>
                                    <div class="preview-card">
                                        <div class="preview-label">碳水</div>
                                        <div class="preview-value" id="previewCarbs">0 g</div>
                                    </div>
                                    <div class="preview-card">
                                        <div class="preview-label">蛋白质</div>
                                        <div class="preview-value" id="previewProtein">0 g</div>
                                    </div>
                                    <div class="preview-card">
                                        <div class="preview-label">脂肪</div>
                                        <div class="preview-value" id="previewFat">0 g</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" id="cancelDietBtn">取消</button>
                                <button type="submit" class="btn btn-primary">保存记录</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        
        const modalContainer = document.getElementById('modalContainer');
        modalContainer.innerHTML = modalHTML;
        
        // 绑定事件
        const modalOverlay = modalContainer.querySelector('.modal-overlay');
        const closeBtn = modalContainer.querySelector('.modal-close');
        const cancelBtn = modalContainer.querySelector('#cancelDietBtn');
        const dietForm = modalContainer.querySelector('#dietForm');
        const foodSelect = modalContainer.querySelector('#dietFood');
        const customFoodInput = modalContainer.querySelector('#dietCustomFood');
        const quantityInput = modalContainer.querySelector('#dietQuantity');
        const unitSelect = modalContainer.querySelector('#dietUnit');
        
        // 关闭模态框
        const closeModal = () => {
            modalContainer.innerHTML = '';
        };
        
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeModal();
        });
        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        
        // 更新营养预览
        const updateNutritionPreview = () => {
            const foodName = foodSelect.value || customFoodInput.value;
            const quantity = parseFloat(quantityInput.value) || 100;
            const unit = unitSelect.value;
            
            if (foodName && quantity > 0) {
                const nutrition = calculateNutrition ? calculateNutrition(foodName, quantity, unit) : {
                    calories: Math.round(quantity * 1.25),
                    carbs: Math.round(quantity * 0.15),
                    protein: Math.round(quantity * 0.05),
                    fat: Math.round(quantity * 0.05),
                    fiber: Math.round(quantity * 0.02)
                };
                
                document.getElementById('previewCalories').textContent = `${nutrition.calories} kcal`;
                document.getElementById('previewCarbs').textContent = `${nutrition.carbs} g`;
                document.getElementById('previewProtein').textContent = `${nutrition.protein} g`;
                document.getElementById('previewFat').textContent = `${nutrition.fat} g`;
            }
        };
        
        // 监听输入变化
        foodSelect.addEventListener('change', updateNutritionPreview);
        customFoodInput.addEventListener('input', updateNutritionPreview);
        quantityInput.addEventListener('input', updateNutritionPreview);
        unitSelect.addEventListener('change', updateNutritionPreview);
        
        // 初始更新
        updateNutritionPreview();
        
        // 表单提交
        dietForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const foodName = foodSelect.value || customFoodInput.value;
            if (!foodName.trim()) {
                alert('请输入食物名称');
                return;
            }
            
            const quantity = parseFloat(quantityInput.value);
            if (!quantity || quantity <= 0) {
                alert('请输入有效的数量');
                return;
            }
            
            const unit = unitSelect.value;
            const mealType = document.getElementById('dietMealType').value;
            const time = document.getElementById('dietTime').value;
            const notes = document.getElementById('dietNotes').value;
            const date = new Date().toISOString().split('T')[0];
            
            // 计算营养成分
            const nutrition = calculateNutrition ? calculateNutrition(foodName, quantity, unit) : {
                calories: Math.round(quantity * 1.25),
                carbs: Math.round(quantity * 0.15),
                protein: Math.round(quantity * 0.05),
                fat: Math.round(quantity * 0.05),
                fiber: Math.round(quantity * 0.02)
            };
            
            // 创建记录
            const record = {
                memberId: this.currentMemberId,
                foodName: foodName,
                quantity: quantity,
                unit: unit,
                mealType: mealType,
                time: time,
                date: date,
                nutrition: nutrition,
                notes: notes
            };
            
            // 保存记录
            this.addDietRecord(record);
            
            // 关闭模态框
            closeModal();
            
            // 显示成功消息
            alert('饮食记录已保存！');
        });
    }

    // 显示添加运动记录模态框
    showAddExerciseModal() {
        if (!this.currentMemberId) {
            alert('请先选择家庭成员！');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">添加运动记录</h3>
                    <button class="close-btn">&times;</button>
                </div>
                <form id="exerciseForm">
                    <div class="form-group">
                        <label for="exerciseType">运动类型 *</label>
                        <input type="text" id="exerciseType" class="form-control" required 
                               placeholder="例如：跑步、游泳、健身等">
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="exerciseDuration">运动时长 (分钟) *</label>
                            <input type="number" id="exerciseDuration" class="form-control" required 
                                   min="1" max="600" placeholder="例如：30">
                        </div>
                        <div class="form-group">
                            <label for="exerciseDate">运动日期 *</label>
                            <input type="date" id="exerciseDate" class="form-control" required
                                   value="${new Date().toISOString().slice(0, 10)}">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="exerciseNotes">备注</label>
                        <textarea id="exerciseNotes" class="form-control" rows="3"></textarea>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary close-modal">取消</button>
                        <button type="submit" class="btn btn-primary">添加记录</button>
                    </div>
                </form>
            </div>
        `;

        document.getElementById('modalContainer').appendChild(modal);

        // 绑定事件
        const closeBtn = modal.querySelector('.close-btn');
        const closeModalBtn = modal.querySelector('.close-modal');
        const form = modal.querySelector('#exerciseForm');

        const closeModal = () => {
            modal.remove();
        };

        closeBtn.addEventListener('click', closeModal);
        closeModalBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveExercise();
            closeModal();
        });
    }

    // 保存运动记录
    saveExercise() {
        const type = document.getElementById('exerciseType').value.trim();
        const duration = parseInt(document.getElementById('exerciseDuration').value);
        const exerciseDate = document.getElementById('exerciseDate').value;
        const notes = document.getElementById('exerciseNotes').value.trim();

        if (!type || !duration || !exerciseDate) {
            alert('请填写所有必填项！');
            return;
        }

        if (duration < 1 || duration > 600) {
            alert('运动时长应在1-600分钟之间！');
            return;
        }

        const exercises = this.getExercises();
        const newExercise = {
            id: Date.now().toString(),
            memberId: this.currentMemberId,
            type,
            duration,
            exerciseDate,
            notes,
            createdAt: new Date().toISOString()
        };

        exercises.push(newExercise);
        this.saveExercises(exercises);
        this.loadExercises();
        this.updateStats();
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
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    const app = new FamilyHealthApp();
    app.addCSSAnimations();
});
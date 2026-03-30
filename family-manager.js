/**
 * 家庭组管理模块
 * 处理家庭创建、加入、成员管理等功能
 */

class FamilyManager {
    constructor(app) {
        this.app = app;
        this.supabase = window.supabaseClient || window.supabaseManager;
        this.currentFamily = null;
        
        // 延迟绑定事件，确保 DOM 已加载
        setTimeout(() => this.bindEvents(), 100);
    }

    // 绑定事件
    bindEvents() {
        // 家庭按钮
        const familyBtn = document.getElementById('familyBtn');
        if (familyBtn) {
            familyBtn.addEventListener('click', () => this.showFamilyModal());
        }

        // 创建家庭
        const createFamilyBtn = document.getElementById('createFamilyBtn');
        if (createFamilyBtn) {
            createFamilyBtn.addEventListener('click', () => this.createFamily());
        }

        // 加入家庭
        const joinFamilyBtn = document.getElementById('joinFamilyBtn');
        if (joinFamilyBtn) {
            joinFamilyBtn.addEventListener('click', () => this.joinFamily());
        }

        // 退出家庭
        const leaveFamilyBtn = document.getElementById('leaveFamilyBtn');
        if (leaveFamilyBtn) {
            leaveFamilyBtn.addEventListener('click', () => this.leaveFamily());
        }

        // 复制邀请码
        const copyInviteCodeBtn = document.getElementById('copyInviteCodeBtn');
        if (copyInviteCodeBtn) {
            copyInviteCodeBtn.addEventListener('click', () => this.copyInviteCode());
        }

        // Enter 键支持
        const familyNameInput = document.getElementById('familyNameInput');
        if (familyNameInput) {
            familyNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.createFamily();
            });
        }

        const inviteCodeInput = document.getElementById('inviteCodeInput');
        if (inviteCodeInput) {
            inviteCodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.joinFamily();
            });
        }

        console.log('FamilyManager: 事件绑定完成');
    }

    // 显示家庭模态框
    async showFamilyModal() {
        // 确保 familyManager 已初始化
        if (!window.familyManager) {
            window.familyManager = this;
        }
        
        // 检查当前用户是否有家庭
        if (this.supabase?.isUserAuthenticated()) {
            // 先检查本地存储的家庭信息
            const localFamily = localStorage.getItem('currentFamily');
            if (localFamily) {
                try {
                    this.currentFamily = JSON.parse(localFamily);
                } catch (e) {
                    localStorage.removeItem('currentFamily');
                }
            }
            
            // 如果本地没有，再从云端获取
            if (!this.currentFamily) {
                const family = await this.supabase.getCurrentFamily();
                if (family) {
                    this.currentFamily = family;
                    localStorage.setItem('currentFamily', JSON.stringify(family));
                }
            }
            
            if (this.currentFamily) {
                // 已加入家庭 → 直接跳转到成员管理页面
                this.closeFamilyModal();
                if (window.app) {
                    window.app.switchTab('members');
                }
                return;
            }
        }
        
        // 未加入家庭 → 显示创建/加入弹窗
        document.getElementById('familyModal').style.display = 'block';
        this.showNoFamilySection();
    }
    
    // 关闭家庭模态框
    closeFamilyModal() {
        const modal = document.getElementById('familyModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // 显示无家庭界面
    showNoFamilySection() {
        document.getElementById('noFamilySection').style.display = 'block';
        document.getElementById('createFamilyForm').style.display = 'none';
        document.getElementById('joinFamilyForm').style.display = 'none';
        document.getElementById('familyInfoSection').style.display = 'none';
    }

    // 显示创建家庭表单
    showCreateFamilyForm() {
        document.getElementById('noFamilySection').style.display = 'none';
        document.getElementById('createFamilyForm').style.display = 'block';
        document.getElementById('familyNameInput').value = '';
        document.getElementById('familyNameInput').focus();
    }

    // 显示加入家庭表单
    showJoinFamilyForm() {
        document.getElementById('noFamilySection').style.display = 'none';
        document.getElementById('joinFamilyForm').style.display = 'block';
        document.getElementById('inviteCodeInput').value = '';
        document.getElementById('inviteCodeInput').focus();
    }

    // 显示家庭信息
    async showFamilyInfo() {
        // 加入家庭后关闭弹窗
        this.closeFamilyModal();
        
        document.getElementById('noFamilySection').style.display = 'none';
        document.getElementById('createFamilyForm').style.display = 'none';
        document.getElementById('joinFamilyForm').style.display = 'none';
        document.getElementById('familyInfoSection').style.display = 'block';

        // 显示家庭名称和邀请码
        document.getElementById('familyNameDisplay').innerHTML = 
            `<i class="fas fa-home"></i> ${this.currentFamily.name}`;
        document.getElementById('inviteCodeDisplay').textContent = 
            this.currentFamily.invite_code;

        // 加载家庭成员列表
        await this.loadFamilyMembers();
    }

    // 加载家庭成员
    async loadFamilyMembers() {
        const result = await this.supabase.getFamilyMembers();
        const listEl = document.getElementById('familyMembersList');
        
        if (result.error || !result.data) {
            listEl.innerHTML = '<p class="error">无法加载家庭成员</p>';
            return;
        }

        if (result.data.length === 0) {
            listEl.innerHTML = '<p class="empty">暂无其他成员</p>';
            return;
        }

        const roleNames = { owner: '创建者', member: '成员' };
        listEl.innerHTML = result.data.map(member => `
            <div class="family-member-item">
                <div class="member-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="member-info">
                    <span class="member-role">${roleNames[member.role] || '成员'}</span>
                    <span class="member-joined">加入于 ${new Date(member.joined_at).toLocaleDateString()}</span>
                </div>
            </div>
        `).join('');
    }

    // 创建家庭
    async createFamily() {
        const name = document.getElementById('familyNameInput').value.trim();
        const messageEl = document.getElementById('createFamilyMessage');

        if (!name) {
            messageEl.textContent = '请输入家庭名称';
            messageEl.className = 'auth-message error';
            return;
        }

        const btn = document.getElementById('createFamilyBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 创建中...';

        try {
            const result = await this.supabase.createFamily(name);
            
            if (result.success) {
                this.currentFamily = result.family;
                // 保存到本地存储
                localStorage.setItem('currentFamily', JSON.stringify(result.family));
                messageEl.textContent = '创建成功！';
                messageEl.className = 'auth-message success';
                
                setTimeout(() => {
                    this.showFamilyInfo();
                    this.onFamilyJoined();
                    // 创建成功后关闭模态框
                    this.closeFamilyModal();
                }, 1000);
            } else {
                messageEl.textContent = result.error || '创建失败';
                messageEl.className = 'auth-message error';
            }
        } catch (error) {
            messageEl.textContent = '创建失败：' + error.message;
            messageEl.className = 'auth-message error';
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check"></i> 创建家庭';
        }
    }

    // 加入家庭
    async joinFamily() {
        const code = document.getElementById('inviteCodeInput').value.trim().toUpperCase();
        const messageEl = document.getElementById('joinFamilyMessage');

        if (!code || code.length !== 6) {
            messageEl.textContent = '请输入6位邀请码';
            messageEl.className = 'auth-message error';
            return;
        }

        const btn = document.getElementById('joinFamilyBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 加入中...';

        try {
            const result = await this.supabase.joinFamily(code);
            
            if (result.success) {
                this.currentFamily = result.family;
                // 保存到本地存储
                localStorage.setItem('currentFamily', JSON.stringify(result.family));
                messageEl.textContent = '加入成功！';
                messageEl.className = 'auth-message success';
                
                setTimeout(() => {
                    this.showFamilyInfo();
                    this.onFamilyJoined();
                    // 加入成功后关闭模态框
                    this.closeFamilyModal();
                }, 1000);
            } else {
                messageEl.textContent = result.error || '加入失败';
                messageEl.className = 'auth-message error';
            }
        } catch (error) {
            messageEl.textContent = '加入失败：' + error.message;
            messageEl.className = 'auth-message error';
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check"></i> 加入家庭';
        }
    }

    // 退出家庭
    async leaveFamily() {
        if (!confirm('确定要退出当前家庭吗？退出后您将无法访问家庭数据。')) {
            return;
        }

        try {
            const result = await this.supabase.leaveFamily();
            
            if (result.success) {
                this.currentFamily = null;
                alert('已退出家庭');
                this.showNoFamilySection();
                this.onFamilyLeft();
            } else {
                alert('退出失败：' + result.error);
            }
        } catch (error) {
            alert('退出失败：' + error.message);
        }
    }

    // 复制邀请码
    async copyInviteCode() {
        const code = this.currentFamily?.invite_code;
        if (!code) return;

        try {
            await navigator.clipboard.writeText(code);
            
            const btn = document.getElementById('copyInviteCodeBtn');
            btn.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => {
                btn.innerHTML = '<i class="fas fa-copy"></i>';
            }, 2000);
        } catch (error) {
            alert('复制失败，请手动复制：' + code);
        }
    }

    // 加入家庭后的回调
    onFamilyJoined() {
        console.log('FamilyManager: 已加入家庭');
        // 通知主应用刷新数据
        if (this.app?.onFamilyJoined) {
            this.app.onFamilyJoined();
        }
    }

    // 退出家庭后的回调
    onFamilyLeft() {
        console.log('FamilyManager: 已退出家庭');
        if (this.app?.onFamilyLeft) {
            this.app.onFamilyLeft();
        }
    }

    // 检查用户是否有家庭（供外部调用）
    hasFamily() {
        return this.currentFamily !== null;
    }

    // 获取当前家庭信息
    getFamily() {
        return this.currentFamily;
    }

    // 用户登录后调用
    async onUserAuthenticated() {
        // 显示家庭按钮
        document.getElementById('familyBtn').style.display = 'block';
        
        // 检查是否有家庭
        const family = await this.supabase.getCurrentFamily();
        if (family) {
            this.currentFamily = family;
        }
    }

    // 用户退出登录后调用
    onUserSignedOut() {
        // 隐藏家庭按钮
        document.getElementById('familyBtn').style.display = 'none';
        this.currentFamily = null;
    }
}

// 导出
window.FamilyManager = FamilyManager;

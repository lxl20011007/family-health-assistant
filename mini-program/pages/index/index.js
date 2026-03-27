// 首页逻辑
Page({
  data: {
    members: [],
    memberIndex: 0,
    currentMember: null,
    todayStats: {
      healthCount: 0,
      dietCount: 0,
      exerciseCount: 0
    }
  },

  onLoad() {
    this.loadMembers();
    this.loadTodayStats();
  },

  onShow() {
    this.loadMembers();
    this.loadTodayStats();
  },

  // 加载成员列表
  loadMembers() {
    try {
      const members = wx.getStorageSync('members') || [];
      this.setData({
        members: members,
        currentMember: members[0] || null
      });
    } catch (error) {
      console.error('加载成员失败:', error);
    }
  },

  // 成员选择变化
  onMemberChange(e) {
    const index = e.detail.value;
    const member = this.data.members[index];
    this.setData({
      memberIndex: index,
      currentMember: member
    });
    wx.setStorageSync('currentMemberId', member.id);
    this.loadTodayStats();
  },

  // 加载今日统计
  loadTodayStats() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const healthRecords = wx.getStorageSync('healthRecords') || [];
      const dietRecords = wx.getStorageSync('dietRecords') || [];
      const exerciseRecords = wx.getStorageSync('exerciseRecords') || [];

      const currentMemberId = this.data.currentMember?.id;

      const todayHealth = healthRecords.filter(r => 
        r.memberId === currentMemberId && 
        r.recordedAt.startsWith(today)
      ).length;

      const todayDiet = dietRecords.filter(r => 
        r.memberId === currentMemberId && 
        r.date === today
      ).length;

      const todayExercise = exerciseRecords.filter(r => 
        r.memberId === currentMemberId && 
        r.date === today
      ).length;

      this.setData({
        todayStats: {
          healthCount: todayHealth,
          dietCount: todayDiet,
          exerciseCount: todayExercise
        }
      });
    } catch (error) {
      console.error('加载统计失败:', error);
    }
  },

  // 导航到健康记录页面
  goToHealth() {
    if (!this.data.currentMember) {
      wx.showToast({
        title: '请先选择成员',
        icon: 'none'
      });
      return;
    }
    wx.navigateTo({
      url: '/pages/health/health'
    });
  },

  // 导航到饮食页面
  goDiet() {
    if (!this.data.currentMember) {
      wx.showToast({
        title: '请先选择成员',
        icon: 'none'
      });
      return;
    }
    wx.navigateTo({
      url: '/pages/diet/diet'
    });
  },

  // 导航到运动页面
  goExercise() {
    if (!this.data.currentMember) {
      wx.showToast({
        title: '请先选择成员',
        icon: 'none'
      });
      return;
    }
    wx.navigateTo({
      url: '/pages/exercise/exercise'
    });
  },

  // 导航到 AI 问诊页面
  goAI() {
    wx.navigateTo({
      url: '/pages/ai-consultation/ai-consultation'
    });
  }
});

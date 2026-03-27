// 小程序入口文件
App({
  onLaunch() {
    // 初始化小程序
    this.initApp();
  },

  initApp() {
    // 检查用户登录状态
    wx.checkSession({
      success: () => {
        console.log('用户已登录');
      },
      fail: () => {
        console.log('用户未登录');
      }
    });

    // 获取系统信息
    const systemInfo = wx.getSystemInfoSync();
    this.globalData.systemInfo = systemInfo;
  },

  globalData: {
    systemInfo: null,
    currentMemberId: null,
    supabaseConfig: null
  }
});

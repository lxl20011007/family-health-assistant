# 家庭健康助手 - 微信小程序开发指南

## 📱 项目概述

将现有的网页应用转换为微信小程序，保留所有功能：
- 家庭成员管理
- 健康指标记录
- 饮食管理
- 运动记录
- AI健康问诊
- 云数据同步

## 🚀 开发步骤

### 第一步：注册小程序账号

1. 访问 https://mp.weixin.qq.com
2. 点击"立即注册"
3. 选择"小程序"
4. 填写邮箱和密码
5. 邮箱验证
6. 选择身份认证（个人或企业）
7. 等待审核（1-3天）
8. 审核通过后获取 AppID

**重要：保存好你的 AppID，后面会用到**

### 第二步：下载开发工具

1. 访问 https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html
2. 下载微信开发者工具
3. 安装并打开

### 第三步：创建小程序项目

1. 打开微信开发者工具
2. 点击"+"新建项目
3. 填写项目信息：
   - 项目名称：家庭健康助手
   - 项目目录：选择一个空文件夹
   - AppID：填入你的 AppID
   - 项目类型：选择"小程序"
4. 点击"新建"

### 第四步：项目结构

```
family-health-assistant-mini/
├── pages/                    # 页面文件夹
│   ├── index/               # 首页
│   │   ├── index.wxml       # 页面结构
│   │   ├── index.js         # 页面逻辑
│   │   └── index.wxss       # 页面样式
│   ├── health/              # 健康指标页面
│   ├── diet/                # 饮食管理页面
│   ├── exercise/            # 运动记录页面
│   ├── ai-consultation/     # AI问诊页面
│   └── members/             # 成员管理页面
├── components/              # 组件文件夹
│   ├── health-card/         # 健康记录卡片
│   ├── diet-card/           # 饮食记录卡片
│   └── exercise-card/       # 运动记录卡片
├── utils/                   # 工具函数
│   ├── api.js              # API 调用
│   ├── storage.js          # 本地存储
│   └── supabase.js         # Supabase 集成
├── app.js                   # 小程序入口
├── app.json                 # 小程序配置
├── app.wxss                 # 全局样式
└── project.config.json      # 项目配置

```

### 第五步：核心文件配置

#### app.json（小程序配置）

```json
{
  "pages": [
    "pages/index/index",
    "pages/health/health",
    "pages/diet/diet",
    "pages/exercise/exercise",
    "pages/ai-consultation/ai-consultation",
    "pages/members/members"
  ],
  "window": {
    "backgroundTextStyle": "light",
    "navigationBarBackgroundColor": "#667eea",
    "navigationBarTitleText": "家庭健康助手",
    "navigationBarTextStyle": "white"
  },
  "tabBar": {
    "color": "#999",
    "selectedColor": "#667eea",
    "backgroundColor": "#fff",
    "borderStyle": "black",
    "list": [
      {
        "pagePath": "pages/index/index",
        "text": "首页",
        "iconPath": "images/home.png",
        "selectedIconPath": "images/home-active.png"
      },
      {
        "pagePath": "pages/health/health",
        "text": "健康",
        "iconPath": "images/health.png",
        "selectedIconPath": "images/health-active.png"
      },
      {
        "pagePath": "pages/diet/diet",
        "text": "饮食",
        "iconPath": "images/diet.png",
        "selectedIconPath": "images/diet-active.png"
      },
      {
        "pagePath": "pages/exercise/exercise",
        "text": "运动",
        "iconPath": "images/exercise.png",
        "selectedIconPath": "images/exercise-active.png"
      },
      {
        "pagePath": "pages/ai-consultation/ai-consultation",
        "text": "问诊",
        "iconPath": "images/ai.png",
        "selectedIconPath": "images/ai-active.png"
      }
    ]
  },
  "permission": {
    "scope.userLocation": {
      "desc": "你的位置信息将用于健康建议"
    }
  }
}
```

### 第六步：开发流程

1. **本地开发**
   - 在微信开发者工具中编写代码
   - 实时预览效果
   - 调试和测试

2. **功能迁移**
   - 将网页的 HTML 转换为 WXML
   - 将 CSS 转换为 WXSS
   - 将 JavaScript 适配小程序 API

3. **测试**
   - 在开发者工具中测试
   - 在真机上测试（扫描二维码）

4. **提交审核**
   - 在微信后台上传代码
   - 填写审核信息
   - 等待审核（1-7天）

5. **发布上线**
   - 审核通过后点击发布
   - 小程序上线

### 第七步：关键技术点

#### 1. 本地存储（替代 localStorage）
```javascript
// 保存数据
wx.setStorageSync('key', data);

// 读取数据
const data = wx.getStorageSync('key');

// 删除数据
wx.removeStorageSync('key');
```

#### 2. 网络请求（替代 fetch）
```javascript
wx.request({
  url: 'https://api.example.com/data',
  method: 'GET',
  success: (res) => {
    console.log(res.data);
  },
  fail: (err) => {
    console.error(err);
  }
});
```

#### 3. 页面导航
```javascript
// 跳转到新页面
wx.navigateTo({
  url: '/pages/health/health'
});

// 返回上一页
wx.navigateBack();
```

#### 4. 用户授权
```javascript
// 请求用户授权
wx.authorize({
  scope: 'scope.userLocation',
  success: () => {
    // 用户同意
  },
  fail: () => {
    // 用户拒绝
  }
});
```

### 第八步：提交审核

1. **准备审核材料**
   - 小程序名称：家庭健康助手
   - 小程序描述：家庭健康管理工具
   - 功能说明：记录健康指标、饮食、运动等
   - 隐私政策：说明数据如何使用

2. **上传代码**
   - 在微信开发者工具中点击"上传"
   - 填写版本号和备注
   - 确认上传

3. **在后台提交审核**
   - 登录微信公众平台
   - 进入小程序后台
   - 点击"提交审核"
   - 填写审核信息
   - 等待审核

4. **审核结果**
   - 通过：自动上线
   - 拒绝：查看拒绝原因，修改后重新提交

### 第九步：发布上线

1. 审核通过后，点击"发布"
2. 小程序上线
3. 用户可以在微信搜索找到你的小程序
4. 分享给家人使用

## 📝 注意事项

1. **隐私政策**
   - 必须有隐私政策
   - 说明如何收集和使用用户数据

2. **用户协议**
   - 建议有用户协议
   - 说明服务条款

3. **内容审核**
   - 避免敏感词汇
   - 不要涉及医疗诊断
   - 强调"仅供参考"

4. **性能优化**
   - 小程序包大小限制：2MB
   - 需要优化代码和资源

5. **兼容性**
   - 测试不同微信版本
   - 测试不同手机型号

## 🎯 下一步

1. 注册小程序账号
2. 获取 AppID
3. 下载开发工具
4. 我帮你开发小程序代码
5. 本地测试
6. 提交审核
7. 发布上线

## 💡 预计时间

- 注册账号：1-3 天
- 开发代码：3-5 天
- 本地测试：1-2 天
- 审核等待：1-7 天
- **总计：1-3 周**

## ❓ 常见问题

**Q: 小程序需要付费吗？**
A: 完全免费，无年费、无月费。

**Q: 审核会不会被拒？**
A: 只要内容合规，一般都能通过。

**Q: 可以修改功能吗？**
A: 可以，修改后重新上传即可。

**Q: 用户数据安全吗？**
A: 数据存储在 Supabase，安全可靠。

---

**准备好了吗？让我们开始吧！** 🚀

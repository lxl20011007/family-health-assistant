# 微信小程序开发 - 快速开始

## 📁 文件说明

```
mini-program/
├── app.json              # 小程序配置文件
├── app.js                # 小程序入口
├── app.wxss              # 全局样式
├── project.config.json   # 项目配置
└── pages/
    └── index/
        ├── index.wxml    # 首页结构
        ├── index.js      # 首页逻辑
        ├── index.json    # 首页配置
        └── index.wxss    # 首页样式
```

## 🚀 快速开始

### 第一步：注册小程序账号

1. 访问 https://mp.weixin.qq.com
2. 点击"立即注册"
3. 选择"小程序"
4. 完成身份认证（1-3天）
5. 获取 AppID

### 第二步：下载开发工具

1. 访问 https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html
2. 下载微信开发者工具
3. 安装并打开

### 第三步：创建项目

1. 打开微信开发者工具
2. 点击"+"新建项目
3. 填写项目信息：
   - 项目名称：family-health-assistant
   - 项目目录：选择 `mini-program` 文件夹
   - AppID：填入你的 AppID
   - 项目类型：小程序
4. 点击"新建"

### 第四步：配置 AppID

编辑 `project.config.json`，将 `YOUR_APPID_HERE` 替换为你的真实 AppID：

```json
{
  "appid": "YOUR_APPID_HERE"
}
```

### 第五步：开发和测试

1. 在微信开发者工具中编写代码
2. 实时预览效果
3. 在真机上测试（扫描二维码）

## 📝 文件详解

### app.json - 小程序配置

- `pages`: 页面列表
- `window`: 窗口配置（导航栏颜色等）
- `tabBar`: 底部标签栏配置
- `permission`: 权限配置

### app.js - 小程序入口

- `onLaunch()`: 小程序启动时执行
- `globalData`: 全局数据

### pages/index/index.wxml - 首页结构

- 使用 WXML 语法（类似 HTML）
- `<view>` 替代 `<div>`
- `<text>` 替代 `<span>`
- `bindtap` 替代 `onclick`

### pages/index/index.js - 首页逻辑

- `Page()` 定义页面
- `data`: 页面数据
- `onLoad()`: 页面加载时执行
- `onShow()`: 页面显示时执行

## 🔧 常用 API

### 本地存储

```javascript
// 保存数据
wx.setStorageSync('key', data);

// 读取数据
const data = wx.getStorageSync('key');

// 删除数据
wx.removeStorageSync('key');
```

### 页面导航

```javascript
// 跳转到新页面
wx.navigateTo({
  url: '/pages/health/health'
});

// 返回上一页
wx.navigateBack();
```

### 提示框

```javascript
// 显示提示
wx.showToast({
  title: '成功',
  icon: 'success'
});

// 显示模态框
wx.showModal({
  title: '提示',
  content: '确定删除吗？',
  success: (res) => {
    if (res.confirm) {
      // 用户点击确定
    }
  }
});
```

## 📱 页面开发

### 创建新页面

1. 在 `pages` 文件夹中创建新文件夹（如 `health`）
2. 创建 4 个文件：
   - `health.wxml` - 页面结构
   - `health.js` - 页面逻辑
   - `health.json` - 页面配置
   - `health.wxss` - 页面样式
3. 在 `app.json` 的 `pages` 数组中添加 `pages/health/health`

### 页面模板

```javascript
// health.js
Page({
  data: {
    // 页面数据
  },

  onLoad() {
    // 页面加载
  },

  onShow() {
    // 页面显示
  },

  // 事件处理
  handleTap() {
    console.log('点击了');
  }
});
```

## 🎨 样式开发

WXSS 是微信小程序的样式语言，类似 CSS：

```wxss
/* 选择器 */
.container {
  padding: 16px;
  background: #f5f7fa;
}

/* 伪类 */
.btn:active {
  opacity: 0.9;
}

/* 响应式 */
@media (max-width: 480px) {
  .container {
    padding: 8px;
  }
}
```

## 🔐 数据存储

所有数据使用 `wx.setStorageSync()` 存储在本地：

```javascript
// 保存成员列表
wx.setStorageSync('members', [
  { id: '1', name: '张三', birthDate: '1990-01-01' }
]);

// 保存健康记录
wx.setStorageSync('healthRecords', [
  { id: '1', memberId: '1', type: 'blood_pressure', value: 120 }
]);
```

## 🚀 提交审核

### 准备审核

1. 完成所有功能开发
2. 本地测试无误
3. 准备隐私政策和用户协议

### 上传代码

1. 在微信开发者工具中点击"上传"
2. 填写版本号和备注
3. 确认上传

### 提交审核

1. 登录微信公众平台
2. 进入小程序后台
3. 点击"提交审核"
4. 填写审核信息
5. 等待审核（1-7天）

### 发布上线

1. 审核通过后点击"发布"
2. 小程序上线
3. 用户可以在微信搜索找到

## ❓ 常见问题

**Q: 如何调试？**
A: 使用微信开发者工具的调试功能，或在真机上扫描二维码预览。

**Q: 如何处理错误？**
A: 使用 `try-catch` 或 `wx.showToast()` 显示错误提示。

**Q: 如何优化性能？**
A: 避免频繁的数据更新，使用分页加载大数据。

**Q: 如何集成 Supabase？**
A: 使用 `wx.request()` 调用 Supabase API。

## 📚 更多资源

- 微信小程序官方文档：https://developers.weixin.qq.com/miniprogram/dev/
- WXML 语法：https://developers.weixin.qq.com/miniprogram/dev/reference/wxml/
- API 文档：https://developers.weixin.qq.com/miniprogram/dev/api/

## 🎯 下一步

1. ✅ 注册小程序账号
2. ✅ 下载开发工具
3. ✅ 创建项目
4. ⏳ 开发其他页面（健康、饮食、运动、AI问诊）
5. ⏳ 本地测试
6. ⏳ 提交审核
7. ⏳ 发布上线

---

**准备好了吗？让我们开始吧！** 🚀

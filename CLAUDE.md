# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**家庭健康助手** - 一个功能完整的家庭健康管理 Web 应用，支持实时云同步。

### 核心功能
- 家庭成员管理（添加、编辑、删除）
- 健康指标记录（血压、血糖、心率、身高、体重、BMI）
- 饮食管理（记录每日饮食，自动计算营养信息）
- 运动记录（记录运动类型、时长、消耗热量）
- 用药提醒（设置用药时间和提醒）
- AI 健康问诊（基于智谱 GLM-4-Flash 模型）
- 云同步功能（Supabase 后端）

### 技术架构
- **前端**: HTML5, CSS3, JavaScript (ES6+)
- **存储**: localStorage（本地）+ Supabase（云端）
- **部署**: 静态网站，支持 Netlify、Gitee Pages 等
- **AI 集成**: 智谱 AI (GLM-4-Flash)

## 文件结构

### 核心文件
- `index.html` - 应用主页面，包含所有 UI 组件
- `app.js` - 应用核心逻辑，主控制器类 `FamilyHealthApp`
- `style.css` - 响应式样式文件
- `supabase-client.js` - Supabase 云同步客户端
- `diet-manager.js` - 饮食管理模块和食物营养数据库
- `ai-consultation.js` - AI 健康问诊模块
- `app-auth.js` - 用户认证管理
- `family-manager.js` - 家庭成员管理
- `app-integrated.js` - 集成版本的应用逻辑

### 小程序相关
- `mini-program/` - 微信小程序版本
  - `app.js`, `app.json`, `app.wxss` - 小程序配置
  - `pages/` - 小程序页面

### 部署和文档
- `netlify.toml` - Netlify 部署配置
- `DEPLOYMENT_GUIDE.md` - 部署指南
- `CLOUD_SYNC_*.md` - 云同步相关文档
- `MINI_PROGRAM_GUIDE.md` - 小程序开发指南

## 开发命令

### 本地开发
```bash
# 克隆仓库
git clone https://gitee.com/lxl2190513003/family-health-assistant.git

# 本地运行（直接打开）
cd family-health-assistant
# 用浏览器打开 index.html
```

### 代码检查
```bash
# 检查 JavaScript 语法（需要 Node.js）
node -c app.js
node -c supabase-client.js
node -c diet-manager.js
node -c ai-consultation.js

# 检查 HTML 语法
# 可以使用 HTML 验证器或浏览器开发者工具
```

### 部署
```bash
# Netlify 部署（自动）
# 推送到配置的 Git 仓库即可自动部署

# 本地测试部署
python -m http.server 8000  # Python 3
# 或
npx serve .  # 需要安装 serve
```

## 架构设计

### 主要类结构

1. **FamilyHealthApp** (`app.js`)
   - 主应用控制器
   - 管理当前用户、家庭成员、自动同步
   - 协调各模块间的交互

2. **SupabaseClient** (`supabase-client.js`)
   - 云同步客户端
   - 处理用户认证、数据同步、实时订阅
   - 支持离线模式和同步队列

3. **AIHealthAssistant** (`ai-consultation.js`)
   - AI 问诊功能
   - 智谱 API 集成
   - 对话历史和语音识别

4. **AuthManager** (`app-auth.js`)
   - 用户认证管理
   - 邮箱注册/登录
   - 会话管理

5. **FamilyManager** (`family-manager.js`)
   - 家庭成员 CRUD 操作
   - 权限管理

### 数据流
1. 用户操作 → 本地存储 → 自动同步到云端
2. 云端数据变更 → 实时订阅 → 本地更新
3. AI 问诊 → 智谱 API → 结果展示

### 存储结构
- **localStorage**: 本地数据缓存、用户配置
- **Supabase**: 云端持久化存储、实时同步
- **食物数据库**: 内置营养信息（`diet-manager.js`）

## 关键配置

### Supabase 配置
```javascript
// 在云同步配置界面设置
{
  url: 'your-supabase-url',
  anonKey: 'your-anon-key'
}
```

### AI 配置
```javascript
// 在 AI 问诊配置界面设置
{
  apiKey: 'your-zhipu-api-key'
}
```

## 开发注意事项

### 数据安全
- 默认本地存储，云同步可选
- 行级安全策略（RLS）保护用户数据
- API 密钥本地存储，不上传服务器

### 性能优化
- 自动同步间隔：30秒
- 缓存策略：CSS/JS 文件长期缓存
- 离线支持：网络恢复后自动同步

### 响应式设计
- 移动端优先
- 支持手机、平板、桌面
- 触摸友好的交互设计

## 测试策略

### 功能测试
- 手动测试各功能模块
- 跨设备同步测试
- 离线场景测试

### 浏览器兼容性
- Chrome、Firefox、Safari、Edge
- 微信内置浏览器（小程序版本）

## 部署环境

### 生产环境
- **主站点**: https://lxl2190513003.gitee.io/family-health-assistant
- **部署平台**: Gitee Pages
- **备选平台**: Netlify

### 开发环境
- 本地文件直接打开
- 本地服务器测试
- 小程序开发者工具

## 维护指南

### 数据迁移
- 使用 `supabase-*.sql` 文件进行数据库结构变更
- 备份重要数据后再执行迁移

### 版本更新
- 检查 API 密钥兼容性
- 测试云同步功能
- 验证数据完整性

## 故障排除

### 常见问题
1. **云同步失败**: 检查 Supabase 配置和网络连接
2. **AI 问诊无响应**: 验证智谱 API 密钥
3. **数据丢失**: 检查 localStorage 和云端备份
4. **界面异常**: 清除浏览器缓存

### 调试工具
- 浏览器开发者工具
- Supabase Dashboard
- 智谱 AI 控制台

## 安全考虑

- 不在代码中硬编码敏感信息
- 使用环境变量或配置文件管理密钥
- 定期轮换 API 密钥
- 监控异常访问模式
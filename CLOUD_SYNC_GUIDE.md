# 🌐 家庭健康助手 - 数据同步指南

## 功能介绍

启用云同步后，你的家庭所有成员在任何设备上上传的数据都能**实时共享**：

✅ 家庭成员信息  
✅ 健康指标记录（血压、血糖、心率）  
✅ 饮食记录  
✅ 运动记录  
✅ AI问诊对话  

---

## 快速开始（3步）

### 第一步：创建 Supabase 项目

1. 访问 https://supabase.com
2. 点击 **"Start your project"** 注册/登录
3. 创建新项目（选择离你最近的地区）
4. 等待项目初始化完成（约2-3分钟）

### 第二步：创建数据库表

1. 在 Supabase 控制台，点击左侧 **"SQL Editor"**
2. 点击 **"New Query"**
3. 复制 `supabase-schema.sql` 文件中的所有 SQL 代码
4. 粘贴到编辑器中，点击 **"Run"** 执行

### 第三步：配置应用

1. 打开应用，点击右上角 **☁️ 云同步按钮**
2. 在 Supabase 控制台获取：
   - **Project URL**：Settings → API → Project URL
   - **anon key**：Settings → API → Project API keys → anon (public)
3. 粘贴到应用中，点击 **"保存并启用"**
4. 看到 **"已连接到云同步"** 表示成功！

---

## 工作原理

### 数据流向

```
设备A (添加数据) 
    ↓
本地存储 (localStorage)
    ↓
Supabase 云端
    ↓
设备B (自动同步)
```

### 同步时机

- ✅ **自动同步**：添加/修改记录时自动上传到云端
- ✅ **定期同步**：每次打开应用时自动拉取最新数据
- ✅ **离线支持**：网络断开时数据保存在本地，恢复后自动同步

---

## 常见问题

### Q: 数据安全吗？
**A:** 
- 数据存储在 Supabase（企业级云服务）
- 使用 anon key 只能访问你自己的数据
- 建议定期修改密钥

### Q: 多个设备如何同步？
**A:**
- 在每个设备上都配置相同的 Supabase 凭据
- 数据会自动在所有设备间同步
- 支持手机、平板、电脑

### Q: 离线时数据会丢失吗？
**A:**
- 不会！数据先保存在本地
- 网络恢复后自动同步到云端
- 支持完全离线使用

### Q: 如何禁用云同步？
**A:**
- 点击云同步按钮 → 点击 **"禁用云同步"**
- 本地数据不会删除，只是停止同步

---

## 数据库表结构

| 表名 | 说明 | 关键字段 |
|------|------|--------|
| `family_members` | 家庭成员 | id, name, gender, birth_date |
| `health_records` | 健康指标 | member_id, type, value, recorded_at |
| `diet_records` | 饮食记录 | member_id, meal_type, date, food_name |
| `exercise_records` | 运动记录 | member_id, exercise_type, duration_minutes |
| `ai_chat_sessions` | AI对话会话 | member_id, created_at |
| `ai_chat_messages` | AI对话消息 | session_id, role, content |

---

## 故障排除

### 连接失败

**问题**：显示 "连接失败"

**解决**：
1. 检查 URL 和 key 是否正确复制
2. 确保网络连接正常
3. 检查 Supabase 项目是否还在运行
4. 尝试重新创建 API key

### 数据不同步

**问题**：一个设备上的数据在另一个设备上看不到

**解决**：
1. 确保两个设备都配置了相同的 Supabase 凭据
2. 刷新页面或重新打开应用
3. 检查网络连接
4. 查看浏览器控制台是否有错误信息

### 数据冲突

**问题**：多个设备同时修改同一条记录

**解决**：
- 系统会自动使用最新的修改时间戳
- 较早的修改会被覆盖
- 建议在一个设备上修改，其他设备查看

---

## 高级配置

### 启用行级安全 (RLS)

为了更好的数据隐私，建议启用 RLS：

1. 在 Supabase 控制台，点击 **"Authentication"**
2. 启用 **"Row Level Security"**
3. 为每个表添加策略（可选）

### 备份数据

1. 在 Supabase 控制台，点击 **"Backups"**
2. 启用自动备份
3. 可以随时恢复到之前的版本

---

## 支持

如有问题，请：
1. 查看浏览器控制台错误信息（F12 → Console）
2. 检查 Supabase 项目状态
3. 查看本指南的故障排除部分

祝你使用愉快！🦞

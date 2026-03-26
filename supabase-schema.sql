-- =====================================================
-- 家庭健康助手 - Supabase数据库表结构
-- =====================================================
--
-- 说明：这些表支持本地应用的数据云同步功能
-- 使用策略：每个表的记录都关联到家庭成员 (member_id)
-- 时间戳字段：created_at, updated_at 用于同步和冲突解决
--

-- 启用行级安全策略 (RLS)
-- 注意：对于anon角色，需要谨慎配置策略以确保数据隔离

-- 1. 家庭成员表
CREATE TABLE IF NOT EXISTS family_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    gender TEXT CHECK (gender IN ('male', 'female')) NOT NULL,
    birth_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 健康记录表
CREATE TABLE IF NOT EXISTS health_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'blood_pressure', 'blood_sugar', 'heart_rate', etc.
    value NUMERIC NOT NULL, -- 主要数值
    unit TEXT, -- 单位 (如 'mmHg', 'mmol/L', 'bpm')
    secondary_value NUMERIC, -- 次要数值（如血压的舒张压）
    recorded_at DATE NOT NULL, -- 记录日期
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 饮食记录表
CREATE TABLE IF NOT EXISTS diet_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
    meal_type TEXT NOT NULL, -- 'breakfast', 'lunch', 'dinner', 'snack'
    date DATE NOT NULL,
    food_name TEXT NOT NULL,
    quantity NUMERIC NOT NULL,
    unit TEXT NOT NULL, -- 'g', 'ml', '个', etc.
    calories NUMERIC,
    protein NUMERIC,
    fat NUMERIC,
    carbs NUMERIC,
    fiber NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 运动记录表
CREATE TABLE IF NOT EXISTS exercise_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
    exercise_type TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    intensity TEXT, -- 'low', 'medium', 'high'
    calories_burned NUMERIC,
    recorded_at DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. AI聊天会话表 (用于AI问诊)
CREATE TABLE IF NOT EXISTS ai_chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. AI聊天消息表
CREATE TABLE IF NOT EXISTS ai_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL, -- 'user' or 'assistant'
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为所有表创建updated_at触发器
CREATE TRIGGER update_family_members_updated_at
    BEFORE UPDATE ON family_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_health_records_updated_at
    BEFORE UPDATE ON health_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_diet_records_updated_at
    BEFORE UPDATE ON diet_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exercise_records_updated_at
    BEFORE UPDATE ON exercise_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_chat_sessions_updated_at
    BEFORE UPDATE ON ai_chat_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 索引优化 (提高查询性能)
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_health_records_member_id ON health_records(member_id);
CREATE INDEX IF NOT EXISTS idx_health_records_recorded_at ON health_records(recorded_at);
CREATE INDEX IF NOT EXISTS idx_diet_records_member_id ON diet_records(member_id);
CREATE INDEX IF NOT EXISTS idx_diet_records_date ON diet_records(date);
CREATE INDEX IF NOT EXISTS idx_exercise_records_member_id ON exercise_records(member_id);
CREATE INDEX IF NOT EXISTS idx_exercise_records_recorded_at ON exercise_records(recorded_at);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session_id ON ai_chat_messages(session_id);

-- =====================================================
-- 使用说明：
-- =====================================================
-- 1. 在Supabase控制台打开SQL编辑器
-- 2. 复制并运行以上所有SQL语句
-- 3. 获取你的Supabase URL和anon (public) key
-- 4. 在应用设置中输入这些凭据以启用云同步
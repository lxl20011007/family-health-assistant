-- =====================================================
-- 家庭组模式 - 数据库迁移脚本
-- 功能：每个用户有独立账号，加入家庭组后共享数据
-- =====================================================

-- 第一步：创建家庭组表
CREATE TABLE IF NOT EXISTS families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    invite_code TEXT UNIQUE DEFAULT UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6)),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 第二步：创建用户-家庭关联表
CREATE TABLE IF NOT EXISTS family_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(family_id, user_id) -- 一个用户在一个家庭中只能有一条记录
);

-- 第三步：删除旧的 RLS 策略（必须先删除，否则无法删除 user_id 列）
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE tablename IN (
        'family_members', 'health_records', 'diet_records', 'exercise_records', 
        'ai_chat_sessions', 'ai_chat_messages'
    )) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- 现在可以安全删除 user_id 列了
ALTER TABLE family_members DROP COLUMN IF EXISTS user_id;
ALTER TABLE health_records DROP COLUMN IF EXISTS user_id;
ALTER TABLE diet_records DROP COLUMN IF EXISTS user_id;
ALTER TABLE exercise_records DROP COLUMN IF EXISTS user_id;
ALTER TABLE ai_chat_sessions DROP COLUMN IF EXISTS user_id;

-- 添加 family_id 列
ALTER TABLE family_members ADD COLUMN family_id UUID REFERENCES families(id) ON DELETE CASCADE;
ALTER TABLE health_records ADD COLUMN family_id UUID REFERENCES families(id) ON DELETE CASCADE;
ALTER TABLE diet_records ADD COLUMN family_id UUID REFERENCES families(id) ON DELETE CASCADE;
ALTER TABLE exercise_records ADD COLUMN family_id UUID REFERENCES families(id) ON DELETE CASCADE;
ALTER TABLE ai_chat_sessions ADD COLUMN family_id UUID REFERENCES families(id) ON DELETE CASCADE;

-- 第四步：创建索引
CREATE INDEX IF NOT EXISTS idx_families_owner_id ON families(owner_id);
CREATE INDEX IF NOT EXISTS idx_family_users_family_id ON family_users(family_id);
CREATE INDEX IF NOT EXISTS idx_family_users_user_id ON family_users(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_family_id ON family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_health_records_family_id ON health_records(family_id);
CREATE INDEX IF NOT EXISTS idx_diet_records_family_id ON diet_records(family_id);
CREATE INDEX IF NOT EXISTS idx_exercise_records_family_id ON exercise_records(family_id);

-- 第五步：启用 RLS
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE diet_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- 第六步：删除旧策略（如果存在）
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE tablename IN (
        'families', 'family_users', 'family_members', 'health_records', 
        'diet_records', 'exercise_records', 'ai_chat_sessions', 'ai_chat_messages'
    )) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- 第七步：创建辅助函数 - 检查用户是否属于某个家庭
CREATE OR REPLACE FUNCTION is_family_member(family_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM family_users 
        WHERE family_id = family_uuid 
        AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建辅助函数 - 获取用户所属的家庭ID
CREATE OR REPLACE FUNCTION get_user_family_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT family_id FROM family_users 
        WHERE user_id = auth.uid() 
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 第八步：创建 RLS 策略

-- families 表策略
CREATE POLICY "Users can view families they belong to" ON families
    FOR SELECT USING (is_family_member(id));

CREATE POLICY "Users can create family" ON families
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update family" ON families
    FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete family" ON families
    FOR DELETE USING (auth.uid() = owner_id);

-- family_users 表策略
CREATE POLICY "Users can view family members" ON family_users
    FOR SELECT USING (family_id IN (
        SELECT family_id FROM family_users WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can join family" ON family_users
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave family" ON family_users
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Owners can remove members" ON family_users
    FOR DELETE USING (
        family_id IN (SELECT id FROM families WHERE owner_id = auth.uid())
    );

-- 数据表策略（family_members, health_records, diet_records, exercise_records）
-- 用户可以查看所属家庭的所有数据
CREATE POLICY "Family members can view family_members" ON family_members
    FOR SELECT USING (is_family_member(family_id));

CREATE POLICY "Family members can view health_records" ON health_records
    FOR SELECT USING (is_family_member(family_id));

CREATE POLICY "Family members can view diet_records" ON diet_records
    FOR SELECT USING (is_family_member(family_id));

CREATE POLICY "Family members can view exercise_records" ON exercise_records
    FOR SELECT USING (is_family_member(family_id));

-- 用户可以插入数据到所属家庭
CREATE POLICY "Family members can insert family_members" ON family_members
    FOR INSERT WITH CHECK (is_family_member(family_id));

CREATE POLICY "Family members can insert health_records" ON health_records
    FOR INSERT WITH CHECK (is_family_member(family_id));

CREATE POLICY "Family members can insert diet_records" ON diet_records
    FOR INSERT WITH CHECK (is_family_member(family_id));

CREATE POLICY "Family members can insert exercise_records" ON exercise_records
    FOR INSERT WITH CHECK (is_family_member(family_id));

-- 用户可以更新所属家庭的数据
CREATE POLICY "Family members can update family_members" ON family_members
    FOR UPDATE USING (is_family_member(family_id));

CREATE POLICY "Family members can update health_records" ON health_records
    FOR UPDATE USING (is_family_member(family_id));

CREATE POLICY "Family members can update diet_records" ON diet_records
    FOR UPDATE USING (is_family_member(family_id));

CREATE POLICY "Family members can update exercise_records" ON exercise_records
    FOR UPDATE USING (is_family_member(family_id));

-- 用户可以删除所属家庭的数据
CREATE POLICY "Family members can delete family_members" ON family_members
    FOR DELETE USING (is_family_member(family_id));

CREATE POLICY "Family members can delete health_records" ON health_records
    FOR DELETE USING (is_family_member(family_id));

CREATE POLICY "Family members can delete diet_records" ON diet_records
    FOR DELETE USING (is_family_member(family_id));

CREATE POLICY "Family members can delete exercise_records" ON exercise_records
    FOR DELETE USING (is_family_member(family_id));

-- ai_chat_sessions 策略
CREATE POLICY "Family members can view ai_chat_sessions" ON ai_chat_sessions
    FOR SELECT USING (is_family_member(family_id));

CREATE POLICY "Family members can insert ai_chat_sessions" ON ai_chat_sessions
    FOR INSERT WITH CHECK (is_family_member(family_id));

CREATE POLICY "Family members can delete ai_chat_sessions" ON ai_chat_sessions
    FOR DELETE USING (is_family_member(family_id));

-- ai_chat_messages 策略
CREATE POLICY "Family members can view ai_chat_messages" ON ai_chat_messages
    FOR SELECT USING (
        session_id IN (
            SELECT id FROM ai_chat_sessions WHERE is_family_member(family_id)
        )
    );

CREATE POLICY "Family members can insert ai_chat_messages" ON ai_chat_messages
    FOR INSERT WITH CHECK (
        session_id IN (
            SELECT id FROM ai_chat_sessions WHERE is_family_member(family_id)
        )
    );

-- 第九步：开启 Realtime（如果尚未开启）
-- 使用 DO 块处理已存在的表
DO $$
BEGIN
    -- 尝试添加每个表到 Realtime，忽略已存在的错误
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE families;
    EXCEPTION WHEN others THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE family_users;
    EXCEPTION WHEN others THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE family_members;
    EXCEPTION WHEN others THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE health_records;
    EXCEPTION WHEN others THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE diet_records;
    EXCEPTION WHEN others THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE exercise_records;
    EXCEPTION WHEN others THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE ai_chat_sessions;
    EXCEPTION WHEN others THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE ai_chat_messages;
    EXCEPTION WHEN others THEN NULL;
    END;
END $$;

-- =====================================================
-- 完成！使用流程：
-- 1. 用户注册账号
-- 2. 用户创建家庭 → 获得 invite_code
-- 3. 其他用户用 invite_code 加入家庭
-- 4. 所有成员共享该家庭的数据
-- =====================================================

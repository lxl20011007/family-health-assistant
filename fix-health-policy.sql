-- 修复 health_records 表的 RLS 策略

-- 启用 RLS
ALTER TABLE health_records ENABLE ROW LEVEL SECURITY;

-- 删除旧策略（如果存在）
DROP POLICY IF EXISTS "Users can insert health records" ON health_records;
DROP POLICY IF EXISTS "Users can view health records" ON health_records;
DROP POLICY IF EXISTS "Users can update health records" ON health_records;
DROP POLICY IF EXISTS "Users can delete health records" ON health_records;

-- 创建新策略：允许认证用户插入健康记录
CREATE POLICY "Users can insert health records" ON health_records
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- 创建新策略：允许认证用户查看健康记录
CREATE POLICY "Users can view health records" ON health_records
    FOR SELECT TO authenticated
    USING (true);

-- 创建新策略：允许认证用户更新健康记录
CREATE POLICY "Users can update health records" ON health_records
    FOR UPDATE TO authenticated
    USING (true);

-- 创建新策略：允许认证用户删除健康记录
CREATE POLICY "Users can delete health records" ON health_records
    FOR DELETE TO authenticated
    USING (true);

-- 同样修复 diet_records 表
ALTER TABLE diet_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can insert diet records" ON diet_records;
DROP POLICY IF EXISTS "Users can view diet records" ON diet_records;
DROP POLICY IF EXISTS "Users can update diet records" ON diet_records;
DROP POLICY IF EXISTS "Users can delete diet records" ON diet_records;

CREATE POLICY "Users can insert diet records" ON diet_records
    FOR INSERT TO authenticated
    WITH CHECK (true);
CREATE POLICY "Users can view diet records" ON diet_records
    FOR SELECT TO authenticated
    USING (true);
CREATE POLICY "Users can update diet records" ON diet_records
    FOR UPDATE TO authenticated
    USING (true);
CREATE POLICY "Users can delete diet records" ON diet_records
    FOR DELETE TO authenticated
    USING (true);

-- 同样修复 exercise_records 表
ALTER TABLE exercise_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can insert exercise records" ON exercise_records;
DROP POLICY IF EXISTS "Users can view exercise records" ON exercise_records;
DROP POLICY IF EXISTS "Users can update exercise records" ON exercise_records;
DROP POLICY IF EXISTS "Users can delete exercise records" ON exercise_records;

CREATE POLICY "Users can insert exercise records" ON exercise_records
    FOR INSERT TO authenticated
    WITH CHECK (true);
CREATE POLICY "Users can view exercise records" ON exercise_records
    FOR SELECT TO authenticated
    USING (true);
CREATE POLICY "Users can update exercise records" ON exercise_records
    FOR UPDATE TO authenticated
    USING (true);
CREATE POLICY "Users can delete exercise records" ON exercise_records
    FOR DELETE TO authenticated
    USING (true);

-- 重新启用并修复 RLS 策略

-- 先启用 RLS
ALTER TABLE families ENABLE ROW LEVEL SECURITY;

-- ==================== 重新创建 families 策略 ====================
DROP POLICY IF EXISTS "Users can create family" ON families;
DROP POLICY IF EXISTS "Users can view families they belong to" ON families;
DROP POLICY IF EXISTS "Owners can update family" ON families;
DROP POLICY IF EXISTS "Owners can delete family" ON families;

-- 创建家庭（插入时 owner_id 必须等于当前用户）
CREATE POLICY "Users can create family" ON families
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = owner_id);

-- 查看家庭（用户只能看自己加入的家庭）
CREATE POLICY "Users can view families they belong to" ON families
    FOR SELECT TO authenticated
    USING (owner_id = auth.uid());

-- 更新家庭（只有 owner 可以更新）
CREATE POLICY "Owners can update family" ON families
    FOR UPDATE TO authenticated
    USING (auth.uid() = owner_id);

-- 删除家庭（只有 owner 可以删除）
CREATE POLICY "Owners can delete family" ON families
    FOR DELETE TO authenticated
    USING (auth.uid() = owner_id);


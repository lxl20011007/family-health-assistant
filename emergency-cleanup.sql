-- 紧急清理脚本：删除所有数据，重置数据库

-- 1. 先删除所有外键相关的数据
DELETE FROM health_records;
DELETE FROM diet_records;
DELETE FROM exercise_records;
DELETE FROM family_members;

-- 2. 重置自增序列（如果有的话）
-- 注意：Supabase 使用 UUID，不需要重置序列

-- 3. 验证删除结果
SELECT COUNT(*) as health_records_count FROM health_records;
SELECT COUNT(*) as diet_records_count FROM diet_records;
SELECT COUNT(*) as exercise_records_count FROM exercise_records;
SELECT COUNT(*) as family_members_count FROM family_members;

-- 应该都显示 0
-- Fix column name mismatches in existing Neon database
-- Run this BEFORE creating admin user

-- 1. Rename created_by -> createdBy in users table
ALTER TABLE IF EXISTS users RENAME COLUMN "created_by" TO "createdBy";

-- 2. Drop and recreate foreign key if it exists with old name
ALTER TABLE IF EXISTS users DROP CONSTRAINT IF EXISTS "users_createdBy_fkey";
ALTER TABLE IF EXISTS users ADD CONSTRAINT "users_createdBy_fkey"
  FOREIGN KEY ("createdBy") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 3. Ensure families table has createdBy (not created_by)
-- If families table has created_by, rename it
ALTER TABLE IF EXISTS families RENAME COLUMN "created_by" TO "createdBy";

-- Note: If the column doesn't exist, this will do nothing (IF EXISTS)

COMMIT;

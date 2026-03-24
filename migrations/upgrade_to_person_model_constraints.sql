-- =====================================================
-- MIGRATION: Upgrade to Person-Centric Family Tree
-- Phase 2: Add constraints and optional cleanup
-- Run AFTER data migration script completes successfully
-- =====================================================

-- 1. Add foreign key constraints

-- families.headPersonId -> persons.id
ALTER TABLE "families"
ADD CONSTRAINT "families_headPersonId_fkey"
FOREIGN KEY ("headPersonId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- families.fatherId -> persons.id
ALTER TABLE "families"
ADD CONSTRAINT "families_fatherId_fkey"
FOREIGN KEY ("fatherId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- families.motherId -> persons.id
ALTER TABLE "families"
ADD CONSTRAINT "families_motherId_fkey"
FOREIGN KEY ("motherId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- spouses.personId -> persons.id
ALTER TABLE "spouses"
ADD CONSTRAINT "spouses_personId_fkey"
FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- children.personId -> persons.id
ALTER TABLE "children"
ADD CONSTRAINT "children_personId_fkey"
FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- relationships.parentId -> persons.id
ALTER TABLE "relationships"
ADD CONSTRAINT "relationships_parentId_fkey"
FOREIGN KEY ("parentId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- relationships.childId -> persons.id
ALTER TABLE "relationships"
ADD CONSTRAINT "relationships_childId_fkey"
FOREIGN KEY ("childId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. Make new name columns NOT NULL (since we migrated all data)
-- Only run this if you are sure all records have been migrated
-- Uncomment after data migration:

-- ALTER TABLE "families" ALTER COLUMN "firstName" SET NOT NULL;
-- ALTER TABLE "families" ALTER COLUMN "lastName" SET NOT NULL;
-- ALTER TABLE "spouses" ALTER COLUMN "firstName" SET NOT NULL;
-- ALTER TABLE "spouses" ALTER COLUMN "lastName" SET NOT NULL;
-- ALTER TABLE "children" ALTER COLUMN "firstName" SET NOT NULL;
-- ALTER TABLE "children" ALTER COLUMN "lastName" SET NOT NULL;

-- 3. OPTIONAL: Drop old columns (commented out for safety)
-- Review and verify data before dropping! Uncomment to drop:

-- ALTER TABLE "families" DROP COLUMN "headFullName";
-- ALTER TABLE "families" DROP COLUMN "fatherName";
-- ALTER TABLE "families" DROP COLUMN "motherName";
-- ALTER TABLE "spouses" DROP COLUMN "fullName";
-- ALTER TABLE "spouses" DROP COLUMN "fatherName";
-- ALTER TABLE "spouses" DROP COLUMN "motherName";
-- ALTER TABLE "children" DROP COLUMN "fullName";

-- =====================================================
-- END OF PHASE 2
-- =====================================================

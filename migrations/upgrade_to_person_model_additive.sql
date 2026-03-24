-- =====================================================
-- MIGRATION: Upgrade to Person-Centric Family Tree
-- Phase 1: Add new tables and columns (NON-DESTRUCTIVE)
-- =====================================================

-- 1. Create RelationType enum
CREATE TYPE "RelationType" AS ENUM ('FATHER', 'MOTHER');

-- 2. Create Person table
CREATE TABLE "persons" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "isDeceased" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "persons_pkey" PRIMARY KEY ("id")
);

-- 3. Create Relationship table
CREATE TABLE "relationships" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "relationType" "RelationType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "relationships_pkey" PRIMARY KEY ("id")
);

-- 4. Add new columns to families (keep old columns for now)
ALTER TABLE "families"
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "middleName" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "fatherFirstName" TEXT,
ADD COLUMN     "fatherMiddleName" TEXT,
ADD COLUMN     "fatherLastName" TEXT,
ADD COLUMN     "motherFirstName" TEXT,
ADD COLUMN     "motherMiddleName" TEXT,
ADD COLUMN     "motherLastName" TEXT,
ADD COLUMN     "headPersonId" TEXT,
ADD COLUMN     "fatherId" TEXT,
ADD COLUMN     "motherId" TEXT;

-- 5. Add new columns to spouses (keep old columns)
ALTER TABLE "spouses"
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "middleName" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "fatherFirstName" TEXT,
ADD COLUMN     "fatherMiddleName" TEXT,
ADD COLUMN     "fatherLastName" TEXT,
ADD COLUMN     "motherFirstName" TEXT,
ADD COLUMN     "motherMiddleName" TEXT,
ADD COLUMN     "motherLastName" TEXT,
ADD COLUMN     "personId" TEXT,
ADD COLUMN     "isDeceased" BOOLEAN NOT NULL DEFAULT false;

-- 6. Add new columns to children (keep old columns)
ALTER TABLE "children"
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "middleName" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "personId" TEXT;

-- 7. Create indexes
CREATE INDEX "persons_firstName_idx" ON "persons"("firstName");
CREATE INDEX "persons_lastName_idx" ON "persons"("lastName");
CREATE INDEX "persons_firstName_lastName_idx" ON "persons"("firstName", "lastName");

CREATE INDEX "relationships_parentId_idx" ON "relationships"("parentId");
CREATE INDEX "relationships_childId_idx" ON "relationships"("childId");
CREATE INDEX "relationships_relationType_idx" ON "relationships"("relationType");

CREATE UNIQUE INDEX "relationships_parentId_childId_relationType_key" ON "relationships"("parentId", "childId", "relationType");

CREATE UNIQUE INDEX "children_personId_key" ON "children"("personId");
CREATE INDEX "children_familyId_idx" ON "children"("familyId");
CREATE INDEX "children_personId_idx" ON "children"("personId");

CREATE UNIQUE INDEX "families_headPersonId_key" ON "families"("headPersonId");
CREATE INDEX "families_userId_idx" ON "families"("userId");
CREATE INDEX "families_status_idx" ON "families"("status");
CREATE INDEX "families_fatherId_idx" ON "families"("fatherId");
CREATE INDEX "families_motherId_idx" ON "families"("motherId");

CREATE UNIQUE INDEX "spouses_personId_key" ON "spouses"("personId");
CREATE INDEX "spouses_familyId_idx" ON "spouses"("familyId");
CREATE INDEX "spouses_personId_idx" ON "spouses"("personId");

-- 8. Add foreign key constraints (after data migration to avoid issues)
-- These will be added in Phase 2 after personId fields are populated

-- =====================================================
-- END OF PHASE 1
-- Next: Run the data migration script (scripts/migrate-data.ts)
-- Then: Run Phase 2 to add constraints and optionally drop old columns
-- =====================================================

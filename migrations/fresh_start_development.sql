-- =====================================================
-- FRESH START MIGRATION - Development Only
-- Drops all existing family-related data and creates new schema
-- =====================================================

-- WARNING: This will DELETE ALL DATA in family-related tables!
-- Only use in development or when you want to start fresh.

BEGIN;

-- 1. Drop existing foreign key constraints first
ALTER TABLE IF EXISTS "children" DROP CONSTRAINT IF EXISTS "children_familyId_fkey";
ALTER TABLE IF EXISTS "spouses" DROP CONSTRAINT IF EXISTS "spouses_familyId_fkey";
ALTER TABLE IF EXISTS "families" DROP CONSTRAINT IF EXISTS "families_userId_fkey";

-- 2. Drop child table (depends on family)
DROP TABLE IF EXISTS "children" CASCADE;

-- 3. Drop spouse table (depends on family)
DROP TABLE IF EXISTS "spouses" CASCADE;

-- 4. Drop family table (depends on user)
DROP TABLE IF EXISTS "families" CASCADE;

-- 5. Now create the new schema

-- Create RelationType enum
CREATE TYPE "RelationType" AS ENUM ('FATHER', 'MOTHER');

-- Create Person table
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

-- Create Relationship table
CREATE TABLE "relationships" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "relationType" "RelationType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "relationships_pkey" PRIMARY KEY ("id")
);

-- Create Family table (new structure)
CREATE TABLE "families" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "fatherFirstName" TEXT,
    "fatherMiddleName" TEXT,
    "fatherLastName" TEXT,
    "motherFirstName" TEXT,
    "motherMiddleName" TEXT,
    "motherLastName" TEXT,
    "headPersonId" TEXT,
    "fatherId" TEXT,
    "motherId" TEXT,
    "education" TEXT,
    "occupationType" TEXT,
    "occupationLocation" TEXT,
    "gender" TEXT NOT NULL,
    "maritalStatus" TEXT NOT NULL,
    "status" "FamilyStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "families_pkey" PRIMARY KEY ("id")
);

-- Create Spouse table (new structure)
CREATE TABLE "spouses" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "fatherFirstName" TEXT,
    "fatherMiddleName" TEXT,
    "fatherLastName" TEXT,
    "motherFirstName" TEXT,
    "motherMiddleName" TEXT,
    "motherLastName" TEXT,
    "personId" TEXT,
    "isDeceased" BOOLEAN NOT NULL DEFAULT false,
    "education" TEXT,
    "occupationType" TEXT,
    "occupationLocation" TEXT,
    "gender" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spouses_pkey" PRIMARY KEY ("id")
);

-- Create Child table (new structure)
CREATE TABLE "children" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "personId" TEXT,
    "gender" TEXT NOT NULL,
    "education" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "children_pkey" PRIMARY KEY ("id")
);

-- 6. Create indexes
CREATE INDEX "persons_firstName_idx" ON "persons"("firstName");
CREATE INDEX "persons_lastName_idx" ON "persons"("lastName");
CREATE INDEX "persons_firstName_lastName_idx" ON "persons"("firstName", "lastName");

CREATE INDEX "relationships_parentId_idx" ON "relationships"("parentId");
CREATE INDEX "relationships_childId_idx" ON "relationships"("childId");
CREATE INDEX "relationships_relationType_idx" ON "relationships"("relationType");

CREATE UNIQUE INDEX "relationships_parentId_childId_relationType_key" ON "relationships"("parentId", "childId", "relationType");

CREATE INDEX "families_userId_idx" ON "families"("userId");
CREATE INDEX "families_headPersonId_idx" ON "families"("headPersonId");
CREATE INDEX "families_fatherId_idx" ON "families"("fatherId");
CREATE INDEX "families_motherId_idx" ON "families"("motherId");
CREATE INDEX "families_status_idx" ON "families"("status");

CREATE INDEX "spouses_familyId_idx" ON "spouses"("familyId");
CREATE INDEX "spouses_personId_idx" ON "spouses"("personId");
CREATE UNIQUE INDEX "spouses_personId_key" ON "spouses"("personId");

CREATE INDEX "children_familyId_idx" ON "children"("familyId");
CREATE INDEX "children_personId_idx" ON "children"("personId");
CREATE UNIQUE INDEX "children_personId_key" ON "children"("personId");

-- 7. Add foreign key constraints
ALTER TABLE "families"
ADD CONSTRAINT "families_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "families"
ADD CONSTRAINT "families_headPersonId_fkey"
FOREIGN KEY ("headPersonId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "families"
ADD CONSTRAINT "families_fatherId_fkey"
FOREIGN KEY ("fatherId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "families"
ADD CONSTRAINT "families_motherId_fkey"
FOREIGN KEY ("motherId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "spouses"
ADD CONSTRAINT "spouses_familyId_fkey"
FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "spouses"
ADD CONSTRAINT "spouses_personId_fkey"
FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "children"
ADD CONSTRAINT "children_familyId_fkey"
FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "children"
ADD CONSTRAINT "children_personId_fkey"
FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "relationships"
ADD CONSTRAINT "relationships_parentId_fkey"
FOREIGN KEY ("parentId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "relationships"
ADD CONSTRAINT "relationships_childId_fkey"
FOREIGN KEY ("childId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;

-- =====================================================
-- MIGRATION COMPLETE
-- Now copy this schema to your main schema.prisma and run:
--   npx prisma generate
-- =====================================================

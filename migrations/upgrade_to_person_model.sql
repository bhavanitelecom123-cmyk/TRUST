-- CreateEnum
CREATE TYPE "RelationType" AS ENUM ('FATHER', 'MOTHER');

-- AlterTable
ALTER TABLE "children" DROP COLUMN "fullName",
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "lastName" TEXT NOT NULL,
ADD COLUMN     "middleName" TEXT,
ADD COLUMN     "personId" TEXT;

-- AlterTable
ALTER TABLE "families" DROP COLUMN "fatherName",
DROP COLUMN "headFullName",
DROP COLUMN "motherName",
ADD COLUMN     "fatherFirstName" TEXT,
ADD COLUMN     "fatherId" TEXT,
ADD COLUMN     "fatherLastName" TEXT,
ADD COLUMN     "fatherMiddleName" TEXT,
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "headPersonId" TEXT,
ADD COLUMN     "lastName" TEXT NOT NULL,
ADD COLUMN     "middleName" TEXT,
ADD COLUMN     "motherFirstName" TEXT,
ADD COLUMN     "motherId" TEXT,
ADD COLUMN     "motherLastName" TEXT,
ADD COLUMN     "motherMiddleName" TEXT;

-- AlterTable
ALTER TABLE "spouses" DROP COLUMN "fatherName",
DROP COLUMN "fullName",
DROP COLUMN "motherName",
ADD COLUMN     "fatherFirstName" TEXT,
ADD COLUMN     "fatherLastName" TEXT,
ADD COLUMN     "fatherMiddleName" TEXT,
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "isDeceased" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastName" TEXT NOT NULL,
ADD COLUMN     "middleName" TEXT,
ADD COLUMN     "motherFirstName" TEXT,
ADD COLUMN     "motherLastName" TEXT,
ADD COLUMN     "motherMiddleName" TEXT,
ADD COLUMN     "personId" TEXT;

-- CreateTable
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

-- CreateTable
CREATE TABLE "relationships" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "relationType" "RelationType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "relationships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "persons_firstName_idx" ON "persons"("firstName");

-- CreateIndex
CREATE INDEX "persons_lastName_idx" ON "persons"("lastName");

-- CreateIndex
CREATE INDEX "persons_firstName_lastName_idx" ON "persons"("firstName", "lastName");

-- CreateIndex
CREATE INDEX "relationships_parentId_idx" ON "relationships"("parentId");

-- CreateIndex
CREATE INDEX "relationships_childId_idx" ON "relationships"("childId");

-- CreateIndex
CREATE INDEX "relationships_relationType_idx" ON "relationships"("relationType");

-- CreateIndex
CREATE UNIQUE INDEX "relationships_parentId_childId_relationType_key" ON "relationships"("parentId", "childId", "relationType");

-- CreateIndex
CREATE UNIQUE INDEX "children_personId_key" ON "children"("personId");

-- CreateIndex
CREATE INDEX "children_familyId_idx" ON "children"("familyId");

-- CreateIndex
CREATE INDEX "children_personId_idx" ON "children"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "families_headPersonId_key" ON "families"("headPersonId");

-- CreateIndex
CREATE INDEX "families_userId_idx" ON "families"("userId");

-- CreateIndex
CREATE INDEX "families_status_idx" ON "families"("status");

-- CreateIndex
CREATE INDEX "families_headPersonId_idx" ON "families"("headPersonId");

-- CreateIndex
CREATE INDEX "families_fatherId_idx" ON "families"("fatherId");

-- CreateIndex
CREATE INDEX "families_motherId_idx" ON "families"("motherId");

-- CreateIndex
CREATE UNIQUE INDEX "spouses_personId_key" ON "spouses"("personId");

-- CreateIndex
CREATE INDEX "spouses_familyId_idx" ON "spouses"("familyId");

-- CreateIndex
CREATE INDEX "spouses_personId_idx" ON "spouses"("personId");

-- AddForeignKey
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_childId_fkey" FOREIGN KEY ("childId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "families" ADD CONSTRAINT "families_headPersonId_fkey" FOREIGN KEY ("headPersonId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "families" ADD CONSTRAINT "families_fatherId_fkey" FOREIGN KEY ("fatherId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "families" ADD CONSTRAINT "families_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spouses" ADD CONSTRAINT "spouses_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "children" ADD CONSTRAINT "children_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

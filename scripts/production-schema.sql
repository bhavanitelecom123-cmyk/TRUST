-- Prisma Schema Migration for Production
-- Generated from schema.prisma
-- Run this SQL in Neon SQL Editor to create all tables

BEGIN;

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'VERIFIER', 'ADMIN');

-- CreateEnum
CREATE TYPE "FamilyStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RelationType" AS ENUM ('FATHER', 'MOTHER');

-- CreateEnum
CREATE TYPE "VerificationType" AS ENUM ('OTP', 'EMAIL_VERIFICATION');

-- CreateTable
CREATE TABLE "users" (
    "id" VARCHAR NOT NULL,
    "email" VARCHAR NOT NULL,
    "password" VARCHAR,
    "googleId" VARCHAR,
    "emailVerified" TIMESTAMP(3),
    "image" VARCHAR,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdBy" VARCHAR,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "persons" (
    "id" VARCHAR NOT NULL,
    "firstName" VARCHAR NOT NULL,
    "middleName" VARCHAR,
    "lastName" VARCHAR NOT NULL,
    "gender" VARCHAR NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "isDeceased" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relationships" (
    "id" VARCHAR NOT NULL,
    "parentId" VARCHAR NOT NULL,
    "childId" VARCHAR NOT NULL,
    "relationType" "RelationType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "families" (
    "id" VARCHAR NOT NULL,
    "userId" VARCHAR NOT NULL,
    "firstName" VARCHAR NOT NULL,
    "middleName" VARCHAR,
    "lastName" VARCHAR NOT NULL,
    "headPersonId" VARCHAR,
    "fatherFirstName" VARCHAR,
    "fatherMiddleName" VARCHAR,
    "fatherLastName" VARCHAR,
    "fatherId" VARCHAR,
    "motherFirstName" VARCHAR,
    "motherMiddleName" VARCHAR,
    "motherLastName" VARCHAR,
    "motherId" VARCHAR,
    "education" VARCHAR,
    "occupationType" VARCHAR,
    "occupationLocation" VARCHAR,
    "gender" VARCHAR NOT NULL,
    "maritalStatus" VARCHAR NOT NULL,
    "status" "FamilyStatus" NOT NULL DEFAULT 'PENDING',
    "createdBy" VARCHAR,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "families_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spouses" (
    "id" VARCHAR NOT NULL,
    "familyId" VARCHAR NOT NULL,
    "firstName" VARCHAR NOT NULL,
    "middleName" VARCHAR,
    "lastName" VARCHAR NOT NULL,
    "fatherFirstName" VARCHAR,
    "fatherMiddleName" VARCHAR,
    "fatherLastName" VARCHAR,
    "motherFirstName" VARCHAR,
    "motherMiddleName" VARCHAR,
    "motherLastName" VARCHAR,
    "personId" VARCHAR,
    "isDeceased" BOOLEAN NOT NULL DEFAULT false,
    "education" VARCHAR,
    "occupationType" VARCHAR,
    "occupationLocation" VARCHAR,
    "gender" VARCHAR NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "children" (
    "id" VARCHAR NOT NULL,
    "familyId" VARCHAR NOT NULL,
    "firstName" VARCHAR NOT NULL,
    "middleName" VARCHAR,
    "lastName" VARCHAR NOT NULL,
    "personId" VARCHAR,
    "gender" VARCHAR NOT NULL,
    "education" VARCHAR,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "children_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" VARCHAR NOT NULL,
    "userId" VARCHAR NOT NULL,
    "title" VARCHAR NOT NULL,
    "description" VARCHAR,
    "imageUrl" VARCHAR,
    "location" VARCHAR,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "commentsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" VARCHAR NOT NULL,
    "postId" VARCHAR NOT NULL,
    "userId" VARCHAR NOT NULL,
    "content" VARCHAR NOT NULL,
    "parentId" VARCHAR,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "likes" (
    "id" VARCHAR NOT NULL,
    "userId" VARCHAR NOT NULL,
    "postId" VARCHAR NOT NULL,

    CONSTRAINT "likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learn_folders" (
    "id" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "description" VARCHAR,
    "parentId" VARCHAR,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdBy" VARCHAR,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learn_folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learn_posts" (
    "id" VARCHAR NOT NULL,
    "title" VARCHAR NOT NULL,
    "content" VARCHAR NOT NULL,
    "folderId" VARCHAR NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" VARCHAR,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learn_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verifications" (
    "id" VARCHAR NOT NULL,
    "email" VARCHAR NOT NULL,
    "otp" VARCHAR,
    "token" VARCHAR,
    "type" "VerificationType" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" VARCHAR NOT NULL,
    "email" VARCHAR NOT NULL,
    "token" VARCHAR NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- CreateIndex
CREATE INDEX "persons_firstName_index" ON "persons"("firstName");

-- CreateIndex
CREATE INDEX "persons_lastName_index" ON "persons"("lastName");

-- CreateIndex
CREATE INDEX "persons_firstName_lastName_index" ON "persons"("firstName", "lastName");

-- CreateIndex
CREATE INDEX "relationships_parentId_index" ON "relationships"("parentId");

-- CreateIndex
CREATE INDEX "relationships_childId_index" ON "relationships"("childId");

-- CreateIndex
CREATE INDEX "relationships_relationType_index" ON "relationships"("relationType");

-- CreateIndex
CREATE UNIQUE INDEX "relationships_parentId_childId_relationType_key" ON "relationships"("parentId", "childId", "relationType");

-- CreateIndex
CREATE INDEX "families_userId_index" ON "families"("userId");

-- CreateIndex
CREATE INDEX "families_status_index" ON "families"("status");

-- CreateIndex
CREATE INDEX "families_headPersonId_index" ON "families"("headPersonId");

-- CreateIndex
CREATE INDEX "families_fatherId_index" ON "families"("fatherId");

-- CreateIndex
CREATE INDEX "families_motherId_index" ON "families"("motherId");

-- CreateIndex
CREATE UNIQUE INDEX "families_userId_key" ON "families"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "families_headPersonId_key" ON "families"("headPersonId");

-- CreateIndex
CREATE INDEX "spouses_familyId_index" ON "spouses"("familyId");

-- CreateIndex
CREATE UNIQUE INDEX "spouses_familyId_key" ON "spouses"("familyId");

-- CreateIndex
CREATE INDEX "spouses_personId_index" ON "spouses"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "spouses_personId_key" ON "spouses"("personId");

-- CreateIndex
CREATE INDEX "children_familyId_index" ON "children"("familyId");

-- CreateIndex
CREATE INDEX "children_personId_index" ON "children"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "children_personId_key" ON "children"("personId");

-- CreateIndex
CREATE INDEX "posts_userId_index" ON "posts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "comments_userId_postId_parentId_key" ON "comments"("userId", "postId", "parentId");

-- CreateIndex
CREATE INDEX "comments_postId_index" ON "comments"("postId");

-- CreateIndex
CREATE INDEX "comments_userId_index" ON "comments"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "likes_userId_postId_key" ON "likes"("userId", "postId");

-- CreateIndex
CREATE INDEX "likes_userId_index" ON "likes"("userId");

-- CreateIndex
CREATE INDEX "likes_postId_index" ON "likes"("postId");

-- CreateIndex
CREATE INDEX "learn_folders_parentId_index" ON "learn_folders"("parentId");

-- CreateIndex
CREATE INDEX "learn_posts_folderId_index" ON "learn_posts"("folderId");

-- CreateIndex
CREATE INDEX "learn_posts_order_index" ON "learn_posts"("order");

-- CreateIndex
CREATE UNIQUE INDEX "email_verifications_token_key" ON "email_verifications"("token");

-- CreateIndex
CREATE INDEX "email_verifications_email_expiresAt_index" ON "email_verifications"("email", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_email_token_expiresAt_index" ON "password_reset_tokens"("email", "token", "expiresAt");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_childId_fkey" FOREIGN KEY ("childId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "families" ADD CONSTRAINT "families_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "families" ADD CONSTRAINT "families_headPersonId_fkey" FOREIGN KEY ("headPersonId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "families" ADD CONSTRAINT "families_fatherId_fkey" FOREIGN KEY ("fatherId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "families" ADD CONSTRAINT "families_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spouses" ADD CONSTRAINT "spouses_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spouses" ADD CONSTRAINT "spouses_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "children" ADD CONSTRAINT "children_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "children" ADD CONSTRAINT "children_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learn_folders" ADD CONSTRAINT "learn_folders_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learn_folders" ADD CONSTRAINT "learn_folders_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "learn_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learn_posts" ADD CONSTRAINT "learn_posts_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "learn_folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learn_posts" ADD CONSTRAINT "learn_posts_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_verifications" ADD CONSTRAINT "email_verifications_email_fkey" FOREIGN KEY ("email") REFERENCES "users"("email") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_email_fkey" FOREIGN KEY ("email") REFERENCES "users"("email") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;

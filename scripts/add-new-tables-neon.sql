-- Add new tables that were missing in the original database
-- Run this after fixing column names

-- CreateEnum if not exists
DO $$ BEGIN
    CREATE TYPE "VerificationType" AS ENUM ('OTP', 'EMAIL_VERIFICATION');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable: email_verifications
CREATE TABLE IF NOT EXISTS "email_verifications" (
    "id" VARCHAR NOT NULL,
    "email" VARCHAR NOT NULL,
    "otp" VARCHAR,
    "token" VARCHAR,
    "type" "VerificationType" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable: password_reset_tokens
CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
    "id" VARCHAR NOT NULL,
    "email" VARCHAR NOT NULL,
    "token" VARCHAR NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE UNIQUE INDEX IF NOT EXISTS "email_verifications_token_key" ON "email_verifications"("token");
CREATE INDEX IF NOT EXISTS "email_verifications_email_expiresAt_index" ON "email_verifications"("email", "expiresAt");
CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_tokens_token_key" ON "password_reset_tokens"("token");
CREATE INDEX IF NOT EXISTS "password_reset_tokens_email_token_expiresAt_index" ON "password_reset_tokens"("email", "token", "expiresAt");

-- AddForeignKey: email_verifications.email -> users.email
ALTER TABLE "email_verifications" ADD CONSTRAINT "email_verifications_email_fkey"
    FOREIGN KEY ("email") REFERENCES "users"("email")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: password_reset_tokens.email -> users.email
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_email_fkey"
    FOREIGN KEY ("email") REFERENCES "users"("email")
    ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;

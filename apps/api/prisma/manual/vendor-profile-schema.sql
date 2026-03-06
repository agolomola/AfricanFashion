-- Vendor profile governance schema patch
-- Safe to run multiple times.

DO $$ BEGIN
  CREATE TYPE "VendorProfileStatus" AS ENUM ('INCOMPLETE', 'SUBMITTED', 'APPROVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "FabricSellerProfile"
  ADD COLUMN IF NOT EXISTS "profileStatus" "VendorProfileStatus" NOT NULL DEFAULT 'INCOMPLETE',
  ADD COLUMN IF NOT EXISTS "profileData" JSONB,
  ADD COLUMN IF NOT EXISTS "profileSubmittedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "profileReviewedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "profileReviewNotes" TEXT;

ALTER TABLE "DesignerProfile"
  ADD COLUMN IF NOT EXISTS "profileStatus" "VendorProfileStatus" NOT NULL DEFAULT 'INCOMPLETE',
  ADD COLUMN IF NOT EXISTS "profileData" JSONB,
  ADD COLUMN IF NOT EXISTS "profileSubmittedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "profileReviewedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "profileReviewNotes" TEXT;

CREATE TABLE IF NOT EXISTS "VendorProfileField" (
  "id" TEXT PRIMARY KEY,
  "role" "UserRole" NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "fieldType" TEXT NOT NULL,
  "placeholder" TEXT,
  "helpText" TEXT,
  "required" BOOLEAN NOT NULL DEFAULT FALSE,
  "options" JSONB,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdById" TEXT,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "VendorProfileField_role_key_key"
  ON "VendorProfileField" ("role", "key");

CREATE INDEX IF NOT EXISTS "VendorProfileField_role_isActive_sortOrder_idx"
  ON "VendorProfileField" ("role", "isActive", "sortOrder");

-- Run this in Railway SQL editor if you see P2021 for FeaturedProduct.
-- It safely creates the missing homepage featured table and indexes.

BEGIN;

CREATE TABLE IF NOT EXISTS "FeaturedProduct" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "productType" TEXT NOT NULL,
  "section" TEXT NOT NULL DEFAULT 'FEATURED_DESIGNS',
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "customTitle" TEXT,
  "customDescription" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FeaturedProduct_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FeaturedProduct_productId_productType_section_key"
  ON "FeaturedProduct" ("productId", "productType", "section");

CREATE INDEX IF NOT EXISTS "FeaturedProduct_section_idx"
  ON "FeaturedProduct" ("section");

CREATE INDEX IF NOT EXISTS "FeaturedProduct_isActive_idx"
  ON "FeaturedProduct" ("isActive");

CREATE INDEX IF NOT EXISTS "FeaturedProduct_displayOrder_idx"
  ON "FeaturedProduct" ("displayOrder");

-- Optional: seed featured rows from approved/available products
INSERT INTO "FeaturedProduct"
  ("id", "productId", "productType", "section", "displayOrder", "isActive", "createdAt", "updatedAt")
SELECT
  md5(random()::text || clock_timestamp()::text),
  d.id,
  'DESIGN',
  'FEATURED_DESIGNS',
  row_number() OVER (ORDER BY d."createdAt" DESC),
  true,
  NOW(),
  NOW()
FROM "Design" d
WHERE d."status" = 'APPROVED' AND d."isAvailable" = true
LIMIT 10
ON CONFLICT ("productId", "productType", "section")
DO UPDATE SET
  "displayOrder" = EXCLUDED."displayOrder",
  "isActive" = true,
  "updatedAt" = NOW();

INSERT INTO "FeaturedProduct"
  ("id", "productId", "productType", "section", "displayOrder", "isActive", "createdAt", "updatedAt")
SELECT
  md5(random()::text || clock_timestamp()::text),
  f.id,
  'FABRIC',
  'FEATURED_FABRICS',
  row_number() OVER (ORDER BY f."createdAt" DESC),
  true,
  NOW(),
  NOW()
FROM "Fabric" f
WHERE f."status" = 'APPROVED' AND f."isAvailable" = true
LIMIT 10
ON CONFLICT ("productId", "productType", "section")
DO UPDATE SET
  "displayOrder" = EXCLUDED."displayOrder",
  "isActive" = true,
  "updatedAt" = NOW();

INSERT INTO "FeaturedProduct"
  ("id", "productId", "productType", "section", "displayOrder", "isActive", "createdAt", "updatedAt")
SELECT
  md5(random()::text || clock_timestamp()::text),
  r.id,
  'READY_TO_WEAR',
  'FEATURED_READY_TO_WEAR',
  row_number() OVER (ORDER BY r."createdAt" DESC),
  true,
  NOW(),
  NOW()
FROM "ReadyToWear" r
WHERE r."status" = 'APPROVED' AND r."isAvailable" = true
LIMIT 10
ON CONFLICT ("productId", "productType", "section")
DO UPDATE SET
  "displayOrder" = EXCLUDED."displayOrder",
  "isActive" = true,
  "updatedAt" = NOW();

COMMIT;


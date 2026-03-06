-- Fix FeaturedProduct schema mismatches causing featured-toggle errors.
-- Safe to run multiple times.

DO $$ BEGIN
  CREATE TYPE "FeaturedSection" AS ENUM (
    'FEATURED_DESIGNS',
    'FEATURED_FABRICS',
    'FEATURED_READY_TO_WEAR',
    'TRENDING_NOW',
    'NEW_ARRIVALS'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'FeaturedProduct'
      AND column_name = 'productType'
      AND udt_name = 'text'
  ) THEN
    ALTER TABLE "FeaturedProduct"
    ALTER COLUMN "productType" TYPE "ProductType"
    USING ("productType"::"ProductType");
  END IF;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN invalid_text_representation THEN NULL;
  WHEN datatype_mismatch THEN NULL;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'FeaturedProduct'
      AND column_name = 'section'
      AND udt_name = 'text'
  ) THEN
    ALTER TABLE "FeaturedProduct"
    ALTER COLUMN "section" TYPE "FeaturedSection"
    USING ("section"::"FeaturedSection");
  END IF;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN invalid_text_representation THEN NULL;
  WHEN datatype_mismatch THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "FeaturedProduct_productId_productType_section_key"
ON "FeaturedProduct" ("productId", "productType", "section");

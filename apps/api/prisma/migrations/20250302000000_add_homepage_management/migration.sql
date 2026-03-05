-- Create HeroSlide table
CREATE TABLE "HeroSlide" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "ctaText" TEXT,
    "ctaLink" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HeroSlide_pkey" PRIMARY KEY ("id")
);

-- Create FeaturedProduct table
CREATE TABLE "FeaturedProduct" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "section" TEXT NOT NULL DEFAULT 'FEATURED_DESIGNS',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "customTitle" TEXT,
    "customDescription" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeaturedProduct_pkey" PRIMARY KEY ("id")
);

-- Create unique index for FeaturedProduct
CREATE UNIQUE INDEX "FeaturedProduct_productId_productType_section_key" ON "FeaturedProduct"("productId", "productType", "section");

-- Create indexes
CREATE INDEX "HeroSlide_isActive_idx" ON "HeroSlide"("isActive");
CREATE INDEX "HeroSlide_displayOrder_idx" ON "HeroSlide"("displayOrder");
CREATE INDEX "FeaturedProduct_section_idx" ON "FeaturedProduct"("section");
CREATE INDEX "FeaturedProduct_isActive_idx" ON "FeaturedProduct"("isActive");
CREATE INDEX "FeaturedProduct_displayOrder_idx" ON "FeaturedProduct"("displayOrder");

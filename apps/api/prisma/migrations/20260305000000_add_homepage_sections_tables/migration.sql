-- Create homepage section tables used by admin frontpage controls
CREATE TABLE IF NOT EXISTS "CountryMarquee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "flag" TEXT NOT NULL,
    "fabrics" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CountryMarquee_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "HowItWorksStep" (
    "id" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HowItWorksStep_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ShopCategory" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "ctaText" TEXT NOT NULL,
    "ctaLink" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ShopCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DesignerSpotlight" (
    "id" TEXT NOT NULL,
    "designerId" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DesignerSpotlight_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "HeritageSection" (
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
    CONSTRAINT "HeritageSection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Testimonial" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "initials" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "avatar" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FooterContent" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL DEFAULT 'AfriFashion',
    "tagline" TEXT NOT NULL DEFAULT 'Wear the story of Africa.',
    "email" TEXT NOT NULL DEFAULT 'hello@afrifashion.com',
    "phone" TEXT NOT NULL DEFAULT '+1 (555) 123-4567',
    "address" TEXT NOT NULL DEFAULT 'Lagos, Nigeria',
    "socialLinks" TEXT,
    "copyright" TEXT NOT NULL DEFAULT '© 2026 AfriFashion. All rights reserved.',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FooterContent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "HowItWorksStep_stepNumber_key" ON "HowItWorksStep"("stepNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "ShopCategory_key_key" ON "ShopCategory"("key");

CREATE INDEX IF NOT EXISTS "CountryMarquee_isActive_idx" ON "CountryMarquee"("isActive");
CREATE INDEX IF NOT EXISTS "CountryMarquee_displayOrder_idx" ON "CountryMarquee"("displayOrder");
CREATE INDEX IF NOT EXISTS "HowItWorksStep_isActive_idx" ON "HowItWorksStep"("isActive");
CREATE INDEX IF NOT EXISTS "HowItWorksStep_displayOrder_idx" ON "HowItWorksStep"("displayOrder");
CREATE INDEX IF NOT EXISTS "ShopCategory_isActive_idx" ON "ShopCategory"("isActive");
CREATE INDEX IF NOT EXISTS "ShopCategory_displayOrder_idx" ON "ShopCategory"("displayOrder");
CREATE INDEX IF NOT EXISTS "DesignerSpotlight_isActive_idx" ON "DesignerSpotlight"("isActive");
CREATE INDEX IF NOT EXISTS "DesignerSpotlight_displayOrder_idx" ON "DesignerSpotlight"("displayOrder");
CREATE INDEX IF NOT EXISTS "HeritageSection_isActive_idx" ON "HeritageSection"("isActive");
CREATE INDEX IF NOT EXISTS "HeritageSection_displayOrder_idx" ON "HeritageSection"("displayOrder");
CREATE INDEX IF NOT EXISTS "Testimonial_isActive_idx" ON "Testimonial"("isActive");
CREATE INDEX IF NOT EXISTS "Testimonial_displayOrder_idx" ON "Testimonial"("displayOrder");

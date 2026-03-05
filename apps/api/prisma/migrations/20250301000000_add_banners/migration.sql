-- Create banners table
CREATE TABLE "Banner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "title" TEXT,
    "subtitle" TEXT,
    "ctaText" TEXT,
    "ctaLink" TEXT,
    "images" TEXT[] NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);

-- Create index on section for faster queries
CREATE INDEX "Banner_section_idx" ON "Banner"("section");

-- Create index on isActive for filtering
CREATE INDEX "Banner_isActive_idx" ON "Banner"("isActive");

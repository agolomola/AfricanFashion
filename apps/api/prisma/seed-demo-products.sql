-- Railway/PostgreSQL direct seed script (idempotent)
-- Creates/updates:
--   - 2 demo fabric sellers + profiles
--   - 2 demo designers + profiles
--   - 10 demo fabrics
--   - 10 demo designs
--   - 10 demo ready-to-wear products
--   - featured rows for homepage sections
--
-- Demo login password for created users: Demo123!
-- Bcrypt hash used below: $2a$10$Vx1es8iJEMz/og96T4L9Uu5t0stTNSmom7un3qqorjsWmhbUCfRdO

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Base reference data (categories + materials)
-- ---------------------------------------------------------------------------

INSERT INTO "ProductCategory"
  ("name", "slug", "description", "isActive", "sortOrder", "createdAt", "updatedAt")
VALUES
  ('Dresses', 'dresses', 'Dresses demo category', true, 1, NOW(), NOW()),
  ('Two-Piece Sets', 'two-piece-sets', 'Two-Piece Sets demo category', true, 2, NOW(), NOW()),
  ('Kaftans', 'kaftans', 'Kaftans demo category', true, 3, NOW(), NOW()),
  ('Skirts', 'skirts', 'Skirts demo category', true, 4, NOW(), NOW()),
  ('Accessories', 'accessories', 'Accessories demo category', true, 5, NOW(), NOW())
ON CONFLICT ("slug")
DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "isActive" = true,
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = NOW();

INSERT INTO "MaterialType"
  ("name", "slug", "description", "isActive", "createdAt", "updatedAt")
VALUES
  ('Kente', 'kente', 'Kente demo material', true, NOW(), NOW()),
  ('Ankara', 'ankara', 'Ankara demo material', true, NOW(), NOW()),
  ('Kitenge', 'kitenge', 'Kitenge demo material', true, NOW(), NOW()),
  ('Batik', 'batik', 'Batik demo material', true, NOW(), NOW()),
  ('Aso Oke', 'aso-oke', 'Aso Oke demo material', true, NOW(), NOW()),
  ('Cotton', 'cotton', 'Cotton demo material', true, NOW(), NOW())
ON CONFLICT ("slug")
DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "isActive" = true,
  "updatedAt" = NOW();

-- ---------------------------------------------------------------------------
-- 2) Demo users + role profiles
-- ---------------------------------------------------------------------------

INSERT INTO "User"
  ("email", "password", "firstName", "lastName", "phone", "role", "status", "createdAt", "updatedAt")
VALUES
  ('demo.seller.ghana@africanfashion.com', '$2a$10$Vx1es8iJEMz/og96T4L9Uu5t0stTNSmom7un3qqorjsWmhbUCfRdO', 'Kojo', 'Mensah', '+233201112223', 'FABRIC_SELLER'::"UserRole", 'ACTIVE'::"UserStatus", NOW(), NOW()),
  ('demo.seller.nigeria@africanfashion.com', '$2a$10$Vx1es8iJEMz/og96T4L9Uu5t0stTNSmom7un3qqorjsWmhbUCfRdO', 'Adaeze', 'Nwosu', '+2348011122233', 'FABRIC_SELLER'::"UserRole", 'ACTIVE'::"UserStatus", NOW(), NOW()),
  ('demo.designer.ghana@africanfashion.com', '$2a$10$Vx1es8iJEMz/og96T4L9Uu5t0stTNSmom7un3qqorjsWmhbUCfRdO', 'Ama', 'Boateng', '+233244440001', 'FASHION_DESIGNER'::"UserRole", 'ACTIVE'::"UserStatus", NOW(), NOW()),
  ('demo.designer.kenya@africanfashion.com', '$2a$10$Vx1es8iJEMz/og96T4L9Uu5t0stTNSmom7un3qqorjsWmhbUCfRdO', 'Nia', 'Kamau', '+254711223344', 'FASHION_DESIGNER'::"UserRole", 'ACTIVE'::"UserStatus", NOW(), NOW())
ON CONFLICT ("email")
DO UPDATE SET
  "password" = EXCLUDED."password",
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName",
  "phone" = EXCLUDED."phone",
  "role" = EXCLUDED."role",
  "status" = EXCLUDED."status",
  "updatedAt" = NOW();

INSERT INTO "FabricSellerProfile"
  ("userId", "businessName", "businessEmail", "businessPhone", "country", "city", "address", "isVerified", "createdAt", "updatedAt")
SELECT
  u.id,
  v.business_name,
  v.business_email,
  v.business_phone,
  v.country,
  v.city,
  v.address,
  true,
  NOW(),
  NOW()
FROM (
  VALUES
    ('demo.seller.ghana@africanfashion.com', 'Demo Gold Coast Fabrics', 'goldcoast.demo@africanfashion.com', '+233201112223', 'Ghana', 'Accra', '28 Spintex Road, Accra'),
    ('demo.seller.nigeria@africanfashion.com', 'Demo Naija Prints', 'naijaprints.demo@africanfashion.com', '+2348011122233', 'Nigeria', 'Lagos', '17 Admiralty Way, Lagos')
) AS v(email, business_name, business_email, business_phone, country, city, address)
JOIN "User" u ON u.email = v.email
ON CONFLICT ("userId")
DO UPDATE SET
  "businessName" = EXCLUDED."businessName",
  "businessEmail" = EXCLUDED."businessEmail",
  "businessPhone" = EXCLUDED."businessPhone",
  "country" = EXCLUDED."country",
  "city" = EXCLUDED."city",
  "address" = EXCLUDED."address",
  "isVerified" = true,
  "updatedAt" = NOW();

INSERT INTO "DesignerProfile"
  ("userId", "businessName", "businessEmail", "businessPhone", "bio", "country", "city", "address", "isVerified", "createdAt", "updatedAt")
SELECT
  u.id,
  v.business_name,
  v.business_email,
  v.business_phone,
  v.bio,
  v.country,
  v.city,
  v.address,
  true,
  NOW(),
  NOW()
FROM (
  VALUES
    ('demo.designer.ghana@africanfashion.com', 'Demo Accra Atelier', 'atelier.demo@africanfashion.com', '+233244440001', 'Demo atelier focused on contemporary African tailoring.', 'Ghana', 'Accra', '11 East Legon, Accra'),
    ('demo.designer.kenya@africanfashion.com', 'Demo Nairobi Studio', 'nairobi.demo@africanfashion.com', '+254711223344', 'Demo studio blending East African textiles with modern cuts.', 'Kenya', 'Nairobi', '5 Westlands Avenue, Nairobi')
) AS v(email, business_name, business_email, business_phone, bio, country, city, address)
JOIN "User" u ON u.email = v.email
ON CONFLICT ("userId")
DO UPDATE SET
  "businessName" = EXCLUDED."businessName",
  "businessEmail" = EXCLUDED."businessEmail",
  "businessPhone" = EXCLUDED."businessPhone",
  "bio" = EXCLUDED."bio",
  "country" = EXCLUDED."country",
  "city" = EXCLUDED."city",
  "address" = EXCLUDED."address",
  "isVerified" = true,
  "updatedAt" = NOW();

-- ---------------------------------------------------------------------------
-- 3) Clean existing demo rows (safe: only records named "Demo ...")
-- ---------------------------------------------------------------------------

DELETE FROM "FeaturedProduct"
WHERE ("productType" = 'FABRIC'::"ProductType" AND "productId" IN (SELECT id FROM "Fabric" WHERE "name" LIKE 'Demo Fabric %'))
   OR ("productType" = 'DESIGN'::"ProductType" AND "productId" IN (SELECT id FROM "Design" WHERE "name" LIKE 'Demo Design %'))
   OR ("productType" = 'READY_TO_WEAR'::"ProductType" AND "productId" IN (SELECT id FROM "ReadyToWear" WHERE "name" LIKE 'Demo Ready To Wear %'));

DELETE FROM "Fabric" WHERE "name" LIKE 'Demo Fabric %';
DELETE FROM "Design" WHERE "name" LIKE 'Demo Design %';
DELETE FROM "ReadyToWear" WHERE "name" LIKE 'Demo Ready To Wear %';

-- ---------------------------------------------------------------------------
-- 4) Insert 10 demo fabrics
-- ---------------------------------------------------------------------------

WITH fabric_rows AS (
  SELECT *
  FROM (
    VALUES
      ('Demo Fabric 1 - Kente',   'demo.seller.ghana@africanfashion.com',   'kente',   20.00::numeric, 24.00::numeric, 2, 64),
      ('Demo Fabric 2 - Ankara',  'demo.seller.nigeria@africanfashion.com', 'ankara',  22.00::numeric, 26.40::numeric, 2, 68),
      ('Demo Fabric 3 - Kitenge', 'demo.seller.ghana@africanfashion.com',   'kitenge', 24.00::numeric, 28.80::numeric, 2, 72),
      ('Demo Fabric 4 - Batik',   'demo.seller.nigeria@africanfashion.com', 'batik',   26.00::numeric, 31.20::numeric, 2, 76),
      ('Demo Fabric 5 - Aso Oke', 'demo.seller.ghana@africanfashion.com',   'aso-oke', 28.00::numeric, 33.60::numeric, 2, 80),
      ('Demo Fabric 6 - Cotton',  'demo.seller.nigeria@africanfashion.com', 'cotton',  30.00::numeric, 36.00::numeric, 2, 84),
      ('Demo Fabric 7 - Kente',   'demo.seller.ghana@africanfashion.com',   'kente',   32.00::numeric, 38.40::numeric, 2, 88),
      ('Demo Fabric 8 - Ankara',  'demo.seller.nigeria@africanfashion.com', 'ankara',  34.00::numeric, 40.80::numeric, 2, 92),
      ('Demo Fabric 9 - Kitenge', 'demo.seller.ghana@africanfashion.com',   'kitenge', 36.00::numeric, 43.20::numeric, 2, 96),
      ('Demo Fabric 10 - Batik',  'demo.seller.nigeria@africanfashion.com', 'batik',   38.00::numeric, 45.60::numeric, 2, 100)
  ) AS t(name, seller_email, material_slug, seller_price, final_price, min_yards, stock_yards)
)
INSERT INTO "Fabric"
  ("sellerId", "name", "description", "materialTypeId", "sellerPrice", "finalPrice", "minYards", "stockYards", "status", "isAvailable", "createdAt", "updatedAt")
SELECT
  sp.id,
  fr.name,
  fr.name || ' demo listing for homepage and storefront testing.',
  mt.id,
  fr.seller_price,
  fr.final_price,
  fr.min_yards,
  fr.stock_yards,
  'APPROVED'::"ProductStatus",
  true,
  NOW(),
  NOW()
FROM fabric_rows fr
JOIN "User" u ON u.email = fr.seller_email
JOIN "FabricSellerProfile" sp ON sp."userId" = u.id
JOIN "MaterialType" mt ON mt.slug = fr.material_slug;

INSERT INTO "FabricImage"
  ("fabricId", "url", "alt", "sortOrder", "createdAt")
SELECT
  f.id,
  'https://picsum.photos/seed/' ||
    regexp_replace(lower(f."name"), '[^a-z0-9]+', '-', 'g') ||
    '-img-' || gs::text || '/900/1200' AS url,
  f."name" || ' image ' || gs::text AS alt,
  gs - 1,
  NOW()
FROM "Fabric" f
CROSS JOIN generate_series(1, 3) gs
WHERE f."name" LIKE 'Demo Fabric %';

-- ---------------------------------------------------------------------------
-- 5) Insert 10 demo designs
-- ---------------------------------------------------------------------------

WITH design_rows AS (
  SELECT *
  FROM (
    VALUES
      ('Demo Design 1 - Dresses',         'demo.designer.ghana@africanfashion.com', 'dresses',         'kente',   103.00::numeric, 125.66::numeric),
      ('Demo Design 2 - Two-Piece Sets',  'demo.designer.kenya@africanfashion.com', 'two-piece-sets',  'ankara',  111.00::numeric, 135.42::numeric),
      ('Demo Design 3 - Kaftans',         'demo.designer.ghana@africanfashion.com', 'kaftans',         'kitenge', 119.00::numeric, 145.18::numeric),
      ('Demo Design 4 - Skirts',          'demo.designer.kenya@africanfashion.com', 'skirts',          'batik',   127.00::numeric, 154.94::numeric),
      ('Demo Design 5 - Accessories',     'demo.designer.ghana@africanfashion.com', 'accessories',     'aso-oke', 135.00::numeric, 164.70::numeric),
      ('Demo Design 6 - Dresses',         'demo.designer.kenya@africanfashion.com', 'dresses',         'cotton',  143.00::numeric, 174.46::numeric),
      ('Demo Design 7 - Two-Piece Sets',  'demo.designer.ghana@africanfashion.com', 'two-piece-sets',  'kente',   151.00::numeric, 184.22::numeric),
      ('Demo Design 8 - Kaftans',         'demo.designer.kenya@africanfashion.com', 'kaftans',         'ankara',  159.00::numeric, 193.98::numeric),
      ('Demo Design 9 - Skirts',          'demo.designer.ghana@africanfashion.com', 'skirts',          'kitenge', 167.00::numeric, 203.74::numeric),
      ('Demo Design 10 - Accessories',    'demo.designer.kenya@africanfashion.com', 'accessories',     'batik',   175.00::numeric, 213.50::numeric)
  ) AS t(name, designer_email, category_slug, material_slug, base_price, final_price)
)
INSERT INTO "Design"
  ("designerId", "name", "description", "categoryId", "materialTypeId", "basePrice", "finalPrice", "status", "isAvailable", "createdAt", "updatedAt")
SELECT
  dp.id,
  dr.name,
  dr.name || ' demo custom design used for homepage population.',
  pc.id,
  mt.id,
  dr.base_price,
  dr.final_price,
  'APPROVED'::"ProductStatus",
  true,
  NOW(),
  NOW()
FROM design_rows dr
JOIN "User" u ON u.email = dr.designer_email
JOIN "DesignerProfile" dp ON dp."userId" = u.id
JOIN "ProductCategory" pc ON pc.slug = dr.category_slug
JOIN "MaterialType" mt ON mt.slug = dr.material_slug;

INSERT INTO "DesignImage"
  ("designId", "url", "alt", "sortOrder", "createdAt")
SELECT
  d.id,
  'https://picsum.photos/seed/' ||
    regexp_replace(lower(d."name"), '[^a-z0-9]+', '-', 'g') ||
    '-img-' || gs::text || '/900/1200' AS url,
  d."name" || ' image ' || gs::text AS alt,
  gs - 1,
  NOW()
FROM "Design" d
CROSS JOIN generate_series(1, 4) gs
WHERE d."name" LIKE 'Demo Design %';

WITH d AS (
  SELECT id, row_number() OVER (ORDER BY id) AS rn
  FROM "Design"
  WHERE "name" LIKE 'Demo Design %'
),
f AS (
  SELECT id, row_number() OVER (ORDER BY id) AS rn
  FROM "Fabric"
  WHERE "name" LIKE 'Demo Fabric %'
)
INSERT INTO "DesignFabric" ("designId", "fabricId", "yardsNeeded")
SELECT d.id, f1.id, 4
FROM d
JOIN f f1 ON f1.rn = ((d.rn - 1) % 10) + 1
UNION ALL
SELECT d.id, f2.id, 5
FROM d
JOIN f f2 ON f2.rn = (d.rn % 10) + 1
ON CONFLICT ("designId", "fabricId")
DO UPDATE SET "yardsNeeded" = EXCLUDED."yardsNeeded";

INSERT INTO "DesignMeasurementVariable"
  ("designId", "name", "unit", "isRequired", "instructions", "sortOrder", "createdAt")
SELECT
  d.id,
  m.name,
  'cm',
  true,
  m.instructions,
  m.sort_order,
  NOW()
FROM "Design" d
CROSS JOIN (
  VALUES
    ('Bust', 'Measure around the fullest part of the bust.', 0),
    ('Waist', 'Measure around the natural waistline.', 1),
    ('Hip', 'Measure around the fullest part of the hips.', 2),
    ('Shoulder Width', 'Measure shoulder tip to shoulder tip.', 3)
) AS m(name, instructions, sort_order)
WHERE d."name" LIKE 'Demo Design %';

-- ---------------------------------------------------------------------------
-- 6) Insert 10 demo ready-to-wear products
-- ---------------------------------------------------------------------------

WITH rtw_rows AS (
  SELECT *
  FROM (
    VALUES
      ('Demo Ready To Wear 1 - Dresses',        'demo.designer.ghana@africanfashion.com', 'dresses',        82.00::numeric),
      ('Demo Ready To Wear 2 - Two-Piece Sets', 'demo.designer.kenya@africanfashion.com', 'two-piece-sets', 89.00::numeric),
      ('Demo Ready To Wear 3 - Kaftans',        'demo.designer.ghana@africanfashion.com', 'kaftans',        96.00::numeric),
      ('Demo Ready To Wear 4 - Skirts',         'demo.designer.kenya@africanfashion.com', 'skirts',         103.00::numeric),
      ('Demo Ready To Wear 5 - Accessories',    'demo.designer.ghana@africanfashion.com', 'accessories',    110.00::numeric),
      ('Demo Ready To Wear 6 - Dresses',        'demo.designer.kenya@africanfashion.com', 'dresses',        117.00::numeric),
      ('Demo Ready To Wear 7 - Two-Piece Sets', 'demo.designer.ghana@africanfashion.com', 'two-piece-sets', 124.00::numeric),
      ('Demo Ready To Wear 8 - Kaftans',        'demo.designer.kenya@africanfashion.com', 'kaftans',        131.00::numeric),
      ('Demo Ready To Wear 9 - Skirts',         'demo.designer.ghana@africanfashion.com', 'skirts',         138.00::numeric),
      ('Demo Ready To Wear 10 - Accessories',   'demo.designer.kenya@africanfashion.com', 'accessories',    145.00::numeric)
  ) AS t(name, designer_email, category_slug, base_price)
)
INSERT INTO "ReadyToWear"
  ("designerId", "name", "description", "categoryId", "basePrice", "status", "isAvailable", "createdAt", "updatedAt")
SELECT
  dp.id,
  rr.name,
  rr.name || ' demo ready-to-wear item for storefront testing.',
  pc.id,
  rr.base_price,
  'APPROVED'::"ProductStatus",
  true,
  NOW(),
  NOW()
FROM rtw_rows rr
JOIN "User" u ON u.email = rr.designer_email
JOIN "DesignerProfile" dp ON dp."userId" = u.id
JOIN "ProductCategory" pc ON pc.slug = rr.category_slug;

INSERT INTO "ReadyToWearImage"
  ("readyToWearId", "url", "alt", "sortOrder", "createdAt")
SELECT
  r.id,
  'https://picsum.photos/seed/' ||
    regexp_replace(lower(r."name"), '[^a-z0-9]+', '-', 'g') ||
    '-img-' || gs::text || '/900/1200' AS url,
  r."name" || ' image ' || gs::text AS alt,
  gs - 1,
  NOW()
FROM "ReadyToWear" r
CROSS JOIN generate_series(1, 4) gs
WHERE r."name" LIKE 'Demo Ready To Wear %';

INSERT INTO "ReadyToWearSize"
  ("readyToWearId", "size", "price", "stock", "measurements")
SELECT
  r.id,
  s.size,
  r."basePrice" + s.extra_price,
  s.stock,
  s.measurements::jsonb
FROM "ReadyToWear" r
CROSS JOIN (
  VALUES
    ('S', 0.00::numeric, 10, '{"chest":90,"waist":74,"hip":96}'),
    ('M', 5.00::numeric, 12, '{"chest":96,"waist":80,"hip":102}'),
    ('L', 10.00::numeric, 8, '{"chest":102,"waist":86,"hip":108}')
) AS s(size, extra_price, stock, measurements)
WHERE r."name" LIKE 'Demo Ready To Wear %'
ON CONFLICT ("readyToWearId", "size")
DO UPDATE SET
  "price" = EXCLUDED."price",
  "stock" = EXCLUDED."stock",
  "measurements" = EXCLUDED."measurements";

-- ---------------------------------------------------------------------------
-- 7) Featured rows (homepage)
-- ---------------------------------------------------------------------------

INSERT INTO "FeaturedProduct"
  ("productId", "productType", "section", "displayOrder", "isActive", "createdAt", "updatedAt")
SELECT
  d.id,
  'DESIGN'::"ProductType",
  'FEATURED_DESIGNS'::"FeaturedSection",
  row_number() OVER (ORDER BY d."createdAt", d.id),
  true,
  NOW(),
  NOW()
FROM "Design" d
WHERE d."name" LIKE 'Demo Design %'
ON CONFLICT ("productId", "productType", "section")
DO UPDATE SET
  "displayOrder" = EXCLUDED."displayOrder",
  "isActive" = true,
  "updatedAt" = NOW();

INSERT INTO "FeaturedProduct"
  ("productId", "productType", "section", "displayOrder", "isActive", "createdAt", "updatedAt")
SELECT
  f.id,
  'FABRIC'::"ProductType",
  'FEATURED_FABRICS'::"FeaturedSection",
  row_number() OVER (ORDER BY f."createdAt", f.id),
  true,
  NOW(),
  NOW()
FROM "Fabric" f
WHERE f."name" LIKE 'Demo Fabric %'
ON CONFLICT ("productId", "productType", "section")
DO UPDATE SET
  "displayOrder" = EXCLUDED."displayOrder",
  "isActive" = true,
  "updatedAt" = NOW();

INSERT INTO "FeaturedProduct"
  ("productId", "productType", "section", "displayOrder", "isActive", "createdAt", "updatedAt")
SELECT
  r.id,
  'READY_TO_WEAR'::"ProductType",
  'FEATURED_READY_TO_WEAR'::"FeaturedSection",
  row_number() OVER (ORDER BY r."createdAt", r.id),
  true,
  NOW(),
  NOW()
FROM "ReadyToWear" r
WHERE r."name" LIKE 'Demo Ready To Wear %'
ON CONFLICT ("productId", "productType", "section")
DO UPDATE SET
  "displayOrder" = EXCLUDED."displayOrder",
  "isActive" = true,
  "updatedAt" = NOW();

COMMIT;


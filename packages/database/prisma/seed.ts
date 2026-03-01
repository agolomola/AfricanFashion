import { PrismaClient, UserRole, UserStatus, ProductStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Clear existing data
  await prisma.$transaction([
    prisma.review.deleteMany(),
    prisma.activityLog.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.orderTimeline.deleteMany(),
    prisma.readyToWearOrderItem.deleteMany(),
    prisma.fabricOrderItem.deleteMany(),
    prisma.designOrderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.virtualTryOn.deleteMany(),
    prisma.customerMeasurement.deleteMany(),
    prisma.address.deleteMany(),
    prisma.customerProfile.deleteMany(),
    prisma.readyToWearSize.deleteMany(),
    prisma.readyToWearImage.deleteMany(),
    prisma.readyToWear.deleteMany(),
    prisma.designMeasurementVariable.deleteMany(),
    prisma.designImage.deleteMany(),
    prisma.designFabric.deleteMany(),
    prisma.design.deleteMany(),
    prisma.fabricImage.deleteMany(),
    prisma.fabric.deleteMany(),
    prisma.pricingRule.deleteMany(),
    prisma.productCategory.deleteMany(),
    prisma.materialType.deleteMany(),
    prisma.qaProfile.deleteMany(),
    prisma.adminProfile.deleteMany(),
    prisma.designerProfile.deleteMany(),
    prisma.fabricSellerProfile.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  console.log('✅ Cleared existing data\n');

  // Hash password for all users
  const hashedPassword = await bcrypt.hash('password123', 10);

  // ==================== CREATE ADMIN USER ====================
  console.log('👤 Creating admin user...');
  const admin = await prisma.user.create({
    data: {
      email: 'admin@africanfashion.com',
      password: hashedPassword,
      firstName: 'System',
      lastName: 'Administrator',
      role: UserRole.ADMINISTRATOR,
      status: UserStatus.ACTIVE,
      adminProfile: {
        create: {
          permissions: JSON.stringify(['ALL']),
        },
      },
    },
  });
  console.log(`✅ Admin created: ${admin.email}\n`);

  // ==================== CREATE PRODUCT CATEGORIES ====================
  console.log('📂 Creating product categories...');
  const categories = await prisma.$transaction([
    prisma.productCategory.create({
      data: { name: 'Dresses', slug: 'dresses', description: 'Beautiful African dresses', sortOrder: 1 },
    }),
    prisma.productCategory.create({
      data: { name: 'Two-Piece Sets', slug: 'two-piece-sets', description: 'Matching top and bottom sets', sortOrder: 2 },
    }),
    prisma.productCategory.create({
      data: { name: 'Kaftans', slug: 'kaftans', description: 'Elegant flowing kaftans', sortOrder: 3 },
    }),
    prisma.productCategory.create({
      data: { name: 'Skirts', slug: 'skirts', description: 'Stylish African skirts', sortOrder: 4 },
    }),
    prisma.productCategory.create({
      data: { name: 'Accessories', slug: 'accessories', description: 'Scarves, bags, and more', sortOrder: 5 },
    }),
  ]);
  console.log(`✅ Created ${categories.length} product categories\n`);

  // ==================== CREATE MATERIAL TYPES ====================
  console.log('🧵 Creating material types...');
  const materials = await prisma.$transaction([
    prisma.materialType.create({
      data: { name: 'Kente', slug: 'kente', description: 'Traditional Ghanaian woven fabric' },
    }),
    prisma.materialType.create({
      data: { name: 'Ankara', slug: 'ankara', description: 'Vibrant African wax print' },
    }),
    prisma.materialType.create({
      data: { name: 'Batik', slug: 'batik', description: 'Hand-dyed fabric with wax resist' },
    }),
    prisma.materialType.create({
      data: { name: 'Kitenge', slug: 'kitenge', description: 'East African printed fabric' },
    }),
    prisma.materialType.create({
      data: { name: 'Aso Oke', slug: 'aso-oke', description: 'Nigerian handwoven textile' },
    }),
    prisma.materialType.create({
      data: { name: 'Silk', slug: 'silk', description: 'Luxurious silk fabric' },
    }),
    prisma.materialType.create({
      data: { name: 'Cotton', slug: 'cotton', description: 'Natural cotton fabric' },
    }),
  ]);
  console.log(`✅ Created ${materials.length} material types\n`);

  // ==================== CREATE FABRIC SELLERS ====================
  console.log('🏪 Creating fabric sellers...');
  const fabricSellers = await Promise.all([
    prisma.user.create({
      data: {
        email: 'seller.ghana@example.com',
        password: hashedPassword,
        firstName: 'Kwame',
        lastName: 'Asante',
        phone: '+233 20 123 4567',
        role: UserRole.FABRIC_SELLER,
        status: UserStatus.ACTIVE,
        fabricSellerProfile: {
          create: {
            businessName: 'Kente Palace Ghana',
            businessEmail: 'info@kentepalace.com',
            businessPhone: '+233 20 123 4567',
            country: 'Ghana',
            city: 'Accra',
            address: '123 Fabric Street, Accra Central',
            isVerified: true,
          },
        },
      },
      include: { fabricSellerProfile: true },
    }),
    prisma.user.create({
      data: {
        email: 'seller.nigeria@example.com',
        password: hashedPassword,
        firstName: 'Chioma',
        lastName: 'Okafor',
        phone: '+234 80 1234 5678',
        role: UserRole.FABRIC_SELLER,
        status: UserStatus.ACTIVE,
        fabricSellerProfile: {
          create: {
            businessName: 'Ankara World Lagos',
            businessEmail: 'info@ankaraworld.com',
            businessPhone: '+234 80 1234 5678',
            country: 'Nigeria',
            city: 'Lagos',
            address: '45 Market Road, Lagos Island',
            isVerified: true,
          },
        },
      },
      include: { fabricSellerProfile: true },
    }),
    prisma.user.create({
      data: {
        email: 'seller.kenya@example.com',
        password: hashedPassword,
        firstName: 'Wanjiku',
        lastName: 'Mwangi',
        phone: '+254 712 345 678',
        role: UserRole.FABRIC_SELLER,
        status: UserStatus.ACTIVE,
        fabricSellerProfile: {
          create: {
            businessName: 'Kitenge Hub Nairobi',
            businessEmail: 'info@kitengehub.com',
            businessPhone: '+254 712 345 678',
            country: 'Kenya',
            city: 'Nairobi',
            address: '78 Tom Mboya Street',
            isVerified: true,
          },
        },
      },
      include: { fabricSellerProfile: true },
    }),
  ]);
  console.log(`✅ Created ${fabricSellers.length} fabric sellers\n`);

  // ==================== CREATE FASHION DESIGNERS ====================
  console.log('✂️ Creating fashion designers...');
  const designers = await Promise.all([
    prisma.user.create({
      data: {
        email: 'designer.ghana@example.com',
        password: hashedPassword,
        firstName: 'Amara',
        lastName: 'Okafor',
        phone: '+233 24 987 6543',
        role: UserRole.FASHION_DESIGNER,
        status: UserStatus.ACTIVE,
        designerProfile: {
          create: {
            businessName: 'Amara Couture',
            businessEmail: 'hello@amaracouture.com',
            businessPhone: '+233 24 987 6543',
            bio: 'Contemporary African fashion blending tradition with modern elegance.',
            country: 'Ghana',
            city: 'Accra',
            address: 'Design District, East Legon',
            isVerified: true,
          },
        },
      },
      include: { designerProfile: true },
    }),
    prisma.user.create({
      data: {
        email: 'designer.nigeria@example.com',
        password: hashedPassword,
        firstName: 'Olumide',
        lastName: 'Adeyemi',
        phone: '+234 81 8765 4321',
        role: UserRole.FASHION_DESIGNER,
        status: UserStatus.ACTIVE,
        designerProfile: {
          create: {
            businessName: 'Lagos Luxe',
            businessEmail: 'info@lagosluxe.com',
            businessPhone: '+234 81 8765 4321',
            bio: 'Premium Nigerian fashion for the global citizen.',
            country: 'Nigeria',
            city: 'Lagos',
            address: 'Victoria Island, Lagos',
            isVerified: true,
          },
        },
      },
      include: { designerProfile: true },
    }),
  ]);
  console.log(`✅ Created ${designers.length} fashion designers\n`);

  // ==================== CREATE QA TEAM MEMBER ====================
  console.log('🔍 Creating QA team member...');
  const qaMember = await prisma.user.create({
    data: {
      email: 'qa@africanfashion.com',
      password: hashedPassword,
      firstName: 'Fatima',
      lastName: 'Diallo',
      phone: '+233 27 111 2222',
      role: UserRole.QA_TEAM,
      status: UserStatus.ACTIVE,
      qaProfile: {
        create: {
          country: 'Ghana',
          city: 'Accra',
          address: 'QA Hub, Spintex Road',
        },
      },
    },
  });
  console.log(`✅ QA team member created: ${qaMember.email}\n`);

  // ==================== CREATE SAMPLE FABRICS ====================
  console.log('🧶 Creating sample fabrics...');
  const fabrics = await Promise.all([
    // Ghana fabrics
    prisma.fabric.create({
      data: {
        sellerId: fabricSellers[0].fabricSellerProfile!.id,
        name: 'Premium Kente Cloth - Gold & Green',
        description: 'Authentic handwoven Kente from Ghana. Features traditional geometric patterns in gold and green.',
        materialTypeId: materials[0].id, // Kente
        sellerPrice: 45.00,
        finalPrice: 55.00,
        minYards: 2,
        stockYards: 50,
        status: ProductStatus.APPROVED,
        isAvailable: true,
        images: {
          create: [
            { url: '/images/product-kente-maxi.jpg', alt: 'Gold and Green Kente', sortOrder: 0 },
          ],
        },
      },
    }),
    prisma.fabric.create({
      data: {
        sellerId: fabricSellers[0].fabricSellerProfile!.id,
        name: 'Royal Kente - Red & Black',
        description: 'Traditional royal Kente pattern in striking red and black.',
        materialTypeId: materials[0].id,
        sellerPrice: 50.00,
        finalPrice: 62.00,
        minYards: 2,
        stockYards: 30,
        status: ProductStatus.APPROVED,
        isAvailable: true,
        images: {
          create: [
            { url: '/images/hero-portrait-main.jpg', alt: 'Red and Black Kente', sortOrder: 0 },
          ],
        },
      },
    }),
    // Nigeria fabrics
    prisma.fabric.create({
      data: {
        sellerId: fabricSellers[1].fabricSellerProfile!.id,
        name: 'Vibrant Ankara - Orange & Blue',
        description: 'High-quality Dutch wax print Ankara fabric with bold geometric patterns.',
        materialTypeId: materials[1].id, // Ankara
        sellerPrice: 25.00,
        finalPrice: 32.00,
        minYards: 3,
        stockYards: 100,
        status: ProductStatus.APPROVED,
        isAvailable: true,
        images: {
          create: [
            { url: '/images/product-ankara-set.jpg', alt: 'Orange and Blue Ankara', sortOrder: 0 },
          ],
        },
      },
    }),
    prisma.fabric.create({
      data: {
        sellerId: fabricSellers[1].fabricSellerProfile!.id,
        name: 'Classic Ankara - Purple & Pink',
        description: 'Beautiful floral Ankara print perfect for dresses and skirts.',
        materialTypeId: materials[1].id,
        sellerPrice: 28.00,
        finalPrice: 35.00,
        minYards: 3,
        stockYards: 80,
        status: ProductStatus.APPROVED,
        isAvailable: true,
        images: {
          create: [
            { url: '/images/latest-arrivals-top-right.jpg', alt: 'Purple and Pink Ankara', sortOrder: 0 },
          ],
        },
      },
    }),
    // Kenya fabrics
    prisma.fabric.create({
      data: {
        sellerId: fabricSellers[2].fabricSellerProfile!.id,
        name: 'Kitenge Print - Earth Tones',
        description: 'Traditional East African Kitenge print in warm earth tones.',
        materialTypeId: materials[3].id, // Kitenge
        sellerPrice: 22.00,
        finalPrice: 28.00,
        minYards: 2,
        stockYards: 60,
        status: ProductStatus.APPROVED,
        isAvailable: true,
        images: {
          create: [
            { url: '/images/product-wax-midi.jpg', alt: 'Earth Tone Kitenge', sortOrder: 0 },
          ],
        },
      },
    }),
  ]);
  console.log(`✅ Created ${fabrics.length} fabrics\n`);

  // ==================== CREATE SAMPLE DESIGNS ====================
  console.log('👗 Creating sample designs...');
  const designs = await Promise.all([
    prisma.design.create({
      data: {
        designerId: designers[0].designerProfile!.id,
        name: 'Kente Maxi Dress',
        description: 'Elegant floor-length dress featuring traditional Kente patterns. Perfect for special occasions.',
        categoryId: categories[0].id, // Dresses
        basePrice: 150.00,
        finalPrice: 189.00,
        status: ProductStatus.APPROVED,
        isAvailable: true,
        images: {
          create: [
            { url: '/images/product-kente-maxi.jpg', alt: 'Kente Maxi Dress', sortOrder: 0 },
          ],
        },
        suitableFabrics: {
          create: [
            { fabricId: fabrics[0].id, yardsNeeded: 5 },
            { fabricId: fabrics[1].id, yardsNeeded: 5 },
          ],
        },
        measurementVariables: {
          create: [
            { name: 'Bust', unit: 'cm', isRequired: true, instructions: 'Measure around the fullest part of your bust' },
            { name: 'Waist', unit: 'cm', isRequired: true, instructions: 'Measure around your natural waistline' },
            { name: 'Hip', unit: 'cm', isRequired: true, instructions: 'Measure around the fullest part of your hips' },
            { name: 'Shoulder Width', unit: 'cm', isRequired: true, instructions: 'Measure from shoulder tip to shoulder tip' },
            { name: 'Dress Length', unit: 'cm', isRequired: true, instructions: 'Measure from shoulder to desired length' },
          ],
        },
      },
    }),
    prisma.design.create({
      data: {
        designerId: designers[0].designerProfile!.id,
        name: 'Ankara Two-Piece Set',
        description: 'Stylish crop top and skirt combination with modern African flair.',
        categoryId: categories[1].id, // Two-Piece Sets
        basePrice: 120.00,
        finalPrice: 145.00,
        status: ProductStatus.APPROVED,
        isAvailable: true,
        images: {
          create: [
            { url: '/images/product-ankara-set.jpg', alt: 'Ankara Two-Piece Set', sortOrder: 0 },
          ],
        },
        suitableFabrics: {
          create: [
            { fabricId: fabrics[2].id, yardsNeeded: 4 },
            { fabricId: fabrics[3].id, yardsNeeded: 4 },
          ],
        },
        measurementVariables: {
          create: [
            { name: 'Bust', unit: 'cm', isRequired: true },
            { name: 'Waist', unit: 'cm', isRequired: true },
            { name: 'Hip', unit: 'cm', isRequired: true },
            { name: 'Top Length', unit: 'cm', isRequired: true },
            { name: 'Skirt Length', unit: 'cm', isRequired: true },
          ],
        },
      },
    }),
    prisma.design.create({
      data: {
        designerId: designers[1].designerProfile!.id,
        name: 'Batik Shift Dress',
        description: 'Comfortable shift dress with beautiful hand-dyed Batik patterns.',
        categoryId: categories[0].id,
        basePrice: 95.00,
        finalPrice: 120.00,
        status: ProductStatus.APPROVED,
        isAvailable: true,
        images: {
          create: [
            { url: '/images/product-batik-shift.jpg', alt: 'Batik Shift Dress', sortOrder: 0 },
          ],
        },
        suitableFabrics: {
          create: [
            { fabricId: fabrics[4].id, yardsNeeded: 3 },
          ],
        },
        measurementVariables: {
          create: [
            { name: 'Bust', unit: 'cm', isRequired: true },
            { name: 'Waist', unit: 'cm', isRequired: true },
            { name: 'Hip', unit: 'cm', isRequired: true },
            { name: 'Shoulder to Hem', unit: 'cm', isRequired: true },
          ],
        },
      },
    }),
  ]);
  console.log(`✅ Created ${designs.length} designs\n`);

  // ==================== CREATE SAMPLE READY-TO-WEAR ====================
  console.log('👔 Creating sample ready-to-wear products...');
  const readyToWear = await Promise.all([
    prisma.readyToWear.create({
      data: {
        designerId: designers[0].designerProfile!.id,
        name: 'Embroidered Kaftan',
        description: 'Luxurious kaftan with intricate embroidery. Ready to ship.',
        categoryId: categories[2].id, // Kaftans
        basePrice: 180.00,
        status: ProductStatus.APPROVED,
        isAvailable: true,
        images: {
          create: [
            { url: '/images/product-kaftan.jpg', alt: 'Embroidered Kaftan', sortOrder: 0 },
          ],
        },
        sizeVariations: {
          create: [
            { size: 'S', price: 180.00, stock: 5, measurements: { chest: 90, waist: 76, hip: 96, length: 130 } },
            { size: 'M', price: 185.00, stock: 8, measurements: { chest: 96, waist: 82, hip: 102, length: 132 } },
            { size: 'L', price: 190.00, stock: 6, measurements: { chest: 102, waist: 88, hip: 108, length: 134 } },
            { size: 'XL', price: 195.00, stock: 3, measurements: { chest: 108, waist: 94, hip: 114, length: 136 } },
          ],
        },
      },
    }),
    prisma.readyToWear.create({
      data: {
        designerId: designers[1].designerProfile!.id,
        name: 'Wax Print Midi Skirt',
        description: 'Versatile midi skirt in vibrant wax print. Perfect for any occasion.',
        categoryId: categories[3].id, // Skirts
        basePrice: 85.00,
        status: ProductStatus.APPROVED,
        isAvailable: true,
        images: {
          create: [
            { url: '/images/product-skirt.jpg', alt: 'Wax Print Midi Skirt', sortOrder: 0 },
          ],
        },
        sizeVariations: {
          create: [
            { size: 'S', price: 85.00, stock: 10, measurements: { waist: 68, hip: 94, length: 75 } },
            { size: 'M', price: 90.00, stock: 12, measurements: { waist: 74, hip: 100, length: 76 } },
            { size: 'L', price: 95.00, stock: 8, measurements: { waist: 80, hip: 106, length: 77 } },
            { size: 'XL', price: 100.00, stock: 5, measurements: { waist: 86, hip: 112, length: 78 } },
          ],
        },
      },
    }),
  ]);
  console.log(`✅ Created ${readyToWear.length} ready-to-wear products\n`);

  // ==================== CREATE PRICING RULES ====================
  console.log('💰 Creating pricing rules...');
  const pricingRules = await Promise.all([
    prisma.pricingRule.create({
      data: {
        name: 'Global Markup',
        description: 'Default markup applied to all products',
        ruleType: 'GLOBAL_MARKUP',
        adjustmentType: 'PERCENTAGE_MARKUP',
        value: 20, // 20% markup
        isActive: true,
        priority: 0,
        createdById: admin.id,
      },
    }),
    prisma.pricingRule.create({
      data: {
        name: 'Ghana Premium',
        description: 'Additional markup for Ghana products',
        ruleType: 'COUNTRY_MARKUP',
        country: 'Ghana',
        adjustmentType: 'PERCENTAGE_MARKUP',
        value: 5,
        isActive: true,
        priority: 1,
        createdById: admin.id,
      },
    }),
    prisma.pricingRule.create({
      data: {
        name: 'New Year Sale',
        description: 'Limited time discount',
        ruleType: 'DATE_BASED',
        adjustmentType: 'PERCENTAGE_DISCOUNT',
        value: 15,
        isActive: false,
        isSale: true,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        priority: 10,
        createdById: admin.id,
      },
    }),
  ]);
  console.log(`✅ Created ${pricingRules.length} pricing rules\n`);

  // ==================== CREATE SAMPLE CUSTOMER ====================
  console.log('👤 Creating sample customer...');
  const customer = await prisma.user.create({
    data: {
      email: 'customer@example.com',
      password: hashedPassword,
      firstName: 'Sarah',
      lastName: 'Johnson',
      phone: '+1 555 123 4567',
      role: UserRole.CUSTOMER,
      status: UserStatus.ACTIVE,
      customerProfile: {
        create: {
          addresses: {
            create: [
              {
                label: 'Home',
                fullName: 'Sarah Johnson',
                phone: '+1 555 123 4567',
                country: 'United States',
                city: 'New York',
                address: '123 Fashion Avenue, Apt 4B',
                postalCode: '10001',
                isDefault: true,
              },
            ],
          },
        },
      },
    },
  });
  console.log(`✅ Sample customer created: ${customer.email}\n`);

  console.log('✅✅✅ Database seed completed successfully! ✅✅✅\n');
  console.log('Login credentials:');
  console.log('  Admin: admin@africanfashion.com / password123');
  console.log('  Fabric Seller (Ghana): seller.ghana@example.com / password123');
  console.log('  Fabric Seller (Nigeria): seller.nigeria@example.com / password123');
  console.log('  Designer (Ghana): designer.ghana@example.com / password123');
  console.log('  Designer (Nigeria): designer.nigeria@example.com / password123');
  console.log('  QA: qa@africanfashion.com / password123');
  console.log('  Customer: customer@example.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

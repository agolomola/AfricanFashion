import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  await prisma.$transaction(async (tx) => {
    // 1. Admin User
    const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@2024!', 10);
    const admin = await tx.user.upsert({
      where: { email: 'admin@africanfashion.com' },
      update: {},
      create: {
        email: 'admin@africanfashion.com',
        password: adminPassword,
        firstName: 'Platform',
        lastName: 'Admin',
        role: 'ADMINISTRATOR',
        status: 'ACTIVE',
      },
    });

    await tx.adminProfile.upsert({
      where: { userId: admin.id },
      update: {},
      create: {
        userId: admin.id,
        permissions: [
          'MANAGE_USERS',
          'MANAGE_PRODUCTS',
          'MANAGE_ORDERS',
          'MANAGE_PRICING',
          'MANAGE_CATEGORIES',
          'VIEW_ANALYTICS',
          'MANAGE_QA',
        ],
      },
    });

    // 2. Product Categories
    const categories = [
      { name: 'Traditional Wear', slug: 'traditional-wear' },
      { name: 'Modern African', slug: 'modern-african' },
      { name: 'Casual Wear', slug: 'casual-wear' },
      { name: 'Bridal & Wedding', slug: 'bridal-wedding' },
      { name: "Children's Wear", slug: 'childrens-wear' },
      { name: 'Accessories', slug: 'accessories' },
      { name: "Men's Wear", slug: 'mens-wear' },
      { name: "Women's Wear", slug: 'womens-wear' },
    ];

    for (const category of categories) {
      await tx.productCategory.upsert({
        where: { slug: category.slug },
        update: {},
        create: category,
      });
    }

    // 3. Material Types
    const materials = [
      { name: 'Ankara', slug: 'ankara', description: 'Colorful African wax print fabric' },
      { name: 'Kente', slug: 'kente', description: 'Traditional Ghanaian handwoven cloth' },
      { name: 'Aso-Oke', slug: 'aso-oke', description: 'Hand-loomed cloth from Yoruba people' },
      { name: 'Lace', slug: 'lace', description: 'Delicate fabric with open weave patterns' },
      { name: 'Adire', slug: 'adire', description: 'Tie-dyed cloth from Yoruba tradition' },
      { name: 'Kitenge', slug: 'kitenge', description: 'East African printed cotton fabric' },
      { name: 'Dashiki', slug: 'dashiki', description: 'Colorful West African garment fabric' },
      { name: 'Mud Cloth / Bògòlanfini', slug: 'mud-cloth', description: 'Malian handmade cotton fabric' },
      { name: 'Kanga', slug: 'kanga', description: 'East African rectangular cotton cloth' },
      { name: 'Shweshwe', slug: 'shweshwe', description: 'South African printed cotton fabric' },
    ];

    for (const material of materials) {
      await tx.materialType.upsert({
        where: { slug: material.slug },
        update: {},
        create: material,
      });
    }

    // 4. Demo Users
    const demoPassword = await bcrypt.hash(process.env.DEMO_PASSWORD || 'Demo@2024!', 10);

    // Fabric Seller
    const seller = await tx.user.upsert({
      where: { email: 'seller@demo.com' },
      update: {},
      create: {
        email: 'seller@demo.com',
        password: demoPassword,
        firstName: 'Amara',
        lastName: 'Diallo',
        role: 'FABRIC_SELLER',
        status: 'ACTIVE',
      },
    });

    await tx.fabricSellerProfile.upsert({
      where: { userId: seller.id },
      update: {},
      create: {
        userId: seller.id,
        businessName: 'Diallo Fabrics',
        businessEmail: 'seller@demo.com',
        businessPhone: '+2341234567890',
        country: 'Nigeria',
        city: 'Lagos',
        address: '1 Fabric Lane, Lagos',
        isVerified: true,
      },
    });

    // Fashion Designer
    const designer = await tx.user.upsert({
      where: { email: 'designer@demo.com' },
      update: {},
      create: {
        email: 'designer@demo.com',
        password: demoPassword,
        firstName: 'Kwame',
        lastName: 'Asante',
        role: 'FASHION_DESIGNER',
        status: 'ACTIVE',
      },
    });

    await tx.designerProfile.upsert({
      where: { userId: designer.id },
      update: {},
      create: {
        userId: designer.id,
        businessName: 'Asante Designs',
        businessEmail: 'designer@demo.com',
        businessPhone: '+2330987654321',
        country: 'Ghana',
        city: 'Accra',
        address: '5 Design Street, Accra',
        isVerified: true,
      },
    });

    // Customer
    const customer = await tx.user.upsert({
      where: { email: 'customer@demo.com' },
      update: {},
      create: {
        email: 'customer@demo.com',
        password: demoPassword,
        firstName: 'Sarah',
        lastName: 'Johnson',
        role: 'CUSTOMER',
        status: 'ACTIVE',
      },
    });

    const customerProfile = await tx.customerProfile.upsert({
      where: { userId: customer.id },
      update: {},
      create: {
        userId: customer.id,
      },
    });

    const existingAddress = await tx.address.findFirst({
      where: { customerProfileId: customerProfile.id },
    });

    if (!existingAddress) {
      await tx.address.create({
        data: {
          customerProfileId: customerProfile.id,
          label: 'Home',
          fullName: 'Sarah Johnson',
          phone: '+12025551234',
          country: 'United States',
          city: 'New York',
          address: '123 Main St',
          isDefault: true,
        },
      });
    }

    // 5. Default Global Pricing Rule
    const existingRule = await tx.pricingRule.findFirst({
      where: { name: 'Platform Commission' },
    });

    if (!existingRule) {
      await tx.pricingRule.create({
        data: {
          name: 'Platform Commission',
          ruleType: 'GLOBAL_MARKUP',
          adjustmentType: 'PERCENTAGE_MARKUP',
          value: 15,
          isActive: true,
          priority: 100,
          createdById: admin.id,
        },
      });
    }
  });

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

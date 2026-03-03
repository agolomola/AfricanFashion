import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Check if admin user already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@africanfashion.com' },
  });

  if (existingAdmin) {
    console.log('✅ Admin user already exists');
  } else {
    // Create default admin user
    const hashedPassword = await bcrypt.hash('Admin123!', 10);
    
    const admin = await prisma.user.create({
      data: {
        email: 'admin@africanfashion.com',
        password: hashedPassword,
        firstName: 'System',
        lastName: 'Administrator',
        role: 'ADMINISTRATOR',
        status: 'ACTIVE',
        adminProfile: {
          create: {},
        },
      },
    });

    console.log('✅ Created admin user:', admin.email);
  }

  // Create default customer user for testing
  const existingCustomer = await prisma.user.findUnique({
    where: { email: 'customer@example.com' },
  });

  if (existingCustomer) {
    console.log('✅ Customer user already exists');
  } else {
    const hashedPassword = await bcrypt.hash('Customer123!', 10);
    
    const customer = await prisma.user.create({
      data: {
        email: 'customer@example.com',
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'Customer',
        role: 'CUSTOMER',
        status: 'ACTIVE',
        customerProfile: {
          create: {},
        },
      },
    });

    console.log('✅ Created customer user:', customer.email);
  }

  // Create sample banners if none exist
  const existingBanners = await prisma.banner.count();
  
  if (existingBanners === 0) {
    console.log('🖼️ Creating sample banners...');
    
    await prisma.banner.createMany({
      data: [
        {
          name: 'Fashion Collection Banner',
          section: 'BANNER_1',
          title: 'New Collection',
          subtitle: 'Discover the latest African fashion trends',
          ctaText: 'Shop Now',
          ctaLink: '/designs',
          images: ['/images/banner-1.jpg'],
          isActive: true,
          displayOrder: 1,
        },
        {
          name: 'Seller Invite Banner',
          section: 'BANNER_2',
          title: 'Become a Seller',
          subtitle: 'Join our marketplace and reach customers worldwide',
          ctaText: 'Join Now',
          ctaLink: '/register',
          images: ['/images/banner-2.jpg'],
          isActive: true,
          displayOrder: 1,
        },
      ],
    });
    
    console.log('✅ Created sample banners');
  } else {
    console.log('✅ Banners already exist');
  }

  console.log('🎉 Database seed completed!');
  console.log('');
  console.log('📧 Default Login Credentials:');
  console.log('   Admin: admin@africanfashion.com / Admin123!');
  console.log('   Customer: customer@example.com / Customer123!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

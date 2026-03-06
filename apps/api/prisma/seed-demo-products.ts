import { PrismaClient, ProductStatus, ProductType, UserRole, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Demo123!';

type SellerSeed = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  businessName: string;
  businessEmail: string;
  businessPhone: string;
  country: string;
  city: string;
  address: string;
};

type DesignerSeed = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  businessName: string;
  businessEmail: string;
  businessPhone: string;
  country: string;
  city: string;
  address: string;
  bio: string;
};

const SELLERS: SellerSeed[] = [
  {
    email: 'demo.seller.ghana@africanfashion.com',
    firstName: 'Kojo',
    lastName: 'Mensah',
    phone: '+233201112223',
    businessName: 'Demo Gold Coast Fabrics',
    businessEmail: 'goldcoast.demo@africanfashion.com',
    businessPhone: '+233201112223',
    country: 'Ghana',
    city: 'Accra',
    address: '28 Spintex Road, Accra',
  },
  {
    email: 'demo.seller.nigeria@africanfashion.com',
    firstName: 'Adaeze',
    lastName: 'Nwosu',
    phone: '+2348011122233',
    businessName: 'Demo Naija Prints',
    businessEmail: 'naijaprints.demo@africanfashion.com',
    businessPhone: '+2348011122233',
    country: 'Nigeria',
    city: 'Lagos',
    address: '17 Admiralty Way, Lagos',
  },
];

const DESIGNERS: DesignerSeed[] = [
  {
    email: 'demo.designer.ghana@africanfashion.com',
    firstName: 'Ama',
    lastName: 'Boateng',
    phone: '+233244440001',
    businessName: 'Demo Accra Atelier',
    businessEmail: 'atelier.demo@africanfashion.com',
    businessPhone: '+233244440001',
    country: 'Ghana',
    city: 'Accra',
    address: '11 East Legon, Accra',
    bio: 'Demo atelier focused on contemporary African tailoring.',
  },
  {
    email: 'demo.designer.kenya@africanfashion.com',
    firstName: 'Nia',
    lastName: 'Kamau',
    phone: '+254711223344',
    businessName: 'Demo Nairobi Studio',
    businessEmail: 'nairobi.demo@africanfashion.com',
    businessPhone: '+254711223344',
    country: 'Kenya',
    city: 'Nairobi',
    address: '5 Westlands Avenue, Nairobi',
    bio: 'Demo studio blending East African textiles with modern cuts.',
  },
];

function imageUrl(seed: string, width = 900, height = 1200) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${width}/${height}`;
}

async function ensureCategory(name: string, slug: string, sortOrder: number) {
  return prisma.productCategory.upsert({
    where: { slug },
    update: {
      name,
      description: `${name} demo category`,
      isActive: true,
      sortOrder,
    },
    create: {
      name,
      slug,
      description: `${name} demo category`,
      isActive: true,
      sortOrder,
    },
  });
}

async function ensureMaterial(name: string, slug: string) {
  return prisma.materialType.upsert({
    where: { slug },
    update: {
      name,
      description: `${name} demo material`,
      isActive: true,
    },
    create: {
      name,
      slug,
      description: `${name} demo material`,
      isActive: true,
    },
  });
}

async function ensureSellerProfile(seed: SellerSeed, passwordHash: string) {
  const user = await prisma.user.upsert({
    where: { email: seed.email },
    update: {
      firstName: seed.firstName,
      lastName: seed.lastName,
      phone: seed.phone,
      role: UserRole.FABRIC_SELLER,
      status: UserStatus.ACTIVE,
    },
    create: {
      email: seed.email,
      password: passwordHash,
      firstName: seed.firstName,
      lastName: seed.lastName,
      phone: seed.phone,
      role: UserRole.FABRIC_SELLER,
      status: UserStatus.ACTIVE,
    },
  });

  const existingProfile = await prisma.fabricSellerProfile.findUnique({
    where: { userId: user.id },
  });

  if (existingProfile) {
    return prisma.fabricSellerProfile.update({
      where: { userId: user.id },
      data: {
        businessName: seed.businessName,
        businessEmail: seed.businessEmail,
        businessPhone: seed.businessPhone,
        country: seed.country,
        city: seed.city,
        address: seed.address,
        isVerified: true,
      },
    });
  }

  return prisma.fabricSellerProfile.create({
    data: {
      userId: user.id,
      businessName: seed.businessName,
      businessEmail: seed.businessEmail,
      businessPhone: seed.businessPhone,
      country: seed.country,
      city: seed.city,
      address: seed.address,
      isVerified: true,
    },
  });
}

async function ensureDesignerProfile(seed: DesignerSeed, passwordHash: string) {
  const user = await prisma.user.upsert({
    where: { email: seed.email },
    update: {
      firstName: seed.firstName,
      lastName: seed.lastName,
      phone: seed.phone,
      role: UserRole.FASHION_DESIGNER,
      status: UserStatus.ACTIVE,
    },
    create: {
      email: seed.email,
      password: passwordHash,
      firstName: seed.firstName,
      lastName: seed.lastName,
      phone: seed.phone,
      role: UserRole.FASHION_DESIGNER,
      status: UserStatus.ACTIVE,
    },
  });

  const existingProfile = await prisma.designerProfile.findUnique({
    where: { userId: user.id },
  });

  if (existingProfile) {
    return prisma.designerProfile.update({
      where: { userId: user.id },
      data: {
        businessName: seed.businessName,
        businessEmail: seed.businessEmail,
        businessPhone: seed.businessPhone,
        country: seed.country,
        city: seed.city,
        address: seed.address,
        bio: seed.bio,
        isVerified: true,
      },
    });
  }

  return prisma.designerProfile.create({
    data: {
      userId: user.id,
      businessName: seed.businessName,
      businessEmail: seed.businessEmail,
      businessPhone: seed.businessPhone,
      country: seed.country,
      city: seed.city,
      address: seed.address,
      bio: seed.bio,
      isVerified: true,
    },
  });
}

async function main() {
  console.log('🌱 Seeding demo products (10 fabrics, 10 designs, 10 ready-to-wear)...');

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const categories = await Promise.all([
    ensureCategory('Dresses', 'dresses', 1),
    ensureCategory('Two-Piece Sets', 'two-piece-sets', 2),
    ensureCategory('Kaftans', 'kaftans', 3),
    ensureCategory('Skirts', 'skirts', 4),
    ensureCategory('Accessories', 'accessories', 5),
  ]);

  const materials = await Promise.all([
    ensureMaterial('Kente', 'kente'),
    ensureMaterial('Ankara', 'ankara'),
    ensureMaterial('Kitenge', 'kitenge'),
    ensureMaterial('Batik', 'batik'),
    ensureMaterial('Aso Oke', 'aso-oke'),
    ensureMaterial('Cotton', 'cotton'),
  ]);

  const sellerProfiles = await Promise.all(SELLERS.map((seed) => ensureSellerProfile(seed, passwordHash)));
  const designerProfiles = await Promise.all(DESIGNERS.map((seed) => ensureDesignerProfile(seed, passwordHash)));

  const demoFabrics: { id: string }[] = [];
  for (let i = 1; i <= 10; i += 1) {
    const seller = sellerProfiles[i % sellerProfiles.length];
    const material = materials[i % materials.length];
    const name = `Demo Fabric ${i} - ${material.name}`;
    const existing = await prisma.fabric.findFirst({
      where: { sellerId: seller.id, name },
      select: { id: true },
    });

    if (existing) {
      demoFabrics.push(existing);
      continue;
    }

    const sellerPrice = 18 + i * 2;
    const created = await prisma.fabric.create({
      data: {
        sellerId: seller.id,
        name,
        description: `Demo fabric ${i} for homepage and dashboard population.`,
        materialTypeId: material.id,
        sellerPrice,
        finalPrice: Math.round(sellerPrice * 1.2 * 100) / 100,
        minYards: 2,
        stockYards: 60 + i * 4,
        status: ProductStatus.APPROVED,
        isAvailable: true,
        images: {
          create: [
            { url: imageUrl(`demo-fabric-${i}-1`), alt: `${name} view 1`, sortOrder: 0 },
            { url: imageUrl(`demo-fabric-${i}-2`), alt: `${name} view 2`, sortOrder: 1 },
            { url: imageUrl(`demo-fabric-${i}-3`), alt: `${name} view 3`, sortOrder: 2 },
          ],
        },
      },
      select: { id: true },
    });
    demoFabrics.push(created);
  }

  const demoDesigns: { id: string }[] = [];
  for (let i = 1; i <= 10; i += 1) {
    const designer = designerProfiles[i % designerProfiles.length];
    const category = categories[i % categories.length];
    const fabricA = demoFabrics[(i - 1) % demoFabrics.length];
    const fabricB = demoFabrics[i % demoFabrics.length];
    const name = `Demo Design ${i} - ${category.name}`;
    const existing = await prisma.design.findFirst({
      where: { designerId: designer.id, name },
      select: { id: true },
    });

    if (existing) {
      demoDesigns.push(existing);
      continue;
    }

    const basePrice = 95 + i * 8;
    const created = await prisma.design.create({
      data: {
        designerId: designer.id,
        name,
        description: `Demo custom design ${i} used for featured sections and listing population.`,
        categoryId: category.id,
        materialTypeId: materials[i % materials.length].id,
        basePrice,
        finalPrice: Math.round(basePrice * 1.22 * 100) / 100,
        status: ProductStatus.APPROVED,
        isAvailable: true,
        images: {
          create: [
            { url: imageUrl(`demo-design-${i}-1`), alt: `${name} look 1`, sortOrder: 0 },
            { url: imageUrl(`demo-design-${i}-2`), alt: `${name} look 2`, sortOrder: 1 },
            { url: imageUrl(`demo-design-${i}-3`), alt: `${name} look 3`, sortOrder: 2 },
            { url: imageUrl(`demo-design-${i}-4`), alt: `${name} look 4`, sortOrder: 3 },
          ],
        },
        suitableFabrics: {
          create: [
            { fabricId: fabricA.id, yardsNeeded: 4 },
            { fabricId: fabricB.id, yardsNeeded: 5 },
          ],
        },
        measurementVariables: {
          create: [
            { name: 'Bust', unit: 'cm', isRequired: true, sortOrder: 0 },
            { name: 'Waist', unit: 'cm', isRequired: true, sortOrder: 1 },
            { name: 'Hip', unit: 'cm', isRequired: true, sortOrder: 2 },
            { name: 'Shoulder Width', unit: 'cm', isRequired: true, sortOrder: 3 },
          ],
        },
      },
      select: { id: true },
    });
    demoDesigns.push(created);
  }

  const demoReadyToWear: { id: string }[] = [];
  for (let i = 1; i <= 10; i += 1) {
    const designer = designerProfiles[i % designerProfiles.length];
    const category = categories[(i + 1) % categories.length];
    const name = `Demo Ready To Wear ${i} - ${category.name}`;
    const existing = await prisma.readyToWear.findFirst({
      where: { designerId: designer.id, name },
      select: { id: true },
    });

    if (existing) {
      demoReadyToWear.push(existing);
      continue;
    }

    const basePrice = 75 + i * 7;
    const created = await prisma.readyToWear.create({
      data: {
        designerId: designer.id,
        name,
        description: `Demo ready-to-wear item ${i} for storefront and homepage population.`,
        categoryId: category.id,
        basePrice,
        status: ProductStatus.APPROVED,
        isAvailable: true,
        images: {
          create: [
            { url: imageUrl(`demo-rtw-${i}-1`), alt: `${name} front`, sortOrder: 0 },
            { url: imageUrl(`demo-rtw-${i}-2`), alt: `${name} side`, sortOrder: 1 },
            { url: imageUrl(`demo-rtw-${i}-3`), alt: `${name} detail`, sortOrder: 2 },
            { url: imageUrl(`demo-rtw-${i}-4`), alt: `${name} full`, sortOrder: 3 },
          ],
        },
        sizeVariations: {
          create: [
            { size: 'S', price: basePrice, stock: 10 },
            { size: 'M', price: basePrice + 5, stock: 12 },
            { size: 'L', price: basePrice + 10, stock: 8 },
          ],
        },
      },
      select: { id: true },
    });
    demoReadyToWear.push(created);
  }

  await Promise.all(
    demoDesigns.map((item, index) =>
      prisma.featuredProduct.upsert({
        where: {
          productId_productType_section: {
            productId: item.id,
            productType: ProductType.DESIGN,
            section: 'FEATURED_DESIGNS',
          },
        },
        update: {
          displayOrder: index + 1,
          isActive: true,
        },
        create: {
          productId: item.id,
          productType: ProductType.DESIGN,
          section: 'FEATURED_DESIGNS',
          displayOrder: index + 1,
          isActive: true,
        },
      })
    )
  );

  await Promise.all(
    demoFabrics.map((item, index) =>
      prisma.featuredProduct.upsert({
        where: {
          productId_productType_section: {
            productId: item.id,
            productType: ProductType.FABRIC,
            section: 'FEATURED_FABRICS',
          },
        },
        update: {
          displayOrder: index + 1,
          isActive: true,
        },
        create: {
          productId: item.id,
          productType: ProductType.FABRIC,
          section: 'FEATURED_FABRICS',
          displayOrder: index + 1,
          isActive: true,
        },
      })
    )
  );

  await Promise.all(
    demoReadyToWear.map((item, index) =>
      prisma.featuredProduct.upsert({
        where: {
          productId_productType_section: {
            productId: item.id,
            productType: ProductType.READY_TO_WEAR,
            section: 'FEATURED_READY_TO_WEAR',
          },
        },
        update: {
          displayOrder: index + 1,
          isActive: true,
        },
        create: {
          productId: item.id,
          productType: ProductType.READY_TO_WEAR,
          section: 'FEATURED_READY_TO_WEAR',
          displayOrder: index + 1,
          isActive: true,
        },
      })
    )
  );

  console.log('✅ Demo seed complete.');
  console.log('   Added/ensured: 10 Fabrics, 10 Designs, 10 Ready-to-Wear.');
  console.log('   Added/ensured featured entries for all demo products.');
  console.log('   Demo login password:', DEMO_PASSWORD);
  console.log('   Seller accounts:', SELLERS.map((seller) => seller.email).join(', '));
  console.log('   Designer accounts:', DESIGNERS.map((designer) => designer.email).join(', '));
}

main()
  .catch((error) => {
    console.error('❌ Demo seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

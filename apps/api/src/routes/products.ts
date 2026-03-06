import { Router } from 'express';
import { prisma, ProductStatus, ProductType } from '../db';
import { optionalAuth } from '../middleware/auth';

const router = Router();

function isFeaturedTableMissingError(error: any) {
  const table = String(error?.meta?.table || '');
  const message = String(error?.message || '');
  return error?.code === 'P2021' && (table.includes('FeaturedProduct') || message.includes('FeaturedProduct'));
}

function parsePagination(pageValue: unknown, limitValue: unknown, defaultLimit = 20) {
  const page = Math.max(1, Number.parseInt(String(pageValue ?? '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(String(limitValue ?? defaultLimit), 10) || defaultLimit));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

async function getFeaturedSectionsByProductIds(productIds: string[], productType: ProductType) {
  if (productIds.length === 0) {
    return new Map<string, string[]>();
  }
  let featuredRows: Array<{ productId: string; section: string }> = [];
  try {
    featuredRows = await prisma.featuredProduct.findMany({
      where: {
        productType,
        isActive: true,
        productId: { in: productIds },
      },
      select: {
        productId: true,
        section: true,
      },
    });
  } catch (error) {
    if (!isFeaturedTableMissingError(error)) {
      throw error;
    }
  }
  const featuredMap = new Map<string, string[]>();
  for (const row of featuredRows) {
    const existing = featuredMap.get(row.productId) || [];
    existing.push(row.section);
    featuredMap.set(row.productId, existing);
  }
  return featuredMap;
}

async function getFeaturedSections(productId: string, productType: ProductType) {
  let featuredRows: Array<{ section: string }> = [];
  try {
    featuredRows = await prisma.featuredProduct.findMany({
      where: {
        productId,
        productType,
        isActive: true,
      },
      select: { section: true },
    });
  } catch (error) {
    if (!isFeaturedTableMissingError(error)) {
      throw error;
    }
  }
  return featuredRows.map((row) => row.section);
}

// Public routes (no auth required)

// Get all categories
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await prisma.productCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
});

// Get all material types
router.get('/materials', async (req, res, next) => {
  try {
    const materials = await prisma.materialType.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    res.json({
      success: true,
      data: materials,
    });
  } catch (error) {
    next(error);
  }
});

// Get fabrics with filters
router.get('/fabrics', async (req, res, next) => {
  try {
    const { country, materialTypeId, sellerUserId, search, page, limit } = req.query;

    const where: any = {
      status: ProductStatus.APPROVED,
      isAvailable: true,
    };

    if (country) {
      where.seller = { country: country as string };
    }
    if (sellerUserId) {
      where.seller = { ...(where.seller || {}), userId: sellerUserId as string };
    }

    if (materialTypeId) {
      where.materialTypeId = materialTypeId as string;
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const pagination = parsePagination(page, limit, 20);

    const [fabrics, total] = await Promise.all([
      prisma.fabric.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        include: {
          materialType: true,
          seller: {
            select: { country: true, city: true, businessName: true },
          },
          images: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.fabric.count({ where }),
    ]);
    const featuredMap = await getFeaturedSectionsByProductIds(
      fabrics.map((fabric) => fabric.id),
      ProductType.FABRIC
    );
    const fabricsWithFeatured = fabrics.map((fabric) => ({
      ...fabric,
      isFeatured: featuredMap.has(fabric.id),
      featuredSections: featuredMap.get(fabric.id) || [],
    }));

    res.json({
      success: true,
      data: {
        fabrics: fabricsWithFeatured,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          pages: Math.ceil(total / pagination.limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get single fabric
router.get('/fabrics/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const fabric = await prisma.fabric.findUnique({
      where: { id },
      include: {
        materialType: true,
        seller: {
          select: {
            businessName: true,
            country: true,
            city: true,
            rating: true,
          },
        },
        images: true,
        designFabrics: {
          include: {
            design: {
              select: {
                id: true,
                name: true,
                images: { take: 1 },
              },
            },
          },
        },
      },
    });

    if (!fabric) {
      return res.status(404).json({
        success: false,
        message: 'Fabric not found.',
      });
    }

    const featuredSections = await getFeaturedSections(fabric.id, ProductType.FABRIC);

    res.json({
      success: true,
      data: {
        ...fabric,
        isFeatured: featuredSections.length > 0,
        featuredSections,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get designs with filters
router.get('/designs', async (req, res, next) => {
  try {
    const { categoryId, country, designerId, designerUserId, search, page, limit } = req.query;

    const where: any = {
      status: ProductStatus.APPROVED,
      isAvailable: true,
    };

    if (categoryId) where.categoryId = categoryId as string;
    if (country) where.designer = { ...(where.designer || {}), country: country as string };
    if (designerId) where.designerId = designerId as string;
    if (designerUserId) where.designer = { ...(where.designer || {}), userId: designerUserId as string };

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const pagination = parsePagination(page, limit, 20);

    const [designs, total] = await Promise.all([
      prisma.design.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        include: {
          category: true,
          designer: {
            select: {
              businessName: true,
              country: true,
              city: true,
              rating: true,
            },
          },
          images: true,
          suitableFabrics: {
            include: {
              fabric: {
                select: {
                  id: true,
                  name: true,
                  finalPrice: true,
                  images: { take: 1 },
                  seller: { select: { country: true } },
                },
              },
            },
          },
          measurementVariables: {
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.design.count({ where }),
    ]);
    const featuredMap = await getFeaturedSectionsByProductIds(
      designs.map((design) => design.id),
      ProductType.DESIGN
    );
    const designsWithFeatured = designs.map((design) => ({
      ...design,
      isFeatured: featuredMap.has(design.id),
      featuredSections: featuredMap.get(design.id) || [],
    }));

    res.json({
      success: true,
      data: {
        designs: designsWithFeatured,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          pages: Math.ceil(total / pagination.limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get single design
router.get('/designs/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const design = await prisma.design.findUnique({
      where: { id },
      include: {
        category: true,
        designer: {
          select: {
            businessName: true,
            bio: true,
            country: true,
            city: true,
            rating: true,
          },
        },
        images: true,
        suitableFabrics: {
          include: {
            fabric: {
              include: {
                materialType: true,
                images: { take: 1 },
                seller: {
                  select: {
                    businessName: true,
                    country: true,
                    city: true,
                  },
                },
              },
            },
          },
        },
        measurementVariables: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!design) {
      return res.status(404).json({
        success: false,
        message: 'Design not found.',
      });
    }

    const featuredSections = await getFeaturedSections(design.id, ProductType.DESIGN);

    res.json({
      success: true,
      data: {
        ...design,
        isFeatured: featuredSections.length > 0,
        featuredSections,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get ready-to-wear with filters
router.get('/ready-to-wear', async (req, res, next) => {
  try {
    const { categoryId, country, designerId, designerUserId, search, page, limit } = req.query;

    const where: any = {
      status: ProductStatus.APPROVED,
      isAvailable: true,
    };

    if (categoryId) where.categoryId = categoryId as string;
    if (country) where.designer = { ...(where.designer || {}), country: country as string };
    if (designerId) where.designerId = designerId as string;
    if (designerUserId) where.designer = { ...(where.designer || {}), userId: designerUserId as string };

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const pagination = parsePagination(page, limit, 20);

    const [products, total] = await Promise.all([
      prisma.readyToWear.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        include: {
          category: true,
          designer: {
            select: {
              businessName: true,
              country: true,
              city: true,
              rating: true,
            },
          },
          images: true,
          sizeVariations: {
            where: { stock: { gt: 0 } },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.readyToWear.count({ where }),
    ]);
    const featuredMap = await getFeaturedSectionsByProductIds(
      products.map((product) => product.id),
      ProductType.READY_TO_WEAR
    );
    const productsWithFeatured = products.map((product) => ({
      ...product,
      isFeatured: featuredMap.has(product.id),
      featuredSections: featuredMap.get(product.id) || [],
    }));

    res.json({
      success: true,
      data: {
        products: productsWithFeatured,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          pages: Math.ceil(total / pagination.limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get single ready-to-wear product
router.get('/ready-to-wear/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await prisma.readyToWear.findUnique({
      where: { id },
      include: {
        category: true,
        designer: {
          select: {
            businessName: true,
            bio: true,
            country: true,
            city: true,
            rating: true,
          },
        },
        images: true,
        sizeVariations: true,
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    const featuredSections = await getFeaturedSections(product.id, ProductType.READY_TO_WEAR);

    res.json({
      success: true,
      data: {
        ...product,
        isFeatured: featuredSections.length > 0,
        featuredSections,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/vendor/:role/:userId', async (req, res, next) => {
  try {
    const role = String(req.params.role || '').toLowerCase();
    const userId = String(req.params.userId || '');
    if (!['seller', 'designer'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vendor role.',
      });
    }

    if (role === 'seller') {
      const seller = await prisma.fabricSellerProfile.findFirst({
        where: { userId },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        },
      });
      if (!seller) {
        return res.status(404).json({ success: false, message: 'Vendor not found.' });
      }

      const fabrics = await prisma.fabric.findMany({
        where: {
          sellerId: seller.id,
          status: ProductStatus.APPROVED,
          isAvailable: true,
        },
        include: {
          images: { orderBy: { sortOrder: 'asc' } },
          materialType: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.json({
        success: true,
        data: {
          vendor: {
            role: 'seller',
            userId: seller.user.id,
            profileId: seller.id,
            businessName:
              seller.businessName ||
              `${seller.user.firstName || ''} ${seller.user.lastName || ''}`.trim(),
            country: seller.country,
            city: seller.city,
            logo: seller.user.avatar || null,
            bio: '',
          },
          products: fabrics,
        },
      });
    }

    const designer = await prisma.designerProfile.findFirst({
      where: { userId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      },
    });
    if (!designer) {
      return res.status(404).json({ success: false, message: 'Vendor not found.' });
    }

    const [designs, readyToWear] = await Promise.all([
      prisma.design.findMany({
        where: {
          designerId: designer.id,
          status: ProductStatus.APPROVED,
          isAvailable: true,
        },
        include: {
          images: { orderBy: { sortOrder: 'asc' } },
          category: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.readyToWear.findMany({
        where: {
          designerId: designer.id,
          status: ProductStatus.APPROVED,
          isAvailable: true,
        },
        include: {
          images: { orderBy: { sortOrder: 'asc' } },
          category: true,
          sizeVariations: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    res.json({
      success: true,
      data: {
        vendor: {
          role: 'designer',
          userId: designer.user.id,
          profileId: designer.id,
          businessName:
            designer.businessName ||
            `${designer.user.firstName || ''} ${designer.user.lastName || ''}`.trim(),
          country: designer.country,
          city: designer.city,
          logo: designer.user.avatar || null,
          bio: designer.bio || '',
        },
        products: {
          designs,
          readyToWear,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get countries list (for filtering)
router.get('/countries', async (req, res, next) => {
  try {
    const [fabricCountries, designerCountries] = await Promise.all([
      prisma.fabricSellerProfile.groupBy({
        by: ['country'],
        where: { isVerified: true },
      }),
      prisma.designerProfile.groupBy({
        by: ['country'],
        where: { isVerified: true },
      }),
    ]);

    const countries = Array.from(new Set([
      ...fabricCountries.map((c) => c.country),
      ...designerCountries.map((c) => c.country),
    ])).sort();

    res.json({
      success: true,
      data: countries,
    });
  } catch (error) {
    next(error);
  }
});

// Get featured products
router.get('/featured', async (req, res, next) => {
  try {
    const [fabricsPool, designsPool, rtwPool] = await Promise.all([
      prisma.fabric.findMany({
        where: { status: ProductStatus.APPROVED, isAvailable: true },
        include: {
          materialType: true,
          images: { take: 1 },
          seller: { select: { country: true } },
        },
      }),
      prisma.design.findMany({
        where: { status: ProductStatus.APPROVED, isAvailable: true },
        include: {
          category: true,
          images: { take: 1 },
          designer: { select: { businessName: true, country: true } },
        },
      }),
      prisma.readyToWear.findMany({
        where: { status: ProductStatus.APPROVED, isAvailable: true },
        include: {
          category: true,
          images: { take: 1 },
          designer: { select: { businessName: true, country: true } },
        },
      }),
    ]);
    let featuredRows: any[] = [];
    try {
      featuredRows = await prisma.featuredProduct.findMany({
        where: { isActive: true },
        orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
      });
    } catch (error) {
      if (!isFeaturedTableMissingError(error)) {
        throw error;
      }
    }

    const fabricsById = new Map(fabricsPool.map((item) => [item.id, item]));
    const designsById = new Map(designsPool.map((item) => [item.id, item]));
    const readyToWearById = new Map(rtwPool.map((item) => [item.id, item]));

    const fabrics: any[] = [];
    const designs: any[] = [];
    const readyToWear: any[] = [];

    for (const row of featuredRows) {
      if (row.productType === ProductType.FABRIC) {
        const item = fabricsById.get(row.productId);
        if (item && fabrics.length < 4) fabrics.push(item);
      } else if (row.productType === ProductType.DESIGN) {
        const item = designsById.get(row.productId);
        if (item && designs.length < 4) designs.push(item);
      } else if (row.productType === ProductType.READY_TO_WEAR) {
        const item = readyToWearById.get(row.productId);
        if (item && readyToWear.length < 4) readyToWear.push(item);
      }
      if (fabrics.length >= 4 && designs.length >= 4 && readyToWear.length >= 4) {
        break;
      }
    }

    if (featuredRows.length === 0) {
      fabrics.push(...fabricsPool.slice(0, 4));
      designs.push(...designsPool.slice(0, 4));
      readyToWear.push(...rtwPool.slice(0, 4));
    }

    res.json({
      success: true,
      data: {
        fabrics,
        designs,
        readyToWear,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;

import { Router } from 'express';
import { z } from 'zod';
import { prisma, UserRole, ProductStatus, OrderStatus } from '../db';
import { authenticate, authorizePermissions } from '../middleware/auth';
import { Permissions } from '../rbac';
import {
  convertLocalToUsd,
  convertUsdToLocal,
  getAllowedCurrenciesForVendor,
  getCurrencyState,
  getProductCurrencyMetadata,
  getUsdPerUnit,
  setProductCurrencyMetadata,
} from '../utils/currency';

const router = Router();

router.use(authenticate);
router.use(authorizePermissions(Permissions.DESIGNER_ACCESS));

const DESIGN_IMAGE_MIN = 4;
const DESIGN_IMAGE_MAX = 6;
const RTW_IMAGE_MIN = 4;
const RTW_IMAGE_MAX = 6;

const uploadedImageSchema = z
  .union([
    z.string().trim().min(1),
    z.object({
      url: z.string().trim().min(1),
      alt: z.string().optional(),
    }),
  ])
  .transform((value) =>
    typeof value === 'string'
      ? {
          url: value,
          alt: undefined,
        }
      : value
  );

function getPrismaValidationErrorMessage(error: any) {
  const code = typeof error?.code === 'string' ? error.code : '';
  const field = error?.meta?.field_name || error?.meta?.target;
  if (code === 'P2002') {
    return `Duplicate value for ${Array.isArray(field) ? field.join(', ') : field || 'a unique field'}.`;
  }
  if (code === 'P2003' || code === 'P2014') {
    return `Invalid reference for ${Array.isArray(field) ? field.join(', ') : field || 'related field'}.`;
  }
  if (code === 'P2025') {
    return 'Referenced record was not found.';
  }
  return null;
}

function percentageChange(currentValue: number, previousValue: number) {
  if (previousValue === 0) {
    return currentValue > 0 ? 100 : 0;
  }
  return Math.round(((currentValue - previousValue) / previousValue) * 100);
}

async function getDesignerProfile(userId: string) {
  return prisma.designerProfile.findFirst({
    where: { userId },
  });
}

async function getMeasurementTemplatesForDesigner() {
  const latest = await prisma.activityLog.findFirst({
    where: { action: 'MEASUREMENT_TEMPLATES_UPDATED' },
    orderBy: { createdAt: 'desc' },
  });
  return Array.isArray((latest?.details as any)?.templates)
    ? (latest?.details as any).templates
    : [
        { name: 'Bust', unit: 'cm', isRequired: true, instructions: '' },
        { name: 'Waist', unit: 'cm', isRequired: true, instructions: '' },
        { name: 'Hip', unit: 'cm', isRequired: true, instructions: '' },
        { name: 'Shoulder Width', unit: 'cm', isRequired: true, instructions: '' },
        { name: 'Sleeve Length', unit: 'cm', isRequired: false, instructions: '' },
        { name: 'Garment Length', unit: 'cm', isRequired: true, instructions: '' },
      ];
}

// Get designer dashboard
router.get('/dashboard', async (req, res, next) => {
  try {
    const profile = await getDesignerProfile(req.user!.id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Designer profile not found.',
      });
    }

    const [totalDesigns, totalReadyToWear, totalOrders, pendingOrders, totalRevenue] = await Promise.all([
      prisma.design.count({ where: { designerId: profile.id } }),
      prisma.readyToWear.count({ where: { designerId: profile.id } }),
      prisma.designOrderItem.count({ where: { designerId: profile.id } }),
      prisma.designOrderItem.count({
        where: { designerId: profile.id, status: 'PENDING' },
      }),
      prisma.designOrderItem.aggregate({
        where: { designerId: profile.id },
        _sum: { price: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        profile,
        stats: {
          totalDesigns,
          totalReadyToWear,
          totalOrders,
          pendingOrders,
          totalRevenue: totalRevenue._sum.price || 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get designer stats for dashboard charts + KPIs
router.get('/stats', async (req, res, next) => {
  try {
    const profile = await getDesignerProfile(req.user!.id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Designer profile not found.',
      });
    }

    const now = new Date();
    const currentPeriodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const previousPeriodStart = new Date(currentPeriodStart.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixMonthsStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [
      totalDesigns,
      totalOrders,
      totalRevenueAgg,
      pendingOrders,
      inProductionOrders,
      completedOrders,
      currentOrders,
      previousOrders,
      currentRevenueAgg,
      previousRevenueAgg,
      topDesignsRaw,
      monthlyOrders,
    ] = await Promise.all([
      prisma.design.count({ where: { designerId: profile.id } }),
      prisma.designOrderItem.count({ where: { designerId: profile.id } }),
      prisma.designOrderItem.aggregate({
        where: { designerId: profile.id },
        _sum: { price: true },
      }),
      prisma.designOrderItem.count({
        where: { designerId: profile.id, status: { in: ['PENDING', 'CONFIRMED', 'FABRIC_RECEIVED'] } },
      }),
      prisma.designOrderItem.count({
        where: { designerId: profile.id, status: 'IN_PRODUCTION' },
      }),
      prisma.designOrderItem.count({
        where: { designerId: profile.id, status: 'COMPLETED' },
      }),
      prisma.designOrderItem.count({
        where: { designerId: profile.id, createdAt: { gte: currentPeriodStart } },
      }),
      prisma.designOrderItem.count({
        where: { designerId: profile.id, createdAt: { gte: previousPeriodStart, lt: currentPeriodStart } },
      }),
      prisma.designOrderItem.aggregate({
        where: { designerId: profile.id, createdAt: { gte: currentPeriodStart } },
        _sum: { price: true },
      }),
      prisma.designOrderItem.aggregate({
        where: { designerId: profile.id, createdAt: { gte: previousPeriodStart, lt: currentPeriodStart } },
        _sum: { price: true },
      }),
      prisma.design.findMany({
        where: { designerId: profile.id },
        select: {
          name: true,
          _count: { select: { orderItems: true } },
        },
        orderBy: {
          orderItems: {
            _count: 'desc',
          },
        },
        take: 4,
      }),
      prisma.designOrderItem.findMany({
        where: { designerId: profile.id, createdAt: { gte: sixMonthsStart } },
        select: { createdAt: true, price: true },
      }),
    ]);

    const monthlyBuckets = Array.from({ length: 6 }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      return {
        key,
        label: date.toLocaleDateString('en-US', { month: 'short' }),
        value: 0,
      };
    });
    const monthlyIndex = new Map(monthlyBuckets.map((bucket, idx) => [bucket.key, idx]));
    for (const order of monthlyOrders) {
      const key = `${order.createdAt.getFullYear()}-${order.createdAt.getMonth()}`;
      const idx = monthlyIndex.get(key);
      if (idx !== undefined) {
        monthlyBuckets[idx].value += Number(order.price || 0);
      }
    }

    res.json({
      success: true,
      data: {
        totalDesigns,
        totalOrders,
        totalRevenue: Number(totalRevenueAgg._sum.price || 0),
        pendingOrders,
        inProductionOrders,
        completedOrders,
        monthlyRevenue: monthlyBuckets.map(({ label, value }) => ({ label, value })),
        topDesigns: topDesignsRaw.map((design) => ({
          label: design.name,
          value: design._count.orderItems,
        })),
        rating: Number(profile.rating || 0),
        revenueChange: percentageChange(
          Number(currentRevenueAgg._sum.price || 0),
          Number(previousRevenueAgg._sum.price || 0)
        ),
        orderChange: percentageChange(currentOrders, previousOrders),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get designer designs
router.get('/designs', async (req, res, next) => {
  try {
    const profile = await getDesignerProfile(req.user!.id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Designer profile not found.',
      });
    }

    const [designs, { matrix, rules }] = await Promise.all([
      prisma.design.findMany({
        where: { designerId: profile.id },
        include: {
          category: true,
          images: true,
          suitableFabrics: {
            include: {
              fabric: {
                select: { name: true, seller: { select: { country: true } } },
              },
            },
          },
          measurementVariables: true,
          _count: { select: { orderItems: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      getCurrencyState(),
    ]);

    const { defaultCurrency } = getAllowedCurrenciesForVendor({
      role: UserRole.FASHION_DESIGNER,
      userId: req.user!.id,
      country: profile.country,
      matrix,
      rules,
    });
    const data = await Promise.all(
      designs.map(async (design) => {
        const metadata = await getProductCurrencyMetadata('DESIGN', design.id);
        const currencyCode = metadata?.currencyCode || defaultCurrency;
        return {
          ...design,
          currencyCode,
          localBasePrice:
            metadata?.localPrice ?? convertUsdToLocal(Number(design.basePrice || 0), currencyCode, matrix),
          basePriceUsd: Number(design.basePrice || 0),
          finalPriceUsd: Number(design.finalPrice || 0),
        };
      })
    );

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/measurement-templates', async (req, res, next) => {
  try {
    const templates = await getMeasurementTemplatesForDesigner();
    res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    next(error);
  }
});

// Create design
router.post('/designs', async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(2),
      description: z.string().min(10),
      categoryId: z.string().uuid(),
      basePrice: z.coerce.number().positive(),
      currencyCode: z.string().min(3).optional(),
      suitableFabricIds: z.array(z.object({
        fabricId: z.string().uuid(),
        yardsNeeded: z.coerce.number().min(1),
      })),
      measurementVariables: z.array(z.object({
        name: z.string(),
        unit: z.string().default('cm'),
        isRequired: z.boolean().default(true),
        instructions: z.string().optional(),
      })).min(1),
      images: z.array(uploadedImageSchema).min(DESIGN_IMAGE_MIN).max(DESIGN_IMAGE_MAX),
    });

    const data = schema.parse(req.body);

    const profile = await getDesignerProfile(req.user!.id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Designer profile not found.',
      });
    }

    const { matrix, rules } = await getCurrencyState();
    const { defaultCurrency, allowedCurrencies } = getAllowedCurrenciesForVendor({
      role: UserRole.FASHION_DESIGNER,
      userId: req.user!.id,
      country: profile.country,
      matrix,
      rules,
    });
    const listingCurrency = (data.currencyCode || defaultCurrency).toUpperCase();
    if (!allowedCurrencies.includes(listingCurrency)) {
      return res.status(400).json({
        success: false,
        message: `Currency ${listingCurrency} is not allowed for your account.`,
      });
    }
    const basePriceUsd = convertLocalToUsd(data.basePrice, listingCurrency, matrix);

    // Apply pricing rules
    let finalPrice = basePriceUsd;
    const markupRule = await prisma.pricingRule.findFirst({
      where: { ruleType: 'GLOBAL_MARKUP', isActive: true },
    });

    if (markupRule?.adjustmentType === 'PERCENTAGE_MARKUP') {
      finalPrice = basePriceUsd * (1 + Number(markupRule.value) / 100);
    }

    const countryRule = await prisma.pricingRule.findFirst({
      where: { ruleType: 'COUNTRY_MARKUP', country: profile.country, isActive: true },
    });

    if (countryRule?.adjustmentType === 'PERCENTAGE_MARKUP') {
      finalPrice = finalPrice * (1 + Number(countryRule.value) / 100);
    }

    const design = await prisma.design.create({
      data: {
        designerId: profile.id,
        name: data.name,
        description: data.description,
        categoryId: data.categoryId,
        basePrice: basePriceUsd,
        finalPrice,
        status: ProductStatus.PENDING_REVIEW,
        suitableFabrics: {
          create: data.suitableFabricIds,
        },
        measurementVariables: {
          create: data.measurementVariables.map((v, i) => ({ ...v, sortOrder: i })),
        },
        images: {
          create: data.images.map((img, i) => ({
            url: img.url,
            alt: img.alt || data.name,
            sortOrder: i,
          })),
        },
      },
      include: {
        category: true,
        suitableFabrics: { include: { fabric: true } },
        measurementVariables: true,
        images: true,
      },
    });

    await prisma.designerProfile.update({
      where: { id: profile.id },
      data: { totalDesigns: { increment: 1 } },
    });

    await setProductCurrencyMetadata({
      userId: req.user!.id,
      productType: 'DESIGN',
      productId: design.id,
      currencyCode: listingCurrency,
      localPrice: data.basePrice,
      usdPrice: basePriceUsd,
      exchangeRate: getUsdPerUnit(listingCurrency, matrix) || 1,
    });

    res.status(201).json({
      success: true,
      message: 'Design submitted for review.',
      data: design,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0];
      const field = firstIssue?.path?.join('.') || 'payload';
      return res.status(400).json({
        success: false,
        message: firstIssue?.message ? `${field}: ${firstIssue.message}` : 'Invalid design payload.',
        errors: error.issues,
      });
    }
    const prismaMessage = getPrismaValidationErrorMessage(error);
    if (prismaMessage) {
      return res.status(400).json({
        success: false,
        message: prismaMessage,
      });
    }
    next(error);
  }
});

router.patch('/designs/:id', async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(2).optional(),
      description: z.string().min(10).optional(),
      categoryId: z.string().uuid().optional(),
      basePrice: z.coerce.number().positive().optional(),
      currencyCode: z.string().min(3).optional(),
      suitableFabricIds: z
        .array(
          z.object({
            fabricId: z.string().uuid(),
            yardsNeeded: z.coerce.number().min(1),
          })
        )
        .optional(),
      measurementVariables: z
        .array(
          z.object({
            name: z.string(),
            unit: z.string().default('cm'),
            isRequired: z.boolean().default(true),
            instructions: z.string().optional(),
          })
        )
        .min(1)
        .optional(),
      images: z
        .array(uploadedImageSchema)
        .min(DESIGN_IMAGE_MIN)
        .max(DESIGN_IMAGE_MAX)
        .optional(),
    });
    const payload = schema.parse(req.body);
    const { id } = req.params;

    const profile = await getDesignerProfile(req.user!.id);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Designer profile not found.',
      });
    }

    const existing = await prisma.design.findFirst({
      where: { id, designerId: profile.id },
      select: { id: true, basePrice: true },
    });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Design not found.',
      });
    }

    const { matrix, rules } = await getCurrencyState();
    const { defaultCurrency, allowedCurrencies } = getAllowedCurrenciesForVendor({
      role: UserRole.FASHION_DESIGNER,
      userId: req.user!.id,
      country: profile.country,
      matrix,
      rules,
    });
    const currentMeta = await getProductCurrencyMetadata('DESIGN', id);
    const listingCurrency = (payload.currencyCode || currentMeta?.currencyCode || defaultCurrency).toUpperCase();
    if (!allowedCurrencies.includes(listingCurrency)) {
      return res.status(400).json({
        success: false,
        message: `Currency ${listingCurrency} is not allowed for your account.`,
      });
    }
    const localBasePrice =
      payload.basePrice ??
      currentMeta?.localPrice ??
      convertUsdToLocal(Number(existing.basePrice || 0), listingCurrency, matrix);
    const basePriceUsd = convertLocalToUsd(localBasePrice, listingCurrency, matrix);

    const updated = await prisma.design.update({
      where: { id },
      data: {
        name: payload.name,
        description: payload.description,
        categoryId: payload.categoryId,
        basePrice: basePriceUsd,
        finalPrice: basePriceUsd,
        status: ProductStatus.PENDING_REVIEW,
        isAvailable: false,
      },
      include: {
        category: true,
        images: true,
        measurementVariables: true,
      },
    });

    if (payload.suitableFabricIds) {
      await prisma.designFabric.deleteMany({ where: { designId: id } });
      await prisma.designFabric.createMany({
        data: payload.suitableFabricIds.map((row) => ({
          designId: id,
          fabricId: row.fabricId,
          yardsNeeded: row.yardsNeeded,
        })),
      });
    }

    if (payload.measurementVariables) {
      await prisma.designMeasurementVariable.deleteMany({ where: { designId: id } });
      await prisma.designMeasurementVariable.createMany({
        data: payload.measurementVariables.map((row, idx) => ({
          designId: id,
          name: row.name,
          unit: row.unit || 'cm',
          isRequired: row.isRequired ?? true,
          instructions: row.instructions || '',
          sortOrder: idx,
        })),
      });
    }

    if (payload.images) {
      await prisma.designImage.deleteMany({ where: { designId: id } });
      await prisma.designImage.createMany({
        data: payload.images.map((img, idx) => ({
          designId: id,
          url: img.url,
          alt: img.alt || updated.name,
          sortOrder: idx,
        })),
      });
    }

    await setProductCurrencyMetadata({
      userId: req.user!.id,
      productType: 'DESIGN',
      productId: id,
      currencyCode: listingCurrency,
      localPrice: localBasePrice,
      usdPrice: basePriceUsd,
      exchangeRate: getUsdPerUnit(listingCurrency, matrix) || 1,
    });

    res.json({
      success: true,
      message: 'Design updated and sent for re-approval.',
      data: updated,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0];
      const field = firstIssue?.path?.join('.') || 'payload';
      return res.status(400).json({
        success: false,
        message: firstIssue?.message ? `${field}: ${firstIssue.message}` : 'Invalid design payload.',
        errors: error.issues,
      });
    }
    const prismaMessage = getPrismaValidationErrorMessage(error);
    if (prismaMessage) {
      return res.status(400).json({
        success: false,
        message: prismaMessage,
      });
    }
    next(error);
  }
});

// Get ready-to-wear products
router.get('/ready-to-wear', async (req, res, next) => {
  try {
    const profile = await getDesignerProfile(req.user!.id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Designer profile not found.',
      });
    }

    const [products, { matrix, rules }] = await Promise.all([
      prisma.readyToWear.findMany({
        where: { designerId: profile.id },
        include: {
          category: true,
          images: true,
          sizeVariations: true,
          _count: { select: { orderItems: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      getCurrencyState(),
    ]);

    const { defaultCurrency } = getAllowedCurrenciesForVendor({
      role: UserRole.FASHION_DESIGNER,
      userId: req.user!.id,
      country: profile.country,
      matrix,
      rules,
    });
    const data = await Promise.all(
      products.map(async (product) => {
        const metadata = await getProductCurrencyMetadata('READY_TO_WEAR', product.id);
        const currencyCode = metadata?.currencyCode || defaultCurrency;
        return {
          ...product,
          currencyCode,
          localBasePrice:
            metadata?.localPrice ?? convertUsdToLocal(Number(product.basePrice || 0), currencyCode, matrix),
          basePriceUsd: Number(product.basePrice || 0),
        };
      })
    );

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
});

// Create ready-to-wear product
router.post('/ready-to-wear', async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(2),
      description: z.string().min(10),
      categoryId: z.string().uuid(),
      basePrice: z.coerce.number().positive(),
      currencyCode: z.string().min(3).optional(),
      sizes: z.array(z.object({
        size: z.string(),
        price: z.coerce.number().positive(),
        stock: z.coerce.number().int().min(0),
      })).min(1),
      images: z.array(uploadedImageSchema).min(RTW_IMAGE_MIN).max(RTW_IMAGE_MAX),
    });

    const data = schema.parse(req.body);

    const profile = await getDesignerProfile(req.user!.id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Designer profile not found.',
      });
    }

    const { matrix, rules } = await getCurrencyState();
    const { defaultCurrency, allowedCurrencies } = getAllowedCurrenciesForVendor({
      role: UserRole.FASHION_DESIGNER,
      userId: req.user!.id,
      country: profile.country,
      matrix,
      rules,
    });
    const listingCurrency = (data.currencyCode || defaultCurrency).toUpperCase();
    if (!allowedCurrencies.includes(listingCurrency)) {
      return res.status(400).json({
        success: false,
        message: `Currency ${listingCurrency} is not allowed for your account.`,
      });
    }
    const basePriceUsd = convertLocalToUsd(data.basePrice, listingCurrency, matrix);

    const product = await prisma.readyToWear.create({
      data: {
        designerId: profile.id,
        name: data.name,
        description: data.description,
        categoryId: data.categoryId,
        basePrice: basePriceUsd,
        status: ProductStatus.PENDING_REVIEW,
        sizeVariations: {
          create: data.sizes.map((size) => ({
            ...size,
            price: convertLocalToUsd(size.price, listingCurrency, matrix),
          })),
        },
        images: {
          create: data.images.map((img, i) => ({
            url: img.url,
            alt: img.alt || data.name,
            sortOrder: i,
          })),
        },
      },
      include: {
        category: true,
        sizeVariations: true,
        images: true,
      },
    });

    await setProductCurrencyMetadata({
      userId: req.user!.id,
      productType: 'READY_TO_WEAR',
      productId: product.id,
      currencyCode: listingCurrency,
      localPrice: data.basePrice,
      usdPrice: basePriceUsd,
      exchangeRate: getUsdPerUnit(listingCurrency, matrix) || 1,
    });

    res.status(201).json({
      success: true,
      message: 'Ready-to-wear product submitted for review.',
      data: product,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0];
      const field = firstIssue?.path?.join('.') || 'payload';
      return res.status(400).json({
        success: false,
        message: firstIssue?.message ? `${field}: ${firstIssue.message}` : 'Invalid ready-to-wear payload.',
        errors: error.issues,
      });
    }
    const prismaMessage = getPrismaValidationErrorMessage(error);
    if (prismaMessage) {
      return res.status(400).json({
        success: false,
        message: prismaMessage,
      });
    }
    next(error);
  }
});

router.patch('/ready-to-wear/:id', async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(2).optional(),
      description: z.string().min(10).optional(),
      categoryId: z.string().uuid().optional(),
      basePrice: z.coerce.number().positive().optional(),
      currencyCode: z.string().min(3).optional(),
      sizes: z
        .array(
          z.object({
            size: z.string(),
            price: z.coerce.number().positive(),
            stock: z.coerce.number().int().min(0),
          })
        )
        .min(1)
        .optional(),
      images: z
        .array(uploadedImageSchema)
        .min(RTW_IMAGE_MIN)
        .max(RTW_IMAGE_MAX)
        .optional(),
    });
    const payload = schema.parse(req.body);
    const { id } = req.params;

    const profile = await getDesignerProfile(req.user!.id);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Designer profile not found.',
      });
    }

    const existing = await prisma.readyToWear.findFirst({
      where: { id, designerId: profile.id },
      select: { id: true, basePrice: true },
    });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Ready-to-wear product not found.',
      });
    }

    const { matrix, rules } = await getCurrencyState();
    const { defaultCurrency, allowedCurrencies } = getAllowedCurrenciesForVendor({
      role: UserRole.FASHION_DESIGNER,
      userId: req.user!.id,
      country: profile.country,
      matrix,
      rules,
    });
    const currentMeta = await getProductCurrencyMetadata('READY_TO_WEAR', id);
    const listingCurrency = (payload.currencyCode || currentMeta?.currencyCode || defaultCurrency).toUpperCase();
    if (!allowedCurrencies.includes(listingCurrency)) {
      return res.status(400).json({
        success: false,
        message: `Currency ${listingCurrency} is not allowed for your account.`,
      });
    }
    const localBasePrice =
      payload.basePrice ??
      currentMeta?.localPrice ??
      convertUsdToLocal(Number(existing.basePrice || 0), listingCurrency, matrix);
    const basePriceUsd = convertLocalToUsd(localBasePrice, listingCurrency, matrix);

    const updated = await prisma.readyToWear.update({
      where: { id },
      data: {
        name: payload.name,
        description: payload.description,
        categoryId: payload.categoryId,
        basePrice: basePriceUsd,
        status: ProductStatus.PENDING_REVIEW,
        isAvailable: false,
      },
      include: {
        category: true,
        images: true,
        sizeVariations: true,
      },
    });

    if (payload.sizes) {
      await prisma.readyToWearSize.deleteMany({ where: { readyToWearId: id } });
      await prisma.readyToWearSize.createMany({
        data: payload.sizes.map((size) => ({
          readyToWearId: id,
          size: size.size,
          price: convertLocalToUsd(size.price, listingCurrency, matrix),
          stock: size.stock,
        })),
      });
    }

    if (payload.images) {
      await prisma.readyToWearImage.deleteMany({ where: { readyToWearId: id } });
      await prisma.readyToWearImage.createMany({
        data: payload.images.map((img, idx) => ({
          readyToWearId: id,
          url: img.url,
          alt: img.alt || updated.name,
          sortOrder: idx,
        })),
      });
    }

    await setProductCurrencyMetadata({
      userId: req.user!.id,
      productType: 'READY_TO_WEAR',
      productId: id,
      currencyCode: listingCurrency,
      localPrice: localBasePrice,
      usdPrice: basePriceUsd,
      exchangeRate: getUsdPerUnit(listingCurrency, matrix) || 1,
    });

    res.json({
      success: true,
      message: 'Ready-to-wear updated and sent for re-approval.',
      data: updated,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0];
      const field = firstIssue?.path?.join('.') || 'payload';
      return res.status(400).json({
        success: false,
        message: firstIssue?.message ? `${field}: ${firstIssue.message}` : 'Invalid ready-to-wear payload.',
        errors: error.issues,
      });
    }
    const prismaMessage = getPrismaValidationErrorMessage(error);
    if (prismaMessage) {
      return res.status(400).json({
        success: false,
        message: prismaMessage,
      });
    }
    next(error);
  }
});

router.patch('/ready-to-wear/:id/stock', async (req, res, next) => {
  try {
    const schema = z.object({
      sizes: z.array(
        z.object({
          id: z.string().uuid(),
          stock: z.number().int().min(0),
        })
      ),
    });
    const payload = schema.parse(req.body);
    const { id } = req.params;

    const profile = await getDesignerProfile(req.user!.id);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Designer profile not found.',
      });
    }

    const product = await prisma.readyToWear.findFirst({
      where: { id, designerId: profile.id },
      select: { id: true },
    });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Ready-to-wear product not found.',
      });
    }

    const targetSizeIds = payload.sizes.map((row) => row.id);
    const validSizeCount = await prisma.readyToWearSize.count({
      where: {
        id: { in: targetSizeIds },
        readyToWearId: id,
      },
    });
    if (validSizeCount !== targetSizeIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more size rows are invalid for this product.',
      });
    }

    await prisma.$transaction(
      payload.sizes.map((row) =>
        prisma.readyToWearSize.update({
          where: { id: row.id },
          data: { stock: row.stock },
        })
      )
    );

    const sizes = await prisma.readyToWearSize.findMany({
      where: { readyToWearId: id },
      orderBy: { size: 'asc' },
    });

    res.json({
      success: true,
      message: 'Stock updated successfully.',
      data: sizes,
    });
  } catch (error) {
    next(error);
  }
});

// Get design orders
router.get('/orders', async (req, res, next) => {
  try {
    const profile = await getDesignerProfile(req.user!.id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Designer profile not found.',
      });
    }

    const orders = await prisma.designOrderItem.findMany({
      where: { designerId: profile.id },
      include: {
        design: {
          select: { name: true, images: { take: 1 } },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            createdAt: true,
            total: true,
            shippingAddress: true,
            customer: {
              select: { firstName: true, lastName: true },
            },
            fabricOrder: {
              include: {
                fabric: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
});

// Update design order item status
router.patch('/orders/:id/status', async (req, res, next) => {
  try {
    const schema = z.object({
      status: z.enum(['PENDING', 'CONFIRMED', 'FABRIC_RECEIVED', 'IN_PRODUCTION', 'COMPLETED', 'READY_FOR_QA']),
      notes: z.string().optional(),
    });
    const { status, notes } = schema.parse(req.body);
    const { id } = req.params;

    const profile = await getDesignerProfile(req.user!.id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Designer profile not found.',
      });
    }

    const orderItem = await prisma.designOrderItem.findFirst({
      where: { id, designerId: profile.id },
      select: { id: true, orderId: true },
    });

    if (!orderItem) {
      return res.status(404).json({
        success: false,
        message: 'Order item not found.',
      });
    }

    const normalizedStatus: 'PENDING' | 'CONFIRMED' | 'FABRIC_RECEIVED' | 'IN_PRODUCTION' | 'COMPLETED' =
      status === 'READY_FOR_QA' ? 'COMPLETED' : status;
    const orderStatusMap: Record<'PENDING' | 'CONFIRMED' | 'FABRIC_RECEIVED' | 'IN_PRODUCTION' | 'COMPLETED', OrderStatus> = {
      PENDING: OrderStatus.PAYMENT_CONFIRMED,
      CONFIRMED: OrderStatus.PAYMENT_CONFIRMED,
      FABRIC_RECEIVED: OrderStatus.FABRIC_RECEIVED,
      IN_PRODUCTION: OrderStatus.IN_PRODUCTION,
      COMPLETED: OrderStatus.PRODUCTION_COMPLETE,
    };

    const [updatedItem] = await prisma.$transaction([
      prisma.designOrderItem.update({
        where: { id },
        data: { status: normalizedStatus },
      }),
      prisma.order.update({
        where: { id: orderItem.orderId },
        data: { status: orderStatusMap[normalizedStatus] },
      }),
      prisma.orderTimeline.create({
        data: {
          orderId: orderItem.orderId,
          status: orderStatusMap[normalizedStatus],
          notes: notes || `Designer updated status to ${normalizedStatus}`,
          updatedById: req.user!.id,
          updatedByRole: UserRole.FASHION_DESIGNER,
        },
      }),
    ]);

    res.json({
      success: true,
      message: 'Order status updated successfully.',
      data: updatedItem,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

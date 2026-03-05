import { Router } from 'express';
import { z } from 'zod';
import { prisma, UserRole, ProductStatus, OrderStatus } from '../db';
import { authenticate, authorizePermissions } from '../middleware/auth';
import { Permissions } from '../rbac';

const router = Router();

router.use(authenticate);
router.use(authorizePermissions(Permissions.DESIGNER_ACCESS));

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

    const designs = await prisma.design.findMany({
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
    });

    res.json({
      success: true,
      data: designs,
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
      basePrice: z.number().positive(),
      suitableFabricIds: z.array(z.object({
        fabricId: z.string().uuid(),
        yardsNeeded: z.number().min(1),
      })),
      measurementVariables: z.array(z.object({
        name: z.string(),
        unit: z.string().default('cm'),
        isRequired: z.boolean().default(true),
        instructions: z.string().optional(),
      })),
      images: z.array(z.object({
        url: z.string().url(),
        alt: z.string().optional(),
      })),
    });

    const data = schema.parse(req.body);

    const profile = await getDesignerProfile(req.user!.id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Designer profile not found.',
      });
    }

    // Apply pricing rules
    let finalPrice = data.basePrice;
    const markupRule = await prisma.pricingRule.findFirst({
      where: { ruleType: 'GLOBAL_MARKUP', isActive: true },
    });

    if (markupRule?.adjustmentType === 'PERCENTAGE_MARKUP') {
      finalPrice = data.basePrice * (1 + Number(markupRule.value) / 100);
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
        basePrice: data.basePrice,
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

    res.status(201).json({
      success: true,
      message: 'Design submitted for review.',
      data: design,
    });
  } catch (error) {
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

    const products = await prisma.readyToWear.findMany({
      where: { designerId: profile.id },
      include: {
        category: true,
        images: true,
        sizeVariations: true,
        _count: { select: { orderItems: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: products,
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
      basePrice: z.number().positive(),
      sizes: z.array(z.object({
        size: z.string(),
        price: z.number().positive(),
        stock: z.number().min(0),
      })),
      images: z.array(z.object({
        url: z.string().url(),
        alt: z.string().optional(),
      })),
    });

    const data = schema.parse(req.body);

    const profile = await getDesignerProfile(req.user!.id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Designer profile not found.',
      });
    }

    const product = await prisma.readyToWear.create({
      data: {
        designerId: profile.id,
        name: data.name,
        description: data.description,
        categoryId: data.categoryId,
        basePrice: data.basePrice,
        status: ProductStatus.PENDING_REVIEW,
        sizeVariations: {
          create: data.sizes,
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

    res.status(201).json({
      success: true,
      message: 'Ready-to-wear product submitted for review.',
      data: product,
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

import { Router } from 'express';
import { z } from 'zod';
import { prisma, UserRole, ProductStatus, OrderStatus } from '../db';
import { authenticate, authorizePermissions } from '../middleware/auth';
import { Permissions } from '../rbac';

const router = Router();

router.use(authenticate);
router.use(authorizePermissions(Permissions.SELLER_ACCESS));

const FABRIC_IMAGE_MIN = 3;
const FABRIC_IMAGE_MAX = 4;

function percentageChange(currentValue: number, previousValue: number) {
  if (previousValue === 0) {
    return currentValue > 0 ? 100 : 0;
  }
  return Math.round(((currentValue - previousValue) / previousValue) * 100);
}

async function getSellerProfile(userId: string) {
  return prisma.fabricSellerProfile.findFirst({
    where: { userId },
  });
}

async function computeFinalFabricPrice(sellerPrice: number, country: string) {
  let finalPrice = sellerPrice;
  const markupRule = await prisma.pricingRule.findFirst({
    where: {
      ruleType: 'GLOBAL_MARKUP',
      isActive: true,
    },
  });

  if (markupRule && markupRule.adjustmentType === 'PERCENTAGE_MARKUP') {
    finalPrice = sellerPrice * (1 + Number(markupRule.value) / 100);
  }

  const countryRule = await prisma.pricingRule.findFirst({
    where: {
      ruleType: 'COUNTRY_MARKUP',
      country,
      isActive: true,
    },
  });

  if (countryRule && countryRule.adjustmentType === 'PERCENTAGE_MARKUP') {
    finalPrice = finalPrice * (1 + Number(countryRule.value) / 100);
  }
  return finalPrice;
}

// Get seller dashboard
router.get('/dashboard', async (req, res, next) => {
  try {
    const profile = await getSellerProfile(req.user!.id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Seller profile not found.',
      });
    }

    const [totalFabrics, totalOrders, pendingOrders, totalRevenue] = await Promise.all([
      prisma.fabric.count({ where: { sellerId: profile.id } }),
      prisma.fabricOrderItem.count({ where: { sellerId: profile.id } }),
      prisma.fabricOrderItem.count({
        where: { sellerId: profile.id, status: 'PENDING' },
      }),
      prisma.fabricOrderItem.aggregate({
        where: { sellerId: profile.id },
        _sum: { totalPrice: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        profile,
        stats: {
          totalFabrics,
          totalOrders,
          pendingOrders,
          totalRevenue: totalRevenue._sum.totalPrice || 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get seller stats (dashboard charts + KPIs)
router.get('/stats', async (req, res, next) => {
  try {
    const profile = await getSellerProfile(req.user!.id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Seller profile not found.',
      });
    }

    const now = new Date();
    const currentPeriodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const previousPeriodStart = new Date(currentPeriodStart.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixMonthsStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [
      totalFabrics,
      totalSales,
      totalRevenueAgg,
      pendingOrders,
      lowStockItems,
      currentSales,
      previousSales,
      currentRevenueAgg,
      previousRevenueAgg,
      topFabricsRaw,
      monthlyOrders,
    ] = await Promise.all([
      prisma.fabric.count({ where: { sellerId: profile.id } }),
      prisma.fabricOrderItem.count({ where: { sellerId: profile.id } }),
      prisma.fabricOrderItem.aggregate({
        where: { sellerId: profile.id },
        _sum: { totalPrice: true },
      }),
      prisma.fabricOrderItem.count({
        where: { sellerId: profile.id, status: 'CONFIRMED' },
      }),
      prisma.fabric.count({
        where: { sellerId: profile.id, stockYards: { lt: 20 } },
      }),
      prisma.fabricOrderItem.count({
        where: { sellerId: profile.id, createdAt: { gte: currentPeriodStart } },
      }),
      prisma.fabricOrderItem.count({
        where: { sellerId: profile.id, createdAt: { gte: previousPeriodStart, lt: currentPeriodStart } },
      }),
      prisma.fabricOrderItem.aggregate({
        where: { sellerId: profile.id, createdAt: { gte: currentPeriodStart } },
        _sum: { totalPrice: true },
      }),
      prisma.fabricOrderItem.aggregate({
        where: { sellerId: profile.id, createdAt: { gte: previousPeriodStart, lt: currentPeriodStart } },
        _sum: { totalPrice: true },
      }),
      prisma.fabric.findMany({
        where: { sellerId: profile.id },
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
      prisma.fabricOrderItem.findMany({
        where: { sellerId: profile.id, createdAt: { gte: sixMonthsStart } },
        select: { createdAt: true },
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
        monthlyBuckets[idx].value += 1;
      }
    }

    res.json({
      success: true,
      data: {
        totalFabrics,
        totalSales,
        totalRevenue: Number(totalRevenueAgg._sum.totalPrice || 0),
        pendingOrders,
        lowStockItems,
        monthlySales: monthlyBuckets.map(({ label, value }) => ({ label, value })),
        topFabrics: topFabricsRaw.map((fabric) => ({
          label: fabric.name,
          value: fabric._count.orderItems,
        })),
        salesChange: percentageChange(currentSales, previousSales),
        revenueChange: percentageChange(
          Number(currentRevenueAgg._sum.totalPrice || 0),
          Number(previousRevenueAgg._sum.totalPrice || 0)
        ),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get seller fabrics
router.get('/fabrics', async (req, res, next) => {
  try {
    const profile = await getSellerProfile(req.user!.id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Seller profile not found.',
      });
    }

    const fabrics = await prisma.fabric.findMany({
      where: { sellerId: profile.id },
      include: {
        materialType: true,
        images: true,
        _count: { select: { orderItems: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: fabrics,
    });
  } catch (error) {
    next(error);
  }
});

// Create fabric
router.post('/fabrics', async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(2),
      description: z.string().min(10),
      materialTypeId: z.string().uuid(),
      sellerPrice: z.number().positive(),
      minYards: z.number().min(1),
      stockYards: z.number().min(0),
      images: z
        .array(
          z.object({
            url: z.string().url(),
            alt: z.string().optional(),
          })
        )
        .min(FABRIC_IMAGE_MIN)
        .max(FABRIC_IMAGE_MAX),
    });

    const data = schema.parse(req.body);

    const profile = await getSellerProfile(req.user!.id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Seller profile not found.',
      });
    }

    const finalPrice = await computeFinalFabricPrice(data.sellerPrice, profile.country);

    const fabric = await prisma.fabric.create({
      data: {
        sellerId: profile.id,
        name: data.name,
        description: data.description,
        materialTypeId: data.materialTypeId,
        sellerPrice: data.sellerPrice,
        finalPrice,
        minYards: data.minYards,
        stockYards: data.stockYards,
        status: ProductStatus.PENDING_REVIEW,
        images: {
          create: data.images.map((img, i) => ({
            url: img.url,
            alt: img.alt || data.name,
            sortOrder: i,
          })),
        },
      },
      include: {
        materialType: true,
        images: true,
      },
    });

    // Update seller fabric count
    await prisma.fabricSellerProfile.update({
      where: { id: profile.id },
      data: { totalFabrics: { increment: 1 } },
    });

    res.status(201).json({
      success: true,
      message: 'Fabric submitted for review.',
      data: fabric,
    });
  } catch (error) {
    next(error);
  }
});

// Edit owned fabric product (re-approval required on edits)
router.patch('/fabrics/:id', async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(2).optional(),
      description: z.string().min(10).optional(),
      materialTypeId: z.string().uuid().optional(),
      sellerPrice: z.number().positive().optional(),
      minYards: z.number().int().min(1).optional(),
      stockYards: z.number().int().min(0).optional(),
      images: z
        .array(
          z.object({
            url: z.string().url(),
            alt: z.string().optional(),
          })
        )
        .min(FABRIC_IMAGE_MIN)
        .max(FABRIC_IMAGE_MAX)
        .optional(),
    });
    const payload = schema.parse(req.body);
    const { id } = req.params;

    const profile = await getSellerProfile(req.user!.id);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Seller profile not found.',
      });
    }

    const existing = await prisma.fabric.findFirst({
      where: { id, sellerId: profile.id },
      select: { id: true, sellerPrice: true },
    });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Fabric not found.',
      });
    }

    const effectiveSellerPrice = payload.sellerPrice ?? Number(existing.sellerPrice);
    const finalPrice = await computeFinalFabricPrice(effectiveSellerPrice, profile.country);

    const updated = await prisma.fabric.update({
      where: { id },
      data: {
        name: payload.name,
        description: payload.description,
        materialTypeId: payload.materialTypeId,
        sellerPrice: payload.sellerPrice,
        finalPrice,
        minYards: payload.minYards,
        stockYards: payload.stockYards,
        status: ProductStatus.PENDING_REVIEW,
        isAvailable: false,
      },
      include: {
        materialType: true,
        images: true,
      },
    });

    if (payload.images) {
      await prisma.fabricImage.deleteMany({ where: { fabricId: id } });
      await prisma.fabricImage.createMany({
        data: payload.images.map((img, idx) => ({
          fabricId: id,
          url: img.url,
          alt: img.alt || updated.name,
          sortOrder: idx,
        })),
      });
    }

    res.json({
      success: true,
      message: 'Fabric updated and sent for re-approval.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

// Update stock for owned fabric
router.patch('/fabrics/:id/stock', async (req, res, next) => {
  try {
    const schema = z.object({
      stock: z.number().int().min(0),
    });
    const { stock } = schema.parse(req.body);
    const { id } = req.params;

    const profile = await getSellerProfile(req.user!.id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Seller profile not found.',
      });
    }

    const fabric = await prisma.fabric.findFirst({
      where: { id, sellerId: profile.id },
      select: { id: true },
    });

    if (!fabric) {
      return res.status(404).json({
        success: false,
        message: 'Fabric not found.',
      });
    }

    const updated = await prisma.fabric.update({
      where: { id },
      data: { stockYards: stock },
      include: {
        materialType: true,
        images: true,
      },
    });

    res.json({
      success: true,
      message: 'Stock updated successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

// Get fabric orders
router.get('/orders', async (req, res, next) => {
  try {
    const profile = await getSellerProfile(req.user!.id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Seller profile not found.',
      });
    }

    const orders = await prisma.fabricOrderItem.findMany({
      where: { sellerId: profile.id },
      include: {
        fabric: {
          select: { name: true, images: { take: 1 } },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            createdAt: true,
            customer: {
              select: { firstName: true, lastName: true },
            },
            designOrder: {
              include: {
                design: {
                  select: {
                    designer: {
                      select: { country: true },
                    },
                  },
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

// Update fabric order item status
router.patch('/orders/:id/status', async (req, res, next) => {
  try {
    const schema = z.object({
      status: z.enum(['PENDING', 'CONFIRMED', 'SHIPPED_TO_DESIGNER', 'DELIVERED']),
      trackingNumber: z.string().optional(),
      notes: z.string().optional(),
    });
    const { status, trackingNumber, notes } = schema.parse(req.body);
    const { id } = req.params;

    const profile = await getSellerProfile(req.user!.id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Seller profile not found.',
      });
    }

    const orderItem = await prisma.fabricOrderItem.findFirst({
      where: { id, sellerId: profile.id },
      select: { id: true, orderId: true },
    });

    if (!orderItem) {
      return res.status(404).json({
        success: false,
        message: 'Order item not found.',
      });
    }

    const orderStatusMap: Record<typeof status, OrderStatus> = {
      PENDING: OrderStatus.FABRIC_PENDING,
      CONFIRMED: OrderStatus.FABRIC_CONFIRMED,
      SHIPPED_TO_DESIGNER: OrderStatus.FABRIC_SHIPPED,
      DELIVERED: OrderStatus.FABRIC_RECEIVED,
    };

    const [updatedItem] = await prisma.$transaction([
      prisma.fabricOrderItem.update({
        where: { id },
        data: {
          status,
          ...(status === 'SHIPPED_TO_DESIGNER' && { shippedToDesignerAt: new Date() }),
          ...(trackingNumber ? { trackingNumber } : {}),
        },
      }),
      prisma.order.update({
        where: { id: orderItem.orderId },
        data: { status: orderStatusMap[status] },
      }),
      prisma.orderTimeline.create({
        data: {
          orderId: orderItem.orderId,
          status: orderStatusMap[status],
          notes: notes || `Fabric seller updated status to ${status}`,
          updatedById: req.user!.id,
          updatedByRole: UserRole.FABRIC_SELLER,
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

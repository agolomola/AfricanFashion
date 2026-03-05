import { Router } from 'express';
import { z } from 'zod';
import { prisma, UserRole, UserStatus, ProductStatus, OrderStatus } from '../db';
import { authenticate, authorizePermissions } from '../middleware/auth';
import { Permissions } from '../rbac';

const router = Router();

function parsePagination(pageValue: unknown, limitValue: unknown, defaultLimit = 20) {
  const page = Math.max(1, Number.parseInt(String(pageValue ?? '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(String(limitValue ?? defaultLimit), 10) || defaultLimit));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function percentageChange(currentValue: number, previousValue: number) {
  if (previousValue === 0) {
    return currentValue > 0 ? 100 : 0;
  }
  return Math.round(((currentValue - previousValue) / previousValue) * 100);
}

// All admin routes require admin role
router.use(authenticate);
router.use(authorizePermissions(Permissions.ADMIN_ACCESS));

// ==================== DASHBOARD STATS ====================

router.get('/dashboard', async (req, res, next) => {
  try {
    const requestedRange = String(req.query.range || '7d');
    const range = (['24h', '7d', '30d', '90d'] as const).includes(requestedRange as any)
      ? (requestedRange as '24h' | '7d' | '30d' | '90d')
      : '7d';
    const rangeDurationMs =
      range === '24h'
        ? 24 * 60 * 60 * 1000
        : range === '30d'
          ? 30 * 24 * 60 * 60 * 1000
          : range === '90d'
            ? 90 * 24 * 60 * 60 * 1000
            : 7 * 24 * 60 * 60 * 1000;
    const now = new Date();
    const rangeStart = new Date(now.getTime() - rangeDurationMs);
    const previousRangeStart = new Date(rangeStart.getTime() - rangeDurationMs);

    const [
      totalUsers,
      totalCustomers,
      totalFabricSellers,
      totalDesigners,
      totalQa,
      pendingApprovals,
      totalOrders,
      totalRevenue,
      totalProducts,
      pendingOrders,
      inProductionOrders,
      currentRevenue,
      previousRevenue,
      currentOrders,
      previousOrders,
      currentUsers,
      previousUsers,
      currentProducts,
      previousProducts,
      statusCounts,
      paidOrdersInRange,
      recentOrders,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: UserRole.CUSTOMER } }),
      prisma.user.count({ where: { role: UserRole.FABRIC_SELLER } }),
      prisma.user.count({ where: { role: UserRole.FASHION_DESIGNER } }),
      prisma.user.count({ where: { role: UserRole.QA_TEAM } }),
      prisma.user.count({
        where: {
          role: { in: [UserRole.FABRIC_SELLER, UserRole.FASHION_DESIGNER] },
          status: UserStatus.PENDING,
        },
      }),
      prisma.order.count(),
      prisma.order.aggregate({
        where: { paymentStatus: 'COMPLETED' },
        _sum: { total: true },
      }),
      prisma.$transaction([
        prisma.fabric.count(),
        prisma.design.count(),
        prisma.readyToWear.count(),
      ]).then(([fabrics, designs, rtw]) => fabrics + designs + rtw),
      prisma.order.count({
        where: {
          status: {
            in: [
              OrderStatus.PENDING_PAYMENT,
              OrderStatus.PAYMENT_CONFIRMED,
              OrderStatus.FABRIC_PENDING,
              OrderStatus.FABRIC_CONFIRMED,
            ],
          },
        },
      }),
      prisma.order.count({
        where: {
          status: {
            in: [
              OrderStatus.FABRIC_RECEIVED,
              OrderStatus.IN_PRODUCTION,
              OrderStatus.PRODUCTION_COMPLETE,
              OrderStatus.QA_PENDING,
              OrderStatus.QA_INSPECTING,
            ],
          },
        },
      }),
      prisma.order.aggregate({
        where: {
          paymentStatus: 'COMPLETED',
          paidAt: { gte: rangeStart },
        },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: {
          paymentStatus: 'COMPLETED',
          paidAt: { gte: previousRangeStart, lt: rangeStart },
        },
        _sum: { total: true },
      }),
      prisma.order.count({
        where: {
          createdAt: { gte: rangeStart },
        },
      }),
      prisma.order.count({
        where: {
          createdAt: { gte: previousRangeStart, lt: rangeStart },
        },
      }),
      prisma.user.count({
        where: {
          createdAt: { gte: rangeStart },
        },
      }),
      prisma.user.count({
        where: {
          createdAt: { gte: previousRangeStart, lt: rangeStart },
        },
      }),
      prisma.$transaction([
        prisma.fabric.count({ where: { createdAt: { gte: rangeStart } } }),
        prisma.design.count({ where: { createdAt: { gte: rangeStart } } }),
        prisma.readyToWear.count({ where: { createdAt: { gte: rangeStart } } }),
      ]).then(([fabrics, designs, rtw]) => fabrics + designs + rtw),
      prisma.$transaction([
        prisma.fabric.count({ where: { createdAt: { gte: previousRangeStart, lt: rangeStart } } }),
        prisma.design.count({ where: { createdAt: { gte: previousRangeStart, lt: rangeStart } } }),
        prisma.readyToWear.count({ where: { createdAt: { gte: previousRangeStart, lt: rangeStart } } }),
      ]).then(([fabrics, designs, rtw]) => fabrics + designs + rtw),
      prisma.order.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      prisma.order.findMany({
        where: {
          paymentStatus: 'COMPLETED',
          paidAt: { gte: rangeStart },
        },
        select: { paidAt: true, total: true },
      }),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
      }),
    ]);

    const bucketCount = 6;
    const bucketSizeMs = Math.max(1, Math.floor(rangeDurationMs / bucketCount));
    const revenueBuckets = Array.from({ length: bucketCount }, (_, index) => {
      const bucketEnd = new Date(rangeStart.getTime() + bucketSizeMs * (index + 1));
      return {
        label:
          range === '24h'
            ? bucketEnd.toLocaleTimeString('en-US', { hour: 'numeric' })
            : bucketEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: 0,
      };
    });

    for (const order of paidOrdersInRange) {
      if (!order.paidAt) continue;
      const diffMs = order.paidAt.getTime() - rangeStart.getTime();
      if (diffMs < 0) continue;
      const bucketIndex = Math.min(bucketCount - 1, Math.floor(diffMs / bucketSizeMs));
      revenueBuckets[bucketIndex].value += Number(order.total || 0);
    }

    const ordersByStatus = statusCounts.map((entry) => ({
      label: entry.status.replace(/_/g, ' '),
      value: entry._count._all,
    }));

    const currentRevenueValue = Number(currentRevenue._sum.total || 0);
    const previousRevenueValue = Number(previousRevenue._sum.total || 0);

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          customers: totalCustomers,
          fabricSellers: totalFabricSellers,
          designers: totalDesigners,
          qa: totalQa,
          pendingApprovals,
        },
        orders: {
          total: totalOrders,
          revenue: totalRevenue._sum.total || 0,
        },
        products: {
          total: totalProducts,
        },
        pendingOrders,
        inProductionOrders,
        revenueChange: percentageChange(currentRevenueValue, previousRevenueValue),
        orderChange: percentageChange(currentOrders, previousOrders),
        userChange: percentageChange(currentUsers, previousUsers),
        productChange: percentageChange(currentProducts, previousProducts),
        monthlyRevenue: revenueBuckets,
        ordersByStatus,
        usersByRole: [
          { label: 'Customers', value: totalCustomers },
          { label: 'Designers', value: totalDesigners },
          { label: 'Sellers', value: totalFabricSellers },
          { label: 'QA Team', value: totalQa },
        ],
        range,
        recentOrders,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ==================== USER MANAGEMENT ====================

// Get all users with filters
router.get('/users', async (req, res, next) => {
  try {
    const { role, status, search, page, limit } = req.query;

    const where: any = {};
    if (role) where.role = role;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { email: { contains: search as string, mode: 'insensitive' } },
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const pagination = parsePagination(page, limit, 20);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          createdAt: true,
          lastLogin: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        users,
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

// Get pending approvals
router.get('/users/pending', async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        status: UserStatus.PENDING,
        role: { in: [UserRole.FABRIC_SELLER, UserRole.FASHION_DESIGNER] },
      },
      include: {
        fabricSellerProfile: true,
        designerProfile: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
});

// Approve/reject user
router.patch('/users/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const schema = z.object({
      status: z.nativeEnum(UserStatus),
      reason: z.string().optional(),
    });
    const { status, reason } = schema.parse(req.body);

    const user = await prisma.user.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
      },
    });

    // TODO: Send notification email to user

    res.json({
      success: true,
      message: `User ${status.toLowerCase()} successfully.`,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

// ==================== PRODUCT CATEGORIES ====================

// Get all categories
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await prisma.productCategory.findMany({
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

// Create category
router.post('/categories', async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(2),
      slug: z.string().min(2),
      description: z.string().optional(),
      sortOrder: z.number().default(0),
    });

    const data = schema.parse(req.body);

    const category = await prisma.productCategory.create({
      data,
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully.',
      data: category,
    });
  } catch (error) {
    next(error);
  }
});

// Update category
router.patch('/categories/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, isActive, sortOrder } = req.body;

    const category = await prisma.productCategory.update({
      where: { id },
      data: { name, description, isActive, sortOrder },
    });

    res.json({
      success: true,
      message: 'Category updated successfully.',
      data: category,
    });
  } catch (error) {
    next(error);
  }
});

// Delete category
router.delete('/categories/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.productCategory.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Category deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
});

// ==================== MATERIAL TYPES ====================

// Get all material types
router.get('/materials', async (req, res, next) => {
  try {
    const materials = await prisma.materialType.findMany({
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

// Create material type
router.post('/materials', async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(2),
      slug: z.string().min(2),
      description: z.string().optional(),
    });

    const data = schema.parse(req.body);

    const material = await prisma.materialType.create({
      data,
    });

    res.status(201).json({
      success: true,
      message: 'Material type created successfully.',
      data: material,
    });
  } catch (error) {
    next(error);
  }
});

// Update material type
router.patch('/materials/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    const material = await prisma.materialType.update({
      where: { id },
      data: { name, description, isActive },
    });

    res.json({
      success: true,
      message: 'Material type updated successfully.',
      data: material,
    });
  } catch (error) {
    next(error);
  }
});

// Delete material type
router.delete('/materials/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.materialType.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Material type deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
});

// ==================== PRICING RULES ====================

// Get all pricing rules
router.get('/pricing-rules', async (req, res, next) => {
  try {
    const rules = await prisma.pricingRule.findMany({
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });

    res.json({
      success: true,
      data: rules,
    });
  } catch (error) {
    next(error);
  }
});

// Create pricing rule
router.post('/pricing-rules', async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(2),
      description: z.string().optional(),
      ruleType: z.enum(['GLOBAL_MARKUP', 'CATEGORY_MARKUP', 'COUNTRY_MARKUP', 'DATE_BASED']),
      productType: z.enum(['FABRIC', 'DESIGN', 'READY_TO_WEAR']).optional(),
      country: z.string().optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      isSale: z.boolean().default(false),
      adjustmentType: z.enum(['PERCENTAGE_MARKUP', 'PERCENTAGE_DISCOUNT', 'FIXED_MARKUP', 'FIXED_DISCOUNT']),
      value: z.number().positive(),
      priority: z.number().default(0),
    });

    const data = schema.parse(req.body);

    const rule = await prisma.pricingRule.create({
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        createdById: req.user!.id,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Pricing rule created successfully.',
      data: rule,
    });
  } catch (error) {
    next(error);
  }
});

// Update pricing rule
router.patch('/pricing-rules/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.startDate) {
      updateData.startDate = new Date(updateData.startDate);
    }
    if (updateData.endDate) {
      updateData.endDate = new Date(updateData.endDate);
    }

    const rule = await prisma.pricingRule.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      message: 'Pricing rule updated successfully.',
      data: rule,
    });
  } catch (error) {
    next(error);
  }
});

// Delete pricing rule
router.delete('/pricing-rules/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.pricingRule.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Pricing rule deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
});

// ==================== ORDERS ====================

// Get all orders
router.get('/orders', async (req, res, next) => {
  try {
    const { status, page, limit } = req.query;

    const where: any = {};
    if (status) where.status = status;

    const pagination = parsePagination(page, limit, 20);

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: { firstName: true, lastName: true, email: true },
          },
          designOrder: {
            include: {
              design: {
                select: {
                  name: true,
                  designer: {
                    include: {
                      user: {
                        select: { firstName: true, lastName: true },
                      },
                    },
                  },
                },
              },
            },
          },
          fabricOrder: {
            include: {
              fabric: {
                select: {
                  name: true,
                  seller: {
                    include: {
                      user: {
                        select: { firstName: true, lastName: true },
                      },
                    },
                  },
                },
              },
            },
          },
          readyToWearItems: {
            include: {
              readyToWear: {
                select: {
                  name: true,
                  designer: {
                    include: {
                      user: {
                        select: { firstName: true, lastName: true },
                      },
                    },
                  },
                },
              },
            },
          },
          qa: {
            include: {
              user: {
                select: { firstName: true, lastName: true },
              },
            },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        orders,
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

// Assign QA to order
router.patch('/orders/:id/assign-qa', async (req, res, next) => {
  try {
    const { id } = req.params;
    const schema = z.object({
      qaId: z.string().uuid(),
    });
    const { qaId } = schema.parse(req.body);

    const order = await prisma.order.update({
      where: { id },
      data: { qaId },
      include: {
        qa: {
          select: { user: { select: { firstName: true, lastName: true } } },
        },
      },
    });

    res.json({
      success: true,
      message: 'QA assigned successfully.',
      data: order,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

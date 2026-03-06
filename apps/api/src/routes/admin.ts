import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { AdjustmentType, FeaturedSection, PricingRuleType, ProductTypeForPricing } from '@prisma/client';
import { prisma, UserRole, UserStatus, ProductStatus, OrderStatus, ProductType } from '../db';
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

const adminProductTypeSchema = z.nativeEnum(ProductType);
const featuredSectionSchema = z.nativeEnum(FeaturedSection);
const measurementTemplateSchema = z.object({
  name: z.string().min(1),
  unit: z.string().min(1).default('cm'),
  isRequired: z.boolean().default(true),
  instructions: z.string().optional().default(''),
  minValue: z.coerce.number().optional(),
  maxValue: z.coerce.number().optional(),
});

const productImageRules: Record<ProductType, { min: number; max: number }> = {
  [ProductType.FABRIC]: { min: 3, max: 4 },
  [ProductType.DESIGN]: { min: 4, max: 6 },
  [ProductType.READY_TO_WEAR]: { min: 4, max: 6 },
};

const pricingRuleCreateSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  ruleType: z.nativeEnum(PricingRuleType),
  productType: z.nativeEnum(ProductTypeForPricing).optional().nullable(),
  country: z.string().trim().optional().nullable(),
  startDate: z.union([z.string(), z.date()]).optional().nullable(),
  endDate: z.union([z.string(), z.date()]).optional().nullable(),
  isSale: z.boolean().default(false),
  adjustmentType: z.nativeEnum(AdjustmentType),
  value: z.coerce.number().positive(),
  priority: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
});

const pricingRuleUpdateSchema = pricingRuleCreateSchema.partial();

const adminUserCreateSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.nativeEnum(UserRole),
  status: z.nativeEnum(UserStatus).optional().default(UserStatus.ACTIVE),
  password: z.string().min(8),
  phone: z.string().optional(),
});

const adminUserUpdateSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  phone: z.string().optional().nullable(),
});

const productModerationSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT', 'REQUEST_CHANGES', 'SUSPEND', 'PUBLISH', 'UNPUBLISH']),
  message: z.string().trim().min(1).optional(),
  notifyVendor: z.boolean().default(true),
});

const productFeaturedSchema = z.object({
  isFeatured: z.boolean(),
  section: featuredSectionSchema.optional(),
  displayOrder: z.coerce.number().int().min(0).optional(),
});

const productImageInputSchema = z
  .union([
    z.string().trim().min(1),
    z.object({
      url: z.string().trim().min(1),
      alt: z.string().optional(),
    }),
  ])
  .transform((value) => (typeof value === 'string' ? value : value.url));

const adminProductCreateSchema = z.object({
  type: adminProductTypeSchema,
  ownerUserId: z.string().uuid(),
  name: z.string().min(2),
  description: z.string().min(10),
  status: z.nativeEnum(ProductStatus).optional().default(ProductStatus.PENDING_REVIEW),
  isAvailable: z.boolean().optional().default(false),
  materialTypeId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  basePrice: z.coerce.number().positive(),
  finalPrice: z.coerce.number().positive().optional(),
  minYards: z.coerce.number().int().min(1).optional(),
  stockYards: z.coerce.number().int().min(0).optional(),
  images: z.array(productImageInputSchema).optional(),
});

const adminProductUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().min(10).optional(),
  status: z.nativeEnum(ProductStatus).optional(),
  isAvailable: z.boolean().optional(),
  materialTypeId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  basePrice: z.coerce.number().positive().optional(),
  finalPrice: z.coerce.number().positive().optional(),
  minYards: z.coerce.number().int().min(1).optional(),
  stockYards: z.coerce.number().int().min(0).optional(),
  images: z.array(productImageInputSchema).optional(),
});

const bulkModerationSchema = z.object({
  productType: adminProductTypeSchema,
  productIds: z.array(z.string().uuid()).min(1),
  action: productModerationSchema.shape.action,
  message: z.string().trim().min(1).optional(),
  notifyVendor: z.boolean().default(true),
});

const orderMessageSchema = z.object({
  recipient: z.enum(['CUSTOMER', 'VENDORS', 'QA', 'INTERNAL']).default('INTERNAL'),
  message: z.string().min(1),
});

const orderForceStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  notes: z.string().optional(),
});

const orderTrackingSchema = z.object({
  trackingNumber: z.string().min(1),
  notes: z.string().optional(),
});

const getDefaultFeaturedSectionForType = (productType: ProductType): FeaturedSection => {
  if (productType === ProductType.FABRIC) return FeaturedSection.FEATURED_FABRICS;
  if (productType === ProductType.READY_TO_WEAR) return FeaturedSection.FEATURED_READY_TO_WEAR;
  return FeaturedSection.FEATURED_DESIGNS;
};

const parseDateValue = (value: string | Date | null | undefined) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const defaultMeasurementTemplates = [
  { name: 'Bust', unit: 'cm', isRequired: true, instructions: '' },
  { name: 'Waist', unit: 'cm', isRequired: true, instructions: '' },
  { name: 'Hip', unit: 'cm', isRequired: true, instructions: '' },
  { name: 'Shoulder Width', unit: 'cm', isRequired: true, instructions: '' },
  { name: 'Sleeve Length', unit: 'cm', isRequired: false, instructions: '' },
  { name: 'Garment Length', unit: 'cm', isRequired: true, instructions: '' },
];

function validateProductImageCount(type: ProductType, images: string[]) {
  const rule = productImageRules[type];
  if (!rule) return;
  if (images.length < rule.min || images.length > rule.max) {
    throw new Error(
      `Invalid image count for ${type}. Required ${rule.min}-${rule.max} images.`
    );
  }
}

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

async function getMeasurementTemplates() {
  const latest = await prisma.activityLog.findFirst({
    where: { action: 'MEASUREMENT_TEMPLATES_UPDATED' },
    orderBy: { createdAt: 'desc' },
  });
  const templates = Array.isArray((latest?.details as any)?.templates)
    ? (latest?.details as any).templates
    : defaultMeasurementTemplates;
  return z.array(measurementTemplateSchema).parse(templates);
}

async function resolveOwnerProfileId(type: ProductType, ownerUserId: string) {
  if (type === ProductType.FABRIC) {
    const sellerProfile = await prisma.fabricSellerProfile.findFirst({
      where: { userId: ownerUserId },
      select: { id: true },
    });
    return sellerProfile?.id || null;
  }

  const designerProfile = await prisma.designerProfile.findFirst({
    where: { userId: ownerUserId },
    select: { id: true },
  });
  return designerProfile?.id || null;
}

async function getProductOwner(type: ProductType, id: string) {
  if (type === ProductType.FABRIC) {
    const product = await prisma.fabric.findUnique({
      where: { id },
      include: {
        seller: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!product) return null;
    return {
      product,
      ownerUserId: product.seller.user.id,
      ownerName: product.seller.businessName || `${product.seller.user.firstName} ${product.seller.user.lastName}`.trim(),
    };
  }

  if (type === ProductType.DESIGN) {
    const product = await prisma.design.findUnique({
      where: { id },
      include: {
        designer: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!product) return null;
    return {
      product,
      ownerUserId: product.designer.user.id,
      ownerName: product.designer.businessName || `${product.designer.user.firstName} ${product.designer.user.lastName}`.trim(),
    };
  }

  const product = await prisma.readyToWear.findUnique({
    where: { id },
    include: {
      designer: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  });
  if (!product) return null;
  return {
    product,
    ownerUserId: product.designer.user.id,
    ownerName: product.designer.businessName || `${product.designer.user.firstName} ${product.designer.user.lastName}`.trim(),
  };
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

router.get('/traffic-report', async (req, res, next) => {
  try {
    const querySchema = z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      productType: adminProductTypeSchema.optional(),
      vendorUserId: z.string().uuid().optional(),
      page: z.string().optional(),
    });
    const filters = querySchema.parse(req.query);

    const where: any = {};
    const startDate = parseDateValue(filters.startDate);
    const endDate = parseDateValue(filters.endDate);
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        designOrder: {
          include: {
            design: {
              select: {
                id: true,
                name: true,
                designer: { select: { userId: true, businessName: true } },
              },
            },
          },
        },
        fabricOrder: {
          include: {
            fabric: {
              select: {
                id: true,
                name: true,
                seller: { select: { userId: true, businessName: true } },
              },
            },
          },
        },
        readyToWearItems: {
          include: {
            readyToWear: {
              select: {
                id: true,
                name: true,
                designer: { select: { userId: true, businessName: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    type Entry = {
      orderId: string;
      productId: string;
      productName: string;
      productType: ProductType;
      page: string;
      vendorUserId: string;
      vendorName: string;
      vendorRole: 'FABRIC_SELLER' | 'FASHION_DESIGNER';
      revenue: number;
    };

    const entries: Entry[] = [];
    for (const order of orders) {
      if (order.designOrder?.design?.designer?.userId) {
        entries.push({
          orderId: order.id,
          productId: order.designOrder.design.id,
          productName: order.designOrder.design.name,
          productType: ProductType.DESIGN,
          page: `/designs/${order.designOrder.design.id}`,
          vendorUserId: order.designOrder.design.designer.userId,
          vendorName: order.designOrder.design.designer.businessName || 'Designer',
          vendorRole: 'FASHION_DESIGNER',
          revenue: Number(order.designOrder.price || 0),
        });
      }
      if (order.fabricOrder?.fabric?.seller?.userId) {
        entries.push({
          orderId: order.id,
          productId: order.fabricOrder.fabric.id,
          productName: order.fabricOrder.fabric.name,
          productType: ProductType.FABRIC,
          page: `/fabrics/${order.fabricOrder.fabric.id}`,
          vendorUserId: order.fabricOrder.fabric.seller.userId,
          vendorName: order.fabricOrder.fabric.seller.businessName || 'Fabric Seller',
          vendorRole: 'FABRIC_SELLER',
          revenue: Number(order.fabricOrder.totalPrice || 0),
        });
      }
      for (const item of order.readyToWearItems || []) {
        if (!item.readyToWear?.designer?.userId) continue;
        entries.push({
          orderId: order.id,
          productId: item.readyToWear.id,
          productName: item.readyToWear.name,
          productType: ProductType.READY_TO_WEAR,
          page: `/ready-to-wear/${item.readyToWear.id}`,
          vendorUserId: item.readyToWear.designer.userId,
          vendorName: item.readyToWear.designer.businessName || 'Designer',
          vendorRole: 'FASHION_DESIGNER',
          revenue: Number(item.price || 0) * Number(item.quantity || 1),
        });
      }
    }

    const filtered = entries.filter((entry) => {
      if (filters.productType && entry.productType !== filters.productType) return false;
      if (filters.vendorUserId && entry.vendorUserId !== filters.vendorUserId) return false;
      if (filters.page && entry.page !== filters.page) return false;
      return true;
    });

    const vendors = new Map<string, any>();
    const products = new Map<string, any>();
    const pages = new Map<string, any>();
    const uniqueOrders = new Set<string>();
    let totalRevenue = 0;

    for (const entry of filtered) {
      uniqueOrders.add(entry.orderId);
      totalRevenue += entry.revenue;

      const vendorKey = `${entry.vendorRole}:${entry.vendorUserId}`;
      const vendorAgg = vendors.get(vendorKey) || {
        vendorUserId: entry.vendorUserId,
        vendorName: entry.vendorName,
        vendorRole: entry.vendorRole,
        orderCount: 0,
        revenue: 0,
      };
      vendorAgg.orderCount += 1;
      vendorAgg.revenue += entry.revenue;
      vendors.set(vendorKey, vendorAgg);

      const productKey = `${entry.productType}:${entry.productId}`;
      const productAgg = products.get(productKey) || {
        productId: entry.productId,
        productName: entry.productName,
        productType: entry.productType,
        page: entry.page,
        orderCount: 0,
        revenue: 0,
      };
      productAgg.orderCount += 1;
      productAgg.revenue += entry.revenue;
      products.set(productKey, productAgg);

      const pageAgg = pages.get(entry.page) || {
        page: entry.page,
        orderCount: 0,
        revenue: 0,
      };
      pageAgg.orderCount += 1;
      pageAgg.revenue += entry.revenue;
      pages.set(entry.page, pageAgg);
    }

    res.json({
      success: true,
      data: {
        filters: {
          startDate: startDate?.toISOString() || null,
          endDate: endDate?.toISOString() || null,
          productType: filters.productType || null,
          vendorUserId: filters.vendorUserId || null,
          page: filters.page || null,
        },
        summary: {
          totalOrders: uniqueOrders.size,
          totalLineItems: filtered.length,
          totalRevenue,
        },
        vendors: Array.from(vendors.values()).sort((a, b) => b.revenue - a.revenue),
        products: Array.from(products.values()).sort((a, b) => b.orderCount - a.orderCount),
        pages: Array.from(pages.values()).sort((a, b) => b.orderCount - a.orderCount),
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
          fabricSellerProfile: {
            select: { country: true },
          },
          designerProfile: {
            select: { country: true },
          },
          _count: {
            select: { ordersAsCustomer: true },
          },
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

router.post('/users', async (req, res, next) => {
  try {
    const data = adminUserCreateSchema.parse(req.body);
    const password = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase().trim(),
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        password,
        role: data.role,
        status: data.status,
        phone: data.phone,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully.',
      data: user,
    });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'A user with this email already exists.',
      });
    }
    next(error);
  }
});

router.patch('/users/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = adminUserUpdateSchema.parse(req.body);

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...data,
        email: data.email ? data.email.toLowerCase().trim() : undefined,
        firstName: data.firstName?.trim(),
        lastName: data.lastName?.trim(),
        phone: data.phone === null ? null : data.phone,
      },
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
    });

    res.json({
      success: true,
      message: 'User updated successfully.',
      data: updated,
    });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'A user with this email already exists.',
      });
    }
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

router.get('/products', async (req, res, next) => {
  try {
    const requestedType = req.query.type ? adminProductTypeSchema.parse(String(req.query.type)) : null;
    const requestedStatus = req.query.status ? z.nativeEnum(ProductStatus).parse(String(req.query.status)) : null;
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const pagination = parsePagination(req.query.page, req.query.limit, 20);

    const fabricWhere: any = {};
    const designWhere: any = {};
    const rtwWhere: any = {};

    if (requestedStatus) {
      fabricWhere.status = requestedStatus;
      designWhere.status = requestedStatus;
      rtwWhere.status = requestedStatus;
    }

    if (search) {
      fabricWhere.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { seller: { businessName: { contains: search, mode: 'insensitive' } } },
      ];
      designWhere.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { designer: { businessName: { contains: search, mode: 'insensitive' } } },
      ];
      rtwWhere.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { designer: { businessName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const fetchLimit = pagination.page * pagination.limit;

    const [
      fabrics,
      designs,
      readyToWear,
      totalFabrics,
      totalDesigns,
      totalReadyToWear,
    ] = await Promise.all([
      requestedType && requestedType !== ProductType.FABRIC
        ? Promise.resolve([])
        : prisma.fabric.findMany({
            where: fabricWhere,
            skip: requestedType === ProductType.FABRIC ? pagination.skip : 0,
            take: requestedType === ProductType.FABRIC ? pagination.limit : fetchLimit,
            orderBy: { createdAt: 'desc' },
            include: {
              materialType: { select: { name: true } },
              seller: {
                select: {
                  id: true,
                  userId: true,
                  businessName: true,
                  country: true,
                  user: { select: { firstName: true, lastName: true } },
                },
              },
              images: { take: 1, orderBy: { sortOrder: 'asc' } },
              _count: { select: { orderItems: true } },
            },
          }),
      requestedType && requestedType !== ProductType.DESIGN
        ? Promise.resolve([])
        : prisma.design.findMany({
            where: designWhere,
            skip: requestedType === ProductType.DESIGN ? pagination.skip : 0,
            take: requestedType === ProductType.DESIGN ? pagination.limit : fetchLimit,
            orderBy: { createdAt: 'desc' },
            include: {
              category: { select: { name: true } },
              designer: {
                select: {
                  id: true,
                  userId: true,
                  businessName: true,
                  country: true,
                  user: { select: { firstName: true, lastName: true } },
                },
              },
              images: { take: 1, orderBy: { sortOrder: 'asc' } },
              _count: { select: { orderItems: true } },
            },
          }),
      requestedType && requestedType !== ProductType.READY_TO_WEAR
        ? Promise.resolve([])
        : prisma.readyToWear.findMany({
            where: rtwWhere,
            skip: requestedType === ProductType.READY_TO_WEAR ? pagination.skip : 0,
            take: requestedType === ProductType.READY_TO_WEAR ? pagination.limit : fetchLimit,
            orderBy: { createdAt: 'desc' },
            include: {
              category: { select: { name: true } },
              designer: {
                select: {
                  id: true,
                  userId: true,
                  businessName: true,
                  country: true,
                  user: { select: { firstName: true, lastName: true } },
                },
              },
              images: { take: 1, orderBy: { sortOrder: 'asc' } },
              _count: { select: { orderItems: true } },
            },
          }),
      requestedType && requestedType !== ProductType.FABRIC ? Promise.resolve(0) : prisma.fabric.count({ where: fabricWhere }),
      requestedType && requestedType !== ProductType.DESIGN ? Promise.resolve(0) : prisma.design.count({ where: designWhere }),
      requestedType && requestedType !== ProductType.READY_TO_WEAR
        ? Promise.resolve(0)
        : prisma.readyToWear.count({ where: rtwWhere }),
    ]);

    const productRefs = [
      ...fabrics.map((item) => ({ productId: item.id, productType: ProductType.FABRIC })),
      ...designs.map((item) => ({ productId: item.id, productType: ProductType.DESIGN })),
      ...readyToWear.map((item) => ({ productId: item.id, productType: ProductType.READY_TO_WEAR })),
    ];

    const featuredRows =
      productRefs.length === 0
        ? []
        : await prisma.featuredProduct.findMany({
            where: {
              isActive: true,
              OR: productRefs,
            },
            select: {
              productId: true,
              productType: true,
              section: true,
            },
          });

    const featuredMap = new Map<string, FeaturedSection[]>();
    for (const row of featuredRows) {
      const key = `${row.productType}:${row.productId}`;
      const existing = featuredMap.get(key) || [];
      existing.push(row.section);
      featuredMap.set(key, existing);
    }

    const mapped = [
      ...fabrics.map((item) => {
        const key = `${ProductType.FABRIC}:${item.id}`;
        return {
          id: item.id,
          type: ProductType.FABRIC,
          name: item.name,
          description: item.description,
          status: item.status,
          isAvailable: item.isAvailable,
          materialTypeId: item.materialTypeId,
          basePrice: Number(item.sellerPrice || 0),
          finalPrice: Number(item.finalPrice || 0),
          category: item.materialType?.name || 'Material',
          ownerName:
            item.seller.businessName ||
            `${item.seller.user?.firstName || ''} ${item.seller.user?.lastName || ''}`.trim() ||
            'Unknown',
          ownerCountry: item.seller.country,
          ownerUserId: item.seller.userId,
          orderCount: item._count.orderItems,
          image: item.images[0]?.url || null,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          isFeatured: featuredMap.has(key),
          featuredSections: featuredMap.get(key) || [],
        };
      }),
      ...designs.map((item) => {
        const key = `${ProductType.DESIGN}:${item.id}`;
        return {
          id: item.id,
          type: ProductType.DESIGN,
          name: item.name,
          description: item.description,
          status: item.status,
          isAvailable: item.isAvailable,
          categoryId: item.categoryId,
          basePrice: Number(item.basePrice || 0),
          finalPrice: Number(item.finalPrice || 0),
          category: item.category?.name || 'Design',
          ownerName:
            item.designer.businessName ||
            `${item.designer.user?.firstName || ''} ${item.designer.user?.lastName || ''}`.trim() ||
            'Unknown',
          ownerCountry: item.designer.country,
          ownerUserId: item.designer.userId,
          orderCount: item._count.orderItems,
          image: item.images[0]?.url || null,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          isFeatured: featuredMap.has(key),
          featuredSections: featuredMap.get(key) || [],
        };
      }),
      ...readyToWear.map((item) => {
        const key = `${ProductType.READY_TO_WEAR}:${item.id}`;
        return {
          id: item.id,
          type: ProductType.READY_TO_WEAR,
          name: item.name,
          description: item.description,
          status: item.status,
          isAvailable: item.isAvailable,
          categoryId: item.categoryId,
          basePrice: Number(item.basePrice || 0),
          finalPrice: Number(item.basePrice || 0),
          category: item.category?.name || 'Ready To Wear',
          ownerName:
            item.designer.businessName ||
            `${item.designer.user?.firstName || ''} ${item.designer.user?.lastName || ''}`.trim() ||
            'Unknown',
          ownerCountry: item.designer.country,
          ownerUserId: item.designer.userId,
          orderCount: item._count.orderItems,
          image: item.images[0]?.url || null,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          isFeatured: featuredMap.has(key),
          featuredSections: featuredMap.get(key) || [],
        };
      }),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = totalFabrics + totalDesigns + totalReadyToWear;
    const pagedData = requestedType
      ? mapped
      : mapped.slice(pagination.skip, pagination.skip + pagination.limit);

    res.json({
      success: true,
      data: {
        products: pagedData,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          pages: Math.max(1, Math.ceil(total / pagination.limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/products/:productType/:id', async (req, res, next) => {
  try {
    const productType = adminProductTypeSchema.parse(req.params.productType);
    const { id } = req.params;

    if (productType === ProductType.FABRIC) {
      const product = await prisma.fabric.findUnique({
        where: { id },
        include: {
          images: { orderBy: { sortOrder: 'asc' } },
          materialType: { select: { id: true, name: true } },
          seller: {
            select: {
              userId: true,
              businessName: true,
              country: true,
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
      });
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found.' });
      }
      const featuredRows = await prisma.featuredProduct.findMany({
        where: { productId: id, productType, isActive: true },
        select: { section: true },
      });
      return res.json({
        success: true,
        data: {
          id: product.id,
          type: productType,
          name: product.name,
          description: product.description,
          status: product.status,
          isAvailable: product.isAvailable,
          materialTypeId: product.materialTypeId,
          materialTypeName: product.materialType?.name || 'Material',
          ownerUserId: product.seller.userId,
          ownerName:
            product.seller.businessName ||
            `${product.seller.user?.firstName || ''} ${product.seller.user?.lastName || ''}`.trim() ||
            'Unknown',
          ownerCountry: product.seller.country,
          basePrice: Number(product.sellerPrice || 0),
          finalPrice: Number(product.finalPrice || 0),
          minYards: product.minYards,
          stockYards: product.stockYards,
          images: product.images,
          featuredSections: featuredRows.map((row) => row.section),
        },
      });
    }

    if (productType === ProductType.DESIGN) {
      const product = await prisma.design.findUnique({
        where: { id },
        include: {
          images: { orderBy: { sortOrder: 'asc' } },
          category: { select: { id: true, name: true } },
          designer: {
            select: {
              userId: true,
              businessName: true,
              country: true,
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
      });
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found.' });
      }
      const featuredRows = await prisma.featuredProduct.findMany({
        where: { productId: id, productType, isActive: true },
        select: { section: true },
      });
      return res.json({
        success: true,
        data: {
          id: product.id,
          type: productType,
          name: product.name,
          description: product.description,
          status: product.status,
          isAvailable: product.isAvailable,
          categoryId: product.categoryId,
          categoryName: product.category?.name || 'Design',
          ownerUserId: product.designer.userId,
          ownerName:
            product.designer.businessName ||
            `${product.designer.user?.firstName || ''} ${product.designer.user?.lastName || ''}`.trim() ||
            'Unknown',
          ownerCountry: product.designer.country,
          basePrice: Number(product.basePrice || 0),
          finalPrice: Number(product.finalPrice || 0),
          images: product.images,
          featuredSections: featuredRows.map((row) => row.section),
        },
      });
    }

    const product = await prisma.readyToWear.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        category: { select: { id: true, name: true } },
        designer: {
          select: {
            userId: true,
            businessName: true,
            country: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }
    const featuredRows = await prisma.featuredProduct.findMany({
      where: { productId: id, productType, isActive: true },
      select: { section: true },
    });
    res.json({
      success: true,
      data: {
        id: product.id,
        type: productType,
        name: product.name,
        description: product.description,
        status: product.status,
        isAvailable: product.isAvailable,
        categoryId: product.categoryId,
        categoryName: product.category?.name || 'Ready To Wear',
        ownerUserId: product.designer.userId,
        ownerName:
          product.designer.businessName ||
          `${product.designer.user?.firstName || ''} ${product.designer.user?.lastName || ''}`.trim() ||
          'Unknown',
        ownerCountry: product.designer.country,
        basePrice: Number(product.basePrice || 0),
        finalPrice: Number(product.basePrice || 0),
        images: product.images,
        featuredSections: featuredRows.map((row) => row.section),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/products', async (req, res, next) => {
  try {
    const payload = adminProductCreateSchema.parse(req.body);
    const images = payload.images || [];
    validateProductImageCount(payload.type, images);
    const ownerProfileId = await resolveOwnerProfileId(payload.type, payload.ownerUserId);
    if (!ownerProfileId) {
      return res.status(400).json({
        success: false,
        message:
          payload.type === ProductType.FABRIC
            ? 'Selected owner is not a fabric seller.'
            : 'Selected owner is not a fashion designer.',
      });
    }

    if (payload.type === ProductType.FABRIC) {
      if (!payload.materialTypeId) {
        return res.status(400).json({ success: false, message: 'materialTypeId is required for fabrics.' });
      }
      const created = await prisma.fabric.create({
        data: {
          sellerId: ownerProfileId,
          name: payload.name,
          description: payload.description,
          materialTypeId: payload.materialTypeId,
          sellerPrice: payload.basePrice,
          finalPrice: payload.finalPrice ?? payload.basePrice,
          minYards: payload.minYards ?? 1,
          stockYards: payload.stockYards ?? 0,
          status: payload.status,
          isAvailable: payload.isAvailable,
          images: images.length
            ? {
                create: images.map((url, idx) => ({
                  url,
                  alt: payload.name,
                  sortOrder: idx,
                })),
              }
            : undefined,
        },
      });
      return res.status(201).json({ success: true, message: 'Fabric product created.', data: created });
    }

    if (payload.type === ProductType.DESIGN) {
      if (!payload.categoryId) {
        return res.status(400).json({ success: false, message: 'categoryId is required for designs.' });
      }
      const created = await prisma.design.create({
        data: {
          designerId: ownerProfileId,
          name: payload.name,
          description: payload.description,
          categoryId: payload.categoryId,
          basePrice: payload.basePrice,
          finalPrice: payload.finalPrice ?? payload.basePrice,
          status: payload.status,
          isAvailable: payload.isAvailable,
          images: images.length
            ? {
                create: images.map((url, idx) => ({
                  url,
                  alt: payload.name,
                  sortOrder: idx,
                })),
              }
            : undefined,
        },
      });
      return res.status(201).json({ success: true, message: 'Design product created.', data: created });
    }

    if (!payload.categoryId) {
      return res.status(400).json({ success: false, message: 'categoryId is required for ready-to-wear.' });
    }
    const created = await prisma.readyToWear.create({
      data: {
        designerId: ownerProfileId,
        name: payload.name,
        description: payload.description,
        categoryId: payload.categoryId,
        basePrice: payload.basePrice,
        status: payload.status,
        isAvailable: payload.isAvailable,
        images: images.length
          ? {
              create: images.map((url, idx) => ({
                url,
                alt: payload.name,
                sortOrder: idx,
              })),
            }
          : undefined,
      },
    });
    res.status(201).json({ success: true, message: 'Ready-to-wear product created.', data: created });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0];
      const field = firstIssue?.path?.join('.') || 'payload';
      return res.status(400).json({
        success: false,
        message: firstIssue?.message ? `${field}: ${firstIssue.message}` : 'Invalid product payload.',
        errors: error.issues,
      });
    }
    if (error instanceof Error && error.message.startsWith('Invalid image count')) {
      return res.status(400).json({
        success: false,
        message: error.message,
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

router.patch('/products/:productType/:id', async (req, res, next) => {
  try {
    const productType = adminProductTypeSchema.parse(req.params.productType);
    const { id } = req.params;
    const payload = adminProductUpdateSchema.parse(req.body);
    if (payload.images) {
      validateProductImageCount(productType, payload.images);
    }

    if (productType === ProductType.FABRIC) {
      const updated = await prisma.fabric.update({
        where: { id },
        data: {
          name: payload.name,
          description: payload.description,
          status: payload.status,
          isAvailable: payload.isAvailable,
          materialTypeId: payload.materialTypeId,
          sellerPrice: payload.basePrice,
          finalPrice: payload.finalPrice,
          minYards: payload.minYards,
          stockYards: payload.stockYards,
        },
      });
      if (payload.images) {
        await prisma.fabricImage.deleteMany({ where: { fabricId: id } });
        await prisma.fabricImage.createMany({
          data: payload.images.map((url, idx) => ({
            fabricId: id,
            url,
            alt: payload.name || updated.name,
            sortOrder: idx,
          })),
        });
      }
      return res.json({ success: true, message: 'Fabric updated successfully.', data: updated });
    }

    if (productType === ProductType.DESIGN) {
      const updated = await prisma.design.update({
        where: { id },
        data: {
          name: payload.name,
          description: payload.description,
          status: payload.status,
          isAvailable: payload.isAvailable,
          categoryId: payload.categoryId,
          basePrice: payload.basePrice,
          finalPrice: payload.finalPrice,
        },
      });
      if (payload.images) {
        await prisma.designImage.deleteMany({ where: { designId: id } });
        await prisma.designImage.createMany({
          data: payload.images.map((url, idx) => ({
            designId: id,
            url,
            alt: payload.name || updated.name,
            sortOrder: idx,
          })),
        });
      }
      return res.json({ success: true, message: 'Design updated successfully.', data: updated });
    }

    const updated = await prisma.readyToWear.update({
      where: { id },
      data: {
        name: payload.name,
        description: payload.description,
        status: payload.status,
        isAvailable: payload.isAvailable,
        categoryId: payload.categoryId,
        basePrice: payload.basePrice,
      },
    });
    if (payload.images) {
      await prisma.readyToWearImage.deleteMany({ where: { readyToWearId: id } });
      await prisma.readyToWearImage.createMany({
        data: payload.images.map((url, idx) => ({
          readyToWearId: id,
          url,
          alt: payload.name || updated.name,
          sortOrder: idx,
        })),
      });
    }
    res.json({ success: true, message: 'Ready-to-wear updated successfully.', data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0];
      const field = firstIssue?.path?.join('.') || 'payload';
      return res.status(400).json({
        success: false,
        message: firstIssue?.message ? `${field}: ${firstIssue.message}` : 'Invalid product payload.',
        errors: error.issues,
      });
    }
    if (error instanceof Error && error.message.startsWith('Invalid image count')) {
      return res.status(400).json({
        success: false,
        message: error.message,
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

router.patch('/products/:productType/:id/moderate', async (req, res, next) => {
  try {
    const productType = adminProductTypeSchema.parse(req.params.productType);
    const { id } = req.params;
    const payload = productModerationSchema.parse(req.body);

    const existing = await getProductOwner(productType, id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    let nextStatus: ProductStatus | undefined;
    let nextAvailability: boolean | undefined;

    switch (payload.action) {
      case 'APPROVE':
      case 'PUBLISH':
        nextStatus = ProductStatus.APPROVED;
        nextAvailability = true;
        break;
      case 'REJECT':
        nextStatus = ProductStatus.REJECTED;
        nextAvailability = false;
        break;
      case 'REQUEST_CHANGES':
        nextStatus = ProductStatus.PENDING_REVIEW;
        nextAvailability = false;
        break;
      case 'SUSPEND':
        nextStatus = ProductStatus.ARCHIVED;
        nextAvailability = false;
        break;
      case 'UNPUBLISH':
        nextAvailability = false;
        break;
    }

    const updateData: { status?: ProductStatus; isAvailable?: boolean } = {};
    if (nextStatus) updateData.status = nextStatus;
    if (typeof nextAvailability === 'boolean') updateData.isAvailable = nextAvailability;

    if (productType === ProductType.FABRIC) {
      await prisma.fabric.update({
        where: { id },
        data: updateData,
      });
    } else if (productType === ProductType.DESIGN) {
      await prisma.design.update({
        where: { id },
        data: updateData,
      });
    } else {
      await prisma.readyToWear.update({
        where: { id },
        data: updateData,
      });
    }

    if (payload.action !== 'APPROVE' && payload.action !== 'PUBLISH') {
      await prisma.featuredProduct.deleteMany({
        where: { productId: id, productType },
      });
    }

    if (payload.notifyVendor || payload.message) {
      const actionLabel = payload.action.replace(/_/g, ' ').toLowerCase();
      await prisma.notification.create({
        data: {
          userId: existing.ownerUserId,
          type:
            payload.action === 'APPROVE' || payload.action === 'PUBLISH'
              ? 'PRODUCT_APPROVED'
              : payload.action === 'REQUEST_CHANGES'
                ? 'NEW_MESSAGE'
                : 'PRODUCT_REJECTED',
          title: `Product ${actionLabel}`,
          message:
            payload.message ||
            `Your ${productType.toLowerCase().replace(/_/g, ' ')} "${existing.product.name}" was ${actionLabel} by admin.`,
          relatedId: id,
          relatedType: 'PRODUCT',
        },
      });
    }

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'ADMIN_PRODUCT_MODERATE',
        details: {
          productId: id,
          productType,
          action: payload.action,
          message: payload.message || null,
        },
      },
    });

    res.json({
      success: true,
      message: 'Product moderation action applied.',
      data: {
        productId: id,
        productType,
        action: payload.action,
        status: nextStatus,
        isAvailable: nextAvailability,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/products/moderate-bulk', async (req, res, next) => {
  try {
    const payload = bulkModerationSchema.parse(req.body);
    let nextStatus: ProductStatus | undefined;
    let nextAvailability: boolean | undefined;

    switch (payload.action) {
      case 'APPROVE':
      case 'PUBLISH':
        nextStatus = ProductStatus.APPROVED;
        nextAvailability = true;
        break;
      case 'REJECT':
        nextStatus = ProductStatus.REJECTED;
        nextAvailability = false;
        break;
      case 'REQUEST_CHANGES':
        nextStatus = ProductStatus.PENDING_REVIEW;
        nextAvailability = false;
        break;
      case 'SUSPEND':
        nextStatus = ProductStatus.ARCHIVED;
        nextAvailability = false;
        break;
      case 'UNPUBLISH':
        nextAvailability = false;
        break;
    }

    const updateData: { status?: ProductStatus; isAvailable?: boolean } = {};
    if (nextStatus) updateData.status = nextStatus;
    if (typeof nextAvailability === 'boolean') updateData.isAvailable = nextAvailability;

    let affected = 0;
    let owners: { userId: string; productId: string }[] = [];
    if (payload.productType === ProductType.FABRIC) {
      const [updated, rows] = await Promise.all([
        prisma.fabric.updateMany({
          where: { id: { in: payload.productIds } },
          data: updateData,
        }),
        prisma.fabric.findMany({
          where: { id: { in: payload.productIds } },
          select: {
            id: true,
            seller: { select: { userId: true } },
          },
        }),
      ]);
      affected = updated.count;
      owners = rows.map((row) => ({ userId: row.seller.userId, productId: row.id }));
    } else if (payload.productType === ProductType.DESIGN) {
      const [updated, rows] = await Promise.all([
        prisma.design.updateMany({
          where: { id: { in: payload.productIds } },
          data: updateData,
        }),
        prisma.design.findMany({
          where: { id: { in: payload.productIds } },
          select: {
            id: true,
            designer: { select: { userId: true } },
          },
        }),
      ]);
      affected = updated.count;
      owners = rows.map((row) => ({ userId: row.designer.userId, productId: row.id }));
    } else {
      const [updated, rows] = await Promise.all([
        prisma.readyToWear.updateMany({
          where: { id: { in: payload.productIds } },
          data: updateData,
        }),
        prisma.readyToWear.findMany({
          where: { id: { in: payload.productIds } },
          select: {
            id: true,
            designer: { select: { userId: true } },
          },
        }),
      ]);
      affected = updated.count;
      owners = rows.map((row) => ({ userId: row.designer.userId, productId: row.id }));
    }

    if (payload.action !== 'APPROVE' && payload.action !== 'PUBLISH') {
      await prisma.featuredProduct.deleteMany({
        where: {
          productType: payload.productType,
          productId: { in: payload.productIds },
        },
      });
    }

    if (payload.notifyVendor || payload.message) {
      await prisma.notification.createMany({
        data: owners.map((owner) => ({
          userId: owner.userId,
          type:
            payload.action === 'APPROVE' || payload.action === 'PUBLISH'
              ? 'PRODUCT_APPROVED'
              : payload.action === 'REQUEST_CHANGES'
                ? 'NEW_MESSAGE'
                : 'PRODUCT_REJECTED',
          title: `Bulk product ${payload.action.toLowerCase().replace(/_/g, ' ')}`,
          message:
            payload.message ||
            `Admin performed ${payload.action.toLowerCase().replace(/_/g, ' ')} on your product.`,
          relatedId: owner.productId,
          relatedType: 'PRODUCT',
        })),
      });
    }

    res.json({
      success: true,
      message: 'Bulk moderation completed.',
      data: {
        affected,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/products/:productType/:id/featured', async (req, res, next) => {
  try {
    const productType = adminProductTypeSchema.parse(req.params.productType);
    const { id } = req.params;
    const payload = productFeaturedSchema.parse(req.body);

    const existing = await getProductOwner(productType, id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    if (payload.isFeatured) {
      const section = payload.section || getDefaultFeaturedSectionForType(productType);
      const featured = await prisma.featuredProduct.upsert({
        where: {
          productId_productType_section: {
            productId: id,
            productType,
            section,
          },
        },
        update: {
          isActive: true,
          displayOrder: payload.displayOrder ?? 0,
        },
        create: {
          productId: id,
          productType,
          section,
          displayOrder: payload.displayOrder ?? 0,
          isActive: true,
        },
      });

      return res.json({
        success: true,
        message: 'Product marked as featured.',
        data: featured,
      });
    }

    await prisma.featuredProduct.deleteMany({
      where: {
        productId: id,
        productType,
        ...(payload.section ? { section: payload.section } : {}),
      },
    });

    res.json({
      success: true,
      message: 'Product removed from featured list.',
    });
  } catch (error) {
    next(error);
  }
});

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

// ==================== MEASUREMENT TEMPLATES ====================

router.get('/measurement-templates', async (req, res, next) => {
  try {
    const templates = await getMeasurementTemplates();
    res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    next(error);
  }
});

router.put('/measurement-templates', async (req, res, next) => {
  try {
    const schema = z.object({
      templates: z.array(measurementTemplateSchema).min(1),
    });
    const payload = schema.parse(req.body);
    const templates = payload.templates.map((item) => ({
      ...item,
      name: item.name.trim(),
      unit: item.unit.trim(),
      instructions: item.instructions?.trim() || '',
    }));

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'MEASUREMENT_TEMPLATES_UPDATED',
        details: {
          templates,
        },
      },
    });

    res.json({
      success: true,
      message: 'Measurement templates updated successfully.',
      data: templates,
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
    const data = pricingRuleCreateSchema.parse(req.body);

    const rule = await prisma.pricingRule.create({
      data: {
        name: data.name,
        description: data.description,
        ruleType: data.ruleType,
        productType: data.productType || null,
        country: data.country || null,
        startDate: parseDateValue(data.startDate),
        endDate: parseDateValue(data.endDate),
        isSale: data.isSale,
        adjustmentType: data.adjustmentType,
        value: data.value,
        priority: data.priority,
        isActive: data.isActive,
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
    const updateData = pricingRuleUpdateSchema.parse(req.body);
    const data: any = { ...updateData };
    if ('startDate' in updateData) {
      data.startDate = parseDateValue(updateData.startDate ?? null);
    }
    if ('endDate' in updateData) {
      data.endDate = parseDateValue(updateData.endDate ?? null);
    }
    if ('productType' in updateData) {
      data.productType = updateData.productType || null;
    }
    if ('country' in updateData) {
      data.country = updateData.country || null;
    }

    const rule = await prisma.pricingRule.update({
      where: { id },
      data,
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
          timeline: {
            orderBy: { createdAt: 'desc' },
            take: 25,
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

router.patch('/orders/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = orderForceStatusSchema.parse(req.body);

    const order = await prisma.order.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    const statusDates: {
      shippedAt?: Date;
      deliveredAt?: Date;
      customerAcceptedAt?: Date;
    } = {};
    if (status === OrderStatus.SHIPPED) statusDates.shippedAt = new Date();
    if (status === OrderStatus.DELIVERED) statusDates.deliveredAt = new Date();
    if (status === OrderStatus.COMPLETED) statusDates.customerAcceptedAt = new Date();

    const [updatedOrder] = await prisma.$transaction([
      prisma.order.update({
        where: { id },
        data: {
          status,
          ...statusDates,
        },
      }),
      prisma.orderTimeline.create({
        data: {
          orderId: id,
          status,
          notes: notes || `Admin forced order status to ${status}`,
          updatedById: req.user!.id,
          updatedByRole: UserRole.ADMINISTRATOR,
        },
      }),
    ]);

    res.json({
      success: true,
      message: 'Order status updated successfully.',
      data: updatedOrder,
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/orders/:id/tracking', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { trackingNumber, notes } = orderTrackingSchema.parse(req.body);

    const order = await prisma.order.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    const [updatedOrder] = await prisma.$transaction([
      prisma.order.update({
        where: { id },
        data: {
          trackingNumber,
        },
      }),
      prisma.orderTimeline.create({
        data: {
          orderId: id,
          status: order.status,
          notes: notes || `Tracking number updated by admin: ${trackingNumber}`,
          updatedById: req.user!.id,
          updatedByRole: UserRole.ADMINISTRATOR,
        },
      }),
    ]);

    res.json({
      success: true,
      message: 'Tracking information updated.',
      data: updatedOrder,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/orders/:id/messages', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { recipient, message } = orderMessageSchema.parse(req.body);

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        qa: { select: { userId: true } },
        designOrder: {
          select: {
            design: {
              select: {
                designer: { select: { userId: true } },
              },
            },
          },
        },
        fabricOrder: {
          select: {
            fabric: {
              select: {
                seller: { select: { userId: true } },
              },
            },
          },
        },
        readyToWearItems: {
          select: {
            readyToWear: {
              select: {
                designer: { select: { userId: true } },
              },
            },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    const vendorUserIds = Array.from(
      new Set(
        [
          order.designOrder?.design.designer.userId,
          order.fabricOrder?.fabric.seller.userId,
          ...order.readyToWearItems.map((item) => item.readyToWear.designer.userId),
        ].filter(Boolean) as string[]
      )
    );

    let recipientIds: string[] = [];
    if (recipient === 'CUSTOMER') {
      recipientIds = [order.customerId];
    } else if (recipient === 'VENDORS') {
      recipientIds = vendorUserIds;
    } else if (recipient === 'QA') {
      recipientIds = order.qa?.userId ? [order.qa.userId] : [];
    } else {
      recipientIds = [];
    }

    const timelineNote = recipient === 'INTERNAL' ? `[INTERNAL] ${message}` : `[${recipient}] ${message}`;

    const operations = [
      prisma.orderTimeline.create({
        data: {
          orderId: id,
          status: order.status,
          notes: timelineNote,
          updatedById: req.user!.id,
          updatedByRole: UserRole.ADMINISTRATOR,
        },
      }),
    ];

    if (recipientIds.length > 0) {
      operations.push(
        prisma.notification.createMany({
          data: recipientIds.map((userId) => ({
            userId,
            type: 'NEW_MESSAGE',
            title: `Order ${order.orderNumber} message`,
            message,
            relatedId: id,
            relatedType: 'ORDER',
          })),
        }) as any
      );
    }

    await prisma.$transaction(operations);

    res.status(201).json({
      success: true,
      message: 'Order communication saved successfully.',
    });
  } catch (error) {
    next(error);
  }
});

router.get('/orders/:id/messages', async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    const messages = await prisma.orderTimeline.findMany({
      where: { orderId: id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

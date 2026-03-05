import { Router } from 'express';
import { z } from 'zod';
import { prisma, UserRole, OrderStatus } from '../db';
import { authenticate, authorizePermissions } from '../middleware/auth';
import { Permissions } from '../rbac';

const router = Router();

router.use(authenticate);
router.use(authorizePermissions(Permissions.QA_ACCESS));

const pendingReviewStatuses: OrderStatus[] = [
  OrderStatus.PRODUCTION_COMPLETE,
  OrderStatus.QA_PENDING,
  OrderStatus.QA_INSPECTING,
];

function getFullName(firstName?: string | null, lastName?: string | null) {
  return `${firstName || ''} ${lastName || ''}`.trim() || 'Unknown';
}

function getPriorityFromTimestamp(submittedAt: Date): 'LOW' | 'MEDIUM' | 'HIGH' {
  const ageMs = Date.now() - submittedAt.getTime();
  if (ageMs >= 48 * 60 * 60 * 1000) return 'HIGH';
  if (ageMs >= 24 * 60 * 60 * 1000) return 'MEDIUM';
  return 'LOW';
}

async function getQaProfile(userId: string) {
  return prisma.qAProfile.findFirst({ where: { userId } });
}

// QA stats for dashboard widgets/charts
router.get('/stats', async (req, res, next) => {
  try {
    const profile = await getQaProfile(req.user!.id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'QA profile not found.',
      });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 6);

    const [
      pendingReviews,
      approvedToday,
      rejectedToday,
      totalApproved,
      totalRejected,
      weeklyReviewTimeline,
      reviewedOrders,
    ] = await Promise.all([
      prisma.order.count({
        where: { qaId: profile.id, status: { in: pendingReviewStatuses } },
      }),
      prisma.orderTimeline.count({
        where: {
          updatedById: req.user!.id,
          updatedByRole: UserRole.QA_TEAM,
          status: OrderStatus.QA_APPROVED,
          createdAt: { gte: todayStart },
        },
      }),
      prisma.orderTimeline.count({
        where: {
          updatedById: req.user!.id,
          updatedByRole: UserRole.QA_TEAM,
          status: OrderStatus.QA_REJECTED,
          createdAt: { gte: todayStart },
        },
      }),
      prisma.orderTimeline.count({
        where: {
          updatedById: req.user!.id,
          updatedByRole: UserRole.QA_TEAM,
          status: OrderStatus.QA_APPROVED,
        },
      }),
      prisma.orderTimeline.count({
        where: {
          updatedById: req.user!.id,
          updatedByRole: UserRole.QA_TEAM,
          status: OrderStatus.QA_REJECTED,
        },
      }),
      prisma.orderTimeline.findMany({
        where: {
          updatedById: req.user!.id,
          updatedByRole: UserRole.QA_TEAM,
          status: { in: [OrderStatus.QA_APPROVED, OrderStatus.QA_REJECTED] },
          createdAt: { gte: weekStart },
        },
        select: { createdAt: true },
      }),
      prisma.order.findMany({
        where: {
          qaId: profile.id,
          status: {
            in: [
              OrderStatus.QA_APPROVED,
              OrderStatus.QA_REJECTED,
              OrderStatus.SHIPPED,
              OrderStatus.DELIVERED,
              OrderStatus.COMPLETED,
            ],
          },
        },
        select: {
          timeline: {
            where: {
              status: {
                in: [
                  OrderStatus.PRODUCTION_COMPLETE,
                  OrderStatus.QA_PENDING,
                  OrderStatus.QA_INSPECTING,
                  OrderStatus.QA_APPROVED,
                  OrderStatus.QA_REJECTED,
                ],
              },
            },
            orderBy: { createdAt: 'asc' },
            select: { status: true, createdAt: true },
          },
        },
        take: 200,
      }),
    ]);

    const dailyCounts = new Map<string, number>();
    for (let i = 0; i < 7; i += 1) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      dailyCounts.set(day.toISOString().slice(0, 10), 0);
    }
    for (const item of weeklyReviewTimeline) {
      const key = item.createdAt.toISOString().slice(0, 10);
      if (dailyCounts.has(key)) {
        dailyCounts.set(key, (dailyCounts.get(key) || 0) + 1);
      }
    }

    const weeklyReviews = Array.from(dailyCounts.entries()).map(([dateKey, value]) => {
      const date = new Date(dateKey);
      return {
        label: date.toLocaleDateString('en-US', { weekday: 'short' }),
        value,
      };
    });

    const reviewDurationsMinutes = reviewedOrders
      .map((order) => {
        const reviewStarted = order.timeline.find((t) =>
          t.status === OrderStatus.PRODUCTION_COMPLETE ||
          t.status === OrderStatus.QA_PENDING ||
          t.status === OrderStatus.QA_INSPECTING
        );
        const reviewCompleted = order.timeline.find((t) =>
          t.status === OrderStatus.QA_APPROVED ||
          t.status === OrderStatus.QA_REJECTED
        );

        if (!reviewStarted || !reviewCompleted) {
          return null;
        }
        return Math.max(
          0,
          Math.round((reviewCompleted.createdAt.getTime() - reviewStarted.createdAt.getTime()) / 60000)
        );
      })
      .filter((value): value is number => typeof value === 'number');

    const totalReviewed = totalApproved + totalRejected;
    const avgReviewTime = reviewDurationsMinutes.length
      ? Math.round(reviewDurationsMinutes.reduce((sum, v) => sum + v, 0) / reviewDurationsMinutes.length)
      : 0;
    const approvalRate = totalReviewed > 0 ? Math.round((totalApproved / totalReviewed) * 100) : 0;

    res.json({
      success: true,
      data: {
        pendingReviews,
        approvedToday,
        rejectedToday,
        totalReviewed,
        avgReviewTime,
        approvalRate,
        weeklyReviews,
        reviewsByStatus: [
          { label: 'Approved', value: totalApproved, color: '#22c55e' },
          { label: 'Rejected', value: totalRejected, color: '#ef4444' },
        ],
      },
    });
  } catch (error) {
    next(error);
  }
});

// Pending items queue for QA review UI
router.get('/pending', async (req, res, next) => {
  try {
    const profile = await getQaProfile(req.user!.id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'QA profile not found.',
      });
    }

    const orders = await prisma.order.findMany({
      where: {
        qaId: profile.id,
        status: { in: pendingReviewStatuses },
      },
      include: {
        customer: {
          select: { firstName: true, lastName: true },
        },
        designOrder: {
          include: {
            design: {
              select: {
                name: true,
                images: { take: 4, orderBy: { sortOrder: 'asc' } },
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
        readyToWearItems: {
          include: {
            readyToWear: {
              select: {
                name: true,
                images: { take: 4, orderBy: { sortOrder: 'asc' } },
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
        timeline: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true, notes: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const pendingItems = orders.map((order) => {
      const designImages = order.designOrder?.design?.images?.map((img) => img.url) || [];
      const rtwImages = order.readyToWearItems.flatMap((item) =>
        item.readyToWear.images.map((img) => img.url)
      );
      const images = [...designImages, ...rtwImages].filter(Boolean);

      const submittedAt = order.timeline[0]?.createdAt || order.updatedAt;
      const measurements =
        order.designOrder?.measurements &&
        typeof order.designOrder.measurements === 'object' &&
        !Array.isArray(order.designOrder.measurements)
          ? (order.designOrder.measurements as Record<string, number>)
          : {};

      const designName =
        order.designOrder?.design?.name ||
        order.readyToWearItems[0]?.readyToWear?.name ||
        'Order Item';

      const designerName =
        getFullName(
          order.designOrder?.design?.designer?.user?.firstName ||
            order.readyToWearItems[0]?.readyToWear?.designer?.user?.firstName,
          order.designOrder?.design?.designer?.user?.lastName ||
            order.readyToWearItems[0]?.readyToWear?.designer?.user?.lastName
        );

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        designName,
        designerName,
        customerName: getFullName(order.customer.firstName, order.customer.lastName),
        images,
        measurements,
        submittedAt: submittedAt.toISOString(),
        priority: getPriorityFromTimestamp(submittedAt),
        notes: order.timeline[0]?.notes || undefined,
      };
    });

    res.json({
      success: true,
      data: pendingItems,
    });
  } catch (error) {
    next(error);
  }
});

// QA review history
router.get('/history', async (req, res, next) => {
  try {
    const history = await prisma.orderTimeline.findMany({
      where: {
        updatedById: req.user!.id,
        updatedByRole: UserRole.QA_TEAM,
        status: { in: [OrderStatus.QA_APPROVED, OrderStatus.QA_REJECTED] },
      },
      include: {
        order: {
          include: {
            designOrder: {
              include: {
                design: {
                  include: {
                    designer: {
                      include: {
                        user: { select: { firstName: true, lastName: true } },
                      },
                    },
                  },
                },
              },
            },
            readyToWearItems: {
              include: {
                readyToWear: {
                  include: {
                    designer: {
                      include: {
                        user: { select: { firstName: true, lastName: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const reviewerName = getFullName(req.user?.firstName, req.user?.lastName);
    const reviews = history.map((item) => {
      const designName =
        item.order.designOrder?.design?.name ||
        item.order.readyToWearItems[0]?.readyToWear?.name ||
        'Order Item';

      const designerName = getFullName(
        item.order.designOrder?.design?.designer?.user?.firstName ||
          item.order.readyToWearItems[0]?.readyToWear?.designer?.user?.firstName,
        item.order.designOrder?.design?.designer?.user?.lastName ||
          item.order.readyToWearItems[0]?.readyToWear?.designer?.user?.lastName
      );

      return {
        id: item.id,
        orderNumber: item.order.orderNumber,
        designName,
        status: item.status === OrderStatus.QA_APPROVED ? 'APPROVED' : 'REJECTED',
        reviewedAt: item.createdAt,
        notes: item.notes || '',
        reviewerName,
        designerName,
      };
    });

    res.json({
      success: true,
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
});

// Submit QA review decision
router.post('/review', async (req, res, next) => {
  try {
    const schema = z.object({
      orderId: z.string().uuid(),
      status: z.enum(['APPROVED', 'REJECTED']),
      notes: z.string().optional(),
    });
    const { orderId, status, notes } = schema.parse(req.body);

    const profile = await getQaProfile(req.user!.id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'QA profile not found.',
      });
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, qaId: profile.id },
      select: { id: true, status: true },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or not assigned to you.',
      });
    }

    if (!pendingReviewStatuses.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'This order is not currently pending QA review.',
      });
    }

    const nextStatus = status === 'APPROVED' ? OrderStatus.QA_APPROVED : OrderStatus.QA_REJECTED;

    const [updatedOrder] = await prisma.$transaction([
      prisma.order.update({
        where: { id: orderId },
        data: { status: nextStatus },
      }),
      prisma.orderTimeline.create({
        data: {
          orderId,
          status: nextStatus,
          notes: notes || `QA ${status.toLowerCase()}`,
          updatedById: req.user!.id,
          updatedByRole: UserRole.QA_TEAM,
        },
      }),
    ]);

    res.json({
      success: true,
      message: `Order ${status.toLowerCase()} successfully.`,
      data: updatedOrder,
    });
  } catch (error) {
    next(error);
  }
});

// Get QA dashboard
router.get('/dashboard', async (req, res, next) => {
  try {
    const profile = await getQaProfile(req.user!.id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'QA profile not found.',
      });
    }

    const [assignedOrders, pendingInspection, completedToday] = await Promise.all([
      prisma.order.count({ where: { qaId: profile.id } }),
      prisma.order.count({
        where: {
          qaId: profile.id,
          status: { in: [OrderStatus.QA_PENDING, OrderStatus.QA_INSPECTING] },
        },
      }),
      prisma.order.count({
        where: {
          qaId: profile.id,
          status: OrderStatus.SHIPPED,
          shippedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        profile,
        stats: {
          assignedOrders,
          pendingInspection,
          completedToday,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get orders assigned to QA
router.get('/orders', async (req, res, next) => {
  try {
    const profile = await getQaProfile(req.user!.id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'QA profile not found.',
      });
    }

    const { status } = req.query;

    const where: any = { qaId: profile.id };
    if (status) where.status = status;

    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: {
          select: { firstName: true, lastName: true, email: true },
        },
        designOrder: {
          include: {
            design: {
              select: { name: true, images: { take: 1 } },
            },
          },
        },
        fabricOrder: {
          include: {
            fabric: {
              select: { name: true },
            },
          },
        },
        readyToWearItems: {
          include: {
            readyToWear: {
              select: { name: true, images: { take: 1 } },
            },
          },
        },
        timeline: {
          orderBy: { createdAt: 'desc' },
          take: 5,
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

// Update order with tracking
router.patch('/orders/:id/ship', async (req, res, next) => {
  try {
    const { id } = req.params;
    const schema = z.object({
      trackingNumber: z.string().min(1),
      notes: z.string().optional(),
    });
    const { trackingNumber, notes } = schema.parse(req.body);

    const profile = await getQaProfile(req.user!.id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'QA profile not found.',
      });
    }

    const order = await prisma.order.findFirst({
      where: { id, qaId: profile.id },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or not assigned to you.',
      });
    }

    if (order.status !== OrderStatus.QA_APPROVED) {
      return res.status(400).json({
        success: false,
        message: 'Only QA approved orders can be shipped.',
      });
    }

    const [updatedOrder] = await prisma.$transaction([
      prisma.order.update({
        where: { id },
        data: {
          status: OrderStatus.SHIPPED,
          trackingNumber,
          shippedAt: new Date(),
        },
      }),
      prisma.orderTimeline.create({
        data: {
          orderId: id,
          status: OrderStatus.SHIPPED,
          notes: notes || `Shipped with tracking: ${trackingNumber}`,
          updatedById: req.user!.id,
          updatedByRole: UserRole.QA_TEAM,
        },
      }),
    ]);

    res.json({
      success: true,
      message: 'Order shipped successfully.',
      data: updatedOrder,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

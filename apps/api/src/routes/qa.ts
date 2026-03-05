import { Router } from 'express';
import { z } from 'zod';
import { prisma, UserRole, OrderStatus } from '../db';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(authorize(UserRole.QA_TEAM));

// Get QA dashboard
router.get('/dashboard', async (req, res, next) => {
  try {
    const profile = await prisma.qAProfile.findFirst({
      where: { userId: req.user!.id },
    });

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
          status: { in: ['QA_PENDING', 'QA_INSPECTING'] },
        },
      }),
      prisma.order.count({
        where: {
          qaId: profile.id,
          status: 'SHIPPED',
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
    const profile = await prisma.qAProfile.findFirst({
      where: { userId: req.user!.id },
    });

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
    const { trackingNumber, notes } = req.body;

    const profile = await prisma.qAProfile.findFirst({
      where: { userId: req.user!.id },
    });

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

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: 'SHIPPED',
        trackingNumber,
        shippedAt: new Date(),
      },
    });

    await prisma.orderTimeline.create({
      data: {
        orderId: id,
        status: 'SHIPPED',
        notes: notes || `Shipped with tracking: ${trackingNumber}`,
        updatedById: req.user!.id,
        updatedByRole: UserRole.QA_TEAM,
      },
    });

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

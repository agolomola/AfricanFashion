import { Router } from 'express';
import { z } from 'zod';
import { prisma, UserRole } from './db';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(authorize(UserRole.CUSTOMER));

// Get customer profile
router.get('/profile', async (req, res, next) => {
  try {
    const profile = await prisma.customerProfile.findUnique({
      where: { userId: req.user!.id },
      include: {
        addresses: true,
        measurements: {
          include: {
            tryOnHistory: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    next(error);
  }
});

// Add address
router.post('/addresses', async (req, res, next) => {
  try {
    const schema = z.object({
      label: z.string().min(1),
      fullName: z.string().min(2),
      phone: z.string().min(1),
      country: z.string().min(1),
      city: z.string().min(1),
      address: z.string().min(1),
      postalCode: z.string().optional(),
      isDefault: z.boolean().default(false),
    });

    const data = schema.parse(req.body);

    const profile = await prisma.customerProfile.findUnique({
      where: { userId: req.user!.id },
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Customer profile not found.',
      });
    }

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await prisma.address.updateMany({
        where: { customerProfileId: profile.id },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: {
        ...data,
        customerProfileId: profile.id,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Address added successfully.',
      data: address,
    });
  } catch (error) {
    next(error);
  }
});

// Update address
router.patch('/addresses/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const profile = await prisma.customerProfile.findUnique({
      where: { userId: req.user!.id },
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Customer profile not found.',
      });
    }

    // If setting as default, unset other defaults
    if (updateData.isDefault) {
      await prisma.address.updateMany({
        where: { customerProfileId: profile.id },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.update({
      where: { id, customerProfileId: profile.id },
      data: updateData,
    });

    res.json({
      success: true,
      message: 'Address updated successfully.',
      data: address,
    });
  } catch (error) {
    next(error);
  }
});

// Delete address
router.delete('/addresses/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const profile = await prisma.customerProfile.findUnique({
      where: { userId: req.user!.id },
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Customer profile not found.',
      });
    }

    await prisma.address.delete({
      where: { id, customerProfileId: profile.id },
    });

    res.json({
      success: true,
      message: 'Address deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
});

// Save measurements
router.post('/measurements', async (req, res, next) => {
  try {
    const schema = z.object({
      height: z.number().optional(),
      weight: z.number().optional(),
      measurements: z.record(z.number()).optional(),
    });

    const data = schema.parse(req.body);

    const profile = await prisma.customerProfile.findUnique({
      where: { userId: req.user!.id },
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Customer profile not found.',
      });
    }

    const measurements = await prisma.customerMeasurement.upsert({
      where: { customerProfileId: profile.id },
      create: {
        ...data,
        customerProfileId: profile.id,
      },
      update: data,
    });

    res.json({
      success: true,
      message: 'Measurements saved successfully.',
      data: measurements,
    });
  } catch (error) {
    next(error);
  }
});

// Get customer orders
router.get('/orders', async (req, res, next) => {
  try {
    const { page = '1', limit = '10' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { customerId: req.user!.id },
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
        include: {
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
                select: { name: true, images: { take: 1 } },
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
      }),
      prisma.order.count({ where: { customerId: req.user!.id } }),
    ]);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Accept order delivery
router.post('/orders/:id/accept', async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.update({
      where: {
        id,
        customerId: req.user!.id,
        status: 'DELIVERED',
      },
      data: {
        status: 'COMPLETED',
        customerAcceptedAt: new Date(),
      },
    });

    // Add timeline entry
    await prisma.orderTimeline.create({
      data: {
        orderId: id,
        status: 'COMPLETED',
        notes: 'Customer accepted the order',
        updatedById: req.user!.id,
        updatedByRole: UserRole.CUSTOMER,
      },
    });

    res.json({
      success: true,
      message: 'Order accepted. Thank you for shopping with us!',
      data: order,
    });
  } catch (error) {
    next(error);
  }
});

// Request refund
router.post('/orders/:id/refund', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const order = await prisma.order.update({
      where: {
        id,
        customerId: req.user!.id,
        status: { in: ['DELIVERED', 'COMPLETED'] },
      },
      data: {
        status: 'REFUND_REQUESTED',
        refundReason: reason,
      },
    });

    // Add timeline entry
    await prisma.orderTimeline.create({
      data: {
        orderId: id,
        status: 'REFUND_REQUESTED',
        notes: `Refund requested: ${reason}`,
        updatedById: req.user!.id,
        updatedByRole: UserRole.CUSTOMER,
      },
    });

    res.json({
      success: true,
      message: 'Refund request submitted. Our team will review your request.',
      data: order,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

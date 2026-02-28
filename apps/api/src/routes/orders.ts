import { Router } from 'express';
import { z } from 'zod';
import { prisma, UserRole, OrderType, OrderStatus } from '@african-fashion/database';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Get order by ID (with role-based access)
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: {
          select: { firstName: true, lastName: true, email: true },
        },
        designOrder: {
          include: {
            design: {
              include: {
                designer: {
                  include: {
                    user: { select: { firstName: true, lastName: true } },
                  },
                },
                images: true,
              },
            },
          },
        },
        fabricOrder: {
          include: {
            fabric: {
              include: {
                seller: {
                  include: {
                    user: { select: { firstName: true, lastName: true } },
                  },
                },
                images: true,
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
                images: true,
              },
            },
          },
        },
        timeline: {
          orderBy: { createdAt: 'asc' },
        },
        qa: {
          include: {
            user: { select: { firstName: true, lastName: true } },
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

    // Check access permissions
    let hasAccess = false;
    if (user.role === UserRole.ADMINISTRATOR) {
      hasAccess = true;
    } else if (user.role === UserRole.CUSTOMER && order.customerId === user.id) {
      hasAccess = true;
    } else if (user.role === UserRole.QA_TEAM && order.qaId) {
      const qaProfile = await prisma.qAProfile.findFirst({
        where: { userId: user.id },
      });
      if (qaProfile && order.qaId === qaProfile.id) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this order.',
      });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
});

// Create custom design order
router.post('/custom-design', async (req, res, next) => {
  try {
    const schema = z.object({
      designId: z.string().uuid(),
      fabricId: z.string().uuid(),
      yards: z.number().min(1),
      measurements: z.record(z.number()),
      shippingAddressId: z.string().uuid(),
      paymentMethod: z.string(),
    });

    const data = schema.parse(req.body);
    const customerId = req.user!.id;

    // Get design and fabric details
    const [design, fabric, address] = await Promise.all([
      prisma.design.findUnique({
        where: { id: data.designId },
        include: {
          designer: true,
          suitableFabrics: { where: { fabricId: data.fabricId } },
        },
      }),
      prisma.fabric.findUnique({
        where: { id: data.fabricId },
        include: { seller: true },
      }),
      prisma.address.findUnique({
        where: { id: data.shippingAddressId },
      }),
    ]);

    if (!design) {
      return res.status(404).json({ success: false, message: 'Design not found.' });
    }
    if (!fabric) {
      return res.status(404).json({ success: false, message: 'Fabric not found.' });
    }
    if (!address) {
      return res.status(404).json({ success: false, message: 'Shipping address not found.' });
    }

    // Check if fabric is suitable for design
    if (design.suitableFabrics.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Selected fabric is not suitable for this design.',
      });
    }

    // Check if fabric and designer are in same country
    if (fabric.seller.country !== design.designer.country) {
      return res.status(400).json({
        success: false,
        message: 'Fabric seller and designer must be in the same country for standard processing.',
      });
    }

    // Check fabric stock
    if (fabric.stockYards < data.yards) {
      return res.status(400).json({
        success: false,
        message: `Not enough fabric in stock. Available: ${fabric.stockYards} yards`,
      });
    }

    // Calculate prices
    const fabricPrice = fabric.finalPrice * data.yards;
    const designPrice = design.finalPrice;
    const subtotal = fabricPrice + designPrice;
    const shippingCost = 25; // Fixed for now
    const tax = subtotal * 0.08; // 8% tax
    const total = subtotal + shippingCost + tax;

    // Generate order number
    const orderNumber = `AF-${Date.now().toString(36).toUpperCase()}`;

    // Create order with all components
    const order = await prisma.$transaction(async (tx) => {
      // Create main order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          type: OrderType.CUSTOM_DESIGN,
          customerId,
          shippingAddress: address,
          subtotal,
          shippingCost,
          tax,
          total,
          paymentMethod: data.paymentMethod,
          status: OrderStatus.PENDING_PAYMENT,
          // Create design order item
          designOrder: {
            create: {
              designId: data.designId,
              designerId: design.designerId,
              measurements: data.measurements,
              price: designPrice,
              status: 'PENDING',
            },
          },
          // Create fabric order item
          fabricOrder: {
            create: {
              fabricId: data.fabricId,
              sellerId: fabric.sellerId,
              yards: data.yards,
              pricePerYard: fabric.finalPrice,
              totalPrice: fabricPrice,
              status: 'PENDING',
            },
          },
          // Create timeline entry
          timeline: {
            create: {
              status: OrderStatus.PENDING_PAYMENT,
              notes: 'Order created, awaiting payment',
              updatedById: customerId,
              updatedByRole: UserRole.CUSTOMER,
            },
          },
        },
        include: {
          designOrder: true,
          fabricOrder: true,
        },
      });

      // Reserve fabric stock
      await tx.fabric.update({
        where: { id: data.fabricId },
        data: { stockYards: { decrement: data.yards } },
      });

      return newOrder;
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully. Please complete payment.',
      data: order,
    });
  } catch (error) {
    next(error);
  }
});

// Create ready-to-wear order
router.post('/ready-to-wear', async (req, res, next) => {
  try {
    const schema = z.object({
      items: z.array(z.object({
        readyToWearId: z.string().uuid(),
        size: z.string(),
        quantity: z.number().min(1),
      })),
      shippingAddressId: z.string().uuid(),
      paymentMethod: z.string(),
    });

    const data = schema.parse(req.body);
    const customerId = req.user!.id;

    // Validate items and calculate total
    let subtotal = 0;
    const validatedItems = [];

    for (const item of data.items) {
      const product = await prisma.readyToWear.findUnique({
        where: { id: item.readyToWearId },
        include: {
          sizeVariations: {
            where: { size: item.size },
          },
        },
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.readyToWearId}`,
        });
      }

      if (product.sizeVariations.length === 0) {
        return res.status(400).json({
          success: false,
          message: `Size ${item.size} not available for ${product.name}`,
        });
      }

      const sizeVar = product.sizeVariations[0];
      if (sizeVar.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Not enough stock for ${product.name} in size ${item.size}. Available: ${sizeVar.stock}`,
        });
      }

      const itemTotal = sizeVar.price * item.quantity;
      subtotal += itemTotal;

      validatedItems.push({
        ...item,
        price: sizeVar.price,
        sizeVariationId: sizeVar.id,
      });
    }

    // Get shipping address
    const address = await prisma.address.findUnique({
      where: { id: data.shippingAddressId },
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Shipping address not found.',
      });
    }

    // Calculate totals
    const shippingCost = 15;
    const tax = subtotal * 0.08;
    const total = subtotal + shippingCost + tax;

    // Generate order number
    const orderNumber = `AF-${Date.now().toString(36).toUpperCase()}`;

    // Create order
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          type: OrderType.READY_TO_WEAR,
          customerId,
          shippingAddress: address,
          subtotal,
          shippingCost,
          tax,
          total,
          paymentMethod: data.paymentMethod,
          status: OrderStatus.PENDING_PAYMENT,
          readyToWearItems: {
            create: validatedItems.map((item) => ({
              readyToWearId: item.readyToWearId,
              size: item.size,
              price: item.price,
              quantity: item.quantity,
            })),
          },
          timeline: {
            create: {
              status: OrderStatus.PENDING_PAYMENT,
              notes: 'Ready-to-wear order created, awaiting payment',
              updatedById: customerId,
              updatedByRole: UserRole.CUSTOMER,
            },
          },
        },
        include: {
          readyToWearItems: true,
        },
      });

      // Deduct stock
      for (const item of validatedItems) {
        await tx.readyToWearSize.update({
          where: { id: item.sizeVariationId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      return newOrder;
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully. Please complete payment.',
      data: order,
    });
  } catch (error) {
    next(error);
  }
});

// Update order status (for all parties)
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const user = req.user!;

    // Get current order
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        designOrder: true,
        fabricOrder: true,
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    // Validate status transition based on user role
    let canUpdate = false;
    let updateData: any = {};

    if (user.role === UserRole.ADMINISTRATOR) {
      canUpdate = true;
    } else if (user.role === UserRole.FABRIC_SELLER && order.fabricOrder) {
      const sellerProfile = await prisma.fabricSellerProfile.findFirst({
        where: { userId: user.id },
      });
      if (sellerProfile && order.fabricOrder.sellerId === sellerProfile.id) {
        // Fabric seller can only update fabric portion
        const fabricStatuses = ['PENDING', 'CONFIRMED', 'SHIPPED_TO_DESIGNER', 'DELIVERED'];
        if (fabricStatuses.includes(status)) {
          canUpdate = true;
          updateData.fabricOrder = {
            update: {
              status,
              ...(status === 'SHIPPED_TO_DESIGNER' && {
                shippedToDesignerAt: new Date(),
              }),
            },
          };
        }
      }
    } else if (user.role === UserRole.FASHION_DESIGNER && order.designOrder) {
      const designerProfile = await prisma.designerProfile.findFirst({
        where: { userId: user.id },
      });
      if (designerProfile && order.designOrder.designerId === designerProfile.id) {
        // Designer can only update design portion
        const designStatuses = ['PENDING', 'CONFIRMED', 'FABRIC_RECEIVED', 'IN_PRODUCTION', 'COMPLETED'];
        if (designStatuses.includes(status)) {
          canUpdate = true;
          updateData.designOrder = {
            update: { status },
          };
        }
      }
    } else if (user.role === UserRole.QA_TEAM) {
      const qaProfile = await prisma.qAProfile.findFirst({
        where: { userId: user.id },
      });
      if (qaProfile && order.qaId === qaProfile.id) {
        const qaStatuses = ['QA_PENDING', 'QA_INSPECTING', 'QA_APPROVED', 'QA_REJECTED', 'SHIPPED'];
        if (qaStatuses.includes(status)) {
          canUpdate = true;
          updateData.status = status;
          if (status === 'SHIPPED') {
            updateData.shippedAt = new Date();
          }
        }
      }
    }

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this order status.',
      });
    }

    // Update order
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
    });

    // Add timeline entry
    await prisma.orderTimeline.create({
      data: {
        orderId: id,
        status,
        notes: notes || `Status updated to ${status}`,
        updatedById: user.id,
        updatedByRole: user.role,
      },
    });

    res.json({
      success: true,
      message: 'Order status updated successfully.',
      data: updatedOrder,
    });
  } catch (error) {
    next(error);
  }
});

// Add tracking number (QA only)
router.patch('/:id/tracking', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { trackingNumber } = req.body;
    const user = req.user!;

    // Verify QA access
    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    const qaProfile = await prisma.qAProfile.findFirst({
      where: { userId: user.id },
    });

    if (!qaProfile || order.qaId !== qaProfile.id) {
      return res.status(403).json({
        success: false,
        message: 'Only assigned QA can add tracking information.',
      });
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { trackingNumber },
    });

    res.json({
      success: true,
      message: 'Tracking number added successfully.',
      data: updatedOrder,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

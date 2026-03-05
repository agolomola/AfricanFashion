import { Router } from 'express';
import Stripe from 'stripe';
import { z } from 'zod';
import { prisma, PaymentStatus, OrderStatus } from '../db';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

function getStripeClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return null;
  }
  return new Stripe(secretKey);
}

router.post('/create-intent', async (req, res, next) => {
  try {
    const schema = z.object({
      amount: z.number().int().positive(),
      currency: z.string().min(3).max(3).default('usd'),
    });
    const { amount, currency } = schema.parse(req.body);

    const stripe = getStripeClient();
    if (!stripe) {
      return res.status(503).json({
        success: false,
        message: 'Payment service is not configured.',
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: {
        userId: req.user!.id,
      },
    });

    res.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/confirm', async (req, res, next) => {
  try {
    const schema = z.object({
      paymentIntentId: z.string().min(1),
    });
    const { paymentIntentId } = schema.parse(req.body);

    const stripe = getStripeClient();
    if (!stripe) {
      return res.status(503).json({
        success: false,
        message: 'Payment service is not configured.',
      });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.metadata?.userId && paymentIntent.metadata.userId !== req.user!.id) {
      return res.status(403).json({
        success: false,
        message: 'Payment intent does not belong to this user.',
      });
    }

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        message: `Payment not completed. Current status: ${paymentIntent.status}`,
      });
    }

    const updated = await prisma.order.updateMany({
      where: {
        customerId: req.user!.id,
        paymentIntentId,
      },
      data: {
        paymentStatus: PaymentStatus.COMPLETED,
        status: OrderStatus.PAYMENT_CONFIRMED,
        paidAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: {
        paymentIntentId,
        updatedOrders: updated.count,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;

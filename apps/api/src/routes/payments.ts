import { Router } from 'express';
import Stripe from 'stripe';
import { z } from 'zod';
import { prisma, PaymentStatus, OrderStatus } from '../db';
import { authenticate, authorizePermissions } from '../middleware/auth';
import { Permissions } from '../rbac';
import { convertUsdToLocal, getCurrencyState } from '../utils/currency';

const router = Router();

router.use(authenticate);
router.use(authorizePermissions(Permissions.PAYMENTS_CREATE));

const defaultSupportedStripeCurrencies = [
  'usd',
  'eur',
  'gbp',
  'ngn',
  'zar',
  'kes',
  'ghs',
  'egp',
  'mad',
  'tzs',
  'ugx',
  'rwf',
  'mru',
  'mur',
  'bwp',
  'zmw',
];

const zeroDecimalCurrencies = new Set([
  'bif',
  'djf',
  'gnf',
  'jpy',
  'kmf',
  'krw',
  'mga',
  'pyg',
  'rwf',
  'ugx',
  'vnd',
  'vuv',
  'xaf',
  'xof',
  'xpf',
]);

function getStripeClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return null;
  }
  return new Stripe(secretKey);
}

function getSupportedStripeCurrencies() {
  const envCodes = (process.env.STRIPE_SUPPORTED_CURRENCIES || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set(envCodes.length > 0 ? envCodes : defaultSupportedStripeCurrencies));
}

function toMinorUnits(amountMajor: number, currency: string) {
  if (!Number.isFinite(amountMajor) || amountMajor <= 0) return 0;
  if (zeroDecimalCurrencies.has(currency.toLowerCase())) {
    return Math.round(amountMajor);
  }
  return Math.round(amountMajor * 100);
}

router.get('/config', async (req, res, next) => {
  try {
    const supportedCurrencies = getSupportedStripeCurrencies();
    res.json({
      success: true,
      data: {
        supportedCurrencies,
        defaultCurrency: 'usd',
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/create-intent', async (req, res, next) => {
  try {
    const schema = z.object({
      amountUsd: z.number().positive(),
      currency: z.string().min(3).max(3).default('usd'),
    });
    const { amountUsd, currency } = schema.parse(req.body);

    const stripe = getStripeClient();
    if (!stripe) {
      return res.status(503).json({
        success: false,
        message: 'Payment service is not configured.',
      });
    }

    const supported = getSupportedStripeCurrencies();
    const requestedCurrency = currency.toLowerCase();
    const effectiveCurrency = supported.includes(requestedCurrency) ? requestedCurrency : 'usd';
    const { matrix } = await getCurrencyState();
    const convertedAmountMajor =
      effectiveCurrency === 'usd'
        ? Number(amountUsd)
        : convertUsdToLocal(Number(amountUsd), effectiveCurrency.toUpperCase(), matrix);
    const amount = toMinorUnits(convertedAmountMajor, effectiveCurrency);
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Calculated payment amount is invalid.',
      });
    }
    const exchangeRate =
      effectiveCurrency === 'usd' ? 1 : Number((convertedAmountMajor / Number(amountUsd || 1)).toFixed(8));

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: effectiveCurrency,
      automatic_payment_methods: { enabled: true },
      metadata: {
        userId: req.user!.id,
        amountUsd: String(Number(amountUsd).toFixed(2)),
        requestedCurrency,
        effectiveCurrency,
        convertedAmountMajor: String(Number(convertedAmountMajor).toFixed(2)),
        exchangeRate: String(exchangeRate),
      },
    });

    res.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        currency: effectiveCurrency,
        amountMinor: amount,
        convertedAmountMajor,
        requestedCurrency,
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

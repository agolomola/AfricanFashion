import { Router } from 'express';
import { z } from 'zod';
import { prisma, UserRole } from '../db';
import { authenticate, authorizePermissions } from '../middleware/auth';
import { Permissions } from '../rbac';
import {
  applyOverridesToMatrix,
  convertLocalToUsd,
  convertUsdToLocal,
  getAllowedCurrenciesForVendor,
  getCurrencyHealth,
  getCurrencyOverrides,
  getCurrencyState,
  getDefaultCurrencyForCountry,
  getUsdPerUnit,
  inferCountryFromHeaders,
  mapCountryToBaseline,
  refreshMatrixFromThirdParty,
  saveCurrencyMatrix,
  saveCurrencyRules,
  upsertCurrencyOverride,
} from '../utils/currency';

const router = Router();

const currencyRuleSchema = z.object({
  id: z.string().min(1),
  scopeType: z.enum(['COUNTRY', 'USER', 'ROLE']),
  scopeValue: z.string().min(1),
  currencies: z.array(z.string().min(3)).min(1),
});

router.get('/config', async (req, res, next) => {
  try {
    const [{ matrix }, health] = await Promise.all([getCurrencyState(), getCurrencyHealth()]);
    const visitorCountry = inferCountryFromHeaders(req.headers as any);
    const defaultCurrency = visitorCountry
      ? getDefaultCurrencyForCountry(visitorCountry.country, matrix)
      : 'USD';
    const supportedCurrencies = Array.from(new Set(['USD', ...matrix.map((row) => row.currencyCode)])).sort();

    res.json({
      success: true,
      data: {
        defaultCurrency,
        supportedCurrencies,
        matrix,
        health,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/convert', async (req, res, next) => {
  try {
    const schema = z.object({
      amountUsd: z.coerce.number().min(0),
      to: z.string().min(3),
    });
    const { amountUsd, to } = schema.parse(req.query);
    const { matrix } = await getCurrencyState();
    const converted = convertUsdToLocal(amountUsd, to, matrix);
    res.json({
      success: true,
      data: {
        amountUsd,
        currencyCode: to.toUpperCase(),
        amount: converted,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/my-options', authenticate, async (req, res, next) => {
  try {
    const { matrix, rules } = await getCurrencyState();
    let country = '';
    if (req.user?.role === UserRole.FABRIC_SELLER) {
      const profile = await prisma.fabricSellerProfile.findFirst({
        where: { userId: req.user.id },
        select: { country: true },
      });
      country = profile?.country || '';
    } else if (req.user?.role === UserRole.FASHION_DESIGNER) {
      const profile = await prisma.designerProfile.findFirst({
        where: { userId: req.user.id },
        select: { country: true },
      });
      country = profile?.country || '';
    } else {
      country = inferCountryFromHeaders(req.headers as any)?.country || '';
    }

    const fallback = mapCountryToBaseline(country);
    const safeCountry = country || fallback?.country || 'United States';
    const { defaultCurrency, allowedCurrencies } = getAllowedCurrenciesForVendor({
      role: (req.user?.role || UserRole.CUSTOMER) as UserRole,
      userId: req.user!.id,
      country: safeCountry,
      matrix,
      rules,
    });

    res.json({
      success: true,
      data: {
        country: safeCountry,
        defaultCurrency,
        allowedCurrencies,
        usdPerUnitByCurrency: Object.fromEntries(
          allowedCurrencies.map((code) => [code, getUsdPerUnit(code, matrix) || 1])
        ),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/matrix', authenticate, authorizePermissions(Permissions.ADMIN_ACCESS), async (req, res, next) => {
  try {
    const [data, health, overrides] = await Promise.all([
      getCurrencyState(),
      getCurrencyHealth(),
      getCurrencyOverrides(),
    ]);
    res.json({ success: true, data: { ...data, health, overrides } });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/health', authenticate, authorizePermissions(Permissions.ADMIN_ACCESS), async (req, res, next) => {
  try {
    const health = await getCurrencyHealth();
    res.json({ success: true, data: health });
  } catch (error) {
    next(error);
  }
});

router.put('/admin/rate', authenticate, authorizePermissions(Permissions.ADMIN_ACCESS), async (req, res, next) => {
  try {
    const schema = z.object({
      countryCode: z.string().min(2),
      country: z.string().min(2),
      currencyCode: z.string().min(3),
      currencyName: z.string().min(2),
      usdPerUnit: z.coerce.number().positive(),
    });
    const payload = schema.parse(req.body);
    const { matrix } = await getCurrencyState();
    const idx = matrix.findIndex((row) => row.countryCode === payload.countryCode.toUpperCase());
    const nextMatrix = [...matrix];
    const row = {
      countryCode: payload.countryCode.toUpperCase(),
      country: payload.country.trim(),
      currencyCode: payload.currencyCode.toUpperCase(),
      currencyName: payload.currencyName.trim(),
      usdPerUnit: Number(payload.usdPerUnit),
    };
    if (idx >= 0) {
      nextMatrix[idx] = row;
    } else {
      nextMatrix.push(row);
    }
    await saveCurrencyMatrix(req.user!.id, nextMatrix, { source: 'manual' });
    await upsertCurrencyOverride(req.user!.id, row as any);
    res.json({ success: true, message: 'Currency rate updated.', data: row });
  } catch (error) {
    next(error);
  }
});

router.put('/admin/rules', authenticate, authorizePermissions(Permissions.ADMIN_ACCESS), async (req, res, next) => {
  try {
    const schema = z.object({
      rules: z.array(currencyRuleSchema),
    });
    const payload = schema.parse(req.body);
    await saveCurrencyRules(req.user!.id, payload.rules as any);
    res.json({ success: true, message: 'Currency listing rules updated.', data: payload.rules });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/refresh', authenticate, authorizePermissions(Permissions.ADMIN_ACCESS), async (req, res, next) => {
  try {
    const [{ matrix }, overrides] = await Promise.all([getCurrencyState(), getCurrencyOverrides()]);
    const refreshed = await refreshMatrixFromThirdParty(matrix);
    const merged = applyOverridesToMatrix(refreshed, overrides);
    await saveCurrencyMatrix(req.user!.id, merged, { source: 'provider' });
    res.json({
      success: true,
      message: 'Exchange rates refreshed from provider.',
      data: merged,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/preview-convert', authenticate, authorizePermissions(Permissions.ADMIN_ACCESS), async (req, res, next) => {
  try {
    const schema = z.object({
      amount: z.coerce.number().min(0),
      fromCurrency: z.string().min(3),
      toCurrency: z.string().min(3),
    });
    const { amount, fromCurrency, toCurrency } = schema.parse(req.body);
    const { matrix } = await getCurrencyState();
    const usdAmount = convertLocalToUsd(amount, fromCurrency, matrix);
    const converted = convertUsdToLocal(usdAmount, toCurrency, matrix);
    res.json({
      success: true,
      data: {
        amount,
        fromCurrency: fromCurrency.toUpperCase(),
        toCurrency: toCurrency.toUpperCase(),
        converted,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;

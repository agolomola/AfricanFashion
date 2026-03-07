import { Router } from 'express';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { prisma } from '../db';
import { authenticate, authorizePermissions } from '../middleware/auth';
import { Permissions } from '../rbac';
import { ensureHomepageSectionsSchema } from '../utils/frontpage-schema';
import {
  AFRICAN_COUNTRY_BY_CODE,
  AFRICAN_COUNTRY_BY_NAME,
  AFRICAN_COUNTRY_OPTIONS,
  countryCodeToFlag,
} from '../constants/africanCountries';

const router = Router();

router.use(async (_req, res, next) => {
  try {
    await ensureHomepageSectionsSchema();
  } catch (error) {
    console.error('Failed to ensure homepage sections schema:', error);
  }
  next();
});

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

const deriveInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .join('')
    .slice(0, 3) || 'AF';

const parseSocialLinks = (value?: string | null) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
};

const getNonEmptyString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeCountryCode = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const code = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : undefined;
};

const sanitizeKeywords = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 12)
    .join(', ');
};

const COUNTRY_IMAGE_PROVIDER = String(process.env.COUNTRY_IMAGE_PROVIDER || '')
  .trim()
  .toUpperCase();
const OPENAI_API_KEY = String(process.env.OPENAI_API_KEY || '').trim();
const OPENAI_COUNTRY_IMAGE_ENDPOINT = String(process.env.OPENAI_COUNTRY_IMAGE_ENDPOINT || 'https://api.openai.com/v1/images/generations').trim();
const OPENAI_COUNTRY_IMAGE_MODEL = String(process.env.OPENAI_COUNTRY_IMAGE_MODEL || 'gpt-image-1').trim();
const OPENAI_COUNTRY_IMAGE_SIZE = String(process.env.OPENAI_COUNTRY_IMAGE_SIZE || '1536x1024').trim();
const COUNTRY_IMAGE_SETTINGS_KEY = 'COUNTRY_IMAGE_API';

type CountryImageProvider = 'OPENAI' | 'OPENAI_COMPATIBLE' | 'POLLINATIONS';

interface CountryImageApiConfig {
  provider: CountryImageProvider;
  endpoint?: string;
  model?: string;
  imageSize?: string;
  apiKey?: string;
}

interface CountryImageGenerationResult {
  url: string;
  provider: CountryImageProvider;
  prompt: string;
  fallbackUsed: boolean;
}

const normalizeCountryImageProvider = (value: unknown, fallback: CountryImageProvider = 'POLLINATIONS'): CountryImageProvider => {
  const normalized = String(value || '')
    .trim()
    .toUpperCase();
  if (normalized === 'OPENAI' || normalized === 'OPENAI_COMPATIBLE' || normalized === 'POLLINATIONS') {
    return normalized;
  }
  return fallback;
};

const defaultCountryImageConfig: CountryImageApiConfig = {
  provider: normalizeCountryImageProvider(
    COUNTRY_IMAGE_PROVIDER,
    OPENAI_API_KEY ? 'OPENAI' : 'POLLINATIONS'
  ),
  endpoint: OPENAI_COUNTRY_IMAGE_ENDPOINT,
  model: OPENAI_COUNTRY_IMAGE_MODEL,
  imageSize: OPENAI_COUNTRY_IMAGE_SIZE,
  apiKey: OPENAI_API_KEY || undefined,
};

const maskApiKey = (value: string | undefined) => {
  const key = String(value || '').trim();
  if (!key) return '';
  if (key.length <= 8) return `${key.slice(0, 2)}***${key.slice(-1)}`;
  return `${key.slice(0, 4)}***${key.slice(-4)}`;
};

const parseCountryImageConfig = (raw: unknown): CountryImageApiConfig => {
  if (!raw || typeof raw !== 'object') {
    return { ...defaultCountryImageConfig };
  }
  const row = raw as Record<string, any>;
  const provider = normalizeCountryImageProvider(row.provider, defaultCountryImageConfig.provider);
  return {
    provider,
    endpoint: getNonEmptyString(row.endpoint) || defaultCountryImageConfig.endpoint,
    model: getNonEmptyString(row.model) || defaultCountryImageConfig.model,
    imageSize: getNonEmptyString(row.imageSize) || defaultCountryImageConfig.imageSize,
    apiKey: getNonEmptyString(row.apiKey) || defaultCountryImageConfig.apiKey,
  };
};

const readCountryImageApiConfig = async () => {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT "id", "value"
     FROM "HomepageSectionSetting"
     WHERE "key" = $1
     LIMIT 1`,
    COUNTRY_IMAGE_SETTINGS_KEY
  );
  const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  if (!row) {
    return {
      rowId: null as string | null,
      config: { ...defaultCountryImageConfig },
      source: 'ENV_DEFAULT' as const,
    };
  }

  let parsed: CountryImageApiConfig = { ...defaultCountryImageConfig };
  try {
    parsed = parseCountryImageConfig(JSON.parse(String(row.value || '{}')));
  } catch {
    parsed = { ...defaultCountryImageConfig };
  }
  return {
    rowId: String(row.id),
    config: parsed,
    source: 'DATABASE' as const,
  };
};

const saveCountryImageApiConfig = async (config: CountryImageApiConfig) => {
  const normalized = parseCountryImageConfig(config);
  const existing = await readCountryImageApiConfig();
  const payload = JSON.stringify(normalized);

  if (existing.rowId) {
    await prisma.$executeRawUnsafe(
      `UPDATE "HomepageSectionSetting"
       SET "value" = $1, "updatedAt" = NOW()
       WHERE "id" = $2`,
      payload,
      existing.rowId
    );
    return normalized;
  }

  await prisma.$executeRawUnsafe(
    `INSERT INTO "HomepageSectionSetting" ("id", "key", "value", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, NOW(), NOW())`,
    randomUUID(),
    COUNTRY_IMAGE_SETTINGS_KEY,
    payload
  );
  return normalized;
};

const getCountryImageApiConfigForAdmin = async () => {
  const { config, source } = await readCountryImageApiConfig();
  return {
    provider: config.provider,
    endpoint: config.endpoint || OPENAI_COUNTRY_IMAGE_ENDPOINT,
    model: config.model || OPENAI_COUNTRY_IMAGE_MODEL,
    imageSize: config.imageSize || OPENAI_COUNTRY_IMAGE_SIZE,
    hasApiKey: Boolean(getNonEmptyString(config.apiKey)),
    maskedApiKey: maskApiKey(config.apiKey),
    source,
  };
};

const hashString = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const composeCountryImagePrompt = ({
  countryName,
  countryCode,
  keywords,
}: {
  countryName: string;
  countryCode: string;
  keywords?: string;
}) => {
  const keywordList = sanitizeKeywords(keywords)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const promptParts = [
    'High-quality editorial image of African fashion',
    `Country focus: ${countryName} (${countryCode})`,
    keywordList.length > 0 ? `Style keywords: ${keywordList.join(', ')}` : 'Style keywords: modern, cultural, handcrafted textiles',
    'Fashion photography, vibrant textiles, no text, no watermark',
  ];
  return promptParts.join('. ');
};

const buildPollinationsCountryImageUrl = ({
  countryName,
  countryCode,
  keywords,
}: {
  countryName: string;
  countryCode: string;
  keywords?: string;
}) => {
  const prompt = composeCountryImagePrompt({ countryName, countryCode, keywords });
  const keywordList = sanitizeKeywords(keywords)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const sig = hashString(`${countryCode}|${countryName}|${keywordList.join('|')}`) % 1000;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1200&height=675&seed=${sig}&nologo=true&model=flux`;
};

const parseOpenAiGeneratedImage = (payload: any): string | null => {
  const row = Array.isArray(payload?.data) ? payload.data[0] : null;
  if (!row) return null;
  if (typeof row.url === 'string' && row.url.trim()) return row.url.trim();
  if (typeof row.b64_json === 'string' && row.b64_json.trim()) {
    return `data:image/png;base64,${row.b64_json.trim()}`;
  }
  return null;
};

const generateCountryImage = async ({
  countryName,
  countryCode,
  keywords,
  configOverride,
  allowFallback = true,
}: {
  countryName: string;
  countryCode: string;
  keywords?: string;
  configOverride?: CountryImageApiConfig;
  allowFallback?: boolean;
}): Promise<CountryImageGenerationResult> => {
  const prompt = composeCountryImagePrompt({ countryName, countryCode, keywords });
  const { config: storedConfig } = await readCountryImageApiConfig();
  const config = configOverride ? parseCountryImageConfig(configOverride) : storedConfig;
  const hasApiKey = Boolean(getNonEmptyString(config.apiKey));
  const prefersApiProvider = config.provider !== 'POLLINATIONS';
  const shouldTryApiProvider = prefersApiProvider && hasApiKey;
  let providerFailureReason = '';

  if (prefersApiProvider && !hasApiKey) {
    providerFailureReason = 'API key is required for the selected provider.';
    if (!allowFallback) {
      throw new Error(providerFailureReason);
    }
  }

  if (shouldTryApiProvider) {
    try {
      const response = await fetch(config.endpoint || OPENAI_COUNTRY_IMAGE_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.model || OPENAI_COUNTRY_IMAGE_MODEL,
          prompt,
          size: config.imageSize || OPENAI_COUNTRY_IMAGE_SIZE,
          quality: 'high',
        }),
      });

      if (response.ok) {
        const payload = await response.json();
        const url = parseOpenAiGeneratedImage(payload);
        if (url) {
          return {
            url,
            provider: config.provider,
            prompt,
            fallbackUsed: false,
          };
        }
        providerFailureReason = 'Provider responded without an image URL.';
      } else {
        const errorText = await response.text();
        providerFailureReason = `Provider request failed (${response.status}). ${errorText || ''}`.trim();
        console.error('Country image provider request failed:', response.status, errorText);
      }
    } catch (error) {
      providerFailureReason = error instanceof Error ? error.message : 'Provider request error.';
      console.error('Country image provider request error:', error);
    }
  }

  if (!allowFallback && prefersApiProvider) {
    throw new Error(providerFailureReason || 'Provider connection test failed.');
  }

  return {
    url: buildPollinationsCountryImageUrl({ countryName, countryCode, keywords }),
    provider: 'POLLINATIONS' as const,
    prompt,
    fallbackUsed: prefersApiProvider,
  };
};

const resolveAfricanCountryOption = (payload: { countryCode?: unknown; name?: unknown }) => {
  const code = normalizeCountryCode(payload.countryCode);
  if (code) {
    return AFRICAN_COUNTRY_BY_CODE.get(code);
  }

  const name = getNonEmptyString(payload.name)?.toLowerCase();
  if (name) {
    return AFRICAN_COUNTRY_BY_NAME.get(name);
  }
  return undefined;
};

const validationError = (res: any, error: z.ZodError) =>
  res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors: error.issues,
  });

const countryInputSchema = z.object({
  countryCode: z.string().trim().length(2).optional(),
  name: z.string().min(1).optional(),
  flag: z.string().min(1).optional(),
  fabrics: z.string().min(1),
  image: z.string().min(1).optional(),
  keywords: z.string().optional(),
  generateImage: z.boolean().optional(),
  displayOrder: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

const countryCreateSchema = countryInputSchema
  .superRefine((data, ctx) => {
    if (!getNonEmptyString(data.name) && !normalizeCountryCode(data.countryCode)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['countryCode'],
        message: 'Select a valid African country.',
      });
    }
  });
const countryUpdateSchema = countryInputSchema.partial();
const countryImageGenerateSchema = z
  .object({
    countryCode: z.string().trim().length(2).optional(),
    name: z.string().min(1).optional(),
    keywords: z.string().min(1),
  })
  .superRefine((data, ctx) => {
    if (!getNonEmptyString(data.name) && !normalizeCountryCode(data.countryCode)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['countryCode'],
        message: 'Select a valid African country.',
      });
    }
  });
const countryImageApiConfigUpdateSchema = z.object({
  provider: z.enum(['OPENAI', 'OPENAI_COMPATIBLE', 'POLLINATIONS']),
  endpoint: z.string().url().optional(),
  model: z.string().min(1).optional(),
  imageSize: z.string().min(3).optional(),
  apiKey: z.string().optional(),
  clearApiKey: z.boolean().optional(),
});
const countryImageApiConfigTestSchema = countryImageApiConfigUpdateSchema.extend({
  useStoredApiKey: z.boolean().optional(),
  countryCode: z.string().trim().length(2).optional(),
  name: z.string().min(1).optional(),
  keywords: z.string().optional(),
});

const howItWorksCreateSchema = z.object({
  stepNumber: z.coerce.number().int().positive(),
  title: z.string().min(1),
  subtitle: z.string().min(1),
  icon: z.string().min(1),
  displayOrder: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});
const howItWorksUpdateSchema = howItWorksCreateSchema.partial();

const shopCategoryCreateSchema = z.object({
  key: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  image: z.string().min(1),
  ctaText: z.string().min(1),
  ctaLink: z.string().min(1),
  displayOrder: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});
const shopCategoryUpdateSchema = shopCategoryCreateSchema.partial();

const designerSpotlightCreateSchema = z.object({
  designerId: z.string().uuid(),
  quote: z.string().min(1),
  bio: z.string().min(1),
  image: z.string().min(1),
  displayOrder: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});
const designerSpotlightUpdateSchema = designerSpotlightCreateSchema.partial();

const heritageCreateSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().min(1),
  image: z.string().min(1),
  ctaText: z.string().optional(),
  ctaLink: z.string().optional(),
  displayOrder: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});
const heritageUpdateSchema = heritageCreateSchema.partial();

const testimonialCreateSchema = z.object({
  name: z.string().min(1),
  initials: z.string().min(1),
  location: z.string().min(1),
  quote: z.string().min(1),
  avatar: z.string().optional(),
  displayOrder: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});
const testimonialUpdateSchema = testimonialCreateSchema.partial();

const footerCreateSchema = z.object({
  companyName: z.string().optional(),
  tagline: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  socialLinks: z.string().optional(),
  copyright: z.string().optional(),
});
const footerUpdateSchema = footerCreateSchema;

const normalizeHowItWorksInput = (payload: any) => ({
  ...payload,
  subtitle:
    getNonEmptyString(payload.subtitle) ??
    getNonEmptyString(payload.description) ??
    payload.subtitle ??
    payload.description,
});

const normalizeCategoryInput = (payload: any) => ({
  ...payload,
  key:
    getNonEmptyString(payload.key) ||
    (getNonEmptyString(payload.title) ? slugify(payload.title) : undefined),
  description:
    getNonEmptyString(payload.description) ??
    getNonEmptyString(payload.subtitle) ??
    'Explore this collection',
  ctaText: getNonEmptyString(payload.ctaText) ?? 'Shop Now',
  ctaLink:
    getNonEmptyString(payload.ctaLink) ??
    getNonEmptyString(payload.link) ??
    '/designs',
});

const normalizeDesignerSpotlightInput = (payload: any) => ({
  ...payload,
  quote:
    getNonEmptyString(payload.quote) ??
    getNonEmptyString(payload.headline) ??
    'Featured designer',
  bio:
    getNonEmptyString(payload.bio) ??
    getNonEmptyString(payload.description) ??
    getNonEmptyString(payload.quote) ??
    getNonEmptyString(payload.headline) ??
    'Design story coming soon.',
});

const normalizeHeritageInput = (payload: any) => ({
  ...payload,
  subtitle:
    getNonEmptyString(payload.subtitle) ??
    getNonEmptyString(payload.description) ??
    getNonEmptyString(payload.title) ??
    'Our culture, our craft, our story.',
});

const normalizeTestimonialInput = (payload: any) => ({
  ...payload,
  initials:
    getNonEmptyString(payload.initials) ||
    (getNonEmptyString(payload.name) ? deriveInitials(payload.name) : undefined),
  location: getNonEmptyString(payload.location) ?? 'Unknown',
  quote:
    getNonEmptyString(payload.quote) ??
    getNonEmptyString(payload.text) ??
    'Great experience.',
});

const normalizeFooterInput = (payload: any) => ({
  companyName: payload.companyName ?? payload.title,
  tagline: payload.tagline ?? payload.column,
  email: payload.email,
  phone: payload.phone,
  address: payload.address,
  socialLinks:
    typeof payload.socialLinks === 'string'
      ? payload.socialLinks
      : Array.isArray(payload.links)
        ? JSON.stringify(payload.links)
        : undefined,
  copyright: payload.copyright,
});

const serializeHowItWorksStep = (step: any) => ({
  ...step,
  description: step.subtitle,
});

const serializeShopCategory = (category: any) => ({
  ...category,
  subtitle: category.description,
  link: category.ctaLink,
});

const serializeDesignerSpotlight = (spotlight: any) => ({
  ...spotlight,
  headline: spotlight.quote,
  description: spotlight.bio,
});

const serializeHeritage = (heritage: any) => ({
  ...heritage,
  description: heritage.subtitle,
  stats: [],
});

const serializeTestimonial = (testimonial: any) => ({
  ...testimonial,
  text: testimonial.quote,
  rating: 5,
});

const serializeFooter = (footer: any) => ({
  ...footer,
  column: footer?.tagline || 'company',
  title: footer?.companyName || '',
  links: parseSocialLinks(footer?.socialLinks),
});

const getSpotlightsWithDesigners = async (isActiveOnly = true) => {
  const spotlights = await prisma.designerSpotlight.findMany({
    where: isActiveOnly ? { isActive: true } : undefined,
    orderBy: { displayOrder: 'asc' },
  });

  if (spotlights.length === 0) {
    return [];
  }

  const designerIds = spotlights.map((spotlight) => spotlight.designerId);
  const designers = await prisma.designerProfile.findMany({
    where: { id: { in: designerIds } },
    select: {
      id: true,
      businessName: true,
      country: true,
      bio: true,
    },
  });
  const designersById = new Map(designers.map((designer) => [designer.id, designer]));

  return spotlights.map((spotlight) => ({
    ...serializeDesignerSpotlight(spotlight),
    designer: designersById.get(spotlight.designerId) || null,
  }));
};

const buildNormalizedCountryPayload = async (payload: any, fallback?: any) => {
  const option = resolveAfricanCountryOption(payload) || resolveAfricanCountryOption(fallback || {});
  if (!option) {
    throw new Error('INVALID_COUNTRY_OPTION');
  }

  const fabrics = getNonEmptyString(payload?.fabrics) ?? getNonEmptyString(fallback?.fabrics);
  if (!fabrics) {
    throw new Error('MISSING_FABRICS');
  }

  const keywords = sanitizeKeywords(
    payload?.keywords !== undefined ? payload?.keywords : (fallback?.keywords ?? '')
  );
  const generateImage = payload?.generateImage === true;
  const explicitImage = getNonEmptyString(payload?.image);

  let generatedUrl: string | undefined;
  if (generateImage && !explicitImage) {
    const generated = await generateCountryImage({
      countryName: option.name,
      countryCode: option.code,
      keywords,
    });
    generatedUrl = generated.url;
  }

  const image = explicitImage || generatedUrl || getNonEmptyString(fallback?.image) || buildPollinationsCountryImageUrl({
    countryName: option.name,
    countryCode: option.code,
    keywords,
  });

  return {
    name: option.name,
    countryCode: option.code,
    flag: countryCodeToFlag(option.code),
    fabrics,
    image,
    keywords,
    displayOrder:
      payload?.displayOrder !== undefined
        ? Number(payload.displayOrder)
        : Number(fallback?.displayOrder ?? 0),
    isActive:
      payload?.isActive !== undefined ? Boolean(payload.isActive) : Boolean(fallback?.isActive ?? true),
  };
};

// ==================== PUBLIC ENDPOINTS ====================

// Get all active countries for marquee
router.get('/countries', async (req, res) => {
  try {
    const countries = await prisma.countryMarquee.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });

    res.json({
      success: true,
      data: countries,
    });
  } catch (error) {
    console.error('Error fetching countries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch countries',
    });
  }
});

// Get all How It Works steps
router.get('/how-it-works', async (req, res) => {
  try {
    const steps = await prisma.howItWorksStep.findMany({
      where: { isActive: true },
      orderBy: { stepNumber: 'asc' },
    });

    res.json({
      success: true,
      data: steps.map(serializeHowItWorksStep),
    });
  } catch (error) {
    console.error('Error fetching how it works steps:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch how it works steps',
    });
  }
});

// Get all shop categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.shopCategory.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });

    res.json({
      success: true,
      data: categories.map(serializeShopCategory),
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
    });
  }
});

// Get active designer spotlight
router.get('/designer-spotlight', async (req, res) => {
  try {
    const spotlights = await getSpotlightsWithDesigners(true);
    const spotlight = spotlights[0] || null;

    if (!spotlight) {
      return res.json({
        success: true,
        data: null,
      });
    }

    res.json({
      success: true,
      data: spotlight,
    });
  } catch (error) {
    console.error('Error fetching designer spotlight:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch designer spotlight',
    });
  }
});

// Get all active designer spotlights (for rotating sections)
router.get('/designer-spotlights', async (req, res) => {
  try {
    const spotlights = await getSpotlightsWithDesigners(true);
    res.json({
      success: true,
      data: spotlights,
    });
  } catch (error) {
    console.error('Error fetching designer spotlights:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch designer spotlights',
    });
  }
});

// Get heritage section
router.get('/heritage', async (req, res) => {
  try {
    const heritage = await prisma.heritageSection.findFirst({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });

    res.json({
      success: true,
      data: heritage ? serializeHeritage(heritage) : null,
    });
  } catch (error) {
    console.error('Error fetching heritage section:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch heritage section',
    });
  }
});

// Get all testimonials
router.get('/testimonials', async (req, res) => {
  try {
    const testimonials = await prisma.testimonial.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });

    res.json({
      success: true,
      data: testimonials.map(serializeTestimonial),
    });
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch testimonials',
    });
  }
});

// Get footer content
router.get('/footer', async (req, res) => {
  try {
    const footer = await prisma.footerContent.findFirst();

    res.json({
      success: true,
      data: footer ? serializeFooter(footer) : null,
    });
  } catch (error) {
    console.error('Error fetching footer content:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch footer content',
    });
  }
});

// ==================== ADMIN ENDPOINTS ====================

// Get all homepage content in one response (admin dashboard orchestration)
router.get('/admin/frontpage', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    const [
      heroSlides,
      featuredProducts,
      countries,
      howItWorks,
      categories,
      spotlights,
      heritage,
      testimonials,
      footer,
      banners,
    ] = await Promise.all([
      prisma.heroSlide.findMany({ orderBy: { displayOrder: 'asc' } }),
      prisma.featuredProduct.findMany({ orderBy: [{ section: 'asc' }, { displayOrder: 'asc' }] }),
      prisma.countryMarquee.findMany({ orderBy: { displayOrder: 'asc' } }),
      prisma.howItWorksStep.findMany({ orderBy: { stepNumber: 'asc' } }),
      prisma.shopCategory.findMany({ orderBy: { displayOrder: 'asc' } }),
      getSpotlightsWithDesigners(false),
      prisma.heritageSection.findMany({ orderBy: { displayOrder: 'asc' } }),
      prisma.testimonial.findMany({ orderBy: { displayOrder: 'asc' } }),
      prisma.footerContent.findFirst(),
      prisma.banner.findMany({ orderBy: [{ section: 'asc' }, { displayOrder: 'asc' }] }),
    ]);

    res.json({
      success: true,
      data: {
        heroSlides,
        featuredProducts,
        countries,
        howItWorks: howItWorks.map(serializeHowItWorksStep),
        categories: categories.map(serializeShopCategory),
        designerSpotlights: spotlights,
        heritage: heritage.map(serializeHeritage),
        testimonials: testimonials.map(serializeTestimonial),
        footer: footer ? serializeFooter(footer) : null,
        banners,
      },
    });
  } catch (error) {
    console.error('Error fetching frontpage admin data:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch frontpage data' });
  }
});

router.get('/admin/designers', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    const designers = await prisma.designerProfile.findMany({
      select: {
        id: true,
        businessName: true,
        country: true,
        isVerified: true,
      },
      orderBy: { businessName: 'asc' },
    });
    res.json({ success: true, data: designers });
  } catch (error) {
    console.error('Error fetching designers for spotlight:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch designers' });
  }
});

router.get('/admin/country-options', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (_req, res) => {
  res.json({ success: true, data: AFRICAN_COUNTRY_OPTIONS });
});

router.get('/admin/countries/image-api-config', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (_req, res) => {
  try {
    const data = await getCountryImageApiConfigForAdmin();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching country image API config:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch country image API config' });
  }
});

router.put('/admin/countries/image-api-config', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    const payload = countryImageApiConfigUpdateSchema.parse(req.body);
    const existing = await readCountryImageApiConfig();
    const next: CountryImageApiConfig = {
      provider: payload.provider,
      endpoint:
        getNonEmptyString(payload.endpoint) ||
        existing.config.endpoint ||
        OPENAI_COUNTRY_IMAGE_ENDPOINT,
      model:
        getNonEmptyString(payload.model) ||
        existing.config.model ||
        OPENAI_COUNTRY_IMAGE_MODEL,
      imageSize:
        getNonEmptyString(payload.imageSize) ||
        existing.config.imageSize ||
        OPENAI_COUNTRY_IMAGE_SIZE,
      apiKey: payload.clearApiKey
        ? undefined
        : payload.apiKey !== undefined
          ? getNonEmptyString(payload.apiKey)
          : existing.config.apiKey,
    };

    const saved = await saveCountryImageApiConfig(next);
    const data = await getCountryImageApiConfigForAdmin();

    res.json({
      success: true,
      data,
      ...(saved.provider !== 'POLLINATIONS' && !saved.apiKey
        ? {
            warning: 'MISSING_API_KEY',
            message:
              'Configuration saved, but API key is empty. Generation will fallback to Pollinations until a key is added.',
          }
        : {}),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError(res, error);
    }
    console.error('Error updating country image API config:', error);
    res.status(500).json({ success: false, message: 'Failed to update country image API config' });
  }
});

router.post('/admin/countries/image-api-config/test', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    const payload = countryImageApiConfigTestSchema.parse(req.body);
    const existing = await readCountryImageApiConfig();
    const next: CountryImageApiConfig = {
      provider: payload.provider,
      endpoint:
        getNonEmptyString(payload.endpoint) ||
        existing.config.endpoint ||
        OPENAI_COUNTRY_IMAGE_ENDPOINT,
      model:
        getNonEmptyString(payload.model) ||
        existing.config.model ||
        OPENAI_COUNTRY_IMAGE_MODEL,
      imageSize:
        getNonEmptyString(payload.imageSize) ||
        existing.config.imageSize ||
        OPENAI_COUNTRY_IMAGE_SIZE,
      apiKey: payload.clearApiKey
        ? undefined
        : payload.apiKey !== undefined
          ? getNonEmptyString(payload.apiKey)
          : payload.useStoredApiKey === false
            ? undefined
            : existing.config.apiKey,
    };

    const option =
      resolveAfricanCountryOption(payload) ||
      AFRICAN_COUNTRY_BY_CODE.get('NG') || {
        code: 'NG',
        name: 'Nigeria',
        flag: '🇳🇬',
      };

    const generated = await generateCountryImage({
      countryName: option.name,
      countryCode: option.code,
      keywords: payload.keywords || 'editorial, modern, handcrafted textiles',
      configOverride: next,
      allowFallback: false,
    });

    res.json({
      success: true,
      message: 'Connection test succeeded.',
      data: {
        ...generated,
        country: option,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError(res, error);
    }
    const message = error instanceof Error ? error.message : 'Connection test failed.';
    res.status(400).json({
      success: false,
      message: message || 'Connection test failed.',
    });
  }
});

router.post('/admin/countries/generate-image', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    const payload = countryImageGenerateSchema.parse(req.body);
    const option = resolveAfricanCountryOption(payload);
    if (!option) {
      return res.status(400).json({ success: false, message: 'Select a valid African country code.' });
    }

    const generated = await generateCountryImage({
      countryName: option.name,
      countryCode: option.code,
      keywords: payload.keywords,
    });

    res.json({
      success: true,
      data: {
        url: generated.url,
        provider: generated.provider,
        prompt: generated.prompt,
        fallbackUsed: generated.fallbackUsed,
        country: option,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError(res, error);
    }
    console.error('Error generating country image:', error);
    res.status(500).json({ success: false, message: 'Failed to generate country image' });
  }
});

// Country Marquee Admin
router.get('/admin/countries', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    const countries = await prisma.countryMarquee.findMany({
      orderBy: { displayOrder: 'asc' },
    });
    res.json({ success: true, data: countries });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch countries' });
  }
});

router.post('/admin/countries', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    const parsed = countryCreateSchema.parse(req.body);
    const data = await buildNormalizedCountryPayload(parsed);
    const country = await prisma.countryMarquee.create({ data });
    res.status(201).json({ success: true, data: country });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError(res, error);
    }
    if (String((error as any)?.message) === 'INVALID_COUNTRY_OPTION') {
      return res.status(400).json({ success: false, message: 'Select a valid African country code.' });
    }
    if (String((error as any)?.message) === 'MISSING_FABRICS') {
      return res.status(400).json({ success: false, message: 'Fabrics field is required.' });
    }
    console.error('Error creating country:', error);
    res.status(500).json({ success: false, message: 'Failed to create country' });
  }
});

router.put('/admin/countries/:id', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    const existing = await prisma.countryMarquee.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Country not found' });
    }
    const parsed = countryUpdateSchema.parse(req.body);
    const data = await buildNormalizedCountryPayload(parsed, existing);
    const country = await prisma.countryMarquee.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ success: true, data: country });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError(res, error);
    }
    if (String((error as any)?.message) === 'INVALID_COUNTRY_OPTION') {
      return res.status(400).json({ success: false, message: 'Select a valid African country code.' });
    }
    if (String((error as any)?.message) === 'MISSING_FABRICS') {
      return res.status(400).json({ success: false, message: 'Fabrics field is required.' });
    }
    console.error('Error updating country:', error);
    res.status(500).json({ success: false, message: 'Failed to update country' });
  }
});
router.patch('/admin/countries/:id', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    const existing = await prisma.countryMarquee.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Country not found' });
    }
    const parsed = countryUpdateSchema.parse(req.body);
    const data = await buildNormalizedCountryPayload(parsed, existing);
    const country = await prisma.countryMarquee.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ success: true, data: country });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError(res, error);
    }
    if (String((error as any)?.message) === 'INVALID_COUNTRY_OPTION') {
      return res.status(400).json({ success: false, message: 'Select a valid African country code.' });
    }
    if (String((error as any)?.message) === 'MISSING_FABRICS') {
      return res.status(400).json({ success: false, message: 'Fabrics field is required.' });
    }
    console.error('Error patching country:', error);
    res.status(500).json({ success: false, message: 'Failed to update country' });
  }
});

router.delete('/admin/countries/:id', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    await prisma.countryMarquee.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Country deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete country' });
  }
});

// How It Works Steps Admin
router.get('/admin/how-it-works', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    const steps = await prisma.howItWorksStep.findMany({
      orderBy: { stepNumber: 'asc' },
    });
    res.json({ success: true, data: steps.map(serializeHowItWorksStep) });
  } catch (error) {
    console.error('Error fetching how-it-works:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch steps' });
  }
});

router.post('/admin/how-it-works', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    const data = howItWorksCreateSchema.parse(normalizeHowItWorksInput(req.body));
    const step = await prisma.howItWorksStep.create({ data });
    res.status(201).json({ success: true, data: serializeHowItWorksStep(step) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError(res, error);
    }
    console.error('Error creating how-it-works step:', error);
    res.status(500).json({ success: false, message: 'Failed to create step' });
  }
});

router.put('/admin/how-it-works/:id', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    const data = howItWorksUpdateSchema.parse(normalizeHowItWorksInput(req.body));
    const step = await prisma.howItWorksStep.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ success: true, data: serializeHowItWorksStep(step) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError(res, error);
    }
    console.error('Error updating how-it-works step:', error);
    res.status(500).json({ success: false, message: 'Failed to update step' });
  }
});
router.patch('/admin/how-it-works/:id', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    const data = howItWorksUpdateSchema.parse(normalizeHowItWorksInput(req.body));
    const step = await prisma.howItWorksStep.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ success: true, data: serializeHowItWorksStep(step) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError(res, error);
    }
    console.error('Error patching how-it-works step:', error);
    res.status(500).json({ success: false, message: 'Failed to update step' });
  }
});

router.delete('/admin/how-it-works/:id', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    await prisma.howItWorksStep.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Step deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete step' });
  }
});

// Shop Categories Admin
router.get('/admin/categories', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    const categories = await prisma.shopCategory.findMany({
      orderBy: { displayOrder: 'asc' },
    });
    res.json({ success: true, data: categories.map(serializeShopCategory) });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
});

router.post('/admin/categories', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    const data = shopCategoryCreateSchema.parse(normalizeCategoryInput(req.body));
    const category = await prisma.shopCategory.create({ data });
    res.status(201).json({ success: true, data: serializeShopCategory(category) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError(res, error);
    }
    console.error('Error creating category:', error);
    res.status(500).json({ success: false, message: 'Failed to create category' });
  }
});

router.put('/admin/categories/:id', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    const data = shopCategoryUpdateSchema.parse(normalizeCategoryInput(req.body));
    const category = await prisma.shopCategory.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ success: true, data: serializeShopCategory(category) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError(res, error);
    }
    console.error('Error updating category:', error);
    res.status(500).json({ success: false, message: 'Failed to update category' });
  }
});
router.patch('/admin/categories/:id', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    const data = shopCategoryUpdateSchema.parse(normalizeCategoryInput(req.body));
    const category = await prisma.shopCategory.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ success: true, data: serializeShopCategory(category) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError(res, error);
    }
    console.error('Error patching category:', error);
    res.status(500).json({ success: false, message: 'Failed to update category' });
  }
});

router.delete('/admin/categories/:id', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    await prisma.shopCategory.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete category' });
  }
});

// Designer Spotlight Admin
router.get('/admin/designer-spotlight', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    const data = await getSpotlightsWithDesigners(false);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching designer spotlights:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch spotlights' });
  }
});

router.post('/admin/designer-spotlight', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    const data = designerSpotlightCreateSchema.parse(normalizeDesignerSpotlightInput(req.body));
    const spotlight = await prisma.designerSpotlight.create({ data });
    const withDesigner = (await getSpotlightsWithDesigners(false)).find((entry) => entry.id === spotlight.id);
    res.status(201).json({ success: true, data: withDesigner || serializeDesignerSpotlight(spotlight) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError(res, error);
    }
    console.error('Error creating designer spotlight:', error);
    res.status(500).json({ success: false, message: 'Failed to create spotlight' });
  }
});

router.put('/admin/designer-spotlight/:id', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    const data = designerSpotlightUpdateSchema.parse(normalizeDesignerSpotlightInput(req.body));
    const spotlight = await prisma.designerSpotlight.update({
      where: { id: req.params.id },
      data,
    });
    const withDesigner = (await getSpotlightsWithDesigners(false)).find((entry) => entry.id === spotlight.id);
    res.json({ success: true, data: withDesigner || serializeDesignerSpotlight(spotlight) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError(res, error);
    }
    console.error('Error updating designer spotlight:', error);
    res.status(500).json({ success: false, message: 'Failed to update spotlight' });
  }
});
router.patch('/admin/designer-spotlight/:id', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    const data = designerSpotlightUpdateSchema.parse(normalizeDesignerSpotlightInput(req.body));
    const spotlight = await prisma.designerSpotlight.update({
      where: { id: req.params.id },
      data,
    });
    const withDesigner = (await getSpotlightsWithDesigners(false)).find((entry) => entry.id === spotlight.id);
    res.json({ success: true, data: withDesigner || serializeDesignerSpotlight(spotlight) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError(res, error);
    }
    console.error('Error patching designer spotlight:', error);
    res.status(500).json({ success: false, message: 'Failed to update spotlight' });
  }
});

router.delete('/admin/designer-spotlight/:id', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    await prisma.designerSpotlight.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Spotlight deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete spotlight' });
  }
});

// Heritage Section Admin
router.get('/admin/heritage', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    const heritage = await prisma.heritageSection.findMany({
      orderBy: { displayOrder: 'asc' },
    });
    res.json({ success: true, data: heritage.map(serializeHeritage) });
  } catch (error) {
    console.error('Error fetching heritage:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch heritage' });
  }
});

router.post('/admin/heritage', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    const data = heritageCreateSchema.parse(normalizeHeritageInput(req.body));
    const heritage = await prisma.heritageSection.create({ data });
    res.status(201).json({ success: true, data: serializeHeritage(heritage) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError(res, error);
    }
    console.error('Error creating heritage:', error);
    res.status(500).json({ success: false, message: 'Failed to create heritage' });
  }
});

router.put('/admin/heritage/:id', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    const data = heritageUpdateSchema.parse(normalizeHeritageInput(req.body));
    const heritage = await prisma.heritageSection.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ success: true, data: serializeHeritage(heritage) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError(res, error);
    }
    console.error('Error updating heritage:', error);
    res.status(500).json({ success: false, message: 'Failed to update heritage' });
  }
});
router.patch('/admin/heritage/:id', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    const data = heritageUpdateSchema.parse(normalizeHeritageInput(req.body));
    const heritage = await prisma.heritageSection.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ success: true, data: serializeHeritage(heritage) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError(res, error);
    }
    console.error('Error patching heritage:', error);
    res.status(500).json({ success: false, message: 'Failed to update heritage' });
  }
});

router.delete('/admin/heritage/:id', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    await prisma.heritageSection.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Heritage deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete heritage' });
  }
});

// Testimonials Admin
router.get('/admin/testimonials', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    const testimonials = await prisma.testimonial.findMany({
      orderBy: { displayOrder: 'asc' },
    });
    res.json({ success: true, data: testimonials.map(serializeTestimonial) });
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch testimonials' });
  }
});

router.post('/admin/testimonials', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    const data = testimonialCreateSchema.parse(normalizeTestimonialInput(req.body));
    const testimonial = await prisma.testimonial.create({ data });
    res.status(201).json({ success: true, data: serializeTestimonial(testimonial) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError(res, error);
    }
    console.error('Error creating testimonial:', error);
    res.status(500).json({ success: false, message: 'Failed to create testimonial' });
  }
});

router.put('/admin/testimonials/:id', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    const data = testimonialUpdateSchema.parse(normalizeTestimonialInput(req.body));
    const testimonial = await prisma.testimonial.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ success: true, data: serializeTestimonial(testimonial) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError(res, error);
    }
    console.error('Error updating testimonial:', error);
    res.status(500).json({ success: false, message: 'Failed to update testimonial' });
  }
});
router.patch('/admin/testimonials/:id', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    const data = testimonialUpdateSchema.parse(normalizeTestimonialInput(req.body));
    const testimonial = await prisma.testimonial.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ success: true, data: serializeTestimonial(testimonial) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError(res, error);
    }
    console.error('Error patching testimonial:', error);
    res.status(500).json({ success: false, message: 'Failed to update testimonial' });
  }
});

router.delete('/admin/testimonials/:id', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    await prisma.testimonial.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Testimonial deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete testimonial' });
  }
});

// Footer Content Admin
router.get('/admin/footer', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    const footer = await prisma.footerContent.findFirst();
    res.json({ success: true, data: footer ? serializeFooter(footer) : null });
  } catch (error) {
    console.error('Error fetching footer:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch footer' });
  }
});

router.post('/admin/footer', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    const data = footerCreateSchema.parse(normalizeFooterInput(req.body));
    const existing = await prisma.footerContent.findFirst();
    const footer = existing
      ? await prisma.footerContent.update({ where: { id: existing.id }, data })
      : await prisma.footerContent.create({ data });
    res.status(existing ? 200 : 201).json({ success: true, data: serializeFooter(footer) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError(res, error);
    }
    console.error('Error creating footer:', error);
    res.status(500).json({ success: false, message: 'Failed to create footer' });
  }
});

router.put('/admin/footer/:id', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    const data = footerUpdateSchema.parse(normalizeFooterInput(req.body));
    const footer = await prisma.footerContent.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ success: true, data: serializeFooter(footer) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError(res, error);
    }
    console.error('Error updating footer:', error);
    res.status(500).json({ success: false, message: 'Failed to update footer' });
  }
});
router.patch('/admin/footer/:id', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    const data = footerUpdateSchema.parse(normalizeFooterInput(req.body));
    const footer = await prisma.footerContent.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ success: true, data: serializeFooter(footer) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError(res, error);
    }
    console.error('Error patching footer:', error);
    res.status(500).json({ success: false, message: 'Failed to update footer' });
  }
});

export default router;

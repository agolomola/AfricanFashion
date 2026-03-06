import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { authenticate, authorizePermissions } from '../middleware/auth';
import { Permissions } from '../rbac';
import { ensureHomepageSectionsSchema } from '../utils/frontpage-schema';

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

const validationError = (res: any, error: z.ZodError) =>
  res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors: error.issues,
  });

const countryCreateSchema = z.object({
  name: z.string().min(1),
  flag: z.string().min(1),
  fabrics: z.string().min(1),
  image: z.string().min(1),
  displayOrder: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});
const countryUpdateSchema = countryCreateSchema.partial();

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
    const data = countryCreateSchema.parse(req.body);
    const country = await prisma.countryMarquee.create({ data });
    res.status(201).json({ success: true, data: country });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError(res, error);
    }
    console.error('Error creating country:', error);
    res.status(500).json({ success: false, message: 'Failed to create country' });
  }
});

router.put('/admin/countries/:id', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    const data = countryUpdateSchema.parse(req.body);
    const country = await prisma.countryMarquee.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ success: true, data: country });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError(res, error);
    }
    console.error('Error updating country:', error);
    res.status(500).json({ success: false, message: 'Failed to update country' });
  }
});
router.patch('/admin/countries/:id', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    const data = countryUpdateSchema.parse(req.body);
    const country = await prisma.countryMarquee.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ success: true, data: country });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError(res, error);
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

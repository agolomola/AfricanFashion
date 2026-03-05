import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { authenticate, authorizePermissions } from '../middleware/auth';
import { Permissions } from '../rbac';

const router = Router();

const countryCreateSchema = z.object({
  name: z.string().min(1),
  flag: z.string().min(1),
  fabrics: z.string().min(1),
  image: z.string().min(1),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});
const countryUpdateSchema = countryCreateSchema.partial();

const howItWorksCreateSchema = z.object({
  stepNumber: z.number().int().positive(),
  title: z.string().min(1),
  subtitle: z.string().min(1),
  icon: z.string().min(1),
  displayOrder: z.number().int().min(0).optional(),
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
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});
const shopCategoryUpdateSchema = shopCategoryCreateSchema.partial();

const designerSpotlightCreateSchema = z.object({
  designerId: z.string().uuid(),
  quote: z.string().min(1),
  bio: z.string().min(1),
  image: z.string().min(1),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});
const designerSpotlightUpdateSchema = designerSpotlightCreateSchema.partial();

const heritageCreateSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().min(1),
  image: z.string().min(1),
  ctaText: z.string().optional(),
  ctaLink: z.string().optional(),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});
const heritageUpdateSchema = heritageCreateSchema.partial();

const testimonialCreateSchema = z.object({
  name: z.string().min(1),
  initials: z.string().min(1),
  location: z.string().min(1),
  quote: z.string().min(1),
  avatar: z.string().optional(),
  displayOrder: z.number().int().min(0).optional(),
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
      data: steps,
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
      data: categories,
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
    const spotlight = await prisma.designerSpotlight.findFirst({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });

    if (!spotlight) {
      return res.json({
        success: true,
        data: null,
      });
    }

    const designer = await prisma.designerProfile.findUnique({
      where: { id: spotlight.designerId },
      select: {
        id: true,
        businessName: true,
        country: true,
        bio: true,
      },
    });

    res.json({
      success: true,
      data: {
        ...spotlight,
        designer,
      },
    });
  } catch (error) {
    console.error('Error fetching designer spotlight:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch designer spotlight',
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
      data: heritage,
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
      data: testimonials,
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
      data: footer,
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
    res.json({ success: true, data: steps });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch steps' });
  }
});

router.post('/admin/how-it-works', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    const data = howItWorksCreateSchema.parse(req.body);
    const step = await prisma.howItWorksStep.create({ data });
    res.status(201).json({ success: true, data: step });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create step' });
  }
});

router.put('/admin/how-it-works/:id', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    const data = howItWorksUpdateSchema.parse(req.body);
    const step = await prisma.howItWorksStep.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ success: true, data: step });
  } catch (error) {
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
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
});

router.post('/admin/categories', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    const data = shopCategoryCreateSchema.parse(req.body);
    const category = await prisma.shopCategory.create({ data });
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create category' });
  }
});

router.put('/admin/categories/:id', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    const data = shopCategoryUpdateSchema.parse(req.body);
    const category = await prisma.shopCategory.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ success: true, data: category });
  } catch (error) {
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
    const spotlights = await prisma.designerSpotlight.findMany({
      orderBy: { displayOrder: 'asc' },
    });
    const designerIds = spotlights.map((spotlight) => spotlight.designerId);
    const designers = await prisma.designerProfile.findMany({
      where: { id: { in: designerIds } },
      select: {
        id: true,
        businessName: true,
        country: true,
      },
    });

    const designersById = new Map(designers.map((designer) => [designer.id, designer]));
    const data = spotlights.map((spotlight) => ({
      ...spotlight,
      designer: designersById.get(spotlight.designerId) || null,
    }));

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch spotlights' });
  }
});

router.post('/admin/designer-spotlight', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    const data = designerSpotlightCreateSchema.parse(req.body);
    const spotlight = await prisma.designerSpotlight.create({ data });
    res.status(201).json({ success: true, data: spotlight });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create spotlight' });
  }
});

router.put('/admin/designer-spotlight/:id', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    const data = designerSpotlightUpdateSchema.parse(req.body);
    const spotlight = await prisma.designerSpotlight.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ success: true, data: spotlight });
  } catch (error) {
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
    res.json({ success: true, data: heritage });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch heritage' });
  }
});

router.post('/admin/heritage', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    const data = heritageCreateSchema.parse(req.body);
    const heritage = await prisma.heritageSection.create({ data });
    res.status(201).json({ success: true, data: heritage });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create heritage' });
  }
});

router.put('/admin/heritage/:id', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    const data = heritageUpdateSchema.parse(req.body);
    const heritage = await prisma.heritageSection.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ success: true, data: heritage });
  } catch (error) {
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
    res.json({ success: true, data: testimonials });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch testimonials' });
  }
});

router.post('/admin/testimonials', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    const data = testimonialCreateSchema.parse(req.body);
    const testimonial = await prisma.testimonial.create({ data });
    res.status(201).json({ success: true, data: testimonial });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create testimonial' });
  }
});

router.put('/admin/testimonials/:id', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    const data = testimonialUpdateSchema.parse(req.body);
    const testimonial = await prisma.testimonial.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ success: true, data: testimonial });
  } catch (error) {
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
    res.json({ success: true, data: footer });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch footer' });
  }
});

router.post('/admin/footer', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    const data = footerCreateSchema.parse(req.body);
    const footer = await prisma.footerContent.create({ data });
    res.status(201).json({ success: true, data: footer });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create footer' });
  }
});

router.put('/admin/footer/:id', authenticate, authorizePermissions(Permissions.HOMEPAGE_MANAGE), async (req, res) => {
  try {
    const data = footerUpdateSchema.parse(req.body);
    const footer = await prisma.footerContent.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ success: true, data: footer });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update footer' });
  }
});

export default router;

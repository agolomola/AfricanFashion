import { Router } from 'express';
import { prisma } from '../db';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Get all banners (public - for frontend display)
router.get('/', async (req, res) => {
  try {
    const { section } = req.query;
    
    const banners = await prisma.banner.findMany({
      where: {
        isActive: true,
        ...(section ? { section: section as string } : {}),
      },
      orderBy: {
        displayOrder: 'asc',
      },
    });

    // For each banner, randomly select one image if multiple images exist
    const bannersWithRandomImage = banners.map(banner => ({
      ...banner,
      displayImage: banner.images.length > 0 
        ? banner.images[Math.floor(Math.random() * banner.images.length)]
        : null,
    }));

    res.json({
      success: true,
      data: bannersWithRandomImage,
    });
  } catch (error) {
    console.error('Error fetching banners:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch banners',
    });
  }
});

// Get all banners for admin (including inactive) - MUST be before /:id
router.get('/admin/all', authenticate, authorize('ADMINISTRATOR'), async (req, res) => {
  try {
    const banners = await prisma.banner.findMany({
      orderBy: {
        displayOrder: 'asc',
      },
    });

    res.json({
      success: true,
      data: banners,
    });
  } catch (error) {
    console.error('Error fetching all banners:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch banners',
    });
  }
});

// Create new banner (admin only)
router.post('/', authenticate, authorize('ADMINISTRATOR'), async (req, res) => {
  try {
    const { name, section, title, subtitle, ctaText, ctaLink, images, isActive, displayOrder } = req.body;

    // Validate required fields
    if (!name || !section) {
      return res.status(400).json({
        success: false,
        message: 'Name and section are required',
      });
    }

    // Validate images array
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one image is required',
      });
    }

    const banner = await prisma.banner.create({
      data: {
        name,
        section,
        title,
        subtitle,
        ctaText,
        ctaLink,
        images,
        isActive: isActive ?? true,
        displayOrder: displayOrder ?? 0,
      },
    });

    res.status(201).json({
      success: true,
      data: banner,
      message: 'Banner created successfully',
    });
  } catch (error) {
    console.error('Error creating banner:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create banner',
    });
  }
});

// Toggle banner active status (admin only) - MUST be before /:id
router.patch('/:id/toggle', authenticate, authorize('ADMINISTRATOR'), async (req, res) => {
  try {
    const { id } = req.params;

    const banner = await prisma.banner.findUnique({
      where: { id },
    });

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found',
      });
    }

    const updatedBanner = await prisma.banner.update({
      where: { id },
      data: {
        isActive: !banner.isActive,
      },
    });

    res.json({
      success: true,
      data: updatedBanner,
      message: `Banner ${updatedBanner.isActive ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (error) {
    console.error('Error toggling banner:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle banner status',
    });
  }
});

// Get banner sections (for dropdown) - MUST be before /:id
router.get('/meta/sections', async (req, res) => {
  try {
    const sections = [
      { value: 'BANNER_1', label: 'Banner 1 (After Featured Designs)' },
      { value: 'BANNER_2', label: 'Banner 2 (After Featured Ready To Wear)' },
      { value: 'HERO', label: 'Hero Banner' },
      { value: 'PROMO', label: 'Promotional Banner' },
    ];

    res.json({
      success: true,
      data: sections,
    });
  } catch (error) {
    console.error('Error fetching sections:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sections',
    });
  }
});

// Get banner by ID (admin only) - MUST be after static routes like /admin/all
router.get('/:id', authenticate, authorize('ADMINISTRATOR'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const banner = await prisma.banner.findUnique({
      where: { id },
    });

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found',
      });
    }

    res.json({
      success: true,
      data: banner,
    });
  } catch (error) {
    console.error('Error fetching banner:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch banner',
    });
  }
});

// Update banner (admin only)
router.put('/:id', authenticate, authorize('ADMINISTRATOR'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, section, title, subtitle, ctaText, ctaLink, images, isActive, displayOrder } = req.body;

    // Check if banner exists
    const existingBanner = await prisma.banner.findUnique({
      where: { id },
    });

    if (!existingBanner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found',
      });
    }

    const banner = await prisma.banner.update({
      where: { id },
      data: {
        name,
        section,
        title,
        subtitle,
        ctaText,
        ctaLink,
        images,
        isActive,
        displayOrder,
      },
    });

    res.json({
      success: true,
      data: banner,
      message: 'Banner updated successfully',
    });
  } catch (error) {
    console.error('Error updating banner:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update banner',
    });
  }
});

// Delete banner (admin only)
router.delete('/:id', authenticate, authorize('ADMINISTRATOR'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if banner exists
    const existingBanner = await prisma.banner.findUnique({
      where: { id },
    });

    if (!existingBanner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found',
      });
    }

    await prisma.banner.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Banner deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting banner:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete banner',
    });
  }
});

export default router;

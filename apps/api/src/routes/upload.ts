import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, authorizePermissions } from '../middleware/auth';
import { Permissions } from '../rbac';

const router = Router();
const allowedMimeTypes: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const extension = allowedMimeTypes[file.mimetype];
    const uniqueName = `${uuidv4()}${extension || path.extname(file.originalname) || '.bin'}`;
    cb(null, uniqueName);
  },
});

// File filter
const fileFilter = (req: any, file: any, cb: any) => {
  if (allowedMimeTypes[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WebP images are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
});

// Upload single image
router.post('/image', authenticate, authorizePermissions(Permissions.UPLOADS_CREATE), upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided.',
      });
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    res.json({
      success: true,
      message: 'Image uploaded successfully.',
      data: {
        url: imageUrl,
        filename: req.file.filename,
        size: req.file.size,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload image.',
    });
  }
});

// Upload multiple images
router.post('/images', authenticate, authorizePermissions(Permissions.UPLOADS_CREATE), upload.array('images', 10), (req, res) => {
  try {
    if (!req.files || (req.files as any[]).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image files provided.',
      });
    }

    const files = req.files as Express.Multer.File[];
    const uploadedImages = files.map((file) => ({
      url: `/uploads/${file.filename}`,
      filename: file.filename,
      size: file.size,
    }));

    res.json({
      success: true,
      message: `${files.length} image(s) uploaded successfully.`,
      data: uploadedImages,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload images.',
    });
  }
});

export default router;

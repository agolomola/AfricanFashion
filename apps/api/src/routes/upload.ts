import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, authorizePermissions } from '../middleware/auth';
import { Permissions } from '../rbac';

const router = Router();
const MAX_IMAGE_SIZE_MB = 10;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads');
const allowedMimeTypes: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/heic': '.heic',
  'image/heif': '.heif',
};

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
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
    cb(
      new Error(
        `Unsupported file type "${file.mimetype}". Allowed types: ${Object.keys(allowedMimeTypes).join(', ')}`
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_IMAGE_SIZE_BYTES,
  },
});

const runSingleUpload = (req: any, res: any): Promise<void> =>
  new Promise((resolve, reject) => {
    upload.fields([
      { name: 'image', maxCount: 1 },
      { name: 'file', maxCount: 1 },
      { name: 'photo', maxCount: 1 },
      { name: 'images', maxCount: 1 },
    ])(req, res, (err: any) => {
      if (err) return reject(err);
      resolve();
    });
  });

const runMultiUpload = (req: any, res: any): Promise<void> =>
  new Promise((resolve, reject) => {
    upload.array('images', 10)(req, res, (err: any) => {
      if (err) return reject(err);
      resolve();
    });
  });

function mapUploadError(error: any) {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return {
        status: 400,
        code: 'FILE_TOO_LARGE',
        message: `Image is too large. Max allowed size is ${MAX_IMAGE_SIZE_MB}MB.`,
      };
    }
    return {
      status: 400,
      code: error.code || 'UPLOAD_INVALID',
      message: error.message || 'Invalid upload payload.',
    };
  }
  if (error?.code === 'ENOENT' || error?.code === 'EACCES' || error?.code === 'EPERM') {
    return {
      status: 500,
      code: 'UPLOAD_STORAGE_UNAVAILABLE',
      message: 'Upload storage is not available on server. Please contact support.',
    };
  }
  return {
    status: 400,
    code: 'UPLOAD_INVALID',
    message: error?.message || 'Invalid upload payload.',
  };
}

function ensureUploadDirectory() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

function extractSingleUploadedFile(req: any): Express.Multer.File | null {
  if (req.file) return req.file as Express.Multer.File;
  if (Array.isArray(req.files) && req.files.length > 0) {
    return req.files[0] as Express.Multer.File;
  }
  if (req.files && typeof req.files === 'object') {
    const groups = req.files as Record<string, Express.Multer.File[]>;
    const candidates = [...(groups.image || []), ...(groups.file || []), ...(groups.photo || []), ...(groups.images || [])];
    if (candidates.length > 0) return candidates[0];
  }
  return null;
}

// Upload single image
router.post('/image', authenticate, authorizePermissions(Permissions.UPLOADS_CREATE), async (req, res) => {
  try {
    ensureUploadDirectory();
    await runSingleUpload(req, res);
    const uploadedFile = extractSingleUploadedFile(req);

    if (!uploadedFile) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided. Use form-data field name "image".',
      });
    }

    const imageUrl = `/uploads/${uploadedFile.filename}`;

    res.json({
      success: true,
      message: 'Image uploaded successfully.',
      data: {
        url: imageUrl,
        filename: uploadedFile.filename,
        size: uploadedFile.size,
      },
    });
  } catch (error) {
    const mapped = mapUploadError(error);
    res.status(mapped.status).json({
      success: false,
      code: mapped.code,
      message: mapped.message,
      constraints: {
        maxFileSizeMb: MAX_IMAGE_SIZE_MB,
        allowedMimeTypes: Object.keys(allowedMimeTypes),
      },
    });
  }
});

// Upload multiple images
router.post('/images', authenticate, authorizePermissions(Permissions.UPLOADS_CREATE), async (req, res) => {
  try {
    ensureUploadDirectory();
    await runMultiUpload(req, res);

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
  } catch (error) {
    const mapped = mapUploadError(error);
    res.status(mapped.status).json({
      success: false,
      code: mapped.code,
      message: mapped.message,
      constraints: {
        maxFileSizeMb: MAX_IMAGE_SIZE_MB,
        allowedMimeTypes: Object.keys(allowedMimeTypes),
      },
    });
  }
});

export default router;

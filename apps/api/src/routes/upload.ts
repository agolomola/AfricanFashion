import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { HeadBucketCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { authenticate, authorizePermissions } from '../middleware/auth';
import { Permissions } from '../rbac';

const router = Router();
const MAX_IMAGE_SIZE_MB = 10;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads');
const S3_BUCKET = String(process.env.AWS_S3_BUCKET || '').trim();
const S3_REGION = String(process.env.AWS_REGION || '').trim();
const S3_KEY_PREFIX = String(process.env.AWS_S3_KEY_PREFIX || 'uploads')
  .trim()
  .replace(/^\/+|\/+$/g, '');
const S3_PUBLIC_BASE_URL = String(process.env.AWS_S3_PUBLIC_BASE_URL || '')
  .trim()
  .replace(/\/+$/g, '');
const SHOULD_USE_S3 = Boolean(S3_BUCKET && S3_REGION);
const s3Client = SHOULD_USE_S3 ? new S3Client({ region: S3_REGION }) : null;
const allowedMimeTypes: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/heic': '.heic',
  'image/heif': '.heif',
};

// Configure multer storage (S3 uses memory, local fallback uses disk)
const storage = SHOULD_USE_S3
  ? multer.memoryStorage()
  : multer.diskStorage({
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
  const message = String(error?.message || '').toLowerCase();
  const awsCode = String(error?.Code || error?.code || error?.name || '').trim();
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
  if (
    error?.name === 'CredentialsProviderError' ||
    error?.name === 'InvalidAccessKeyId' ||
    error?.name === 'SignatureDoesNotMatch' ||
    message.includes('credential') ||
    message.includes('access denied') ||
    message.includes('s3')
  ) {
    const hints: Record<string, string> = {
      InvalidAccessKeyId: 'AWS_ACCESS_KEY_ID is invalid.',
      SignatureDoesNotMatch:
        'AWS_SECRET_ACCESS_KEY is invalid OR AWS_REGION does not match bucket region.',
      CredentialsProviderError:
        'Missing AWS credentials in environment. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.',
      AccessDenied:
        'IAM user/role lacks s3:PutObject permission on the configured bucket or bucket policy denies write.',
      NoSuchBucket: 'AWS_S3_BUCKET does not exist or bucket name is incorrect.',
      PermanentRedirect: 'Bucket region mismatch. Set AWS_REGION to the bucket region.',
      AuthorizationHeaderMalformed:
        'Region mismatch in request signature. Verify AWS_REGION equals the bucket region.',
    };
    const hint = hints[awsCode] || 'Check AWS credentials, bucket name, IAM policy, and region.';
    return {
      status: 500,
      code: 'UPLOAD_STORAGE_UNAVAILABLE',
      message: `S3 upload failed. ${hint}`,
      details: {
        provider: 'S3',
        awsCode: awsCode || null,
      },
    };
  }
  return {
    status: 400,
    code: 'UPLOAD_INVALID',
    message: error?.message || 'Invalid upload payload.',
    details: {
      provider: SHOULD_USE_S3 ? 'S3' : 'LOCAL',
      awsCode: awsCode || null,
    },
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

function buildS3ObjectKey(file: Express.Multer.File) {
  const extension = allowedMimeTypes[file.mimetype] || path.extname(file.originalname) || '.bin';
  const uniqueName = `${uuidv4()}${extension}`;
  return S3_KEY_PREFIX ? `${S3_KEY_PREFIX}/${uniqueName}` : uniqueName;
}

function buildS3PublicUrl(key: string) {
  if (S3_PUBLIC_BASE_URL) {
    return `${S3_PUBLIC_BASE_URL}/${key}`;
  }
  const encodedKey = key
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
  if (S3_REGION === 'us-east-1') {
    return `https://${S3_BUCKET}.s3.amazonaws.com/${encodedKey}`;
  }
  return `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${encodedKey}`;
}

async function persistUploadedFile(file: Express.Multer.File) {
  if (!SHOULD_USE_S3) {
    return {
      url: `/uploads/${file.filename}`,
      filename: file.filename,
      size: file.size,
      storage: 'LOCAL' as const,
    };
  }

  if (!s3Client || !S3_BUCKET) {
    throw new Error('S3 client is not configured.');
  }
  if (!file.buffer || file.buffer.length === 0) {
    throw new Error('Uploaded file buffer is empty.');
  }

  const key = buildS3ObjectKey(file);
  await s3Client.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      CacheControl: 'public, max-age=31536000, immutable',
    })
  );

  return {
    url: buildS3PublicUrl(key),
    filename: key,
    size: file.size,
    storage: 'S3' as const,
  };
}

async function checkS3Health() {
  if (!SHOULD_USE_S3) {
    return {
      provider: 'LOCAL' as const,
      enabled: false,
      healthy: true,
      message: 'S3 is disabled; local storage is active.',
    };
  }

  if (!s3Client || !S3_BUCKET || !S3_REGION) {
    return {
      provider: 'S3' as const,
      enabled: true,
      healthy: false,
      message: 'S3 client is not fully configured.',
      config: {
        bucketSet: Boolean(S3_BUCKET),
        regionSet: Boolean(S3_REGION),
        keyPrefix: S3_KEY_PREFIX || null,
        publicBaseUrlSet: Boolean(S3_PUBLIC_BASE_URL),
      },
    };
  }

  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
    return {
      provider: 'S3' as const,
      enabled: true,
      healthy: true,
      message: 'S3 connectivity check passed.',
      config: {
        bucket: S3_BUCKET,
        region: S3_REGION,
        keyPrefix: S3_KEY_PREFIX || null,
        publicBaseUrlSet: Boolean(S3_PUBLIC_BASE_URL),
      },
    };
  } catch (error: any) {
    const awsCode = String(error?.Code || error?.code || error?.name || '').trim();
    return {
      provider: 'S3' as const,
      enabled: true,
      healthy: false,
      message: 'S3 connectivity check failed.',
      error: {
        awsCode: awsCode || null,
        statusCode: error?.$metadata?.httpStatusCode || null,
      },
      config: {
        bucket: S3_BUCKET,
        region: S3_REGION,
        keyPrefix: S3_KEY_PREFIX || null,
        publicBaseUrlSet: Boolean(S3_PUBLIC_BASE_URL),
      },
    };
  }
}

router.get('/storage-status', authenticate, authorizePermissions(Permissions.UPLOADS_CREATE), async (_req, res) => {
  const status = await checkS3Health();
  res.json({
    success: true,
    data: status,
  });
});

// Upload single image
router.post('/image', authenticate, authorizePermissions(Permissions.UPLOADS_CREATE), async (req, res) => {
  try {
    if (!SHOULD_USE_S3) {
      ensureUploadDirectory();
    }
    await runSingleUpload(req, res);
    const uploadedFile = extractSingleUploadedFile(req);

    if (!uploadedFile) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided. Use form-data field name "image".',
      });
    }

    const stored = await persistUploadedFile(uploadedFile);

    res.json({
      success: true,
      message: 'Image uploaded successfully.',
      data: {
        url: stored.url,
        filename: stored.filename,
        size: stored.size,
        storage: stored.storage,
      },
    });
  } catch (error) {
    const mapped = mapUploadError(error);
    res.status(mapped.status).json({
      success: false,
      code: mapped.code,
      message: mapped.message,
      ...(mapped.details ? { details: mapped.details } : {}),
      constraints: {
        maxFileSizeMb: MAX_IMAGE_SIZE_MB,
        allowedMimeTypes: Object.keys(allowedMimeTypes),
        storageProvider: SHOULD_USE_S3 ? 'S3' : 'LOCAL',
      },
    });
  }
});

// Upload multiple images
router.post('/images', authenticate, authorizePermissions(Permissions.UPLOADS_CREATE), async (req, res) => {
  try {
    if (!SHOULD_USE_S3) {
      ensureUploadDirectory();
    }
    await runMultiUpload(req, res);

    if (!req.files || (req.files as any[]).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image files provided.',
      });
    }

    const files = req.files as Express.Multer.File[];
    const uploadedImages = await Promise.all(files.map((file) => persistUploadedFile(file)));

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
      ...(mapped.details ? { details: mapped.details } : {}),
      constraints: {
        maxFileSizeMb: MAX_IMAGE_SIZE_MB,
        allowedMimeTypes: Object.keys(allowedMimeTypes),
        storageProvider: SHOULD_USE_S3 ? 'S3' : 'LOCAL',
      },
    });
  }
});

export default router;

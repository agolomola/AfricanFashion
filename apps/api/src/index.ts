import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads');

// Create uploads directory if it doesn't exist
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  console.log('📁 Created uploads directory');
}

// Import routes
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import fabricSellerRoutes from './routes/fabric-seller';
import designerRoutes from './routes/designer';
import customerRoutes from './routes/customer';
import qaRoutes from './routes/qa';
import orderRoutes from './routes/orders';
import productRoutes from './routes/products';
import uploadRoutes from './routes/upload';
import bannerRoutes from './routes/banners';
import homepageRoutes from './routes/homepage';
import homepageSectionsRoutes from './routes/homepage-sections';
import paymentRoutes from './routes/payments';
import currencyRoutes from './routes/currency';
import { startCurrencyAutoSync } from './services/currency-sync';

const app = express();
const PORT = process.env.PORT || 3001;
const configuredOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'https://african-fashion-web.onrender.com',
];
const allowedOrigins = new Set([...defaultAllowedOrigins, ...configuredOrigins]);

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }
    if (allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS origin not allowed'));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Static files for uploads
app.use('/uploads', (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
}, express.static(UPLOAD_DIR));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/fabric-seller', fabricSellerRoutes);
app.use('/api/designer', designerRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/qa', qaRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/products', productRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/homepage', homepageRoutes);
app.use('/api/homepage-sections', homepageSectionsRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/currency', currencyRoutes);

startCurrencyAutoSync();

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  const isZodError = err?.name === 'ZodError' && Array.isArray(err?.issues);
  const prismaCode = typeof err?.code === 'string' ? err.code : '';
  const isMulterError = err?.name === 'MulterError';
  const mappedStatusFromPrisma =
    prismaCode === 'P2002'
      ? 409
      : prismaCode === 'P2003' || prismaCode === 'P2014'
        ? 400
        : prismaCode === 'P2025'
          ? 404
          : undefined;
  const statusCode = err.status || (isZodError ? 400 : undefined) || (isMulterError ? 400 : mappedStatusFromPrisma) || 500;
  const isClientError = statusCode >= 400 && statusCode < 500;
  const prismaField = err?.meta?.field_name || err?.meta?.target;
  const prismaMessage =
    prismaCode === 'P2002'
      ? `Duplicate value for ${Array.isArray(prismaField) ? prismaField.join(', ') : prismaField || 'a unique field'}.`
      : prismaCode === 'P2003'
        ? `Invalid reference for ${Array.isArray(prismaField) ? prismaField.join(', ') : prismaField || 'related field'}.`
        : prismaCode === 'P2014'
          ? 'Relationship constraint failed for related records.'
          : prismaCode === 'P2025'
            ? 'Requested record was not found.'
            : null;
  const zodIssue = isZodError ? err.issues[0] : null;
  const zodField = Array.isArray(zodIssue?.path) ? zodIssue.path.join('.') : 'payload';
  const zodMessage = zodIssue?.message ? `${zodField}: ${zodIssue.message}` : null;
  const fallbackDatabaseMessage = prismaCode ? `Database request failed (${prismaCode}).` : null;
  res.status(statusCode).json({
    success: false,
    message: isClientError
      ? (zodMessage || prismaMessage || err.message || 'Request failed')
      : (fallbackDatabaseMessage || 'Internal server error'),
    ...(isZodError && { errors: err.issues }),
    ...(prismaCode && { code: prismaCode }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

app.listen(PORT, () => {
  console.log(`🚀 API Server running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/health`);
});

export default app;

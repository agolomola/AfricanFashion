import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Export types from Prisma
export type {
  User,
  Order,
  Fabric,
  Design,
  Address,
  Review,
  Notification,
  ActivityLog,
  PricingRule,
  ProductCategory,
  MaterialType,
  ReadyToWear,
  OrderTimeline,
} from '@prisma/client';

// Export enums
export { UserRole, UserStatus, ProductStatus, ProductType, OrderType, OrderStatus, PaymentStatus } from '@prisma/client';

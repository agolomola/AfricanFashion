import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Export types from Prisma
export type { User, Product, Order, OrderItem, Fabric, Design, Measurement, CartItem, Address, Review, Notification, AuditLog, PricingRule, ProductCategory, MaterialType } from '@prisma/client';

// Export enums
export { UserRole, UserStatus, ProductStatus, ProductType, OrderType, OrderStatus, PaymentStatus } from '@prisma/client';

import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Export types from Prisma (only models that exist in schema.prisma)
export type {
  User, Order, Fabric, Design, ReadyToWear, Address, Review, Notification,
  ActivityLog, PricingRule, ProductCategory, MaterialType,
  CustomerProfile, FabricSellerProfile, DesignerProfile, QAProfile, AdminProfile,
  FabricImage, DesignImage, ReadyToWearImage, DesignFabric, DesignMeasurementVariable,
  CustomerMeasurement, VirtualTryOn, FabricOrderItem, DesignOrderItem,
  ReadyToWearOrderItem, OrderTimeline, ReadyToWearSize
} from '@prisma/client';

// Export enums (only enums that exist in schema.prisma)
export {
  UserRole, UserStatus, ProductStatus, OrderType, OrderStatus, PaymentStatus,
  DesignOrderStatus, FabricOrderStatus, PricingRuleType, ProductTypeForPricing,
  AdjustmentType, NotificationType
} from '@prisma/client';

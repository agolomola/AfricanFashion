import { PrismaClient } from '@prisma/client';

// Export the Prisma client
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error'] 
    : ['error'],
});

// Export types
export * from '@prisma/client';

// Helper function to disconnect (useful for testing)
export async function disconnect() {
  await prisma.$disconnect();
}

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis;

// Supabase-optimized Prisma configuration
const db = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Supabase handles connection pooling automatically
if (process.env.NODE_ENV === 'production') {
  // Connect immediately in production for better performance
  db.$connect().catch(console.error);
}

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await db.$disconnect();
});

export { db };

// Helper function to test Supabase connection
export async function testDatabaseConnection() {
  try {
    await db.$queryRaw`SELECT 1`;
    console.log('✅ Supabase connection successful');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection failed:', error);
    return false;
  }
}

// Helper function to get Supabase database info
export async function getDatabaseInfo() {
  try {
    const result = await db.$queryRaw`
      SELECT 
        current_database() as database_name,
        current_user as user_name,
        version() as postgresql_version
    `;
    return result[0];
  } catch (error) {
    console.error('Error getting Supabase database info:', error);
    return null;
  }
}
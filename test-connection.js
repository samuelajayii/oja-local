const { PrismaClient } = require('@prisma/client');

async function testConnection() {
    const prisma = new PrismaClient();

    try {
        console.log('Testing database connection...');
        await prisma.$connect();
        console.log('✅ Database connection successful!');

        // Test a simple query
        const result = await prisma.$queryRaw`SELECT version();`;
        console.log('Database version:', result);

    } catch (error) {
        console.error('❌ Database connection failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testConnection();x
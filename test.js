// comprehensive-test.js
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
})

async function runTests() {
    try {
        console.log('🔍 Testing database connection and operations...')

        // Test 1: Basic connection
        console.log('\n1. Testing basic connection...')
        await prisma.$connect()
        console.log('✅ Connected successfully')

        // Test 2: Raw query
        console.log('\n2. Testing raw query...')
        const rawResult = await prisma.$queryRaw`SELECT current_database(), version()`
        console.log('✅ Raw query successful:', rawResult)

        // Test 3: Check existing tables
        console.log('\n3. Checking existing tables...')
        const tables = await prisma.$queryRaw`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `
        console.log('✅ Found tables:', tables.map(t => t.table_name))

        // Test 4: Check migration history
        console.log('\n4. Checking migration history...')
        try {
            const migrations = await prisma.$queryRaw`
                SELECT migration_name, finished_at 
                FROM "_prisma_migrations" 
                ORDER BY finished_at DESC 
                LIMIT 5
            `
            console.log('✅ Recent migrations:', migrations)
        } catch (error) {
            console.log('ℹ️ No migration table found (this is normal for new databases)')
        }

        // Test 5: Test table operations
        console.log('\n5. Testing table operations...')
        if (tables.some(t => t.table_name === 'Category')) {
            const categories = await prisma.category.findMany()
            console.log('✅ Categories found:', categories.length)
        } else {
            console.log('ℹ️ Category table not found')
        }

        console.log('\n🎉 All tests completed successfully!')

    } catch (error) {
        console.error('❌ Test failed:', error)
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            code: error.code,
            meta: error.meta
        })
    } finally {
        await prisma.$disconnect()
    }
}

runTests()
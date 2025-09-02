import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    // Create categories
    const categories = await Promise.all([
        prisma.category.create({
            data: { name: 'Electronics', slug: 'electronics' }
        }),
        prisma.category.create({
            data: { name: 'Home & Garden', slug: 'home-garden' }
        }),
        prisma.category.create({
            data: { name: 'Clothing', slug: 'clothing' }
        }),
        prisma.category.create({
            data: { name: 'Furniture', slug: 'furniture' }
        }),
        prisma.category.create({
            data: { name: 'Vehicles', slug: 'vehicles' }
        }),
        prisma.category.create({
            data: { name: 'Jewelries', slug: 'jewellries' }
        }),
        prisma.category.create({
            data: { name: 'Gaming', slug: 'gaming' }
        }),
        prisma.category.create({
            data: { name: 'Sports', slug: 'sports' }
        }),
        prisma.category.create({
            data: { name: 'Toys', slug: 'toys' }
        }),
        prisma.category.create({
            data: { name: 'Other', slug: 'other' }
        }),
    ])

    console.log('Created categories:', categories)
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
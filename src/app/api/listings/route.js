import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/app/lib/db'
import { verifyAuthToken } from '@/app/lib/auth-helpers'

export async function GET() {
    try {
        const listings = await db.listing.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                category: {
                    select: {
                        id: true,
                        name: true,
                        slug: true
                    }
                }
            },
            where: { status: 'ACTIVE' },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json(listings)
    } catch (error) {
        console.error('Database error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch listings' },
            { status: 500 }
        )
    }
}

export async function POST(request) {
    try {
        // Verify Firebase authentication
        const user = await verifyAuthToken(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const data = await request.json()

        // Check if user exists in our database, create if not
        let dbUser = await db.user.findUnique({
            where: { id: user.uid }
        })

        if (!dbUser) {
            dbUser = await db.user.create({
                data: {
                    id: user.uid,
                    email: user.email,
                    name: user.name || user.email.split('@')[0]
                }
            })
        }

        const listing = await db.listing.create({
            data: {
                title: data.title,
                description: data.description,
                price: data.price ? parseFloat(data.price) : null,
                images: data.images || [],
                userId: user.uid,
                categoryId: data.categoryId
            },
            include: {
                user: {
                    select: { name: true, email: true }
                },
                category: true
            }
        })

        return NextResponse.json(listing)
    } catch (error) {
        console.error('Create listing error:', error)
        return NextResponse.json(
            { error: 'Failed to create listing' },
            { status: 500 }
        )
    }
}
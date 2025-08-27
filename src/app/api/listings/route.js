import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/app/lib/db'
import { verifyAuthToken } from '@/app/lib/auth-helpers'
import { deleteImage } from '@/app/lib/storage';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const category = searchParams.get('category');
        const userId = searchParams.get('userId');

        const whereClause = {
            AND: [
                { status: 'ACTIVE' },
                search ? {
                    OR: [
                        { title: { contains: search, mode: 'insensitive' } },
                        { description: { contains: search, mode: 'insensitive' } }
                    ]
                } : {},
                category ? { categoryId: category } : {},
                userId ? { userId } : {}
            ]
        };

        const listings = await db.listing.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true
                    }
                },
                category: {
                    select: {
                        id: true,
                        name: true,
                        slug: true
                    }
                },
                _count: {
                    select: {
                        messages: true,
                        favorites: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(listings);
    } catch (error) {
        console.error('Database error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch listings' },
            { status: 500 }
        );
    }
}

export async function POST(request) {
    try {
        const user = await verifyAuthToken(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data = await request.json();

        // Ensure user exists in database
        let dbUser = await db.user.findUnique({
            where: { id: user.uid }
        });

        if (!dbUser) {
            dbUser = await db.user.create({
                data: {
                    id: user.uid,
                    email: user.email,
                    name: user.name || user.email.split('@')[0],
                    avatar: user.picture
                }
            });
        }

        const listing = await db.listing.create({
            data: {
                title: data.title,
                description: data.description,
                price: data.price ? parseFloat(data.price) : null,
                images: data.images || [],
                location: data.location,
                userId: user.uid,
                categoryId: data.categoryId
            },
            include: {
                user: {
                    select: { id: true, name: true, avatar: true }
                },
                category: true
            }
        });

        return NextResponse.json(listing);
    } catch (error) {
        console.error('Create listing error:', error);
        return NextResponse.json(
            { error: 'Failed to create listing' },
            { status: 500 }
        );
    }
}
// src/app/api/listings/route.js
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/app/lib/db'
import { verifyAuthToken } from '@/app/lib/auth-helpers'
import { deleteImage } from '@/app/lib/storage';
import { CacheManager } from '@/app/lib/redis';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const category = searchParams.get('category');
        const userId = searchParams.get('userId');

        // Generate cache key
        const cacheKey = CacheManager.keys.listings({ search, category, userId });
        
        // Try to get from cache first
        const cachedListings = await CacheManager.get(cacheKey);
        if (cachedListings) {
            console.log('Returning cached listings');
            return NextResponse.json(cachedListings);
        }

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
                        conversations: true,
                        favorites: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Cache the results for 5 minutes (300 seconds)
        await CacheManager.set(cacheKey, listings, 300);
        
        console.log('Cached fresh listings data');
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

        // Ensure user exists in PostgreSQL database (fallback creation if needed)
        let dbUser = await db.user.findUnique({
            where: { id: user.uid }
        });

        if (!dbUser) {
            console.log('User not found in PostgreSQL, creating...');
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
                category: true,
                _count: {
                    select: {
                        conversations: true,
                        favorites: true
                    }
                }
            }
        });

        // Invalidate relevant caches
        await CacheManager.delPattern('listings:*');
        await CacheManager.del(CacheManager.keys.userListings(user.uid));

        return NextResponse.json(listing);
    } catch (error) {
        console.error('Create listing error:', error);
        return NextResponse.json(
            { error: 'Failed to create listing' },
            { status: 500 }
        );
    }
}
// src/app/api/favorites/route.js
import { NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import { verifyAuthToken } from '@/app/lib/auth-helpers';
import { CacheManager } from '@/app/lib/redis';

export async function GET(request) {
    try {
        const user = await verifyAuthToken(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const cacheKey = CacheManager.keys.favorites(user.uid);
        
        // Try to get from cache first
        const cachedFavorites = await CacheManager.get(cacheKey);
        if (cachedFavorites) {
            console.log('Returning cached favorites');
            return NextResponse.json(cachedFavorites);
        }

        const favorites = await db.favorite.findMany({
            where: { userId: user.uid },
            include: {
                listing: {
                    include: {
                        user: {
                            select: { id: true, name: true, avatar: true }
                        },
                        category: true,
                        _count: {
                            select: { conversations: true, favorites: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const favoriteListings = favorites.map(fav => fav.listing);

        // Cache favorites for 5 minutes (300 seconds)
        await CacheManager.set(cacheKey, favoriteListings, 300);

        return NextResponse.json(favoriteListings);
    } catch (error) {
        console.error('Database error:', error);
        return NextResponse.json({ error: 'Failed to fetch favorites' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const user = await verifyAuthToken(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { listingId } = await request.json();

        if (!listingId) {
            return NextResponse.json({ error: 'Listing ID is required' }, { status: 400 });
        }

        // Check if listing exists
        const listing = await db.listing.findUnique({
            where: { id: listingId }
        });

        if (!listing) {
            return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
        }

        // Check if already favorited
        const existingFavorite = await db.favorite.findUnique({
            where: {
                userId_listingId: {
                    userId: user.uid,
                    listingId: listingId
                }
            }
        });

        if (existingFavorite) {
            return NextResponse.json({ error: 'Already favorited' }, { status: 409 });
        }

        const favorite = await db.favorite.create({
            data: {
                userId: user.uid,
                listingId: listingId
            }
        });

        // Invalidate favorites cache and listing cache
        await CacheManager.del(CacheManager.keys.favorites(user.uid));
        await CacheManager.del(CacheManager.keys.listing(listingId));
        await CacheManager.delPattern('listings:*'); // Listing counts changed

        return NextResponse.json(favorite);
    } catch (error) {
        console.error('Add favorite error:', error);
        return NextResponse.json({ error: 'Failed to add favorite' }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const user = await verifyAuthToken(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const listingId = searchParams.get('listingId');

        if (!listingId) {
            return NextResponse.json({ error: 'Listing ID is required' }, { status: 400 });
        }

        const favorite = await db.favorite.findUnique({
            where: {
                userId_listingId: {
                    userId: user.uid,
                    listingId: listingId
                }
            }
        });

        if (!favorite) {
            return NextResponse.json({ error: 'Favorite not found' }, { status: 404 });
        }

        await db.favorite.delete({
            where: {
                userId_listingId: {
                    userId: user.uid,
                    listingId: listingId
                }
            }
        });

        // Invalidate favorites cache and listing cache
        await CacheManager.del(CacheManager.keys.favorites(user.uid));
        await CacheManager.del(CacheManager.keys.listing(listingId));
        await CacheManager.delPattern('listings:*'); // Listing counts changed

        return NextResponse.json({ message: 'Favorite removed' });
    } catch (error) {
        console.error('Remove favorite error:', error);
        return NextResponse.json({ error: 'Failed to remove favorite' }, { status: 500 });
    }
}
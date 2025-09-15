import { NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import { verifyAuthToken } from '@/app/lib/auth-helpers';

export async function GET(request) {
    try {
        const user = await verifyAuthToken(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

        return NextResponse.json({ message: 'Favorite removed' });
    } catch (error) {
        console.error('Remove favorite error:', error);
        return NextResponse.json({ error: 'Failed to remove favorite' }, { status: 500 });
    }
}
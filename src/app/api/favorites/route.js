import { NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import { verifyAuthToken } from '@/app/lib/auth-helpers';

export async function GET(request) {
    try {
        console.log('GET /api/favorites - Starting request');

        const user = await verifyAuthToken(request);
        if (!user) {
            console.log('GET /api/favorites - Unauthorized: No user found');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('GET /api/favorites - User verified:', user.uid);

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
                            select: { messages: true, favorites: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        console.log('GET /api/favorites - Found favorites:', favorites.length);
        return NextResponse.json(favorites.map(fav => fav.listing));
    } catch (error) {
        console.error('GET /api/favorites - Database error:', error);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        return NextResponse.json({ error: 'Failed to fetch favorites' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        console.log('POST /api/favorites - Starting request');

        const user = await verifyAuthToken(request);
        if (!user) {
            console.log('POST /api/favorites - Unauthorized: No user found');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('POST /api/favorites - User verified:', user.uid);

        const body = await request.json();
        console.log('POST /api/favorites - Request body:', body);

        const { listingId } = body;

        if (!listingId) {
            console.log('POST /api/favorites - Missing listingId');
            return NextResponse.json({ error: 'listingId is required' }, { status: 400 });
        }

        console.log('POST /api/favorites - Creating favorite for listing:', listingId);

        // Check if the listing exists first
        const listing = await db.listing.findUnique({
            where: { id: listingId }
        });

        if (!listing) {
            console.log('POST /api/favorites - Listing not found:', listingId);
            return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
        }

        console.log('POST /api/favorites - Listing found, creating favorite');

        const favorite = await db.favorite.create({
            data: {
                userId: user.uid,
                listingId
            }
        });

        console.log('POST /api/favorites - Favorite created:', favorite);
        return NextResponse.json(favorite);
    } catch (error) {
        console.error('POST /api/favorites - Error:', error);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            code: error.code,
            stack: error.stack
        });

        if (error.code === 'P2002') {
            console.log('POST /api/favorites - Duplicate favorite attempt');
            return NextResponse.json({ error: 'Already favorited' }, { status: 400 });
        }

        return NextResponse.json({
            error: 'Failed to add favorite',
            details: error.message
        }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        console.log('DELETE /api/favorites - Starting request');

        const user = await verifyAuthToken(request);
        if (!user) {
            console.log('DELETE /api/favorites - Unauthorized: No user found');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const listingId = searchParams.get('listingId');

        console.log('DELETE /api/favorites - Deleting favorite for listing:', listingId);

        await db.favorite.deleteMany({
            where: {
                userId: user.uid,
                listingId
            }
        });

        console.log('DELETE /api/favorites - Favorite deleted successfully');
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('DELETE /api/favorites - Error:', error);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        return NextResponse.json({ error: 'Failed to remove favorite' }, { status: 500 });
    }
}
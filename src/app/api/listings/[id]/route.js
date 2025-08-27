import { NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import { verifyAuthToken } from '@/app/lib/auth-helpers';
import { deleteImage } from '@/app/lib/storage';

export async function GET(request, { params }) {
    try {
        const listing = await db.listing.findUnique({
            where: { id: params.id },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true,
                        location: true
                    }
                },
                category: true,
                _count: {
                    select: {
                        messages: true,
                        favorites: true
                    }
                }
            }
        });

        if (!listing) {
            return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
        }

        return NextResponse.json(listing);
    } catch (error) {
        console.error('Database error:', error);
        return NextResponse.json({ error: 'Failed to fetch listing' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const user = await verifyAuthToken(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user owns the listing
        const listing = await db.listing.findUnique({
            where: { id: params.id },
            select: { userId: true, images: true }
        });

        if (!listing) {
            return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
        }

        if (listing.userId !== user.uid) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Delete images from Cloud Storage
        if (listing.images && listing.images.length > 0) {
            await Promise.all(
                listing.images.map(imageUrl => deleteImage(imageUrl))
            );
        }

        // Delete listing from database
        await db.listing.delete({
            where: { id: params.id }
        });

        return NextResponse.json({ message: 'Listing deleted successfully' });
    } catch (error) {
        console.error('Delete listing error:', error);
        return NextResponse.json({ error: 'Failed to delete listing' }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
    try {
        const user = await verifyAuthToken(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data = await request.json();

        // Check if user owns the listing
        const existingListing = await db.listing.findUnique({
            where: { id: params.id },
            select: { userId: true }
        });

        if (!existingListing) {
            return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
        }

        if (existingListing.userId !== user.uid) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const updatedListing = await db.listing.update({
            where: { id: params.id },
            data: {
                title: data.title,
                description: data.description,
                price: data.price ? parseFloat(data.price) : null,
                images: data.images || [],
                location: data.location,
                categoryId: data.categoryId,
                status: data.status
            },
            include: {
                user: {
                    select: { id: true, name: true, avatar: true }
                },
                category: true
            }
        });

        return NextResponse.json(updatedListing);
    } catch (error) {
        console.error('Update listing error:', error);
        return NextResponse.json({ error: 'Failed to update listing' }, { status: 500 });
    }
}
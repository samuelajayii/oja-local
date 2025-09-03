// src/app/api/users/[id]/route.js
import { NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import { verifyAuthToken } from '@/app/lib/auth-helpers';
import { CacheManager } from '@/app/lib/redis';

export async function GET(request, { params }) {
    try {
        const cacheKey = CacheManager.keys.user(params.id);

        // Try to get from cache first
        const cachedUser = await CacheManager.get(cacheKey);
        if (cachedUser) {
            console.log('Returning cached user data');
            return NextResponse.json(cachedUser);
        }

        const user = await db.user.findUnique({
            where: { id: params.id },
            select: {
                id: true,
                name: true,
                avatar: true,
                bio: true,
                location: true,
                createdAt: true,
                listings: {
                    where: { status: 'ACTIVE' },
                    include: {
                        category: true,
                        _count: {
                            select: { conversations: true, favorites: true }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                },
                _count: {
                    select: {
                        listings: { where: { status: 'ACTIVE' } }
                    }
                }
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Cache user data for 10 minutes (600 seconds)
        await CacheManager.set(cacheKey, user, 600);

        return NextResponse.json(user);
    } catch (error) {
        console.error('Database error:', error);
        return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
    try {
        const authUser = await verifyAuthToken(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (authUser.uid !== params.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const data = await request.json();

        const updatedUser = await db.user.update({
            where: { id: params.id },
            data: {
                name: data.name,
                bio: data.bio,
                location: data.location,
                avatar: data.avatar
            },
            select: {
                id: true,
                name: true,
                avatar: true,
                bio: true,
                location: true,
                email: true
            }
        });

        // Invalidate user cache
        await CacheManager.del(CacheManager.keys.user(params.id));

        // Also invalidate any listings cache that might contain this user's data
        await CacheManager.delPattern('listings:*');

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error('Update user error:', error);
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
}
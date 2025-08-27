import { NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import { verifyAuthToken } from '@/app/lib/auth-helpers';

export async function GET(request, { params }) {
    try {
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
                            select: { messages: true, favorites: true }
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

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error('Update user error:', error);
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
}
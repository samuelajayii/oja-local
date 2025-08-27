import { NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import { verifyAuthToken } from '@/app/lib/auth-helpers';

export async function POST(request) {
    try {
        const authUser = await verifyAuthToken(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const requestData = await request.json();

        // Check if user already exists in PostgreSQL
        const existingUser = await db.user.findUnique({
            where: { id: authUser.uid }
        });

        if (existingUser) {
            return NextResponse.json(existingUser);
        }

        // Create new user in PostgreSQL
        const userData = {
            id: authUser.uid,
            email: authUser.email,
            name: requestData.name || authUser.name || authUser.email.split('@')[0],
            avatar: requestData.avatar || authUser.picture || null
        };

        const newUser = await db.user.create({
            data: userData,
            select: {
                id: true,
                email: true,
                name: true,
                avatar: true,
                bio: true,
                location: true,
                createdAt: true
            }
        });

        return NextResponse.json(newUser);
    } catch (error) {
        console.error('Create user error:', error);
        return NextResponse.json(
            { error: 'Failed to create user' },
            { status: 500 }
        );
    }
}

export async function GET(request) {
    try {
        const authUser = await verifyAuthToken(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await db.user.findUnique({
            where: { id: authUser.uid },
            select: {
                id: true,
                email: true,
                name: true,
                avatar: true,
                bio: true,
                location: true,
                createdAt: true
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error('Get user error:', error);
        return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
    }
}
import { NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import { verifyAuthToken } from '@/app/lib/auth-helpers';

export async function PUT(request, { params }) {
    try {
        const user = await verifyAuthToken(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await db.message.updateMany({
            where: {
                id: params.id,
                receiverId: user.uid
            },
            data: {
                isRead: true
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Mark read error:', error);
        return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 });
    }
}
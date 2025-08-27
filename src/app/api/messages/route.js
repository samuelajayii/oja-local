import { NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import { verifyAuthToken } from '@/app/lib/auth-helpers';

export async function GET(request) {
    try {
        const user = await verifyAuthToken(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const listingId = searchParams.get('listingId');
        const conversationWith = searchParams.get('conversationWith');

        if (listingId && conversationWith) {
            // Get messages for a specific listing conversation
            const messages = await db.message.findMany({
                where: {
                    listingId,
                    OR: [
                        { senderId: user.uid, receiverId: conversationWith },
                        { senderId: conversationWith, receiverId: user.uid }
                    ]
                },
                include: {
                    sender: {
                        select: { id: true, name: true, avatar: true }
                    },
                    listing: {
                        select: { id: true, title: true }
                    }
                },
                orderBy: { createdAt: 'asc' }
            });

            return NextResponse.json(messages);
        }

        // Get all conversations for the user
        const conversations = await db.message.findMany({
            where: {
                OR: [
                    { senderId: user.uid },
                    { receiverId: user.uid }
                ]
            },
            include: {
                sender: {
                    select: { id: true, name: true, avatar: true }
                },
                receiver: {
                    select: { id: true, name: true, avatar: true }
                },
                listing: {
                    select: { id: true, title: true, images: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Group by listing and conversation partner
        const groupedConversations = {};
        conversations.forEach(message => {
            const partnerId = message.senderId === user.uid ? message.receiverId : message.senderId;
            const key = `${message.listingId}-${partnerId}`;

            if (!groupedConversations[key]) {
                groupedConversations[key] = {
                    listingId: message.listingId,
                    listing: message.listing,
                    partner: message.senderId === user.uid ? message.receiver : message.sender,
                    lastMessage: message,
                    unreadCount: 0
                };
            }

            if (message.receiverId === user.uid && !message.isRead) {
                groupedConversations[key].unreadCount++;
            }
        });

        return NextResponse.json(Object.values(groupedConversations));
    } catch (error) {
        console.error('Database error:', error);
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const user = await verifyAuthToken(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { content, receiverId, listingId } = await request.json();

        if (!content || !receiverId || !listingId) {
            return NextResponse.json({
                error: 'Content, receiverId, and listingId are required'
            }, { status: 400 });
        }

        // Verify listing exists and get owner
        const listing = await db.listing.findUnique({
            where: { id: listingId },
            select: { userId: true }
        });

        if (!listing) {
            return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
        }

        const message = await db.message.create({
            data: {
                content,
                senderId: user.uid,
                receiverId,
                listingId
            },
            include: {
                sender: {
                    select: { id: true, name: true, avatar: true }
                },
                receiver: {
                    select: { id: true, name: true, avatar: true }
                },
                listing: {
                    select: { id: true, title: true }
                }
            }
        });

        return NextResponse.json(message);
    } catch (error) {
        console.error('Create message error:', error);
        return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }
}
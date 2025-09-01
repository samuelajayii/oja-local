import { NextResponse } from 'next/server';
import { verifyAuthToken } from '@/app/lib/auth-helpers';
import { db } from '@/app/lib/db'; // Keep for listings
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db as firestore } from '@/app/lib/firebase-admin';

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
      // Get messages for a specific listing conversation from Firestore
      const messagesRef = collection(firestore, 'messages');
      const q = query(
        messagesRef,
        where('listingId', '==', listingId),
        where('participants', 'array-contains-any', [user.uid, conversationWith]),
        orderBy('createdAt', 'asc')
      );

      const messagesSnapshot = await getDocs(q);
      const messages = [];

      for (const docSnap of messagesSnapshot.docs) {
        const messageData = docSnap.data();
        // Only include messages between these two users
        if ((messageData.senderId === user.uid && messageData.receiverId === conversationWith) ||
          (messageData.senderId === conversationWith && messageData.receiverId === user.uid)) {

          // Get sender info from PostgreSQL
          const sender = await db.user.findUnique({
            where: { id: messageData.senderId },
            select: { id: true, name: true, avatar: true }
          });

          // Get receiver info from PostgreSQL
          const receiver = await db.user.findUnique({
            where: { id: messageData.receiverId },
            select: { id: true, name: true, avatar: true }
          });

          // Get listing info from PostgreSQL
          const listing = await db.listing.findUnique({
            where: { id: messageData.listingId },
            select: { id: true, title: true, images: true }
          });

          messages.push({
            id: docSnap.id,
            ...messageData,
            createdAt: messageData.createdAt?.toDate?.() || new Date(messageData.createdAt),
            sender,
            receiver,
            listing
          });
        }
      }

      return NextResponse.json(messages);
    }

    // Get all conversations for the user from Firestore
    const messagesRef = collection(firestore, 'messages');
    const q = query(
      messagesRef,
      where('participants', 'array-contains', user.uid),
      orderBy('createdAt', 'desc')
    );

    const messagesSnapshot = await getDocs(q);
    const conversations = new Map();

    for (const docSnap of messagesSnapshot.docs) {
      const messageData = docSnap.data();
      const partnerId = messageData.senderId === user.uid ? messageData.receiverId : messageData.senderId;
      const key = `${messageData.listingId}-${partnerId}`;

      if (!conversations.has(key)) {
        // Get partner info from PostgreSQL
        const partner = await db.user.findUnique({
          where: { id: partnerId },
          select: { id: true, name: true, avatar: true }
        });

        // Get listing info from PostgreSQL
        const listing = await db.listing.findUnique({
          where: { id: messageData.listingId },
          select: { id: true, title: true, images: true }
        });

        conversations.set(key, {
          listingId: messageData.listingId,
          listing,
          partner,
          lastMessage: {
            id: docSnap.id,
            ...messageData,
            createdAt: messageData.createdAt?.toDate?.() || new Date(messageData.createdAt)
          },
          unreadCount: 0 // We'll implement this later if needed
        });
      }
    }

    return NextResponse.json(Array.from(conversations.values()));
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

    // Verify listing exists in PostgreSQL
    const listing = await db.listing.findUnique({
      where: { id: listingId },
      select: { userId: true, id: true, title: true }
    });

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    // Create message in Firestore
    const messageData = {
      content,
      senderId: user.uid,
      receiverId,
      listingId,
      participants: [user.uid, receiverId],
      createdAt: serverTimestamp(),
      isRead: false
    };

    const messagesRef = collection(firestore, 'messages');
    const docRef = await addDoc(messagesRef, messageData);

    // Get sender and receiver info from PostgreSQL for response
    const sender = await db.user.findUnique({
      where: { id: user.uid },
      select: { id: true, name: true, avatar: true }
    });

    const receiver = await db.user.findUnique({
      where: { id: receiverId },
      select: { id: true, name: true, avatar: true }
    });

    const responseMessage = {
      id: docRef.id,
      ...messageData,
      createdAt: new Date(),
      sender,
      receiver,
      listing: { id: listing.id, title: listing.title }
    };

    return NextResponse.json(responseMessage);
  } catch (error) {
    console.error('Create message error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import { verifyAuthToken } from '@/app/lib/auth-helpers';
import { db } from '@/app/lib/db'; // Keep for listings and user data
import { db as firestore } from '@/app/lib/firebase-admin'; // Use admin SDK
import { FieldValue } from 'firebase-admin/firestore';

// Helper function to generate conversation ID
const getConversationId = (userId1, userId2, listingId) => {
  const sortedUsers = [userId1, userId2].sort();
  return `${listingId}_${sortedUsers[0]}_${sortedUsers[1]}`;
};

// Helper function to safely convert Firestore timestamp
const convertTimestamp = (timestamp) => {
  if (!timestamp) return new Date();
  if (timestamp.toDate) return timestamp.toDate();
  if (timestamp._seconds) return new Date(timestamp._seconds * 1000);
  return new Date(timestamp);
};

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
      // Get specific conversation messages
      const conversationId = getConversationId(user.uid, conversationWith, listingId);
      const conversationRef = firestore.collection('conversations').doc(conversationId);
      const conversationDoc = await conversationRef.get();

      if (!conversationDoc.exists) {
        return NextResponse.json([]);
      }

      const conversationData = conversationDoc.data();
      const messages = conversationData.messages || [];

      // Enhance messages with user and listing data
      const enhancedMessages = await Promise.all(
        messages.map(async (message) => {
          try {
            // Get sender info from PostgreSQL
            const sender = await db.user.findUnique({
              where: { id: message.senderId },
              select: { id: true, name: true, avatar: true }
            });

            // Get receiver info from PostgreSQL
            const receiver = await db.user.findUnique({
              where: { id: message.receiverId },
              select: { id: true, name: true, avatar: true }
            });

            return {
              ...message,
              createdAt: convertTimestamp(message.createdAt),
              sender,
              receiver
            };
          } catch (error) {
            console.error('Error enhancing message:', error);
            return {
              ...message,
              createdAt: convertTimestamp(message.createdAt)
            };
          }
        })
      );

      // Sort messages by creation time
      enhancedMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      return NextResponse.json(enhancedMessages);
    }

    // Get all conversations for the user
    const conversationsRef = firestore.collection('conversations');
    const q = conversationsRef
      .where('participants', 'array-contains', user.uid);

    const conversationsSnapshot = await q.get();
    const conversations = [];

    for (const docSnap of conversationsSnapshot.docs) {
      const conversationData = docSnap.data();
      
      try {
        // Calculate unread count
        const messages = conversationData.messages || [];
        const unreadCount = messages.filter(
          msg => msg.receiverId === user.uid && !msg.isRead
        ).length;

        // Get partner ID (the other participant)
        const partnerId = conversationData.participants.find(id => id !== user.uid);

        if (!partnerId) {
          console.warn(`No partner found for conversation ${docSnap.id}`);
          continue;
        }

        // Get partner info from PostgreSQL
        const partner = await db.user.findUnique({
          where: { id: partnerId },
          select: { id: true, name: true, avatar: true }
        });

        if (!partner) {
          console.warn(`Partner user not found: ${partnerId}`);
          continue;
        }

        // Get listing info from PostgreSQL
        const listing = await db.listing.findUnique({
          where: { id: conversationData.listingId },
          select: { id: true, title: true, images: true }
        });

        if (!listing) {
          console.warn(`Listing not found: ${conversationData.listingId}`);
          continue;
        }

        // Get the last message
        const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

        conversations.push({
          id: docSnap.id,
          listingId: conversationData.listingId,
          listing,
          partner,
          lastMessage: lastMessage ? {
            content: lastMessage.content,
            senderId: lastMessage.senderId,
            createdAt: convertTimestamp(lastMessage.createdAt)
          } : null,
          unreadCount,
          updatedAt: convertTimestamp(conversationData.updatedAt || conversationData.lastMessageAt)
        });
      } catch (error) {
        console.error('Error processing conversation:', error);
        continue;
      }
    }

    // Sort conversations by last message time (most recent first)
    conversations.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt || a.updatedAt;
      const bTime = b.lastMessage?.createdAt || b.updatedAt;
      return new Date(bTime) - new Date(aTime);
    });

    return NextResponse.json(conversations);
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

    // Verify receiver exists
    const receiver = await db.user.findUnique({
      where: { id: receiverId },
      select: { id: true, name: true, avatar: true }
    });

    if (!receiver) {
      return NextResponse.json({ error: 'Receiver not found' }, { status: 404 });
    }

    // Generate conversation ID
    const conversationId = getConversationId(user.uid, receiverId, listingId);
    const conversationRef = firestore.collection('conversations').doc(conversationId);
    
    // Create timestamp once for consistency
    const now = new Date();
    
    const newMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: content.trim(),
      senderId: user.uid,
      receiverId,
      createdAt: now,
      isRead: false
    };

    // Check if this is a new conversation
    let isNewConversation = false;

    // Use a transaction to ensure data consistency
    await firestore.runTransaction(async (transaction) => {
      const conversationDoc = await transaction.get(conversationRef);
      
      if (conversationDoc.exists) {
        // Update existing conversation
        const currentData = conversationDoc.data();
        const currentMessages = currentData.messages || [];
        
        transaction.update(conversationRef, {
          messages: [...currentMessages, newMessage],
          lastMessageAt: FieldValue.serverTimestamp(),
          lastMessage: content.trim(),
          lastSenderId: user.uid,
          updatedAt: FieldValue.serverTimestamp()
        });
      } else {
        // Create new conversation
        isNewConversation = true;
        
        transaction.set(conversationRef, {
          id: conversationId,
          listingId: listingId,
          participants: [user.uid, receiverId],
          messages: [newMessage],
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          lastMessageAt: FieldValue.serverTimestamp(),
          lastMessage: content.trim(),
          lastSenderId: user.uid
        });
      }
    });

    // Update message count in PostgreSQL if this is a new conversation
    if (isNewConversation) {
      try {
        // Create a Message record in PostgreSQL to maintain the count
        // This creates a lightweight record that represents the conversation
        await db.message.create({
          data: {
            id: conversationId, // Use conversation ID as message ID to ensure uniqueness
            content: `Conversation started`, // Placeholder content
            senderId: user.uid,
            receiverId: receiverId,
            listingId: listingId,
            conversationType: 'CONVERSATION_STARTER', // Add a type field to distinguish
          }
        });

        console.log(`Created conversation record in PostgreSQL for listing ${listingId}`);
      } catch (pgError) {
        // If there's an error creating the PostgreSQL record, log it but don't fail the whole operation
        // since the message was successfully created in Firestore
        console.error('Error creating PostgreSQL conversation record:', pgError);
      }
    }

    // Get sender info for response
    const sender = await db.user.findUnique({
      where: { id: user.uid },
      select: { id: true, name: true, avatar: true }
    });

    const responseMessage = {
      ...newMessage,
      createdAt: now,
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

export async function PUT(request) {
  try {
    const user = await verifyAuthToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId } = await request.json();

    if (!conversationId) {
      return NextResponse.json({
        error: 'Conversation ID is required'
      }, { status: 400 });
    }

    const conversationRef = firestore.collection('conversations').doc(conversationId);
    
    await firestore.runTransaction(async (transaction) => {
      const conversationDoc = await transaction.get(conversationRef);

      if (!conversationDoc.exists) {
        throw new Error('Conversation not found');
      }

      const conversationData = conversationDoc.data();
      
      // Check if user is a participant
      if (!conversationData.participants.includes(user.uid)) {
        throw new Error('Unauthorized');
      }

      const messages = conversationData.messages || [];
      
      // Mark unread messages from the other user as read
      const updatedMessages = messages.map(msg => {
        if (msg.receiverId === user.uid && !msg.isRead) {
          return { ...msg, isRead: true };
        }
        return msg;
      });

      transaction.update(conversationRef, {
        messages: updatedMessages,
        updatedAt: FieldValue.serverTimestamp()
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mark messages as read error:', error);
    
    if (error.message === 'Conversation not found') {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    return NextResponse.json({ error: 'Failed to mark messages as read' }, { status: 500 });
  }
}
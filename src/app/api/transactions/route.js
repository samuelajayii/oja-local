// src/app/api/transactions/route.js
import { NextResponse } from 'next/server';
import { verifyAuthToken } from '@/app/lib/auth-helpers';
import { db } from '@/app/lib/db';
import { db as firestore } from '@/app/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// Helper function to generate conversation ID
const getConversationId = (userId1, userId2, listingId) => {
  const sortedUsers = [userId1, userId2].sort();
  return `${listingId}_${sortedUsers[0]}_${sortedUsers[1]}`;
};

// GET - Fetch user's transactions
export async function GET(request) {
  try {
    const user = await verifyAuthToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'completed', 'pending', etc.

    const whereClause = {
      OR: [
        { sellerId: user.uid },
        { buyerId: user.uid }
      ]
    };

    if (status) {
      whereClause.status = status.toUpperCase();
    }

    const transactions = await db.transaction.findMany({
      where: whereClause,
      include: {
        listing: {
          include: {
            category: true
          }
        },
        seller: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        buyer: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        conversation: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Fetch transactions error:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}

// POST - Initiate a transaction
export async function POST(request) {
  try {
    const user = await verifyAuthToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { listingId, conversationWith, agreedPrice } = await request.json();

    if (!listingId || !conversationWith || agreedPrice === undefined) {
      return NextResponse.json({
        error: 'listingId, conversationWith, and agreedPrice are required'
      }, { status: 400 });
    }

    // Verify listing exists and get details
    const listing = await db.listing.findUnique({
      where: { id: listingId },
      select: { 
        id: true, 
        userId: true, 
        title: true, 
        price: true,
        status: true
      }
    });

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (listing.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Listing is not active' }, { status: 400 });
    }

    // Determine seller and buyer
    const sellerId = listing.userId;
    const buyerId = user.uid === sellerId ? conversationWith : user.uid;
    
    // Can't create transaction with yourself
    if (sellerId === buyerId) {
      return NextResponse.json({ error: 'Cannot create transaction with yourself' }, { status: 400 });
    }

    // Generate conversation ID
    const conversationId = getConversationId(sellerId, buyerId, listingId);

    // Check if transaction already exists
    const existingTransaction = await db.transaction.findUnique({
      where: { listingId: listingId }
    });

    if (existingTransaction) {
      return NextResponse.json({ error: 'Transaction already exists for this listing' }, { status: 400 });
    }

    // Create transaction
    const transaction = await db.transaction.create({
      data: {
        listingId,
        conversationId,
        sellerId,
        buyerId,
        agreedPrice: parseFloat(agreedPrice),
        status: 'PENDING'
      },
      include: {
        listing: {
          include: {
            category: true
          }
        },
        seller: {
          select: { id: true, name: true, avatar: true }
        },
        buyer: {
          select: { id: true, name: true, avatar: true }
        }
      }
    });

    // Update conversation status
    await db.conversation.update({
      where: { id: conversationId },
      data: { status: 'TRANSACTION_PENDING' }
    });

    // Add system message to Firestore conversation
    const conversationRef = firestore.collection('conversations').doc(conversationId);
    const systemMessage = {
      id: `sys_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: `Transaction initiated for $${parseFloat(agreedPrice).toFixed(2)}. Both parties need to confirm completion.`,
      senderId: 'system',
      receiverId: 'system',
      createdAt: new Date(),
      isRead: true,
      type: 'TRANSACTION_REQUEST'
    };

    await firestore.runTransaction(async (firestoreTransaction) => {
      const conversationDoc = await firestoreTransaction.get(conversationRef);
      
      if (conversationDoc.exists) {
        const currentData = conversationDoc.data();
        const currentMessages = currentData.messages || [];
        
        firestoreTransaction.update(conversationRef, {
          messages: [...currentMessages, systemMessage],
          transactionId: transaction.id,
          transactionStatus: 'PENDING',
          updatedAt: FieldValue.serverTimestamp()
        });
      }
    });

    return NextResponse.json(transaction);
  } catch (error) {
    console.error('Create transaction error:', error);
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
  }
}
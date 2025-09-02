// src/app/api/transactions/[id]/confirm/route.js
import { NextResponse } from 'next/server';
import { verifyAuthToken } from '@/app/lib/auth-helpers';
import { db } from '@/app/lib/db';
import { db as firestore } from '@/app/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request, { params }) {
  try {
    const user = await verifyAuthToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const transactionId = params.id;

    // Get current transaction
    const transaction = await db.transaction.findUnique({
      where: { id: transactionId },
      include: {
        listing: true,
        seller: {
          select: { id: true, name: true, avatar: true }
        },
        buyer: {
          select: { id: true, name: true, avatar: true }
        },
        conversation: true
      }
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Check if user is part of this transaction
    if (transaction.sellerId !== user.uid && transaction.buyerId !== user.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if transaction is still pending
    if (transaction.status !== 'PENDING' && transaction.status !== 'SELLER_CONFIRMED' && transaction.status !== 'BUYER_CONFIRMED') {
      return NextResponse.json({ error: 'Transaction cannot be confirmed' }, { status: 400 });
    }

    // Determine who is confirming
    const isSeller = transaction.sellerId === user.uid;
    const isBuyer = transaction.buyerId === user.uid;

    // Check if user already confirmed
    if ((isSeller && transaction.sellerConfirmed) || (isBuyer && transaction.buyerConfirmed)) {
      return NextResponse.json({ error: 'You have already confirmed this transaction' }, { status: 400 });
    }

    // Update confirmation status
    const updateData = {
      updatedAt: new Date()
    };

    if (isSeller) {
      updateData.sellerConfirmed = true;
    } else {
      updateData.buyerConfirmed = true;
    }

    // Determine new status
    let newStatus = 'PENDING';
    let isCompleted = false;

    if (isSeller && !transaction.buyerConfirmed) {
      newStatus = 'SELLER_CONFIRMED';
    } else if (isBuyer && !transaction.sellerConfirmed) {
      newStatus = 'BUYER_CONFIRMED';
    } else {
      // Both confirmed
      newStatus = 'COMPLETED';
      isCompleted = true;
      updateData.completedAt = new Date();
    }

    updateData.status = newStatus;

    // Update transaction in database
    const updatedTransaction = await db.transaction.update({
      where: { id: transactionId },
      data: updateData,
      include: {
        listing: true,
        seller: {
          select: { id: true, name: true, avatar: true }
        },
        buyer: {
          select: { id: true, name: true, avatar: true }
        }
      }
    });

    // If completed, update listing status and conversation status
    if (isCompleted) {
      await db.listing.update({
        where: { id: transaction.listingId },
        data: { status: 'SOLD' }
      });

      await db.conversation.update({
        where: { id: transaction.conversationId },
        data: { status: 'TRANSACTION_COMPLETED' }
      });
    }

    // Add system message to Firestore
    const conversationRef = firestore.collection('conversations').doc(transaction.conversationId);
    let systemMessageContent;
    let messageType;

    if (isCompleted) {
      systemMessageContent = `🎉 Transaction completed! Both parties have confirmed the exchange.`;
      messageType = 'TRANSACTION_COMPLETED';
    } else {
      const confirmerName = isSeller ? transaction.seller.name : transaction.buyer.name;
      const waitingFor = isSeller ? transaction.buyer.name : transaction.seller.name;
      systemMessageContent = `${confirmerName} has confirmed the transaction. Waiting for ${waitingFor} to confirm.`;
      messageType = 'TRANSACTION_CONFIRMED';
    }

    const systemMessage = {
      id: `sys_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: systemMessageContent,
      senderId: 'system',
      receiverId: 'system',
      createdAt: new Date(),
      isRead: true,
      type: messageType
    };

    await firestore.runTransaction(async (firestoreTransaction) => {
      const conversationDoc = await firestoreTransaction.get(conversationRef);
      
      if (conversationDoc.exists) {
        const currentData = conversationDoc.data();
        const currentMessages = currentData.messages || [];
        
        const updateData = {
          messages: [...currentMessages, systemMessage],
          transactionStatus: newStatus,
          updatedAt: FieldValue.serverTimestamp()
        };

        if (isCompleted) {
          updateData.status = 'TRANSACTION_COMPLETED';
        }
        
        firestoreTransaction.update(conversationRef, updateData);
      }
    });

    // Create notifications
    const notifications = [];
    
    if (isCompleted) {
      // Notify both parties
      notifications.push(
        {
          id: `notif_${Date.now()}_seller`,
          type: 'TRANSACTION_COMPLETED',
          title: 'Transaction Completed!',
          message: `Your sale of "${transaction.listing.title}" has been completed.`,
          userId: transaction.sellerId,
          listingId: transaction.listingId,
          fromUserId: transaction.buyerId,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: `notif_${Date.now()}_buyer`,
          type: 'TRANSACTION_COMPLETED',
          title: 'Transaction Completed!',
          message: `Your purchase of "${transaction.listing.title}" has been completed.`,
          userId: transaction.buyerId,
          listingId: transaction.listingId,
          fromUserId: transaction.sellerId,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      );
    } else {
      // Notify the other party that confirmation is needed
      const otherUserId = isSeller ? transaction.buyerId : transaction.sellerId;
      const confirmerName = isSeller ? transaction.seller.name : transaction.buyer.name;
      
      notifications.push({
        id: `notif_${Date.now()}_confirm`,
        type: 'TRANSACTION_CONFIRMED',
        title: 'Transaction Confirmation Needed',
        message: `${confirmerName} has confirmed the transaction for "${transaction.listing.title}". Please confirm to complete.`,
        userId: otherUserId,
        listingId: transaction.listingId,
        fromUserId: user.uid,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    // Create notifications in database
    if (notifications.length > 0) {
      await db.notifications.createMany({
        data: notifications
      });
    }

    return NextResponse.json({
      transaction: updatedTransaction,
      isCompleted,
      message: isCompleted 
        ? 'Transaction completed successfully!' 
        : 'Your confirmation has been recorded. Waiting for the other party to confirm.'
    });
  } catch (error) {
    console.error('Confirm transaction error:', error);
    return NextResponse.json({ error: 'Failed to confirm transaction' }, { status: 500 });
  }
}

// src/app/api/transactions/[id]/route.js
export async function GET(request, { params }) {
  try {
    const user = await verifyAuthToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const transaction = await db.transaction.findUnique({
      where: { id: params.id },
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
        },
        conversation: true
      }
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Check if user is part of this transaction
    if (transaction.sellerId !== user.uid && transaction.buyerId !== user.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json(transaction);
  } catch (error) {
    console.error('Fetch transaction error:', error);
    return NextResponse.json({ error: 'Failed to fetch transaction' }, { status: 500 });
  }
}

// DELETE - Cancel a transaction (only if pending)
export async function DELETE(request, { params }) {
  try {
    const user = await verifyAuthToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const transaction = await db.transaction.findUnique({
      where: { id: params.id },
      include: {
        listing: true,
        conversation: true
      }
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Check if user is part of this transaction
    if (transaction.sellerId !== user.uid && transaction.buyerId !== user.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Can only cancel pending transactions
    if (transaction.status !== 'PENDING') {
      return NextResponse.json({ error: 'Cannot cancel this transaction' }, { status: 400 });
    }

    // Update transaction status
    await db.transaction.update({
      where: { id: params.id },
      data: { 
        status: 'CANCELLED',
        updatedAt: new Date()
      }
    });

    // Update conversation status back to active
    await db.conversation.update({
      where: { id: transaction.conversationId },
      data: { status: 'ACTIVE' }
    });

    // Add cancellation message to Firestore
    const conversationRef = firestore.collection('conversations').doc(transaction.conversationId);
    const systemMessage = {
      id: `sys_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: 'Transaction has been cancelled.',
      senderId: 'system',
      receiverId: 'system',
      createdAt: new Date(),
      isRead: true,
      type: 'REGULAR'
    };

    await firestore.runTransaction(async (firestoreTransaction) => {
      const conversationDoc = await firestoreTransaction.get(conversationRef);
      
      if (conversationDoc.exists) {
        const currentData = conversationDoc.data();
        const currentMessages = currentData.messages || [];
        
        firestoreTransaction.update(conversationRef, {
          messages: [...currentMessages, systemMessage],
          transactionStatus: 'CANCELLED',
          transactionId: null,
          updatedAt: FieldValue.serverTimestamp()
        });
      }
    });

    return NextResponse.json({ message: 'Transaction cancelled successfully' });
  } catch (error) {
    console.error('Cancel transaction error:', error);
    return NextResponse.json({ error: 'Failed to cancel transaction' }, { status: 500 });
  }
}
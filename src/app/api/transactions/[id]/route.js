// src/app/api/transactions/[id]/route.js
import { NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import { verifyAuthToken } from '@/app/lib/auth-helpers';

// GET a specific transaction
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
        buyer: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        seller: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Check if user is part of this transaction
    if (transaction.buyerId !== user.uid && transaction.sellerId !== user.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json(transaction);
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Failed to fetch transaction' }, { status: 500 });
  }
}

// PATCH - Update transaction (confirm or cancel)
export async function PATCH(request, { params }) {
  try {
    const user = await verifyAuthToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, notes } = await request.json();

    // Get the transaction
    const transaction = await db.transaction.findUnique({
      where: { id: params.id }
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Check if user is part of this transaction
    const isBuyer = transaction.buyerId === user.uid;
    const isSeller = transaction.sellerId === user.uid;

    if (!isBuyer && !isSeller) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    let updateData = {};

    if (action === 'confirm') {
      // Handle confirmation
      if (isBuyer) {
        if (transaction.buyerConfirmedAt) {
          return NextResponse.json({ error: 'Already confirmed by buyer' }, { status: 400 });
        }
        updateData.buyerConfirmedAt = new Date();
      } else if (isSeller) {
        if (transaction.sellerConfirmedAt) {
          return NextResponse.json({ error: 'Already confirmed by seller' }, { status: 400 });
        }
        updateData.sellerConfirmedAt = new Date();
      }

      // Check if both parties have confirmed
      const bothConfirmed =
        (isBuyer && transaction.sellerConfirmedAt) ||
        (isSeller && transaction.buyerConfirmedAt);

      if (bothConfirmed) {
        updateData.status = 'CONFIRMED';
        updateData.completedAt = new Date();

        // Also update the listing status to SOLD
        await db.listing.update({
          where: { id: transaction.listingId },
          data: { status: 'SOLD' }
        });
      }
    } else if (action === 'cancel') {
      // Handle cancellation
      if (transaction.status === 'CONFIRMED') {
        return NextResponse.json({ error: 'Cannot cancel confirmed transaction' }, { status: 400 });
      }

      updateData.status = 'CANCELLED';
      updateData.cancelledAt = new Date();
      if (notes) {
        updateData.notes = notes;
      }
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Update the transaction
    const updatedTransaction = await db.transaction.update({
      where: { id: params.id },
      data: updateData,
      include: {
        listing: {
          include: {
            category: true
          }
        },
        buyer: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        seller: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    });

    return NextResponse.json(updatedTransaction);
  } catch (error) {
    console.error('Update transaction error:', error);
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 });
  }
}
// src/app/api/transactions/route.js
import { NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import { verifyAuthToken } from '@/app/lib/auth-helpers';

// GET all transactions for a user
export async function GET(request) {
  try {
    const user = await verifyAuthToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'buyer', 'seller', or 'all'

    let whereClause = {};
    if (type === 'buyer') {
      whereClause = { buyerId: user.uid };
    } else if (type === 'seller') {
      whereClause = { sellerId: user.uid };
    } else {
      whereClause = {
        OR: [
          { buyerId: user.uid },
          { sellerId: user.uid }
        ]
      };
    }

    const transactions = await db.transaction.findMany({
      where: whereClause,
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
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}

// POST - Create a new transaction
export async function POST(request) {
  try {
    const user = await verifyAuthToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { listingId, buyerId } = await request.json();

    // Verify the listing exists and get its details
    const listing = await db.listing.findUnique({
      where: { id: listingId },
      include: {
        user: true
      }
    });

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    // Check if the user is either the buyer or seller
    const isSeller = user.uid === listing.userId;
    const isBuyer = user.uid === buyerId;

    if (!isSeller && !isBuyer) {
      return NextResponse.json({ error: 'Unauthorized to create this transaction' }, { status: 403 });
    }

    // Check if a transaction already exists for this listing
    const existingTransaction = await db.transaction.findUnique({
      where: { listingId }
    });

    if (existingTransaction) {
      return NextResponse.json({ error: 'Transaction already exists for this listing' }, { status: 400 });
    }

    // Create the transaction
    const transaction = await db.transaction.create({
      data: {
        listingId,
        sellerId: listing.userId,
        buyerId,
        finalPrice: listing.price,
        status: 'PENDING',
        // If the current user is initiating, mark their confirmation
        ...(isSeller ? { sellerConfirmedAt: new Date() } : {}),
        ...(isBuyer ? { buyerConfirmedAt: new Date() } : {})
      },
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

    return NextResponse.json(transaction);
  } catch (error) {
    console.error('Create transaction error:', error);
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
  }
}
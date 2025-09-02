// src/app/api/transactions/check/route.js
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
    const buyerId = searchParams.get('buyerId');

    if (!listingId) {
      return NextResponse.json({ error: 'Listing ID is required' }, { status: 400 });
    }

    // Find transaction for this listing
    const transaction = await db.transaction.findFirst({
      where: {
        listingId,
        ...(buyerId ? { buyerId } : {})
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

    if (!transaction) {
      return NextResponse.json({ exists: false });
    }

    // Check if user is part of this transaction
    if (transaction.buyerId !== user.uid && transaction.sellerId !== user.uid) {
      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({
      exists: true,
      transaction
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Failed to check transaction' }, { status: 500 });
  }
}
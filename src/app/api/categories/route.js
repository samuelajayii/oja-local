// src/app/api/categories/route.js
import { NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import { CacheManager } from '@/app/lib/redis';

export async function GET() {
  try {
    const cacheKey = CacheManager.keys.categories();

    // Try to get from cache first
    const cachedCategories = await CacheManager.get(cacheKey);
    if (cachedCategories) {
      console.log('Returning cached categories');
      return NextResponse.json(cachedCategories);
    }

    const categories = await db.category.findMany({
      orderBy: { name: 'asc' }
    });

    // Cache categories for 30 minutes (1800 seconds) - categories don't change often
    await CacheManager.set(cacheKey, categories, 1800);

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}
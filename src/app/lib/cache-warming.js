// src/app/lib/cache-warming.js
import { db } from '@/app/lib/db';
import { CacheManager } from '@/app/lib/redis';

export class CacheWarming {
  // Warm up categories cache (run this on app startup or periodically)
  static async warmCategories() {
    try {
      const categories = await db.category.findMany({
        orderBy: { name: 'asc' }
      });

      await CacheManager.set(CacheManager.keys.categories(), categories, 1800);
      console.log('Categories cache warmed');
    } catch (error) {
      console.error('Error warming categories cache:', error);
    }
  }

  // Warm up popular listings cache
  static async warmPopularListings() {
    try {
      const popularListings = await db.listing.findMany({
        where: { status: 'ACTIVE' },
        include: {
          user: {
            select: { id: true, name: true, avatar: true }
          },
          category: {
            select: { id: true, name: true, slug: true }
          },
          _count: {
            select: { conversations: true, favorites: true }
          }
        },
        orderBy: [
          { favorites: { _count: 'desc' } },
          { conversations: { _count: 'desc' } },
          { createdAt: 'desc' }
        ],
        take: 50 // Cache top 50 popular listings
      });

      // Cache individual listings
      for (const listing of popularListings) {
        await CacheManager.set(
          CacheManager.keys.listing(listing.id),
          listing,
          600
        );
      }

      // Cache the popular listings query
      await CacheManager.set(
        'listings:popular',
        popularListings,
        300
      );

      console.log(`Warmed ${popularListings.length} popular listings`);
    } catch (error) {
      console.error('Error warming popular listings cache:', error);
    }
  }

  // Warm up recent listings cache
  static async warmRecentListings() {
    try {
      const recentListings = await db.listing.findMany({
        where: { status: 'ACTIVE' },
        include: {
          user: {
            select: { id: true, name: true, avatar: true }
          },
          category: {
            select: { id: true, name: true, slug: true }
          },
          _count: {
            select: { conversations: true, favorites: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      });

      // Cache the default listings query (no search, no category filter)
      const defaultCacheKey = CacheManager.keys.listings({});
      await CacheManager.set(defaultCacheKey, recentListings, 300);

      console.log(`Warmed ${recentListings.length} recent listings`);
    } catch (error) {
      console.error('Error warming recent listings cache:', error);
    }
  }

  // Run all warming functions
  static async warmAll() {
    console.log('Starting cache warming...');

    await Promise.all([
      this.warmCategories(),
      this.warmPopularListings(),
      this.warmRecentListings()
    ]);

    console.log('Cache warming completed');
  }

  // Schedule periodic cache warming (call this in your app startup)
  static scheduleWarming() {
    // Warm cache every 10 minutes
    setInterval(() => {
      this.warmAll();
    }, 10 * 60 * 1000);

    // Initial warming
    this.warmAll();
  }
}

// Usage: Add this to your app startup (e.g., in layout.js or a separate startup script)
// CacheWarming.scheduleWarming();
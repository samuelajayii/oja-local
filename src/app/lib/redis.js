// src/app/lib/redis.js
import { createClient } from 'redis';

let client = null;

export const getRedisClient = async () => {
  if (!client) {
    client = createClient({
      socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT || 6379,
      },
      // Add password if your Redis instance requires authentication
      password: process.env.REDIS_PASSWORD || undefined,
    });

    client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    client.on('connect', () => {
      console.log('Connected to Redis');
    });

    await client.connect();
  }

  return client;
};

// Cache helper functions
export class CacheManager {
  static async get(key) {
    try {
      const redis = await getRedisClient();
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  }

  static async set(key, data, ttl = 300) { // Default 5 minutes TTL
    try {
      const redis = await getRedisClient();
      await redis.setEx(key, ttl, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Redis SET error:', error);
      return false;
    }
  }

  static async del(key) {
    try {
      const redis = await getRedisClient();
      await redis.del(key);
      return true;
    } catch (error) {
      console.error('Redis DEL error:', error);
      return false;
    }
  }

  static async delPattern(pattern) {
    try {
      const redis = await getRedisClient();
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(keys);
      }
      return true;
    } catch (error) {
      console.error('Redis DEL pattern error:', error);
      return false;
    }
  }

  static async exists(key) {
    try {
      const redis = await getRedisClient();
      return await redis.exists(key);
    } catch (error) {
      console.error('Redis EXISTS error:', error);
      return false;
    }
  }

  // Increment counter (useful for rate limiting)
  static async incr(key, ttl = 3600) {
    try {
      const redis = await getRedisClient();
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, ttl);
      }
      return count;
    } catch (error) {
      console.error('Redis INCR error:', error);
      return 0;
    }
  }

  // Cache keys generators
  static keys = {
    listing: (id) => `listing:${id}`,
    listings: (params) => {
      const search = params.search || '';
      const category = params.category || '';
      const userId = params.userId || '';
      return `listings:search:${search}:category:${category}:user:${userId}`;
    },
    userListings: (userId) => `user:${userId}:listings`,
    conversation: (conversationId) => `conversation:${conversationId}`,
    userConversations: (userId) => `user:${userId}:conversations`,
    messages: (conversationId) => `messages:${conversationId}`,
    user: (id) => `user:${id}`,
    categories: () => 'categories',
    favorites: (userId) => `user:${userId}:favorites`,
  };
}
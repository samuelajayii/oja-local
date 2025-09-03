// src/app/api/admin/cache-stats/route.js
import { NextResponse } from 'next/server';
import { getRedisClient } from '@/app/lib/redis';
import { verifyAuthToken } from '@/app/lib/auth-helpers';

export async function GET(request) {
    try {
        const user = await verifyAuthToken(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Add admin check here if needed
        // if (!user.isAdmin) {
        //     return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        // }

        const redis = await getRedisClient();
        
        // Get Redis info
        const info = await redis.info();
        const dbSize = await redis.dbSize();
        
        // Get memory usage
        const memoryInfo = await redis.info('memory');
        
        // Parse relevant stats
        const stats = {
            connected: true,
            totalKeys: dbSize,
            memoryUsage: extractMemoryStats(memoryInfo),
            serverInfo: extractServerStats(info),
            timestamp: new Date().toISOString()
        };

        // Get sample keys by pattern
        const sampleKeys = {
            listings: await redis.keys('listings:*'),
            users: await redis.keys('user:*'),
            conversations: await redis.keys('conversation:*'),
            messages: await redis.keys('messages:*'),
            categories: await redis.keys('categories*'),
            favorites: await redis.keys('*favorites*')
        };

        stats.keysByType = Object.fromEntries(
            Object.entries(sampleKeys).map(([type, keys]) => [type, keys.length])
        );

        return NextResponse.json(stats);
    } catch (error) {
        console.error('Cache stats error:', error);
        return NextResponse.json({ 
            error: 'Failed to get cache stats',
            connected: false,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}

function extractMemoryStats(memoryInfo) {
    const lines = memoryInfo.split('\r\n');
    const stats = {};
    
    for (const line of lines) {
        if (line.includes('used_memory_human:')) {
            stats.usedMemory = line.split(':')[1];
        }
        if (line.includes('used_memory_peak_human:')) {
            stats.peakMemory = line.split(':')[1];
        }
        if (line.includes('used_memory_rss_human:')) {
            stats.rssMemory = line.split(':')[1];
        }
    }
    
    return stats;
}

function extractServerStats(info) {
    const lines = info.split('\r\n');
    const stats = {};
    
    for (const line of lines) {
        if (line.includes('redis_version:')) {
            stats.version = line.split(':')[1];
        }
        if (line.includes('uptime_in_seconds:')) {
            stats.uptimeSeconds = parseInt(line.split(':')[1]);
        }
        if (line.includes('connected_clients:')) {
            stats.connectedClients = parseInt(line.split(':')[1]);
        }
        if (line.includes('total_commands_processed:')) {
            stats.totalCommands = parseInt(line.split(':')[1]);
        }
    }
    
    return stats;
}

// Cache invalidation endpoint
export async function DELETE(request) {
    try {
        const user = await verifyAuthToken(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const pattern = searchParams.get('pattern') || '*';

        const redis = await getRedisClient();
        const keys = await redis.keys(pattern);
        
        if (keys.length > 0) {
            await redis.del(keys);
        }

        return NextResponse.json({ 
            message: `Cleared ${keys.length} cache keys`,
            pattern,
            keysCleared: keys.length
        });
    } catch (error) {
        console.error('Cache clear error:', error);
        return NextResponse.json({ error: 'Failed to clear cache' }, { status: 500 });
    }
}
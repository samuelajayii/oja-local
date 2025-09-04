// src/app/api/listings/route.js
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/app/lib/db'
import { verifyAuthToken } from '@/app/lib/auth-helpers'
import { deleteImage } from '@/app/lib/storage';
import { CacheManager } from '@/app/lib/redis';
import { 
  checkContentSafety, 
  getCategorySuggestions, 
  extractProductDetails,
  processImageAnalysis,
  batchProcessImageAnalyses
} from '@/app/lib/server-enhanced-upload-utility'; // Changed from enhanced-upload-utility to server-enhanced-upload-utility

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const category = searchParams.get('category');
        const userId = searchParams.get('userId');
        const contentStatus = searchParams.get('contentStatus') || 'APPROVED'; // Only show approved by default

        // Generate cache key
        const cacheKey = CacheManager.keys.listings({ search, category, userId, contentStatus });
        
        // Try to get from cache first (with error handling)
        let cachedListings;
        try {
            cachedListings = await CacheManager.get(cacheKey);
            if (cachedListings) {
                console.log('Returning cached listings');
                return NextResponse.json(cachedListings);
            }
        } catch (cacheError) {
            console.warn('Cache error, proceeding with database query:', cacheError);
        }

        const whereClause = {
            AND: [
                { status: 'ACTIVE' },
                { contentStatus }, // Filter by content moderation status
                search ? {
                    OR: [
                        { title: { contains: search, mode: 'insensitive' } },
                        { description: { contains: search, mode: 'insensitive' } },
                        { extractedText: { contains: search, mode: 'insensitive' } } // Search in extracted text too
                    ]
                } : {},
                category ? { categoryId: category } : {},
                userId ? { userId } : {}
            ]
        };

        const listings = await db.listing.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true
                    }
                },
                category: {
                    select: {
                        id: true,
                        name: true,
                        slug: true
                    }
                },
                _count: {
                    select: {
                        conversations: true,
                        favorites: true
                    }
                },
                imageAnalyses: {
                    select: {
                        analysisType: true,
                        safeContent: true,
                        needsReview: true,
                        confidenceScore: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Try to cache the results for 5 minutes (300 seconds)
        try {
            await CacheManager.set(cacheKey, listings, 300);
            console.log('Cached fresh listings data');
        } catch (cacheError) {
            console.warn('Failed to cache results:', cacheError);
        }
        
        return NextResponse.json(listings);
    } catch (error) {
        console.error('Database error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch listings' },
            { status: 500 }
        );
    }
}

export async function POST(request) {
    try {
        const user = await verifyAuthToken(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data = await request.json();
        const { imageAnalysis = [], ...listingData } = data;

        // Ensure user exists in PostgreSQL database (fallback creation if needed)
        let dbUser = await db.user.findUnique({
            where: { id: user.uid }
        });

        if (!dbUser) {
            console.log('User not found in PostgreSQL, creating...');
            dbUser = await db.user.create({
                data: {
                    id: user.uid,
                    email: user.email,
                    name: user.name || user.email.split('@')[0],
                    avatar: user.picture
                }
            });
        }

        // Process Vision API analysis results using server-side utilities
        let contentStatus = 'APPROVED';
        let extractedText = '';
        let moderationFlags = [];
        let aiCategoryConfidence = null;
        let visionAnalysis = null;
        let detectedBrands = [];
        let suggestedPrice = null;
        let specifications = [];

        if (imageAnalysis && imageAnalysis.length > 0) {
            console.log('Processing image analysis results:', imageAnalysis.length);
            
            // Store the raw vision analysis
            visionAnalysis = {
                totalImages: imageAnalysis.length,
                analysisTimestamp: new Date().toISOString(),
                results: imageAnalysis
            };

            // Process using batch analysis
            const batchResults = batchProcessImageAnalyses(imageAnalysis);
            
            // Set content status based on batch results
            if (!batchResults.overallSafe) {
                contentStatus = 'REJECTED';
                console.log('Content rejected due to safety concerns');
            } else if (batchResults.needsReview) {
                contentStatus = 'PENDING_REVIEW';
                console.log('Content flagged for review');
            }

            // Extract processed data
            extractedText = batchResults.combinedText;
            moderationFlags = batchResults.allModerationFlags;
            aiCategoryConfidence = batchResults.bestCategoryConfidence > 0 ? batchResults.bestCategoryConfidence : null;
            detectedBrands = batchResults.allDetectedBrands;
            suggestedPrice = batchResults.bestSuggestedPrice;
            specifications = batchResults.allSpecifications;

            console.log('Processed analysis:', {
                contentStatus,
                extractedTextLength: extractedText.length,
                moderationFlags: moderationFlags.length,
                aiCategoryConfidence,
                detectedBrands: detectedBrands.length
            });
        }

        // Create the listing with Vision API data
        const listing = await db.listing.create({
            data: {
                title: listingData.title,
                description: listingData.description,
                price: listingData.price ? parseFloat(listingData.price) : null,
                images: listingData.images || [],
                location: listingData.location,
                userId: user.uid,
                categoryId: listingData.categoryId,
                
                // Vision API fields
                visionAnalysis,
                contentStatus,
                extractedText: extractedText || null,
                aiCategoryConfidence: aiCategoryConfidence,
                moderationFlags,
                
                // Additional processed fields for easier querying
                detectedBrands: detectedBrands.length > 0 ? detectedBrands : null,
                suggestedPrice: suggestedPrice,
                specifications: specifications.length > 0 ? specifications : null
            },
            include: {
                user: {
                    select: { id: true, name: true, avatar: true }
                },
                category: true,
                _count: {
                    select: {
                        conversations: true,
                        favorites: true
                    }
                }
            }
        });

        // Create detailed image analysis records
        if (imageAnalysis && imageAnalysis.length > 0 && listingData.images) {
            const imageAnalysisRecords = [];
            
            for (let i = 0; i < Math.min(imageAnalysis.length, listingData.images.length); i++) {
                const analysis = imageAnalysis[i];
                const imageUrl = listingData.images[i];
                
                if (analysis && imageUrl) {
                    // Process individual analysis for this image
                    const processedAnalysis = processImageAnalysis(analysis);
                    
                    imageAnalysisRecords.push({
                        listingId: listing.id,
                        imageUrl,
                        analysisType: 'COMPREHENSIVE',
                        analysisResult: analysis,
                        safeContent: processedAnalysis.contentSafe,
                        needsReview: processedAnalysis.needsReview || false,
                        confidenceScore: processedAnalysis.categoryConfidence || 0
                    });
                }
            }

            if (imageAnalysisRecords.length > 0) {
                await db.imageAnalysis.createMany({
                    data: imageAnalysisRecords
                });
                console.log(`Created ${imageAnalysisRecords.length} image analysis records`);
            }
        }

        // Try to invalidate relevant caches
        try {
            await CacheManager.delPattern('listings:*');
            await CacheManager.del(CacheManager.keys.userListings(user.uid));
            console.log('Cache invalidated successfully');
        } catch (cacheError) {
            console.warn('Failed to invalidate cache:', cacheError);
        }

        // Send notification if content needs review
        if (contentStatus === 'PENDING_REVIEW') {
            console.log(`Listing ${listing.id} flagged for review:`, moderationFlags);
        } else if (contentStatus === 'REJECTED') {
            console.log(`Listing ${listing.id} rejected due to unsafe content:`, moderationFlags);
        }

        return NextResponse.json({
            ...listing,
            contentStatus,
            needsReview: contentStatus === 'PENDING_REVIEW',
            moderationFlags,
            detectedBrands,
            extractedText: extractedText || null
        });
    } catch (error) {
        console.error('Create listing error:', error);
        console.error('Error stack:', error.stack);
        return NextResponse.json(
            { error: 'Failed to create listing', details: error.message },
            { status: 500 }
        );
    }
}

// New endpoint for content moderation review
export async function PATCH(request) {
    try {
        const user = await verifyAuthToken(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // This would be used by moderators/admins to review flagged content
        const { listingId, action, reason } = await request.json();
        
        if (!listingId || !action) {
            return NextResponse.json({ error: 'Listing ID and action required' }, { status: 400 });
        }

        // Check if user has moderation permissions (you'd implement this based on your user roles)
        const canModerate = await checkModerationPermissions(user.uid);
        if (!canModerate) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        let newStatus;
        switch (action) {
            case 'approve':
                newStatus = 'APPROVED';
                break;
            case 'reject':
                newStatus = 'REJECTED';
                break;
            case 'flag':
                newStatus = 'FLAGGED';
                break;
            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        const updatedListing = await db.listing.update({
            where: { id: listingId },
            data: {
                contentStatus: newStatus,
                moderationFlags: reason ? { push: reason } : undefined
            },
            include: {
                user: {
                    select: { id: true, name: true, avatar: true }
                },
                category: true
            }
        });

        // Try to invalidate caches
        try {
            await CacheManager.delPattern('listings:*');
        } catch (cacheError) {
            console.warn('Failed to invalidate cache:', cacheError);
        }
        
        // Create notification for listing owner
        try {
            await db.notification.create({
                data: {
                    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    type: 'CONTENT_FLAGGED',
                    title: 'Listing Content Review',
                    message: `Your listing "${updatedListing.title}" has been ${action}ed${reason ? `: ${reason}` : '.'}`,
                    userId: updatedListing.userId,
                    listingId: listingId,
                    updatedAt: new Date()
                }
            });
        } catch (notificationError) {
            console.warn('Failed to create notification:', notificationError);
        }

        return NextResponse.json({
            success: true,
            listing: updatedListing,
            action,
            reason
        });
    } catch (error) {
        console.error('Content moderation error:', error);
        return NextResponse.json(
            { error: 'Failed to update listing status' },
            { status: 500 }
        );
    }
}

// Helper function to check moderation permissions
async function checkModerationPermissions(userId) {
    try {
        // Check if user has admin/moderator role
        const user = await db.user.findUnique({
            where: { id: userId },
            select: { role: true }
        });
        
        return user?.role === 'ADMIN' || user?.role === 'MODERATOR';
    } catch (error) {
        console.error('Error checking moderation permissions:', error);
        return false;
    }
}
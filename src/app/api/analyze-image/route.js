// src/app/api/analyze-image/route.js
import { NextResponse } from 'next/server';
import { verifyAuthToken } from '@/app/lib/auth-helpers';
import { analyzeImage, moderateImage, extractTextFromImage, categorizeProduct } from '@/app/lib/vision-api';

export async function POST(request) {
  try {
    const user = await verifyAuthToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { imageUrl, analysisType = 'comprehensive' } = data;

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    }

    let result;

    switch (analysisType) {
      case 'moderation':
        result = await moderateImage(imageUrl);
        break;
      case 'text':
        result = await extractTextFromImage(imageUrl);
        break;
      case 'categorization':
        result = await categorizeProduct(imageUrl);
        break;
      case 'comprehensive':
      default:
        result = await analyzeImage(imageUrl);
        break;
    }

    // Add analysis metadata
    result.imageUrl = imageUrl;
    result.analyzedAt = new Date().toISOString();
    result.userId = user.uid;

    return NextResponse.json(result);
  } catch (error) {
    console.error('Image analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze image', details: error.message },
      { status: 500 }
    );
  }
}

// Batch analysis endpoint
export async function PUT(request) {
  try {
    const user = await verifyAuthToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { imageUrls, analysisType = 'moderation' } = data;

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json({ error: 'Image URLs array is required' }, { status: 400 });
    }

    // Limit batch size to prevent timeouts
    if (imageUrls.length > 10) {
      return NextResponse.json({ error: 'Maximum 10 images per batch' }, { status: 400 });
    }

    const results = [];

    for (const imageUrl of imageUrls) {
      try {
        let analysis;

        switch (analysisType) {
          case 'moderation':
            analysis = await moderateImage(imageUrl);
            break;
          case 'text':
            analysis = await extractTextFromImage(imageUrl);
            break;
          case 'categorization':
            analysis = await categorizeProduct(imageUrl);
            break;
          case 'comprehensive':
          default:
            analysis = await analyzeImage(imageUrl);
            break;
        }

        results.push({
          imageUrl,
          success: true,
          analysis
        });
      } catch (error) {
        results.push({
          imageUrl,
          success: false,
          error: error.message
        });
      }
    }

    return NextResponse.json({
      results,
      totalAnalyzed: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      analyzedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Batch image analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze images', details: error.message },
      { status: 500 }
    );
  }
}
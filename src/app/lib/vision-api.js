// src/app/lib/vision-api.js
import { ImageAnnotatorClient } from '@google-cloud/vision';

// Initialize Vision API client
let visionClient;

if (process.env.NODE_ENV === 'production') {
  // In production (Cloud Run), use the service account attached to the instance
  visionClient = new ImageAnnotatorClient({
    projectId: process.env.NEXT_PUBLIC_PROJECT_ID || 'oja-local'
  });
} else {
  // In development, use explicit credentials
  try {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_VISION) {
      visionClient = new ImageAnnotatorClient({
        projectId: process.env.NEXT_PUBLIC_PROJECT_ID || 'oja-local',
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS_VISION,
      });
    } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY
        .replace(/\\n/g, '\n')
        .replace(/^"/, '')
        .replace(/"$/, '');

      visionClient = new ImageAnnotatorClient({
        projectId: process.env.NEXT_PUBLIC_PROJECT_ID || 'oja-local',
        credentials: {
          client_email: process.env.FIREBASE_CLIENT_EMAIL,
          private_key: privateKey,
        }
      });
    } else {
      visionClient = new ImageAnnotatorClient({
        projectId: process.env.NEXT_PUBLIC_PROJECT_ID || 'oja-local'
      });
    }
  } catch (error) {
    console.error('Vision API initialization error:', error);
    visionClient = new ImageAnnotatorClient({
      projectId: process.env.NEXT_PUBLIC_PROJECT_ID || 'oja-local'
    });
  }
}

// Safe content levels for marketplace
const SAFE_CONTENT_LEVELS = {
  VERY_UNLIKELY: 'SAFE',
  UNLIKELY: 'SAFE',
  POSSIBLE: 'REVIEW',
  LIKELY: 'UNSAFE',
  VERY_LIKELY: 'UNSAFE'
};

// Category mapping from Vision API labels to your marketplace categories
const CATEGORY_MAPPING = {
  // Electronics
  'mobile phone': 'electronics',
  'smartphone': 'electronics',
  'laptop': 'electronics',
  'computer': 'electronics',
  'camera': 'electronics',
  'headphones': 'electronics',
  'television': 'electronics',
  'tablet': 'electronics',
  'gaming console': 'gaming',
  'video game': 'gaming',

  // Clothing
  'clothing': 'clothing',
  'shirt': 'clothing',
  'dress': 'clothing',
  'shoes': 'clothing',
  'jacket': 'clothing',
  'pants': 'clothing',
  'hat': 'clothing',
  'bag': 'clothing',
  'watch': 'jewelries',
  'jewelry': 'jewelries',
  'necklace': 'jewelries',
  'ring': 'jewelries',

  // Furniture & Home
  'furniture': 'furniture',
  'chair': 'furniture',
  'table': 'furniture',
  'sofa': 'furniture',
  'bed': 'furniture',
  'bookshelf': 'furniture',
  'lamp': 'home-garden',
  'plant': 'home-garden',
  'kitchen': 'home-garden',
  'appliance': 'home-garden',

  // Vehicles
  'car': 'vehicles',
  'motorcycle': 'vehicles',
  'bicycle': 'vehicles',
  'truck': 'vehicles',

  // Sports
  'sports equipment': 'sports',
  'football': 'sports',
  'basketball': 'sports',
  'tennis': 'sports',
  'bicycle': 'sports',
  'gym equipment': 'sports',

  // Toys
  'toy': 'toys',
  'doll': 'toys',
  'game': 'toys',
  'puzzle': 'toys',
  'lego': 'toys'
};

/**
 * Analyze image for content moderation
 * @param {string|Buffer} imageSource - Image URL or buffer
 * @returns {Object} Moderation results
 */
export async function moderateImage(imageSource) {
  try {
    const request = {
      image: typeof imageSource === 'string' ?
        { source: { imageUri: imageSource } } :
        { content: imageSource }
    };

    const [result] = await visionClient.safeSearchDetection(request);
    const detections = result.safeSearchAnnotation;

    if (!detections) {
      return { safe: true, reason: 'No detections found' };
    }

    // Check each safety category
    const checks = {
      adult: SAFE_CONTENT_LEVELS[detections.adult] || 'UNKNOWN',
      spoof: SAFE_CONTENT_LEVELS[detections.spoof] || 'UNKNOWN',
      medical: SAFE_CONTENT_LEVELS[detections.medical] || 'UNKNOWN',
      violence: SAFE_CONTENT_LEVELS[detections.violence] || 'UNKNOWN',
      racy: SAFE_CONTENT_LEVELS[detections.racy] || 'UNKNOWN'
    };

    // Determine if image is safe
    const unsafeCategories = Object.entries(checks)
      .filter(([_, level]) => level === 'UNSAFE')
      .map(([category, _]) => category);

    const reviewCategories = Object.entries(checks)
      .filter(([_, level]) => level === 'REVIEW')
      .map(([category, _]) => category);

    const safe = unsafeCategories.length === 0;
    const needsReview = reviewCategories.length > 0;

    return {
      safe,
      needsReview,
      checks,
      unsafeCategories,
      reviewCategories,
      rawDetections: detections
    };
  } catch (error) {
    console.error('Image moderation error:', error);
    return {
      safe: false,
      error: error.message,
      needsManualReview: true
    };
  }
}

/**
 * Extract text from image using OCR
 * @param {string|Buffer} imageSource - Image URL or buffer
 * @returns {Object} Extracted text and metadata
 */
export async function extractTextFromImage(imageSource) {
  try {
    const request = {
      image: typeof imageSource === 'string' ?
        { source: { imageUri: imageSource } } :
        { content: imageSource }
    };

    const [result] = await visionClient.textDetection(request);
    const detections = result.textAnnotations;

    if (!detections || detections.length === 0) {
      return { text: '', hasText: false };
    }

    // First annotation contains all detected text
    const fullText = detections[0].description;

    // Individual text blocks for more detailed analysis
    const textBlocks = detections.slice(1).map(detection => ({
      text: detection.description,
      confidence: detection.score,
      boundingBox: detection.boundingPoly
    }));

    // Extract potential product information
    const productInfo = extractProductInfo(fullText);

    return {
      hasText: true,
      fullText,
      textBlocks,
      productInfo,
      rawDetections: detections
    };
  } catch (error) {
    console.error('Text extraction error:', error);
    return {
      hasText: false,
      text: '',
      error: error.message
    };
  }
}

/**
 * Categorize product based on visual content
 * @param {string|Buffer} imageSource - Image URL or buffer
 * @returns {Object} Suggested categories and confidence scores
 */
export async function categorizeProduct(imageSource) {
  try {
    const request = {
      image: typeof imageSource === 'string' ?
        { source: { imageUri: imageSource } } :
        { content: imageSource },
      features: [
        { type: 'LABEL_DETECTION', maxResults: 20 },
        { type: 'OBJECT_LOCALIZATION', maxResults: 10 }
      ]
    };

    const [result] = await visionClient.annotateImage(request);

    // Process label detections
    const labels = result.labelAnnotations || [];
    const objects = result.localizedObjectAnnotations || [];

    // Find matching categories
    const categoryMatches = [];

    // Check labels
    labels.forEach(label => {
      const labelText = label.description.toLowerCase();
      const score = label.score;

      Object.entries(CATEGORY_MAPPING).forEach(([keyword, category]) => {
        if (labelText.includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(labelText)) {
          categoryMatches.push({
            category,
            confidence: score,
            source: 'label',
            match: keyword,
            originalLabel: label.description
          });
        }
      });
    });

    // Check objects
    objects.forEach(obj => {
      const objectName = obj.name.toLowerCase();
      const score = obj.score;

      Object.entries(CATEGORY_MAPPING).forEach(([keyword, category]) => {
        if (objectName.includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(objectName)) {
          categoryMatches.push({
            category,
            confidence: score,
            source: 'object',
            match: keyword,
            originalLabel: obj.name
          });
        }
      });
    });

    // Group by category and calculate average confidence
    const categoryScores = {};
    categoryMatches.forEach(match => {
      if (!categoryScores[match.category]) {
        categoryScores[match.category] = {
          category: match.category,
          totalScore: 0,
          count: 0,
          matches: []
        };
      }
      categoryScores[match.category].totalScore += match.confidence;
      categoryScores[match.category].count += 1;
      categoryScores[match.category].matches.push(match);
    });

    // Calculate average scores and sort
    const suggestions = Object.values(categoryScores)
      .map(cat => ({
        category: cat.category,
        confidence: cat.totalScore / cat.count,
        matchCount: cat.count,
        matches: cat.matches
      }))
      .sort((a, b) => b.confidence - a.confidence);

    return {
      suggestions: suggestions.slice(0, 5), // Top 5 suggestions
      allLabels: labels.map(l => ({ label: l.description, score: l.score })),
      allObjects: objects.map(o => ({ object: o.name, score: o.score })),
      hasMatches: suggestions.length > 0
    };
  } catch (error) {
    console.error('Product categorization error:', error);
    return {
      suggestions: [],
      hasMatches: false,
      error: error.message
    };
  }
}

/**
 * Comprehensive image analysis combining all features
 * @param {string|Buffer} imageSource - Image URL or buffer
 * @returns {Object} Complete analysis results
 */
export async function analyzeImage(imageSource) {
  try {
    const [moderation, textExtraction, categorization] = await Promise.all([
      moderateImage(imageSource),
      extractTextFromImage(imageSource),
      categorizeProduct(imageSource)
    ]);

    return {
      moderation,
      textExtraction,
      categorization,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Comprehensive image analysis error:', error);
    return {
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Extract product information from detected text
 * @param {string} text - Detected text
 * @returns {Object} Extracted product information
 */
function extractProductInfo(text) {
  const info = {
    prices: [],
    brands: [],
    models: [],
    specifications: []
  };

  if (!text) return info;

  // Price patterns
  const pricePatterns = [
    /\$[\d,]+\.?\d*/g,
    /₦[\d,]+\.?\d*/g,
    /\b\d+[\.,]\d{2}\b/g
  ];

  pricePatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      info.prices.push(...matches);
    }
  });

  // Common brand patterns (extend based on your marketplace)
  const brandPatterns = [
    /\b(Apple|Samsung|Sony|LG|HP|Dell|Lenovo|Asus|Acer|Canon|Nikon|Microsoft|Google|Amazon|Nike|Adidas|Puma)\b/gi
  ];

  brandPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      info.brands.push(...matches.map(m => m.toLowerCase()));
    }
  });

  // Model numbers (basic pattern)
  const modelPattern = /\b[A-Z0-9]{2,}-[A-Z0-9]{2,}\b/g;
  const modelMatches = text.match(modelPattern);
  if (modelMatches) {
    info.models.push(...modelMatches);
  }

  // Specifications (storage, RAM, etc.)
  const specPatterns = [
    /\b\d+GB\b/gi,
    /\b\d+TB\b/gi,
    /\b\d+MHz\b/gi,
    /\b\d+GHz\b/gi,
    /\b\d+" display\b/gi,
    /\b\d+MP camera\b/gi
  ];

  specPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      info.specifications.push(...matches);
    }
  });

  return info;
}

/**
 * Test Vision API connection
 * @returns {Object} Connection test results
 */
export async function testVisionConnection() {
  try {
    // Test with a simple label detection on a small test image
    const testImageUrl = 'https://storage.googleapis.com/cloud-samples-data/vision/using_curl/sandwich.jpg';

    const [result] = await visionClient.labelDetection({
      image: { source: { imageUri: testImageUrl } }
    });

    return {
      success: true,
      labels: result.labelAnnotations?.slice(0, 3) || [],
      message: 'Vision API connection successful'
    };
  } catch (error) {
    console.error('Vision API connection test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
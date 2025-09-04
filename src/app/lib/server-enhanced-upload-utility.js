// src/app/lib/server-enhanced-upload-utility.js
// Server-side version of enhanced upload utilities

/**
 * Check content safety based on Vision API analysis
 * @param {Object} analysis - Vision API analysis result
 * @returns {Object} Safety assessment
 */
export function checkContentSafety(analysis) {
  if (!analysis) {
    return {
      safe: false,
      needsReview: true,
      unsafeCategories: ['no-analysis'],
      reviewCategories: ['missing-data']
    };
  }

  // Check moderation results from Vision API
  if (analysis.moderation) {
    const { safe, needsReview, unsafeCategories = [], reviewCategories = [] } = analysis.moderation;
    return {
      safe: safe !== false, // Default to true if not explicitly false
      needsReview: needsReview === true,
      unsafeCategories,
      reviewCategories
    };
  }

  // Fallback: check for suspicious content in text or categorization
  let safe = true;
  let needsReview = false;
  const unsafeCategories = [];
  const reviewCategories = [];

  // Check extracted text for inappropriate content
  if (analysis.textExtraction?.fullText) {
    const text = analysis.textExtraction.fullText.toLowerCase();
    const suspiciousWords = [
      'weapon', 'drug', 'illegal', 'stolen', 'fake', 'counterfeit',
      'adult', 'explicit', 'violence', 'harmful'
    ];

    const foundSuspicious = suspiciousWords.some(word => text.includes(word));
    if (foundSuspicious) {
      needsReview = true;
      reviewCategories.push('suspicious-text');
    }
  }

  // Check for adult content in categorization
  if (analysis.categorization?.suggestions) {
    const adultCategories = ['adult', 'explicit', 'inappropriate'];
    const hasAdultContent = analysis.categorization.suggestions.some(
      suggestion => adultCategories.some(cat =>
        suggestion.matches?.some(match =>
          match.originalLabel?.toLowerCase().includes(cat)
        )
      )
    );

    if (hasAdultContent) {
      safe = false;
      unsafeCategories.push('adult-content');
    }
  }

  return {
    safe,
    needsReview,
    unsafeCategories,
    reviewCategories
  };
}

/**
 * Get category suggestions based on Vision API analysis
 * @param {Object} analysis - Vision API analysis result
 * @returns {Array} Category suggestions with confidence scores
 */
export function getCategorySuggestions(analysis) {
  if (!analysis?.categorization?.suggestions) {
    return [];
  }

  return analysis.categorization.suggestions.map(suggestion => ({
    categorySlug: suggestion.category,
    confidence: suggestion.confidence,
    matchCount: suggestion.matchCount,
    source: 'vision-api'
  }));
}

/**
 * Extract product details from Vision API analysis
 * @param {Object} analysis - Vision API analysis result
 * @returns {Object} Extracted product information
 */
export function extractProductDetails(analysis) {
  if (!analysis) {
    return {
      hasProductInfo: false,
      extractedText: '',
      detectedBrands: [],
      suggestedPrice: null,
      specifications: []
    };
  }

  let extractedText = '';
  let detectedBrands = [];
  let suggestedPrice = null;
  let specifications = [];

  // Extract text information
  if (analysis.textExtraction?.fullText) {
    extractedText = analysis.textExtraction.fullText;

    // Extract product info from text
    if (analysis.textExtraction.productInfo) {
      const productInfo = analysis.textExtraction.productInfo;

      // Get brands
      if (productInfo.brands?.length > 0) {
        detectedBrands = [...new Set(productInfo.brands)]; // Remove duplicates
      }

      // Get price (first detected price)
      if (productInfo.prices?.length > 0) {
        suggestedPrice = productInfo.prices[0];
      }

      // Get specifications
      if (productInfo.specifications?.length > 0) {
        specifications = productInfo.specifications;
      }
    }
  }

  // Extract brands from categorization labels
  if (analysis.categorization?.allLabels) {
    const commonBrands = [
      'Apple', 'Samsung', 'Sony', 'LG', 'HP', 'Dell', 'Lenovo',
      'Asus', 'Acer', 'Canon', 'Nikon', 'Microsoft', 'Google',
      'Amazon', 'Nike', 'Adidas', 'Puma', 'BMW', 'Mercedes',
      'Toyota', 'Honda', 'Ford'
    ];

    analysis.categorization.allLabels.forEach(labelObj => {
      const label = labelObj.label || labelObj;
      commonBrands.forEach(brand => {
        if (label.toLowerCase().includes(brand.toLowerCase()) &&
          !detectedBrands.includes(brand)) {
          detectedBrands.push(brand);
        }
      });
    });
  }

  const hasProductInfo = !!(
    extractedText ||
    detectedBrands.length > 0 ||
    suggestedPrice ||
    specifications.length > 0
  );

  return {
    hasProductInfo,
    extractedText,
    detectedBrands,
    suggestedPrice,
    specifications
  };
}

/**
 * Process comprehensive image analysis for server-side use
 * @param {Object} visionAnalysis - Raw Vision API analysis result
 * @returns {Object} Processed analysis suitable for database storage
 */
export function processImageAnalysis(visionAnalysis) {
  if (!visionAnalysis) {
    return {
      contentSafe: false,
      needsReview: true,
      extractedText: '',
      categoryConfidence: 0,
      moderationFlags: ['no-analysis']
    };
  }

  const safety = checkContentSafety(visionAnalysis);
  const categorySuggestions = getCategorySuggestions(visionAnalysis);
  const productDetails = extractProductDetails(visionAnalysis);

  // Get best category confidence
  const bestCategoryConfidence = categorySuggestions.length > 0
    ? Math.max(...categorySuggestions.map(s => s.confidence))
    : 0;

  // Compile moderation flags
  const moderationFlags = [
    ...safety.unsafeCategories,
    ...safety.reviewCategories
  ];

  return {
    contentSafe: safety.safe,
    needsReview: safety.needsReview,
    extractedText: productDetails.extractedText || '',
    categoryConfidence: bestCategoryConfidence,
    moderationFlags,
    detectedBrands: productDetails.detectedBrands,
    suggestedPrice: productDetails.suggestedPrice,
    specifications: productDetails.specifications,
    categorySuggestions: categorySuggestions.slice(0, 3) // Top 3 suggestions
  };
}

/**
 * Batch process multiple image analyses
 * @param {Array} analysisResults - Array of Vision API analysis results
 * @returns {Object} Combined analysis results
 */
export function batchProcessImageAnalyses(analysisResults) {
  if (!analysisResults || analysisResults.length === 0) {
    return {
      overallSafe: false,
      needsReview: true,
      combinedText: '',
      bestCategoryConfidence: 0,
      allModerationFlags: ['no-analysis'],
      allDetectedBrands: [],
      bestSuggestedPrice: null,
      allSpecifications: []
    };
  }

  let overallSafe = true;
  let needsReview = false;
  let combinedText = '';
  let bestCategoryConfidence = 0;
  let allModerationFlags = [];
  let allDetectedBrands = [];
  let bestSuggestedPrice = null;
  let allSpecifications = [];

  // Process each analysis
  for (const analysis of analysisResults) {
    if (!analysis) continue;

    const processed = processImageAnalysis(analysis);

    // Update overall safety
    if (!processed.contentSafe) {
      overallSafe = false;
    }
    if (processed.needsReview) {
      needsReview = true;
    }

    // Combine text
    if (processed.extractedText) {
      combinedText += (combinedText ? ' ' : '') + processed.extractedText;
    }

    // Update best category confidence
    bestCategoryConfidence = Math.max(bestCategoryConfidence, processed.categoryConfidence);

    // Combine flags
    allModerationFlags.push(...processed.moderationFlags);

    // Combine brands
    if (processed.detectedBrands) {
      allDetectedBrands.push(...processed.detectedBrands);
    }

    // Get best price (first non-null price)
    if (!bestSuggestedPrice && processed.suggestedPrice) {
      bestSuggestedPrice = processed.suggestedPrice;
    }

    // Combine specifications
    if (processed.specifications) {
      allSpecifications.push(...processed.specifications);
    }
  }

  // Remove duplicates
  allModerationFlags = [...new Set(allModerationFlags)];
  allDetectedBrands = [...new Set(allDetectedBrands)];
  allSpecifications = [...new Set(allSpecifications)];

  return {
    overallSafe,
    needsReview,
    combinedText: combinedText.trim(),
    bestCategoryConfidence,
    allModerationFlags,
    allDetectedBrands,
    bestSuggestedPrice,
    allSpecifications
  };
}
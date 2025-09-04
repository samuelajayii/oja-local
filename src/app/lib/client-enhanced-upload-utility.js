// src/app/lib/client-enhanced-upload-utility.js
// Client-side version of enhanced upload utilities (mirrors server-side functions)

/**
 * Check content safety based on analysis results (client-side)
 * @param {Object} analysis - Analysis result from upload
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

  // Check moderation results from analysis
  if (analysis.moderation) {
    const { safe, needsReview, unsafeCategories = [], reviewCategories = [] } = analysis.moderation;
    return {
      safe: safe !== false,
      needsReview: needsReview === true,
      unsafeCategories,
      reviewCategories
    };
  }

  // Default to safe for client-side display
  return {
    safe: true,
    needsReview: false,
    unsafeCategories: [],
    reviewCategories: []
  };
}

/**
 * Get category suggestions (client-side)
 * @param {Object} analysis - Analysis result
 * @returns {Array} Category suggestions
 */
export function getCategorySuggestions(analysis) {
  if (!analysis?.categorization?.suggestions) {
    return [];
  }

  return analysis.categorization.suggestions.map(suggestion => ({
    categorySlug: suggestion.category,
    confidence: suggestion.confidence,
    matchCount: suggestion.matchCount || 1,
    source: 'vision-api'
  }));
}

/**
 * Extract product details (client-side)
 * @param {Object} analysis - Analysis result
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

      if (productInfo.brands?.length > 0) {
        detectedBrands = [...new Set(productInfo.brands)];
      }

      if (productInfo.prices?.length > 0) {
        suggestedPrice = productInfo.prices[0];
      }

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
      'Amazon', 'Nike', 'Adidas', 'Puma'
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
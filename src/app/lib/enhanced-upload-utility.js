// src/app/lib/enhanced-upload-utility.js
'use client';

import { useState, useMemo, useCallback } from 'react';

// Enhanced upload utility with Vision API integration
export class EnhancedFileUploader {
  constructor(baseUrl = '', getAuthHeaders = null, options = {}) {
    this.baseUrl = baseUrl;
    this.getAuthHeaders = getAuthHeaders;
    this.options = {
      enableModeration: true,
      enableTextExtraction: false,
      enableCategorization: false,
      autoRejectUnsafe: true,
      requireManualReview: false,
      ...options
    };
  }

  async getAuthenticatedHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.getAuthHeaders) {
      const authHeaders = await this.getAuthHeaders();
      Object.assign(headers, authHeaders);
    }

    return headers;
  }

  async uploadFileWithAnalysis(file, onProgress = null, onAnalysis = null) {
    try {
      // Step 1: Upload the file first
      const uploadResult = await this.uploadFile(file, (progress) => {
        if (onProgress) onProgress(progress * 0.7); // Upload takes 70% of progress
      });

      if (!uploadResult.success) {
        throw new Error('File upload failed');
      }

      // Step 2: Analyze the uploaded image if enabled
      let analysisResult = null;
      if (this.options.enableModeration || this.options.enableTextExtraction || this.options.enableCategorization) {
        if (onProgress) onProgress(75); // Analysis starting

        analysisResult = await this.analyzeImage(uploadResult.publicUrl, onAnalysis);

        if (onProgress) onProgress(95); // Analysis complete
      }

      // Step 3: Check if image should be rejected based on analysis
      if (analysisResult && this.options.autoRejectUnsafe) {
        const moderationResult = analysisResult.moderation || analysisResult;

        if (moderationResult && !moderationResult.safe) {
          // Delete the uploaded file if it's unsafe
          await this.deleteUploadedFile(uploadResult.publicUrl);

          throw new Error(`Image rejected: ${moderationResult.unsafeCategories?.join(', ') || 'Content policy violation'}`);
        }

        if (moderationResult && moderationResult.needsReview && this.options.requireManualReview) {
          return {
            ...uploadResult,
            analysis: analysisResult,
            status: 'pending_review',
            message: 'Image requires manual review before approval'
          };
        }
      }

      if (onProgress) onProgress(100);

      return {
        ...uploadResult,
        analysis: analysisResult,
        status: 'approved'
      };
    } catch (error) {
      throw error;
    }
  }

  async uploadFile(file, onProgress = null) {
    try {
      // First, try the signed URL approach
      const signedUrlResult = await this.trySignedUrlUpload(file, onProgress);
      if (signedUrlResult.success) {
        return signedUrlResult;
      }
    } catch (error) {
      console.warn('Signed URL upload failed, trying direct upload:', error);
    }

    // Fallback to direct upload
    return await this.directUpload(file, onProgress);
  }

  async trySignedUrlUpload(file, onProgress) {
    const headers = await this.getAuthenticatedHeaders();

    const urlResponse = await fetch(`${this.baseUrl}/api/upload-url`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type
      })
    });

    if (!urlResponse.ok) {
      const errorData = await urlResponse.json();
      if (errorData.fallback === 'direct_upload') {
        throw new Error('Fallback to direct upload');
      }
      throw new Error(`Failed to get upload URL: ${errorData.error}`);
    }

    const { uploadUrl, publicUrl, filename } = await urlResponse.json();

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.statusText}`);
    }

    return {
      success: true,
      publicUrl,
      filename,
      method: 'signed_url'
    };
  }

  async directUpload(file, onProgress) {
    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();

    return new Promise(async (resolve, reject) => {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const percentComplete = (e.loaded / e.total) * 100;
          onProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve({
              success: true,
              publicUrl: response.publicUrl,
              filename: response.filename,
              method: 'direct_upload'
            });
          } catch (error) {
            reject(new Error('Invalid response format'));
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('POST', `${this.baseUrl}/api/upload-url`);

      if (this.getAuthHeaders) {
        try {
          const authHeaders = await this.getAuthHeaders();
          Object.keys(authHeaders).forEach(key => {
            if (key !== 'Content-Type') {
              xhr.setRequestHeader(key, authHeaders[key]);
            }
          });
        } catch (error) {
          console.warn('Failed to get auth headers:', error);
        }
      }

      xhr.send(formData);
    });
  }

  async analyzeImage(imageUrl, onAnalysis = null) {
    try {
      const headers = await this.getAuthenticatedHeaders();

      let analysisType = 'comprehensive';
      if (this.options.enableModeration && !this.options.enableTextExtraction && !this.options.enableCategorization) {
        analysisType = 'moderation';
      }

      const response = await fetch(`${this.baseUrl}/api/analyze-image`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          imageUrl,
          analysisType
        })
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`);
      }

      const result = await response.json();

      if (onAnalysis) {
        onAnalysis(result);
      }

      return result;
    } catch (error) {
      console.error('Image analysis error:', error);
      // Don't fail the upload if analysis fails, just return null
      return null;
    }
  }

  async deleteUploadedFile(imageUrl) {
    try {
      // This would need to be implemented in your storage service
      console.log('Would delete file:', imageUrl);
      // You can add actual deletion logic here if needed
    } catch (error) {
      console.error('Failed to delete uploaded file:', error);
    }
  }
}

// Enhanced React hook with Vision API integration
export function useEnhancedFileUpload(options = {}) {
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [analysisResults, setAnalysisResults] = useState([]);

  const uploader = useMemo(() => {
    const getAuthHeaders = async () => {
      const { getAuth } = await import('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;

      if (user) {
        const token = await user.getIdToken();
        return {
          'Authorization': `Bearer ${token}`
        };
      }

      return {};
    };

    return new EnhancedFileUploader('', getAuthHeaders, options);
  }, [options]);

  const uploadFileWithAnalysis = useCallback(async (file) => {
    setUploading(true);
    setAnalyzing(false);
    setProgress(0);
    setError(null);

    try {
      const result = await uploader.uploadFileWithAnalysis(
        file,
        (progressPercent) => {
          setProgress(progressPercent);
          if (progressPercent > 70) {
            setAnalyzing(true);
          }
        },
        (analysisResult) => {
          setAnalysisResults(prev => [...prev, {
            file: file.name,
            analysis: analysisResult
          }]);
        }
      );

      setUploading(false);
      setAnalyzing(false);
      setProgress(100);

      return result;
    } catch (err) {
      setUploading(false);
      setAnalyzing(false);
      setError(err.message);
      throw err;
    }
  }, [uploader]);

  const uploadMultipleFiles = useCallback(async (files) => {
    const results = [];
    const totalFiles = files.length;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        setProgress((i / totalFiles) * 100);
        const result = await uploader.uploadFileWithAnalysis(
          file,
          (fileProgress) => {
            const totalProgress = ((i / totalFiles) * 100) + (fileProgress / totalFiles);
            setProgress(totalProgress);
          },
          (analysisResult) => {
            setAnalysisResults(prev => [...prev, {
              file: file.name,
              analysis: analysisResult
            }]);
          }
        );
        results.push({ file: file.name, ...result });
      } catch (error) {
        results.push({
          file: file.name,
          success: false,
          error: error.message
        });
      }
    }

    setUploading(false);
    setAnalyzing(false);
    setProgress(100);

    return results;
  }, [uploader]);

  return {
    uploadFileWithAnalysis,
    uploadMultipleFiles,
    uploading,
    analyzing,
    progress,
    error,
    analysisResults,
    resetError: () => setError(null),
    resetAnalysis: () => setAnalysisResults([])
  };
}

// Utility function to get category suggestions from analysis
export function getCategorySuggestions(analysisResult) {
  if (!analysisResult?.categorization?.suggestions) {
    return [];
  }

  return analysisResult.categorization.suggestions
    .filter(suggestion => suggestion.confidence > 0.5)
    .map(suggestion => ({
      categorySlug: suggestion.category,
      confidence: suggestion.confidence,
      matchCount: suggestion.matchCount,
      matches: suggestion.matches
    }))
    .sort((a, b) => b.confidence - a.confidence);
}

// Utility function to extract product information from text analysis
export function extractProductDetails(analysisResult) {
  if (!analysisResult?.textExtraction?.productInfo) {
    return null;
  }

  const { productInfo, fullText } = analysisResult.textExtraction;

  return {
    hasProductInfo: Boolean(fullText),
    extractedText: fullText,
    suggestedPrice: productInfo.prices?.[0] || null,
    detectedBrands: [...new Set(productInfo.brands)], // Remove duplicates
    modelNumbers: productInfo.models || [],
    specifications: productInfo.specifications || [],
    allPrices: productInfo.prices || []
  };
}

// Utility function to check content safety
export function checkContentSafety(analysisResult) {
  if (!analysisResult?.moderation) {
    return { safe: true, reason: 'No moderation data' };
  }

  const { moderation } = analysisResult;

  return {
    safe: moderation.safe,
    needsReview: moderation.needsReview || false,
    unsafeCategories: moderation.unsafeCategories || [],
    reviewCategories: moderation.reviewCategories || [],
    checks: moderation.checks || {},
    canPublish: moderation.safe && !moderation.needsReview
  };
}
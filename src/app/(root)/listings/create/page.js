/* eslint-disable @next/next/no-img-element */
"use client"
import { useState, useEffect } from 'react'
import { useAuth } from '@/app/context/AuthContext'
import { useAuthenticatedFetch } from '@/app/lib/useAuthenticatedFetch'
import { useRouter } from 'next/navigation'
import {
  Camera, X, Upload, MapPin, DollarSign, Eye, AlertTriangle,
  CheckCircle, Brain, Text, Tag, Sparkles
} from 'lucide-react'
import { useEnhancedFileUpload } from '@/app/lib/enhanced-upload-utility'
import {
  getCategorySuggestions,
  extractProductDetails,
  checkContentSafety
} from '@/app/lib/client-enhanced-upload-utility'

export default function EnhancedCreateListing() {
  const { currentUser } = useAuth()
  const authenticatedFetch = useAuthenticatedFetch()
  const router = useRouter()

  // Enhanced upload with Vision API
  const {
    uploadFileWithAnalysis,
    uploading,
    analyzing,
    progress,
    error: uploadError,
    analysisResults,
    resetError,
    resetAnalysis
  } = useEnhancedFileUpload({
    enableModeration: true,
    enableTextExtraction: true,
    enableCategorization: true,
    autoRejectUnsafe: true,
    requireManualReview: false
  })

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    location: '',
    categoryId: ''
  })
  const [categories, setCategories] = useState([])
  const [images, setImages] = useState([])
  const [imageAnalysis, setImageAnalysis] = useState([])
  const [creating, setCreating] = useState(false)
  const [errors, setErrors] = useState({})
  const [suggestions, setSuggestions] = useState({
    categories: [],
    extractedText: null,
    detectedInfo: null
  })
  const [showSuggestions, setShowSuggestions] = useState(false)

  useEffect(() => {
    if (!currentUser) {
      router.push('/login')
      return
    }
    fetchCategories()
  }, [currentUser, router])

  // Update suggestions when analysis results change
  useEffect(() => {
    if (analysisResults.length > 0) {
      const latestAnalysis = analysisResults[analysisResults.length - 1]
      updateSuggestionsFromAnalysis(latestAnalysis.analysis)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisResults])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const updateSuggestionsFromAnalysis = (analysis) => {
    const categorySuggestions = getCategorySuggestions(analysis)
    const productDetails = extractProductDetails(analysis)
    const safetyCheck = checkContentSafety(analysis)

    setSuggestions({
      categories: categorySuggestions,
      extractedText: productDetails?.extractedText,
      detectedInfo: productDetails,
      safety: safetyCheck
    })

    // Auto-fill suggestions if available
    if (categorySuggestions.length > 0 && !formData.categoryId) {
      const topCategory = categories.find(cat => cat.slug === categorySuggestions[0].categorySlug)
      if (topCategory) {
        setFormData(prev => ({ ...prev, categoryId: topCategory.id }))
      }
    }

    // Auto-fill price if detected
    if (productDetails?.suggestedPrice && !formData.price) {
      const cleanPrice = productDetails.suggestedPrice.replace(/[^\d.]/g, '')
      if (cleanPrice && !isNaN(parseFloat(cleanPrice))) {
        setFormData(prev => ({ ...prev, price: cleanPrice }))
      }
    }

    // Auto-fill title and description with extracted text
    if (productDetails?.hasProductInfo && !formData.title) {
      const extractedText = productDetails.extractedText.trim()
      if (extractedText.length > 0 && extractedText.length < 100) {
        setFormData(prev => ({
          ...prev,
          title: extractedText.slice(0, 50),
          description: prev.description || extractedText
        }))
      }
    }

    setShowSuggestions(true)
  }

  const handleImageUpload = async (files) => {
    const filesToUpload = Array.from(files).slice(0, 8 - images.length)

    for (const file of filesToUpload) {
      try {
        resetError()
        const result = await uploadFileWithAnalysis(file)

        if (result.status === 'pending_review') {
          alert(`Image "${file.name}" requires manual review and will be processed separately.`)
          continue
        }

        if (result.success) {
          const imageData = {
            url: result.publicUrl,
            filename: result.filename,
            analysis: result.analysis,
            status: result.status || 'approved'
          }

          setImages(prev => [...prev, imageData])
          setImageAnalysis(prev => [...prev, result.analysis])

          console.log(`Upload successful via ${result.method}:`, result.publicUrl)
        }

      } catch (err) {
        console.error('Upload failed:', err)
        alert(`Failed to upload ${file.name}: ${err.message}`)
      }
    }
  }

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index))
    setImageAnalysis(prev => prev.filter((_, i) => i !== index))
  }

  const applySuggestion = (type, value) => {
    switch (type) {
      case 'category':
        const category = categories.find(cat => cat.slug === value.categorySlug)
        if (category) {
          setFormData(prev => ({ ...prev, categoryId: category.id }))
        }
        break
      case 'title':
        setFormData(prev => ({ ...prev, title: value }))
        break
      case 'description':
        setFormData(prev => ({ ...prev, description: value }))
        break
      case 'price':
        setFormData(prev => ({ ...prev, price: value }))
        break
    }
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.title.trim()) newErrors.title = 'Title is required'
    if (!formData.description.trim()) newErrors.description = 'Description is required'
    if (!formData.categoryId) newErrors.categoryId = 'Category is required'
    if (formData.price && isNaN(parseFloat(formData.price))) newErrors.price = 'Price must be a valid number'

    // Check image safety
    const unsafeImages = images.filter(img => {
      const safety = checkContentSafety(img.analysis)
      return !safety.safe
    })

    if (unsafeImages.length > 0) {
      newErrors.images = 'Some images contain inappropriate content'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return
    setCreating(true)

    try {
      const response = await authenticatedFetch('/api/listings', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          images: images.map(img => img.url),
          imageAnalysis: imageAnalysis,
          price: formData.price ? parseFloat(formData.price) : null
        })
      })

      if (response.ok) {
        const listing = await response.json()
        router.push(`/listings/${listing.id}`)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create listing')
      }
    } catch (error) {
      console.error('Create listing error:', error)
      alert('Failed to create listing. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  if (!currentUser) {
    return <div className="text-white">Redirecting...</div>
  }

  const isUploading = uploading || analyzing

  return (
    <div className="min-h-screen mt-32 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <div className="bg-[#00154B] rounded-lg shadow-sm border border-[#00296B] p-6">
              <h1 className="text-2xl font-bold text-white mb-6 flex items-center">
                <Sparkles className="w-6 h-6 mr-2 text-yellow-400" />
                Create New Listing with AI
              </h1>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className={`w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-[#00296B] focus:border-[#00296B] ${errors.title ? 'border-red-500' : 'border-white bg-[#000814] text-white'}`}
                    placeholder="What are you selling?"
                  />
                  {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Description *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    className={`w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-[#00296B] focus:border-[#00296B] ${errors.description ? 'border-red-500' : 'border-white bg-[#000814] text-white'}`}
                    placeholder="Describe your item in detail..."
                  />
                  {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      <DollarSign className="inline w-4 h-4 mr-1" /> Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                      className={`w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-[#00296B] focus:border-[#00296B] ${errors.price ? 'border-red-500' : 'border-white bg-[#000814] text-white'}`}
                      placeholder="0.00"
                    />
                    {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      <MapPin className="inline w-4 h-4 mr-1" /> Location
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-white bg-[#000814] text-white focus:ring-2 focus:ring-[#00296B] focus:border-[#00296B]"
                      placeholder="City, State"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Category *</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
                    className={`w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-[#00296B] focus:border-[#00296B] ${errors.categoryId ? 'border-red-500' : 'border-white bg-[#000814] text-white'}`}
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                  {errors.categoryId && <p className="text-red-500 text-sm mt-1">{errors.categoryId}</p>}
                </div>

                {/* Enhanced Photo Upload Section */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    <Camera className="inline w-4 h-4 mr-1" /> Photos with AI Analysis
                  </label>

                  {/* Upload Progress */}
                  {isUploading && (
                    <div className="mb-4 bg-[#000814] rounded-lg p-4 border border-[#00296B]">
                      <div className="text-sm text-white mb-2 flex items-center">
                        {analyzing ? (
                          <>
                            <Brain className="w-4 h-4 mr-2 animate-pulse text-blue-400" />
                            Analyzing image with AI... {Math.round(progress)}%
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2 text-green-400" />
                            Uploading... {Math.round(progress)}%
                          </>
                        )}
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${analyzing ? 'bg-blue-500' : 'bg-[#00296B]'
                            }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Upload Error */}
                  {uploadError && (
                    <div className="mb-4 bg-red-900 border border-red-700 text-red-100 px-3 py-2 rounded-lg text-sm">
                      Upload failed: {uploadError}
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    {images.map((image, index) => {
                      const safety = checkContentSafety(image.analysis)
                      return (
                        <div key={index} className="relative">
                          <img
                            src={image.url}
                            alt={`Upload ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg border border-white"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                            disabled={isUploading}
                          >
                            <X className="w-3 h-3" />
                          </button>

                          {/* Safety Indicator */}
                          <div className="absolute -top-2 -left-2">
                            {safety.safe ? (
                              <CheckCircle className="w-5 h-5 text-green-500 bg-white rounded-full" />
                            ) : safety.needsReview ? (
                              <AlertTriangle className="w-5 h-5 text-yellow-500 bg-white rounded-full" />
                            ) : (
                              <X className="w-5 h-5 text-red-500 bg-white rounded-full" />
                            )}
                          </div>

                          {index === 0 && (
                            <div className="absolute bottom-1 left-1 bg-[#00296B] text-white text-xs px-1 rounded">
                              Main
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {images.length < 8 && (
                      <label className="border-2 border-dashed border-white rounded-lg h-24 flex items-center justify-center cursor-pointer hover:border-[#00296B] hover:bg-[#00154B]">
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e.target.files)}
                          className="hidden"
                          disabled={isUploading}
                        />
                        <div className="text-center">
                          {isUploading ? (
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#00296B] mx-auto"></div>
                          ) : (
                            <>
                              <Upload className="w-6 h-6 text-white mx-auto mb-1" />
                              <span className="text-xs text-white">Add Photo</span>
                            </>
                          )}
                        </div>
                      </label>
                    )}
                  </div>

                  <p className="text-sm text-white">
                    Add up to 8 photos. AI will analyze content for safety and extract product information.
                    {images.length > 0 && ` (${images.length}/8 uploaded)`}
                  </p>
                  {errors.images && <p className="text-red-500 text-sm mt-1">{errors.images}</p>}
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="flex-1 px-4 py-2 border border-white text-white rounded-lg hover:bg-[#00154B]"
                    disabled={creating || isUploading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating || isUploading}
                    className="flex-1 bg-[#00296B] text-white px-4 py-2 rounded-lg hover:bg-[#00154B] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creating ? 'Creating...' : isUploading ? 'Processing...' : 'Create Listing'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* AI Suggestions Sidebar */}
          {showSuggestions && (
            <div className="lg:col-span-1">
              <div className="bg-[#00154B] rounded-lg shadow-sm border border-[#00296B] p-6 sticky top-8">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center">
                  <Brain className="w-5 h-5 mr-2 text-blue-400" />
                  AI Suggestions
                </h2>

                {/* Category Suggestions */}
                {suggestions.categories.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-white mb-2 flex items-center">
                      <Tag className="w-4 h-4 mr-1" />
                      Suggested Categories
                    </h3>
                    <div className="space-y-2">
                      {suggestions.categories.slice(0, 3).map((cat, index) => (
                        <button
                          key={index}
                          onClick={() => applySuggestion('category', cat)}
                          className="w-full text-left p-2 rounded bg-[#000814] hover:bg-[#00296B] text-white text-sm border border-gray-600"
                        >
                          <div className="flex justify-between items-center">
                            <span className="capitalize">{cat.categorySlug.replace('-', ' ')}</span>
                            <span className="text-xs text-gray-400">
                              {Math.round(cat.confidence * 100)}%
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Extracted Text */}
                {suggestions.extractedText && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-white mb-2 flex items-center">
                      <Text className="w-4 h-4 mr-1" />
                      Detected Text
                    </h3>
                    <div className="bg-[#000814] p-3 rounded border border-gray-600">
                      <p className="text-xs text-gray-300 mb-2">Found in image:</p>
                      <p className="text-sm text-white">{suggestions.extractedText.slice(0, 100)}...</p>
                      <button
                        onClick={() => applySuggestion('description', suggestions.extractedText)}
                        className="mt-2 text-xs text-blue-400 hover:text-blue-300"
                      >
                        Use as description
                      </button>
                    </div>
                  </div>
                )}

                {/* Product Information */}
                {suggestions.detectedInfo && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-white mb-2 flex items-center">
                      <Eye className="w-4 h-4 mr-1" />
                      Detected Info
                    </h3>
                    <div className="space-y-2 text-sm">
                      {suggestions.detectedInfo.detectedBrands?.length > 0 && (
                        <div>
                          <span className="text-gray-400">Brands: </span>
                          <span className="text-white">{suggestions.detectedInfo.detectedBrands.join(', ')}</span>
                        </div>
                      )}
                      {suggestions.detectedInfo.suggestedPrice && (
                        <div>
                          <span className="text-gray-400">Detected Price: </span>
                          <button
                            onClick={() => applySuggestion('price', suggestions.detectedInfo.suggestedPrice.replace(/[^\d.]/g, ''))}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            {suggestions.detectedInfo.suggestedPrice}
                          </button>
                        </div>
                      )}
                      {suggestions.detectedInfo.specifications?.length > 0 && (
                        <div>
                          <span className="text-gray-400">Specs: </span>
                          <span className="text-white">{suggestions.detectedInfo.specifications.slice(0, 2).join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Content Safety Status */}
                {suggestions.safety && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-white mb-2">Content Safety</h3>
                    <div className={`p-2 rounded text-sm ${suggestions.safety.safe
                      ? 'bg-green-900 text-green-200 border border-green-700'
                      : 'bg-red-900 text-red-200 border border-red-700'
                      }`}>
                      {suggestions.safety.safe ? (
                        <div className="flex items-center">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Content approved
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          Content needs review
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
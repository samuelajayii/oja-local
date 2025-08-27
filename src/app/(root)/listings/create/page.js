/* eslint-disable @next/next/no-img-element */
"use client"
import { useState, useEffect } from 'react'
import { useAuth } from '@/app/context/AuthContext'
import { useAuthenticatedFetch } from '@/app/lib/useAuthenticatedFetch'
import { useRouter } from 'next/navigation'
import { Camera, X, Upload, MapPin, DollarSign } from 'lucide-react'

export default function CreateListing() {
    const { currentUser } = useAuth()
    const authenticatedFetch = useAuthenticatedFetch()
    const router = useRouter()

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        price: '',
        location: '',
        categoryId: ''
    })
    const [categories, setCategories] = useState([])
    const [images, setImages] = useState([])
    const [uploading, setUploading] = useState(false)
    const [creating, setCreating] = useState(false)
    const [errors, setErrors] = useState({})

    useEffect(() => {
        if (!currentUser) {
            router.push('/login')
            return
        }
        fetchCategories()
    }, [currentUser, router])

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

    const handleImageUpload = async (files) => {
        setUploading(true)
        const newImages = []
        try {
            for (const file of files) {
                const uploadResponse = await authenticatedFetch('/api/upload-url', {
                    method: 'POST',
                    body: JSON.stringify({
                        filename: file.name,
                        contentType: file.type
                    })
                })

                if (!uploadResponse.ok) throw new Error('Failed to get upload URL')
                const { uploadUrl, publicUrl } = await uploadResponse.json()

                const uploadResult = await fetch(uploadUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': file.type },
                    body: file
                })
                if (!uploadResult.ok) throw new Error('Failed to upload image')

                newImages.push(publicUrl)
            }
            setImages(prev => [...prev, ...newImages])
        } catch (error) {
            console.error('Upload error:', error)
            alert('Failed to upload images. Please try again.')
        } finally {
            setUploading(false)
        }
    }

    const removeImage = (index) => {
        setImages(prev => prev.filter((_, i) => i !== index))
    }

    const validateForm = () => {
        const newErrors = {}
        if (!formData.title.trim()) newErrors.title = 'Title is required'
        if (!formData.description.trim()) newErrors.description = 'Description is required'
        if (!formData.categoryId) newErrors.categoryId = 'Category is required'
        if (formData.price && isNaN(parseFloat(formData.price))) newErrors.price = 'Price must be a valid number'
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
                    images,
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

    return (
        <div className="min-h-screen mt-32 py-8">
            <div className="max-w-2xl mx-auto px-4">
                <div className="bg-[#00154B] rounded-lg shadow-sm border border-[#00296B] p-6">
                    <h1 className="text-2xl font-bold text-white mb-6">Create New Listing</h1>

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

                        <div>
                            <label className="block text-sm font-medium text-white mb-2">
                                <Camera className="inline w-4 h-4 mr-1" /> Photos
                            </label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                {images.map((image, index) => (
                                    <div key={index} className="relative">
                                        <img src={image} alt={`Upload ${index + 1}`} className="w-full h-24 object-cover rounded-lg border border-white" />
                                        <button type="button" onClick={() => removeImage(index)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                                {images.length < 8 && (
                                    <label className="border-2 border-dashed border-white rounded-lg h-24 flex items-center justify-center cursor-pointer hover:border-[#00296B] hover:bg-[#00154B]">
                                        <input type="file" multiple accept="image/*" onChange={(e) => handleImageUpload(Array.from(e.target.files || []))} className="hidden" disabled={uploading} />
                                        <div className="text-center">
                                            {uploading ? (
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
                            <p className="text-sm text-white">Add up to 8 photos. First photo will be the main image.</p>
                        </div>

                        <div className="flex gap-4">
                            <button type="button" onClick={() => router.back()} className="flex-1 px-4 py-2 border border-white text-white rounded-lg hover:bg-[#00154B]" disabled={creating}>
                                Cancel
                            </button>
                            <button type="submit" disabled={creating || uploading} className="flex-1 bg-[#00296B] text-white px-4 py-2 rounded-lg hover:bg-[#00154B] disabled:opacity-50 disabled:cursor-not-allowed">
                                {creating ? 'Creating...' : 'Create Listing'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

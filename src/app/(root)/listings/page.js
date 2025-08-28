/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @next/next/no-img-element */
'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/app/context/AuthContext'
import { Search, Filter, MapPin, Heart, MessageCircle, User } from 'lucide-react'
import Link from 'next/link'

export default function ListingsGrid() {
  const { user } = useAuth()

  const [listings, setListings] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [favorites, setFavorites] = useState(new Set())
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetchCategories()
    fetchListings()
  }, [])

  useEffect(() => {
    if (user) {
      fetchFavorites()
    }
  }, [user])

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      fetchListings()
    }, 500)

    return () => clearTimeout(delayedSearch)
  }, [searchTerm, selectedCategory])

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

  const fetchListings = async () => {
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (selectedCategory) params.append('category', selectedCategory)

      const response = await fetch(`/api/listings?${params}`)
      if (response.ok) {
        const data = await response.json()
        setListings(data)
      }
    } catch (error) {
      console.error('Error fetching listings:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchFavorites = async () => {
    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/favorites', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const favoriteListings = await response.json()
        setFavorites(new Set(favoriteListings.map(listing => listing.id)))
      }
    } catch (error) {
      console.error('Error fetching favorites:', error)
    }
  }

  const toggleFavorite = async (listingId, event) => {
    event.preventDefault()
    event.stopPropagation()

    if (!user) return

    try {
      const token = await user.getIdToken()

      if (favorites.has(listingId)) {
        // Remove from favorites
        const response = await fetch(`/api/favorites?listingId=${listingId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        if (response.ok) {
          setFavorites(prev => {
            const newFavorites = new Set(prev)
            newFavorites.delete(listingId)
            return newFavorites
          })
        }
      } else {
        // Add to favorites
        const response = await fetch('/api/favorites', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ listingId })
        })
        if (response.ok) {
          setFavorites(prev => new Set([...prev, listingId]))
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedCategory('')
    setShowFilters(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen mt-32 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-gray-200 rounded-lg h-80"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen mt-32">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <h1 className="text-3xl font-bold text-white mb-4 sm:mb-0">
            Marketplace
          </h1>
          <Link
            href="/listings/create"
            className="bg-[#00154B] text-white px-6 py-3 rounded-lg hover:bg-[#00296B] text-center"
          >
            Create Listing
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="text-white bg-[#000814] rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search listings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border placeholder:text-gray-600 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#000814] focus:border-[#000814]"
              />
            </div>

            {/* Category Filter */}
            <div className="lg:w-64">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border bg-[#000814] border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </button>

            {/* Clear Filters */}
            {(searchTerm || selectedCategory) && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-white hover:text-gray-800"
              >
                Clear
              </button>
            )}
          </div>

          {/* Advanced Filters (Hidden by default) */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Price
                  </label>
                  <input
                    type="number"
                    placeholder="$0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Price
                  </label>
                  <input
                    type="number"
                    placeholder="$1000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    placeholder="City, State"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-white">
            {listings.length} {listings.length === 1 ? 'listing' : 'listings'} found
          </p>
        </div>

        {/* Listings Grid */}
        {listings.length === 0 ? (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="bg-gray-100 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                <Search className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No listings found</h3>
              <p className="text-gray-600 mb-6">
                Try adjusting your search criteria or browse all categories.
              </p>
              <button
                onClick={clearFilters}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear all filters
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {listings.map((listing) => (
              <Link
                key={listing.id}
                href={`/listings/${listing.id}`}
                className="bg-[#000814] text-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Image */}
                <div className="relative">
                  {listing.images && listing.images.length > 0 ? (
                    <img
                      src={listing.images[0]}
                      alt={listing.title}
                      className="w-full h-48 object-cover"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                      <span className="text-white">No image</span>
                    </div>
                  )}

                  {/* Favorite Button */}
                  {user && (
                    <button
                      onClick={(e) => toggleFavorite(listing.id, e)}
                      className={`absolute top-3 right-3 p-2 rounded-full ${favorites.has(listing.id)
                        ? 'bg-red-500 text-white'
                        : 'bg-white text-gray-600 hover:text-red-500'
                        } shadow-sm`}
                    >
                      <Heart className={`w-4 h-4 ${favorites.has(listing.id) ? 'fill-current' : ''}`} />
                    </button>
                  )}

                  {/* Category Badge */}
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {listing.category.name}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-semibold text-white mb-2 truncate">
                    {listing.title}
                  </h3>

                  <p className="text-white text-sm mb-3 line-clamp-2">
                    {listing.description}
                  </p>

                  {/* Price */}
                  {listing.price && (
                    <div className="text-lg font-bold text-green-600 mb-3">
                      ${parseFloat(listing.price).toFixed(2)}
                    </div>
                  )}

                  {/* Location */}
                  {listing.location && (
                    <div className="flex items-center text-sm text-white mb-3">
                      <MapPin className="w-4 h-4 mr-1" />
                      {listing.location}
                    </div>
                  )}

                  {/* Seller */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {listing.user.avatar ? (
                        <img
                          src={listing.user.avatar}
                          alt={listing.user.name}
                          className="w-8 h-8 rounded-full mr-2"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center mr-2">
                          <User className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <span className="text-sm text-white truncate">
                        {listing.user.name}
                      </span>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center space-x-3 text-sm text-white">
                      <span className="flex items-center">
                        <MessageCircle className="w-4 h-4 mr-1" />
                        {listing._count.messages}
                      </span>
                      <span className="flex items-center">
                        <Heart className="w-4 h-4 mr-1" />
                        {listing._count.favorites}
                      </span>
                    </div>
                  </div>

                  {/* Time */}
                  <div className="text-xs text-white mt-3">
                    {new Date(listing.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
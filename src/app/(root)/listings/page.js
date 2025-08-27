"use client"
import { useEffect, useState } from 'react'
import { useAuth } from '@/app/context/AuthContext'
import { useRouter } from 'next/navigation'

export default function Listings() {
    const [listings, setListings] = useState([])
    const [loading, setLoading] = useState(true)
    const { currentUser } = useAuth()
    const router = useRouter()

    useEffect(() => {
        // Redirect if not logged in
        if (!currentUser) {
            router.push('/login')
            return
        }

        fetchListings()
    }, [currentUser, router])

    const fetchListings = async () => {
        try {
            const response = await fetch('/api/listings')
            const data = await response.json()
            setListings(data)
        } catch (error) {
            console.error('Error fetching listings:', error)
        } finally {
            setLoading(false)
        }
    }

    if (!currentUser) {
        return <div>Redirecting...</div>
    }

    if (loading) {
        return <div className="p-8">Loading listings...</div>
    }

    return (
        <div className="p-8 min-h-screen">
            <h1 className="text-2xl mb-6">Marketplace Listings</h1>

            {listings.length === 0 ? (
                <p>No listings available.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-white">
                    {listings.map(listing => (
                        <div key={listing.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
                            <h3 className="text-lg font-semibold mb-2">{listing.title}</h3>
                            <p className="text-gray-600 mb-2">{listing.description}</p>
                            {listing.price && (
                                <p className="text-lg font-bold text-green-600 mb-2">
                                    ${listing.price}
                                </p>
                            )}
                            <div className="text-sm text-gray-500">
                                <p>Category: {listing.category.name}</p>
                                <p>Posted by: {listing.user.name}</p>
                                <p>Posted: {new Date(listing.createdAt).toLocaleDateString()}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

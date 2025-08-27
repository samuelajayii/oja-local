/* eslint-disable @next/next/no-img-element */
"use client"

import { useEffect, useState } from 'react'
import { useAuth } from '@/app/context/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
            const res = await fetch('/api/listings')
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`)
            }
            const data = await res.json()
            setListings(data)
        } catch (err) {
            console.error('Error fetching listings:', err)
        } finally {
            setLoading(false)
        }
    }

    const truncate = (text, n = 160) =>
        text && text.length > n ? text.slice(0, n).trim() + '…' : text

    if (!currentUser) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#000814]">
                <p className="text-white">Redirecting...</p>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#000814]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00296B]" />
            </div>
        )
    }

    return (
        <div className="min-h-screen mt-32 py-10 px-4">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold text-white">Oja-Local Listings</h1>
                    <Link href="/listings/create" className="bg-[#00296B] hover:bg-[#00154B] text-white px-4 py-2 rounded-lg">
                        Create Listing
                    </Link>
                </div>

                {listings.length === 0 ? (
                    <div className="p-8 bg-[#00154B] rounded-lg text-white">No listings available.</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {listings.map((listing) => (
                            <article
                                key={listing.id}
                                className="bg-[#00154B] border border-[#00296B] rounded-lg overflow-hidden shadow-sm text-white flex flex-col"
                            >
                                {/* Image / thumbnail */}
                                <div className="w-full h-48 bg-gray-800">
                                    {listing.images && listing.images.length > 0 ? (
                                        <img
                                            src={listing.images[0]}
                                            alt={listing.title}
                                            className="w-full h-48 object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-48 flex items-center justify-center text-white/70">
                                            No image
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="p-4 flex-1 flex flex-col">
                                    <div className="flex items-start justify-between gap-4">
                                        <h2 className="text-lg font-semibold">{listing.title}</h2>
                                        {listing.price ? (
                                            <div className="text-green-500 font-bold text-lg">
                                                ${parseFloat(listing.price).toFixed(2)}
                                            </div>
                                        ) : (
                                            <div className="text-sm text-white/70">Free / N/A</div>
                                        )}
                                    </div>

                                    <div className="mt-2 text-sm text-white/90 mb-3">
                                        <p className="mb-2">{truncate(listing.description, 120)}</p>

                                        <div className="flex flex-wrap gap-2 text-xs">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white text-[#00154B] font-medium">
                                                {listing.category?.name ?? 'Uncategorized'}
                                            </span>

                                            {listing.location && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-white/10 text-white/90">
                                                    <svg className="w-3 h-3 mr-1 inline" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.14 2 5 5.14 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.86-3.14-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" /></svg>
                                                    {listing.location}
                                                </span>
                                            )}

                                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-white/5 text-white/80">
                                                Posted by {listing.user?.name ?? 'Unknown'}
                                            </span>

                                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-white/5 text-white/80">
                                                {new Date(listing.createdAt).toLocaleDateString()}
                                            </span>

                                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-white/5 text-white/80">
                                                {listing.images?.length ?? 0} photo{(listing.images?.length ?? 0) !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Thumbnails (if any) */}
                                    {listing.images && listing.images.length > 1 && (
                                        <div className="flex gap-2 mb-3">
                                            {listing.images.slice(0, 4).map((img, idx) => (
                                                <img key={idx} src={img} alt={`${listing.title} ${idx + 1}`} className="w-14 h-14 object-cover rounded-md border border-[#00296B]" />
                                            ))}
                                        </div>
                                    )}

                                    {/* Footer actions */}
                                    <div className="mt-auto flex items-center justify-between gap-3">
                                        <Link
                                            href={`/listings/${listing.id}`}
                                            className="px-3 py-2 bg-[#00296B] hover:bg-[#00154B] rounded-md text-white text-sm"
                                        >
                                            View
                                        </Link>

                                        <div className="text-sm text-white/80">
                                            <span className="mr-3">💬 {listing._count?.messages ?? 0}</span>
                                            <span>❤️ {listing._count?.favorites ?? 0}</span>
                                        </div>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

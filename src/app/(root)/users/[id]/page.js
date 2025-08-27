/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/app/context/AuthContext'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Settings, Heart, MessageCircle, Plus, Edit, Trash2, Eye, User } from 'lucide-react'
import Link from 'next/link'

export default function UserDashboard() {
    const { currentUser: user } = useAuth()
    const router = useRouter()
    const searchParams = useSearchParams()
    const pathname = usePathname()
    const activeTab = searchParams?.get('tab') || 'listings'

    const [userListings, setUserListings] = useState([])
    const [favorites, setFavorites] = useState([])
    const [conversations, setConversations] = useState([])
    const [loading, setLoading] = useState(true)
    const [profile, setProfile] = useState({
        name: '',
        bio: '',
        location: '',
        avatar: ''
    })
    const [editingProfile, setEditingProfile] = useState(false)
    const [savingProfile, setSavingProfile] = useState(false)

    useEffect(() => {
        if (user) {
            fetchUserData()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, activeTab])

    const fetchUserData = async () => {
        setLoading(true)
        try {
            const token = await user.getIdToken()

            // Fetch user listings
            if (activeTab === 'listings' || activeTab === 'profile') {
                const listingsResponse = await fetch(`/api/listings?userId=${user.uid}`)
                if (listingsResponse.ok) {
                    const listingsData = await listingsResponse.json()
                    setUserListings(listingsData)
                }
            }

            // Fetch favorites
            if (activeTab === 'favorites') {
                const favoritesResponse = await fetch('/api/favorites', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                if (favoritesResponse.ok) {
                    const favoritesData = await favoritesResponse.json()
                    setFavorites(favoritesData)
                }
            }

            // Fetch messages/conversations
            if (activeTab === 'messages') {
                const messagesResponse = await fetch('/api/messages', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                if (messagesResponse.ok) {
                    const conversationsData = await messagesResponse.json()
                    setConversations(conversationsData)
                }
            }

            // Fetch user profile
            if (activeTab === 'profile') {
                const profileResponse = await fetch(`/api/users/${user.uid}`)
                if (profileResponse.ok) {
                    const userData = await profileResponse.json()
                    setProfile({
                        name: userData.name || '',
                        bio: userData.bio || '',
                        location: userData.location || '',
                        avatar: userData.avatar || ''
                    })
                }
            }
        } catch (error) {
            console.error('Error fetching user data:', error)
        } finally {
            setLoading(false)
        }
    }

    const deleteListing = async (listingId) => {
        if (!confirm('Are you sure you want to delete this listing?')) return

        try {
            const token = await user.getIdToken()
            const response = await fetch(`/api/listings/${listingId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (response.ok) {
                setUserListings(prev => prev.filter(listing => listing.id !== listingId))
            } else {
                alert('Failed to delete listing')
            }
        } catch (error) {
            console.error('Error deleting listing:', error)
            alert('Failed to delete listing')
        }
    }

    const removeFavorite = async (listingId) => {
        try {
            const token = await user.getIdToken()
            const response = await fetch(`/api/favorites?listingId=${listingId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (response.ok) {
                setFavorites(prev => prev.filter(listing => listing.id !== listingId))
            }
        } catch (error) {
            console.error('Error removing favorite:', error)
        }
    }

    const saveProfile = async (e) => {
        e.preventDefault()
        setSavingProfile(true)

        try {
            const token = await user.getIdToken()
            const response = await fetch(`/api/users/${user.uid}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(profile)
            })

            if (response.ok) {
                setEditingProfile(false)
                alert('Profile updated successfully!')
            } else {
                const err = await response.json().catch(() => ({}))
                alert(err.error || 'Failed to update profile')
            }
        } catch (error) {
            console.error('Error updating profile:', error)
            alert('Failed to update profile')
        } finally {
            setSavingProfile(false)
        }
    }

    // --- NEW robust setActiveTab using current pathname ---
    const setActiveTab = (tab) => {
        // use the current pathname (e.g. "/dashboard") so we don't hard-code routes
        const base = pathname || '/dashboard'
        const params = new URLSearchParams(searchParams?.toString() || '')
        params.set('tab', tab)
        // pushes a URL like "/dashboard?tab=profile"
        router.push(`${base}?${params.toString()}`)
    }
    // --- end setActiveTab ---

    if (!user) {
        return (
            <div className="min-h-screen bg-[#000814] flex items-center justify-center text-white">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Please sign in to access your dashboard</h2>
                    <Link
                        href="login"
                        className="bg-[#00154B] text-white px-6 py-2 rounded-lg hover:bg-[#00296B]"
                    >
                        Sign In
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen mt-32 bg-[#000814] text-white">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold">Dashboard</h1>
                        <p className="text-gray-300 mt-1">Manage your listings and account</p>
                    </div>
                    <Link
                        href="/listings/create"
                        className="mt-4 sm:mt-0 bg-[#00154B] text-white px-6 py-3 rounded-lg hover:bg-[#00296B] inline-flex items-center"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Listing
                    </Link>
                </div>

                {/* Navigation Tabs */}
                <div className="bg-[#000814] rounded-lg shadow-sm border border-gray-700 mb-8">
                    <div className="border-b border-gray-700">
                        <nav className="flex space-x-8 px-6">
                            {[
                                { id: 'listings', name: 'My Listings', icon: Plus },
                                { id: 'favorites', name: 'Favorites', icon: Heart },
                                { id: 'messages', name: 'Messages', icon: MessageCircle },
                                { id: 'profile', name: 'Profile', icon: Settings }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${activeTab === tab.id
                                        ? 'border-[#00154B] text-white'
                                        : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600'
                                        }`}
                                >
                                    <tab.icon className="w-4 h-4 mr-2" />
                                    {tab.name}
                                </button>
                            ))}
                        </nav>
                        {/* --- ALTERNATIVE: use Link instead of buttons (uncomment to use) ---
                        <nav className="flex space-x-8 px-6">
                          {['listings','favorites','messages','profile'].map(t => (
                            <Link key={t} href={`${pathname || '/dashboard'}?tab=${t}`} className={`py-4 px-1 border-b-2 ${activeTab===t ? 'border-[#00154B] text-white' : 'border-transparent text-gray-400'}`}>
                              {t}
                            </Link>
                          ))}
                        </nav>
                        */}
                    </div>

                    {/* Tab Content */}
                    <div className="p-6">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#00154B]"></div>
                            </div>
                        ) : (
                            <>
                                {/* My Listings Tab */}
                                {activeTab === 'listings' && (
                                    <div>
                                        <div className="flex items-center justify-between mb-6">
                                            <h2 className="text-xl font-semibold">
                                                My Listings ({userListings.length})
                                            </h2>
                                        </div>

                                        {userListings.length === 0 ? (
                                            <div className="text-center py-12">
                                                <div className="bg-gray-700 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                                                    <Plus className="w-12 h-12 text-gray-300" />
                                                </div>
                                                <h3 className="text-lg font-semibold mb-2">No listings yet</h3>
                                                <p className="text-gray-300 mb-6">Start selling by creating your first listing.</p>
                                                <Link
                                                    href="/listings/create"
                                                    className="bg-[#00154B] text-white px-6 py-2 rounded-lg hover:bg-[#00296B]"
                                                >
                                                    Create First Listing
                                                </Link>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {userListings.map((listing) => (
                                                    <div key={listing.id} className="bg-[#000814] rounded-lg border border-gray-700 overflow-hidden">
                                                        {listing.images && listing.images.length > 0 ? (
                                                            <img
                                                                src={listing.images[0]}
                                                                alt={listing.title}
                                                                className="w-full h-48 object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-48 bg-gray-700 flex items-center justify-center">
                                                                <span className="text-gray-300">No image</span>
                                                            </div>
                                                        )}

                                                        <div className="p-4">
                                                            <h3 className="font-semibold mb-2 truncate">
                                                                {listing.title}
                                                            </h3>

                                                            {listing.price && (
                                                                <div className="text-lg font-bold text-green-500 mb-2">
                                                                    ${parseFloat(listing.price).toFixed(2)}
                                                                </div>
                                                            )}

                                                            <div className="flex items-center text-sm text-gray-300 mb-4 space-x-4">
                                                                <span className="flex items-center">
                                                                    <MessageCircle className="w-4 h-4 mr-1" />
                                                                    {listing._count?.messages ?? 0} messages
                                                                </span>
                                                                <span className="flex items-center">
                                                                    <Heart className="w-4 h-4 mr-1" />
                                                                    {listing._count?.favorites ?? 0} favorites
                                                                </span>
                                                            </div>

                                                            <div className="flex items-center space-x-2">
                                                                <Link
                                                                    href={`/listings/${listing.id}`}
                                                                    className="flex-1 bg-transparent text-white border border-gray-600 px-3 py-2 rounded-lg hover:bg-[#00154B]/20 text-center text-sm font-medium flex items-center justify-center"
                                                                >
                                                                    <Eye className="w-4 h-4 mr-1" />
                                                                    View
                                                                </Link>
                                                                <Link
                                                                    href={`/listings/${listing.id}/edit`}
                                                                    className="flex-1 bg-[#00154B] text-white px-3 py-2 rounded-lg hover:bg-[#00296B] text-center text-sm font-medium flex items-center justify-center"
                                                                >
                                                                    <Edit className="w-4 h-4 mr-1" />
                                                                    Edit
                                                                </Link>
                                                                <button
                                                                    onClick={() => deleteListing(listing.id)}
                                                                    className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Favorites Tab */}
                                {activeTab === 'favorites' && (
                                    <div>
                                        <div className="flex items-center justify-between mb-6">
                                            <h2 className="text-xl font-semibold">
                                                Favorite Listings ({favorites.length})
                                            </h2>
                                        </div>

                                        {favorites.length === 0 ? (
                                            <div className="text-center py-12">
                                                <div className="bg-gray-700 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                                                    <Heart className="w-12 h-12 text-gray-300" />
                                                </div>
                                                <h3 className="text-lg font-semibold mb-2">No favorites yet</h3>
                                                <p className="text-gray-300 mb-6">Start browsing to find items you like.</p>
                                                <Link
                                                    href="/"
                                                    className="bg-[#00154B] text-white px-6 py-2 rounded-lg hover:bg-[#00296B]"
                                                >
                                                    Browse Listings
                                                </Link>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {favorites.map((listing) => (
                                                    <div key={listing.id} className="bg-[#000814] rounded-lg border border-gray-700 overflow-hidden">
                                                        {listing.images && listing.images.length > 0 ? (
                                                            <img src={listing.images[0]} alt={listing.title} className="w-full h-48 object-cover" />
                                                        ) : (
                                                            <div className="w-full h-48 bg-gray-700 flex items-center justify-center">
                                                                <span className="text-gray-300">No image</span>
                                                            </div>
                                                        )}

                                                        <div className="p-4">
                                                            <h3 className="font-semibold mb-2 truncate">{listing.title}</h3>
                                                            {listing.price && <div className="text-lg font-bold text-green-500 mb-2">${parseFloat(listing.price).toFixed(2)}</div>}

                                                            <div className="flex items-center space-x-2 mt-4">
                                                                <Link
                                                                    href={`/listings/${listing.id}`}
                                                                    className="flex-1 bg-transparent text-white border border-gray-600 px-3 py-2 rounded-lg hover:bg-[#00154B]/20 text-center text-sm font-medium"
                                                                >
                                                                    View
                                                                </Link>
                                                                <button
                                                                    onClick={() => removeFavorite(listing.id)}
                                                                    className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700"
                                                                >
                                                                    Remove
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Messages Tab */}
                                {activeTab === 'messages' && (
                                    <div>
                                        <div className="flex items-center justify-between mb-6">
                                            <h2 className="text-xl font-semibold">Messages ({conversations.length})</h2>
                                        </div>

                                        {conversations.length === 0 ? (
                                            <div className="text-center py-12">
                                                <div className="bg-gray-700 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                                                    <MessageCircle className="w-12 h-12 text-gray-300" />
                                                </div>
                                                <h3 className="text-lg font-semibold mb-2">No messages yet</h3>
                                                <p className="text-gray-300 mb-6">Start a conversation with a seller to ask about a listing.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {conversations.map(conv => (
                                                    <Link
                                                        key={conv.id}
                                                        href={`/messages/${conv.id}`}
                                                        className="block p-4 bg-[#000814] rounded-lg border border-gray-700 hover:shadow"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center space-x-3">
                                                                {conv.withUser?.avatar ? (
                                                                    <img src={conv.withUser.avatar} alt={conv.withUser.name} className="w-10 h-10 rounded-full" />
                                                                ) : (
                                                                    <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                                                                        <User className="w-5 h-5 text-gray-300" />
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <div className="font-medium">{conv.withUser?.name || 'Unknown'}</div>
                                                                    <div className="text-sm text-gray-300 truncate max-w-md">{conv.lastMessage?.content || 'No messages yet'}</div>
                                                                </div>
                                                            </div>
                                                            <div className="text-sm text-gray-400">{conv.updatedAt ? new Date(conv.updatedAt).toLocaleString() : ''}</div>
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Profile Tab */}
                                {activeTab === 'profile' && (
                                    <div className="max-w-3xl mx-auto">
                                        <div className="flex items-center space-x-6 mb-6">
                                            {profile.avatar ? (
                                                <img src={profile.avatar} alt={profile.name} className="w-24 h-24 rounded-full object-cover" />
                                            ) : (
                                                <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center">
                                                    <User className="w-8 h-8 text-gray-300" />
                                                </div>
                                            )}

                                            <div>
                                                <h3 className="text-xl font-semibold">{profile.name || user.displayName || 'Your name'}</h3>
                                                <p className="text-sm text-gray-300">{profile.location || 'Location not set'}</p>
                                            </div>
                                        </div>

                                        {!editingProfile ? (
                                            <div>
                                                <div className="mb-4">
                                                    <h4 className="font-medium">About</h4>
                                                    <p className="text-gray-300 whitespace-pre-wrap">{profile.bio || 'No bio yet.'}</p>
                                                </div>

                                                <div className="flex items-center space-x-2">
                                                    <button
                                                        onClick={() => setEditingProfile(true)}
                                                        className="bg-[#00154B] text-white px-4 py-2 rounded-lg hover:bg-[#00296B]"
                                                    >
                                                        Edit Profile
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <form onSubmit={saveProfile} className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium mb-1">Name</label>
                                                    <input
                                                        value={profile.name}
                                                        onChange={(e) => setProfile(p => ({ ...p, name: e.target.value }))}
                                                        className="mt-1 block w-full rounded-md bg-[#000814] border border-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-[#00154B] focus:border-[#00154B]"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium mb-1">Location</label>
                                                    <input
                                                        value={profile.location}
                                                        onChange={(e) => setProfile(p => ({ ...p, location: e.target.value }))}
                                                        className="mt-1 block w-full rounded-md bg-[#000814] border border-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-[#00154B] focus:border-[#00154B]"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium mb-1">Bio</label>
                                                    <textarea
                                                        value={profile.bio}
                                                        onChange={(e) => setProfile(p => ({ ...p, bio: e.target.value }))}
                                                        rows={4}
                                                        className="mt-1 block w-full rounded-md bg-[#000814] border border-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-[#00154B] focus:border-[#00154B]"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium mb-1">Avatar URL</label>
                                                    <input
                                                        value={profile.avatar}
                                                        onChange={(e) => setProfile(p => ({ ...p, avatar: e.target.value }))}
                                                        className="mt-1 block w-full rounded-md bg-[#000814] border border-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-[#00154B] focus:border-[#00154B]"
                                                    />
                                                </div>

                                                <div className="flex items-center space-x-2">
                                                    <button
                                                        type="submit"
                                                        disabled={savingProfile}
                                                        className="bg-[#00154B] text-white px-4 py-2 rounded-lg hover:bg-[#00296B]"
                                                    >
                                                        {savingProfile ? 'Saving...' : 'Save'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditingProfile(false)}
                                                        className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-[#00154B]/10"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </form>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

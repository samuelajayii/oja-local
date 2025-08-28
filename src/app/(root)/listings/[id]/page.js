/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @next/next/no-img-element */
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { Heart, MessageCircle, MapPin, Calendar, User, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export default function ListingDetailPage() {
   const { id } = useParams()
   const { currentUser: user } = useAuth()
   const router = useRouter()

   const [listing, setListing] = useState(null)
   const [loading, setLoading] = useState(true)
   const [isFavorited, setIsFavorited] = useState(false)
   const [currentImageIndex, setCurrentImageIndex] = useState(0)
   const [showMessageModal, setShowMessageModal] = useState(false)
   const [message, setMessage] = useState('')
   const [sendingMessage, setSendingMessage] = useState(false)
   const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
   const [deleting, setDeleting] = useState(false)

   useEffect(() => {
      if (id) fetchListing()
   }, [id])

   useEffect(() => {
      if (user && listing) checkIfFavorited()
   }, [user, listing])

   const fetchListing = async () => {
      try {
         const response = await fetch(`/api/listings/${id}`)
         if (response.ok) {
            const data = await response.json()
            setListing(data)
         } else if (response.status === 404) {
            router.push('/404')
         }
      } catch (error) {
         console.error('Error fetching listing:', error)
      } finally {
         setLoading(false)
      }
   }

   const checkIfFavorited = async () => {
      try {
         const token = await user.getIdToken()
         const response = await fetch('/api/favorites', {
            headers: { Authorization: `Bearer ${token}` }
         })
         if (response.ok) {
            const favorites = await response.json()
            setIsFavorited(favorites.some(fav => fav.id === listing.id))
         }
      } catch (error) {
         console.error('Error checking favorites:', error)
      }
   }

   const toggleFavorite = async () => {
      if (!user) {
         router.push('/login')
         return
      }

      try {
         console.log('Toggle favorite for listing:', listing.id);
         console.log('Current favorite status:', isFavorited);

         const token = await user.getIdToken()
         console.log('Token obtained successfully');

         if (isFavorited) {
            console.log('Removing from favorites...');
            const response = await fetch(`/api/favorites?listingId=${listing.id}`, {
               method: 'DELETE',
               headers: { Authorization: `Bearer ${token}` }
            })

            console.log('DELETE response status:', response.status);

            if (response.ok) {
               setIsFavorited(false)
               console.log('Successfully removed from favorites');
            } else {
               const errorData = await response.json();
               console.error('Failed to remove favorite:', errorData);
               alert(`Failed to remove favorite: ${errorData.error || 'Unknown error'}`);
            }
         } else {
            console.log('Adding to favorites...');
            const requestBody = { listingId: listing.id };
            console.log('Request body:', requestBody);

            const response = await fetch('/api/favorites', {
               method: 'POST',
               headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`
               },
               body: JSON.stringify(requestBody)
            })

            console.log('POST response status:', response.status);

            if (response.ok) {
               setIsFavorited(true)
               console.log('Successfully added to favorites');
            } else {
               const errorData = await response.json();
               console.error('Failed to add favorite:', errorData);
               alert(`Failed to add favorite: ${errorData.error || 'Unknown error'}`);
            }
         }
      } catch (error) {
         console.error('Error toggling favorite:', error);
         alert('An unexpected error occurred while toggling favorite');
      }
   }

   const sendMessage = async (e) => {
      e.preventDefault()
      if (!message.trim() || !user) return

      setSendingMessage(true)
      try {
         const token = await user.getIdToken()
         const response = await fetch('/api/messages', {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json',
               Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
               content: message,
               receiverId: listing.user.id,
               listingId: listing.id
            })
         })
         if (response.ok) {
            setMessage('')
            setShowMessageModal(false)
            alert('Message sent successfully!')
         } else {
            const error = await response.json()
            alert(error.error || 'Failed to send message')
         }
      } catch (error) {
         console.error('Error sending message:', error)
         alert('Failed to send message')
      } finally {
         setSendingMessage(false)
      }
   }

   const deleteListing = async () => {
      setDeleting(true)
      try {
         const token = await user.getIdToken()
         const response = await fetch(`/api/listings/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
         })
         if (response.ok) router.push('/listings')
         else {
            const error = await response.json()
            alert(error.error || 'Failed to delete listing')
         }
      } catch (error) {
         console.error('Error deleting listing:', error)
         alert('Failed to delete listing')
      } finally {
         setDeleting(false)
         setShowDeleteConfirm(false)
      }
   }

   const nextImage = () => setCurrentImageIndex(prev => prev === listing.images.length - 1 ? 0 : prev + 1)
   const prevImage = () => setCurrentImageIndex(prev => prev === 0 ? listing.images.length - 1 : prev - 1)

   if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div></div>
   if (!listing) return <div className="min-h-screen flex items-center justify-center"><p className="text-white">Listing not found</p></div>

   const isOwner = user.uid === listing.user.id


   return (
      <div className="min-h-screen mt-32 bg-[#000814]">
         <div className="max-w-6xl mx-auto px-4 py-6">
            {/* Back Button */}
            <button onClick={() => router.back()} className="flex items-center text-white hover:text-gray-300 mb-4">
               <ChevronLeft className="w-5 h-5 mr-1" /> Back
            </button>

            <div className="bg-[#000814] text-white rounded-lg shadow-sm border border-gray-700 overflow-hidden">
               <div className="md:flex">
                  {/* Image Gallery */}
                  <div className="md:w-1/2">
                     {listing.images && listing.images.length > 0 ? (
                        <div className="relative">
                           <img src={listing.images[currentImageIndex]} alt={listing.title} className="w-full h-96 object-cover" />
                           {listing.images.length > 1 && (
                              <>
                                 <button onClick={prevImage} className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70">
                                    <ChevronLeft className="w-5 h-5" />
                                 </button>
                                 <button onClick={nextImage} className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70">
                                    <ChevronRight className="w-5 h-5" />
                                 </button>
                                 <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                                    {listing.images.map((_, index) => (
                                       <button key={index} onClick={() => setCurrentImageIndex(index)}
                                          className={`w-3 h-3 rounded-full ${index === currentImageIndex ? 'bg-white' : 'bg-white bg-opacity-50'}`} />
                                    ))}
                                 </div>
                              </>
                           )}
                        </div>
                     ) : (
                        <div className="w-full h-96 bg-gray-700 flex items-center justify-center">
                           <span className="text-white">No image available</span>
                        </div>
                     )}
                  </div>

                  {/* Listing Details */}
                  <div className="md:w-1/2 p-6">
                     <div className="flex items-start justify-between mb-4">
                        <div>
                           <h1 className="text-2xl font-bold text-white mb-2">{listing.title}</h1>
                           <div className="flex items-center text-sm text-white space-x-4 mb-4">
                              <span className="inline-flex items-center">
                                 <Calendar className="w-4 h-4 mr-1" />
                                 {new Date(listing.createdAt).toLocaleDateString()}
                              </span>
                              {listing.location && (
                                 <span className="inline-flex items-center">
                                    <MapPin className="w-4 h-4 mr-1" />
                                    {listing.location}
                                 </span>
                              )}
                           </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center space-x-2">
                           {!isOwner && (
                              <button onClick={toggleFavorite} className={`p-2 rounded-lg border ${isFavorited ? 'border-red-500 text-red-500 bg-red-50' : 'border-gray-300 text-white hover:text-red-500 hover:border-red-500'}`}>
                                 <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
                              </button>
                           )}

                           {isOwner && (
                              <>
                                 <Link href={`/listings/${listing.id}/edit`} className="p-2 rounded-lg border border-gray-300 text-white hover:text-blue-500 hover:border-blue-500">
                                    <Edit className="w-5 h-5" />
                                 </Link>
                                 <button onClick={() => setShowDeleteConfirm(true)} className="p-2 rounded-lg border border-gray-300 text-white hover:text-red-500 hover:border-red-500">
                                    <Trash2 className="w-5 h-5" />
                                 </button>
                              </>
                           )}
                        </div>
                     </div>

                     {/* Price */}
                     {listing.price && <div className="text-3xl font-bold text-green-500 mb-4">${parseFloat(listing.price).toFixed(2)}</div>}

                     {/* Category */}
                     <div className="mb-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">{listing.category.name}</span>
                     </div>

                     {/* Description */}
                     <div className="mb-6">
                        <h3 className="text-lg font-semibold text-white mb-2">Description</h3>
                        <p className="text-white whitespace-pre-wrap">{listing.description}</p>
                     </div>

                     {/* Seller Info */}
                     <div className="border-t border-gray-700 pt-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Seller</h3>
                        <div className="flex items-center justify-between">
                           <Link href={`/users/${listing.user.id}`} className="flex items-center hover:bg-gray-900 p-2 rounded-lg transition-colors">
                              {listing.user.avatar ? (
                                 <img src={listing.user.avatar} alt={listing.user.name} className="w-12 h-12 rounded-full mr-3" />
                              ) : (
                                 <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center mr-3">
                                    <User className="w-6 h-6 text-white" />
                                 </div>
                              )}
                              <div>
                                 <p className="font-semibold text-white">{listing.user.name}</p>
                                 <p className="text-sm text-white">View profile</p>
                              </div>
                           </Link>

                           {!isOwner && user && (
                              <button onClick={() => setShowMessageModal(true)} className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                                 <MessageCircle className="w-4 h-4 mr-2" /> Message
                              </button>
                           )}
                        </div>
                     </div>

                     {/* Stats */}
                     <div className="border-t border-gray-700 pt-4 mt-4">
                        <div className="flex items-center text-sm text-white space-x-6">
                           <span className="flex items-center">
                              <MessageCircle className="w-4 h-4 mr-1" /> {listing._count.messages} messages
                           </span>
                           <span className="flex items-center">
                              <Heart className="w-4 h-4 mr-1" /> {listing._count.favorites} favorites
                           </span>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>

         {/* Modals */}
         {showMessageModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
               <div className="bg-[#111827] text-white rounded-lg max-w-md w-full p-6">
                  <h3 className="text-lg font-semibold mb-4">Send message to {listing.user.name}</h3>
                  <form onSubmit={sendMessage}>
                     <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Hi, I'm interested in your listing..." required />
                     <div className="flex gap-3 mt-4">
                        <button type="button" onClick={() => setShowMessageModal(false)} className="flex-1 px-4 py-2 border border-gray-600 rounded-lg text-white hover:bg-gray-800" disabled={sendingMessage}>Cancel</button>
                        <button type="submit" disabled={sendingMessage || !message.trim()} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">{sendingMessage ? 'Sending...' : 'Send Message'}</button>
                     </div>
                  </form>
               </div>
            </div>
         )}

         {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
               <div className="bg-[#111827] text-white rounded-lg max-w-md w-full p-6">
                  <h3 className="text-lg font-semibold mb-4">Delete Listing</h3>
                  <p className="mb-6">Are you sure you want to delete this listing? This action cannot be undone.</p>
                  <div className="flex gap-3">
                     <button type="button" onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2 border border-gray-600 rounded-lg text-white hover:bg-gray-800" disabled={deleting}>Cancel</button>
                     <button type="button" onClick={deleteListing} disabled={deleting} className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50">{deleting ? 'Deleting...' : 'Delete'}</button>
                  </div>
               </div>
            </div>
         )}
      </div>
   )
}

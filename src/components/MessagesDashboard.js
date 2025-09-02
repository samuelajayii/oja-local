/* eslint-disable @next/next/no-img-element */
'use client'

import { useConversations } from '@/app/hooks/useMessages'
import { MessageCircle, User, Clock } from 'lucide-react'
import Link from 'next/link'

export default function MessagesDashboard() {
  const { conversations, loading, error } = useConversations()

  const formatLastMessageTime = (timestamp) => {
    if (!timestamp) return ''

    // Handle various timestamp formats
    let date
    if (timestamp instanceof Date) {
      date = timestamp
    } else if (timestamp.toDate) {
      // Firestore timestamp
      date = timestamp.toDate()
    } else if (timestamp._seconds) {
      // Firestore timestamp alternative format
      date = new Date(timestamp._seconds * 1000)
    } else {
      // String timestamp
      date = new Date(timestamp)
    }

    const now = new Date()
    const diffInMs = now - date
    const diffInHours = diffInMs / (1000 * 60 * 60)
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24)

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    } else if (diffInDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' })
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })
    }
  }

  if (loading) {
    return (
      <div className="bg-[#001020] rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-6">Messages</h2>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-[#001020] rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-6">Messages</h2>
        <div className="text-center py-12">
          <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400">Failed to load messages</p>
          <p className="text-sm text-red-400 mt-2">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#001020] rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Messages</h2>
        {conversations.length > 0 && (
          <span className="text-sm text-gray-400">
            {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {conversations.length === 0 ? (
        <div className="text-center py-12">
          <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400 mb-2">No messages yet</p>
          <p className="text-sm text-gray-500">
            Messages will appear here when someone contacts you about your listings
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {conversations.map((conversation) => {
            // Partner ID is now directly available from the API response
            const partnerId = conversation.partner?.id

            if (!partnerId) {
              console.warn('Missing partner ID for conversation:', conversation.id)
              return null
            }

            return (
              <Link
                key={conversation.id}
                href={`/messages?listingId=${conversation.listingId}&conversationWith=${partnerId}`}
                className="block bg-[#000814] hover:bg-gray-800 rounded-lg p-4 transition-colors border border-gray-700"
              >
                <div className="flex items-center space-x-4">
                  {/* Partner Avatar */}
                  <div className="flex-shrink-0">
                    {conversation.partner?.avatar ? (
                      <img
                        src={conversation.partner.avatar}
                        alt={conversation.partner.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-gray-300" />
                      </div>
                    )}
                  </div>

                  {/* Conversation Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-white font-medium truncate">
                        {conversation.partner?.name || 'Unknown User'}
                      </h3>
                      <div className="flex items-center space-x-2">
                        {conversation.unreadCount > 0 && (
                          <span className="bg-blue-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
                            {conversation.unreadCount}
                          </span>
                        )}
                        <span className="text-xs text-gray-400 flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatLastMessageTime(conversation.lastMessage?.createdAt || conversation.updatedAt)}
                        </span>
                      </div>
                    </div>

                    {/* Listing Title */}
                    {conversation.listing && (
                      <p className="text-sm text-blue-400 mb-2 truncate">
                        About: {conversation.listing.title}
                      </p>
                    )}

                    {/* Last Message */}
                    <p className="text-sm text-gray-300 truncate">
                      {conversation.lastMessage ? (
                        <>
                          {conversation.lastMessage.senderId === partnerId ? '' : 'You: '}
                          {conversation.lastMessage.content}
                        </>
                      ) : (
                        'No messages yet'
                      )}
                    </p>
                  </div>

                  {/* Listing Thumbnail */}
                  {conversation.listing?.images?.[0] && (
                    <div className="flex-shrink-0">
                      <img
                        src={conversation.listing.images[0]}
                        alt={conversation.listing.title}
                        className="w-12 h-12 rounded object-cover"
                      />
                    </div>
                  )}
                </div>
              </Link>
            )
          }).filter(Boolean)}
        </div>
      )}
    </div>
  )
}
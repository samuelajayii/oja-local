/* eslint-disable @next/next/no-img-element */
'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/app/context/AuthContext'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Send, User, MessageCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function MessagesPage() {
  const { currentUser: user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const messagesEndRef = useRef(null)

  const listingId = searchParams?.get('listingId')
  const conversationWith = searchParams?.get('conversationWith')

  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [conversationUser, setConversationUser] = useState(null)
  const [listing, setListing] = useState(null)

  useEffect(() => {
    if (user && listingId && conversationWith) {
      fetchMessages()
    }
  }, [user, listingId, conversationWith])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchMessages = async () => {
    try {
      const token = await user.getIdToken()
      const response = await fetch(
        `/api/messages?listingId=${listingId}&conversationWith=${conversationWith}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )

      if (response.ok) {
        const messagesData = await response.json()
        setMessages(messagesData)

        // Set conversation user and listing from the first message
        if (messagesData.length > 0) {
          const firstMessage = messagesData[0]
          setConversationUser(
            firstMessage.senderId === user.uid
              ? firstMessage.receiver
              : firstMessage.sender
          )
          setListing(firstMessage.listing)
        }
      } else {
        console.error('Failed to fetch messages:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    setSending(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: newMessage.trim(),
          receiverId: conversationWith,
          listingId: listingId
        })
      })

      if (response.ok) {
        const sentMessage = await response.json()
        setMessages(prev => [...prev, sentMessage])
        setNewMessage('')
      } else {
        const error = await response.json().catch(() => ({ error: 'Failed to send message' }))
        alert(error.error || 'Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()

    if (isToday) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#000814] flex items-center justify-center text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Please sign in to view messages</h2>
          <Link
            href="/login"
            className="bg-[#00154B] text-white px-6 py-2 rounded-lg hover:bg-[#00296B]"
          >
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  if (!listingId || !conversationWith) {
    return (
      <div className="min-h-screen bg-[#000814] mt-32 flex items-center justify-center text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Invalid conversation</h2>
          <Link
            href="/dashboard?tab=messages"
            className="bg-[#00154B] text-white px-6 py-2 rounded-lg hover:bg-[#00296B]"
          >
            Back to Messages
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen mt-32 bg-[#000814] text-white">
      {/* Header */}
      <div className="bg-[#001020] border-b border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-700 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              {conversationUser && (
                <div className="flex items-center space-x-3">
                  {conversationUser.avatar ? (
                    <img
                      src={conversationUser.avatar}
                      alt={conversationUser.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-300" />
                    </div>
                  )}
                  <div>
                    <h1 className="font-semibold">{conversationUser.name}</h1>
                    {listing && (
                      <p className="text-sm text-gray-400">About: {listing.title}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {listing && (
              <Link
                href={`/listings/${listing.id}`}
                className="bg-[#00154B] text-white px-4 py-2 rounded-lg hover:bg-[#00296B] text-sm"
              >
                View Listing
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-140px)]">
        {/* Listing Info */}
        {listing && (
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center space-x-4 bg-[#001020] rounded-lg p-4">
              {listing.images && listing.images.length > 0 ? (
                <img
                  src={listing.images[0]}
                  alt={listing.title}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              ) : (
                <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-gray-300" />
                </div>
              )}
              <div>
                <h3 className="font-semibold">{listing.title}</h3>
                <p className="text-sm text-gray-400">Conversation about this listing</p>
              </div>
            </div>
          </div>
        )}

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#00154B]" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwn = message.senderId === user.uid
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${isOwn
                    ? 'bg-[#00154B] text-white'
                    : 'bg-gray-700 text-white'
                    }`}>
                    <p className="text-sm">{message.content}</p>
                    <p className={`text-xs mt-1 ${isOwn ? 'text-blue-200' : 'text-gray-400'
                      }`}>
                      {formatMessageTime(message.createdAt)}
                    </p>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-gray-700">
          <form onSubmit={sendMessage} className="flex items-center space-x-4">
            <div className="flex-1">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="w-full bg-[#001020] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-[#00154B] focus:border-[#00154B]"
                disabled={sending}
              />
            </div>
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="bg-[#00154B] text-white p-3 rounded-lg hover:bg-[#00296B] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
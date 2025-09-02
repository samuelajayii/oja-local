/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @next/next/no-img-element */
'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/app/context/AuthContext'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Send, User, MessageCircle, Loader2, CreditCard, CheckCircle, Clock, XCircle, DollarSign } from 'lucide-react'
import Link from 'next/link'
import { useMessages } from '@/app/hooks/useMessages'

export default function MessagesPage() {
  const { currentUser: user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const messagesEndRef = useRef(null)

  const listingId = searchParams?.get('listingId')
  const conversationWith = searchParams?.get('conversationWith')

  const { messages, loading, sendMessage, markMessagesAsRead } = useMessages(listingId, conversationWith)

  const [sending, setSending] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [conversationUser, setConversationUser] = useState(null)
  const [listing, setListing] = useState(null)
  const [transaction, setTransaction] = useState(null)
  const [showTransactionForm, setShowTransactionForm] = useState(false)
  const [agreedPrice, setAgreedPrice] = useState('')
  const [creatingTransaction, setCreatingTransaction] = useState(false)
  const [confirmingTransaction, setConfirmingTransaction] = useState(false)

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (user && listingId && conversationWith) {
      fetchAdditionalData()

      // Mark messages as read when the component mounts or messages change
      if (messages.length > 0) {
        markMessagesAsRead()
      }
    }
  }, [user, listingId, conversationWith, messages.length])

  const fetchAdditionalData = async () => {
    try {
      const token = await user.getIdToken()

      // Get conversation user data
      const userResponse = await fetch(`/api/users/${conversationWith}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      })
      if (userResponse.ok) {
        const userData = await userResponse.json()
        setConversationUser(userData)
      }

      // Get listing data
      const listingResponse = await fetch(`/api/listings/${listingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      })
      if (listingResponse.ok) {
        const listingData = await listingResponse.json()
        setListing(listingData)
        setAgreedPrice(listingData.price || '')
      }

      // Check for existing transaction
      const transactionsResponse = await fetch('/api/transactions', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json()
        const existingTransaction = transactionsData.find(t => t.listingId === listingId)
        setTransaction(existingTransaction)
      }
    } catch (error) {
      console.error('Error fetching additional data:', error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    setSending(true)
    try {
      const success = await sendMessage(newMessage.trim())
      if (success) {
        setNewMessage('')
      } else {
        alert('Failed to send message. Please try again.')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      alert(`Failed to send message: ${error.message}`)
    } finally {
      setSending(false)
    }
  }

  const handleCreateTransaction = async (e) => {
    e.preventDefault()
    if (!agreedPrice || isNaN(parseFloat(agreedPrice))) {
      alert('Please enter a valid price')
      return
    }

    setCreatingTransaction(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          listingId,
          conversationWith,
          agreedPrice: parseFloat(agreedPrice)
        })
      })

      if (response.ok) {
        const newTransaction = await response.json()
        setTransaction(newTransaction)
        setShowTransactionForm(false)
        alert('Transaction initiated successfully!')
      } else {
        const err = await response.json().catch(() => ({}))
        alert(err.error || 'Failed to create transaction')
      }
    } catch (error) {
      console.error('Error creating transaction:', error)
      alert('Failed to create transaction')
    } finally {
      setCreatingTransaction(false)
    }
  }

  const confirmTransaction = async () => {
    if (!confirm('Are you sure you want to confirm this transaction?')) return

    setConfirmingTransaction(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/transactions/${transaction.id}/confirm`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const result = await response.json()
        setTransaction(result.transaction)
        alert(result.message)
      } else {
        const err = await response.json().catch(() => ({}))
        alert(err.error || 'Failed to confirm transaction')
      }
    } catch (error) {
      console.error('Error confirming transaction:', error)
      alert('Failed to confirm transaction')
    } finally {
      setConfirmingTransaction(false)
    }
  }

  const cancelTransaction = async () => {
    if (!confirm('Are you sure you want to cancel this transaction?')) return

    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        setTransaction(null)
        alert('Transaction cancelled successfully')
      } else {
        const err = await response.json().catch(() => ({}))
        alert(err.error || 'Failed to cancel transaction')
      }
    } catch (error) {
      console.error('Error cancelling transaction:', error)
      alert('Failed to cancel transaction')
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'PENDING':
      case 'SELLER_CONFIRMED':
      case 'BUYER_CONFIRMED':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'CANCELLED':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <CreditCard className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusText = (transaction) => {
    if (transaction.status === 'COMPLETED') return 'Completed'
    if (transaction.status === 'CANCELLED') return 'Cancelled'

    const isSeller = transaction.sellerId === user.uid
    const isSellerConfirmed = transaction.sellerConfirmed
    const isBuyerConfirmed = transaction.buyerConfirmed

    if (isSeller) {
      if (isSellerConfirmed && !isBuyerConfirmed) return 'Waiting for buyer confirmation'
      if (!isSellerConfirmed) return 'Pending your confirmation'
      return 'Pending'
    } else {
      if (isBuyerConfirmed && !isSellerConfirmed) return 'Waiting for seller confirmation'
      if (!isBuyerConfirmed) return 'Pending your confirmation'
      return 'Pending'
    }
  }

  const canConfirm = (transaction) => {
    if (transaction.status === 'COMPLETED' || transaction.status === 'CANCELLED') return false

    const isSeller = transaction.sellerId === user.uid
    return isSeller ? !transaction.sellerConfirmed : !transaction.buyerConfirmed
  }

  const canCancel = (transaction) => {
    return transaction.status === 'PENDING'
  }

  const canInitiateTransaction = () => {
    return listing && !transaction && listing.status === 'ACTIVE' && listing.userId !== user.uid
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

            <div className="flex items-center space-x-2">
              {/* Transaction Action Button */}
              {canInitiateTransaction() && (
                <button
                  onClick={() => setShowTransactionForm(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm flex items-center"
                >
                  <DollarSign className="w-4 h-4 mr-1" />
                  Start Transaction
                </button>
              )}

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
              <div className="flex-1">
                <h3 className="font-semibold">{listing.title}</h3>
                <p className="text-sm text-gray-400">Conversation about this listing</p>
                {listing.price && (
                  <p className="text-sm text-green-500 font-semibold">${parseFloat(listing.price).toFixed(2)}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Transaction Status */}
        {transaction && (
          <div className="p-4 border-b border-gray-700">
            <div className="bg-[#001020] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(transaction.status)}
                  <h4 className="font-semibold">Transaction Status</h4>
                </div>
                <span className="text-lg font-bold text-green-500">
                  ${parseFloat(transaction.agreedPrice).toFixed(2)}
                </span>
              </div>

              <p className="text-sm text-gray-300 mb-3">{getStatusText(transaction)}</p>

              <div className="grid grid-cols-2 gap-4 text-xs text-gray-400 mb-4">
                <div>
                  <span>Seller Confirmed:</span>
                  <span className={`ml-2 ${transaction.sellerConfirmed ? 'text-green-500' : 'text-gray-400'}`}>
                    {transaction.sellerConfirmed ? 'Yes' : 'No'}
                  </span>
                </div>
                <div>
                  <span>Buyer Confirmed:</span>
                  <span className={`ml-2 ${transaction.buyerConfirmed ? 'text-green-500' : 'text-gray-400'}`}>
                    {transaction.buyerConfirmed ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {canConfirm(transaction) && (
                  <button
                    onClick={confirmTransaction}
                    disabled={confirmingTransaction}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium flex items-center"
                  >
                    {confirmingTransaction ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        Confirming...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Confirm Transaction
                      </>
                    )}
                  </button>
                )}

                {canCancel(transaction) && (
                  <button
                    onClick={cancelTransaction}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-medium flex items-center"
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Cancel Transaction
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Transaction Form */}
        {showTransactionForm && (
          <div className="p-4 border-b border-gray-700">
            <div className="bg-[#001020] rounded-lg p-4">
              <h4 className="font-semibold mb-4">Start Transaction</h4>
              <form onSubmit={handleCreateTransaction} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Agreed Price</label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={agreedPrice}
                      onChange={(e) => setAgreedPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-10 pr-4 py-2 bg-[#000814] border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-[#00154B] focus:border-[#00154B]"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    This will initiate a transaction that both parties need to confirm
                  </p>
                </div>

                <div className="flex space-x-2">
                  <button
                    type="submit"
                    disabled={creatingTransaction || !agreedPrice}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium flex items-center"
                  >
                    {creatingTransaction ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 mr-1" />
                        Create Transaction
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTransactionForm(false)}
                    className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-[#00154B]/10 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
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
              const isSystemMessage = message.senderId === 'system'

              if (isSystemMessage) {
                return (
                  <div key={message.id} className="flex justify-center">
                    <div className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm max-w-md text-center">
                      <p>{message.content}</p>
                      <p className="text-xs text-gray-300 mt-1">
                        {formatMessageTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                )
              }

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
                      {isOwn && message.isRead && (
                        <span className="ml-1 text-green-400">✓</span>
                      )}
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
          <form onSubmit={handleSendMessage} className="flex items-center space-x-4">
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
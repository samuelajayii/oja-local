// app/hooks/useMessages.js
'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/app/context/AuthContext'

// Helper function to generate conversation ID
const getConversationId = (userId1, userId2, listingId) => {
  const sortedUsers = [userId1, userId2].sort()
  return `${listingId}_${sortedUsers[0]}_${sortedUsers[1]}`
}

// Helper function to safely convert timestamps
const convertTimestamp = (timestamp) => {
  if (!timestamp) return new Date()
  if (timestamp instanceof Date) return timestamp
  if (timestamp.toDate) return timestamp.toDate()
  if (timestamp._seconds) return new Date(timestamp._seconds * 1000)
  return new Date(timestamp)
}

export function useMessages(listingId, conversationWith) {
  const { currentUser: user } = useAuth()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [conversationId, setConversationId] = useState(null)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (!user || !listingId || !conversationWith) {
      setLoading(false)
      return
    }

    const convId = getConversationId(user.uid, conversationWith, listingId)
    setConversationId(convId)

    const fetchMessages = async () => {
      try {
        const token = await user.getIdToken()
        const response = await fetch(`/api/messages?listingId=${listingId}&conversationWith=${conversationWith}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        })

        if (response.ok) {
          const messagesData = await response.json()

          // Ensure all timestamps are properly converted
          const processedMessages = messagesData.map(message => ({
            ...message,
            createdAt: convertTimestamp(message.createdAt)
          }))

          setMessages(processedMessages)
          setError(null)
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          setError(errorData.error || 'Failed to fetch messages')
        }
      } catch (err) {
        console.error('Error fetching messages:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    // Initial fetch
    fetchMessages()

    // Set up polling for real-time updates (every 2 seconds)
    intervalRef.current = setInterval(fetchMessages, 2000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [user, listingId, conversationWith])

  const sendMessage = async (content) => {
    if (!user || !content.trim() || !conversationId) return false

    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: content.trim(),
          receiverId: conversationWith,
          listingId: listingId
        })
      })

      if (response.ok) {
        // Immediately fetch updated messages instead of manual state update
        const messagesResponse = await fetch(`/api/messages?listingId=${listingId}&conversationWith=${conversationWith}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        })

        if (messagesResponse.ok) {
          const updatedMessages = await messagesResponse.json()
          const processedMessages = updatedMessages.map(message => ({
            ...message,
            createdAt: convertTimestamp(message.createdAt)
          }))
          setMessages(processedMessages)
        }

        return true
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setError(error.message)
      return false
    }
  }

  const markMessagesAsRead = async () => {
    if (!conversationId || !user) return

    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/messages', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversationId: conversationId
        })
      })

      if (!response.ok) {
        console.error('Failed to mark messages as read')
      }
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }

  return {
    messages,
    loading,
    error,
    sendMessage,
    markMessagesAsRead,
    conversationId
  }
}

export function useConversations() {
  const { currentUser: user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    const fetchConversations = async () => {
      try {
        const token = await user.getIdToken()
        const response = await fetch('/api/messages', {
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        })

        if (response.ok) {
          const conversationsData = await response.json()

          // Ensure all timestamps are properly converted
          const processedConversations = conversationsData.map(conversation => ({
            ...conversation,
            updatedAt: convertTimestamp(conversation.updatedAt),
            lastMessage: conversation.lastMessage ? {
              ...conversation.lastMessage,
              createdAt: convertTimestamp(conversation.lastMessage.createdAt)
            } : null
          }))

          setConversations(processedConversations)
          setError(null)
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          setError(errorData.error || 'Failed to fetch conversations')
        }
      } catch (err) {
        console.error('Error fetching conversations:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    // Initial fetch
    fetchConversations()

    // Set up polling for real-time updates (every 5 seconds for conversations list)
    intervalRef.current = setInterval(fetchConversations, 5000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [user])

  return {
    conversations,
    loading,
    error
  }
}

// Helper function to migrate existing messages to conversation format
export async function migrateMessagesToConversations() {
  try {
    // This function is no longer needed as we're using the API-based approach
    console.log('Migration not needed - using API-based approach')
    return {
      success: true,
      migratedCount: 0
    }
  } catch (error) {
    console.error('Migration error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
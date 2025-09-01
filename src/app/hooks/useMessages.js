// app/hooks/useMessages.js
'use client'

import { useState, useEffect } from 'react'
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp
} from 'firebase/firestore'
import { db } from '@/app/lib/firebase'
import { useAuth } from '@/app/context/AuthContext'

export function useMessages(listingId, conversationWith) {
  const { currentUser: user } = useAuth()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user || !listingId || !conversationWith) {
      setLoading(false)
      return
    }

    const messagesRef = collection(db, 'messages')
    const q = query(
      messagesRef,
      where('listingId', '==', listingId),
      where('participants', 'array-contains-any', [user.uid, conversationWith]),
      orderBy('createdAt', 'asc')
    )

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const messagesData = []

      querySnapshot.forEach((doc) => {
        const messageData = doc.data()

        // Only include messages between these two specific users
        if ((messageData.senderId === user.uid && messageData.receiverId === conversationWith) ||
          (messageData.senderId === conversationWith && messageData.receiverId === user.uid)) {

          messagesData.push({
            id: doc.id,
            ...messageData,
            createdAt: messageData.createdAt?.toDate?.() || new Date(messageData.createdAt)
          })
        }
      })

      setMessages(messagesData)
      setLoading(false)
    }, (err) => {
      console.error('Error listening to messages:', err)
      setError(err.message)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user, listingId, conversationWith])

  const sendMessage = async (content) => {
    if (!user || !content.trim()) return false

    try {
      await addDoc(collection(db, 'messages'), {
        content: content.trim(),
        senderId: user.uid,
        receiverId: conversationWith,
        listingId: listingId,
        participants: [user.uid, conversationWith],
        createdAt: serverTimestamp(),
        isRead: false
      })
      return true
    } catch (error) {
      console.error('Error sending message:', error)
      return false
    }
  }

  return {
    messages,
    loading,
    error,
    sendMessage
  }
}

export function useConversations() {
  const { currentUser: user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    const messagesRef = collection(db, 'messages')
    const q = query(
      messagesRef,
      where('participants', 'array-contains', user.uid),
      orderBy('createdAt', 'desc')
    )

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const conversationsMap = new Map()

      querySnapshot.forEach((doc) => {
        const messageData = doc.data()
        const partnerId = messageData.senderId === user.uid ? messageData.receiverId : messageData.senderId
        const key = `${messageData.listingId}-${partnerId}`

        if (!conversationsMap.has(key)) {
          conversationsMap.set(key, {
            id: key,
            listingId: messageData.listingId,
            partnerId,
            lastMessage: {
              id: doc.id,
              ...messageData,
              createdAt: messageData.createdAt?.toDate?.() || new Date(messageData.createdAt)
            },
            unreadCount: 0
          })
        }

        // Count unread messages
        if (messageData.receiverId === user.uid && !messageData.isRead) {
          const conversation = conversationsMap.get(key)
          conversation.unreadCount++
        }
      })

      const conversationsArray = Array.from(conversationsMap.values())

      // Fetch additional data for each conversation
      const conversationsWithData = await Promise.all(
        conversationsArray.map(async (conv) => {
          try {
            // Get partner data
            const partnerResponse = await fetch(`/api/users/${conv.partnerId}`)
            const partner = partnerResponse.ok ? await partnerResponse.json() : null

            // Get listing data
            const listingResponse = await fetch(`/api/listings/${conv.listingId}`)
            const listing = listingResponse.ok ? await listingResponse.json() : null

            return {
              ...conv,
              partner,
              listing
            }
          } catch (error) {
            console.error('Error fetching conversation data:', error)
            return conv
          }
        })
      )

      setConversations(conversationsWithData)
      setLoading(false)
    }, (err) => {
      console.error('Error listening to conversations:', err)
      setError(err.message)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  return {
    conversations,
    loading,
    error
  }
}
import { useAuth } from '@/app/context/AuthContext'

export function useAuthenticatedFetch() {
  const { currentUser } = useAuth()
  
  const authenticatedFetch = async (url, options = {}) => {
    if (!currentUser) {
      throw new Error('User not authenticated')
    }
    
    const token = await currentUser.getIdToken()
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    // Check if response is actually JSON
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text()
      console.error('Non-JSON response received:', text)
      throw new Error(`Server returned non-JSON response: ${response.status}`)
    }

    return response
  }
  
  return authenticatedFetch
}
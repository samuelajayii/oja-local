"use client"
import { useState, useEffect } from 'react'
import { useAuth } from '@/app/context/AuthContext'
import { useAuthenticatedFetch } from '@/app/lib/useAuthenticatedFetch'
import { useRouter } from 'next/navigation'

export default function CreateListing() {
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [price, setPrice] = useState('')
    const [categoryId, setCategoryId] = useState('')
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const { currentUser } = useAuth()
    const authenticatedFetch = useAuthenticatedFetch()
    const router = useRouter()

    useEffect(() => {
        // Redirect if not logged in
        if (!currentUser) {
            router.push('/login')
            return
        }

        fetchCategories()
    }, [currentUser, router])

    const fetchCategories = async () => {
        try {
            const response = await fetch('/api/categories')
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }
            const data = await response.json()
            setCategories(data)
            if (data.length > 0) {
                setCategoryId(data[0].id) // Set first category as default
            }
        } catch (error) {
            console.error('Error fetching categories:', error)
            setError('Failed to load categories')
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const response = await authenticatedFetch('/api/listings', {
                method: 'POST',
                body: JSON.stringify({
                    title,
                    description,
                    price: price ? parseFloat(price) : null,
                    categoryId
                })
            })

            if (response.ok) {
                const result = await response.json()
                router.push('/listings')
            } else {
                let errorMessage = 'Unknown error occurred'
                try {
                    const errorData = await response.json()
                    errorMessage = errorData.message || errorMessage
                } catch (jsonError) {
                    // If JSON parsing fails, use status text
                    errorMessage = `Server error: ${response.status} ${response.statusText}`
                }
                setError(errorMessage)
            }
        } catch (error) {
            console.error('Error creating listing:', error)
            setError(error.message || 'Error creating listing')
        } finally {
            setLoading(false)
        }
    }

    if (!currentUser) {
        return <div>Redirecting...</div>
    }

    return (
        <div className="max-w-md mx-auto p-8 text-white min-h-screen">
            <h1 className="text-2xl mb-6">Create New Listing</h1>

            {error && (
                <div className="bg-red-500 text-white p-3 rounded mb-4">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Title</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-white"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 h-24 text-white"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Price ($)</label>
                    <input
                        type="number"
                        step="0.01"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-white"
                        placeholder="Optional"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Category</label>
                    <select
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        className="w-full placeholder:text-white border border-gray-300 rounded px-3 py-2 text-white"
                        required
                    >
                        {categories.map(category => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
                >
                    {loading ? 'Creating...' : 'Create Listing'}
                </button>
            </form>
        </div>
    )
}
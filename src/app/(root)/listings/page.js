"use client";
import { useAuth } from '../../context/AuthContext';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {

    const router = useRouter();
    const { currentUser, loading } = useAuth();

    useEffect(() => {
        if (!loading && !currentUser) {
            router.replace('/login');
        }
    }, [currentUser, router, loading]);

    if (loading || !currentUser) return (
        <div className="text-white h-screen flex items-center justify-center">
            <h1>Loading....</h1>
        </div>
    );

    return (
        <div className="text-white h-screen flex items-center justify-center">
            <h1>Home</h1>
        </div>
    );
}
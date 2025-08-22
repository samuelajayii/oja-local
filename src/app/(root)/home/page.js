"use client";
import { useAuth } from '../../context/AuthContext';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {

    const router = useRouter();
    const { currentUser, logout } = useAuth();

    useEffect(() => {
        if (!currentUser) {
            router.push('/login');
        }
    }, [currentUser, router]);

    return (
        <div className="text-white h-screen flex items-center justify-center">
            <h1>Home</h1>
        </div>
    );
}
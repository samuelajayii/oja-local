"use client";
import { createContext, useContext, useEffect, useState } from "react";
import {
    onAuthStateChanged,
    signOut,
    setPersistence,
    browserLocalPersistence
} from "firebase/auth";
import { auth } from "../lib/firebase"; // your firebase config

// Create context
const AuthContext = createContext();

// Provider
export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Force session persistence
        setPersistence(auth, browserLocalPersistence)
            .then(() => {
                // Listen for auth state changes
                const unsubscribe = onAuthStateChanged(auth, (user) => {
                    setCurrentUser(user);
                    setLoading(false);
                });
                return unsubscribe;
            })
            .catch((error) => {
                console.error("Auth persistence error:", error);
                setLoading(false);
            });
    }, []);

    const logout = () => signOut(auth);

    return (
        <AuthContext.Provider value={{ currentUser, loading, logout }}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

// Hook
export function useAuth() {
    return useContext(AuthContext);
}

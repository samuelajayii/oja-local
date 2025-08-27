"use client";
import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signOut,
  setPersistence,
  browserLocalPersistence
} from "firebase/auth";
import { auth, db as firestoreDb } from "../lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Function to create user in both Firestore and PostgreSQL
  const syncUserToDatabase = async (firebaseUser) => {
    try {
      if (!firestoreDb) return;

      // First, check/create in Firestore
      const userDocRef = doc(firestoreDb, "users", firebaseUser.uid);
      const userDocSnapshot = await getDoc(userDocRef);

      const userData = {
        userId: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
        photoURL: firebaseUser.photoURL || null,
        updatedAt: new Date().toISOString()
      };

      if (!userDocSnapshot.exists()) {
        // Create in Firestore
        await setDoc(userDocRef, {
          ...userData,
          createdAt: new Date().toISOString()
        });
        console.log('User created in Firestore:', userData);
      } else {
        // Update existing Firestore document
        await setDoc(userDocRef, userData, { merge: true });
        console.log('User updated in Firestore:', userData);
      }

      // Then sync to PostgreSQL via API
      const token = await firebaseUser.getIdToken();
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: userData.name,
          avatar: userData.photoURL
        })
      });

      if (!response.ok) {
        console.error('Failed to sync user to PostgreSQL:', response.statusText);
      } else {
        const postgresUser = await response.json();
        console.log('User synced to PostgreSQL:', postgresUser);
      }
    } catch (error) {
      console.error('Error syncing user to databases:', error);
    }
  };

  useEffect(() => {
    // only run if auth is available (client-side)
    if (!auth) {
      setLoading(false);
      return;
    }

    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          setCurrentUser(user);

          // If user is authenticated, ensure they exist in both databases
          if (user) {
            await syncUserToDatabase(user);
          }

          setLoading(false);
        });
        return unsubscribe;
      })
      .catch((error) => {
        console.error("Auth persistence error:", error);
        setLoading(false);
      });
  }, []);

  const logout = () => auth ? signOut(auth) : Promise.resolve();

  return (
    <AuthContext.Provider value={{ currentUser, loading, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
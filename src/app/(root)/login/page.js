/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { auth, db } from "@/app/lib/firebase";
import { faEnvelope, faLock, faPerson } from "@fortawesome/free-solid-svg-icons";
import { signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [toggleForm, setToggleForm] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();

  const handleEmailChange = (event) => {
    setEmail(event.target.value);
  };

  const handlePasswordChange = (event) => {
    setPassword(event.target.value);
  };

  const handleFirstNameChange = (event) => {
    setFirstName(event.target.value);
  };

  const handleLastNameChange = (event) => {
    setLastName(event.target.value);
  };

  // Function to sync user to PostgreSQL database
  const syncUserToPostgreSQL = async (user) => {
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: user.displayName,
          avatar: user.photoURL
        })
      });

      if (response.ok) {
        const postgresUser = await response.json();
        console.log('User synced to PostgreSQL:', postgresUser);
      } else {
        console.error('Failed to sync user to PostgreSQL:', response.statusText);
      }
    } catch (error) {
      console.error('Error syncing to PostgreSQL:', error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!auth) return;

    setLoading(true);
    setError("");

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log("User logged in:", user);

      // Sync to PostgreSQL
      await syncUserToPostgreSQL(user);

      // Clear form
      setEmail("");
      setPassword("");

      // Redirect to listings page after login
      router.push('/listings');
    } catch (error) {
      console.error("Error logging in:", error.message);
      setError("Failed to log in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!auth || !db) return;

    setLoading(true);
    setError("");

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName: `${firstName} ${lastName}`,
      });

      // Store user in Firestore
      const userDocRef = doc(db, "users", user.uid);
      const userData = {
        userId: user.uid,
        email: user.email,
        name: user.displayName,
        photoURL: user.photoURL || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(userDocRef, userData);
      console.log("User created in Firestore:", userData);

      // Sync to PostgreSQL
      await syncUserToPostgreSQL(user);

      // Clear form
      setEmail("");
      setPassword("");
      setFirstName("");
      setLastName("");

      console.log("User signed up:", user);

      // Redirect to listings page after signup
      router.push('/listings');
    } catch (error) {
      console.error("Error signing up:", error.message);
      setError("Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const provider = new GoogleAuthProvider();

  const handleGoogleSignIn = async (e) => {
    e.preventDefault();
    if (!auth || !db) return;

    setLoading(true);
    setError("");

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user exists in Firestore, if not, create a new user document
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnapshot = await getDoc(userDocRef);

      const userData = {
        userId: user.uid,
        email: user.email,
        name: user.displayName,
        photoURL: user.photoURL,
        updatedAt: new Date().toISOString()
      };

      if (!userDocSnapshot.exists()) {
        // Create new user document in Firestore
        await setDoc(userDocRef, {
          ...userData,
          createdAt: new Date().toISOString()
        });
        console.log("New user created in Firestore:", userData);
      } else {
        // Update existing user document
        await setDoc(userDocRef, userData, { merge: true });
        console.log("Existing user updated in Firestore:", userData);
      }

      // Sync to PostgreSQL
      await syncUserToPostgreSQL(user);

      console.log("User signed in with Google:", user);

      // Redirect to listings page after Google sign-in
      router.push('/listings');
    } catch (error) {
      console.error("Error signing in with Google:", error);
      setError("Failed to sign in with Google. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    toggleForm ? (
      <div className="flex text-white flex-col items-center justify-center lg:h-screen">
        <div className="w-fit flex flex-col items-center mt-20">
          <img src="cart.png" className="h-20 w-24" />

          <div className="px-5 py-7">
            <form className="flex-col flex gap-5 items-center w-full h-full" onSubmit={handleLogin}>
              {error && (
                <div className="text-red-400 text-sm text-center lg:w-[300px]">
                  {error}
                </div>
              )}

              <div className="border border-white rounded-sm px-4 py-3 flex flex-row items-center gap-4 lg:w-[300px]">
                <FontAwesomeIcon className="" icon={faEnvelope}></FontAwesomeIcon>
                <input
                  onChange={handleEmailChange}
                  value={email}
                  type="email"
                  placeholder="EMAIL"
                  className="placeholder:text-gray-400 outline-none w-full bg-transparent"
                  required
                />
              </div>

              <div className="border border-white rounded-sm px-4 py-3 flex flex-row items-center gap-4 lg:w-[300px]">
                <FontAwesomeIcon className="" icon={faLock}></FontAwesomeIcon>
                <input
                  onChange={handlePasswordChange}
                  value={password}
                  type="password"
                  placeholder="PASSWORD"
                  className="placeholder:text-gray-400 outline-none bg-transparent"
                  required
                />
              </div>

              <button type="submit" disabled={loading}>
                <div className="bg-[#00154B] font-medium rounded-sm px-6 py-2 hover:bg-[#00296B] transition-all border border-white duration-300 cursor-pointer lg:w-[300px] disabled:opacity-50">
                  {loading ? "Logging in..." : "Log in"}
                </div>
              </button>

              <button type="button" onClick={handleGoogleSignIn} disabled={loading}>
                <div className="bg-white text-[#00154B] font-medium rounded-sm px-6 py-2 hover:bg-gray-100 transition-all border border-[#00154B]/20 duration-300 cursor-pointer lg:w-[300px] disabled:opacity-50">
                  {loading ? "Signing in..." : "Log in with Google"}
                </div>
              </button>
            </form>

            <h1 onClick={() => { setToggleForm(!toggleForm) }} className="underline self-start cursor-pointer mt-4">
              Don&apos;t have an account? Sign up
            </h1>
          </div>
        </div>
      </div>
    ) : (
      <div className="flex text-white flex-col items-center justify-center">
        <div className="w-fit flex flex-col items-center my-[130px]">
          <img src="cart.png" className="h-20 w-24" />

          <div className="px-5 py-7">
            <form className="grid grid-cols-2 gap-5 w-full h-full" onSubmit={handleSignUp}>
              {error && (
                <div className="text-red-400 text-sm text-center col-span-2">
                  {error}
                </div>
              )}

              <div className="border border-white rounded-sm px-4 py-3 flex flex-row items-center gap-4 w-full">
                <FontAwesomeIcon icon={faPerson} />
                <input
                  onChange={handleFirstNameChange}
                  value={firstName}
                  type="text"
                  placeholder="FIRST NAME"
                  className="placeholder:text-gray-400 outline-none w-full bg-transparent"
                  required
                />
              </div>

              <div className="border border-white rounded-sm px-4 py-3 flex flex-row items-center gap-4 w-full">
                <FontAwesomeIcon icon={faPerson} />
                <input
                  onChange={handleLastNameChange}
                  value={lastName}
                  type="text"
                  placeholder="LAST NAME"
                  className="placeholder:text-gray-400 outline-none w-full bg-transparent"
                  required
                />
              </div>

              <div className="border border-white rounded-sm px-4 py-3 flex flex-row items-center gap-4 w-full col-span-2">
                <FontAwesomeIcon icon={faEnvelope} />
                <input
                  onChange={handleEmailChange}
                  value={email}
                  type="email"
                  placeholder="EMAIL"
                  className="placeholder:text-gray-400 outline-none w-full bg-transparent"
                  required
                />
              </div>

              <div className="border border-white rounded-sm px-4 py-3 flex flex-row items-center gap-4 w-full col-span-2">
                <FontAwesomeIcon icon={faLock} />
                <input
                  onChange={handlePasswordChange}
                  value={password}
                  type="password"
                  placeholder="PASSWORD"
                  className="placeholder:text-gray-400 outline-none w-full bg-transparent"
                  required
                />
              </div>

              <button type="submit" className="col-span-2" disabled={loading}>
                <div className="bg-[#00154B] font-medium rounded-sm px-6 py-2 hover:bg-[#00296B] transition-all border border-white duration-300 cursor-pointer w-full text-center disabled:opacity-50">
                  {loading ? "Signing up..." : "Sign Up"}
                </div>
              </button>

              <button type="button" onClick={handleGoogleSignIn} className="col-span-2" disabled={loading}>
                <div className="bg-white text-[#00154B] font-medium rounded-sm px-6 py-2 hover:bg-gray-100 transition-all border border-[#00154B]/20 duration-300 cursor-pointer w-full text-center disabled:opacity-50">
                  {loading ? "Signing up..." : "Sign Up with Google"}
                </div>
              </button>
            </form>

            <h1 onClick={() => { setToggleForm(!toggleForm) }} className="underline self-start cursor-pointer mt-2">
              Already have an account? Log in
            </h1>
          </div>
        </div>
      </div>
    )
  );
}
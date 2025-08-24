/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { auth, db } from "@/app/lib/firebase";
import { faEnvelope, faLock, faPerson } from "@fortawesome/free-solid-svg-icons";
import { getAuth, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";


export default function SignIn() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [toggleForm, setToggleForm] = useState(true)

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

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!auth) return;
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            console.log("User logged in:", user);
        } catch (error) {
            console.error("Error logging in:", error.message);
        }

        setEmail("");
        setPassword("");
        router.push('/listings'); // Redirect to listings page after login
    };

    const handleSignUp = async (e) => {
        if (!auth) return;
        e.preventDefault();
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await updateProfile(user, {
                displayName: `${firstName} ${lastName}`,
            });

            // Store user in Firestore
            const userDocRef = doc(db, "users", user.uid);
            await setDoc(userDocRef, {
                userId: user.uid,
                email: user.email,
                name: user.displayName,
                photoURL: user.photoURL || null, // Optional, if you want to store user's photo URL
            });

            setEmail("");
            setPassword("");
            setFirstName("");
            setLastName("");

            console.log("User signed up:", user);
            router.push('/listings'); // Redirect to listings page after signup
        } catch (error) {
            console.error("Error signing up:", error.message);
        }
    };


    const provider = new GoogleAuthProvider();

    const handleGoogleSignIn = async (e) => {
        e.preventDefault();
        if (!auth) return;
        try {
            await signInWithPopup(auth, provider);
            const user = auth.currentUser;
            // Check if user exists in Firestore, if not, create a new user document
            if (user) {
                const userDocRef = doc(db, "users", user.uid);
                const userDocSnapshot = await getDoc(userDocRef);
                if (!userDocSnapshot.exists()) {
                    await setDoc(userDocRef, {
                        userId: user.uid,
                        email: user.email,
                        name: user.displayName,
                        photoURL: user.photoURL,
                    });
                }
            }
            router.push('/listings'); // Redirect to home page after Google sign-in
            console.log("User signed in with Google:", user);
        } catch (error) {
            console.error("Error signing in with Google:", error);
        }
    }



    return (
        toggleForm ? (
            <div className="flex text-white flex-col items-center justify-center lg:h-screen">
                <div className="w-fit flex flex-col items-center mt-20">
                    <img src="cart.png" className="h-20 w-24" />

                    <div className="px-5 py-7">
                        <form className="flex-col flex gap-5 items-center w-full h-full">
                            <div className="border border-white rounded-sm px-4 py-3 flex flex-row items-center gap-4 lg:w-[300px]">
                                <FontAwesomeIcon className="" icon={faEnvelope}></FontAwesomeIcon>
                                <input onChange={handleEmailChange} type="email" placeholder="EMAIL" className=" placeholder:text-gray-400 outline-none  w-full"></input>
                            </div>

                            <div className="border border-white rounded-sm px-4 py-3 flex flex-row  items-center gap-4 lg:w-[300px]">
                                <FontAwesomeIcon className="" icon={faLock}></FontAwesomeIcon>
                                <input onChange={handlePasswordChange} type="password" placeholder="PASSWORD" className=" placeholder:text-gray-400 outline-none "></input>
                            </div>

                            <button>
                                <div onClick={handleLogin} className="bg-[#00154B]  font-medium rounded-sm px-6 py-2 hover:bg-[#00296B] transition-all border border-white duration-300 cursor-pointer lg:w-[300px]">
                                    Log in
                                </div>
                            </button>

                            <button onClick={handleGoogleSignIn}>
                                <div className="bg-white text-[#00154B] font-medium rounded-sm px-6 py-2 hover:bg-gray-100 transition-all border border-[#00154B]/20 duration-300 cursor-pointer lg:w-[300px]">
                                    Log in with Google
                                </div>
                            </button>
                        </form>

                        <h1 onClick={() => { setToggleForm(!toggleForm) }} className="underline self-start cursor-pointer">Don&apos;t have an account? Sign up</h1>
                    </div>
                </div>
            </div>
        ) : (
            <div className="flex text-white flex-col items-center justify-center">
                <div className="w-fit flex flex-col items-center my-[130px]">
                    <img src="cart.png" className="h-20 w-24" />

                    <div className="px-5 py-7">
                        <form className="grid grid-cols-2 gap-5 w-full h-full">
                            <div className="border border-white rounded-sm px-4 py-3 flex flex-row items-center gap-4 w-full">
                                <FontAwesomeIcon icon={faPerson} />
                                <input
                                    onChange={handleFirstNameChange}
                                    type="text"
                                    placeholder="FIRST NAME"
                                    className="placeholder:text-gray-400 outline-none w-full"
                                />
                            </div>

                            <div className="border border-white rounded-sm px-4 py-3 flex flex-row items-center gap-4 w-full">
                                <FontAwesomeIcon icon={faPerson} />
                                <input
                                    onChange={handleLastNameChange}
                                    type="text"
                                    placeholder="LAST NAME"
                                    className="placeholder:text-gray-400 outline-none w-full"
                                />
                            </div>

                            <div className="border border-white rounded-sm px-4 py-3 flex flex-row items-center gap-4 w-full col-span-2">
                                <FontAwesomeIcon icon={faEnvelope} />
                                <input
                                    onChange={handleEmailChange}
                                    type="email"
                                    placeholder="EMAIL"
                                    className="placeholder:text-gray-400 outline-none w-full"
                                />
                            </div>

                            <div className="border border-white rounded-sm px-4 py-3 flex flex-row items-center gap-4 w-full col-span-2">
                                <FontAwesomeIcon icon={faLock} />
                                <input
                                    onChange={handlePasswordChange}
                                    type="password"
                                    placeholder="PASSWORD"
                                    className="placeholder:text-gray-400 outline-none w-full"
                                />
                            </div>

                            <button className="col-span-2">
                                <div onClick={handleSignUp} className="bg-[#00154B] font-medium rounded-sm px-6 py-2 hover:bg-[#00296B] transition-all border border-white duration-300 cursor-pointer w-full text-center">
                                    Sign Up
                                </div>
                            </button>

                            <button onClick={handleGoogleSignIn} className="col-span-2">
                                <div className="bg-white text-[#00154B] font-medium rounded-sm px-6 py-2 hover:bg-gray-100 transition-all border border-[#00154B]/20 duration-300 cursor-pointer w-full text-center">
                                    Sign Up with Google
                                </div>
                            </button>
                        </form>

                        <h1 onClick={() => { setToggleForm(!toggleForm) }} className="underline self-start cursor-pointer mt-2">Already have an account? Log in</h1>
                    </div>
                </div>
            </div>
        )
    );
}

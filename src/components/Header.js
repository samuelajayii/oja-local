'use client'

/* eslint-disable @next/next/no-img-element */
import React, { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '../app/context/AuthContext'
import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { getInitials } from '@/app/lib/utils'
import { Menu, X } from "lucide-react"

const Header = () => {
  const { currentUser, logout } = useAuth()
  const router = useRouter()
  const { currentUser: user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = async () => {
    try {
      router.push('/login')
      await logout()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <header>
      <nav className="flex z-10 flex-row justify-between items-center fixed top-0 right-0 left-0 py-4 px-4 md:px-8 text-white backdrop-blur-[10.2px] ">
        {/* Logo */}
        <Link href="/">
          <div>
            <img src="/logo.png" alt="Logo" className="h-12 w-12 md:h-14 md:w-14" />
          </div>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex gap-6 items-center">
          <Link href="/listings" className="hover:text-gray-200">Browse Listings</Link>
          <Link href="/listings/create" className="hover:text-gray-200">Post Item</Link>
          <Link href="#" className="hover:text-gray-200">Categories</Link>
          <Link href="/" className="hover:text-gray-200">How It Works</Link>
          <Link href={`/users/${user?.uid}?tab=messages`} className="hover:text-gray-200">Messaging</Link>
        </div>

        {/* Auth buttons */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-[#00154B] text-white font-semibold hover:bg-[#00296B] transition-all">
                  {getInitials(currentUser.displayName) || currentUser.email}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48 text-white mt-2 rounded-xl shadow-lg">
                <DropdownMenuLabel className="text-sm">My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <Link href={`/users/${currentUser.uid}`}><DropdownMenuItem>Profile</DropdownMenuItem></Link>
                <DropdownMenuItem>Billing</DropdownMenuItem>
                <DropdownMenuItem>Team</DropdownMenuItem>
                <DropdownMenuItem>Subscription</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              href="/login"
              className="hidden md:block bg-[#00154B] text-xs md:text-sm rounded-lg px-3 md:px-4 py-1.5 md:py-2 text-white hover:bg-[#00296B] transition-all duration-300 cursor-pointer"
            >
              <span className="drop-shadow-[0_0_2px_white]">Login</span>
            </Link>
          )}

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-[#00296B]"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Dropdown Menu */}
      {menuOpen && (
        <div className="md:hidden fixed top-16 left-0 right-0 bg-[#00154B] text-white flex flex-col gap-4 p-6 z-20">
          <Link href="/listings" onClick={() => setMenuOpen(false)}>Browse Listings</Link>
          <Link href="/listings/create" onClick={() => setMenuOpen(false)}>Post Item</Link>
          <Link href="/" onClick={() => setMenuOpen(false)}>Categories</Link>
          <Link href="/" onClick={() => setMenuOpen(false)}>How It Works</Link>
          <Link href={`/users/${user?.uid}?tab=messages`} onClick={() => setMenuOpen(false)}>Messaging</Link>
          {!currentUser && (
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="bg-white text-[#00154B] px-4 py-2 rounded-lg text-center"
            >
              Login
            </Link>
          )}
        </div>
      )}
    </header>
  )
}

export default Header

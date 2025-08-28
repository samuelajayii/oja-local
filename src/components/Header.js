'use client'

/* eslint-disable @next/next/no-img-element */
import React from 'react'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../app/context/AuthContext'
import { useRouter } from 'next/navigation'
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle } from "@/components/ui/navigation-menu"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { getInitials } from '@/app/lib/utils'
import { useParams } from 'next/navigation'


const Header = () => {
  const { currentUser, logout } = useAuth()
  const router = useRouter()

  const { id } = useParams()
  const { currentUser: user } = useAuth()

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

      <nav className="flex z-1 flex-row justify-between items-center fixed top-0 right-0 left-0 py-4 px-8 text-white backdrop-blur-[10.2px]">
        <Link href="/">
          <div>
            <img src="/logo.png" alt="Logo" className="h-14 w-14" />
          </div>
        </Link>

        {/* Links */}
        <NavigationMenu className='' viewport={false}>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                <Link href="/listings">Browse Listings</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                <Link href="/listings/create">Post Item</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuTrigger>Categories</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[200px] gap-4">
                  <li>
                    <NavigationMenuLink asChild>
                      <Link href="#">Electronics</Link>
                    </NavigationMenuLink>
                    <NavigationMenuLink asChild>
                      <Link href="#">Vehicles</Link>
                    </NavigationMenuLink>
                    <NavigationMenuLink asChild>
                      <Link href="#">Clothings</Link>
                    </NavigationMenuLink>
                    <NavigationMenuLink asChild>
                      <Link href="#">Jewelries</Link>
                    </NavigationMenuLink>
                    <NavigationMenuLink asChild>
                      <Link href="#">Furniture</Link>
                    </NavigationMenuLink>
                    <NavigationMenuLink asChild>
                      <Link href="#">Home & Garden</Link>
                    </NavigationMenuLink>
                    <NavigationMenuLink asChild>
                      <Link href="#">Other</Link>
                    </NavigationMenuLink>
                  </li>
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                <Link href="/docs">How It Works</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                <Link href={`/users/${user?.uid}?tab=messages`}>Messaging</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        {/* Auth buttons */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            <>
              {/* User’s name */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-10 h-10 flex items-center justify-center rounded-full bg-[#00154B] text-white font-semibold hover:bg-[#00296B] transition-all">
                    {getInitials(currentUser.displayName) || currentUser.email}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48 text-white mt-2 rounded-xl shadow-lg">
                  <DropdownMenuLabel className="text-sm">My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <Link href={`/users/${currentUser.uid}`}>
                    <DropdownMenuItem>Profile</DropdownMenuItem>
                  </Link>
                  <DropdownMenuItem>Billing</DropdownMenuItem>
                  <DropdownMenuItem>Team</DropdownMenuItem>
                  <DropdownMenuItem>Subscription</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="">Logout</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Link
              href="/login"
              className="bg-[#00154B] text-sm rounded-lg px-4 py-2 text-white hover:bg-[#00296B] transition-all duration-300 cursor-pointer"
            >
              <span className="drop-shadow-[0_0_2px_white]">Login</span>
            </Link>
          )}
        </div>
      </nav>
    </header >
  )
}

export default Header

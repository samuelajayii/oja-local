/* eslint-disable @next/next/no-img-element */
import { faGoogle } from "@fortawesome/free-brands-svg-icons";
import { faCreditCard, faHandshake, faMoneyBills, faSearch, faShop, faSignIn } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";



export default function Home() {
  return (
    <div>
      <div className="flex flex-col gap-7 items-center mt-28 md:mt-40 text-white px-4 md:px-20">

        {/* Hero text */}
        <div className="flex flex-col gap-3 items-center text-center">
          <h1 className="text-2xl md:text-3xl">Buy & sell within your neighbourhood. Fast, safe, and local.</h1>
          <h1 className="text-xl md:text-2xl">Find great deals near you or list your items in minutes</h1>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-10">
          <Link href="/listings" className="w-full sm:w-auto">
            <button className="bg-[#00154B] text-white font-medium rounded-lg px-6 py-2 shadow-md hover:bg-[#00296B] transition-all duration-300 cursor-pointer w-full sm:w-auto">
              Browse Listings
            </button>
          </Link>

          <Link href="/listings/create" className="w-full sm:w-auto">
            <button className="bg-white text-[#00154B] font-medium rounded-lg px-6 py-2 shadow-md hover:bg-gray-100 border border-[#00154B]/20 transition-all duration-300 cursor-pointer w-full sm:w-auto">
              Post an Item
            </button>
          </Link>
        </div>

        {/* Features + hero image */}
        <div className="w-full mt-16 md:mt-20">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
            <ul className="flex flex-col gap-4 text-lg md:text-2xl">
              <li className="flex gap-3 items-center"><FontAwesomeIcon icon={faShop} className="w-6 md:w-7" /> Local & community-driven marketplace</li>
              <li className="flex gap-3 items-center"><FontAwesomeIcon icon={faGoogle} className="w-6 md:w-7" /> Verified users with Google sign-in</li>
              <li className="flex gap-3 items-center"><FontAwesomeIcon icon={faCreditCard} className="w-6 md:w-7" /> Safe and easy transactions</li>
              <li className="flex gap-3 items-center"><FontAwesomeIcon icon={faMoneyBills} className="w-6 md:w-7" /> Free to list and browse</li>
            </ul>
            <img src="hero-pic.png" alt="hero" className="w-full max-w-sm lg:max-w-md rounded-full" />
          </div>

          {/* Steps */}
          <div className="flex flex-col lg:flex-row justify-between items-center gap-10 my-16 md:my-20">
            <img src="marketplace.png" alt="Marketplace App Img" className="w-full max-w-sm lg:max-w-md" />
            <ul className="flex flex-col gap-4 text-lg md:text-2xl">
              <li className="flex gap-3 items-center"><FontAwesomeIcon icon={faSignIn} className="w-5 md:w-6" /> Sign in</li>
              <li className="flex gap-3 items-center"><FontAwesomeIcon icon={faSearch} className="w-5 md:w-6" /> Post or browse listings</li>
              <li className="flex gap-3 items-center"><FontAwesomeIcon icon={faHandshake} className="w-5 md:w-6" /> Meet safely and trade</li>
            </ul>
          </div>
        </div>
      </div>

      <footer className="bg-[#00154B] w-full text-white mt-10 md:mt-20 px-6 md:px-20 py-10">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-10">
          {/* Logo */}
          <div className="flex flex-col gap-2 items-center lg:items-start">
            <img src='/logo.png' alt='Logo' className='h-12 w-12 md:h-14 md:w-14' />
            <p className="text-xs md:text-sm text-gray-300">Your neighbourhood marketplace</p>
          </div>

          {/* Links */}
          <ul className="flex flex-col lg:flex-row gap-3 md:gap-5 text-xs md:text-sm text-center">
            <li><a href="#" className="hover:text-gray-300 transition-all">About</a></li>
            <li><a href="#" className="hover:text-gray-300 transition-all">How It Works</a></li>
            <li><a href="#" className="hover:text-gray-300 transition-all">Support</a></li>
            <li><a href="#" className="hover:text-gray-300 transition-all">Privacy Policy</a></li>
          </ul>

          {/* Socials */}
          <div className="flex gap-4 md:gap-5 text-lg md:text-xl">
            <a href="#" className="hover:text-gray-300 transition-all"><FontAwesomeIcon icon={faGoogle} /></a>
            <a href="#" className="hover:text-gray-300 transition-all"><FontAwesomeIcon icon={faHandshake} /></a>
            <a href="#" className="hover:text-gray-300 transition-all"><FontAwesomeIcon icon={faShop} /></a>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-700 mt-8 pt-5 text-center text-xs md:text-sm text-gray-400">
          © {new Date().getFullYear()} OjaLocal. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

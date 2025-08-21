/* eslint-disable @next/next/no-img-element */
import { faGoogle } from "@fortawesome/free-brands-svg-icons";
import { faCreditCard, faHandshake, faMoneyBills, faSearch, faShop, faSignIn } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export default function Home() {
  return (
    <div className=" flex flex-col gap-7 items-center mt-40 text-white">
      <div className="flex flex-col gap-3 items-center">
        <h1 className="text-3xl">Buy & sell within your neighbourhood. Fast, safe, and local.</h1>
        <h1 className="text-2xl">Find great deals near you or list your items in minutes</h1>
      </div>

      <div className="flex items-center gap-10">
        <button className="bg-[#00154B] text-white font-medium rounded-lg px-6 py-2 shadow-md hover:bg-[#00296B] transition-all duration-300 cursor-pointer">
          Browse Listings
        </button>

        <button className="bg-white text-[#00154B] font-medium rounded-lg px-6 py-2 shadow-md hover:bg-gray-100 border border-[#00154B]/20 transition-all duration-300 cursor-pointer">
          Post an Item
        </button>
      </div>

      <div className="px-20 w-full">
        <div className="flex items-center justify-between w-full mt-20">
          <ul className="flex flex-col gap-4 text-2xl">
            <li className="flex gap-3 items-center"><FontAwesomeIcon icon={faShop} className="w-7" /> Local & community-driven marketplace</li>
            <li className="flex gap-3 items-center"><FontAwesomeIcon icon={faGoogle} className="w-7" />Verified users with Google sign-in</li>
            <li className="flex gap-3 items-center"><FontAwesomeIcon icon={faCreditCard} className="w-7" />Safe and easy transactions</li>
            <li className="flex gap-3 items-center"><FontAwesomeIcon icon={faMoneyBills} className="w-7" />Free to list and browse</li>
          </ul>
          <img src="hero-pic.png" alt="hero" className=" lg:h-[490px] bg-black lg:w-[500px] rounded-full" />
        </div>

        <div className="flex justify-between items-center w-full my-20">
          <img src="marketplace.png" alt="Marketplace App Img" className="lg:h-[350px] lg:w-[500px]" />

          <ul className="flex flex-col gap-4 text-2xl">
            <li className="flex gap-3 items-center"><FontAwesomeIcon icon={faSignIn} className="w-6" /> Sign in</li>
            <li className="flex gap-3 items-center"><FontAwesomeIcon icon={faSearch} className="w-6" />Post or browse listings</li>
            <li className="flex gap-3 items-center"><FontAwesomeIcon icon={faHandshake} className="w-6" />Meet safely and trade</li>

          </ul>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#00154B] w-full text-white mt-20 px-20 py-10">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-10">
          {/* Logo + tagline */}
          <div className="flex flex-col gap-2 items-center lg:items-start">
            <img src='/logo.png' alt='Logo' className='h-14 w-14' />
            <p className="text-sm text-gray-300">Your neighbourhood marketplace</p>
          </div>

          {/* Links */}
          <ul className="flex flex-col lg:flex-row gap-5 text-sm">
            <li><a href="#" className="hover:text-gray-300 transition-all">About</a></li>
            <li><a href="#" className="hover:text-gray-300 transition-all">How It Works</a></li>
            <li><a href="#" className="hover:text-gray-300 transition-all">Support</a></li>
            <li><a href="#" className="hover:text-gray-300 transition-all">Privacy Policy</a></li>
          </ul>

          {/* Socials */}
          <div className="flex gap-5 text-xl">
            <a href="#" className="hover:text-gray-300 transition-all"><FontAwesomeIcon icon={faGoogle} /></a>
            <a href="#" className="hover:text-gray-300 transition-all"><FontAwesomeIcon icon={faHandshake} /></a>
            <a href="#" className="hover:text-gray-300 transition-all"><FontAwesomeIcon icon={faShop} /></a>
          </div>
        </div>

        {/* Divider + bottom note */}
        <div className="border-t border-gray-700 mt-8 pt-5 text-center text-sm text-gray-400">
          © {new Date().getFullYear()} OjaLocal. All rights reserved.
        </div>
      </footer>


    </div>
  );
}

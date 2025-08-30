/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { faGoogle } from "@fortawesome/free-brands-svg-icons";
import { faHandshake, faShop } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const Footer = () => {
  return (
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
  );
}

export default Footer;
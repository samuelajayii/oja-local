/* eslint-disable @next/next/no-img-element */
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';

const Header = () => {
    return (
        <header className=''>
            <nav className='flex flex-row justify-between items-center fixed top-0 right-0 left-0 py-4 px-8 text-white backdrop-blur-[10.2px]'>
                <div>
                    <img src='/logo.png' alt='Logo' className='h-14 w-14' />
                </div>

                <ul className='flex justify-between gap-10 items-center'>
                    <li>Browse Listings</li>
                    <li>Post Item</li>
                    <li>Categories</li>
                    <li>How It Works</li>
                </ul>

                <div>
                    <div className='flex items-center justify-center gap-2 outline-none py-3 w-[20vw] lg:w-[20vw] px-3 text-black rounded-lg h-full bg-white'>
                        <FontAwesomeIcon icon={faMagnifyingGlass} className='h-5'></FontAwesomeIcon>
                        <input type='text' placeholder='Search' className='w-full outline-none h-full'></input>
                    </div>
                </div>

                <button className="bg-[#00154B] text-sm rounded-lg px-4 py-2 text-white hover:bg-[#00296B] transition-all duration-300 cursor-pointer">
                    <span className="drop-shadow-[0_0_2px_white] h-full w-full">Login</span>
                </button>

            </nav>
        </header>
    );
};


export default Header;
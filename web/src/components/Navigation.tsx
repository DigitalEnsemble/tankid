'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 w-full z-50 transition-transform duration-300 ${
      isScrolled ? '-translate-y-full' : 'translate-y-0'
    } bg-white shadow-sm`}>
      <div className="container mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-center">
          <Link href="/">
            <Image
              src="/images/tankid logo white.jpeg"
              alt="TankID.io"
              width={240}
              height={64}
              className="h-12 sm:h-16 w-auto"
            />
          </Link>
        </div>
      </div>
    </nav>
  );
}
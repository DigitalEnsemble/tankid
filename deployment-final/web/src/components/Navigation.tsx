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
        <div className="flex items-center justify-between">
          <Link href="/">
            <Image
              src="/images/tankid logo white.jpeg"
              alt="TankID.io"
              width={240}
              height={64}
              className="h-12 sm:h-16 w-auto"
            />
          </Link>
          
          {/* Action Buttons - Responsive Design */}
          <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <a
              href="https://app.tankid.io"
              className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg font-semibold text-sm sm:text-base transition-colors w-full sm:w-auto text-center"
            >
              🔍 Facility Lookup
            </a>
            <Link
              href="/get-access"
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg font-semibold text-sm sm:text-base transition-colors w-full sm:w-auto text-center"
            >
              Join Early Access
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
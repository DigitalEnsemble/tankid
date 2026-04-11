'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { href: '/overview', label: 'Overview' },
    { href: '/for-facilities', label: 'For Facilities' },
    { href: '/for-technicians', label: 'For Technicians' },
    { href: '/how-it-works', label: 'How It Works' },
    { href: '/contact-us', label: 'Contact Us' },
  ];

  return (
    <nav className={`fixed top-0 w-full z-50 transition-transform duration-300 ${
      isScrolled ? '-translate-y-full' : 'translate-y-0'
    } bg-gray-900 shadow-sm`}>
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/">
            <Image
              src="/images/TankID-Logo-New.jpeg"
              alt="TankID.io"
              width={120}
              height={32}
              className="h-8 w-auto"
            />
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <div className="flex items-center space-x-6">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${
                    pathname === item.href
                      ? 'text-orange-400 font-semibold'
                      : 'text-white hover:text-orange-400'
                  } transition-colors`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-4">
              <a
                href="https://app.tankid.io"
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                🔍 Look up a facility
              </a>
              <Link
                href="/get-access"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                Get early access
              </Link>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden text-white p-2"
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isMenuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-gray-700">
            <div className="flex flex-col space-y-4 pt-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`${
                    pathname === item.href
                      ? 'text-orange-400 font-semibold'
                      : 'text-white hover:text-orange-400'
                  } transition-colors py-2`}
                >
                  {item.label}
                </Link>
              ))}
              
              {/* Mobile Action Buttons */}
              <div className="flex flex-col space-y-3 pt-4 border-t border-gray-700">
                <a
                  href="https://app.tankid.io"
                  className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-3 rounded-lg font-semibold text-center transition-colors"
                >
                  🔍 Look up a facility
                </a>
                <Link
                  href="/get-access"
                  onClick={() => setIsMenuOpen(false)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-semibold text-center transition-colors"
                >
                  Get early access
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
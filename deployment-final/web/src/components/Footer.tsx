import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="container mx-auto px-6">
        <div className="flex flex-col justify-center items-center">
          <div className="flex flex-wrap gap-6 mb-4 justify-center">
            <a href="https://app.tankid.io" className="hover:text-orange-400">
              Facility lookup
            </a>
            <Link href="/overview" className="hover:text-orange-400">
              Overview
            </Link>
            <Link href="/get-access" className="hover:text-orange-400">
              Get Access
            </Link>
            <Link href="/contact-us" className="hover:text-orange-400">
              Contact Us
            </Link>
          </div>
        </div>
        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
          <p>© 2026 TankID.io — The Universal Storage Tank Registry</p>
        </div>
      </div>
    </footer>
  );
}
import Image from 'next/image';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function OverviewPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      <Navigation />

      {/* Hero Section */}
      <section className="relative text-white overflow-hidden min-h-screen flex items-center">
        <Image
          src="/images/TankID cover.jpg"
          alt="Storage tank facility"
          fill
          className="object-cover"
          sizes="100vw"
        />
      </section>

      {/* Stats Bar */}
      <section className="bg-blue-600 text-white py-8">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold">20 sec</div>
              <div className="text-blue-100">To full tank profile on arrival</div>
            </div>
            <div>
              <div className="text-3xl font-bold">AST + UST</div>
              <div className="text-blue-100">Above ground & underground</div>
            </div>
            <div>
              <div className="text-3xl font-bold">0 app</div>
              <div className="text-blue-100">No download — any phone</div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
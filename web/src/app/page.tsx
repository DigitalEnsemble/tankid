import { headers } from 'next/headers';
import Image from 'next/image';
import Link from 'next/link';
import FacilitySearch from '@/components/FacilitySearch';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default async function HomePage() {
  // Get hostname from request headers
  const headersList = await headers();
  const hostname = headersList.get('host') || '';
  
  // Determine which content to show based on hostname
  const isAppDomain = hostname.includes('app.tankid.io');
  
  // If it's app.tankid.io, show facility search instead of marketing page
  if (isAppDomain) {
    return <FacilitySearch />;
  }
  
  // Otherwise show the marketing homepage (old Overview content)
  return (
    <div className="min-h-screen">
      <Navigation />

      {/* Homepage Content */}
      <section className="pt-20 py-16 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8 text-center sm:text-left">
              What is TankID?
            </h1>
            
            <div className="prose prose-lg mb-12">
              <p className="text-gray-700 mb-6 text-base sm:text-lg">
                TankID is the universal registry for above ground and underground storage tanks (ASTs and USTs). 
                It is a cloud database with a mobile-first interface that stores, organizes, and makes instantly 
                accessible the complete technical profile of every storage tank at a facility.
              </p>
              <p className="text-gray-700 mb-8 text-base sm:text-lg">
                Whether you are a facility owner who needs your compliance calendar under control, or a field 
                technician who just pulled up to an unfamiliar site — TankID puts every tank's critical data 
                on your screen in seconds. Scan the QR label posted inside the facility, or look up by facility 
                number at app.tankid.io. No phone calls. No paper filing cabinets. No waiting on hold.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 sm:gap-8 mb-12">
              <div className="bg-white p-6 sm:p-8 rounded-lg shadow-sm">
                <h3 className="text-lg sm:text-xl font-bold text-green-600 mb-4">TankID IS</h3>
                <ul className="space-y-2 text-gray-700 text-sm sm:text-base">
                  <li>The data layer underneath your ATG, compliance platform, and service records</li>
                  <li>Instantly accessible from any smartphone — no app download required</li>
                  <li>Secure, professional document storage for tank drawings, charts, and permits</li>
                  <li>A shared registry for owners, technicians, and service companies</li>
                  <li>Built for both USTs and above ground storage tanks (ASTs)</li>
                </ul>
              </div>
              <div className="bg-white p-6 sm:p-8 rounded-lg shadow-sm">
                <h3 className="text-lg sm:text-xl font-bold text-red-600 mb-4">TankID IS NOT</h3>
                <ul className="space-y-2 text-gray-700 text-sm sm:text-base">
                  <li>An ATG monitoring system — does not replace Veeder-Root or Franklin</li>
                  <li>A compliance reporting platform — does not replace state filing systems</li>
                  <li>A POS or fuel inventory system</li>
                  <li>A replacement for your existing ATG software</li>
                  <li>Limited to underground tanks — ASTs are fully supported</li>
                </ul>
              </div>
            </div>

            {/* Problem Section */}
            <div className="bg-white p-6 sm:p-8 rounded-lg shadow-sm mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">The Problem We Solve</h2>
              
              <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 mb-8">
                <div>
                  <p className="text-gray-700 mb-4 sm:mb-6 text-sm sm:text-base">
                    A technician pulls up to a site. They need to calibrate a probe, troubleshoot an ATG alarm, 
                    or complete an annual inspection. The first thing they need is the tank chart — the calibration 
                    table that tells them exactly how many gallons correspond to each inch of product level. Then 
                    the ATG configuration. Then the sensor map. Then the last service record.
                  </p>
                  <p className="text-gray-700 mb-4 sm:mb-6 text-sm sm:text-base">
                    None of that information is on the tank. It is not in the ATG. It is not on the owner's phone. 
                    It might be in a filing cabinet inside the office, in a PDF an install contractor emailed three 
                    years ago, or it might simply be gone. So the technician calls the manufacturer. Gets put on 
                    hold. Waits. Maybe gets a callback before end of day.
                  </p>
                  <p className="text-gray-700 text-sm sm:text-base">
                    Meanwhile the job is stalled. The owner is frustrated. The technician moves on and comes back 
                    — or guesses.
                  </p>
                </div>
                <div className="flex justify-center">
                  <Image
                    src="/images/TankID Header2.jpeg"
                    alt="Storage tank facility"
                    width={400}
                    height={300}
                    className="rounded-lg shadow-lg object-cover w-full max-w-xs sm:max-w-sm"
                    sizes="(max-width: 480px) 280px, (max-width: 768px) 320px, 400px"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4 sm:gap-6 mb-8">
                <div className="bg-red-50 p-4 sm:p-6 rounded-lg border border-red-200">
                  <h3 className="font-bold text-red-800 mb-2 text-sm sm:text-base">The tech</h3>
                  <p className="text-red-700 text-xs sm:text-sm">Arrives on site without the data needed to start the job</p>
                </div>
                <div className="bg-red-50 p-4 sm:p-6 rounded-lg border border-red-200">
                  <h3 className="font-bold text-red-800 mb-2 text-sm sm:text-base">The owner</h3>
                  <p className="text-red-700 text-xs sm:text-sm">Has no idea what specs their own tanks are — until something goes wrong</p>
                </div>
                <div className="bg-red-50 p-4 sm:p-6 rounded-lg border border-red-200">
                  <h3 className="font-bold text-red-800 mb-2 text-sm sm:text-base">The job</h3>
                  <p className="text-red-700 text-xs sm:text-sm">Gets delayed, guessed at, or rescheduled — costing everyone time and money</p>
                </div>
              </div>

              <div className="bg-green-50 p-4 sm:p-6 rounded-lg border border-green-200">
                <p className="text-base sm:text-lg text-gray-700">
                  <strong>TankID solves this with a scan.</strong> The QR label is posted inside the facility. 
                  The technician scans it — or types the facility number at app.tankid.io — and the full tank 
                  profile is on their screen in under 20 seconds.
                </p>
              </div>
            </div>

            {/* Call to Action with Action Buttons */}
            <div className="text-center">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Ready to get started?</h3>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <a
                  href="https://app.tankid.io"
                  className="bg-orange-600 hover:bg-orange-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold text-base sm:text-lg transition-colors"
                >
                  🔍 Facility Lookup
                </a>
                <Link
                  href="/get-access"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold text-base sm:text-lg transition-colors"
                >
                  Join Early Access
                </Link>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link 
                  href="/for-facilities" 
                  className="border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold text-base sm:text-lg transition-colors"
                >
                  For Facility Owners →
                </Link>
                <Link 
                  href="/for-technicians" 
                  className="border border-orange-600 text-orange-600 hover:bg-orange-600 hover:text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold text-base sm:text-lg transition-colors"
                >
                  For Field Technicians →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
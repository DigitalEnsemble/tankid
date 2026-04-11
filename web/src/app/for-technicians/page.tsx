import Image from 'next/image';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function ForTechniciansPage() {
  return (
    <div className="min-h-screen">
      <Navigation />

      {/* Hero Section */}
      <section className="pt-20 py-12 bg-orange-600 text-white">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl font-bold mb-6">For Field Technicians</h1>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            No account. No registration. Select your state, enter the facility number, and you have the 
            full tank profile in under 20 seconds. Works on any phone.
          </p>
          <p className="text-sm text-orange-200 mt-4">No app download required. Works on any smartphone browser.</p>
        </div>
      </section>

      {/* How It Works for Technicians */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">How it works for field technicians</h2>
            
            <div className="space-y-8">
              <div className="flex gap-6 items-start">
                <div className="bg-orange-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">
                  01
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Arrive on site</h3>
                  <p className="text-gray-700">
                    Open TankID.io on your phone — no app download, no account required. Works on any smartphone browser.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-6 items-start">
                <div className="bg-orange-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">
                  02
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Scan or look up</h3>
                  <p className="text-gray-700">
                    Scan the QR label posted inside the facility, OR go to app.tankid.io — select your state, 
                    enter the facility number. Full profile in under 20 seconds.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-6 items-start">
                <div className="bg-orange-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">
                  03
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">View complete tank data</h3>
                  <p className="text-gray-700">
                    View the full tank chart, ATG configuration, sensor map, and complete service history. 
                    Everything you need to start the job immediately.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-6 items-start">
                <div className="bg-orange-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">
                  04
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Complete your work</h3>
                  <p className="text-gray-700">
                    With all the data you need at your fingertips, complete your work efficiently without delays 
                    or guesswork.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-6 items-start">
                <div className="bg-orange-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">
                  05
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Log your service call</h3>
                  <p className="text-gray-700">
                    Tap 'Log Service Call' to record findings, parts, photos, and test results. The facility owner 
                    receives an automatic service summary and the compliance record updates.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What You Get Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">What you get access to</h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="font-bold text-gray-900 mb-3">Tank Charts & Calibration</h3>
                <p className="text-gray-700">
                  Full calibration tables showing exactly how many gallons correspond to each inch of product level 
                  at the actual installation depth.
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="font-bold text-gray-900 mb-3">ATG Configuration</h3>
                <p className="text-gray-700">
                  ATG brand and model, probe type, sensor locations (interstitial, sump, dispenser), 
                  and last calibration date.
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="font-bold text-gray-900 mb-3">Tank Specifications</h3>
                <p className="text-gray-700">
                  Complete tank specs including manufacturer, model, capacity, diameter, length, wall construction, 
                  and installation details.
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="font-bold text-gray-900 mb-3">Service History</h3>
                <p className="text-gray-700">
                  Complete history of all service calls including who, when, what was done, parts replaced, 
                  and findings from previous visits.
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="font-bold text-gray-900 mb-3">Compliance Status</h3>
                <p className="text-gray-700">
                  State registration number, last annual inspection date, next due date, inspector of record, 
                  and test results history.
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="font-bold text-gray-900 mb-3">Technical Documents</h3>
                <p className="text-gray-700">
                  Access to installation permits, manufacturer spec sheets, tank drawings, and other 
                  technical documentation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* QR Label Section */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Find the TankID QR label</h2>
                <p className="text-lg text-gray-700 mb-8">
                  Every registered facility has a weatherproof QR label posted inside — on the office wall, 
                  pump room door, or utility area. Scan it on arrival for the full tank profile in under 20 seconds.
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="text-green-600 text-xl">✓</div>
                    <p className="text-gray-700">Scan with any smartphone camera — no app needed</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-green-600 text-xl">✓</div>
                    <p className="text-gray-700">Manual fallback: facility number printed below QR code</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-green-600 text-xl">✓</div>
                    <p className="text-gray-700">Or go directly to app.tankid.io and enter state + facility number</p>
                  </div>
                </div>
                

              </div>
              
              <div className="flex justify-center">
                <Image
                  src="/images/tankid logo 6.jpg"
                  alt="TankID QR Label"
                  width={350}
                  height={400}
                  className="rounded-lg shadow-lg object-cover w-full max-w-xs sm:max-w-sm"
                  sizes="(max-width: 480px) 280px, (max-width: 768px) 320px, 350px"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 bg-orange-600 text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-6">Start looking up facilities today</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            No registration required. Works on any phone. Get the tank data you need before you start the job.
          </p>
          <p className="text-orange-200 text-lg">TankID makes tank data accessible when you need it.</p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
import Image from 'next/image';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen">
      <Navigation />

      {/* Hero Section */}
      <section className="pt-20 py-16 bg-gray-900 text-white">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl font-bold mb-6">How It Works</h1>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            Set up in an afternoon. Value from day one. TankID makes tank data instantly accessible 
            for both facility owners and field technicians.
          </p>
        </div>
      </section>

      {/* Two Column Process */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12">
              
              {/* For Facility Owners */}
              <div>
                <h3 className="text-2xl font-bold mb-8 text-blue-600">For facility owners and UST/AGT installers:</h3>
                <div className="space-y-8">
                  <div className="flex gap-4">
                    <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                      01
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-2">Create your account</h4>
                      <p className="text-gray-700">
                        Create your TankID account and enter your facility address. Quick setup takes just a few minutes.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                      02
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-2">Upload tank data</h4>
                      <p className="text-gray-700">
                        Upload installation permit PDFs — our AI agent extracts all tank specs automatically. 
                        Or enter manually if you have no digital records.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                      03
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-2">Receive your QR label</h4>
                      <p className="text-gray-700">
                        TankID ships a weatherproof QR label for your facility. Post it in a visible location 
                        inside — office wall, pump room door, or utility area.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                      04
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-2">Set access permissions</h4>
                      <p className="text-gray-700">
                        Invite your service companies — or set tanks to open access for any licensed technician. 
                        You control who sees what.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                      05
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-2">Compliance tracking goes live</h4>
                      <p className="text-gray-700">
                        Your compliance calendar goes live: inspection dates, permit renewals, and certification 
                        deadlines tracked per tank, automatically.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* For Field Technicians */}
              <div>
                <h3 className="text-2xl font-bold mb-8 text-orange-600">For field technicians:</h3>
                <div className="space-y-8">
                  <div className="flex gap-4">
                    <div className="bg-orange-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                      01
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-2">Arrive on site</h4>
                      <p className="text-gray-700">
                        Arrive on site. Open TankID.io on your phone — no app download, no account required. 
                        Works on any smartphone browser.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="bg-orange-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                      02
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-2">Scan or look up</h4>
                      <p className="text-gray-700">
                        Scan the QR label posted inside the facility, OR go to app.tankid.io — select your state, 
                        enter the facility number. Full profile in under 20 seconds.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="bg-orange-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                      03
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-2">View tank data</h4>
                      <p className="text-gray-700">
                        View the full tank chart, ATG configuration, sensor map, and complete service history. 
                        Everything you need before you start.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="bg-orange-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                      04
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-2">Complete your work</h4>
                      <p className="text-gray-700">
                        Complete your work efficiently with all the data you need at your fingertips. No delays, 
                        no guesswork, no phone calls.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="bg-orange-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                      05
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-2">Log service call</h4>
                      <p className="text-gray-700">
                        The facility owner receives an automatic service summary and the compliance record updates. 
                        Record findings, parts, photos, and test results.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* QR Label Physical Product Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <p className="text-orange-600 font-semibold text-sm uppercase tracking-wide mb-4">Physical product</p>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">The TankID QR label.</h2>
                <p className="text-lg text-gray-700 mb-8">
                  Every registered facility receives a weatherproof QR label. Post it inside the facility — on the 
                  office wall, pump room door, or utility area. Scan it on arrival for the full tank profile in 
                  under 20 seconds. No app needed.
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="text-green-600">✓</div>
                    <p className="text-gray-700">Weatherproof laminated stock — rated for indoor industrial environments</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-green-600">✓</div>
                    <p className="text-gray-700">Unique QR code per facility linking directly to the full tank profile</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-green-600">✓</div>
                    <p className="text-gray-700">Facility ID printed below the QR code — manual lookup fallback always available</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-green-600">✓</div>
                    <p className="text-gray-700">Works on any smartphone camera — no app download required</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-green-600">✓</div>
                    <p className="text-gray-700">Manual fallback: state + facility number at app.tankid.io</p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-center">
                <Image
                  src="/images/tankid logo 6.jpg"
                  alt="TankID QR Label"
                  width={350}
                  height={400}
                  className="rounded-lg shadow-lg object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Who It's For Section */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Built for every part of the storage tank ecosystem</h2>
            <p className="text-xl text-gray-600 mb-12">Three user groups. One shared database. Access matched to each role.</p>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-lg shadow-sm">
                <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold inline-block mb-4">
                  Facility owners
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Independent gas stations, fleets, marinas, farms & industrial
                </h3>
                <p className="text-gray-700 mb-6">
                  Own your tank data. Stay ahead of compliance. Service records that never get lost.
                </p>
                <Link href="/for-facilities" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold inline-block">
                  Learn more →
                </Link>
              </div>
              
              <div className="bg-white p-8 rounded-lg shadow-sm">
                <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-semibold inline-block mb-4">
                  Field technicians
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  UST & AST service techs dispatched to unfamiliar sites
                </h3>
                <p className="text-gray-700 mb-6">
                  Scan the label inside the facility or look up at app.tankid.io — full profile before you lift a cover.
                </p>
                <Link href="/for-technicians" className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-semibold inline-block">
                  Learn more →
                </Link>
              </div>
              
              <div className="bg-white p-8 rounded-lg shadow-sm">
                <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold inline-block mb-4">
                  Service companies
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Petroleum & environmental UST/AST contractors
                </h3>
                <p className="text-gray-700 mb-6">
                  Techs arrive prepared. Lookup on arrival. Service logs on departure. Compliance docs auto-drafted.
                </p>
                <Link href="/get-access" className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold inline-block">
                  Register your company →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to get started?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Join our pilot program or start looking up facilities today. Setup is quick, and the value is immediate.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/get-access" className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-4 rounded-lg font-semibold text-lg">
              Get Early Access →
            </Link>
            <a href="https://app.tankid.io" className="border-2 border-white text-white hover:bg-white hover:text-gray-900 px-8 py-4 rounded-lg font-semibold text-lg">
              Look up a facility →
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
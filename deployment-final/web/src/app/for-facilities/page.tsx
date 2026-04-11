import Image from 'next/image';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function ForFacilitiesPage() {
  return (
    <div className="min-h-screen">
      <Navigation />

      {/* Action Buttons */}
      <section className="pt-20 pb-4 bg-white">
        <div className="container mx-auto px-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://app.tankid.io"
              className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-semibold text-center transition-colors"
            >
              🔍 Facility Lookup
            </a>
            <Link
              href="/get-access"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold text-center transition-colors"
            >
              Join Early Access
            </Link>
          </div>
        </div>
      </section>

      {/* Hero Section */}
      <section className="pt-20 py-16 bg-blue-600 text-white">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl font-bold mb-6">For Facility Owners</h1>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            Facility owners bear the compliance burden and the liability. TankID gives them tools to stay 
            ahead of both — without needing an IT department or a compliance consultant on retainer.
          </p>
          <Link href="/get-access" className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-4 rounded-lg font-semibold text-lg inline-block">
            Register Your Facility →
          </Link>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">What TankID does for your facility.</h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="font-bold text-gray-900 mb-3">Own your data</h3>
                <p className="text-gray-700">
                  Your tank specs, charts, service history, and compliance records are yours — stored in one place, 
                  accessible any time. No more depending on your install contractor or manufacturer to have the only copy.
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="font-bold text-gray-900 mb-3">Compliance on autopilot</h3>
                <p className="text-gray-700">
                  Annual inspection dates, permit renewals, and certification deadlines are tracked automatically 
                  per tank. You get reminders before things are due — not citations after they are missed.
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="font-bold text-gray-900 mb-3">Ready for any inspector</h3>
                <p className="text-gray-700">
                  Your entire compliance record — inspections, service logs, certifications — is organized and 
                  retrievable in seconds. No scrambling before a regulatory visit.
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="font-bold text-gray-900 mb-3">Service records that stick</h3>
                <p className="text-gray-700">
                  Every time a technician logs a service call through TankID, you receive a summary automatically. 
                  The record is tied to the tank permanently — even if you change service companies.
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="font-bold text-gray-900 mb-3">Secure document vault</h3>
                <p className="text-gray-700">
                  Upload installation permits, manufacturer spec sheets, warranty docs, tank drawings, and 
                  certifications. Organized by tank. Accessible from anywhere, on any device.
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="font-bold text-gray-900 mb-3">Covers ASTs and USTs</h3>
                <p className="text-gray-700">
                  Whether your tanks are above ground or underground, TankID manages them all in a single account. 
                  One dashboard. All your tanks.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tank Profile Section */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-start">
              <div>
                <p className="text-orange-600 font-semibold text-sm uppercase tracking-wide mb-4">
                  What's inside every tank profile
                </p>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">
                  The complete technical record. Every time.
                </h2>
                <p className="text-lg text-gray-600 mb-8">
                  Every tank registered in TankID carries a full technical and compliance dossier, instantly 
                  accessible by authorized users — from the owner's dashboard to the technician's phone.
                </p>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 font-semibold text-gray-900">Category</th>
                        <th className="text-left py-3 font-semibold text-gray-900">What's stored</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr>
                        <td className="py-3 font-medium text-gray-700">Identity</td>
                        <td className="py-3 text-gray-600">Serial number, manufacturer, model, year manufactured, capacity (gallons)</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-medium text-gray-700">Physical specs</td>
                        <td className="py-3 text-gray-600">Diameter, length, wall construction (single/double wall, fiberglass/steel), jacket type, AST or UST designation</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-medium text-gray-700">Installation</td>
                        <td className="py-3 text-gray-600">Date installed, install contractor, installation depth, burial orientation, backfill type</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-medium text-gray-700">Tank chart</td>
                        <td className="py-3 text-gray-600">Full calibration table (gallons per inch at actual installation depth) — the most time-consuming data for techs to locate</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-medium text-gray-700">ATG / sensor config</td>
                        <td className="py-3 text-gray-600">ATG brand and model, probe type, sensor locations (interstitial, sump, dispenser), last calibration date</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-medium text-gray-700">Compliance record</td>
                        <td className="py-3 text-gray-600">State registration number, last annual inspection date, next due date, inspector of record, test results history</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-medium text-gray-700">Service history</td>
                        <td className="py-3 text-gray-600">Every service call: who, when, what was done, parts replaced, findings</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-medium text-gray-700">Documents</td>
                        <td className="py-3 text-gray-600">Installation permits, spec sheets, warranty docs, state notifications, tank drawings — securely stored, instantly retrievable</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="flex justify-center">
                <Image
                  src="/images/TankID Header2.jpeg"
                  alt="TankID features"
                  width={300}
                  height={375}
                  className="rounded-lg shadow-lg object-cover w-full max-w-xs sm:max-w-sm lg:max-w-md"
                  sizes="(max-width: 480px) 240px, (max-width: 640px) 300px, (max-width: 1024px) 384px, 400px"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to register your facility?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Join our pilot program and get your tanks registered in TankID. Setup takes one afternoon, 
            value starts from day one.
          </p>
          <Link href="/get-access" className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-4 rounded-lg font-semibold text-lg inline-block">
            Get Early Access →
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
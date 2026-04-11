import Link from 'next/link'
import Image from 'next/image'

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="sticky top-0 bg-white shadow-sm z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Image 
              src="/images/TankID Logo2.jpeg" 
              alt="TankID.io" 
              width={120} 
              height={32} 
              className="h-8 w-auto"
            />
            <div className="hidden md:flex items-center space-x-8">
              <a href="#how-it-works" className="text-gray-700 hover:text-gray-900">How it works</a>
              <a href="#for-facilities" className="text-gray-700 hover:text-gray-900">For facilities</a>
              <a href="#for-technicians" className="text-gray-700 hover:text-gray-900">For technicians</a>
              <a href="https://app.tankid.io" className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-semibold">🔍 Look up a facility</a>
              <a href="#signup" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold">Get early access</a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-gray-900 to-gray-800 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-50"></div>
        <Image 
          src="/images/TankID cover.jpg" 
          alt="Storage tank facility" 
          fill
          className="object-cover"
        />
        <div className="relative container mx-auto px-6 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-orange-400 text-lg font-semibold mb-4">Scan. Know. Work. — Full tank specs at your fingertips, anywhere, in seconds.</p>
              <h1 className="text-5xl lg:text-6xl font-bold mb-6">Every tank spec you need. In seconds.</h1>
              <p className="text-xl mb-8 text-gray-200">The universal registry for above ground and underground storage tanks. Scan the QR label inside the facility — or look up by facility number at app.tankid.io — and the full tank profile is on your screen. No phone calls. No paper filing cabinets. No waiting on hold.</p>
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <a href="#signup" className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-4 rounded-lg font-semibold text-lg text-center">Register your facility</a>
                <a href="https://app.tankid.io" className="border border-white text-white hover:bg-white hover:text-gray-900 px-8 py-4 rounded-lg font-semibold text-lg text-center">Look up a facility →</a>
              </div>
              <div className="bg-gray-800 bg-opacity-80 p-6 rounded-lg">
                <p className="font-semibold">Field technicians: <a href="https://app.tankid.io" className="text-orange-400 hover:text-orange-300">app.tankid.io</a> — no account needed</p>
              </div>
            </div>
            <div className="flex justify-center">
              <Image 
                src="/images/TankID header.jpg" 
                alt="TankID mobile interface" 
                width={400} 
                height={600} 
                className="rounded-lg shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-blue-600 text-white py-8">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold">10 sec</div>
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

      {/* What is TankID */}
      <section id="overview" className="py-16 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <p className="text-orange-600 font-semibold text-sm uppercase tracking-wide mb-4">Overview</p>
            <h2 className="text-3xl font-bold text-gray-900 mb-8">What is TankID?</h2>
            
            <div className="prose prose-lg mb-12">
              <p className="text-gray-700 mb-6">TankID is the universal registry for above ground and underground storage tanks (ASTs and USTs). It is a cloud database with a mobile-first interface that stores, organizes, and makes instantly accessible the complete technical profile of every storage tank at a facility.</p>
              
              <p className="text-gray-700 mb-8">Whether you are a facility owner who needs your compliance calendar under control, or a field technician who just pulled up to an unfamiliar site — TankID puts every tank's critical data on your screen in seconds. Scan the QR label posted inside the facility, or look up by facility number at app.tankid.io. No phone calls. No paper filing cabinets. No waiting on hold.</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-lg shadow-sm">
                <h3 className="text-xl font-bold text-green-600 mb-4">TankID IS</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>• The data layer underneath your ATG, compliance platform, and service records</li>
                  <li>• Instantly accessible from any smartphone — no app download required</li>
                  <li>• Secure, professional document storage for tank drawings, charts, and permits</li>
                  <li>• A shared registry for owners, technicians, and service companies</li>
                  <li>• Built for both USTs and above ground storage tanks (ASTs)</li>
                </ul>
              </div>
              
              <div className="bg-white p-8 rounded-lg shadow-sm">
                <h3 className="text-xl font-bold text-red-600 mb-4">TankID IS NOT</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>• An ATG monitoring system — does not replace Veeder-Root or Franklin</li>
                  <li>• A compliance reporting platform — does not replace state filing systems</li>
                  <li>• A POS or fuel inventory system</li>
                  <li>• A replacement for your existing ATG software</li>
                  <li>• Limited to underground tanks — ASTs are fully supported</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <p className="text-orange-600 font-semibold text-sm uppercase tracking-wide mb-4">The problem</p>
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Every job starts with a question nobody can answer fast.</h2>
            
            <div className="grid lg:grid-cols-2 gap-12 mb-12">
              <div>
                <p className="text-gray-700 mb-6">A technician pulls up to a site. They need to calibrate a probe, troubleshoot an ATG alarm, or complete an annual inspection. The first thing they need is the tank chart — the calibration table that tells them exactly how many gallons correspond to each inch of product level. Then the ATG configuration. Then the sensor map. Then the last service record.</p>
                
                <p className="text-gray-700 mb-6">None of that information is on the tank. It is not in the ATG. It is not on the owner's phone. It might be in a filing cabinet inside the office, in a PDF an install contractor emailed three years ago, or it might simply be gone. So the technician calls the manufacturer. Gets put on hold. Waits. Maybe gets a callback before end of day.</p>
                
                <p className="text-gray-700">Meanwhile the job is stalled. The owner is frustrated. The technician moves on and comes back — or guesses.</p>
              </div>
              
              <div>
                <Image 
                  src="/images/TankID Header2.jpeg" 
                  alt="Storage tank facility" 
                  width={500} 
                  height={400} 
                  className="rounded-lg shadow-lg"
                />
              </div>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-red-50 p-6 rounded-lg border border-red-200">
                <h3 className="font-bold text-red-800 mb-2">The tech</h3>
                <p className="text-red-700">Arrives on site without the data needed to start the job</p>
              </div>
              <div className="bg-red-50 p-6 rounded-lg border border-red-200">
                <h3 className="font-bold text-red-800 mb-2">The owner</h3>
                <p className="text-red-700">Has no idea what specs their own tanks are — until something goes wrong</p>
              </div>
              <div className="bg-red-50 p-6 rounded-lg border border-red-200">
                <h3 className="font-bold text-red-800 mb-2">The job</h3>
                <p className="text-red-700">Gets delayed, guessed at, or rescheduled — costing everyone time and money</p>
              </div>
            </div>
            
            <p className="text-lg text-gray-700 bg-green-50 p-6 rounded-lg border border-green-200">TankID solves this with a scan. The QR label is posted inside the facility. The technician scans it — or types the facility number at app.tankid.io — and the full tank profile is on their screen in under 20 seconds.</p>
          </div>
        </div>
      </section>

      {/* For Facility Owners */}
      <section id="for-facilities" className="py-16 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <p className="text-orange-600 font-semibold text-sm uppercase tracking-wide mb-4">For facility owners</p>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">What TankID does for your facility.</h2>
            <p className="text-xl text-gray-600 mb-12">Facility owners bear the compliance burden and the liability. TankID gives them tools to stay ahead of both — without needing an IT department or a compliance consultant on retainer.</p>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="font-bold text-gray-900 mb-3">Own your data</h3>
                <p className="text-gray-700">Your tank specs, charts, service history, and compliance records are yours — stored in one place, accessible any time. No more depending on your install contractor or manufacturer to have the only copy.</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="font-bold text-gray-900 mb-3">Compliance on autopilot</h3>
                <p className="text-gray-700">Annual inspection dates, permit renewals, and certification deadlines are tracked automatically per tank. You get reminders before things are due — not citations after they are missed.</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="font-bold text-gray-900 mb-3">Ready for any inspector</h3>
                <p className="text-gray-700">Your entire compliance record — inspections, service logs, certifications — is organized and retrievable in seconds. No scrambling before a regulatory visit.</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="font-bold text-gray-900 mb-3">Service records that stick</h3>
                <p className="text-gray-700">Every time a technician logs a service call through TankID, you receive a summary automatically. The record is tied to the tank permanently — even if you change service companies.</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="font-bold text-gray-900 mb-3">Secure document vault</h3>
                <p className="text-gray-700">Upload installation permits, manufacturer spec sheets, warranty docs, tank drawings, and certifications. Organized by tank. Accessible from anywhere, on any device.</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="font-bold text-gray-900 mb-3">Covers ASTs and USTs</h3>
                <p className="text-gray-700">Whether your tanks are above ground or underground, TankID manages them all in a single account. One dashboard. All your tanks.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features & Data */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-start">
              <div>
                <p className="text-orange-600 font-semibold text-sm uppercase tracking-wide mb-4">What's inside every tank profile</p>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">The complete technical record. Every time.</h2>
                <p className="text-lg text-gray-600 mb-8">Every tank registered in TankID carries a full technical and compliance dossier, instantly accessible by authorized users — from the owner's dashboard to the technician's phone.</p>
                
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
                
                <div className="mt-8 bg-gray-50 p-6 rounded-lg">
                  <h3 className="font-bold text-gray-900 mb-3">Secure document vault</h3>
                  <p className="text-gray-700 mb-4">TankID provides professional-grade, encrypted document storage tied to each tank's record. Upload and retrieve:</p>
                  <ul className="text-gray-700 space-y-1">
                    <li>• Tank engineering drawings and schematics</li>
                    <li>• Tank charts and calibration tables</li>
                    <li>• Manufacturer specification sheets and warranty documents</li>
                    <li>• Installation permits and state notifications</li>
                    <li>• Inspection reports and annual compliance certifications</li>
                    <li>• Photos from service calls</li>
                  </ul>
                </div>
              </div>
              
              <div className="flex justify-center">
                <Image 
                  src="/images/TanklID Header 3.jpeg" 
                  alt="TankID features" 
                  width={400} 
                  height={600} 
                  className="rounded-lg shadow-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 bg-gray-900 text-white">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto text-center">
            <p className="text-orange-400 font-semibold text-sm uppercase tracking-wide mb-4">How it works</p>
            <h2 className="text-3xl font-bold mb-12">Set up in an afternoon. Value from day one.</h2>
            
            <div className="grid lg:grid-cols-2 gap-12">
              <div className="text-left">
                <h3 className="text-xl font-bold mb-6 text-orange-400">For facility owners:</h3>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="bg-orange-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">01</div>
                    <p className="text-gray-300">Create your TankID account and enter your facility address.</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="bg-orange-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">02</div>
                    <p className="text-gray-300">Upload installation permit PDFs — our AI agent extracts all tank specs automatically. Or enter manually if you have no digital records.</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="bg-orange-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">03</div>
                    <p className="text-gray-300">TankID ships a weatherproof QR label for your facility. Post it in a visible location inside — office wall, pump room door, or utility area.</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="bg-orange-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">04</div>
                    <p className="text-gray-300">Invite your service companies — or set tanks to open access for any licensed technician.</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="bg-orange-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">05</div>
                    <p className="text-gray-300">Your compliance calendar goes live: inspection dates, permit renewals, and certification deadlines tracked per tank, automatically.</p>
                  </div>
                </div>
              </div>
              
              <div className="text-left">
                <h3 className="text-xl font-bold mb-6 text-blue-400">For field technicians:</h3>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">01</div>
                    <p className="text-gray-300">Arrive on site. Open TankID.io on your phone — no app download, no account required.</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">02</div>
                    <p className="text-gray-300">Scan the QR label posted inside the facility, OR go to app.tankid.io — select your state, enter the facility number. Full profile in under 20 seconds.</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">03</div>
                    <p className="text-gray-300">View the full tank chart, ATG configuration, sensor map, and complete service history.</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">04</div>
                    <p className="text-gray-300">Complete your work, then tap 'Log Service Call' to record findings, parts, photos, and test results.</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">05</div>
                    <p className="text-gray-300">The facility owner receives an automatic service summary and the compliance record updates.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technician Lookup Band */}
      <section id="for-technicians" className="py-12 bg-orange-600 text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold mb-4">Field technicians — your lookup is here.</h2>
          <p className="text-lg mb-6">No account. No registration. Select your state, enter the facility number, and you have the full tank profile in under 20 seconds. Works on any phone.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="bg-white text-orange-600 px-6 py-3 rounded-lg font-bold text-lg">app.tankid.io</div>
            <a href="https://app.tankid.io" className="bg-white text-orange-600 hover:bg-gray-100 px-8 py-3 rounded-lg font-semibold">Look up a facility now →</a>
          </div>
          <p className="text-sm text-orange-200 mt-4">No app download required. Works on any smartphone browser.</p>
        </div>
      </section>

      {/* QR Label Showcase */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <p className="text-orange-600 font-semibold text-sm uppercase tracking-wide mb-4">Physical product</p>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">The TankID QR label.</h2>
                <p className="text-lg text-gray-700 mb-8">Every registered facility receives a weatherproof QR label. Post it inside the facility — on the office wall, pump room door, or utility area. Scan it on arrival for the full tank profile in under 20 seconds. No app needed.</p>
                
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
                  width={400} 
                  height={500} 
                  className="rounded-lg shadow-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Audience Cards */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto text-center">
            <p className="text-orange-600 font-semibold text-sm uppercase tracking-wide mb-4">Who it's for</p>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Built for every part of the storage tank ecosystem.</h2>
            <p className="text-xl text-gray-600 mb-12">Three user groups. One shared database. Access matched to each role.</p>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-lg shadow-sm">
                <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold inline-block mb-4">Facility owners</div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Independent gas stations, fleets, marinas, farms & industrial</h3>
                <p className="text-gray-700 mb-6">Own your tank data. Stay ahead of compliance. Service records that never get lost.</p>
                <a href="#signup" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold inline-block">Register for early access →</a>
              </div>
              
              <div className="bg-white p-8 rounded-lg shadow-sm">
                <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-semibold inline-block mb-4">Field technicians</div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">UST & AST service techs dispatched to unfamiliar sites</h3>
                <p className="text-gray-700 mb-6">Scan the label inside the facility or look up at app.tankid.io — full profile before you lift a cover.</p>
                <a href="https://app.tankid.io" className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-semibold inline-block">Look up a facility now →</a>
              </div>
              
              <div className="bg-white p-8 rounded-lg shadow-sm">
                <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold inline-block mb-4">Service companies</div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Petroleum & environmental UST/AST contractors</h3>
                <p className="text-gray-700 mb-6">Techs arrive prepared. Lookup on arrival. Service logs on departure. Compliance docs auto-drafted.</p>
                <a href="#signup" className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold inline-block">Register your company →</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Early Access Signup */}
      <section id="signup" className="py-16">
        <div className="container mx-auto px-6">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-orange-600 font-semibold text-sm uppercase tracking-wide mb-4">Early access</p>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Get early access to TankID.</h2>
            <p className="text-lg text-gray-600 mb-8">We're onboarding pilot facilities and service companies now. Fill in your info and we'll reach out within one business day.</p>
            
            <form className="bg-white p-8 rounded-lg shadow-lg">
              <div className="mb-6">
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button type="button" className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md font-semibold">Facility owner</button>
                  <button type="button" className="flex-1 py-2 px-4 text-gray-600">Field technician</button>
                  <button type="button" className="flex-1 py-2 px-4 text-gray-600">Service company</button>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <input type="text" placeholder="First name" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                <input type="text" placeholder="Last name" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <input type="email" placeholder="Email address" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                <input type="tel" placeholder="Phone number" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <input type="text" placeholder="Company name" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                <input type="text" placeholder="City, State" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-lg text-lg">Request early access →</button>
              
              <p className="text-sm text-gray-500 mt-4">No credit card required. We'll contact you within 1 business day.</p>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <Image 
                src="/images/TankID Logo2.jpeg" 
                alt="TankID.io" 
                width={120} 
                height={32} 
                className="h-8 w-auto mb-4"
              />
            </div>
            
            <div className="flex flex-wrap gap-6 mb-4 md:mb-0">
              <a href="https://app.tankid.io" className="hover:text-orange-400">Facility lookup</a>
              <a href="#" className="hover:text-orange-400">Privacy</a>
              <a href="#" className="hover:text-orange-400">Terms</a>
              <a href="mailto:casey@tankid.io" className="hover:text-orange-400">casey@tankid.io</a>
            </div>
          </div>
          
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2026 TankID.io — The Universal Storage Tank Registry</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
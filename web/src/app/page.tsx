'use client';

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-6 py-16">
        {/* Header */}
        <header className="text-center mb-16">
          <h1 className="text-5xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            TankID
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Precision tank calibration and volume measurement system
          </p>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 mb-16">
            {/* Features */}
            <div className="space-y-8">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-3">
                  🎯 Accurate Calibration
                </h3>
                <p className="text-slate-600 dark:text-slate-300">
                  Precise volume measurements with detailed calibration charts
                </p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-3">
                  📊 Visual Analytics
                </h3>
                <p className="text-slate-600 dark:text-slate-300">
                  Interactive charts showing depth-to-volume relationships
                </p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-3">
                  🏢 Facility Management
                </h3>
                <p className="text-slate-600 dark:text-slate-300">
                  Organize tanks by facility with QR code access to full site overview
                </p>
              </div>
            </div>

            {/* Demo Section */}
            <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-md">
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
                View Facility Profile
              </h2>
              <p className="text-slate-600 dark:text-slate-300 mb-6">
                Enter a facility ID to view all tanks at that location
              </p>
              
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Enter Facility ID (e.g. 1)"
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                  id="facilityId"
                />
                <button
                  onClick={() => {
                    const input = document.getElementById('facilityId') as HTMLInputElement;
                    const facilityId = input?.value.trim();
                    if (facilityId) {
                      window.location.href = `/facility/${facilityId}`;
                    }
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors"
                >
                  View Facility Profile
                </button>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-600">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                  Try sample facilities:
                </p>
                <div className="space-y-1">
                  <Link 
                    href="/facility/defbe304-0b20-4832-9985-2d2df0946e64"
                    className="block text-blue-600 dark:text-blue-400 hover:underline text-sm"
                  >
                    Test Gas Station (3 tanks) →
                  </Link>
                  <Link 
                    href="/facility/1643"
                    className="block text-blue-600 dark:text-blue-400 hover:underline text-sm"
                  >
                    Try with number: 1643 →
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="text-center text-slate-500 dark:text-slate-400">
            <p>TankID System - Precision Tank Calibration</p>
          </footer>
        </main>
      </div>
    </div>
  );
}
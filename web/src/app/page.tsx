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
                  🔒 Unique Identification
                </h3>
                <p className="text-slate-600 dark:text-slate-300">
                  Each tank has a unique UUID for secure, reliable tracking
                </p>
              </div>
            </div>

            {/* Demo Section */}
            <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-md">
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
                View Tank Profile
              </h2>
              <p className="text-slate-600 dark:text-slate-300 mb-6">
                Enter a tank ID to view its calibration data and analytics
              </p>
              
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Enter Tank UUID"
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                  id="tankId"
                />
                <button
                  onClick={() => {
                    const input = document.getElementById('tankId') as HTMLInputElement;
                    const tankId = input?.value.trim();
                    if (tankId) {
                      window.location.href = `/tank/${tankId}`;
                    }
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors"
                >
                  View Tank Profile
                </button>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-600">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                  Try a sample tank:
                </p>
                <Link 
                  href="/tank/00000000-0000-0000-0000-000000000000"
                  className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                >
                  View Sample Tank Profile →
                </Link>
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
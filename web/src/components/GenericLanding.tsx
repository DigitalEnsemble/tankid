import Link from 'next/link'

export default function GenericLanding() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-6 py-16">
        {/* Header */}
        <header className="text-center mb-16">
          <h1 className="text-6xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            TankID
          </h1>
          <p className="text-2xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
            Professional Underground Storage Tank Compliance & Management Solutions
          </p>
        </header>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                🛡️ Compliance Management
              </h3>
              <p className="text-slate-600 dark:text-slate-300">
                Ensure your underground storage tanks meet all regulatory requirements with our comprehensive compliance tracking system.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                📊 Data Analytics
              </h3>
              <p className="text-slate-600 dark:text-slate-300">
                Advanced analytics and reporting tools to optimize tank performance and predict maintenance needs.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                🔧 Professional Services
              </h3>
              <p className="text-slate-600 dark:text-slate-300">
                Expert installation, calibration, and maintenance services for underground storage tank systems.
              </p>
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-white dark:bg-slate-800 p-12 rounded-lg shadow-lg text-center">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 mb-8">
              Access your facility information and tank data through our secure portal.
            </p>
            <Link 
              href="https://app.tankid.io"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-lg transition-colors text-lg"
            >
              Access Facility Portal
            </Link>
          </div>
        </main>

        {/* Footer */}
        <footer className="text-center mt-16 text-slate-500 dark:text-slate-400">
          <p>&copy; 2026 TankID. Professional Tank Management Solutions.</p>
        </footer>
      </div>
    </div>
  )
}
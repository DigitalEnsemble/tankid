import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient">
      <div className="container py-16 px-6">
        {/* Header */}
        <header className="text-center mb-16">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">
            TankID
          </h1>
          <p className="text-2xl text-gray-600 max-w-3xl mx-auto">
            Professional Underground Storage Tank Compliance & Management Solutions
          </p>
        </header>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto">
          <div className="grid grid-cols-3 gap-8 mb-16">
            <div className="bg-white p-8 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                🛡️ Compliance Management
              </h3>
              <p className="text-gray-600">
                Ensure your underground storage tanks meet all regulatory requirements with our comprehensive compliance tracking system.
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                📊 Data Analytics
              </h3>
              <p className="text-gray-600">
                Advanced analytics and reporting tools to optimize tank performance and predict maintenance needs.
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                🔧 Professional Services
              </h3>
              <p className="text-gray-600">
                Expert installation, calibration, and maintenance services for underground storage tank systems.
              </p>
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-white p-12 rounded-lg shadow-lg text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-gray-600 mb-8">
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
        <footer className="text-center mt-16 text-gray-500">
          <p>&copy; 2026 TankID. Professional Tank Management Solutions.</p>
        </footer>
      </div>


    </div>
  )
}
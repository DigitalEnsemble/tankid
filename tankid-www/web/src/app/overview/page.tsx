'use client';

import { useEffect } from 'react';

export default function OverviewPage() {
  useEffect(() => {
    // Redirect to the main TankID homepage
    window.location.href = 'https://www.tankid.io';
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-gray-900 mb-4">
          Redirecting to TankID homepage...
        </h1>
        <p className="text-gray-600">
          If you are not redirected automatically, 
          <a href="https://www.tankid.io" className="text-blue-600 underline ml-1">
            click here
          </a>
        </p>
      </div>
    </div>
  );
}
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface SearchResponse {
  count: number;
  client_facility_id: string;
  facilities: Array<{
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    client_facility_id: string;
    tank_count: number;
  }>;
}

export default function SearchPage() {
  const [clientFacilityId, setClientFacilityId] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Clear previous error
    setErrorMessage('');
    
    // Validate input
    const query = clientFacilityId.trim();
    
    if (!query) {
      setErrorMessage('Please enter a client facility ID.');
      return;
    }
    
    setIsSearching(true);
    
    try {
      // Call the new search API
      const response = await fetch(`https://tankid-api.fly.dev/search?client_facility_id=${encodeURIComponent(query)}`, {
        redirect: 'manual' // Handle redirects manually
      });
      
      if (response.status === 404) {
        const errorData = await response.json();
        setErrorMessage(errorData.message || `No facility found with client facility ID: ${query}`);
        return;
      }
      
      // Handle redirect for single result (status 302)
      if (response.status === 302 || response.status === 301) {
        const location = response.headers.get('location');
        if (location) {
          router.push(location);
          return;
        }
      }
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }
      
      // Multiple results - redirect to select page
      const data: SearchResponse = await response.json();
      const searchParams = new URLSearchParams({ client_facility_id: query });
      router.push(`/select?${searchParams.toString()}`);
      
    } catch (error) {
      console.error('Search error:', error);
      setErrorMessage('Search failed. Please try again or check your connection.');
    } finally {
      setIsSearching(false);
    }
  };
  
  const isFormValid = clientFacilityId.trim();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-6 py-16">
        {/* Header */}
        <header className="text-center mb-16">
          <div className="mb-4">
            <Link href="/" className="text-blue-600 hover:text-blue-800 font-medium">
              ← Back to TankID
            </Link>
          </div>
          <h1 className="text-5xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            Facility Search
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Search for facilities by Client Facility ID
          </p>
        </header>

        {/* Main Content */}
        <main className="max-w-2xl mx-auto">
          {/* Search Form */}
          <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-md mb-12">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
              Find Your Facility
            </h2>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              Enter your client facility ID to find and access tank information.
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Client Facility ID Input */}
              <div>
                <label htmlFor="clientFacilityId" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Client Facility ID
                </label>
                <input
                  type="text"
                  id="clientFacilityId"
                  value={clientFacilityId}
                  onChange={(e) => setClientFacilityId(e.target.value)}
                  placeholder="Enter your client facility ID (e.g., 1643, ATX1836, etc.)"
                  className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100 text-lg"
                  required
                />
              </div>
              
              {/* Error Message */}
              {errorMessage && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
                </div>
              )}
              
              {/* Search Button */}
              <button
                type="submit"
                disabled={!isFormValid || isSearching}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white py-3 px-4 rounded-md transition-colors font-medium text-lg"
              >
                {isSearching ? 'Searching...' : 'Search Facility'}
              </button>
            </form>
          </div>
          
          {/* Help Section */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
              About Client Facility IDs
            </h3>
            <p className="text-blue-800 dark:text-blue-200 mb-4">
              Client Facility IDs are custom identifiers assigned by your organization or service provider. 
              They may appear on invoices, service records, or internal documentation.
            </p>
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p className="mb-2"><strong>Example client facility IDs:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>1643</strong> - Colorado facility (Denver)</li>
                <li><strong>ATX1836</strong> - Texas facility (Anytown)</li>
                <li>Custom numbering and location codes</li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <footer className="text-center text-slate-500 dark:text-slate-400 mt-16">
            <p>TankID System - Precision Tank Calibration</p>
            <div className="mt-4">
              <Link href="/" className="text-blue-600 hover:text-blue-800 font-medium mr-6">
                Main Search
              </Link>
              <Link href="/pricing" className="text-blue-600 hover:text-blue-800 font-medium mr-6">
                Pricing
              </Link>
              <Link href="/contact-us" className="text-blue-600 hover:text-blue-800 font-medium">
                Contact Us
              </Link>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
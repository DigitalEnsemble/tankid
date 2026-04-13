'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Facility {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  client_facility_id: string;
  tank_count: number;
}

interface SearchResponse {
  count: number;
  client_facility_id: string;
  facilities: Facility[];
}

function SelectPageContent() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [clientFacilityId, setClientFacilityId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const fetchFacilities = async () => {
      const query = searchParams.get('client_facility_id');
      
      if (!query) {
        setErrorMessage('No client facility ID provided');
        setIsLoading(false);
        return;
      }

      setClientFacilityId(query);

      try {
        const response = await fetch(`https://tankid-api.fly.dev/search?client_facility_id=${encodeURIComponent(query)}`);
        
        if (response.status === 404) {
          const errorData = await response.json();
          setErrorMessage(errorData.message || `No facility found with client facility ID: ${query}`);
          return;
        }

        if (!response.ok) {
          throw new Error(`Search failed: ${response.status}`);
        }

        const data: SearchResponse = await response.json();
        
        if (data.facilities && data.facilities.length > 0) {
          setFacilities(data.facilities);
        } else {
          setErrorMessage(`No facilities found with client facility ID: ${query}`);
        }
        
      } catch (error) {
        console.error('Search error:', error);
        setErrorMessage('Failed to load facility data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFacilities();
  }, [searchParams]);

  const handleFacilitySelect = (facilityId: string) => {
    router.push(`/facility/${facilityId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-6 py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-300">Loading facilities...</p>
          </div>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-6 py-16">
          <header className="text-center mb-8">
            <Link href="/search" className="text-blue-600 hover:text-blue-800 font-medium">
              ← Back to Search
            </Link>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mt-4 mb-4">
              No Facilities Found
            </h1>
          </header>
          <div className="max-w-2xl mx-auto">
            <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-red-600 dark:text-red-400 text-center">{errorMessage}</p>
            </div>
            <div className="text-center mt-8">
              <Link 
                href="/search" 
                className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-md font-medium transition-colors"
              >
                Try Another Search
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-6 py-16">
        {/* Header */}
        <header className="text-center mb-12">
          <div className="mb-4">
            <Link href="/search" className="text-blue-600 hover:text-blue-800 font-medium">
              ← Back to Search
            </Link>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            Select Your Facility
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
            Multiple facilities found with Client Facility ID: <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{clientFacilityId}</span>
          </p>
        </header>

        {/* Results */}
        <main className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden">
            <div className="p-6 bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                {facilities.length} facilities found
              </h2>
              <p className="text-slate-600 dark:text-slate-300 mt-1">
                Click on a facility to view its tank information
              </p>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-slate-600">
              {facilities.map((facility, index) => (
                <div
                  key={facility.id}
                  onClick={() => handleFacilitySelect(facility.id)}
                  className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                        {facility.name}
                      </h3>
                      
                      <div className="space-y-1 text-slate-600 dark:text-slate-300">
                        <p className="flex items-center">
                          <span className="font-medium w-32">Address:</span>
                          <span>{facility.address}</span>
                        </p>
                        <p className="flex items-center">
                          <span className="font-medium w-32">City, State:</span>
                          <span>{facility.city}, {facility.state} {facility.zip}</span>
                        </p>
                        <p className="flex items-center">
                          <span className="font-medium w-32">Client ID:</span>
                          <span className="font-mono bg-slate-100 dark:bg-slate-600 px-2 py-1 rounded text-sm">
                            {facility.client_facility_id}
                          </span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="ml-4 text-right">
                      <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-medium">
                        {facility.tank_count} tank{facility.tank_count !== 1 ? 's' : ''}
                      </div>
                      <div className="mt-2 text-blue-600 dark:text-blue-400 font-medium text-sm">
                        Click to view →
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Help Section */}
          <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
              Why do I see multiple facilities?
            </h3>
            <p className="text-blue-800 dark:text-blue-200">
              The same Client Facility ID may be used across different locations or subsidiaries within your organization. 
              Each facility maintains its own tank inventory and compliance records.
            </p>
          </div>

          {/* Footer */}
          <footer className="text-center text-slate-500 dark:text-slate-400 mt-12">
            <p>TankID System - Precision Tank Calibration</p>
            <div className="mt-4">
              <Link href="/search" className="text-blue-600 hover:text-blue-800 font-medium mr-6">
                New Search
              </Link>
              <Link href="/" className="text-blue-600 hover:text-blue-800 font-medium mr-6">
                Main Search
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

export default function SelectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-6 py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-300">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <SelectPageContent />
    </Suspense>
  );
}
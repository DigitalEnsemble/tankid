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
  state_code: string;
  state_facility_id: string;
  client_facility_id: string | null;
  installer_facility_id: string | null;
  site_count: number;
}

interface SearchResponse {
  count: number;
  results: Facility[];
}

function DisambiguateContent() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchState, setSearchState] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const state = searchParams.get('state');
    const q = searchParams.get('q');
    
    if (!state || !q) {
      setError('Missing search parameters. Please try searching again.');
      setIsLoading(false);
      return;
    }
    
    setSearchState(state);
    setSearchQuery(q);
    
    // Fetch the search results
    const fetchResults = async () => {
      try {
        const response = await fetch(`https://tankid-api.fly.dev/facility/search?state=${encodeURIComponent(state)}&q=${encodeURIComponent(q)}`);
        
        if (!response.ok) {
          throw new Error(`Search failed: ${response.status}`);
        }
        
        const data: SearchResponse = await response.json();
        
        if (data.count === 0) {
          setError('No facilities found. Please try searching again.');
        } else if (data.count === 1) {
          // Single result - redirect directly
          router.push(`/facility/${data.results[0].id}`);
          return;
        } else {
          setFacilities(data.results);
        }
      } catch (err) {
        console.error('Search error:', err);
        setError('Failed to load search results. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchResults();
  }, [searchParams, router]);

  const formatFacilityIds = (facility: Facility) => {
    const ids = [];
    if (facility.state_facility_id) ids.push(`State: ${facility.state_facility_id}`);
    if (facility.client_facility_id) ids.push(`Client: ${facility.client_facility_id}`);
    if (facility.installer_facility_id) ids.push(`Installer: ${facility.installer_facility_id}`);
    return ids;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-6 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-300">Searching for facilities...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-6 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-md text-center">
              <div className="text-red-500 text-5xl mb-4">⚠️</div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                Search Error
              </h1>
              <p className="text-slate-600 dark:text-slate-300 mb-6">{error}</p>
              <Link 
                href="/"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-md transition-colors"
              >
                ← Back to Search
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
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <header className="mb-8">
            <Link 
              href="/"
              className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline mb-4"
            >
              ← Back to Search
            </Link>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              Multiple Facilities Found
            </h1>
            <p className="text-slate-600 dark:text-slate-300">
              Found {facilities.length} facilities matching "{searchQuery}" in {searchState}. 
              Please select the correct facility:
            </p>
          </header>

          {/* Facility List */}
          <div className="space-y-4">
            {facilities.map((facility) => (
              <div
                key={facility.id}
                className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                      {facility.name}
                    </h3>
                    
                    <div className="text-slate-600 dark:text-slate-300 mb-3">
                      <p className="mb-1">
                        📍 {facility.address}
                      </p>
                      <p className="mb-1">
                        {facility.city}, {facility.state} {facility.state_code}
                      </p>
                      <p className="text-sm">
                        🏢 {facility.site_count} site location{facility.site_count !== 1 ? 's' : ''}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Facility IDs:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {formatFacilityIds(facility).map((idString, index) => (
                          <span 
                            key={index}
                            className="inline-block px-2 py-1 bg-slate-100 dark:bg-slate-700 text-xs text-slate-700 dark:text-slate-300 rounded"
                          >
                            {idString}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="ml-6">
                    <Link
                      href={`/facility/${facility.id}`}
                      className="inline-block bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors text-sm font-medium"
                    >
                      View Facility →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* New Search */}
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 text-center">
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              Don't see the right facility?
            </p>
            <Link 
              href="/"
              className="inline-block bg-slate-600 hover:bg-slate-700 text-white py-2 px-4 rounded-md transition-colors"
            >
              Try a New Search
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function DisambiguateLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-6 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-300">Loading...</p>
        </div>
      </div>
    </div>
  );
}

export default function DisambiguatePage() {
  return (
    <Suspense fallback={<DisambiguateLoading />}>
      <DisambiguateContent />
    </Suspense>
  );
}
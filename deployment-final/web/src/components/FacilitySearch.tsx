'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

// US states and DC for the dropdown
const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'DC', name: 'District of Columbia' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' }
];

interface SearchResponse {
  count: number;
  results: Array<{
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
  }>;
}

export default function FacilitySearch() {
  const [selectedState, setSelectedState] = useState('');
  const [facilityNumber, setFacilityNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Clear previous error
    setErrorMessage('');
    
    // Validate inputs
    const state = selectedState.trim();
    const query = facilityNumber.trim();
    
    if (!state) {
      setErrorMessage('Please select a state.');
      return;
    }
    
    if (!query) {
      setErrorMessage('Please enter a facility number.');
      return;
    }
    
    setIsSearching(true);
    
    try {
      // Call the search API
      const response = await fetch(`https://tankid-api.fly.dev/facility/search?state=${encodeURIComponent(state)}&q=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }
      
      const data: SearchResponse = await response.json();
      
      // Route based on count per Tech Requirements
      if (data.count === 0) {
        setErrorMessage(`No facility found with number "${query}" in ${state}. Please check the number and state.`);
      } else if (data.count === 1) {
        // Single result - redirect to facility page
        router.push(`/facility/${data.results[0].id}`);
      } else {
        // Multiple results - redirect to disambiguation page
        const searchParams = new URLSearchParams({ state, q: query });
        router.push(`/disambiguate?${searchParams.toString()}`);
      }
    } catch (error) {
      console.error('Search error:', error);
      setErrorMessage('Search failed. Please try again or check your connection.');
    } finally {
      setIsSearching(false);
    }
  };
  
  const isFormValid = selectedState.trim() && facilityNumber.trim();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-6 py-16">
        {/* Header */}
        <header className="text-center mb-16">
          <div className="mb-4">
            <a href="https://www.tankid.io" className="text-blue-600 hover:text-blue-800 font-medium">
              ← Back to www.tankid.io
            </a>
          </div>
          <h1 className="text-5xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            TankID
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Find your facility by entering a state and facility number
          </p>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto">
          {/* Facility Search Form - Now First */}
          <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-md mb-12 max-w-2xl mx-auto">
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
                Find Your Facility
              </h2>
              <p className="text-slate-600 dark:text-slate-300 mb-6">
                Enter the state and any facility number you have - we'll search across all ID types.
              </p>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* State Dropdown */}
                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    State
                  </label>
                  <select
                    id="state"
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                    required
                  >
                    <option value="">Select a state...</option>
                    {US_STATES.map(state => (
                      <option key={state.code} value={state.code}>
                        {state.name} ({state.code})
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Facility Number Input */}
                <div>
                  <label htmlFor="facilityNumber" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Facility Number
                  </label>
                  <input
                    type="text"
                    id="facilityNumber"
                    value={facilityNumber}
                    onChange={(e) => setFacilityNumber(e.target.value)}
                    placeholder="Enter facility number (e.g., 1643, ABC123, etc.)"
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                    required
                  />
                </div>
                
                {/* Error Message */}
                {errorMessage && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                    <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
                  </div>
                )}
                
                {/* Search Button */}
                <button
                  type="submit"
                  disabled={!isFormValid || isSearching}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white py-2 px-4 rounded-md transition-colors font-medium"
                >
                  {isSearching ? 'Searching...' : 'Search Facility'}
                </button>
              </form>

            </div>
            
            {/* Examples with less space above */}
            <div className="mt-4 text-center">
              <p className="text-lg text-slate-600 dark:text-slate-400 mb-6">
                Try these examples:
              </p>
              <div className="space-y-4">
                <button 
                  onClick={() => {
                    setSelectedState('CO');
                    setFacilityNumber('7feaf062-4d00-4fd1-b2ac-a083301cf451');
                  }}
                  className="block mx-auto text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium px-4 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Colorado: 7feaf062-4d00-4fd1-b2ac-a083301cf451
                </button>
                <button 
                  onClick={() => {
                    setSelectedState('TX');
                    setFacilityNumber('defbe304-0b20-4832-9985-2d2df0946e64');
                  }}
                  className="block mx-auto text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium px-4 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Texas: defbe304-0b20-4832-9985-2d2df0946e64
                </button>
              </div>
            </div>
          
          {/* Features Section - More space after examples */}
          <div className="grid md:grid-cols-3 gap-8 mb-16 mt-20">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-3">
                🎯 Multi-ID Search
              </h3>
              <p className="text-slate-600 dark:text-slate-300">
                Search by state ID, client ID, or installer ID - we'll find your facility
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-3">
                📊 Complete Facility Data
              </h3>
              <p className="text-slate-600 dark:text-slate-300">
                View all tanks, site locations, and calibration data in one place
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-3">
                📱 QR Code Ready
              </h3>
              <p className="text-slate-600 dark:text-slate-300">
                Scan facility QR codes for instant access to tank information
              </p>
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
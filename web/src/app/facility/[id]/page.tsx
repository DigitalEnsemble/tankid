'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';

type Tank = {
  id: string;
  tank_number: string;
  serial_number: string;
  product_grade: string;
  octane: number | null;
  ethanol_pct: number | null;
  atg_brand: string;
  atg_model: string;
  access_level: string;
  manufacturer: string;
  model_name: string;
  nominal_capacity_gal: number | null;
};

type Facility = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
};

type FacilityData = {
  facility: Facility;
  tanks: Tank[];
};

export default function FacilityPage() {
  const params = useParams();
  const id = params?.id as string;
  const [data, setData] = useState<FacilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    
    const fetchFacility = async () => {
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://tankid-api.fly.dev';
        const response = await fetch(`${API_BASE}/facility/${id}`);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        
        const facilityData = await response.json();
        setData(facilityData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load facility');
      } finally {
        setLoading(false);
      }
    };
    
    fetchFacility();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading facility...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg mb-4">Error: {error}</div>
          <div className="text-sm text-gray-500">Facility ID: {id}</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">No facility data</div>
      </div>
    );
  }

  const { facility, tanks } = data;

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Facility Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{facility.name}</h1>
          <div className="text-gray-600">
            <div>{facility.address}</div>
            <div>{facility.city}, {facility.state} {facility.zip}</div>
          </div>
          <div className="text-sm text-gray-400 mt-2">
            {tanks.length} tank{tanks.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Tank List */}
        <div className="space-y-3">
          {tanks.map((tank) => (
            <Link key={tank.id} href={`/tank/${tank.id}`}>
              <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow border border-gray-200 hover:border-blue-300">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Tank {tank.tank_number}
                  </h3>
                  <div className="text-right">
                    <div className="text-sm font-medium text-blue-600">
                      {tank.product_grade}
                    </div>
                    {tank.octane && (
                      <div className="text-xs text-gray-500">{tank.octane} oct</div>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">Serial</div>
                    <div className="font-mono">{tank.serial_number}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Capacity</div>
                    <div>{tank.nominal_capacity_gal ? `${tank.nominal_capacity_gal.toLocaleString()} gal` : 'Unknown'}</div>
                  </div>
                </div>

                {(tank.manufacturer || tank.model_name) && (
                  <div className="mt-2 text-xs text-gray-500">
                    {tank.manufacturer} {tank.model_name}
                  </div>
                )}

                <div className="mt-3 text-right">
                  <span className="text-blue-600 text-sm font-medium">View Details →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {tanks.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="text-gray-500">No tanks found at this facility</div>
          </div>
        )}
      </div>
    </div>
  );
}
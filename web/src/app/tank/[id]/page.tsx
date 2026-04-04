'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

type ChartReading = {
  dipstick_in: number;
  gallons: number;
};

type Tank = {
  id: string;
  tank_number: string;
  serial_number: string;
  install_depth_inches: number | null;
  install_date: string | null;
  install_contractor: string | null;
  atg_brand: string;
  atg_model: string;
  atg_last_calibration: string | null;
  product_grade: string;
  octane: number | null;
  ethanol_pct: number | null;
  tank_model_id: string | null;
  access_level: string;
  facility_id: string;
  facility_name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  manufacturer: string;
  model_name: string;
  nominal_capacity_gal: number | null;
  actual_capacity_gal: number | null;
  diameter_ft: number | null;
  wall_type: string | null;
  material: string | null;
  chart_notes: string | null;
};

type TankData = {
  tank: Tank;
  chart: ChartReading[];
};

export default function TankPage() {
  const params = useParams();
  const id = params?.id as string;
  const [data, setData] = useState<TankData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    
    const fetchTank = async () => {
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://tankid-api.fly.dev';
        const response = await fetch(`${API_BASE}/tank/${id}`);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        
        const tankData = await response.json();
        setData(tankData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tank');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTank();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading tank...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg mb-4">Error: {error}</div>
          <div className="text-sm text-gray-500">Tank ID: {id}</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">No tank data</div>
      </div>
    );
  }

  const { tank, chart } = data;

  // Prepare chart data
  const chartData = {
    labels: chart.map(r => `${r.dipstick_in}"`),
    datasets: [
      {
        label: 'Volume (gallons)',
        data: chart.map(r => r.gallons),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        tension: 0.1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Calibration Chart',
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Dipstick Reading (inches)',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Volume (gallons)',
        },
      },
    },
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back Navigation */}
        <div className="mb-6">
          <Link 
            href={`/facility/${tank.facility_id}`}
            className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to {tank.facility_name}
          </Link>
        </div>

        {/* Tank Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Tank {tank.tank_number}
              </h1>
              <div className="text-gray-600 mt-1">{tank.facility_name}</div>
              <div className="text-sm text-gray-500">
                {tank.address}, {tank.city}, {tank.state} {tank.zip}
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-blue-600">
                {tank.product_grade}
              </div>
              {tank.octane && (
                <div className="text-sm text-gray-500">{tank.octane} octane</div>
              )}
              {tank.ethanol_pct && (
                <div className="text-sm text-gray-500">E{tank.ethanol_pct}</div>
              )}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Tank Details */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Tank Details</h2>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-500">Serial Number</div>
                <div className="font-mono">{tank.serial_number}</div>
              </div>
              
              {tank.nominal_capacity_gal && (
                <div>
                  <div className="text-sm text-gray-500">Capacity</div>
                  <div>{tank.nominal_capacity_gal.toLocaleString()} gallons</div>
                </div>
              )}

              {tank.install_date && (
                <div>
                  <div className="text-sm text-gray-500">Install Date</div>
                  <div>{new Date(tank.install_date).toLocaleDateString()}</div>
                </div>
              )}

              {tank.install_contractor && (
                <div>
                  <div className="text-sm text-gray-500">Installed By</div>
                  <div>{tank.install_contractor}</div>
                </div>
              )}

              {tank.install_depth_inches && (
                <div>
                  <div className="text-sm text-gray-500">Install Depth</div>
                  <div>{tank.install_depth_inches}" below grade</div>
                </div>
              )}
            </div>
          </div>

          {/* ATG & Model Info */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Equipment</h2>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-500">ATG System</div>
                <div>{tank.atg_brand} {tank.atg_model}</div>
              </div>

              {tank.atg_last_calibration && (
                <div>
                  <div className="text-sm text-gray-500">Last Calibrated</div>
                  <div>{new Date(tank.atg_last_calibration).toLocaleDateString()}</div>
                </div>
              )}

              {tank.manufacturer && (
                <div>
                  <div className="text-sm text-gray-500">Tank Manufacturer</div>
                  <div>{tank.manufacturer} {tank.model_name}</div>
                </div>
              )}

              {tank.diameter_ft && (
                <div>
                  <div className="text-sm text-gray-500">Diameter</div>
                  <div>{tank.diameter_ft} feet</div>
                </div>
              )}

              {tank.wall_type && (
                <div>
                  <div className="text-sm text-gray-500">Wall Type</div>
                  <div>{tank.wall_type}</div>
                </div>
              )}

              {tank.material && (
                <div>
                  <div className="text-sm text-gray-500">Material</div>
                  <div>{tank.material}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Calibration Chart */}
        {chart.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
            <h2 className="text-xl font-semibold mb-4">Calibration Chart</h2>
            <div className="h-96">
              <Line data={chartData} options={chartOptions} />
            </div>
            {tank.chart_notes && (
              <div className="mt-4 text-sm text-gray-600">
                <strong>Notes:</strong> {tank.chart_notes}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
'use client';

import { useEffect, useState, use } from 'react';
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

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface TankData {
  id: string;
  name?: string;
  calibrationData?: Array<{
    depth: number;
    volume: number;
  }>;
  metadata?: {
    capacity?: number;
    units?: string;
    lastCalibrated?: string;
  };
}

export default function TankProfile({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [tankData, setTankData] = useState<TankData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTankData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`https://tankid-api.fly.dev/tank/${resolvedParams.id}`);
        
        if (response.status === 404) {
          setError('Tank not found');
          return;
        }
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        setTankData(data);
      } catch (err) {
        console.error('Error fetching tank data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load tank data');
      } finally {
        setLoading(false);
      }
    };

    fetchTankData();
  }, [resolvedParams.id]);

  // Generate sample calibration data if none exists
  const getCalibrationData = () => {
    if (tankData?.calibrationData) {
      return tankData.calibrationData;
    }
    
    // Sample data for demonstration
    return Array.from({ length: 21 }, (_, i) => ({
      depth: i * 5, // 0 to 100 cm in 5cm increments
      volume: Math.round(Math.pow(i * 5, 1.8) * 2.5), // Non-linear relationship
    }));
  };

  const calibrationData = getCalibrationData();

  const chartData = {
    labels: calibrationData.map(point => `${point.depth}cm`),
    datasets: [
      {
        label: 'Volume (L)',
        data: calibrationData.map(point => point.volume),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Tank Calibration: Depth vs Volume',
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Depth (cm)',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Volume (L)',
        },
        beginAtZero: true,
      },
    },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-6 py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-300">Loading tank data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-6 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-8 mb-8">
              <h1 className="text-2xl font-bold text-red-800 dark:text-red-200 mb-4">
                {error === 'Tank not found' ? '🔍 Tank Not Found' : '❌ Error Loading Tank'}
              </h1>
              <p className="text-red-600 dark:text-red-300 mb-6">
                {error === 'Tank not found' 
                  ? `Tank ID "${resolvedParams.id}" does not exist in our system.`
                  : `Error: ${error}`
                }
              </p>
              <Link 
                href="/"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-md transition-colors"
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/"
            className="text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block"
          >
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Tank Profile
          </h1>
          <p className="text-slate-600 dark:text-slate-300">
            ID: <code className="bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded text-sm">{resolvedParams.id}</code>
          </p>
        </div>

        {/* Tank Information */}
        <div className="grid lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                Tank Information
              </h2>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-slate-500 dark:text-slate-400">Name:</span>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {tankData?.name || 'Unnamed Tank'}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-slate-500 dark:text-slate-400">Capacity:</span>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {tankData?.metadata?.capacity ? `${tankData.metadata.capacity}L` : 'Not specified'}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-slate-500 dark:text-slate-400">Last Calibrated:</span>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {tankData?.metadata?.lastCalibrated || 'Unknown'}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-slate-500 dark:text-slate-400">Data Points:</span>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {calibrationData.length} measurements
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Calibration Chart */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                Calibration Chart
              </h2>
              <div className="h-96">
                <Line data={chartData} options={chartOptions} />
              </div>
            </div>
          </div>
        </div>

        {/* Calibration Data Table */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Calibration Data
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-600">
                  <th className="text-left p-2 font-medium text-slate-900 dark:text-slate-100">Depth (cm)</th>
                  <th className="text-left p-2 font-medium text-slate-900 dark:text-slate-100">Volume (L)</th>
                  <th className="text-left p-2 font-medium text-slate-900 dark:text-slate-100">Fill Percentage</th>
                </tr>
              </thead>
              <tbody>
                {calibrationData.map((point, index) => (
                  <tr key={index} className="border-b border-slate-100 dark:border-slate-700">
                    <td className="p-2 text-slate-900 dark:text-slate-100">{point.depth}</td>
                    <td className="p-2 text-slate-900 dark:text-slate-100">{point.volume}</td>
                    <td className="p-2 text-slate-600 dark:text-slate-300">
                      {Math.round((point.volume / Math.max(...calibrationData.map(p => p.volume))) * 100)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
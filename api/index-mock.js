const express = require('express');

const app = express();

// Add CORS middleware for local development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Mock data
const mockFacility = {
  id: '00000000-0000-0000-0000-000000000000',
  name: 'Test Gas Station',
  address: '123 Main Street',
  city: 'Anytown',
  state: 'TX',
  zip: '75001'
};

const mockTanks = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    tank_number: '1',
    serial_number: 'ABC123456',
    product_grade: 'Regular Unleaded',
    octane: 87,
    ethanol_pct: 10,
    atg_brand: 'Veeder-Root',
    atg_model: 'TLS-350',
    access_level: 'public',
    manufacturer: 'Xerxes',
    model_name: 'FRP-2000',
    nominal_capacity_gal: 10000
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    tank_number: '2',
    serial_number: 'DEF789012',
    product_grade: 'Mid-Grade',
    octane: 89,
    ethanol_pct: 10,
    atg_brand: 'Veeder-Root',
    atg_model: 'TLS-350',
    access_level: 'public',
    manufacturer: 'Xerxes',
    model_name: 'FRP-2000',
    nominal_capacity_gal: 8000
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    tank_number: '3',
    serial_number: 'GHI345678',
    product_grade: 'Premium',
    octane: 93,
    ethanol_pct: 10,
    atg_brand: 'Veeder-Root',
    atg_model: 'TLS-350',
    access_level: 'public',
    manufacturer: 'Xerxes',
    model_name: 'FRP-2000',
    nominal_capacity_gal: 8000
  }
];

const mockTankDetail = {
  id: '11111111-1111-1111-1111-111111111111',
  tank_number: '1',
  serial_number: 'ABC123456',
  install_depth_inches: 72,
  install_date: '2020-03-15',
  install_contractor: 'Tank Pro Services',
  atg_brand: 'Veeder-Root',
  atg_model: 'TLS-350',
  atg_last_calibration: '2023-06-15',
  product_grade: 'Regular Unleaded',
  octane: 87,
  ethanol_pct: 10,
  tank_model_id: 'aaaa-bbbb-cccc-dddd',
  access_level: 'public',
  facility_id: '00000000-0000-0000-0000-000000000000',
  facility_name: 'Test Gas Station',
  address: '123 Main Street',
  city: 'Anytown',
  state: 'TX',
  zip: '75001',
  manufacturer: 'Xerxes',
  model_name: 'FRP-2000',
  nominal_capacity_gal: 10000,
  actual_capacity_gal: 9850,
  diameter_ft: 10,
  wall_type: 'Double Wall',
  material: 'Fiberglass',
  chart_notes: 'Calibrated to bottom of tank'
};

const mockChart = [
  { dipstick_in: 0, gallons: 0 },
  { dipstick_in: 6, gallons: 750 },
  { dipstick_in: 12, gallons: 1500 },
  { dipstick_in: 18, gallons: 2250 },
  { dipstick_in: 24, gallons: 3000 },
  { dipstick_in: 30, gallons: 3750 },
  { dipstick_in: 36, gallons: 4500 },
  { dipstick_in: 42, gallons: 5250 },
  { dipstick_in: 48, gallons: 6000 },
  { dipstick_in: 54, gallons: 6750 },
  { dipstick_in: 60, gallons: 7500 },
  { dipstick_in: 66, gallons: 8250 },
  { dipstick_in: 72, gallons: 9000 },
  { dipstick_in: 78, gallons: 9500 },
  { dipstick_in: 84, gallons: 9800 },
  { dipstick_in: 90, gallons: 9950 }
];

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'tankid-api-mock' });
});

app.get('/facility/:id', (req, res) => {
  const { id } = req.params;
  if (!UUID.test(id)) {
    return res.status(400).json({ error: 'Invalid facility ID format' });
  }
  
  if (id === '00000000-0000-0000-0000-000000000000') {
    res.json({ facility: mockFacility, tanks: mockTanks });
  } else {
    res.status(404).json({ error: 'Facility not found' });
  }
});

app.get('/tank/:id', (req, res) => {
  const { id } = req.params;
  if (!UUID.test(id)) {
    return res.status(400).json({ error: 'Invalid tank ID format' });
  }
  
  if (mockTanks.find(t => t.id === id)) {
    res.json({ tank: mockTankDetail, chart: mockChart });
  } else {
    res.status(404).json({ error: 'Tank not found' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`TankID Mock API running on port ${PORT}`);
});
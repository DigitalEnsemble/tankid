# TankID Seed Data Loading

This directory contains scripts to load TankID POC seed data into your PostgreSQL database.

## Files

- `seed-data.sql` - Original SQL with placeholders (for reference)
- `seed-additional.sql` - Additional compliance data SQL with placeholders (for reference)  
- `load-tankid-seed.js` - Smart loader that handles UUID placeholders automatically
- `test-seed-local.js` - Local test script

## Usage

### Option 1: GitHub Actions (Recommended)

The seed data loads automatically on every deployment to `main` branch. You can also trigger it manually:

1. Go to GitHub Actions in your repository
2. Select "Deploy TankID and Load Seed Data" workflow
3. Click "Run workflow"
4. Choose whether to load seed data
5. Click "Run workflow"

### Option 2: Manual Deployment

Deploy and load seed data manually:

```bash
# Deploy to Fly.io
cd api
flyctl deploy

# Load seed data via API endpoint
curl https://your-app.fly.dev/load-tankid-seed
```

### Option 3: Local Testing

Test the seed data loading locally (requires DATABASE_URL):

```bash
cd api
export DATABASE_URL="postgresql://username:password@localhost:5432/dbname"
node test-seed-local.js
```

### Option 4: Via API Server

If your API server is running locally:

```bash
curl http://localhost:3000/load-tankid-seed
```

## What Gets Loaded

The seed data includes:

### Core Data
- **1 Tank Model**: Eaton Metals Fireguard 12000
- **1 Facility**: Generic Maintenance Support Center - Fueling Island
- **4 Tanks**: OPS Tank IDs 1643-4, 1643-5, 1643-6, 1643-7

### Compliance Data
- Facility regulatory information (OPS ID, company ID, registration dates)
- Tank compliance fields (release detection, corrosion protection)
- Warranty validation data for tanks 6 and 7

### Document Records
- Fireguard warranty cards (tanks 6 and 7)
- AST registration forms (all tanks)
- Signed registration documents

## Smart Features

The loader script (`load-tankid-seed.js`) handles:

- **UUID Management**: Automatically captures and uses UUIDs from INSERT RETURNING statements
- **Idempotent Operations**: Uses `ON CONFLICT DO NOTHING` and `IF NOT EXISTS` to prevent duplicates
- **Schema Updates**: Adds columns safely with `ADD COLUMN IF NOT EXISTS`
- **Verification**: Runs checks to confirm data was loaded correctly
- **Error Handling**: Provides clear error messages and rollback on failure

## Schema Requirements

The loader assumes these tables exist:
- `tank_models`
- `facilities` 
- `tanks`
- `documents`

If they don't exist, create them first or the loader will fail.

## Troubleshooting

**"relation does not exist" errors**: Create the required database schema first

**"connection refused" errors**: Check your DATABASE_URL is correct and the database is running

**UUID placeholder errors**: The smart loader handles this automatically, but if using raw SQL, replace `[FACILITY_ID]` etc. with actual UUIDs

**Permission errors**: Ensure your database user has INSERT/UPDATE/ALTER permissions

## Output

Successful runs show:
- UUIDs of created records
- Verification query results  
- Summary of what was loaded

The generated UUIDs become the QR code identifiers for each tank.
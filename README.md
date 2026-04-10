# TankID

Tank inventory and calibration database for accurate liquid measurement and management.

## Overview

TankID is a comprehensive system for tracking storage tanks, calibration charts, and volume measurements. It manages facilities, tank models, and detailed calibration readings for accurate inventory tracking.

## Project Structure

```
tankid/
├── db/              # Database schema and migrations
│   └── schema.sql   # Database definition (created from Task 001)
├── api/             # Node.js API server (Task 002)
│   ├── index.js     # API entry point
│   ├── fly.toml     # Fly.io configuration
│   └── package.json # Dependencies
├── web/             # Frontend application (app.tankid.io)
│   ├── src/app/     # Next.js app router pages
│   ├── fly.toml     # Deployment config for app.tankid.io
│   └── package.json # Frontend dependencies
├── website/         # Marketing website (www.tankid.io)
│   ├── src/app/     # Next.js app router pages
│   ├── fly.toml     # Deployment config for www.tankid.io
│   └── package.json # Website dependencies
└── README.md        # This file
```

## Deployments

The TankID system consists of three deployed applications:

- **API** (`tankid-api`) — Backend API at https://tankid-api.fly.dev/
- **Web App** (`tankid-app`) — Facility search portal at app.tankid.io
- **Website** (`tankid-website`) — Marketing landing page at www.tankid.io

All applications deploy automatically via GitHub Actions on push to main branch.

## Database

PostgreSQL 16.8 hosted on Fly.io Managed Postgres.

**Cluster:** tankid-db (zp2wjrek4z4rdn4q)  
**Region:** ord (Chicago)  
**Plan:** Basic (Shared x2, 1GB RAM)

### Schema

- **facilities** — Storage tank locations
- **tank_models** — Tank specifications by manufacturer
- **tanks** — Individual tank instances
- **tank_chart_readings** — Calibration chart (height → volume mapping)
- **documents** — Tank-related files and certifications

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL client (psql)
- Fly.io CLI (flyctl)
- Doppler CLI (for secrets)

### Environment

Copy `.env.example` to `.env` and populate with your database connection string.

Connection string available via Doppler:
```bash
doppler secrets get DATABASE_URL --project tankid --config prd
```

## Deployment

Deployed via GitHub Actions to Fly.io. Push to main branch to trigger deployment of all three applications.

## License

Proprietary — TankID, 2026
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
├── web/             # Frontend (Task 003+)
└── README.md        # This file
```

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

Deployed via GitHub Actions to Fly.io. Push to main branch to trigger deployment.

## License

Proprietary — TankID, 2026

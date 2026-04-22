# TankID Intake Agent - Phase 3 Complete

## Overview

The TankID Intake Agent processes customer document uploads, extracts tank data using Claude, and presents a review UI for operator confirmation before writing to the database.

## Architecture

```
intake-agent/
├── intake_agent.py         # Main watcher script + CLI
├── batch_processor.py      # Orchestrates entire flow  
├── extractor.py           # PDF text extraction + Claude API calls
├── merger.py              # Tank grouping + field merging logic
├── review_server.py       # Flask UI for operator review
├── db.py                  # All database operations
├── storage.py             # R2 uploads + Google Drive + file moves
├── verify_setup.py        # Setup verification script
├── requirements.txt       # Python dependencies
├── .env.local            # Environment configuration (not committed)
└── templates/
    └── review.html        # Operator review UI template
```

## Quick Start

1. **Install dependencies:**
   ```bash
   cd intake-agent
   pip install -r requirements.txt
   ```

2. **Configure environment:**
   - Edit `.env.local` with your API keys and paths
   - Ensure Google Drive folders exist and are synced locally

3. **Setup Google auth (one-time):**
   ```bash
   gcloud auth application-default login \
     --scopes=https://www.googleapis.com/auth/drive,https://www.googleapis.com/auth/cloud-platform
   ```

4. **Verify setup:**
   ```bash
   python verify_setup.py
   ```

5. **Start watching:**
   ```bash
   python intake_agent.py --watch
   ```

## How It Works

1. **File Detection**: Watchdog monitors `inbox/{company-slug}/` folders
2. **Settling**: 120-second timer prevents processing until batch is complete  
3. **Extraction**: PDFs → text → Claude → structured data (parallel processing)
4. **Grouping**: Documents grouped by tank using serial numbers
5. **Merging**: Field conflicts detected and flagged for operator review
6. **Review UI**: Opens `http://localhost:5000` for operator decisions
7. **Processing**: Confirmed tanks → database + R2, pending tanks → pending storage
8. **Cleanup**: Files moved to `processed/` folder

## Document Types Supported

- **Installation Permits**: Primary source of truth (highest priority)
- **Manufacturer Specs**: Tank model specifications (shared across tanks)
- **Tank Charts**: Calibration charts (1:1 tank relationship)
- **ATG Configs**: Automatic tank gauge settings
- **Inspection Reports**: Annual inspection results
- **Warranty Documents**: Manufacturer warranty info
- **Email Bodies**: Facility context (never uploaded to R2)

## Required Fields for Confirmation

Tanks need these fields to be marked "ready":
- `serial_number` 
- `facility_address`
- `facility_state`
- `manufacturer`

Missing fields trigger "pending" status.

## Environment Variables

Key variables in `.env.local`:
- `ANTHROPIC_API_KEY`: Claude API access
- `DATABASE_URL`: PostgreSQL connection string  
- `R2_*`: Cloudflare R2 storage credentials
- `INTAKE_INBOX_PATH`: Google Drive sync path for incoming files
- `SETTLE_SECONDS`: Batch settling time (default: 120)

## Database Schema

The agent requires these tables:
- `facilities`: Facility master records
- `tanks`: Tank master records  
- `tank_models`: Manufacturer model specifications
- `documents`: Document storage records (links to R2)
- `tank_field_sources`: Field extraction provenance
- `pending_documents`: Incomplete extractions awaiting follow-up

## R2 Storage Structure

**Confirmed documents:**
```
tankid-docs/{facility_uuid}/{tank_uuid}/{doc_type}/{filename}
```

**Pending documents:**
```
tankid-docs/pending/{batch_id}/{filename}
```

## Testing

Test with existing files:
```bash
python intake_agent.py --test-batch company-slug
```

## Cloud Migration (Future)

Only the entry point needs to change for cloud deployment:
- Replace watchdog with HTTP server + Eventarc
- Replace local file moves with Drive API calls
- All extraction/merging logic remains unchanged

## Logging

Standard format: `%(asctime)s %(levelname)s %(message)s`

Key log events:
- File detection and timer management
- Claude extraction results and token usage
- Tank grouping and conflict detection  
- Operator decisions and database writes
- Error conditions and file movement
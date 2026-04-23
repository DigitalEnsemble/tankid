#!/usr/bin/env python3
"""Upload processed documents to R2 for FL-2001 tanks."""
import os, json
from pathlib import Path
from storage_r2 import R2StorageManager

PROCESSED_DIR = Path("/Users/charlesroehrig/Library/CloudStorage/GoogleDrive-casey.wells@tankid.io/My Drive/TankID/intake/processed/f5d25a46-5306-44da-8ccc-06c5a1f54b0e")

# Tank serial → production tank ID (from sync output)
TANK_IDS = {
    "AST-2018-001-MCD": "5f205092-a3c4-4c2a-a7f7-fbf6998d441a",
    "AST-2018-002-MCD": "b64553e7-a258-4144-acc1-df9a74323b65",
    "UST-2019-003-MCD": "abeb2f8f-1597-4e0e-8548-53b633df87eb",
}

# Map filenames to tank serials
FILE_TANK_MAP = {
    "FL-2001-01_Drawing.pdf":       "AST-2018-001-MCD",
    "FL-2001-01_Capacity_Chart.pdf":"AST-2018-001-MCD",
    "FL-2001-01_Warranty.pdf":      "AST-2018-001-MCD",
    "FL-2001-02_Drawing.pdf":       "AST-2018-002-MCD",
    "FL-2001-02_Capacity_Chart.pdf":"AST-2018-002-MCD",
    "FL-2001-02_Warranty.pdf":      "AST-2018-002-MCD",
    "FL-2001-03_Drawing.pdf":       "UST-2019-003-MCD",
    "FL-2001-03_Capacity_Chart.pdf":"UST-2019-003-MCD",
    "FL-2001-03_Warranty.pdf":      "UST-2019-003-MCD",
    "FL-2001_Registration.pdf":     "AST-2018-001-MCD",  # shared doc → link to first tank
    "FL-2001_INDEX.pdf":            "AST-2018-001-MCD",
}

r2 = R2StorageManager()
uploaded = []
errors = []

for fname, serial in FILE_TANK_MAP.items():
    fpath = PROCESSED_DIR / fname
    if not fpath.exists():
        print(f"  MISSING: {fname}")
        errors.append(fname)
        continue
    tank_id = TANK_IDS.get(serial, "unknown")
    r2_key = f"documents/{tank_id}/{fname}"
    try:
        with open(fpath, "rb") as f:
            data = f.read()
        r2.client.put_object(Bucket=r2.bucket, Key=r2_key, Body=data)
        print(f"  ✅ {r2_key}")
        uploaded.append(r2_key)
    except Exception as e:
        print(f"  ❌ {fname}: {e}")
        errors.append(fname)

print(f"\nUploaded: {len(uploaded)}, Errors: {len(errors)}")

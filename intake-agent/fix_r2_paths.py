#!/usr/bin/env python3
"""Re-upload docs to facility-scoped R2 path and fix tank_documents records."""
import os, uuid
from pathlib import Path
import psycopg2
from storage_r2 import R2StorageManager

FACILITY_ID = "fedb901f-3f42-40b1-b30d-0f64c8a6c44e"
DB_URL = os.environ["DATABASE_URL"]
R2_PUBLIC_URL = os.environ.get("R2_PUBLIC_URL", "").rstrip("/")

PROCESSED_DIR = Path("/Users/charlesroehrig/Library/CloudStorage/GoogleDrive-casey.wells@tankid.io/My Drive/TankID/intake/processed/f5d25a46-5306-44da-8ccc-06c5a1f54b0e")

TANK_IDS = {
    "AST-2018-001-MCD": "5f205092-a3c4-4c2a-a7f7-fbf6998d441a",
    "AST-2018-002-MCD": "b64553e7-a258-4144-acc1-df9a74323b65",
    "UST-2019-003-MCD": "abeb2f8f-1597-4e0e-8548-53b633df87eb",
}

DOCS = [
    ("FL-2001-01_Drawing.pdf",        "AST-2018-001-MCD", "drawing"),
    ("FL-2001-01_Capacity_Chart.pdf", "AST-2018-001-MCD", "capacity_chart"),
    ("FL-2001-01_Warranty.pdf",       "AST-2018-001-MCD", "warranty"),
    ("FL-2001-02_Drawing.pdf",        "AST-2018-002-MCD", "drawing"),
    ("FL-2001-02_Capacity_Chart.pdf", "AST-2018-002-MCD", "capacity_chart"),
    ("FL-2001-02_Warranty.pdf",       "AST-2018-002-MCD", "warranty"),
    ("FL-2001-03_Drawing.pdf",        "UST-2019-003-MCD", "drawing"),
    ("FL-2001-03_Capacity_Chart.pdf", "UST-2019-003-MCD", "capacity_chart"),
    ("FL-2001-03_Warranty.pdf",       "UST-2019-003-MCD", "warranty"),
    ("FL-2001_Registration.pdf",      None,               "registration"),
    ("FL-2001_INDEX.pdf",             None,               "index"),
]

r2 = R2StorageManager()
conn = psycopg2.connect(DB_URL)
cur = conn.cursor()

# Delete old tank_documents records for this facility (inserted with wrong paths)
cur.execute("DELETE FROM tank_documents WHERE facility_id = %s", (FACILITY_ID,))
print(f"Cleared old tank_documents records for facility")

# Delete old per-tank R2 objects
old_tank_dirs = list(TANK_IDS.values())
for tank_id in old_tank_dirs:
    for fname, serial, _ in DOCS:
        if serial and TANK_IDS.get(serial) == tank_id:
            old_key = f"documents/{tank_id}/{fname}"
            try:
                r2.client.delete_object(Bucket=r2.bucket, Key=old_key)
                print(f"  🗑️  Deleted {old_key}")
            except Exception:
                pass

uploaded = 0
inserted = 0
errors = 0

for fname, serial, doc_type in DOCS:
    fpath = PROCESSED_DIR / fname
    if not fpath.exists():
        print(f"  MISSING: {fname}")
        errors += 1
        continue

    # All docs go under facility ID path
    r2_key = f"documents/{FACILITY_ID}/{fname}"
    file_path = f"{R2_PUBLIC_URL}/{r2_key}" if R2_PUBLIC_URL else r2_key
    file_size = fpath.stat().st_size

    # linked_tanks
    if serial:
        linked = [TANK_IDS[serial]]
    else:
        linked = list(TANK_IDS.values())

    # Upload to R2
    try:
        with open(fpath, "rb") as f:
            r2.client.put_object(Bucket=r2.bucket, Key=r2_key, Body=f.read())
        print(f"  ✅ R2: {r2_key}")
        uploaded += 1
    except Exception as e:
        print(f"  ❌ R2 upload {fname}: {e}")
        errors += 1
        continue

    # Insert DB record
    try:
        cur.execute("""
            INSERT INTO tank_documents (
                id, filename, original_filename, doc_type, file_path,
                file_size, mime_type, linked_tanks, facility_id,
                uploaded_by, is_public, r2_key, created_at, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s,
                %s, %s, %s::uuid[], %s,
                %s, %s, %s, NOW(), NOW()
            )
        """, (
            str(uuid.uuid4()), fname, fname, doc_type, file_path,
            file_size, "application/pdf", linked, FACILITY_ID,
            "intake-agent", False, r2_key,
        ))
        inserted += 1
    except Exception as e:
        conn.rollback()
        print(f"  ❌ DB {fname}: {e}")
        errors += 1

conn.commit()
cur.close()
conn.close()
print(f"\nUploaded: {uploaded}, DB records: {inserted}, Errors: {errors}")

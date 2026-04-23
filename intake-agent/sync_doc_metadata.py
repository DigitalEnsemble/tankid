#!/usr/bin/env python3
"""Sync FL-2001 document metadata into tank_documents table."""
import os, uuid
from pathlib import Path
import psycopg2

DB_URL = os.environ["DATABASE_URL"]
FACILITY_ID = "fedb901f-3f42-40b1-b30d-0f64c8a6c44e"  # Miami Central Fuel Depot (created during sync)
R2_PUBLIC_URL = os.environ.get("R2_PUBLIC_URL", "").rstrip("/")

TANK_IDS = {
    "AST-2018-001-MCD": "5f205092-a3c4-4c2a-a7f7-fbf6998d441a",
    "AST-2018-002-MCD": "b64553e7-a258-4144-acc1-df9a74323b65",
    "UST-2019-003-MCD": "abeb2f8f-1597-4e0e-8548-53b633df87eb",
}

PROCESSED_DIR = Path("/Users/charlesroehrig/Library/CloudStorage/GoogleDrive-casey.wells@tankid.io/My Drive/TankID/intake/processed/f5d25a46-5306-44da-8ccc-06c5a1f54b0e")

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
    ("FL-2001_Registration.pdf",      None,               "registration"),   # all tanks
    ("FL-2001_INDEX.pdf",             None,               "index"),           # all tanks
]

conn = psycopg2.connect(DB_URL)
cur = conn.cursor()
inserted = 0
errors = 0

for fname, serial, doc_type in DOCS:
    fpath = PROCESSED_DIR / fname
    tank_id = TANK_IDS.get(serial) if serial else None
    # linked_tanks: array of all tank UUIDs for shared docs, single for per-tank
    if serial:
        linked = [TANK_IDS[serial]]
    else:
        linked = list(TANK_IDS.values())

    r2_key = f"documents/{tank_id or TANK_IDS['AST-2018-001-MCD']}/{fname}"
    file_path = f"{R2_PUBLIC_URL}/{r2_key}" if R2_PUBLIC_URL else r2_key
    file_size = fpath.stat().st_size if fpath.exists() else 0

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
            ON CONFLICT (id) DO NOTHING
        """, (
            str(uuid.uuid4()),
            fname,
            fname,
            doc_type,
            file_path,
            file_size,
            "application/pdf",
            linked,
            FACILITY_ID,
            "intake-agent",
            False,
            r2_key,
        ))
        print(f"  ✅ {fname} ({doc_type})")
        inserted += 1
    except Exception as e:
        conn.rollback()
        print(f"  ❌ {fname}: {e}")
        errors += 1
        continue

conn.commit()
cur.close()
conn.close()
print(f"\nInserted: {inserted}, Errors: {errors}")

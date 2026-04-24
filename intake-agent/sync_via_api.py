#!/usr/bin/env python3
"""
Sync confirmed local tanks to production via HTTP /api/intake-sync endpoint.
Reads mock_data/tanks.json + resolves local document files for base64 upload.
Run with: doppler run --project tankid --config prd -- python3 sync_via_api.py [--dry-run]
"""
import base64
import json
import logging
import mimetypes
import os
import sys
from pathlib import Path

import requests

logging.basicConfig(level=logging.INFO, format='%(levelname)s:%(name)s:%(message)s')
logger = logging.getLogger('sync_via_api')

API_BASE = "https://tankid-api.fly.dev"
MOCK_DATA = Path(__file__).parent / "mock_data"
LOCAL_STORAGE = Path(__file__).parent / "local_storage"

# Filename keywords that flag a doc as facility-level (not tank-specific)
FACILITY_DOC_PATTERNS = [
    '_registration', '_index', '_facility_info', '_facility-info',
    'facility_info', 'facility-info',
]

# Suffixes we consider uploadable documents
DOC_SUFFIXES = {'.pdf', '.txt', '.png', '.jpg', '.jpeg', '.tif', '.tiff'}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def resolve_local_path(storage_path: str):
    """Convert local://storage/<batch>/<file> to an absolute path."""
    if not storage_path or not storage_path.startswith("local://storage/"):
        return None
    rel = storage_path.removeprefix("local://storage/")
    p = LOCAL_STORAGE / rel
    return p if p.exists() else None


def is_facility_level(filename: str) -> bool:
    fn = filename.lower()
    return any(pat in fn for pat in FACILITY_DOC_PATTERNS)


def scan_local_storage() -> dict:
    """Return {filename: Path} for every non-metadata doc in all batch dirs (latest batch wins)."""
    files: dict[str, Path] = {}
    if not LOCAL_STORAGE.exists():
        return files
    for batch_dir in sorted(LOCAL_STORAGE.iterdir()):  # sorted so later batches overwrite
        if not batch_dir.is_dir():
            continue
        for f in batch_dir.iterdir():
            if f.suffix.lower() in DOC_SUFFIXES and not f.name.endswith('_metadata.json'):
                files[f.name] = f
    return files


def load_confirmed_tanks():
    tanks = json.loads((MOCK_DATA / "tanks.json").read_text())
    return [t for t in tanks if t.get("status") == "confirmed"]


def load_all_documents():
    return json.loads((MOCK_DATA / "documents.json").read_text())


def load_documents_for_tank(tank, all_docs):
    doc_ids = set(tank.get("document_ids") or [])
    return [d for d in all_docs if d.get("id") in doc_ids]


def _coerce_date(value) -> str:
    """Convert bare year (int or str) to YYYY-01-01; pass through full date strings as-is."""
    if value is None:
        return None
    s = str(value).strip()
    if not s:
        return None
    # Bare 4-digit year
    import re
    if re.fullmatch(r'\d{4}', s):
        return f"{s}-01-01"
    return s


def _derive_facility_id(tank: dict) -> str:
    """Derive client_facility_id from source filenames when not explicitly set.
    E.g. 'UT-1001-01_Drawing.pdf' -> 'UT-1001'
    """
    import re
    sources = tank.get("sources") or []
    for src in sources:
        fp = src if isinstance(src, str) else src.get("file_path", "")
        stem = Path(fp).stem  # e.g. 'UT-1001-01_Drawing'
        # Match pattern: XX-NNNN (two uppercase letters, dash, 4 digits)
        m = re.match(r'^([A-Z]{2}-\d{4})-', stem)
        if m:
            return m.group(1)
    return None


def build_extracted_data(tank: dict) -> dict:
    """Merge top-level mock fields into extracted_data so the API picks them up."""
    base = dict(tank.get("extracted_data") or {})
    mapping = {
        "manufacturer":       tank.get("manufacturer"),
        "capacity_gallons":   tank.get("capacity_gallons"),
        "tank_type":          tank.get("tank_type"),
        "material":           tank.get("material"),
        "contents":           tank.get("product_stored") or tank.get("contents"),
        "installation_date":  _coerce_date(tank.get("installation_date") or tank.get("year_installed")),
        "serial_number":      tank.get("serial_number"),
        "facility_name":      tank.get("facility_name"),
        "facility_address":   tank.get("facility_address"),
        "facility_city":      tank.get("facility_city"),
        "facility_state":     tank.get("facility_state"),
        "facility_zip":       tank.get("facility_zip"),
        "client_facility_id": tank.get("client_facility_id") or _derive_facility_id(tank),
    }
    for k, v in mapping.items():
        if v is not None and v != "" and k not in base:
            base[k] = v
    return base


def encode_file(path: Path) -> str:
    return base64.b64encode(path.read_bytes()).decode("utf-8")


def make_doc_entry(filename: str, path: Path, facility_level: bool = False) -> dict:
    mime_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
    entry = {
        "filename":  filename,
        "content":   encode_file(path),
        "mime_type": mime_type,
    }
    if facility_level:
        entry["is_facility_level"] = True
    return entry


# ---------------------------------------------------------------------------
# Payload builder
# ---------------------------------------------------------------------------

def build_payload(tanks) -> list:
    all_docs = load_all_documents()
    all_local = scan_local_storage()  # {filename: Path}

    # Split local files into facility-level and tank-specific buckets
    facility_files = {fn: fp for fn, fp in all_local.items() if is_facility_level(fn)}
    tank_files     = {fn: fp for fn, fp in all_local.items() if not is_facility_level(fn)}

    payload_tanks = []
    for idx, tank in enumerate(tanks, start=1):
        serial   = tank.get("serial_number") or f"Tank {idx}"
        # Derive the tank's file prefix from extracted_data.tank_id (e.g. "FL-2001-01")
        # Fall back to inferring prefix from source file paths if tank_id is not set
        tank_prefix = (tank.get("extracted_data") or {}).get("tank_id", "").upper()
        if not tank_prefix:
            sources = tank.get("sources") or []
            for src in sources:
                src_name = Path(src.get("file_path", "")).stem  # e.g. "FL-2001-02_Drawing"
                parts = src_name.split("_", 1)
                if len(parts) == 2 and parts[0]:
                    candidate = parts[0].upper()  # e.g. "FL-2001-02"
                    # Only use if it looks like a tank-level prefix (has more than one dash segment)
                    if candidate.count("-") >= 2:
                        tank_prefix = candidate
                        break

        # Display name: serial number is the best human-readable name we have
        tank_name = serial

        extracted = build_extracted_data(tank)

        # --- Documents ---
        documents_content = []
        seen_filenames: set[str] = set()

        # 1. Tracked docs (from document_ids in mock_data)
        tracked = load_documents_for_tank(tank, all_docs)
        for d in tracked:
            storage_path = d.get("storage_path", "")
            local_path = resolve_local_path(storage_path)
            if local_path is None:
                logger.warning(f"  Tracked doc file not found: {storage_path}")
                continue
            fn = local_path.name
            if fn in seen_filenames:
                continue
            seen_filenames.add(fn)
            logger.info(f"  [tracked] {fn} ({local_path.stat().st_size:,} bytes)")
            documents_content.append(make_doc_entry(fn, local_path))

        # 2. Untracked tank-specific docs: scan local_storage for files
        #    whose names start with the tank's prefix (e.g. "FL-2001-01_")
        if tank_prefix:
            for fn, fp in tank_files.items():
                if fn in seen_filenames:
                    continue
                if fn.upper().startswith(tank_prefix + "_") or fn.upper().startswith(tank_prefix + "."):
                    seen_filenames.add(fn)
                    logger.info(f"  [untracked] {fn} ({fp.stat().st_size:,} bytes)")
                    documents_content.append(make_doc_entry(fn, fp))

        # 3. Facility-level docs — include with every tank payload;
        #    API dedup (r2_key check) ensures they're only written once to DB/R2
        for fn, fp in facility_files.items():
            logger.info(f"  [facility] {fn} ({fp.stat().st_size:,} bytes)")
            documents_content.append(make_doc_entry(fn, fp, facility_level=True))

        logger.info(
            f"Tank {serial} | docs: {len(documents_content)} "
            f"| manufacturer: {extracted.get('manufacturer')} "
            f"| capacity: {extracted.get('capacity_gallons')}"
        )

        entry = {
            "serial_number":     serial,
            "tank_id":           serial,
            "tank_name":         tank_name,
            "tank_type":         tank.get("tank_type"),
            "manufacturer":      tank.get("manufacturer"),
            "material":          tank.get("material"),
            "capacity_gallons":  tank.get("capacity_gallons"),
            "installation_date": _coerce_date(tank.get("installation_date") or tank.get("year_installed")),
            "contents":          tank.get("product_stored") or tank.get("contents"),
            "dimensions":        tank.get("dimensions"),
            "coating_type":      tank.get("coating_type"),
            "monitoring_system": tank.get("monitoring_system"),
            "owner_name":        tank.get("owner_name"),
            "client_facility_id":  tank.get("client_facility_id"),
            "state_facility_id":   tank.get("client_facility_id"),
            "facility_name":     tank.get("facility_name"),
            "facility_address":  tank.get("facility_address"),
            "facility_city":     tank.get("facility_city"),
            "facility_state":    tank.get("facility_state"),
            "facility_zip":      tank.get("facility_zip"),
            "extracted_data":    extracted,
            "documents_content": documents_content,
        }
        payload_tanks.append(entry)

    return payload_tanks


# ---------------------------------------------------------------------------
# Sync
# ---------------------------------------------------------------------------

def clear_local_data():
    """Reset mock_data JSON files and wipe local_storage after a successful sync."""
    import shutil
    base = Path(__file__).parent

    mock_data = base / "mock_data"
    empty_list = json.dumps([], indent=2)
    for fname in ["tanks.json", "documents.json", "batches.json"]:
        fpath = mock_data / fname
        if fpath.exists():
            fpath.write_text(empty_list)
            logger.info(f"Cleared {fpath.name}")

    local_storage = base / "local_storage"
    if local_storage.exists():
        shutil.rmtree(local_storage)
        local_storage.mkdir()
        logger.info("Cleared local_storage/")

    logger.info("✅ Local data cleared — ready for next batch")


def sync(dry_run=False):
    api_key = os.environ.get("ADMIN_API_KEY")
    if not api_key:
        logger.error("ADMIN_API_KEY not set")
        sys.exit(1)

    tanks = load_confirmed_tanks()
    logger.info(f"Found {len(tanks)} confirmed tanks to sync")
    if not tanks:
        logger.warning("No confirmed tanks found in mock_data/tanks.json")
        return

    payload = build_payload(tanks)

    headers = {"x-api-key": api_key, "Content-Type": "application/json"}
    body = {"tanks": payload, "dry_run": dry_run}

    logger.info(f"POST {API_BASE}/api/intake-sync (dry_run={dry_run})")
    resp = requests.post(f"{API_BASE}/api/intake-sync", json=body, headers=headers, timeout=180)

    logger.info(f"Response status: {resp.status_code}")
    try:
        result = resp.json()
        print(json.dumps(result, indent=2))
    except Exception:
        print(resp.text)

    if resp.status_code != 200:
        sys.exit(1)

    # On successful real sync, clear local data so the pipeline is ready for the next batch
    if not dry_run:
        try:
            result_json = json.loads(resp.text)
        except Exception:
            result_json = {}
        if result_json.get("success"):
            clear_local_data()


if __name__ == "__main__":
    dry_run = "--dry-run" in sys.argv
    sync(dry_run=dry_run)

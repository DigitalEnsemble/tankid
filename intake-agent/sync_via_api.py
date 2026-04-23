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

# local_storage/<batch_id>/<filename>
def resolve_local_path(storage_path: str):
    """Convert local://storage/<batch>/<file> to an absolute path."""
    if not storage_path or not storage_path.startswith("local://storage/"):
        return None
    rel = storage_path.removeprefix("local://storage/")
    p = LOCAL_STORAGE / rel
    return p if p.exists() else None

def load_confirmed_tanks():
    tanks = json.loads((MOCK_DATA / "tanks.json").read_text())
    return [t for t in tanks if t.get("status") == "confirmed"]

def load_all_documents():
    return json.loads((MOCK_DATA / "documents.json").read_text())

def load_documents_for_tank(tank, all_docs):
    doc_ids = set(tank.get("document_ids") or [])
    return [d for d in all_docs if d.get("id") in doc_ids]

def build_extracted_data(tank: dict) -> dict:
    """Merge top-level mock fields into extracted_data so the API picks them up."""
    base = dict(tank.get("extracted_data") or {})
    mapping = {
        "manufacturer":      tank.get("manufacturer"),
        "capacity_gallons":  tank.get("capacity_gallons"),
        "tank_type":         tank.get("tank_type"),
        "material":          tank.get("material"),
        "contents":          tank.get("product_stored") or tank.get("contents"),
        "installation_date": tank.get("installation_date") or tank.get("year_installed"),
        "serial_number":     tank.get("serial_number"),
        "facility_name":     tank.get("facility_name"),
        "facility_address":  tank.get("facility_address"),
        "facility_city":     tank.get("facility_city"),
        "facility_state":    tank.get("facility_state"),
        "facility_zip":      tank.get("facility_zip"),
        "client_facility_id": tank.get("client_facility_id"),
    }
    for k, v in mapping.items():
        if v is not None and v != "" and k not in base:
            base[k] = v
    return base

def encode_document(doc: dict):
    """Read local file and return base64 payload for documents_content."""
    storage_path = doc.get("storage_path", "")
    local_path = resolve_local_path(storage_path)
    if local_path is None:
        logger.warning(f"  Local file not found: {storage_path}")
        return None
    filename = local_path.name
    mime_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
    content = base64.b64encode(local_path.read_bytes()).decode("utf-8")
    logger.info(f"  Encoded {filename} ({local_path.stat().st_size:,} bytes)")
    return {"filename": filename, "content": content, "mime_type": mime_type}

def build_payload(tanks) -> list:
    all_docs = load_all_documents()
    payload_tanks = []
    for tank in tanks:
        docs = load_documents_for_tank(tank, all_docs)
        extracted = build_extracted_data(tank)

        # Build documents_content (base64)
        documents_content = []
        for d in docs:
            enc = encode_document(d)
            if enc:
                documents_content.append(enc)

        entry = {
            "serial_number":     tank.get("serial_number"),
            "tank_id":           tank.get("serial_number"),
            "tank_type":         tank.get("tank_type"),
            "manufacturer":      tank.get("manufacturer"),
            "material":          tank.get("material"),
            "capacity_gallons":  tank.get("capacity_gallons"),
            "installation_date": tank.get("installation_date") or tank.get("year_installed"),
            "contents":          tank.get("product_stored") or tank.get("contents"),
            "dimensions":        tank.get("dimensions"),
            "coating_type":      tank.get("coating_type"),
            "monitoring_system": tank.get("monitoring_system"),
            "owner_name":        tank.get("owner_name"),
            "client_facility_id": tank.get("client_facility_id"),
            "state_facility_id": tank.get("client_facility_id"),
            "facility_name":     tank.get("facility_name"),
            "facility_address":  tank.get("facility_address"),
            "facility_city":     tank.get("facility_city"),
            "facility_state":    tank.get("facility_state"),
            "facility_zip":      tank.get("facility_zip"),
            "extracted_data":    extracted,
            "documents_content": documents_content,
            # legacy field (local paths) kept for reference but not used by API
            "documents": [{"filename": d.get("filename") or Path(d.get("file_path","")).name,
                           "doc_type": d.get("document_type")} for d in docs],
        }
        logger.info(f"Tank {tank.get('serial_number')} | docs: {len(documents_content)} | manufacturer: {extracted.get('manufacturer')} | capacity: {extracted.get('capacity_gallons')}")
        payload_tanks.append(entry)
    return payload_tanks

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

if __name__ == "__main__":
    dry_run = "--dry-run" in sys.argv
    sync(dry_run=dry_run)

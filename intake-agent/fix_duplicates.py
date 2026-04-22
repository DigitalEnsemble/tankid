#!/usr/bin/env python3
"""
Fix duplicate tanks in the database
Consolidates tanks with same serial_number + facility_address into single record
"""
import json
import os
from typing import Dict, List
from datetime import datetime

def load_tanks():
    """Load tanks from JSON file"""
    tanks_file = "mock_data/tanks.json"
    if os.path.exists(tanks_file):
        with open(tanks_file, 'r') as f:
            return json.load(f)
    return []

def save_tanks(tanks):
    """Save tanks to JSON file"""
    tanks_file = "mock_data/tanks.json"
    with open(tanks_file, 'w') as f:
        json.dump(tanks, f, indent=2, default=str)

def get_tank_key(tank):
    """Generate a unique key for tank deduplication"""
    serial = tank.get('serial_number', '').strip()
    address = tank.get('facility_address', '').strip()
    return f"{serial}|{address}"

def merge_tank_sources(tanks_group):
    """Merge sources from duplicate tanks"""
    all_sources = []
    all_document_ids = []
    
    for tank in tanks_group:
        # Add sources
        sources = tank.get('sources', [])
        all_sources.extend(sources)
        
        # Add document IDs
        doc_ids = tank.get('document_ids', [])
        all_document_ids.extend(doc_ids)
    
    # Remove duplicate sources based on file_path
    unique_sources = []
    seen_paths = set()
    for source in all_sources:
        path = source.get('file_path', '')
        if path not in seen_paths:
            unique_sources.append(source)
            seen_paths.add(path)
    
    # Remove duplicate document IDs
    unique_doc_ids = list(set(all_document_ids))
    
    return unique_sources, unique_doc_ids

def consolidate_duplicates():
    """Consolidate duplicate tanks"""
    tanks = load_tanks()
    
    print(f"🔍 Found {len(tanks)} total tanks")
    
    # Group tanks by serial_number + facility_address
    tank_groups = {}
    for tank in tanks:
        key = get_tank_key(tank)
        if key not in tank_groups:
            tank_groups[key] = []
        tank_groups[key].append(tank)
    
    # Find duplicates
    duplicates_found = 0
    consolidated_tanks = []
    
    for key, group in tank_groups.items():
        if len(group) > 1:
            print(f"🚨 DUPLICATE: {len(group)} tanks with key '{key}'")
            duplicates_found += len(group) - 1
            
            # Take the first tank as the base
            base_tank = group[0].copy()
            
            # Merge sources from all tanks
            merged_sources, merged_doc_ids = merge_tank_sources(group)
            
            base_tank['sources'] = merged_sources
            base_tank['document_ids'] = merged_doc_ids
            base_tank['updated_at'] = datetime.now().isoformat()
            base_tank['notes'] = f"Consolidated from {len(group)} duplicate records"
            
            consolidated_tanks.append(base_tank)
            
            print(f"  ✅ Consolidated into single tank with {len(merged_sources)} unique sources")
            
        else:
            # No duplicates, keep as-is
            consolidated_tanks.append(group[0])
    
    print(f"\n📊 SUMMARY:")
    print(f"  Original tanks: {len(tanks)}")
    print(f"  Duplicates removed: {duplicates_found}")
    print(f"  Final tanks: {len(consolidated_tanks)}")
    
    if duplicates_found > 0:
        # Create backup
        backup_file = f"mock_data/tanks_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        save_tanks_to_file(tanks, backup_file)
        print(f"  📦 Backup saved: {backup_file}")
        
        # Save consolidated data
        save_tanks(consolidated_tanks)
        print(f"  ✅ Cleaned data saved to tanks.json")
        
        return True
    else:
        print("  ✅ No duplicates found - database is clean")
        return False

def save_tanks_to_file(tanks, filename):
    """Save tanks to a specific file"""
    with open(filename, 'w') as f:
        json.dump(tanks, f, indent=2, default=str)

def show_current_tanks():
    """Display current tank data"""
    tanks = load_tanks()
    
    print(f"\n📋 CURRENT TANKS ({len(tanks)}):")
    for i, tank in enumerate(tanks, 1):
        serial = tank.get('serial_number', 'N/A')
        facility = tank.get('facility_name', 'N/A')
        sources = len(tank.get('sources', []))
        status = tank.get('status', 'N/A')
        
        print(f"  {i}. {serial} @ {facility}")
        print(f"     Status: {status}, Sources: {sources}")

if __name__ == "__main__":
    print("🔧 TankID Duplicate Tank Cleanup")
    print("=" * 40)
    
    # Show current state
    show_current_tanks()
    
    # Fix duplicates
    print("\n" + "=" * 40)
    fixed = consolidate_duplicates()
    
    if fixed:
        print("\n" + "=" * 40)
        print("🎯 AFTER CLEANUP:")
        show_current_tanks()
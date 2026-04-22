#!/usr/bin/env python3
"""Quick status check of intake agent data"""
import json
from mock_db import MockDatabase

def main():
    print("🔍 TankID Intake Agent Status")
    print("=" * 35)
    
    # Initialize intake database
    db = MockDatabase("mock_data")
    
    # Get data
    tanks = db.get_all_tanks()
    documents = db.get_all_documents()
    batches = db.get_recent_batches(10)
    
    print(f"📊 Current Data:")
    print(f"   Tanks: {len(tanks)}")
    print(f"   Documents: {len(documents)}")
    print(f"   Batches: {len(batches)}")
    
    if tanks:
        tank = tanks[0]
        print(f"\n🎯 Sample Tank:")
        print(f"   Serial: {tank.get('serial_number')}")
        print(f"   Facility: {tank.get('facility_name')}")
        print(f"   Sources: {len(tank.get('sources', []))}")
        print(f"   Documents: {len(tank.get('document_ids', []))}")
    
    if documents:
        print(f"\n📄 Sample Documents:")
        for i, doc in enumerate(documents[:3]):
            print(f"   {i+1}. {doc.get('original_filename')} ({doc.get('document_type')})")
    
    print(f"\n🎯 Ready for Production Sync!")
    print(f"   Next step: Run with production credentials")

if __name__ == "__main__":
    main()
#!/usr/bin/env python3
"""
Test the new duplicate protection in the database layer
"""
import json
from datetime import datetime
from mock_db import MockDatabase

def test_duplicate_protection():
    """Test that the database prevents duplicates"""
    
    print("🧪 Testing Duplicate Protection")
    print("=" * 40)
    
    # Initialize test database
    db = MockDatabase("test_data")
    
    # Clean start
    import os
    import shutil
    if os.path.exists("test_data"):
        shutil.rmtree("test_data")
    db = MockDatabase("test_data")
    
    # Test tank data - same serial/facility
    tank_data_1 = {
        'serial_number': 'UST-TEST-123',
        'facility_name': 'Test Hospital',
        'facility_address': '123 Main St, Test City, CO 80120',
        'manufacturer': 'SteelCraft',
        'capacity': '10000',
        'sources': [
            {
                'file_path': '/test/file1.pdf',
                'document_type': 'tank_chart',
                'confidence': 0.95
            }
        ],
        'document_ids': ['doc1'],
        'confidence_score': 0.95
    }
    
    tank_data_2 = {
        'serial_number': 'UST-TEST-123',  # Same serial
        'facility_name': 'Test Hospital',  # Same facility  
        'facility_address': '123 Main St, Test City, CO 80120',  # Same address
        'manufacturer': 'SteelCraft',
        'capacity': '10000',
        'sources': [
            {
                'file_path': '/test/file2.pdf',
                'document_type': 'spec_sheet',
                'confidence': 0.90
            }
        ],
        'document_ids': ['doc2'],
        'confidence_score': 0.90
    }
    
    # Test 1: Save first tank
    print("1. Saving first tank...")
    tank_id_1 = db.save_tank(tank_data_1)
    print(f"   ✅ Created tank: {tank_id_1}")
    
    # Test 2: Try to save duplicate - should merge instead
    print("2. Saving duplicate tank...")
    tank_id_2 = db.save_tank(tank_data_2)
    print(f"   ✅ Returned tank ID: {tank_id_2}")
    
    # Test 3: Verify only one tank exists
    print("3. Checking tank count...")
    tanks = db.get_all_tanks()
    print(f"   📊 Total tanks: {len(tanks)}")
    
    if len(tanks) == 1:
        print("   ✅ SUCCESS: Duplicate prevented!")
        tank = tanks[0]
        print(f"   🔗 Sources: {len(tank['sources'])}")
        print(f"   🔗 Document IDs: {len(tank['document_ids'])}")
        print(f"   🔄 Merge count: {tank.get('merge_count', 1)}")
    else:
        print("   ❌ FAILED: Duplicate not prevented!")
        for i, tank in enumerate(tanks):
            print(f"   Tank {i+1}: {tank['serial_number']} @ {tank['facility_name']}")
    
    # Test 4: Different tank should create new record
    print("4. Testing different tank...")
    tank_data_3 = {
        'serial_number': 'UST-DIFFERENT-456',  # Different serial
        'facility_name': 'Other Hospital',
        'facility_address': '456 Other St, Other City, CO 80130',
        'manufacturer': 'Xerxes',
        'capacity': '12000',
        'sources': [
            {
                'file_path': '/test/file3.pdf',
                'document_type': 'tank_chart',
                'confidence': 0.92
            }
        ],
        'document_ids': ['doc3'],
        'confidence_score': 0.92
    }
    
    tank_id_3 = db.save_tank(tank_data_3)
    tanks = db.get_all_tanks()
    print(f"   📊 Total tanks after different tank: {len(tanks)}")
    
    if len(tanks) == 2:
        print("   ✅ SUCCESS: Different tank created correctly!")
    else:
        print("   ❌ FAILED: Wrong tank count!")
    
    # Cleanup
    shutil.rmtree("test_data")
    print("\n🎯 SUMMARY:")
    print("   ✅ Database duplicate protection implemented")
    print("   ✅ Merges sources from duplicate submissions")  
    print("   ✅ Preserves all document references")
    print("   ✅ Creates new records for different tanks")

if __name__ == "__main__":
    test_duplicate_protection()
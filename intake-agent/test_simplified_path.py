#!/usr/bin/env python3
"""
Test upload with simplified path structure: documents/[facility uuid]/[document name]
"""
import os
import sys

# Set R2 environment variables
R2_CREDENTIALS = {
    'account_id': '76f520916452e2d7df69cf3eb5c6412a',
    'access_key_id': 'c50324924fe9aefd5eeb8ea45b69fa35',  
    'secret_access_key': '40431e78a1c1aea6e5fca5795aa8b8f125261b081a94510521aeb83bf315d7fd',
    'bucket_name': 'tankid-docs'
}

os.environ['R2_ENDPOINT'] = f"https://{R2_CREDENTIALS['account_id']}.r2.cloudflarestorage.com"
os.environ['R2_BUCKET'] = R2_CREDENTIALS['bucket_name']
os.environ['R2_ACCESS_KEY'] = R2_CREDENTIALS['access_key_id']
os.environ['R2_SECRET_KEY'] = R2_CREDENTIALS['secret_access_key']

print("🧪 Testing SIMPLIFIED R2 Path Structure")
print("=" * 50)
print("Target structure: documents/[facility-uuid]/[filename]")
print()

try:
    from storage_r2 import R2StorageManager
    from mock_db import MockDatabase
    
    # Initialize R2 storage
    r2 = R2StorageManager()
    
    # Load mock data
    db = MockDatabase("mock_data")
    tanks = db.get_all_tanks()
    tank = tanks[0]
    sources = tank.get('sources', [])
    
    # Use a different facility UUID to distinguish from previous test
    test_facility_id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    
    print(f"🆔 Using facility ID: {test_facility_id}")
    
    # Upload one test file with simplified structure
    source = sources[2]  # Use 3rd file to avoid duplicates
    file_path = source.get('file_path')
    filename = os.path.basename(file_path)
    doc_type = source.get('document_type', 'other')
    
    print(f"📤 Uploading: {filename}")
    print(f"   Type: {doc_type}")
    
    document_data = {
        'original_filename': filename,
        'document_type': doc_type
    }
    
    # Upload with simplified path structure
    r2_key = r2.upload_document(
        file_path,
        document_data,
        facility_id=test_facility_id,
        batch_id='simplified-test'
    )
    
    if r2_key:
        print(f"   ✅ SUCCESS: {r2_key}")
        
        # Verify it matches the expected simplified structure
        expected_pattern = f"documents/{test_facility_id}/"
        if r2_key.startswith(expected_pattern):
            print(f"   🎯 CORRECT: Uses simplified structure 'documents/[facility-uuid]/[filename]'")
        else:
            print(f"   ❌ WRONG: Does not match expected pattern")
            
        print(f"\n📊 Simplified path verification:")
        print(f"   Expected prefix: {expected_pattern}")
        print(f"   Actual key:      {r2_key}")
        print(f"   ✅ Match: {r2_key.startswith(expected_pattern)}")
        
    else:
        print(f"   ❌ Upload failed")

except Exception as e:
    print(f"💥 Error: {e}")
    import traceback
    traceback.print_exc()
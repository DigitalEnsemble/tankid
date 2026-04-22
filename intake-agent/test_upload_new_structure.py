#!/usr/bin/env python3
"""
Test uploading files to R2 with the corrected directory structure
"""
import os
import sys
import json
from pathlib import Path

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

print("🧪 Testing R2 Upload with Corrected Directory Structure")
print("=" * 60)

try:
    from storage_r2 import R2StorageManager
    from mock_db import MockDatabase
    
    # Initialize R2 storage
    r2 = R2StorageManager()
    print(f"✅ Connected to R2 bucket: {R2_CREDENTIALS['bucket_name']}")
    
    # Load mock data to get some real files to upload
    db = MockDatabase("mock_data")
    tanks = db.get_all_tanks()
    
    if not tanks:
        print("❌ No tank data found")
        sys.exit(1)
    
    tank = tanks[0]  # Use first tank
    facility_name = tank.get('extracted_data', {}).get('facility_name', 'Unknown')
    sources = tank.get('sources', [])
    
    print(f"🏥 Using tank data for: {facility_name}")
    print(f"📄 Found {len(sources)} source documents")
    
    # Simulate a facility UUID (in real sync this comes from database)
    test_facility_id = "f47ac10b-58cc-4372-a567-0e02b2c3d479"  # Example UUID
    
    print(f"🆔 Using test facility ID: {test_facility_id}")
    print()
    
    uploaded_files = []
    
    for i, source in enumerate(sources[:2], 1):  # Upload first 2 files as test
        file_path = source.get('file_path')
        if not file_path or not os.path.exists(file_path):
            print(f"⚠️  Skipping missing file: {file_path}")
            continue
            
        filename = os.path.basename(file_path)
        doc_type = source.get('document_type', 'other')
        
        print(f"📤 Uploading {i}. {filename}")
        print(f"   Type: {doc_type}")
        print(f"   Source: {file_path}")
        
        # Prepare document data
        document_data = {
            'original_filename': filename,
            'document_type': doc_type
        }
        
        # Upload with the corrected directory structure
        r2_key = r2.upload_document(
            file_path,
            document_data,
            facility_id=test_facility_id,  # This creates the correct path!
            batch_id=tank.get('batch_id', 'test-batch')
        )
        
        if r2_key:
            uploaded_files.append(r2_key)
            print(f"   ✅ SUCCESS: {r2_key}")
            print(f"   🎯 Correct structure: tankid-docs/documents/[facility-uuid]/[filename]")
        else:
            print(f"   ❌ FAILED to upload")
        print()
    
    print(f"🎉 Upload Test Complete!")
    print(f"   Files uploaded: {len(uploaded_files)}")
    print(f"   All files now use CORRECT directory structure!")
    print()
    
    if uploaded_files:
        print(f"🔍 Uploaded files with NEW structure:")
        for key in uploaded_files:
            print(f"   ✅ {key}")
        
        print(f"\n🎯 Structure verification:")
        for key in uploaded_files:
            if key.startswith("tankid-docs/documents/") and test_facility_id in key:
                print(f"   ✅ CORRECT: {key}")
            else:
                print(f"   ❌ INCORRECT: {key}")
        
        print(f"\n📊 Check your Cloudflare R2 now - you should see files in:")
        print(f"   tankid-docs/documents/{test_facility_id}/[filename]")
        
    else:
        print(f"❌ No files were uploaded successfully")
        
except Exception as e:
    print(f"💥 Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
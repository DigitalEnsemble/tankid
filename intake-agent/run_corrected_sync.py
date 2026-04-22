#!/usr/bin/env python3
"""
Run production sync with corrected R2 directory structure
"""
import os
import sys

# Set the correct R2 environment variables for the sync
R2_CREDENTIALS = {
    'account_id': '76f520916452e2d7df69cf3eb5c6412a',
    'access_key_id': 'c50324924fe9aefd5eeb8ea45b69fa35',  
    'secret_access_key': '40431e78a1c1aea6e5fca5795aa8b8f125261b081a94510521aeb83bf315d7fd',
    'bucket_name': 'tankid-docs'
}

# Set environment variables that storage_r2.py expects
os.environ['R2_ENDPOINT'] = f"https://{R2_CREDENTIALS['account_id']}.r2.cloudflarestorage.com"
os.environ['R2_BUCKET'] = R2_CREDENTIALS['bucket_name']
os.environ['R2_ACCESS_KEY'] = R2_CREDENTIALS['access_key_id']
os.environ['R2_SECRET_KEY'] = R2_CREDENTIALS['secret_access_key']

print("🚀 Running TankID Production Sync with Corrected R2 Directory Structure")
print("=" * 70)
print(f"Target structure: tankid-docs/documents/[facility-uuid]/[filename]")
print(f"R2 Bucket: {R2_CREDENTIALS['bucket_name']}")
print()

try:
    from production_sync import ProductionSyncManager
    
    # Run the actual sync (not dry run)
    print("📤 Starting REAL production sync...")
    sync_manager = ProductionSyncManager(dry_run=False)
    results = sync_manager.sync_all_data()
    
    print(f"\n🎉 SYNC RESULTS:")
    print(f"   Success: {results.get('success', False)}")
    print(f"   Tanks synced: {results.get('tanks_synced', 0)}")
    print(f"   Documents uploaded: {results.get('documents_uploaded', 0)}")
    print(f"   Errors: {len(results.get('errors', []))}")
    print(f"   Start time: {results.get('start_time')}")
    print(f"   End time: {results.get('end_time')}")
    
    if results.get('errors'):
        print(f"\n❌ ERRORS:")
        for error in results['errors']:
            print(f"   {error}")
    
    if results.get('success'):
        print(f"\n✅ SUCCESS! Files are now uploaded with the correct directory structure:")
        print(f"   tankid-docs/documents/[facility-uuid]/[filename]")
        print(f"\n🔍 You should now see files in the NEW structure in your Cloudflare R2!")
    else:
        print(f"\n❌ SYNC FAILED - Check errors above")
        
except Exception as e:
    print(f"💥 Fatal error during sync: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
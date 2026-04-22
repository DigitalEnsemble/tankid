#!/usr/bin/env python3
"""
Script to show current R2 structure and upload files with corrected directory structure
"""
import os
import sys
import json
import boto3
import logging
from datetime import datetime
from pathlib import Path

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# R2 credentials from test_run.py
R2_CREDENTIALS = {
    'account_id': '76f520916452e2d7df69cf3eb5c6412a',
    'access_key_id': 'c50324924fe9aefd5eeb8ea45b69fa35',  
    'secret_access_key': '40431e78a1c1aea6e5fca5795aa8b8f125261b081a94510521aeb83bf315d7fd',
    'bucket_name': 'tankid-docs',
    'public_url': 'https://docs.tankid.io'
}

def create_r2_client():
    """Create R2 client with proper credentials"""
    endpoint_url = f"https://{R2_CREDENTIALS['account_id']}.r2.cloudflarestorage.com"
    
    client = boto3.client(
        's3',
        endpoint_url=endpoint_url,
        aws_access_key_id=R2_CREDENTIALS['access_key_id'],
        aws_secret_access_key=R2_CREDENTIALS['secret_access_key'],
        region_name='auto'
    )
    
    return client

def list_current_structure(client, bucket):
    """Show current file structure in R2"""
    print("📊 Current R2 File Structure:")
    print("=" * 50)
    
    try:
        # List all objects
        paginator = client.get_paginator('list_objects_v2')
        page_iterator = paginator.paginate(Bucket=bucket)
        
        old_structure_files = []
        new_structure_files = []
        other_files = []
        
        for page in page_iterator:
            if 'Contents' in page:
                for obj in page['Contents']:
                    key = obj['Key']
                    size = obj['Size']
                    modified = obj['LastModified']
                    
                    if key.startswith('documents/'):
                        if key.startswith('documents/2026/') or '/2026/' in key:
                            old_structure_files.append((key, size, modified))
                        elif key.startswith('documents/') and len(key.split('/')) >= 3:
                            # Could be new structure: documents/[uuid]/[filename]
                            parts = key.split('/')
                            if len(parts[1]) > 20:  # UUID-like
                                new_structure_files.append((key, size, modified))
                            else:
                                other_files.append((key, size, modified))
                        else:
                            other_files.append((key, size, modified))
                    elif key.startswith('tankid-docs/documents/'):
                        new_structure_files.append((key, size, modified))
                    else:
                        other_files.append((key, size, modified))
        
        print(f"🔴 OLD STRUCTURE (documents/YYYY/MM/...): {len(old_structure_files)} files")
        for key, size, modified in old_structure_files[:5]:  # Show first 5
            print(f"   {key} ({size:,} bytes)")
        if len(old_structure_files) > 5:
            print(f"   ... and {len(old_structure_files) - 5} more")
        
        print(f"\n🟢 NEW STRUCTURE (tankid-docs/documents/[uuid]/...): {len(new_structure_files)} files")
        for key, size, modified in new_structure_files[:5]:
            print(f"   {key} ({size:,} bytes)")
        if len(new_structure_files) > 5:
            print(f"   ... and {len(new_structure_files) - 5} more")
            
        print(f"\n⚪ OTHER FILES: {len(other_files)} files")
        for key, size, modified in other_files[:3]:
            print(f"   {key} ({size:,} bytes)")
        if len(other_files) > 3:
            print(f"   ... and {len(other_files) - 3} more")
            
        return {
            'old_structure': len(old_structure_files),
            'new_structure': len(new_structure_files),
            'other': len(other_files),
            'total': len(old_structure_files) + len(new_structure_files) + len(other_files)
        }
        
    except Exception as e:
        print(f"❌ Error listing R2 contents: {e}")
        return None

def run_production_sync_with_new_structure():
    """Run a production sync to upload files with the new directory structure"""
    print("\n🚀 Running Production Sync with New Directory Structure...")
    print("=" * 50)
    
    try:
        # Set the correct environment variables for storage_r2.py
        os.environ['R2_ENDPOINT'] = f"https://{R2_CREDENTIALS['account_id']}.r2.cloudflarestorage.com"
        os.environ['R2_BUCKET'] = R2_CREDENTIALS['bucket_name']
        os.environ['R2_ACCESS_KEY'] = R2_CREDENTIALS['access_key_id']
        os.environ['R2_SECRET_KEY'] = R2_CREDENTIALS['secret_access_key']
        
        # Import and run production sync
        from production_sync import ProductionSyncManager
        
        # Run sync in dry-run mode first
        print("🧪 Running DRY RUN to preview changes...")
        sync_manager = ProductionSyncManager(dry_run=True)
        dry_results = sync_manager.sync_all_data()
        
        print(f"\n📊 DRY RUN RESULTS:")
        print(f"   Tanks to sync: {dry_results.get('tanks_synced', 0)}")
        print(f"   Documents to upload: {dry_results.get('documents_uploaded', 0)}")
        print(f"   Errors: {len(dry_results.get('errors', []))}")
        
        if dry_results.get('errors'):
            print("\n❌ Errors found in dry run:")
            for error in dry_results['errors'][:3]:
                print(f"   {error}")
        
        # Ask user if they want to proceed with actual sync
        print(f"\n🤔 Would you like to run the ACTUAL sync to upload files with the new structure?")
        print(f"   This will upload documents to: tankid-docs/documents/[facility-uuid]/[filename]")
        
        return dry_results
        
    except Exception as e:
        print(f"❌ Error running production sync: {e}")
        return None

def main():
    """Main function"""
    print("🔍 TankID R2 Directory Structure Analysis")
    print("=" * 50)
    
    try:
        # Create R2 client
        client = create_r2_client()
        bucket = R2_CREDENTIALS['bucket_name']
        
        print(f"Connected to R2 bucket: {bucket}")
        print(f"Endpoint: https://{R2_CREDENTIALS['account_id']}.r2.cloudflarestorage.com")
        
        # Show current structure
        structure_stats = list_current_structure(client, bucket)
        
        if structure_stats:
            print(f"\n📈 SUMMARY:")
            print(f"   Old structure files: {structure_stats['old_structure']}")
            print(f"   New structure files: {structure_stats['new_structure']}")
            print(f"   Total files: {structure_stats['total']}")
            
            if structure_stats['old_structure'] > 0 and structure_stats['new_structure'] == 0:
                print(f"\n🎯 DIAGNOSIS: All files are in the OLD structure")
                print(f"   ❌ Current: documents/YYYY/MM/[file]")
                print(f"   ✅ Needed:  tankid-docs/documents/[facility-uuid]/[file]")
                
                # Run production sync
                sync_results = run_production_sync_with_new_structure()
                
        else:
            print("❌ Could not analyze R2 structure")
            
    except Exception as e:
        print(f"💥 Fatal error: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
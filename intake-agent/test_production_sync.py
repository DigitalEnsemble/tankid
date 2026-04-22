#!/usr/bin/env python3
"""
Test production sync status and dry run
"""
import json
from production_sync import ProductionSyncManager

def test_sync_status():
    """Test sync status without production connections"""
    print("🔍 Testing sync status...")
    
    try:
        sync_manager = ProductionSyncManager(dry_run=True)
        status = sync_manager.get_sync_status()
        
        print("📊 Sync Status:")
        print(json.dumps(status, indent=2, default=str))
        
        return status
        
    except Exception as e:
        print(f"❌ Status test failed: {e}")
        return None

def test_dry_run():
    """Test dry run sync"""
    print("\n🧪 Testing dry run sync...")
    
    try:
        sync_manager = ProductionSyncManager(dry_run=True)
        results = sync_manager.sync_all_data()
        
        print("🧪 Dry Run Results:")
        print(json.dumps(results, indent=2, default=str))
        
        return results
        
    except Exception as e:
        print(f"❌ Dry run test failed: {e}")
        return None

if __name__ == "__main__":
    print("🚀 TankID Production Sync Test")
    print("=" * 40)
    
    # Test status
    status = test_sync_status()
    
    if status:
        # Test dry run
        results = test_dry_run()
        
        if results and results.get('success', False):
            print("\n✅ All tests passed! Ready for production sync.")
        else:
            print("\n❌ Dry run failed. Check configuration.")
    else:
        print("\n❌ Status check failed. Check intake agent.")
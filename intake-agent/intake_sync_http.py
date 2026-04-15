#!/usr/bin/env python3
"""
HTTP-Based Intake Sync for TankID
Syncs local intake data to production via tankid-api HTTP endpoint
"""

import json
import requests
import argparse
from datetime import datetime
import logging
import os

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s:%(name)s:%(message)s')
logger = logging.getLogger(__name__)

class HTTPIntakeSyncManager:
    def __init__(self, api_url="https://tankid-api.fly.dev", dry_run=False):
        self.api_url = api_url.rstrip('/')
        self.dry_run = dry_run
        self.sync_endpoint = f"{self.api_url}/api/intake-sync"
    
    def load_local_data(self):
        """Load tanks and documents from local JSON files"""
        try:
            with open('mock_data/tanks.json', 'r') as f:
                tanks = json.load(f)
            
            with open('mock_data/documents.json', 'r') as f:
                documents = json.load(f)
            
            logger.info(f"📊 Loaded {len(tanks)} tanks, {len(documents)} documents")
            return tanks, documents
        
        except FileNotFoundError as e:
            logger.error(f"❌ Data file not found: {e}")
            return [], []
        except json.JSONDecodeError as e:
            logger.error(f"❌ Invalid JSON in data files: {e}")
            return [], []
    
    def sync_to_production(self):
        """Sync local data to production via HTTP API"""
        tanks, documents = self.load_local_data()
        
        if not tanks:
            logger.info("📭 No tanks to sync")
            return {"success": True, "message": "No data to sync"}
        
        # Prepare payload
        payload = {
            "tanks": tanks,
            "documents": documents,
            "dry_run": self.dry_run
        }
        
        logger.info(f"🚀 Syncing to {self.sync_endpoint}")
        logger.info(f"📦 Payload: {len(tanks)} tanks, dry_run={self.dry_run}")
        
        try:
            # Make HTTP request to sync endpoint
            headers = {'Content-Type': 'application/json'}
            response = requests.post(
                self.sync_endpoint,
                json=payload,
                headers=headers,
                timeout=60
            )
            
            response.raise_for_status()
            result = response.json()
            
            logger.info("✅ Sync completed successfully!")
            logger.info(f"📊 Results: {result}")
            
            return result
            
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ HTTP request failed: {e}")
            if hasattr(e, 'response') and e.response:
                try:
                    error_detail = e.response.json()
                    logger.error(f"📄 Error response: {error_detail}")
                except:
                    logger.error(f"📄 Error response: {e.response.text}")
            return {"success": False, "error": str(e)}
        
        except Exception as e:
            logger.error(f"❌ Sync failed: {e}")
            return {"success": False, "error": str(e)}

def main():
    parser = argparse.ArgumentParser(description='HTTP-based TankID intake sync')
    parser.add_argument('--dry-run', action='store_true', 
                       help='Test sync without making actual changes')
    parser.add_argument('--api-url', default='https://tankid-api.fly.dev',
                       help='TankID API base URL')
    
    args = parser.parse_args()
    
    if args.dry_run:
        logger.info("🧪 DRY RUN MODE - No actual production changes will be made")
    
    sync_manager = HTTPIntakeSyncManager(api_url=args.api_url, dry_run=args.dry_run)
    result = sync_manager.sync_to_production()
    
    if result.get("success"):
        logger.info("🎉 Production sync completed!")
        return 0
    else:
        logger.error("❌ Production sync failed")
        return 1

if __name__ == "__main__":
    exit(main())
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
import base64

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s:%(name)s:%(message)s')
logger = logging.getLogger(__name__)

class HTTPIntakeSyncManager:
    def __init__(self, api_url="https://tankid-api.fly.dev", dry_run=False):
        self.api_url = api_url.rstrip('/')
        self.dry_run = dry_run
        self.sync_endpoint = f"{self.api_url}/api/intake-sync"
    
    def read_file_as_base64(self, file_path):
        """Read local file and convert to base64"""
        try:
            # Convert local:// protocol to actual path
            if file_path.startswith('local://storage/'):
                actual_path = file_path.replace('local://storage/', 'local_storage/')
            elif file_path.startswith('local://storage/converted/'):
                actual_path = file_path.replace('local://storage/converted/', 'local_storage/converted/')
            else:
                actual_path = file_path
            
            if os.path.exists(actual_path):
                with open(actual_path, 'rb') as f:
                    file_content = f.read()
                    return base64.b64encode(file_content).decode('utf-8')
            else:
                logger.error(f"❌ File not found: {actual_path}")
                return None
        except Exception as e:
            logger.error(f"❌ Error reading file {file_path}: {e}")
            return None
    
    def load_local_data(self):
        """Load tanks and documents from local JSON files"""
        try:
            with open('mock_data/tanks.json', 'r') as f:
                tanks = json.load(f)
            
            with open('mock_data/documents.json', 'r') as f:
                documents = json.load(f)
            
            # Convert file paths to base64 content for each tank
            for tank in tanks:
                if 'document_ids' in tank:
                    tank_documents = []
                    for doc_path in tank['document_ids']:
                        base64_content = self.read_file_as_base64(doc_path)
                        if base64_content:
                            filename = os.path.basename(doc_path)
                            # Clean up timestamp prefix
                            clean_filename = filename.split('_', 1)[-1] if '_' in filename and filename.startswith('2026-') else filename
                            tank_documents.append({
                                'filename': clean_filename,
                                'content': base64_content,
                                'original_path': doc_path,
                                'file_size': len(base64.b64decode(base64_content)),
                                'mime_type': 'application/pdf'
                            })
                            logger.info(f"📄 Converted to base64: {clean_filename} ({len(base64.b64decode(base64_content))} bytes)")
                        else:
                            logger.warning(f"⚠️ Skipping missing file: {doc_path}")
                    tank['documents_content'] = tank_documents
                    # Remove the paths since we now have content
                    del tank['document_ids']
            
            logger.info(f"📊 Loaded {len(tanks)} tanks with {sum(len(tank.get('documents_content', [])) for tank in tanks)} documents converted to base64")
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
    
    print(f"🚀 TankID Intake Sync - API: {args.api_url}")
    print(f"🧪 Dry Run: {args.dry_run}")
    print("=" * 60)
    
    sync_manager = HTTPIntakeSyncManager(
        api_url=args.api_url,
        dry_run=args.dry_run
    )
    
    result = sync_manager.sync_to_production()
    
    if result.get('success'):
        print("\n✅ Sync completed successfully!")
    else:
        print(f"\n❌ Sync failed: {result.get('error')}")
        return 1
    
    return 0

if __name__ == '__main__':
    exit(main())
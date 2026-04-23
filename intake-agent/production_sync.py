#!/usr/bin/env python3
"""
TankID Production Sync - Intake Agent to Production Integration
Syncs facilities, tanks, and documents from intake agent to production systems
"""
import os
import json
import logging
from typing import Dict, List, Optional
from datetime import datetime
from pathlib import Path

from mock_db import MockDatabase
from db_production import ProductionDatabaseManager
from storage_r2 import R2StorageManager
from msg_converter import MSGtoPDFConverter

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ProductionSyncManager:
    """Manages sync between intake agent and production systems"""
    
    def __init__(self, dry_run: bool = False):
        self.dry_run = dry_run
        
        # Initialize components
        self.intake_db = MockDatabase("mock_data")
        self.msg_converter = MSGtoPDFConverter("converted_msg_pdfs")
        
        if not dry_run:
            self.prod_db = ProductionDatabaseManager()
            self.r2_storage = R2StorageManager()
        else:
            self.prod_db = None
            self.r2_storage = None
            logger.info("🧪 DRY RUN MODE - No actual production changes will be made")
    
    def sync_all_data(self) -> Dict:
        """Sync all intake data to production"""
        logger.info("🚀 Starting full production sync...")
        
        results = {
            'start_time': datetime.now().isoformat(),
            'facilities_synced': 0,
            'tanks_synced': 0,
            'documents_uploaded': 0,
            'unique_documents_found': 0,
            'msg_files_converted': 0,
            'errors': [],
            'dry_run': self.dry_run
        }
        
        try:
            # Step 1: Sync tanks (which includes facilities)
            tanks = self.intake_db.get_all_tanks()
            logger.info(f"📊 Found {len(tanks)} tanks to sync")
            
            for tank in tanks:
                try:
                    if self.sync_tank_with_documents(tank):
                        results['tanks_synced'] += 1
                except Exception as e:
                    error_msg = f"Failed to sync tank {tank.get('id', 'unknown')}: {e}"
                    logger.error(error_msg)
                    results['errors'].append(error_msg)
            
            # Step 2: Sync standalone documents (if any)
            documents = self.intake_db.get_all_documents()
            logger.info(f"📊 Found {len(documents)} documents total")
            
            # Count documents already handled by tank sync
            handled_docs = set()
            for tank in tanks:
                handled_docs.update(tank.get('document_ids', []))
            
            standalone_docs = [doc for doc in documents if doc['id'] not in handled_docs]
            logger.info(f"📊 Found {len(standalone_docs)} standalone documents")
            
            for doc in standalone_docs:
                try:
                    if self.sync_document(doc):
                        results['documents_uploaded'] += 1
                except Exception as e:
                    error_msg = f"Failed to sync document {doc.get('id', 'unknown')}: {e}"
                    logger.error(error_msg)
                    results['errors'].append(error_msg)
            
            results['end_time'] = datetime.now().isoformat()
            results['success'] = len(results['errors']) == 0
            
            logger.info(f"🎉 Sync completed! Tanks: {results['tanks_synced']}, Docs: {results['documents_uploaded']}, Errors: {len(results['errors'])}")
            
            return results
            
        except Exception as e:
            results['fatal_error'] = str(e)
            results['success'] = False
            logger.error(f"💥 Fatal sync error: {e}")
            return results
        
        finally:
            if self.prod_db and not self.dry_run:
                self.prod_db.close()
    
    def deduplicate_documents(self, sources: List[Dict]) -> List[Dict]:
        """Deduplicate documents by extracting unique filenames"""
        unique_docs = {}
        
        for source in sources:
            file_path = source.get('file_path', '')
            if not file_path:
                continue
            
            # Extract base filename (remove timestamp prefix if present)
            filename = os.path.basename(file_path)
            
            # Remove timestamp prefix like "2026-04-14T23-25-26.576Z_"
            if filename.startswith('2026-') and '_' in filename:
                # Split and rejoin after the first underscore
                parts = filename.split('_', 1)
                if len(parts) > 1:
                    clean_filename = parts[1]
                else:
                    clean_filename = filename
            else:
                clean_filename = filename
            
            # Use clean filename as deduplication key
            if clean_filename not in unique_docs:
                unique_docs[clean_filename] = source
                logger.info(f"📄 Unique document: {clean_filename}")
            else:
                logger.info(f"🔄 Skipping duplicate: {clean_filename}")
        
        deduped_sources = list(unique_docs.values())
        logger.info(f"📊 Deduplication: {len(sources)} → {len(deduped_sources)} unique documents")
        
        return deduped_sources
    
    def convert_msg_files(self, sources: List[Dict]) -> List[Dict]:
        """Convert .msg files to PDF and update sources"""
        converted_sources = []
        
        for source in sources:
            file_path = source.get('file_path', '')
            
            if file_path.lower().endswith('.msg'):
                logger.info(f"📧 Converting .msg file: {os.path.basename(file_path)}")
                
                if self.dry_run:
                    # In dry run, simulate conversion
                    converted_path = file_path.replace('.msg', '_EMAIL.pdf')
                    logger.info(f"🧪 DRY RUN: Would convert {os.path.basename(file_path)} to PDF")
                else:
                    # Actually convert the file
                    converted_path = self.msg_converter.convert_with_preserved_name(file_path)
                    
                    if not converted_path:
                        logger.error(f"❌ Failed to convert {file_path}")
                        continue
                
                # Update source with converted file
                converted_source = source.copy()
                converted_source['file_path'] = converted_path
                converted_source['original_filename'] = os.path.basename(converted_path)
                converted_source['document_type'] = 'installation_permit'  # .msg files are typically permits
                converted_sources.append(converted_source)
                
            else:
                # Keep non-.msg files as-is
                converted_sources.append(source)
        
        return converted_sources
    
    def sync_tank_with_documents(self, tank_data: Dict) -> bool:
        """Sync a tank and its associated documents with deduplication and .msg conversion"""
        try:
            tank_serial = tank_data.get('serial_number') or ''
            if not tank_serial or tank_serial == 'Unknown':
                logger.warning(f"⚠️ Skipping tank with no serial number")
                return False
            logger.info(f"🔄 Syncing tank: {tank_serial}")
            
            # Step 1: Process and deduplicate documents
            sources = tank_data.get('sources', [])
            logger.info(f"📂 Processing {len(sources)} source documents...")
            
            # Convert .msg files first
            sources = self.convert_msg_files(sources)
            
            # Deduplicate documents
            unique_sources = self.deduplicate_documents(sources)
            
            if self.dry_run:
                logger.info(f"🧪 DRY RUN: Would create facility for {tank_data.get('facility_name')}")
                logger.info(f"🧪 DRY RUN: Would sync tank {tank_serial} to production")
                logger.info(f"🧪 DRY RUN: Would upload {len(unique_sources)} unique documents to R2")
                
                # Show what documents would be uploaded
                for i, source in enumerate(unique_sources, 1):
                    filename = os.path.basename(source.get('file_path', 'unknown'))
                    doc_type = source.get('document_type', 'other')
                    logger.info(f"🧪    {i}. {filename} ({doc_type})")
                
                return True
            
            # Step 2: Sync tank to production database (this creates facility too)
            production_tank_id, facility_id = self.prod_db.sync_tank_to_production(tank_data)
            
            # Step 3: Upload and link unique documents
            uploaded_r2_keys = []
            
            for source in unique_sources:
                try:
                    file_path = source.get('file_path')
                    if file_path and os.path.exists(file_path):
                        # Prepare document metadata
                        document_data = {
                            'original_filename': os.path.basename(file_path),
                            'document_type': source.get('document_type', 'other'),
                            'confidence': source.get('confidence', 0.0)
                        }
                        
                        # Upload to R2 with facility_id for correct directory structure
                        r2_key = self.r2_storage.upload_document(
                            file_path, 
                            document_data, 
                            facility_id,  # Use facility_id for correct directory structure
                            tank_data.get('batch_id')
                        )
                        
                        if r2_key:
                            # Sync document metadata to production
                            doc_id = self.prod_db.sync_document_metadata(
                                document_data, r2_key,
                                facility_id=facility_id,
                                tank_id=production_tank_id,
                            )
                            uploaded_r2_keys.append(r2_key)
                            logger.info(f"📄 Synced document: {document_data['original_filename']}")
                        else:
                            logger.warning(f"⚠️ Failed to upload: {file_path}")
                    else:
                        logger.warning(f"⚠️ File not found: {file_path}")
                        
                except Exception as e:
                    logger.error(f"Error syncing document {source.get('file_path', 'unknown')}: {e}")
            
            logger.info(f"✅ Tank sync completed: {tank_serial} → {production_tank_id}")
            logger.info(f"📁 Uploaded {len(uploaded_r2_keys)} unique documents")
            return True
            
        except Exception as e:
            logger.error(f"Failed to sync tank {tank_data.get('serial_number', 'unknown')}: {e}")
            return False
    
    def sync_document(self, doc_data: Dict) -> bool:
        """Sync a standalone document"""
        try:
            logger.info(f"📄 Syncing document: {doc_data.get('original_filename', 'Unknown')}")
            
            if self.dry_run:
                logger.info(f"🧪 DRY RUN: Would upload document to R2")
                return True
            
            file_path = doc_data.get('file_path')
            if not file_path or not os.path.exists(file_path):
                logger.warning(f"⚠️ Document file not found: {file_path}")
                return False
            
            # Prepare document metadata
            document_data = {
                'original_filename': doc_data.get('original_filename'),
                'document_type': doc_data.get('document_type', 'other')
            }
            
            # For standalone documents, we need a facility_id. 
            # This is a limitation - standalone docs should ideally be associated with a facility
            # For now, use a default facility or create one from document metadata
            facility_id = None  # Will use the 'pending' fallback structure
            
            # Upload to R2 (will go to documents/pending/ without facility_id)
            r2_key = self.r2_storage.upload_document(
                file_path,
                document_data,
                facility_id,  # None = will use pending structure
                doc_data.get('batch_id')
            )
            
            if r2_key:
                # Sync metadata to production
                doc_id = self.prod_db.sync_document_metadata(document_data, r2_key)
                logger.info(f"✅ Document synced: {document_data['original_filename']}")
                return True
            else:
                logger.error(f"❌ Failed to upload document: {file_path}")
                return False
                
        except Exception as e:
            logger.error(f"Error syncing document: {e}")
            return False
    
    def get_sync_status(self) -> Dict:
        """Get current sync status and statistics"""
        try:
            # Get intake data counts
            tanks = self.intake_db.get_all_tanks()
            documents = self.intake_db.get_all_documents()
            batches = self.intake_db.get_recent_batches(50)
            
            intake_stats = {
                'tanks': len(tanks),
                'documents': len(documents),
                'batches': len(batches),
                'latest_batch': batches[0]['created_at'] if batches else None
            }
            
            # Get production stats (if not dry run)
            prod_stats = None
            r2_stats = None
            
            if not self.dry_run and self.prod_db:
                try:
                    # Query production tank count
                    tank_count = self.prod_db.execute_query(
                        "SELECT COUNT(*) FROM tanks", 
                        fetch=True
                    )[0][0]
                    
                    # Query production document count (updated for new directory structure)
                    doc_count = self.prod_db.execute_query(
                        "SELECT COUNT(*) FROM tank_documents WHERE storage_key LIKE 'documents/%'",
                        fetch=True
                    )[0][0]
                    
                    prod_stats = {
                        'tanks': tank_count,
                        'documents': doc_count
                    }
                    
                except Exception as e:
                    prod_stats = {'error': str(e)}
            
            if not self.dry_run and self.r2_storage:
                try:
                    # Get R2 documents (updated for new directory structure)
                    r2_objects = self.r2_storage.list_objects("documents/", 1000)
                    r2_stats = {
                        'documents': len(r2_objects),
                        'total_size': sum(obj.get('size', 0) for obj in r2_objects)
                    }
                except Exception as e:
                    r2_stats = {'error': str(e)}
            
            return {
                'timestamp': datetime.now().isoformat(),
                'intake_agent': intake_stats,
                'production_database': prod_stats,
                'r2_storage': r2_stats,
                'dry_run_mode': self.dry_run
            }
            
        except Exception as e:
            return {
                'timestamp': datetime.now().isoformat(),
                'error': str(e)
            }

def main():
    """Main function for command-line usage"""
    import argparse
    
    parser = argparse.ArgumentParser(description='TankID Production Sync')
    parser.add_argument('--dry-run', action='store_true', 
                        help='Preview sync without making changes')
    parser.add_argument('--status', action='store_true',
                        help='Show sync status and statistics')
    
    args = parser.parse_args()
    
    if args.status:
        # Show status only
        sync_manager = ProductionSyncManager(dry_run=True)
        status = sync_manager.get_sync_status()
        print(json.dumps(status, indent=2, default=str))
        return
    
    # Run sync
    sync_manager = ProductionSyncManager(dry_run=args.dry_run)
    results = sync_manager.sync_all_data()
    
    print(json.dumps(results, indent=2, default=str))
    
    if not results.get('success', False):
        exit(1)

if __name__ == "__main__":
    main()
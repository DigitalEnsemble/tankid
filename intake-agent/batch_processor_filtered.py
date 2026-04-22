"""
TankID Batch Processor - Enhanced with File Filtering
Coordinates extraction, merging, storage, and database operations
NOW WITH: Duplicate detection, email filtering, and content analysis
"""

import os
import json
import logging
import shutil
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
from pathlib import Path
from datetime import datetime
import uuid

from extractor_test import DocumentExtractor, ExtractionResult  # Using test extractor for development
from merger import TankMerger, MergedTank
from storage_local import StorageManager  # Using local storage for development
from db_local import DatabaseManager  # Using local JSON storage for development
from file_filter import TankIDFileFilter, FileInfo  # NEW: Advanced file filtering

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class ProcessingResult:
    """Result of processing a batch of documents"""
    batch_id: str
    processed_files: List[str]
    excluded_files: List[str]  # NEW: Track excluded files
    exclusion_reasons: Dict[str, str]  # NEW: Reasons for exclusion
    tanks_found: int
    tanks_requiring_review: int
    tanks_auto_confirmed: int
    errors: List[str]
    processing_time_seconds: float
    filter_summary: Dict  # NEW: File filter statistics
    
class BatchProcessor:
    """Orchestrates end-to-end document processing with advanced filtering"""
    
    def __init__(self):
        self.extractor = DocumentExtractor()
        self.merger = TankMerger()
        self.storage = StorageManager()
        self.db = DatabaseManager()
        self.file_filter = TankIDFileFilter()  # NEW: File filter
        
        # Processing thresholds
        self.auto_confirm_threshold = 0.85
        self.min_required_fields = {'serial_number', 'facility_address', 'facility_state', 'manufacturer'}
        
        # File handling - Now managed by file_filter
        self.supported_extensions = {'.pdf', '.jpg', '.jpeg', '.png', '.msg', '.txt'}  # Will be filtered
        
    def process_batch(self, inbox_path: str, batch_settle_seconds: int = 120) -> ProcessingResult:
        """
        Process all files in the inbox directory with advanced filtering
        
        Args:
            inbox_path: Path to the inbox directory
            batch_settle_seconds: How long to wait for batch to settle
            
        Returns:
            ProcessingResult with summary of processing and filtering
        """
        start_time = datetime.now()
        batch_id = str(uuid.uuid4())
        
        logger.info(f"Starting filtered batch processing: {batch_id}")
        
        try:
            # Find all files in inbox
            all_files = self._find_all_files(inbox_path)
            if not all_files:
                logger.info("No files found in inbox")
                return ProcessingResult(
                    batch_id=batch_id,
                    processed_files=[],
                    excluded_files=[],
                    exclusion_reasons={},
                    tanks_found=0,
                    tanks_requiring_review=0,
                    tanks_auto_confirmed=0,
                    errors=[],
                    processing_time_seconds=0.0,
                    filter_summary={'total_files': 0, 'approved_files': 0, 'excluded_files': 0}
                )
            
            logger.info(f"Found {len(all_files)} total files in inbox")
            
            # ADVANCED FILTERING: Remove duplicates, emails, conversations
            approved_files, file_infos = self.file_filter.filter_files(all_files, min_confidence=0.5)
            
            # Track exclusions
            excluded_files = []
            exclusion_reasons = {}
            for file_info in file_infos:
                if file_info.confidence_score < 0.5:
                    excluded_files.append(file_info.path)
                    exclusion_reasons[file_info.name] = self.file_filter._get_exclusion_reason(file_info)
            
            filter_summary = self.file_filter.get_filter_summary(file_infos)
            
            if not approved_files:
                logger.info("No files passed filtering criteria")
                return ProcessingResult(
                    batch_id=batch_id,
                    processed_files=[],
                    excluded_files=excluded_files,
                    exclusion_reasons=exclusion_reasons,
                    tanks_found=0,
                    tanks_requiring_review=0,
                    tanks_auto_confirmed=0,
                    errors=[],
                    processing_time_seconds=(datetime.now() - start_time).total_seconds(),
                    filter_summary=filter_summary
                )
            
            logger.info(f"📋 FILTER RESULTS:")
            logger.info(f"   Total files found: {len(all_files)}")
            logger.info(f"   ✅ Approved for processing: {len(approved_files)}")
            logger.info(f"   ❌ Excluded: {len(excluded_files)}")
            logger.info(f"   📊 Approval rate: {filter_summary['approval_rate']*100:.1f}%")
            
            # Extract data from approved files only
            extraction_results = self._extract_batch(approved_files)
            
            # Merge documents by tank
            merged_tanks = self._merge_tanks(extraction_results)
            
            # Store documents and create pending records
            processing_result = self._store_and_create_pending(
                batch_id, approved_files, extraction_results, merged_tanks
            )
            
            # Add filtering information to result
            processing_result.excluded_files = excluded_files
            processing_result.exclusion_reasons = exclusion_reasons
            processing_result.filter_summary = filter_summary
            
            # Move processed files to archive (approved files only)
            self._archive_files(approved_files, inbox_path, batch_id)
            
            # Move excluded files to a separate directory for review
            self._quarantine_excluded_files(excluded_files, inbox_path, batch_id)
            
            # Calculate processing time
            processing_result.processing_time_seconds = (
                datetime.now() - start_time
            ).total_seconds()
            
            logger.info(f"Batch processing complete: {batch_id}")
            logger.info(f"Tanks found: {processing_result.tanks_found}")
            logger.info(f"Auto-confirmed: {processing_result.tanks_auto_confirmed}")
            logger.info(f"Requiring review: {processing_result.tanks_requiring_review}")
            
            return processing_result
            
        except Exception as e:
            logger.error(f"Batch processing failed: {str(e)}")
            return ProcessingResult(
                batch_id=batch_id,
                processed_files=[],
                excluded_files=[],
                exclusion_reasons={},
                tanks_found=0,
                tanks_requiring_review=0,
                tanks_auto_confirmed=0,
                errors=[str(e)],
                processing_time_seconds=(datetime.now() - start_time).total_seconds(),
                filter_summary={'total_files': len(all_files) if 'all_files' in locals() else 0, 
                               'approved_files': 0, 'excluded_files': 0}
            )
    
    def _find_all_files(self, inbox_path: str) -> List[str]:
        """Find ALL files in the inbox (filtering happens later)"""
        files = []
        inbox = Path(inbox_path)
        
        if not inbox.exists():
            logger.warning(f"Inbox path does not exist: {inbox_path}")
            return files
        
        for file_path in inbox.rglob('*'):
            if file_path.is_file():
                # Include ALL files - let the file_filter decide what's valid
                files.append(str(file_path))
        
        return sorted(files)
    
    def _extract_batch(self, file_paths: List[str]) -> Dict[str, Dict]:
        """Extract data from all approved files in the batch"""
        logger.info("Extracting data from approved documents...")
        
        extraction_results = {}
        
        for file_path in file_paths:
            try:
                logger.info(f"Processing: {file_path}")
                result = self.extractor.extract_from_document(file_path)
                
                extraction_results[file_path] = {
                    'document_type': result.document_type,
                    'confidence': result.confidence,
                    'extracted_data': result.extracted_data,
                    'raw_response': result.raw_response
                }
                
                logger.info(f"Extracted: {result.document_type} (confidence: {result.confidence:.2f})")
                
            except Exception as e:
                logger.error(f"Extraction failed for {file_path}: {str(e)}")
                extraction_results[file_path] = {
                    'document_type': 'other',
                    'confidence': 0.0,
                    'extracted_data': {},
                    'raw_response': f"Error: {str(e)}"
                }
        
        return extraction_results
    
    def _merge_tanks(self, extraction_results: Dict[str, Dict]) -> List[MergedTank]:
        """Group documents by tank and merge their data"""
        logger.info("Merging documents by tank...")
        
        # Filter out non-tank documents
        tank_documents = {
            path: data for path, data in extraction_results.items()
            if data['document_type'] in ['tank_chart', 'spec_sheet'] and data['confidence'] > 0.5
        }
        
        if not tank_documents:
            logger.info("No valid tank documents found for merging")
            return []
        
        merged_tanks = self.merger.merge_documents(tank_documents)
        logger.info(f"Merged into {len(merged_tanks)} unique tanks")
        
        return merged_tanks
    
    def _store_and_create_pending(
        self, batch_id: str, files: List[str], 
        extraction_results: Dict[str, Dict], merged_tanks: List[MergedTank]
    ) -> ProcessingResult:
        """Store documents and create pending tank records"""
        
        processed_files = []
        errors = []
        auto_confirmed = 0
        requiring_review = 0
        
        # Process each merged tank
        for tank in merged_tanks:
            try:
                # Determine if tank can be auto-confirmed
                can_auto_confirm = self._can_auto_confirm(tank)
                
                # Store documents for this tank
                document_ids = []
                for source in tank.sources:
                    if source.file_path in files:
                        try:
                            doc_id = self.storage.upload_document(
                                source.file_path,
                                batch_id,
                                {
                                    'tank_serial': tank.serial_number,
                                    'document_type': source.document_type
                                }
                            )
                            document_ids.append(doc_id)
                            processed_files.append(source.file_path)
                            
                        except Exception as e:
                            error_msg = f"Storage failed for {source.file_path}: {str(e)}"
                            logger.error(error_msg)
                            errors.append(error_msg)
                
                # Convert MergedTank to merged_data dict
                merged_data = {
                    'serial_number': tank.serial_number,
                    'manufacturer': tank.manufacturer,
                    'capacity_gallons': tank.capacity_gallons,
                    'year_manufactured': tank.year_manufactured,
                    'year_installed': tank.year_installed,
                    'tank_type': tank.tank_type,
                    'material': tank.material,
                    'product_stored': tank.product_stored,
                    'facility_name': tank.facility_name,
                    'facility_address': tank.facility_address,
                    'facility_state': tank.facility_state,
                    'last_test_date': tank.last_test_date,
                    'test_type': tank.test_type,
                    'test_result': tank.test_result,
                    'notes': tank.notes
                }
                
                # Generate facility_id from facility data
                facility_id = f"{tank.facility_name or 'Unknown'}_{tank.facility_address or 'Unknown'}_{tank.facility_state or 'Unknown'}".replace(' ', '_')
                
                # Create pending tank record
                tank_data = {
                    'batch_id': batch_id,
                    'serial_number': tank.serial_number,
                    'facility_id': facility_id,
                    'merged_data': merged_data,
                    'confidence_score': tank.confidence_score,
                    'source_documents': document_ids,
                    'needs_review': not can_auto_confirm,
                    'auto_confirmed': can_auto_confirm,
                    'created_at': datetime.now().isoformat()
                }
                
                tank_id = self.db.create_pending_tank(
                    merged_data,  # extracted_data
                    document_ids,  # document_ids
                    tank.confidence_score,  # confidence_score 
                    not can_auto_confirm,  # needs_review
                    batch_id  # batch_id
                )
                
                if can_auto_confirm:
                    auto_confirmed += 1
                    logger.info(f"Auto-confirmed tank {tank.serial_number} (ID: {tank.facility_id})")
                else:
                    requiring_review += 1
                    logger.info(f"Tank {tank.serial_number} requires human review")
                    
            except Exception as e:
                error_msg = f"Failed to process tank {tank.serial_number}: {str(e)}"
                logger.error(error_msg)
                errors.append(error_msg)
        
        return ProcessingResult(
            batch_id=batch_id,
            processed_files=list(set(processed_files)),
            excluded_files=[],  # Will be filled in later
            exclusion_reasons={},  # Will be filled in later
            tanks_found=len(merged_tanks),
            tanks_requiring_review=requiring_review,
            tanks_auto_confirmed=auto_confirmed,
            errors=errors,
            processing_time_seconds=0.0,  # Will be calculated later
            filter_summary={}  # Will be filled in later
        )
    
    def _can_auto_confirm(self, tank: MergedTank) -> bool:
        """Determine if a tank can be auto-confirmed"""
        # Check confidence threshold
        if tank.confidence_score < self.auto_confirm_threshold:
            logger.debug(f"Tank {tank.serial_number} below confidence threshold")
            return False
        
        # Check required fields by accessing MergedTank attributes directly
        for field in self.min_required_fields:
            tank_value = getattr(tank, field, None)
            if not tank_value:
                logger.debug(f"Tank {tank.serial_number} missing required field: {field}")
                return False
        
        logger.debug(f"Tank {tank.serial_number} can be auto-confirmed")
        return True
    
    def _archive_files(self, files: List[str], inbox_path: str, batch_id: str):
        """Move processed files to archive directory"""
        archive_path = Path(inbox_path).parent / 'processed' / batch_id
        archive_path.mkdir(parents=True, exist_ok=True)
        
        for file_path in files:
            try:
                file_obj = Path(file_path)
                dest_path = archive_path / file_obj.name
                
                # Handle duplicate names
                counter = 1
                while dest_path.exists():
                    stem = file_obj.stem
                    suffix = file_obj.suffix
                    dest_path = archive_path / f"{stem}_{counter}{suffix}"
                    counter += 1
                
                shutil.move(file_path, dest_path)
                logger.info(f"Archived: {file_path} -> {dest_path}")
                
            except Exception as e:
                logger.error(f"Failed to archive {file_path}: {str(e)}")
    
    def _quarantine_excluded_files(self, files: List[str], inbox_path: str, batch_id: str):
        """Move excluded files to quarantine directory for review"""
        if not files:
            return
            
        quarantine_path = Path(inbox_path).parent / 'quarantine' / batch_id
        quarantine_path.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"📦 Moving {len(files)} excluded files to quarantine...")
        
        for file_path in files:
            try:
                file_obj = Path(file_path)
                dest_path = quarantine_path / file_obj.name
                
                # Handle duplicate names
                counter = 1
                while dest_path.exists():
                    stem = file_obj.stem
                    suffix = file_obj.suffix
                    dest_path = quarantine_path / f"{stem}_{counter}{suffix}"
                    counter += 1
                
                shutil.move(file_path, dest_path)
                logger.info(f"🚫 Quarantined: {file_obj.name} -> quarantine/{batch_id}/")
                
            except Exception as e:
                logger.error(f"Failed to quarantine {file_path}: {str(e)}")
    
    def get_batch_status(self, batch_id: str) -> Optional[Dict]:
        """Get status of a specific batch"""
        return self.db.get_batch_status(batch_id)
    
    def list_pending_reviews(self) -> List[Dict]:
        """Get list of tanks awaiting human review"""
        return self.db.get_pending_tanks(needs_review=True)

def main():
    """Test the filtered batch processor"""
    import sys
    
    if len(sys.argv) != 2:
        print("Usage: python batch_processor_filtered.py <inbox_path>")
        sys.exit(1)
    
    inbox_path = sys.argv[1]
    processor = BatchProcessor()
    result = processor.process_batch(inbox_path)
    
    print(f"\nFiltered Batch Processing Results:")
    print(f"Batch ID: {result.batch_id}")
    print(f"Files processed: {len(result.processed_files)}")
    print(f"Files excluded: {len(result.excluded_files)}")
    print(f"Tanks found: {result.tanks_found}")
    print(f"Auto-confirmed: {result.tanks_auto_confirmed}")
    print(f"Requiring review: {result.tanks_requiring_review}")
    print(f"Processing time: {result.processing_time_seconds:.1f}s")
    
    print(f"\nFilter Summary:")
    for key, value in result.filter_summary.items():
        print(f"  {key}: {value}")
    
    if result.exclusion_reasons:
        print(f"\nExcluded Files:")
        for filename, reason in result.exclusion_reasons.items():
            print(f"  ❌ {filename}: {reason}")
    
    if result.errors:
        print(f"\nErrors ({len(result.errors)}):")
        for error in result.errors:
            print(f"  - {error}")

if __name__ == "__main__":
    main()
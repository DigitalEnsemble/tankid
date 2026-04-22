"""
TankID Batch Processor - End-to-End Document Processing Orchestration
Coordinates extraction, merging, storage, and database operations
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

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class ProcessingResult:
    """Result of processing a batch of documents"""
    batch_id: str
    processed_files: List[str]
    tanks_found: int
    tanks_requiring_review: int
    tanks_auto_confirmed: int
    errors: List[str]
    processing_time_seconds: float
    
class BatchProcessor:
    """Orchestrates end-to-end document processing"""
    
    def __init__(self):
        self.extractor = DocumentExtractor()
        self.merger = TankMerger()
        self.storage = StorageManager()
        self.db = DatabaseManager()
        
        # Processing thresholds
        self.auto_confirm_threshold = 0.85
        self.min_required_fields = {'serial_number', 'facility_address', 'facility_state', 'manufacturer'}
        
        # File handling
        self.supported_extensions = {'.pdf', '.jpg', '.jpeg', '.png', '.msg', '.txt'}
        
    def process_batch(self, inbox_path: str, batch_settle_seconds: int = 120) -> ProcessingResult:
        """
        Process all files in the inbox directory
        
        Args:
            inbox_path: Path to the inbox directory
            batch_settle_seconds: How long to wait for batch to settle
            
        Returns:
            ProcessingResult with summary of processing
        """
        start_time = datetime.now()
        batch_id = str(uuid.uuid4())
        
        logger.info(f"Starting batch processing: {batch_id}")
        
        try:
            # Find and validate files
            files = self._find_files(inbox_path)
            if not files:
                logger.info("No files found in inbox")
                return ProcessingResult(
                    batch_id=batch_id,
                    processed_files=[],
                    tanks_found=0,
                    tanks_requiring_review=0,
                    tanks_auto_confirmed=0,
                    errors=[],
                    processing_time_seconds=0.0
                )
            
            logger.info(f"Found {len(files)} files to process")
            
            # Extract data from all documents
            extraction_results = self._extract_batch(files)
            
            # Merge documents by tank
            merged_tanks = self._merge_tanks(extraction_results)
            
            # Store documents and create pending records
            processing_result = self._store_and_create_pending(
                batch_id, files, extraction_results, merged_tanks
            )
            
            # Move processed files to archive
            self._archive_files(files, inbox_path, batch_id)
            
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
            raise
    
    def _find_files(self, inbox_path: str) -> List[str]:
        """Find all supported files in the inbox"""
        files = []
        inbox = Path(inbox_path)
        
        if not inbox.exists():
            logger.warning(f"Inbox path does not exist: {inbox_path}")
            return files
        
        for file_path in inbox.rglob('*'):
            if file_path.is_file() and file_path.suffix.lower() in self.supported_extensions:
                files.append(str(file_path))
        
        return sorted(files)
    
    def _extract_batch(self, file_paths: List[str]) -> Dict[str, Dict]:
        """Extract data from all files in the batch"""
        logger.info("Extracting data from documents...")
        
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
                    try:
                        # Upload to local storage
                        extraction_result = extraction_results.get(source.file_path, {})
                        metadata = {
                            'document_type': source.document_type,
                            'confidence': source.confidence,
                            'extracted_data': extraction_result.get('extracted_data', {})
                        }
                        r2_path = self.storage.upload_document(source.file_path, batch_id, metadata)
                        
                        # Store document record
                        doc_id = self.db.save_document({
                            'file_path': source.file_path,
                            'r2_path': r2_path,
                            'document_type': source.document_type,
                            'confidence': source.confidence,
                            'batch_id': batch_id,
                            'extraction_metadata': extraction_results.get(source.file_path, {})
                        })
                        
                        document_ids.append(doc_id)
                        processed_files.append(source.file_path)
                        
                    except Exception as e:
                        logger.error(f"Failed to store document {source.file_path}: {str(e)}")
                        errors.append(f"Document storage failed: {source.file_path} - {str(e)}")
                
                if not document_ids:
                    logger.error(f"No documents stored for tank {tank.serial_number}")
                    continue
                
                # Create pending tank record
                pending_id = self.db.create_pending_tank(
                    extracted_data=asdict(tank),
                    document_ids=document_ids,
                    confidence_score=tank.confidence_score,
                    needs_review=not can_auto_confirm,
                    batch_id=batch_id
                )
                
                if can_auto_confirm:
                    # Auto-confirm high-confidence tanks
                    try:
                        confirmed_tank_id = self.db.confirm_pending_tank(pending_id)
                        auto_confirmed += 1
                        logger.info(f"Auto-confirmed tank {tank.serial_number} (ID: {confirmed_tank_id})")
                    except Exception as e:
                        logger.error(f"Auto-confirmation failed for {pending_id}: {str(e)}")
                        requiring_review += 1
                        errors.append(f"Auto-confirmation failed: {tank.serial_number} - {str(e)}")
                else:
                    requiring_review += 1
                    logger.info(f"Tank {tank.serial_number} requires human review")
                
            except Exception as e:
                logger.error(f"Failed to process tank {tank.serial_number}: {str(e)}")
                errors.append(f"Tank processing failed: {tank.serial_number} - {str(e)}")
        
        return ProcessingResult(
            batch_id=batch_id,
            processed_files=processed_files,
            tanks_found=len(merged_tanks),
            tanks_requiring_review=requiring_review,
            tanks_auto_confirmed=auto_confirmed,
            errors=errors,
            processing_time_seconds=0.0  # Will be set by caller
        )
    
    def _can_auto_confirm(self, tank: MergedTank) -> bool:
        """
        Determine if a tank can be auto-confirmed
        
        Criteria:
        - Confidence above threshold
        - All required fields present
        - No conflicting data detected
        """
        # Check confidence threshold
        if tank.confidence_score < self.auto_confirm_threshold:
            logger.debug(f"Tank {tank.serial_number} below confidence threshold: {tank.confidence_score:.2f}")
            return False
        
        # Check required fields
        tank_dict = asdict(tank)
        missing_fields = []
        for field in self.min_required_fields:
            if not tank_dict.get(field):
                missing_fields.append(field)
        
        if missing_fields:
            logger.debug(f"Tank {tank.serial_number} missing required fields: {missing_fields}")
            return False
        
        # Check for spec sheet documentation (prefer for auto-confirmation)
        has_spec_sheet = any(
            source.document_type == 'spec_sheet' for source in tank.sources
        )
        
        if not has_spec_sheet:
            logger.debug(f"Tank {tank.serial_number} has no spec sheet documentation")
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
    
    def get_batch_status(self, batch_id: str) -> Optional[Dict]:
        """Get status of a specific batch"""
        return self.db.get_batch_status(batch_id)
    
    def list_pending_reviews(self) -> List[Dict]:
        """Get list of tanks awaiting human review"""
        return self.db.get_pending_tanks(needs_review=True)

def main():
    """Test the batch processor"""
    import sys
    
    if len(sys.argv) != 2:
        print("Usage: python batch_processor.py <inbox_path>")
        sys.exit(1)
    
    inbox_path = sys.argv[1]
    processor = BatchProcessor()
    result = processor.process_batch(inbox_path)
    
    print(f"\nBatch Processing Results:")
    print(f"Batch ID: {result.batch_id}")
    print(f"Files processed: {len(result.processed_files)}")
    print(f"Tanks found: {result.tanks_found}")
    print(f"Auto-confirmed: {result.tanks_auto_confirmed}")
    print(f"Requiring review: {result.tanks_requiring_review}")
    print(f"Processing time: {result.processing_time_seconds:.1f}s")
    
    if result.errors:
        print(f"\nErrors ({len(result.errors)}):")
        for error in result.errors:
            print(f"  - {error}")

if __name__ == "__main__":
    main()
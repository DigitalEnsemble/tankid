"""
TankID Batch Processor - IMPROVED with Deduplication and Filtering
Coordinates extraction, merging, storage, and database operations
"""

import os
import json
import logging
import shutil
import hashlib
import re
from typing import Dict, List, Optional, Tuple, Set
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
    skipped_files: List[str]  # NEW: Track files that were filtered out
    duplicate_files: List[str]  # NEW: Track duplicates found
    tanks_found: int
    tanks_requiring_review: int
    tanks_auto_confirmed: int
    errors: List[str]
    processing_time_seconds: float

@dataclass
class FileInfo:
    """Information about a file for deduplication"""
    path: str
    size: int
    hash: str
    base_name: str  # Filename without timestamp prefix
    
class BatchProcessor:
    """Orchestrates end-to-end document processing with smart filtering"""
    
    def __init__(self):
        self.extractor = DocumentExtractor()
        self.merger = TankMerger()
        self.storage = StorageManager()
        self.db = DatabaseManager()
        
        # Processing thresholds
        self.auto_confirm_threshold = 0.85
        self.min_required_fields = {'serial_number', 'facility_address', 'facility_state', 'manufacturer'}
        
        # File handling - IMPROVED
        self.tank_document_extensions = {'.pdf', '.md'}  # PDFs and markdown for tank docs
        self.image_extensions = {'.jpg', '.jpeg', '.png'}  # Images allowed but lower priority
        self.excluded_extensions = {'.txt', '.msg'}  # Email files excluded
        
        # Content filtering patterns
        self.email_patterns = [
            r'EMAIL_.*\.txt$',
            r'Fwd.*\.txt$',
            r'Re:.*\.txt$',
            r'\.msg$'
        ]
        
        # Tank document patterns (what we WANT to process)
        self.tank_document_patterns = [
            # PDF patterns
            r'.*[Tt]ank.*[Cc]hart.*\.pdf$',
            r'.*[Ss]pec.*[Ss]heet.*\.pdf$',
            r'.*[Ii]nstall.*[Pp]ermit.*\.pdf$',
            r'.*[Cc]ompliance.*\.pdf$',
            r'.*[Tt]est.*[Rr]eport.*\.pdf$',
            r'.*[Xx]erxes.*\.pdf$',
            r'.*[Ss]teelcraft.*\.pdf$',
            r'.*[Ff]iberglass.*[Tt]ank.*\.pdf$',
            # Markdown patterns (for testing)
            r'.*[Cc]apacity.*[Cc]hart.*\.md$',
            r'.*[Tt]ank.*[Rr]egistration.*\.md$',
            r'.*[Aa][Ss][Tt].*[Ii]nstall.*\.md$',
            r'.*[Ww]arranty.*[Vv]alidation.*\.md$',
            r'.*[Ff]ireguard.*\.md$',
            r'.*[Rr]egistration.*[Ff]orm.*\.md$'
        ]
        
    def process_batch(self, inbox_path: str, batch_settle_seconds: int = 120) -> ProcessingResult:
        """
        Process all files in the inbox directory with smart filtering
        
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
            # Find, deduplicate, and filter files - IMPROVED
            file_analysis = self._analyze_files(inbox_path)
            
            if not file_analysis['valid_files']:
                logger.info("No valid tank documents found after filtering")
                return ProcessingResult(
                    batch_id=batch_id,
                    processed_files=[],
                    skipped_files=file_analysis['skipped_files'],
                    duplicate_files=file_analysis['duplicate_files'],
                    tanks_found=0,
                    tanks_requiring_review=0,
                    tanks_auto_confirmed=0,
                    errors=[],
                    processing_time_seconds=0.0
                )
            
            logger.info(f"Processing {len(file_analysis['valid_files'])} files after deduplication and filtering")
            logger.info(f"Skipped {len(file_analysis['skipped_files'])} non-tank files")
            logger.info(f"Found {len(file_analysis['duplicate_files'])} duplicates")
            
            # Extract data from valid documents only
            extraction_results = self._extract_batch(file_analysis['valid_files'])
            
            # Merge documents by tank
            merged_tanks = self._merge_tanks(extraction_results)
            
            # Store documents and create pending records
            processing_result = self._store_and_create_pending(
                batch_id, file_analysis['valid_files'], extraction_results, merged_tanks
            )
            
            # Update result with filtering info
            processing_result.skipped_files = file_analysis['skipped_files']
            processing_result.duplicate_files = file_analysis['duplicate_files']
            
            # Move processed files to archive (only valid ones)
            self._archive_files(file_analysis['valid_files'], inbox_path, batch_id)
            
            # Clean up filtered files from inbox (emails and duplicates)
            self._cleanup_filtered_files(file_analysis['skipped_files'], file_analysis['duplicate_files'])
            
            # Calculate processing time
            processing_result.processing_time_seconds = (
                datetime.now() - start_time
            ).total_seconds()
            
            logger.info(f"Batch processing complete: {batch_id}")
            logger.info(f"Tanks found: {processing_result.tanks_found}")
            logger.info(f"Auto-confirmed: {processing_result.tanks_auto_confirmed}")
            logger.info(f"Requiring review: {processing_result.tanks_requiring_review}")
            logger.info(f"Files skipped: {len(processing_result.skipped_files)}")
            logger.info(f"Duplicates found: {len(processing_result.duplicate_files)}")
            
            return processing_result
            
        except Exception as e:
            logger.error(f"Batch processing failed: {str(e)}")
            return ProcessingResult(
                batch_id=batch_id,
                processed_files=[],
                skipped_files=[],
                duplicate_files=[],
                tanks_found=0,
                tanks_requiring_review=0,
                tanks_auto_confirmed=0,
                errors=[str(e)],
                processing_time_seconds=(datetime.now() - start_time).total_seconds()
            )

    def _analyze_files(self, inbox_path: str) -> Dict[str, List[str]]:
        """
        IMPROVED: Analyze files with deduplication and smart filtering
        
        Returns:
            Dict with 'valid_files', 'skipped_files', 'duplicate_files'
        """
        inbox = Path(inbox_path)
        all_files = []
        
        if not inbox.exists():
            logger.warning(f"Inbox path does not exist: {inbox_path}")
            return {'valid_files': [], 'skipped_files': [], 'duplicate_files': []}
        
        # Collect all files
        for file_path in inbox.rglob('*'):
            if file_path.is_file():
                all_files.append(str(file_path))
        
        logger.info(f"Found {len(all_files)} total files in inbox")
        
        # Step 1: Filter by file type and content patterns
        filtered_files = []
        skipped_files = []
        
        for file_path in all_files:
            if self._should_process_file(file_path):
                filtered_files.append(file_path)
            else:
                skipped_files.append(file_path)
                logger.info(f"🚫 SKIPPED (email/non-tank): {Path(file_path).name}")
        
        logger.info(f"After content filtering: {len(filtered_files)} valid, {len(skipped_files)} skipped")
        
        # Step 2: Deduplicate by content hash
        file_info_map = {}
        duplicate_files = []
        
        for file_path in filtered_files:
            try:
                info = self._get_file_info(file_path)
                
                # Check if we've seen this content before
                existing = file_info_map.get(info.hash)
                if existing:
                    # Duplicate found - keep the one with simpler name
                    if len(info.base_name) < len(existing.base_name):
                        # New file has simpler name, replace existing
                        duplicate_files.append(existing.path)
                        file_info_map[info.hash] = info
                        logger.info(f"🔄 DUPLICATE: Replacing {Path(existing.path).name} with {Path(info.path).name}")
                    else:
                        # Existing file is better, mark new as duplicate
                        duplicate_files.append(info.path)
                        logger.info(f"🔄 DUPLICATE: {Path(info.path).name} (keeping {Path(existing.path).name})")
                else:
                    # First time seeing this content
                    file_info_map[info.hash] = info
                    
            except Exception as e:
                logger.error(f"Error analyzing file {file_path}: {e}")
                skipped_files.append(file_path)
        
        # Extract valid files (those not marked as duplicates)
        valid_files = [info.path for info in file_info_map.values()]
        
        logger.info(f"After deduplication: {len(valid_files)} unique files")
        
        return {
            'valid_files': valid_files,
            'skipped_files': skipped_files,
            'duplicate_files': duplicate_files
        }
    
    def _should_process_file(self, file_path: str) -> bool:
        """
        IMPROVED: Determine if a file should be processed based on content patterns
        """
        file_name = Path(file_path).name
        extension = Path(file_path).suffix.lower()
        
        # Step 1: Exclude email files by extension and pattern
        if extension in self.excluded_extensions:
            return False
            
        for pattern in self.email_patterns:
            if re.search(pattern, file_name, re.IGNORECASE):
                return False
        
        # Step 2: Accept tank documents
        if extension in self.tank_document_extensions:
            # Check if it matches tank document patterns
            for pattern in self.tank_document_patterns:
                if re.search(pattern, file_name, re.IGNORECASE):
                    return True
            
            # If it's a PDF but doesn't match tank patterns, be more selective
            # Accept if it's not clearly an email or report
            non_tank_patterns = [
                r'email',
                r'correspondence',
                r'letter',
                r'memo',
                r'communication'
            ]
            
            for pattern in non_tank_patterns:
                if re.search(pattern, file_name, re.IGNORECASE):
                    return False
            
            # Accept other PDFs by default (could be tank docs)
            return True
        
        # Step 3: Accept images with tank-related names
        if extension in self.image_extensions:
            tank_keywords = ['tank', 'chart', 'spec', 'install', 'permit']
            for keyword in tank_keywords:
                if keyword.lower() in file_name.lower():
                    return True
        
        return False
    
    def _get_file_info(self, file_path: str) -> FileInfo:
        """
        IMPROVED: Get file information for deduplication
        """
        path_obj = Path(file_path)
        
        # Calculate SHA256 hash of file content
        hasher = hashlib.sha256()
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hasher.update(chunk)
        content_hash = hasher.hexdigest()
        
        # Get file size
        file_size = path_obj.stat().st_size
        
        # Extract base name (remove timestamp prefixes)
        base_name = path_obj.name
        
        # Remove timestamp patterns like "2026-04-14T23-25-26.576Z_"
        timestamp_pattern = r'^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}-[0-9]{2}-[0-9]{2}\.[0-9]{3}Z_'
        base_name = re.sub(timestamp_pattern, '', base_name)
        
        return FileInfo(
            path=file_path,
            size=file_size,
            hash=content_hash,
            base_name=base_name
        )

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
                        
                        # Save document to database
                        document_id = self.db.save_document({
                            'file_path': source.file_path,
                            'batch_id': batch_id,
                            'document_type': source.document_type,
                            'confidence': source.confidence,
                            'storage_path': r2_path,
                            'extracted_data': extraction_result.get('extracted_data', {}),
                            'processed_at': datetime.now().isoformat()
                        })
                        document_ids.append(document_id)
                        
                    except Exception as e:
                        logger.error(f"Failed to store document {source.file_path}: {str(e)}")
                        errors.append(f"Storage failed for {source.file_path}: {str(e)}")
                
                # Create tank record with references to documents
                tank_data = asdict(tank)
                tank_data.update({
                    'batch_id': batch_id,
                    'document_ids': document_ids,
                    'confidence_score': tank.confidence_score,
                    'sources': [asdict(source) for source in tank.sources],
                    'created_at': datetime.now().isoformat(),
                    'status': 'confirmed' if can_auto_confirm else 'pending_review'
                })
                
                # Save to database
                tank_id = self.db.save_tank(tank_data)
                processed_files.extend([source.file_path for source in tank.sources])
                
                if can_auto_confirm:
                    auto_confirmed += 1
                    logger.info(f"Auto-confirmed tank {tank.serial_number} (ID: {tank_id})")
                else:
                    requiring_review += 1
                    logger.info(f"Tank {tank.serial_number} requires review (ID: {tank_id})")
                
            except Exception as e:
                logger.error(f"Failed to process tank: {str(e)}")
                errors.append(f"Tank processing failed: {str(e)}")
        
        return ProcessingResult(
            batch_id=batch_id,
            processed_files=list(set(processed_files)),  # Remove duplicates
            skipped_files=[],  # Will be filled by caller
            duplicate_files=[],  # Will be filled by caller
            tanks_found=len(merged_tanks),
            tanks_requiring_review=requiring_review,
            tanks_auto_confirmed=auto_confirmed,
            errors=errors,
            processing_time_seconds=0.0  # Will be calculated by caller
        )
    
    def _can_auto_confirm(self, tank: MergedTank) -> bool:
        """Determine if a tank can be auto-confirmed"""
        
        # Check confidence score
        if tank.confidence_score < self.auto_confirm_threshold:
            return False
        
        # Check required fields
        tank_dict = asdict(tank)
        missing_fields = self.min_required_fields - set(
            k for k, v in tank_dict.items() if v is not None and v != ''
        )
        
        if missing_fields:
            logger.info(f"Tank missing required fields: {missing_fields}")
            return False
        
        return True
    
    def _archive_files(self, files: List[str], inbox_path: str, batch_id: str):
        """Move processed files to the archive directory"""
        inbox = Path(inbox_path)
        archive_dir = inbox.parent / "processed" / batch_id
        archive_dir.mkdir(parents=True, exist_ok=True)
        
        for file_path in files:
            try:
                source = Path(file_path)
                destination = archive_dir / source.name
                
                shutil.move(str(source), str(destination))
                logger.info(f"Archived: {file_path} -> {destination}")
                
            except Exception as e:
                logger.error(f"Failed to archive {file_path}: {str(e)}")
                
    def _cleanup_filtered_files(self, skipped_files: List[str], duplicate_files: List[str]):
        """
        Remove skipped email files and duplicate files from inbox
        """
        all_filtered_files = skipped_files + duplicate_files
        
        for file_path in all_filtered_files:
            try:
                source = Path(file_path)
                if source.exists():
                    source.unlink()  # Delete the file
                    logger.info(f"🗑️  DELETED (filtered): {source.name}")
                else:
                    logger.warning(f"File not found for deletion: {file_path}")
                    
            except Exception as e:
                logger.error(f"Failed to delete filtered file {file_path}: {str(e)}")
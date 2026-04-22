"""
Local storage manager for development (bypasses R2)
"""
import os
import shutil
import logging
from pathlib import Path
from typing import Dict, Optional

logger = logging.getLogger(__name__)

class StorageManager:
    """Local development storage manager (no R2 uploads)"""
    
    def __init__(self):
        self.local_storage_dir = Path("local_storage")
        self.local_storage_dir.mkdir(exist_ok=True)
        logger.info(f"🏠 StorageManager: Using local file storage at {self.local_storage_dir}")
    
    def upload_document(self, file_path: str, batch_id: str, metadata: Dict) -> Optional[str]:
        """Store document locally instead of uploading to R2"""
        try:
            # Create batch directory
            batch_dir = self.local_storage_dir / batch_id
            batch_dir.mkdir(exist_ok=True)
            
            # Copy file to local storage
            source_path = Path(file_path)
            dest_path = batch_dir / source_path.name
            shutil.copy2(file_path, dest_path)
            
            # Create metadata file
            metadata_path = batch_dir / f"{source_path.stem}_metadata.json"
            import json
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2, default=str)
            
            # Return mock URL
            mock_url = f"local://storage/{batch_id}/{source_path.name}"
            logger.info(f"📁 Stored document locally: {mock_url}")
            return mock_url
            
        except Exception as e:
            logger.error(f"Error storing document locally {file_path}: {e}")
            return None
    
    def upload_email_body(self, email_content: str, batch_id: str, filename: str) -> Optional[str]:
        """Store email content locally"""
        try:
            # Create batch directory
            batch_dir = self.local_storage_dir / batch_id
            batch_dir.mkdir(exist_ok=True)
            
            # Write email content
            email_path = batch_dir / f"{filename}_email_body.txt"
            with open(email_path, 'w', encoding='utf-8') as f:
                f.write(email_content)
            
            # Return mock URL
            mock_url = f"local://storage/{batch_id}/{filename}_email_body.txt"
            logger.info(f"📧 Stored email body locally: {mock_url}")
            return mock_url
            
        except Exception as e:
            logger.error(f"Error storing email content locally: {e}")
            return None
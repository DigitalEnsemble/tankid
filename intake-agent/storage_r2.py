"""
Cloudflare R2 storage manager for TankID documents
Handles uploading documents from intake agent to production R2 storage
"""
import os
import boto3
import logging
import hashlib
from typing import Dict, Optional, List
from datetime import datetime
from pathlib import Path
import mimetypes

logger = logging.getLogger(__name__)

class R2StorageManager:
    """Cloudflare R2 storage manager for document uploads"""
    
    def __init__(self):
        # R2 configuration from environment/Doppler
        self.endpoint = os.environ.get('R2_ENDPOINT')
        self.bucket = os.environ.get('R2_BUCKET')
        self.access_key = os.environ.get('R2_ACCESS_KEY')
        self.secret_key = os.environ.get('R2_SECRET_KEY')
        
        if not all([self.endpoint, self.bucket, self.access_key, self.secret_key]):
            raise ValueError("R2 configuration incomplete. Check R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY, R2_SECRET_KEY")
        
        # Initialize S3-compatible client for R2
        self.client = boto3.client(
            's3',
            endpoint_url=self.endpoint,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            region_name='auto'  # R2 uses 'auto' for region
        )
        
        logger.info(f"☁️ R2StorageManager: Connected to bucket {self.bucket}")
    
    def generate_r2_key(self, document_data: Dict, facility_id: str = None, batch_id: str = None) -> str:
        """Generate R2 object key following required structure: documents/[facility_uuid]/[filename]"""
        # Extract filename
        original_filename = document_data.get('original_filename', 'unknown')
        
        # Use facility_id if provided, otherwise fallback to batch-based folder
        if facility_id:
            # Required structure: documents/[facility_uuid]/[filename]
            r2_key = f"documents/{facility_id}/{original_filename}"
        else:
            # Fallback for cases without facility_id (should be rare)
            logger.warning(f"No facility_id provided for {original_filename}, using batch fallback")
            folder_id = batch_id[:8] if batch_id else hashlib.md5(original_filename.encode()).hexdigest()[:8]
            r2_key = f"documents/pending/{folder_id}/{original_filename}"
        
        return r2_key
    
    def upload_document(self, file_path: str, document_data: Dict, facility_id: str = None, batch_id: str = None) -> Optional[str]:
        """Upload document to R2 storage"""
        try:
            if not os.path.exists(file_path):
                logger.error(f"File not found: {file_path}")
                return None
            
            # Generate R2 key with facility_id for proper directory structure
            r2_key = self.generate_r2_key(document_data, facility_id, batch_id)
            
            # Determine content type
            content_type, _ = mimetypes.guess_type(file_path)
            if not content_type:
                content_type = 'application/octet-stream'
            
            # Get file size
            file_size = os.path.getsize(file_path)
            
            # Upload to R2
            with open(file_path, 'rb') as file_data:
                self.client.upload_fileobj(
                    file_data,
                    self.bucket,
                    r2_key,
                    ExtraArgs={
                        'ContentType': content_type,
                        'Metadata': {
                            'original_filename': document_data.get('original_filename', 'unknown'),
                            'doc_type': document_data.get('document_type', 'other'),
                            'facility_id': facility_id or 'unknown',
                            'batch_id': batch_id or 'unknown',
                            'upload_date': datetime.now().isoformat(),
                            'file_size': str(file_size)
                        }
                    }
                )
            
            logger.info(f"☁️ Uploaded to R2: {r2_key} ({file_size:,} bytes)")
            return r2_key
            
        except Exception as e:
            logger.error(f"Failed to upload {file_path} to R2: {e}")
            return None
    
    def upload_email_content(self, email_content: str, batch_id: str, filename: str, facility_id: str = None) -> Optional[str]:
        """Upload email content as text file to R2"""
        try:
            # Create document data for email
            document_data = {
                'original_filename': f"{filename}_email_body.txt",
                'document_type': 'email_content'
            }
            
            # Generate R2 key with facility_id
            r2_key = self.generate_r2_key(document_data, facility_id, batch_id)
            
            # Upload email content as text
            self.client.put_object(
                Bucket=self.bucket,
                Key=r2_key,
                Body=email_content.encode('utf-8'),
                ContentType='text/plain',
                Metadata={
                    'original_filename': document_data['original_filename'],
                    'doc_type': 'email_content',
                    'facility_id': facility_id or 'unknown',
                    'batch_id': batch_id,
                    'upload_date': datetime.now().isoformat(),
                    'file_size': str(len(email_content.encode('utf-8')))
                }
            )
            
            logger.info(f"📧 Uploaded email content to R2: {r2_key}")
            return r2_key
            
        except Exception as e:
            logger.error(f"Failed to upload email content to R2: {e}")
            return None
    
    def check_object_exists(self, r2_key: str) -> bool:
        """Check if object exists in R2"""
        try:
            self.client.head_object(Bucket=self.bucket, Key=r2_key)
            return True
        except:
            return False
    
    def list_objects(self, prefix: str = "documents/", limit: int = 100) -> List[Dict]:
        """List objects in R2 with given prefix"""
        try:
            response = self.client.list_objects_v2(
                Bucket=self.bucket,
                Prefix=prefix,
                MaxKeys=limit
            )
            
            objects = []
            for obj in response.get('Contents', []):
                objects.append({
                    'key': obj['Key'],
                    'size': obj['Size'],
                    'last_modified': obj['LastModified'],
                    'etag': obj['ETag']
                })
            
            return objects
            
        except Exception as e:
            logger.error(f"Failed to list R2 objects: {e}")
            return []
    
    def get_object_url(self, r2_key: str, expires_in: int = 3600) -> Optional[str]:
        """Generate presigned URL for R2 object"""
        try:
            url = self.client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket, 'Key': r2_key},
                ExpiresIn=expires_in
            )
            return url
        except Exception as e:
            logger.error(f"Failed to generate presigned URL for {r2_key}: {e}")
            return None
    
    def delete_object(self, r2_key: str) -> bool:
        """Delete object from R2 (use carefully!)"""
        try:
            self.client.delete_object(Bucket=self.bucket, Key=r2_key)
            logger.info(f"🗑️ Deleted from R2: {r2_key}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete {r2_key} from R2: {e}")
            return False

# Example usage and testing
if __name__ == "__main__":
    import tempfile
    
    # Test R2 connection
    try:
        r2 = R2StorageManager()
        
        # Test file upload
        test_content = "This is a test document for TankID intake agent."
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as tmp:
            tmp.write(test_content)
            tmp.flush()
            
            document_data = {
                'original_filename': 'test_document.txt',
                'document_type': 'tank_chart'
            }
            
            r2_key = r2.upload_document(tmp.name, document_data, 'test-facility-uuid-123', 'test-batch-123')
            
            if r2_key:
                print(f"✅ Upload successful: {r2_key}")
                
                # Test URL generation
                url = r2.get_object_url(r2_key)
                print(f"🔗 Presigned URL: {url}")
                
                # Test object existence check
                exists = r2.check_object_exists(r2_key)
                print(f"📄 Object exists: {exists}")
                
                # Test list objects
                objects = r2.list_objects("tankid-docs/documents/", 5)
                print(f"📁 Found {len(objects)} objects")
                
            else:
                print("❌ Upload failed")
        
        # Clean up
        os.unlink(tmp.name)
        
    except Exception as e:
        print(f"❌ R2 test failed: {e}")
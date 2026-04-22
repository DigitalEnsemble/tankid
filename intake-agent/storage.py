import boto3
import os
import shutil
from pathlib import Path
import google.auth
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
import io
import logging

logger = logging.getLogger(__name__)

# Google Drive Auth — Application Default Credentials
def get_drive_service():
    """
    Returns authenticated Drive service using Application Default Credentials.
    Credentials come from: ~/.config/gcloud/application_default_credentials.json
    Set by running: gcloud auth application-default login
    """
    creds, _ = google.auth.default(
        scopes=['https://www.googleapis.com/auth/drive']
    )
    return build('drive', 'v3', credentials=creds)

def download_from_drive(file_id: str) -> tuple[bytes, str, str]:
    """
    Download file from Google Drive by ID.
    Returns: (file_bytes, filename, company_slug)
    """
    service = get_drive_service()
    
    # Get file metadata
    meta = service.files().get(
        fileId=file_id,
        fields='name,parents'
    ).execute()
    
    filename = meta['name']
    parent_id = meta['parents'][0] if meta.get('parents') else None
    company_slug = None
    
    if parent_id:
        parent = service.files().get(fileId=parent_id, fields='name').execute()
        company_slug = parent['name']
    
    # Download file content
    request = service.files().get_media(fileId=file_id)
    buf = io.BytesIO()
    downloader = MediaIoBaseDownload(buf, request)
    done = False
    
    while not done:
        _, done = downloader.next_chunk()
    
    logger.info(f"Downloaded from Drive: {filename} (company: {company_slug})")
    return buf.getvalue(), filename, company_slug

# R2 Storage Operations
def upload_to_r2(pdf_bytes: bytes, key: str) -> str:
    """
    Upload PDF to R2 storage.
    Returns: public URL
    """
    s3 = boto3.client(
        's3',
        endpoint_url=f"https://{os.environ['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
        aws_access_key_id=os.environ['R2_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['R2_SECRET_ACCESS_KEY'],
        region_name='auto'
    )
    
    s3.put_object(
        Bucket=os.environ['R2_BUCKET_NAME'],
        Key=key,
        Body=pdf_bytes,
        ContentType='application/pdf'
    )
    
    url = f"{os.environ['R2_PUBLIC_URL']}/{key}"
    logger.info(f"Uploaded to R2: {key}")
    return url

def build_r2_key(facility_uuid: str, tank_uuid: str, doc_type: str, filename: str) -> str:
    """
    Build R2 key for confirmed document:
    tankid-docs/{facility_uuid}/{tank_uuid}/{doc_type}/{filename}
    """
    return f"tankid-docs/{facility_uuid}/{tank_uuid}/{doc_type}/{filename}"

def build_r2_pending_key(batch_id: str, filename: str) -> str:
    """
    Build R2 key for pending document:
    tankid-docs/pending/{batch_id}/{filename}
    """
    return f"tankid-docs/pending/{batch_id}/{filename}"

# Local File Operations
def move_local_file(src: Path, dest_folder: str):
    """
    Move file from src to dest_folder using environment variable.
    dest_folder should be one of: 
    'INTAKE_PROCESSING_PATH', 'INTAKE_PROCESSED_PATH', 'INTAKE_FAILED_PATH'
    """
    dest_dir = Path(os.environ[dest_folder]).expanduser()
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / src.name
    
    shutil.move(str(src), str(dest))
    logger.info(f"Moved: {src.name} → {dest_folder}")

def read_email_body(filepath: Path) -> str:
    """
    Read .eml or .txt. Strip email headers from .eml. 
    Return plain text string. 
    Never call upload_to_r2() on email content.
    """
    try:
        content = filepath.read_text(encoding='utf-8')
        
        if filepath.suffix.lower() == '.eml':
            # Strip email headers - look for double newline separator
            if '\n\n' in content:
                _, body = content.split('\n\n', 1)
                return body.strip()
            elif '\r\n\r\n' in content:
                _, body = content.split('\r\n\r\n', 1)
                return body.strip()
        
        return content.strip()
        
    except Exception as e:
        logger.error(f"Error reading email body from {filepath}: {e}")
        return ""

def get_file_list(inbox_path: str, company_slug: str) -> list[Path]:
    """
    Get all files in inbox/{company_slug}/ subfolder.
    """
    company_folder = Path(inbox_path).expanduser() / company_slug
    if not company_folder.exists():
        return []
    
    return [f for f in company_folder.iterdir() if f.is_file()]

def ensure_folder_exists(folder_path: str):
    """
    Create folder if it doesn't exist.
    """
    Path(folder_path).expanduser().mkdir(parents=True, exist_ok=True)


class StorageManager:
    """Manager for file storage operations (R2, Google Drive, local files)"""
    
    def __init__(self):
        self.r2_bucket_name = os.getenv('R2_BUCKET_NAME')
        self.r2_public_url = os.getenv('R2_PUBLIC_URL')
        
        # Initialize R2 client
        self.s3 = boto3.client(
            's3',
            endpoint_url='https://76f520916452e2d7df69cf3eb5c6412a.r2.cloudflarestorage.com',
            aws_access_key_id=os.getenv('R2_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('R2_SECRET_ACCESS_KEY'),
            region_name='auto'
        )
    
    def upload_document(self, local_path: str, r2_key: str = None) -> str:
        """Upload a document to R2 and return the R2 path"""
        if r2_key is None:
            # Generate R2 key based on filename
            filename = Path(local_path).name
            r2_key = f"pending/{filename}"
        
        return upload_to_r2(local_path, r2_key)
    
    def get_document_url(self, r2_path: str) -> str:
        """Get public URL for an R2 document"""
        return f"{self.r2_public_url}/{r2_path}"
    
    def download_from_drive(self, file_id: str):
        """Download file from Google Drive"""
        return download_from_drive(file_id)
    
    def move_file(self, src_path: str, dest_folder_env: str):
        """Move file using environment variable destination"""
        move_file_env(Path(src_path), dest_folder_env)
    
    def read_email_body(self, filepath: str) -> str:
        """Read email body from file"""
        return read_email_body(Path(filepath))
    
    def get_file_list(self, inbox_path: str, company_slug: str):
        """Get list of files in company folder"""
        return get_file_list(inbox_path, company_slug)
    
    def ensure_folder_exists(self, folder_path: str):
        """Ensure folder exists"""
        ensure_folder_exists(folder_path)
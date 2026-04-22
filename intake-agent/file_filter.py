"""
TankID File Filter - Advanced filtering and duplicate detection
Filters out emails, conversations, and duplicates from intake processing
"""

import os
import hashlib
import re
import logging
from typing import Dict, List, Set, Tuple, Optional
from pathlib import Path
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class FileInfo:
    """Information about a file for filtering decisions"""
    path: str
    name: str
    size: int
    extension: str
    content_hash: str
    is_email: bool
    is_conversation: bool
    is_duplicate: bool
    confidence_score: float  # 0.0 = exclude, 1.0 = definitely include

class TankIDFileFilter:
    """Advanced file filtering for TankID intake processing"""
    
    def __init__(self):
        # File extension filtering
        self.tank_document_extensions = {
            '.pdf',      # Tank specs, permits, charts
            '.jpg', '.jpeg', '.png',  # Photos of tanks, nameplates
        }
        
        self.exclude_extensions = {
            '.msg',      # Email messages
            '.eml',      # Email files
            '.mbox',     # Email mailbox files
            '.txt',      # Usually conversations/emails (we'll content-filter these)
        }
        
        # Email/conversation detection patterns
        self.email_patterns = [
            r'FROM:\s*.*?@.*',
            r'TO:\s*.*?@.*',
            r'SUBJECT:\s*.*',
            r'Date:\s*.*\d{4}.*',
            r'---------- Forwarded message ---------',
            r'From:.*@.*',
            r'Sent:.*\d{4}',
            r'Re:\s*',
            r'Fwd:\s*',
        ]
        
        self.conversation_patterns = [
            r'Hey\s*,?\s*\w+',
            r'Hi\s*,?\s*\w+', 
            r'Thanks\s*,?\s*\w+',
            r'Let me know',
            r'FYI',
            r'Just wanted to',
            r'Can you\s*.*\?',
            r'I was wondering',
            r'Hope this helps',
        ]
        
        # Track seen files by content hash
        self.seen_hashes: Set[str] = set()
        self.hash_to_path: Dict[str, str] = {}
        
    def calculate_file_hash(self, file_path: str) -> str:
        """Calculate SHA-256 hash of file content for duplicate detection"""
        try:
            hasher = hashlib.sha256()
            with open(file_path, 'rb') as f:
                # Read in chunks to handle large files
                for chunk in iter(lambda: f.read(4096), b""):
                    hasher.update(chunk)
            return hasher.hexdigest()
        except Exception as e:
            logger.warning(f"Could not hash file {file_path}: {str(e)}")
            return f"error-{file_path}"  # Unique fallback
    
    def analyze_text_content(self, file_path: str, max_chars: int = 10000) -> Tuple[bool, bool]:
        """
        Analyze text content to determine if it's an email or conversation
        Returns: (is_email, is_conversation)
        """
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read(max_chars)
                
            content_lower = content.lower()
            
            # Check for email patterns
            email_matches = 0
            for pattern in self.email_patterns:
                if re.search(pattern, content, re.IGNORECASE):
                    email_matches += 1
            
            is_email = email_matches >= 2  # Need at least 2 email indicators
            
            # Check for conversation patterns
            conversation_matches = 0
            for pattern in self.conversation_patterns:
                if re.search(pattern, content, re.IGNORECASE):
                    conversation_matches += 1
            
            is_conversation = conversation_matches >= 2  # Need at least 2 conversation indicators
            
            return is_email, is_conversation
            
        except Exception as e:
            logger.warning(f"Could not analyze content of {file_path}: {str(e)}")
            return False, False
    
    def analyze_file(self, file_path: str) -> FileInfo:
        """Analyze a file and return filtering information"""
        path_obj = Path(file_path)
        name = path_obj.name
        extension = path_obj.suffix.lower()
        
        try:
            size = os.path.getsize(file_path)
        except OSError:
            size = 0
        
        # Calculate content hash for duplicate detection
        content_hash = self.calculate_file_hash(file_path)
        is_duplicate = content_hash in self.seen_hashes
        
        # Extension-based filtering
        is_excluded_extension = extension in self.exclude_extensions
        is_tank_document_extension = extension in self.tank_document_extensions
        
        # Content analysis for text files
        is_email = False
        is_conversation = False
        
        if extension == '.txt' or 'email' in name.lower():
            is_email, is_conversation = self.analyze_text_content(file_path)
        elif extension in {'.msg', '.eml', '.mbox'}:
            is_email = True
        
        # Calculate confidence score
        confidence_score = self._calculate_confidence(
            extension, name, size, is_email, is_conversation, is_duplicate
        )
        
        return FileInfo(
            path=file_path,
            name=name,
            size=size,
            extension=extension,
            content_hash=content_hash,
            is_email=is_email,
            is_conversation=is_conversation,
            is_duplicate=is_duplicate,
            confidence_score=confidence_score
        )
    
    def _calculate_confidence(self, extension: str, name: str, size: int, 
                            is_email: bool, is_conversation: bool, is_duplicate: bool) -> float:
        """Calculate confidence score for including this file (0.0 = exclude, 1.0 = include)"""
        
        # Automatic exclusions
        if is_duplicate:
            return 0.0  # Never process duplicates
        
        if is_email or is_conversation:
            return 0.0  # Never process emails or conversations
        
        if extension in {'.msg', '.eml', '.mbox'}:
            return 0.0  # Never process email files
        
        # File too small (likely not a real document)
        if size < 100:  # Less than 100 bytes
            return 0.0
        
        # Strong tank document indicators
        if extension in {'.pdf'} and size > 10000:  # PDF over 10KB
            if any(keyword in name.lower() for keyword in 
                   ['tank', 'permit', 'install', 'spec', 'chart', 'ust', 'ast']):
                return 1.0  # Definitely include
            return 0.8  # Probably include
        
        # Image files (photos of tanks, nameplates, etc.)
        if extension in {'.jpg', '.jpeg', '.png'} and size > 50000:  # Over 50KB
            return 0.9  # Probably include (tank photos)
        
        # Text files that aren't emails/conversations
        if extension == '.txt' and not (is_email or is_conversation):
            if size < 1000:  # Small text files are suspicious
                return 0.3
            return 0.7  # Might be useful
        
        # Unknown/other files
        return 0.1  # Very low confidence, probably exclude
    
    def filter_files(self, file_paths: List[str], min_confidence: float = 0.5) -> Tuple[List[str], List[FileInfo]]:
        """
        Filter a list of files, returning approved files and analysis info
        
        Args:
            file_paths: List of file paths to analyze
            min_confidence: Minimum confidence score to include (0.0-1.0)
            
        Returns:
            (approved_files, all_file_info)
        """
        all_file_info = []
        approved_files = []
        
        logger.info(f"📋 Analyzing {len(file_paths)} files for processing...")
        
        for file_path in file_paths:
            file_info = self.analyze_file(file_path)
            all_file_info.append(file_info)
            
            # Track hash to detect future duplicates
            if not file_info.is_duplicate:
                self.seen_hashes.add(file_info.content_hash)
                self.hash_to_path[file_info.content_hash] = file_path
            
            # Decision logic
            if file_info.confidence_score >= min_confidence:
                approved_files.append(file_path)
                logger.info(f"✅ APPROVED: {file_info.name} (confidence: {file_info.confidence_score:.2f})")
            else:
                reason = self._get_exclusion_reason(file_info)
                logger.info(f"❌ EXCLUDED: {file_info.name} - {reason}")
        
        logger.info(f"📊 Filter Results: {len(approved_files)}/{len(file_paths)} files approved for processing")
        
        return approved_files, all_file_info
    
    def _get_exclusion_reason(self, file_info: FileInfo) -> str:
        """Get human-readable reason for excluding a file"""
        if file_info.is_duplicate:
            original = self.hash_to_path.get(file_info.content_hash, "unknown")
            return f"DUPLICATE of {Path(original).name}"
        
        if file_info.is_email:
            return "EMAIL CONTENT"
        
        if file_info.is_conversation:
            return "CONVERSATION/INFORMAL TEXT"
        
        if file_info.extension in {'.msg', '.eml', '.mbox'}:
            return "EMAIL FILE TYPE"
        
        if file_info.size < 100:
            return "FILE TOO SMALL"
        
        if file_info.confidence_score < 0.5:
            return f"LOW CONFIDENCE ({file_info.confidence_score:.2f})"
        
        return "UNKNOWN REASON"
    
    def get_filter_summary(self, file_infos: List[FileInfo]) -> Dict:
        """Generate a summary of filtering results"""
        total = len(file_infos)
        approved = len([f for f in file_infos if f.confidence_score >= 0.5])
        duplicates = len([f for f in file_infos if f.is_duplicate])
        emails = len([f for f in file_infos if f.is_email])
        conversations = len([f for f in file_infos if f.is_conversation])
        
        return {
            'total_files': total,
            'approved_files': approved,
            'excluded_files': total - approved,
            'duplicates': duplicates,
            'emails': emails,
            'conversations': conversations,
            'approval_rate': approved / total if total > 0 else 0.0
        }

def main():
    """Test the file filter"""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python file_filter.py <file_path> [file_path2] ...")
        sys.exit(1)
    
    file_paths = sys.argv[1:]
    filter_engine = TankIDFileFilter()
    
    approved_files, file_infos = filter_engine.filter_files(file_paths)
    
    print(f"\nFilter Results:")
    print(f"Total files: {len(file_paths)}")
    print(f"Approved: {len(approved_files)}")
    print(f"Excluded: {len(file_paths) - len(approved_files)}")
    
    summary = filter_engine.get_filter_summary(file_infos)
    print(f"\nSummary: {summary}")

if __name__ == "__main__":
    main()
"""
TankID Intake Agent - Main Watchdog File Monitor
Monitors inbox directory and triggers batch processing of new documents
"""

import os
import time
import logging
import threading
import signal
import sys
from typing import Dict, List, Optional, Set
from pathlib import Path
from datetime import datetime, timedelta
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

from batch_processor import BatchProcessor, ProcessingResult
from review_server import run_server

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('intake_agent.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class IntakeHandler(FileSystemEventHandler):
    """Handles file system events in the inbox directory"""
    
    def __init__(self, processor: BatchProcessor, settle_seconds: int = 120):
        self.processor = processor
        self.settle_seconds = settle_seconds
        self.pending_files: Set[str] = set()
        self.last_activity: Optional[datetime] = None
        self.processing_timer: Optional[threading.Timer] = None
        self.supported_extensions = {'.pdf', '.jpg', '.jpeg', '.png', '.msg', '.txt'}
        self.lock = threading.Lock()
        
    def on_created(self, event):
        """Handle new file creation"""
        if event.is_directory:
            return
        
        file_path = event.src_path
        if self._is_supported_file(file_path):
            logger.info(f"New file detected: {file_path}")
            self._add_pending_file(file_path)
    
    def on_modified(self, event):
        """Handle file modification (e.g., file still being written)"""
        if event.is_directory:
            return
        
        file_path = event.src_path
        if self._is_supported_file(file_path):
            logger.debug(f"File modified: {file_path}")
            self._add_pending_file(file_path)
    
    def on_moved(self, event):
        """Handle file moves (e.g., temp file renamed to final name)"""
        if event.is_directory:
            return
        
        dest_path = event.dest_path
        if self._is_supported_file(dest_path):
            logger.info(f"File moved to inbox: {dest_path}")
            self._add_pending_file(dest_path)
    
    def _is_supported_file(self, file_path: str) -> bool:
        """Check if file has supported extension and is not a sync temp file"""
        path = Path(file_path)
        
        # Ignore hidden files and Google Drive sync temp files
        if path.name.startswith('.') or path.name.startswith('~$'):
            return False
        
        # Ignore Google Drive temp files
        if '.tmp' in path.name or path.name.endswith('.gsheet') or path.name.endswith('.gdoc'):
            return False
        
        return path.suffix.lower() in self.supported_extensions
    
    def _add_pending_file(self, file_path: str):
        """Add file to pending batch and reset timer"""
        with self.lock:
            # Check if file actually exists and is readable
            if not os.path.exists(file_path):
                logger.debug(f"File no longer exists: {file_path}")
                return
            
            try:
                # Try to open file to ensure it's not still being written
                with open(file_path, 'rb') as f:
                    f.read(1)
            except (PermissionError, OSError) as e:
                logger.debug(f"File not ready: {file_path} - {str(e)}")
                return
            
            self.pending_files.add(file_path)
            self.last_activity = datetime.now()
            
            # Cancel existing timer and start new one
            if self.processing_timer:
                self.processing_timer.cancel()
            
            self.processing_timer = threading.Timer(
                self.settle_seconds, 
                self._process_batch
            )
            self.processing_timer.start()
            
            logger.info(f"Batch timer reset. {len(self.pending_files)} files pending.")
    
    def _process_batch(self):
        """Process the current batch of files"""
        with self.lock:
            if not self.pending_files:
                logger.info("No pending files to process")
                return
            
            files_to_process = self.pending_files.copy()
            self.pending_files.clear()
            self.processing_timer = None
        
        logger.info(f"Starting batch processing of {len(files_to_process)} files")
        
        try:
            # Determine inbox path from first file
            if files_to_process:
                inbox_path = str(Path(list(files_to_process)[0]).parent)
                result = self.processor.process_batch(inbox_path, self.settle_seconds)
                
                logger.info(f"Batch processing completed: {result.batch_id}")
                logger.info(f"  Tanks found: {result.tanks_found}")
                logger.info(f"  Auto-confirmed: {result.tanks_auto_confirmed}")
                logger.info(f"  Requiring review: {result.tanks_requiring_review}")
                logger.info(f"  Processing time: {result.processing_time_seconds:.1f}s")
                
                if result.errors:
                    logger.warning(f"  Errors occurred: {len(result.errors)}")
                    for error in result.errors:
                        logger.warning(f"    {error}")
                
            else:
                logger.warning("No files in batch to process")
                
        except Exception as e:
            logger.error(f"Batch processing failed: {str(e)}")

class IntakeAgent:
    """Main TankID Intake Agent"""
    
    def __init__(self, inbox_path: str, settle_seconds: int = 120):
        self.inbox_path = Path(inbox_path)
        self.settle_seconds = settle_seconds
        self.processor = BatchProcessor()
        self.handler = IntakeHandler(self.processor, settle_seconds)
        self.observer = Observer()
        self.running = False
        self.review_server_thread: Optional[threading.Thread] = None
        
        # Ensure inbox directory exists
        self.inbox_path.mkdir(parents=True, exist_ok=True)
        logger.info(f"Monitoring inbox: {self.inbox_path}")
    
    def start_monitoring(self):
        """Start file system monitoring"""
        logger.info("Starting TankID Intake Agent")
        
        # Schedule the observer
        self.observer.schedule(self.handler, str(self.inbox_path), recursive=False)
        self.observer.start()
        self.running = True
        
        logger.info(f"File monitoring started on: {self.inbox_path}")
        logger.info(f"Batch settle time: {self.settle_seconds} seconds")
        
        # Process any existing files in inbox
        self._process_existing_files()
    
    def start_review_server(self, host='127.0.0.1', port=5000):
        """Start the web review server in a separate thread"""
        logger.info(f"Starting review server on {host}:{port}")
        
        def server_worker():
            try:
                run_server(host=host, port=port, debug=False)
            except Exception as e:
                logger.error(f"Review server error: {str(e)}")
        
        self.review_server_thread = threading.Thread(
            target=server_worker, 
            daemon=True,
            name="ReviewServer"
        )
        self.review_server_thread.start()
        
        logger.info("Review server started successfully")
    
    def stop_monitoring(self):
        """Stop file system monitoring"""
        if self.running:
            logger.info("Stopping TankID Intake Agent")
            self.observer.stop()
            self.observer.join()
            self.running = False
            logger.info("File monitoring stopped")
    
    def _process_existing_files(self):
        """Process any files that already exist in the inbox"""
        existing_files = []
        for file_path in self.inbox_path.rglob('*'):
            if file_path.is_file() and file_path.suffix.lower() in self.handler.supported_extensions:
                existing_files.append(str(file_path))
        
        if existing_files:
            logger.info(f"Found {len(existing_files)} existing files in inbox")
            
            # Process existing files immediately instead of adding to pending
            logger.info("Processing existing files immediately")
            try:
                result = self.processor.process_batch(str(self.inbox_path), self.settle_seconds)
                logger.info(f"Initial batch processing completed: {result.batch_id}")
                logger.info(f"  Tanks found: {result.tanks_found}")
                logger.info(f"  Auto-confirmed: {result.tanks_auto_confirmed}")
                logger.info(f"  Requiring review: {result.tanks_requiring_review}")
            except Exception as e:
                logger.error(f"Initial batch processing failed: {str(e)}")
        else:
            logger.info("No existing files found in inbox")
    
    def get_status(self) -> Dict:
        """Get current agent status"""
        return {
            'running': self.running,
            'inbox_path': str(self.inbox_path),
            'pending_files': len(self.handler.pending_files),
            'last_activity': self.handler.last_activity.isoformat() if self.handler.last_activity else None,
            'settle_seconds': self.settle_seconds,
            'review_server_running': self.review_server_thread is not None and self.review_server_thread.is_alive()
        }

def signal_handler(signum, frame):
    """Handle shutdown signals"""
    logger.info(f"Received signal {signum}, shutting down...")
    global agent
    if agent:
        agent.stop_monitoring()
    sys.exit(0)

def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='TankID Intake Agent')
    parser.add_argument('--inbox', required=True, help='Path to inbox directory to monitor')
    parser.add_argument('--settle-time', type=int, default=120, 
                       help='Seconds to wait for batch to settle before processing (default: 120)')
    parser.add_argument('--review-server', action='store_true', 
                       help='Start the web review server')
    parser.add_argument('--review-host', default='127.0.0.1',
                       help='Host for review server (default: 127.0.0.1)')
    parser.add_argument('--review-port', type=int, default=5000,
                       help='Port for review server (default: 5000)')
    parser.add_argument('--process-existing', action='store_true',
                       help='Process existing files in inbox on startup')
    
    args = parser.parse_args()
    
    # Validate inbox path
    inbox_path = Path(args.inbox)
    if not inbox_path.exists():
        logger.error(f"Inbox path does not exist: {inbox_path}")
        sys.exit(1)
    
    # Set up signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Create and start the agent
    global agent
    agent = IntakeAgent(str(inbox_path), args.settle_time)
    
    try:
        # Start monitoring
        agent.start_monitoring()
        
        # Start review server if requested
        if args.review_server:
            agent.start_review_server(args.review_host, args.review_port)
            logger.info(f"Review interface available at: http://{args.review_host}:{args.review_port}")
        
        # Keep the main thread alive
        logger.info("TankID Intake Agent is running. Press Ctrl+C to stop.")
        
        while agent.running:
            time.sleep(1)
            
            # Log status periodically
            if int(time.time()) % 300 == 0:  # Every 5 minutes
                status = agent.get_status()
                logger.info(f"Status: {status['pending_files']} pending files, "
                           f"last activity: {status['last_activity'] or 'none'}")
    
    except KeyboardInterrupt:
        logger.info("Keyboard interrupt received")
    
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise
    
    finally:
        agent.stop_monitoring()

if __name__ == "__main__":
    main()
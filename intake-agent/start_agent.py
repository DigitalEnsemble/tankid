#!/usr/bin/env python3
"""
Start the TankID Intake Agent with Google Drive paths
"""
import os
import sys
from pathlib import Path

# Load environment variables from .env.local
from dotenv import load_dotenv
load_dotenv('.env.local')

from intake_agent import main

if __name__ == "__main__":
    # Override sys.argv to pass the correct arguments
    inbox_path = os.path.expanduser("~/Library/CloudStorage/GoogleDrive-casey.wells@tankid.io/My Drive/TankID/Intake/inbox")
    
    sys.argv = [
        'intake_agent.py',
        '--inbox', inbox_path,
        '--review-server',
        '--review-host', '0.0.0.0',
        '--review-port', '5000',
        '--settle-time', '10'  # Shorter for testing
    ]
    
    print(f"🚀 Starting TankID Intake Agent...")
    print(f"📂 Inbox: {inbox_path}")
    print(f"🌐 Review UI: http://localhost:5000")
    print(f"⏱️  Settle time: 10 seconds (test mode)")
    print(f"📊 Found {len(list(Path(inbox_path).glob('*')))} files in inbox")
    print()
    
    main()
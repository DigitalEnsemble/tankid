#!/usr/bin/env python3
"""
Launch script for TankID Intake Agent with local development setup
"""
import os
import sys

# Set environment variables for local development
os.environ['INTAKE_INBOX_PATH'] = '/Users/charlesroehrig/Library/CloudStorage/GoogleDrive-casey.wells@tankid.io/My Drive/TankID/intake/inbox'
# ANTHROPIC_API_KEY should be provided via Doppler
# Run with: doppler run --project tankid --config prd -- python3 launch_local.py

# Launch the intake agent
from intake_agent import main

if __name__ == '__main__':
    # Simulate command line arguments
    sys.argv = [
        'intake_agent.py',
        '--inbox', os.environ['INTAKE_INBOX_PATH'],
        '--review-server',
        '--review-host', '0.0.0.0'
    ]
    
    print("🚀 Starting TankID Intake Agent (Local Development Mode)")
    print(f"📁 Monitoring: {os.environ['INTAKE_INBOX_PATH']}")
    print("🌐 Review UI: http://localhost:5000")
    print("💾 Database: Local JSON files (mock_data/)")
    print()
    
    main()
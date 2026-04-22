#!/bin/bash
cd /Users/charlesroehrig/tankid/intake-agent

echo "🚀 Starting TankID Intake Agent (Fixed Version with Polling)"
echo "📁 Monitoring Google Drive inbox with watchdog + polling fallback"

# Use the fixed version with polling support
python3 intake_agent_fixed.py --inbox "/Users/charlesroehrig/Library/CloudStorage/GoogleDrive-casey.wells@tankid.io/My Drive/TankID/intake/inbox" --review-server --process-existing --poll-interval 30
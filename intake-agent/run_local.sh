#!/bin/bash
cd /Users/charlesroehrig/tankid/intake-agent

export INTAKE_INBOX_PATH="/Users/charlesroehrig/Library/CloudStorage/GoogleDrive-casey.wells@tankid.io/My Drive/TankID/intake/inbox"
# ANTHROPIC_API_KEY provided by Doppler
# Run with: doppler run --project tankid --config prd -- ./run_local.sh

echo "🚀 Starting TankID Intake Agent (Local Mode)"
echo "📁 Inbox: $INTAKE_INBOX_PATH" 
echo "🌐 Review UI: http://localhost:5000"
echo "💾 Database: Local JSON files"
echo

python3 intake_agent.py --inbox "$INTAKE_INBOX_PATH" --review-server --review-host 0.0.0.0
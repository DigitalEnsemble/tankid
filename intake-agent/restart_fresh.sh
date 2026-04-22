#!/bin/bash

# TankID Intake Agent - Fresh Start Script
# Starts the intake agent with clean state for testing

echo "🚀 Starting TankID Intake Agent (Fresh State)"
echo "📊 Database: Local JSON storage (mock_data/)"
echo "📁 Inbox: Google Drive cloud storage"
echo "🌐 Review Server: http://localhost:5000"
echo

cd /Users/charlesroehrig/tankid/intake-agent

python3 intake_agent.py \
  --inbox "/Users/charlesroehrig/Library/CloudStorage/GoogleDrive-casey.wells@tankid.io/My Drive/TankID/intake/inbox" \
  --review-server \
  --process-existing
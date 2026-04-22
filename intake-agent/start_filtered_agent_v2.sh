#!/bin/bash

# TankID Intake Agent - V2 with Smart Filtering and Deduplication
# Uses improved batch processor with content-based deduplication and email filtering

echo "🚀 Starting TankID Intake Agent V2 (Smart Filtering + Deduplication)"
echo "📊 Database: Local JSON storage (mock_data/)"
echo "📁 Inbox: Google Drive cloud storage"
echo "🌐 Review Server: http://localhost:5000"
echo "✨ NEW: Content-based deduplication and email filtering"
echo

cd /Users/charlesroehrig/tankid/intake-agent

# Temporarily rename the old batch processor and use the improved version
if [ ! -f "batch_processor_original.py" ]; then
    echo "📋 Backing up original batch processor..."
    cp batch_processor.py batch_processor_original.py
fi

echo "📋 Switching to improved batch processor..."
cp batch_processor_improved.py batch_processor.py

python3 intake_agent.py \
  --inbox "/Users/charlesroehrig/Library/CloudStorage/GoogleDrive-casey.wells@tankid.io/My Drive/TankID/intake/inbox" \
  --review-server \
  --process-existing
#!/bin/bash
cd /Users/charlesroehrig/tankid/intake-agent

echo "🛡️  Starting TankID Intake Agent - FILTERED VERSION"
echo "✅ NEW FEATURES:"
echo "   • Duplicate detection (content-based)"
echo "   • Email filtering (.msg, email content)"
echo "   • Conversation filtering (informal text)"
echo "   • Quarantine system for excluded files"
echo ""
echo "📁 Monitoring Google Drive inbox with enhanced filtering..."

# Use the fixed version with advanced file filtering
python3 intake_agent_fixed.py \
  --inbox "/Users/charlesroehrig/Library/CloudStorage/GoogleDrive-casey.wells@tankid.io/My Drive/TankID/intake/inbox" \
  --review-server \
  --process-existing \
  --poll-interval 30
#!/bin/bash
# TankID HTTP Production Sync Runner
# Syncs intake agent data via tankid-api HTTP endpoint

echo "🚀 TankID HTTP Production Sync"
echo "============================="

cd /Users/charlesroehrig/tankid/intake-agent

# Step 1: Test with dry run first
echo "🧪 Step 1: HTTP Dry Run Test..."
python3 intake_sync_http.py --dry-run

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Dry run successful!"
    echo ""
    read -p "🔥 Proceed with ACTUAL production sync? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🚀 Step 2: HTTP Production Sync..."
        python3 intake_sync_http.py
        
        if [ $? -eq 0 ]; then
            echo ""
            echo "🎉 HTTP production sync completed successfully!"
            echo "📊 Check https://tankid-api.fly.dev for updated data"
        else
            echo ""
            echo "❌ HTTP production sync failed. Check logs above."
            exit 1
        fi
    else
        echo "⏸️ Production sync cancelled."
    fi
else
    echo ""
    echo "❌ Dry run failed. Fix issues before production sync."
    exit 1
fi
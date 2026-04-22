#!/bin/bash
# TankID Production Sync Runner
# Syncs intake agent data to Fly.io production database and R2 storage

echo "🚀 TankID Production Sync"
echo "========================"

cd /Users/charlesroehrig/tankid/intake-agent

# Step 1: Test with dry run first
echo "🧪 Step 1: Dry Run Test..."
doppler run --project tankid --config prd -- python3 production_sync.py --dry-run

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Dry run successful!"
    echo ""
    read -p "🔥 Proceed with ACTUAL production sync? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🚀 Step 2: Production Sync..."
        doppler run --project tankid --config prd -- python3 production_sync.py
        
        if [ $? -eq 0 ]; then
            echo ""
            echo "🎉 Production sync completed successfully!"
            echo "📊 Check https://tankid-api.fly.dev for updated data"
        else
            echo ""
            echo "❌ Production sync failed. Check logs above."
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
#!/usr/bin/env python3
"""
Test script to run the intake agent
"""
import os
import sys

# Set environment variables
os.environ['ANTHROPIC_API_KEY'] = ''
os.environ['DATABASE_URL'] = 'postgresql://fly-user:vSjbubZ6CTzUX9q1Whs2IFMm@pgbouncer.zp2wjrek4z4rdn4q.flympg.net/fly-db'
os.environ['R2_ACCOUNT_ID'] = '76f520916452e2d7df69cf3eb5c6412a'
os.environ['R2_ACCESS_KEY_ID'] = 'c50324924fe9aefd5eeb8ea45b69fa35'
os.environ['R2_SECRET_ACCESS_KEY'] = '40431e78a1c1aea6e5fca5795aa8b8f125261b081a94510521aeb83bf315d7fd'
os.environ['R2_BUCKET_NAME'] = 'tankid-docs'
os.environ['R2_PUBLIC_URL'] = 'https://docs.tankid.io'

# Import and run
from intake_agent import IntakeAgent

def main():
    inbox_path = "/tmp/tankid-test/inbox"
    
    print(f"Starting TankID Intake Agent test...")
    print(f"Inbox path: {inbox_path}")
    
    # Create intake agent
    agent = IntakeAgent(inbox_path, settle_seconds=10)  # Shorter for testing
    
    try:
        # Start monitoring
        agent.start_monitoring()
        print("✅ File monitoring started successfully")
        
        # Start review server
        agent.start_review_server(host='0.0.0.0', port=5000)
        print("✅ Review server started on http://0.0.0.0:5000")
        
        # Show status
        status = agent.get_status()
        print(f"📊 Status: {status}")
        
        print("\n🎯 Test complete! The intake agent would normally keep running.")
        print("   You can now put test files in /tmp/tankid-test/inbox to trigger processing.")
        print("   Visit http://localhost:5000 for the review interface.")
        
        # Keep it running briefly for demo
        import time
        print("   Running for 5 seconds to demo...")
        time.sleep(5)
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        
    finally:
        agent.stop_monitoring()
        print("✅ Stopped monitoring")

if __name__ == "__main__":
    main()
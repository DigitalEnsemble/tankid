#!/usr/bin/env python3

import os
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv('.env.local')

def verify_database():
    """Verify database schema is ready for intake agent."""
    try:
        conn = psycopg2.connect(
            os.environ['DATABASE_URL'],
            cursor_factory=psycopg2.extras.RealDictCursor
        )
        
        with conn.cursor() as cur:
            # Check for required tables
            cur.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('facilities', 'tanks', 'tank_models', 'documents', 'tank_field_sources', 'pending_documents')
                ORDER BY table_name
            """)
            
            tables = [row['table_name'] for row in cur.fetchall()]
            required_tables = ['facilities', 'tanks', 'tank_models', 'documents', 'tank_field_sources', 'pending_documents']
            
            print("Database Schema Check:")
            for table in required_tables:
                if table in tables:
                    print(f"✅ {table}")
                else:
                    print(f"❌ {table} - MISSING")
            
            # Check pending_documents structure
            if 'pending_documents' in tables:
                cur.execute("""
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = 'pending_documents' 
                    ORDER BY ordinal_position
                """)
                
                columns = cur.fetchall()
                print("\npending_documents columns:")
                for col in columns:
                    print(f"  {col['column_name']}: {col['data_type']}")
            
            missing = set(required_tables) - set(tables)
            if missing:
                print(f"\n❌ Missing tables: {missing}")
                print("Run migration 003 first!")
                return False
            else:
                print("\n✅ Database schema ready!")
                return True
                
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False
    finally:
        if 'conn' in locals():
            conn.close()

def verify_environment():
    """Verify required environment variables."""
    required_vars = [
        'ANTHROPIC_API_KEY',
        'DATABASE_URL', 
        'R2_ACCOUNT_ID',
        'R2_ACCESS_KEY_ID',
        'R2_SECRET_ACCESS_KEY',
        'R2_BUCKET_NAME',
        'INTAKE_INBOX_PATH',
        'INTAKE_PROCESSED_PATH'
    ]
    
    print("Environment Variables Check:")
    missing = []
    for var in required_vars:
        value = os.environ.get(var)
        if value:
            print(f"✅ {var}")
        else:
            print(f"❌ {var} - MISSING")
            missing.append(var)
    
    if missing:
        print(f"\n❌ Missing environment variables: {missing}")
        print("Check your .env.local file!")
        return False
    else:
        print("\n✅ Environment variables ready!")
        return True

def verify_folders():
    """Verify intake folder structure exists."""
    folders = [
        'INTAKE_INBOX_PATH',
        'INTAKE_PROCESSING_PATH', 
        'INTAKE_PROCESSED_PATH',
        'INTAKE_FAILED_PATH'
    ]
    
    print("Folder Structure Check:")
    missing = []
    for folder_env in folders:
        path = os.environ.get(folder_env)
        if path:
            from pathlib import Path
            folder_path = Path(path).expanduser()
            if folder_path.exists():
                print(f"✅ {folder_env}: {folder_path}")
            else:
                print(f"⚠️  {folder_env}: {folder_path} (will be created)")
        else:
            print(f"❌ {folder_env} - NOT SET")
            missing.append(folder_env)
    
    if missing:
        print(f"\n❌ Missing folder environment variables: {missing}")
        return False
    else:
        print("\n✅ Folder configuration ready!")
        return True

if __name__ == '__main__':
    print("TankID Intake Agent Setup Verification")
    print("=" * 50)
    
    checks = [
        verify_environment(),
        verify_database(), 
        verify_folders()
    ]
    
    if all(checks):
        print("\n🎉 SETUP COMPLETE! Ready to run intake agent.")
        print("\nTo start watching:")
        print("  cd intake-agent")
        print("  python intake_agent.py --watch")
    else:
        print("\n❌ Setup incomplete. Fix the issues above first.")
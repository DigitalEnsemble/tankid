"""
Production database wrapper for TankID PostgreSQL on Fly.io
Handles syncing intake data to production database
"""
import os
import psycopg2
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)

class ProductionDatabaseManager:
    """Production PostgreSQL database manager"""
    
    def __init__(self, database_url: str = None):
        self.database_url = database_url or os.environ.get('DATABASE_URL')
        if not self.database_url:
            raise ValueError("DATABASE_URL environment variable is required")
        
        self.conn = None
        self.connect()
        logger.info("🚀 ProductionDatabaseManager: Connected to PostgreSQL")
    
    def connect(self):
        """Connect to PostgreSQL database"""
        try:
            self.conn = psycopg2.connect(self.database_url)
            self.conn.autocommit = False  # Use transactions
        except Exception as e:
            logger.error(f"Failed to connect to production database: {e}")
            raise
    
    def execute_query(self, query: str, params: tuple = None, fetch: bool = False):
        """Execute a query with optional parameters"""
        cursor = None
        try:
            cursor = self.conn.cursor()
            cursor.execute(query, params or ())
            
            if fetch:
                if query.strip().upper().startswith('SELECT'):
                    return cursor.fetchall()
                else:
                    return cursor.rowcount
            
            self.conn.commit()
            return cursor.rowcount
            
        except Exception as e:
            self.conn.rollback()
            logger.error(f"Query failed: {query[:100]}... Error: {e}")
            raise
        finally:
            if cursor:
                cursor.close()
    
    def find_or_create_facility(self, facility_data: Dict) -> str:
        """Find existing facility or create new one"""
        try:
            # Extract facility info from intake data
            facility_name = facility_data.get('facility_name', 'Unknown Facility')
            facility_address = facility_data.get('facility_address', '')
            
            # Parse address components (basic parsing)
            address_parts = facility_address.split(', ')
            if len(address_parts) >= 3:
                street_address = ', '.join(address_parts[:-2])
                city = address_parts[-2]
                state_zip = address_parts[-1].split(' ')
                state = state_zip[0] if len(state_zip) > 0 else 'CO'
                zip_code = state_zip[1] if len(state_zip) > 1 else ''
            else:
                street_address = facility_address
                city = 'Unknown'
                state = 'CO'
                zip_code = ''
            
            # Check for existing facility by name + address
            cursor = self.conn.cursor()
            cursor.execute("""
                SELECT id FROM facilities 
                WHERE name = %s AND address = %s
            """, (facility_name, street_address))
            
            result = cursor.fetchone()
            if result:
                cursor.close()
                logger.info(f"📍 Found existing facility: {facility_name}")
                return str(result[0])
            
            # Create new facility
            facility_id = str(uuid.uuid4())
            # Use client_facility_number if provided, else generate a placeholder
            state_facility_id = (
                facility_data.get('client_facility_number')
                or facility_data.get('state_facility_id')
                or f"INTAKE_{facility_id[:8]}"
            )
            state_code = state[:2].upper()
            cursor.execute("""
                INSERT INTO facilities (
                    id, state_code, state_facility_id, client_facility_id, name, address, city, state, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
            """, (
                facility_id,
                state_code,
                state_facility_id,
                state_facility_id,
                facility_name,
                street_address,
                city,
                state_code,
            ))
            
            self.conn.commit()
            cursor.close()
            
            logger.info(f"🏗️ Created new facility: {facility_name} ({facility_id})")
            return facility_id
            
        except Exception as e:
            self.conn.rollback()
            logger.error(f"Error finding/creating facility: {e}")
            raise
    
    def find_or_create_site_location(self, facility_id: str, site_name: str = "Main Site") -> str:
        """Find or create site location for facility"""
        try:
            # Check for existing site location
            cursor = self.conn.cursor()
            cursor.execute("""
                SELECT id FROM site_locations 
                WHERE facility_id = %s AND site_name = %s
            """, (facility_id, site_name))
            
            result = cursor.fetchone()
            if result:
                cursor.close()
                logger.info(f"📍 Found existing site location: {site_name}")
                return str(result[0])
            
            # Create new site location
            site_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO site_locations (id, facility_id, site_name, created_at)
                VALUES (%s, %s, %s, NOW())
            """, (site_id, facility_id, site_name))
            
            self.conn.commit()
            cursor.close()
            
            logger.info(f"🏗️ Created new site location: {site_name} ({site_id})")
            return site_id
            
        except Exception as e:
            self.conn.rollback()
            logger.error(f"Error finding/creating site location: {e}")
            raise
    
    def find_or_create_tank_model(self, tank_data: Dict) -> Optional[str]:
        """Find or create tank model"""
        try:
            # Extracted fields live under extracted_data; fall back to top-level keys
            extracted = tank_data.get('extracted_data', {})
            manufacturer = (extracted.get('manufacturer') or
                            tank_data.get('manufacturer', 'Unknown'))
            capacity = (extracted.get('capacity_gallons') or
                        tank_data.get('capacity_gallons') or
                        tank_data.get('capacity'))
            
            if not capacity:
                capacity_gallons = 0  # Store 0 rather than skip — avoids null model
            else:
                # Try to parse capacity as integer
                try:
                    capacity_gallons = int(str(capacity).replace(',', '').split()[0])
                except (ValueError, IndexError):
                    capacity_gallons = 0
            
            # Check for existing model
            cursor = self.conn.cursor()
            cursor.execute("""
                SELECT id FROM tank_models 
                WHERE manufacturer = %s AND capacity_gallons = %s
            """, (manufacturer, capacity_gallons))
            
            result = cursor.fetchone()
            if result:
                cursor.close()
                return str(result[0])
            
            # Create new model
            model_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO tank_models (id, manufacturer, model_name, capacity_gallons, created_at)
                VALUES (%s, %s, %s, %s, NOW())
            """, (model_id, manufacturer, f"{manufacturer} {capacity_gallons}gal", capacity_gallons))
            
            self.conn.commit()
            cursor.close()
            
            logger.info(f"🏗️ Created tank model: {manufacturer} {capacity_gallons}gal")
            return model_id
            
        except Exception as e:
            self.conn.rollback()
            logger.error(f"Error finding/creating tank model: {e}")
            return None
    
    def sync_tank_to_production(self, tank_data: Dict) -> tuple[str, str]:
        """Sync a tank from intake agent to production database"""
        try:
            logger.info(f"🔄 Syncing tank: {tank_data.get('serial_number', 'Unknown')}")
            
            # Step 1: Find or create facility
            facility_id = self.find_or_create_facility(tank_data)
            
            # Step 2: Find or create site location
            site_location_id = self.find_or_create_site_location(facility_id)
            
            # Step 3: Find or create tank model
            tank_model_id = self.find_or_create_tank_model(tank_data)
            
            # Step 4: Check for existing tank by serial number + facility
            cursor = self.conn.cursor()
            cursor.execute("""
                SELECT t.id FROM tanks t
                JOIN site_locations sl ON sl.id = t.site_location_id
                WHERE t.serial_number = %s AND sl.facility_id = %s
            """, (tank_data.get('serial_number'), facility_id))
            
            existing_tank = cursor.fetchone()
            
            extracted = tank_data.get('extracted_data', {})

            # Derive tank_type: prefer extracted, then serial prefix, then AST
            raw_type = (extracted.get('tank_type') or tank_data.get('tank_type') or '').upper()
            serial = (tank_data.get('serial_number') or '').upper()
            tank_type = 'UST' if ('UST' in raw_type or serial.startswith('UST')) else 'AST'

            # installation_date
            install_date = (extracted.get('installation_date') or
                            tank_data.get('installation_date') or
                            tank_data.get('install_date') or None)

            # product / contents
            product_grade = (extracted.get('contents') or
                             extracted.get('product_grade') or
                             tank_data.get('product_grade') or None)

            # material / dimensions (stored in tank_models or as tank notes — pass through)
            material = extracted.get('material') or tank_data.get('material')
            dimensions = extracted.get('dimensions') or tank_data.get('dimensions')

            if existing_tank:
                tank_id = str(existing_tank[0])
                logger.info(f"✅ Tank exists in production: {tank_id} — updating fields")
                # Update fields that may have been missing on first sync
                cursor.execute("""
                    UPDATE tanks SET
                        tank_type = COALESCE(NULLIF(%s,''), tank_type),
                        install_date = COALESCE(%s, install_date),
                        product_grade = COALESCE(%s, product_grade),
                        updated_at = NOW()
                    WHERE id = %s
                """, (tank_type, install_date, product_grade, tank_id))
                self.conn.commit()
                cursor.close()
                return tank_id, facility_id
            
            # Step 5: Create new tank
            tank_id = str(uuid.uuid4())
            
            cursor.execute("""
                INSERT INTO tanks (
                    id, site_location_id, model_id, tank_type, serial_number,
                    install_date, install_contractor, product_grade, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
            """, (
                tank_id,
                site_location_id,
                tank_model_id,
                tank_type,
                tank_data.get('serial_number'),
                install_date,
                tank_data.get('install_contractor'),
                product_grade
            ))
            
            self.conn.commit()
            cursor.close()
            
            logger.info(f"🎯 Created tank in production: {tank_id}")
            return tank_id, facility_id
            
        except Exception as e:
            self.conn.rollback()
            logger.error(f"Error syncing tank to production: {e}")
            raise
    
    def sync_document_metadata(self, document_data: Dict, r2_key: str,
                                facility_id: str = None, tank_id: str = None) -> str:
        """Sync document metadata to production (after R2 upload)"""
        try:
            doc_id = str(uuid.uuid4())
            fname = document_data.get('original_filename', '')
            linked = [tank_id] if tank_id else []
            r2_public_url = os.environ.get('R2_PUBLIC_URL', '').rstrip('/')
            file_path = f"{r2_public_url}/{r2_key}" if r2_public_url else r2_key

            cursor = self.conn.cursor()
            cursor.execute("""
                INSERT INTO tank_documents (
                    id, filename, original_filename, doc_type, file_path,
                    file_size, mime_type, linked_tanks, facility_id,
                    uploaded_by, is_public, r2_key, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s::uuid[], %s, %s, %s, %s, NOW(), NOW())
            """, (
                doc_id,
                fname,
                fname,
                document_data.get('document_type', 'other'),
                file_path,
                document_data.get('file_size', 0),
                'application/pdf',
                linked,
                facility_id,
                'intake-agent',
                False,
                r2_key,
            ))

            self.conn.commit()
            cursor.close()

            logger.info(f"📄 Synced document metadata: {fname}")
            return doc_id

        except Exception as e:
            self.conn.rollback()
            logger.error(f"Error syncing document metadata: {e}")
            raise
    
    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()
            logger.info("🔌 Database connection closed")

# Example usage
if __name__ == "__main__":
    import os
    
    # Test with Doppler secrets
    db = ProductionDatabaseManager()
    
    # Test facility creation
    test_facility = {
        'facility_name': 'Test Hospital',
        'facility_address': '123 Test St, Test City, CO 80120'
    }
    
    facility_id = db.find_or_create_facility(test_facility)
    print(f"Facility ID: {facility_id}")
    
    db.close()
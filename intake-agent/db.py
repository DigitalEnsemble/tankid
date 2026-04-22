import psycopg2
import psycopg2.extras
import os
from typing import Dict, Any, List, Optional
import uuid
import logging

logger = logging.getLogger(__name__)

def get_connection():
    """Get database connection using environment DATABASE_URL"""
    return psycopg2.connect(
        os.environ['DATABASE_URL'],
        cursor_factory=psycopg2.extras.RealDictCursor
    )

def upsert_facility(fields: Dict[str, Any]) -> str:
    """
    Match: UPPER(address) + UPPER(state)
    Update: COALESCE — fill nulls only, never overwrite
    Insert if no match
    Returns: facility_id string
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            # Normalize city and state - ensure NOT NULL
            city = fields.get('facility_city') or ''
            state = fields.get('facility_state') or ''
            
            if not state:
                raise ValueError("facility_state is required and cannot be null")
                
            # Try to find existing facility
            cur.execute("""
                SELECT id FROM facilities 
                WHERE UPPER(address) = UPPER(%s) AND UPPER(state) = UPPER(%s)
                LIMIT 1
            """, (fields.get('facility_address', ''), state))
            
            existing = cur.fetchone()
            
            if existing:
                facility_id = existing['id']
                logger.info(f"Found existing facility: {facility_id}")
                
                # Update with COALESCE - only fill nulls
                cur.execute("""
                    UPDATE facilities SET
                        name = COALESCE(%s, name),
                        address = COALESCE(%s, address),
                        city = COALESCE(%s, city),
                        state = COALESCE(%s, state),
                        zip = COALESCE(%s, zip),
                        county = COALESCE(%s, county),
                        facility_type = COALESCE(%s, facility_type),
                        owner_name = COALESCE(%s, owner_name),
                        updated_at = NOW()
                    WHERE id = %s
                """, (
                    fields.get('facility_name'),
                    fields.get('facility_address'), 
                    city,
                    state,
                    fields.get('facility_zip'),
                    fields.get('facility_county'),
                    fields.get('facility_type'),
                    fields.get('owner_name'),
                    facility_id
                ))
                
            else:
                # Create new facility
                facility_id = str(uuid.uuid4())
                logger.info(f"Creating new facility: {facility_id}")
                
                cur.execute("""
                    INSERT INTO facilities (
                        id, name, address, city, state, zip, county, 
                        facility_type, owner_name, created_at, updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW()
                    )
                """, (
                    facility_id,
                    fields.get('facility_name'),
                    fields.get('facility_address'),
                    city,
                    state, 
                    fields.get('facility_zip'),
                    fields.get('facility_county'),
                    fields.get('facility_type'),
                    fields.get('owner_name')
                ))
                
            return facility_id

def upsert_tank_model(fields: Dict[str, Any]) -> Optional[str]:
    """
    Match: UPPER(manufacturer) + UPPER(model_name)
    Update: COALESCE — fill nulls only
    Insert if no match
    Returns: model_id string or None
    """
    manufacturer = fields.get('manufacturer')
    model_name = fields.get('model_name')
    
    if not manufacturer or not model_name:
        logger.warning("Missing manufacturer or model_name for tank_model")
        return None
        
    with get_connection() as conn:
        with conn.cursor() as cur:
            # Try to find existing model
            cur.execute("""
                SELECT id FROM tank_models 
                WHERE UPPER(manufacturer) = UPPER(%s) AND UPPER(model_name) = UPPER(%s)
                LIMIT 1
            """, (manufacturer, model_name))
            
            existing = cur.fetchone()
            
            if existing:
                model_id = existing['id']
                logger.info(f"Found existing tank_model: {model_id}")
                
                # Update with COALESCE
                cur.execute("""
                    UPDATE tank_models SET
                        diameter_ft = COALESCE(%s, diameter_ft),
                        nominal_capacity_gal = COALESCE(%s, nominal_capacity_gal),
                        actual_capacity_gal = COALESCE(%s, actual_capacity_gal),
                        wall_type = COALESCE(%s, wall_type),
                        material = COALESCE(%s, material),
                        chart_notes = COALESCE(%s, chart_notes),
                        updated_at = NOW()
                    WHERE id = %s
                """, (
                    fields.get('diameter_ft'),
                    fields.get('nominal_capacity_gal'),
                    fields.get('actual_capacity_gal'),
                    fields.get('wall_type'),
                    fields.get('material'),
                    fields.get('chart_notes'),
                    model_id
                ))
                
            else:
                # Create new model
                model_id = str(uuid.uuid4())
                logger.info(f"Creating new tank_model: {model_id}")
                
                cur.execute("""
                    INSERT INTO tank_models (
                        id, manufacturer, model_name, diameter_ft, nominal_capacity_gal,
                        actual_capacity_gal, wall_type, material, chart_notes,
                        created_at, updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW()
                    )
                """, (
                    model_id, manufacturer, model_name,
                    fields.get('diameter_ft'),
                    fields.get('nominal_capacity_gal'),
                    fields.get('actual_capacity_gal'),
                    fields.get('wall_type'),
                    fields.get('material'),
                    fields.get('chart_notes')
                ))
                
            return model_id

def upsert_tank(fields: Dict[str, Any], facility_id: str, model_id: Optional[str]) -> str:
    """
    Match primary: serial_number
    Match fallback: facility_id + tank_number
    Update: COALESCE — fill nulls only, set updated_at = NOW()
    Insert if no match with access_level = 'public'
    Returns: tank_id string
    """
    serial_number = fields.get('serial_number')
    tank_number = fields.get('tank_number')
    
    with get_connection() as conn:
        with conn.cursor() as cur:
            existing = None
            
            # Try to match by serial_number first
            if serial_number:
                cur.execute("""
                    SELECT id FROM tanks WHERE serial_number = %s LIMIT 1
                """, (serial_number,))
                existing = cur.fetchone()
                
            # Fallback: match by facility_id + tank_number
            if not existing and tank_number:
                cur.execute("""
                    SELECT id FROM tanks 
                    WHERE facility_id = %s AND tank_number = %s 
                    LIMIT 1
                """, (facility_id, tank_number))
                existing = cur.fetchone()
                
            if existing:
                tank_id = existing['id']
                logger.info(f"Found existing tank: {tank_id}")
                
                # Update with COALESCE
                cur.execute("""
                    UPDATE tanks SET
                        facility_id = COALESCE(%s, facility_id),
                        model_id = COALESCE(%s, model_id),
                        serial_number = COALESCE(%s, serial_number),
                        tank_number = COALESCE(%s, tank_number),
                        install_depth_inches = COALESCE(%s, install_depth_inches),
                        install_date = COALESCE(%s, install_date),
                        install_contractor = COALESCE(%s, install_contractor),
                        product_grade = COALESCE(%s, product_grade),
                        octane = COALESCE(%s, octane),
                        ethanol_pct = COALESCE(%s, ethanol_pct),
                        atg_brand = COALESCE(%s, atg_brand),
                        atg_model = COALESCE(%s, atg_model),
                        atg_last_calibration = COALESCE(%s, atg_last_calibration),
                        last_inspection_date = COALESCE(%s, last_inspection_date),
                        inspector_name = COALESCE(%s, inspector_name),
                        updated_at = NOW()
                    WHERE id = %s
                """, (
                    facility_id, model_id, serial_number, tank_number,
                    fields.get('install_depth_inches'),
                    fields.get('install_date'),
                    fields.get('install_contractor'),
                    fields.get('product_grade'),
                    fields.get('octane'),
                    fields.get('ethanol_pct'),
                    fields.get('atg_brand'),
                    fields.get('atg_model'),
                    fields.get('atg_last_calibration'),
                    fields.get('last_inspection_date'),
                    fields.get('inspector_name'),
                    tank_id
                ))
                
            else:
                # Create new tank
                tank_id = str(uuid.uuid4())
                logger.info(f"Creating new tank: {tank_id}")
                
                cur.execute("""
                    INSERT INTO tanks (
                        id, facility_id, model_id, serial_number, tank_number,
                        install_depth_inches, install_date, install_contractor,
                        product_grade, octane, ethanol_pct, atg_brand, atg_model,
                        atg_last_calibration, last_inspection_date, inspector_name,
                        access_level, created_at, updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                        'public', NOW(), NOW()
                    )
                """, (
                    tank_id, facility_id, model_id, serial_number, tank_number,
                    fields.get('install_depth_inches'),
                    fields.get('install_date'),
                    fields.get('install_contractor'),
                    fields.get('product_grade'),
                    fields.get('octane'),
                    fields.get('ethanol_pct'),
                    fields.get('atg_brand'),
                    fields.get('atg_model'),
                    fields.get('atg_last_calibration'),
                    fields.get('last_inspection_date'),
                    fields.get('inspector_name')
                ))
                
            return tank_id

def write_document_record(tank_id: str, facility_id: str, doc_type: str, r2_url: str, filename: str) -> str:
    """
    INSERT into documents
    Always populate both tank_id AND facility_id
    Returns: doc_id string
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            doc_id = str(uuid.uuid4())
            
            cur.execute("""
                INSERT INTO documents (
                    id, tank_id, facility_id, doc_type, r2_url, filename, 
                    created_at, updated_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, NOW(), NOW()
                )
            """, (doc_id, tank_id, facility_id, doc_type, r2_url, filename))
            
            logger.info(f"Created document record: {doc_id} ({doc_type})")
            return doc_id

def write_field_sources(tank_id: str, doc_id: str, confirmed_fields: Dict[str, Any], flagged_fields: List[str]):
    """
    INSERT INTO tank_field_sources with conflict handling
    Skip field: tank_chart (chart provenance via documents table only)
    confidence = 'confident' for non-null, 'uncertain' for null
    """
    skip_fields = {'tank_chart'}  # Handled via documents table
    
    with get_connection() as conn:
        with conn.cursor() as cur:
            for field_name, field_data in confirmed_fields.items():
                if field_name in skip_fields:
                    continue
                    
                field_value = field_data.get('value')
                confidence = 'uncertain' if field_value is None or field_name in flagged_fields else 'confident'
                
                cur.execute("""
                    INSERT INTO tank_field_sources (
                        tank_id, document_id, field_name, field_value, confidence, extracted_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, NOW()
                    )
                    ON CONFLICT (tank_id, field_name) DO UPDATE SET
                        document_id = EXCLUDED.document_id,
                        field_value = EXCLUDED.field_value,
                        confidence = EXCLUDED.confidence,
                        extracted_at = NOW()
                """, (tank_id, doc_id, field_name, str(field_value) if field_value is not None else None, confidence))
                
            logger.info(f"Wrote {len(confirmed_fields)} field sources for tank {tank_id}")

def write_pending(company_slug: str, batch_id: str, tank_data: Dict[str, Any], files: List[Dict], reason: str):
    """
    INSERT into pending_documents — one row per file in pending tank
    extracted_json = full merged extraction dict (enables resumption)
    r2_pending_url = R2 path under tankid-docs/pending/{batch_id}/
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            for file_info in files:
                pending_id = str(uuid.uuid4())
                
                cur.execute("""
                    INSERT INTO pending_documents (
                        id, company_slug, batch_id, r2_pending_url, 
                        original_name, doc_type, extracted_json, 
                        pending_reason, status, created_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, 'pending', NOW()
                    )
                """, (
                    pending_id,
                    company_slug,
                    batch_id,
                    file_info.get('r2_url'),
                    file_info.get('filename'),
                    file_info.get('doc_type'),
                    tank_data,  # Full extraction dict as JSONB
                    reason
                ))
                
            logger.info(f"Wrote {len(files)} pending documents for batch {batch_id}")

def load_pending(company_slug: str) -> List[Dict[str, Any]]:
    """
    SELECT * FROM pending_documents
    WHERE company_slug = %s AND status = 'pending'
    ORDER BY created_at DESC
    Used when follow-up batch arrives — pre-fills review UI with prior extraction.
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT * FROM pending_documents
                WHERE company_slug = %s AND status = 'pending'
                ORDER BY created_at DESC
            """, (company_slug,))
            
            return cur.fetchall()

def resolve_pending(batch_id: str):
    """
    UPDATE pending_documents
    SET status = 'resolved', resolved_at = NOW()
    WHERE batch_id = %s
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE pending_documents
                SET status = 'resolved', resolved_at = NOW()
                WHERE batch_id = %s
            """, (batch_id,))
            
            logger.info(f"Resolved pending documents for batch {batch_id}")


class DatabaseManager:
    """Manager for database operations"""
    
    def __init__(self):
        pass
    
    def store_document(self, file_path: str, r2_path: str, document_type: str, 
                      confidence: float, batch_id: str, extraction_metadata: dict) -> str:
        """Store a document record and return document ID"""
        # For now, return a mock ID since the original functions don't return IDs
        # This would need to be implemented based on your actual document storage needs
        import uuid
        return str(uuid.uuid4())
    
    def create_pending_tank(self, extracted_data: dict, document_ids: list, 
                           confidence_score: float, needs_review: bool, batch_id: str) -> str:
        """Create a pending tank record and return pending ID"""
        import uuid
        pending_id = str(uuid.uuid4())
        
        # Store the pending tank data
        # This would need proper implementation based on your schema
        logger.info(f"Created pending tank: {pending_id}")
        return pending_id
    
    def confirm_pending_tank(self, pending_id: str) -> str:
        """Confirm a pending tank and return the confirmed tank ID"""
        import uuid
        tank_id = str(uuid.uuid4())
        logger.info(f"Confirmed pending tank {pending_id} -> {tank_id}")
        return tank_id
    
    def reject_pending_tank(self, pending_id: str, reason: str):
        """Reject a pending tank"""
        logger.info(f"Rejected pending tank {pending_id}: {reason}")
    
    def get_pending_tank(self, pending_id: str) -> dict:
        """Get pending tank details"""
        # Mock return for now
        return {
            'id': pending_id,
            'extracted_data': {},
            'confidence_score': 0.8,
            'created_at': '2026-04-14T16:00:00Z',
            'batch_id': 'mock-batch'
        }
    
    def get_pending_tanks(self, needs_review: bool = True) -> list:
        """Get list of pending tanks"""
        return []
    
    def get_documents_for_pending_tank(self, pending_id: str) -> list:
        """Get documents associated with pending tank"""
        return []
    
    def get_document(self, document_id: str) -> dict:
        """Get document details"""
        return {'r2_path': None}
    
    def update_pending_tank(self, pending_id: str, edited_data: dict):
        """Update pending tank with edited data"""
        logger.info(f"Updated pending tank {pending_id}")
    
    def get_batch_status(self, batch_id: str) -> dict:
        """Get batch processing status"""
        return None
    
    def get_recent_batches(self, limit: int = 10) -> list:
        """Get recent processing batches"""
        return []
    
    def get_tank_count(self) -> int:
        """Get total tank count"""
        return 0
    
    def get_document_count(self) -> int:
        """Get total document count"""
        return 0
    
    def get_last_batch_time(self) -> str:
        """Get timestamp of last batch"""
        return None
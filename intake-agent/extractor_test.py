"""
Test version of extractor that returns mock data instead of calling Claude API
"""
import logging
from dataclasses import dataclass
from typing import Dict, Any
from pathlib import Path
import extract_msg

logger = logging.getLogger(__name__)

@dataclass
class ExtractionResult:
    """Result of document extraction"""
    document_type: str  # 'tank_chart', 'spec_sheet', 'installation_permit', 'other'
    confidence: float  # 0.0 to 1.0
    extracted_data: Dict[str, Any]  # Tank data fields
    raw_response: str  # Raw Claude response for debugging

class DocumentExtractor:
    """Test version that returns mock tank data"""
    
    def __init__(self):
        self.max_image_size = 20 * 1024 * 1024  # 20MB limit for Claude
        
    def extract_from_document(self, file_path: str) -> ExtractionResult:
        """Extract data from a document using mock data for testing"""
        try:
            file_ext = Path(file_path).suffix.lower()
            filename = Path(file_path).name
            
            logger.info(f"Mock extraction from {file_ext} file: {filename}")
            
            # Create mock tank data based on filename
            mock_tank_data = {
                'serial_number': 'UST-12345-TEST',
                'tank_type': 'Underground Storage Tank (UST)',
                'manufacturer': 'Xerxes Corporation',
                'material': 'Fiberglass',
                'capacity_gallons': 10000,
                'installation_date': '2020-03-15',
                'facility_name': 'Littleton Hospital',
                'facility_address': '660 South Broadway, Littleton, CO 80120',
                'facility_city': 'Littleton',
                'facility_state': 'CO',
                'facility_zip': '80120',
                'tank_product': 'Diesel Fuel'
            }
            
            # Return mock result
            return ExtractionResult(
                document_type="spec_sheet",
                confidence=0.95,
                extracted_data=mock_tank_data,
                raw_response=f"Mock extraction from {filename}"
            )
                
        except Exception as e:
            logger.error(f"Error extracting from {file_path}: {e}")
            return ExtractionResult(
                document_type="other",
                confidence=0.0,
                extracted_data={},
                raw_response=f"Mock extraction error: {e}"
            )
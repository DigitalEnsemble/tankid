"""
TankID Document Merger - Tank Grouping and Field Merging Logic
Handles merging data from multiple documents that reference the same tank
"""

import logging
from typing import Dict, List, Optional, Set, Tuple
from dataclasses import dataclass, field
from datetime import datetime
import re
from difflib import SequenceMatcher

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class DocumentSource:
    """Information about a source document"""
    file_path: str
    document_type: str  # "tank_chart", "spec_sheet", "other"
    confidence: float
    processed_at: datetime = field(default_factory=datetime.now)

@dataclass
class MergedTank:
    """Result of merging multiple documents for a single tank"""
    # Core identification
    serial_number: Optional[str] = None
    manufacturer: Optional[str] = None
    
    # Tank specifications
    capacity_gallons: Optional[int] = None
    year_manufactured: Optional[int] = None
    year_installed: Optional[int] = None
    tank_type: Optional[str] = None  # UST, AST, Other
    material: Optional[str] = None   # Steel, Fiberglass, Other
    product_stored: Optional[str] = None
    
    # Facility information
    facility_name: Optional[str] = None
    facility_address: Optional[str] = None
    facility_state: Optional[str] = None
    
    # Test information (latest)
    last_test_date: Optional[str] = None
    test_type: Optional[str] = None
    test_result: Optional[str] = None
    
    # Metadata
    notes: Optional[str] = None
    confidence_score: float = 0.0
    sources: List[DocumentSource] = field(default_factory=list)
    
    def __post_init__(self):
        """Calculate overall confidence after initialization"""
        if self.sources:
            # Weight confidence by document type and recency
            total_weight = 0
            weighted_confidence = 0
            
            for source in self.sources:
                # Spec sheets are more reliable for static data
                type_weight = 1.2 if source.document_type == "spec_sheet" else 1.0
                # More recent documents are slightly more reliable
                age_hours = (datetime.now() - source.processed_at).total_seconds() / 3600
                recency_weight = max(0.8, 1.0 - (age_hours / (24 * 30)))  # Decay over month
                
                weight = source.confidence * type_weight * recency_weight
                weighted_confidence += weight
                total_weight += 1
            
            self.confidence_score = min(1.0, weighted_confidence / total_weight) if total_weight > 0 else 0.0

class TankMerger:
    """Handles grouping documents by tank and merging their extracted data"""
    
    def __init__(self):
        self.serial_similarity_threshold = 0.85
        self.facility_similarity_threshold = 0.80
        
    def merge_documents(self, extraction_results: Dict[str, Dict]) -> List[MergedTank]:
        """
        Group documents by tank and merge their data
        
        Args:
            extraction_results: Dict mapping file_path -> extracted_data dict
            
        Returns:
            List of MergedTank objects
        """
        # Group documents by tank
        tank_groups = self._group_by_tank(extraction_results)
        
        # Merge data for each tank group
        merged_tanks = []
        for group in tank_groups:
            merged_tank = self._merge_tank_group(group)
            merged_tanks.append(merged_tank)
            
        return merged_tanks
    
    def _group_by_tank(self, extraction_results: Dict[str, Dict]) -> List[List[Tuple[str, Dict]]]:
        """
        Group documents that likely refer to the same tank
        
        Returns:
            List of groups, where each group is a list of (file_path, data) tuples
        """
        documents = [(path, data) for path, data in extraction_results.items()]
        groups = []
        used_indices = set()
        
        for i, (path1, data1) in enumerate(documents):
            if i in used_indices:
                continue
                
            # Start a new group with this document
            current_group = [(path1, data1)]
            used_indices.add(i)
            
            # Look for other documents that match this tank
            for j, (path2, data2) in enumerate(documents):
                if j in used_indices:
                    continue
                    
                if self._are_same_tank(data1['extracted_data'], data2['extracted_data']):
                    current_group.append((path2, data2))
                    used_indices.add(j)
            
            groups.append(current_group)
        
        return groups
    
    def _are_same_tank(self, data1: Dict, data2: Dict) -> bool:
        """
        Determine if two extracted data records refer to the same tank
        
        Uses serial number matching and facility similarity as primary indicators
        """
        # Primary match: Serial number
        serial1 = self._normalize_serial(data1.get('serial_number'))
        serial2 = self._normalize_serial(data2.get('serial_number'))
        
        if serial1 and serial2:
            similarity = SequenceMatcher(None, serial1, serial2).ratio()
            if similarity >= self.serial_similarity_threshold:
                logger.debug(f"Tank match by serial: {serial1} ~ {serial2} ({similarity:.2f})")
                return True
        
        # Secondary match: Facility + tank characteristics
        facility_match = self._facilities_match(data1, data2)
        tank_characteristics_match = self._tank_characteristics_match(data1, data2)
        
        if facility_match and tank_characteristics_match:
            logger.debug(f"Tank match by facility + characteristics")
            return True
        
        return False
    
    def _normalize_serial(self, serial: Optional[str]) -> Optional[str]:
        """Normalize serial number for comparison"""
        if not serial:
            return None
        
        # Remove common prefixes, spaces, hyphens
        normalized = re.sub(r'^(SN|S/N|SERIAL|#)\s*:?\s*', '', serial.upper())
        normalized = re.sub(r'[^A-Z0-9]', '', normalized)
        
        return normalized if len(normalized) >= 3 else None
    
    def _facilities_match(self, data1: Dict, data2: Dict) -> bool:
        """Check if facility information indicates same location"""
        # State must match
        state1 = data1.get('facility_state', '').upper()
        state2 = data2.get('facility_state', '').upper()
        if state1 and state2 and state1 != state2:
            return False
        
        # Address or name similarity
        addr1 = data1.get('facility_address', '')
        addr2 = data2.get('facility_address', '')
        name1 = data1.get('facility_name', '')
        name2 = data2.get('facility_name', '')
        
        # Normalize for comparison
        def normalize_text(text: str) -> str:
            return re.sub(r'[^a-z0-9]', '', text.lower()) if text else ''
        
        addr1_norm = normalize_text(addr1)
        addr2_norm = normalize_text(addr2)
        name1_norm = normalize_text(name1)
        name2_norm = normalize_text(name2)
        
        # Check address similarity
        if addr1_norm and addr2_norm:
            addr_similarity = SequenceMatcher(None, addr1_norm, addr2_norm).ratio()
            if addr_similarity >= self.facility_similarity_threshold:
                return True
        
        # Check name similarity
        if name1_norm and name2_norm:
            name_similarity = SequenceMatcher(None, name1_norm, name2_norm).ratio()
            if name_similarity >= self.facility_similarity_threshold:
                return True
        
        return False
    
    def _tank_characteristics_match(self, data1: Dict, data2: Dict) -> bool:
        """Check if tank characteristics suggest same tank"""
        matches = 0
        total_checks = 0
        
        # Check capacity (allow 10% variance for measurement differences)
        cap1 = data1.get('capacity_gallons')
        cap2 = data2.get('capacity_gallons')
        if cap1 and cap2:
            total_checks += 1
            variance = abs(cap1 - cap2) / max(cap1, cap2)
            if variance <= 0.10:  # Within 10%
                matches += 1
        
        # Check manufacturer
        mfg1 = data1.get('manufacturer', '').upper()
        mfg2 = data2.get('manufacturer', '').upper()
        if mfg1 and mfg2:
            total_checks += 1
            if mfg1 == mfg2:
                matches += 1
        
        # Check tank type
        type1 = data1.get('tank_type', '').upper()
        type2 = data2.get('tank_type', '').upper()
        if type1 and type2:
            total_checks += 1
            if type1 == type2:
                matches += 1
        
        # Check material
        mat1 = data1.get('material', '').upper()
        mat2 = data2.get('material', '').upper()
        if mat1 and mat2:
            total_checks += 1
            if mat1 == mat2:
                matches += 1
        
        # Need at least 2 characteristics to match and >60% agreement
        return total_checks >= 2 and (matches / total_checks) >= 0.6
    
    def _merge_tank_group(self, group: List[Tuple[str, Dict]]) -> MergedTank:
        """
        Merge extracted data from multiple documents for the same tank
        
        Merging strategy:
        - Static fields (specs): Prefer spec_sheet documents, then highest confidence
        - Dynamic fields (tests): Use most recent data
        - Text fields: Concatenate unique values
        """
        merged = MergedTank()
        sources = []
        
        # Sort documents by type (spec_sheet first) then confidence
        sorted_docs = sorted(group, key=lambda x: (
            0 if x[1].get('document_type') == 'spec_sheet' else 1,
            -x[1].get('confidence', 0)
        ))
        
        # Collect all extracted data and sources
        all_data = []
        for file_path, doc_data in sorted_docs:
            extracted = doc_data.get('extracted_data', {})
            all_data.append(extracted)
            
            sources.append(DocumentSource(
                file_path=file_path,
                document_type=doc_data.get('document_type', 'other'),
                confidence=doc_data.get('confidence', 0.0)
            ))
        
        merged.sources = sources
        
        # Merge static fields (prefer spec sheets, then highest confidence)
        static_fields = [
            'serial_number', 'manufacturer', 'capacity_gallons', 
            'year_manufactured', 'year_installed', 'tank_type', 
            'material', 'facility_name', 'facility_address', 
            'facility_state', 'product_stored'
        ]
        
        for field in static_fields:
            merged_value = self._merge_static_field(field, all_data, [d[1] for d in sorted_docs])
            setattr(merged, field, merged_value)
        
        # Merge dynamic fields (prefer most recent)
        dynamic_fields = ['last_test_date', 'test_type', 'test_result']
        most_recent_test = self._find_most_recent_test(all_data)
        
        for field in dynamic_fields:
            if most_recent_test and field in most_recent_test:
                setattr(merged, field, most_recent_test[field])
        
        # Merge notes (concatenate unique values)
        notes = []
        for data in all_data:
            if data.get('notes'):
                note = data['notes'].strip()
                if note and note not in notes:
                    notes.append(note)
        merged.notes = '; '.join(notes) if notes else None
        
        # Calculate confidence score
        merged.__post_init__()
        
        return merged
    
    def _merge_static_field(self, field_name: str, all_data: List[Dict], doc_metadata: List[Dict]) -> Optional[str]:
        """Merge a static field from multiple documents"""
        values = []
        
        for i, data in enumerate(all_data):
            value = data.get(field_name)
            if value is not None:
                confidence = doc_metadata[i].get('confidence', 0.0)
                doc_type = doc_metadata[i].get('document_type', 'other')
                
                # Assign priority score
                priority = confidence
                if doc_type == 'spec_sheet':
                    priority += 0.5  # Boost spec sheets
                
                values.append((value, priority))
        
        if not values:
            return None
        
        # Return the highest priority value
        values.sort(key=lambda x: x[1], reverse=True)
        return values[0][0]
    
    def _find_most_recent_test(self, all_data: List[Dict]) -> Optional[Dict]:
        """Find the most recent test data from all documents"""
        test_data = []
        
        for data in all_data:
            test_date = data.get('last_test_date')
            if test_date:
                try:
                    # Parse date to compare
                    date_obj = datetime.strptime(test_date, '%Y-%m-%d')
                    test_data.append((date_obj, data))
                except ValueError:
                    logger.warning(f"Invalid date format: {test_date}")
        
        if not test_data:
            return None
        
        # Return data from most recent test
        test_data.sort(key=lambda x: x[0], reverse=True)
        return test_data[0][1]

def main():
    """Test the merger with sample data"""
    # Sample extraction results
    sample_results = {
        'doc1.pdf': {
            'document_type': 'spec_sheet',
            'confidence': 0.9,
            'extracted_data': {
                'serial_number': 'ABC123',
                'manufacturer': 'SteelCorp',
                'capacity_gallons': 10000,
                'facility_name': 'Main Street Station',
                'facility_state': 'TX'
            }
        },
        'doc2.pdf': {
            'document_type': 'tank_chart',
            'confidence': 0.8,
            'extracted_data': {
                'serial_number': 'ABC-123',  # Slight variation
                'last_test_date': '2023-12-01',
                'test_result': 'Pass',
                'facility_name': 'Main St Station',  # Slight variation
                'facility_state': 'TX'
            }
        }
    }
    
    merger = TankMerger()
    merged_tanks = merger.merge_documents(sample_results)
    
    print(f"Found {len(merged_tanks)} unique tanks:")
    for i, tank in enumerate(merged_tanks):
        print(f"\nTank {i+1}:")
        print(f"  Serial: {tank.serial_number}")
        print(f"  Manufacturer: {tank.manufacturer}")
        print(f"  Capacity: {tank.capacity_gallons}")
        print(f"  Last Test: {tank.last_test_date} ({tank.test_result})")
        print(f"  Confidence: {tank.confidence_score:.2f}")
        print(f"  Sources: {len(tank.sources)} documents")

if __name__ == "__main__":
    main()
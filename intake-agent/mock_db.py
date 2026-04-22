"""
Mock database that saves to local JSON files for testing
"""
import json
import os
from datetime import datetime
from typing import Dict, List, Optional, Any
import uuid

class MockDatabase:
    def __init__(self, data_dir: str = "mock_data"):
        self.data_dir = data_dir
        os.makedirs(data_dir, exist_ok=True)
        self.batches_file = os.path.join(data_dir, "batches.json")
        self.documents_file = os.path.join(data_dir, "documents.json")
        self.tanks_file = os.path.join(data_dir, "tanks.json")
        
        # Initialize files if they don't exist
        for file_path in [self.batches_file, self.documents_file, self.tanks_file]:
            if not os.path.exists(file_path):
                self._save_json(file_path, [])
    
    def _load_json(self, file_path: str) -> List[Dict]:
        try:
            with open(file_path, 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return []
    
    def _save_json(self, file_path: str, data: List[Dict]):
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=2, default=str)
    
    def create_batch(self, batch_id: str, file_count: int) -> Dict:
        batch = {
            "id": batch_id,
            "status": "processing",
            "file_count": file_count,
            "tanks_found": 0,
            "tanks_auto_confirmed": 0,
            "tanks_requiring_review": 0,
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
        
        batches = self._load_json(self.batches_file)
        batches.append(batch)
        self._save_json(self.batches_file, batches)
        return batch
    
    def update_batch_status(self, batch_id: str, status: str, **kwargs):
        batches = self._load_json(self.batches_file)
        for batch in batches:
            if batch["id"] == batch_id:
                batch["status"] = status
                batch["updated_at"] = datetime.now()
                for key, value in kwargs.items():
                    batch[key] = value
                break
        self._save_json(self.batches_file, batches)
    
    def save_document(self, doc_data: Dict) -> str:
        doc_id = str(uuid.uuid4())
        doc_data["id"] = doc_id
        doc_data["created_at"] = datetime.now()
        
        documents = self._load_json(self.documents_file)
        documents.append(doc_data)
        self._save_json(self.documents_file, documents)
        return doc_id
    
    def save_tank(self, tank_data: Dict) -> str:
        # Check for duplicate before saving
        existing_tank = self.find_existing_tank(
            tank_data.get('serial_number', ''),
            tank_data.get('facility_address', '')
        )
        
        if existing_tank:
            # Update existing tank instead of creating duplicate
            return self.merge_tank_data(existing_tank['id'], tank_data)
        
        # No duplicate found, create new tank
        tank_id = str(uuid.uuid4())
        tank_data["id"] = tank_id
        tank_data["created_at"] = datetime.now()
        tank_data["status"] = tank_data.get("status", "pending_review")
        
        tanks = self._load_json(self.tanks_file)
        tanks.append(tank_data)
        self._save_json(self.tanks_file, tanks)
        return tank_id
    
    def get_pending_batches(self) -> List[Dict]:
        batches = self._load_json(self.batches_file)
        return [b for b in batches if b.get("status") != "completed"]
    
    def get_pending_tanks(self) -> List[Dict]:
        tanks = self._load_json(self.tanks_file)
        return [t for t in tanks if t.get("status") == "pending_review"]
    
    def get_all_tanks(self) -> List[Dict]:
        return self._load_json(self.tanks_file)
    
    def get_all_documents(self) -> List[Dict]:
        return self._load_json(self.documents_file)
    
    def get_recent_batches(self, limit: int = 10) -> List[Dict]:
        batches = self._load_json(self.batches_file)
        # Sort by created_at descending
        batches.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return batches[:limit]
    
    def approve_tank(self, tank_id: str) -> bool:
        tanks = self._load_json(self.tanks_file)
        for tank in tanks:
            if tank["id"] == tank_id:
                tank["status"] = "approved"
                tank["approved_at"] = datetime.now()
                self._save_json(self.tanks_file, tanks)
                return True
        return False
    
    def reject_tank(self, tank_id: str, reason: str) -> bool:
        tanks = self._load_json(self.tanks_file)
        for tank in tanks:
            if tank["id"] == tank_id:
                tank["status"] = "rejected"
                tank["rejection_reason"] = reason
                tank["rejected_at"] = datetime.now()
                self._save_json(self.tanks_file, tanks)
                return True
        return False
    
    def find_existing_tank(self, serial_number: str, facility_address: str) -> Optional[Dict]:
        """
        Find existing tank by serial number and facility address
        Returns the tank record if found, None otherwise
        """
        if not serial_number or not facility_address:
            return None
            
        tanks = self._load_json(self.tanks_file)
        
        # Normalize inputs for comparison
        serial_clean = serial_number.strip().upper()
        address_clean = facility_address.strip().lower()
        
        for tank in tanks:
            tank_serial = tank.get('serial_number', '').strip().upper()
            tank_address = tank.get('facility_address', '').strip().lower()
            
            if tank_serial == serial_clean and tank_address == address_clean:
                return tank
        
        return None
    
    def merge_tank_data(self, existing_tank_id: str, new_tank_data: Dict) -> str:
        """
        Merge new tank data into existing tank record
        Combines sources and document_ids, updates other fields if better data
        """
        tanks = self._load_json(self.tanks_file)
        
        for tank in tanks:
            if tank["id"] == existing_tank_id:
                # Merge sources
                existing_sources = tank.get('sources', [])
                new_sources = new_tank_data.get('sources', [])
                
                # Remove duplicate sources based on file_path
                all_sources = existing_sources + new_sources
                unique_sources = []
                seen_paths = set()
                
                for source in all_sources:
                    path = source.get('file_path', '')
                    if path and path not in seen_paths:
                        unique_sources.append(source)
                        seen_paths.add(path)
                
                tank['sources'] = unique_sources
                
                # Merge document_ids
                existing_doc_ids = tank.get('document_ids', [])
                new_doc_ids = new_tank_data.get('document_ids', [])
                tank['document_ids'] = list(set(existing_doc_ids + new_doc_ids))
                
                # Update fields if new data is better (non-null)
                for field, value in new_tank_data.items():
                    if field not in ['id', 'created_at', 'sources', 'document_ids']:
                        if value is not None and value != '':
                            # Only update if existing field is null/empty or new confidence is higher
                            existing_value = tank.get(field)
                            if (existing_value is None or existing_value == '' or 
                                (field == 'confidence_score' and value > tank.get('confidence_score', 0))):
                                tank[field] = value
                
                # Update metadata
                tank['updated_at'] = datetime.now()
                tank['merge_count'] = tank.get('merge_count', 1) + 1
                
                # Save updated tanks
                self._save_json(self.tanks_file, tanks)
                
                print(f"🔄 MERGED: Tank {existing_tank_id} updated with {len(new_sources)} new sources")
                return existing_tank_id
        
        # Tank not found, this shouldn't happen
        raise ValueError(f"Tank {existing_tank_id} not found for merging")
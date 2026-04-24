"""
Local database wrapper that uses JSON files for development
"""
import os
from typing import Dict, List, Optional, Any
from mock_db import MockDatabase

class DatabaseManager:
    """Local development database using JSON files"""
    
    def __init__(self):
        self.db = MockDatabase("mock_data")
        print("🏠 DatabaseManager: Using local JSON file storage")
    
    def create_batch(self, batch_id: str, file_count: int) -> Dict:
        """Create a new processing batch"""
        return self.db.create_batch(batch_id, file_count)
    
    def update_batch_status(self, batch_id: str, status: str, **kwargs):
        """Update batch status and metrics"""
        self.db.update_batch_status(batch_id, status, **kwargs)
    
    def save_document(self, doc_data: Dict) -> str:
        """Save document metadata"""
        return self.db.save_document(doc_data)
    
    def save_tank(self, tank_data: Dict) -> str:
        """Save extracted tank data"""
        return self.db.save_tank(tank_data)
    
    def get_pending_batches(self) -> List[Dict]:
        """Get all pending batches"""
        return self.db.get_pending_batches()
    
    def get_pending_tanks(self) -> List[Dict]:
        """Get tanks pending review"""
        return self.db.get_pending_tanks()
    
    def get_documents_for_pending_tank(self, tank_id: str) -> List[Dict]:
        """Get documents associated with a pending tank"""
        tank = self.get_pending_tank(tank_id)
        if not tank:
            return []
        doc_ids = tank.get('document_ids', [])
        all_docs = self.db.get_all_documents()
        return [d for d in all_docs if d.get('id') in doc_ids]

    def get_pending_tank(self, tank_id: str) -> Dict:
        """Get a single pending tank by ID"""
        for tank in self.db.get_pending_tanks():
            if tank.get('id') == tank_id:
                return tank
        return None

    def get_all_tanks(self) -> List[Dict]:
        """Get all tanks"""
        return self.db.get_all_tanks()
        
    def get_all_documents(self) -> List[Dict]:
        """Get all documents"""
        return self.db.get_all_documents()
    
    def get_recent_batches(self, limit: int = 10) -> List[Dict]:
        """Get recent batches"""
        return self.db.get_recent_batches(limit)
    
    def approve_tank(self, tank_id: str) -> bool:
        """Approve a tank"""
        return self.db.approve_tank(tank_id)
    
    def reject_tank(self, tank_id: str, reason: str) -> bool:
        """Reject a tank with reason"""
        return self.db.reject_tank(tank_id, reason)

    def get_document(self, doc_id: str) -> Dict:
        """Get a single document by ID"""
        for doc in self.db.get_all_documents():
            if doc.get('id') == doc_id:
                return doc
        return None

    def get_batch_status(self, batch_id: str) -> Dict:
        """Get status of a specific batch"""
        for batch in self.db.get_recent_batches(100):
            if batch.get('id') == batch_id:
                return batch
        return None

    def update_pending_tank(self, tank_id: str, updates: Dict) -> bool:
        """Update fields on a pending tank — writes directly to tanks.json"""
        import json as _json
        tanks_file = self.db.tanks_file
        with open(tanks_file, 'r') as f:
            all_tanks = _json.load(f)
        updated = False
        for tank in all_tanks:
            if tank.get('id') == tank_id:
                tank.update(updates)
                updated = True
                break
        if updated:
            with open(tanks_file, 'w') as f:
                _json.dump(all_tanks, f, indent=2, default=str)
        return updated

    def reject_pending_tank(self, pending_id: str, reason: str) -> bool:
        """Alias for reject_tank — called by review_server"""
        return self.db.reject_tank(pending_id, reason)
    
    def create_pending_tank(self, extracted_data, document_ids, confidence_score, needs_review, batch_id) -> str:
        """Create a pending tank record"""
        tank_data = {
            'extracted_data': extracted_data,
            'document_ids': document_ids,
            'confidence_score': confidence_score,
            'needs_review': needs_review,
            'batch_id': batch_id,
            'status': 'pending_review' if needs_review else 'confirmed'
        }
        return self.db.save_tank(tank_data)
    
    def confirm_pending_tank(self, pending_id: str) -> str:
        """Confirm a pending tank — sets status to 'confirmed' for sync_via_api"""
        import json as _json
        tanks_file = self.db.tanks_file
        with open(tanks_file, 'r') as f:
            all_tanks = _json.load(f)
        tank_id = None
        for tank in all_tanks:
            if tank.get('id') == pending_id:
                tank['status'] = 'confirmed'
                tank['confirmed_at'] = str(__import__('datetime').datetime.now())
                tank_id = pending_id
                break
        if tank_id:
            with open(tanks_file, 'w') as f:
                _json.dump(all_tanks, f, indent=2, default=str)
        return tank_id
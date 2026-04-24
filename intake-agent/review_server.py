"""
TankID Review Server - Flask Web UI for Human Review
Provides web interface for reviewing and confirming extracted tank data
"""

import os
import json
import logging
from typing import Dict, List, Optional
from datetime import datetime
from flask import Flask, render_template, request, jsonify, redirect, url_for, flash
from werkzeug.utils import secure_filename

from db_local import DatabaseManager  # Using local JSON storage for development
from storage import StorageManager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'dev-secret-change-in-production')

# Initialize managers
db = DatabaseManager()
storage = StorageManager()

@app.route('/')
def index():
    """Main review dashboard"""
    try:
        # Get pending tanks requiring review
        pending_tanks = db.get_pending_tanks()
        
        # Get recent batches
        recent_batches = db.get_recent_batches(limit=10)
        
        # Summary stats
        stats = {
            'pending_review': len(pending_tanks),
            'total_tanks': len(db.get_all_tanks()),
            'documents_processed': len(db.get_all_documents()),
            'recent_batches': len(recent_batches)
        }
        
        return render_template('review.html', 
                             pending_tanks=pending_tanks,
                             recent_batches=recent_batches,
                             stats=stats)
    
    except Exception as e:
        logger.error(f"Error loading dashboard: {str(e)}")
        flash(f"Error loading dashboard: {str(e)}", 'error')
        return render_template('error.html'), 500

@app.route('/review/<pending_id>')
def review_tank(pending_id):
    """Review a specific pending tank"""
    try:
        # Get pending tank data
        pending_tank = db.get_pending_tank(pending_id)
        if not pending_tank:
            flash("Tank not found", 'error')
            return redirect(url_for('index'))
        
        # Get associated documents
        documents = db.get_documents_for_pending_tank(pending_id)
        
        # Add document URLs for viewing
        for doc in documents:
            r2_path = doc.get('r2_path') or doc.get('file_path') or doc.get('local_path')
            if r2_path:
                doc['view_url'] = storage.get_document_url(r2_path)
        
        return render_template('review_tank.html',
                             tank=pending_tank,
                             documents=documents)
    
    except Exception as e:
        logger.error(f"Error reviewing tank {pending_id}: {str(e)}")
        flash(f"Error loading tank: {str(e)}", 'error')
        return redirect(url_for('index'))

@app.route('/confirm/<pending_id>', methods=['POST'])
def confirm_tank(pending_id):
    """Confirm a pending tank after review"""
    try:
        # Get form data (edited tank information)
        form_data = request.get_json() if request.is_json else request.form.to_dict()
        
        # Update pending tank with any edits
        if form_data.get('edited_data'):
            db.update_pending_tank(pending_id, form_data['edited_data'])
        
        # Confirm the tank
        tank_id = db.confirm_pending_tank(pending_id)
        
        logger.info(f"Tank confirmed: pending {pending_id} -> tank {tank_id}")
        
        if request.is_json:
            return jsonify({'success': True, 'tank_id': tank_id})
        else:
            flash(f"Tank confirmed successfully (ID: {tank_id})", 'success')
            return redirect(url_for('index'))
    
    except Exception as e:
        logger.error(f"Error confirming tank {pending_id}: {str(e)}")
        if request.is_json:
            return jsonify({'success': False, 'error': str(e)}), 500
        else:
            flash(f"Error confirming tank: {str(e)}", 'error')
            return redirect(url_for('review_tank', pending_id=pending_id))

@app.route('/reject/<pending_id>', methods=['POST'])
def reject_tank(pending_id):
    """Reject a pending tank"""
    try:
        form_data = request.get_json() if request.is_json else request.form.to_dict()
        reason = form_data.get('reason', 'Rejected by reviewer')
        
        # Mark as rejected
        db.reject_pending_tank(pending_id, reason)
        
        logger.info(f"Tank rejected: {pending_id} - {reason}")
        
        if request.is_json:
            return jsonify({'success': True})
        else:
            flash(f"Tank rejected: {reason}", 'warning')
            return redirect(url_for('index'))
    
    except Exception as e:
        logger.error(f"Error rejecting tank {pending_id}: {str(e)}")
        if request.is_json:
            return jsonify({'success': False, 'error': str(e)}), 500
        else:
            flash(f"Error rejecting tank: {str(e)}", 'error')
            return redirect(url_for('review_tank', pending_id=pending_id))

@app.route('/document/<document_id>')
def view_document(document_id):
    """View a document (redirect to R2 URL)"""
    try:
        doc = db.get_document(document_id)
        if not doc or not doc['r2_path']:
            flash("Document not found", 'error')
            return redirect(url_for('index'))
        
        # Redirect to R2 URL
        doc_url = storage.get_document_url(doc['r2_path'])
        return redirect(doc_url)
    
    except Exception as e:
        logger.error(f"Error viewing document {document_id}: {str(e)}")
        flash(f"Error accessing document: {str(e)}", 'error')
        return redirect(url_for('index'))

@app.route('/batch/<batch_id>')
def view_batch(batch_id):
    """View details of a processing batch"""
    try:
        batch_info = db.get_batch_status(batch_id)
        if not batch_info:
            flash("Batch not found", 'error')
            return redirect(url_for('index'))
        
        return render_template('batch_details.html', batch=batch_info)
    
    except Exception as e:
        logger.error(f"Error viewing batch {batch_id}: {str(e)}")
        flash(f"Error loading batch: {str(e)}", 'error')
        return redirect(url_for('index'))

@app.route('/api/pending')
def api_pending():
    """API endpoint for pending tanks"""
    try:
        pending_tanks = db.get_pending_tanks(needs_review=True)
        return jsonify({'success': True, 'tanks': pending_tanks})
    except Exception as e:
        logger.error(f"API error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/tanks')
def view_tanks():
    """View all tanks (confirmed and pending)"""
    try:
        all_tanks = db.get_all_tanks()
        pending_tanks = db.get_pending_tanks()
        
        # Flatten extracted_data for template compatibility
        def flatten_tank_data(tank):
            flattened = tank.copy()
            extracted = tank.get('extracted_data', {})
            if isinstance(extracted, dict):
                # Move extracted_data fields to top level
                flattened.update(extracted)
            
            # Handle document display - convert document_ids to sources format if sources is empty
            if not flattened.get('sources') and flattened.get('document_ids'):
                sources = []
                for doc_id in flattened.get('document_ids', []):
                    # Extract filename from document path
                    if isinstance(doc_id, str):
                        filename = doc_id.split('/')[-1] if '/' in doc_id else doc_id
                        # Remove timestamp prefix if present
                        if filename.startswith('2026-') and '_' in filename:
                            clean_filename = '_'.join(filename.split('_')[1:])
                        else:
                            clean_filename = filename
                        
                        sources.append({
                            'file_path': clean_filename,
                            'document_type': 'PDF' if filename.lower().endswith('.pdf') else 'Document',
                            'confidence': 1.0  # Default confidence for processed docs
                        })
                flattened['sources'] = sources
            
            return flattened
        
        confirmed_flattened = [flatten_tank_data(tank) for tank in all_tanks]
        pending_flattened = [flatten_tank_data(tank) for tank in pending_tanks]
        
        return render_template('tanks.html', 
                             confirmed_tanks=confirmed_flattened,
                             pending_tanks=pending_flattened)
    except Exception as e:
        logger.error(f"Error loading tanks: {str(e)}")
        return render_template('error.html', error="Failed to load tanks"), 500

@app.route('/facilities')
def facilities():
    """Production-style facility listing"""
    try:
        # Get all tanks and group by facility
        all_tanks = db.get_all_tanks()
        
        facility_map = {}
        for tank in all_tanks:
            # Extract data from nested structure
            extracted = tank.get('extracted_data', {})
            facility_name = extracted.get('facility_name', 'Unknown')
            facility_address = extracted.get('facility_address', '')
            facility_state = extracted.get('facility_state', 'Unknown')
            serial_number = extracted.get('serial_number', 'Unknown')
            manufacturer = extracted.get('manufacturer', 'Unknown')
            
            facility_key = f"{facility_name}-{facility_address}"
            
            if facility_key not in facility_map:
                facility_map[facility_key] = {
                    'id': facility_key.lower().replace(' ', '-').replace(',', ''),
                    'name': facility_name,
                    'address': facility_address,
                    'state': facility_state,
                    'tank_count': 0,
                    'tank_preview': [],
                    'last_updated': None
                }
            
            facility_map[facility_key]['tank_count'] += 1
            
            # Add to preview (first 3 tanks)
            if len(facility_map[facility_key]['tank_preview']) < 3:
                facility_map[facility_key]['tank_preview'].append({
                    'serial_number': serial_number,
                    'manufacturer': manufacturer
                })
            
            # Update last updated time
            if tank.get('created_at'):
                try:
                    tank_date = datetime.fromisoformat(tank['created_at'].replace('Z', '+00:00'))
                    if not facility_map[facility_key]['last_updated'] or tank_date > facility_map[facility_key]['last_updated']:
                        facility_map[facility_key]['last_updated'] = tank_date
                except:
                    pass
        
        facilities_list = list(facility_map.values())
        facilities_list.sort(key=lambda x: x['name'])
        
        return render_template('facilities.html', facilities=facilities_list)
        
    except Exception as e:
        logger.error(f"Error loading facilities: {str(e)}")
        return render_template('error.html', 
                             error="Error loading facilities",
                             message=str(e)), 500

@app.route('/facility/<facility_id>')
def facility_detail(facility_id):
    """Production-style facility detail with tanks"""
    try:
        # Get all tanks and find ones for this facility
        all_tanks = db.get_all_tanks()
        
        facility_tanks = []
        facility_info = None
        
        for tank in all_tanks:
            # Extract data from nested structure
            extracted = tank.get('extracted_data', {})
            facility_name = extracted.get('facility_name', 'Unknown')
            facility_address = extracted.get('facility_address', '')
            facility_state = extracted.get('facility_state', 'Unknown')
            serial_number = extracted.get('serial_number', 'Unknown')
            
            # Create facility key for matching
            tank_facility_key = f"{facility_name}-{facility_address}"
            tank_facility_id = tank_facility_key.lower().replace(' ', '-').replace(',', '')
            
            if tank_facility_id == facility_id:
                # Flatten tank data for template
                flattened_tank = tank.copy()
                flattened_tank.update(extracted)
                facility_tanks.append(flattened_tank)
                
                # Set facility info from first tank
                if not facility_info:
                    facility_info = {
                        'name': facility_name,
                        'address': facility_address,
                        'state': facility_state,
                        'last_updated': None
                    }
                
                # Update last updated
                if tank.get('created_at'):
                    try:
                        tank_date = datetime.fromisoformat(tank['created_at'].replace('Z', '+00:00'))
                        if not facility_info['last_updated'] or tank_date > facility_info['last_updated']:
                            facility_info['last_updated'] = tank_date
                    except:
                        pass
        
        if not facility_info:
            return render_template('error.html', 
                                 error="Facility not found",
                                 message=f"No facility found with ID: {facility_id}"), 404
        
        # Sort tanks by serial number
        facility_tanks.sort(key=lambda x: x.get('serial_number', ''))
        
        return render_template('facility_detail.html', 
                             facility=facility_info, 
                             tanks=facility_tanks)
        
    except Exception as e:
        logger.error(f"Error loading facility {facility_id}: {str(e)}")
        return render_template('error.html',
                             error="Error loading facility",
                             message=str(e)), 500

@app.route('/tank/<tank_id>')
def tank_detail(tank_id):
    """Production-style individual tank detail"""
    try:
        # Find tank by ID 
        all_tanks = db.get_all_tanks()
        
        target_tank = None
        for tank in all_tanks:
            if tank.get('id') == tank_id or str(tank.get('id')) == tank_id:
                target_tank = tank
                break
        
        if not target_tank:
            return render_template('error.html',
                                 error="Tank not found",
                                 message=f"No tank found with ID: {tank_id}"), 404
        
        # Get source documents if available
        documents = []
        if target_tank.get('document_ids'):
            for doc_id in target_tank['document_ids']:
                doc = db.get_document(doc_id)
                if doc:
                    documents.append(doc)
        
        return render_template('tank_detail.html', 
                             tank=target_tank, 
                             documents=documents)
        
    except Exception as e:
        logger.error(f"Error loading tank {tank_id}: {str(e)}")
        return render_template('error.html',
                             error="Error loading tank",
                             message=str(e)), 500

@app.route('/api/stats')
def api_stats():
    """API endpoint for dashboard statistics"""
    try:
        stats = {
            'pending_review': len(db.get_pending_tanks()),
            'total_tanks': len(db.get_all_tanks()),
            'documents_processed': len(db.get_all_documents()),
            'recent_batches': len(db.get_recent_batches())
        }
        return jsonify({'success': True, 'stats': stats})
    except Exception as e:
        logger.error(f"API error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.errorhandler(404)
def not_found_error(error):
    return render_template('error.html', 
                         error="Page not found",
                         message="The page you requested does not exist."), 404

@app.errorhandler(500)
def internal_error(error):
    return render_template('error.html',
                         error="Internal server error",
                         message="An unexpected error occurred."), 500

# Template filters
@app.template_filter('datetime')
def datetime_filter(value, format='%Y-%m-%d %H:%M'):
    """Format datetime for templates"""
    if isinstance(value, str):
        try:
            value = datetime.fromisoformat(value.replace('Z', '+00:00'))
        except:
            return value
    return value.strftime(format) if value else ''

@app.template_filter('confidence')
def confidence_filter(value):
    """Format confidence as percentage"""
    try:
        return f"{float(value) * 100:.1f}%"
    except:
        return "N/A"

@app.template_filter('truncate_path')
def truncate_path_filter(path, length=50):
    """Truncate file path for display"""
    if not path or len(path) <= length:
        return path
    return "..." + path[-(length-3):]

def run_server(host='127.0.0.1', port=5000, debug=False):
    """Run the review server"""
    logger.info(f"Starting TankID Review Server on {host}:{port}")
    app.run(host=host, port=port, debug=debug)

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='TankID Review Server')
    parser.add_argument('--host', default='127.0.0.1', help='Host to bind to')
    parser.add_argument('--port', type=int, default=5000, help='Port to bind to')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode')
    
    args = parser.parse_args()
    run_server(host=args.host, port=args.port, debug=args.debug)
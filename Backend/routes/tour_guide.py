from flask import Blueprint, request, jsonify
import os
import json
import re
from werkzeug.utils import secure_filename
from datetime import datetime
import uuid

tour_guide_bp = Blueprint('tour_guide', __name__, url_prefix='/tour')

UPLOAD_FOLDER = 'tour_guide_applications_data_cvs'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Path ke file JSON yang akan menampilkan daftar Tour Guide
# Asumsi file ini berada di folder 'data' yang sejajar dengan 'routes' atau 'app.py'
TOUR_GUIDES_JSON_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'tourGuides.json')

# --- NEW: Endpoint untuk mendapatkan daftar semua tour guide ---
@tour_guide_bp.route('/guides', methods=['GET'])
def get_tour_guides():
    tour_guides_list = []
    if os.path.exists(TOUR_GUIDES_JSON_PATH):
        try:
            with open(TOUR_GUIDES_JSON_PATH, 'r') as f:
                tour_guides_list = json.load(f)
                if not isinstance(tour_guides_list, list):
                    tour_guides_list = []
        except json.JSONDecodeError:
            print(f"WARNING: tourGuides.json at {TOUR_GUIDES_JSON_PATH} is corrupted or empty, returning empty list.")
            tour_guides_list = []
    return jsonify(tour_guides_list)
# --- END NEW Endpoint ---

@tour_guide_bp.route('/apply', methods=['POST'])
def apply_guide():
    data = request.form
    
    cv_file = request.files.get('cvFile')

    contact = data.get('contact')
    name = data.get('name')
    language = data.get('language')
    price = data.get('price')
    description = data.get('description')
    picture = data.get('picture')

    errors = []

    if not contact: errors.append('Email address or phone number is required.')
    else:
        if '@' in contact:
            if not re.match(r'[^@]+@[^@]+\.[^@]+', contact): errors.append('Invalid email address format.')
        else:
            if not re.match(r'^\+?[0-9\s\-\(\)]{7,20}$', contact): errors.append('Invalid phone number format.')
    
    if not name: errors.append('Full name is required.')
    if not language: errors.append('Languages spoken is required.')
    if not price: errors.append('Price range is required.')
    elif not re.match(r'^[A-Z]{3}\s\d+(\.\d+)?$', price) and not re.match(r'^\$\d+(\.\d+)?(\s*-\s*\$\d+(\.\d+)?)?$', price): errors.append('Invalid price range format. Use currency symbol (e.g., IDR 100000 or $50 - $100).')
    if not description: errors.append('Description is required.')
    
    if not cv_file: errors.append('CV (PDF) is required.')
    elif cv_file.filename == '': errors.append('No selected CV file.')
    else:
        filename = secure_filename(cv_file.filename)
        if not filename.endswith('.pdf'): errors.append('Only PDF files are allowed for CV.')

    if errors:
        return jsonify({'errors': errors}), 400

    try:
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        cv_filename_saved = f"{name.replace(' ', '_')}_{timestamp}.pdf"
        cv_path = os.path.join(UPLOAD_FOLDER, cv_filename_saved)
        cv_file.save(cv_path)

        tour_guides_list = []
        if os.path.exists(TOUR_GUIDES_JSON_PATH):
            try:
                with open(TOUR_GUIDES_JSON_PATH, 'r') as f:
                    tour_guides_list = json.load(f)
                    if not isinstance(tour_guides_list, list):
                        tour_guides_list = []
            except json.JSONDecodeError:
                print(f"WARNING: tourGuides.json at {TOUR_GUIDES_JSON_PATH} is corrupted or empty, reinitializing.")
                tour_guides_list = []
        
        new_guide_entry = {
            'id': str(uuid.uuid4()),
            'name': name,
            'language': language,
            'price': price,
            'description': description,
            'picture': picture if picture else '/assets/default_profile.jpg',
        }
        tour_guides_list.append(new_guide_entry)

        with open(TOUR_GUIDES_JSON_PATH, 'w') as f:
            json.dump(tour_guides_list, f, indent=4)

        return jsonify({'message': 'Application submitted successfully and added to tour guide list.', 'cv_file_saved_at': cv_path, 'guide_id': new_guide_entry['id']}), 201
    except Exception as e:
        print(f"ERROR: Submission failed: {str(e)}")
        return jsonify({'error': f'Submission failed: {str(e)}'}), 500
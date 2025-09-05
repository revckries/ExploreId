# routes/itinerary.py
from flask import Blueprint, jsonify, request, current_app # Import current_app
import os, random
from datetime import datetime, timedelta
import json
import re

itinerary_bp = Blueprint('itinerary', __name__, url_prefix='/itinerary')

# --- HAPUS DEFINISI PATH DARI SINI (AWAL FILE) ---
# DATA_DESTINATIONS_FILE_PATH = os.path.join(current_app.config['BASE_DIR'], 'data', 'destinations.json')
# DATA_REVIEWS_FILE_PATH = os.path.join(current_app.config['BASE_DIR'], 'data', 'destinationReview.json')
# --- AKHIR HAPUS ---


@itinerary_bp.route('/generate', methods=['POST'])
def generate_itinerary():
    # --- PENTING: PINDAHKAN DEFINISI PATH KE SINI (DALAM FUNGSI) ---
    base_dir = current_app.config['BASE_DIR'] # Akses BASE_DIR di sini
    DATA_DESTINATIONS_FILE_PATH = os.path.join(base_dir, 'data', 'destinations.json')
    DATA_REVIEWS_FILE_PATH = os.path.join(base_dir, 'data', 'destinationReview.json')
    # --- AKHIR PEMINDAHAN ---

    data = request.json
    num_days = data.get('days')

    if not num_days or not isinstance(num_days, int) or num_days <= 0:
        return jsonify({'error': 'Please provide a valid number of days (e.g., {"days": 3})'}), 400

    try:
        with open(DATA_DESTINATIONS_FILE_PATH, 'r') as f:
            destinations_raw = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        error_msg = f"Error loading destination data from {DATA_DESTINATIONS_FILE_PATH}: {str(e)}"
        print(f"ERROR: {error_msg}")
        print(f"DEBUG: Attempted to open: {DATA_DESTINATIONS_FILE_PATH}")
        return jsonify({'error': error_msg}), 500

    reviews_raw = []
    try:
        with open(DATA_REVIEWS_FILE_PATH, 'r') as f:
            reviews_raw = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        print(f"WARNING: Review data file not found or corrupted at {DATA_REVIEWS_FILE_PATH}. Reviews will not be used in rating calculation. Error: {str(e)}")
        reviews_raw = []

    if not destinations_raw:
        return jsonify({'error': 'No destinations found in the local data file. Please add some destinations.'}), 404

    place_avg_reviews = {}
    for review_entry in reviews_raw:
        place_name_review = review_entry.get('place')
        reviews_list = review_entry.get('reviews')
        if place_name_review and isinstance(reviews_list, list) and len(reviews_list) > 0:
            total_rating = sum(r.get('rating', 0) for r in reviews_list if isinstance(r, dict))
            avg_rating = total_rating / len(reviews_list)
            place_avg_reviews[place_name_review] = avg_rating

    destinations_clean = [d for d in destinations_raw if isinstance(d, dict)]

    for dest in destinations_clean:
        dest['name'] = dest.get('Place', 'Unknown Place')
        
        price_data = dest.get('Tourism/Visitor Fee (approx in USD)')
            
        if isinstance(price_data, (int, float)):
             dest['price'] = f"USD {price_data:.2f}"
        elif isinstance(price_data, str):
            usd_match = re.search(r'\$?(\d+\.?\d*)\s*USD', price_data, re.IGNORECASE)
            if usd_match:
                try:
                    float_price = float(usd_match.group(1))
                    dest['price'] = f"USD {float_price:.2f}"
                except ValueError:
                    dest['price'] = price_data
            else:
                dest['price'] = price_data
        else:
            dest['price'] = 'N/A'
        
        dest['location'] = dest.get('Location', 'N/A')
        dest['description'] = dest.get('Description', 'N/A')
        
        Maps_rating = dest.get('Google Maps Rating')
        review_file_avg_rating = place_avg_reviews.get(dest['name'])

        if isinstance(Maps_rating, (int, float)):
            dest['rating'] = Maps_rating
        elif isinstance(review_file_avg_rating, (int, float)):
            dest['rating'] = review_file_avg_rating
        else:
            dest['rating'] = None

        if 'duration' not in dest or not isinstance(dest['duration'], (int, float)) or dest['duration'] <= 0:
            dest['duration'] = random.choice([90, 120, 150, 180])

    full_itinerary = []

    for day in range(1, num_days + 1):
        destinations_for_day = list(destinations_clean)
        random.shuffle(destinations_for_day)

        schedule_for_day = []
        current_time = datetime.strptime('08:00', '%H:%M').replace(year=2000, month=1, day=1)
        
        lunch_start = datetime.strptime('11:00', '%H:%M').replace(year=2000, month=1, day=1)
        lunch_end = datetime.strptime('13:00', '%H:%M').replace(year=2000, month=1, day=1)
        dinner_start = datetime.strptime('17:00', '%H:%M').replace(year=2000, month=1, day=1)
        dinner_end = datetime.strptime('19:00', '%H:%M').replace(year=2000, month=1, day=1)
        day_end_limit = datetime.strptime('22:00', '%H:%M').replace(year=2000, month=1, day=1)

        dest_index = 0
        while current_time < day_end_limit and dest_index < len(destinations_for_day):
            if current_time >= lunch_start and current_time < lunch_end:
                current_time = lunch_end
                continue
            if current_time >= dinner_start and current_time < dinner_end:
                current_time = dinner_end
                continue
            
            dest = destinations_for_day[dest_index]
            
            projected_end_time = current_time + timedelta(minutes=dest['duration'])
            
            if (current_time < lunch_start and projected_end_time > lunch_start) and (projected_end_time < lunch_end or projected_end_time > lunch_end):
                current_time = lunch_end
                continue
            
            if (current_time < dinner_start and projected_end_time > dinner_start) and (projected_end_time < dinner_end or projected_end_time > dinner_end):
                current_time = dinner_end
                continue

            if projected_end_time > day_end_limit:
                dest_index += 1
                continue

            schedule_for_day.append({
                'destination_name': dest['name'],
                'start_time': current_time.strftime('%H:%M'),
                'end_time': projected_end_time.strftime('%H:%M'),
                'duration_minutes': dest['duration'],
                'price': dest['price'],
                'location': dest['location'],
                'description': dest['description'],
                'rating': dest['rating']
            })
            current_time = projected_end_time
            dest_index += 1
        
        full_itinerary.append({
            'day': day,
            'schedule': schedule_for_day
        })

    return jsonify(full_itinerary)
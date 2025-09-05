from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os
from supabase import create_client, Client # Import create_client dan Client

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app)

# Set base directory for the application
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
app.config['BASE_DIR'] = BASE_DIR

# Get Supabase URL and Key from environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# --- DEBUG PRINT STATEMENTS ---
print(f"DEBUG app.py: SUPABASE_URL: {SUPABASE_URL}")
print(f"DEBUG app.py: SUPABASE_KEY (first 5 chars): {SUPABASE_KEY[:5]}...")
# --- END DEBUG PRINT STATEMENTS ---

# Ensure environment variables are set
if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in .env file")

# Initialize Supabase Client
try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    app.config['SUPABASE_CLIENT'] = supabase
    print(f"DEBUG app.py: Supabase client initialized: {supabase is not None}")
    if supabase is None:
        print("DEBUG app.py: Supabase client is None after creation. Check URL/Key.")
except Exception as e:
    print(f"DEBUG app.py: Error initializing Supabase client: {e}")
    raise 

@app.route('/')
def home():
    return "Backend Flask is running! Try /tour/apply or /itinerary/generate with appropriate methods via Postman/Insomnia."

# Import and register blueprints
from routes.itinerary import itinerary_bp
from routes.tour_guide import tour_guide_bp

app.register_blueprint(itinerary_bp)
app.register_blueprint(tour_guide_bp)

if __name__ == '__main__':
    # Run the Flask app in debug mode
    app.run(debug=True, port=5000)
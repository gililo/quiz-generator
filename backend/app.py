from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os
from database import init_db

# Reading .env file 
load_dotenv()

# Create the Flask application instance
app = Flask(__name__)

CORS(app, 
     origins=["http://localhost:3000"],     # Allowed frontend origin
     supports_credentials=True,             # Allow cookies/auth headers
     allow_headers=["Authorization", "Content-Type"], 
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
)

# Set up the Flask secret key
# If SECRET_KEY is not defined in the environment, use a default development key
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')

# Folder where uploaded files will be stored
app.config['UPLOAD_FOLDER'] = 'uploads'

# Maximum upload size (16MB)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

# Create folder
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Import routes app.py and auth.py
from auth import auth_bp
from quiz import quiz_bp

# Register the blueprints with URL prefixes
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(quiz_bp, url_prefix='/api/quiz')

# Start the Flask development server
if __name__ == '__main__':
    init_db()

    # Run the Flask on port 5000
    app.run(port=5000)
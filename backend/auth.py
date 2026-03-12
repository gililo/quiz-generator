from flask import Blueprint, request, jsonify, current_app
import jwt
import datetime
import bcrypt
from database import get_db

# Create a Blueprint for authentication routes
auth_bp = Blueprint('auth', __name__)

# Import wraps to preserve function metadata original
from functools import wraps


# Decorator to protect routes that require authentication
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')

        # Extract the token if it starts with "Bearer "
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]

        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        try:
            # Decode the JWT token using the application's secret key
            data = jwt.decode(
                token,
                current_app.config['SECRET_KEY'],
                algorithms = ['HS256']
            )

            current_user_id = data['user_id']

        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401

        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        
        # Call the protected function and pass the current user ID
        return f(current_user_id, *args, **kwargs)
    
    return decorated
    

# Route to register a new user
@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()

    username = data.get('username', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not username or not email or not password:
        return jsonify({'error': 'All fields are required'}), 400
    
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characteres'}), 400
    
    # Hash the password using bcrypt
    password_hash = bcrypt.hashpw(
        password.encode('utf-8'),
        bcrypt.gensalt()
    ).decode('utf-8')
    
    try:
        conn = get_db()
        
        conn.execute(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
            (username, email, password_hash)                                       
        )

        conn.commit()
        conn.close()
        
        return jsonify({'message': 'User registered successfully'}), 201
    
    except Exception:
        return jsonify({'error': 'Username or email already exists'}), 409
    

# Route for user login    
@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email_user = data.get('email_user', '').strip().lower()
    password = data.get('password', '')

    # Search for user by email or username
    conn = get_db()

    user = conn.execute(
        'SELECT * FROM users WHERE email = ? OR username = ?', (email_user, email_user)
    ).fetchone()

    conn.close()

    if not user or not bcrypt.checkpw(
        password.encode('utf-8'),
        user['password_hash'].encode('utf-8')):
        return jsonify({'error': 'Invalid email or password'}), 401
    
    # Generate JWT token valid for 7 days
    token = jwt.encode({
        'user_id': user['id'],
        'username': user['username'],
        'exp': datetime.datetime.now(datetime.UTC) + datetime.timedelta(days=7)
    }, current_app.config['SECRET_KEY'], algorithm = 'HS256')

    return jsonify({
        'token': token,
        'user': {
            'id': user['id'],
            'username': user['username'],
            'email': user['email']
        }
    })


# Route to get the current authenticated user's information
@auth_bp.route('/me', methods=['GET'])
@token_required
def me(current_user_id):
    conn = get_db()

    user = conn.execute(
        'SELECT id, username, email, created_at FROM users WHERE id = ?',
        (current_user_id,)
    ).fetchone()

    conn.close()

    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({'user': dict(user)})
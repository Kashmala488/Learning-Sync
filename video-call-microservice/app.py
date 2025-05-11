from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from config import Config
from models import db
from routes import video_call_bp
import jwt
import os
from dotenv import load_dotenv
from functools import wraps
import logging

app = Flask(__name__)
app.config.from_object(Config)

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Configure CORS
CORS(app, resources={
    r"/api/video-call/*": {
        "origins": ["http://localhost:3000"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True,
        "expose_headers": ["Access-Control-Allow-Origin"]
    }
})

# Load environment variables
load_dotenv()
JWT_SECRET = os.getenv('JWT_SECRET')
if not JWT_SECRET:
    raise ValueError("JWT_SECRET is not set in .env file")

db.init_app(app)

# JWT verification middleware
def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if request.method == 'OPTIONS':
            response = jsonify({})
            response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
            response.headers['Access-Control-Allow-Methods'] = 'GET,POST,OPTIONS'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
            response.headers['Access-Control-Max-Age'] = '86400'
            return response, 200
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            logger.error("Authorization header missing")
            return jsonify({'error': 'Authorization header is required'}), 401
        if not auth_header.startswith('Bearer '):
            logger.error("Invalid Authorization header format")
            return jsonify({'error': 'Invalid Authorization header format'}), 401
        token = auth_header.split(' ')[1]
        if not token:
            logger.error("Token missing in Authorization header")
            return jsonify({'error': 'Token is missing'}), 401
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            request.user = payload
            logger.debug(f"Token verified for user: {payload.get('id')}")
        except jwt.ExpiredSignatureError:
            logger.error("Token expired")
            return jsonify({'error': 'Token expired'}), 401
        except jwt.InvalidTokenError as e:
            logger.error(f"Invalid token: {str(e)}")
            return jsonify({'error': f'Invalid token: {str(e)}'}), 401
        return f(*args, **kwargs)
    return decorated

with app.app_context():
    db.create_all()

app.register_blueprint(video_call_bp, url_prefix='/api/video-call')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
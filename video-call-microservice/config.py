import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # SQLAlchemy settings
    SQLALCHEMY_DATABASE_URI = os.getenv('SQLALCHEMY_DATABASE_URI', 'sqlite:///video_calls.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # API settings
    MERN_API_URL = os.getenv('MERN_API_URL', 'http://localhost:4000')
    JWT_SECRET = os.getenv('JWT_SECRET', 'your-secret-key')
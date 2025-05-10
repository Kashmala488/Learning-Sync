from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class VideoCallRoom(db.Model):
    __tablename__ = 'video_call_rooms'
    id = db.Column(db.Integer, primary_key=True)
    group_id = db.Column(db.String(24), nullable=False)  # MongoDB ObjectId as string
    room_name = db.Column(db.String(100), nullable=False, unique=True)
    created_at = db.Column(db.DateTime, default=db.func.now())
    created_by = db.Column(db.String(24), nullable=False)  # User ID
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import uuid

db = SQLAlchemy()
class VideoCall(db.Model):
    __tablename__ = 'video_calls'
    id = db.Column(db.Integer, primary_key=True)
    group_id = db.Column(db.String(24), nullable=False)
    creator_id = db.Column(db.String(24), nullable=False)
    room_id = db.Column(db.String(36), unique=True, nullable=False)
    active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    ended_at = db.Column(db.DateTime, nullable=True)

    @staticmethod
    def create(group_id, creator_id):
        room_id = str(uuid.uuid4())
        video_call = VideoCall(
            group_id=group_id,
            creator_id=creator_id,
            room_id=room_id
        )
        db.session.add(video_call)
        db.session.commit()
        return room_id

    @staticmethod
    def get_active_call(group_id):
        return VideoCall.query.filter_by(
            group_id=group_id,
            active=True
        ).first()
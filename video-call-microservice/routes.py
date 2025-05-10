from flask import Blueprint, jsonify, request
import logging
from models import VideoCallRoom, db
from middleware import auth_middleware, restrict_to
import uuid
import requests
from config import Config

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

video_call_bp = Blueprint('video_call', __name__)

@video_call_bp.route('/create', methods=['POST'])
@auth_middleware
@restrict_to('student')
def create_video_call():
    data = request.get_json()
    group_id = data.get('groupId')
    
    if not group_id:
        logger.error("Group ID is missing in request")
        return jsonify({'error': 'Group ID is required'}), 400
    
    try:
        # Verify group exists and user is a member
        logger.debug(f"Fetching group {group_id} with token: {request.headers.get('Authorization')[:50]}...")
        group_response = requests.get(
            f"{Config.MERN_API_URL}/api/groups/{group_id}",
            headers={'Authorization': request.headers.get('Authorization')},
            timeout=5
        )
        if group_response.status_code != 200:
            logger.error(f"Group fetch failed: {group_response.status_code} - {group_response.text}")
            return jsonify({'error': 'Group not found or unauthorized'}), group_response.status_code
        
        group = group_response.json()
        logger.debug(f"Group data: {group}")
        
        # Check if user is a member by comparing _id
        user_id = request.user['_id']
        members = group.get('members', [])
        is_member = any(str(member.get('_id')) == str(user_id) for member in members)
        logger.debug(f"User ID: {user_id}, Members: {[m.get('_id') for m in members]}")
        
        if not is_member:
            logger.error(f"User {request.user['email']} (ID: {user_id}) not in group members")
            return jsonify({'error': 'Not a group member'}), 403
        
        # Check if room already exists
        existing_room = VideoCallRoom.query.filter_by(group_id=group_id).first()
        if existing_room:
            logger.info(f"Returning existing room: {existing_room.room_name}")
            return jsonify({'roomName': existing_room.room_name}), 200
        
        # Create new room
        room_name = f"room_{group_id}_{uuid.uuid4().hex}"
        new_room = VideoCallRoom(
            group_id=group_id,
            room_name=room_name,
            created_by=request.user['_id']
        )
        db.session.add(new_room)
        db.session.commit()
        
        logger.info(f"Created new room: {room_name}")
        return jsonify({'roomName': room_name}), 201
    except requests.RequestException as e:
        logger.error(f"Failed to verify group: {str(e)}")
        return jsonify({'error': f'Failed to verify group: {str(e)}'}), 500
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 500

@video_call_bp.route('/room/<group_id>', methods=['GET'])
@auth_middleware
@restrict_to('student')
def get_video_call_room(group_id):
    try:
        room = VideoCallRoom.query.filter_by(group_id=group_id).first()
        if not room:
            logger.warning(f"No video call room found for group {group_id}")
            return jsonify({'error': 'No video call room found for this group'}), 404
        logger.info(f"Returning room: {room.room_name}")
        return jsonify({'roomName': room.room_name}), 200
    except Exception as e:
        logger.error(f"Failed to fetch room: {str(e)}")
        return jsonify({'error': f'Failed to fetch room: {str(e)}'}), 500

@video_call_bp.route('/notify', methods=['POST'])
@auth_middleware
@restrict_to('student')
def notify_group_members():
    data = request.get_json()
    group_id = data.get('groupId')
    room_name = data.get('roomName')
    
    if not group_id or not room_name:
        logger.error("Group ID or room name missing in request")
        return jsonify({'error': 'Group ID and room name are required'}), 400
    
    try:
        # Fetch group members
        group_response = requests.get(
            f"{Config.MERN_API_URL}/api/groups/{group_id}",
            headers={'Authorization': request.headers.get('Authorization')},
            timeout=5
        )
        if group_response.status_code != 200:
            logger.error(f"Group fetch failed: {group_response.status_code} - {group_response.text}")
            return jsonify({'error': 'Group not found or unauthorized'}), group_response.status_code
        
        group = group_response.json()
        members = group.get('members', [])
        
        # Create notifications for group members (except the creator)
        notifications = [
            {
                'userId': member['_id'],
                'type': 'video_call',
                'content': f"A new video call has started in {group['name']}",
                'relatedId': group_id,
                'isRead': False
            }
            for member in members
            if str(member['_id']) != str(request.user['_id'])
        ]
        
        # Send notifications to MERN backend
        notification_response = requests.post(
            f"{Config.MERN_API_URL}/api/students/notifications",
            json=notifications,
            headers={'Authorization': request.headers.get('Authorization')},
            timeout=5
        )
        if notification_response.status_code != 200:
            logger.error(f"Notification send failed: {notification_response.status_code} - {notification_response.text}")
            return jsonify({'error': 'Failed to send notifications'}), notification_response.status_code
        
        logger.info(f"Notifications sent for group {group_id}")
        return jsonify({'message': 'Notifications sent successfully'}), 200
    except requests.RequestException as e:
        logger.error(f"Failed to send notifications: {str(e)}")
        return jsonify({'error': f'Failed to send notifications: {str(e)}'}), 500
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 500

@video_call_bp.route('/room/<roomId>/participants', methods=['GET'])
@auth_middleware
@restrict_to('student')
def get_room_participants(roomId):
    try:
        room = VideoCallRoom.query.filter_by(room_name=roomId).first()
        if not room:
            logger.warning(f"No video call room found for roomId {roomId}")
            return jsonify({'error': 'Room not found'}), 404
        
        # Fetch group members
        group_response = requests.get(
            f"{Config.MERN_API_URL}/api/groups/{room.group_id}",
            headers={'Authorization': request.headers.get('Authorization')},
            timeout=5
        )
        if group_response.status_code != 200:
            logger.error(f"Group fetch failed: {group_response.status_code} - {group_response.text}")
            return jsonify({'error': 'Group not found or unauthorized'}), group_response.status_code
        
        group = group_response.json()
        members = group.get('members', [])
        
        participants = [
            {
                'id': member['_id'],
                'name': member['name'],
                'email': member.get('email', '')
            }
            for member in members
        ]
        
        logger.info(f"Returning participants for room {roomId}")
        return jsonify({'participants': participants}), 200
    except Exception as e:
        logger.error(f"Failed to fetch participants: {str(e)}")
        return jsonify({'error': f'Failed to fetch participants: {str(e)}'}), 500
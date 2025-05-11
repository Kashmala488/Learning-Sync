from flask import Blueprint, request, jsonify
from datetime import datetime
from middleware import auth_middleware, restrict_to
from config import Config
from models import db, VideoCall
import requests
import logging

video_call_bp = Blueprint('video_call', __name__)
logger = logging.getLogger(__name__)

@video_call_bp.route('/create', methods=['POST'])
@auth_middleware
def create_video_call():
    try:
        data = request.get_json()
        group_id = data.get('groupId')
        user_id = data.get('userId')
        db_type = data.get('dbType', 'sqlite')

        logger.debug(f"Creating video call: group_id={group_id}, user_id={user_id}, db_type={db_type}")

        if not group_id or not user_id:
            logger.error("Missing required parameters")
            return jsonify({'error': 'Missing required parameters'}), 400

        # Verify group exists and user is a member
        group_response = requests.get(
            f"{Config.MERN_API_URL}/api/groups/{group_id}",
            headers={'Authorization': request.headers.get('Authorization')},
            timeout=5
        )
        if group_response.status_code != 200:
            logger.error(f"Group not found or unauthorized: status={group_response.status_code}")
            return jsonify({'error': 'Group not found or unauthorized'}), group_response.status_code

        group = group_response.json()
        if user_id not in [str(member['_id']) for member in group['members']]:
            logger.error(f"User {user_id} is not a group member")
            return jsonify({'error': 'Not a group member'}), 403

        # Check for existing active call
        existing_call = VideoCall.get_active_call(group_id)
        if existing_call:
            logger.info(f"Existing active call found: room_id={existing_call.room_id}")
            response = jsonify({'roomId': existing_call.room_id})
            response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
            return response, 200

        # Create new call
        room_id = VideoCall.create(group_id, user_id)
        logger.info(f"New video call created: room_id={room_id}")
        response = jsonify({'roomId': room_id})
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        return response, 201

    except Exception as e:
        logger.error(f"Error creating video call: {str(e)}")
        return jsonify({'error': f'Failed to create video call: {str(e)}'}), 500

@video_call_bp.route('/room/<group_id>', methods=['GET', 'OPTIONS'])
@auth_middleware
@restrict_to('student')
def get_room(group_id):
    try:
        user_id = str(request.user['_id'])
        logger.debug(f"Fetching room for group_id={group_id}, user_id={user_id}")

        # Verify group exists and user is a member
        group_response = requests.get(
            f"{Config.MERN_API_URL}/api/groups/{group_id}",
            headers={'Authorization': request.headers.get('Authorization')},
            timeout=5
        )
        if group_response.status_code != 200:
            logger.error(f"Group not found or unauthorized: status={group_response.status_code}")
            return jsonify({'error': 'Group not found or unauthorized'}), group_response.status_code

        group = group_response.json()
        if user_id not in [str(member['_id']) for member in group['members']]:
            logger.error(f"User {user_id} is not a group member")
            return jsonify({'error': 'Not a group member'}), 403

        # Find active call
        call = VideoCall.query.filter_by(group_id=group_id, active=True).first()
        if not call:
            logger.info(f"No active video call found for group_id={group_id}")
            return jsonify({'error': 'No active video call found for this group'}), 404

        response = jsonify({
            'roomId': call.room_id,
            'groupId': call.group_id,
            'creatorId': call.creator_id
        })
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        return response, 200

    except Exception as e:
        logger.error(f"Error fetching video call room: {str(e)}")
        return jsonify({'error': f'Failed to fetch video call room: {str(e)}'}), 500

@video_call_bp.route('/status/<group_id>', methods=['GET', 'OPTIONS'])
@auth_middleware
@restrict_to('student')
def check_call_status(group_id):
    try:
        user_id = str(request.user['_id'])
        logger.debug(f"Checking call status for group_id={group_id}, user_id={user_id}")

        # Verify group exists and user is a member
        group_response = requests.get(
            f"{Config.MERN_API_URL}/api/groups/{group_id}",
            headers={'Authorization': request.headers.get('Authorization')},
            timeout=5
        )
        if group_response.status_code != 200:
            logger.error(f"Group not found or unauthorized: status={group_response.status_code}")
            return jsonify({'error': 'Group not found or unauthorized'}), group_response.status_code

        group = group_response.json()
        if user_id not in [str(member['_id']) for member in group['members']]:
            logger.error(f"User {user_id} is not a group member")
            return jsonify({'error': 'Not a group member'}), 403

        # Check for active call
        call = VideoCall.query.filter_by(group_id=group_id, active=True).first()
        response = jsonify({
            'active': bool(call),
            'roomId': call.room_id if call else None,
            'groupId': call.group_id if call else None,
            'creatorId': call.creator_id if call else None
        })
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        return response, 200

    except Exception as e:
        logger.error(f"Error checking call status: {str(e)}")
        return jsonify({'error': f'Failed to check call status: {str(e)}'}), 500

@video_call_bp.route('/end/<group_id>', methods=['POST'])
@auth_middleware
@restrict_to('student')
def end_call(group_id):
    try:
        user_id = str(request.user['_id'])
        logger.debug(f"Ending call for group_id={group_id}, user_id={user_id}")

        # Verify group exists and user is a member
        group_response = requests.get(
            f"{Config.MERN_API_URL}/api/groups/{group_id}",
            headers={'Authorization': request.headers.get('Authorization')},
            timeout=5
        )
        if group_response.status_code != 200:
            logger.error(f"Group not found or unauthorized: status={group_response.status_code}")
            return jsonify({'error': 'Group not found or unauthorized'}), group_response.status_code

        group = group_response.json()
        if user_id not in [str(member['_id']) for member in group['members']]:
            logger.error(f"User {user_id} is not a group member")
            return jsonify({'error': 'Not a group member'}), 403

        # Find and update active call
        call = VideoCall.query.filter_by(group_id=group_id, active=True).first()
        if not call:
            logger.info(f"No active call to end for group_id={group_id}")
            return jsonify({'error': 'No active call to end'}), 404

        call.active = False
        call.ended_at = datetime.utcnow()
        db.session.commit()
        logger.info(f"Video call ended for group_id={group_id}")

        response = jsonify({'message': 'Video call ended successfully'})
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        return response, 200

    except Exception as e:
        logger.error(f"Error ending video call: {str(e)}")
        return jsonify({'error': f'Failed to end video call: {str(e)}'}), 500

@video_call_bp.route('/notify', methods=['POST'])
@auth_middleware
@restrict_to('student')
def notify_group_members():
    try:
        data = request.get_json()
        group_id = data.get('groupId')
        room_id = data.get('roomName')
        user_id = str(request.user['_id'])
        logger.debug(f"Notifying group members: group_id={group_id}, room_id={room_id}, user_id={user_id}")

        if not group_id or not room_id:
            logger.error("Missing group ID or room name")
            return jsonify({'error': 'Group ID and room name are required'}), 400

        # Verify group exists and user is a member
        group_response = requests.get(
            f"{Config.MERN_API_URL}/api/groups/{group_id}",
            headers={'Authorization': request.headers.get('Authorization')},
            timeout=5
        )
        if group_response.status_code != 200:
            logger.error(f"Group not found or unauthorized: status={group_response.status_code}")
            return jsonify({'error': 'Group not found or unauthorized'}), group_response.status_code

        group = group_response.json()
        if user_id not in [str(member['_id']) for member in group['members']]:
            logger.error(f"User {user_id} is not a group member")
            return jsonify({'error': 'Not a group member'}), 403

        # Get group members
        members = group.get('members', [])
        if not members:
            logger.info(f"No members found in group_id={group_id}")
            return jsonify({'error': 'No members found in group'}), 400

        # Create notifications for all members except the sender
        notifications = [
            {
                'userId': str(member['_id']),
                'type': 'video_call',
                'content': f"A new video call has started in {group['name']}. Join now!",
                'relatedId': group_id,
                'isRead': False,
                'createdAt': datetime.utcnow().isoformat()
            }
            for member in members
            if str(member['_id']) != user_id
        ]

        if not notifications:
            logger.info(f"No members to notify for group_id={group_id}")
            return jsonify({'message': 'No members to notify'}), 200

        # Send notifications to MERN API
        notification_response = requests.post(
            f"{Config.MERN_API_URL}/api/students/notifications",
            json=notifications,
            headers={'Authorization': request.headers.get('Authorization')},
            timeout=5
        )

        if notification_response.status_code != 200:  # Updated to expect 200
            logger.error(f"Failed to send notifications: {notification_response.json()}")
            return jsonify({'error': 'Failed to send notifications'}), notification_response.status_code

        logger.info(f"Notifications sent successfully for group_id={group_id}")
        response = jsonify({'message': 'Notifications sent successfully'})
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        return response, 200

    except Exception as e:
        logger.error(f"Error notifying group members: {str(e)}")
        return jsonify({'error': f'Failed to notify group members: {str(e)}'}), 500
const { Server } = require('socket.io');
const http = require('http');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, 'config.env') });

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Socket.IO server connected to MongoDB');
}).catch(err => {
    console.error('MongoDB connection error:', err.message);
});

// Assume User model is defined (adjust path as needed)
const User = mongoose.model('User', new mongoose.Schema({
    email: String,
    name: String,
    role: String
}), 'users');

const server = http.createServer();
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 20000,
    pingInterval: 25000
});

const rooms = new Map();

io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    console.log('Socket.IO handshake token:', token);
    if (!token) {
        console.log('No token provided');
        return next(new Error('Authentication error: No token provided'));
    }
    try {
        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is not defined in environment variables');
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Socket.IO auth successful:', decoded);

        // Fetch user data from database
        const user = await User.findById(decoded.id).select('email name');
        if (!user) {
            throw new Error('User not found');
        }
        socket.user = { ...decoded, email: user.email, name: user.name, _id: decoded.id };
        next();
    } catch (err) {
        console.error('Socket.IO auth error:', err.message);
        next(new Error('Authentication error: Invalid token'));
    }
});

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.email || socket.user.id}`);

    socket.on('join-room', ({ roomId, groupId }, callback) => {
        console.log(`Join-room request: roomId=${roomId}, groupId=${groupId}, user=${socket.user.email || socket.user.id}`);
        try {
            if (!roomId || !groupId) {
                const error = 'Room ID and Group ID are required';
                console.error('Join-room error:', error);
                return callback({ error });
            }

            if (!rooms.has(roomId)) {
                rooms.set(roomId, { participants: [], creatorId: socket.user._id });
            }

            const room = rooms.get(roomId);
            if (!room.participants.some(p => p.id === socket.user._id)) {
                room.participants.push({
                    id: socket.user._id,
                    socketId: socket.id,
                    name: socket.user.name || 'Unknown',
                    isMuted: false
                });
            }

            socket.join(roomId);
            socket.to(roomId).emit('user-joined', {
                userId: socket.user._id,
                name: socket.user.name || 'Unknown'
            });

            console.log('Join-room response:', { participants: room.participants });
            callback({ participants: room.participants });
            io.to(roomId).emit('participants-updated', room.participants);
        } catch (err) {
            console.error('Join-room handler error:', err.message);
            callback({ error: err.message });
        }
    });

    socket.on('signal', ({ to, signal, initiator }) => {
        console.log(`Signal: from=${socket.id}, to=${to}, initiator=${initiator}`);
        io.to(to).emit('signal', { from: socket.id, signal, initiator });
    });

    socket.on('group-message', ({ roomId, content, file }) => {
        if (!content && !file) return;
        const message = {
            senderId: socket.user._id,
            senderName: socket.user.name || 'Unknown',
            content,
            file,
            timestamp: new Date()
        };
        console.log('Group message:', message);
        io.to(roomId).emit('group-message', message);
    });

    socket.on('private-message', ({ roomId, to, content, file }) => {
        if (!content && !file) return;
        const message = {
            senderId: socket.user._id,
            senderName: socket.user.name || 'Unknown',
            content,
            file,
            timestamp: new Date()
        };
        console.log('Private message:', { to, message });
        io.to(to).emit('private-message', { from: socket.user._id, message });
        socket.emit('private-message', { to, message });
    });

    socket.on('mute-user', ({ roomId, userId }) => {
        const room = rooms.get(roomId);
        if (!room || room.creatorId !== socket.user._id) return;

        const participant = room.participants.find(p => p.id === userId);
        if (participant) {
            participant.isMuted = true;
            io.to(roomId).emit('user-muted', { userId });
            io.to(participant.socketId).emit('muted-by-moderator');
        }
    });

    socket.on('unmute-user', ({ roomId, userId }) => {
        const room = rooms.get(roomId);
        if (!room || room.creatorId !== socket.user._id) return;

        const participant = room.participants.find(p => p.id === userId);
        if (participant) {
            participant.isMuted = false;
            io.to(roomId).emit('user-unmuted', { userId });
            io.to(participant.socketId).emit('unmuted-by-moderator');
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.user.email || socket.user.id}`);
        rooms.forEach((room, roomId) => {
            const index = room.participants.findIndex(p => p.socketId === socket.id);
            if (index !== -1) {
                const user = room.participants[index];
                room.participants.splice(index, 1);
                socket.to(roomId).emit('user-left', { userId: user.id });
                io.to(roomId).emit('participants-updated', room.participants);
                if (room.participants.length === 0) {
                    rooms.delete(roomId);
                }
            }
        });
    });

    socket.on('error', (err) => {
        console.error('Socket.IO error:', err.message);
    });
});

server.listen(5001, () => {
    console.log('Socket.IO server running on port 5001');
});
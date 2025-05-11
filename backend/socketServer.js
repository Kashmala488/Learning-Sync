require('dotenv').config({ path: './config.env' });

const { Server } = require('socket.io');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const logger = require('pino')();
const { createClient } = require('redis');
const http = require('http');
const express = require('express');
const axios = require('axios');

const app = express();
const server = http.createServer(app);

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_here';
const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/your_database';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const rooms = new Map();

const io = new Server(server, {
  path: '/socket.io',
  cors: {
    origin: [process.env.REACT_APP_FRONTEND_URL || 'http://localhost:3000', 'http://127.0.0.1:5500','http://127.0.0.1:5501'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['polling', 'websocket'], // Change order to try polling first
  allowEIO3: true,
  pingTimeout: 60000, // Increase timeout
  pingInterval: 25000,
  connectTimeout: 30000, // Add connection timeout
  maxHttpBufferSize: 1e8, // Increase buffer size
});

mongoose
  .connect(MONGODB_URI)
  .then(() => logger.info('Socket.IO server connected to MongoDB'))
  .catch((err) => logger.error('MongoDB connection error:', err.message));

const redisClient = createClient({
  url: REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        logger.error('Redis max retries reached, giving up');
        return false;
      }
      return Math.min(retries * 200, 5000);
    },
  },
});

redisClient.on('error', (err) => {
  logger.error('Redis connection error:', err.message);
});

redisClient.on('ready', () => {
  logger.info('Redis client ready');
});

redisClient.on('reconnecting', () => {
  logger.info('Redis client reconnecting...');
});

async function connectRedis() {
  try {
    await redisClient.connect();
    logger.info('Connected to Redis successfully');
  } catch (err) {
    logger.error('Failed to connect to Redis:', err.message);
    logger.warn('Using in-memory storage as Redis is unavailable');
  }
}

connectRedis();

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    logger.error('Authentication error: No token provided');
    return next(new Error('Authentication error: No token provided'));
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    logger.info('JWT payload:', decoded);
    socket.user = {
      userId: decoded.id || decoded.userId || decoded.sub,
      email: decoded.email || 'unknown@example.com',
      name: decoded.name || decoded.email?.split('@')[0] || 'Unknown',
    };
    next();
  } catch (err) {
    logger.error('JWT verification failed:', { error: err.message, token });
    return next(new Error(`Authentication error: Invalid token - ${err.message}`));
  }
});

io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.user.email}, Socket ID: ${socket.id}, User ID: ${socket.user.userId}`);

  socket.on('join-room', async ({ roomId, groupId, userId, email, name }, callback) => {
    logger.info('Join-room:', { roomId, groupId, userId, email, name });

    if (!roomId || !groupId || !userId || !email || !name) {
      const errorMsg = `Missing required fields: roomId=${roomId}, groupId=${groupId}, userId=${userId}, email=${email}, name=${name}`;
      logger.error(errorMsg);
      return callback({ error: errorMsg });
    }

    try {
      const response = await axios.get(`http://localhost:4000/api/groups/${groupId}`, {
        headers: { Authorization: `Bearer ${socket.handshake.auth.token}` },
      }).catch((err) => {
        throw new Error(`Failed to fetch group: ${err.response?.status} ${err.message}`);
      });

      const group = response.data;
      if (!group.members.some((member) => member._id === userId)) {
        logger.error(`User ${email} not in group ${groupId}`);
        return callback({ error: 'User not in group' });
      }

      socket.join(roomId);
      let room = rooms.get(roomId) || { participants: [], creatorId: null, screenSharer: null };
      const participant = {
        id: userId,
        email,
        name,
        socketId: socket.id,
        isVideoOn: false,
        isMuted: false,
        isSharingScreen: false,
      };

      room.participants = room.participants.filter((p) => p.id !== userId);
      room.participants.push(participant);
      if (!room.creatorId) {
        room.creatorId = userId;
      }
      rooms.set(roomId, room);

      await redisClient.hSet(`room:${roomId}`, userId, JSON.stringify(participant));

      let participants = room.participants;
      try {
        const redisParticipants = await redisClient.hGetAll(`room:${roomId}`);
        participants = Object.values(redisParticipants).map((p) => JSON.parse(p));
      } catch (err) {
        logger.warn('Failed to fetch participants from Redis, using in-memory:', err.message);
      }

      logger.info(`User ${email} joined room ${roomId}, participants: ${participants.length}`);
      io.to(roomId).emit('participants-updated', participants);
      callback({ participants });
    } catch (err) {
      logger.error(`Join-room error for ${email}: ${err.message}`);
      callback({ error: err.message });
    }
  });

  socket.on('signal', ({ to, signal, initiator }) => {
    logger.info(`Signal from ${socket.id} to ${to}, initiator: ${initiator}`);
    io.to(to).emit('signal', { from: socket.id, signal, initiator });
  });

  socket.on('group-message', async (message) => {
    const msg = {
      senderId: socket.user.userId,
      senderName: socket.user.name,
      content: message.content,
      file: message.file,
      timestamp: new Date().toISOString(),
    };
    io.to(message.roomId).emit('group-message', msg);
    try {
      await redisClient.lPush(`messages:${message.roomId}`, JSON.stringify(msg));
    } catch (err) {
      logger.error('Failed to store message in Redis:', err.message);
    }
  });

  socket.on('private-message', ({ to, roomId, content, file }) => {
    const msg = {
      senderId: socket.user.userId,
      senderName: socket.user.name,
      content,
      file,
      timestamp: new Date().toISOString(),
    };
    socket.to(to).emit('private-message', { from: socket.user.email, message: msg });
  });

  socket.on('toggle-video', async ({ roomId, isVideoOn }) => {
    logger.info(`Toggle video for ${socket.user.email}: ${isVideoOn}`);
    let room = rooms.get(roomId);
    if (room) {
      room.participants = room.participants.map((p) =>
        p.socketId === socket.id ? { ...p, isVideoOn } : p
      );
      rooms.set(roomId, room);
      try {
        await redisClient.hSet(
          `room:${roomId}`,
          socket.user.userId,
          JSON.stringify(room.participants.find((p) => p.socketId === socket.id))
        );
        const redisParticipants = await redisClient.hGetAll(`room:${roomId}`);
        const participants = Object.values(redisParticipants).map((p) => JSON.parse(p));
        io.to(roomId).emit('participants-updated', participants);
      } catch (err) {
        logger.error('Failed to update video status in Redis:', err.message);
        io.to(roomId).emit('participants-updated', room.participants);
      }
    }
  });

  socket.on('mute-user', async ({ roomId, userId }) => {
    let room = rooms.get(roomId);
    if (room && room.creatorId === socket.user.userId) {
      room.participants = room.participants.map((p) =>
        p.id === userId ? { ...p, isMuted: true } : p
      );
      rooms.set(roomId, room);
      try {
        await redisClient.hSet(
          `room:${roomId}`,
          userId,
          JSON.stringify(room.participants.find((p) => p.id === userId))
        );
        const redisParticipants = await redisClient.hGetAll(`room:${roomId}`);
        const participants = Object.values(redisParticipants).map((p) => JSON.parse(p));
        io.to(roomId).emit('participants-updated', participants);
        io.to(roomId).emit('user-muted', { userId });
      } catch (err) {
        logger.error('Failed to mute user in Redis:', err.message);
        io.to(roomId).emit('participants-updated', room.participants);
      }
    }
  });

  socket.on('unmute-user', async ({ roomId, userId }) => {
    let room = rooms.get(roomId);
    if (room && room.creatorId === socket.user.userId) {
      room.participants = room.participants.map((p) =>
        p.id === userId ? { ...p, isMuted: false } : p
      );
      rooms.set(roomId, room);
      try {
        await redisClient.hSet(
          `room:${roomId}`,
          userId,
          JSON.stringify(room.participants.find((p) => p.id === userId))
        );
        const redisParticipants = await redisClient.hGetAll(`room:${roomId}`);
        const participants = Object.values(redisParticipants).map((p) => JSON.parse(p));
        io.to(roomId).emit('participants-updated', participants);
        io.to(roomId).emit('user-unmuted', { userId });
      } catch (err) {
        logger.error('Failed to unmute user in Redis:', err.message);
        io.to(roomId).emit('participants-updated', room.participants);
      }
    }
  });

  socket.on('screen-sharing', async ({ roomId, isSharing }) => {
    logger.info(`Screen sharing by ${socket.user.email}: ${isSharing} in room ${roomId}`);
    let room = rooms.get(roomId);
    if (room) {
      if (isSharing && room.screenSharer && room.screenSharer !== socket.user.userId) {
        logger.warn(`Screen sharing denied for ${socket.user.email}: Another user is already sharing`);
        socket.emit('error', { message: 'Another user is already sharing their screen' });
        return;
      }
      room.participants = room.participants.map((p) =>
        p.socketId === socket.id ? { ...p, isSharingScreen: isSharing } : p
      );
      room.screenSharer = isSharing ? socket.user.userId : null;
      rooms.set(roomId, room);
      try {
        await redisClient.hSet(
          `room:${roomId}`,
          socket.user.userId,
          JSON.stringify(room.participants.find((p) => p.socketId === socket.id))
        );
        const redisParticipants = await redisClient.hGetAll(`room:${roomId}`);
        const participants = Object.values(redisParticipants).map((p) => JSON.parse(p));
        logger.info(`Emitting screen-sharing update to room ${roomId}: ${JSON.stringify({ userId: socket.user.userId, isSharing })}`);
        io.to(roomId).emit('screen-sharing', { userId: socket.user.userId, isSharing });
        io.to(roomId).emit('participants-updated', participants);
      } catch (err) {
        logger.error('Failed to update screen-sharing status in Redis:', err.message);
        io.to(roomId).emit('screen-sharing', { userId: socket.user.userId, isSharing });
        io.to(roomId).emit('participants-updated', room.participants);
      }
    } else {
      logger.warn(`Room ${roomId} not found for screen sharing by ${socket.user.email}`);
    }
  });

  socket.on('leave-room', async ({ roomId, userId }) => {
    logger.info(`User ${userId} leaving room ${roomId}`);
    let room = rooms.get(roomId);
    if (room) {
      room.participants = room.participants.filter((p) => p.id !== userId);
      if (room.screenSharer === userId) {
        room.screenSharer = null;
        io.to(roomId).emit('screen-sharing', { userId, isSharing: false });
      }
      if (room.participants.length === 0) {
        logger.info(`Room deleted: ${roomId}`);
        rooms.delete(roomId);
        try {
          await redisClient.del(`room:${roomId}`);
          await redisClient.del(`messages:${roomId}`);
        } catch (err) {
          logger.error('Failed to delete room from Redis:', err.message);
        }
      } else {
        rooms.set(roomId, room);
        try {
          await redisClient.hDel(`room:${roomId}`, userId);
          const redisParticipants = await redisClient.hGetAll(`room:${roomId}`);
          const participants = Object.values(redisParticipants).map((p) => JSON.parse(p));
          io.to(roomId).emit('participants-updated', participants);
          io.to(roomId).emit('user-left', { userId });
        } catch (err) {
          logger.error('Failed to update room in Redis:', err.message);
          io.to(roomId).emit('participants-updated', room.participants);
        }
      }
    }
  });

  socket.on('call-ended', async ({ groupId }) => {
    logger.info(`Call ended for group ${groupId}`);
    rooms.forEach(async (room, roomId) => {
      if (roomId.includes(groupId)) {
        io.to(roomId).emit('call-ended');
        rooms.delete(roomId);
        try {
          await redisClient.del(`room:${roomId}`);
          await redisClient.del(`messages:${roomId}`);
        } catch (err) {
          logger.error('Failed to delete room from Redis:', err.message);
        }
      }
    });
  });

  socket.on('disconnect', async () => {
    logger.info(`User disconnected: ${socket.user.email}, Socket ID: ${socket.id}, User ID: ${socket.user.userId}`);
    rooms.forEach(async (room, roomId) => {
      const participant = room.participants.find((p) => p.socketId === socket.id);
      if (!participant) return;

      room.participants = room.participants.filter((p) => p.socketId !== socket.id);
      if (room.screenSharer === socket.user.userId) {
        room.screenSharer = null;
        io.to(roomId).emit('screen-sharing', { userId: socket.user.userId, isSharing: false });
      }
      if (room.participants.length === 0) {
        logger.info(`Room deleted: ${roomId}`);
        rooms.delete(roomId);
        try {
          await redisClient.del(`room:${roomId}`);
          await redisClient.del(`messages:${roomId}`);
        } catch (err) {
          logger.error('Failed to delete room from Redis:', err.message);
        }
      } else {
        rooms.set(roomId, room);
        try {
          await redisClient.hDel(`room:${roomId}`, socket.user.userId);
          const redisParticipants = await redisClient.hGetAll(`room:${roomId}`);
          const participants = Object.values(redisParticipants).map((p) => JSON.parse(p));
          io.to(roomId).emit('participants-updated', participants);
          io.to(roomId).emit('user-left', { userId: socket.user.userId });
        } catch (err) {
          logger.error('Failed to update room in Redis:', err.message);
          io.to(roomId).emit('participants-updated', room.participants);
        }
      }
    });
  });
});

server.listen(5001, () => {
  logger.info('Socket.IO server running on port 5001');
});
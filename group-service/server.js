const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const jwt = require('jsonwebtoken');
const groupRoutes = require('./routes/groupRoutes');
const authMiddleware = require('./middleware/authMiddleware');

const app = express();
const redis = new Redis({ host: 'redis', port: 6379 });

mongoose.connect('mongodb://mongo:27017/groups', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use(express.json());
app.use('/groups', authMiddleware, groupRoutes);

app.listen(3002, () => console.log('Group Service running on port 3002'));
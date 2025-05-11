const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const app = express();
require('dotenv').config({ path: path.resolve(__dirname, 'config.env') });

// Initialize MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

// Basic CORS setup - more permissive for development
app.use(cors());

// Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
const uploadsPath = path.join(__dirname, 'uploads');
console.log(`Serving static files from: ${uploadsPath}`);
app.use('/uploads', (req, res, next) => {
  console.log(`Static file request: ${req.url}`);
  next();
}, express.static(uploadsPath));

// Add headers for CORS issues
app.use((req, res, next) => {
  // Allow requests from frontend
  const allowedOrigins = ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:4000'];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Request logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Import route files
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/quizzes', require('./routes/quizRoutes'));
app.use('/api/resources', require('./routes/resourceRoutes'));
app.use('/api/groups', require('./routes/groupRoutes'));
app.use('/api/videos', require('./routes/videos'));
app.use('/api/teachers', require('./routes/teacherRoutes'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/students', require('./routes/studentRoutes'));
app.use('/api/learning-paths', require('./routes/learningPathRoutes'));
app.use('/api/users', require('./routes/userRoutes'));

// 404 handler
app.use((req, res, next) => {
  console.log(`[404] Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


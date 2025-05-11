// const express = require('express');
// const cors = require('cors');
// const cookieParser = require('cookie-parser');
// const path = require('path');
// const swaggerUi = require('swagger-ui-express');
// const swaggerSpecs = require('./config/swagger');
// const { connectDatabase } = require('./config/database');
// const { connectRedis } = require('./config/redis');
// const authRoutes = require('./routes/authRoutes');
// const errorMiddleware = require('./middleware/errorMiddleware');

// // Load environment variables from config.env
// const dotenv = require('dotenv');
// dotenv.config({ path: path.resolve(__dirname, '../config.env') });

// const app = express();
// const PORT = process.env.PORT || 4001;

// // Middleware
// app.use(cors({
//   origin: ['http://localhost:3000', 'http://localhost:4000'],
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization']
// }));
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(cookieParser());

// // Swagger Documentation
// app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
//   explorer: true,
//   customCss: '.swagger-ui .topbar { display: none }',
//   customSiteTitle: "Auth Service API Documentation"
// }));

// // Request logger
// app.use((req, res, next) => {
//   console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
//   next();
// });

// // Routes
// app.use('/api/auth', authRoutes);

// // Health check
// app.get('/health', (req, res) => {
//   res.status(200).json({ status: 'ok' });
// });

// // Error handling middleware
// app.use((err, req, res, next) => {
//   console.error('Error:', err);
//   res.status(err.statusCode || 500).json({
//     success: false,
//     message: err.message || 'Something went wrong',
//     error: process.env.NODE_ENV === 'development' ? err : {}
//   });
// });

// // Start server
// const startServer = async () => {
//   try {
//     // Connect to Redis with retry
//     let redisConnected = false;
//     let retryCount = 0;
//     const maxRetries = 5;

//     while (!redisConnected && retryCount < maxRetries) {
//       try {
//         redisConnected = await connectRedis();
//         if (!redisConnected) {
//           retryCount++;
//           console.log(`Redis connection attempt ${retryCount} failed, retrying in 5 seconds...`);
//           await new Promise(resolve => setTimeout(resolve, 5000));
//         }
//       } catch (error) {
//         console.error('Redis connection error:', error);
//         retryCount++;
//         if (retryCount < maxRetries) {
//           console.log(`Retrying Redis connection in 5 seconds... (Attempt ${retryCount}/${maxRetries})`);
//           await new Promise(resolve => setTimeout(resolve, 5000));
//         }
//       }
//     }

//     if (!redisConnected) {
//       console.warn('Could not connect to Redis, continuing with in-memory cache');
//     }
    
//     // Connect to MongoDB
//     console.log('Connecting to MongoDB...');
//     await connectDatabase();
//     console.log('Successfully connected to MongoDB database!');
    
//     const server = app.listen(PORT, () => {
//       console.log(`Auth service running on port ${PORT}`);
//     });

//     // Handle graceful shutdown
//     process.on('SIGTERM', () => {
//       console.log('SIGTERM received. Shutting down gracefully...');
//       server.close(() => {
//         console.log('Server closed');
//         process.exit(0);
//       });
//     });

//   } catch (error) {
//     console.error('Unable to start server:', error);
//     process.exit(1);
//   }
// };

// startServer();

// module.exports = app;

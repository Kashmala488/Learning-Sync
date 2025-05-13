
     const express = require('express');
     const axios = require('axios');
     const jwt = require('jsonwebtoken');
     const cors = require('cors');
     const dotenv = require('dotenv');

     dotenv.config();

     const app = express();
     const PORT = process.env.PORT || 3000;

     app.use(cors({
       origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000', 'http://localhost:5173'],
       credentials: true
     }));
     app.use(express.json());

     // JWT Middleware
     const authenticateJWT = (req, res, next) => {
       const authHeader = req.headers.authorization;
       if (authHeader) {
         const token = authHeader.split(' ')[1];
         jwt.verify(token, process.env.JWT_SECRET || '3f8b9c2e5d4a7f1e6c0a9b8d2e4f7a1c', (err, user) => {
           if (err) {
             return res.status(403).json({ error: 'Invalid or expired token' });
           }
           req.user = user;
           next();
         });
       } else {
         res.status(401).json({ error: 'Authorization header missing' });
       }
     };

     // Health Check
     app.get('/health', (req, res) => {
       res.status(200).json({ status: 'API Gateway is running' });
     });

     // Proxy Routes
     const proxyRequest = async (req, res, targetUrl) => {
       try {
         const response = await axios({
           method: req.method,
           url: `${targetUrl}${req.originalUrl}`,
           headers: { ...req.headers, host: undefined, connection: undefined },
           data: req.body
         });
         res.status(response.status).json(response.data);
       } catch (err) {
         res.status(err.response?.status || 500).json({ error: err.message });
       }
     };

     // Auth Service Routes (no JWT required for login/register)
     app.use('/auth', (req, res) => {
       proxyRequest(req, res, process.env.AUTH_SERVICE_URL || 'http://auth-service:4001');
     });

     // Group Service Routes (JWT required)
     app.use('/groups', authenticateJWT, (req, res) => {
       proxyRequest(req, res, process.env.GROUP_SERVICE_URL || 'http://group-service:3002');
     });

     // Video Call Service Routes (JWT required)
     app.use('/video', authenticateJWT, (req, res) => {
       proxyRequest(req, res, process.env.VIDEO_CALL_SERVICE_URL || 'http://video-call-service:3003');
     });

     // Backend Routes (monolithic backend, JWT required)
     app.use('/', authenticateJWT, (req, res) => {
       proxyRequest(req, res, process.env.BACKEND_URL || 'http://backend:3003');
     });

     app.listen(PORT, () => {
       console.log(`API Gateway running on port ${PORT}`);
     });
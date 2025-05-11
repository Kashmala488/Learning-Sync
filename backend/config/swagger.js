const swaggerJsDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'WebPorj API',
      version: '1.0.0',
      description: 'REST API Documentation for WebPorj',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      },
      license: {
        name: 'Apache 2.0',
        url: 'http://www.apache.org/licenses/LICENSE-2.0.html'
      }
    },
    servers: [
      {
        url: 'http://localhost:4000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [{
      bearerAuth: []
    }]
  },
  // Path to the API docs
  apis: [
    './routes/*.js',
    './controllers/*.js',
    './models/*.js',
    './server.js'
  ]
};

const specs = swaggerJsDoc(options);

module.exports = specs; 
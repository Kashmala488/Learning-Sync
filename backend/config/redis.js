const Redis = require('ioredis');
require('dotenv').config();

// Redis configuration from environment variables or defaults
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const CACHE_TTL = parseInt(process.env.CACHE_TTL || '3600', 10); // Default: 1 hour

// Create a mock Redis client that will be used if the real connection fails
const createMockRedisClient = () => {
  console.warn('Using in-memory mock Redis client');
  const cache = new Map();
  
  return {
    get: async (key) => {
      const item = cache.get(key);
      if (!item) return null;
      
      const { value, expiry } = item;
      if (expiry && expiry < Date.now()) {
        cache.delete(key);
        return null;
      }
      
      return value;
    },
    
    setex: async (key, ttl, value) => {
      const expiry = ttl ? Date.now() + (ttl * 1000) : null;
      cache.set(key, { value, expiry });
      return 'OK';
    },
    
    del: async (keys) => {
      if (!Array.isArray(keys)) keys = [keys];
      let count = 0;
      for (const key of keys) {
        if (cache.delete(key)) count++;
      }
      return count;
    },
    
    keys: async (pattern) => {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return Array.from(cache.keys()).filter(key => regex.test(key));
    },
    
    // Mock other necessary methods
    on: () => {},
    connect: () => {},
    disconnect: () => {}
  };
};

// Try to create Redis client
let redisClient;
try {
  redisClient = new Redis(REDIS_URL, {
    retryStrategy: (times) => {
      // Retry with exponential backoff up to 5 attempts
      if (times > 5) {
        console.error('Redis connection failed after 5 attempts, giving up');
        return false;
      }
      const delay = Math.min(times * 200, 2000);
      return delay;
    },
    connectTimeout: 10000,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true
  });

  // Handle Redis connection events
  redisClient.on('connect', () => {
    console.log('Redis client connected');
  });

  redisClient.on('error', (err) => {
    console.error('Redis client error:', err);
    // If the connection fails catastrophically, switch to mock client
    if (err.code === 'ECONNREFUSED' || err.code === 'CONNECTION_BROKEN') {
      console.warn('Switching to in-memory mock Redis client');
      redisClient = createMockRedisClient();
    }
  });

  redisClient.on('reconnecting', () => {
    console.log('Redis client reconnecting...');
  });
  
  // Test connection with timeout
  const connectionTest = setTimeout(() => {
    console.warn('Redis connection test timed out, switching to mock client');
    redisClient = createMockRedisClient();
  }, 5000);
  
  redisClient.ping().then(() => {
    clearTimeout(connectionTest);
    console.log('Redis server is responsive');
  }).catch((err) => {
    clearTimeout(connectionTest);
    console.error('Redis ping failed:', err.message);
    redisClient = createMockRedisClient();
  });
} catch (err) {
  console.error('Failed to initialize Redis client:', err);
  redisClient = createMockRedisClient();
}

module.exports = {
  redisClient,
  CACHE_TTL
}; 
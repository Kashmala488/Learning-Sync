const { redisClient, CACHE_TTL } = require('../config/redis');

/**
 * Middleware for caching Express route responses
 * @param {number} duration - Cache duration in seconds (defaults to CACHE_TTL)
 * @returns {Function} Express middleware function
 */
const cacheMiddleware = (duration = CACHE_TTL) => {
  return async (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Create cache key from request URL and auth user ID (if available)
    const userId = req.user?._id ? req.user._id.toString() : 'anonymous';
    const cacheKey = `cache:${userId}:${req.originalUrl || req.url}`;
    
    try {
      // Try to get cached response
      const cachedResponse = await redisClient.get(cacheKey);
      
      if (cachedResponse) {
        const parsedResponse = JSON.parse(cachedResponse);
        console.log(`[Cache] HIT: ${cacheKey}`);
        return res.json(parsedResponse);
      }

      // If no cached response, modify res.json to cache the response
      const originalJson = res.json;
      res.json = function(data) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redisClient.setex(cacheKey, duration, JSON.stringify(data));
          console.log(`[Cache] MISS: ${cacheKey} - Cached for ${duration}s`);
        }
        
        // Call original json method
        return originalJson.call(this, data);
      };
      
      next();
    } catch (err) {
      console.error('Redis cache error:', err);
      // Continue without caching if Redis fails
      next();
    }
  };
};

/**
 * Clear cache by pattern
 * @param {string} pattern - Redis key pattern to clear (default: all cache entries)
 * @returns {Promise<number>} Number of keys cleared
 */
const clearCache = async (pattern = 'cache:*') => {
  try {
    // Get all keys matching pattern
    const keys = await redisClient.keys(pattern);
    
    if (keys.length > 0) {
      await redisClient.del(keys);
      console.log(`[Cache] Cleared ${keys.length} entries matching: ${pattern}`);
    }
    
    return keys.length;
  } catch (err) {
    console.error('Error clearing cache:', err);
    return 0;
  }
};

/**
 * Create a middleware to clear cache when specific routes are hit
 * @param {string} pattern - Redis key pattern to clear
 * @returns {Function} Express middleware function
 */
const clearCacheMiddleware = (pattern = 'cache:*') => {
  return async (req, res, next) => {
    // Store original end method
    const originalEnd = res.end;
    
    // Override end method to clear cache after successful write operations
    res.end = async function(...args) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        await clearCache(pattern);
      }
      
      // Call original end method
      return originalEnd.apply(this, args);
    };
    
    next();
  };
};

module.exports = {
  cacheMiddleware,
  clearCache,
  clearCacheMiddleware
}; 
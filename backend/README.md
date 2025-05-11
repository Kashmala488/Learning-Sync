# WebPorj Backend

## Redis Caching Implementation

The application uses Redis for caching API responses to improve performance and reduce load on the database. The caching implementation is resilient and will fall back to an in-memory cache if Redis is not available.

### Key Features

- **Intelligent Caching**: GET endpoints are cached with appropriate TTL values
- **Cache Invalidation**: POST/PUT/DELETE operations automatically invalidate related cache entries
- **Resilient Design**: Falls back to in-memory caching if Redis is not available
- **Per-User Caching**: Cache keys include user ID to prevent data leakage between users

### Cache Configuration

The Redis configuration is managed through environment variables:

- `REDIS_URL`: Redis connection URL (default: `redis://localhost:6379`)
- `CACHE_TTL`: Default cache TTL in seconds (default: 3600 = 1 hour)

### Cached Routes

The following route categories implement caching:

1. **Resources**: User resources and shared resources (TTL: 30 minutes)
2. **Groups**: Group listings and group details (TTL: 30 minutes)
3. **Dashboard**: User dashboard data (TTL: 15 minutes)
4. **Quizzes**: Quiz data and results (TTL: 30 minutes)
5. **Learning Paths**: Learning path data (TTL: 30 minutes)
6. **Admin Routes**: Various admin endpoints with appropriate TTLs

### Implementation Details

- `config/redis.js`: Redis client configuration with fallback
- `middleware/cacheMiddleware.js`: Express middleware for caching responses
  - `cacheMiddleware`: Caches GET responses
  - `clearCacheMiddleware`: Invalidates cache entries for data-modifying operations

### Running without Redis

The system will automatically detect if Redis is unavailable and switch to an in-memory cache implementation. This ensures the application runs smoothly even if Redis is not installed or configured.

### Cache Invalidation Patterns

- Resource modifications invalidate: `cache:*:*/api/resources*`
- Group modifications invalidate: `cache:*:*/api/groups*`
- Quiz submissions invalidate: `cache:*:*/api/quizzes/student/results*`
- Learning path updates invalidate: `cache:*:*/api/learning-paths*`

### Best Practices

1. Use specific cache keys for specific resources
2. Set appropriate TTL values based on data volatility
3. Clear cache on write operations
4. Include user context in cache keys for security 
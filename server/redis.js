import Redis from 'ioredis';

// Use the provided production URL by default if env var is missing
const REDIS_URL = process.env.REDIS_URL || 'redis://default:5faf81de3571e8b7146c@qhosting_redis:6379';

console.log('🔌 Connecting to Redis Cache...');

const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError(err) {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  }
});

redis.on('connect', () => {
  console.log('✅ [PROD] Redis Cache Conectado');
});

redis.on('error', (err) => {
  console.warn('⚠️ Redis Error (Cache will be skipped):', err.message);
});

export default redis;
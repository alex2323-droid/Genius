import { Request, Response, NextFunction } from 'express';

interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
}

interface RequestRecord {
  timestamps: number[];
}

const limitersStore = new Map<string, Map<string, RequestRecord>>();

export function createRateLimiter(key: string, config: RateLimitConfig) {
  // If the store for this specific key doesn't exist, create it
  if (!limitersStore.has(key)) {
    limitersStore.set(key, new Map<string, RequestRecord>());
  }
  const store = limitersStore.get(key)!;

  // Cleanup old timestamps periodically to avoid memory leaks
  const interval = setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of store.entries()) {
      record.timestamps = record.timestamps.filter(t => now - t < config.windowMs);
      if (record.timestamps.length === 0) {
        store.delete(ip);
      }
    }
  }, config.windowMs);

  // Unref interval if running in node to prevent it from blocking process exit
  if (interval && typeof interval.unref === 'function') {
    interval.unref();
  }

  return (req: Request, res: Response, next: NextFunction) => {
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const ip = (Array.isArray(rawIp) ? rawIp[0] : typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : rawIp) || '127.0.0.1';

    const now = Date.now();
    if (!store.has(ip)) {
      store.set(ip, { timestamps: [] });
    }

    const record = store.get(ip)!;
    // Filter out timestamps outside the window
    record.timestamps = record.timestamps.filter(t => now - t < config.windowMs);

    if (record.timestamps.length >= config.max) {
      const oldestTimestamp = record.timestamps[0];
      const msLeft = config.windowMs - (now - oldestTimestamp);
      const minutesLeft = Math.ceil(msLeft / 60000);
      const secondsLeft = Math.ceil(msLeft / 1000);
      
      res.setHeader('Retry-After', Math.ceil(msLeft / 1000));
      return res.status(429).json({
        success: false,
        error: config.message || 'Demasiadas solicitudes desde esta IP, por favor reintenta más tarde.',
        retryAfterSeconds: secondsLeft,
        retryAfterMinutes: minutesLeft
      });
    }

    record.timestamps.push(now);
    
    // Set headers
    res.setHeader('X-RateLimit-Limit', config.max);
    res.setHeader('X-RateLimit-Remaining', config.max - record.timestamps.length);
    res.setHeader('X-RateLimit-Reset', new Date(now + config.windowMs).toISOString());

    next();
  };
}

// 1. General Limiter: 120 requests per 1 minute (for fast assets/basic status)
export const generalLimiter = createRateLimiter('general', {
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  message: 'Límite de solicitudes generales superado. Por favor, disminuye el ritmo de peticiones.'
});

// 2. Strict AI Limiter: 10 requests per minute (for expensive generative routes)
export const expensiveAiLimiter = createRateLimiter('expensive-ai', {
  windowMs: 60 * 1000, // 1 minute window
  max: 10,
  message: 'Has realizado demasiadas consultas de IA en poco tiempo. Por favor, espera 1 minuto antes de continuar.'
});

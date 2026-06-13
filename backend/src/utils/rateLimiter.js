// ════════════════════════════════════════════════════════════════
// Simple in-memory IP rate limiter (no external deps)
// Used to throttle brute-force login attempts.
// Behind Render's proxy — requires app.set('trust proxy', 1) so
// req.ip resolves to the real client IP, not Render's internal IP.
// ════════════════════════════════════════════════════════════════

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;           // failed attempts allowed per window

// Map<ip, { count: number, firstAttempt: number }>
const attempts = new Map();

// Periodically purge stale entries so the map doesn't grow unbounded
setInterval(() => {
  const now = Date.now();
  for (const [ip, rec] of attempts) {
    if (now - rec.firstAttempt > WINDOW_MS) attempts.delete(ip);
  }
}, WINDOW_MS).unref?.();

function getKey(req) {
  return req.ip || req.headers['x-forwarded-for'] || 'unknown';
}

/**
 * Express middleware — blocks an IP after too many failed attempts.
 * Only failed login attempts should call recordFailure(); successful
 * logins call resetAttempts() to clear the counter.
 */
export function loginRateLimiter(req, res, next) {
  const key = getKey(req);
  const now = Date.now();
  const rec = attempts.get(key);

  if (rec) {
    // Reset the window if it has elapsed
    if (now - rec.firstAttempt > WINDOW_MS) {
      attempts.delete(key);
    } else if (rec.count >= MAX_ATTEMPTS) {
      const retryAfterSec = Math.ceil((WINDOW_MS - (now - rec.firstAttempt)) / 1000);
      res.set('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        error: `Too many login attempts. Try again in ${Math.ceil(retryAfterSec / 60)} minute(s).`,
      });
    }
  }
  next();
}

export function recordFailure(req) {
  const key = getKey(req);
  const now = Date.now();
  const rec = attempts.get(key);
  if (rec && now - rec.firstAttempt <= WINDOW_MS) {
    rec.count += 1;
  } else {
    attempts.set(key, { count: 1, firstAttempt: now });
  }
}

export function resetAttempts(req) {
  attempts.delete(getKey(req));
}

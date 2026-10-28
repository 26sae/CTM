const crypto = require('crypto');

const passwordKeyLength = 64;
const passwordSaltLength = 16;
const passwordCost = 16384;
const passwordBlockSize = 8;
const passwordParallelization = 1;
const defaultMaxRateLimitEntries = 10000;

function hashPassword(password) {
  const salt = crypto.randomBytes(passwordSaltLength).toString('hex');
  const derivedKey = crypto.scryptSync(
    password,
    salt,
    passwordKeyLength,
    {
      N: passwordCost,
      r: passwordBlockSize,
      p: passwordParallelization,
    }
  );
  return `scrypt$${salt}$${derivedKey.toString('hex')}`;
}

function verifyPassword(password, storedPassword) {
  if (typeof storedPassword !== 'string') return false;

  if (!storedPassword.startsWith('scrypt$')) {
    const actual = Buffer.from(password);
    const expected = Buffer.from(storedPassword);
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  }

  const [, salt, expectedHex] = storedPassword.split('$');
  if (!salt || !expectedHex || !/^[a-f0-9]+$/i.test(expectedHex)) return false;

  const expected = Buffer.from(expectedHex, 'hex');
  const actual = crypto.scryptSync(
    password,
    salt,
    expected.length,
    {
      N: passwordCost,
      r: passwordBlockSize,
      p: passwordParallelization,
    }
  );
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function isPasswordHash(value) {
  return typeof value === 'string' && value.startsWith('scrypt$');
}

function createRateLimiter({
  windowMs,
  max,
  keyGenerator,
  maxEntries = defaultMaxRateLimitEntries,
}) {
  if (!Number.isFinite(windowMs) || windowMs <= 0) {
    throw new TypeError('windowMs must be a positive number');
  }
  if (!Number.isInteger(max) || max <= 0) {
    throw new TypeError('max must be a positive integer');
  }
  if (typeof keyGenerator !== 'function') {
    throw new TypeError('keyGenerator must be a function');
  }
  if (!Number.isInteger(maxEntries) || maxEntries <= 0) {
    throw new TypeError('maxEntries must be a positive integer');
  }

  const entries = new Map();
  let lastCleanup = Date.now();

  return (req, res, next) => {
    const now = Date.now();
    if (now - lastCleanup >= Math.min(windowMs, 60000)) {
      for (const [key, entry] of entries) {
        if (entry.resetAt <= now) entries.delete(key);
      }
      lastCleanup = now;
    }

    const key = String(keyGenerator(req) || 'unknown');
    const entry = entries.get(key);
    if (!entry || entry.resetAt <= now) {
      if (entries.size >= maxEntries) {
        let earliestKey;
        let earliestReset = Infinity;
        for (const [candidateKey, candidate] of entries) {
          if (candidate.resetAt < earliestReset) {
            earliestKey = candidateKey;
            earliestReset = candidate.resetAt;
          }
        }
        if (earliestKey !== undefined) entries.delete(earliestKey);
      }
      entries.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count += 1;
    if (entry.count > max) {
      const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ error: 'Too many requests. Try again later.' });
    }
    return next();
  };
}

function createLoginRateLimiter({
  windowMs = 15 * 60 * 1000,
  maxPerIp = 20,
  maxPerEmail = 10,
  maxEntries = defaultMaxRateLimitEntries,
} = {}) {
  const ipLimiter = createRateLimiter({
    windowMs,
    max: maxPerIp,
    keyGenerator: clientIp,
    maxEntries,
  });
  const emailLimiter = createRateLimiter({
    windowMs,
    max: maxPerEmail,
    keyGenerator: (req) => {
      const email = typeof req.body?.email === 'string'
        ? req.body.email.trim().toLowerCase().slice(0, 254)
        : '';
      return crypto.createHash('sha256').update(email).digest('hex');
    },
    maxEntries,
  });

  return (req, res, next) => ipLimiter(req, res, () =>
    emailLimiter(req, res, next)
  );
}

function createApiRateLimiter({
  windowMs = 60 * 1000,
  max = 120,
  maxEntries = defaultMaxRateLimitEntries,
} = {}) {
  return createRateLimiter({
    windowMs,
    max,
    keyGenerator: clientIp,
    maxEntries,
  });
}

function securityHeaders(_req, res, next) {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Cross-Origin-Opener-Policy': 'same-origin',
  });
  next();
}

function clientIp(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

module.exports = {
  clientIp,
  createApiRateLimiter,
  createLoginRateLimiter,
  createRateLimiter,
  hashPassword,
  isPasswordHash,
  securityHeaders,
  verifyPassword,
};

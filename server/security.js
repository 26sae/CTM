const crypto = require('crypto');

const passwordKeyLength = 64;
const passwordSaltLength = 16;
const passwordCost = 16384;
const passwordBlockSize = 8;
const passwordParallelization = 1;

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

function createRateLimiter({ windowMs, max, keyGenerator }) {
  const entries = new Map();
  let lastCleanup = Date.now();

  return (req, res, next) => {
    const now = Date.now();
    if (now - lastCleanup > windowMs) {
      for (const [key, entry] of entries) {
        if (entry.resetAt <= now) entries.delete(key);
      }
      lastCleanup = now;
    }

    const key = keyGenerator(req);
    const entry = entries.get(key);
    if (!entry || entry.resetAt <= now) {
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

function clientIp(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

module.exports = {
  clientIp,
  createRateLimiter,
  hashPassword,
  isPasswordHash,
  verifyPassword,
};

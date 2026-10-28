// security.js
//
// Defensive controls for the Binangonan Banking Corporation simulation.
//
// SECURITY_HARDENING=0 disables the access controls below so the original
// vulnerable behaviour can be demonstrated side by side.
//
// Controls:
//   * hashPassword / verifyPassword - scrypt password hashing (async)
//   * createRateLimiter             - per-IP fixed window (brute force, flooding)
//   * loginLockout                  - per-account lockout after repeated failures
//   * sanitizeText                  - strips HTML so stored XSS cannot execute

const crypto = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);

const SECURITY_HARDENING = process.env.SECURITY_HARDENING !== '0';

// --- Password hashing -------------------------------------------------------
// scrypt N=16384, r=8, p=1 is ~16 MB and ~50-100 ms per hash. The parameters
// are stored in the hash string so they can be raised later without breaking
// existing accounts.
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_SALT_BYTES = 16;
const SCRYPT_MAX_MEM = 64 * 1024 * 1024;
const PASSWORD_MAX_LENGTH = 256;

function validPasswordInput(password) {
  if (typeof password !== 'string') return null;
  if (password.length === 0 || password.length > PASSWORD_MAX_LENGTH) return null;
  return password;
}

async function hashPassword(password) {
  const value = validPasswordInput(password);
  if (!value) {
    throw new Error(`Password must be between 1 and ${PASSWORD_MAX_LENGTH} characters`);
  }

  const salt = crypto.randomBytes(SCRYPT_SALT_BYTES).toString('hex');
  const derivedKey = await scrypt(value, salt, SCRYPT_KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: SCRYPT_MAX_MEM,
  });

  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt}$${derivedKey.toString('hex')}`;
}

function parsePasswordHash(storedPassword) {
  if (typeof storedPassword !== 'string') return null;

  const parts = storedPassword.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return null;

  const [, nRaw, rRaw, pRaw, salt, hashHex] = parts;
  const N = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);

  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return null;
  if (N < 1024 || N > 1048576 || (N & (N - 1)) !== 0) return null;
  if (r < 1 || r > 16 || p < 1 || p > 4) return null;
  if (!/^[a-f0-9]{32}$/i.test(salt)) return null;
  if (!/^[a-f0-9]{128}$/i.test(hashHex)) return null;

  return { N, r, p, salt, hashHex };
}

async function verifyPassword(password, storedPassword) {
  const value = validPasswordInput(password);
  if (!value) return false;

  // Legacy plaintext rows (existing seed data) still work once, then get
  // upgraded on the next successful login via needsRehash().
  if (!storedPassword.startsWith('scrypt$')) {
    const actual = Buffer.from(value);
    const expected = Buffer.from(String(storedPassword));
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  }

  const parsed = parsePasswordHash(storedPassword);
  if (!parsed) return false;

  const expected = Buffer.from(parsed.hashHex, 'hex');
  const actual = await scrypt(value, parsed.salt, expected.length, {
    N: parsed.N,
    r: parsed.r,
    p: parsed.p,
    maxmem: SCRYPT_MAX_MEM,
  });

  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function isPasswordHash(value) {
  return typeof value === 'string' && /^scrypt\$[0-9]+\$[0-9]+\$[0-9]+\$[a-f0-9]+\$[a-f0-9]+$/i.test(value);
}

function needsRehash(storedPassword) {
  if (!isPasswordHash(storedPassword)) return true;
  const parsed = parsePasswordHash(storedPassword);
  if (!parsed) return true;
  return parsed.N !== SCRYPT_N || parsed.r !== SCRYPT_R || parsed.p !== SCRYPT_P;
}

// --- Rate limiting ----------------------------------------------------------
const LOGIN_WINDOW_MS = Number(process.env.LOGIN_WINDOW_MS) || 60_000;
const LOGIN_MAX_PER_IP = Number(process.env.LOGIN_MAX_PER_IP) || 10;
const LOGIN_MAX_FAILURES = Number(process.env.LOGIN_MAX_FAILURES) || 5;
const LOGIN_LOCK_MS = Number(process.env.LOGIN_LOCK_MS) || 15 * 60_000;
const SEARCH_WINDOW_MS = Number(process.env.SEARCH_WINDOW_MS) || 60_000;
const SEARCH_MAX_PER_IP = Number(process.env.SEARCH_MAX_PER_IP) || 60;

function clientIp(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function createRateLimiter({ windowMs, max, event, message, keyGenerator, onLimited }) {
  const buckets = new Map();

  const sweeper = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, windowMs);
  if (typeof sweeper.unref === 'function') sweeper.unref();

  return async function rateLimiter(req, res, next) {
    const key = (keyGenerator || clientIp)(req);
    const now = Date.now();
    let bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;

    if (bucket.count > max) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.set('Retry-After', String(retryAfter));
      if (onLimited) {
        try {
          await onLimited(req);
        } catch (error) {
          console.error(`${event || 'rate limit'} log failed:`, error.message);
        }
      }
      return res.status(429).json({ error: message, retryAfter });
    }

    return next();
  };
}

const failedLogins = new Map();

function loginLockout(req, res, next) {
  if (!SECURITY_HARDENING) return next();

  const email = String(req.body?.email || '').trim().toLowerCase();
  const entry = failedLogins.get(email);

  if (entry && entry.lockedUntil > Date.now()) {
    const retryAfter = Math.max(1, Math.ceil((entry.lockedUntil - Date.now()) / 1000));
    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({
      error: 'Too many failed attempts for this account. Try again later.',
      retryAfter,
    });
  }

  req.loginEmail = email;
  return next();
}

function recordLoginFailure(email) {
  if (!SECURITY_HARDENING) return;

  const key = String(email || '').trim().toLowerCase();
  const entry = failedLogins.get(key) || { count: 0, lockedUntil: 0 };
  entry.count += 1;

  if (entry.count >= LOGIN_MAX_FAILURES) {
    entry.lockedUntil = Date.now() + LOGIN_LOCK_MS;
    entry.count = 0;
  }

  failedLogins.set(key, entry);
}

function recordLoginSuccess(email) {
  failedLogins.delete(String(email || '').trim().toLowerCase());
}

// --- Output sanitization ----------------------------------------------------
// Removes tag delimiters and control characters. Rendering stays text-only in
// React, so this is defence in depth for values stored before the fix.
function sanitizeText(value, maxLength = 255) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, maxLength);
}

function loginIpLimiter(onLimited) {
  return createRateLimiter({
    windowMs: LOGIN_WINDOW_MS,
    max: LOGIN_MAX_PER_IP,
    event: 'login_rate_limited',
    message: 'Too many login attempts from this address. Try again later.',
    keyGenerator: clientIp,
    onLimited,
  });
}

function searchIpLimiter(onLimited) {
  return createRateLimiter({
    windowMs: SEARCH_WINDOW_MS,
    max: SEARCH_MAX_PER_IP,
    event: 'search_rate_limited',
    message: 'Too many search requests from this address. Try again later.',
    keyGenerator: clientIp,
    onLimited,
  });
}

module.exports = {
  SECURITY_HARDENING,
  LOGIN_MAX_FAILURES,
  LOGIN_WINDOW_MS,
  LOGIN_MAX_PER_IP,
  LOGIN_LOCK_MS,
  SEARCH_WINDOW_MS,
  SEARCH_MAX_PER_IP,
  PASSWORD_MAX_LENGTH,
  clientIp,
  createRateLimiter,
  loginIpLimiter,
  searchIpLimiter,
  loginLockout,
  recordLoginFailure,
  recordLoginSuccess,
  hashPassword,
  verifyPassword,
  isPasswordHash,
  needsRehash,
  sanitizeText,
};

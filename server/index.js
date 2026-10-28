const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { getDatabaseConfig } = require('./database');
const { initializeDatabase } = require('./schema');

const app = express();
app.set('trust proxy', true);

// Intentionally permissive CORS for the simulation environment.
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
// Accept HTML form posts (application/x-www-form-urlencoded) so a cross-site
// <form> can hit the CSRF-vulnerable endpoint below.
app.use(express.urlencoded({ extended: true }));

// INTENTIONAL TRAINING WEAKNESS — session identity via a plain cookie with no
// CSRF token and no SameSite=Strict. Reads the signed-in user id straight from
// the cookie the browser sends automatically.
function sessionUserId(req) {
  const raw = req.headers.cookie || '';
  const match = raw.split(';').map((c) => c.trim()).find((c) => c.startsWith('bb_session='));
  return match ? decodeURIComponent(match.split('=')[1]) : null;
}

const db = mysql.createPool({
  ...getDatabaseConfig(),
  waitForConnections: true,
  connectionLimit: 10,
});

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

async function writeLog(eventType, email, req, details) {
  try {
    await db.query(
      `INSERT INTO logs (event_type, email, ip_address, user_agent, details)
       VALUES (?, ?, ?, ?, ?)`,
      [
        eventType,
        email || null,
        clientIp(req),
        String(req.headers['user-agent'] || 'unknown').slice(0, 255),
        details || null,
      ]
    );
  } catch (error) {
    console.error('Could not write activity log:', error.message);
  }
}

function generateAccountNumber() {
  const stamp = String(Date.now()).slice(-8);
  const suffix = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `2${stamp}${suffix}`;
}

app.get('/api/health', async (_req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected', bank: 'Binangonan Banking Corporation' });
  } catch (error) {
    console.error('Database health check failed:', error.message);
    res.status(503).json({ status: 'error', database: 'unavailable' });
  }
});

app.post('/api/register', async (req, res) => {
  const { name = '', email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const [result] = await db.execute(
      `INSERT INTO users (name, email, password, role, status)
       VALUES (?, ?, ?, 'customer', 'active')`,
      [name, email, password]
    );
    const accountNumber = generateAccountNumber();

    await db.query(
      `INSERT INTO accounts (user_id, account_number, account_type, balance, currency, status)
       VALUES (?, ?, 'Checking', 0, 'PHP', 'active')`,
      [result.insertId, accountNumber]
    );

    const [users] = await db.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
    const [accounts] = await db.query('SELECT * FROM accounts WHERE user_id = ?', [result.insertId]);

    await writeLog('register_success', email, req, `New customer id=${result.insertId}`);

    res.status(201).json({
      message: 'Account created successfully',
      user: users[0],
      accounts,
    });
  } catch (error) {
    console.error('Registration failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------
app.post('/api/login', async (req, res) => {
  const { email = '', password = '' } = req.body;

  try {
    const [rows] = await db.execute(
      'SELECT * FROM users WHERE email = ? AND password = ? LIMIT 1',
      [email, password]
    );

    if (rows.length === 0) {
      await writeLog('login_failed', email, req, 'Invalid email or password');
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = rows[0];

    if (user.status === 'locked') {
      await writeLog('login_failed', email, req, 'Account is locked');
      return res.status(403).json({ error: 'This account is locked. Contact the bank.' });
    }

    const [accounts] = await db.query(
      'SELECT * FROM accounts WHERE user_id = ? ORDER BY id ASC',
      [user.id]
    );

    await writeLog('login_success', email, req, `role=${user.role} user_id=${user.id}`);

    // INTENTIONAL TRAINING WEAKNESS — set a session cookie the browser will
    // attach to any later request, including cross-site ones. sameSite:'lax'
    // keeps it demonstrable between two localhost ports (same site). For an
    // https cross-domain demo use { sameSite: 'none', secure: true }.
    res.cookie('bb_session', String(user.id), { httpOnly: false, sameSite: 'lax' });

    res.json({ message: 'Login successful', user, accounts });
  } catch (error) {
    console.error('Login failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// Transaction search
// ---------------------------------------------------------------------------
app.get('/api/transactions/search', async (req, res) => {
  const query = String(req.query.query || '');

  try {
    const [rows] = await db.execute(
      `SELECT t.*, a.account_number, u.name AS customer_name
       FROM transactions t
       JOIN accounts a ON a.id = t.account_id
       JOIN users u ON u.id = a.user_id
       WHERE t.ref_number = ?
          OR t.description LIKE ?
          OR t.category = ?
       ORDER BY t.created_at DESC
       LIMIT 100`,
      [query, `%${query}%`, query]
    );
    res.json(rows);
  } catch (error) {
    console.error('Transaction search failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// Customer read-only data
// ---------------------------------------------------------------------------
app.get('/api/users/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, name, email, role, phone, address, status, created_at
       FROM users WHERE id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  const fields = [];
  const params = [];

  for (const key of ['name', 'phone', 'address']) {
    if (req.body[key] !== undefined) {
      fields.push(`${key} = ?`);
      params.push(req.body[key]);
    }
  }

  if (fields.length === 0) {
    return res.status(400).json({ error: 'No profile fields supplied' });
  }

  try {
    params.push(req.params.id);
    await db.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);
    const [rows] = await db.query(
      `SELECT id, name, email, role, phone, address, status, created_at
       FROM users WHERE id = ?`,
      [req.params.id]
    );
    res.json({ message: 'Profile updated', user: rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/users/:id/password', async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new passwords are required' });
  }

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

    if (rows[0].password !== currentPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    await db.query('UPDATE users SET password = ? WHERE id = ?', [newPassword, req.params.id]);
    await writeLog('password_changed', rows[0].email, req, `user_id=${rows[0].id}`);
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// INTENTIONAL TRAINING WEAKNESS — CSRF sink.
// State-changing endpoint that identifies the user ONLY from the session
// cookie, accepts a plain form POST, and checks no CSRF token and no Origin.
// A malicious page the victim visits while logged in can auto-submit:
//   <form action="http://localhost:5000/api/profile/email" method="POST">
//     <input name="email" value="attacker@evil.test">
//   </form>
//   <script>document.forms[0].submit()</script>
// Fix: require a per-session CSRF token, or SameSite=Strict + Origin check.
app.post('/api/profile/email', async (req, res) => {
  const userId = sessionUserId(req);
  if (!userId) return res.status(401).json({ error: 'No session cookie' });

  const newEmail = req.body.email;
  if (!newEmail) return res.status(400).json({ error: 'email is required' });

  try {
    await db.query('UPDATE users SET email = ? WHERE id = ?', [newEmail, userId]);
    await writeLog('email_changed', newEmail, req, `user_id=${userId} (no CSRF protection)`);
    res.json({ message: 'Email updated', userId, email: newEmail });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/accounts', async (req, res) => {
  const { userId } = req.query;

  try {
    const [rows] = userId
      ? await db.query(
          'SELECT * FROM accounts WHERE user_id = ? ORDER BY id ASC',
          [userId]
        )
      : await db.query('SELECT * FROM accounts ORDER BY id ASC');

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/transactions', async (req, res) => {
  const { accountId, userId } = req.query;
  const limit = Math.min(Number(req.query.limit) || 200, 500);
  const params = [];
  let sql = `SELECT t.*, a.account_number, u.name AS customer_name
             FROM transactions t
             JOIN accounts a ON a.id = t.account_id
             JOIN users u ON u.id = a.user_id
             WHERE 1 = 1`;

  if (accountId) {
    sql += ' AND t.account_id = ?';
    params.push(accountId);
  }

  if (userId) {
    sql += ' AND a.user_id = ?';
    params.push(userId);
  }

  sql += ' ORDER BY t.created_at DESC LIMIT ?';
  params.push(limit);

  try {
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// Admin back office. No authentication or authorization middleware is present,
// so these endpoints are intentionally exposed for the simulation.
// ---------------------------------------------------------------------------
app.get('/api/admin/users', async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.name, u.email, u.role, u.phone, u.address, u.status, u.created_at,
              COUNT(a.id) AS account_count,
              COALESCE(SUM(a.balance), 0) AS total_balance
       FROM users u
       LEFT JOIN accounts a ON a.user_id = u.id
       GROUP BY u.id
       ORDER BY u.created_at DESC, u.id DESC`
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/users', async (req, res) => {
  const {
    name = '',
    email,
    password = 'Welcome123',
    phone = '',
    address = '',
    role = 'customer',
    status = 'active',
    createAccount = false,
    accountType = 'Checking',
    initialBalance = 0,
  } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO users (name, email, password, role, phone, address, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, email, password, role, phone, address, status]
    );

    let account = null;
    if (createAccount) {
      const accountNumber = generateAccountNumber();
      const [accountResult] = await db.query(
        `INSERT INTO accounts (user_id, account_number, account_type, balance, currency, status)
         VALUES (?, ?, ?, ?, 'PHP', 'active')`,
        [result.insertId, accountNumber, accountType, Number(initialBalance) || 0]
      );
      account = { id: accountResult.insertId, accountNumber, accountType };
    }

    await writeLog('admin_action', email, req, `Created user_id=${result.insertId}`);

    const [rows] = await db.query(
      `SELECT id, name, email, role, phone, address, status, created_at
       FROM users WHERE id = ?`,
      [result.insertId]
    );

    res.status(201).json({ message: 'Customer created', user: rows[0], account });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/admin/users/:id', async (req, res) => {
  const fields = [];
  const params = [];
  const allowed = ['name', 'email', 'password', 'role', 'phone', 'address', 'status'];

  for (const key of allowed) {
    if (req.body[key] !== undefined && req.body[key] !== '') {
      fields.push(`${key} = ?`);
      params.push(req.body[key]);
    }
  }

  if (fields.length === 0) {
    return res.status(400).json({ error: 'No fields supplied' });
  }

  try {
    params.push(req.params.id);
    await db.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);
    await writeLog('admin_action', req.body.email || null, req, `Updated user_id=${req.params.id}`);
    const [rows] = await db.query(
      `SELECT id, name, email, role, phone, address, status, created_at
       FROM users WHERE id = ?`,
      [req.params.id]
    );
    res.json({ message: 'Customer updated', user: rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/admin/users/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    await writeLog('admin_action', null, req, `Deleted user_id=${req.params.id}`);
    res.json({ message: 'Customer deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/accounts', async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT a.*, u.name AS customer_name, u.email AS customer_email
       FROM accounts a
       JOIN users u ON u.id = a.user_id
       ORDER BY a.created_at DESC, a.id DESC`
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/accounts', async (req, res) => {
  const {
    userId,
    accountType = 'Checking',
    balance = 0,
    status = 'active',
  } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'A customer is required' });
  }

  try {
    const accountNumber = generateAccountNumber();
    const [result] = await db.query(
      `INSERT INTO accounts (user_id, account_number, account_type, balance, currency, status)
       VALUES (?, ?, ?, ?, 'PHP', ?)`,
      [userId, accountNumber, accountType, Number(balance) || 0, status]
    );

    await writeLog('admin_action', null, req, `Created account_id=${result.insertId} for user_id=${userId}`);

    const [rows] = await db.query(
      `SELECT a.*, u.name AS customer_name, u.email AS customer_email
       FROM accounts a JOIN users u ON u.id = a.user_id
       WHERE a.id = ?`,
      [result.insertId]
    );

    res.status(201).json({ message: 'Account created', account: rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/admin/accounts/:id', async (req, res) => {
  const fields = [];
  const params = [];
  const allowed = ['account_type', 'balance', 'status'];

  for (const key of allowed) {
    if (req.body[key] !== undefined && req.body[key] !== '') {
      fields.push(`${key} = ?`);
      params.push(key === 'balance' ? Number(req.body[key]) || 0 : req.body[key]);
    }
  }

  if (fields.length === 0) {
    return res.status(400).json({ error: 'No fields supplied' });
  }

  try {
    params.push(req.params.id);
    await db.query(`UPDATE accounts SET ${fields.join(', ')} WHERE id = ?`, params);
    await writeLog('admin_action', null, req, `Updated account_id=${req.params.id}`);
    const [rows] = await db.query(
      `SELECT a.*, u.name AS customer_name, u.email AS customer_email
       FROM accounts a JOIN users u ON u.id = a.user_id
       WHERE a.id = ?`,
      [req.params.id]
    );
    res.json({ message: 'Account updated', account: rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/admin/accounts/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM accounts WHERE id = ?', [req.params.id]);
    await writeLog('admin_action', null, req, `Deleted account_id=${req.params.id}`);
    res.json({ message: 'Account deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/logs', async (req, res) => {
  const { event, email } = req.query;
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const conditions = [];
  const params = [];

  if (event && event !== 'all') {
    conditions.push('event_type = ?');
    params.push(event);
  }

  if (email) {
    conditions.push('email LIKE ?');
    params.push(`%${email}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total FROM logs ${where}`,
      params
    );
    const [rows] = await db.query(
      `SELECT * FROM logs ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({ logs: rows, total: countRows[0].total, limit, offset });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/stats', async (_req, res) => {
  try {
    const [[customers]] = await db.query("SELECT COUNT(*) AS count FROM users WHERE role = 'customer'");
    const [[accounts]] = await db.query('SELECT COUNT(*) AS count FROM accounts');
    const [[transactions]] = await db.query('SELECT COUNT(*) AS count FROM transactions');
    const [[balances]] = await db.query('SELECT COALESCE(SUM(balance), 0) AS total FROM accounts');
    const [[suspicious]] = await db.query(
      "SELECT COUNT(*) AS count FROM logs WHERE event_type IN ('login_failed', 'sqli_attempt')"
    );

    res.json({
      customers: customers.count,
      accounts: accounts.count,
      transactions: transactions.count,
      totalBalance: Number(balances.total),
      suspiciousLogins: suspicious.count,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve the Vite build from the root dist directory.
app.use(express.static(path.join(__dirname, '../dist')));

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

const port = Number(process.env.PORT) || 5000;

initializeDatabase(db)
  .then(() => {
    app.listen(port, () => {
      console.log(`Binangonan Banking Corporation API running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error('Database setup error:', error.message);
    process.exitCode = 1;
  });

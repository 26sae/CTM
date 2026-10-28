// seed.js
//
// Seeds the Binangonan Banking Corporation dummy database.
//
// Usage:
//   node seed.js
//
// The MySQL database itself must already exist (create it in MySQL Workbench).
// Tables are created automatically if they are missing.
//
// WARNING: This script truncates users, accounts, transactions, and logs.
// Use a dedicated dummy database only.

require('dotenv').config();
const mysql = require('mysql2/promise');
const { getDatabaseConfig } = require('./server/database');
const { initializeDatabase } = require('./server/schema');
const { hashPassword } = require('./server/security');

const ROWS_TO_INSERT = 5000;
const BATCH_SIZE = 500;
const CUSTOMER_COUNT = 30;
const LOG_COUNT = 160;

// Intentionally weak passwords for the brute-force simulation.
const WEAK_PASSWORDS = [
  'password123',
  'Password1',
  'Welcome123',
  'P@ssw0rd',
  'letmein123',
  'Bank1234',
];

const FIRST_NAMES = [
  'Juan', 'Maria', 'Jose', 'Ana', 'Pedro', 'Rosa', 'Carlo', 'Liza',
  'Miguel', 'Grace', 'Ramon', 'Elena', 'Antonio', 'Carmen', 'Rico',
  'Teresa', 'Paolo', 'Jasmine', 'Ferdinand', 'Nena', 'Gabriel',
  'Kristine', 'Manuel', 'Angelica', 'Rafael', 'Diana', 'Eduardo',
  'Michelle', 'Nicolas', 'Bea',
];

const LAST_NAMES = [
  'Dela Cruz', 'Santos', 'Reyes', 'Garcia', 'Mendoza', 'Bautista',
  'Navarro', 'Villanueva', 'Aquino', 'Ramos', 'Castillo', 'Flores',
  'Gonzales', 'Torres', 'Rivera', 'Domingo', 'Salazar', 'Mercado',
  'Pascual', 'Rosales',
];

const STREETS = [
  'Rizal Street', 'Mabini Street', 'Bonifacio Avenue', 'Quezon Street',
  'Rizal Avenue', 'National Road', 'Market Road', 'J.P. Rizal Street',
];

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/17.0',
  'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0 Mobile',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15',
];

const TRANSACTION_TEMPLATES = [
  {
    type: 'deposit',
    category: 'Salary',
    amountRange: [15000, 80000],
    descriptions: ['Payroll credit', 'Monthly salary deposit', '13th month pay'],
  },
  {
    type: 'deposit',
    category: 'Cash Deposit',
    amountRange: [500, 50000],
    descriptions: ['Branch cash deposit', 'ATM cash deposit', 'Check deposit'],
  },
  {
    type: 'withdrawal',
    category: 'Cash Withdrawal',
    amountRange: [500, 20000],
    descriptions: ['ATM withdrawal', 'Over-the-counter withdrawal'],
  },
  {
    type: 'transfer',
    category: 'Fund Transfer',
    amountRange: [100, 50000],
    descriptions: ['InstaPay transfer', 'PESONet transfer', 'Transfer to savings'],
  },
  {
    type: 'payment',
    category: 'Bills',
    amountRange: [200, 25000],
    descriptions: ['Meralco bill payment', 'Water bill payment', 'Internet bill payment', 'Credit card payment'],
  },
  {
    type: 'payment',
    category: 'Merchant',
    amountRange: [100, 15000],
    descriptions: ['SM Supermarket', 'Puregold', 'Jollibee', 'Mercury Drug'],
  },
];

function pick(values) {
  return values[Math.floor(Math.random() * values.length)];
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function money(min, max) {
  return Number((Math.random() * (max - min) + min).toFixed(2));
}

function randomDateWithinDays(days) {
  const millisecondsAgo =
    randInt(0, days) * 24 * 60 * 60 * 1000 +
    randInt(0, 86399) * 1000;
  return new Date(Date.now() - millisecondsAgo);
}

function customerRecord(index) {
  return {
    name: `${FIRST_NAMES[index % FIRST_NAMES.length]} ${LAST_NAMES[(index * 7) % LAST_NAMES.length]}`,
    email: `customer${String(index + 1).padStart(3, '0')}@binangonanbank.test`,
    password: WEAK_PASSWORDS[index % WEAK_PASSWORDS.length],
    role: 'customer',
    phone: `+639${String(100000000 + index * 137).padStart(9, '0')}`,
    address: `${randInt(1, 250)} ${pick(STREETS)}, Binangonan, Rizal`,
  };
}

function accountTypeFor() {
  const roll = Math.random();
  if (roll < 0.6) return 'Checking';
  if (roll < 0.95) return 'Savings';
  return 'Credit';
}

function balanceFor(type) {
  if (type === 'Savings') return money(10000, 800000);
  if (type === 'Credit') return money(0, 100000);
  return money(5000, 250000);
}

let accountSequence = 1000000001;

function nextAccountNumber() {
  return String(accountSequence++);
}

async function resetData(db) {
  await db.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of ['logs', 'transactions', 'accounts', 'users']) {
    await db.query(`TRUNCATE TABLE ${table}`);
  }
  await db.query('SET FOREIGN_KEY_CHECKS = 1');
}

async function insertUser(db, user) {
  const [result] = await db.query(
    `INSERT INTO users (name, email, password, role, phone, address, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [user.name, user.email, hashPassword(user.password), user.role, user.phone, user.address, 'active']
  );
  return result.insertId;
}

async function insertAccount(db, userId, accountType, balance) {
  const accountNumber = nextAccountNumber();
  const [result] = await db.query(
    `INSERT INTO accounts (user_id, account_number, account_type, balance, currency, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, accountNumber, accountType, balance, 'PHP', 'active']
  );
  return {
    id: result.insertId,
    userId,
    accountNumber,
    accountType,
  };
}

async function seedTransactions(db, accounts) {
  console.log(`Inserting ${ROWS_TO_INSERT} transactions...`);

  for (let batchStart = 0; batchStart < ROWS_TO_INSERT; batchStart += BATCH_SIZE) {
    const batch = [];
    const batchEnd = Math.min(batchStart + BATCH_SIZE, ROWS_TO_INSERT);

    for (let i = batchStart; i < batchEnd; i++) {
      const account = pick(accounts);
      const template = pick(TRANSACTION_TEMPLATES);
      const [min, max] = template.amountRange;

      const statusRoll = Math.random();
      const status = statusRoll < 0.85
        ? 'completed'
        : statusRoll < 0.95
          ? 'pending'
          : 'failed';

      batch.push([
        account.id,
        `TXN-${String(i + 1).padStart(8, '0')}`,
        template.type,
        template.category,
        pick(template.descriptions),
        money(min, max),
        status,
        randomDateWithinDays(180),
      ]);
    }

    await db.query(
      `INSERT INTO transactions
        (account_id, ref_number, type, category, description, amount, status, created_at)
       VALUES ?`,
      [batch]
    );

    console.log(`Inserted ${batchEnd} / ${ROWS_TO_INSERT}`);
  }
}

async function seedLogs(db, customerEmails) {
  console.log(`Inserting ${LOG_COUNT} log entries...`);

  const rows = [];

  for (let i = 0; i < LOG_COUNT; i++) {
    const roll = Math.random();
    let eventType;
    let email;
    let details;

    if (roll < 0.65) {
      eventType = 'login_failed';
      email = pick(customerEmails);
      details = 'Invalid email or password';
    } else if (roll < 0.85) {
      eventType = 'login_success';
      email = pick(customerEmails);
      details = 'Login successful';
    } else {
      eventType = 'admin_action';
      email = 'admin@binangonanbank.test';
      details = 'Admin created or updated a customer account';
    }

    rows.push([
      eventType,
      email,
      `192.168.1.${randInt(2, 250)}`,
      pick(USER_AGENTS),
      details,
      randomDateWithinDays(30),
    ]);
  }

  await db.query(
    `INSERT INTO logs
      (event_type, email, ip_address, user_agent, details, created_at)
     VALUES ?`,
    [rows]
  );
}

async function seed() {
  const config = getDatabaseConfig();
  console.log(`Connecting to ${config.host}:${config.port}/${config.database}...`);

  const db = await mysql.createConnection(config);

  try {
    await initializeDatabase(db);
    console.log('Banking tables are ready.');

    await resetData(db);
    console.log('Existing banking data cleared.');

    const accounts = [];
    const customerEmails = [];

    // Admin account
    const adminId = await insertUser(db, {
      name: 'System Administrator',
      email: 'admin@binangonanbank.test',
      password: 'Admin@123',
      role: 'admin',
      phone: '+639000000000',
      address: 'Binangonan Bank HQ, Binangonan, Rizal',
    });
    accounts.push(await insertAccount(db, adminId, 'Checking', 1000000));

    // Customers
    for (let i = 0; i < CUSTOMER_COUNT; i++) {
      const customer = customerRecord(i);
      customerEmails.push(customer.email);

      const userId = await insertUser(db, customer);
      const accountCount = i % 3 === 0 ? 2 : 1;

      for (let a = 0; a < accountCount; a++) {
        const type = a === 0 ? 'Checking' : accountTypeFor();
        accounts.push(await insertAccount(db, userId, type, balanceFor(type)));
      }
    }

    console.log(`Created 1 admin and ${CUSTOMER_COUNT} customers with ${accounts.length} accounts.`);

    await seedTransactions(db, accounts);
    await seedLogs(db, customerEmails);

    console.log('\nSeeding complete.');
    console.log(`Users: ${1 + CUSTOMER_COUNT}`);
    console.log(`Accounts: ${accounts.length}`);
    console.log(`Transactions: ${ROWS_TO_INSERT}`);
    console.log(`Logs: ${LOG_COUNT}`);
    console.log('\nDemo credentials (intentionally weak):');
    console.log('  Admin:    admin@binangonanbank.test / Admin@123');
    console.log(`  Customer: customer001@binangonanbank.test / ${WEAK_PASSWORDS[0]}`);
    console.log('  Emails:   customer001@binangonanbank.test ... customer030@binangonanbank.test');
    console.log(`  Passwords: ${WEAK_PASSWORDS.join(', ')}`);
  } finally {
    await db.end();
  }
}

seed().catch((error) => {
  console.error('Seed error:', error.message);

  if (error.code === 'ER_BAD_DB_ERROR') {
    console.error('The database does not exist. Create it in MySQL Workbench first, then run node seed.js again.');
  }

  process.exit(1);
});

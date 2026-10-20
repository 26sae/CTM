// attack.js
const axios = require('axios');

const TARGET = 'http://localhost:5000/api/search?query=a';
const CONCURRENT = 50;
const DURATION_MS = 5000;

async function flood() {
  const start = Date.now();
  let sent = 0, ok = 0, failed = 0;

  async function worker() {
    while (Date.now() - start < DURATION_MS) {
      sent++;
      try {
        await axios.get(TARGET);
        ok++;
      } catch {
        failed++;
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENT }, worker));
  console.log(`sent=${sent} ok=${ok} failed=${failed} in ${DURATION_MS}ms`);
}

flood();
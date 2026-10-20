// attack.js
const axios = require('axios');

const TARGET = 'https://ctrack-production-097b.up.railway.app/api/search?query=a'; // changed
const CONCURRENT = 20; 
const DURATION_MS = 4000; 

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
      if (sent % 20 === 0) {           // new
        console.log(`sent=${sent} ok=${ok} failed=${failed}`); // new
      }                                 // new
    }
  }

  await Promise.all(Array.from({ length: CONCURRENT }, worker));
  console.log(`FINAL: sent=${sent} ok=${ok} failed=${failed} in ${DURATION_MS}ms`);
}

flood();    
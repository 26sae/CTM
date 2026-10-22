const axios = require('axios');
const https = require('https');

const TARGET = 'https://ctrack-production-097b.up.railway.app/api/search?query=a';
const DURATION_MS = 4000;
const agent = new https.Agent({ keepAlive: true, maxSockets: 1000 });

async function flood() {
  const start = Date.now();
  let sent = 0, ok = 0, failed = 0;

  
  const interval = setInterval(() => {
    if (Date.now() - start >= DURATION_MS) {
      clearInterval(interval);
      return;
    }

    // Fire 50 requests every 10ms
    for (let i = 0; i < 50; i++) {
      sent++;
      axios.get(TARGET, { httpsAgent: agent, timeout: 2000 })
        .then(() => ok++)
        .catch(() => failed++);
    }
  }, 10);

 
  await new Promise((r) => setTimeout(r, DURATION_MS + 2500));
  console.log(`FINAL: sent=${sent} ok=${ok} failed=${failed} in ${DURATION_MS}ms`);
}

flood();
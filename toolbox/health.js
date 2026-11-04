// Safety rails: a health check for every floor of the build tower.
// Each floor gets a light, the same colors as the build tower:
//   green = working, amber = waiting / needs attention, red = broken, grey = not built yet
// See it at http://localhost:3000/api/health while the app runs, or:  npm run health
// Later the build tower page can read this to switch its lights automatically.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, LOG_DIR } from './env.js';
import { readActivity, activeListings, loadFingerprints, LOCAL_DIR } from '../3-data/store.js';
import { spentThisMonth } from '../7-money/spend-guard.js';
import { BUDGET } from '../7-money/budget.config.js';

const light = (color, note) => ({ light: color, note });
const hoursAgo = iso => (Date.now() - new Date(iso).getTime()) / 3600e3;

export function health({ serverRunning = false } = {}) {
  const ev = readActivity(new Date(Date.now() - 7 * 864e5).toISOString());
  const last = (pred) => [...ev].reverse().find(pred);
  const out = {};

  // Floor 1: sources
  const lastRun = last(e => e.type === 'refresh-done' && e.scraped > 0);
  const lastFail = last(e => e.type === 'refresh-done' && e.errors?.length);
  if (!(process.env.APIFY_TOKEN || '').trim()) out['1-sources'] = light('amber', 'No APIFY_TOKEN in .env yet');
  else if (lastFail && (!lastRun || lastFail.at > lastRun.at)) out['1-sources'] = light('red', `Last scrape failed ${lastFail.at}: ${lastFail.errors.join('; ')}`);
  else if (lastRun) out['1-sources'] = light('green', `Last successful scrape ${lastRun.at}`);
  else out['1-sources'] = light('amber', 'Token set, no scrape has run yet');

  // Floor 2: freshness
  const lastDone = last(e => e.type === 'refresh-done');
  const stuck = last(e => e.type === 'alert' && /did not finish/.test(e.subject));
  const opens = ev.filter(e => e.type === 'app-open' && hoursAgo(e.at) < 24).length;
  const refreshes = ev.filter(e => e.type === 'refresh-start' && hoursAgo(e.at) < 24).length;
  const blocked = last(e => e.type === 'budget-block' && hoursAgo(e.at) < 24);
  if (stuck && hoursAgo(stuck.at) < 24) out['2-freshness'] = light('red', stuck.subject);
  else if (lastDone && ['crash', 'source-error'].includes(lastDone.reason)) out['2-freshness'] = light('red', `Last refresh ended with ${lastDone.reason}`);
  else if (blocked) out['2-freshness'] = light('amber', 'Refreshes paused: monthly budget reached');
  else if (opens && !refreshes) out['2-freshness'] = light('amber', `${opens} app opens in 24h but no refresh ran (cooldown or daily limit)`);
  else if (lastDone) out['2-freshness'] = light('green', `${refreshes} refreshes in the last 24h`);
  else out['2-freshness'] = light('amber', 'No refresh has run yet');

  // Floor 3: storage
  try {
    fs.mkdirSync(LOCAL_DIR, { recursive: true });
    const probe = path.join(LOCAL_DIR, '.health'); fs.writeFileSync(probe, 'ok'); fs.unlinkSync(probe);
    const n = activeListings().length;
    out['3-data'] = light(n ? 'green' : 'amber', `${n} listings for sale in storage (local file; cloud database not built)`);
  } catch (e) { out['3-data'] = light('red', 'Storage can\'t be written: ' + e.message); }

  // Floor 4: algorithm
  const n = activeListings().filter(l => l.source !== 'manual').length;
  const fp = loadFingerprints(); const withFp = activeListings().filter(l => fp.items[l.id]).length;
  const aiInstalled = fs.existsSync(path.join(ROOT, 'node_modules', '@huggingface', 'transformers'));
  if (!n) out['4-algorithm'] = light('amber', 'Style matching works; waiting for real listings');
  else if (!aiInstalled) out['4-algorithm'] = light('amber', 'Style matching works from brand/style/size/price; FashionCLIP not installed (RACKD.bat option 1)');
  else out['4-algorithm'] = light(withFp / n > 0.8 ? 'green' : 'amber', `${withFp} of ${n} listings have FashionCLIP fingerprints`);

  // Floor 5: app
  out['5-app'] = light(serverRunning ? 'green' : 'amber', serverRunning ? 'App server running' : 'App server not running (RACKD.bat option 2)');

  // Floor 6: hosting
  out['6-hosting'] = light('grey', 'Not online yet (runs on this laptop)');

  // Floor 7: money
  const spent = spentThisMonth(), pct = spent / BUDGET.monthlyUsd;
  out['7-money'] = light(pct >= 1 ? 'red' : pct >= 0.8 ? 'amber' : 'green', `Spend guard on: $${spent.toFixed(2)} of $${BUDGET.monthlyUsd} this month. Stripe and affiliate links not set up yet`);

  // Toolbox: alerts
  const email = (process.env.RESEND_API_KEY || '').trim() && (process.env.ALERT_EMAIL_TO || '').trim();
  const alerts = fs.existsSync(path.join(LOG_DIR, 'ALERTS.txt'));
  out.toolbox = light(email ? 'green' : 'amber', (email ? 'Alert emails on' : 'Alert emails off (add RESEND_API_KEY and ALERT_EMAIL_TO to .env); alerts go to logs/ALERTS.txt') + (alerts ? '. There are alerts in logs/ALERTS.txt' : ''));

  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const icon = { green: '[GREEN]', amber: '[AMBER]', red: '[RED]  ', grey: '[GREY] ' };
  for (const [floor, h] of Object.entries(health())) console.log(`${icon[h.light]} ${floor.padEnd(12)} ${h.note}`);
}

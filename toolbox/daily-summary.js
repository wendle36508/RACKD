// Safety rails: the daily summary. What happened yesterday (or any day), in plain words:
// app opens, refreshes run and skipped, listings pulled, sold checks, money spent, errors.
// The server writes it to logs/daily/ and emails it (if email is set up) just after
// midnight UTC. Run it any time:  npm run summary   (or: npm run summary -- 2026-11-04)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LOG_DIR } from './env.js';
import { readActivity, loadSpend } from '../3-data/store.js';
import { BUDGET } from '../7-money/budget.config.js';

export function summarize(day) {
  const ev = readActivity(day).filter(e => e.at.slice(0, 10) === day);
  const count = t => ev.filter(e => e.type === t);
  const done = count('refresh-done'), skipped = count('refresh-skipped');
  const why = {}; skipped.forEach(e => { why[e.reason] = (why[e.reason] || 0) + 1; });
  const checks = count('sold-check');
  const errors = ev.filter(e => e.type === 'alert' || (e.errors && e.errors.length) || e.type === 'sold-check-failed');
  const users = new Set(count('app-open').map(e => e.user));
  const spentDay = ev.filter(e => e.type === 'spend').reduce((s, e) => s + e.usd, 0);
  const month = loadSpend()[day.slice(0, 7)] || { usd: 0 };

  const lines = [
    `RACKD daily summary for ${day}`,
    ``,
    `App opens: ${count('app-open').length} (by ${users.size} users)`,
    `Refreshes run: ${done.length}. Listings pulled: ${done.reduce((s, e) => s + (e.scraped || 0), 0)} (${done.reduce((s, e) => s + (e.added || 0), 0)} new to RACKD, ${done.reduce((s, e) => s + (e.repeats || 0), 0)} repeats the person had already seen, hidden)`,
    `Refreshes skipped: ${skipped.length}${skipped.length ? ' (' + Object.entries(why).map(([k, v]) => `${k}: ${v}`).join(', ') + ')' : ''}`,
    `Sold checks: ${checks.reduce((s, e) => s + e.checked, 0)} listings checked, ${checks.reduce((s, e) => s + e.sold, 0)} sold, ${checks.reduce((s, e) => s + e.removed, 0)} taken down`,
    `Plan changes: ${count('plan-change').length}. Stripe events: ${count('stripe-event').length}`,
    `Spent today: $${spentDay.toFixed(2)}. This month: $${month.usd.toFixed(2)} of $${BUDGET.monthlyUsd} (${Math.round(month.usd / BUDGET.monthlyUsd * 100)}%)`,
    `Problems: ${errors.length}`,
    ...errors.slice(0, 20).map(e => `  - ${e.at.slice(11, 16)} ${e.subject || e.type}${e.errors?.length ? ': ' + e.errors.join('; ') : ''}${e.error ? ': ' + e.error : ''}`),
  ];
  return lines.join('\n');
}

export function writeSummary(day) {
  const text = summarize(day);
  const dir = path.join(LOG_DIR, 'daily');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, day + '.txt'), text + '\n');
  return text;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const day = process.argv[2] || new Date().toISOString().slice(0, 10);
  console.log(writeSummary(day));
}

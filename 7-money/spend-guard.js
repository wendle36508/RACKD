// Floor 7: the spend guard. Every Apify run asks here first.
// It works out the most a run could cost (listings asked for x price), refuses if that
// would go over this month's budget, and afterwards records what the run really cost.
// Alerts (email + logs/ALERTS.txt) fire once a month at 50% and 80% of the budget, and
// when the budget is reached.
import { loadSpend, saveSpend } from '../3-data/store.js';
import { BUDGET } from './budget.config.js';
import { logger } from '../toolbox/env.js';
import { activity, alert } from '../toolbox/alerts.js';

const log = logger('spend');
const monthKey = (d = new Date()) => d.toISOString().slice(0, 7);   // e.g. 2026-11

export function spentThisMonth() {
  return loadSpend()[monthKey()]?.usd || 0;
}

function alertOnce(key, subject, text) {
  const all = loadSpend();
  const m = (all[monthKey()] ||= { usd: 0, runs: 0, listings: 0 });
  m.alerted ||= [];
  if (m.alerted.includes(key)) return;
  m.alerted.push(key);
  saveSpend(all);
  alert(subject, text);
}

/** Throws if a run costing up to `maxUsd` would break the monthly budget. */
export function allow(maxUsd, what) {
  const spent = spentThisMonth();
  if (spent + maxUsd > BUDGET.monthlyUsd) {
    activity('budget-block', { what, spentUsd: spent, budgetUsd: BUDGET.monthlyUsd });
    alertOnce('100', `Budget reached: scraping is paused`, `$${spent.toFixed(2)} of the $${BUDGET.monthlyUsd} monthly budget is spent, so new scrapes are skipped until next month. Users still see their stored matches. To change it, edit MONTHLY_BUDGET_USD in .env.`);
    const e = new Error(`Budget reached: $${spent.toFixed(2)} of $${BUDGET.monthlyUsd} spent this month, so "${what}" was skipped.`);
    e.code = 'BUDGET';
    throw e;
  }
}

export function record(usd, what, listings = 0) {
  const all = loadSpend();
  const m = (all[monthKey()] ||= { usd: 0, runs: 0, listings: 0 });
  m.usd = Math.round((m.usd + usd) * 10000) / 10000;
  m.runs++;
  m.listings += listings;
  saveSpend(all);
  activity('spend', { usd: Math.round(usd * 10000) / 10000, what, listings, monthUsd: m.usd });
  log(`$${usd.toFixed(4)} for ${what}. Month so far: $${m.usd.toFixed(2)} of $${BUDGET.monthlyUsd}`);
  for (const pct of BUDGET.alertAt) {
    if (m.usd >= BUDGET.monthlyUsd * pct / 100) {
      alertOnce(String(pct), `${pct}% of this month's Apify budget used`, `$${m.usd.toFixed(2)} of $${BUDGET.monthlyUsd} spent so far this month (${m.runs} scraper runs, ${m.listings} listings).`);
    }
  }
}

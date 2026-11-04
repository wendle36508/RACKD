// Floor 5: the RACKD app server. Start it with `npm start` (or RACKD.bat option 2), then
// open http://localhost:3000.
//
// What happens when someone opens the app:
//   1. They instantly get a deck of stored listings that fit their style, were confirmed
//      for sale recently, and that they have NEVER been shown (no card ever comes back).
//   2. In the background: listings they're about to see that haven't been checked lately
//      are re-checked (floor 2), then a new scrape picked for their style runs, unless
//      they already had one in the last hour, hit today's cap, or the budget is used up.
//   3. The app asks every few seconds for anything new and slides it into the deck.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { ROOT, logger } from '../toolbox/env.js';
import { loadListings, loadFingerprints, getUser, saveUser, markShown } from '../3-data/store.js';
import { deckFor } from '../4-algorithm/deck.js';
import { refreshForUser, scrapeDecision, isRunning, nextRefresh } from '../2-freshness/on-open.js';
import { checkStale, isFresh } from '../2-freshness/check-before-show.js';
import { planFor, isMember, SUBSCRIPTION, MEMBER_PLAN } from '../7-money/plans.config.js';
import { spentThisMonth } from '../7-money/spend-guard.js';
import { BUDGET } from '../7-money/budget.config.js';
import { handleStripeWebhook } from '../7-money/stripe.js';
import { renderApp, toCard } from './app-data.js';
import { activity, alert, sendEmail } from '../toolbox/alerts.js';
import { health } from '../toolbox/health.js';
import { writeSummary } from '../toolbox/daily-summary.js';

const log = logger('server');
const PORT = Number(process.env.PORT || 3000);
const jobs = new Map();   // userId -> background job promise

function userIdFrom(req, res) {
  const m = /(?:^|;\s*)rackd_uid=([\w-]{8,64})/.exec(req.headers.cookie || '');
  if (m) return m[1];
  const id = 'u_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  res.setHeader('Set-Cookie', `rackd_uid=${id}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax`);
  return id;
}

const send = (res, status, body, type = 'application/json') => {
  res.writeHead(status, { 'Content-Type': type + '; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
};
const readBody = req => new Promise((ok, bad) => {
  let s = ''; req.on('data', c => { s += c; if (s.length > 1e6) req.destroy(); });
  req.on('end', () => { try { ok(s ? JSON.parse(s) : {}); } catch (e) { bad(e); } }); req.on('error', bad);
});

function page(uid) {
  const user = getUser(uid);
  const all = loadListings(), fp = loadFingerprints();
  const byId = new Map(all.map(l => [l.id, l]));
  // Members-only: someone who hasn't subscribed gets an empty deck and a "subscribe" screen.
  const { items } = isMember(user) ? deckFor(user, all, fp, { limit: 150, freshOnly: l => isFresh(l) }) : { items: [] };
  const liked = user.liked.map(id => byId.get(id)).filter(Boolean);
  const passed = user.passed.map(id => byId.get(id)).filter(Boolean);
  const listings = [...items, ...liked, ...passed];
  const live = { liked: liked.map((_, i) => items.length + i), passed: passed.map((_, i) => items.length + liked.length + i) };
  return renderApp({ listings, fp, live, foot: 'Fresh finds picked for your style. Buying happens on the seller\'s site.' });
}

let styleAiRunning = false;
function runStyleAi() {
  if (styleAiRunning || !fs.existsSync(path.join(ROOT, 'node_modules', '@huggingface', 'transformers'))) return;
  styleAiRunning = true;
  const p = spawn(process.execPath, [path.join(ROOT, '4-algorithm', 'fashionclip', 'fingerprint.js')], { cwd: ROOT, stdio: 'ignore' });
  p.on('exit', () => { styleAiRunning = false; });
}

function startOpenJob(uid) {
  if (jobs.has(uid)) return jobs.get(uid);
  const job = (async () => {
    const user = getUser(uid);
    const { items } = deckFor(user, loadListings(), loadFingerprints(), { limit: 60 });
    // Both at once: the sold check on their next cards, and the new scrape for their style
    // (if they have a refresh). Starting the refresh straight away gets new finds in sooner.
    // Non-members cost nothing: no sold check and no scrape (refreshForUser says no and logs why).
    const [, r] = await Promise.all([isMember(user) ? checkStale(items) : 0, refreshForUser(uid)]);
    if (r.added) runStyleAi();
    return r;
  })().catch(e => { log(`open job for ${uid}: ${e.message}`); return { error: e.message }; })
    .finally(() => setTimeout(() => jobs.delete(uid), 5000));
  jobs.set(uid, job);
  // Watchdog: if a refresh hasn't finished in 10 minutes, something is stuck. Say so.
  let finished = false; job.finally(() => { finished = true; });
  setTimeout(() => { if (!finished) alert('A refresh did not finish', `User ${uid}: the refresh started 10 minutes ago and is still running. Apify may be slow or stuck; check the Apify console.`); }, 10 * 60e3).unref();
  return job;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (req.method === 'POST' && url.pathname === '/api/stripe/webhook') {
      const r = await handleStripeWebhook(req);
      return send(res, r.status, r.body, 'text/plain');
    }
    const uid = userIdFrom(req, res);

    if (req.method === 'GET' && url.pathname === '/') return send(res, 200, page(uid), 'text/html');

    if (req.method === 'POST' && url.pathname === '/api/open') {
      const d = scrapeDecision(getUser(uid));
      activity('app-open', { user: uid, willRefresh: d.ok, reason: d.ok ? null : d.reason });
      startOpenJob(uid);   // uses up the refresh right away, so "next" below is after this one
      const member = isMember(getUser(uid));
      return send(res, 200, { scraping: d.ok, reason: d.ok ? null : d.reason, next: nextRefresh(getUser(uid)),
        join: member ? null : { price: MEMBER_PLAN.priceUsdPerMonth, perDay: MEMBER_PLAN.refreshesPerDay * MEMBER_PLAN.perRefresh, url: SUBSCRIPTION.checkoutUrl() || null } });
    }

    if (req.method === 'POST' && url.pathname === '/api/more') {
      const { known = [] } = await readBody(req);
      const have = new Set(known);
      const u = getUser(uid);
      const fromRefresh = new Set(u.lastRefresh?.ids || []);   // this refresh's finds go to the front
      const { items } = deckFor(u, loadListings(), loadFingerprints(), { limit: 150, freshOnly: l => isFresh(l) });
      const fresh = items.filter(l => !have.has(l.id)).slice(0, 50);
      return send(res, 200, { cards: fresh.map(l => ({ ...toCard(l), nw: fromRefresh.has(l.id) ? 1 : 0 })), running: jobs.has(uid) || isRunning(uid) });
    }

    if (req.method === 'POST' && url.pathname === '/api/shown') {
      // The app reports each card the moment it's on screen. Those never come back.
      const { ids = [] } = await readBody(req);
      if (Array.isArray(ids) && ids.length) markShown(uid, ids.slice(0, 200));
      return send(res, 200, { ok: true });
    }

    if (req.method === 'POST' && url.pathname === '/api/swipe') {
      const { id, dir } = await readBody(req);
      const u = getUser(uid);
      u.liked = u.liked.filter(x => x !== id); u.passed = u.passed.filter(x => x !== id);
      if (dir === 'like') u.liked.push(id);
      else if (dir === 'pass') u.passed.push(id);
      else if (dir === 'reset') { u.liked = []; u.passed = []; }
      saveUser(u);
      return send(res, 200, { ok: true });
    }

    if (req.method === 'GET' && url.pathname === '/api/health') return send(res, 200, health({ serverRunning: true }));

    if (req.method === 'GET' && url.pathname === '/api/status') {
      const u = getUser(uid); const d = scrapeDecision(u);
      return send(res, 200, { user: uid, member: isMember(u), refreshesPerDay: planFor(u)?.refreshesPerDay ?? 0, perRefresh: planFor(u)?.perRefresh ?? 0, usedToday: d.usedToday,
        nextScrape: d.ok ? 'on next open' : d.reason, spentThisMonthUsd: spentThisMonth(), budgetUsd: BUDGET.monthlyUsd });
    }
    send(res, 404, { error: 'not found' });
  } catch (e) {
    log('error: ' + e.message);
    send(res, 500, { error: 'Something went wrong' });
  }
});

server.listen(PORT, () => log(`RACKD is running. Open http://localhost:${PORT}`));

// Daily summary: just after midnight (UTC), write yesterday's summary to logs/daily/ and email it.
let summaryDay = new Date().toISOString().slice(0, 10);
setInterval(() => {
  const today = new Date().toISOString().slice(0, 10);
  if (today === summaryDay) return;
  const text = writeSummary(summaryDay);
  sendEmail(`RACKD daily summary ${summaryDay}`, text);
  summaryDay = today;
}, 10 * 60e3).unref();

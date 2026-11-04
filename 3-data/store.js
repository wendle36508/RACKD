// Floor 3: where everything is kept.
// Right now these are files on your laptop (3-data/local/). Later they become a cloud
// database (see 3-data/supabase/schema.sql). Every other floor only uses the functions
// below, so moving to the cloud means changing this one file and nothing else.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../toolbox/env.js';

export const LOCAL_DIR = process.env.RACKD_DATA_DIR || path.join(ROOT, '3-data', 'local');
const file = name => path.join(LOCAL_DIR, name);

function readJson(f, fallback) {
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return fallback; }
}
function writeJson(f, data) {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  const tmp = f + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 1));
  fs.renameSync(tmp, f); // write-then-swap so a crash never leaves a half-written file
}

// ---------- listings (shared by all users) ----------
export function loadListings() { return readJson(file('listings.json'), []); }
export function saveListings(list) { writeJson(file('listings.json'), list); }
export function activeListings() { return loadListings().filter(l => l.status === 'active'); }

/** Adds listings we have not seen before (at most `limit`). Returns only the new ones. */
export function addNew(incoming, limit = Infinity) {
  const all = loadListings();
  const seen = new Set(all.map(l => l.id));
  const fresh = incoming.filter(l => l && !seen.has(l.id) && seen.add(l.id)).slice(0, limit);
  if (fresh.length) saveListings(all.concat(fresh));
  return fresh;
}

/** Saves changes to existing listings (matched by id). Only the fields passed are changed. */
export function updateListings(changed) {
  if (!changed.length) return;
  const byId = new Map(changed.map(l => [l.id, l]));
  saveListings(loadListings().map(l => (byId.has(l.id) ? { ...l, ...byId.get(l.id) } : l)));
}

/**
 * Saves what one user's refresh found. New listings are added. Ones already stored (because
 * someone else's search found them first) are marked as found for this user too, and as
 * confirmed for sale just now. Returns { added, ids } (ids = everything this refresh found).
 */
export function upsertFound(found, userId, nowIso = new Date().toISOString()) {
  const all = loadListings();
  const at = new Map(all.map((l, i) => [l.id, i]));
  const ids = new Set();
  let added = 0;
  for (const f of found) {
    if (!f || ids.has(f.id)) continue;
    ids.add(f.id);
    const i = at.get(f.id);
    if (i === undefined) {
      all.push({ ...f, scrapedFor: userId, foundFor: [userId] });
      at.set(f.id, all.length - 1);
      added++;
    } else {
      const l = all[i];
      all[i] = { ...l, price: f.price ?? l.price, status: 'active', missedChecks: 0, soldAt: null, lastCheckedAt: nowIso,
        foundFor: [...new Set([...(l.foundFor || (l.scrapedFor ? [l.scrapedFor] : [])), userId])] };
    }
  }
  saveListings(all);
  return { added, ids: [...ids] };
}

// ---------- users ----------
// A user: { id, plan: 'member'|'none', createdAt, lastScrapeAt, day: { date, count, refreshes },
//           liked: [ids], passed: [ids], shown: [ids of every card they've had on screen],
//           lastRefresh: { at, ids }, searchCursor }
export function getUser(id) {
  const all = readJson(file('users.json'), {});
  return all[id] || { id, plan: 'none', createdAt: new Date().toISOString(), lastScrapeAt: null, day: { date: null, count: 0, refreshes: 0 },
    liked: [], passed: [], shown: [], lastRefresh: { at: null, ids: [] }, searchCursor: 0 };
}

/** Remembers cards a user has had on screen, so they never come back. Keeps the latest 20,000. */
export function markShown(userId, ids) {
  const u = getUser(userId);
  const have = new Set(u.shown || []);
  for (const id of ids) if (typeof id === 'string' && id.length < 200) have.add(id);
  u.shown = [...have].slice(-20000);
  saveUser(u);
}
export function saveUser(u) {
  const all = readJson(file('users.json'), {});
  all[u.id] = u;
  writeJson(file('users.json'), all);
}

// ---------- money spent on Apify, by month ----------
export function loadSpend() { return readJson(file('spend.json'), {}); }
export function saveSpend(s) { writeJson(file('spend.json'), s); }

// ---------- FashionCLIP style fingerprints, keyed by listing id ----------
export function loadFingerprints() { return readJson(file('fingerprints.json'), { model: null, scale: null, items: {}, vibes: null, colors: null }); }
export function saveFingerprints(fp) { writeJson(file('fingerprints.json'), fp); }

// ---------- activity log: one line per thing that happened (scrapes, plan changes, alerts) ----------
export function appendActivity(event) {
  fs.mkdirSync(LOCAL_DIR, { recursive: true });
  fs.appendFileSync(file('activity.jsonl'), JSON.stringify({ at: new Date().toISOString(), ...event }) + '\n');
}
/** Activity since a time (ISO string), newest last. */
export function readActivity(sinceIso = '') {
  let text = '';
  try { text = fs.readFileSync(file('activity.jsonl'), 'utf8'); } catch { return []; }
  return text.split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } })
    .filter(e => e && e.at >= sinceIso);
}

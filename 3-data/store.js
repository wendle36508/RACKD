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

/** Saves changes to existing listings (matched by id). */
export function updateListings(changed) {
  if (!changed.length) return;
  const byId = new Map(changed.map(l => [l.id, l]));
  saveListings(loadListings().map(l => byId.get(l.id) || l));
}

// ---------- users ----------
// A user: { id, plan: 'free'|'premium', createdAt, lastScrapeAt, day: { date, count, refreshes },
//           liked: [listing ids], passed: [listing ids] }
export function getUser(id) {
  const all = readJson(file('users.json'), {});
  return all[id] || { id, plan: 'free', createdAt: new Date().toISOString(), lastScrapeAt: null, day: { date: null, count: 0, refreshes: 0 }, liked: [], passed: [] };
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

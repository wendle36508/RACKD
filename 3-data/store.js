// Floor 3: where listings are kept.
// Right now this is a file on your laptop (3-data/local/listings.json).
// Later it becomes a cloud database (see 3-data/supabase/schema.sql). Every other
// floor only talks to the functions below, so swapping the storage means editing
// this one file and nothing else.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../toolbox/env.js';

export const LOCAL_DIR = process.env.RACKD_DATA_DIR || path.join(ROOT, '3-data', 'local');
const LISTINGS = path.join(LOCAL_DIR, 'listings.json');
const FINGERPRINTS = path.join(LOCAL_DIR, 'fingerprints.json');

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 1));
  fs.renameSync(tmp, file); // write-then-swap so a crash never leaves a half-written file
}

/** All listings, as an array of RACKD listings (see listing.schema.json). */
export function loadListings() { return readJson(LISTINGS, []); }
export function saveListings(list) { writeJson(LISTINGS, list); }
export function activeListings() { return loadListings().filter(l => l.status === 'active'); }

/** Adds listings we have not seen before (at most `limit`). Returns only the ones that were new. */
export function addNew(incoming, limit = Infinity) {
  const all = loadListings();
  const seen = new Set(all.map(l => l.id));
  const fresh = incoming.filter(l => l && !seen.has(l.id) && seen.add(l.id)).slice(0, limit);
  if (fresh.length) saveListings(all.concat(fresh));
  return fresh;
}

/** Style fingerprints from FashionCLIP, keyed by listing id, plus the style/colour word fingerprints. */
export function loadFingerprints() { return readJson(FINGERPRINTS, { model: null, scale: null, items: {}, vibes: null, colors: null }); }
export function saveFingerprints(fp) { writeJson(FINGERPRINTS, fp); }

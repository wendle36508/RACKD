// DAILY JOB: sold-item removal.
// Re-checks the listings that were checked longest ago. Sold ones are hidden from the
// app straight away; ones that vanish twice in a row are taken down too. Old sold
// items are deleted after a while.
import { logger } from '../toolbox/env.js';
import { sourceFor } from '../1-sources/index.js';
import { loadListings, saveListings, loadFingerprints, saveFingerprints } from '../3-data/store.js';
import { SCHEDULE } from './schedule.config.js';

const log = logger('recheck-sold');
const now = new Date();
const all = loadListings();

const due = all
  .filter(l => l.status === 'active' && sourceFor(l))
  .sort((a, b) => a.lastCheckedAt.localeCompare(b.lastCheckedAt))
  .slice(0, SCHEDULE.dailyRecheckCount);

const bySource = {};
for (const l of due) (bySource[l.source] ||= []).push(l);

let sold = 0, removed = 0, ok = 0;
for (const [name, items] of Object.entries(bySource)) {
  try {
    const answers = await sourceFor(items[0]).checkListings(items.map(l => l.url));
    for (const l of items) {
      const a = answers[l.url];
      l.lastCheckedAt = now.toISOString();
      if (a === 'sold') { l.status = 'sold'; l.soldAt = now.toISOString(); sold++; }
      else if (a === 'active') { l.missedChecks = 0; ok++; }
      else if (++l.missedChecks >= SCHEDULE.missesBeforeRemoved) { l.status = 'removed'; removed++; }
    }
    log(`${name}: checked ${items.length}`);
  } catch (e) {
    log(`${name}: stopped: ${e.message}`);
    process.exitCode = 1;
  }
}

// Delete sold/removed items older than keepSoldDays (and their fingerprints).
const cutoff = now.getTime() - SCHEDULE.keepSoldDays * 864e5;
const keep = all.filter(l => l.status === 'active' || new Date(l.soldAt || l.lastCheckedAt).getTime() > cutoff);
const gone = all.length - keep.length;
if (gone) {
  const fp = loadFingerprints();
  const ids = new Set(keep.map(l => l.id));
  for (const id of Object.keys(fp.items)) if (!ids.has(id)) delete fp.items[id];
  saveFingerprints(fp);
}
saveListings(keep);
log(`Done. ${ok} still for sale, ${sold} sold, ${removed} taken down, ${gone} old ones deleted.`);

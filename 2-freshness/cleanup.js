// Floor 2: tidy-up. Deletes sold and taken-down listings (and their fingerprints) once
// they're older than keepSoldDays. Costs nothing (no scraping). Run any time:
//   npm run cleanup
import { logger } from '../toolbox/env.js';
import { loadListings, saveListings, loadFingerprints, saveFingerprints } from '../3-data/store.js';
import { FRESHNESS } from './freshness.config.js';

const log = logger('cleanup');
const cutoff = Date.now() - FRESHNESS.keepSoldDays * 864e5;
const all = loadListings();
const keep = all.filter(l => l.status === 'active' || new Date(l.soldAt || l.lastCheckedAt).getTime() > cutoff);
if (keep.length !== all.length) {
  const ids = new Set(keep.map(l => l.id));
  const fp = loadFingerprints();
  for (const id of Object.keys(fp.items)) if (!ids.has(id)) delete fp.items[id];
  saveFingerprints(fp);
  saveListings(keep);
}
log(`Deleted ${all.length - keep.length} old sold or removed listings. ${keep.length} kept.`);

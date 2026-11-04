// Floor 2: sold-item removal, just before showing.
// Before a listing goes on someone's screen, RACKD makes sure it was confirmed for sale
// recently. Listings older than the stale limit are re-checked with the scraper first:
// sold ones are hidden for good, ones that vanish twice in a row are taken down.
import { logger } from '../toolbox/env.js';
import { sourceFor } from '../1-sources/index.js';
import { updateListings } from '../3-data/store.js';
import { FRESHNESS } from './freshness.config.js';
import { activity, alert } from '../toolbox/alerts.js';

const log = logger('sold-check');

export const isFresh = (l, now = Date.now()) =>
  l.source === 'manual' || now - new Date(l.lastCheckedAt).getTime() < FRESHNESS.staleAfterHours * 3600e3;

/** Re-checks the stale ones among `listings`. Returns how many are still for sale. */
export async function checkStale(listings, now = new Date()) {
  const stale = listings.filter(l => l.status === 'active' && !isFresh(l, now.getTime()) && sourceFor(l)).slice(0, FRESHNESS.checkBeforeShow);
  const bySource = {};
  for (const l of stale) (bySource[l.source] ||= []).push(l);

  let ok = 0, sold = 0, removed = 0;
  for (const items of Object.values(bySource)) {
    try {
      const answers = await sourceFor(items[0]).checkListings(items.map(l => l.url));
      for (const l of items) {
        const a = answers[l.url];
        l.lastCheckedAt = now.toISOString();
        if (a === 'sold') { l.status = 'sold'; l.soldAt = now.toISOString(); sold++; }
        else if (a === 'active') { l.missedChecks = 0; ok++; }
        else if (++l.missedChecks >= FRESHNESS.missesBeforeRemoved) { l.status = 'removed'; removed++; }
      }
      updateListings(items);
    } catch (e) {
      log(`${items[0].source}: ${e.message}. Those listings stay hidden until they can be checked.`);
      activity('sold-check-failed', { source: items[0].source, count: items.length, error: e.message });
      if (e.code !== 'BUDGET') alert('A sold-item check failed', `${items[0].source}, ${items.length} listings: ${e.message}`);
    }
  }
  if (stale.length) {
    log(`Checked ${stale.length}: ${ok} still for sale, ${sold} sold, ${removed} taken down.`);
    activity('sold-check', { checked: stale.length, stillForSale: ok, sold, removed });
  }
  return ok;
}

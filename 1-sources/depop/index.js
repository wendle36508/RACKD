// The Depop source. Sources expose the same jobs, so the other floors never need to know
// which site an item came from:
//   search(searchPlan, count, what) -> listings that fit a user's style, in RACKD shape
//   checkListings(urls)             -> NOT offered for Depop (see below)
//
// Sold check: this Depop scraper only returns listings that are for sale right now, and it
// can't look up single listing pages. So there's no paid sold check for Depop. Instead, a
// Depop listing is shown only while it's fresh: found or re-found by a search in the last
// 24 hours (2-freshness/freshness.config.js). After that it stays hidden unless a later
// refresh finds it for sale again. This costs nothing and never shows an old, maybe-sold item.
import { runPaid } from '../apify/apify.js';
import { ACTOR_ID, searchInput } from './depop.config.js';
import { toListing } from './map.js';

export const name = 'depop';

export async function search(plan, count, what = 'depop search') {
  if (!(count >= 1)) return [];      // the actor treats 0 as "500", so never ask for 0
  const raw = await runPaid(name, ACTOR_ID(), searchInput(plan, count), count, what);
  return raw.map(r => toListing(r)).filter(l => l && l.status === 'active');
}

// The Depop source. Every source exposes the same two jobs, so the other floors never
// need to know which site an item came from:
//   search(searchPlan, count, what) -> listings that fit a user's style, in RACKD shape
//   checkListings(urls)             -> for each url: 'active', 'sold' or 'missing'
import { runPaid } from '../apify/apify.js';
import { ACTOR_ID, searchInput, recheckInput } from './depop.config.js';
import { toListing, idFromUrl } from './map.js';

export const name = 'depop';

export async function search(plan, count, what = 'depop search') {
  const raw = await runPaid(name, ACTOR_ID(), searchInput(plan, count), count, what);
  return raw.map(r => toListing(r)).filter(l => l && l.status === 'active');
}

export async function checkListings(urls) {
  const result = Object.fromEntries(urls.map(u => [u, 'missing']));
  const byId = Object.fromEntries(urls.map(u => [idFromUrl(u), u]));
  const raw = await runPaid(name, ACTOR_ID(), recheckInput(urls), urls.length, `depop sold check (${urls.length})`);
  for (const r of raw) {
    const u = byId[idFromUrl(r.url) || r.slug];
    if (!u) continue;
    const l = toListing(r);
    result[u] = l ? l.status : (r.sold ? 'sold' : 'missing');
  }
  return result;
}

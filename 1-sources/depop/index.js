// The Depop source. Every source file exposes the same two jobs, so floors 2 to 5
// never need to know which site an item came from:
//   fetchNew(count)      -> brand-new listings, already in RACKD shape
//   checkListings(urls)  -> for each url: 'active', 'sold' or 'missing'
import { runActor } from '../apify/apify.js';
import { ACTOR_ID, newListingsInput, recheckInput } from './depop.config.js';
import { toListing, idFromUrl } from './map.js';

export const name = 'depop';

export async function fetchNew(count) {
  const raw = await runActor(ACTOR_ID(), newListingsInput(count));
  return raw.map(r => toListing(r)).filter(l => l && l.status === 'active');
}

export async function checkListings(urls) {
  const result = Object.fromEntries(urls.map(u => [u, 'missing']));
  const byId = Object.fromEntries(urls.map(u => [idFromUrl(u), u]));
  for (let i = 0; i < urls.length; i += 100) {           // 100 pages per Apify run
    const raw = await runActor(ACTOR_ID(), recheckInput(urls.slice(i, i + 100)));
    for (const r of raw) {
      const l = toListing(r);
      const u = byId[idFromUrl(r.url) || r.slug];
      if (u) result[u] = l ? l.status : (r.sold ? 'sold' : 'missing');
    }
  }
  return result;
}

// The Vinted source. Same two jobs as every source (see 1-sources/depop/index.js).
import { runPaid } from '../apify/apify.js';
import { ACTOR_ID, searchInput, recheckInput } from './vinted.config.js';
import { toListing, idFromUrl } from './map.js';

export const name = 'vinted';

function actor() {
  const id = ACTOR_ID();
  if (!id) throw new Error('VINTED_ACTOR_ID is missing in .env (no Vinted scraper chosen yet).');
  return id;
}

export async function search(plan, count, what = 'vinted search') {
  const raw = await runPaid(name, actor(), searchInput(plan, count), count, what);
  return raw.map(r => toListing(r)).filter(l => l && l.status === 'active');
}

export async function checkListings(urls) {
  const result = Object.fromEntries(urls.map(u => [u, 'missing']));
  const byId = Object.fromEntries(urls.map(u => [idFromUrl(u), u]));
  const raw = await runPaid(name, actor(), recheckInput(urls), urls.length, `vinted sold check (${urls.length})`);
  for (const r of raw) {
    const u = byId[String(r.id || idFromUrl(r.url))];
    if (!u) continue;
    const l = toListing(r);
    result[u] = l ? l.status : 'missing';
  }
  return result;
}

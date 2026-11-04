// Talks to Apify (the scraping service). Starts an actor (a ready-made scraper), waits
// for it to finish, and returns the items it found.
// Every run goes through the spend guard first (7-money/spend-guard.js), and every run
// uses the Apify Residential proxy (set in each source's config).
import { need } from '../../toolbox/env.js';
import { allow, record } from '../../7-money/spend-guard.js';
import { usdPerListing } from '../sources.config.js';

const API = 'https://api.apify.com/v2';

async function runActor(actorId, input, timeoutSecs) {
  const token = need('APIFY_TOKEN');
  const url = `${API}/acts/${encodeURIComponent(actorId)}/run-sync-get-dataset-items?timeout=${timeoutSecs}&format=json&clean=true`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout((timeoutSecs + 30) * 1000),
  });
  if (!res.ok) throw new Error(`Apify said ${res.status} for ${actorId}: ${(await res.text()).slice(0, 400)}`);
  return res.json();
}

/**
 * Runs an actor for a source, inside the budget.
 * maxItems = the most listings this run can return (what it's charged for at worst).
 */
export async function runPaid(source, actorId, input, maxItems, what, { timeoutSecs = 240 } = {}) {
  const price = usdPerListing(source);
  allow(maxItems * price, what);
  const items = await runActor(actorId, input, timeoutSecs);
  const list = Array.isArray(items) ? items : [];
  record(list.length * price, what, list.length);
  return list;
}

/** The proxy block every scraper uses: Apify Proxy, Residential group. */
export function residentialProxy() {
  return {
    useApifyProxy: true,
    apifyProxyGroups: ['RESIDENTIAL'],
    apifyProxyCountry: (process.env.APIFY_PROXY_COUNTRY || 'US').trim(),
  };
}

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
  if (!res.ok) {
    const e = new Error(`Apify said ${res.status} for ${actorId}: ${(await res.text()).slice(0, 400)}`);
    e.status = res.status;
    throw e;
  }
  return res.json();
}

/**
 * Runs an actor for a source, inside the budget.
 * maxItems = the most listings this run can return (what it's charged for at worst).
 */
export async function runPaid(source, actorId, input, maxItems, what, { timeoutSecs = 240 } = {}) {
  const price = usdPerListing(source);
  allow(maxItems * price, what);
  let items;
  try { items = await runActor(actorId, input, timeoutSecs); }
  catch (e) {
    // If Apify refused the run outright (a 4xx, like a wrong token or actor id), it cost nothing.
    // Otherwise (timed out, Apify error, connection dropped) the run may have kept going on
    // Apify and been charged, so count it at the most it could cost. The guard never under-counts.
    if (!(e.status >= 400 && e.status < 500)) record(maxItems * price, `${what} (failed: counted at the most it could cost)`, 0);
    throw e;
  }
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

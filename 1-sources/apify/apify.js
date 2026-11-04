// Talks to Apify (the scraping service). Starts an actor (a ready-made scraper),
// waits for it to finish, and returns the items it found.
// Every request goes through the Apify Residential proxy, set in each source's config.
import { need } from '../../toolbox/env.js';

const API = 'https://api.apify.com/v2';

export async function runActor(actorId, input, { timeoutSecs = 280 } = {}) {
  const token = need('APIFY_TOKEN');
  const url = `${API}/acts/${encodeURIComponent(actorId)}/run-sync-get-dataset-items?timeout=${timeoutSecs}&format=json&clean=true`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout((timeoutSecs + 30) * 1000),
  });
  if (!res.ok) {
    const text = (await res.text()).slice(0, 400);
    throw new Error(`Apify said ${res.status} for ${actorId}: ${text}`);
  }
  return res.json();
}

/** The proxy block every scraper uses: Apify Proxy, Residential group. */
export function residentialProxy() {
  return {
    useApifyProxy: true,
    apifyProxyGroups: ['RESIDENTIAL'],
    apifyProxyCountry: (process.env.APIFY_PROXY_COUNTRY || 'US').trim(),
  };
}

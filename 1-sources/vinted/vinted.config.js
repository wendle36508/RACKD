// Settings for the Vinted scraper on Apify.
// PLACEHOLDER: no Vinted actor is chosen yet. When you pick one, put its id in .env as
// VINTED_ACTOR_ID, open its "Input" tab on apify.com, and make the fields below match.
// Anything marked CHECK is a guess.
import { residentialProxy } from '../apify/apify.js';

export const ACTOR_ID = () => (process.env.VINTED_ACTOR_ID || '').trim();

export function searchInput(search, maxItems) {
  return {
    searchQueries: search.queries,   // CHECK
    country: 'us',                   // CHECK: Vinted runs separate sites per country
    maxItems,                        // CHECK
    order: 'newest_first',           // CHECK
    priceFrom: search.minPrice ?? undefined,
    priceTo: search.maxPrice ?? undefined,
    proxyConfiguration: residentialProxy(),
  };
}

export function recheckInput(urls) {
  return {
    startUrls: urls.map(url => ({ url })),   // CHECK
    proxyConfiguration: residentialProxy(),
  };
}

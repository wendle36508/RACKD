// Settings for the Depop scraper on Apify: piotrv1001/depop-listings-scraper
// (Tanner's pick, 4 Nov 2026). $4 per 1,000 listings, Apify platform costs included.
// Field names below are from the actor's input schema on apify.com.
import { residentialProxy } from '../apify/apify.js';

export const ACTOR_ID = () => (process.env.DEPOP_ACTOR_ID || 'piotrv1001~depop-listings-scraper').trim();

/**
 * Input for "find listings that fit this user's style".
 * search = { queries: ['levis vintage', ...], brands, size, minPrice, maxPrice } from 4-algorithm/taste.js.
 * Brands are already inside the search words. They are NOT sent as the actor's "brands" filter,
 * because a brand name Depop doesn't know stops the whole run. The actor has no size filter;
 * the algorithm ranks by size afterwards.
 */
export function searchInput(search, maxItems) {
  const input = {
    searchQueries: search.queries,
    country: 'us',
    maxItems,                        // never 0: for this actor 0 means 500
    sort: 'relevance',               // Depop doesn't give scrapers "newest first"
    proxyConfiguration: residentialProxy(),
  };
  if (search.minPrice != null) input.priceMin = Math.max(0, Math.floor(search.minPrice));
  if (search.maxPrice != null) input.priceMax = Math.ceil(search.maxPrice);
  return input;
}

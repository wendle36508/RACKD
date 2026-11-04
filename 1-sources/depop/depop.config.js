// Settings for the Depop scraper on Apify.
// PLACEHOLDER: when you pick the final actor, open its "Input" tab on apify.com and check
// that the field names below match. Anything marked CHECK is a best guess.
import { residentialProxy } from '../apify/apify.js';

export const ACTOR_ID = () => (process.env.DEPOP_ACTOR_ID || 'abotapi~depop-scraper').trim();

/**
 * Input for "find listings that fit this user's style".
 * search = { queries: ['levis vintage', ...], brands: [...], size, minPrice, maxPrice }
 * built by 4-algorithm/taste.js from the user's swipes.
 */
export function searchInput(search, maxListings) {
  const input = {
    mode: 'search',
    queries: search.queries,
    country: 'us',
    maxListings,
    sortBy: 'newlyListed',           // CHECK: the actor's exact word for "newest first"
    fetchDetails: true,              // needed for seller rating and review count
    proxyConfiguration: residentialProxy(),
  };
  if (search.brands?.length) input.brands = search.brands;     // CHECK
  if (search.size) input.sizes = [search.size];                // CHECK
  if (search.minPrice != null) input.minPrice = search.minPrice;
  if (search.maxPrice != null) input.maxPrice = search.maxPrice;
  return input;
}

/** Input for "look at these exact listing pages again" (the sold check). */
export function recheckInput(urls) {
  return {
    mode: 'url',
    urls,                            // CHECK: some actors call this startUrls: [{ url }]
    country: 'us',
    fetchDetails: false,
    proxyConfiguration: residentialProxy(),
  };
}

// Settings for the eBay scraper on Apify.
// (eBay's own API is out because the RACKD eBay account is suspended, so eBay comes
// through Apify like Depop and Vinted.)
// PLACEHOLDER: no eBay actor is chosen yet. When you pick one, put its id in .env as
// EBAY_ACTOR_ID, open its "Input" tab on apify.com, and make the fields below match.
// Anything marked CHECK is a guess. Also put its real price in 1-sources/sources.config.js.
import { residentialProxy } from '../apify/apify.js';

export const ACTOR_ID = () => (process.env.EBAY_ACTOR_ID || '').trim();

export function searchInput(search, maxItems) {
  return {
    searchQueries: search.queries,                // CHECK
    maxItems,                                     // CHECK
    condition: 'used',                            // CHECK: secondhand only
    listingType: 'buy_it_now',                    // CHECK: no auctions, so "buy" always works
    sort: 'newly_listed',                         // CHECK
    minPrice: search.minPrice ?? undefined,
    maxPrice: search.maxPrice ?? undefined,
    country: 'US',                                // CHECK: ebay.com
    proxyConfiguration: residentialProxy(),
  };
}

export function recheckInput(urls) {
  return {
    startUrls: urls.map(url => ({ url })),       // CHECK
    proxyConfiguration: residentialProxy(),
  };
}

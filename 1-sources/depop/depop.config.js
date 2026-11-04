// Settings for the Depop scraper on Apify.
// PLACEHOLDER: when you pick the final actor, open its "Input" tab on apify.com and
// check that the field names below match. Anything marked CHECK is a best guess.
import { residentialProxy } from '../apify/apify.js';

export const ACTOR_ID = () => (process.env.DEPOP_ACTOR_ID || 'abotapi~depop-scraper').trim();

// What to search for when getting new listings. Edit freely: these are the "racks".
export const SEARCHES = ['vintage', 'y2k', 'streetwear', 'levis', 'carhartt', 'free people'];

/** Input for "get me N brand-new listings". */
export function newListingsInput(maxListings) {
  return {
    mode: 'search',
    queries: SEARCHES,
    country: 'us',
    maxListings,
    sortBy: 'newlyListed',           // CHECK: the actor's exact word for "newest first"
    fetchDetails: true,              // needed for seller rating and review count
    proxyConfiguration: residentialProxy(),
  };
}

/** Input for "look at these exact listing pages again" (used for sold-item removal). */
export function recheckInput(urls) {
  return {
    mode: 'url',
    urls,                            // CHECK: some actors call this startUrls: [{ url }]
    country: 'us',
    fetchDetails: false,
    proxyConfiguration: residentialProxy(),
  };
}

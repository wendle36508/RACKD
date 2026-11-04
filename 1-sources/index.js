// The list of listing sources RACKD knows about. To add Etsy, eBay or another site,
// make a folder like 1-sources/depop/ with the same two jobs, then add it here.
import * as depop from './depop/index.js';

const ALL = { depop };

/** The sources switched on in .env (SOURCES=depop,etsy). */
export function enabledSources() {
  const names = (process.env.SOURCES || 'depop').split(',').map(s => s.trim()).filter(Boolean);
  return names.map(n => {
    if (!ALL[n]) throw new Error(`Unknown source "${n}" in SOURCES. Known: ${Object.keys(ALL).join(', ')}`);
    return ALL[n];
  });
}
export function sourceFor(listing) { return ALL[listing.source] || null; }

// The list of listing sources RACKD knows about. To add Etsy, eBay or another site, make a
// folder like 1-sources/depop/ with the same two jobs, add it here and to sources.config.js.
import * as depop from './depop/index.js';
import * as vinted from './vinted/index.js';
import { SOURCE_SETTINGS } from './sources.config.js';

const ALL = { depop, vinted };

/** The sources switched on in .env (SOURCES=depop,vinted). */
export function enabledSources() {
  const names = (process.env.SOURCES || 'depop').split(',').map(s => s.trim()).filter(Boolean);
  return names.map(n => {
    if (!ALL[n]) throw new Error(`Unknown source "${n}" in SOURCES. Known: ${Object.keys(ALL).join(', ')}`);
    return ALL[n];
  });
}

/** Splits `count` listings between the switched-on sources by their share. */
export function splitCount(count, sources = enabledSources()) {
  const shares = sources.map(s => SOURCE_SETTINGS[s.name]?.share ?? 1);
  const total = shares.reduce((a, b) => a + b, 0) || 1;
  const parts = shares.map(sh => Math.floor(count * sh / total));
  let left = count - parts.reduce((a, b) => a + b, 0);
  for (let i = 0; left > 0; i = (i + 1) % parts.length, left--) parts[i]++;
  return sources.map((s, i) => [s, parts[i]]).filter(([, n]) => n > 0);
}

export function sourceFor(listing) { return ALL[listing.source] || null; }

// Floor 5: builds the swipe app from whatever is in storage.
// Takes the active listings (floor 3), their style fingerprints (floor 4) and the buy
// links (floor 7), and writes one app file: 5-app/dist/rackd.html. Open it in a browser.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, logger } from '../toolbox/env.js';
import { activeListings, loadFingerprints } from '../3-data/store.js';
import { buyLink } from '../7-money/affiliate.js';

const log = logger('build-app');
const SITE = { depop: 'Depop', etsy: 'Etsy', ebay: 'eBay', vinted: 'Vinted', grailed: 'Grailed', manual: 'example site' };

const listings = activeListings();
if (!listings.length) { log('No active listings yet. Run "npm run demo" for examples, or "npm run fetch-new" for real ones.'); process.exit(1); }
const fp = loadFingerprints();

// The app uses short field names to keep the file small.
const DATA = listings.map(l => ({
  t: l.title, u: buyLink(l), p: l.photoUrl, pr: Math.round(l.price), s: l.size || '', st: l.style || '',
  b: l.brand || '', c: l.category || '', cd: l.condition || null, op: l.originalPrice ? Math.round(l.originalPrice) : null,
  src: SITE[l.source] || l.source,
}));
const have = listings.filter(l => fp.items[l.id]).length;
const VEC = have && fp.vibes ? { model: fp.model, scale: fp.scale, items: listings.map(l => fp.items[l.id] || null), vibes: fp.vibes, colors: fp.colors } : null;

const sources = [...new Set(DATA.map(d => d.src))].join(', ');
const foot = `${DATA.length} listings from ${sources}, updated ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}. Buying happens on the seller's site.`;
const safe = v => JSON.stringify(v).replace(/</g, '\\u003c');   // stops a listing title from breaking the page

const tpl = fs.readFileSync(path.join(ROOT, '5-app', 'app-template.html'), 'utf8');
const html = tpl.replace('__DATA__', () => safe(DATA)).replace('__VEC__', () => safe(VEC)).replace('__FOOT__', () => foot.replace(/</g, '&lt;'));
const out = path.join(ROOT, '5-app', 'dist', 'rackd.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
log(`Built ${out}: ${DATA.length} listings, ${have} with style fingerprints${VEC ? '' : ' (style AI off until fingerprints exist)'}.`);

// Shared by the server and the offline build: turns stored listings into the small
// card format the app uses, adds buy links (floor 7) and style fingerprints (floor 4),
// and fills in the app template.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../toolbox/env.js';
import { buyLink } from '../7-money/affiliate.js';

const SITE = { depop: 'Depop', vinted: 'Vinted', etsy: 'Etsy', ebay: 'eBay', grailed: 'Grailed', manual: 'example site' };

export const toCard = l => ({
  k: l.id, t: l.title, u: buyLink(l), p: l.photoUrl, pr: Math.round(l.price), s: l.size || '', st: l.style || '',
  b: l.brand || '', c: l.category || '', cd: l.condition || null, op: l.originalPrice ? Math.round(l.originalPrice) : null,
  src: SITE[l.source] || l.source,
});

export function vecFor(listings, fp) {
  const have = listings.filter(l => fp.items[l.id]).length;
  return have && fp.vibes ? { model: fp.model, scale: fp.scale, items: listings.map(l => fp.items[l.id] || null), vibes: fp.vibes, colors: fp.colors } : null;
}

const safe = v => JSON.stringify(v).replace(/</g, '\\u003c');   // stops a listing title from breaking the page
const TEMPLATE = path.join(ROOT, '5-app', 'app-template.html');

export function renderApp({ listings, fp, live = null, foot }) {
  return fs.readFileSync(TEMPLATE, 'utf8')
    .replace('__DATA__', () => safe(listings.map(toCard)))
    .replace('__VEC__', () => safe(vecFor(listings, fp)))
    .replace('__LIVE__', () => safe(live))
    .replace('__FOOT__', () => String(foot).replace(/</g, '&lt;'));
}

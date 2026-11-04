// Floor 4: reads a user's style from their swipes, and uses it two ways:
//   1. searchFor(profile)   -> what to ask the scrapers for (keywords, brands, size, price)
//   2. match(listing, prof) -> how well a listing fits them, from 0 (not at all) to 1 (perfect)
// When FashionCLIP fingerprints exist, "fits" is mostly about how the item LOOKS compared
// with what they liked. Otherwise it uses brand, style, category, size and price.
import { TASTE } from './taste.config.js';

const shortCat = c => (c || '').replace(/^(Women|Men|Kids) /, '').replace(' & Jumpsuits', '');
const top = (o, n) => Object.entries(o).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);

function unpack(s) {
  if (!s) return null;
  const b = Buffer.from(s, 'base64'); const v = new Float32Array(b.length); let n = 0;
  for (let i = 0; i < b.length; i++) { const x = b.readInt8(i); v[i] = x; n += x * x; }
  n = Math.sqrt(n) || 1; for (let i = 0; i < v.length; i++) v[i] /= n;
  return v;
}
const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };

/** Builds a style profile from a user's likes and passes. */
export function profileOf(user, byId, fingerprints = { items: {} }) {
  const w = { brand: {}, style: {}, cat: {}, size: {} }; const prices = [];
  const add = (l, v) => {
    if (l.brand) w.brand[l.brand] = (w.brand[l.brand] || 0) + v;
    if (l.style) w.style[l.style] = (w.style[l.style] || 0) + v;
    if (l.category) w.cat[shortCat(l.category)] = (w.cat[shortCat(l.category)] || 0) + v;
    if (l.size && v > 0) w.size[l.size] = (w.size[l.size] || 0) + v;
  };
  const liked = user.liked.map(id => byId.get(id)).filter(Boolean);
  const passed = user.passed.map(id => byId.get(id)).filter(Boolean);
  liked.forEach(l => { add(l, 1); prices.push(l.price); });
  passed.forEach(l => add(l, -0.4));
  prices.sort((a, b) => a - b);
  const pick = q => prices.length ? prices[Math.min(prices.length - 1, Math.floor(prices.length * q))] : null;

  let taste = null;
  const lv = liked.map(l => unpack(fingerprints.items[l.id])).filter(Boolean);
  if (lv.length >= 2) {
    taste = new Float32Array(lv[0].length);
    lv.forEach(v => v.forEach((x, i) => { taste[i] += x / lv.length; }));
    const n = Math.sqrt(dot(taste, taste)) || 1; taste = taste.map(x => x / n);
  }
  return { likes: liked.length, w, median: pick(0.5), low: pick(0.2), high: pick(0.8), taste };
}

/**
 * What to search for on each site, for this user. `rotation` counts their refreshes, so
 * each refresh asks for a different slice of their style and fewer repeats come back.
 */
export function searchFor(P, rotation = 0) {
  const slice = (pool, n) => [...new Set(Array.from({ length: Math.min(n, pool.length) }, (_, i) => pool[(rotation * n + i) % pool.length]))];
  if (P.likes < TASTE.likesBeforePersonal) {
    return { queries: slice(TASTE.starterSearches, 4), brands: [], size: null, minPrice: null, maxPrice: null, personal: false };
  }
  const brands = top(P.w.brand, 4), styles = top(P.w.style, 3), cats = top(P.w.cat, 2);
  const pool = [...new Set([
    ...brands,
    ...styles.map((s, i) => (cats.length ? `${s} ${cats[i % cats.length]}` : s)),
    ...styles,
  ].filter(Boolean).map(q => q.toLowerCase()))];
  const explore = TASTE.starterSearches[rotation % TASTE.starterSearches.length].toLowerCase(); // a little exploring
  const queries = [...new Set([...slice(pool, 3), explore])];
  const sizes = Object.entries(P.w.size).sort((a, b) => b[1] - a[1]);
  return {
    queries,
    brands: brands.slice(0, 3),
    size: sizes[0] && sizes[0][1] >= 2 ? sizes[0][0] : null,
    minPrice: P.low != null ? Math.floor(P.low * 0.7) : null,
    maxPrice: P.high != null ? Math.ceil(P.high * 1.3) : null,
    personal: true,
  };
}

/** How well one listing fits a profile, 0 to 1. */
export function match(l, P, fingerprints = { items: {} }) {
  if (P.likes === 0) return 0.5;
  const v = P.taste && unpack(fingerprints.items[l.id]);
  let price = 0.5;
  if (P.median) { const r = Math.log(l.price / P.median); price = Math.exp(-r * r / 0.5); }
  if (v) {
    const look = Math.max(0, Math.min(1, (dot(v, P.taste) - 0.5) / 0.4));  // FashionCLIP similarity, rescaled
    return 0.8 * look + 0.2 * price;
  }
  const maxB = Math.max(1, ...Object.values(P.w.brand)), maxS = Math.max(1, ...Object.values(P.w.style)), maxC = Math.max(1, ...Object.values(P.w.cat));
  const part = (val, max) => Math.max(0, Math.min(1, (val || 0) / max));
  const size = Object.keys(P.w.size).length ? (P.w.size[l.size] ? 1 : 0) : 0.5;
  return 0.3 * part(P.w.brand[l.brand], maxB) + 0.25 * part(P.w.style[l.style], maxS) + 0.15 * part(P.w.cat[shortCat(l.category)], maxC) + 0.1 * size + 0.2 * price;
}

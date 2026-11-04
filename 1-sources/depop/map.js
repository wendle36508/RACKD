// Turns one raw Depop item from Apify into a RACKD listing (3-data/listing.schema.json).
// Field names are from piotrv1001/depop-listings-scraper's sample output. Only listing facts
// are kept (this actor gives no seller details anyway). If you switch actors, only this
// file and depop.config.js change.

const num = v => {
  if (v == null || v === '') return null;
  if (typeof v === 'object') v = v.priceAmount ?? v.amount ?? v.value ?? v.price;
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : null;
};
const first = v => Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
const text = v => (v == null || v === '' ? null : String(typeof v === 'object' ? (v.url ?? v.name ?? v.label ?? JSON.stringify(v)) : v).trim());
const CONDITION = { brand_new: 'New', used_like_new: 'Like new', used_excellent: 'Excellent', used_good: 'Good', used_fair: 'Fair' };

/** A short card title from Depop's free-text description: first line, hashtags removed. */
function titleFrom(desc) {
  const line = String(desc || '').split('\n').map(s => s.replace(/#\S+/g, '').trim()).find(Boolean) || '';
  return line.length > 80 ? line.slice(0, 77).replace(/\s+\S*$/, '') + '...' : line;
}

export function idFromUrl(url) {
  const m = String(url || '').match(/depop\.com\/products\/([^/?#]+)/i);
  return m ? m[1] : null;
}

export function toListing(raw, now = new Date().toISOString()) {
  const url = raw.url || (raw.slug ? `https://www.depop.com/products/${raw.slug}/` : null);
  const sourceId = String(raw.slug || idFromUrl(url) || raw.id || '');
  const photos = (raw.images || raw.pictures || []).map(text).filter(Boolean);
  const photo = photos[0] || text(raw.mainPicture);
  const price = num(raw.price);
  if (!url || !sourceId || !photo || price == null) return null; // not usable on a swipe card
  const original = num(raw.originalPrice);

  return {
    id: 'depop:' + sourceId,
    source: 'depop',
    sourceId,
    url,
    affiliateUrl: null,
    title: text(raw.title) || titleFrom(raw.description) || 'Depop item',
    brand: text(raw.brand ?? raw.brandName),
    price,
    originalPrice: original != null && original > price ? original : null,
    currency: text(raw.currency) || 'USD',
    size: text(first(raw.sizes) ?? raw.size),
    category: text(raw.categoryName ?? raw.category),
    condition: CONDITION[raw.condition] || text(raw.condition),
    style: text(first(raw.style)),
    photoUrl: photo,
    photoUrls: photos.slice(0, 8),
    sellerRating: null,              // this actor doesn't give seller ratings
    sellerReviewCount: null,
    status: raw.sold === true || /sold/i.test(String(raw.status || '')) ? 'sold' : 'active',
    missedChecks: 0,
    scrapedFor: null,
    firstSeenAt: now,
    lastCheckedAt: now,
    soldAt: null,
  };
}

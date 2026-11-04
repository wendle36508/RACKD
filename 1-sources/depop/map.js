// Turns one raw Depop item from Apify into a RACKD listing (3-data/listing.schema.json).
// Only listing facts are kept. Seller usernames, ids and other raw data are dropped.
// PLACEHOLDER: field names come from the abotapi Depop actor's sample output. If you
// switch actors, only this file needs to change.

const num = v => {
  if (v == null) return null;
  if (typeof v === 'object') v = v.priceAmount ?? v.amount ?? v.value ?? v.price;
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : null;
};
const first = v => Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
const text = v => (v == null || v === '' ? null : String(typeof v === 'object' ? (v.name ?? v.label ?? JSON.stringify(v)) : v).trim());

export function idFromUrl(url) {
  const m = String(url || '').match(/depop\.com\/products\/([^/?#]+)/i);
  return m ? m[1] : null;
}

export function toListing(raw, now = new Date().toISOString()) {
  const url = raw.url || raw.productUrl || (raw.slug ? `https://www.depop.com/products/${raw.slug}/` : null);
  const sourceId = String(raw.slug || idFromUrl(url) || raw.id || '');
  const photo = text(raw.mainPicture) || text(first(raw.pictures)) || text(first(raw.images));
  const price = num(raw.price);
  if (!url || !sourceId || !photo || price == null) return null; // not usable on a swipe card

  return {
    id: 'depop:' + sourceId,
    source: 'depop',
    sourceId,
    url,
    affiliateUrl: null,
    title: text(raw.title) || text(raw.description)?.slice(0, 80) || 'Depop item',
    brand: text(raw.brandName ?? raw.brand),
    price,
    originalPrice: num(raw.originalPrice ?? raw.price?.originalPrice),
    currency: text(raw.currency ?? raw.price?.currencyName) || 'USD',
    size: text(first(raw.sizes) ?? raw.size),
    category: text(raw.category ?? raw.categoryName),
    condition: text(raw.condition),
    style: text(first(raw.style)),
    photoUrl: photo,
    photoUrls: (raw.pictures || raw.images || []).map(text).filter(Boolean).slice(0, 8),
    sellerRating: num(raw.sellerReviewsRating),
    sellerReviewCount: raw.sellerReviewsTotal != null ? parseInt(raw.sellerReviewsTotal, 10) : null,
    status: raw.sold === true || /sold/i.test(String(raw.status || '')) ? 'sold' : 'active',
    missedChecks: 0,
    scrapedFor: null,
    firstSeenAt: now,
    lastCheckedAt: now,
    soldAt: null,
  };
}

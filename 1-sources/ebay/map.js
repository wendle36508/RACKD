// Turns one raw eBay item from Apify into a RACKD listing (3-data/listing.schema.json).
// Only listing facts are kept; seller usernames and ids are dropped.
// PLACEHOLDER: field names are guesses until an eBay actor is chosen. Only this file
// needs to change when you pick one.

const num = v => {
  if (v == null) return null;
  if (typeof v === 'object') v = v.value ?? v.amount ?? v.price;
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : null;
};
const text = v => (v == null || v === '' ? null : String(typeof v === 'object' ? (v.url ?? v.imageUrl ?? v.name ?? '') : v).trim() || null);

export function idFromUrl(url) {
  const m = String(url || '').match(/ebay\.[a-z.]+\/itm\/(?:[^/?#]+\/)?(\d{9,})/i);
  return m ? m[1] : null;
}

export function toListing(raw, now = new Date().toISOString()) {
  const url = raw.url || raw.itemUrl || raw.itemWebUrl;
  const sourceId = String(idFromUrl(url) || raw.itemId || raw.id || '');
  const photos = (raw.images || raw.additionalImages || []).map(text).filter(Boolean);
  const photo = text(raw.image) || text(raw.imageUrl) || text(raw.thumbnail) || photos[0];
  const price = num(raw.price);
  if (!url || !sourceId || !photo || price == null) return null;

  const ended = /ended|sold|unavailable/i.test(String(raw.status || raw.availability || ''));
  return {
    id: 'ebay:' + sourceId,
    source: 'ebay',
    sourceId,
    url,
    affiliateUrl: null,          // 7-money/affiliate.js turns this into an eBay Ambassador link
    title: text(raw.title) || 'eBay item',
    brand: text(raw.brand ?? raw.itemSpecifics?.Brand),
    price,
    originalPrice: num(raw.originalPrice ?? raw.wasPrice),
    currency: text(raw.currency ?? raw.price?.currency) || 'USD',
    size: text(raw.size ?? raw.itemSpecifics?.Size),
    category: text(raw.category ?? raw.categoryName),
    condition: text(raw.condition),
    style: null,
    photoUrl: photo,
    photoUrls: photos.slice(0, 8),
    sellerRating: num(raw.sellerFeedbackPercent ?? raw.seller?.feedbackPercentage) != null
      ? Math.round(num(raw.sellerFeedbackPercent ?? raw.seller?.feedbackPercentage) / 2) / 10   // 98% -> 4.9 stars
      : null,
    sellerReviewCount: num(raw.sellerFeedbackScore ?? raw.seller?.feedbackScore),
    status: ended ? 'sold' : 'active',
    missedChecks: 0,
    scrapedFor: null,
    firstSeenAt: now,
    lastCheckedAt: now,
    soldAt: null,
  };
}

// Turns one raw Vinted item from Apify into a RACKD listing (3-data/listing.schema.json).
// Only listing facts are kept; seller usernames and ids are dropped.
// PLACEHOLDER: field names are guesses until a Vinted actor is chosen. Only this file
// needs to change when you pick one.

const num = v => {
  if (v == null) return null;
  if (typeof v === 'object') v = v.amount ?? v.value ?? v.price;
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : null;
};
const text = v => (v == null || v === '' ? null : String(typeof v === 'object' ? (v.title ?? v.name ?? v.url ?? '') : v).trim() || null);

export function idFromUrl(url) {
  const m = String(url || '').match(/vinted\.[a-z.]+\/items\/(\d+)/i);
  return m ? m[1] : null;
}

export function toListing(raw, now = new Date().toISOString()) {
  const url = raw.url || raw.itemUrl;
  const sourceId = String(raw.id || idFromUrl(url) || '');
  const photos = (raw.photos || raw.images || []).map(p => text(p.url ?? p.full_size_url ?? p)).filter(Boolean);
  const photo = text(raw.photo?.url) || text(raw.image) || photos[0];
  const price = num(raw.price ?? raw.total_item_price);
  if (!url || !sourceId || !photo || price == null) return null;

  return {
    id: 'vinted:' + sourceId,
    source: 'vinted',
    sourceId,
    url,
    affiliateUrl: null,
    title: text(raw.title) || 'Vinted item',
    brand: text(raw.brand ?? raw.brand_title),
    price,
    originalPrice: null,
    currency: text(raw.currency ?? raw.price?.currency_code) || 'USD',
    size: text(raw.size ?? raw.size_title),
    category: text(raw.category ?? raw.catalog_title),
    condition: text(raw.status ?? raw.condition),
    style: null,
    photoUrl: photo,
    photoUrls: photos.slice(0, 8),
    sellerRating: num(raw.user?.feedback_reputation) != null ? Math.round(num(raw.user.feedback_reputation) * 50) / 10 : null,
    sellerReviewCount: raw.user?.feedback_count ?? null,
    status: raw.is_closed || raw.is_sold || /sold/i.test(String(raw.availability || '')) ? 'sold' : 'active',
    missedChecks: 0,
    scrapedFor: null,
    firstSeenAt: now,
    lastCheckedAt: now,
    soldAt: null,
  };
}

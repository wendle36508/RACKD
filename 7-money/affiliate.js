// Floor 7: turns a listing link into a link that earns RACKD a commission.
// PLACEHOLDER: no affiliate program is live in the app yet, so links pass through
// unchanged. When one is approved, add its rule below and every "Buy" button in the
// app picks it up on the next build.
const RULES = {
  // ebay: url => process.env.EBAY_CAMPAIGN_ID ? `${url}${url.includes('?') ? '&' : '?'}mkcid=1&mkrid=711-53200-19255-0&campid=${process.env.EBAY_CAMPAIGN_ID}&toolid=10001&mkevt=1` : url,
  // etsy: url => ... (Etsy affiliate link format, once approved)
};

export function buyLink(listing) {
  if (listing.affiliateUrl) return listing.affiliateUrl;
  const rule = RULES[listing.source];
  return rule ? rule(listing.url) : listing.url;
}

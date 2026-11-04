// Floor 7: turns a listing link into a link that earns RACKD a commission.
// eBay listings are wrapped with your eBay Ambassador / Partner Network campaign id once
// EBAY_CAMPAIGN_ID is in .env (CHECK the link format against your Ambassador dashboard).
// Other sites pass through unchanged until their affiliate program is approved: add a rule
// below and every "Buy" button picks it up.
const RULES = {
  // eBay Ambassador / Partner Network: wraps every eBay listing once EBAY_CAMPAIGN_ID is in .env.
  ebay: url => process.env.EBAY_CAMPAIGN_ID ? `${url}${url.includes('?') ? '&' : '?'}mkcid=1&mkrid=711-53200-19255-0&campid=${process.env.EBAY_CAMPAIGN_ID}&toolid=10001&mkevt=1` : url,
  // etsy: url => ... (Etsy affiliate link format, once approved)
};

export function buyLink(listing) {
  if (listing.affiliateUrl) return listing.affiliateUrl;
  const rule = RULES[listing.source];
  return rule ? rule(listing.url) : listing.url;
}

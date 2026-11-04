// Which sites RACKD scrapes, what each costs on Apify, and how each refresh is split.
// "share" is the slice of every refresh that goes to that site (Tanner's mix, 4 Nov 2026).
// Shares are rebalanced over the sites switched on in .env SOURCES, so if only Depop is
// on, Depop gets the whole refresh.
export const SOURCE_SETTINGS = {
  vinted: { usdPer1000: 1.00, share: 0.50 },   // Apify price, 4 Nov 2026
  depop:  { usdPer1000: 4.00, share: 0.30 },   // Apify price, 4 Nov 2026
  ebay:   { usdPer1000: 4.00, share: 0.20 },   // Apify price, 4 Nov 2026 (eBay actor not chosen yet)
};

// Residential proxy data may be billed by Apify on top of the listing price. If it is,
// put that extra cost per 1,000 listings in .env so the spend guard counts it too.
export const PROXY_USD_PER_1000 = Number(process.env.PROXY_USD_PER_1000 || 0);

export const usdPerListing = name => ((SOURCE_SETTINGS[name]?.usdPer1000 ?? 4) + PROXY_USD_PER_1000) / 1000;

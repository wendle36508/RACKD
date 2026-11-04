// Which sites RACKD scrapes, what each costs on Apify, and how each scrape is split.
// "share" is the slice of each scrape that goes to that site (they're rebalanced over the
// sites switched on in .env SOURCES, so Depop alone gets everything).
export const SOURCE_SETTINGS = {
  depop:  { usdPer1000: 4.00, share: 0.5 },   // Apify prices as of 4 Nov 2026
  vinted: { usdPer1000: 1.00, share: 0.5 },
};

// Residential proxy data may be billed by Apify on top of the listing price. If it is,
// put that extra cost per 1,000 listings in .env so the spend guard counts it too.
export const PROXY_USD_PER_1000 = Number(process.env.PROXY_USD_PER_1000 || 0);

export const usdPerListing = name => ((SOURCE_SETTINGS[name]?.usdPer1000 ?? 4) + PROXY_USD_PER_1000) / 1000;

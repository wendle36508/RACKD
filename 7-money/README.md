# Floor 7: Money

| Piece | File | Status |
|---|---|---|
| Plans: free (2 refreshes a day x 50) and premium (2 x 150) | `plans.config.js` | Built. Premium price not decided |
| **Spend guard**: stops all scraping once the month's budget ($330) is used; alerts at 50%, 80% and 100% | `spend-guard.js`, `budget.config.js` | Built |
| Stripe subscription: flips a user to premium, which raises their refreshes automatically | `stripe.js` | **PLACEHOLDER** |
| Affiliate links: every Buy button goes through here | `affiliate.js` | **PLACEHOLDER**. eBay Ambassador joined, Etsy not set up |
| In-app browser | | Not built (buyers check out on the seller's site) |

**Also set a hard cap in Apify itself:** Apify console → Settings → Usage & billing → set a monthly usage limit (for example $330). The spend guard is RACKD's own brake; Apify's limit is a second brake that works even if something in RACKD goes wrong.

**FTC rule:** once affiliate links are live, the app must clearly say RACKD may earn a commission.

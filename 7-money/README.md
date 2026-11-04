# Floor 7: Money

| Piece | File | Status |
|---|---|---|
| **Members only** (no free version): one plan, $9.99 a month, 2 refreshes a day x 150. Non-members see "Become a member" and get no scraping | `plans.config.js` | Built. No free trial or demo: pay to start |
| Test mode: everyone counts as a member, for trying RACKD before Stripe exists. **Turn off before launch** | `.env` (`TEST_MODE_EVERYONE_IS_MEMBER`) | Off by default; health check shows amber if it's on |
| **Spend guard**: stops all scraping once the month's budget ($330) is used; alerts at 50%, 80% and 100% | `spend-guard.js`, `budget.config.js` | Built |
| Stripe subscription: paying makes a user a member, cancelling ends it. The "Become a member" button goes to `STRIPE_CHECKOUT_URL` | `stripe.js` | **PLACEHOLDER**. Set the Stripe price to $9.99/month |
| Affiliate links: every Buy button goes through here | `affiliate.js` | **PLACEHOLDER**. eBay Ambassador joined, Etsy not set up |
| In-app browser | | Not built (buyers check out on the seller's site) |

**Also set a hard cap in Apify itself:** Apify console → Settings → Usage & billing → set a monthly usage limit (for example $330). The spend guard is RACKD's own brake; Apify's limit is a second brake that works even if something in RACKD goes wrong.

**Cost check:** a member who uses every refresh costs about $22.50 a month in scraping, and pays $9.99 (about $9.40 after Stripe's fee). Light users pay for heavy ones; break-even is about 42% use.

**FTC rule:** once affiliate links are live, the app must clearly say RACKD may earn a commission.

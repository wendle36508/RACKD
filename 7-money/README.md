# Floor 7: Money

| Piece | File | Status |
|---|---|---|
| **Members only** (no free version): one plan, $9.99 a month, 200 new listings every 30 minutes while the app is open (up to 32 refreshes a day). Non-members see "Become a member" and get no scraping | `plans.config.js` | Built. 3-day free trial, card required, $9.99 charged automatically when it ends (`trialDays`) |
| Test mode: everyone counts as a member, for trying RACKD before Stripe exists. **Turn off before launch** | `.env` (`TEST_MODE_EVERYONE_IS_MEMBER`) | Off by default; health check shows amber if it's on |
| **Spend guard**: stops all scraping once the month's budget ($330) is used; alerts at 50%, 80% and 100% | `spend-guard.js`, `budget.config.js` | Built |
| Stripe subscription: paying makes a user a member, cancelling ends it. The "Become a member" button goes to `STRIPE_CHECKOUT_URL` | `stripe.js` | **PLACEHOLDER**. Set the Stripe price to $9.99/month |
| Affiliate links: every Buy button goes through here | `affiliate.js` | **PLACEHOLDER**. eBay Ambassador joined, Etsy not set up |
| In-app browser | | Not built (buyers check out on the seller's site) |

**Also set a hard cap in Apify itself:** Apify console → Settings → Usage & billing → set a monthly usage limit (for example $330). The spend guard is RACKD's own brake; Apify's limit is a second brake that works even if something in RACKD goes wrong.

**Cost check:** on Apify, a member who uses every refresh (200 every 30 minutes, 16 hours a day) would cost about $480 a month in scraping, against $9.99 paid (about $9.40 after Stripe's fee). The spend guard stops scraping at the $330 monthly budget. This plan needs RACKD's own scraper, which should cost a few dollars per member a month (to be tested).

**FTC rule:** once affiliate links are live, the app must clearly say RACKD may earn a commission.

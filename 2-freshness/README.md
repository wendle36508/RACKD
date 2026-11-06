# Floor 2: Freshness

Keeps every deck fresh, per user, and makes sure nobody falls for an item that already sold.

| File | What it does |
|---|---|
| `on-open.js` | **Refresh on open.** When a user opens the app, and every 30 minutes while it stays open, scrape new listings picked for their style. 200 each, up to 32 a day (members only; the day resets at midnight US Eastern). Each refresh searches a different slice of their style, so fewer repeats come back. Skipped if the monthly budget is used up |
| `check-before-show.js` | **Sold check, just before showing.** Any card not confirmed for sale in the last 24 hours is re-checked before it appears. Sold ones are hidden for good; ones that vanish twice in a row are taken down |
| `cleanup.js` | Deletes sold listings older than 30 days. Free (no scraping): `npm run cleanup` |
| `freshness.config.js` | The numbers: 60-minute gap, 24-hour re-check, how many cards to check per open |

How many listings each plan gets is in `7-money/plans.config.js`.

Nothing here runs on a server timer. Everything happens because a user has the app open, so there are no background jobs to forget about. Every refresh, skipped refresh and sold check is written to the activity log (see the README's "Safety rails").

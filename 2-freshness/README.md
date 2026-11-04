# Floor 2: Freshness

Keeps every deck fresh, per user, and makes sure nobody falls for an item that already sold.

| File | What it does |
|---|---|
| `on-open.js` | **Refresh on open.** When a user opens the app, scrape new listings picked for their style. At most once an hour, 2 times a day (free 50 each, premium 150 each). Skipped if the monthly budget is used up |
| `check-before-show.js` | **Sold check, just before showing.** Any card not confirmed for sale in the last 24 hours is re-checked before it appears. Sold ones are hidden for good; ones that vanish twice in a row are taken down |
| `cleanup.js` | Deletes sold listings older than 30 days. Free (no scraping): `npm run cleanup` |
| `freshness.config.js` | The numbers: 60-minute gap, 24-hour re-check, how many cards to check per open |

How many listings each plan gets is in `7-money/plans.config.js`.

Nothing here runs on a timer. Everything happens because a user opened the app, so there are no background jobs to forget about. Every refresh, skipped refresh and sold check is written to the activity log (see the README's "Safety rails").

# RACKD: notes for Claude Code

Tanner (founder) is non-technical. Explain changes in plain language and keep steps short.

- The repo is organized by build-tower floor: 1-sources, 2-freshness, 3-data, 4-algorithm, 5-app, 6-hosting, 7-money, toolbox. Keep new work in the right floor.
- `brand-intel/` is Idea A (resale product intelligence for brands), a separate Python product beside the tower. It gets listings only through `brand-intel/bridge/rackd-sources.mjs` (floor 1's `search` / `checkListings`, so `runPaid` and the spend guard still apply) and keeps its own SQLite data in `brand-intel/data/` (not `3-data/store.js`, since it stores prices over time, not swipe cards). Python only for new code there. Test with `py brand-intel/run.py selftest`.
- Floors talk only through small seams: sources expose `search` / `checkListings`; all storage goes through `3-data/store.js`; all buy links go through `7-money/affiliate.js`. Don't bypass them.
- Every listing must match `3-data/listing.schema.json`. Keep listing facts only (no seller usernames or ids).
- Secrets go in `.env` only (never committed). Never print the Apify token.
- No Poshmark data in this repo (Tanner's decision).
- Scraping with Apify is Tanner's decision; don't argue it. Proxy stays Apify Residential.
- Scraping is per user, on app open (2-freshness/on-open.js): max once an hour, 2 refreshes a day, sizes per plan in 7-money/plans.config.js. Every Apify call must go through `runPaid` (spend guard). No timers or cron jobs.
- RACKD is members-only ($9.99/month, one plan in `7-money/plans.config.js`): no free version, and non-members get no scraping. `TEST_MODE_EVERYONE_IS_MEMBER` is for laptop testing only and must be off before launch.
- Never show a user the same card twice: every card on screen is saved in `user.shown` and `deckFor` leaves it out. A refresh's own finds (`user.lastRefresh.ids`) go to the front of the deck.
- Log anything that fires with `activity()` and anything Tanner must know with `alert()` (toolbox/alerts.js). Tanner wants nothing to happen, or fail to happen, silently.
- Run `npm run check` before committing.
- Tanner runs on Windows: keep `RACKD.bat` working and paths Windows-friendly.

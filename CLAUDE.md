# RACKD: notes for Claude Code

Tanner (founder) is non-technical. Explain changes in plain language and keep steps short.

- The repo is organized by build-tower floor: 1-sources, 2-freshness, 3-data, 4-algorithm, 5-app, 6-hosting, 7-money, toolbox. Keep new work in the right floor.
- Floors talk only through small seams: sources expose `fetchNew` / `checkListings`; all storage goes through `3-data/store.js`; all buy links go through `7-money/affiliate.js`. Don't bypass them.
- Every listing must match `3-data/listing.schema.json`. Keep listing facts only (no seller usernames or ids).
- Secrets go in `.env` only (never committed). Never print the Apify token.
- No Poshmark data in this repo (Tanner's decision).
- Scraping with Apify is Tanner's decision; don't argue it. Proxy stays Apify Residential.
- Run `npm run check` before committing.
- Tanner runs on Windows: keep `RACKD.bat` working and paths Windows-friendly.

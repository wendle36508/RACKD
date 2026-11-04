# Floor 1: Listing sources

Gets listings from resale sites through Apify. Each site has its own folder, and every site does the same two jobs:

- `search(searchPlan, count)`: find listings that fit one user's style (the search comes from floor 4)
- `checkListings(urls)`: say whether each listing is still for sale, sold, or gone

| File | What it is |
|---|---|
| `sources.config.js` | Price per 1,000 listings for each site (Depop $4, Vinted $1) and the split of each refresh (50/50) |
| `apify/apify.js` | Starts an Apify scraper and collects the results. Every run asks the spend guard first, and every run uses **Apify Proxy, Residential, US** |
| `depop/` | **PLACEHOLDER config.** `depop.config.js` = scraper settings (lines marked CHECK must match the actor's Input tab), `map.js` = turns a Depop item into a RACKD listing |
| `vinted/` | **PLACEHOLDER config**, same layout. No Vinted actor chosen yet: put its id in `.env` as `VINTED_ACTOR_ID` |
| `index.js` | The list of sites. `SOURCES=depop,vinted` in `.env` switches them on |

Only listing facts are kept (title, price, size, photo, link, seller rating). Seller usernames and ids are dropped.

**Adding another site later (Etsy, eBay, Grailed):** copy the `depop` folder, change the config and `map.js`, and add one line to `index.js` and `sources.config.js`.

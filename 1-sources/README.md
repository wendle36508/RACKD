# Floor 1: Listing sources

Gets listings from resale sites. Each site has its own folder, and every site does the same two jobs:

- `fetchNew(count)`: bring back brand-new listings
- `checkListings(urls)`: say whether each listing is still for sale, sold, or gone

| File | What it is |
|---|---|
| `apify/apify.js` | Starts an Apify scraper and collects its results. Sets the proxy to **Apify Proxy, Residential, US** for every run |
| `depop/depop.config.js` | **PLACEHOLDER.** The Depop scraper's settings: which actor, which searches, how many. Lines marked CHECK must match the actor's Input tab |
| `depop/map.js` | Turns a raw Depop item into a RACKD listing. Keeps listing facts only, drops seller usernames and ids |
| `depop/index.js` | The Depop source's two jobs |
| `index.js` | The list of sources. `SOURCES=depop` in `.env` switches them on |

**Adding another site later (Etsy, eBay, Vinted, Grailed):** copy the `depop` folder, change the config and `map.js`, add one line to `index.js`.

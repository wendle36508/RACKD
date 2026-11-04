# Floor 3: Data storage

Every listing, from every site, is saved in **one standard shape**: the listing schema in [`listing.schema.json`](listing.schema.json). Main fields: id, source, link, title, brand, price, size, category, condition, photo, seller rating, and status (active / sold / removed).

| File | What it is |
|---|---|
| `listing.schema.json` | The listing schema: every field, explained |
| `store.js` | The only file that reads or writes listings. Now: `3-data/local/listings.json` on your laptop |
| `validate.js` | Checks a listing has everything the app needs before it's saved |
| `supabase/schema.sql` | **PLACEHOLDER** for the cloud database later (Supabase, with room for style fingerprints) |
| `sample/example-listings.json` | 3 fake listings for trying the app |

The `local/` folder (your real listings and fingerprints) is never uploaded to GitHub.

# Floor 3: Data storage

Everything RACKD keeps, all through one file (`store.js`), so moving to a cloud database later means changing only that file.

| What | Where (on your laptop, never uploaded to GitHub) |
|---|---|
| Listings, in the standard shape from [`listing.schema.json`](listing.schema.json), tagged with whose searches found them | `local/listings.json` |
| Users: plan (free or premium), today's refreshes, likes and passes, **every card they've been shown** (so none ever repeats), and what their last refresh found | `local/users.json` |
| Apify spending by month | `local/spend.json` |
| Activity log: one line for every scrape, skipped refresh, sold check, plan change, Stripe event and alert | `local/activity.jsonl` |
| FashionCLIP style fingerprints | `local/fingerprints.json` |

Other files: `validate.js` (checks a listing before it's saved), `supabase/schema.sql` (**PLACEHOLDER** for the cloud database), `sample/` (3 fake listings for trying the app).

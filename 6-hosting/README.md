# Floor 6: Hosting (not built yet)

**Plan:** put the app online with **Vercel** (free to start), so anyone can open it from a link on their phone. On hold until real listings are flowing.

When it's time:
1. Move storage to the cloud database (floor 3, `supabase/schema.sql`).
2. Run `5-app/server.js` online (Vercel or a small Node host), with the same `.env` values stored as secrets there.
3. Point the Stripe webhook (floor 7) at the online address.

## Demo link (4 Nov 2026)

A demo of RACKD with made-up placeholder items is online on Vercel, so you can try the swiping on your phone. No real listings, no scraping, no payments, costs nothing. It's built by `6-hosting/demo/build-demo.js` (Vercel runs it on every deploy). The real app, with refresh on open, needs an always-on server (Render, $7/month: see the setup checklist).

## Blog (4 Nov 2026)

`/blog` and `/blog/<article>` show articles written by HeyCatch. They are read live from the HeyCatch API each visit (refreshed every 2 minutes), so a new article appears on its own with no redeploy. Code: `6-hosting/blog/blog.js`; Vercel runs it through `api/blog.js` (routes in `vercel.json`, which also serves `/sitemap.xml` and `/robots.txt`).

The key is **only** stored in Vercel: rackd-demo > Settings > Environment Variables > `HEYCATCH_API_KEY` (Production and Preview), then redeploy. Never put it in GitHub. If the key is missing or wrong, or HeyCatch is down, the blog shows the last good copy or "No articles yet" and logs an alert; the rest of the site keeps working.

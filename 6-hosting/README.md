# Floor 6: Hosting (not built yet)

**Plan:** put the app online with **Vercel** (free to start), so anyone can open it from a link on their phone. On hold until real listings are flowing.

When it's time:
1. Move storage to the cloud database (floor 3, `supabase/schema.sql`).
2. Run `5-app/server.js` online (Vercel or a small Node host), with the same `.env` values stored as secrets there.
3. Point the Stripe webhook (floor 7) at the online address.

## Demo link (4 Nov 2026)

A demo of RACKD with made-up placeholder items is online on Vercel, so you can try the swiping on your phone. No real listings, no scraping, no payments, costs nothing. It's built by `6-hosting/demo/build-demo.js` (Vercel runs it on every deploy). The real app, with refresh on open, needs an always-on server (Render, $7/month: see the setup checklist).

## Demo website (updated 4 Nov 2026, from the heycatch site audit)

The demo is now a small website around the swipe deck: a headline, a sign-up form for the 3-day free trial, "how it works" and FAQ sections, a founder line with the Babson Ignite mention, plus `/about`, `/changelog`, `robots.txt`, `sitemap.xml` and a link-preview picture (`og.png`).

- All the words and links are in `demo/site.config.js`. The layout is in `demo/site.js`.
- **Still waiting on Tanner** (marked TANNER in `site.config.js`): the sign-up form address (`WAITLIST_FORM_URL` in Vercel), your photo, your LinkedIn/X links, and real quotes from demo testers. Until the form address is set, the form tells visitors the list isn't open yet and every build raises an alert.

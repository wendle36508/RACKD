# Floor 6: Hosting (not built yet)

**Plan:** put the app online with **Vercel** (free to start), so anyone can open it from a link on their phone. On hold until real listings are flowing.

When it's time:
1. Move storage to the cloud database (floor 3, `supabase/schema.sql`).
2. Run `5-app/server.js` online (Vercel or a small Node host), with the same `.env` values stored as secrets there.
3. Point the Stripe webhook (floor 7) at the online address.

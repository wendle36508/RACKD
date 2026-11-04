# Floor 6: Hosting (not built yet)

**Plan:** put the app online with **Vercel** (free to start), so anyone can open it from a link on their phone. On hold until real listings are flowing.

When it's time:
1. Move storage to the cloud database (floor 3, `supabase/schema.sql`).
2. Move the two freshness jobs (floor 2) to a cloud scheduler so they run without your laptop.
3. Connect this repo to Vercel and publish `5-app/`.

# Floor 5: App

| File | What it is |
|---|---|
| `server.js` | The app server: `npm start` or RACKD.bat option 2, then open http://localhost:3000. Gives each visitor an id (a cookie), shows their deck straight away, runs the sold check and refresh in the background, and slides new finds in as they arrive |
| `app-template.html` | The app design and swipe logic. Tabs: Swipe, Your style, Liked (each liked item links to buy it on the seller's site) |
| `app-data.js` | Turns stored listings into app cards, with buy links (floor 7) and fingerprints (floor 4) |
| `build-app.js` | Optional: an offline copy of the app with no server (`npm run demo` → `dist/rackd.html`) |
| `legal/privacy-policy.md` | The RACKD Privacy Policy for the sign-up screen. **Draft: needs a lawyer's review before launch** (see `legal/README.md`) |

Useful pages while the server runs:
- http://localhost:3000/api/health: a light for every floor
- http://localhost:3000/api/status: your plan, today's refreshes, this month's spend

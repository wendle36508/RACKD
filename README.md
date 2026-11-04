# RACKD

Swipe through secondhand listings. Swipe right on what you love, left on what you don't, and RACKD learns your style.

This repo is the whole build in one place. It is organized like the **RACKD build tower**: each floor of the tower is one folder, and data moves up the tower from the bottom floor to the top.

## The floors

| Floor | Folder | What it does | Status today |
|---|---|---|---|
| 1. Listing sources | [`1-sources/`](1-sources/) | Gets listings from resale sites through Apify scrapers (Depop first), using Apify's Residential proxy | Ready for your Apify token and scraper |
| 2. Freshness | [`2-freshness/`](2-freshness/) | Every hour adds 20 new listings. Every day re-checks 500 and removes sold items | Built, waiting for the scraper |
| 3. Data storage | [`3-data/`](3-data/) | Keeps every listing in one standard shape (the listing schema). A file on your laptop now, a cloud database later | Local file works; cloud database not built |
| 4. Algorithm | [`4-algorithm/`](4-algorithm/) | FashionCLIP style AI gives each photo a "style fingerprint" so the app can learn taste from looks | Built, waiting for real listings |
| 5. App | [`5-app/`](5-app/) | The swipe app itself. Builds into one file you open in a browser | Built (try it with example listings) |
| 6. Hosting | [`6-hosting/`](6-hosting/) | Putting the app online (Vercel) | Not built |
| 7. Money | [`7-money/`](7-money/) | Affiliate links and the $5/month subscription | Placeholder |
| Toolbox | [`toolbox/`](toolbox/) | Shared helpers, Windows scripts, self-test | Ready |
| Docs | [`docs/`](docs/) | The RACKD plan and build tower diagram | |

## How data flows up the tower

```
 Depop (and later Etsy, eBay...)
        |
 [1 SOURCES]   Apify scraper, through the Residential proxy, returns raw items.
        |      1-sources/depop/map.js turns each raw item into a RACKD listing.
        v
 [2 FRESHNESS] Hourly: ask for 20 new listings, skip ones we already have.
        |      Daily 4am: re-check the 500 listings checked longest ago.
        |      Sold ones are hidden at once; ones that vanish twice are taken down.
        v
 [3 DATA]      Every listing saved in the same shape (3-data/listing.schema.json),
        |      with status active / sold / removed.
        v
 [4 ALGORITHM] FashionCLIP looks at each new photo once and saves its style fingerprint.
        v
 [5 APP]       build-app takes the active listings + fingerprints and makes rackd.html.
        |      In the app, every like pulls the deck toward that look, every pass away.
        v
 [7 MONEY]     Every "Buy" button goes through 7-money/affiliate.js, so affiliate links
               switch on everywhere at once when a program is approved.
```

The important idea: **each floor only talks to the floor next to it through one small file.** So when you hand over the final scraper, only `1-sources/depop/` changes. When we move to a cloud database, only `3-data/store.js` changes. Everything else keeps working.

## Secrets (your Apify token)

Secrets live in a file called `.env` in the top folder. It is **never uploaded to GitHub** (it is listed in `.gitignore`).

1. Copy `.env.example` and rename the copy to `.env`
2. Paste your Apify token after `APIFY_TOKEN=`

Never paste the token anywhere else, including chat.

## Get the repo onto your Windows laptop

You only do this once.

1. Install **Git for Windows** from https://git-scm.com/download/win (click Next through the installer; the defaults are fine).
2. Open **Claude Code** in any folder and say: *"Clone github.com/wendle36508/rackd into my Documents folder."* Claude Code runs the command for you.
   Prefer doing it yourself? Open the **Command Prompt** and type:
   ```
   cd %USERPROFILE%\Documents
   git clone https://github.com/wendle36508/rackd.git
   ```
   A GitHub sign-in window pops up the first time. Sign in as wendle36508.
3. Open the new `Documents\rackd` folder. Double-click **`RACKD.bat`**, pick **1** (set up), then **2** to see the app with example listings.
4. To work on RACKD with Claude Code and gstack, open Claude Code in `Documents\rackd`.

To get the latest changes later, tell Claude Code *"pull the latest rackd"* (or type `git pull` inside the folder).

## When the scraper and proxy arrive

1. Put your Apify token in `.env` (above).
2. Put the actor's id in `.env` as `DEPOP_ACTOR_ID` (the part of the actor's apify.com address like `abotapi~depop-scraper`).
3. Open the actor's **Input** tab on apify.com and compare it with `1-sources/depop/depop.config.js`. Lines marked **CHECK** are the ones to confirm. The proxy is already set to Apify Proxy, Residential, US.
4. In `RACKD.bat` pick **3** (get new listings now). If 20 listings arrive, pick **5** then **6** to see them in the app.
5. Pick **8** to switch on the automatic schedule.

Or just tell Claude Code: *"Here is my Apify actor and its input, plug it into 1-sources/depop."*

## Rough running cost

About 20 new listings an hour (480 a day) plus 500 re-checks a day is about 1,000 Apify results a day, roughly 30,000 a month. At the Depop actor's price (about $1.60 to $1.80 per 1,000) that is around $50 to $55 a month, plus Residential proxy data. See the pricing notes in `7-money/`.

## Commands (for Claude Code)

| Command | Does |
|---|---|
| `npm install` | One-time setup |
| `npm run demo` | App with 3 example listings |
| `npm run fetch-new` | Floor 2 hourly job |
| `npm run recheck` | Floor 2 daily sold-item job |
| `npm run style-ai` | Floor 4 fingerprints |
| `npm run build-app` | Floor 5 builds `5-app/dist/rackd.html` |
| `npm run pipeline` | fetch-new, style-ai, build-app in a row |
| `npm run check` | Self-test (no internet needed) |

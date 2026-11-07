# RACKD

Swipe through secondhand listings. Swipe right on what you love, left on what you don't, and RACKD learns your style.

This repo is the whole build in one place. It is organized like the **RACKD build tower**: each floor of the tower is one folder, and data moves up the tower from the bottom floor to the top.

## The floors

| Floor | Folder | What it does | Status today |
|---|---|---|---|
| 1. Listing sources | [`1-sources/`](1-sources/) | Scrapes Vinted, Depop and eBay through Apify, with Apify's Residential proxy | Ready for your Apify token and scrapers |
| 2. Freshness | [`2-freshness/`](2-freshness/) | Refresh on open: new listings for each user's style, at most once an hour, 2 times a day. Checks for sold items just before showing | Built, waiting for the scrapers |
| 3. Data storage | [`3-data/`](3-data/) | Listings, users and spending, all in one standard shape. Files on your laptop now, a cloud database later | Local storage works; cloud database not built |
| 4. Algorithm | [`4-algorithm/`](4-algorithm/) | Reads each user's style from their swipes, builds their searches, ranks their deck, decides what can be shared. FashionCLIP reads the photos | Built, waiting for real listings |
| 5. App | [`5-app/`](5-app/) | The swipe app and the small server behind it | Built (try it with example listings) |
| 6. Hosting | [`6-hosting/`](6-hosting/) | Putting the app online (Vercel) | Not built |
| 7. Money | [`7-money/`](7-money/) | Membership ($9.99 a month, members only), the $330/month spend guard, Stripe and affiliate placeholders | Spend guard and members-only built; Stripe and affiliate are placeholders |
| Toolbox | [`toolbox/`](toolbox/) | Safety rails (activity log, alerts, daily summary, health check), Windows scripts, self-test | Ready |
| Brand intel (Idea A) | [`brand-intel/`](brand-intel/) | A separate product beside the app: tracks 5-10 hero products per brand and reports what they resell for (% of retail) and how fast they sell. Python, reuses floor 1's scrapers and floor 7's spend guard | First version built; tested on a made-up Vuori market; real run waits for the Apify token |
| Docs | [`docs/`](docs/) | The RACKD plan and build tower diagram | |

## How it works when someone opens the app

```
 User opens RACKD
        |
 [7 MONEY]     Members only. Not a member? They see "Become a member" ($9.99 a
        |      month) and nothing is scraped for them, so they cost nothing.
        |
 [5 APP]       Straight away: shows stored listings that fit their style, were
        |      confirmed for sale in the last 24 hours, and that they have NEVER
        |      been shown before. No waiting.
        |
        |      Meanwhile, in the background:
        v
 [2 FRESHNESS] 1. Sold check: their next cards that haven't been checked in 24 hours
        |         are looked at again. Sold ones are hidden for good.
        |      2. Refresh: if their last refresh was over an hour ago, and they still
        |         have one left today (2 a day), a new scrape starts.
        v
 [4 ALGORITHM] Builds that user's search from their likes: favorite brands, styles,
        |      size and price range. (New users get starter searches until 3 likes.)
        v
 [7 MONEY]     Spend guard: is there room in this month's $330 budget? If not, skip.
        v
 [1 SOURCES]   Apify scrapes Vinted 50%, Depop 30%, eBay 20%, through the Residential
        |      proxy. 150 listings per refresh.
        v
 [3 DATA]      New listings saved, tagged with whose search found them.
        v
 [5 APP]       The new finds jump to the FRONT of their deck within a minute or two.
```

**Never the same card twice:** the moment a card is on someone's screen, RACKD remembers it, and it never comes back, whether they swiped it or not. So when someone opens the app with a refresh, nothing they see is a repeat. While the refresh loads, they only get listings they've never seen (or a "finding fresh pieces for you" screen), and the new finds go straight to the front as soon as they land. Each refresh also searches a different slice of their style, so fewer repeats come back from the sites in the first place. If they run out, the app says when their next refresh is ("at 3:40 PM" or "tomorrow"). The 2-a-day limit resets at midnight US Eastern time.

**Light sharing:** a listing found for one user can show up for someone else only if the algorithm rates it a strong match for *their* style, and at most 20% of anyone's deck comes from other people's searches. Brand-new users don't get shared listings until RACKD knows their style.

**The important idea:** each floor only talks to the floor next to it through one small file. When you hand over the final scrapers, only `1-sources/depop/`, `1-sources/vinted/` and `1-sources/ebay/` change. When we move to a cloud database, only `3-data/store.js` changes.

## The numbers, and where to change them

| Rule | Now | File |
|---|---|---|
| Refreshes per user per day | 2 | `7-money/plans.config.js` |
| Listings per refresh | 150 (so up to 300 a day) | `7-money/plans.config.js` |
| Membership price | $9.99 a month (no free version) | `7-money/plans.config.js` and your Stripe product |
| Minimum gap between refreshes | 60 minutes | `2-freshness/freshness.config.js` |
| Re-check before showing if older than | 24 hours | `2-freshness/freshness.config.js` |
| Site split | Vinted 50%, Depop 30%, eBay 20% | `1-sources/sources.config.js` |
| Monthly Apify budget | $330 | `.env` (MONTHLY_BUDGET_USD) |
| Sharing: how strong a match, how much of a deck | 0.6, 20% | `4-algorithm/taste.config.js` |

## What it costs

Apify prices: **Vinted $1, Depop $4 and eBay $4 per 1,000 listings.** With your 50/30/20 mix that averages **$2.50 per 1,000**.

| Per user, if they use every refresh | Listings a month | Cost a month |
|---|---|---|
| Member (300 a day) | 9,000 | $22.50 |

Sold-item checks cost the same per listing and come on top (they only happen for cards that haven't been checked in 24 hours). Residential proxy data may also be billed on top. Put it in `.env` as `PROXY_USD_PER_1000` once you know it. **The spend guard counts all of it and stops scraping when the month's $330 is used.** Users still see their stored matches.

With $330 a month, that's roughly 14 members who max out every day. Most people won't open the app twice every day, and shared listings cut the cost, so the real number is higher.

**Watch this:** a member pays $9.99, which is about $9.40 after Stripe's fee. A member who uses every refresh costs about $22.50 in scraping. So RACKD makes money on members who use less than about 42% of their refreshes, and loses money on the heaviest users. The daily summary and `logs/spend.log` show how it's going.

**3-day free trial:** people put in a card to start. Trial users get the full member limits, and Stripe charges $9.99 automatically when the 3 days end. Cancel before then and they're never charged. (A maxed-out trial costs you about $2.25 in scraping.)

**Test mode (only for you, on your laptop, before Stripe exists):** it's off. Set `TEST_MODE_EVERYONE_IS_MEMBER=true` in `.env` to try the app yourself, and **set it back to blank afterwards.** While it's on, the health check shows Floor 7 amber. When Stripe is set up, put your payment link in `.env` as `STRIPE_CHECKOUT_URL` and the "Become a member" button goes there. Check `logs/spend.log` or open `http://localhost:3000/api/status` to see this month's spend.

## Safety rails: nothing fires (or fails) without you knowing

| Rail | What it does | Where |
|---|---|---|
| **Activity log** | One line for every app open, refresh, skipped refresh (and why), scrape, dollar spent, sold check, plan change, Stripe event and alert | `3-data/local/activity.jsonl` |
| **Alerts** | Budget at 50%, 80% and 100%; a scrape or sold check fails; a refresh is stuck for 10 minutes | Emailed to you, and always written to `logs/ALERTS.txt` |
| **Daily summary** | App opens, refreshes run and skipped, listings pulled, sold checks, money spent today and this month, problems | Emailed just after midnight, saved in `logs/daily/`. Or run `npm run summary` |
| **Health check** | A green, amber, red or grey light for every floor, like the build tower | http://localhost:3000/api/health, or `npm run health` |
| **Spend guard** | Stops scraping for the month at $330 | `7-money/` |
| **Apify hard cap** | A second brake, set in Apify itself | See below |

**Turn on alert emails:** make a free account at [resend.com](https://resend.com), create an API key, and put it in `.env` as `RESEND_API_KEY`, with your email as `ALERT_EMAIL_TO`. (On the free plan, alerts can go to the email you signed up with.)

**Set Apify's own monthly limit (do this before your first real run):** in the [Apify console](https://console.apify.com) go to **Settings → Usage & billing** (the exact name of the menu may differ), set a **monthly usage limit** of $330, and switch on Apify's usage emails. If anything in RACKD ever went wrong, Apify itself still stops at that number.

## Secrets (your Apify token)

Secrets live in a file called `.env` in the top folder. It is **never uploaded to GitHub** (it is listed in `.gitignore`).

1. Copy `.env.example` and rename the copy to `.env`
2. Paste your Apify token after `APIFY_TOKEN=`

Never paste the token anywhere else, including chat.

## Get the repo onto your Windows laptop

You only do this once.

1. Install **Git for Windows** from https://git-scm.com/download/win (click Next through the installer; the defaults are fine).
2. Open **Claude Code** in any folder and say: *"Clone github.com/wendle36508/RACKD into Documents\RACKD-app."* Claude Code runs the command for you. (It's called `RACKD-app` because your laptop already has a different, older `Documents\RACKD` folder.)
   Prefer doing it yourself? Open the **Command Prompt** and type:
   ```
   cd %USERPROFILE%\Documents
   git clone https://github.com/wendle36508/RACKD.git RACKD-app
   ```
   A GitHub sign-in window pops up the first time. Sign in as wendle36508.
3. Open the new `Documents\RACKD-app` folder. Double-click **`RACKD.bat`** and pick **1** (set up). Then pick **3** to add example listings, and **2** to start the app. It opens in your browser. If the page is blank, refresh it after a second.
4. To work on RACKD with Claude Code and gstack, open Claude Code in `Documents\RACKD-app`.

To get the latest changes later, tell Claude Code *"pull the latest RACKD-app"* (or type `git pull` inside the folder).

## When the scraper and proxy arrive

1. Put your Apify token in `.env` (above).
2. Put each actor's id in `.env`: `DEPOP_ACTOR_ID` and `VINTED_ACTOR_ID` (the part of the actor's apify.com address like `piotrv1001~depop-listings-scraper`). Switch both on with `SOURCES=depop,vinted`.
3. Open each actor's **Input** tab on apify.com and compare it with `1-sources/depop/depop.config.js` and `1-sources/vinted/vinted.config.js`. Lines marked **CHECK** are the ones to confirm. The proxy is already set to Apify Proxy, Residential, US.
4. In `RACKD.bat` pick **2** to start the app. Opening it runs your first refresh, and new finds appear within a minute or two.

Or just tell Claude Code: *"Here is my Apify actor and its input, plug it into 1-sources/depop."*

## Commands (for Claude Code)

| Command | Does |
|---|---|
| `npm install` | One-time setup |
| `npm start` | Runs the app at http://localhost:3000 |
| `npm run demo` | Adds 3 example listings and builds an offline copy of the app (`5-app/dist/rackd.html`) |
| `npm run style-ai` | FashionCLIP fingerprints for new listings (the server also runs this after each refresh once set up) |
| `npm run cleanup` | Deletes sold listings older than 30 days |
| `npm run check` | Self-test with a fake Apify (no internet or money needed) |
| `npm run health` | A light for every floor |
| `npm run summary` | Today's summary (add a date for another day) |

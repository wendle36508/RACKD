# Brand intel (Idea A): what a brand's products resell for

A separate RACKD product, beside the swipe app. For 5-10 "hero" products per brand, it tracks
secondhand listings over time and reports:

- **Median resale price** and **% of retail held** (the firm number)
- **Typical days to sell**, shown with a band like "1-2 weeks" (a rough guide, see below)
- **Sold within 30 days**: the share of new listings gone inside a month
- **Live now**: how many are for sale today, and at what asking price
- **Sample size and date range**, and **no number at all** when there are fewer than 20 sales

It keeps the raw, timestamped data (every listing, every sighting, every search) so any number
can be traced back to the listings behind it. It's written in Python and reuses RACKD's
existing scrapers.

## How to use it (Windows)

Double-click `brand-intel\Brand Intel.bat` and pick a number. Or type, from the RACKD-app folder:

| Command | What it does | Cost |
|---|---|---|
| `py brand-intel/run.py track vuori` | Searches every Vuori hero product once and saves what it finds | about $1.30 of Apify credit (320 Depop listings) |
| `py brand-intel/run.py track vuori --photos` | Same, plus the FashionCLIP photo check | same |
| `py brand-intel/run.py report vuori` | Makes the Word sheet, the Excel file and the "check by hand" list | free |
| `py brand-intel/run.py import vuori sold.csv` | Adds sales you collected by hand (same columns as `resale_sheet_calc.py`) | free |
| `py brand-intel/run.py review vuori "check by hand 2026-11-20.csv"` | Applies your yes/no answers | free |
| `py brand-intel/run.py case-study` | Runs the Vuori case study on a made-up market | free |
| `py brand-intel/run.py selftest` | Checks the tool works | free |

Run `track` **by hand about twice a week** (Monday and Thursday). There are no timers or cron
jobs, on purpose. A number only means something after a few weeks of tracking, because a sale is
noticed when a listing you were watching disappears.

**Before a real report:** check each `retail_usd` in `brands/vuori.json` on vuoriclothing.com
(full price, not sale) and fill in `retail_checked`. The ones there now are guesses. For the photo
check, save 1-3 official product photos per product into `brands/vuori/photos/`.

## How it works

1. **Search** (`brandintel/track.py`): for each hero product and each site, it runs the product's
   search words through RACKD's floor-1 scrapers, via `bridge/rackd-sources.mjs`. So every Apify
   run goes through `runPaid` and the same monthly spend guard as the app, on the Residential proxy.
2. **Match** (`brandintel/match.py`): is it the brand, does the title name the product, does it
   avoid trap words ("dupe", "bundle", "lululemon", "short" for a jogger)? With `--photos`, does
   FashionCLIP say the photo looks like the reference photos? Unsure ones go to **check by hand**
   and are not counted until you say yes.
3. **Notice sales**: Vinted and eBay can re-check a single listing, so a missing listing is
   confirmed sold or removed. Depop can't, so a listing missing from **two runs in a row** is marked
   "gone" (sold or taken down, we can't tell which), but only if the search came back with fewer
   results than the limit. If the search was cut off, a missing listing may just have slid down the
   results, so it isn't counted.
4. **Numbers** (`brandintel/metrics.py`) and **outputs** (`brandintel/report.py`).

## What the case study showed (made-up market, 13 weeks)

See `case-study/vuori_case.py`. Short version: prices and % of retail came out within 5% of the
truth on every style, it refused the style with too few sales, and with the photo check 100% of the
counted listings were the right product (98% with words only). **Days to sell missed the 5% line**
on most styles, even with daily runs, because 20-40 listings per style is a small sample and items
that sell within a day or two are never seen. That's why the sheet shows days as a band.

## Limits to know

- Prices are the **last asking price**; sites don't show accepted offers. On eBay, a sold listing
  often shows the full price even when a lower Best Offer was accepted.
- Depop counts include listings sellers deleted. It barely moves the median price but makes volume
  look higher.
- eBay: its API license bans using eBay data to "suggest or model prices" and its user agreement
  bans scrapers, and the RACKD eBay account is suspended. eBay is off in `vuori.json`. Depop's terms
  (March 2026) also ban scraping. Tanner has decided to scrape and accepts the risk; get a lawyer's
  read before selling the numbers.
- Vinted and eBay scrapers aren't chosen yet (floor 1 placeholders), so today only Depop works.
- No Poshmark data, ever: Poshmark rows and sources are refused.

## Files

| File | What it is |
|---|---|
| `run.py` | The commands above |
| `brands/vuori.json` | Vuori's 8 hero products: search words, trap words, retail price, photos |
| `brandintel/` | The tool (Python) |
| `bridge/rackd-sources.mjs` | Lets Python use RACKD's scrapers and spend guard |
| `case-study/vuori_case.py` | The made-up Vuori market and the tool-vs-truth scorecard |
| `tests/` | Self-test |
| `data/`, `output/` | Your tracked data and reports (stay on your laptop, not in GitHub) |

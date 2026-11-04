# Floor 2: Freshness

Keeps the deck fresh and stops people falling for items that already sold.

| Job | When | File |
|---|---|---|
| Add new listings | Every hour, 20 new | `fetch-new.js` |
| Sold-item removal | Every day at 4am, re-checks 500 | `recheck-sold.js` |

All the numbers are in **`schedule.config.js`**, so you can change them in one place.

**How sold-item removal works:** the daily job re-checks the 500 listings that were checked longest ago, so every listing gets looked at in turn. Sold ones are hidden from the app straight away. If a listing can't be found two checks in a row, it's taken down too. Sold items stay in storage (hidden) for 30 days so the style AI still remembers what people liked, then they're deleted.

**Turning the schedule on:** double-click `RACKD.bat` and pick 8. That uses Windows Task Scheduler, so it runs while your laptop is on. When RACKD moves online (floor 6), the same two jobs move to a cloud scheduler instead.

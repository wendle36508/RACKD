"""Turns the raw data into the numbers on a Brand Resale Sheet.

For each hero product, over the last `window_days` (90 by default):
  ended        listings that sold (confirmed), went "gone" from Depop, or were hand-collected sales
  median price the middle resale price of those (half sold for more, half for less)
  % of retail  median price / full retail price
  days to sell how long until half of a product's new listings had sold. Uses listings that
               appeared after tracking started and at least 45 days before the report, and
               counts the ones still for sale as "not sold yet" (so slow sellers aren't left
               out, which would make everything look faster than it is). Hand-collected
               sales with both dates are added as they are.
  sell-through share of listings first seen 30+ days ago that ended within 30 days
  live now     how many are for sale right now, and their middle asking price
If a product has fewer than `min_sample` (20) ended listings, no median is given: the sheet
says "too few sales (n = X)". It never stretches the dates to hide a small sample.
"""
from datetime import timedelta
from statistics import median

from .db import parse

COUNTED = ("match", "match-by-hand")


def product_stats(brand, db, as_of):
    start = as_of - timedelta(days=brand.window_days)
    rows = db.listings(f"decision IN {COUNTED}")
    out = []
    for p in brand.products:
        mine = [r for r in rows if r["product_id"] == p.id]
        ended = [r for r in mine if r["status"] in ("sold", "gone") and r["ended_at"]
                 and start <= parse(r["ended_at"]) <= as_of]
        prices = [r["last_price"] for r in ended if r["last_price"] is not None]
        days = half_gone_days(mine, start, as_of)
        live = [r for r in mine if r["status"] == "active" and parse(r["last_seen_at"]) >= as_of - timedelta(days=7)]
        cohort = [r for r in mine if r["is_new"] and start <= parse(r["first_seen_at"]) <= as_of - timedelta(days=30)]
        sold30 = [r for r in cohort if r["status"] in ("sold", "gone") and r["ended_at"]
                  and parse(r["ended_at"]) - parse(r["first_seen_at"]) <= timedelta(days=30)]
        n = len(prices)
        enough = n >= brand.min_sample
        med = median(prices) if prices else None
        ended_dates = sorted(parse(r["ended_at"]) for r in ended)
        out.append({
            "product": p, "n": n, "enough": enough,
            "n_confirmed": sum(1 for r in ended if r["end_kind"] in ("sold-confirmed", "hand-collected")),
            "n_estimated": sum(1 for r in ended if r["end_kind"] == "gone-estimated"),
            "median_price": med if enough else None,
            "pct_retail": (med / p.retail_usd) if (enough and med and p.retail_usd) else None,
            "median_days": days["days"] if enough else None,
            "n_days": days["n"],
            "sell_through_30d": (len(sold30) / len(cohort)) if len(cohort) >= 10 else None,
            "n_cohort": len(cohort),
            "live_now": len(live),
            "live_median_ask": median([r["last_price"] for r in live]) if live else None,
            "sites": sorted({r["source"] for r in ended}),
            "first_end": ended_dates[0] if ended_dates else None,
            "last_end": ended_dates[-1] if ended_dates else None,
            "to_review": sum(1 for r in db.listings("decision = 'review' AND product_id = ?", (p.id,))),
        })
    return out


COHORT_MIN_AGE_DAYS = 45


def half_gone_days(rows, start, as_of):
    """Days until half of the new listings had sold (still-for-sale ones count as not sold)."""
    cutoff = as_of - timedelta(days=COHORT_MIN_AGE_DAYS)
    lives = []
    for r in rows:
        if r["end_kind"] == "removed":        # seller took it down (confirmed): not a sale, leave it out
            continue
        if r["listed_at"] and r["end_kind"] == "hand-collected":
            lives.append((parse(r["ended_at"]) - parse(r["listed_at"])).total_seconds() / 86400)
            continue
        if not r["is_new"]:
            continue
        seen = parse(r["first_seen_at"])
        if not (start <= seen <= cutoff):
            continue
        if r["status"] in ("sold", "gone") and r["ended_at"]:
            lives.append((parse(r["ended_at"]) - seen).total_seconds() / 86400)
        elif r["status"] == "active":
            lives.append(float("inf"))       # not sold yet
    lives.sort()
    n = len(lives)
    if n < 10:
        return {"days": None, "n": n}
    mid = lives[(n - 1) // 2] if n % 2 else (lives[n // 2 - 1] + lives[n // 2]) / 2
    return {"days": None if mid == float("inf") else mid, "n": n}


def takeaways(brand, stats):
    """Plain-English bullets for the sheet. Only uses products with enough sales."""
    ok = [s for s in stats if s["enough"] and s["pct_retail"] is not None]
    if not ok:
        return {"headline": "Not enough sales yet for any product. Keep tracking and run the report again.",
                "restock": [], "price_high": [], "price_low": [], "thin": [s["product"].name for s in stats if not s["enough"]]}
    by_value = sorted(ok, key=lambda s: s["pct_retail"], reverse=True)
    timed = [s for s in ok if s["median_days"] is not None]
    fast = sorted(timed, key=lambda s: s["median_days"])
    top, bottom = by_value[0], by_value[-1]
    head = (f"Your {top['product'].name} holds {top['pct_retail']:.0%} of retail secondhand"
            + (f" and typically sells in about {top['median_days']:.0f} days" if top["median_days"] is not None else "")
            + f". Your {bottom['product'].name} holds {bottom['pct_retail']:.0%}.")
    # Restock candidates: in the top half for value AND the top half for speed.
    half_v = {s["product"].id for s in by_value[: max(1, (len(by_value) + 1) // 2)]}
    half_f = {s["product"].id for s in fast[: max(1, (len(fast) + 1) // 2)]}
    restock = [s["product"].name for s in by_value if s["product"].id in half_v and s["product"].id in half_f]
    return {
        "headline": head,
        "restock": restock,
        "price_high": [s["product"].name for s in ok if s["pct_retail"] >= 1.0],
        "price_low": [s["product"].name for s in ok if s["pct_retail"] < 0.30],
        "thin": [s["product"].name for s in stats if not s["enough"]],
    }

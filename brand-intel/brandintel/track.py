"""One tracking run: search every hero product on every site, save what's there, and work
out which listings ended since last time.

How "sold" is worked out (the honest version):
  - Vinted / eBay: their scrapers can re-check a single listing, so when a tracked listing
    stops showing up we ask the site. "sold" = confirmed sale.
  - Depop: its scraper can't re-check single listings. So a tracked listing that is missing
    from TWO runs in a row is marked "gone" (sold or taken down by the seller; we can't tell
    which). This only counts when the search came back with fewer results than we asked for,
    i.e. we saw everything there was. If the search was cut off at the limit, a missing
    listing may just have slid down the results, so it is NOT counted as gone.
  - When a listing ended between two runs, its end date is set halfway between them.
    So "days to sell" is accurate to about half the gap between your runs.
  - The price used is the last asking price we saw (resale sites don't show us offers).
  - Days to sell only uses listings that appeared AFTER tracking started (is_new), because
    for older ones we don't know when they were first listed.
"""
from . import log
from .db import iso, parse
from .match import decide
from .sources import BudgetReached, SourceError

GONE_AFTER_MISSES = 2
DROP_AFTER_MISSES = 6   # missing from cut-off searches this many times: stop tracking it


def _row(l, when, verdict, is_new):
    return {
        "listing_id": l["id"], "source": l["source"], "url": l["url"], "title": l.get("title"),
        "brand_field": l.get("brand"), "category": l.get("category"), "size": l.get("size"),
        "condition": l.get("condition"), "photo_url": l.get("photoUrl"),
        "first_seen_at": iso(when), "last_seen_at": iso(when),
        "first_price": l.get("price"), "last_price": l.get("price"), "status": "active",
        "product_id": verdict["product_id"], "decision": verdict["decision"],
        "match_reason": verdict["reason"], "image_sim": verdict["image_sim"], "is_new": int(is_new),
        "missed_runs": 0,
    }


def _midpoint(a, b):
    return a + (b - a) / 2


def run(brand, db, fetcher, when, photos=None, note=""):
    """Does one run. Returns a short summary dict. `when` is the time of the run (UTC)."""
    run_id = db.new_run(when, note)
    seen = set()
    complete = {}            # (product_id, source) -> True if the search saw everything
    counts = {"searches": 0, "failed": 0, "listings": 0, "new": 0, "matched_new": 0, "ended": 0}
    stopped_for_budget = False

    for p in brand.products:
        for source in brand.sources:
            if stopped_for_budget:
                break
            started_before = db.first_search_at(p.id, source) is not None
            try:
                found = fetcher.search(source, p.search, brand.listings_per_search)
            except BudgetReached as e:
                log.alert("Brand intel stopped: Apify budget reached", str(e))
                db.add_search(run_id, p.id, source, p.search, brand.listings_per_search, 0, False, "budget")
                stopped_for_budget = True
                counts["failed"] += 1
                break
            except (SourceError, OSError, ValueError) as e:
                log.alert(f"Brand intel: {source} search failed for {p.name}", str(e)[:300])
                db.add_search(run_id, p.id, source, p.search, brand.listings_per_search, 0, False, str(e)[:300])
                counts["failed"] += 1
                continue
            counts["searches"] += 1
            db.add_search(run_id, p.id, source, p.search, brand.listings_per_search, len(found), True)
            complete[(p.id, source)] = len(found) < brand.listings_per_search
            for l in found:
                if "poshmark" in (l.get("url") or "").lower():
                    continue
                if l["id"] in seen:          # already found by another search this run
                    continue
                counts["listings"] += 1
                seen.add(l["id"])
                old = db.get(l["id"])
                db.observe(run_id, l["id"], when, "active", l.get("price"), l)
                if old is None:
                    sims = photos.sims(l) if photos else None
                    verdict = decide(l, brand, sims)
                    db.insert_listing(_row(l, when, verdict, is_new=started_before))
                    counts["new"] += 1
                    if verdict["decision"] == "match":
                        counts["matched_new"] += 1
                else:
                    changes = {"last_seen_at": iso(when), "last_price": l.get("price"), "missed_runs": 0,
                               "first_missed_at": None}
                    if old["status"] != "active":   # it came back: it wasn't sold after all
                        changes.update(status="active", ended_at=None, end_kind=None)
                    db.update_listing(l["id"], **changes)

    # ---- which tracked listings went missing this run? ----
    tracked = db.listings("status = 'active' AND decision IN ('match','review','match-by-hand')")
    to_check = {}
    for t in tracked:
        if t["listing_id"] in seen:
            continue
        key = (t["product_id"], t["source"])
        if key not in complete:      # that search didn't run or failed this time: decide nothing
            continue
        if fetcher.can_check(t["source"]):
            to_check.setdefault(t["source"], []).append(t)
            continue
        misses = (t["missed_runs"] or 0) + 1
        first_missed = t["first_missed_at"] or iso(when)
        if complete[key]:
            if misses >= GONE_AFTER_MISSES:
                end = _midpoint(parse(t["last_seen_at"]), parse(first_missed))
                db.update_listing(t["listing_id"], status="gone", ended_at=iso(end), end_kind="gone-estimated",
                                  missed_runs=misses, first_missed_at=first_missed)
                counts["ended"] += 1
            else:
                db.update_listing(t["listing_id"], missed_runs=misses, first_missed_at=first_missed)
        else:
            # cut-off search: being missing proves nothing. Stop tracking it after a while.
            if misses >= DROP_AFTER_MISSES:
                db.update_listing(t["listing_id"], status="dropped", missed_runs=misses)
            else:
                db.update_listing(t["listing_id"], missed_runs=misses, first_missed_at=t["first_missed_at"])

    for source, items in to_check.items():
        if stopped_for_budget:
            break
        try:
            result = fetcher.check(source, [t["url"] for t in items])
        except BudgetReached as e:
            log.alert("Brand intel stopped: Apify budget reached", str(e))
            break
        except (SourceError, OSError, ValueError) as e:
            log.alert(f"Brand intel: {source} sold check failed", str(e)[:300])
            continue
        for t in items:
            state = result.get(t["url"], "missing")
            if state == "sold":
                end = _midpoint(parse(t["last_seen_at"]), when)
                db.update_listing(t["listing_id"], status="sold", ended_at=iso(end), end_kind="sold-confirmed")
                db.observe(run_id, t["listing_id"], when, "sold", t["last_price"], {"check": "sold"})
                counts["ended"] += 1
            elif state == "active":
                db.update_listing(t["listing_id"], last_seen_at=iso(when))
                db.observe(run_id, t["listing_id"], when, "active", t["last_price"], {"check": "active"})
            else:  # removed by the seller, or the page is gone: not a sale
                db.update_listing(t["listing_id"], status="dropped", ended_at=iso(when), end_kind="removed")
                db.observe(run_id, t["listing_id"], when, "removed", t["last_price"], {"check": state})

    db.commit()
    counts["budget_stopped"] = stopped_for_budget
    log.activity("brand-intel-run", brand=brand.key, run_id=run_id, **counts)
    return counts

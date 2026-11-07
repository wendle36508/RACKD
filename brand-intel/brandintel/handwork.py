"""Two jobs you do by hand, then feed back in:

1. import_sold_csv: sales you collected yourself (e.g. Mercari or Depop sold listings viewed
   as a normal shopper). Same columns as resale_sheet_calc.py:
       product, site, sold_price, sold_date, listed_date, retail_price, link
   "product" can be the product's id (ponto-jogger) or its name (Ponto Performance Jogger).
   A file with any Poshmark row is refused completely (Tanner's rule).

2. apply_review_csv: the "check by hand" list from a report, with your answer filled in
   (yes = it IS that product, no = it isn't). Only "yes" listings get counted.
"""
import csv
import hashlib
from datetime import datetime, timezone

from . import log
from .db import iso


def _date(s):
    s = (s or "").strip()
    if not s:
        return None
    return datetime.fromisoformat(s).replace(tzinfo=timezone.utc) if "T" not in s else datetime.fromisoformat(s)


def import_sold_csv(brand, db, path):
    by_key = {p.id.lower(): p for p in brand.products} | {p.name.lower(): p for p in brand.products}
    with open(path, newline="", encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))
    for r in rows:
        if "poshmark" in (r.get("site", "") + r.get("link", "")).lower():
            raise ValueError(f"Stopped: Poshmark row found ({r.get('product')}). Remove it, no Poshmark data allowed.")
    added, skipped = 0, []
    for i, r in enumerate(rows, start=2):
        p = by_key.get((r.get("product") or "").strip().lower())
        if not p:
            skipped.append(f"line {i}: unknown product '{r.get('product')}'")
            continue
        try:
            price = float(str(r["sold_price"]).replace("$", "").strip())
            sold = _date(r.get("sold_date"))
        except (ValueError, KeyError):
            skipped.append(f"line {i}: price or date not readable")
            continue
        if not sold:
            skipped.append(f"line {i}: no sold date (needed to place it in the 90 days)")
            continue
        link = (r.get("link") or "").strip()
        lid = "hand:" + hashlib.sha1(f"{link}|{p.id}|{price}|{sold}".encode()).hexdigest()[:16]
        if db.get(lid):
            continue
        listed = _date(r.get("listed_date"))
        db.insert_listing({
            "listing_id": lid, "source": (r.get("site") or "hand").strip().lower(), "url": link,
            "title": p.name + " (hand-collected)", "first_seen_at": iso(listed or sold), "last_seen_at": iso(sold),
            "first_price": price, "last_price": price, "status": "sold", "ended_at": iso(sold),
            "end_kind": "hand-collected", "product_id": p.id, "decision": "match-by-hand",
            "match_reason": "collected and checked by hand", "is_new": 0, "listed_at": iso(listed),
        })
        added += 1
    db.commit()
    log.activity("brand-intel-hand-import", brand=brand.key, added=added, skipped=len(skipped))
    return added, skipped


def apply_review_csv(db, path):
    yes = no = 0
    with open(path, newline="", encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            a = (r.get("your_answer") or "").strip().lower()
            if a in ("yes", "y"):
                db.update_listing(r["listing_id"], decision="match-by-hand")
                yes += 1
            elif a in ("no", "n"):
                db.update_listing(r["listing_id"], decision="no-by-hand")
                no += 1
    db.commit()
    log.activity("brand-intel-review", yes=yes, no=no)
    return yes, no

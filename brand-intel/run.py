"""RACKD brand intel: what a brand's hero products resell for, and how fast they sell.

Use (Windows, from the RACKD-app folder), or just double-click "brand-intel/Brand Intel.bat":
  py brand-intel/run.py track vuori            search every hero product once (costs Apify credit)
  py brand-intel/run.py track vuori --photos   same, plus the FashionCLIP photo check
  py brand-intel/run.py report vuori           make the Word sheet + Excel file from what's saved
  py brand-intel/run.py import vuori sold.csv  add sales you collected by hand
  py brand-intel/run.py review vuori file.csv  apply your yes/no answers from "check by hand"
  py brand-intel/run.py case-study             run the Vuori case study on made-up data (free)
  py brand-intel/run.py selftest               check the tool works (free, no internet)

Run "track" by hand about twice a week (there are no timers, on purpose). Each run is about
8 products x 40 listings = 320 Depop listings, about $1.30 at $4 per 1,000.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from brandintel import config, log, report, track  # noqa: E402
from brandintel.db import DB, utcnow  # noqa: E402


def main(argv):
    if not argv or argv[0] in ("-h", "--help", "help"):
        print(__doc__)
        return 0
    cmd, rest = argv[0], argv[1:]
    if cmd == "selftest":
        import unittest
        suite = unittest.defaultTestLoader.discover(str(Path(__file__).parent / "tests"))
        return 0 if unittest.TextTestRunner(verbosity=1).run(suite).wasSuccessful() else 1
    if cmd == "case-study":
        sys.path.insert(0, str(Path(__file__).parent / "case-study"))
        import vuori_case
        return vuori_case.main(rest)
    if not rest:
        print("Which brand? For example: py brand-intel/run.py " + cmd + " vuori")
        return 1
    brand = config.load(rest[0])
    db = DB(brand.key)
    try:
        if cmd == "track":
            from brandintel.sources import RackdSources
            photos = None
            if "--photos" in rest:
                from brandintel.clip import FashionClip, PhotoChecker
                photos = PhotoChecker(db, brand, FashionClip())
                if not photos.refs:
                    log.alert("Photo check is on but there are no reference photos",
                              f"Add photos to brand-intel/brands/{brand.key}/photos/ (see README.txt there).")
            counts = track.run(brand, db, RackdSources(), utcnow(), photos=photos)
            print(f"Done: {counts['searches']} searches, {counts['listings']} listings seen, {counts['new']} new "
                  f"({counts['matched_new']} matched a hero product), {counts['ended']} ended since last run, "
                  f"{counts['failed']} searches failed.")
            if counts["failed"]:
                log.alert(f"Brand intel: {counts['failed']} searches failed in this run", "See logs/ALERTS.txt above this line.")
            return 0 if not counts["budget_stopped"] else 2
        if cmd == "report":
            photo = bool(db.listings("image_sim IS NOT NULL LIMIT 1"))
            _, tk, files = report.build(brand, db, utcnow(), photo_check=photo)
            print("\n" + tk["headline"])
            for k, v in files.items():
                print(f"  {k}: {v}")
            log.activity("brand-intel-report", brand=brand.key, files=[str(v) for v in files.values()])
            return 0
        if cmd == "import":
            from brandintel.handwork import import_sold_csv
            added, skipped = import_sold_csv(brand, db, rest[1])
            print(f"Added {added} hand-collected sales." + (f" Skipped {len(skipped)}:" if skipped else ""))
            for s in skipped:
                print("  " + s)
            return 0
        if cmd == "review":
            from brandintel.handwork import apply_review_csv
            yes, no = apply_review_csv(db, rest[1])
            print(f"Saved your answers: {yes} yes (now counted), {no} no.")
            return 0
        print(f'Unknown command "{cmd}". Run without anything to see the list.')
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))

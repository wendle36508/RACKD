"""Self-test for brand intel. Free, no internet, no Apify. Run: py brand-intel/run.py selftest"""
import csv
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

TOOL = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(TOOL))
sys.path.insert(0, str(TOOL / "case-study"))

from brandintel import config, track  # noqa: E402
from brandintel.db import DB  # noqa: E402
from brandintel.handwork import apply_review_csv, import_sold_csv  # noqa: E402
from brandintel.match import decide  # noqa: E402
from brandintel.metrics import product_stats  # noqa: E402
from brandintel.sources import no_poshmark  # noqa: E402

import brandintel.paths as _P  # noqa: E402
_TMP = tempfile.mkdtemp(prefix="brandintel-test-")
_P.DATA = _P.LOGS = Path(_TMP)     # tests never write into your real logs or data

T0 = datetime(2026, 9, 1, 9, tzinfo=timezone.utc)

BRAND = {
    "brand": "Vuori", "aliases": ["vuori"], "sources": ["depop", "vinted"], "listings_per_search": 5,
    "min_sample": 3, "exclude_words": ["dupe", "lululemon", "bundle"],
    "products": [
        {"id": "ponto", "name": "Ponto Jogger", "retail_usd": 100, "search": "vuori ponto",
         "keywords_all": ["ponto"], "keywords_any": ["jogger", "pant"], "keywords_none": ["short"]},
        {"id": "kore", "name": "Kore Short", "retail_usd": 60, "search": "vuori kore",
         "keywords_all": ["kore"], "keywords_any": ["short"]},
    ],
}


def L(i, title="Vuori Ponto Jogger", source="depop", price=50, brand="Vuori"):
    return {"id": f"{source}:{i}", "source": source, "url": f"https://www.{source}.com/x/{i}", "title": title,
            "brand": brand, "price": price, "photoUrl": f"https://p/{i}.jpg", "status": "active"}


class Fake:
    def __init__(self):
        self.live = {}            # (source, query) -> list of listings
        self.sold = set()

    def can_check(self, source):
        return source == "vinted"

    def search(self, source, query, count):
        return self.live.get((source, query), [])[:count]

    def check(self, source, urls):
        return {u: ("sold" if u in self.sold else "missing") for u in urls}


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.brand = config.from_dict("t", BRAND)
        self.db = DB("t", path=Path(self.tmp.name) / "t.sqlite")

    def tearDown(self):
        self.db.close()
        self.tmp.cleanup()


class Matching(Base):
    def test_right_product(self):
        self.assertEqual(decide(L(1), self.brand)["product_id"], "ponto")
        self.assertEqual(decide(L(1, "Vuori Kore Shorts 7in"), self.brand)["product_id"], "kore")

    def test_traps(self):
        for title, brand in [("Lululemon jogger like vuori ponto", "lululemon"), ("Vuori Ponto dupe", "Other"),
                             ("Vuori Ponto Short", "Vuori"), ("Vuori bundle ponto jogger + kore short", "Vuori"),
                             ("Nike jogger", "Nike")]:
            self.assertEqual(decide(L(1, title, brand=brand), self.brand)["decision"], "no", title)

    def test_photo_decides(self):
        b = self.brand
        self.assertEqual(decide(L(1), b, {"ponto": 0.9, "kore": 0.1})["decision"], "match")
        self.assertEqual(decide(L(1), b, {"ponto": 0.5, "kore": 0.1})["decision"], "review")
        # No product name in the title but a near-perfect photo: ask a human, don't count it.
        self.assertEqual(decide(L(1, "Vuori joggers M"), b, {"ponto": 0.95, "kore": 0.1})["decision"], "review")


class Tracking(Base):
    def step(self, fake, when):
        return track.run(self.brand, self.db, fake, when)

    def test_depop_gone_after_two_complete_misses(self):
        f = Fake()
        f.live[("depop", "vuori ponto")] = [L(1)]
        self.step(f, T0)
        f.live[("depop", "vuori ponto")] = [L(1), L(2)]
        self.step(f, T0 + timedelta(days=3))
        f.live[("depop", "vuori ponto")] = [L(1)]
        self.step(f, T0 + timedelta(days=6))
        self.assertEqual(self.db.get("depop:2")["status"], "active")      # one miss isn't enough
        self.step(f, T0 + timedelta(days=9))
        r = self.db.get("depop:2")
        self.assertEqual(r["status"], "gone")
        self.assertEqual(r["is_new"], 1)
        self.assertEqual(r["ended_at"][:10], "2026-09-05")                 # halfway between day 3 and day 6

    def test_cut_off_search_never_counts_as_gone(self):
        f = Fake()
        f.live[("depop", "vuori ponto")] = [L(i) for i in range(5)]       # full: hit the limit of 5
        self.step(f, T0)
        f.live[("depop", "vuori ponto")] = [L(i) for i in range(10, 15)]
        for d in (3, 6, 9):
            self.step(f, T0 + timedelta(days=d))
        self.assertEqual(self.db.get("depop:0")["status"], "active")

    def test_comes_back_means_not_sold(self):
        f = Fake()
        f.live[("depop", "vuori ponto")] = [L(1)]
        self.step(f, T0)
        f.live[("depop", "vuori ponto")] = []
        self.step(f, T0 + timedelta(days=3))
        self.step(f, T0 + timedelta(days=6))
        self.assertEqual(self.db.get("depop:1")["status"], "gone")
        f.live[("depop", "vuori ponto")] = [L(1)]
        self.step(f, T0 + timedelta(days=9))
        self.assertEqual(self.db.get("depop:1")["status"], "active")

    def test_vinted_sold_is_confirmed_and_removed_is_not_a_sale(self):
        f = Fake()
        f.live[("vinted", "vuori ponto")] = [L(1, source="vinted"), L(2, source="vinted")]
        self.step(f, T0)
        f.live[("vinted", "vuori ponto")] = []
        f.sold = {"https://www.vinted.com/x/1"}
        self.step(f, T0 + timedelta(days=4))
        self.assertEqual(self.db.get("vinted:1")["end_kind"], "sold-confirmed")
        self.assertEqual(self.db.get("vinted:2")["end_kind"], "removed")

    def test_failed_search_decides_nothing(self):
        class Broken(Fake):
            def search(self, source, query, count):
                from brandintel.sources import SourceError
                raise SourceError("Apify said 500")
        f = Fake()
        f.live[("depop", "vuori ponto")] = [L(1)]
        self.step(f, T0)
        with tempfile.TemporaryDirectory() as d:
            import brandintel.paths as P
            old = P.LOGS, P.DATA
            P.LOGS = P.DATA = Path(d)
            try:
                counts = self.step(Broken(), T0 + timedelta(days=3))
            finally:
                P.LOGS, P.DATA = old
            self.assertTrue((Path(d) / "ALERTS.txt").exists())             # never fails silently
        self.assertEqual(counts["failed"], 4)
        self.assertEqual(self.db.get("depop:1")["missed_runs"], 0)


class Numbers(Base):
    def test_refuses_small_samples_and_computes_pct(self):
        f = Fake()
        f.live[("depop", "vuori ponto")] = [L(i, price=p) for i, p in enumerate([40, 50, 60])]
        f.live[("depop", "vuori kore")] = [L(9, "Vuori Kore Short", price=30)]
        self.run_all(f)
        stats = {s["product"].id: s for s in product_stats(self.brand, self.db, T0 + timedelta(days=20))}
        self.assertTrue(stats["ponto"]["enough"])
        self.assertEqual(stats["ponto"]["median_price"], 50)
        self.assertAlmostEqual(stats["ponto"]["pct_retail"], 0.5)
        self.assertFalse(stats["kore"]["enough"])
        self.assertIsNone(stats["kore"]["median_price"])

    def run_all(self, f):
        track.run(self.brand, self.db, f, T0)
        f.live = {}
        track.run(self.brand, self.db, f, T0 + timedelta(days=3))
        track.run(self.brand, self.db, f, T0 + timedelta(days=6))


class HandWork(Base):
    def write(self, rows):
        p = Path(self.tmp.name) / "sold.csv"
        with open(p, "w", newline="", encoding="utf-8") as fh:
            w = csv.writer(fh)
            w.writerow(["product", "site", "sold_price", "sold_date", "listed_date", "retail_price", "link"])
            w.writerows(rows)
        return p

    def test_import(self):
        p = self.write([["ponto", "mercari", "55", "2026-09-10", "2026-09-01", "100", "https://m/1"],
                        ["Ponto Jogger", "depop", "$45", "2026-09-12", "", "100", "https://d/2"],
                        ["nope", "depop", "45", "2026-09-12", "", "100", "https://d/3"]])
        added, skipped = import_sold_csv(self.brand, self.db, p)
        self.assertEqual((added, len(skipped)), (2, 1))

    def test_poshmark_refused(self):
        p = self.write([["ponto", "Poshmark", "55", "2026-09-10", "", "100", "https://poshmark.com/x"]])
        with self.assertRaises(ValueError):
            import_sold_csv(self.brand, self.db, p)
        self.assertEqual(len(no_poshmark([{"source": "depop", "url": "https://poshmark.com/l/1"}])), 0)
        with self.assertRaises(ValueError):
            config.from_dict("x", {**BRAND, "sources": ["poshmark"]})

    def test_review_answers(self):
        self.db.insert_listing({"listing_id": "depop:7", "decision": "review", "product_id": "ponto", "status": "active"})
        p = Path(self.tmp.name) / "r.csv"
        p.write_text("your_answer,listing_id\nyes,depop:7\n", encoding="utf-8")
        self.assertEqual(apply_review_csv(self.db, p), (1, 0))
        self.assertEqual(self.db.get("depop:7")["decision"], "match-by-hand")


class CaseStudy(unittest.TestCase):
    def test_vuori_case_study_passes(self):
        import vuori_case
        with tempfile.TemporaryDirectory() as d:
            self.assertEqual(vuori_case.main([d]), 0)


class RealBrandFile(unittest.TestCase):
    def test_vuori_file_loads(self):
        b = config.load("vuori")
        self.assertEqual(len(b.products), 8)
        self.assertNotIn("poshmark", " ".join(b.sources).lower())


if __name__ == "__main__":
    unittest.main()

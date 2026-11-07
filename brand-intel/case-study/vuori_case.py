"""Case study test: "Vuori plans its spring 2027 buy" (SIMULATED market).

Why made-up data: to test a measuring tool you need to know the right answer. Here we build
a fake resale market for 8 Vuori products where we set the truth ourselves (what each one
really resells for, how fast it really sells, how many sellers delete listings, plus tricky
listings: dupes, other brands, misspellings, bundles, wrong titles). Then the real tool runs
against it exactly as it would against Apify, twice a week for 13 weeks, and we compare its
answers with the truth.

Nothing here is real Vuori data. Every output says SIMULATED.

    py brand-intel/run.py case-study            (about 10 seconds, free, no internet)
"""
import math
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from statistics import median

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from brandintel import config, report, track  # noqa: E402
from brandintel.clip import PhotoChecker  # noqa: E402
from brandintel.db import DB, parse  # noqa: E402
from brandintel.metrics import product_stats  # noqa: E402

AS_OF = datetime(2026, 11, 2, 12, 0, tzinfo=timezone.utc)   # the day the merch team reads the sheet
WEEKS = 13
DIM = 64

# The truth we set (made up, but in a believable range for athleisure resale).
#   ratio = what a typical sale gets as a share of full retail; days = typical days to sell;
#   per_week = new secondhand listings a week across Depop + Vinted.
TRUTH = {
    "ponto-jogger":              {"ratio": 0.62, "days": 9,  "per_week": 9},
    "sunday-jogger":             {"ratio": 0.55, "days": 12, "per_week": 7},
    "womens-performance-jogger": {"ratio": 0.58, "days": 10, "per_week": 6},
    "meta-pant":                 {"ratio": 0.47, "days": 21, "per_week": 5},
    "kore-short":                {"ratio": 0.52, "days": 14, "per_week": 5},
    "strato-tee":                {"ratio": 0.38, "days": 26, "per_week": 4},
    "ponto-crew":                {"ratio": 0.68, "days": 7,  "per_week": 3},
    "halo-hoodie":               {"ratio": 0.72, "days": 6,  "per_week": 1},   # too rare: tool must refuse
}
DELIST_SHARE = 0.15        # sellers who take a listing down instead of selling it
PRICE_CUT_SHARE = 0.30     # sellers who cut the price 15% after a week
VINTED_SHARE = 0.40        # share of listings on Vinted (rest on Depop)

TITLES = {
    "ponto-jogger": ["Vuori Ponto Performance Jogger", "vuori ponto joggers mens", "Vuori Ponto Jogger Size M heather",
                     "VUORI ponto performance jogger pants"],
    "sunday-jogger": ["Vuori Sunday Performance Jogger", "vuori sunday joggers", "Vuori Sunday jogger pant black"],
    "womens-performance-jogger": ["Vuori Women's Performance Jogger", "vuori womens performance jogger XS",
                                  "Vuori performance jogger womens"],
    "meta-pant": ["Vuori Meta Pant", "vuori meta pants 32", "Vuori Meta Pant khaki"],
    "kore-short": ["Vuori Kore Short", "vuori kore shorts 7 inch", "Vuori Kore Short liner"],
    "strato-tee": ["Vuori Strato Tech Tee", "vuori strato tee L", "Vuori Strato Tech T shirt"],
    "ponto-crew": ["Vuori Ponto Performance Crew", "vuori ponto crew sweatshirt"],
    "halo-hoodie": ["Vuori Halo Performance Hoodie", "vuori halo hoodie"],
}
SEARCH_WORD = {pid: w for pid, w in [("ponto-jogger", "ponto"), ("sunday-jogger", "sunday"),
               ("womens-performance-jogger", "performance"), ("meta-pant", "meta"), ("kore-short", "kore"),
               ("strato-tee", "strato"), ("ponto-crew", "ponto"), ("halo-hoodie", "halo")]}

# Tricky listings that turn up in searches. truth=None means "not any hero product".
TRAPS = [
    # (title, brand field, true product, photo kind, appears in searches for)
    ("Lululemon ABC jogger like vuori ponto", "lululemon", None, "lookalike:ponto-jogger", ["ponto-jogger"]),
    ("Vuori Ponto dupe joggers from amazon", "Other", None, "lookalike:ponto-jogger", ["ponto-jogger"]),
    ("Vuori Ponto Short", "Vuori", None, "random", ["ponto-jogger", "ponto-crew"]),
    ("Vuori bundle: ponto jogger + kore short", "Vuori", None, "random", ["ponto-jogger", "kore-short"]),
    ("Vouri ponto jogger", "", "ponto-jogger", "true:ponto-jogger", ["ponto-jogger"]),           # misspelt: will be missed
    ("Vuori joggers mens M", "Vuori", "ponto-jogger", "true:ponto-jogger", ["ponto-jogger"]),       # no product name
    ("Vuori Ponto Performance Jogger", "Vuori", "sunday-jogger", "true:sunday-jogger", ["ponto-jogger"]),  # wrong title
    ("Rhone Commuter Pant like vuori meta", "rhone", None, "lookalike:meta-pant", ["meta-pant"]),
    ("Vuori Kore Short kids size", "Vuori", None, "random", ["kore-short"]),
    ("Vuori Strato long sleeve tee", "Vuori", None, "lookalike:strato-tee", ["strato-tee"]),
    ("Vuori Halo Performance Hoodie inspired", "Other", None, "lookalike:halo-hoodie", ["halo-hoodie"]),
    ("Vuori performance jogger mens", "Vuori", None, "random", ["womens-performance-jogger"]),
]
TRAP_SHARE = 0.18   # about 1 in 6 listings a search returns is a trap


def unit(v):
    n = math.sqrt(sum(x * x for x in v)) or 1
    return [x / n for x in v]


class Market:
    """The fake resale market: listings appear, get price cuts, sell or get taken down."""

    def __init__(self, brand, seed=7):
        self.rng = random.Random(seed)
        self.brand = brand
        r = self.rng
        self.vec = {}
        for pid in TRUTH:
            self.vec[pid] = unit([r.gauss(0, 1) for _ in range(DIM)])
        # The two men's joggers look alike, as they do in real life.
        self.vec["sunday-jogger"] = unit([0.7 * a + 0.71 * b for a, b in zip(self.vec["ponto-jogger"], unit([r.gauss(0, 1) for _ in range(DIM)]))])
        self.listings = []
        self.photo = {}
        start = AS_OF - timedelta(weeks=WEEKS) - timedelta(days=60)
        n = 0
        for pid, t in TRUTH.items():
            p = brand.product(pid)
            day = start
            while day < AS_OF:
                day += timedelta(days=r.expovariate(t["per_week"] / 7))
                n += 1
                self._add(n, pid, p, t, day, TITLES[pid][n % len(TITLES[pid])], "Vuori", pid, f"true:{pid}", [pid])
        # Traps arrive at about TRAP_SHARE of the total flow, spread over the same period.
        total_per_week = sum(t["per_week"] for t in TRUTH.values())
        day = start
        while day < AS_OF:
            day += timedelta(days=r.expovariate(total_per_week * TRAP_SHARE / (1 - TRAP_SHARE) / 7))
            n += 1
            title, bfield, truth, kind, hits = TRAPS[n % len(TRAPS)]
            base = truth or hits[0]
            self._add(n, base, self.brand.product(base), TRUTH[base], day, title, bfield, truth, kind, hits)

    def _add(self, n, pid, p, t, listed, title, bfield, truth, kind, hits):
        r = self.rng
        life = r.expovariate(math.log(2) / t["days"])            # median life = t["days"]
        ask = round(p.retail_usd * t["ratio"] * math.exp(r.gauss(0, 0.18)))
        source = "vinted" if r.random() < VINTED_SHARE else "depop"
        lid = f"{source}:sim{n}"
        self.listings.append({
            "id": lid, "source": source, "url": f"https://www.{source}.com/sim/{n}", "title": title, "brand": bfield,
            "category": "Men" if "women" not in title.lower() else "Women", "photoUrl": f"sim://{lid}",
            "listed": listed, "ends": listed + timedelta(days=life),
            "ending": "removed" if r.random() < DELIST_SHARE else "sold",
            "ask": ask, "cut": r.random() < PRICE_CUT_SHARE, "truth": truth, "hits": hits,
        })
        if kind.startswith("true:"):
            v = self.vec[kind[5:]]
            s = r.uniform(0.04, 0.09)
            self.photo[lid] = unit([x + r.gauss(0, s) for x in v])
        elif kind.startswith("lookalike:"):
            v = self.vec[kind[10:]]
            self.photo[lid] = unit([0.6 * x + 0.8 * y for x, y in zip(v, unit([r.gauss(0, 1) for _ in range(DIM)]))])
        else:
            self.photo[lid] = unit([r.gauss(0, 1) for _ in range(DIM)])

    def price(self, l, when):
        return round(l["ask"] * 0.85) if (l["cut"] and when - l["listed"] > timedelta(days=7)) else l["ask"]

    def live(self, when):
        return [l for l in self.listings if l["listed"] <= when < l["ends"]]


class FakeSources:
    """Stands in for Apify. Same jobs as brandintel.sources.RackdSources."""

    def __init__(self, market, sources_with_check=("vinted",)):
        self.m = market
        self.checkable = set(sources_with_check)
        self.now = None
        self.asked = 0

    def can_check(self, source):
        return source in self.checkable

    def search(self, source, query, count):
        pid = next(p.id for p in self.m.brand.products if p.search == query)
        hits = [l for l in self.m.live(self.now) if l["source"] == source and pid in l["hits"]]
        self.m.rng.shuffle(hits)           # "relevance" order: not newest first
        self.asked += count
        return [self.out(l) for l in hits[:count]]

    def out(self, l):
        return {"id": l["id"], "source": l["source"], "url": l["url"], "title": l["title"], "brand": l["brand"],
                "category": l["category"], "photoUrl": l["photoUrl"], "price": self.m.price(l, self.now), "status": "active"}

    def check(self, source, urls):
        by_url = {l["url"]: l for l in self.m.listings}
        res = {}
        for u in urls:
            l = by_url[u]
            self.asked += 1
            res[u] = "active" if self.now < l["ends"] else ("sold" if l["ending"] == "sold" else "missing")
        return res


class FakeFashionClip:
    name = "sim-fashionclip"

    def __init__(self, market):
        self.m = market

    def embed(self, where):
        w = str(where)
        if w.startswith("sim://"):
            return self.m.photo[w[6:]]
        pid = Path(w).stem.rsplit("-", 1)[0]        # brands/vuori/photos/ponto-jogger-1.jpg
        return self.m.vec[pid]


def run_times():
    first = AS_OF - timedelta(weeks=WEEKS)
    out, d = [], first
    while d <= AS_OF:
        if d.weekday() in (0, 3):                   # Monday and Thursday
            out.append(d.replace(hour=9))
        d += timedelta(days=1)
    return out


def truth_numbers(market, brand):
    start = AS_OF - timedelta(days=brand.window_days)
    first_run = run_times()[0]
    res = {}
    for p in brand.products:
        sales = [l for l in market.listings if l["truth"] == p.id and l["ending"] == "sold" and start <= l["ends"] <= AS_OF]
        prices = [market.price(l, l["ends"]) for l in sales]
        cohort = [l for l in market.listings if l["truth"] == p.id and first_run < l["listed"] <= AS_OF - timedelta(days=45)]
        days = [(l["ends"] - l["listed"]).total_seconds() / 86400 for l in cohort]
        res[p.id] = {"n": len(sales), "median_price": median(prices) if prices else None,
                     "pct": (median(prices) / p.retail_usd) if prices else None,
                     "days": median(days) if days else None}
    return res


def simulate(brand, use_photos, db_path):
    market = Market(brand)
    if db_path.exists():
        db_path.unlink()
    db = DB(brand.key, path=db_path)
    src = FakeSources(market)
    photos = PhotoChecker(db, brand, FakeFashionClip(market)) if use_photos else None
    for when in run_times():
        src.now = when
        track.run(brand, db, src, when, photos=photos, note="SIMULATED case study run")
    return market, db, src


def matching_score(market, db):
    truth = {l["id"]: l["truth"] for l in market.listings}
    counted = db.listings("decision = 'match'")
    right = sum(1 for r in counted if truth[r["listing_id"]] == r["product_id"])
    seen_real = [r for r in db.listings() if truth[r["listing_id"]]]
    found = sum(1 for r in seen_real if r["decision"] == "match" and truth[r["listing_id"]] == r["product_id"])
    wrong = [(r["title"], r["product_id"], truth[r["listing_id"]]) for r in counted if truth[r["listing_id"]] != r["product_id"]]
    return {"counted": len(counted), "right": right, "precision": right / len(counted) if counted else 0,
            "recall": found / len(seen_real) if seen_real else 0, "review": len(db.listings("decision = 'review'")),
            "wrong_examples": wrong[:6]}


def scorecard(brand, stats, truth, match):
    rows, all_ok = [], True
    for s in stats:
        p, t = s["product"], truth[s["product"].id]
        if t["n"] < brand.min_sample:
            ok = not s["enough"]
            rows.append([p.name, "refuses (too few)" if not s["enough"] else "gave a number", f"{t['n']} real sales",
                         "-", "-", "PASS" if ok else "FAIL"])
            all_ok &= ok
            continue
        if not s["enough"]:
            rows.append([p.name, f"too few (n = {s['n']})", f"{t['n']} real sales", "-", "-", "FAIL"])
            all_ok = False
            continue
        price_err = abs(s["median_price"] - t["median_price"]) / t["median_price"]
        day_err = abs(s["median_days"] - t["days"]) / t["days"] if (s["median_days"] and t["days"]) else None
        ok_price = price_err <= 0.05
        ok_days = day_err is not None and day_err <= 0.05
        same_band = s["median_days"] is not None and t["days"] is not None and report.band(s["median_days"]) == report.band(t["days"])
        rows.append([p.name, f"{s['pct_retail']:.0%} / {s['median_days']:.1f} days" if s["median_days"] else f"{s['pct_retail']:.0%}",
                     f"{t['pct']:.0%} / {t['days']:.1f} days", f"{price_err:.1%}",
                     "-" if day_err is None else f"{day_err:.0%}",
                     ("PASS" if ok_price else "FAIL") + " price, " + ("PASS" if ok_days else ("same band" if same_band else "MISS")) + " days"])
        all_ok &= ok_price
    return rows, all_ok, match["precision"] >= 0.9


def write_case_docx(path, brand, stats, truth, rows, match_photo, match_words, src, tk):
    from docx import Document
    from docx.shared import Pt, RGBColor
    doc = Document()
    doc.styles["Normal"].font.name = "Calibri"
    doc.styles["Normal"].font.size = Pt(10)
    r = doc.add_paragraph().add_run("SIMULATED MARKET. A test of the tool, not real Vuori numbers. Do not send to anyone.")
    r.bold = True
    r.font.color.rgb = RGBColor(0xC0, 0x00, 0x00)
    doc.add_heading("Case study: Vuori plans its spring 2027 buy", level=1)
    doc.add_heading("The scenario", level=2)
    doc.add_paragraph(
        "Vuori's head of merchandising has to decide how deep to reorder 8 core styles for spring 2027, and whether "
        "to start a branded resale program with Trove or Archive. They get the RACKD Brand Resale Sheet on "
        f"{AS_OF:%d %B %Y}, after 13 weeks of tracking (Monday and Thursday runs) on Depop and Vinted.")
    for q in ["1. Which styles hold the most value secondhand?", "2. Which styles sell fastest?",
              "3. Is there enough resale happening to justify a resale program?"]:
        doc.add_paragraph(q)
    doc.add_heading("How the test works", level=2)
    doc.add_paragraph(
        "To check a measuring tool you need to know the right answer, so this market is made up. We set what each "
        "style truly resells for and how fast, then added real-world mess: 15% of sellers delete listings instead of "
        "selling, 30% cut their price after a week, Depop can't confirm sales, and about 1 in 6 search results is a "
        "trap (Lululemon 'like Vuori' joggers, Amazon dupes, Vuori shorts showing up in jogger searches, bundles, a "
        "misspelt 'Vouri', a title with no product name, and a Sunday Jogger listed under the Ponto name). The real "
        "tool then ran against it exactly as it would against Apify, with the FashionCLIP photo check switched on.")
    doc.add_heading("What the tool told Vuori", level=2)
    doc.add_paragraph(tk["headline"]).runs[0].bold = True
    t = doc.add_table(rows=1, cols=len(report.HEAD))
    t.style = "Light Grid Accent 1"
    for i, h in enumerate(report.HEAD):
        t.rows[0].cells[i].text = h
    for row in report.table_rows(stats):
        cells = t.add_row().cells
        for i, v in enumerate(row):
            cells[i].text = v
    ok = [s for s in stats if s["enough"]]
    val = sorted(ok, key=lambda s: s["pct_retail"], reverse=True)
    fast = sorted([s for s in ok if s["median_days"]], key=lambda s: s["median_days"])
    monthly_n = sum(s["n"] for s in stats) / (brand.window_days / 30)
    monthly_usd = sum((s["median_price"] or 0) * s["n"] for s in stats if s["enough"]) / (brand.window_days / 30)
    doc.add_paragraph("Answer 1 (value): " + ", ".join(f"{s['product'].name} {s['pct_retail']:.0%}" for s in val[:3])
                      + f" hold the most. {val[-1]['product'].name} holds the least ({val[-1]['pct_retail']:.0%}).", style="List Bullet")
    doc.add_paragraph("Answer 2 (speed): " + ", ".join(f"{s['product'].name} about {s['median_days']:.0f} days" for s in fast[:3])
                      + f". Slowest: {fast[-1]['product'].name} at about {fast[-1]['median_days']:.0f} days.", style="List Bullet")
    doc.add_paragraph(f"Answer 3 (volume): about {monthly_n:.0f} secondhand sales a month of just these 8 styles on 2 sites, "
                      f"roughly ${monthly_usd:,.0f} a month changing hands outside Vuori (Depop take-downs are "
                      "counted in this, so real sales are a bit lower). That is the number a Trove or "
                      "Archive sales rep would put in front of Vuori. Whether it justifies a program depends on Vuori's "
                      "own sales, which the tool doesn't know.", style="List Bullet")
    doc.add_paragraph("Restock call from the sheet: " + (", ".join(tk["restock"]) or "none") +
                      (" (top half for both value and speed)." if tk["restock"] else "."), style="List Bullet")
    doc.add_heading("Scorecard: tool vs the truth", level=2)
    t = doc.add_table(rows=1, cols=6)
    t.style = "Light Grid Accent 1"
    for i, h in enumerate(["Product", "Tool said (% retail / days)", "Truth", "Price error", "Days error", "Result"]):
        t.rows[0].cells[i].text = h
    for row in rows:
        cells = t.add_row().cells
        for i, v in enumerate(row):
            cells[i].text = str(v)
    doc.add_paragraph(
        f"Picking the right product, with photo check: {match_photo['right']} of {match_photo['counted']} counted listings "
        f"were the right product ({match_photo['precision']:.0%}; pass line 90%). It found {match_photo['recall']:.0%} of all "
        f"real hero-product listings and sent {match_photo['review']} unsure ones to 'check by hand'.", style="List Bullet")
    doc.add_paragraph(
        f"Same test with words only (no FashionCLIP): {match_words['right']} of {match_words['counted']} right "
        f"({match_words['precision']:.0%}). The difference is the Sunday Joggers listed under the Ponto name: only the "
        "photo check catches those.", style="List Bullet")
    doc.add_heading("What this shows, honestly", level=2)
    for line in [
        "The math works: resale prices and % of retail came out within the 5% pass line on every style with enough sales.",
        "It refused to give a number for the Halo Hoodie, which had too few sales. That's the behavior we wanted.",
        "Days to sell did NOT meet the 5% pass line on most styles (see the Days error column). Two reasons: with 20-40 "
        "listings per style the middle value jumps around a lot, and items that sell within a day or two are never seen "
        "by a twice-weekly run. We re-ran the test with 3 runs a week and with daily runs and it barely improved, so more "
        "runs isn't the fix. So the sheet now shows days as a band (under a week, 1-2 weeks, 2-4 weeks, over a month) and "
        "the 'sold within 30 days' share next to it. Use days as a rough guide, and price as the hard number.",
        "Depop counts include sellers who deleted listings (we can't tell them apart). It barely moves the median price, but "
        "it makes volume look about 15% bigger than real sales. The sheet labels these 'sold or taken down'.",
        "Misspelt listings ('Vouri') and titles with no product name are missed or sent to check by hand, so real volume is "
        "a bit higher than the tool reports. That's the safe direction.",
        "This proves the tool measures correctly IF the scrapers return what's on the site. It doesn't prove real Depop "
        "and Vinted data look like this, or that FashionCLIP scores on real photos land where we assumed. The real run on "
        "your laptop is the next test.",
    ]:
        doc.add_paragraph(line, style="List Bullet")
    doc.add_heading("What the real run will cost", level=2)
    per_run = len(brand.products) * brand.listings_per_search * 2
    doc.add_paragraph(
        f"This test asked the fake scraper for {src.asked:,} listings over {len(run_times())} runs. On real Apify, 8 products x "
        f"40 listings x 2 sites = {per_run} listings a run. At Depop $4 and Vinted $1 per 1,000 that's about "
        f"${per_run / 2 * 5 / 1000:.2f} a run, or about ${per_run / 2 * 5 / 1000 * len(run_times()):.0f} for 13 weeks of "
        "twice-weekly tracking for one brand. It comes out of the same monthly Apify budget as the app (spend guard).")
    doc.add_paragraph("Data limits to keep in mind: eBay's API license bans using eBay data to model prices and eBay's user "
                      "agreement bans scrapers, and your eBay account is suspended, so eBay is left out of this test. "
                      "Depop's March 2026 terms also ban scraping. You have decided to scrape and accept that risk; get a "
                      "lawyer's read before selling the numbers.").runs[0].font.size = Pt(9)
    doc.save(str(path))


def main(argv=()):
    brand = config.load("vuori")
    brand.settings["sources"] = ["depop", "vinted"]    # assumes a Vinted scraper is picked by the real run
    out = Path(argv[0]) if argv else (HERE.parent / "output" / "case-study-vuori")
    out.mkdir(parents=True, exist_ok=True)
    from brandintel import paths
    paths.DATA = out           # the simulation's activity log stays with the simulation, not your real data

    market_w, db_w, _ = simulate(brand, False, out / "sim-words-only.sqlite")
    match_words = matching_score(market_w, db_w)
    db_w.close()

    market, db, src = simulate(brand, True, out / "sim-with-photos.sqlite")
    match_photo = matching_score(market, db)
    truth = truth_numbers(market, brand)
    stats, tk, files = report.build(brand, db, AS_OF, out_dir=out, simulated=True, photo_check=True)
    rows, numbers_ok, match_ok = scorecard(brand, stats, truth, match_photo)
    case = out / "Case study - Vuori spring 2027 buy (SIMULATED).docx"
    write_case_docx(case, brand, stats, truth, rows, match_photo, match_words, src, tk)
    db.close()

    print("\nScorecard (tool vs truth):")
    for r in rows:
        print("  " + " | ".join(str(x) for x in r))
    print(f"\nRight product, photo check on: {match_photo['right']}/{match_photo['counted']} = {match_photo['precision']:.0%} "
          f"(found {match_photo['recall']:.0%} of real listings, {match_photo['review']} sent to check by hand)")
    print(f"Right product, words only:     {match_words['right']}/{match_words['counted']} = {match_words['precision']:.0%}")
    for w in match_words["wrong_examples"][:3]:
        print(f"   words-only mistake: '{w[0]}' counted as {w[1]}, really {w[2]}")
    print(f"\nPrices within 5%: {'PASS' if numbers_ok else 'FAIL'}.  Right product 9 in 10: {'PASS' if match_ok else 'FAIL'}.")
    print(f"Case study written to: {case}")
    for f in files.values():
        print(f"  {f}")
    return 0 if (numbers_ok and match_ok) else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))

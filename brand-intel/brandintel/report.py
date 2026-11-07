"""Makes the outputs for a brand:
  - <brand> resale sheet <date>.docx   the one-page Brand Resale Sheet (Word)
  - <brand> resale data <date>.xlsx    every number plus the raw data behind it (Excel)
  - check by hand <date>.csv           unsure matches: write yes/no in your_answer, then
                                       run "review" so the yes ones are counted
and prints the table on screen.
"""
import csv
from datetime import datetime

from . import paths
from .metrics import product_stats, takeaways

DISCLAIMER = ("Not affiliated with or endorsed by {brand}. Resale prices are last asking prices of listings "
              "that sold or ended; sites don't show accepted offers. No Poshmark data used.")


def money(x):
    return "-" if x is None else f"${x:,.0f}"


def pct(x):
    return "-" if x is None else f"{x:.0%}"


def band(x):
    if x < 7:
        return "under a week"
    if x < 14:
        return "1-2 weeks"
    if x < 30:
        return "2-4 weeks"
    return "over a month"


def days(x):
    """Days to sell is a rough number (see metrics.py), so it's shown with a band."""
    return "not visible" if x is None else f"about {x:.0f} ({band(x)})"


def table_rows(stats):
    rows = []
    for s in stats:
        p = s["product"]
        if not s["enough"]:
            rows.append([p.name, f"too few sales (n = {s['n']})", money(p.retail_usd), "-", "-", "-",
                         str(s["n"]), "-", ", ".join(s["sites"]) or "-"])
            continue
        dr = f"{s['first_end']:%d %b} to {s['last_end']:%d %b %Y}"
        rows.append([p.name, money(s["median_price"]), money(p.retail_usd), pct(s["pct_retail"]),
                     days(s["median_days"]), pct(s["sell_through_30d"]), str(s["n"]), dr, ", ".join(s["sites"])])
    return rows


HEAD = ["Product", "Median resale price", "Full retail", "% of retail held", "Typical days to sell",
        "Sold within 30 days", "Sample size", "Date range", "Sites"]


def print_table(brand, stats):
    print(f"\n{brand.name}: what your products resell for")
    print(" | ".join(HEAD))
    for r in table_rows(stats):
        print(" | ".join(r))


def build(brand, db, as_of, out_dir=None, simulated=False, photo_check=False):
    stamp = f"{as_of:%Y-%m-%d}"
    out_dir = out_dir or (paths.OUTPUT / f"{brand.key}-{stamp}")
    out_dir.mkdir(parents=True, exist_ok=True)
    stats = product_stats(brand, db, as_of)
    tk = takeaways(brand, stats)
    print_table(brand, stats)
    files = {
        "sheet": write_docx(brand, stats, tk, as_of, out_dir / f"{brand.name} resale sheet {stamp}.docx", simulated, photo_check),
        "data": write_xlsx(brand, db, stats, as_of, out_dir / f"{brand.name} resale data {stamp}.xlsx", simulated, photo_check),
        "review": write_review_csv(brand, db, out_dir / f"check by hand {stamp}.csv"),
    }
    return stats, tk, files


def method_text(brand, as_of, photo_check):
    match = ("listings matched to products by title words and FashionCLIP photo matching"
             if photo_check else "listings matched to products by title words only (photo check was off)")
    return (f"Method: {match}; unsure matches were left out unless checked by hand. Last {brand.window_days} days "
            f"to {as_of:%d %b %Y}. Sites: {', '.join(brand.sources)}. Depop can't confirm sales, so a Depop listing "
            f"that disappears is counted as sold or taken down. Products with fewer than {brand.min_sample} "
            f"sales get no median. Days to sell is a rough guide (shown with a band); the % of retail is the "
            f"firm number.")


def write_docx(brand, stats, tk, as_of, path, simulated, photo_check):
    from docx import Document
    from docx.shared import Pt, RGBColor
    doc = Document()
    st = doc.styles["Normal"]
    st.font.name = "Calibri"
    st.font.size = Pt(10)
    if simulated:
        w = doc.add_paragraph()
        r = w.add_run("SIMULATED DATA FOR A CASE STUDY TEST. These are not real Vuori numbers. Do not send.")
        r.bold = True
        r.font.color.rgb = RGBColor(0xC0, 0x00, 0x00)
    doc.add_heading(f"{brand.name}: what your products resell for", level=1)
    doc.add_paragraph(tk["headline"]).runs[0].bold = True
    t = doc.add_table(rows=1, cols=len(HEAD))
    t.style = "Light Grid Accent 1"
    for i, h in enumerate(HEAD):
        t.rows[0].cells[i].text = h
    for row in table_rows(stats):
        cells = t.add_row().cells
        for i, v in enumerate(row):
            cells[i].text = v
    doc.add_heading("What this means", level=2)
    doc.add_paragraph("Restock: " + (", ".join(tk["restock"]) + " hold the most value and sell fastest."
                                      if tk["restock"] else "no product is in the top half for both value and speed yet."),
                      style="List Bullet")
    if tk["price_high"]:
        doc.add_paragraph("Price: " + ", ".join(tk["price_high"]) + " resell at or above full retail, "
                          "so new may be priced too low or made in too few numbers.", style="List Bullet")
    if tk["price_low"]:
        doc.add_paragraph("Watch: " + ", ".join(tk["price_low"]) + " keep under 30% of retail secondhand "
                          "(weak demand or too many made).", style="List Bullet")
    if tk["thin"]:
        doc.add_paragraph("Not enough sales yet: " + ", ".join(tk["thin"]) + ". No number is given for these.",
                          style="List Bullet")
    doc.add_paragraph(method_text(brand, as_of, photo_check)).runs[0].font.size = Pt(8)
    doc.add_paragraph(DISCLAIMER.format(brand=brand.name)).runs[0].font.size = Pt(8)
    doc.add_paragraph("Contact: Tanner Wendle, Babson College, twendle1@babson.edu").runs[0].font.size = Pt(8)
    doc.save(str(path))
    return path


def write_xlsx(brand, db, stats, as_of, path, simulated, photo_check):
    from openpyxl import Workbook
    from openpyxl.styles import Font
    wb = Workbook()
    ws = wb.active
    ws.title = "Summary"
    if simulated:
        ws.append(["SIMULATED DATA FOR A CASE STUDY TEST - not real numbers"])
        ws["A1"].font = Font(bold=True, color="C00000")
    ws.append(HEAD + ["Live now", "Median asking now", "Confirmed sales", "Sold or taken down (Depop)",
                      "Listings with days known", "Waiting for you to check"])
    for s, row in zip(stats, table_rows(stats)):
        ws.append(row + [s["live_now"], money(s["live_median_ask"]), s["n_confirmed"], s["n_estimated"],
                         s["n_days"], s["to_review"]])
    ws.append([])
    ws.append([method_text(brand, as_of, photo_check)])

    cols = ["listing_id", "source", "product_id", "decision", "match_reason", "image_sim", "status", "end_kind",
            "title", "first_price", "last_price", "first_seen_at", "last_seen_at", "ended_at", "listed_at",
            "is_new", "size", "condition", "url"]
    for title, where in [("Ended listings", "status IN ('sold','gone')"),
                         ("Live now", "status = 'active'"),
                         ("Check by hand", "decision = 'review'"),
                         ("Not counted", "decision IN ('no','no-by-hand')"),
                         ("All listings", "1=1")]:
        sh = wb.create_sheet(title)
        sh.append(cols)
        for r in db.listings(where + " ORDER BY product_id, first_seen_at"):
            sh.append([r[c] for c in cols])
    sh = wb.create_sheet("Every sighting")
    sh.append(["run_id", "listing_id", "seen_at", "status", "price"])
    for r in db.observations():
        sh.append([r["run_id"], r["listing_id"], r["seen_at"], r["status"], r["price"]])
    sh = wb.create_sheet("Runs")
    sh.append(["run_id", "started_at", "note"])
    for r in db.runs():
        sh.append([r["run_id"], r["started_at"], r["note"]])
    for sheet in wb.worksheets:
        for c in sheet[1 if not (simulated and sheet.title == "Summary") else 2]:
            c.font = Font(bold=True)
    wb.save(str(path))
    return path


def write_review_csv(brand, db, path):
    rows = db.listings("decision = 'review' ORDER BY product_id")
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["your_answer", "listing_id", "product_id", "why_unsure", "title", "price", "url"])
        for r in rows:
            w.writerow(["", r["listing_id"], r["product_id"], r["match_reason"], r["title"], r["last_price"], r["url"]])
    return path


def now_utc():
    from datetime import timezone
    return datetime.now(timezone.utc)

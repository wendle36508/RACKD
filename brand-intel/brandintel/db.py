"""The brand-intel database: one SQLite file per brand in brand-intel/data/.

It keeps the raw, timestamped record of everything seen, so any number in a report can be
traced back to the listings behind it:

  runs          one row per time you ran "track"
  searches      every search made in a run (site, words, how many asked, how many came back)
  listings      one row per listing ever seen, with its current state
  observations  one row every time a listing was seen, with the price that day
  embeddings    FashionCLIP fingerprints of photos, so photos aren't looked at twice

This tool keeps its own data, separate from the swipe app's 3-data/store.js, because it is a
different product with different records (prices over time, not swipe cards).
Only listing facts are kept: no seller usernames or ids.
"""
import json
import sqlite3
from datetime import datetime, timezone

from . import paths

SCHEMA = """
CREATE TABLE IF NOT EXISTS runs (
  run_id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL,
  note TEXT
);
CREATE TABLE IF NOT EXISTS searches (
  run_id INTEGER, product_id TEXT, source TEXT, query TEXT,
  asked INTEGER, returned INTEGER, ok INTEGER, error TEXT
);
CREATE TABLE IF NOT EXISTS listings (
  listing_id TEXT PRIMARY KEY,
  source TEXT, url TEXT, title TEXT, brand_field TEXT, category TEXT, size TEXT,
  condition TEXT, photo_url TEXT,
  first_seen_at TEXT, last_seen_at TEXT, first_price REAL, last_price REAL,
  status TEXT,              -- active | sold | gone | dropped
  ended_at TEXT,            -- when it sold or disappeared (estimated, see track.py)
  end_kind TEXT,            -- sold-confirmed | gone-estimated | hand-collected
  first_missed_at TEXT, missed_runs INTEGER DEFAULT 0,
  product_id TEXT,          -- which hero product it matched (null if none)
  decision TEXT,            -- match | review | no | match-by-hand | no-by-hand
  match_reason TEXT, image_sim REAL,
  is_new INTEGER DEFAULT 0, -- 1 if it appeared after tracking started (so days-to-sell is fair)
  listed_at TEXT            -- only known for hand-collected rows
);
CREATE TABLE IF NOT EXISTS observations (
  run_id INTEGER, listing_id TEXT, seen_at TEXT, status TEXT, price REAL, raw TEXT
);
CREATE TABLE IF NOT EXISTS embeddings (key TEXT PRIMARY KEY, model TEXT, vec TEXT);
"""


def utcnow():
    return datetime.now(timezone.utc).replace(microsecond=0)


def iso(dt):
    return dt.isoformat() if dt else None


def parse(s):
    if not s:
        return None
    d = datetime.fromisoformat(s)
    return d if d.tzinfo else d.replace(tzinfo=timezone.utc)


class DB:
    def __init__(self, brand_key, path=None):
        if path is None:
            paths.DATA.mkdir(parents=True, exist_ok=True)
            path = paths.DATA / f"{brand_key}.sqlite"
        self.path = path
        self.con = sqlite3.connect(str(path))
        self.con.row_factory = sqlite3.Row
        self.con.executescript(SCHEMA)

    def close(self):
        self.con.commit()
        self.con.close()

    # ---- runs and searches ----
    def new_run(self, when, note=""):
        cur = self.con.execute("INSERT INTO runs (started_at, note) VALUES (?, ?)", (iso(when), note))
        return cur.lastrowid

    def runs(self):
        return self.con.execute("SELECT * FROM runs ORDER BY run_id").fetchall()

    def add_search(self, run_id, product_id, source, query, asked, returned, ok, error=None):
        self.con.execute("INSERT INTO searches VALUES (?,?,?,?,?,?,?,?)",
                         (run_id, product_id, source, query, asked, returned, int(ok), error))

    def first_search_at(self, product_id, source):
        r = self.con.execute(
            "SELECT MIN(r.started_at) FROM searches s JOIN runs r ON r.run_id = s.run_id "
            "WHERE s.product_id = ? AND s.source = ? AND s.ok = 1", (product_id, source)).fetchone()
        return parse(r[0]) if r and r[0] else None

    # ---- listings ----
    def get(self, listing_id):
        return self.con.execute("SELECT * FROM listings WHERE listing_id = ?", (listing_id,)).fetchone()

    def insert_listing(self, row):
        cols = ",".join(row)
        self.con.execute(f"INSERT INTO listings ({cols}) VALUES ({','.join('?' * len(row))})", list(row.values()))

    def update_listing(self, listing_id, **changes):
        sets = ",".join(f"{k} = ?" for k in changes)
        self.con.execute(f"UPDATE listings SET {sets} WHERE listing_id = ?", [*changes.values(), listing_id])

    def listings(self, where="1=1", args=()):
        return self.con.execute(f"SELECT * FROM listings WHERE {where}", args).fetchall()

    def observe(self, run_id, listing_id, when, status, price, raw):
        self.con.execute("INSERT INTO observations VALUES (?,?,?,?,?,?)",
                         (run_id, listing_id, iso(when), status, price, json.dumps(raw, default=str)))

    def observations(self):
        return self.con.execute("SELECT * FROM observations ORDER BY seen_at").fetchall()

    # ---- photo fingerprints ----
    def get_vec(self, key, model):
        r = self.con.execute("SELECT vec FROM embeddings WHERE key = ? AND model = ?", (key, model)).fetchone()
        return json.loads(r[0]) if r else None

    def put_vec(self, key, model, vec):
        self.con.execute("INSERT OR REPLACE INTO embeddings VALUES (?,?,?)", (key, model, json.dumps([round(x, 5) for x in vec])))

    def commit(self):
        self.con.commit()

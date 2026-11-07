"""Reads a brand's settings file, e.g. brands/vuori.json. See brands/README.txt."""
import json
from dataclasses import dataclass, field
from pathlib import Path

from . import paths

DEFAULTS = {
    "sources": ["depop"],
    "listings_per_search": 40,
    "window_days": 90,
    "min_sample": 20,
    "exclude_words": [],
    "image_ok": 0.80,       # photo looks like the product: accept
    "image_reject": 0.65,   # photo clearly isn't it: send to "check by hand"
    "image_strong": 0.88,   # title doesn't say it, but the photo is a near-perfect match: check by hand
}


@dataclass
class Product:
    id: str
    name: str
    retail_usd: float
    search: str
    keywords_all: list = field(default_factory=list)
    keywords_any: list = field(default_factory=list)
    keywords_none: list = field(default_factory=list)
    photos: list = field(default_factory=list)
    description: str = ""
    retail_checked: str = ""


@dataclass
class Brand:
    key: str
    name: str
    aliases: list
    products: list
    settings: dict

    def __getattr__(self, item):
        s = self.__dict__.get("settings", {})
        if item in s:
            return s[item]
        raise AttributeError(item)

    def product(self, pid):
        return next((p for p in self.products if p.id == pid), None)


def from_dict(key, d):
    settings = {**DEFAULTS, **{k: v for k, v in d.items() if k in DEFAULTS}}
    for s in settings["sources"]:
        if "poshmark" in s.lower():
            raise ValueError("Poshmark is not allowed as a source (Tanner's rule).")
    prods = []
    for p in d["products"]:
        known = Product.__dataclass_fields__.keys()
        prods.append(Product(**{k: v for k, v in p.items() if k in known}))
    ids = [p.id for p in prods]
    if len(ids) != len(set(ids)):
        raise ValueError("Two products share the same id in the brand file.")
    return Brand(key=key, name=d["brand"], aliases=[a.lower() for a in d.get("aliases", [d["brand"]])],
                 products=prods, settings=settings)


def load(key_or_path):
    p = Path(key_or_path)
    if not p.suffix:
        p = paths.BRANDS / f"{key_or_path}.json"
    if not p.exists():
        raise FileNotFoundError(f"No brand file at {p}. Copy brands/vuori.json and edit it.")
    with open(p, encoding="utf-8") as f:
        return from_dict(p.stem, json.load(f))

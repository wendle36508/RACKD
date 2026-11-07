"""Decides which hero product (if any) a listing is.

Two checks, in plain words:
  1. Words: is it the right brand, does the title name the product, and does it avoid
     words that mean it's something else ("dupe", "bundle", "shorts" for a jogger)?
  2. Photo (FashionCLIP, when switched on): does the listing photo look like the product's
     reference photos? Score from 0 to 1.

Outcomes: "match" (counted), "review" (unsure: listed in "Check by hand", NOT counted until
you say yes), or "no" (ignored, but still saved in the raw data).
"""
import math
import re

WORD = re.compile(r"[a-z0-9]+")


def words(text):
    return WORD.findall((text or "").lower().replace("'", ""))


def has(tokens, phrase):
    """True if every word of `phrase` is in `tokens` (a plural 's' is fine)."""
    want = words(phrase)
    toks = set(tokens) | {t[:-1] for t in tokens if t.endswith("s")}
    return all(w in toks or w + "s" in toks for w in want)


def listing_text(l):
    return " ".join(str(l.get(k) or "") for k in ("title", "brand", "category"))


def brand_ok(l, brand):
    toks = words(listing_text(l))
    return any(has(toks, a) for a in brand.aliases)


def words_check(l, product, brand):
    """Returns (ok, reason) for the words check alone."""
    toks = words(listing_text(l))
    if not brand_ok(l, brand):
        return False, "not the brand"
    for w in brand.exclude_words:
        if has(toks, w):
            return False, f'has "{w}"'
    for w in product.keywords_none:
        if has(toks, w):
            return False, f'has "{w}" (a different product)'
    missing = [w for w in product.keywords_all if not has(toks, w)]
    if missing:
        return False, "title doesn't say " + ", ".join(f'"{m}"' for m in missing)
    if product.keywords_any and not any(has(toks, w) for w in product.keywords_any):
        return False, "title doesn't say what kind of item"
    return True, "words fit"


def cosine(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a)) or 1.0
    nb = math.sqrt(sum(y * y for y in b)) or 1.0
    return dot / (na * nb)


def decide(l, brand, photo_sims=None):
    """Picks the best hero product for listing `l`.

    photo_sims: {product_id: similarity 0-1} from FashionCLIP, or None if photos aren't used.
    Returns dict(product_id, decision, reason, image_sim).
    """
    if not brand_ok(l, brand):
        return {"product_id": None, "decision": "no", "reason": "not the brand", "image_sim": None}
    candidates = []
    for p in brand.products:
        ok, why = words_check(l, p, brand)
        sim = photo_sims.get(p.id) if photo_sims else None
        if ok:
            if sim is None:
                candidates.append((2, 0.0, p.id, "match", "words fit (no photo check)", sim))
            elif sim >= brand.image_ok:
                candidates.append((3, sim, p.id, "match", f"words fit, photo looks right ({sim:.2f})", sim))
            elif sim < brand.image_reject:
                candidates.append((1, sim, p.id, "review", f"words fit but photo doesn't look like it ({sim:.2f})", sim))
            else:
                candidates.append((1, sim, p.id, "review", f"words fit, photo unsure ({sim:.2f})", sim))
        elif sim is not None and sim >= brand.image_strong and "has" not in why:
            candidates.append((1, sim, p.id, "review", f"photo looks right ({sim:.2f}) but {why}", sim))
    if not candidates:
        return {"product_id": None, "decision": "no", "reason": "no hero product fits", "image_sim": None}
    candidates.sort(key=lambda c: (c[0], c[1]), reverse=True)
    best = candidates[0]
    # Two different products fit equally well (e.g. a title that names both): ask a human.
    if len(candidates) > 1 and candidates[1][0] == best[0] == 2:
        return {"product_id": best[2], "decision": "review",
                "reason": "title fits two products: " + ", ".join(c[2] for c in candidates[:2]), "image_sim": None}
    return {"product_id": best[2], "decision": best[3], "reason": best[4], "image_sim": best[5]}

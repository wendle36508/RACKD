"""FashionCLIP photo check (optional).

FashionCLIP is a free AI trained on fashion photos. It turns a photo into 512 numbers (a
"fingerprint"); photos of the same product get similar fingerprints. We compare each
listing photo to the hero product's reference photos (brands/<brand>/photos/...).

It's the same model the swipe app uses (patrickjohncyh/fashion-clip). Install it once with:
    py -m pip install -r brand-intel/requirements-ai.txt     (about 1 GB, first run downloads the model)
Without it, the tool still works on words alone and says so in every report.
Photos are read into memory only. Nothing is saved or re-posted.
"""
import io
from pathlib import Path

from . import paths

MODEL = "patrickjohncyh/fashion-clip"


class FashionClip:
    name = MODEL

    def __init__(self):
        try:
            import torch  # noqa: F401
            from transformers import CLIPModel, CLIPProcessor
        except ImportError as e:
            raise RuntimeError("The photo AI isn't installed. Run: py -m pip install -r brand-intel/requirements-ai.txt") from e
        import torch
        self.torch = torch
        cache = paths.TOOL / "model-cache"
        self.model = CLIPModel.from_pretrained(MODEL, cache_dir=str(cache)).eval()
        self.proc = CLIPProcessor.from_pretrained(MODEL, cache_dir=str(cache))

    def _image(self, where):
        from PIL import Image
        if str(where).startswith("http"):
            import requests
            r = requests.get(where, timeout=20, headers={"User-Agent": "RACKD brand-intel"})
            r.raise_for_status()
            return Image.open(io.BytesIO(r.content)).convert("RGB")
        p = Path(where)
        if not p.is_absolute():
            p = paths.TOOL / p
        return Image.open(p).convert("RGB")

    def embed(self, where):
        img = self._image(where)
        with self.torch.no_grad():
            v = self.model.get_image_features(**self.proc(images=img, return_tensors="pt"))[0]
        v = v / v.norm()
        return v.tolist()


class PhotoChecker:
    """Caches fingerprints in the brand database and gives {product_id: similarity}."""

    def __init__(self, db, brand, embedder):
        self.db, self.brand, self.e = db, brand, embedder
        self.refs = {}
        for p in brand.products:
            vecs = [v for v in (self.vec(ph) for ph in p.photos) if v]
            if vecs:
                self.refs[p.id] = vecs

    def vec(self, where):
        if not where:
            return None
        v = self.db.get_vec(where, self.e.name)
        if v is None:
            try:
                v = self.e.embed(where)
            except Exception as ex:  # a broken photo link shouldn't stop a run
                print(f"  photo skipped ({ex.__class__.__name__}): {str(where)[:80]}")
                return None
            self.db.put_vec(where, self.e.name, v)
        return v

    def sims(self, listing):
        if not self.refs:
            return None
        v = self.vec(listing.get("photoUrl"))
        if v is None:
            return None
        from .match import cosine
        return {pid: max(cosine(v, r) for r in refs) for pid, refs in self.refs.items()}

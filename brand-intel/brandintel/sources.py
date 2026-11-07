"""Gets listings by calling RACKD's existing scrapers (floor 1) through bridge/rackd-sources.mjs.

That keeps one spend guard for all of RACKD: every Apify run made by this tool is counted in
the same monthly budget as the swipe app, and stops when the budget is reached.
"""
import json
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

from . import paths

CAN_CHECK = {"vinted", "ebay"}   # sites whose scraper can re-check single listings (Depop's can't)


class BudgetReached(Exception):
    pass


class SourceError(Exception):
    pass


def find_node():
    for c in (os.environ.get("NODE"), shutil.which("node"),
              str(paths.ROOT / "toolbox" / "windows" / "node" / "node.exe")):
        if c and Path(c).exists():
            return c
    raise SourceError("Node.js isn't installed. Run RACKD.bat once (it sets up Node), then try again.")


def no_poshmark(listings):
    out = []
    for l in listings:
        blob = f"{l.get('source', '')} {l.get('url', '')}".lower()
        if "poshmark" in blob:
            continue  # never keep Poshmark data (Tanner's rule)
        out.append(l)
    return out


class RackdSources:
    """The real thing: runs the Node bridge, which runs the Apify scrapers."""

    def __init__(self):
        self.node = find_node()

    def can_check(self, source):
        return source in CAN_CHECK

    def _run(self, args):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "out.json"
            extra = []
            if args[0] == "check":
                urls_file = Path(tmp) / "urls.json"
                urls_file.write_text(json.dumps(args[2]), encoding="utf-8")
                extra = [str(urls_file)]
                args = args[:2]
            cmd = [self.node, str(paths.BRIDGE), *[str(a) for a in args], *extra, str(out)]
            p = subprocess.run(cmd, cwd=str(paths.ROOT), capture_output=True, text=True, encoding="utf-8")
            if p.stdout.strip():
                print(p.stdout.strip())       # the spend guard's own lines ("$0.16 for ...")
            if p.returncode == 2:
                raise BudgetReached(p.stderr.strip())
            if p.returncode != 0:
                raise SourceError(p.stderr.strip() or f"bridge stopped with code {p.returncode}")
            return json.loads(out.read_text(encoding="utf-8"))

    def search(self, source, query, count):
        return no_poshmark(self._run(["search", source, query, count]))

    def check(self, source, urls):
        return self._run(["check", source, list(urls)])

"""Where things live. Everything is a normal Windows-friendly path built with pathlib."""
from pathlib import Path

TOOL = Path(__file__).resolve().parent.parent          # brand-intel/
ROOT = TOOL.parent                                      # the RACKD repo
BRANDS = TOOL / "brands"
DATA = TOOL / "data"                                    # the database (not uploaded to GitHub)
OUTPUT = TOOL / "output"                                # spreadsheets and Word sheets
LOGS = ROOT / "logs"                                    # shared with the rest of RACKD
BRIDGE = TOOL / "bridge" / "rackd-sources.mjs"

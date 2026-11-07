"""Safety rails, same idea as toolbox/alerts.js: nothing happens, or fails, silently.

activity() writes one line per event to brand-intel/data/activity.jsonl.
alert() is for things Tanner must know: printed, and added to logs/ALERTS.txt
(the same file the rest of RACKD uses).
"""
import json
from datetime import datetime, timezone

from . import paths


def _now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def activity(kind, **details):
    try:
        paths.DATA.mkdir(parents=True, exist_ok=True)
        with open(paths.DATA / "activity.jsonl", "a", encoding="utf-8") as f:
            f.write(json.dumps({"at": _now(), "type": kind, **details}) + "\n")
    except OSError as e:
        print("Could not write the activity log: " + str(e))


def alert(subject, text=""):
    print("ALERT: " + subject + (("\n    " + text) if text else ""))
    try:
        paths.LOGS.mkdir(parents=True, exist_ok=True)
        with open(paths.LOGS / "ALERTS.txt", "a", encoding="utf-8") as f:
            f.write(f"{_now()}  brand-intel: {subject}" + (f"\n    {text}" if text else "") + "\n")
    except OSError:
        pass
    activity("alert", subject=subject, text=text)


def say(line):
    print(line)

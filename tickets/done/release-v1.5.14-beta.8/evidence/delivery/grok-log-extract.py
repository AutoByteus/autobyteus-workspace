#!/usr/bin/env python3
"""autobyteus-621: Grok's own log (~/.grok/logs/unified.jsonl) from a byte offset, per process, timing and model-catalog
fields only: no auth, token, key or path field is read into the output (autobyteus-551 QR-003).
usage: python3 -I grok-log-extract.py <byte offset> [log path]"""
import json, os, re, sys
offset = int(sys.argv[1]); path = sys.argv[2] if len(sys.argv) > 2 else os.path.expanduser("~/.grok/logs/unified.jsonl")
MSG = re.compile(r"^(startup phase|startup timing|model catalog|fetch|notifying clients|agent initialized)")
KEYS = ("phase", "name", "elapsed_ms", "had_real_catalog", "model_count")
with open(path, "rb") as f:
    f.seek(offset); data = f.read()
by_pid = {}
for line in data.splitlines():
    try: row = json.loads(line)
    except Exception: continue
    msg = str(row.get("msg") or "")
    if not MSG.match(msg): continue
    ctx = row.get("ctx") if isinstance(row.get("ctx"), dict) else {}
    by_pid.setdefault(row.get("pid"), []).append({"ts": row.get("ts"), "msg": msg[:80], **{k: ctx[k] for k in KEYS if k in ctx}})
for pid, rows in by_pid.items():
    phases = [r for r in rows if r["msg"] == "startup phase"]
    catalog = [r for r in rows if r["msg"].startswith("model catalog") or r["msg"].startswith(("fetch", "notifying"))]
    total = max([r.get("elapsed_ms", 0) for r in rows if isinstance(r.get("elapsed_ms"), (int, float))] or [0])
    print(json.dumps({"pid": pid, "first_ts": rows[0]["ts"], "max_startup_elapsed_ms": total,
        "phases": [{k: r.get(k) for k in ("phase", "elapsed_ms")} for r in phases], "catalog": catalog}))

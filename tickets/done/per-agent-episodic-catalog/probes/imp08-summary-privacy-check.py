"""IMP-08 (autobyteus-493): no run-history summary (the user's first message) appears in any file under episodic/.

Usage: python3 -I imp08-summary-privacy-check.py <memory folder copy after the AC-010 probe>
Prints counts only, never a summary.
"""
import glob
import json
import os
import sys

mem = sys.argv[1]
summaries = set()
for name in ("run_history_index.json", "team_run_history_index.json", "agent_org_run_history_index.json"):
    try:
        data = json.load(open(os.path.join(mem, name)))
    except Exception:
        continue
    rows = data.get("rows", data) if isinstance(data, dict) else data
    for row in rows if isinstance(rows, list) else []:
        summary = row.get("summary") if isinstance(row, dict) else None
        if isinstance(summary, str) and len(summary.strip()) >= 25:
            summaries.add(summary.strip()[:80])
text = "".join(open(f, encoding="utf-8").read() for f in glob.glob(os.path.join(mem, "episodic", "**", "*.md"), recursive=True))
print(f"summaries checked (>= 25 chars, first 80 chars each): {len(summaries)}")
print(f"episodic text bytes: {len(text.encode())}")
print(f"summaries found in episodic files: {sum(1 for s in summaries if s in text)}")

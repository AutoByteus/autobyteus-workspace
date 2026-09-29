#!/usr/bin/env python3
"""Append one ledger event row before the Re-entry section. Usage: ledger.py CASE EVENT CMD EXPECTED OBSERVED RESULT EVIDENCE NEXT"""
import sys, datetime, pathlib
p = pathlib.Path(__file__).resolve().parents[2] / "api-e2e-test-case-ledger.md"
text = p.read_text()
rows = [l for l in text.splitlines() if l.startswith("| ") and l.split("|")[1].strip().isdigit()]
seq = len(rows) + 1
case, event, cmd, exp, obs, res, ev, nxt = (a.replace("|", "\\|").replace("\n", " ") for a in sys.argv[1:9])
ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
row = f"| {seq} | {case} | {ts} | {event} | {cmd} | {exp} | {obs} | {res} | {ev} | {nxt} |"
marker = "\n## Re-entry And Reconciliation"
head, tail = text.split(marker, 1)
head = head.rstrip("\n") + "\n" + row + "\n"
p.write_text(head + marker + tail)
print(row)

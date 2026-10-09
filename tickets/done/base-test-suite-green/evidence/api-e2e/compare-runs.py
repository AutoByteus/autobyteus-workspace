#!/usr/bin/env python3
"""API/E2E V-14: compares per-test outcomes of vitest JSON reports.

Usage: compare-runs.py <base.json> <head.json> [<head2.json> ...]
- prints totals of each report;
- base-passing tests that are not passing in head (regressions);
- skipped-set differences (new skips / skips that now run);
- identity differences (titles only in base / only in head), with digits normalized;
- per-test outcome differences between head reports (flake check).
"""
import json, re, sys

def load(path):
    d = json.load(open(path))
    out = {}
    for f in d["testResults"]:
        rel = f["name"].split("autobyteus-server-ts/")[-1]
        if not f["assertionResults"] and f["status"] == "failed":
            out[(rel, "<suite-error>")] = "failed"
        for a in f["assertionResults"]:
            key = (rel, re.sub(r"\d{6,}", "<n>", a["fullName"]))
            out[key] = a["status"]
    tot = f"total={d['numTotalTests']} passed={d['numPassedTests']} failed={d['numFailedTests']} skipped={d['numPendingTests']} suites_failed={d['numFailedTestSuites']}"
    return out, tot

base, btot = load(sys.argv[1])
print("BASE", sys.argv[1].split("/")[-1], btot)
heads = []
for p in sys.argv[2:]:
    h, t = load(p)
    heads.append((p.split("/")[-1], h))
    print("HEAD", p.split("/")[-1], t)

name, head = heads[0]
print(f"\n== comparisons against {name} ==")
reg = [k for k, s in base.items() if s == "passed" and head.get(k) not in (None, "passed")]
print("base-passed now not passed:", len(reg))
for k in reg: print("   ", head.get(k), k)
bskip = {k for k, s in base.items() if s in ("pending", "skipped", "todo")}
hskip = {k for k, s in head.items() if s in ("pending", "skipped", "todo")}
print("new skips (skipped in head, not skipped in base):", len(hskip - bskip))
for k in sorted(hskip - bskip): print("   ", base.get(k), "->", head[k], k)
print("skips in base that now run:", len(bskip - hskip))
for k in sorted(bskip - hskip): print("   ", base[k], "->", head.get(k), k)
only_b = sorted(set(base) - set(head)); only_h = sorted(set(head) - set(base))
print("identities only in base:", len(only_b))
for k in only_b: print("   ", base[k], k)
print("identities only in head:", len(only_h))
for k in only_h: print("   ", head[k], k)
print("head failures:")
for k, s in head.items():
    if s == "failed": print("   ", k)
for other_name, other in heads[1:]:
    diff = [k for k in set(head) | set(other) if head.get(k) != other.get(k)]
    print(f"\n== outcome differences {name} vs {other_name}: {len(diff)} ==")
    for k in sorted(diff): print("   ", head.get(k), "vs", other.get(k), k)

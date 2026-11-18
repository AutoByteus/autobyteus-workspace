"""Scan AutoByteus raw traces (read-only) for browser tool calls and outcomes.

Usage: python3 -I scan.py <memory_root>
Prints per-tool outcome counts, error-text counts, per-month screenshot outcome,
and the context of each screenshot outcome (prior emulation on the tab, full_page).
"""
import collections
import datetime
import json
import os
import sys

BROWSER = {"open_tab", "screenshot", "set_device_emulation", "run_script", "navigate_to",
           "read_page", "dom_snapshot", "close_tab", "list_tabs", "reload_tab"}

root = sys.argv[1]
outcome = collections.Counter()
errors = collections.Counter()
by_month = collections.Counter()
ctx = collections.Counter()
team_kind = collections.Counter()
first_last = {}
examples = collections.defaultdict(list)
per_file = []

for dirpath, _, files in os.walk(root):
    for fn in files:
        if not (fn.startswith("raw_traces") and fn.endswith(".jsonl")):
            continue
        path = os.path.join(dirpath, fn)
        calls = {}
        emulated_tabs = set()
        ok_shots = 0
        bad_shots = 0
        try:
            fh = open(path, encoding="utf-8")
        except OSError:
            continue
        with fh:
            for line in fh:
                if '"tool_name"' not in line:
                    continue
                try:
                    d = json.loads(line)
                except ValueError:
                    continue
                tn = d.get("tool_name")
                if tn not in BROWSER:
                    continue
                if d.get("trace_type") == "tool_call":
                    calls[d.get("tool_call_id")] = d.get("tool_args") or {}
                    continue
                if d.get("trace_type") != "tool_result":
                    continue
                args = calls.get(d.get("tool_call_id"), {})
                ok = d.get("source_event") == "TOOL_EXECUTION_SUCCEEDED" or (
                    d.get("tool_error") in (None, "") and d.get("tool_result") is not None)
                outcome[(tn, "ok" if ok else "fail")] += 1
                month = datetime.datetime.fromtimestamp(d.get("ts", 0)).strftime("%Y-%m")
                if not ok:
                    err = str(d.get("tool_error"))[:160]
                    errors[(tn, err)] += 1
                    key = (tn, err)
                    if len(examples[key]) < 3:
                        examples[key].append(path)
                if tn == "set_device_emulation" and ok:
                    res = d.get("tool_result") or {}
                    tab = res.get("tab_id") if isinstance(res, dict) else None
                    mode = res.get("mode") if isinstance(res, dict) else None
                    if tab:
                        (emulated_tabs.add if mode == "mobile" else emulated_tabs.discard)(tab)
                if tn == "screenshot":
                    by_month[(month, "ok" if ok else "fail")] += 1
                    tab = args.get("tab_id")
                    c = ("mobile_emulated" if tab in emulated_tabs else "desktop",
                         "full_page" if args.get("full_page") else "viewport",
                         "ok" if ok else "fail")
                    ctx[c] += 1
                    if ok:
                        ok_shots += 1
                    else:
                        bad_shots += 1
        if ok_shots or bad_shots:
            per_file.append((path.replace(root, ""), ok_shots, bad_shots))

print("== outcomes per tool")
for k, v in sorted(outcome.items()):
    print(k, v)
print("\n== error texts (top 40)")
for (tn, err), v in errors.most_common(40):
    print(v, tn, err)
print("\n== screenshot by month")
for k, v in sorted(by_month.items()):
    print(k, v)
print("\n== screenshot context (emulation on tab, full_page, outcome)")
for k, v in sorted(ctx.items()):
    print(k, v)
print("\n== files with screenshot failures (ok, fail)")
for p, o, b in sorted(per_file, key=lambda x: -x[2]):
    if b:
        print(o, b, p)

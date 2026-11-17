"""For each AutoByteus screenshot failure, show the tab's history around it.

Usage: python3 -I scan2.py <memory_root> <error_substring>
Per failing call: file, time, seconds since the tab's open_tab, earlier/later
screenshot outcomes on the same tab, and the browser ops between them.
"""
import collections
import json
import os
import sys

root, needle = sys.argv[1], sys.argv[2]
BROWSER = {"open_tab", "screenshot", "set_device_emulation", "run_script", "navigate_to",
           "read_page", "dom_snapshot", "close_tab", "list_tabs"}
summary = collections.Counter()

for dirpath, _, files in os.walk(root):
    for fn in files:
        if not (fn.startswith("raw_traces") and fn.endswith(".jsonl")):
            continue
        path = os.path.join(dirpath, fn)
        calls = {}
        events = []  # (ts, tool, tab, ok, err, args)
        with open(path, encoding="utf-8", errors="replace") as fh:
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
                    calls[d.get("tool_call_id")] = (d.get("tool_args") or {}, d.get("ts"))
                    continue
                if d.get("trace_type") != "tool_result":
                    continue
                args, start = calls.get(d.get("tool_call_id"), ({}, d.get("ts")))
                ok = d.get("source_event") == "TOOL_EXECUTION_SUCCEEDED"
                res = d.get("tool_result")
                tab = args.get("tab_id")
                if tn == "open_tab" and isinstance(res, dict):
                    tab = res.get("tab_id")
                events.append((start or 0, d.get("ts") or 0, tn, tab, ok, str(d.get("tool_error") or ""), args, res))
        if not any(e[2] == "screenshot" and needle in e[5] for e in events):
            continue
        opened = {}
        print("\n#", path.replace(root, ""))
        for i, (start, end, tn, tab, ok, err, args, res) in enumerate(events):
            if tn == "open_tab" and ok:
                opened[tab] = end
            mark = "OK " if ok else "ERR"
            since = f"{start - opened[tab]:7.1f}s" if tab in opened else "   n/a  "
            extra = ""
            if tn == "screenshot":
                extra = f"full_page={args.get('full_page')}"
            elif tn == "set_device_emulation":
                extra = f"mode={args.get('mode')} {args.get('width')}x{args.get('height')}"
            elif tn in ("open_tab", "navigate_to"):
                extra = str(args.get("url"))[:70]
            print(f"  {mark} {tn:20} tab={tab} since_open={since} dur={end-start:5.2f}s {extra} {err[:90] if not ok else ''}")
            if tn == "screenshot" and not ok and needle in err:
                prev = [e for e in events[:i] if e[3] == tab and e[2] == "screenshot"]
                nxt = [e for e in events[i + 1:] if e[3] == tab and e[2] == "screenshot"]
                summary[("prev_ok" if prev and prev[-1][4] else "prev_fail" if prev else "first_shot",
                         "next_ok" if nxt and nxt[0][4] else "next_fail" if nxt else "no_next")] += 1

print("\n== summary (screenshot before on same tab, screenshot after on same tab)")
for k, v in sorted(summary.items()):
    print(k, v)

"""Durations of AutoByteus screenshot calls (read-only). Usage: python3 -I durations.py <memory_root>"""
import collections, json, os, sys
root = sys.argv[1]; b = collections.Counter(); slow = []
for dp, _, fs in os.walk(root):
    for fn in fs:
        if not (fn.startswith("raw_traces") and fn.endswith(".jsonl")): continue
        start = {}
        for line in open(os.path.join(dp, fn), encoding="utf-8", errors="replace"):
            if '"tool_name":"screenshot"' not in line: continue
            d = json.loads(line)
            if d.get("trace_type") == "tool_call": start[d.get("tool_call_id")] = d.get("ts"); continue
            if d.get("trace_type") != "tool_result" or d.get("tool_call_id") not in start: continue
            dur = (d.get("ts") or 0) - (start[d.get("tool_call_id")] or 0)
            ok = d.get("source_event") == "TOOL_EXECUTION_SUCCEEDED"
            k = "<1s" if dur < 1 else "1-5s" if dur < 5 else "5-30s" if dur < 30 else ">=30s"
            b[(k, "ok" if ok else "fail")] += 1
            if dur >= 30: slow.append((round(dur), ok, str(d.get("tool_error"))[:80], dp.replace(root, "")[:90]))
for k, v in sorted(b.items()): print(k, v)
for s in slow[:20]: print(s)

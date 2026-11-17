"""For AutoByteus browser tabs: outcome of the first screenshot after open_tab and
after each navigate_to (read-only). Usage: python3 -I first-shot.py <memory_root>"""
import collections, json, os, sys
root = sys.argv[1]
t = collections.Counter()
for dp, _, fs in os.walk(root):
    for fn in fs:
        if not (fn.startswith("raw_traces") and fn.endswith(".jsonl")):
            continue
        calls = {}; last = {}
        for line in open(os.path.join(dp, fn), encoding="utf-8", errors="replace"):
            if '"tool_name"' not in line: continue
            d = json.loads(line); tn = d.get("tool_name")
            if tn not in ("open_tab", "navigate_to", "screenshot", "set_device_emulation"): continue
            if d.get("trace_type") == "tool_call":
                calls[d.get("tool_call_id")] = d.get("tool_args") or {}; continue
            if d.get("trace_type") != "tool_result": continue
            ok = d.get("source_event") == "TOOL_EXECUTION_SUCCEEDED"
            args = calls.get(d.get("tool_call_id"), {})
            res = d.get("tool_result") if isinstance(d.get("tool_result"), dict) else {}
            tab = res.get("tab_id") if tn == "open_tab" else args.get("tab_id")
            if tn in ("open_tab", "navigate_to", "set_device_emulation") and ok:
                last[tab] = tn if tn != "set_device_emulation" or last.get(tab) in (None, "shot") else last[tab] + "+emulation"
            elif tn == "screenshot":
                err = str(d.get("tool_error") or "")
                c = "ok" if ok else "UnknownVizError" if "UnknownViz" in err else "surface-not-available" if "surface not available" in err else "no-image-bytes" if "no image bytes" in err else "other"
                t[(last.get(tab, "?"), c)] += 1
                last[tab] = "shot"
for k, v in sorted(t.items()): print(f"{v:6} after={k[0]:28} {k[1]}")

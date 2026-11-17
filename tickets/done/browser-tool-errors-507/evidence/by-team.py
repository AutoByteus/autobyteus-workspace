"""Tally AutoByteus screenshot outcomes per team kind and error class (read-only).
Usage: python3 -I by-team.py <memory_root>"""
import collections, json, os, re, sys
root = sys.argv[1]
t = collections.Counter()
for dp, _, fs in os.walk(root):
    for fn in fs:
        if not (fn.startswith("raw_traces") and fn.endswith(".jsonl")):
            continue
        rel = dp.replace(root, "")
        m = re.search(r"/(product_team|software_engineering_team|team_software-engineering-team|article_writing_team|marketing_team|computer_use|agents/[a-z_]+?)(?:_[0-9a-f]{8,}|_)", rel)
        kind = m.group(1) if m else rel.split("/")[1]
        if "computer_use_operator" in rel: kind = "computer_use_operator"
        with open(os.path.join(dp, fn), encoding="utf-8", errors="replace") as fh:
            for line in fh:
                if '"tool_name":"screenshot"' not in line or '"tool_result"' not in line:
                    continue
                d = json.loads(line)
                if d.get("trace_type") != "tool_result":
                    continue
                err = str(d.get("tool_error") or "")
                if d.get("source_event") == "TOOL_EXECUTION_SUCCEEDED": c = "ok"
                elif "UnknownVizError" in err: c = "UnknownVizError"
                elif "display surface not available" in err: c = "surface-not-available"
                elif "no image bytes" in err: c = "no-image-bytes"
                elif "Page.screenshot" in err or "Target crashed" in err: c = "old-playwright-tool"
                else: c = "other:" + err[:50]
                t[(kind, c)] += 1
for k, v in sorted(t.items()):
    print(f"{v:6} {k[0]:35} {k[1]}")

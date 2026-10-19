#!/usr/bin/env python3
"""Per kept LE-A1 run: the helper's first reply (by which selector), unprompted delegator sends after the report, and echo loops (helper or delegator sends > 3)."""
import json, glob, os, re, sys
def load(f): return [json.loads(l) for l in open(f)]
def args(x):
    a = x.get("tool_args")
    if isinstance(a, dict): return a
    try: return json.loads(a)
    except Exception: return {"raw": str(a)}
rows = []
for d in sorted(glob.glob("traces/*-run*"), key=lambda p: (p.split("/")[1].rsplit("-run", 1)[0], int(p.rsplit("run", 1)[1]))):
    lab = os.path.basename(d)
    fs = glob.glob(d + "/**/raw_traces_active.jsonl", recursive=True)
    pm = next((f for f in fs if "/collaboration/" not in f and "aic_pm" in f), None)
    hp = next((f for f in fs if "/collaboration/" in f and "aic_helper" in f), None)
    pmid = re.search(r"(aic_pm_[0-9a-f]{6}_[0-9a-f]{32})", pm).group(1) if pm else None
    if not hp: rows.append((lab, "no helper trace", "", 0, 0)); continue
    h = load(hp)
    sends = [x for x in h if x.get("trace_type") == "tool_call" and x.get("tool_name") == "send_message_to"]
    first = args(sends[0]) if sends else None
    how = "none (no send)" if not first else ("by run ID" if "target_agent_run_id" in first and "recipient_address" not in first else ("address+ID" if "recipient_address" in first and "target_agent_run_id" in first else "address"))
    reply_to_name = False
    pm_uns = 0
    if pm:
        trig = None
        for x in load(pm):
            if x.get("trace_type") == "user": trig = x["content"]
            elif x.get("trace_type") == "tool_call" and trig and trig.startswith("You received a message"): pm_uns += 1
    rows.append((lab, how, "", len(sends), pm_uns))
print(f"{'run':24s} {'helper first reply':16s} helperSends pmUnpromptedSends")
for lab, how, _, hs, pu in rows: print(f"{lab:24s} {how:16s} {hs:11d} {pu:3d}" + ("   <-- LOOP" if hs > 3 or pu > 3 else ""))

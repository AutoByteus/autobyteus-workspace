#!/usr/bin/env python3
"""LE-A1 on LM Studio (native AutoByteus): per kept run, did the helper report by the delegator's ID, and did the PM's local model act on its own
(tool calls made in a turn that was started by a received message, not by one of the test's "Call the … tool" prompts)?"""
import json, glob, os, re
def lines(f): return [json.loads(l) for l in open(f)]
rows = []
for d in sorted(glob.glob("traces/*-lmstudio-run*"), key=lambda p: (p.split("/")[1].split("-")[0], int(re.search(r"run(\d+)", p).group(1)))):
    label = os.path.basename(d)
    pm = [f for f in glob.glob(d + "/**/raw_traces_active.jsonl", recursive=True) if "/collaboration/" not in f and "aic_pm" in f]
    helper = [f for f in glob.glob(d + "/**/raw_traces_active.jsonl", recursive=True) if "/collaboration/" in f and "aic_helper" in f]
    pmid = re.search(r"(aic_pm_[0-9a-f]{6}_[0-9a-f]{32})", pm[0]).group(1) if pm else None
    helper_by_id = False
    for f in helper:
        for x in lines(f):
            if x.get("trace_type") == "tool_result" and x.get("tool_name") == "send_message_to" and pmid and pmid in str(x.get("tool_result")) and "DELIVERED" in str(x.get("tool_result")): helper_by_id = True
    unsolicited = []
    if pm:
        trigger = None
        for x in lines(pm[0]):
            if x.get("trace_type") == "user": trigger = x["content"]
            elif x.get("trace_type") == "tool_call" and trigger and trigger.startswith("You received a message"):
                unsolicited.append(f"{x.get('tool_name')} {str(x.get('tool_args'))[:70]}")
    rows.append((label, helper_by_id, unsolicited))
for label, by_id, uns in rows:
    print(f"{label:28s} helperReportedById={by_id!s:5s} pmUnsolicitedCalls={len(uns)} {uns[:2]}")

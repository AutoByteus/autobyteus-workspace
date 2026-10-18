#!/usr/bin/env python3
"""Summarizes the task-agent (helper) traces kept by the LE-A1 batches: how it answered its task message and whether any call went to the delegator's name."""
import json, glob, os, re, sys
rows = []
for d in sorted(glob.glob("traces/*")):
    label = os.path.basename(d)
    helper_files = [f for f in glob.glob(d + "/**/raw_traces_active.jsonl", recursive=True) if "/collaboration/" in f and re.search(r"aic_helper", f)]
    if not helper_files:
        rows.append((label, "no helper trace (run did not reach a delegation)")); continue
    for f in helper_files:
        lines = [json.loads(l) for l in open(f)]
        task = next((l["content"] for l in lines if l.get("trace_type") == "user"), "")
        deleg = re.search(r"\(ID: ([^)]+)\)", task) or re.search(r'target_agent_run_id "([^"]+)"', task)
        name = re.search(r"from (?:the agent named \")?([a-z0-9_]+)", task)
        sends = [(l.get("tool_args"), l.get("tool_call_id")) for l in lines if l.get("trace_type") == "tool_call" and l.get("tool_name") == "send_message_to"]
        results = {l.get("tool_call_id"): (l.get("source_event"), str(l.get("tool_error") if l.get("tool_error") not in (None, "None") else l.get("tool_result"))[:110]) for l in lines if l.get("trace_type") == "tool_result" and l.get("tool_name") == "send_message_to"}
        nm = name.group(1) if name else ""
        out = []
        reply_to_name = False
        for args, cid in sends:
            a = args if isinstance(args, dict) else (json.loads(args.replace("'", '"')) if isinstance(args, str) and args.startswith("{") and "'" not in args[:3] else {})
            if isinstance(args, str):
                try: a = json.loads(args)
                except Exception:
                    a = {"raw": args}
            if (a.get("recipient_address") and a["recipient_address"].lstrip("/") == nm) or a.get("target_agent_run_id") == nm: reply_to_name = True
            out.append((list(a.keys()), results.get(cid, ("?", ""))[0]))
        rows.append((label, f"task msg starts: {task[:70]!r} | sends: {out} | replyToName={reply_to_name}"))
for r in rows: print(r[0], "|", r[1])

#!/usr/bin/env python3
"""Re-derives each journey sample from the kept task-agent trace: first send selector, whether a DELIVERED result names the delegator, and any send addressed to a name/address."""
import json, glob, os, re, collections
def args(x):
    a = x.get("tool_args")
    if isinstance(a, dict): return a
    try: return json.loads(a)
    except Exception: return {}
out = collections.OrderedDict()
for f in sorted(glob.glob("traces/journeys/*-task-agent.jsonl"), key=lambda p: (re.sub(r"-sample\d+.*","",os.path.basename(p)), int(re.search(r"sample(\d+)", p).group(1)))):
    base = os.path.basename(f); key = re.sub(r"-sample\d+-task-agent.jsonl", "", base)
    lines = [json.loads(l) for l in open(f)]
    task = next((l["content"] for l in lines if l.get("trace_type") == "user"), "")
    m = re.search(r'sender run ID "([^"]+)"', task) or re.search(r"AgentRun ID: (\S+)", task)
    delegator = m.group(1) if m else None
    calls = {l.get("tool_call_id"): l for l in lines if l.get("trace_type") == "tool_call" and l.get("tool_name") == "send_message_to"}
    delivered = False; first = None; address_used = False; name_used = False; sends = 0
    for l in lines:
        if l.get("trace_type") == "tool_call" and l.get("tool_name") == "send_message_to":
            a = args(l); sends += 1
            if first is None: first = "run ID" if ("target_agent_run_id" in a and "recipient_address" not in a) else ("address+runID" if "recipient_address" in a and "target_agent_run_id" in a else "address")
            if a.get("recipient_address"): address_used = True
        if l.get("trace_type") == "tool_result" and l.get("tool_name") == "send_message_to":
            r = str(l.get("tool_result"))
            if "DELIVERED" in r and delegator and delegator in r: delivered = True
    out.setdefault(key, []).append((delivered, first, address_used, sends, bool(task)))
for key, v in out.items():
    n = len(v)
    print(f"{key:36s} n={n} reportedByRunID={sum(1 for x in v if x[0])} firstSendByRunID={sum(1 for x in v if x[1]=='run ID')} anyAddressInCall={sum(1 for x in v if x[2])} noSend={sum(1 for x in v if x[3]==0)}")

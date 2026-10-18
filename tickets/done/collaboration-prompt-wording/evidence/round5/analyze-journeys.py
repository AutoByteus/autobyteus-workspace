#!/usr/bin/env python3
"""Journey samples (round 5): from each kept task-agent trace — the task-message form, the selector of each send, whether a send
reached the delegator (DELIVERED result naming the delegator's run id), and any send that used both selectors, a name, or an
address that is not the one the task message gave."""
import json, glob, os, re, collections
def args(x):
    a = x.get("tool_args")
    if isinstance(a, dict): return a
    try: return json.loads(a)
    except Exception: return {}
out = collections.OrderedDict()
for f in sorted(glob.glob("traces/journeys/*-task-agent.jsonl"), key=lambda p: (re.sub(r"-sample\d+.*","",os.path.basename(p)), int(re.search(r"sample(\d+)", p).group(1)))):
    key = re.sub(r"-j\d-sample\d+-task-agent.jsonl", "", os.path.basename(f)) + "-" + re.search(r"-(j\d)-", os.path.basename(f)).group(1)
    lines = [json.loads(l) for l in open(f)]
    task = next((l["content"] for l in lines if l.get("trace_type") == "user"), "")
    rid = re.search(r'sender run id "([^"]+)"', task, re.I) or re.search(r"AgentRun ID: (\S+)", task)
    addr = re.search(r'sender address "([^"]+)"', task) or re.search(r"Task delegator address: (\S+)", task)
    delegator = rid.group(1) if rid else None
    form = "address+run id" if 'sender address "' in task else ("run id only" if "sender run id" in task else ("old labels" if "Task delegator" in task else "?"))
    sends, delivered, bad = [], False, []
    for l in lines:
        if l.get("trace_type") == "tool_call" and l.get("tool_name") == "send_message_to":
            a = args(l); sel = ("both" if "recipient_address" in a and "target_agent_run_id" in a else "run id" if "target_agent_run_id" in a else "address" if "recipient_address" in a else "none")
            sends.append(sel)
            if sel == "both": bad.append("both selectors")
            if a.get("recipient_address") and (not addr or a["recipient_address"] != addr.group(1)): bad.append(f"address {a['recipient_address']}")
            if a.get("target_agent_run_id") and delegator and a["target_agent_run_id"] != delegator: bad.append(f"run id {a['target_agent_run_id']}")
        if l.get("trace_type") == "tool_result" and l.get("tool_name") == "send_message_to":
            r = str(l.get("tool_result"))
            if "DELIVERED" in r and delegator and delegator in r: delivered = True
    out.setdefault(key, []).append(dict(form=form, sends=sends, delivered=delivered, bad=bad))
for key, v in out.items():
    print(f"{key:22s} n={len(v)} taskForm={collections.Counter(x['form'] for x in v).most_common()} reported={sum(x['delivered'] for x in v)} "
          f"firstSend={collections.Counter((x['sends'] or ['none'])[0] for x in v).most_common()} wrongOrBoth={[b for x in v for b in x['bad']]}")

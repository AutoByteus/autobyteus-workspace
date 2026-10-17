#!/usr/bin/env python3
"""Per kept LE-A1 run (round 5): helper's first reply selector, and GENUINE unprompted sends by the delegator after the report.
A delegator send counts as unprompted only when (a) the turn it belongs to (same turn_id) was started by a received message
("You received a message ..."), not by one of the test's scripted "Call the ... tool" prompts, and (b) its content is not one of
the test's scripted contents. Turn attribution by turn_id fixes round 3's counter (it used the latest user line, which could be a
report that arrived while a scripted turn was running)."""
import json, glob, os, re
SCRIPTED = {"hello", "Reply in one short sentence, without tools.", "By address?"}
def load(f): return [json.loads(l) for l in open(f)]
def args(x):
    a = x.get("tool_args")
    if isinstance(a, dict): return a
    try: return json.loads(a)
    except Exception:
        try: return eval(a, {"__builtins__": {}}) if isinstance(a, str) and a.startswith("{") else {}
        except Exception: return {}
def turn_key(x):
    t = str(x.get("turn_id") or "")
    return t
rows = []
for d in sorted(glob.glob("traces/*-run*"), key=lambda p: (p.split("/")[1].rsplit("-run", 1)[0], int(p.rsplit("run", 1)[1]))):
    lab = os.path.basename(d)
    fs = glob.glob(d + "/**/raw_traces_active.jsonl", recursive=True)
    pm = next((f for f in fs if "/collaboration/" not in f and "aic_pm" in f), None)
    hp = next((f for f in fs if "/collaboration/" in f and "aic_helper" in f), None)
    helper_first, helper_sends, both, to_name = "no helper trace", 0, False, False
    if hp:
        h = load(hp)
        task = next((x["content"] for x in h if x.get("trace_type") == "user"), "")
        sends = [args(x) for x in h if x.get("trace_type") == "tool_call" and x.get("tool_name") == "send_message_to"]
        helper_sends = len(sends)
        if sends:
            a = sends[0]
            helper_first = "both" if ("recipient_address" in a and "target_agent_run_id" in a) else ("run id" if "target_agent_run_id" in a else ("address" if "recipient_address" in a else "?"))
        else: helper_first = "none"
        both = any("recipient_address" in a and "target_agent_run_id" in a for a in sends)
        pm_addr = re.search(r'sender address "([^"]+)"', task)
        pm_id = re.search(r'sender run id "([^"]+)"', task) or re.search(r"AgentRun ID: (\S+)", task)
        for a in sends:
            ra = a.get("recipient_address"); ti = a.get("target_agent_run_id")
            if ra and (not pm_addr or ra != pm_addr.group(1)): to_name = True
            if ti and pm_id and ti != pm_id.group(1): to_name = True
    unprompted = []
    if pm:
        p = load(pm)
        turn_start = {}
        for x in p:
            if x.get("trace_type") == "user" and turn_key(x) not in turn_start: turn_start[turn_key(x)] = x["content"]
        for x in p:
            if x.get("trace_type") == "tool_call" and x.get("tool_name") == "send_message_to":
                start = turn_start.get(turn_key(x), "")
                a = args(x)
                if start.startswith("You received a message") and str(a.get("content", "")).strip() not in SCRIPTED:
                    unprompted.append(str(a.get("content", ""))[:60])
    rows.append((lab, helper_first, helper_sends, both, to_name, len(unprompted), unprompted[:2]))
print(f"{'run':24s} {'helper 1st':10s} hSends both wrongTarget pmUnprompted examples")
for r in rows: print(f"{r[0]:24s} {r[1]:10s} {r[2]:6d} {str(r[3]):5s} {str(r[4]):11s} {r[5]:3d} {r[6]}")

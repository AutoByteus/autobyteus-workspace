"""Checks the contract's own JSON examples (§3 … §5) against the contract's rules. Usage:
python3 -I validate_contract_examples.py <target-collaboration-contract.md>
Prints every finding; "0 findings" when the examples agree with each other and with the rules."""
import json, re, sys, collections
text = open(sys.argv[1], encoding="utf-8").read()
body = text[text.index("## 3. On disk"):text.index("## 6. Existing data")]
blocks = re.findall(r"```json\n(.*?)```", body, re.S)
F = []; objs = []
for b in blocks:
    try: v = json.loads(b)
    except Exception as e: F.append(f"not valid JSON: {b[:70]!r} ({e})"); continue
    objs.extend(v if isinstance(v, list) else [v])
entries, runs, nodes, msgs = [], {}, [], []
def walk(o):
    if isinstance(o, dict):
        if "agentRunResources" in o:
            for e in o["agentRunResources"]: entries.append((o["taskId"], e))
            return
        if "role" in o and "agentRun" in o: entries.append((None, o)); return
        if "rootTeam" in o: runs[("agent_team", o["rootTeam"]["teamRunId"])] = o; return
        if "rootOrg" in o: runs[("agent_org", o["rootOrg"]["orgRunId"])] = o; return
        if "runId" in o and "agentDefinitionId" in o: runs.setdefault(("agent", o["runId"]), o); return
        if "run" in o and "parent" in o: nodes.append(o); return
        if "messageId" in o: msgs.append(o); return
for o in objs: walk(o)
def run_key(a): return ("agent", a["agentRunId"]) if a["kind"] == "agent" else ("agent_team", a["teamRunId"])
def agents_of(k):
    r = runs.get(k)
    if not r: return None
    if k[0] == "agent": return {r["runId"]}
    if k[0] == "agent_team": return {m["agentRunId"] for m in r["rootTeam"]["members"] if "agentRunId" in m}
    out = set()
    for m in r["rootOrg"]["members"]:
        if "agentRunId" in m: out.add(m["agentRunId"])
        out.update(y["agentRunId"] for y in m.get("members", []) if "agentRunId" in y)
    return out
REQ = ["role", "delegatedFrom", "recipientAddress", "agentRun", "linkedAt", "start", "closedAt"]
for tid, e in entries:
    for f in REQ:
        if f not in e: F.append(f"entry for {e['agentRun']} lacks {f}")
    if e.get("role") not in ("assigned", "subWork"): F.append(f"entry role {e.get('role')}")
    if ("nodeId" in e) != ("members" in e) and e["agentRun"]["kind"] == "team": F.append(f"peer team entry needs nodeId and members together: {e['agentRun']}")
    df = e.get("delegatedFrom", {}); dr = df.get("delegatingRun", {})
    dk = (dr.get("kind"), dr.get("runId")); ag = agents_of(dk)
    if ag is not None and df.get("delegatorAgentRunId") not in ag: F.append(f"delegator {df.get('delegatorAgentRunId')} is not an agent of {dk}")
    k = run_key(e["agentRun"]); r = runs.get(k)
    if r and "nodeId" not in e:
        own = r.get("delegatedFrom")
        if own != df: F.append(f"{k}: own delegatedFrom {own} differs from its entry {df}")
        if k[0] == "agent_team":
            co = r["rootTeam"]["coordinatorAddress"]; cid = next((m["agentRunId"] for m in r["rootTeam"]["members"] if m["address"] == co), None)
            if cid != e["agentRun"].get("coordinatorAgentRunId"): F.append(f"{k}: entry coordinator {e['agentRun'].get('coordinatorAgentRunId')} vs file {cid}")
    if "members" in e:
        for m in e["members"]:
            if m["address"].count("/") != 1: F.append(f"peer member address not in the team's own space: {m['address']}")
for k, r in runs.items():
    if k[0] == "agent_team":
        rt = r["rootTeam"]; ms = {m["address"] for m in rt["members"]}
        if rt["address"] != "/": F.append(f"{k}: root {rt['address']}")
        for a in ms:
            if a.count("/") != 1: F.append(f"{k}: member {a} not a direct child of /")
        if rt["coordinatorAddress"] not in ms: F.append(f"{k}: coordinator {rt['coordinatorAddress']} not a member")
        for h in r.get("handoffs", []):
            if h["from"] not in ms: F.append(f"{k}: handoff from {h['from']} not a member")
            if h["to"] not in ms and "delegatedFrom" not in r: F.append(f"{k}: handoff to {h['to']} outside a team the user started")
    if k[0] == "agent_org" and r["rootOrg"]["address"] != "/": F.append(f"{k}: org root")
by_task = collections.defaultdict(list)
for tid, e in entries:
    if tid: by_task[tid].append(e)
for n in nodes:
    k = (n["run"]["kind"], n["run"]["runId"])
    mine = [(t, e) for t, es in by_task.items() for e in es if run_key(e["agentRun"]) == k or (e["agentRun"]["kind"] == "team" and k == ("agent_team", e["agentRun"].get("teamRunId")))]
    for t, e in mine:
        dr = e["delegatedFrom"]["delegatingRun"]
        if n["parent"] and (n["parent"]["kind"], n["parent"]["runId"]) != (dr["kind"], dr["runId"]): F.append(f"node {k}: parent {n['parent']} vs entry {dr}")
    for t in n.get("tasks", []):
        asg = [e["delegatedFrom"]["delegatingRun"] for e in by_task.get(t["taskId"], []) if e["role"] == "assigned"]
        if asg and t["assigner"] not in asg: F.append(f"node {k}: assigner of {t['taskId']} {t['assigner']} vs {asg}")
    ag = agents_of(("agent_team" if n["run"]["kind"] == "agent_team" else n["run"]["kind"], n["run"]["runId"]))
    if ag is not None and "agents" in n and set(n["agents"]) != ag: F.append(f"node {k}: agents {n['agents']} vs file {sorted(ag)}")
owner = {}
for k in runs:
    for a in agents_of(k) or (): owner[a] = k
for m in msgs:
    a, b = owner.get(m["senderAgentRunId"]), owner.get(m["receiverAgentRunId"])
    if not a or not b: F.append(f"message {m['messageId']}: unknown run of {m['senderAgentRunId'] if not a else m['receiverAgentRunId']}"); continue
    if a == b: continue
    ta = {t for t, es in by_task.items() for e in es if run_key(e["agentRun"]) == a}; tb = {t for t, es in by_task.items() for e in es if run_key(e["agentRun"]) == b}
    asg = lambda t: {(e["delegatedFrom"]["delegatingRun"]["kind"], e["delegatedFrom"]["delegatingRun"]["runId"]) for e in by_task[t] if e["role"] == "assigned"}
    kk = lambda k: ("agent" if k[0] == "agent" else k[0], k[1])
    ok = bool(ta & tb) or any(kk(a) in asg(t) for t in tb) or any(kk(b) in asg(t) for t in ta)
    if not ok: F.append(f"message {m['messageId']}: {a} -> {b} is allowed by no rule")
print(f"{len(blocks)} JSON blocks; {len(entries)} Task entries; {len(runs)} run files; {len(nodes)} tree nodes; {len(msgs)} message lines")
for f in F: print("FINDING:", f)
print(f"{len(F)} findings")

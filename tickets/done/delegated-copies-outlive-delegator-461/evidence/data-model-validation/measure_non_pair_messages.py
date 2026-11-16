"""Read-only detail of cross-run messages that are not between a delegator and the run it delegated (autobyteus-461, AR-002).
Prints counts and months only; no content, no IDs. Usage: python3 -I measure_non_pair_messages.py <server-data dir>
"""
import collections, glob, json, os, sys
root = sys.argv[1]; mem = os.path.join(root, "memory"); C = collections.Counter()
def load(p):
    try:
        with open(p) as h: return json.load(h)
    except Exception: return None
run_of, sec, kind_in_run = {}, {}, {}
for p in glob.glob(os.path.join(mem, "agents", "*", "run_metadata.json")):
    m = load(p)
    if m: k = ("agent", m["runId"]); run_of[m["runId"]] = k; sec[k] = m.get("taskAgent"); kind_in_run[m["runId"]] = "host"
for p in glob.glob(os.path.join(mem, "agent_teams", "*", "team_run_execution_tree.json")):
    t = load(p)
    if t:
        k = ("agent_team", t["rootTeam"]["teamRunId"]); sec[k] = t.get("taskAgent"); coord = t["rootTeam"].get("coordinatorAddress")
        for mb in t["rootTeam"].get("members", []):
            if "agentRunId" in mb: run_of[mb["agentRunId"]] = k; kind_in_run[mb["agentRunId"]] = "coordinator" if mb.get("address") == coord else "member"
for p in glob.glob(os.path.join(mem, "agent_orgs", "*", "agent_org_run_execution_tree.json")):
    t = load(p)
    if t:
        k = ("agent_org", t["rootOrg"]["orgRunId"]); sec[k] = None
        for mb in t["rootOrg"].get("members", []):
            if "agentRunId" in mb: run_of[mb["agentRunId"]] = k; kind_in_run[mb["agentRunId"]] = "org agent"
            for inner in mb.get("members", []):
                if "agentRunId" in inner: run_of[inner["agentRunId"]] = k; kind_in_run[inner["agentRunId"]] = "org team member"
seen = set(); months = collections.Counter()
logs = glob.glob(os.path.join(mem, "agents", "*", "collaboration", "communication_messages_*.jsonl")) + glob.glob(os.path.join(mem, "agents", "*", "communication_messages_*.jsonl")) + \
    glob.glob(os.path.join(mem, "agent_teams", "*", "team_communication_messages_*.jsonl")) + glob.glob(os.path.join(mem, "agent_orgs", "*", "agent_org_communication_messages_*.jsonl"))
top = lambda s: (s["coordinatingRun"]["kind"], s["coordinatingRun"]["runId"]) if s else None
for p in logs:
    try: lines = open(p).read().splitlines()
    except Exception: continue
    for line in lines:
        try: m = json.loads(line)
        except Exception: continue
        mid = m.get("messageId")
        if not mid or mid in seen: continue
        seen.add(mid)
        s, r = m.get("senderAgentRunId"), m.get("receiverAgentRunId"); ks, kr = run_of.get(s), run_of.get(r)
        if not ks or not kr or ks == kr: continue
        ss, sr = sec.get(ks), sec.get(kr)
        if (sr and sr.get("delegatorAgentRunId") == s) or (ss and ss.get("delegatorAgentRunId") == r): continue
        month = (m.get("createdAt") or "")[:7]
        # relation
        if sr and not sr.get("delegatorAgentRunId") and top(sr) == ks: rel = "to a run whose record has no delegator, from its coordinating run"
        elif ss and not ss.get("delegatorAgentRunId") and top(ss) == kr: rel = "from a run whose record has no delegator, to its coordinating run"
        elif ss and top(ss) == kr: rel = f"delegated {ks[0]} run -> another agent of its coordinating {kr[0]} run (receiver is its {kind_in_run.get(r)}; not its delegator)"
        elif sr and top(sr) == ks: rel = f"an agent of the coordinating {ks[0]} run (its {kind_in_run.get(s)}; not the delegator) -> delegated {kr[0]} run"
        elif ss and sr and top(ss) == top(sr):
            up_s = run_of.get(ss.get("delegatorAgentRunId") or ""); up_r = run_of.get(sr.get("delegatorAgentRunId") or "")
            if up_s == kr or up_r == ks: rel = "delegated run <-> the run that delegated it, but to/from another agent of that run than the delegator"
            elif up_s == up_r: rel = "two runs delegated by the same run (siblings)"
            else: rel = "two delegated runs of one coordinating run, otherwise unrelated"
        else: rel = "other"
        C[rel] += 1; months[(rel, month)] += 1
for k, v in C.most_common(): 
    print(f"{v:5d}  {k}")
    print("        months: " + ", ".join(f"{mo}:{n}" for (rel, mo), n in sorted(months.items()) if rel == k))

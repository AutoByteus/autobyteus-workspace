"""Read-only: every stored message between two runs, classified by the contract's routes at run level (autobyteus-461).
Counts only. Usage: python3 -I measure_routes_run_level.py <server-data dir>
"""
import collections, glob, json, os, sys
root = sys.argv[1]; mem = os.path.join(root, "memory"); C = collections.Counter()
def load(p):
    try:
        with open(p) as h: return json.load(h)
    except Exception: return None
sec, owner, coord = {}, {}, {}
for p in glob.glob(os.path.join(mem, "agents", "*", "run_metadata.json")):
    m = load(p)
    if m: k = ("agent", m["runId"]); sec[k] = m.get("taskAgent"); owner[m["runId"]] = k; coord[k] = m["runId"]
for p in glob.glob(os.path.join(mem, "agent_teams", "*", "team_run_execution_tree.json")):
    t = load(p)
    if t:
        k = ("agent_team", t["rootTeam"]["teamRunId"]); sec[k] = t.get("taskAgent"); ca = t["rootTeam"].get("coordinatorAddress")
        for mb in t["rootTeam"].get("members", []):
            if "agentRunId" in mb:
                owner[mb["agentRunId"]] = k
                if mb.get("address") == ca: coord[k] = mb["agentRunId"]
for p in glob.glob(os.path.join(mem, "agent_orgs", "*", "agent_org_run_execution_tree.json")):
    t = load(p)
    if t:
        k = ("agent_org", t["rootOrg"]["orgRunId"]); sec[k] = None
        for mb in t["rootOrg"].get("members", []):
            if "agentRunId" in mb: owner[mb["agentRunId"]] = k
            for inner in mb.get("members", []):
                if "agentRunId" in inner: owner[inner["agentRunId"]] = k
tasks_of = collections.defaultdict(set); assigner_runs = collections.defaultdict(set)   # run -> tasks ; task -> runs of its assigners
for p in glob.glob(os.path.join(root, "projects", "*", "tasks", "*", "agent_run_resources.json")) + glob.glob(os.path.join(root, "ad-hoc-tasks", "*", "agent_run_resources.json")):
    r = load(p) or {}
    for e in r.get("agentRunResources", []):
        a = e["agentRun"]; k = ("agent", a["agentRunId"]) if a["kind"] == "agent" else ("agent_team", a["teamRunId"])
        tasks_of[k].add(r.get("taskId"))
        if e.get("role") == "assigned" and owner.get(e.get("assignedBy")): assigner_runs[r.get("taskId")].add(owner[e["assignedBy"]])
def delegating_run(k):
    s = sec.get(k)
    return owner.get(s.get("delegatorAgentRunId")) if s and s.get("delegatorAgentRunId") else None
seen = set()
logs = glob.glob(os.path.join(mem, "agents", "*", "collaboration", "communication_messages_*.jsonl")) + glob.glob(os.path.join(mem, "agents", "*", "communication_messages_*.jsonl")) + \
    glob.glob(os.path.join(mem, "agent_teams", "*", "team_communication_messages_*.jsonl")) + glob.glob(os.path.join(mem, "agent_orgs", "*", "agent_org_communication_messages_*.jsonl"))
for p in logs:
    try: lines = open(p).read().splitlines()
    except Exception: continue
    for line in lines:
        try: m = json.loads(line)
        except Exception: continue
        mid = m.get("messageId")
        if not mid or mid in seen: continue
        seen.add(mid)
        s, r = m.get("senderAgentRunId"), m.get("receiverAgentRunId"); ks, kr = owner.get(s), owner.get(r)
        if not ks or not kr or ks == kr: continue
        C["between two runs"] += 1
        if delegating_run(kr) == ks or delegating_run(ks) == kr:
            C["1. on a link (one run delegated to the other)"] += 1
            ss, sr = sec.get(ks), sec.get(kr)
            exact = (sr and sr.get("delegatorAgentRunId") == s) or (ss and ss.get("delegatorAgentRunId") == r)
            C["1a.   between the delegator itself and the delegated run" if exact else "1b.   another agent of the delegating run (not the delegator) is the sender or receiver"] += 1
            continue
        same = bool(tasks_of.get(ks, set()) & tasks_of.get(kr, set()))
        assigner = any(ks in assigner_runs[t] for t in tasks_of.get(kr, ())) or any(kr in assigner_runs[t] for t in tasks_of.get(ks, ()))
        if same or assigner:
            C["2. through the Task's record"] += 1
            C["2a.   two runs of one Task" if same else "2b.   a Task's assigner run and a run of that Task"] += 1
        else:
            C["3. no route"] += 1
            C["3a.   neither run has a Task record" if not tasks_of.get(ks) and not tasks_of.get(kr) else "3b.   other"] += 1
for k in sorted(C): print(f"{C[k]:6d}  {k}")

"""Read-only: the Task-centered message rule (contract revision 5, §10) against every stored message between two runs.
Counts only. Usage: python3 -I validate_task_centered_messaging.py <server-data dir>

Rule: two runs may message each other when (a) both work on one Task, or (b) one of them is the run whose agent
assigned the other's Task. A run is: a standalone agent run, a team run, an org run (with its members), or a
delegated run. Compared with today's rule: both runs under one top run, and not owned by two different Tasks.
"""
import collections, glob, json, os, sys
root = sys.argv[1]; mem = os.path.join(root, "memory"); C = collections.Counter()
def load(p):
    try:
        with open(p) as h: return json.load(h)
    except Exception: return None
owner = {}   # agent run id -> run key
top = {}     # run key -> top run key (today's hosting root)
for p in glob.glob(os.path.join(mem, "agents", "*", "run_metadata.json")):
    m = load(p)
    if not m: continue
    k = ("agent", m["runId"]); owner[m["runId"]] = k
    ta = m.get("taskAgent"); top[k] = (ta["coordinatingRun"]["kind"], ta["coordinatingRun"]["runId"]) if ta else k
for p in glob.glob(os.path.join(mem, "agent_teams", "*", "team_run_execution_tree.json")):
    t = load(p)
    if not t: continue
    k = ("agent_team", t["rootTeam"]["teamRunId"])
    for x in t["rootTeam"].get("members", []):
        if "agentRunId" in x: owner[x["agentRunId"]] = k
    ta = t.get("taskAgent"); top[k] = (ta["coordinatingRun"]["kind"], ta["coordinatingRun"]["runId"]) if ta else k
for p in glob.glob(os.path.join(mem, "agent_orgs", "*", "agent_org_run_execution_tree.json")):
    t = load(p)
    if not t: continue
    k = ("agent_org", t["rootOrg"]["orgRunId"]); top[k] = k
    for x in t["rootOrg"].get("members", []):
        if "agentRunId" in x: owner[x["agentRunId"]] = k
        for y in x.get("members", []):
            if "agentRunId" in y: owner[y["agentRunId"]] = k
tasks_of = collections.defaultdict(set)        # run key -> Task ids
open_tasks_of = collections.defaultdict(set)
assigner_runs = collections.defaultdict(set)   # Task id -> run keys whose agent assigned it
for p in glob.glob(os.path.join(root, "projects", "*", "tasks", "*", "agent_run_resources.json")) + glob.glob(os.path.join(root, "ad-hoc-tasks", "*", "agent_run_resources.json")):
    f = load(p) or {}; tid = f.get("taskId")
    for e in f.get("agentRunResources", []):
        a = e["agentRun"]; k = ("agent", a["agentRunId"]) if a["kind"] == "agent" else ("agent_team", a["teamRunId"])
        tasks_of[k].add(tid)
        if e.get("closedAt") is None: open_tasks_of[k].add(tid)
        if e.get("role") == "assigned" and owner.get(e.get("assignedBy")): assigner_runs[tid].add(owner[e["assignedBy"]])
C["runs with more than one open Task now"] = sum(1 for v in open_tasks_of.values() if len(v) > 1)
seen = set()
logs = glob.glob(os.path.join(mem, "agents", "*", "collaboration", "communication_messages_*.jsonl")) + glob.glob(os.path.join(mem, "agents", "*", "communication_messages_*.jsonl")) \
    + glob.glob(os.path.join(mem, "agent_teams", "*", "team_communication_messages_*.jsonl")) + glob.glob(os.path.join(mem, "agent_orgs", "*", "agent_org_communication_messages_*.jsonl"))
for p in logs:
    try: lines = open(p).read().splitlines()
    except Exception: continue
    for line in lines:
        try: m = json.loads(line)
        except Exception: continue
        mid = m.get("messageId")
        if not mid or mid in seen: continue
        seen.add(mid)
        a, b = owner.get(m.get("senderAgentRunId")), owner.get(m.get("receiverAgentRunId"))
        if not a or not b or a == b: continue
        C["messages between two runs"] += 1
        ta, tb = tasks_of.get(a, set()), tasks_of.get(b, set())
        same_task = bool(ta & tb)
        assigner = any(a in assigner_runs[t] for t in tb) or any(b in assigner_runs[t] for t in ta)
        today = top.get(a) == top.get(b) and not (ta and tb and not (ta & tb))
        new = same_task or assigner
        C[f"today {'allowed' if today else 'not allowed'} / Task rule {'allowed' if new else 'not allowed'}"] += 1
        if new: C["  Task rule: " + ("(a) one Task" if same_task else "(b) the assigner's run")] += 1
        elif today:
            legacy = [k for k in (a, b) if top.get(k) != k and not tasks_of.get(k)]
            C["  allowed today only: " + ("one side is a delegated run with no Task record (legacy)" if legacy else ("no Task record, not delegated" if not ta or not tb else "other"))] += 1
            C["  allowed today only, by month: " + str(m.get("createdAt", ""))[:7]] += 1
for k in sorted(C): print(f"{C[k]:6d}  {k}")

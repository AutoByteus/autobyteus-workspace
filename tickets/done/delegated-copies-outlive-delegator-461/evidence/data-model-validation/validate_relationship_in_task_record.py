"""Read-only: can the Task record hold the delegation relationship once (autobyteus-461, contract revision 5)?
Counts only. Usage: python3 -I validate_relationship_in_task_record.py <server-data dir>
"""
import collections, glob, json, os, sys
root = sys.argv[1]; mem = os.path.join(root, "memory"); C = collections.Counter()
def load(p):
    try:
        with open(p) as h: return json.load(h)
    except Exception: return None
own = {}
for p in glob.glob(os.path.join(mem, "agents", "*", "run_metadata.json")):
    m = load(p)
    if m and m.get("taskAgent"): own[m["runId"]] = m["taskAgent"]
for p in glob.glob(os.path.join(mem, "agent_teams", "*", "team_run_execution_tree.json")):
    t = load(p)
    if t and t.get("taskAgent"): own[t["rootTeam"]["teamRunId"]] = t["taskAgent"]
entries = collections.defaultdict(list)
for p in glob.glob(os.path.join(root, "projects", "*", "tasks", "*", "agent_run_resources.json")) + glob.glob(os.path.join(root, "ad-hoc-tasks", "*", "agent_run_resources.json")):
    for e in (load(p) or {}).get("agentRunResources", []):
        a = e["agentRun"]; entries[a.get("agentRunId") or a.get("teamRunId")].append(e)
for rid, es in entries.items():
    C["runs with Task entries"] += 1
    if len(es) > 1:
        C["runs with more than one entry"] += 1
        C["  all entries name the same hostRoot"] += len({(e["hostRoot"]["kind"], e["hostRoot"]["runId"]) for e in es}) == 1
        assigners = {e.get("assignedBy") for e in es if e.get("role") == "assigned"}
        C["  assigned entries all name the same assigner"] += len(assigners) <= 1
        C["  mix of roles"] += len({e.get("role") for e in es}) > 1
    if rid in own:
        d = own[rid].get("delegatorAgentRunId")
        for e in es:
            if e.get("role") != "assigned":
                C[f"  {e.get('role')} entries whose run records a delegator"] += bool(d)
# Remote runs: what this node knows only from the tree link
remote = {}
for p in glob.glob(os.path.join(mem, "agents", "*", "collaboration", "collaboration_tree.json")):
    for e in (load(p) or {}).get("taskExecutions", []):
        if "nodeId" in e: remote[e.get("agentRunId") or e.get("teamRunId")] = e
for rid, link in remote.items():
    C["remote links"] += 1
    C["  remote link has a Task entry"] += rid in entries
    C["  remote link kind " + ("team (has members)" if "members" in link else "agent")] += 1
for k in sorted(C): print(f"{C[k]:6d}  {k}")

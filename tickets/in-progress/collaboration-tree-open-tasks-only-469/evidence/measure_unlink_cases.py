"""Read-only: the cases the unlink rule must handle, counted on stored data (autobyteus-469).
Counts only. Usage: python3 -I measure_unlink_cases.py <server-data dir>
"""
import collections, glob, json, os, sys
root = sys.argv[1]; mem = os.path.join(root, "memory"); C = collections.Counter()
def load(p):
    try:
        with open(p) as h: return json.load(h)
    except Exception: return None
state = collections.defaultdict(list)
for p in glob.glob(os.path.join(root, "projects", "*", "tasks", "*", "agent_run_resources.json")) + glob.glob(os.path.join(root, "ad-hoc-tasks", "*", "agent_run_resources.json")):
    for e in (load(p) or {}).get("agentRunResources", []):
        a = e["agentRun"]; state[a.get("agentRunId") or a.get("teamRunId")].append(e.get("closedAt") is not None)
def closed(run_id): return bool(state.get(run_id)) and all(state[run_id])
def members_of(team_run_id):
    t = load(os.path.join(mem, "agent_teams", team_run_id, "team_run_execution_tree.json")) or {}
    return [m["agentRunId"] for m in t.get("rootTeam", {}).get("members", []) if "agentRunId" in m]
trees = []
for p in glob.glob(os.path.join(mem, "agents", "*", "collaboration", "collaboration_tree.json")):
    t = load(p)
    if t: trees.append(("agent", {"root": t.get("taskExecutions", [])}))
for p in glob.glob(os.path.join(mem, "agent_teams", "*", "team_run_execution_tree.json")):
    t = load(p)
    if t and "taskAgent" not in t: trees.append(("agent_team", {"root": t["rootTeam"].get("taskExecutions", [])}))
for p in glob.glob(os.path.join(mem, "agent_orgs", "*", "agent_org_run_execution_tree.json")):
    t = load(p)
    if t:
        lists = {"root": t["rootOrg"].get("taskExecutions", [])}
        for m in t["rootOrg"].get("members", []):
            if "teamRunId" in m and m.get("taskExecutions"): lists["configured_team"] = lists.get("configured_team", []) + m["taskExecutions"]
        trees.append(("agent_org", lists))
for kind, lists in trees:
    entries = [e for es in lists.values() for e in es]
    if not entries: continue
    C[f"{kind}: trees with entries"] += 1
    owner = {}
    for e in entries:
        rid = e.get("agentRunId") or e.get("teamRunId")
        if "nodeId" in e: continue
        owner[rid] = rid
        if "teamRunId" in e:
            for m in members_of(rid): owner[m] = rid
    for key, es in lists.items():
        for e in es:
            rid = e.get("agentRunId") or e.get("teamRunId")
            if "nodeId" in e:
                C[f"{kind}: links to a run on another node"] += 1
                C[f"{kind}:   of a closed Task" if closed(rid) else f"{kind}:   of an open Task or no Task"] += 1
                continue
            C[f"{kind}: local links"] += 1
            if key == "configured_team": C[f"{kind}:   kept in a configured team's list (older shape)"] += 1
            C[f"{kind}:   closed (to unlink)" if closed(rid) else f"{kind}:   open or no Task (stay)"] += 1
            parent = owner.get(e.get("delegatorAgentRunId"))
            if parent:
                C[f"{kind}:   delegated by an agent of another delegated run (nested)"] += 1
                if not closed(rid) and closed(parent): C[f"{kind}:     nested run stays while its parent is closed (parent must stay too)"] += 1
                if closed(rid) and not closed(parent): C[f"{kind}:     nested run closed, parent stays"] += 1
for k in sorted(C): print(f"{C[k]:6d}  {k}")

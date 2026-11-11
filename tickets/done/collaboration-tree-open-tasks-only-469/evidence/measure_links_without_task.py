"""Read-only: the local links that the Task records could not supply (autobyteus-469, the Task-record model).
Counts and dates only. Usage: python3 -I measure_links_without_task.py <server-data dir>
"""
import collections, datetime, glob, json, os, sys
root = sys.argv[1]; mem = os.path.join(root, "memory"); C = collections.Counter()
def load(p):
    try:
        with open(p) as h: return json.load(h)
    except Exception: return None
entries = collections.defaultdict(list)
for p in glob.glob(os.path.join(root, "projects", "*", "tasks", "*", "agent_run_resources.json")) + glob.glob(os.path.join(root, "ad-hoc-tasks", "*", "agent_run_resources.json")):
    for e in (load(p) or {}).get("agentRunResources", []):
        a = e["agentRun"]; entries[a.get("agentRunId") or a.get("teamRunId")].append(e)
def newest(path):
    latest = 0.0
    for d, _, files in os.walk(path):
        for f in files:
            try: latest = max(latest, os.path.getmtime(os.path.join(d, f)))
            except OSError: pass
    return latest
trees = []
for p in glob.glob(os.path.join(mem, "agents", "*", "collaboration", "collaboration_tree.json")):
    t = load(p)
    if t: trees.append(("agent", os.path.dirname(os.path.dirname(p)), t.get("taskExecutions", [])))
for p in glob.glob(os.path.join(mem, "agent_teams", "*", "team_run_execution_tree.json")):
    t = load(p)
    if t and "taskAgent" not in t: trees.append(("agent_team", os.path.dirname(p), t["rootTeam"].get("taskExecutions", [])))
for p in glob.glob(os.path.join(mem, "agent_orgs", "*", "agent_org_run_execution_tree.json")):
    t = load(p)
    if t:
        es = list(t["rootOrg"].get("taskExecutions", []))
        for m in t["rootOrg"].get("members", []):
            if "teamRunId" in m: es += m.get("taskExecutions", [])
        trees.append(("agent_org", os.path.dirname(p), es))
today = datetime.date(2026, 11, 10)
tops = collections.Counter(); rows = []
for kind, top_dir, es in trees:
    for e in es:
        if "nodeId" in e: continue
        rid = e.get("agentRunId") or e.get("teamRunId")
        recs = entries.get(rid, [])
        if not recs:
            C["no Task record"] += 1
            own = os.path.join(mem, "agents" if "agentRunId" in e else "agent_teams", rid)
            run_age = (today - datetime.date.fromtimestamp(newest(own))).days if os.path.isdir(own) else None
            top_age = (today - datetime.date.fromtimestamp(newest(top_dir))).days
            tops[(kind, os.path.basename(top_dir)[:6])] += 1
            rows.append((kind, "agent run" if "agentRunId" in e else "team run", e.get("startedAt", "")[:10], run_age, top_age))
        elif any(r.get("closedAt") is None for r in recs):
            C["open Task"] += 1
            C["open Task:   start " + str(next(r for r in recs if r.get("closedAt") is None).get("start"))] += 1
        else:
            C["closed Tasks only"] += 1
for k in sorted(C): print(f"{C[k]:6d}  {k}")
print("links with no Task record: top runs that hold them:", len(tops), "distribution:", sorted(tops.values(), reverse=True))
print("kind of top run, kind of run, started, days since the run's folder last changed, days since the top run's folder last changed")
for r in sorted(rows, key=lambda r: r[2]): print("  ", r)

"""Read-only: does contract revision 5 give each design spine the data it needs? (autobyteus-461). Counts only.
Usage: python3 -I validate_spines_on_data.py <server-data dir>
"""
import collections, glob, json, os, sys
root = sys.argv[1]; mem = os.path.join(root, "memory"); C = collections.Counter()
def load(p):
    try:
        with open(p) as h: return json.load(h)
    except Exception: return None
own, ordinary_agent_keys, delegated_agent_keys = {}, collections.Counter(), collections.Counter()
for p in glob.glob(os.path.join(mem, "agents", "*", "run_metadata.json")):
    m = load(p)
    if not m: continue
    if m.get("taskAgent"):
        own[m["runId"]] = ("agent", m); delegated_agent_keys[tuple(sorted(k for k in m if k != "taskAgent"))] += 1
    else: ordinary_agent_keys[tuple(sorted(m))] += 1
for p in glob.glob(os.path.join(mem, "agent_teams", "*", "team_run_execution_tree.json")):
    t = load(p)
    if t and t.get("taskAgent"): own[t["rootTeam"]["teamRunId"]] = ("team", t)
# 1. an ordinary run's file without taskAgent: required fields of an ordinary agent run present?
required = set.intersection(*[set(k) for k in ordinary_agent_keys]) if ordinary_agent_keys else set()
C["DS-10 delegated agent runs whose file, without taskAgent, has every field all ordinary runs have"] = sum(n for k, n in delegated_agent_keys.items() if required <= set(k))
C["DS-10 delegated agent runs"] = sum(delegated_agent_keys.values())
# 2. history indexes: are delegated runs listed today?
idx = load(os.path.join(mem, "run_history_index.json")) or {}
rows = idx if isinstance(idx, list) else (idx.get("rows") or idx.get("runs") or [])
ids = {r.get("runId") for r in rows if isinstance(r, dict)}
C["run history index rows (agent runs)"] = len(ids)
C["  of them delegated agent runs"] = sum(1 for r in own if own[r][0] == "agent" and r in ids)
tidx = load(os.path.join(mem, "team_run_history_index.json")) or {}
trows = tidx if isinstance(tidx, list) else (tidx.get("rows") or tidx.get("runs") or [])
tids = {r.get("teamRunId") for r in trows if isinstance(r, dict)}
C["team history index rows"] = len(tids)
C["  of them delegated team runs"] = sum(1 for r in own if own[r][0] == "team" and r in tids)
# 3. Task records: every Task with a subWork/broughtIn entry also has an assigned entry (the assigning run, DS-3)
tasks = []
for p in glob.glob(os.path.join(root, "projects", "*", "tasks", "*", "agent_run_resources.json")) + glob.glob(os.path.join(root, "ad-hoc-tasks", "*", "agent_run_resources.json")):
    f = load(p) or {}; es = f.get("agentRunResources", [])
    if es: tasks.append(es)
C["Task records with entries"] = len(tasks)
C["  with a subWork/broughtIn entry"] = sum(1 for es in tasks if any(e["role"] != "assigned" for e in es))
C["  ... that also have an assigned entry"] = sum(1 for es in tasks if any(e["role"] != "assigned" for e in es) and any(e["role"] == "assigned" for e in es))
C["  with more than one assigned entry (several assigning runs?)"] = sum(1 for es in tasks if len({e.get("assignedBy") for e in es if e["role"] == "assigned"}) > 1)
# 4. DS-8 child rows: every run of an entry on this node has an address in its own file
entry_runs = {(e["agentRun"].get("agentRunId") or e["agentRun"].get("teamRunId")) for es in tasks for e in es}
C["DS-8 runs named by entries, on this node"] = len(entry_runs & set(own))
C["  with an address in their own file"] = sum(1 for r in entry_runs & set(own) if (own[r][1]["taskAgent"].get("address") or (own[r][0] == "team" and own[r][1]["rootTeam"].get("address"))))
# 5. DS-2 non-coordinator team members are listed in the team's own file
C["DS-2 delegated team runs whose own file lists members with run ids"] = sum(1 for r, (k, f) in own.items() if k == "team" and all("agentRunId" in m for m in f["rootTeam"].get("members", [])))
C["DS-2 delegated team runs"] = sum(1 for k, _ in own.values() if k == "team")
# 6. Listing after the change: delegated runs with no entry, or whose delegating run is not stored
open_runs = {(e["agentRun"].get("agentRunId") or e["agentRun"].get("teamRunId")) for es in tasks for e in es if e.get("closedAt") is None}
C["listing: delegated runs with no Task entry (shown as runs of their own, TC-9)"] = len(set(own) - entry_runs)
C["listing: delegated runs with an open entry (shown under their delegating run)"] = len(open_runs & set(own))
C["listing: delegated runs with closed entries only (Task page and Memory page, as after 469)"] = len((entry_runs - open_runs) & set(own))
for k in sorted(C): print(f"{C[k]:6d}  {k}")

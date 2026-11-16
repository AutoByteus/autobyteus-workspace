"""Read-only: contract revision 6 against the user's data (autobyteus-461). Counts only.
- every delegated run's own `delegatedFrom` (origin) can be computed, one hop;
- it equals the `delegatedFrom` of each of its Task entries;
- the in-memory DelegationTree built from the Task entries is a forest (no cycle, every parent stored or a top run);
- the message rule computed on the tree gives the same answer as the rule computed on the records.
Usage: python3 -I validate_contract_revision_6.py <server-data dir>
"""
import collections, glob, json, os, sys
root = sys.argv[1]; mem = os.path.join(root, "memory"); C = collections.Counter()
def load(p):
    try:
        with open(p) as h: return json.load(h)
    except Exception: return None
own, part_of = {}, {}
for p in glob.glob(os.path.join(mem, "agents", "*", "run_metadata.json")):
    m = load(p)
    if not m: continue
    if m.get("taskAgent"): own[("agent", m["runId"])] = m["taskAgent"]
    part_of[m["runId"]] = ("agent", m["runId"])
for p in glob.glob(os.path.join(mem, "agent_teams", "*", "team_run_execution_tree.json")):
    t = load(p)
    if not t: continue
    k = ("agent_team", t["rootTeam"]["teamRunId"])
    if t.get("taskAgent"): own[k] = t["taskAgent"]
    for x in t["rootTeam"].get("members", []):
        if "agentRunId" in x: part_of[x["agentRunId"]] = k
for p in glob.glob(os.path.join(mem, "agent_orgs", "*", "agent_org_run_execution_tree.json")):
    t = load(p)
    if not t: continue
    k = ("agent_org", t["rootOrg"]["orgRunId"])
    for x in t["rootOrg"].get("members", []):
        if "agentRunId" in x: part_of[x["agentRunId"]] = k
        for y in x.get("members", []):
            if "agentRunId" in y: part_of[y["agentRunId"]] = k
stored = set(part_of.values())
# 1. the run's own delegatedFrom (origin), one hop
origin = {}
for k, ta in own.items():
    d = ta.get("delegatorAgentRunId"); co = (ta["coordinatingRun"]["kind"], ta["coordinatingRun"]["runId"])
    run = part_of.get(d) if d else None
    origin[k] = (run or co, d)
    C["origin: computed"] += 1
    C["origin: " + ("one hop from the delegator" if run else ("no delegator recorded: today's coordinating run" if not d else "delegator's run not stored: today's coordinating run"))] += 1
# 2. Task entries' delegatedFrom, as the migration computes it
entries = collections.defaultdict(list); task_entries = collections.defaultdict(list)
for p in glob.glob(os.path.join(root, "projects", "*", "tasks", "*", "agent_run_resources.json")) + glob.glob(os.path.join(root, "ad-hoc-tasks", "*", "agent_run_resources.json")):
    f = load(p) or {}; tid = f.get("taskId")
    for e in f.get("agentRunResources", []):
        a = e["agentRun"]; k = ("agent", a["agentRunId"]) if a["kind"] == "agent" else ("agent_team", a["teamRunId"])
        if k in origin: df = origin[k]
        else:
            d = e.get("assignedBy"); df = (part_of.get(d) or (e["hostRoot"]["kind"], e["hostRoot"]["runId"]), d)
        entries[k].append((tid, e, df)); task_entries[tid].append((k, e, df))
for k, es in entries.items():
    if k not in origin: continue
    C["runs with entries and an own file"] += 1
    C["  every entry's delegatedFrom equals the run's own"] += all(df == origin[k] for _, _, df in es)
# 3. the DelegationTree from the Task entries
parent = {}
for k, es in entries.items():
    ps = {df[0] for _, _, df in es}
    C["tree nodes with entries"] += 1
    if len(ps) > 1: C["  nodes with two different parents"] += 1
    parent[k] = next(iter(ps))
cycles = 0; depth = collections.Counter(); unstored = 0
for k in parent:
    seen, cur, n = {k}, parent[k], 1
    while cur in parent:
        if cur in seen: cycles += 1; break
        seen.add(cur); cur = parent[cur]; n += 1
    depth[n] += 1
    if cur not in stored: unstored += 1
C["tree: cycles"] = cycles; C["tree: chains whose top is not a stored run"] = unstored
for n in sorted(depth): C[f"tree: depth {n}"] = depth[n]
C["tree: top runs (runs that delegated and were not delegated)"] = len({parent[k] for k in parent} - set(parent))
# 4. the message rule on the tree vs. on the records
def task_set(k): return {t for t, _, _ in entries.get(k, [])}
def assigner_runs(tid): return {df[0] for (k, e, df) in task_entries[tid] if e.get("role") == "assigned"}
agree = differ = 0
pairs = set()
for k in entries:
    for t in task_set(k):
        for (k2, _, _) in task_entries[t]:
            if k2 != k: pairs.add(tuple(sorted([k, k2])))
        for a in assigner_runs(t): pairs.add(tuple(sorted([k, a])))
for a, b in pairs:
    rec = bool(task_set(a) & task_set(b)) or any(a in assigner_runs(t) for t in task_set(b)) or any(b in assigner_runs(t) for t in task_set(a))
    def tree_assigner(x, t):  # the run that assigned Task t, found on the tree: the parent of t's assigned run
        return {parent[k2] for (k2, e, _) in task_entries[t] if e.get("role") == "assigned" and k2 in parent}
    tree = bool(task_set(a) & task_set(b)) or any(a in tree_assigner(b, t) for t in task_set(b)) or any(b in tree_assigner(a, t) for t in task_set(a))
    if rec == tree: agree += 1
    else: differ += 1
C["message rule: run pairs checked"] = len(pairs); C["  same answer on the tree and on the records"] = agree; C["  different answer"] = differ
for k in sorted(C): print(f"{C[k]:6d}  {k}")

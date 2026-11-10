"""Read-only split of nested delegated runs (contract E3) by the delegator's run kind and by depth (autobyteus-461, AR-005).

Usage: python3 -I validate_nested_chains.py <server-data dir>. Prints counts only.
"""
import collections, glob, json, os, sys
root = sys.argv[1]; mem = os.path.join(root, "memory"); C = collections.Counter()
def load(p):
    try:
        with open(p) as h: return json.load(h)
    except Exception: return None
agents, teams, orgs, owner = {}, {}, {}, {}
for p in glob.glob(os.path.join(mem, "agents", "*", "run_metadata.json")):
    m = load(p)
    if m: agents[m["runId"]] = m; owner[m["runId"]] = ("agent", m["runId"])
for p in glob.glob(os.path.join(mem, "agent_teams", "*", "team_run_execution_tree.json")):
    t = load(p)
    if t:
        teams[t["rootTeam"]["teamRunId"]] = t
        for mb in t["rootTeam"].get("members", []):
            if "agentRunId" in mb: owner[mb["agentRunId"]] = ("agent_team", t["rootTeam"]["teamRunId"])
for p in glob.glob(os.path.join(mem, "agent_orgs", "*", "agent_org_run_execution_tree.json")):
    t = load(p)
    if t:
        orgs[t["rootOrg"]["orgRunId"]] = t
        for mb in t["rootOrg"].get("members", []):
            if "agentRunId" in mb: owner[mb["agentRunId"]] = ("agent_org", t["rootOrg"]["orgRunId"])
            for inner in mb.get("members", []):
                if "agentRunId" in inner: owner[inner["agentRunId"]] = ("agent_org", t["rootOrg"]["orgRunId"])
def section(ref):
    kind, rid = ref
    if kind == "agent": return agents.get(rid, {}).get("taskAgent")
    if kind == "agent_team": return (teams.get(rid) or {}).get("taskAgent")
    return None
delegated = [("agent", r) for r, m in agents.items() if "taskAgent" in m] + [("agent_team", r) for r, t in teams.items() if t.get("taskAgent")]
def one_hop(ref):
    s = section(ref); d = s.get("delegatorAgentRunId")
    return owner.get(d) if d else None
def depth(ref, seen=()):
    """Number of delegated runs above this one (0: its delegator is in a run the user started)."""
    up = one_hop(ref)
    if not up or section(up) is None or up in seen: return 0
    return 1 + depth(up, seen + (ref,))
for ref in delegated:
    s = section(ref); top = (s["coordinatingRun"]["kind"], s["coordinatingRun"]["runId"]); up = one_hop(ref)
    if not up or up == top: continue
    C["nested.total"] += 1
    C[f"nested.delegator_in_delegated_{up[0]}_run"] += 1
    C[f"nested.this_run_kind={ref[0]}"] += 1
    C[f"nested.depth={depth(ref)}"] += 1
    C[f"nested.top_kind={top[0]}"] += 1
    # the chain's first hop below the top: which kind of run did the top delegate to
    first = up
    while one_hop(first) and section(one_hop(first)) is not None: first = one_hop(first)
    C[f"nested.first_delegated_run_below_top_is_{first[0]}"] += 1
    C["nested.intermediate_holder_exists" if (up[1] in agents or up[1] in teams) else "nested.intermediate_holder_missing"] += 1
# delegated agent runs that already have a collaboration tree (their address place)
for kind, rid in delegated:
    if kind == "agent":
        C["delegated_agent.has_collaboration_tree" if os.path.exists(os.path.join(mem, "agents", rid, "collaboration", "collaboration_tree.json")) else "delegated_agent.no_collaboration_tree"] += 1
# delegated team runs whose own tree already lists links (should be 0 today)
for rid, t in teams.items():
    if t.get("taskAgent") and t["rootTeam"].get("taskExecutions"): C["delegated_team.own_tree_already_has_links"] += 1
# history index rows for delegated runs today
def rows(path, key):
    d = load(os.path.join(mem, path)) or {}
    r = d.get("rows") if isinstance(d, dict) else d
    if isinstance(r, dict): return set(r.keys())
    return {x.get(key) for x in (r or []) if isinstance(x, dict)}
ar = rows("run_history_index.json", "runId"); tr = rows("team_run_history_index.json", "teamRunId")
C["delegated_agent.has_history_row"] = len([1 for k, r in delegated if k == "agent" and r in ar])
C["delegated_team.has_history_row"] = len([1 for k, r in delegated if k == "agent_team" and r in tr])
bp = os.path.join(root, "restart-resume", "busy-runs.json")
C["busy_runs_record.present"] = int(os.path.exists(bp))
for k in sorted(C): print(f"{C[k]:6d}  {k}")

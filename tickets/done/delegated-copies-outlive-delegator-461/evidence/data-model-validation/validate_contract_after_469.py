"""Read-only: re-validate the 461 contract on the user's data after autobyteus-469 (counts only).
Usage: python3 -I validate_contract_after_469.py <server-data dir>
"""
import collections, glob, json, os, re, sys
root = sys.argv[1]; mem = os.path.join(root, "memory"); C = collections.Counter()
def load(p):
    try:
        with open(p) as h: return json.load(h)
    except Exception: return None
# --- delegated runs on this node: own files with a taskAgent section
own = {}   # run id -> {kind, coordinatingRun, delegator, address, members}
for p in glob.glob(os.path.join(mem, "agents", "*", "run_metadata.json")):
    m = load(p)
    if m and m.get("taskAgent"): own[m["runId"]] = dict(kind="agent", ta=m["taskAgent"], members={m["runId"]}, definition=m.get("agentDefinitionId"))
    if m and m.get("delegatedFrom"): C["agent runs started by a peer (delegatedFrom)"] += 1
for p in glob.glob(os.path.join(mem, "agent_teams", "*", "team_run_execution_tree.json")):
    t = load(p)
    if t and t.get("taskAgent"):
        rt = t["rootTeam"]; own[rt["teamRunId"]] = dict(kind="team", ta=t["taskAgent"], members={x["agentRunId"] for x in rt.get("members", []) if "agentRunId" in x})
    if t and t.get("delegatedFrom"): C["team runs started by a peer (delegatedFrom)"] += 1
C["delegated runs (own file with taskAgent)"] = len(own)
C["  agent"] = sum(1 for v in own.values() if v["kind"] == "agent"); C["  team"] = len(own) - C["  agent"]
# --- top runs and the agents that are their own parts
part_of = {}   # agent run id -> ("agent"|"agent_team"|"agent_org", run id)
for p in glob.glob(os.path.join(mem, "agents", "*", "run_metadata.json")):
    m = load(p)
    if m and not m.get("taskAgent"): part_of[m["runId"]] = ("agent", m["runId"])
for p in glob.glob(os.path.join(mem, "agent_teams", "*", "team_run_execution_tree.json")):
    t = load(p)
    if t and not t.get("taskAgent"):
        for x in t["rootTeam"].get("members", []):
            if "agentRunId" in x: part_of[x["agentRunId"]] = ("agent_team", t["rootTeam"]["teamRunId"])
for p in glob.glob(os.path.join(mem, "agent_orgs", "*", "agent_org_run_execution_tree.json")):
    t = load(p)
    if t:
        for x in t["rootOrg"].get("members", []):
            if "agentRunId" in x: part_of[x["agentRunId"]] = ("agent_org", t["rootOrg"]["orgRunId"])
            for y in x.get("members", []):
                if "agentRunId" in y: part_of[y["agentRunId"]] = ("agent_org", t["rootOrg"]["orgRunId"])
for rid, v in own.items():
    for a in v["members"]: part_of.setdefault(a, ("agent" if v["kind"] == "agent" else "agent_team", rid))
# --- one-hop delegating run of every delegated run
nested = 0
for rid, v in own.items():
    d = v["ta"].get("delegatorAgentRunId"); co = v["ta"]["coordinatingRun"]
    if not d: C["one hop: no delegator recorded (old)"] += 1; v["hop"] = (co["kind"], co["runId"]); continue
    hop = part_of.get(d)
    if not hop: C["one hop: delegator's run not stored"] += 1; v["hop"] = (co["kind"], co["runId"]); continue
    v["hop"] = hop
    if hop == (co["kind"], co["runId"]): C["one hop: delegating run = today's coordinating run"] += 1
    elif hop[1] in own: C["one hop: delegating run is a delegated run (nested)"] += 1
    else: C["one hop: other"] += 1
# --- Task records
entries = collections.defaultdict(list)
for p in glob.glob(os.path.join(root, "projects", "*", "tasks", "*", "agent_run_resources.json")) + glob.glob(os.path.join(root, "ad-hoc-tasks", "*", "agent_run_resources.json")):
    f = load(p) or {}
    for e in f.get("agentRunResources", []):
        a = e["agentRun"]; rid = a.get("agentRunId") or a.get("teamRunId")
        entries[rid].append(e); C["Task record entries"] += 1; C[f"  role {e.get('role')}"] += 1
local_entries = [(rid, e) for rid, es in entries.items() for e in es if rid in own]
remote_entries = [(rid, e) for rid, es in entries.items() for e in es if rid not in own]
C["Task record entries of a run on this node"] = len(local_entries)
C["Task record entries of a run not on this node"] = len(remote_entries)
for rid, e in local_entries:
    h = e["hostRoot"]; co = own[rid]["ta"]["coordinatingRun"]; hop = own[rid]["hop"]
    C["  hostRoot = own file's coordinatingRun"] += (h["kind"], h["runId"]) == (co["kind"], co["runId"])
    C["  hostRoot = one-hop delegating run"] += (h["kind"], h["runId"]) == hop
    if e.get("role") == "assigned":
        C["  assigned: assignedBy = own file's delegator"] += e.get("assignedBy") == own[rid]["ta"].get("delegatorAgentRunId")
        if e.get("recipientAddress"): C["  assigned: recipientAddress = own file's address"] += e["recipientAddress"] == own[rid]["ta"].get("address")
for rid, e in remote_entries: C["  remote entry keys: " + ",".join(sorted(e.keys()))] += 1
open_runs = {rid for rid, es in entries.items() if any(e.get("closedAt") is None for e in es)}
C["delegated runs with an open Task entry"] = len(open_runs & set(own))
C["delegated runs without any Task record"] = len(set(own) - set(entries))
C["delegated runs without any Task record that record a delegator"] = sum(1 for r in set(own) - set(entries) if own[r]["ta"].get("delegatorAgentRunId"))
# open runs grouped two ways
by_host = collections.Counter(); by_hop = collections.Counter()
for rid in open_runs & set(own):
    e = next(e for e in entries[rid] if e.get("closedAt") is None)
    by_host[(e["hostRoot"]["kind"], e["hostRoot"]["runId"])] += 1; by_hop[own[rid]["hop"]] += 1
C["runs that hold open delegated runs, by hostRoot"] = len(by_host); C["runs that hold open delegated runs, one hop"] = len(by_hop)
# --- standalone tree files after 469
for p in glob.glob(os.path.join(mem, "agents", "*", "collaboration", "collaboration_tree.json")):
    t = load(p); rid = os.path.basename(os.path.dirname(os.path.dirname(p)))
    C["standalone tree files"] += 1
    if rid in own: C["  of a delegated agent run (it delegated itself, D6)"] += 1
    es = t.get("taskExecutions", [])
    C["  holding a link to a run on another node"] += any("nodeId" in e for e in es)
    C["  links to runs on another node"] += sum(1 for e in es if "nodeId" in e)
    C["  still holding old local entries (dropped at the next save)"] += any("nodeId" not in e for e in es)
    m = load(os.path.join(mem, "agents", rid, "run_metadata.json")) or {}
    leaf = t["host"]["address"].strip("/").replace("_", "-")
    C["  host address leaf equals the definition id"] += leaf == m.get("agentDefinitionId")
# delegated agent runs whose address leaf differs from the definition id
C["delegated agent runs whose address is not the definition id"] = sum(1 for v in own.values() if v["kind"] == "agent" and v["ta"].get("address", "").strip("/").replace("_", "-") != v.get("definition"))
for k in sorted(C): print(f"{C[k]:6d}  {k}")

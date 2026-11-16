"""Read-only: who messages whom across runs today (autobyteus-461, AR-002). Counts only; no content.

Usage: python3 -I measure_cross_run_messages.py <server-data dir>
"""
import collections, glob, json, os, sys
root = sys.argv[1]; mem = os.path.join(root, "memory"); C = collections.Counter()
def load(p):
    try:
        with open(p) as h: return json.load(h)
    except Exception: return None
run_of, section_of = {}, {}   # agentRunId -> run key ; run key -> taskAgent section (None: not delegated)
for p in glob.glob(os.path.join(mem, "agents", "*", "run_metadata.json")):
    m = load(p)
    if m: k = ("agent", m["runId"]); run_of[m["runId"]] = k; section_of[k] = m.get("taskAgent")
for p in glob.glob(os.path.join(mem, "agent_teams", "*", "team_run_execution_tree.json")):
    t = load(p)
    if t:
        k = ("agent_team", t["rootTeam"]["teamRunId"]); section_of[k] = t.get("taskAgent")
        for mb in t["rootTeam"].get("members", []):
            if "agentRunId" in mb: run_of[mb["agentRunId"]] = k
for p in glob.glob(os.path.join(mem, "agent_orgs", "*", "agent_org_run_execution_tree.json")):
    t = load(p)
    if t:
        k = ("agent_org", t["rootOrg"]["orgRunId"]); section_of[k] = None
        for mb in t["rootOrg"].get("members", []):
            if "agentRunId" in mb: run_of[mb["agentRunId"]] = k
            for inner in mb.get("members", []):
                if "agentRunId" in inner: run_of[inner["agentRunId"]] = k
task_of = collections.defaultdict(set)   # run key -> task ids
for p in glob.glob(os.path.join(root, "projects", "*", "tasks", "*", "agent_run_resources.json")) + glob.glob(os.path.join(root, "ad-hoc-tasks", "*", "agent_run_resources.json")):
    r = load(p) or {}
    for e in r.get("agentRunResources", []):
        a = e["agentRun"]; k = ("agent", a["agentRunId"]) if a["kind"] == "agent" else ("agent_team", a["teamRunId"])
        task_of[k].add(r.get("taskId"))
seen = set()
logs = glob.glob(os.path.join(mem, "agents", "*", "collaboration", "communication_messages_*.jsonl")) + \
    glob.glob(os.path.join(mem, "agents", "*", "communication_messages_*.jsonl")) + \
    glob.glob(os.path.join(mem, "agent_teams", "*", "team_communication_messages_*.jsonl")) + \
    glob.glob(os.path.join(mem, "agent_orgs", "*", "agent_org_communication_messages_*.jsonl"))
C["log_files"] = len(logs)
for p in logs:
    try: lines = open(p).read().splitlines()
    except Exception: continue
    for line in lines:
        try: m = json.loads(line)
        except Exception: continue
        mid = m.get("messageId")
        if not mid or mid in seen: continue
        seen.add(mid)
        s, r = m.get("senderAgentRunId"), m.get("receiverAgentRunId")
        ks, kr = run_of.get(s), run_of.get(r)
        if not ks or not kr: C["messages.endpoint_not_in_a_stored_run"] += 1; continue
        if ks == kr: C["messages.inside_one_run"] += 1; continue
        C["messages.between_two_runs"] += 1
        ss, sr = section_of.get(ks), section_of.get(kr)
        if sr and sr.get("delegatorAgentRunId") == s: C["  delegator -> the run it delegated"] += 1
        elif ss and ss.get("delegatorAgentRunId") == r: C["  delegated run -> its delegator"] += 1
        else:
            C["  NOT a delegator/delegated pair"] += 1
            same = bool(task_of.get(ks, set()) & task_of.get(kr, set()))
            both = bool(ss) and bool(sr)
            C[f"    both delegated={both}, share a Task={same}"] += 1
            top = lambda sec: (sec["coordinatingRun"]["kind"], sec["coordinatingRun"]["runId"]) if sec else None
            if ss and top(ss) == kr: C["    sender's coordinating run is the receiver's run (to the top, more than one hop or to another agent of it)"] += 1
            elif sr and top(sr) == ks: C["    receiver's coordinating run is the sender's run (from the top or another agent of it)"] += 1
            elif ss and sr and top(ss) == top(sr): C["    two delegated runs of the same coordinating run"] += 1
            else: C["    other"] += 1
for k in C: print(f"{C[k]:7d}  {k}")

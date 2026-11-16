"""Read-only checks for "a link exists only while its Task is open; the Task's record is the lasting record" (autobyteus-461).
Counts only. Usage: python3 -I validate_task_record_as_lasting_record.py <server-data dir>
"""
import collections, glob, json, os, sys
root = sys.argv[1]; mem = os.path.join(root, "memory"); C = collections.Counter()
def load(p):
    try:
        with open(p) as h: return json.load(h)
    except Exception: return None
sec, owner, agents_of = {}, {}, collections.defaultdict(set)
for p in glob.glob(os.path.join(mem, "agents", "*", "run_metadata.json")):
    m = load(p)
    if m: k = ("agent", m["runId"]); sec[k] = m.get("taskAgent"); owner[m["runId"]] = k; agents_of[k].add(m["runId"])
for p in glob.glob(os.path.join(mem, "agent_teams", "*", "team_run_execution_tree.json")):
    t = load(p)
    if t:
        k = ("agent_team", t["rootTeam"]["teamRunId"]); sec[k] = t.get("taskAgent")
        for mb in t["rootTeam"].get("members", []):
            if "agentRunId" in mb: owner[mb["agentRunId"]] = k; agents_of[k].add(mb["agentRunId"])
for p in glob.glob(os.path.join(mem, "agent_orgs", "*", "agent_org_run_execution_tree.json")):
    t = load(p)
    if t:
        k = ("agent_org", t["rootOrg"]["orgRunId"]); sec[k] = None
        for mb in t["rootOrg"].get("members", []):
            if "agentRunId" in mb: owner[mb["agentRunId"]] = k; agents_of[k].add(mb["agentRunId"])
            for inner in mb.get("members", []):
                if "agentRunId" in inner: owner[inner["agentRunId"]] = k; agents_of[k].add(inner["agentRunId"])
delegated = {k for k, s in sec.items() if s}
# Task records
entries = collections.defaultdict(list)   # run key -> [(taskId, role, assignedBy, closed)]
tasks = collections.defaultdict(list)     # taskId -> [(run key, role, assignedBy, closed)]
for p in glob.glob(os.path.join(root, "projects", "*", "tasks", "*", "agent_run_resources.json")) + glob.glob(os.path.join(root, "ad-hoc-tasks", "*", "agent_run_resources.json")):
    r = load(p) or {}
    for e in r.get("agentRunResources", []):
        a = e["agentRun"]; k = ("agent", a["agentRunId"]) if a["kind"] == "agent" else ("agent_team", a["teamRunId"])
        rec = (r.get("taskId"), e.get("role"), e.get("assignedBy"), bool(e.get("closedAt")))
        entries[k].append(rec); tasks[r.get("taskId")].append((k,) + rec[1:])
# V-A every delegated run has a Task record
for k in delegated:
    es = entries.get(k)
    if not es: C["A. delegated run with NO Task record (its link would stay for good)"] += 1
    else:
        C["A. delegated run with a Task record"] += 1
        C["A.   … every record closed (link dropped)" if all(e[3] for e in es) else "A.   … an open record (link kept)"] += 1
# V-B closed runs: the dropped link's facts are still somewhere
for k in delegated:
    es = entries.get(k)
    if not es or not all(e[3] for e in es): continue
    s = sec[k]
    has_assigner = any(e[1] == "assigned" and e[2] for e in es)
    has_delegator = bool(s.get("delegatorAgentRunId"))
    C["B. dropped link: delegator recoverable (assigned entry's assigner or the run's own back-link)" if (has_assigner or has_delegator) else "B. dropped link: delegator NOT recoverable"] += 1
    if has_assigner and has_delegator and not any(e[2] == s.get("delegatorAgentRunId") for e in es if e[1] == "assigned"):
        C["B.   note: assigner in the Task record differs from the run's delegator"] += 1
# V-C live links per holder kind
live = collections.Counter(); dropped = collections.Counter()
for k in delegated:
    top = sec[k]["coordinatingRun"]["kind"]; es = entries.get(k)
    (dropped if (es and all(e[3] for e in es)) else live)[top] += 1
for kind in ("agent", "agent_team", "agent_org"):
    C[f"C. links kept, holder kind {kind}"] = live[kind]; C[f"C. links dropped (Task closed), holder kind {kind}"] = dropped[kind]
# V-D "everything that ever worked below a run": links (today) versus Task records
def below_by_links(h): return {k for k in delegated if (sec[k]["coordinatingRun"]["kind"], sec[k]["coordinatingRun"]["runId"]) == h}
def below_by_tasks(h):
    mine = set(agents_of[h]); found = set()
    grew = True
    while grew:
        grew = False
        for k in delegated:
            if k in found: continue
            es = entries.get(k, [])
            d = sec[k].get("delegatorAgentRunId")
            if any(e[1] == "assigned" and e[2] in mine for e in es) or (d in mine and any(e[1] != "assigned" for e in es)):
                found.add(k); mine |= agents_of[k]; grew = True
    return found
holders = {(s["coordinatingRun"]["kind"], s["coordinatingRun"]["runId"]) for s in sec.values() if s}
for h in holders:
    a, b = below_by_links(h), below_by_tasks(h)
    C["D. holder: same set by links and by Task records" if a == b else "D. holder: sets differ"] += 1
    C["D.   runs found by links but not by Task records"] += len(a - b); C["D.   runs found by Task records but not by links"] += len(b - a)
# V-E message routes
task_ids = lambda k: {e[0] for e in entries.get(k, [])}
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
        ss, sr = sec.get(ks), sec.get(kr)
        if (sr and sr.get("delegatorAgentRunId") == s) or (ss and ss.get("delegatorAgentRunId") == r): C["E. message on a link"] += 1; continue
        same = bool(task_ids(ks) & task_ids(kr))
        assigner = any(e[1] == "assigned" and e[2] == s for t in task_ids(kr) for e in tasks[t]) or any(e[1] == "assigned" and e[2] == r for t in task_ids(ks) for e in tasks[t])
        C["E. message found through the Task's record (same Task, or the Task's assigner)" if (same or assigner) else "E. message on neither route"] += 1
for k in sorted(C): print(f"{C[k]:6d}  {k}")

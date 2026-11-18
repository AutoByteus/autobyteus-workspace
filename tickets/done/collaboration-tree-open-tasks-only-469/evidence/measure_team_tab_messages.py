"""Read-only: what a standalone top run's Team tab is composed of today (autobyteus-469, DEC-001).
Counts only. Usage: python3 -I measure_team_tab_messages.py <server-data dir>
For the top run with the largest tree: messages of its own log, and messages that only the listed runs' logs hold,
split by whether the listed run's Tasks are all closed.
"""
import collections, glob, json, os, sys
root = sys.argv[1]; mem = os.path.join(root, "memory")
def load(p):
    try:
        with open(p) as h: return json.load(h)
    except Exception: return None
def lines(paths):
    for p in paths:
        try: text = open(p).read()
        except Exception: continue
        for line in text.splitlines():
            try: yield json.loads(line)
            except Exception: pass
# Task state per delegated run
state = collections.defaultdict(list)
for p in glob.glob(os.path.join(root, "projects", "*", "tasks", "*", "agent_run_resources.json")) + glob.glob(os.path.join(root, "ad-hoc-tasks", "*", "agent_run_resources.json")):
    for e in (load(p) or {}).get("agentRunResources", []):
        a = e["agentRun"]; k = ("agent", a["agentRunId"]) if a["kind"] == "agent" else ("team", a["teamRunId"])
        state[k].append(e.get("closedAt") is not None)
trees = sorted(glob.glob(os.path.join(mem, "agents", "*", "collaboration", "collaboration_tree.json")), key=os.path.getsize)
top = trees[-1]; tree = load(top); cdir = os.path.dirname(top)
host = tree["host"]["agentRunId"]
ids = {host}; owner = {host: ("host", host)}; C = collections.Counter()
entries = []
for e in tree["taskExecutions"]:
    if "agentRunId" in e:
        k = ("agent", e["agentRunId"]); ids.add(e["agentRunId"]); owner[e["agentRunId"]] = k
        logs = glob.glob(os.path.join(mem, "agents", e["agentRunId"], "communication_messages_*.jsonl")) + glob.glob(os.path.join(mem, "agents", e["agentRunId"], "collaboration", "communication_messages_*.jsonl"))
    elif "teamRunId" in e:
        k = ("team", e["teamRunId"])
        t = load(os.path.join(mem, "agent_teams", e["teamRunId"], "team_run_execution_tree.json")) or {}
        def walk(node):
            for mb in node.get("members", []):
                if "agentRunId" in mb: ids.add(mb["agentRunId"]); owner[mb["agentRunId"]] = k
                walk(mb)
        walk(t.get("rootTeam", {}))
        for inner in t.get("taskExecutions", []):   # runs the delegated team delegated to
            if "agentRunId" in inner: ids.add(inner["agentRunId"]); owner[inner["agentRunId"]] = ("nested", inner["agentRunId"])
        logs = glob.glob(os.path.join(mem, "agent_teams", e["teamRunId"], "team_communication_messages_*.jsonl"))
    else: continue
    closed = bool(state.get(k)) and all(state[k])
    entries.append((k, closed, logs))
own = {}
for m in lines(glob.glob(os.path.join(cdir, "communication_messages_*.jsonl"))):
    if m.get("messageId"): own[m["messageId"]] = m
C["own log: messages"] = len(own)
closed_keys = {k for k, c, _ in entries if c}
for m in own.values():
    s, r = m.get("senderAgentRunId"), m.get("receiverAgentRunId")
    other = owner.get(r) if s == host else owner.get(s)
    if other is None: C["own log:   with a run not in the tree"] += 1
    elif other in closed_keys: C["own log:   with a run of closed Tasks"] += 1
    else: C["own log:   with a listed run whose Task is open or that has no Task"] += 1
seen = set(own)
for k, closed, logs in entries:
    for m in lines(logs):
        mid = m.get("messageId")
        if not mid or mid in seen: continue
        seen.add(mid)
        s, r = m.get("senderAgentRunId"), m.get("receiverAgentRunId")
        if s not in ids or r not in ids:
            C["listed runs' logs only: not shown today (an endpoint is not in the tree)"] += 1; continue
        C["listed runs' logs only: shown today"] += 1
        C["listed runs' logs only:   log of a run of closed Tasks" if closed else "listed runs' logs only:   log of a run whose Task is open or that has no Task"] += 1
        C["listed runs' logs only:   inside one delegated team" if owner.get(s) == owner.get(r) else "listed runs' logs only:   between two different runs"] += 1
print("entries", len(entries), "closed", sum(1 for _, c, _ in entries if c))
for k in sorted(C): print(f"{C[k]:6d}  {k}")

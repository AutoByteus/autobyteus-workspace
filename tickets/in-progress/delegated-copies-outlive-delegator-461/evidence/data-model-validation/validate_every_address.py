"""Read-only: every send_message_to by recipient_address that agents made, replayed against the target address rules
(contract §10.7). Counts and definition-level addresses only; no message content is printed.
Usage: python3 -I validate_every_address.py <server-data dir>

For each addressed send found in the agents' raw traces (tool call + its result):
  - today's outcome (DELIVERED or the error code) and today's receiver (matched in the sender's run's message log);
  - the case it belongs to (§10.7), and the address the same agent uses for the same receiver after the change
    (a delegated team's member addresses lose the team's prefix; every other address is unchanged);
  - the receiver the target rules give for that address: (1) the sender's own team, deepest first, no fall-through;
    (2) the standing agents of the run that assigned the sender's Task; (3) the sender's own run's standing agents.
"""
import collections, glob, json, os, re, sys
root = sys.argv[1]; mem = os.path.join(root, "memory"); C = collections.Counter(); EX = collections.defaultdict(set)
def load(p):
    try:
        with open(p) as h: return json.load(h)
    except Exception: return None
run_of = {}        # agent run id -> run key
addr_of = {}       # agent run id -> its address as stored today
mount = {}         # delegated team run key -> its prefix today
teams = {}         # run key -> {"members": {local address: agent id}, "subteams": {local address: coordinator id}, "coord": id}
standing = {}      # run key -> {address: agent id} the run's standing agents, in its own space
delegated = set()  # run keys of delegated runs (taskAgent present)
def local(k, a):
    p = mount.get(k)
    if p and (a == p or a.startswith(p + "/")): return a[len(p):] or "/"
    return a
for p in glob.glob(os.path.join(mem, "agents", "*", "run_metadata.json")):
    m = load(p)
    if not m: continue
    k = ("agent", m["runId"]); run_of[m["runId"]] = k
    ta = m.get("taskAgent")
    tree = load(os.path.join(os.path.dirname(p), "collaboration", "collaboration_tree.json")) or {}
    a = (ta or {}).get("address") or (tree.get("host") or {}).get("address") or "/" + m["agentDefinitionId"].replace("-", "_")
    addr_of[m["runId"]] = a; standing[k] = {a: m["runId"]}
    if ta: delegated.add(k)
for p in glob.glob(os.path.join(mem, "agent_teams", "*", "team_run_execution_tree.json")):
    t = load(p)
    if not t: continue
    rt = t["rootTeam"]; k = ("agent_team", rt["teamRunId"])
    if t.get("taskAgent"): delegated.add(k); mount[k] = rt["address"]
    mem_, sub = {}, {}
    for x in rt.get("members", []):
        if "agentRunId" in x:
            run_of[x["agentRunId"]] = k; addr_of[x["agentRunId"]] = x["address"]; mem_[local(k, x["address"])] = x["agentRunId"]
    coord = mem_.get(local(k, rt.get("coordinatorAddress", "")))
    teams[k] = {"members": mem_, "coord": coord}
    standing[k] = dict(mem_)
for p in glob.glob(os.path.join(mem, "agent_orgs", "*", "agent_org_run_execution_tree.json")):
    t = load(p)
    if not t: continue
    ro = t["rootOrg"]; k = ("agent_org", ro["orgRunId"]); st = {}
    for x in ro.get("members", []):
        if "agentRunId" in x: run_of[x["agentRunId"]] = k; addr_of[x["agentRunId"]] = x["address"]; st[x["address"]] = x["agentRunId"]
        if "members" in x:
            sub = {}
            for y in x["members"]:
                if "agentRunId" in y: run_of[y["agentRunId"]] = k; addr_of[y["agentRunId"]] = y["address"]; st[y["address"]] = y["agentRunId"]; sub[y["address"]] = y["agentRunId"]
            ca = x.get("coordinatorAddress")
            if ca in sub: st[x["address"]] = sub[ca]
            teams[("org_team", x["address"], ro["orgRunId"])] = {"members": sub, "coord": sub.get(ca), "prefix": x["address"]}
    standing[k] = st
# Tasks: run key -> its Tasks; Task -> assigner runs
tasks_of = collections.defaultdict(set); assigners = collections.defaultdict(set)
for p in glob.glob(os.path.join(root, "projects", "*", "tasks", "*", "agent_run_resources.json")) + glob.glob(os.path.join(root, "ad-hoc-tasks", "*", "agent_run_resources.json")):
    f = load(p) or {}; tid = f.get("taskId") or p
    for e in f.get("agentRunResources", []):
        a = e["agentRun"]; k = ("agent", a["agentRunId"]) if a["kind"] == "agent" else ("agent_team", a.get("teamRunId"))
        tasks_of[k].add(tid)
        if e.get("role") == "assigned" and run_of.get(e.get("assignedBy")): assigners[tid].add(run_of[e["assignedBy"]])
def org_team_of(sender):
    k = run_of.get(sender)
    if not k or k[0] != "agent_org": return None
    for tk, tv in teams.items():
        if tk[0] == "org_team" and tk[2] == k[1] and sender in tv["members"].values(): return tv
    return None
def target_resolve(sender, a):
    """The receiver after the change, and the step that found it; None when not found."""
    k = run_of.get(sender)
    if k is None: return None, "unknown sender"
    # (1) own team, deepest first, no fall-through
    if k[0] == "agent_team":
        tv = teams[k]
        if a in tv["members"]: return tv["members"][a], "1 own team"
    ot = org_team_of(sender)
    if ot:
        pre = ot["prefix"]
        if a == pre: return ot["coord"], "1 own team (its address)"
        if a.startswith(pre + "/"): return (ot["members"].get(a), "1 own team") if a in ot["members"] else (None, "1 own team: miss, no fall-through")
    # (2) the standing agents of the run that assigned the sender's Task
    if k in delegated:
        for tid in tasks_of.get(k, ()):
            for ar in assigners[tid]:
                if a in standing.get(ar, {}): return standing[ar][a], "2 assigner's run"
        return None, "not found"
    # (3) the sender's own run's standing agents
    if a in standing.get(k, {}): return standing[k][a], "3 own run"
    return None, "not found"
def case_of(sender, today_rcv):
    ks, kr = run_of.get(sender), run_of.get(today_rcv)
    sk = ("delegated " if ks in delegated else "user-started ") + (ks[0] if ks else "?")
    if kr is None: return sk + " -> (not delivered)"
    if ks == kr: return sk + " -> same run"
    rk = ("delegated " if kr in delegated else "user-started ") + kr[0]
    rel = "its Task's assigner run" if any(kr in assigners[t] for t in tasks_of.get(ks, ())) else ("a run it assigned" if any(ks in assigners[t] for t in tasks_of.get(kr, ())) else "other")
    return f"{sk} -> {rk} ({rel})"
# message logs: (sender, content) -> receivers
rcv = collections.defaultdict(list)
for p in glob.glob(os.path.join(mem, "**", "*communication_messages_*.jsonl"), recursive=True):
    try: lines = open(p).read().splitlines()
    except Exception: continue
    for line in lines:
        try: m = json.loads(line)
        except Exception: continue
        rcv[(m.get("senderAgentRunId"), m.get("content"))].append(m.get("receiverAgentRunId"))
for p in glob.glob(os.path.join(mem, "agents", "*", "raw_traces*.jsonl")) + glob.glob(os.path.join(mem, "agent_teams", "*", "*", "raw_traces*.jsonl")) + glob.glob(os.path.join(mem, "agent_orgs", "*", "**", "raw_traces*.jsonl"), recursive=True):
    sender = os.path.basename(os.path.dirname(p))
    calls, results = {}, {}
    try: lines = open(p).read().splitlines()
    except Exception: continue
    for line in lines:
        if '"send_message_to"' not in line: continue
        try: r = json.loads(line)
        except Exception: continue
        if r.get("trace_type") == "tool_call": calls[r.get("tool_call_id")] = r.get("tool_args") or {}
        elif r.get("trace_type") == "tool_result": results[r.get("tool_call_id")] = r
    for cid, args in calls.items():
        a = args.get("recipient_address")
        if not a: continue
        res = results.get(cid)
        if not res: C["addressed sends without a stored result"] += 1; continue
        raw = res.get("tool_result"); txt = raw if isinstance(raw, str) else json.dumps(raw)
        err = res.get("tool_error"); etxt = err if isinstance(err, str) else json.dumps(err)
        mt = re.search(r'target_agent_run_id"\s*:\s*"([^"]+)"', txt)
        if ("Delivered message" in txt or '"DELIVERED"' in txt or "Message delivered" in txt) and not err: code = "DELIVERED"
        else:
            mc = re.search(r"\b((?:COLLABORATION|TASK|AGENT|INVALID)_[A-Z_]+)", txt + " " + etxt)
            code = mc.group(1) if mc else "ERROR"
        if run_of.get(sender) is None: C["addressed sends from a run whose file is gone"] += 1; continue
        C["addressed sends"] += 1
        got = [mt.group(1)] if mt else rcv.get((sender, args.get("content")), [])
        today = got[0] if code == "DELIVERED" and got else None
        if code == "DELIVERED" and not got: C["delivered, receiver not found in the logs"] += 1; continue
        k = run_of[sender]
        new_a = local(k, a)
        target, step = target_resolve(sender, new_a)
        cs = case_of(sender, today)
        C[f"case: {cs}"] += 1
        if new_a != a: C["  address changes for this send (delegated team prefix dropped)"] += 1; EX[f"{a} -> {new_a}"].add(1)
        if today:
            ok = target == today
            C[f"delivered today: {'same receiver after' if ok else 'DIFFERENT after'} [{step}]"] += 1
            if not ok:
                EX[f"different: {cs} {a} -> {new_a} [{step}]"].add(1)
                kr = run_of.get(today)
                legacy = "a side without a Task record" if (not tasks_of.get(k) or not tasks_of.get(kr)) else "both sides have Task records"
                when = str(res.get("ts", ""))
                import datetime
                try: when = datetime.datetime.utcfromtimestamp(float(res["ts"])).strftime("%Y-%m")
                except Exception: pass
                C[f"  delivered today, not reached by this address after: {legacy}, {when}"] += 1
                if legacy.startswith("both"):
                    shared = bool(tasks_of.get(k, set()) & tasks_of.get(kr, set()))
                    EX[f"both with Task records: {cs} {a}; one shared Task: {shared}; receiver delegated: {kr in delegated}; receiver is a copy reached by address today"].add(1)
        else:
            C[f"not delivered today ({code}): {'still not found after' if target is None else 'FOUND after'} [{step}]"] += 1
            if code == "ERROR": EX["error text: " + re.sub(r"[0-9a-f]{32}", "<id>", re.sub(r"/[A-Za-z0-9_/]+", "<addr>", (txt + " " + etxt)))[:110]].add(1)
            if target is not None: EX[f"newly found: {cs} {a}"].add(1)
# Collisions: a delegated team's member address (team-local) equal to a standing agent of the run that assigned its Task.
for k in delegated:
    if k[0] != "agent_team": continue
    asg = {ar for t in tasks_of.get(k, ()) for ar in assigners[t]}
    hit = set(teams[k]["members"]) & {a for ar in asg for a in standing.get(ar, {})}
    C["collision: delegated teams whose member address equals an assigner's standing address"] += bool(hit)
    for h in hit: EX[f"collision: {h}"].add(1)
# The sender address each stored message's receiver is given after the change (reachingAddressOf, §10.7 H):
# the sender's address in the sender's own space, only when the receiver resolves it back to the sender.
def own_space_address(agent):
    k = run_of.get(agent); a = addr_of.get(agent)
    return local(k, a) if k and a else None
seen = set()
for (snd, _c), rl in rcv.items():
    for r in rl:
        if (snd, r, _c) in seen or snd == r: continue
        seen.add((snd, r, _c))
        ks, kr = run_of.get(snd), run_of.get(r)
        if not ks or not kr: continue
        a = own_space_address(snd)
        back, step = target_resolve(r, a) if a else (None, "")
        rel = "same run" if ks == kr else ("receiver's Task assigner run" if any(ks in assigners[t] for t in tasks_of.get(kr, ())) else ("a run the receiver assigned" if any(kr in assigners[t] for t in tasks_of.get(ks, ())) else "other runs"))
        C[f"header after: {rel}: " + ("sender address given" if back == snd else "run ID only")] += 1
for k in sorted(C): print(f"{C[k]:6d}  {k}")
print("\nexamples (address strings only):")
for k in sorted(EX)[:60]: print("   ", k)

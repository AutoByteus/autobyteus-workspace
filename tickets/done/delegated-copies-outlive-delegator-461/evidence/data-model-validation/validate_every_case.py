"""Read-only: every case of the collaboration contract (target-collaboration-contract.md §5), checked on the user's data.
Prints counts per case ID; no message content and no user text. Usage: python3 -I validate_every_case.py <server-data dir>

  DL-*  delegation cases: who delegated, from which kind of run, to which kind of run; can the target records be written
        (delegatedFrom one hop, recipientAddress) and do they agree with the run's own file.
  A-*, B-*, C-*  messages by address: every send_message_to(recipient_address) in the agents' traces, replayed under the
        target address rules (own team, then the Task assigner's standing agents, then the own run's standing agents).
  RUN-* runs the user starts: their shapes.
  M-*   message storage: within one run once in its log; between two runs in both logs, one message ID.
  E-*   sender address the receiver is given (reachingAddressOf) for every stored message.
"""
import collections, datetime, glob, json, os, re, sys
root = sys.argv[1]; mem = os.path.join(root, "memory"); C = collections.Counter()
def load(p):
    try:
        with open(p) as h: return json.load(h)
    except Exception: return None
KIND = {"agent": "agents", "agent_team": "agent_teams", "agent_org": "agent_orgs"}
run_of, addr_of, kind, mount, teams, standing, own_file = {}, {}, {}, {}, {}, {}, {}
org_team = {}  # agent run id -> (prefix, {address: id}, coordinator id) for an org's mounted team member
def local(k, a):
    p = mount.get(k)
    return (a[len(p):] or "/") if p and a and (a == p or a.startswith(p + "/")) else a
for p in glob.glob(os.path.join(mem, "agents", "*", "run_metadata.json")):
    m = load(p)
    if not m: continue
    k = ("agents", m["runId"]); run_of[m["runId"]] = k; ta = m.get("taskAgent"); own_file[k] = ta
    tree = load(os.path.join(os.path.dirname(p), "collaboration", "collaboration_tree.json")) or {}
    a = (ta or {}).get("address") or (tree.get("host") or {}).get("address") or "/" + m["agentDefinitionId"].replace("-", "_")
    addr_of[m["runId"]] = a; standing[k] = {a: m["runId"]}; kind[k] = "delegated agent" if ta else "agent"
for p in glob.glob(os.path.join(mem, "agent_teams", "*", "team_run_execution_tree.json")):
    t = load(p)
    if not t: continue
    rt = t["rootTeam"]; k = ("agent_teams", rt["teamRunId"]); ta = t.get("taskAgent"); own_file[k] = ta
    kind[k] = "delegated team" if ta else "team"
    if ta: mount[k] = rt["address"]
    ms = {}
    for x in rt.get("members", []):
        if "agentRunId" in x: run_of[x["agentRunId"]] = k; addr_of[x["agentRunId"]] = x["address"]; ms[local(k, x["address"])] = x["agentRunId"]
    teams[k] = ms; standing[k] = dict(ms)
for p in glob.glob(os.path.join(mem, "agent_orgs", "*", "agent_org_run_execution_tree.json")):
    t = load(p)
    if not t: continue
    ro = t["rootOrg"]; k = ("agent_orgs", ro["orgRunId"]); kind[k] = "org"; st = {}
    for x in ro.get("members", []):
        if "agentRunId" in x: run_of[x["agentRunId"]] = k; addr_of[x["agentRunId"]] = x["address"]; st[x["address"]] = x["agentRunId"]
        if "members" in x:
            sub = {y["address"]: y["agentRunId"] for y in x["members"] if "agentRunId" in y}
            for a, i in sub.items(): run_of[i] = k; addr_of[i] = a; st[a] = i
            co = sub.get(x.get("coordinatorAddress"))
            if co: st[x["address"]] = co
            for i in sub.values(): org_team[i] = (x["address"], sub, co)
    standing[k] = st
delegated = {k for k, v in kind.items() if v.startswith("delegated")}
# ---- runs the user starts (RUN-1 ... RUN-4)
C["RUN-1 agent runs the user started (run_metadata.json without taskAgent)"] = sum(1 for k, v in kind.items() if v == "agent")
for p in glob.glob(os.path.join(mem, "agent_teams", "*", "team_run_execution_tree.json")):
    t = load(p)
    if not t or t.get("taskAgent"): continue
    rt = t["rootTeam"]; ms = {m.get("address") for m in rt.get("members", [])}
    C["RUN-2 team runs the user started"] += 1
    C["RUN-2 ... rooted at / with members as direct children of /"] += rt.get("address") == "/" and all(a and a.count("/") == 1 for a in ms)
    C["RUN-2 ... with handoffs"] += bool(t.get("handoffs"))
    C["RUN-2 ... every handoff from and to a member"] += all(h.get("from") in ms and h.get("to") in ms for h in t.get("handoffs", []))
    C["RUN-2 ... with a nested sub-team"] += any("members" in m for m in rt.get("members", []))
for p in glob.glob(os.path.join(mem, "agent_orgs", "*", "agent_org_run_execution_tree.json")):
    t = load(p)
    if not t: continue
    ro = t["rootOrg"]; addrs = set()
    for m in ro.get("members", []):
        addrs.add(m["address"]); addrs.update(y["address"] for y in m.get("members", []))
        C["RUN-3 ... mounted teams" if "members" in m else "RUN-3 ... direct agents"] += 1
    C["RUN-3 org runs"] += 1; C["RUN-3 ... rooted at /"] += ro.get("address") == "/"
    for h in t.get("handoffs", []): C["RUN-3 ... handoffs"] += 1; C["RUN-3 ... handoffs with from and to in the org"] += h["from"] in addrs and h["to"] in addrs
for pat, name in ((os.path.join(mem, "agent_teams", "*", "task_delegation_records.json"), "team"), (os.path.join(mem, "agent_orgs", "*", "agent_org_task_delegation_records.json"), "org")):
    fs = glob.glob(pat); C[f"RUN-4 retired {name} delegation record files"] = len(fs)
    C["RUN-4 ... records in them"] += sum(len((load(f) or {}).get("records", [])) for f in fs)
# ---- Task entries
tasks_of = collections.defaultdict(set); assigners = collections.defaultdict(set); entries = []
for p in glob.glob(os.path.join(root, "projects", "*", "tasks", "*", "agent_run_resources.json")) + glob.glob(os.path.join(root, "ad-hoc-tasks", "*", "agent_run_resources.json")):
    f = load(p) or {}; tid = f.get("taskId") or p; adhoc = "ad-hoc-tasks" in p
    for i, e in enumerate(f.get("agentRunResources", [])):
        a = e["agentRun"]; k = ("agents", a["agentRunId"]) if a["kind"] == "agent" else ("agent_teams", a.get("teamRunId"))
        entries.append((tid, adhoc, i, e, k))
        if e.get("nodeId"): continue
        tasks_of[k].add(tid)
        if e.get("role") == "assigned" and run_of.get(e.get("assignedBy")): assigners[tid].add(run_of[e["assignedBy"]])
def position(agent):
    k = run_of.get(agent)
    if not k: return None
    if k[0] == "agent_orgs": return "an org's mounted-team member" if agent in org_team else "an org's direct agent"
    return {"agent": "a standalone agent the user started", "team": "a member of a team the user started",
            "delegated team": "a member of a delegated team", "delegated agent": "a delegated agent"}[kind[k]]
CASE = {"a standalone agent the user started": "DL-1", "a member of a team the user started": "DL-2", "an org's direct agent": "DL-3",
        "an org's mounted-team member": "DL-4", "a member of a delegated team": "DL-5", "a delegated agent": "DL-6"}
first_entry = {}
for tid, adhoc, i, e, k in sorted(entries, key=lambda x: x[3].get("linkedAt", "")):
    if e.get("nodeId"): C["DL-9 a delegation to a peer: entries (nodeId, members from the old link)"] += 1; continue
    ta = own_file.get(k)
    delegator = e.get("assignedBy") if e.get("role") == "assigned" else (ta or {}).get("delegatorAgentRunId")
    pos = position(delegator)
    case = CASE.get(pos, "DL-? delegator's run not stored")
    follow = k in first_entry
    first_entry.setdefault(k, (tid, i))
    if follow: case = "DL-7 another Task for a run that already exists"
    elif adhoc: case += " (description-only: a Task with no Project, DL-8)"
    C[f"{case}: entries"] += 1
    C[f"{case}: role {e.get('role')} -> {'subWork' if e.get('role') in ('delegated',) else e.get('role')}"] += 1
    C[f"{case}: delegated run kind {k[0][:-1]}"] += 1
    C[f"{case}: delegatedFrom computable (delegator and its run known)"] += bool(pos)
    C[f"{case}: recipientAddress present or fillable from taskAgent.address"] += bool(e.get("recipientAddress") or (ta or {}).get("address"))
    if ta and pos:
        same = (KIND.get(ta["coordinatingRun"]["kind"]), ta["coordinatingRun"]["runId"]) == run_of[delegator]
        C[f"{case}: one hop equals today's coordinatingRun (else nested)"] += same
C["DL-10 runs a peer started on this node"] = sum(1 for p in glob.glob(os.path.join(mem, "agents", "*", "run_metadata.json")) + glob.glob(os.path.join(mem, "agent_teams", "*", "team_run_execution_tree.json")) if "delegatedFrom" in (load(p) or {}))
C["DL-0 delegated runs with no Task record (ordinary runs of their own, TC-9)"] = sum(1 for k in delegated if not tasks_of.get(k))
# ---- address replay
def resolve(sender, a):
    k = run_of.get(sender)
    if k is None: return None, "?"
    if k[0] == "agent_teams" and a in teams[k]: return teams[k][a], "1"
    if sender in org_team:
        pre, sub, co = org_team[sender]
        if a == pre: return co, "1"
        if a.startswith(pre + "/"): return sub.get(a), "1"
    if k in delegated:
        for tid in tasks_of.get(k, ()):
            for ar in assigners[tid]:
                if a in standing.get(ar, {}): return standing[ar][a], "2:" + kind[ar]
        return None, "-"
    if a in standing.get(k, {}): return standing[k][a], "3"
    return None, "-"
rcv = collections.defaultdict(list); where = collections.defaultdict(set); msgs = {}
for top in ("agents", "agent_teams", "agent_orgs"):
    for p in set(glob.glob(os.path.join(mem, top, "*", "**", "*communication_messages_*.jsonl"), recursive=True)):
        owner = (top, os.path.relpath(p, os.path.join(mem, top)).split(os.sep)[0])
        try: lines = open(p).read().splitlines()
        except Exception: continue
        for line in lines:
            try: m = json.loads(line)
            except Exception: continue
            rcv[(m.get("senderAgentRunId"), m.get("content"))].append(m.get("receiverAgentRunId")); where[m["messageId"]].add(owner); msgs[m["messageId"]] = m
def addr_case(sender, step, a, new_a, ok_today):
    k = run_of[sender]; kd = kind[k]
    if step == "1": return "A-4 delegated team: teammate (prefix dropped)" if kd == "delegated team" else ("A-3 org mounted team: teammate or its team" if sender in org_team else "A-1 team the user started: teammate")
    if step == "3": return "A-2/A-3 org: an org agent" if kd == "org" else "A-1 own run's standing agent"
    if step.startswith("2"):
        sub = any(not (e.get("role") == "assigned") for tid, ad, i, e, kk in entries if kk == k)
        tgt = step[2:]
        if tgt == "agent": return "B-2 sub-work run -> the Task's assigner" if sub else "B-1 delegated run -> its assigner (standalone)"
        return "B-3 delegated run -> its assigner's team" if tgt == "team" else "B-4 delegated run -> its assigner's org"
    return "C-1/C-3 an address of a delegated run (run ID only)"
for p in glob.glob(os.path.join(mem, "agents", "*", "raw_traces*.jsonl")) + glob.glob(os.path.join(mem, "agent_teams", "*", "*", "raw_traces*.jsonl")) + glob.glob(os.path.join(mem, "agent_orgs", "*", "**", "raw_traces*.jsonl"), recursive=True):
    sender = os.path.basename(os.path.dirname(p))
    if sender not in run_of: continue
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
        a = args.get("recipient_address"); res = results.get(cid)
        if not a or not res: continue
        raw = res.get("tool_result"); txt = raw if isinstance(raw, str) else json.dumps(raw); err = res.get("tool_error")
        delivered = ("Delivered message" in txt or '"DELIVERED"' in txt or "Message delivered" in txt) and not err
        mt = re.search(r'target_agent_run_id"\s*:\s*"([^"]+)"', txt)
        got = [mt.group(1)] if mt else rcv.get((sender, args.get("content")), [])
        today = got[0] if delivered and got else None
        if delivered and not today: C["(addressed sends whose receiver is not in the logs: skipped)"] += 1; continue
        new_a = local(run_of[sender], a); target, step = resolve(sender, new_a)
        if today:
            case = addr_case(sender, step, a, new_a, True) if target == today else "C-1/C-3 an address of a delegated run (run ID only)"
            C[f"{case}: delivered sends, {'same receiver' if target == today else 'not reached after (today refused too: run ID only)'}"] += 1
            if target != today:
                try: C[f"{case}: ... by month {datetime.datetime.utcfromtimestamp(float(res['ts'])).strftime('%Y-%m')}"] += 1
                except Exception: pass
        else:
            nf = "COLLABORATION_TARGET_NOT_FOUND" in txt + json.dumps(err)
            C[f"(sends refused today {'as not found' if nf else 'for another reason'}): {'still not found' if target is None else 'found after'}"] += 1
C["A-5 sends to a delegated team's own address from inside it"] = 0
for k in delegated:
    if k[0] != "agent_teams": continue
    asg = {ar for t in tasks_of.get(k, ()) for ar in assigners[t]}
    C["A-6/B: delegated teams whose member address equals a standing agent of their assigner (collision)"] += bool(set(teams[k]) & {a for ar in asg for a in standing.get(ar, {})})
    C["A-6 delegated teams with an open Task whose members are told new addresses"] += any(kk == k and e.get("closedAt") is None for tid, ad, i, e, kk in entries)
# ---- storage
for mid, m in msgs.items():
    a, b = run_of.get(m["senderAgentRunId"]), run_of.get(m["receiverAgentRunId"])
    if not a or not b: continue
    w = where[mid]
    if a == b: C[f"M-1 within one run ({kind[a]}): in its own log {a in w}; extra copies elsewhere {len(w - {a}) > 0}"] += 1
    else: C[f"M-2 between two runs: in both own logs {a in w and b in w}; extra copies elsewhere {len(w - {a, b}) > 0}"] += 1
    if m.get("messageType") == "task_assignment": C[f"M-4 task_assignment (another Task for an existing run): in both logs {a != b and a in w and b in w}"] += 1
one_entry = [k for k in tasks_of if sum(1 for e in entries if e[4] == k) == 1]
recv_ta = collections.Counter(run_of.get(m["receiverAgentRunId"]) for m in msgs.values() if m.get("messageType") == "task_assignment")
C["M-3 runs with one Task entry: the work packet is the run's first input, no logged message"] = sum(1 for k in one_entry if not recv_ta.get(k))
C["M-3 runs with one Task entry: total"] = len(one_entry)
for kk in ("agents",):
    C["M-5 agent run logs at agents/<id>/communication_messages_* (delegated runs)"] = len({os.path.dirname(p) for p in glob.glob(os.path.join(mem, "agents", "*", "communication_messages_*.jsonl"))})
    C["M-5 agent run logs at agents/<id>/collaboration/communication_messages_* (user-started)"] = len({os.path.dirname(p) for p in glob.glob(os.path.join(mem, "agents", "*", "collaboration", "communication_messages_*.jsonl"))})
# ---- sender address given (E)
seen = set()
for mid, m in msgs.items():
    s, r = m["senderAgentRunId"], m["receiverAgentRunId"]; ks, kr = run_of.get(s), run_of.get(r)
    if not ks or not kr or s == r: continue
    back, _ = resolve(r, local(ks, addr_of.get(s)))
    rel = "E-1 same run" if ks == kr else ("E-2 from the receiver's Task assigner" if any(ks in assigners[t] for t in tasks_of.get(kr, ())) else ("E-3 to the sender's Task assigner" if any(kr in assigners[t] for t in tasks_of.get(ks, ())) else "E-4 other runs (one Task, or legacy)"))
    C[f"{rel}: {'address given' if back == s else 'run ID only'}"] += 1
for k in sorted(C): print(f"{C[k]:6d}  {k}")

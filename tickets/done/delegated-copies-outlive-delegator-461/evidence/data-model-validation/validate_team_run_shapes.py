"""Read-only: the shape of delegated team runs' own files vs team runs the user started (autobyteus-461, AR from implementation).
Counts only. Usage: python3 -I validate_team_run_shapes.py <server-data dir>
"""
import collections, glob, json, os, sys
mem = os.path.join(sys.argv[1], "memory"); C = collections.Counter()
for p in glob.glob(os.path.join(mem, "agent_teams", "*", "team_run_execution_tree.json")):
    try: t = json.load(open(p))
    except Exception: C["unreadable"] += 1; continue
    kind = "delegated" if t.get("taskAgent") else ("peer-started" if t.get("delegatedFrom") else "user-started")
    rt = t["rootTeam"]; addr = rt.get("address")
    C[f"{kind}: files"] += 1
    C[f"{kind}: root address is /"] += addr == "/"
    under = lambda a: a.startswith(addr.rstrip("/") + "/") if addr != "/" else (a.startswith("/") and a.count("/") == 1)
    C[f"{kind}: every member address directly under the root address"] += all(under(m.get("address", "")) for m in rt.get("members", []))
    hs = t.get("handoffs", [])
    C[f"{kind}: every handoff address under the root address"] += all(under(h.get("from", "")) and under(h.get("to", "")) for h in hs)
    for f in ("teamDefinitionName",): C[f"{kind}: has rootTeam.{f}"] += f in rt
    for f in ("archivedAt", "applicationBinding"): C[f"{kind}: has {f}"] += f in t
    ms = rt.get("members", [])
    for f in ("role", "description", "followsTeam", "launchSource", "userLaunchSelection"):
        C[f"{kind}: members with {f}"] += sum(1 for m in ms if f in m)
    C[f"{kind}: members"] += len(ms)
    if kind == "delegated": C["delegated: taskAgent.address equals rootTeam.address"] += t["taskAgent"].get("address") == addr
for k in sorted(C): print(f"{C[k]:6d}  {k}")

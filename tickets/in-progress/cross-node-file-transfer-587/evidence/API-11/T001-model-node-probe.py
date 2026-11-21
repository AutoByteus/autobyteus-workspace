"""autobyteus-587 T-001 probe of the 461 contract model's RF-14 rule: the §5.1 story up to a step, then messages by run
ID across nodes without node, with the wrong node and with the right node. "node-c" stands for a third paired peer
(the model has two nodes; the two-server suite's RC-51 does this with a real third node, theta).
Usage: python3 -I T001-model-node-probe.py <model dir> <stop step id>"""
import copy, sys
sys.path.insert(0, sys.argv[1])
from model import Refused
from stories import standalone
w, steps = standalone()
for s in steps:
    try: s["op"]()
    except Refused: pass
    if s["id"] == sys.argv[2]: break
entries = [e for t, e in w.entries("A") if "nodeId" in e and w.run_key_of_entry(e) == ("agent_team", "research_team_77aa")]
print(f"after {sys.argv[2]}: A's entries for B's research_team_77aa:", [("closed" if e["closedAt"] else "open") for e in entries])
def probe(sender, receiver, label, node):
    snapshot = copy.deepcopy(w.__dict__)
    try:
        w.send_by_run_id(sender, receiver, "probe", "probe_" + sender, "2026-11-10T19:06:00.000Z", node=node)
        print(f"  {label}, node={node!r}: DELIVERED {w.result['message']}")
    except Refused as r:
        print(f"  {label}, node={node!r}: REFUSED {r.code}: {r.message}")
    w.__dict__.clear(); w.__dict__.update(snapshot)
cases = [("lead_0c11", "project_task_manager_7c8d", "B's peer-started lead -> its delegator M on A", "node-a"),
         ("project_task_manager_7c8d", "lead_0c11", "M on A -> its task agent lead on B", "node-b"),
         ("solution_designer_65a9", "lead_0c11", "another run of A -> lead on B (row 13)", "node-b")]
for sender, receiver, label, right in cases:
    for node in (None, "node-c", right):
        probe(sender, receiver, label, node)

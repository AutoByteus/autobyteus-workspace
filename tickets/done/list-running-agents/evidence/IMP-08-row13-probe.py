"""autobyteus-492 CR-001 probe: the §5.1 story of the 461 contract model, then messages by run ID to A's fenced peer run lead_0c11 on B.
Usage: python3 -I lra-probe-row13-14.py <model dir> <stop step id>"""
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
def probe(sender, receiver, label):
    snapshot = copy.deepcopy(w.__dict__)
    try:
        w.send_by_run_id(sender, receiver, "probe", "probe_" + sender, "2026-11-10T19:06:00.000Z")
        print(f"  {label}: {sender} -> {receiver}: DELIVERED")
    except Refused as r:
        print(f"  {label}: {sender} -> {receiver}: REFUSED {r.code}")
    w.__dict__.clear(); w.__dict__.update(snapshot)
probe("project_task_manager_7c8d", "lead_0c11", "row 13, the delegator (M)")
probe("solution_designer_65a9", "lead_0c11", "row 13, another run of A (team 0218)")
probe("image_maker_33f0", "lead_0c11", "row 13, another run of A (agent run)")
probe("product_designer_1a2b", "lead_0c11", "row 13, another run of A (product team)")

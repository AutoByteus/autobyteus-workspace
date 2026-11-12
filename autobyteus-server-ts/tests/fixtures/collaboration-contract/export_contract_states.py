"""Exports the collaboration contract's stories (autobyteus-461, `target-collaboration-contract.md` §5.1 … §5.3) as the
expected state after every step, for the acceptance E2E `tests/e2e/projects/collaboration-contract-stories.e2e.test.ts`.

The contract's executable model is the authority (`evidence/collaboration-model/` of the 461 ticket: `model.py` holds the
rules, `stories.py` the stories). This script runs each story step by step exactly as the model's `walkthrough.py` renders
it, and writes, per step: the case IDs, every result a delivery returned to its caller, a refusal (code and message), the
header each receiver sees, every file on disk (a memory folder is "created"), and the `DelegationTree` of each node.

  python3 -I export_contract_states.py <model dir> <out.json>
  python3 -I export_contract_states.py <model dir> <out.json> --check    exits 1 when <out.json> differs from the model
"""
import copy, json, os, sys


def export(model_dir):
    sys.path.insert(0, os.path.abspath(model_dir))
    from model import Refused  # noqa: E402  (the model directory is only known at run time)
    from stories import STORIES  # noqa: E402
    out = []
    for num, title, story in STORIES:
        w, steps = story()
        nodes = ("A", "B") if num == "5.1" else ("A",)
        states = []
        for s in steps:
            w.result, w.receiver_sees = None, None
            results, seen = [], []
            orig = w._deliver

            def deliver(*a, **k):
                orig(*a, **k)
                results.append(w.result)
                seen.append(w.receiver_sees)
            w._deliver = deliver
            try:
                s["op"]()
                refused = None
            except Refused as r:
                refused = {"code": r.code, "message": r.message}
            w._deliver = orig
            if w.result is not None and w.result not in results:
                results.append(w.result)
            states.append({"id": s["id"], "title": s["title"], "cases": [c.strip() for c in s["cases"].split(",")],
                           "call": s["call"], "results": results, "refused": refused, "receiverSees": seen,
                           "disk": copy.deepcopy(w.disk), "trees": {n: w.tree(n) for n in nodes}})
        out.append({"section": num, "title": title, "nodes": list(nodes), "nodeIds": dict(w.node_ids), "states": states})
    return out


if __name__ == "__main__":
    model_dir, path = sys.argv[1], sys.argv[2]
    text = json.dumps({"generatedBy": "tests/fixtures/collaboration-contract/export_contract_states.py",
                       "source": "autobyteus-461 target-collaboration-contract.md revision 8, evidence/collaboration-model",
                       "stories": export(model_dir)}, ensure_ascii=False, indent=1) + "\n"
    if len(sys.argv) > 3 and sys.argv[3] == "--check":
        same = os.path.exists(path) and open(path, encoding="utf-8").read() == text
        print(f"{path} matches the model" if same else f"MISMATCH: {path} differs from the model")
        sys.exit(0 if same else 1)
    open(path, "w", encoding="utf-8").write(text)
    print(f"written {path}")

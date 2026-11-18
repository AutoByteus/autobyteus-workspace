import json, os, re, sys, collections
root = "/tmp/wjnv/shadow/raw/memory"
shapes = collections.Counter(); n = 0
for dp, dn, fn in os.walk(root):
    if os.path.basename(dp) in ("work_journal", "imports"): dn[:] = []; continue
    for f in fn:
        if not f.startswith("raw_traces") or not f.endswith(".jsonl"): continue
        calls = {}
        try:
            with open(os.path.join(dp, f), encoding="utf-8") as fh:
                for line in fh:
                    try: r = json.loads(line)
                    except Exception: continue
                    if r.get("tool_name") != "send_message_to": continue
                    if r.get("trace_type") == "tool_result":
                        v = r.get("tool_result"); e = r.get("tool_error")
                        if isinstance(v, str):
                            try: v = json.loads(v)
                            except Exception: v = "str:" + ("text" if v else "empty")
                        if isinstance(v, dict) and "provider_state" in v:
                            o = v.get("output")
                            try: o = json.loads(o) if isinstance(o, str) else o
                            except Exception: o = "str"
                            v = {"agy": sorted(o.keys()) if isinstance(o, dict) else str(type(o).__name__)}
                        key = ("error" if e else "") + ":" + (",".join(sorted(v.keys())) if isinstance(v, dict) and "agy" not in v else json.dumps(v) if isinstance(v, dict) else str(v))
                        shapes[key[:140]] += 1
        except Exception: pass
for k, v in shapes.most_common(12): print(v, k)

import json,sys
lines=[json.loads(l) for l in open(sys.argv[1])]
i=max(k for k,d in enumerate(lines) if d.get("trace_type")=="user")
parts=[d for d in lines[i:] if d.get("trace_type") in ("assistant","output_limit_recovery","tool_call")]
for d in parts: print(d["trace_type"], d.get("tool_name") or "", len(d.get("content") or ""), repr((d.get("content") or "")[:70]))
asst=[d.get("content") or "" for d in parts if d["trace_type"]=="assistant" and d.get("content")]
for a,b in zip(asst, asst[1:]): print("JOIN:", repr(a[-45:]), "|", repr(b[:45]))

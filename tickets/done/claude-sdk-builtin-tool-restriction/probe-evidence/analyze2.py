import json,re,sys
pat=re.compile(r"(Agent tool|Agent tools|subagent|general-purpose|teammate|Available agent|PROBE_CUSTOM_AGENT|probe-reviewer)", re.I)
for label in sys.argv[1:]:
    d=json.load(open(f"{label}.json"))
    main=[c["body"] for c in d["captured"] if c["url"].startswith("/v1/messages") and c["body"] and c["body"].get("tools")]
    other=[c["body"] for c in d["captured"] if c["url"].startswith("/v1/messages") and c["body"] and not c["body"].get("tools")]
    req=main[0]
    names=[t["name"] for t in req["tools"]]
    print(f"===== {label}   (main-loop requests: {len(main)}, tool-less side requests: {len(other)})")
    print("init.tools :", d["init"]["tools"])
    print("API tools  :", names)
    msgs=json.dumps(req["messages"])
    print("skill listed in messages:", "PROBE_SKILL_MARKER" in msgs, "| system prompt ours only:", "PROBE_SYSTEM_PROMPT" in json.dumps(req["system"]))
    print("agent mentions  system:", sorted(set(m.group(0) for m in pat.finditer(json.dumps(req['system'])))), " messages:", sorted(set(m.group(0) for m in pat.finditer(msgs))))
    for t in req["tools"]:
        h=sorted(set(m.group(0) for m in pat.finditer(json.dumps(t))))
        if h: print("   residual in tool", t["name"], h)
    print("forced tool calls -> results:")
    for r in d["toolResults"]: print("  ", r)
    print("MCP server actually executed:", d["mcpCalls"])
    for o in other: print("side request model:", o.get("model"), "| mentions:", sorted(set(m.group(0) for m in pat.finditer(json.dumps(o)))))

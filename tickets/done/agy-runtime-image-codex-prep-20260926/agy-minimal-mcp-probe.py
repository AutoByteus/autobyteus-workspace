#!/usr/bin/env python3
"""Disposable AGY core-eight native profile plus capsule-scoped MCP control."""

import json
import pathlib
import subprocess
import sys
import tempfile

OUT = pathlib.Path(__file__).parent / "agy-minimal-native-profile-evidence"
OUT.mkdir(exist_ok=True)
TOOLS = [
    "view_file", "write_to_file", "replace_file_content", "grep_search",
    "list_dir", "find_by_name", "run_command", "generate_image",
]
SERVER = '''#!/usr/bin/env python3
import json,os,sys
log=open(os.environ['PROBE_LOG'],'a',buffering=1)
for line in sys.stdin:
 try: msg=json.loads(line)
 except Exception: continue
 method=msg.get('method');log.write(method+'\\n')
 if 'id' not in msg: continue
 if method=='initialize': result={'protocolVersion':msg.get('params',{}).get('protocolVersion','2025-03-26'),'capabilities':{'tools':{}},'serverInfo':{'name':'capsule-mcp-probe','version':'0.0.1'}}
 elif method=='tools/list': result={'tools':[{'name':'probe_echo','description':'Returns a fixed test marker.','inputSchema':{'type':'object','properties':{},'additionalProperties':False}}]}
 elif method=='tools/call': result={'content':[{'type':'text','text':'AGY-MCP-MARKER-8462'}],'isError':False}
 elif method=='resources/list': result={'resources':[]}
 elif method=='prompts/list': result={'prompts':[]}
 else: result={}
 sys.stdout.write(json.dumps({'jsonrpc':'2.0','id':msg['id'],'result':result})+'\\n');sys.stdout.flush()
'''

with tempfile.TemporaryDirectory(prefix="agy-minimal-mcp-") as tmp:
    root = pathlib.Path(tmp)
    capsule = root / "capsule"
    workspace = root / "workspace"
    capsule.mkdir()
    workspace.mkdir()
    agent = capsule / ".agents" / "agents" / "mcp-probe" / "agent.md"
    agent.parent.mkdir(parents=True)
    agent.write_text(
        "---\nname: mcp-probe\ndescription: Disposable native-plus-MCP test.\n"
        "mainAgent: true\ntools: [" + ", ".join(TOOLS) + "]\n---\n\n"
        "Use only the configured capsule-test MCP server when the user asks for its marker.\n"
    )
    server = root / "server.py"
    server.write_text(SERVER)
    log = root / "server.log"
    config = capsule / ".agents" / "mcp_config.json"
    config.write_text(json.dumps({"mcpServers": {"capsule-test": {
        "command": sys.executable, "args": [str(server)], "env": {"PROBE_LOG": str(log)},
    }}}))
    process = subprocess.run([
        "agy", "--new-project", "--agent", "mcp-probe", "--add-dir", str(workspace),
        "--model", "gemini-3.8-flash-low", "--dangerously-skip-permissions",
        "--output-format", "stream-json", "--print-timeout", "90s", "--print",
        "Use capsule-test MCP probe_echo and tell me the exact marker returned. Do not invent it.",
    ], cwd=capsule, text=True, capture_output=True, timeout=105)
    events = []
    for line in process.stdout.splitlines():
        if line.startswith("{"):
            try:
                events.append(json.loads(line))
            except json.JSONDecodeError:
                pass
    result = next((event["result"] for event in reversed(events) if event.get("event") == "result"), {})
    steps = [{"name": step.get("tool_name"), "state": step.get("state")}
             for event in events if event.get("event") == "step_update"
             for step in [event["step_update"]] if step.get("step_type") == "tool"]
    summary = {
        "configured_native_tools": TOOLS,
        "exit": process.returncode,
        "status": result.get("status"),
        "response_has_mcp_marker": "AGY-MCP-MARKER-8462" in str(result.get("response") or ""),
        "tool_steps": steps,
        "mcp_methods": log.read_text().splitlines() if log.exists() else [],
        "unknown_name_error": "unknown component" in process.stderr,
    }
    (OUT / "core8_mcp.json").write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps(summary, indent=2))

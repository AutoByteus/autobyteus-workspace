"""Demonstrate default headless tool-approval behavior with a harmless command."""
import json
import pathlib
import subprocess
import tempfile

OUT = pathlib.Path(__file__).with_name("agy-cli-permission-probe-results.json")
with tempfile.TemporaryDirectory(prefix="autobyteus-agy-permission-") as d:
    proc = subprocess.run(
        ["agy", "--new-project", "--model", "gemini-3.8-flash-low",
         "--print", "Run the shell command printf PERMISSION-PROBE exactly once; "
         "do not use another method. Then report its output.",
         "--output-format", "stream-json", "--print-timeout", "60s"],
        cwd=d, capture_output=True, text=True, timeout=90, check=False,
    )
    events = []
    for line in proc.stdout.splitlines():
        try:
            events.append(json.loads(line))
        except json.JSONDecodeError:
            pass
    tools = [e.get("step_update", {}) for e in events
             if e.get("event") == "step_update" and
             e.get("step_update", {}).get("step_type") == "tool"]
    last = next((e.get("result", {}) for e in reversed(events)
                 if e.get("event") == "result"), {})
    init = next((e.get("init", {}) for e in events if e.get("event") == "init"), {})
    summary = {
        "cliExit": proc.returncode,
        "permissionMode": init.get("permission_mode"),
        "tools": [{"name": t.get("tool_name"), "state": t.get("state"),
                   "hasError": bool(t.get("error") or
                                    "denied" in json.dumps(t.get("tool_info", {})).lower())}
                  for t in tools],
        "resultStatus": last.get("status"),
        "resultResponse": last.get("response"),
        "stderrMentionsDenial": "denied" in proc.stderr.lower(),
        "stderrTail": proc.stderr[-500:],
        "dangerouslySkipPermissionsUsed": False,
    }
    OUT.write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps(summary, indent=2))

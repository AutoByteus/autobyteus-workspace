"""Bounded AGY headless auto-approval control with a harmless shell command."""
import json
import pathlib
import subprocess
import tempfile

OUT = pathlib.Path(__file__).with_name("agy-cli-autoapprove-probe-results.json")
with tempfile.TemporaryDirectory(prefix="autobyteus-agy-autoapprove-") as d:
    proc = subprocess.run(
        ["agy", "--new-project", "--model", "gemini-3.8-flash-low",
         "--print", "Run the shell command printf AUTOAPPROVE-PROBE exactly once; "
         "do not use another method. Then report its output.",
         "--output-format", "stream-json", "--print-timeout", "60s",
         "--sandbox", "--dangerously-skip-permissions"],
        cwd=d, capture_output=True, text=True, timeout=90, check=False,
    )
    events = []
    for line in proc.stdout.splitlines():
        try:
            events.append(json.loads(line))
        except json.JSONDecodeError:
            pass
    init = next((e.get("init", {}) for e in events if e.get("event") == "init"), {})
    steps = [e.get("step_update", {}) for e in events
             if e.get("event") == "step_update" and
             e.get("step_update", {}).get("step_type") == "tool"]
    last = next((e.get("result", {}) for e in reversed(events)
                 if e.get("event") == "result"), {})
    summary = {
        "cliExit": proc.returncode,
        "permissionMode": init.get("permission_mode"),
        "tools": [{"name": s.get("tool_name"), "state": s.get("state"),
                   "command": s.get("tool_info", {}).get("parameters", {}).get("CommandLine"),
                   "output": s.get("tool_info", {}).get("output"),
                   "error": s.get("tool_info", {}).get("error")}
                  for s in steps],
        "resultStatus": last.get("status"),
        "resultResponse": last.get("response"),
        "stderrTail": proc.stderr[-500:],
        "sandboxUsed": True,
        "dangerouslySkipPermissionsUsed": True,
    }
    OUT.write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps(summary, indent=2))

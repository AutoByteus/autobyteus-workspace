"""Inspect headless AGY's JSON shape for an unapproved harmless shell tool."""
import json
import pathlib
import subprocess
import tempfile

OUT = pathlib.Path(__file__).with_name("agy-cli-permission-stream-shape-probe-results.json")

with tempfile.TemporaryDirectory(prefix="autobyteus-agy-permission-stream-") as d:
    proc = subprocess.run(
        [
            "agy", "--new-project", "--model", "gemini-3.8-flash-low",
            "--print",
            "Run the shell command printf APPROVAL-JSON-PROBE exactly once; "
            "do not use another method. Then report its output.",
            "--output-format", "stream-json", "--print-timeout", "60s",
        ],
        cwd=d, capture_output=True, text=True, timeout=90, check=False,
    )
    events = []
    invalid_stdout_lines = []
    for line in proc.stdout.splitlines():
        try:
            events.append(json.loads(line))
        except json.JSONDecodeError:
            invalid_stdout_lines.append(line[:200])

    stream_shape = []
    for e in events:
        kind = e.get("event")
        if kind == "init":
            stream_shape.append({
                "event": "init",
                "permission_mode": e.get("init", {}).get("permission_mode"),
                "has_conversation_id": bool(e.get("conversation_id")),
            })
        elif kind == "step_update":
            step = e.get("step_update", {})
            entry = {
                "event": "step_update",
                "step_type": step.get("step_type"),
                "state": step.get("state"),
            }
            if step.get("step_type") == "tool":
                entry["tool_name"] = step.get("tool_name")
                entry["tool_info"] = step.get("tool_info")
            if step.get("step_type") == "agent_response":
                entry["text_delta"] = step.get("text_delta")
            stream_shape.append(entry)
        elif kind == "result":
            result = e.get("result", {})
            stream_shape.append({
                "event": "result",
                "status": result.get("status"),
                "response": result.get("response"),
                "error": result.get("error"),
            })
        else:
            stream_shape.append({"event": kind})

    summary = {
        "cliExit": proc.returncode,
        "streamShape": stream_shape,
        "invalidStdoutLines": invalid_stdout_lines,
        "stderr": proc.stderr.replace(d, "<temp-dir>")[-1200:],
        "dangerouslySkipPermissionsUsed": False,
        "globalSettingsEdited": False,
    }
    OUT.write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps(summary, indent=2))

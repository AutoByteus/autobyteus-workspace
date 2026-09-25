"""Capture raw AGY JSONL when an approved, harmless shell command exits nonzero."""

import json
import pathlib
import subprocess
import tempfile

out = pathlib.Path(__file__).parent / "agy-tool-event-capture"
out.mkdir(exist_ok=True)
with tempfile.TemporaryDirectory(prefix="autobyteus-agy-command-failure-") as tmp:
    proc = subprocess.run(
        ["agy", "--new-project", "--model", "gemini-3.8-flash-low",
         "--print", "Run the shell command sh -c 'exit 7' exactly once. Do not retry or use another command. Report that it failed.",
         "--output-format", "stream-json", "--print-timeout", "60s",
         "--sandbox", "--dangerously-skip-permissions"],
        cwd=tmp, capture_output=True, text=True, timeout=100, check=False,
    )
    (out / "run_command_nonzero.stdout.jsonl").write_text(proc.stdout)
    (out / "run_command_nonzero.stderr.txt").write_text(proc.stderr)
    events = [json.loads(line) for line in proc.stdout.splitlines()]
    summary = {
        "exit_code": proc.returncode,
        "event_count": len(events),
        "tools": [
            {"step_index": s.get("step_index"), "state": s.get("state"), "info": s.get("tool_info")}
            for e in events if e.get("event") == "step_update"
            for s in [e.get("step_update") or {}] if s.get("step_type") == "tool"
        ],
        "results": [e.get("result") for e in events if e.get("event") == "result"],
    }
    (out / "run_command_nonzero.summary.json").write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps(summary, indent=2))

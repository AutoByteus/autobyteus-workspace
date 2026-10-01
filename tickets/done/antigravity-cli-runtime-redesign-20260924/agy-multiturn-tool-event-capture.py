"""Capture raw AGY stream JSONL for two tool-using turns in one process."""

import json
import pathlib
import subprocess
import tempfile

out = pathlib.Path(__file__).parent / "agy-tool-event-capture"
out.mkdir(exist_ok=True)
with tempfile.TemporaryDirectory(prefix="autobyteus-agy-multiturn-") as tmp:
    primary = pathlib.Path(tmp) / "primary"
    primary.mkdir()
    messages = [
        {"event": "user", "message": {"content": "Run the shell command printf FIRST-TURN-TOOL exactly once. Report its output."}},
        {"event": "user", "message": {"content": "Run the shell command printf SECOND-TURN-TOOL exactly once. Report its output."}},
    ]
    proc = subprocess.run(
        ["agy", "--new-project", "--model", "gemini-3.8-flash-low",
         "--input-format", "stream-json", "--output-format", "stream-json",
         "--sandbox", "--dangerously-skip-permissions"],
        cwd=primary, input="".join(json.dumps(m) + "\n" for m in messages),
        capture_output=True, text=True, timeout=120, check=False,
    )
    (out / "multi_turn.stdout.jsonl").write_text(proc.stdout)
    (out / "multi_turn.stderr.txt").write_text(proc.stderr)
    events = [json.loads(line) for line in proc.stdout.splitlines()]
    summary = {
        "input_messages": messages,
        "exit_code": proc.returncode,
        "event_count": len(events),
        "result_count": sum(e.get("event") == "result" for e in events),
        "tools": [
            {"step_index": s.get("step_index"), "state": s.get("state"),
             "name": s.get("tool_name"), "command": (s.get("tool_info") or {}).get("parameters", {}).get("CommandLine")}
            for e in events if e.get("event") == "step_update"
            for s in [e.get("step_update") or {}] if s.get("step_type") == "tool"
        ],
        "results": [e.get("result") for e in events if e.get("event") == "result"],
    }
    (out / "multi_turn.summary.json").write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps({k: summary[k] for k in ("exit_code", "event_count", "result_count", "tools")}, indent=2))

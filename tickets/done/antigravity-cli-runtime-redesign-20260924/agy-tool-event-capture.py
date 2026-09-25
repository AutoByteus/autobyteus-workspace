"""Capture unmodified AGY stdout JSONL for harmless tool calls in temporary projects.

Only prompts and fixture data created here are submitted. No global settings are edited.
The output directory contains verbatim stdout/stderr plus a small run manifest.
"""

import json
import pathlib
import subprocess
import tempfile

ROOT = pathlib.Path(__file__).parent
OUT = ROOT / "agy-tool-event-capture"
OUT.mkdir(exist_ok=True)
MODEL = "gemini-3.8-flash-low"

CASES = (
    ("view_file", "Read probe.txt in the added directory using the file viewing tool. Reply with its exact contents only.", False, True),
    ("run_command_allowed", "Run the shell command printf TOOL-EVENT-ALLOWED exactly once; do not use another method. Then report its output.", True, False),
    ("run_command_denied", "Run the shell command printf TOOL-EVENT-DENIED exactly once; do not use another method. Then report its output.", False, False),
    ("file_write_allowed", "Use a file-writing tool (not a shell command) to create created.txt in the current project with exactly TOOL-EVENT-WRITE followed by a newline. Then confirm the filename.", True, False),
)

manifest = {"cli_version": subprocess.check_output(["agy", "--version"], text=True).strip(), "model": MODEL, "cases": {}}
for name, prompt, autoapprove, add_dir in CASES:
    with tempfile.TemporaryDirectory(prefix=f"autobyteus-agy-{name}-") as tmp:
        base = pathlib.Path(tmp)
        primary = base / "primary"
        primary.mkdir()
        args = ["agy", "--new-project", "--model", MODEL]
        if add_dir:
            fixture = base / "fixture"
            fixture.mkdir()
            (fixture / "probe.txt").write_text("TOOL-EVENT-VIEW\n")
            args += ["--add-dir", str(fixture)]
        args += ["--print", prompt, "--output-format", "stream-json", "--print-timeout", "60s"]
        if autoapprove:
            args += ["--sandbox", "--dangerously-skip-permissions"]
        try:
            proc = subprocess.run(args, cwd=primary, capture_output=True, text=True, timeout=100, check=False)
            stdout, stderr, code, timeout = proc.stdout, proc.stderr, proc.returncode, False
        except subprocess.TimeoutExpired as exc:
            stdout = (exc.stdout or b"").decode(errors="replace") if isinstance(exc.stdout, bytes) else (exc.stdout or "")
            stderr = (exc.stderr or b"").decode(errors="replace") if isinstance(exc.stderr, bytes) else (exc.stderr or "")
            code, timeout = None, True

        (OUT / f"{name}.stdout.jsonl").write_text(stdout)
        (OUT / f"{name}.stderr.txt").write_text(stderr)
        events, invalid_lines = [], []
        for line_number, line in enumerate(stdout.splitlines(), 1):
            try:
                events.append(json.loads(line))
            except json.JSONDecodeError:
                invalid_lines.append(line_number)
        entry = {
            "prompt": prompt,
            "autoapprove": autoapprove,
            "added_fixture_directory": add_dir,
            "exit_code": code,
            "timed_out": timeout,
            "json_event_count": len(events),
            "non_json_stdout_line_numbers": invalid_lines,
            "event_types": [e.get("event") for e in events],
            "tool_updates": [
                {"step_index": s.get("step_index"), "name": s.get("tool_name"), "state": s.get("state")}
                for e in events if e.get("event") == "step_update"
                for s in [e.get("step_update") or {}] if s.get("step_type") == "tool"
            ],
            "created_file_content": (primary / "created.txt").read_text() if (primary / "created.txt").is_file() else None,
        }
        manifest["cases"][name] = entry
        print(name, json.dumps({k: entry[k] for k in ("exit_code", "timed_out", "json_event_count", "non_json_stdout_line_numbers", "tool_updates")}), flush=True)

(OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")

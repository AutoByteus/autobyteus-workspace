#!/usr/bin/env python3
"""Bounded, disposable AGY 1.2.11 custom-agent native-tool compatibility probes.

No production code or user-global AGY configuration is changed. Summaries omit raw
provider stderr, model text, tool arguments, and secrets. The disposable capsule
and workspace are removed; provider-owned brain data is left untouched.
"""

from __future__ import annotations

import json
import pathlib
import re
import subprocess
import tempfile
import time


ROOT = pathlib.Path(__file__).parent
OUT = ROOT / "agy-minimal-native-profile-evidence"
OUT.mkdir(exist_ok=True)
MODEL = "gemini-3.8-flash-low"
BASE = [
    "view_file", "write_to_file", "replace_file_content",
    "multi_replace_file_content", "grep_search", "list_dir", "find_by_name",
    "run_command",
]
CORE = BASE + ["generate_image"]
RESEARCH = CORE + ["search_web", "read_url_content"]


def run(name: str, tools: list[str], prompt: str, files: dict[str, str] | None = None,
        auto_approve: bool = False, model: str = MODEL) -> dict:
    with tempfile.TemporaryDirectory(prefix=f"agy-minimal-{name}-") as tmp:
        root = pathlib.Path(tmp)
        capsule = root / "capsule"
        workspace = root / "workspace"
        capsule.mkdir()
        workspace.mkdir()
        for relative, content in (files or {}).items():
            target = workspace / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(content)
        agent = capsule / ".agents" / "agents" / "tool-probe" / "agent.md"
        agent.parent.mkdir(parents=True)
        agent.write_text(
            "---\nname: tool-probe\ndescription: Isolated native tool compatibility probe.\n"
            "mainAgent: true\ntools: [" + ", ".join(tools) + "]\n---\n\n"
            "Use the named AGY-native tool requested by the user. Do not use an MCP tool. "
            "Operate only inside the selected workspace.\n"
            f"Selected workspace: `{workspace}`\n"
        )
        argv = [
            "agy", "--new-project", "--agent", "tool-probe", "--add-dir", str(workspace),
            "--model", model, "--output-format", "stream-json", "--print-timeout", "90s",
        ]
        if auto_approve:
            argv.append("--dangerously-skip-permissions")
        argv.extend(["--print", prompt.replace("{WORKSPACE}", str(workspace))])
        started = time.monotonic()
        try:
            process = subprocess.run(argv, cwd=capsule, text=True, capture_output=True, timeout=105)
            exit_code = process.returncode
            stdout = process.stdout
            stderr = process.stderr
            timed_out = False
        except subprocess.TimeoutExpired as exc:
            exit_code = None
            stdout = exc.stdout.decode(errors="replace") if isinstance(exc.stdout, bytes) else exc.stdout or ""
            stderr = exc.stderr.decode(errors="replace") if isinstance(exc.stderr, bytes) else exc.stderr or ""
            timed_out = True
        events = []
        for line in stdout.splitlines():
            if line.startswith("{"):
                try:
                    events.append(json.loads(line))
                except json.JSONDecodeError:
                    pass
        init = next((event["init"] for event in events if event.get("event") == "init"), {})
        result = next((event["result"] for event in reversed(events) if event.get("event") == "result"), {})
        steps = []
        for event in events:
            if event.get("event") != "step_update":
                continue
            step = event["step_update"]
            if step.get("step_type") == "tool":
                info = step.get("tool_info") or {}
                steps.append({
                    "name": step.get("tool_name"), "state": step.get("state"),
                    "has_output": "output" in info, "has_error": "error" in info,
                })
        snapshot = {}
        for relative in (files or {}):
            target = workspace / relative
            snapshot[relative] = target.read_text() if target.is_file() else None
        for relative in ("created.txt",):
            target = workspace / relative
            if target.exists():
                snapshot[relative] = target.read_text()
        summary = {
            "case": name, "configured_tools": tools, "model": model, "exit": exit_code,
            "timed_out": timed_out, "seconds": round(time.monotonic() - started, 1),
            "init_agent_match": init.get("agent") == "tool-probe",
            "status": result.get("status"), "response_length": len(str(result.get("response") or "")),
            "response_has_expected_marker": "AGY-PROBE-MARKER-2846" in str(result.get("response") or ""),
            "tool_steps": steps,
            "unknown_names": re.findall(r'unknown component: tool "([^"]+)"', stderr),
            "workspace_files": snapshot,
        }
        (OUT / f"{name}.json").write_text(json.dumps(summary, indent=2) + "\n")
        print(json.dumps({k: v for k, v in summary.items() if k != "workspace_files"}), flush=True)
        return summary


if __name__ == "__main__":
    cases = [
        ("baseline8_first_turn", BASE, "Reply exactly OK. Do not use a tool.", None, False),
        ("core9_first_turn", CORE, "Reply exactly OK. Do not use a tool.", None, False),
        ("research11_first_turn", RESEARCH, "Reply exactly OK. Do not use a tool.", None, False),
        ("core9_view_file", CORE,
         "Use native view_file to read {WORKSPACE}/probe.txt, then reply with its exact marker.",
         {"probe.txt": "AGY-PROBE-MARKER-2846\n"}, False),
        ("core9_list_dir", CORE,
         "Use native list_dir on {WORKSPACE}, then name the entry you saw. Do not use run_command.",
         {"list-entry.txt": "list item\n"}, False),
        ("core9_find_by_name", CORE,
         "Use native find_by_name to find needle_record.txt beneath {WORKSPACE}. Do not use run_command.",
         {"nested/needle_record.txt": "needle\n"}, False),
        ("core9_grep_search", CORE,
         "Use native grep_search to find AGY-PROBE-MARKER-2846 in files beneath {WORKSPACE}. Do not use run_command.",
         {"values.txt": "AGY-PROBE-MARKER-2846\n"}, False),
        ("core9_run_command", CORE,
         "Use native run_command to execute exactly `printf AGY-PROBE-MARKER-2846` in {WORKSPACE}, then report the output.",
         None, True),
        ("core9_write_to_file", CORE,
         "Use native write_to_file to create {WORKSPACE}/created.txt containing exactly AGY-PROBE-MARKER-2846. Do not use run_command.",
         None, True),
        ("core9_replace_file_content", CORE,
         "Use native replace_file_content to change OLD to NEW in {WORKSPACE}/replace.txt. Do not use run_command.",
         {"replace.txt": "OLD\n"}, True),
        ("core9_multi_replace_file_content", CORE,
         "Use native multi_replace_file_content to change alpha-OLD to alpha-NEW and beta-OLD to beta-NEW in {WORKSPACE}/multi.txt. Do not use run_command.",
         {"multi.txt": "alpha-OLD\nbeta-OLD\n"}, True),
        ("research11_search_web", RESEARCH,
         "Use native search_web to find the official Antigravity CLI documentation domain, then state just that domain. Do not use run_command.",
         None, False),
        ("research11_read_url_content", RESEARCH,
         "Use native read_url_content to read https://antigravity.google/docs/cli/headless/ and state its page title. Do not use run_command.",
         None, False),
    ]
    for case in cases:
        run(*case)

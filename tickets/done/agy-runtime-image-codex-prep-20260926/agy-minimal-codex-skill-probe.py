#!/usr/bin/env python3
"""Disposable core-eight AGY custom agent with bundled Codex workflow skill."""

import json
import os
import pathlib
import shutil
import subprocess
import tempfile

HERE = pathlib.Path(__file__).parent
OUT = HERE / "agy-minimal-native-profile-evidence"
OUT.mkdir(exist_ok=True)
MODEL = os.environ.get("AGY_PROBE_MODEL", "gemini-3.8-flash-low")
SKILL = pathlib.Path(
    "/Users/normy/autobyteus-org/autobyteus-task-worktrees/"
    "agy-codex-skill-bundle-20260926/agents/codex/skills/"
    "software-engineering-workflow-skill"
)
TOOLS = [
    "view_file", "write_to_file", "replace_file_content", "grep_search",
    "list_dir", "find_by_name", "run_command", "generate_image",
]

with tempfile.TemporaryDirectory(prefix="agy-minimal-codex-") as tmp:
    root = pathlib.Path(tmp)
    capsule = root / "capsule"
    workspace = root / "workspace"
    capsule.mkdir()
    workspace.mkdir()
    agent = capsule / ".agents" / "agents" / "codex-probe" / "agent.md"
    agent.parent.mkdir(parents=True)
    agent.write_text(
        "---\nname: codex-probe\ndescription: Isolated Codex skill first-turn probe.\n"
        "mainAgent: true\ntools: [" + ", ".join(TOOLS) + "]\n---\n\n"
        "Use the configured skill when the user asks about its stages.\n"
    )
    target = capsule / ".agents" / "skills" / SKILL.name
    shutil.copytree(SKILL, target)
    process = subprocess.run([
        "agy", "--new-project", "--agent", "codex-probe", "--add-dir", str(workspace),
        "--model", MODEL, "--output-format", "stream-json",
        "--print-timeout", "90s", "--print",
        "Use your configured software-engineering-workflow-skill. In one sentence, what is its first stage for a new software request?",
    ], cwd=capsule, text=True, capture_output=True, timeout=105)
    events = []
    for line in process.stdout.splitlines():
        if line.startswith("{"):
            try:
                events.append(json.loads(line))
            except json.JSONDecodeError:
                pass
    result = next((event["result"] for event in reversed(events) if event.get("event") == "result"), {})
    tool_steps = [{"name": step.get("tool_name"), "state": step.get("state")}
                  for event in events if event.get("event") == "step_update"
                  for step in [event["step_update"]] if step.get("step_type") == "tool"]
    response = str(result.get("response") or "")
    summary = {
        "configured_native_tools": TOOLS,
        "model": MODEL,
        "skill_file_present": (target / "SKILL.md").is_file(),
        "exit": process.returncode,
        "status": result.get("status"),
        "response_mentions_stage_zero": "Stage 0" in response or "Bootstrap Ticket" in response,
        "response_length": len(response),
        "tool_steps": tool_steps,
        "unknown_name_error": "unknown component" in process.stderr,
    }
    suffix = "high" if MODEL.endswith("-high") else "low"
    (OUT / f"core8_codex_skill_{suffix}.json").write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps(summary, indent=2))

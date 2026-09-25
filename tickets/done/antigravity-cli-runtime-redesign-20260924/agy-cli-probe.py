"""Bounded, non-destructive AGY CLI contract probe in isolated temporary workspaces.

Runs three small no-tool turns against the locally authenticated CLI. It never
edits user-global AGY settings. It writes only a sanitized summary; temporary
workspace files are removed by TemporaryDirectory. CLI-owned conversation
cache/history may persist under the user's normal AGY data location.
"""

from __future__ import annotations

import json
import pathlib
import subprocess
import tempfile
import time

MODEL = "gemini-3.8-flash-low"
AGENT_NAME = "autobyteus-identity-probe"
AGENT_CODE = "ORBIT-SAFFRON"
NONCE = "amber-47"
OUT = pathlib.Path(__file__).with_name("agy-cli-probe-results.json")


def invoke(args: list[str], cwd: pathlib.Path, stdin: str = "") -> dict:
    started = time.monotonic()
    try:
        result = subprocess.run(
            ["agy", *args], cwd=cwd, input=stdin, capture_output=True,
            text=True, timeout=150, check=False,
        )
    except subprocess.TimeoutExpired as error:
        return {"timedOut": True, "durationSeconds": round(time.monotonic() - started, 2),
                "error": str(error)}
    events = []
    for line in result.stdout.splitlines():
        try:
            events.append(json.loads(line))
        except json.JSONDecodeError:
            pass
    return {
        "exitCode": result.returncode,
        "durationSeconds": round(time.monotonic() - started, 2),
        "events": events,
        "stderrTail": result.stderr[-1200:],
        "stdoutTailIfNotJson": result.stdout[-1200:] if not events else None,
    }


def slim(result: dict) -> dict:
    events = result.pop("events", [])
    init = next((e for e in events if e.get("event") == "init"), {})
    results = [e.get("result", {}) for e in events if e.get("event") == "result"]
    return {**result, "init": {"conversation_id": init.get("conversation_id"),
                               "agent": init.get("init", {}).get("agent"),
                               "cwd": init.get("init", {}).get("cwd")},
            "results": [{"conversation_id": r.get("conversation_id"),
                         "status": r.get("status"), "response": r.get("response"),
                         "num_turns": r.get("num_turns"), "error": r.get("error")}
                        for r in results],
            "eventTypes": [e.get("event") for e in events]}


with tempfile.TemporaryDirectory(prefix="autobyteus-agy-probe-") as root:
    root = pathlib.Path(root)
    primary, real = root / "primary", root / "real"
    primary.mkdir()
    real.mkdir()
    agent_file = primary / ".agents" / "agents" / AGENT_NAME / "agent.md"
    agent_file.parent.mkdir(parents=True)
    agent_file.write_text(
        f"---\nname: {AGENT_NAME}\ndescription: Isolated identity probe.\n"
        "mainAgent: true\n---\n# Core Instructions\n"
        f"Your assigned code word is {AGENT_CODE}. State it accurately if asked.\n"
    )
    prompts = [
        {"event": "user", "message": {"content":
            f"Reply with your assigned code word, then a slash, then this nonce: {NONCE}. Do not use tools."}},
        {"event": "user", "message": {"content":
            "What nonce did I give you in my previous message? Reply with only the nonce. Do not use tools."}},
    ]
    stream = slim(invoke([
        "--new-project", "--agent", AGENT_NAME, "--model", MODEL,
        "--input-format", "stream-json", "--output-format", "stream-json",
        "--add-dir", str(real), "--print-timeout", "60s",
    ], primary, "\n".join(json.dumps(p) for p in prompts) + "\n"))
    conversation_id = stream["init"]["conversation_id"]
    resume = None
    if conversation_id and len(stream["results"]) == 2:
        resume = slim(invoke([
            "--agent", AGENT_NAME, "--model", MODEL,
            "--conversation", conversation_id,
            "--print", "What nonce did I give you earlier? Reply only the nonce. Do not use tools.",
            "--output-format", "stream-json", "--add-dir", str(real),
            "--print-timeout", "60s",
        ], primary))
    summary = {"model": MODEL, "agentName": AGENT_NAME,
               "expectedCodeWord": AGENT_CODE, "expectedNonce": NONCE,
               "stream": stream, "exactResume": resume}
    OUT.write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps(summary, indent=2))

"""Test an actual AutoByteus agent.md verbatim against AGY custom-agent loading.

Uses the repository's non-sensitive built-in Memory Compactor definition as a
representative source. A successful transformed control is not proof that all
private/team agent definitions are compatible. No global settings are changed.
"""
import json
import pathlib
import subprocess
import tempfile

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parents[2]
SOURCE = REPO / "autobyteus-server-ts/src/built-in-agents/templates/memory-compactor/agent.md"
OUT = HERE / "agy-cli-autobyteus-md-compat-probe-results.json"
MODEL = "gemini-3.8-flash-low"
EXPECTED_KEYS = {"episodes", "critical_issues", "unresolved_work", "durable_facts",
                 "user_preferences", "important_artifacts"}


def invoke(primary: pathlib.Path, agent_name: str) -> dict:
    p = subprocess.run(
        ["agy", "--new-project", "--agent", agent_name, "--model", MODEL,
         "--print", "Reply exactly PLAIN-OK. Do not output JSON.",
         "--output-format", "json", "--print-timeout", "60s"],
        cwd=primary, capture_output=True, text=True, timeout=100, check=False,
    )
    try:
        envelope = json.loads(p.stdout)
    except json.JSONDecodeError:
        envelope = {}
    response = envelope.get("response") or envelope.get("result", {}).get("response") or ""
    try:
        body = json.loads(response)
    except (json.JSONDecodeError, TypeError):
        body = None
    return {"exit": p.returncode, "status": envelope.get("status"),
            "responsePrefix": response[:300], "plainOk": response.strip() == "PLAIN-OK",
            "requiredJsonKeysPresent": isinstance(body, dict) and EXPECTED_KEYS.issubset(body),
            "stderrTail": p.stderr[-400:]}


original = SOURCE.read_text()
body = original.split("\n---\n", 1)[1].lstrip("\n")
with tempfile.TemporaryDirectory(prefix="autobyteus-agy-md-compat-") as temp:
    root = pathlib.Path(temp)
    cases = [
        ("verbatim_slug", "memory-compactor", original),
        ("verbatim_display_name", "Memory Compactor", original),
        ("adapted_main_agent", "memory-compactor", "---\nname: memory-compactor\n"
         "description: Summarizes target agent history.\nmainAgent: true\n---\n\n" + body),
    ]
    results = {}
    for label, name, content in cases:
        primary = root / label
        agent_file = primary / ".agents" / "agents" / name / "agent.md"
        agent_file.parent.mkdir(parents=True)
        agent_file.write_text(content)
        results[label] = invoke(primary, name)
    summary = {"source": "repository built-in Memory Compactor agent.md",
               "sourceCopiedByteForByteInVerbatimCases": True,
               "model": MODEL, "results": results,
               "limits": "One source file, one short conflicting prompt per case; model behavior is not parser introspection."}
    OUT.write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps(summary, indent=2))

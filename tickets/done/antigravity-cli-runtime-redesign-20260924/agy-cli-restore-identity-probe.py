"""Probe exact AGY restore and custom-agent identity across process restarts.

Uses a temporary primary workspace, no global-setting edits, short model turns.
"""
import json
import pathlib
import subprocess
import tempfile

OUT = pathlib.Path(__file__).with_name("agy-cli-restore-identity-probe-results.json")
MODEL = "gemini-3.8-flash-low"
NAME = "identity-sentinel"


def invoke(cwd, *args):
    p = subprocess.run(["agy", "--model", MODEL, "--agent", NAME, *args,
                        "--output-format", "json", "--print-timeout", "60s"],
                       cwd=cwd, capture_output=True, text=True, timeout=90)
    try:
        result = json.loads(p.stdout)
    except json.JSONDecodeError:
        result = {}
    return {"exit": p.returncode, "id": result.get("conversation_id"),
            "status": result.get("status"), "response": result.get("response"),
            "numTurns": result.get("num_turns"), "stderr": p.stderr[-500:]}


with tempfile.TemporaryDirectory(prefix="autobyteus-agy-restore-") as d:
    root = pathlib.Path(d)
    agent = root / ".agents" / "agents" / NAME / "agent.md"
    agent.parent.mkdir(parents=True)

    def write_agent(code):
        agent.write_text(
            f"---\nname: {NAME}\ndescription: Isolated restore probe.\nmainAgent: true\n---\n"
            f"# Core Instructions\nYour assigned identity code is {code}. "
            f"When asked for the assigned code, reply with {code} only.\n")

    write_agent("IDENTITY-ALPHA")
    start = invoke(root, "--new-project", "--print",
                   "Remember the nonce VALET-53. What is your assigned identity code? Reply only the code.")
    resumed = None
    changed_file = None
    if start["id"] and start["status"] == "SUCCESS":
        resumed = invoke(root, "--conversation", start["id"], "--print",
                         "What nonce did I tell you to remember? Reply only the nonce.")
        write_agent("IDENTITY-BETA")
        changed_file = invoke(root, "--conversation", start["id"], "--print",
                              "What is your assigned identity code now? Reply only the code.")
    summary = {"model": MODEL, "agent": NAME,
               "initialExpectedCode": "IDENTITY-ALPHA", "nonce": "VALET-53",
               "editedFileCode": "IDENTITY-BETA",
               "start": start, "exactResume": resumed, "resumeAfterAgentFileEdit": changed_file}
    OUT.write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps(summary, indent=2))

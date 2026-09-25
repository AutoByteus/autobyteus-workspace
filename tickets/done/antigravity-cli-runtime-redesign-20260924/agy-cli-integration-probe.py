"""Temporary-workspace AGY probe: added directory, local hook, log, invalid restore.

No global settings are edited. The only model turn requests a harmless file read.
Raw logs and hook payloads remain temporary; a sanitized result is persisted.
"""
import json
import pathlib
import subprocess
import tempfile
import uuid

OUT = pathlib.Path(__file__).with_name("agy-cli-integration-probe-results.json")
MODEL = "gemini-3.8-flash-low"


def launch(args, cwd, stdin=""):
    p = subprocess.run(["agy", *args], cwd=cwd, input=stdin,
                       capture_output=True, text=True, timeout=110, check=False)
    events = []
    for line in p.stdout.splitlines():
        try:
            events.append(json.loads(line))
        except json.JSONDecodeError:
            pass
    return p, events


with tempfile.TemporaryDirectory(prefix="autobyteus-agy-integration-") as d:
    root = pathlib.Path(d)
    primary = root / "primary"
    real = root / "real"
    primary.mkdir()
    real.mkdir()
    marker = real / "marker.txt"
    marker.write_text("REAL-WORKSPACE-MARKER-6731\n")
    hook_output = root / "hook-events.jsonl"
    hook_script = root / "capture-hook.py"
    hook_script.write_text(
        "import sys,json,pathlib\n"
        f"p=pathlib.Path({str(hook_output)!r})\n"
        "payload=json.load(sys.stdin)\n"
        "with p.open('a') as f: f.write(json.dumps({'conversationId':payload.get('conversationId'),"
        "'invocationNum':payload.get('invocationNum')})+'\\n')\n"
        "print(json.dumps({'injectSteps':[]}))\n"
    )
    hooks = primary / ".agents" / "hooks.json"
    hooks.parent.mkdir(parents=True)
    hooks.write_text(json.dumps({"autobyteus-probe": {"PreInvocation": [
        {"type": "command", "command": f"python3 {hook_script}"}
    ]}}))
    raw_log = root / "agy.log"
    prompt = f"Use your file-reading tool to read {marker} and reply only with its contents. Do not edit files."
    p, events = launch(["--new-project", "--model", MODEL, "--print", prompt,
                        "--output-format", "stream-json", "--add-dir", str(real),
                        "--log-file", str(raw_log), "--print-timeout", "60s"], primary)
    init = next((e for e in events if e.get("event") == "init"), {})
    result = next((e.get("result", {}) for e in events if e.get("event") == "result"), {})
    tool_names = [e.get("step_update", {}).get("tool_name") for e in events
                  if e.get("event") == "step_update" and e.get("step_update", {}).get("tool_name")]
    hook_rows = [json.loads(x) for x in hook_output.read_text().splitlines()] if hook_output.exists() else []
    log_text = raw_log.read_text(errors="replace") if raw_log.exists() else ""
    invalid_id = str(uuid.uuid4())
    invalid_proc, invalid_events = launch(["--conversation", invalid_id,
                                          "--input-format", "stream-json",
                                          "--output-format", "stream-json"], primary)
    invalid_init = next((e for e in invalid_events if e.get("event") == "init"), {})
    summary = {
        "model": MODEL,
        "addedDirectory": {
            "expectedMarker": "REAL-WORKSPACE-MARKER-6731",
            "exit": p.returncode, "conversationId": init.get("conversation_id"),
            "resultId": result.get("conversation_id"), "resultStatus": result.get("status"),
            "response": result.get("response"), "toolNames": sorted(set(tool_names)),
            "stderrTail": p.stderr[-700:],
        },
        "runLocalHook": {"called": bool(hook_rows), "records": hook_rows},
        "logFile": {"created": raw_log.exists(),
                    "containsConversationId": bool(init.get("conversation_id") and init["conversation_id"] in log_text),
                    "containsCreatedConversationLine": "Created conversation" in log_text},
        "invalidExactResume": {"requestedId": invalid_id, "exit": invalid_proc.returncode,
                               "reportedInitId": invalid_init.get("conversation_id"),
                               "stderrTail": invalid_proc.stderr[-350:]},
    }
    OUT.write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps(summary, indent=2))

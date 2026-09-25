"""Inspect AGY stream event fidelity for normal frontend/raw-trace projection.

Temporary workspace, harmless file read, no global settings edits or permission
bypass. Writes a sanitized event summary rather than the full provider stream.
"""
import json
import pathlib
import subprocess
import tempfile

OUT = pathlib.Path(__file__).with_name("agy-cli-stream-trace-probe-results.json")
MARKER = "TRACE-MARKER-924"
with tempfile.TemporaryDirectory(prefix="autobyteus-agy-stream-trace-") as tmp:
    root = pathlib.Path(tmp)
    primary, real = root / "primary", root / "real"
    primary.mkdir()
    real.mkdir()
    (real / "trace-marker.txt").write_text(MARKER + "\n")
    log = root / "agy.log"
    p = subprocess.run(
        ["agy", "--new-project", "--model", "gemini-3.8-flash-low",
         "--add-dir", str(real), "--log-file", str(log), "--print",
         "Read trace-marker.txt in the added directory using the file viewing tool, "
         "then reply with its exact contents only.",
         "--output-format", "stream-json", "--print-timeout", "60s"],
        cwd=primary, capture_output=True, text=True, timeout=100, check=False,
    )
    events = [json.loads(line) for line in p.stdout.splitlines() if line.strip().startswith("{")]
    init = next((x for x in events if x.get("event") == "init"), {})
    result = next((x.get("result", {}) for x in events if x.get("event") == "result"), {})
    updates = []
    for x in events:
        if x.get("event") != "step_update":
            continue
        s = x.get("step_update", {})
        info = s.get("tool_info") or {}
        updates.append({
            "stepIndex": s.get("step_index"), "type": s.get("step_type"),
            "state": s.get("state"), "toolName": s.get("tool_name"),
            "textDelta": s.get("text_delta"),
            "toolInfoKeys": sorted(info) if isinstance(info, dict) else [],
            "toolOutputType": type(info.get("output")).__name__ if isinstance(info, dict) else None,
            "toolOutputContainsMarker": MARKER in json.dumps(info.get("output", "")) if isinstance(info, dict) else False,
            "toolOutputLength": len(str(info.get("output", ""))) if isinstance(info, dict) else 0,
            "toolOutputPrefix": str(info.get("output", ""))[:220].replace(str(root), "<TEMP>") if isinstance(info, dict) else "",
            "toolError": json.loads(json.dumps(info.get("error")).replace(str(root), "<TEMP>")) if isinstance(info, dict) else None,
            "usagePresent": isinstance(s.get("usage"), dict),
        })
    summary = {
        "cliExit": p.returncode,
        "initHasConversationId": bool(init.get("conversation_id")),
        "initPermissionMode": init.get("init", {}).get("permission_mode"),
        "eventTypes": [x.get("event") for x in events],
        "steps": updates,
        "resultStatus": result.get("status"),
        "resultResponse": result.get("response"),
        "resultIdMatchesInit": result.get("conversation_id") == init.get("conversation_id"),
        "stderrTail": p.stderr[-300:],
        "logCreated": log.exists(),
        "logContainsMarker": MARKER in log.read_text(errors="replace") if log.exists() else False,
    }
    OUT.write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps(summary, indent=2))

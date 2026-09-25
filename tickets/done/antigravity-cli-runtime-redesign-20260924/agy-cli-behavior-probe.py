"""Small live-model probes for AGY 1.2.x instruction surfaces.

All workspace files are temporary; no global settings are edited. Model calls
are intentionally short. Results record only test markers and responses.
"""
import json
import pathlib
import subprocess
import tempfile

MODEL = "gemini-3.8-flash-low"
OUT = pathlib.Path(__file__).with_name("agy-cli-behavior-probe-results.json")


def run(args, cwd, stdin=""):
    p = subprocess.run(["agy", "--model", MODEL, *args], cwd=cwd, input=stdin,
                       capture_output=True, text=True, timeout=90, check=False)
    parsed = []
    for line in p.stdout.splitlines():
        try:
            parsed.append(json.loads(line))
        except json.JSONDecodeError:
            pass
    return {"exit": p.returncode, "stderr": p.stderr[-500:],
            "initId": next((x.get("conversation_id") for x in parsed if x.get("event") == "init"), None),
            "results": [{"status": x.get("result", {}).get("status"),
                         "response": x.get("result", {}).get("response"),
                         "conversationId": x.get("result", {}).get("conversation_id")}
                        if x.get("event") == "result" else
                        {"status": x.get("status"), "response": x.get("response"),
                         "conversationId": x.get("conversation_id")}
                        for x in parsed if x.get("event") == "result" or "status" in x]}


with tempfile.TemporaryDirectory(prefix="autobyteus-agy-behavior-") as d:
    root = pathlib.Path(d)
    first = root / "first-message"
    first.mkdir()
    prompts = [
        {"event": "user", "message": {"content":
            "For this conversation, act as agent Cedar. Your assigned identity code is FIRST-EMBER. Reply READY."}},
        {"event": "user", "message": {"content":
            "What is your assigned identity code? Reply with only the code."}},
    ]
    first_result = run(["--input-format", "stream-json", "--output-format", "stream-json",
                        "--print-timeout", "60s"], first,
                       "\n".join(json.dumps(x) for x in prompts) + "\n")

    rule = root / "rule"
    rule.mkdir()
    (rule / "AGENTS.md").write_text(
        "# Identity rule\nYour assigned identity code is RULE-CYAN. "
        "If asked for it, reply exactly RULE-CYAN and nothing else.\n")
    rule_result = run(["--print", "What is your assigned identity code? Reply only the code.",
                       "--output-format", "json", "--print-timeout", "60s"], rule)

    summary = {"model": MODEL, "firstMessageExpected": "FIRST-EMBER",
               "firstMessage": first_result, "workspaceRuleExpected": "RULE-CYAN",
               "workspaceRule": rule_result}
    OUT.write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps(summary, indent=2))

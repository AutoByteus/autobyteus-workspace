"""Two concurrent AGY projects with one mounted real workspace.

The probe makes no changes to the real workspace beyond its initial marker.
Run-local custom agents differ, and all paths are temporary.
"""
import concurrent.futures
import json
import pathlib
import subprocess
import tempfile

OUT = pathlib.Path(__file__).with_name("agy-cli-concurrency-probe-results.json")
MODEL = "gemini-3.8-flash-low"


def run(primary, real, name, code):
    agent = primary / ".agents" / "agents" / name / "agent.md"
    agent.parent.mkdir(parents=True)
    agent.write_text(f"---\nname: {name}\ndescription: Concurrency probe.\nmainAgent: true\n"
                     f"---\n# Core Instructions\nYour assigned code word is {code}. "
                     f"When asked for it, reply only {code}.\n")
    p = subprocess.run([
        "agy", "--new-project", "--agent", name, "--model", MODEL,
        "--add-dir", str(real), "--print",
        "What is your assigned code word? Reply only the code.",
        "--output-format", "json", "--print-timeout", "60s",
    ], cwd=primary, capture_output=True, text=True, timeout=90)
    try:
        result = json.loads(p.stdout)
    except json.JSONDecodeError:
        result = {}
    return {"agent": name, "expected": code, "exit": p.returncode,
            "conversationId": result.get("conversation_id"),
            "status": result.get("status"), "response": result.get("response"),
            "stderrTail": p.stderr[-400:]}


with tempfile.TemporaryDirectory(prefix="autobyteus-agy-concurrent-") as d:
    root = pathlib.Path(d)
    real = root / "real"
    real.mkdir()
    (real / "marker.txt").write_text("user-owned marker\n")
    before = sorted(str(p.relative_to(real)) for p in real.rglob("*"))
    primary_a, primary_b = root / "a", root / "b"
    primary_a.mkdir()
    primary_b.mkdir()
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        futures = [pool.submit(run, primary_a, real, "probe-a", "ALPHA-LIME"),
                   pool.submit(run, primary_b, real, "probe-b", "BETA-MAUVE")]
        results = [f.result() for f in futures]
    after = sorted(str(p.relative_to(real)) for p in real.rglob("*"))
    summary = {"model": MODEL, "sameRealWorkspace": True,
               "realWorkspaceEntriesBefore": before, "realWorkspaceEntriesAfter": after,
               "runs": results}
    OUT.write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps(summary, indent=2))

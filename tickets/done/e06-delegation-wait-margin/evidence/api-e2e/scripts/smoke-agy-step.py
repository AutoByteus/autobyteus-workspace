#!/usr/bin/env python3
# e06-delegation-wait-margin API/E2E (temporary): runs only the release smoke's Antigravity step, exactly as
# `scripts/release_smoke.py` runs it (its own STEPS entry, step_environment, _run_step, parse_report, failed_suite_errors and
# evaluate over the Antigravity required cases), without the live step (no provider quota). Prints the step's rows.
# Usage: python3 smoke-agy-step.py <worktree> <out dir>
import json, sys, tempfile, time
from pathlib import Path

worktree, out = Path(sys.argv[1]).resolve(), Path(sys.argv[2]).resolve()
sys.path.insert(0, str(worktree / "scripts"))
import release_smoke as rs  # noqa: E402

step = next(s for s in rs.STEPS if s.label == "antigravity")
required = [c for c in rs.REQUIRED_CASES if c.runtime == "antigravity"]
temp_root = Path(tempfile.mkdtemp(prefix="smoke-agy-step-")).resolve()
home = temp_root / "home-antigravity"; home.mkdir()
report, log = out / "smoke-agy-step.json", out / "smoke-agy-step.log"
env = rs.step_environment(step, __import__("os").environ, str(home))
print(f"step {step.label}: {step.suite}; env keys {sorted(env)}", flush=True)
started = time.monotonic()
exit_code = rs._run_step(step, env, report, log)
duration = time.monotonic() - started
results, file_errors = rs.parse_report(json.loads(report.read_text())) if report.exists() else ([], ["no report"])
suite_errors = {step.suite: file_errors[0]} if file_errors else {}
runtime_errors = {}
if exit_code != 0 and not file_errors:
    errors = rs.failed_suite_errors(log.read_text(errors="replace"))
    runtime_errors.update({r: e for r, e in errors.items() if r})
rows = rs.evaluate(required, results, {}, suite_errors, runtime_errors)
print(json.dumps({"exit": exit_code, "seconds": round(duration, 1), "passed": all(r.passed for r in rows),
                  "results": [{"title": r.title[:60], "status": r.status} for r in results],
                  "rows": [r.__dict__ if hasattr(r, "__dict__") else str(r) for r in rows]}, indent=1, default=str))

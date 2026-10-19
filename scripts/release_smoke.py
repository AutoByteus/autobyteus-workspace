#!/usr/bin/env python3
"""Release smoke check: start agent runs with configured skills on every runtime before a tag.

Run it from the repository root on the merged state you will tag (RELEASE.md, "Release smoke check"):

    python3 scripts/release_smoke.py

It runs three server E2E suites one after another, each in its own clean environment:

- live: `workspace-skill-links-live` with the real `claude`, `codex` and `grok` CLIs on their cheapest models;
- antigravity: E09/E10 of `agy-linked-skills-transport` with the scripted AGY CLI (no provider call);
- autobyteus: the release smoke cases of `configured-skill-on-demand-loading` with a deterministic LLM.

The verdict is fail-closed. Every required case below must appear exactly once in the vitest JSON report with
status `passed`, and no other test may fail. A runtime that cannot run (CLI missing, not signed in) or a case with no
result counts as failed, with the reason. The suites' own model overrides (CLAUDE_E2E_MODEL, CODEX_E2E_MODEL,
GROK_E2E_MODEL) and GROK_BUILD_COMMAND pass through. Exit code 0 means every case passed.
"""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Mapping, Sequence

REPO_ROOT = Path(__file__).resolve().parents[1]
SERVER_DIR = REPO_ROOT / "autobyteus-server-ts"
VITEST_BIN = SERVER_DIR / "node_modules" / ".bin" / "vitest"
AGY_FIXTURE = SERVER_DIR / "tests" / "fixtures" / "agy-failure-cli.mjs"

LIVE_SUITE = "tests/e2e/runtime/workspace-skill-links-live.e2e.test.ts"
AGY_SUITE = "tests/e2e/runtime/agy-linked-skills-transport.e2e.test.ts"
NATIVE_SUITE = "tests/e2e/runtime/configured-skill-on-demand-loading.e2e.test.ts"
# The live suite groups its tests per runtime under a `describe.each` title (claude, codex, grok).
SUITES_GROUPED_BY_RUNTIME = frozenset({LIVE_SUITE})
LIVE_RUNTIMES = ("claude", "codex", "grok")
LIVE_PASSTHROUGH = ("CLAUDE_E2E_MODEL", "CODEX_E2E_MODEL", "GROK_E2E_MODEL", "GROK_BUILD_COMMAND")
MODELS_LINE_RE = re.compile(r"SKILL_LINKS_LIVE_MODELS (\{[^\n]*?\})")
ANSI_RE = re.compile(r"\x1b\[[0-9;]*m")


@dataclass(frozen=True)
class RequiredCase:
    """One scenario on one runtime that must pass: the test in `suite` whose title contains `title`."""

    suite: str
    runtime: str
    title: str
    scenario: str


@dataclass(frozen=True)
class Step:
    label: str
    suite: str
    runtimes: tuple[str, ...]
    scripted: bool


@dataclass(frozen=True)
class TestResult:
    suite: str
    ancestors: tuple[str, ...]
    title: str
    status: str
    failure: str


@dataclass(frozen=True)
class Row:
    runtime: str
    scenario: str
    passed: bool
    reason: str = ""


_LIVE_SCENARIOS = (
    ("starts a new run in the linked workspace and continues it after restore", "new run + restore, linked workspace"),
    ("starts a brand-new team member with configured skills on its first message", "brand-new team member"),
    ("refuses a configured-skill run on a different same-named workspace skill", "different same-named skill"),
)
REQUIRED_CASES: tuple[RequiredCase, ...] = (
    *(RequiredCase(LIVE_SUITE, runtime, title, scenario)
      for runtime in LIVE_RUNTIMES for title, scenario in _LIVE_SCENARIOS),
    RequiredCase(AGY_SUITE, "antigravity", "E09: a brand-new run of an imported agent with a configured skill",
                 "brand-new run, linked workspace"),
    RequiredCase(AGY_SUITE, "antigravity", "E10: a brand-new team member with a configured skill",
                 "brand-new team member, linked workspace"),
    RequiredCase(NATIVE_SUITE, "autobyteus", "starts a brand-new run of an imported agent with a configured skill",
                 "brand-new run, linked workspace"),
    RequiredCase(NATIVE_SUITE, "autobyteus",
                 "starts a brand-new team member of an imported agent with a configured skill",
                 "brand-new team member, linked workspace"),
)
STEPS: tuple[Step, ...] = (
    Step("live", LIVE_SUITE, LIVE_RUNTIMES, scripted=False),
    Step("antigravity", AGY_SUITE, ("antigravity",), scripted=True),
    Step("autobyteus", NATIVE_SUITE, ("autobyteus",), scripted=True),
)


def preflight(environ: Mapping[str, str], which: Callable[[str], str | None] = shutil.which) -> dict[str, str]:
    """Returns the reason each live runtime cannot run on this machine; an empty dict when all can."""
    home = Path(environ.get("HOME", ""))
    commands = {"claude": "claude", "codex": "codex", "grok": environ.get("GROK_BUILD_COMMAND", "").strip() or "grok"}
    unavailable: dict[str, str] = {}
    for runtime, command in commands.items():
        if which(command) is None:
            unavailable[runtime] = f"not available: {command} not on PATH"
    if "codex" not in unavailable and not (home / ".codex" / "auth.json").is_file():
        unavailable["codex"] = "not available: ~/.codex/auth.json missing (codex not signed in)"
    return unavailable


def step_environment(step: Step, environ: Mapping[str, str], scripted_home: str) -> dict[str, str]:
    """The clean environment of one step (TESTING.md): nothing of the shell beyond what the step needs."""
    env = {"PATH": environ.get("PATH", ""), "TMPDIR": environ.get("TMPDIR", tempfile.gettempdir())}
    if not step.scripted:
        # The signed-in CLIs need the real HOME and, on macOS, USER and LOGNAME.
        env.update({key: environ[key] for key in ("HOME", "USER", "LOGNAME") if key in environ})
        env.update({"RUN_CLAUDE_E2E": "1", "RUN_CODEX_E2E": "1", "RUN_GROK_E2E": "1"})
        env.update({key: environ[key] for key in LIVE_PASSTHROUGH if environ.get(key, "").strip()})
        return env
    env["HOME"] = scripted_home
    if step.suite == AGY_SUITE:
        env.update({"RUN_AGY_FAILURE_E2E": "1", "ANTIGRAVITY_CLI_COMMAND": str(AGY_FIXTURE)})
    return env


def _first_line(text: str) -> str:
    lines = [line.strip() for line in ANSI_RE.sub("", text).splitlines() if line.strip()]
    return lines[0][:300] if lines else ""


def _suite_path(name: str, server_dir: Path) -> str:
    try:
        return Path(name).resolve().relative_to(server_dir.resolve()).as_posix()
    except ValueError:
        return name


def parse_report(report: Mapping[str, object], server_dir: Path = SERVER_DIR) -> tuple[list[TestResult], list[str]]:
    """Reads a vitest JSON report into per-test results and file-level errors (e.g. a failed import)."""
    results: list[TestResult] = []
    file_errors: list[str] = []
    for file_result in report.get("testResults", []):  # type: ignore[union-attr]
        suite = _suite_path(str(file_result.get("name", "")), server_dir)
        message = _first_line(str(file_result.get("message") or ""))
        if message:
            file_errors.append(f"{suite}: {message}")
        for test in file_result.get("assertionResults", []):
            failures = test.get("failureMessages") or []
            results.append(TestResult(suite=suite, ancestors=tuple(test.get("ancestorTitles", [])),
                                      title=str(test.get("title", "")), status=str(test.get("status", "")),
                                      failure=_first_line(str(failures[0])) if failures else ""))
    return results, file_errors


def _matches(case: RequiredCase, result: TestResult) -> bool:
    if result.suite != case.suite or case.title not in result.title:
        return False
    return case.suite not in SUITES_GROUPED_BY_RUNTIME or case.runtime in result.ancestors


def evaluate(required: Sequence[RequiredCase], results: Sequence[TestResult], unavailable: Mapping[str, str],
             suite_errors: Mapping[str, str]) -> list[Row]:
    """One row per required case, then one row per other failed test or suite error. Fail-closed."""
    rows: list[Row] = []
    claimed: set[int] = set()
    for case in required:
        matched = [index for index, result in enumerate(results) if _matches(case, result)]
        claimed.update(matched)
        cause = unavailable.get(case.runtime) or suite_errors.get(case.suite) or ""
        if not matched:
            rows.append(Row(case.runtime, case.scenario, False, cause or "no result"))
        elif len(matched) > 1:
            rows.append(Row(case.runtime, case.scenario, False, f"title matches {len(matched)} tests"))
        elif results[matched[0]].status != "passed":
            result = results[matched[0]]
            detail = result.failure or cause
            rows.append(Row(case.runtime, case.scenario, False, f"{result.status}: {detail}" if detail else result.status))
        else:
            rows.append(Row(case.runtime, case.scenario, True))
    for index, result in enumerate(results):
        if index not in claimed and result.status == "failed":
            rows.append(Row("other", result.title[:60], False, f"failed: {result.failure}"))
    for suite, error in suite_errors.items():
        rows.append(Row("other", Path(suite).name, False, error))
    return rows


def worktree_row(before: str, after: str) -> Row | None:
    if before == after:
        return None
    changed = sorted(set(after.splitlines()) ^ set(before.splitlines()))
    return Row("worktree", "left unchanged", False, "git status changed: " + "; ".join(changed[:5]))


def read_models(output: str) -> dict[str, str] | None:
    match = MODELS_LINE_RE.search(ANSI_RE.sub("", output))
    return json.loads(match.group(1)) if match else None


def format_summary(rows: Sequence[Row], commit: str, models: Mapping[str, str] | None,
                   durations: Mapping[str, float]) -> str:
    width = max([len(row.scenario) for row in rows] + [8])
    lines = ["", "Release smoke check", f"{'runtime':<12}{'scenario':<{width + 2}}result  reason"]
    for row in rows:
        lines.append(f"{row.runtime:<12}{row.scenario:<{width + 2}}{'PASS' if row.passed else 'FAIL':<8}{row.reason}"
                     .rstrip())
    passed = bool(rows) and all(row.passed for row in rows)
    lines += [
        "",
        f"commit    {commit}",
        f"models    {json.dumps(dict(models)) if models else 'not reported'}",
        "duration  " + ", ".join(f"{label} {seconds:.0f}s" for label, seconds in durations.items()),
        f"result    {'PASS' if passed else 'FAIL'}",
    ]
    return "\n".join(lines)


def _git(*args: str) -> str:
    completed = subprocess.run(["git", *args], cwd=REPO_ROOT, capture_output=True, text=True, check=False)
    if completed.returncode != 0:
        raise SystemExit(f"error: git {' '.join(args)} failed: {completed.stderr.strip()}")
    return completed.stdout


def _run_step(step: Step, env: Mapping[str, str], report: Path, log: Path) -> int:
    command = [str(VITEST_BIN), "run", step.suite, "--no-watch", "--reporter=default", "--reporter=json",
               f"--outputFile.json={report}"]
    with log.open("w") as output:
        process = subprocess.Popen(command, cwd=SERVER_DIR, env=dict(env), stdout=output, stderr=subprocess.STDOUT)
        try:
            return process.wait()
        except BaseException:
            process.terminate()
            process.wait()
            raise


def main() -> int:
    if not VITEST_BIN.exists():
        print(f"error: {VITEST_BIN} is missing; run `pnpm install` and `pnpm -C autobyteus-server-ts prebuild` first",
              file=sys.stderr)
        return 1
    commit = _git("rev-parse", "HEAD").strip()
    status_before = _git("status", "--porcelain")
    unavailable = preflight(os.environ)
    for runtime, reason in unavailable.items():
        print(f"preflight: {runtime} {reason}")

    # Outside the worktree: the release script needs a clean worktree afterwards.
    temp_root = Path(tempfile.mkdtemp(prefix="release-smoke-")).resolve()
    results: list[TestResult] = []
    suite_errors: dict[str, str] = {}
    durations: dict[str, float] = {}
    models: dict[str, str] | None = None
    passed = False
    try:
        for step in STEPS:
            scripted_home = temp_root / f"home-{step.label}"
            if step.scripted:
                scripted_home.mkdir()
            report, log = temp_root / f"{step.label}.json", temp_root / f"{step.label}.log"
            print(f"running {step.label} ({', '.join(step.runtimes)}): {step.suite}", flush=True)
            started = time.monotonic()
            exit_code = _run_step(step, step_environment(step, os.environ, str(scripted_home)), report, log)
            durations[step.label] = time.monotonic() - started
            if step.suite == LIVE_SUITE:
                models = read_models(log.read_text(errors="replace"))
            if not report.exists():
                suite_errors[step.suite] = f"no report (vitest exited {exit_code})"
                continue
            step_results, file_errors = parse_report(json.loads(report.read_text()))
            results += step_results
            if file_errors:
                suite_errors[step.suite] = file_errors[0]
            elif exit_code != 0 and not any(result.status == "failed" for result in step_results):
                suite_errors[step.suite] = f"vitest exited {exit_code} without a failed test"
        rows = evaluate(REQUIRED_CASES, results, unavailable, suite_errors)
        guard = worktree_row(status_before, _git("status", "--porcelain"))
        if guard:
            rows.append(guard)
        passed = all(row.passed for row in rows)
        print(format_summary(rows, commit, models, durations))
        return 0 if passed else 1
    finally:
        if passed:
            shutil.rmtree(temp_root, ignore_errors=True)
        else:
            # Keep only the step logs for diagnosis (TESTING.md Rule 9); they are outside the worktree.
            for entry in temp_root.iterdir():
                if entry.suffix != ".log":
                    shutil.rmtree(entry, ignore_errors=True) if entry.is_dir() else entry.unlink()
            print(f"logs      {temp_root}")


if __name__ == "__main__":
    sys.exit(main())

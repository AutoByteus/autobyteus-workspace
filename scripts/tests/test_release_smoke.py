import importlib.util
import sys
import unittest
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parents[1]
MODULE_PATH = SCRIPTS_DIR / "release_smoke.py"
SPEC = importlib.util.spec_from_file_location("release_smoke", MODULE_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("Unable to load release_smoke module")
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules["release_smoke"] = MODULE
SPEC.loader.exec_module(MODULE)

SERVER_DIR = Path("/repo/autobyteus-server-ts")


def case_title(case) -> str:
    """A realistic full test title that contains the required substring."""
    return f"{case.title} (suffix)"


def report_for(cases, status="passed", overrides=None, extra=None):
    """A vitest JSON report with one test per required case; `overrides` maps a case to its status."""
    by_suite = {}
    for case in cases:
        ancestors = ["suite"] + ([case.runtime] if case.suite in MODULE.SUITES_GROUPED_BY_RUNTIME else [])
        test_status = (overrides or {}).get(case, status)
        by_suite.setdefault(case.suite, []).append({
            "ancestorTitles": ancestors, "title": case_title(case), "status": test_status,
            "failureMessages": ["AssertionError: expected 1 to be 2\n    at stack"] if test_status == "failed" else [],
        })
    for suite, test in extra or []:
        by_suite.setdefault(suite, []).append(test)
    return {"testResults": [{"name": str(SERVER_DIR / suite), "status": "passed", "message": "",
                             "assertionResults": tests} for suite, tests in by_suite.items()]}


def evaluate(report, unavailable=None, suite_errors=None):
    results, _ = MODULE.parse_report(report, SERVER_DIR)
    return MODULE.evaluate(MODULE.REQUIRED_CASES, results, unavailable or {}, suite_errors or {})


def failures(rows):
    return [(row.runtime, row.scenario, row.reason) for row in rows if not row.passed]


class RequiredCasesTest(unittest.TestCase):
    def test_covers_every_runtime(self) -> None:
        runtimes = {case.runtime for case in MODULE.REQUIRED_CASES}
        self.assertEqual(runtimes, {"claude", "codex", "grok", "antigravity", "autobyteus"})
        self.assertEqual(len(MODULE.REQUIRED_CASES), 13)

    def test_titles_exist_in_the_suites(self) -> None:
        for case in MODULE.REQUIRED_CASES:
            source = (MODULE.SERVER_DIR / case.suite).read_text()
            self.assertEqual(source.count(case.title), 1, case)


class VerdictTest(unittest.TestCase):
    def test_all_cases_passed(self) -> None:
        rows = evaluate(report_for(MODULE.REQUIRED_CASES))
        self.assertEqual(failures(rows), [])
        self.assertEqual(len(rows), len(MODULE.REQUIRED_CASES))

    def test_missing_runtime_fails_with_no_result(self) -> None:
        cases = [case for case in MODULE.REQUIRED_CASES if case.runtime != "grok"]
        rows = evaluate(report_for(cases))
        self.assertEqual({(runtime, reason) for runtime, _, reason in failures(rows)}, {("grok", "no result")})
        self.assertEqual(len(failures(rows)), 3)

    def test_preflight_reason_names_the_runtime(self) -> None:
        cases = [case for case in MODULE.REQUIRED_CASES if case.runtime != "grok"]
        rows = evaluate(report_for(cases), unavailable={"grok": "not available: grok not on PATH"})
        self.assertEqual({reason for _, _, reason in failures(rows)}, {"not available: grok not on PATH"})

    def test_skipped_case_fails(self) -> None:
        skipped = MODULE.REQUIRED_CASES[-1]
        rows = evaluate(report_for(MODULE.REQUIRED_CASES, overrides={skipped: "skipped"}))
        self.assertEqual(failures(rows), [(skipped.runtime, skipped.scenario, "skipped")])

    def test_failed_case_shows_first_failure_line(self) -> None:
        failed = MODULE.REQUIRED_CASES[0]
        rows = evaluate(report_for(MODULE.REQUIRED_CASES, overrides={failed: "failed"}))
        self.assertEqual(failures(rows), [(failed.runtime, failed.scenario, "failed: AssertionError: expected 1 to be 2")])

    def test_other_failed_test_fails_the_check(self) -> None:
        extra = [(MODULE.AGY_SUITE, {"ancestorTitles": ["suite"], "title": "E01: something else", "status": "failed",
                                     "failureMessages": ["Error: boom"]})]
        rows = evaluate(report_for(MODULE.REQUIRED_CASES, extra=extra))
        self.assertEqual(failures(rows), [("other", "E01: something else", "failed: Error: boom")])

    def test_other_passed_or_skipped_tests_are_ignored(self) -> None:
        extra = [(MODULE.AGY_SUITE, {"ancestorTitles": ["suite"], "title": "E01", "status": "passed", "failureMessages": []}),
                 (MODULE.NATIVE_SUITE, {"ancestorTitles": ["suite"], "title": "x", "status": "skipped", "failureMessages": []})]
        self.assertEqual(failures(evaluate(report_for(MODULE.REQUIRED_CASES, extra=extra))), [])

    def test_duplicate_match_fails(self) -> None:
        duplicate = MODULE.REQUIRED_CASES[-1]
        extra = [(duplicate.suite, {"ancestorTitles": ["suite"], "title": f"{duplicate.title} again", "status": "passed",
                                    "failureMessages": []})]
        rows = evaluate(report_for(MODULE.REQUIRED_CASES, extra=extra))
        self.assertEqual(failures(rows), [(duplicate.runtime, duplicate.scenario, "title matches 2 tests")])

    def test_live_case_needs_its_runtime_ancestor(self) -> None:
        # A passed claude test does not satisfy the codex case with the same title.
        claude_only = [case for case in MODULE.REQUIRED_CASES if case.runtime not in ("codex", "grok")]
        rows = evaluate(report_for(claude_only))
        self.assertEqual({runtime for runtime, _, _ in failures(rows)}, {"codex", "grok"})

    def test_suite_error_fails_the_check(self) -> None:
        cases = [case for case in MODULE.REQUIRED_CASES if case.suite != MODULE.NATIVE_SUITE]
        rows = evaluate(report_for(cases), suite_errors={MODULE.NATIVE_SUITE: "no report (vitest exited 1)"})
        self.assertIn(("autobyteus", "brand-new run, linked workspace", "no report (vitest exited 1)"), failures(rows))
        self.assertIn(("other", Path(MODULE.NATIVE_SUITE).name, "no report (vitest exited 1)"), failures(rows))

    def test_file_level_error_is_reported(self) -> None:
        report = {"testResults": [{"name": str(SERVER_DIR / MODULE.LIVE_SUITE), "status": "failed",
                                   "message": "\x1b[31mError: Cannot find module x\x1b[39m\n  at y", "assertionResults": []}]}
        results, errors = MODULE.parse_report(report, SERVER_DIR)
        self.assertEqual(results, [])
        self.assertEqual(errors, [f"{MODULE.LIVE_SUITE}: Error: Cannot find module x"])


class PreflightTest(unittest.TestCase):
    def test_missing_cli_and_codex_login(self) -> None:
        on_path = {"claude": "/bin/claude", "codex": "/bin/codex"}
        unavailable = MODULE.preflight({"HOME": "/nonexistent-home"}, which=on_path.get)
        self.assertEqual(unavailable, {"grok": "not available: grok not on PATH",
                                       "codex": "not available: ~/.codex/auth.json missing (codex not signed in)"})

    def test_grok_command_override(self) -> None:
        unavailable = MODULE.preflight({"HOME": "/x", "GROK_BUILD_COMMAND": "/opt/grok"}, which=lambda command: None)
        self.assertEqual(unavailable["grok"], "not available: /opt/grok not on PATH")


class EnvironmentTest(unittest.TestCase):
    SHELL = {"PATH": "/bin", "HOME": "/Users/u", "USER": "u", "LOGNAME": "u", "TMPDIR": "/tmp/x",
             "OPENAI_API_KEY": "secret", "AUTOBYTEUS_DATA_DIR": "/real", "CODEX_E2E_MODEL": "gpt-x",
             "CLAUDE_E2E_MODEL": "  "}

    def test_live_step_gets_real_login_gates_and_overrides_only(self) -> None:
        env = MODULE.step_environment(MODULE.STEPS[0], self.SHELL, "/tmp/home")
        self.assertEqual(env, {"PATH": "/bin", "TMPDIR": "/tmp/x", "HOME": "/Users/u", "USER": "u", "LOGNAME": "u",
                               "RUN_CLAUDE_E2E": "1", "RUN_CODEX_E2E": "1", "RUN_GROK_E2E": "1",
                               "CODEX_E2E_MODEL": "gpt-x"})

    def test_scripted_steps_get_a_temp_home(self) -> None:
        agy = MODULE.step_environment(MODULE.STEPS[1], self.SHELL, "/tmp/home")
        self.assertEqual(agy, {"PATH": "/bin", "TMPDIR": "/tmp/x", "HOME": "/tmp/home", "RUN_AGY_FAILURE_E2E": "1",
                               "ANTIGRAVITY_CLI_COMMAND": str(MODULE.AGY_FIXTURE)})
        native = MODULE.step_environment(MODULE.STEPS[2], self.SHELL, "/tmp/home")
        self.assertEqual(native, {"PATH": "/bin", "TMPDIR": "/tmp/x", "HOME": "/tmp/home"})


class SummaryTest(unittest.TestCase):
    def test_worktree_guard(self) -> None:
        self.assertIsNone(MODULE.worktree_row("?? a\n", "?? a\n"))
        row = MODULE.worktree_row("?? a\n", "?? a\n?? b\n")
        self.assertFalse(row.passed)
        self.assertEqual(row.reason, "git status changed: ?? b")

    def test_failed_suite_error_from_log(self) -> None:
        output = ("\x1b[31m⎯⎯⎯ Failed Suites 1 ⎯⎯⎯\x1b[39m\n\n FAIL  tests/e2e/runtime/x.e2e.test.ts > suite\n"
                  "\x1b[31mError: codex model bogus is not offered; available: gpt-5.6-luna\x1b[39m\n ❯ x.ts:141:45\n")
        self.assertEqual(MODULE.failed_suite_error(output),
                         "Error: codex model bogus is not offered; available: gpt-5.6-luna")
        self.assertIsNone(MODULE.failed_suite_error(" ✓ all passed\n"))

    def test_models_line(self) -> None:
        output = 'stdout | x\n\x1b[2mSKILL_LINKS_LIVE_MODELS {"claude":"haiku","codex":"gpt-5.6-luna"}\x1b[22m\n'
        self.assertEqual(MODULE.read_models(output), {"claude": "haiku", "codex": "gpt-5.6-luna"})
        self.assertIsNone(MODULE.read_models("nothing"))

    def test_summary_result_line(self) -> None:
        rows = [MODULE.Row("claude", "brand-new team member", True),
                MODULE.Row("grok", "brand-new team member", False, "no result")]
        text = MODULE.format_summary(rows, "abc123", {"claude": "haiku"}, {"live": 61.2})
        self.assertIn("grok        brand-new team member  FAIL    no result", text)
        self.assertIn("commit    abc123", text)
        self.assertIn('models    {"claude": "haiku"}', text)
        self.assertIn("duration  live 61s", text)
        self.assertTrue(text.endswith("result    FAIL"))
        self.assertTrue(MODULE.format_summary(rows[:1], "abc", None, {}).endswith("result    PASS"))
        self.assertTrue(MODULE.format_summary([], "abc", None, {}).endswith("result    FAIL"))


if __name__ == "__main__":
    unittest.main()

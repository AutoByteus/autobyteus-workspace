# API/E2E Coverage Investigation — e06-delegation-wait-margin: E06 waits for a loaded machine; the node's Antigravity discovery bounds 10 s / 30 s

The plan. Results, confidence and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-002; REQ-001…003, AC-001…005, DEC-001, DEC-002)
- Design Spec: `design-spec.md`; Investigation Notes: `investigation-notes.md`; Solution Revision Record: `solution-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-001; direct route, Small / Low)
- Code Review: N/A (direct route)
- API/E2E Revision Record: `api-e2e-revision-record.md`; current revision `API-REV-001`; round 1
- Trigger: Implementation Engineer IR-001; code `88525bc56a` + `b1b95ea158`, documents `db70126996`; base `origin/personal` @ `53b72018ad`. The beta v1.5.14-beta.1 (autobyteus-538) waits for this.
- Note: the Solution Designer's documents and evidence are untracked in the worktree (not API/E2E's; left as they are)

## Current Requirement And Design Basis

E06 of `tests/e2e/runtime/agy-linked-skills-transport.e2e.test.ts` waits up to 90 s for the delegation result and 60 s for the child's launch; its limit is 180 s; nothing else in the test changes. The node's Antigravity discovery bounds: `--help`/`--version` 10 s (was 3), `models` 30 s (was 15); a caller's step deadline still wins (`commandBound`), so Settings › Agent Runtimes keeps its caps (install 4 s, models 8 s); a CLI that never answers still fails with `AGY_MODEL_DISCOVERY_TIMEOUT`, later.

## Supported Scenarios And Real Usage

- The release smoke's Antigravity step (RELEASE.md "Release smoke check"): the whole e2e file, scripted CLI, clean env (`scripts/release_smoke.py` `step_environment`), at the machine's load.
- Real use of REQ-003: a user on a busy computer starts an Antigravity run or opens a runtime list, and the `agy` CLI takes seconds to start: the node must not report it unavailable after 3 s. A CLI that never answers still reports the timeout. The Settings › Agent Runtimes page keeps answering within its caps.
- Technically possible but unsupported: none recorded.

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Repository Evidence | Material Risk Not Exercised | Candidate Broader Validation |
| --- | --- | --- | --- | --- |
| The e2e file (E06's waits) | Yes | IMP-E06-r2 3/3 | an independent run at this machine's load; the smoke's step as the script runs it | API-01, API-02 |
| Node: Antigravity discovery (process spawn, timers) | Yes | unit tests with fake timers and a fake CLI | the real node path (GraphQL → availability → spawn) with a slow and a hung CLI; Settings' caps through the real service | API-03 |
| Web, Android | No | — | — | — |

## Project Execution Discovery

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/e06-delegation-wait-margin`, branch `codex/e06-delegation-wait-margin`
- Testing guideline: `TESTING.md` (clean env; scripted CLIs; Rule 9; busy-`fseventsd` note), `RELEASE.md` (release smoke)
- The e2e file runs the server in-process from `src` (`startStudioE2eRuntimeServer`); the node checks of API-03 need `dist` rebuilt (the existing `dist` predates `b1b95ea158`: 3 s / 15 s)
- Changed build-input paths: `None` → no fresh-start case
- Secrets: none

## Existing Durable Coverage Inventory

| Path / Test | Decision | Action |
| --- | --- | --- |
| `tests/e2e/runtime/agy-linked-skills-transport.e2e.test.ts` | Still Valid (E06 updated by the change) | Run 3× (API-01) and through the smoke step (API-02) |
| `tests/unit/runtime-management/antigravity-cli-capability.test.ts` (new bound tests) | Still Valid | Reuse (IMP-E06-unit-*) |

## Planned Cases

| Case ID | Criteria | Kind | Planned Steps |
| --- | --- | --- | --- |
| R-IMP | AC-004, typecheck | Reused | IMP-E06-unit-runtime-management, -unit-repro, -server-typecheck |
| API-01 | AC-001, AC-005 | Existing Test | the whole file 3× with the smoke env (`env -i PATH HOME=<temp> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<fixture>`) |
| API-02 | AC-001, AC-005 (the release step) | Existing Test | the smoke's Antigravity step through `release_smoke.py`'s own `step_environment`, `_run_step`, `parse_report`, `evaluate` (no live runtimes) |
| API-03 | REQ-003, AC-004 at the node | Temporary Probe | a node from `dist` (rebuilt) with `ANTIGRAVITY_CLI_COMMAND` = (a) the fixture behind a 5 s start delay on `--help`/`--version`, (b) a CLI whose `--help` never answers; `runtimeAvailability(antigravity_cli)` and `availableAgentRuntimes` timed; (a) also on the base's bounds for contrast |
| API-04 | AC-002, AC-003 | Reading | the `until` helper's bounded wait and message; `git diff --stat` |

- Test progress log needed: `Yes`

## Durable Coverage To Add / Update / Remove

None planned.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`; reroute required: `No`

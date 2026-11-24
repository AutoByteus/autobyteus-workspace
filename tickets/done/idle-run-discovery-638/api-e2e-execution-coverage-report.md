# API/E2E Execution Coverage Report — idle-run-discovery-638 (autobyteus-638)

## Round

- Coverage investigation `api-e2e-coverage-investigation.md`; revision record `api-e2e-revision-record.md`, `API-REV-001`; progress log `api-e2e-test-progress.md`
- Round 1; trigger: the code reviewer's CRR-001 Pass (code `ae1e36cded`)
- Deviations from the plan:
  - Codex's conversation across a restart could not run: the host's Codex login has hit its usage limit until 2026-11-27. Codex's restore without inference was added and proven (RUN-X-CODEX-READY-*); conversation continuity across a restart is proven on Claude.
  - The scripted AGY needs `AGY_FAKE_CASE=linked_skills` (its default case answers with a failure), as other suites set it.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-run-discovery-638/tickets/in-progress/idle-run-discovery-638/evidence/API/`

## Routing Classification

- As carried (reviewed route: code review selected); test-code review: `Required`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform | Runtime / Build | Other Settings |
| --- | --- | --- | --- | --- |
| ENV-1 | code `ae1e36cded`; tests as committed in this round | macOS 26 (Darwin 25.5.0), arm64 | Node 22.23.1; this worktree's `dist` (IMP-04) | `env -i`, test-owned data roots; scripted LM Studio model; scripted AGY (`linked_skills`); `claude` 2.1.331 with the vault's Anthropic key to the CLI child only (throwaway HOME and `CLAUDE_CONFIG_DIR`, model haiku); `codex-cli` 0.172.0 with a throwaway `CODEX_HOME` linked to the host login (`gpt-6.1-terra`) |
| ENV-2 | as ENV-1 | Docker Desktop, image `autobyteus/autobyteus-server:beta` (arm64) | this worktree's server package (`docker buildx … --target server-package --platform linux/arm64`), mounted read-only | a test-owned container on 127.0.0.1, fresh anonymous volumes, the scripted AGY mounted read-only; removed with `docker rm -f -v`; the user's node containers untouched |

## Cases

| Case ID | Criteria | Boundary | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-001, AC-002, AC-003 | built server, native runtime | `env -i … RUN_RUNNING_RUNS_E2E=1 … vitest run tests/e2e/restart-resume/running-runs-built-server.e2e.test.ts` | ENV-1 | Pass | `API-01-02-running-runs.log`, `API-01-02-running-runs/RUN-01.json`, `RUN-02.json` | `✓ RUN-01`, `✓ RUN-02`; `Tests  4 passed (4)` | the implementation's cases, rerun with the new ones |
| API-02 | AR-001 walk 4b | a stop (RUN-03) and a kill (RUN-04) during the restore | same file (new cases) | ENV-1 | Pass | same; `RUN-03.json`, `RUN-04.json` | `"restoreDoneWhenStopped":false,"recordAfterInterrupted":7,"summary":"Running runs after the restart: 7 brought back, 0 skipped, 0 failed"` | The model server answers the model list slowly on the interrupted start, and the node is stopped as soon as the restore has asked for it |
| API-03 | AC-001, AC-002 on Antigravity, Claude, Codex | the built server with each runtime's CLI | `env -i … HOME=$HOME USER LOGNAME … <gate> … vitest run tests/e2e/restart-resume/running-runs-external-runtimes.e2e.test.ts` | ENV-1 | Pass (AGY, Claude; Codex without inference); Codex with inference Not Tested | `API-03-external-runtimes.log`, `API-03-external-runtimes/*.json` | AGY: `1 brought back` / `2 brought back`, `unchanged: true`, same session, answered. Claude: the same, and the answers `ORCHID-D04EA2` / `ORCHID-602969` (the codewords given before the restart). Codex READY: `1 brought back` / `2 brought back`, no input or model call | Codex with inference: the account's usage limit (`You've hit your usage limit … Nov 27th, 2026`). Codex READY: an empty thread is not saved by Codex, so the restore renews it with the existing renewal line (FU-002) |
| API-04 | AC-001, AC-002 on a Docker node | test-owned container: `docker stop`/`start`, then `docker kill`/`start` | build the package; `RUN_RUNNING_RUNS_DOCKER_E2E=1 RUNNING_RUNS_DOCKER_SERVER_PACKAGE=<folder> … vitest run tests/e2e/restart-resume/running-runs-docker-node.e2e.test.ts` | ENV-2 | Pass | `API-04-docker.log`, `API-04-docker/RUN-D-01.json` | `stopSummary`/`killSummary`: `Running runs after the restart: 1 brought back, 0 skipped, 0 failed`; the record kept the run at each end; `stopSession` = `killSession` = `session`; answered | The record is read from the stopped container's volume |
| API-05 | AC-005 (the plus one case) | RR-01: the reminded run and the control run are running idle before any input | `env -i … RUN_RESTART_REMINDER_E2E=1 … restart-reminder-built-server.e2e.test.ts -t RR-01` | ENV-1 | Pass | `API-05-rr01.log` | `✓ RR-01` with `runningBeforeInput: {busy: true, quiet: true}` and `requestsBeforeInput` 2 (woke nothing) | — |
| API-06 | all | whole ungated server E2E | `env -i PATH HOME=<fresh temp> TMPDIR pnpm test:e2e` | ENV-1 | Pass | `API-06-e2e.log`, `API-06-e2e-full.log.gz` | `Test Files  128 passed \| 175 skipped (303)`; `Tests  574 passed`; `EXIT 0` | — |
| API-07 | AC-005 (the rest) | the restart-reminder suite | Reused: IMP-06 on `ae1e36cded` | — | Pass except RR-10 (FU-001, red on the base too, IMP-08) | (handoff) | — | RR-10: out of scope, FU-001 |
| API-08 | — | server typecheck after the test files | `pnpm -C autobyteus-server-ts typecheck` | ENV-1 | Pass | `API-08-typecheck.log` | `972 in 299 files (baseline 972 in 299 files)` | — |
| API-09 | — | tracked imports | checker | ENV-1 | Pass | `API-09-imports.log` | `Tracked-import check passed` | No build input changed (no fresh-start build) |
| Reused | AC-003, AC-004, AC-006 | unit, integration | IMP-01, IMP-02 (whole unit), IMP-03 (whole integration), IMP-07 | — | Pass | (handoff) | — | same code |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By | Result | Note |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01 (native: an Agent run and a Team, listed and reachable), API-03 (AGY, Claude; Codex without inference), API-04 (Docker `docker stop`/`start`) | Proven | Codex's conversation after a restart is Not Tested (the account's usage limit); its restore is proven |
| AC-002 | Yes | API-01, API-02 (a kill during the restore), API-03 (kills), API-04 (`docker kill`) | Proven | — |
| AC-003 | Yes | API-01 (a stopped run stays unloaded), reused unit (archived, delegated, Org) | Proven | — |
| AC-004 | Yes | reused unit (IMP-02) | Proven (server test, as its method) | — |
| AC-005 | Yes | API-05, API-07 | Proven | RR-10 is red before this ticket (FU-001) |
| AC-006 | Yes | reused unit; API-01 (the stopped run) | Proven | — |

## Observations For Review

- **Codex, a run never messaged:** its empty thread is not saved by Codex, so its first activation renews the session with the renewal line. That activation is now the restore at the next start. Pre-existing renewal behavior; recorded as FU-002.

## Validation Confidence Scorecard (Mandatory)

| Category | Post-Repository | Final | Supports | Residual |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 95% | API-01 … API-05 | Codex continuity across a restart (inference) |
| Changed-boundary execution directness | 85% | 96% | real restarts, kills, Docker stop and kill | — |
| Cross-boundary integration realism and mock gap | 75% | 94% | the real Claude and Codex CLIs, a real Docker node | Codex inference after a restart; the Docker node used the scripted AGY |
| Environment, configuration, identity, fixture fidelity | 85% | 95% | isolated homes, the vault, a test-owned container | — |
| Failure, edge-case, lifecycle, recovery | 80% | 96% | a stop and a kill during the restore | — |
| User-surface / browser | N/A | N/A | server-only change | — |
| Durable regression coverage | 85% | 95% | RUN-03/04, external runtimes, Docker, RR-01 | the live cases need credits; the Docker case needs a package build |

- Overall final confidence: 95%. Every critical criterion is directly proven; no category is below 90%.
- Confidence-limiting residual risk: a Codex conversation's continuity after a restart, on real inference, is unproven until the account has credits again (from 2026-11-27). The cases stay in the suite.

## Broader Validation Decision (Mandatory)

- Decision: `Required` — executed: built server with the native, scripted AGY, real Claude and real Codex runtimes; a test-owned Docker node.

## Persisted-Data Transition Checks

- A new small record file, `restart-resume/running-runs.json`. No migration. Its contents after a stop, a kill, and an interrupted restore are checked (API-01, API-02, API-04).

## Compatibility / Legacy Scope Check

- No compatibility behavior introduced, observed or covered.

## Durable Coverage Changed In The Codebase

| Path | Change | Case IDs |
| --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/restart-resume/running-runs-built-server.e2e.test.ts` | Updated: RUN-03, RUN-04 (walk 4b); the scripted model can hold its model-list answer | API-02 |
| `autobyteus-server-ts/tests/e2e/restart-resume/running-runs-external-runtimes.e2e.test.ts` | Added (AGY, Claude, Codex; Codex READY without inference) | API-03 |
| `autobyteus-server-ts/tests/e2e/restart-resume/running-runs-docker-node.e2e.test.ts` | Added | API-04 |
| `autobyteus-server-ts/tests/e2e/restart-resume/restart-reminder-built-server.e2e.test.ts` | Updated: RR-01 asserts both runs running idle before any input | API-05 |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| Native model | scripted LM Studio server | deterministic | — |
| Antigravity | scripted AGY CLI | no signed-in AGY in tests | its session handling is the fixture's |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| Built-server roots and runtime homes | Yes | removed by the suites | removed |
| Docker container and its anonymous volumes | Yes | `docker rm -f -v` | 0 left |
| Server package build folder | Yes | under `/tmp` | kept for reruns of the Docker case |

## Latest Authoritative Result

- Result: `Pass`.
- Not proven: Codex's conversation continuity after a restart with inference: `Not Tested`, because the host account has no credits until 2026-11-27. AC-001 and AC-002 are proven by their stated methods without it.
- Evidence decisions requested: `None`.
- Next recipient from `get_handoff_rules`: `/code_reviewer` (test-code review).

# API/E2E Execution Coverage Report

## Round

- Coverage investigation: /Users/normy/autobyteus_org/autobyteus-worktrees/stopped-run-edit-root-check/tickets/in-progress/stopped-run-edit-root-check/api-e2e-coverage-investigation.md
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1; implementation engineer's direct-route handoff (code `79b268d2f9`, IR-001)
- Prior round reviewed: none
- Deviations from the plan: `None`
- Evidence folder: /Users/normy/autobyteus_org/autobyteus-worktrees/stopped-run-edit-root-check/tickets/in-progress/stopped-run-edit-root-check/evidence/api-e2e/

## Routing Classification

- Task size: `Small`; Architectural risk: `Low`; Input route: `Direct Low-Risk`; Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime | Other Settings |
| --- | --- | --- | --- | --- |
| ENV-1 | `747f2ae65d` (code identical to `79b268d2f9`; the new test file committed with this round) | macOS arm64 (Darwin 25.5) | Node v22.23.1, pnpm 10.28.2, server built with `pnpm build` (exit 0), vitest 4.1.12 | `env -i`, private HOME, owned data root and database; scripted Antigravity CLI (`linked_skills`, `AGY_FAKE_EXTRA_MODELS`, `AGY_FAKE_PROCESS_LOG`), LM Studio stand-in |

## Cases

| Case ID | Criteria | Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-03 | AC-005 | server unit, typecheck, integration | implementation check IMP-03 (`Reused`) | | Pass (reused) | implementation handoff row IMP-03 | per that row | code unchanged since `79b268d2f9` (`git diff 79b268d2f9 747f2ae65d -- . ':!tickets'` is empty) |
| API-02 | AC-001..005 | unit, real root and manager | `autobyteus-server-ts`: `pnpm exec vitest run tests/unit/standalone-agent-run-root tests/unit/agent-execution/agent-run-restore-service.test.ts --no-watch` | ENV-1 | Pass | `API-02-focused-unit.log` | `Tests  66 passed (66)` | independent rerun of IMP-02 |
| API-01 | AC-001, AC-002, AC-004 (SRE-01..03) | built server, GraphQL + WebSocket + real process kill | `autobyteus-server-ts`: `env -i PATH HOME=<fresh> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs pnpm exec vitest run tests/e2e/runtime/stopped-run-edit-root-built-server.e2e.test.ts --no-watch` | ENV-1 | Pass (3 of 3 runs) | `API-01-built-server-root-follows-edit.log` | `✓ SRE-01..03: copies delegated from the registered root after a saved edit of the crashed host carry the saved launch; ...`, `Tests  1 passed (1)` | a scripted host delegates copy one (inherits `gemini-3.8-flash-low`); while the host is live the edit is refused (`RUN_ACTIVE`); the host's Antigravity process is SIGKILLed (host offline, root and copy survive); `updateStoppedAgentRunSelection` to `sre-alt-model` is `UPDATED` and writes nothing to the host's traces; copy one, messaged through the collaboration stream, delegates copy two: its stored source launch is `sre-alt-model` while copy one keeps `gemini-3.8-flash-low`; the host (woken by the report) is crashed again; an edit to the native runtime leaves a pending switch (`from` Antigravity); copy three inherits the native runtime and model; the host's next input (the copy report's wake) writes one marker and one segment holding the Antigravity agent and clears the pending |
| X-A | AC-001 | mutation, manager refresh | `dist/` manager `refreshInheritedLaunch` returns at once | ENV-1 | Fail (expected) | `X-mutations.log` | `AssertionError: copy two carries the SAVED model` | restored, cmp identical |
| X-B | AC-001 | mutation, root setter | `setInheritedLaunch` does nothing | ENV-1 | Fail (expected) | `X-mutations.log` | same | restored |
| X-C | AC-001 | mutation, service | the service never calls the refresh | ENV-1 | Fail (expected) | `X-mutations.log` | same | restored |
| API-03 | regression | built server | `vitest run tests/e2e/projects/delegated-copy-member-contact-host.e2e.test.ts tests/e2e/runtime/agent-initiated-collaborators.e2e.test.ts` (same env) | ENV-1 | Pass | `API-03-regression-e2e.log` | `Tests  1 passed | 36 skipped (37)` | the 36 skipped are gated off by that file's own gate, not by me |

Observation: the built-server case reaches the refresh by itself. The delegation by a surviving copy does not pass `resolveRootAndEnsureHost`, which is why disabling the refresh alone (X-A, X-C) fails the case; the manager's heal is unit-covered only.

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | User-only |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01, API-02, X-A..X-C | Proven (the model-only edit on the built server; the undo by unit tests) | |
| AC-002 | Yes | API-01 (the runtime change, pending switch, marker at the host's input), API-02 | Proven | |
| AC-003 | No | API-02 | Proven by unit test only (a load window cannot be staged on a built server) | |
| AC-004 | Yes | API-01 (live refusal, then edit allowed offline), API-02 | Proven | |
| AC-005 | No | API-02, IMP-03 | Proven (unit; every other edit test on a built server runs with no root) | |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository | Final | Supports (Cases) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 94% | 94% | API-01, API-02 | AC-003 unit only; the undo built-server not run | |
| Changed-boundary execution directness | 96% | 96% | API-01 enters through the GraphQL edit and a real delegation | | |
| Cross-boundary integration realism and mock gap | 92% | 92% | real process crash, real server and database | scripted Antigravity and native model | |
| Environment, configuration, identity, and fixture fidelity | 92% | 92% | ENV-1 | | |
| Failure, edge-case, lifecycle, and recovery evidence | 94% | 94% | host crash with a surviving root, refusal while live, runtime switch after the edit, X-A..X-C | the root-load window | |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | server-only change; Settings editability was not changed | | |
| Durable regression coverage quality and relevance | 95% | 95% | the new built-server file plus the unit file; three mutations | | |

- Overall post-repository confidence: 94%; overall final confidence: 94%
- Calculation method: simple average of six applicable categories ((94+96+92+92+94+95)/6 = 93.8%); no broader surface added
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `No` (94%): the only gaps are the unstageable root-load window (AC-003, unit-covered) and scripted runtimes
- Confidence-limiting residual risks: as above

## Broader Validation Decision (Mandatory)

- Decision: `Required`, executed
- Execution mode: `Live API` (built server, scripted runtimes)
- Gap addressed: the unit fixture cannot show the wiring from the GraphQL edit to the root, nor a real crash; the built-server case closes it
- Browser validation: not needed; no rendered behavior changed

## Persisted-Data Transition Checks / Desktop Validation

Not applicable.

## Compatibility / Legacy Scope Check

- Backward compatibility in scope or observed: `No`; compatibility-only coverage: `No`

## Durable Coverage Changed In The Codebase

- Added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/stopped-run-edit-root-built-server.e2e.test.ts` | Added (gated by `RUN_AGY_FAILURE_E2E=1` and `ANTIGRAVITY_CLI_COMMAND`) | API-01 | |

- Attached for proportional test-code review: `Not Applicable` (direct low-risk route)

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| Antigravity CLI | scripted `tests/fixtures/agy-failure-cli.mjs` | no real account; deterministic tool calls | its real stream not exercised |
| Native model | LM Studio stand-in | deterministic | native model behavior not exercised |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup | Result |
| --- | --- | --- | --- |
| vitest data roots, databases, scripted CLI processes | Yes | `removeOwnedTestRuntime`, `server.stop()`; the killed host process died by my SIGKILL | removed |
| `dist/` mutations X-A..X-C | Yes | restored, `cmp` identical | clean (`git status`: only my test file untracked, besides the untracked build output folders) |
| `dist/` rebuilt from the commit | Yes | kept (untracked build output) | |
| `/tmp/sre-*` logs | Yes | evidence copies are committed | |

## Preliminary Classification (On `Fail`)

Not applicable.

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or user-only parts: `None` (AC-003 proven by unit test only, as designed)
- Next recipient: `delivery_engineer`
- Notes: the documentation of the lifecycle port (`standalone_agent_run_root.md`) is left to delivery's docs sync, as the implementation handoff says; `standalone-agent-run-root.ts` is at exactly 500 non-empty lines (no headroom).

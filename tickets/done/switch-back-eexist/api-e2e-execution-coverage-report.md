# API/E2E Execution Coverage Report

## Round

- Coverage investigation: /Users/normy/autobyteus_org/autobyteus-worktrees/switch-back-eexist/tickets/in-progress/switch-back-eexist/api-e2e-coverage-investigation.md
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1; implementation engineer's direct-route handoff (code `9833f51bf9`, IR-001)
- Prior round reviewed: none
- Deviations from the plan: the live case uses Claude as the other runtime (the Codex account is at its usage limit)
- Evidence folder: /Users/normy/autobyteus_org/autobyteus-worktrees/switch-back-eexist/tickets/in-progress/switch-back-eexist/evidence/api-e2e/

## Routing Classification

- Task size: `Small`; Architectural risk: `Low`; Input route: `Direct Low-Risk`; Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime | Other Settings |
| --- | --- | --- | --- | --- |
| ENV-1 | `4408d54504` (code identical to `9833f51bf9`; the new test files committed with this round) | macOS arm64 (Darwin 25.5) | Node v22.23.1, pnpm 10.28.2, server built with `pnpm build` (exit 0), vitest 4.1.12 | `env -i`, private HOME, owned data root and database; scripted Antigravity CLI (`linked_skills`), LM Studio stand-in |
| ENV-2 | same | same | built server as ENV-1; real `agy` 1.5.3 and real `claude` | real HOME, USER, LOGNAME; test-owned data root and database; the installed `agy` keeps no separate token file here, so the run uses the host login and adds conversations to the user's `agy` and `claude` histories (a synthetic `ls` task) |

## Cases

| Case ID | Criteria | Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-06 | all | full unit, typecheck | implementation check IMP-06 (`Reused`) | | Pass (reused) | implementation handoff row IMP-06 | `Tests  8172 passed | 9 skipped` | code unchanged since `9833f51bf9` (`git diff 9833f51bf9 4408d54504 -- . ':!tickets'` is empty) |
| UNIT | AC-004..007 | unit | `autobyteus-server-ts`: `pnpm exec vitest run tests/unit/agent-execution/backends/antigravity --no-watch` | ENV-1 | Pass | (run output, not saved) | `Test Files  21 passed | 4 skipped`, `Tests  324 passed | 6 skipped (330)` | independent rerun covering the capsule and factory cases |
| API-01 | AC-001, 003 | built server, standalone | `autobyteus-server-ts`: `env -i PATH HOME=<fresh> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs pnpm exec vitest run tests/e2e/runtime/runtime-switch-native-built-server.e2e.test.ts --no-watch` | ENV-1 | Pass | `API-01-rerun-native-built-server.log` | `Tests  9 passed (9)` | RS-01..09 including the four-hop RS-09 |
| API-02 | AC-002, preserved | built server, Team and others | same env; `runtime-switch-members-built-server` and `runtime-switch-members-extended-built-server` | ENV-1 | Pass | `API-02-rerun-members-built-server.log` | `Tests  5 passed (5)` twice | MS-01..05 (MS-05 is the Team member's return) and EX-01..05 |
| API-03 | AC-001, 002, 004, 005 (SB-01..03) | built server, Org member, copy, Team member, restart, failed-start retry | same env; `vitest run tests/e2e/runtime/agy-switch-back-built-server.e2e.test.ts --no-watch` | ENV-1 | Pass (2 of 2 runs) | `API-03-switch-back-built-server.log` | `✓ SB-01: an Org member Antigravity -> native -> Antigravity: restart before the third era, ...`, `✓ SB-02 ...`, `✓ SB-03 ...`, `Tests  3 passed (3)` | SB-01: a direct Org member and a nested worker go Antigravity → native → Antigravity; the server restarts before the third era; the direct member's first message there fails at the real archive step (a folder named `raw_traces_000002.jsonl`) after its Antigravity capsule was made: the ack names EISDIR and not EEXIST, the previous file is byte-identical, the switch stays pending, then the retry completes with one marker, one segment holding exactly the native era's records (I-7) and the first segment unchanged; SB-02: a delegated copy, through the host's Settings choice and wake; SB-03: a Team member with a restart between the save and the message, ending with a new Antigravity session bound and the pending cleared |
| API-04 | AC-002 | live real `agy` and `claude`, Team member | `autobyteus-server-ts`: `env -i PATH HOME USER LOGNAME TMPDIR RUN_AGY_SWITCH_BACK_E2E=1 RUN_CLAUDE_E2E=1 pnpm exec vitest run tests/e2e/runtime/agy-switch-back-live.e2e.test.ts --no-watch` | ENV-2 | Pass | `API-04-live-agy-claude-agy.log`, `API-04-live-segments/` | `✓ LV-01: a Team member, Antigravity -> other runtime -> Antigravity`; manifest `[(1, 'antigravity_cli', 'runtime_switch', 4, 'complete'), (2, 'claude_agent_sdk', 'runtime_switch', 8, 'complete')]`; the active file starts with the marker `Agent runtime changed from Claude Agent SDK …` then `user`, `assistant CONTINUED` | real Antigravity does a shell task, the member goes to real Claude and back to real Antigravity, which answers in its third era; I-7 asserted by exact record-id equality on both segments, the first segment unchanged, one marker per file |
| X-A | AC-001, 002, 005 | mutation, built server | compiled `agy-run-capsule.js` without the `fs.rm`; API-03 | ENV-1 | Fail (expected) | `X-mutations.log` | `Tests  3 failed (3)`, `"code": "EEXIST"` | the base behavior: all three fail; restored, cmp identical |
| X-B | AC-002 | mutation, live | same mutation; API-04 | ENV-2 | Fail (expected) | `X-mutations.log` | `× LV-01 ...`, `EEXIST: file already exists, mkdir '…/agy-project'` | the real run reproduces the incident without the fix |
| API-05 | AC-006, regression | e2e | `vitest run tests/e2e/runtime/agy-linked-skills-transport.e2e.test.ts tests/e2e/runtime/agy-failure-transport.e2e.test.ts tests/e2e/projects/delegated-copy-model-change.e2e.test.ts --no-watch`; DCM alone with its documented command (`HOME=$HOME`) | ENV-1 | Pass (see Notes) | `API-05-regression-agy-and-delegated-copy.log` | documented DCM command: `Tests  9 passed (9)`; nine combined runs: `Tests  43 passed | 1 skipped (44)` | the first combined run (private HOME) failed once: DCM-009's last assertion, the stop of the copy, returned `success: false`; the message was not captured; it passed in the next nine combined runs and alone, so it is not attributed: follow-up FU-1 |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | User-only |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01 (RS-09), API-03, X-A | Proven | |
| AC-002 | Yes | API-02 (MS-05), API-03, API-04, X-A, X-B | Proven | |
| AC-003 | Yes | API-01 (RS-01, RS-09), API-02 | Proven | |
| AC-004 | Yes | API-03, API-01 (RS-09 hop 2 is the stuck state), UNIT | Proven | the user's own stuck run on node 8001 was not read; it is exactly this state |
| AC-005 | Yes | API-03 (SB-01 failed start then retry on a built server), UNIT (factory retry) | Proven | |
| AC-006 | No | UNIT (two cases: link target and workspace intact), API-05 (linked-skills e2e) | Proven | |
| AC-007 | No | UNIT (restore case), API-05 | Proven | |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository | Final | Supports (Cases) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | 96% | API-01..04, UNIT | | |
| Changed-boundary execution directness | 96% | 97% | API-03 and API-04 start real Antigravity eras on the built server | | |
| Cross-boundary integration realism and mock gap | 90% | 94% | API-04: real `agy` and `claude` | Codex not run (usage limit); Org and copy returns not live | a live Codex or copy run |
| Environment, configuration, identity, and fixture fidelity | 92% | 93% | ENV-1, ENV-2 | live run on the host login | |
| Failure, edge-case, lifecycle, and recovery evidence | 94% | 95% | SB-01 (restart, failed start, retry), X-A, X-B | | |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | no user surface changed | | |
| Durable regression coverage quality and relevance | 92% | 94% | SB-01..03, LV-01 and the implementer's RS-09, MS-05 and unit cases | one unexplained single failure of DCM-009 (FU-1) | capture its message when it recurs |

- Overall post-repository confidence: 93%; overall final confidence: 95%
- Calculation method: simple average of six applicable categories (final: 96+97+94+93+95+94 = 569/6 = 94.8%)
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes` (94.8%, rounded)
- Confidence-limiting residual risks: Codex not exercised live; Org member and copy returns are built-server only; FU-1.

## Broader Validation Decision (Mandatory)

- Decision: `Required`, executed
- Execution mode: `Live API` (built server; real `agy` and `claude`)
- Gap addressed: the implementer's cases are scripted and cover standalone and Team member only; the Org member, the copy, the restart, the failed-start retry and the real Antigravity CLI were not exercised
- Browser validation: not needed; nothing rendered changed

## Persisted-Data Transition Checks / Desktop Validation

Not applicable.

## Compatibility / Legacy Scope Check

- Backward compatibility in scope or observed: `No`; compatibility-only coverage: `No`

## Durable Coverage Changed In The Codebase

- Added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/agy-switch-back-built-server.e2e.test.ts` | Added (gated by `RUN_AGY_FAILURE_E2E=1`) | API-03 | |
| `autobyteus-server-ts/tests/e2e/runtime/agy-switch-back-live.e2e.test.ts` | Added (gated by `RUN_AGY_SWITCH_BACK_E2E=1` and `RUN_CLAUDE_E2E=1`, or `RUN_CODEX_E2E=1` with `AGY_SWITCH_BACK_OTHER=codex`) | API-04 | |
| `TESTING.md` (rule 10, committed on its own) | Updated | | |

- Attached for proportional test-code review: `Not Applicable` (direct low-risk route)

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| Antigravity CLI (API-01..03, 05) | scripted `tests/fixtures/agy-failure-cli.mjs` | deterministic, no account | real stream not exercised there; API-04 uses the real one |
| Native model | LM Studio stand-in | deterministic | native model behavior not exercised |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup | Result |
| --- | --- | --- | --- |
| vitest data roots, databases, scripted CLI processes; the live run's server and data root | Yes | `removeOwnedTestRuntime`, `server.stop()` | removed |
| `dist/` mutations X-A, X-B | Yes | restored, `cmp` identical | clean |
| Instrumentation of `delegated-copy-model-change.e2e.test.ts` for FU-1 | Yes | `git checkout` of the file after each use | clean (`git status`: only my two new test files untracked, besides build output) |
| Claude and `agy` conversations created by the live run | Yes | not removable by me | remain in the user's histories (synthetic task); disclosed |

## Preliminary Classification (On `Fail`)

Not applicable.

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or user-only parts: `None`; the user's own stuck run on node 8001 was deliberately not read
- Next recipient: `delivery_engineer`
- Notes: FU-1 (a single unexplained failure of DCM-009) is in `follow-ups.md`; TESTING.md gained one rule (see the commit `docs(testing): ...`).

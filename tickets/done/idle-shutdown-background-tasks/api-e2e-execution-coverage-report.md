# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/requirements-doc.md` (SR-003)
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/solution-revision-record.md`
- Design Spec (required on every route): `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/design-spec.md` (SR-003)
- Supplemental Task Artifacts: `problem-report.md`, `handoff-architecture-design-complete.md`, `evidence/baseline-before/`, `evidence/hybrid/`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/design-review-report.md` (ARCH-REV-002)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/implementation-handoff.md` (IR-003)
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/code-review-report.md` (CRR-003)
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/code-review-revision-record.md`
- Delivery Revision Record: N/A
- Relevant Delivery Revision IDs: N/A
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/api-e2e-coverage-investigation.md` (round 2)
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: 1. This is the first completed API/E2E result. The investigation is at round 2 because the round-1 (SR-002) investigation was stopped before any result.
- Trigger: CRR-003 pass (SR-003 hybrid, IR-003)
- Prior Round Reviewed: None completed
- Latest Authoritative Round: 1

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`

## Investigation And Execution Basis

- Coverage investigation artifact: see above
- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes`. Deviations:
  - (a) The live AGY test first used an externally killed daemon. AGY 1.3.1 writes no exit message for that, so I switched to the self-exiting daemon pattern the existing AGY live test uses.
  - (b) I added a `failed` exit (code 3) to the scripted E2E to cover the REQ-002 "failed" end.
  - (c) The mixed suite needed the documented `CODEX_E2E_TOOL_MODEL` override because its default Codex model list is stale.
- Existing coverage decisions revised during execution: the two round-1 untracked files were replaced (rewritten for SR-003).
- Reroute required before or during execution: `No`
- Notes: Every attempt that failed was caused by the test or the environment, not the product; see the ledger.

## Test-Case Ledger Reconciliation

- Ledger path: see above
- Ledger initialized before execution: `Yes`
- Every completed case recorded immediately: `Yes`
- Long-running case checkpoints recorded when needed: `Yes` (start events for LIVE-MIXED)
- Ledger reconciled into this report: `Yes`
- Last durably recorded event: 16
- Cases still running, interrupted, or not started: None
- Interruption, context-compression, or rerun note: none

| Case ID | Final Result | Last Event | Evidence / Artifact Path | Reconciled Result / Follow-Up |
| --- | --- | --- | --- | --- |
| R-FOCUS | Pass (no new failures) | 1 | `evidence/api-e2e/r2-focused.log`, `.json` | 56 base failures (rule 9 item already reported by the implementer) |
| R-FOCUS-BASE | Pass | 6 | `r2-focused-base.log`, `.json` | HEAD failures ⊂ base failures |
| FIX-001 | Pass | 2 | console (16 passed) | — |
| AC008 | Pass | — | diff/grep in report | — |
| E2E-HYB | Pass | 15 | `r2-e2e-idle-3.log`, `e2e-idle/task-copy-idle-lifetime.json` | — |
| E2E-HYB-BASE | Expected Fail (sensitivity) | 5 | `r2-e2e-idle-base.log` | — |
| LIVE-CLAUDE | Pass | 7 | `r2-live-claude.log`, `live-claude/` | — |
| LIVE-AGY | Pass | 10 | `r2-live-agy-3.log`, `live-agy/` | — |
| E2E-REG | Pass | 11 | `r2-<suite>.log`, `r2-scripted-summary.txt` | — |
| LIVE-MIXED | Pass | 14 | `r2-live-mixed-2.log` | — |
| R-UNIT | Pass (no new failures) | 16 | `r2-unit-full.log`, `.json` | 43 base failures in 15 out-of-scope files |

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`. The SR-002 revert is complete (`git diff --stat 3a2496c95 a1dc499e4 -- . ':!tickets'` = the kept Claude E2E and the `ba0437e00` test only); no `withLiveChain` residue.
- Approved persisted-data transition followed: `N/A` (`Not Affected`; the grace setting is unchanged and was read from the settings store in the scripted E2E)
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Changed Boundary And Evidence Matrix

| Case ID | Behavior / Requirement / AC IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| LIVE-CLAUDE | BEH-001/003, REQ-001/002, AC-001, AC-005 | Claude registry → backend → quiet check; idle after completion turn → re-arm | Real server, Team root, real Claude CLI (haiku), grace 60 s | Live, Durable (gated) | Pass | Task `completed` 89.1 s after idle, report 91.2 s, no `offline`/`stopped` before, marker `done`; `offline` 60.3 s after quiet |
| LIVE-AGY | BEH-002/003, REQ-001/002, AC-002, AC-004, RU-002 | AGY monitor → backend → quiet check; exit message → terminal update → hook → re-arm | Real server, Team root, real AGY 1.3.1 worker + Claude coordinator, grace 60 s | Live, Durable (gated) | Pass | Daemon 180 s; same AGY pid at idle, after 75 s and after the follow-up ("ALIVE"); follow-up's grace also skipped (101 s to task end); `completed` "exited with code 0" at 178.2 s; `offline` 60.1 s later |
| E2E-HYB (×3 roots) | BEH-002/003/004/008, REQ-001..004, AC-002, AC-003, AC-004, AC-006, AC-007, RU-001/003/004 | Real Team/Org/Standalone root forwards, lifecycle, queue, AGY monitor, quiet check, Task DONE, root stop, restore | Real server; scripted AGY; grace in data-dir `.env` 60000; disposable HOME | Durable (gated) | Pass | See per-root table below |
| E2E-HYB-BASE | sensitivity | — | Same test on base `3a2496c95` | Temporary | Expected Fail | All 3 roots: "offline while its step runs" |
| LIVE-MIXED | BEH-004/006, REQ-003/004, AC-006, AC-007 | Quiet AutoByteus (LM Studio), Codex, Claude copies; approval wait; Org Team; root stop/reopen restore | Real server, real LM Studio `qwen/qwen3.8-27b`, Codex `gpt-5.6-luna`, Claude | Live, Durable (gated) | Pass (4/4) | LIVE-001/004 266.6 s, LIVE-002 305.9 s (approval held 90 s), LIVE-003 144.1 s, LIVE-005 132.3 s |
| E2E-REG | BEH-008, AC-007; fixture coexistence | DONE/reactivation/closure/ad-hoc/feed/context-file paths | Real server, scripted AGY with the extended fixture | Durable (gated) | Pass | 4+1 skipped, 3, 3, 7, 1 |
| FIX-001 | Fixture | Fake AGY `BACKGROUND_STEP` route; exit file parsed by `scanAgyTaskExitMessages` | Local process | Durable | Pass | 16 passed |
| R-FOCUS / R-UNIT | All | Unit/integration | Vitest | Durable | Pass (no new failures) | 2732/56; 4977/43 |
| AC008 | REQ-005/006 | Revert + contract text | git | Review | Pass | — |

E2E-HYB per-root measurements (final run, `e2e-idle/task-copy-idle-lifetime.json`; times from the root's WebSocket feed, shutdown also confirmed by the CLI process disappearing):

| Root | Quiet copy: idle → offline | Agent copy (exit 3 → `failed`): step / end → offline | Team copy (exit 0 → `completed`): step / end → offline | DONE with running step: call → task `stopped` / process gone | Root stop with running step (copy alive before stop) | Wake of quiet copy |
| --- | --- | --- | --- | --- | --- | --- |
| Agent | 61.0 s | 100.8 s / 60.1 s | 100.4 s / 62.7 s | 1.4 s / 2.7 s | 2.1 s (148 s) | relaunch `--conversation` |
| Team | 61.3 s | 101.0 s / 60.1 s | 100.5 s / 62.7 s | 6.8 s / 8.1 s | 0.7 s (167 s) | relaunch `--conversation` |
| Org | 61.3 s | 100.9 s / 60.1 s | 100.5 s / 62.7 s | 1.5 s / 3.9 s | 3.5 s (164 s) | relaunch `--conversation` |

The DONE time includes the scripted Manager's tool round-trip. The test samples processes with synchronous `pgrep`/`lsof`, which can delay frame timestamps by up to the sampling time. That is why some values match exactly across roots. The assertion windows (−1 s / +15 s around one grace) absorb it.

## Additional Repository Coverage Execution

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `env -u AUTOBYTEUS_AGENT_PACKAGE_ROOTS -u AUTOBYTEUS_SKILLS_PATHS -u AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs TASK_COPY_IDLE_LIFETIME_E2E_EVIDENCE_DIR=… pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/task-copy-idle-lifetime.e2e.test.ts --no-watch` | worktree root | E2E-HYB | Pass (run 3, with failed-exit case; run 2 also passed; run 1 test-ordering bug) | `r2-e2e-idle-1/2/3.log` |
| 2 | `RUN_CLAUDE_E2E=1 DELEGATED_BACKGROUND_E2E_EVIDENCE_DIR=… pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-delegated-background-task.e2e.test.ts --no-watch` | worktree root | LIVE-CLAUDE | Pass | `r2-live-claude.log` |
| 3 | `RUN_AGY_BACKGROUND_E2E=1 RUN_CLAUDE_E2E=1 DELEGATED_BACKGROUND_E2E_EVIDENCE_DIR=… pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agy-delegated-background-task.e2e.test.ts --no-watch` | worktree root | LIVE-AGY | Pass (run 3) | `r2-live-agy-1/2/3.log` |
| 4 | Scripted-AGY gate + `vitest run tests/e2e/projects/{task-reactivation-root-visibility,task-closure-root-visibility,ad-hoc-task-delegation,project-change-feed,project-task-context-files-delegation}.e2e.test.ts` | worktree root, sequential | E2E-REG | Pass | `r2-scripted-summary.txt` |
| 5 | `RUN_LMSTUDIO_E2E=1 RUN_CODEX_E2E=1 RUN_CLAUDE_E2E=1 LMSTUDIO_TARGET_TEXT_MODEL=qwen3.8-27b CODEX_E2E_TOOL_MODEL=gpt-5.6-luna pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/mixed-task-delegation.e2e.test.ts --no-watch` | worktree root | LIVE-MIXED | Pass | `r2-live-mixed-2.log` (attempt 1 `r2-live-mixed.log`: stale default Codex model list) |
| 6 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit --no-watch` | worktree root | R-UNIT | Pass (no new failures) | `r2-unit-full.log`, `.json` |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 80% | 96% | +16 | AC-001/005 live Claude. AC-002/004 live AGY plus scripted in 3 roots (`completed` and `failed`). AC-003 Team copy in 3 roots. AC-006 scripted quiet + wake in 3 roots, and mixed AutoByteus/Codex/Claude. AC-007 DONE and root stop with a running step in 3 roots. AC-008 diff/grep | Server-process stop with a running task is proven by unit and root-stop only; AC-003 with a Claude member is unit-level |
| Changed-boundary execution directness | 75% | 96% | +21 | Real quiet check, real `armLive`, real AGY monitor polling real exit files, real timers and real process termination | — |
| Cross-boundary integration realism and mock gap | 75% | 95% | +20 | Scripted CLI only for the 3-root matrix; real Claude and AGY CLIs for the runtime contracts; real LM Studio/Codex for the base paths | The 3-root matrix uses the fixture's exit-file writer; real AGY's format was proven separately |
| Environment, configuration, identity, and fixture fidelity | 80% | 95% | +15 | Grace from the data-dir settings store (scripted) and env (live); real logins; disposable HOME; fixture tied to the production reader by a unit case | Live AGY used the default model only |
| Failure, edge-case, lifecycle, and recovery evidence | 75% | 94% | +19 | `failed` and `completed` ends; a follow-up turn during a running daemon; DONE/root stop not deferred; wake/restore after idle shutdown; base sensitivity run; reactivation/closure regressions | Externally killed AGY daemon gives no end report (accepted QR-002); missed Claude terminal frame not provoked (accepted) |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | — | No rendered, client or shell change (web change is one docs sentence); root views were proven at the WebSocket boundary the UI consumes | — |
| Durable regression coverage quality and relevance | 85% | 95% | +10 | New deterministic 3-root E2E that fails on base; two gated live E2Es; fixture route with unit guard; `TESTING.md` rows (N-001) | The scripted E2E takes about 3 minutes (real 60 s grace minimum) |

- Overall post-repository confidence: 78% (unit/integration with fakes only)
- Overall final confidence: 95.2%
- Calculation method: simple average of the 6 applicable categories (96, 96, 95, 95, 94, 95)
- Confidence change produced by broader validation: +17 points; it closed the real-process, real-timer, real-monitor and three-root gaps
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: QR-002/DEC-005 (accepted): a daemon killed outside AGY (no AGY exit message on 1.3.1, observed) or a missed terminal frame keeps a copy live until DONE, root stop or server stop.

## Broader Validation Decision And Execution

- Decision and selected execution mode: `Required`; Live API / Lifecycle through the real server (scripted and real CLIs, real timers, process liveness)
- Material deviation from the planned mode or rationale: None (browser not required: no rendered change)
- Confidence gap or residual risk actually addressed: real runtime processes and timers in all three root kinds; real Claude/AGY end reporting
- Startup order, commands, and readiness results: each suite starts its own in-process Studio server (`startStudioE2eRuntimeServer`) on a private data dir; readiness via GraphQL and the root's view snapshot frame
- Environment choices that materially affected the run: grace 60 s (setting minimum); `AGY_FAKE_CASE=linked_skills`; disposable HOME for the AGY brain root; package-root env vars unset
- Seed data, fixtures, identities: Agent/Team/Org definitions and ad-hoc Tasks created through GraphQL and the Manager's own tools inside each suite

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | Evidence | Result |
| --- | --- | --- | --- | --- |
| Delegated Claude copy with `run_in_background` past grace | Live; completes; reports; offline one grace after quiet | As expected | `live-claude/` receipt | Pass |
| Delegated AGY copy with daemon past two graces + follow-up | Same process; answered; ends `completed`; offline one grace later | As expected | `live-agy/` receipt | Pass |
| Scripted A/T/O matrix | See per-root table | As expected | `e2e-idle/` receipt | Pass |
| Same matrix on base | Copies with running steps shut down at grace | As expected (fails) | `r2-e2e-idle-base.log` | Expected Fail |
| Mixed runtimes base paths | Quiet copies shut down and wake; approval wait kept; Org Team; root stop/reopen | As expected | `r2-live-mixed-2.log` | Pass |

## Platform / Runtime Targets

- Operating system / platform: macOS (Darwin 25.5.0), arm64
- Runtime and relevant framework versions: Node (workspace), Vitest; Claude CLI 2.1.283 (haiku); AGY CLI 1.3.1 (`gemini-3.8-flash-high`); codex-cli 0.161.0 (`gpt-5.6-luna`); LM Studio `qwen/qwen3.8-27b`
- Browser / engine: N/A

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: `Not Affected`
- Representative existing data exercised: the grace setting in the data-dir `.env` settings store
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Restart: root stop/reopen restore (LIVE-005) and reactivation suites pass; server-process restart is unchanged code (BR-011 browser probe not rerun: no restart-path change in SR-003)
- Residual untested persisted-data risk: None

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes` (uncommitted in the worktree; I did not commit)

| Path / Test | Change | Requirement / Boundary | Execution Result |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/task-copy-idle-lifetime.e2e.test.ts` | Added | AC-002, AC-003, AC-004, AC-006, AC-007 in Agent/Team/Org roots | Pass; fails on base |
| `autobyteus-server-ts/tests/e2e/runtime/agy-delegated-background-task.e2e.test.ts` | Added | AC-002, AC-004 with real AGY | Pass |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Updated | `linked_skills` route `BACKGROUND_STEP:{"seconds":N,"exitCode":C}` | Pass; 5 sibling scripted suites still pass |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/antigravity/agy-failure-cli-routing.test.ts` | Updated | Fixture route parsed by the production exit-message reader | Pass (16) |
| `TESTING.md` | Updated | N-001: row for the Claude and AGY delegated live E2Es; section for the scripted hybrid E2E | — |

- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: N/A (nothing removed)

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `tickets/in-progress/idle-shutdown-background-tasks/evidence/api-e2e/` | Logs, JSON receipts, vitest JSON | Retained | `r1-*`, `e2e-idle-r1/r2.log` are historical SR-002 round-1 files |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| `/tmp/idle-shutdown-base-check` (detached worktree at `3a2496c95`, dependency symlinks to this worktree) | Base sensitivity run and base failure comparison | `r2-e2e-idle-base.log`, `r2-focused-base.json` | Removed (`git worktree remove --force`, `prune`); this worktree's dependencies verified intact |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| AGY CLI (3-root matrix and regression suites) | `tests/fixtures/agy-failure-cli.mjs` | Deterministic timing, no quota, three roots at once | Exit-message writer is the fixture; real AGY's format is proven by LIVE-AGY and the existing AGY live suites |

## Result Summary

| Result | Case IDs | Summary / Reason |
| --- | --- | --- |
| Pass | R-FOCUS, R-FOCUS-BASE, FIX-001, AC008, E2E-HYB, LIVE-CLAUDE, LIVE-AGY, E2E-REG, LIVE-MIXED, R-UNIT | Hybrid behavior proven in all roots and on Claude/AGY; quiet copies and explicit stops unchanged |
| Expected Fail | E2E-HYB-BASE | Proves the new E2E detects the original defect |
| Not Tested | Server-process stop with a running task; Claude member in a delegated Team | Unit-covered; same code paths as tested cases (see investigation) |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Suite servers, data dirs, disposable HOME | Test-owned | `afterAll` close/remove | Receipts: `dataRemoved`, `homeRemoved`, `serverClosed` true, 0 roots, 0 errors |
| Scripted AGY processes | Test-owned | Root terminate; `afterAll` leftover check | None left (`pgrep` empty) |
| Live runs (Claude, AGY, Codex, LM Studio) | Test-owned runs | Suites terminate roots and delete definitions | Done |
| Temporary base worktree | Mine | Removed | Done |

## Preliminary Classification

N/A — Pass.

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 95.2%
- Default `95%` confidence target met: `Yes`
- Any final applicable confidence category below `90%`: `No`
- Broader validation decision: `Required` (executed)
- Critical acceptance criteria lacking direct proof: None
- Preliminary classification and recommended owner: N/A
- Next recipient from `get_handoff_rules`: see revision record
- Notes:
  - Durable test changes are uncommitted and need proportional test-code review.
  - Rule 9 items, already reported by the implementer: 56 focused / 43 unit failures, identical on base.
  - Test-environment notes:
    - `mixed-task-delegation`'s default Codex model list is stale; it needs `CODEX_E2E_TOOL_MODEL`.
    - AGY 1.3.1 writes no exit message for an externally killed daemon; this is the QR-002 residual.

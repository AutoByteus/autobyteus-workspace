# API/E2E Execution Coverage Report — Agent Input Delivery Simplification (v3)

## Execution Round Meta

All paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-input-delivery-simplification-v3/tickets/in-progress/agent-input-delivery-simplification/`. Evidence paths are relative to `api-e2e-evidence-v3/` (retained locally, not committed).

- Requirements Doc: `requirements-doc.md` (SR-006, user-approved 2026-10-24; DEC-003, DEC-005)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md` (SR-007)
- Supplemental Task Artifacts: `handoff-sr-007-design.md`, `follow-ups.md`, `probes/req-012-task-close-during-append.repro.test.ts`
- Design Review Report: `design-review-report.md` (ARCH-REV-003)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-004)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-005)
- Code Review Revision Record: `code-review-revision-record.md`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Test-Case Ledger: `api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-003`
- Current Execution Round: 3 (first on v3; the v2 rounds are superseded)
- Validated commit:
  - `a3391c924f`: IR-004, source `dbc27db9df`;
  - plus my test commits: baseline fix `67ec5ac6ca`, and the race suite and fixture commit listed under Durable Coverage.
- Base: `origin/personal@0216c6fb14`

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`

## Investigation And Execution Basis

- Investigation written before durable changes: `Yes`
- Deviations:
  - **Port adaptations** for the v3 base: append-only logs, Task keys for tools, the `create_task`/`update_task` tools, and messages stored in Task agents' own logs.
  - **TESTING.md is unchanged.** Its current rules put suite descriptions in test headers.
- Interruption: a session power-off after the remote suite. State survived intact, no process was left running, and the work resumed from the ledger.

## Test-Case Ledger Reconciliation

| Case | Result | Evidence |
| --- | --- | --- |
| R-01 tsc | Pass | `r01-tsc.log` |
| R-02 unit (15 directories) | Pass: 4062 passed, 0 failed | `r02-unit.log` |
| R-03 integration | Pass. The first run had 20 failures caused by my run order (before `test:integration:prepare`); after the prep the 6 files pass 20/20 | `r03-integration*.log` |
| TDR-001..003 | Pass ×3 roots | `tdr-run3/` |
| TDR-B (base) | Pass: discriminates | `tdr-base/` |
| REM (two servers) | Pass 37/37 | `remote-two-server/` |
| REG-E2E | 34/36 files pass. 3 failures diagnosed: not caused by this change | `reg-e2e.log`, `launch-defaults-rerun/`, `exc004-rerun.log` |
| LIVE-RT | Pass 2/2 after baseline fix `67ec5ac6ca` | `live-rt-rerun.log` |

## Compatibility / Legacy Scope Check

- Backward compatibility in scope: `No`. Compatibility or legacy retention observed: `No`.
- Persisted-data decision (`Not Affected`) followed: `Yes`. Compatibility-only coverage: `No`.

## Changed Boundary And Evidence Matrix

| Case | REQ / AC | Boundary | Surface | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| R-02 contract and V-4 | REQ-007/008/013, AC-007/013; REQ-012/DEC-005; K-1 | Per root and entry form: log bytes, IDs, codes, event order; closure in each window; genuine-failure fail-stop | Unit, real coordinators | Pass | `r02-unit.log` |
| TDR-001 | REQ-012, AC-012, DEC-005 | Closure after the durable append; real cross-root `update_task` DONE; copy stop | Live API (scripted AGY), append held at the store | Pass ×3 | Delivery and agent see `{accepted:false, code:"TASK_AGENT_RESOURCE_CLOSED", message:"Your Task is DONE or CANCELLED, so you can't start new work."}` (readable, no `-32603`). Record kept in the log and shown in the root view; recipient never processes it; no fail-stop |
| TDR-002 | REQ-012, DEC-005 (slot dropped under the lock) | Closure while waiting for the log lock | Live API | Pass ×3 | Same refusal. Precondition asserted (B's delivery started before Task B closed). Message never appended. Blocking message (A lead → A mate) accepted with `target_agent_run_id` = A's mate, and answered |
| TDR-003 | REQ-012, AC-013 | Root keeps working; restore seeds the engine from the logs | Live API + persisted reader | Pass ×3 | Later messages accepted. Live and restored root-view snapshots equal the saved logs. Messaging continues after restore |
| REM | SCN-016, REQ-007/008/013, AC-007 | `acceptFromRemote`, `prepareRemoteSend` → `commitSentToRemote` | Two built server processes, capturing proxy | Pass 37/37 | Messages both ways per root kind (RC-05..07, RC-21/22), unlinked senders refused (RC-08), Task closure (RC-10/11/23), idle restore and restarts of both nodes (RC-12/13/36) |
| REG-E2E | AC-002..AC-010, AC-014 | Delegation, teammate delivery, DTL activation, existing-copy assignment, closure, reactivation, Org publication, restore after unclean shutdown, compaction replay | Live API (serial) | Pass, apart from 3 diagnosed failures outside this change | `reg-e2e.log` |
| LIVE-RT | AC-007, AC-014 | Real teammate delivery into a running turn (held slot) | Real Claude and Codex | Pass 2/2 | Receipt before the worker's turn completed; one turn; reply contains `WORK_DONE` and `PINEAPPLE` |

## Additional Repository Coverage Execution

Commands run from the worktree root.

| Order | Command | Result | Evidence |
| --- | --- | --- | --- |
| E-01 | `env -u AUTOBYTEUS_AGENT_PACKAGE_ROOTS -u AUTOBYTEUS_SKILLS_PATHS -u AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/teammate-delivery-task-closure-race.e2e.test.ts --no-watch` | Pass 3/3 | `tdr-run3.log` |
| E-02 | Same file on base `0216c6fb14` (temporary worktree) | Fails as expected | `tdr-base.log` |
| E-03 | `pnpm -C autobyteus-server-ts prebuild && build && test:integration:prepare`, then `env -i PATH HOME=<temp> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=… vitest run tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` | Pass 37/37 | `remote-two-server.log` |
| E-04 | `env -i … vitest run tests/e2e/projects tests/e2e/agent-org-runs tests/e2e/agent-team-runs tests/e2e/runtime/{agy-compaction-rotation-transport,grok-build-compaction-replay,grok-build-runtime-replay}.e2e.test.ts --exclude "**/teammate-delivery-task-closure-race.e2e.test.ts" --no-file-parallelism` | 34/36 files | `reg-e2e.log` |
| E-05 | `delegated-launch-config-defaults` alone (its header's command) | Reproduces; cause found | `launch-defaults-rerun.log` |
| E-06 | `task-existing-copy-assignment … -t "EXC-E2E-004"` alone | Pass (timing-dependent race) | `exc004-rerun.log` |
| E-07 | `env -i PATH HOME USER LOGNAME TMPDIR RUN_CLAUDE_E2E=1 RUN_CODEX_E2E=1 … vitest run tests/e2e/runtime/team-busy-member-mid-turn-delivery.e2e.test.ts` (before and after the baseline fix) | 2/2 after the fix | `live-rt*.log` |

## Validation Confidence Scorecard (Mandatory)

| Category | Post-Repository | Final | Supporting Evidence | Residual |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 95% | AC-012/DEC-005 in every root and window at the server; AC-007 same-root and remote per root kind; AC-013 restore; AC-014 regressions | AC-001/008/011 are inspection (review/docs) |
| Changed-boundary execution directness | 80% | 95% | Real MCP tool results, cross-root Task closure, coordinators' log appends, two real nodes | — |
| Cross-boundary integration realism and mock gap | 75% | 95% | Real Claude/Codex mid-turn delivery; two real servers; scripted AGY only for determinism | — |
| Environment, configuration, identity, and fixture fidelity | 85% | 95% | Clean environments per TESTING.md; built `dist`; real logins for live runs; the append window is held only (no behavior change) | — |
| Failure, edge-case, lifecycle, and recovery evidence | 80% | 95% | Both closure windows, dropped slot, no fail-stop, restore; remote restarts and partitions | K-1 genuine-failure path only in V-4 (not producible through real use) |
| User-surface, browser, and desktop-shell confidence | 85% | 95% | Root-view snapshots (what the UI renders) live and after restore; record shown after a closure | No frontend change |
| Durable regression coverage quality and relevance | 90% | 95% | Race suite ported, discriminates on base; a stale live test repaired | — |

- Overall post-repository: 83%. **Overall final: 95%.** Critical ACs directly proven: `Yes`. No category below 90%. Target met: `Yes`.

## Broader Validation Decision And Execution

`Required` and executed. Heavy runs were serialized on a host shared with other worktrees (load average ~50), and each failure was diagnosed to a cause (TESTING.md rule 9).

## Lifecycle / Persisted Data

- `Not Affected`. V-2 (unit) shows the bytes are identical.
- TDR-003 restores each root from its logs and reads back exactly.
- REM RC-13 restarts both nodes with remote runs in every root kind.
- No version-specific branch was observed.

## Durable Coverage Changed In The Codebase

| Path | Change | Result |
| --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/teammate-delivery-task-closure-race.e2e.test.ts` | Added (ported to v3) | Pass; fails on base |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Updated: opt-in `AGY_FAKE_TOOL_TIMEOUT_MS`, `AGY_FAKE_TOOL_LOG`; defaults unchanged | Sibling suites pass |
| `autobyteus-server-ts/tests/e2e/runtime/team-busy-member-mid-turn-delivery.e2e.test.ts` | Baseline fix `67ec5ac6ca`: also reads `SEGMENT_CONTENT_BATCH` items | Pass 2/2 |

## Failures Diagnosed Outside This Change (Rule 9; owners needed)

1. **`tests/e2e/projects/delegated-launch-config-defaults.e2e.test.ts`** (2 cases, deterministic).
   - Since `71d51a1608` (delegated-copy-model-change), copy members record a concrete `launchConfiguration` with `followsTeam`. The test still expects `launch: null` for inheriting members.
   - Since the task-agent own-run change (`52f2837ca7`), a restored copy's launch facts live in its own run, so the root tree's copy has no `source`.
   - No file involved is in this ticket's diff. Updating the expectations is a decision about those features' record shapes, so it goes to their owner.
2. **`tests/e2e/projects/task-existing-copy-assignment.e2e.test.ts` EXC-E2E-004** (intermittent, at a 9 ms offset under load).
   - Sequence: the next assignment's live-lease restore (`root-task-execution-lifecycle.ts` `acquireAtHead` → `restoreChain`) meets a member already fenced by the DONE's in-flight stop. The refusal is `TASK_EXECUTION_RESTORE_FAILED` → "work was not delivered".
   - This is raised before `deliverWork` reaches the delivery engine, in the several-Tasks reopen/release path (`a18fe714cd`), which is outside this diff. The single rerun passed.
   - It is a product race to route to the several-Tasks owner.

## Temporary Execution Methods

| Method | Cleanup |
| --- | --- |
| Base worktree `aids-v3-api-e2e-base` (`0216c6fb14`) for TDR-B | Removed |

## Cleanup Performed

- Suites: data dirs removed, servers closed, no leftover processes (receipts).
- Base worktree removed.
- Temp HOMEs removed.

## Latest Authoritative Result

- Result: **`Pass`**
- Final confidence: 95%. Target met; no category below 90%.
- Broader validation: `Required` and executed.
- Test-review decision: `Required` (Large/High).
- Notes for Delivery:
  - REQ-011 docs sync.
  - The two diagnosed items above.
  - `docs/design-cases.md` is modified but uncommitted (the Solution Designer's edit).
  - `pnpm -C autobyteus-server-ts typecheck` vs build typecheck.

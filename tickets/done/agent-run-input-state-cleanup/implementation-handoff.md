# Implementation Handoff — autobyteus-140 `agent-run-input-state-cleanup`

- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-input-state-cleanup/tickets/in-progress/agent-run-input-state-cleanup/`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-input-state-cleanup`
- Branch: `codex/agent-run-input-state-cleanup` (local, not pushed); base `origin/personal` @ `2763e7c678`

| Commit | Slice |
| --- | --- |
| `c2e8335c42` | production: `agent-run.ts` refactor |
| `a3c4982721` | tests: 6 test doubles + the `captureMessages` comment |
| (next commit) | ticket documents and evidence (given in the handoff message) |

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Small/Low, direct implementation route (Solution Designer, `handoff-summary.md`).
- Requirements doc: `.../requirements-doc.md` (SR-001, Approved)
- Investigation notes: `.../investigation-notes.md`
- Solution revision record: `.../solution-revision-record.md`
- Design spec: `.../design-spec.md` (SR-001, Ready)
- Supplemental task artifacts: `.../evidence/test-double-drift-typecheck-probe.txt` (designer's probe; FU-001 scope)
- Design review report: `N/A — not applicable`
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report: N/A (initial)

## Current Implementation Summary

`AgentRun`'s input-state projection is now built from named private steps, with the same behavior:
- `readInputStateContent()` reads the pending entries, then calls `compactionRecovery.reconcile()`. This is the same call in the same order, and its doc comment names the side effect.
- `advanceInputRevision(content)` is the only writer of `inputRevision` / `lastInputSignature`.
- `refreshInputState()` runs read → advance → DTO. The DTO key order is unchanged.
- `inputStateEvent(state)` is a pure builder.
- `getInputStateSnapshot()` is `reconcileRecovery(); return refreshInputState();`.
- `reconcileAndPublishInputState()` replaces the three consecutive pairs (former L94, L291, L383).

The publish-only sites (L207, L360), the termination callback `publishInputState: () => this.publishInputState()` (L121) and `broadcastUnpublishedInputState` are unchanged.

Six `AgentRunBackend` test doubles now declare `{ activeTurnAppend: "unsupported" }`. `ScriptedAgentRunBackend` conforms to `AgentRunBackend`. The `captureMessages` comment is corrected. No test assertion changed: the only changed line in the test diff that mentions "assert" is the new comment.

- Implementation cycle: `Initial`
- Implementation revision record: `.../implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-001`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

## Routing Classification (Mandatory)

- Task size: `Small`
- Architecture risk: `Low`
- Design classification section / evidence reference: `design-spec.md` › Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: one production file with private methods only (`agent-run.ts` at 449 non-empty lines; +36/−8). Six test files. All calls stay in the same `dispatchQueue` tasks in the same order. No contract, persistence, concurrency or ownership change.
- Selected route: `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes` (see Self-Review)
- New design impact or escalation trigger: `None`. No assertion needed to change, and no publish-only site needed a reconcile.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Structure only; PB-001 publish-once and snapshot rules preserved | `agent-run.ts`: publish → `refreshInputState` → `inputStateEvent(state)` → `broadcastUnpublishedInputState`; subscribe → `reconcileRecovery` → `refreshInputState` → event → broadcast-unpublished → add → deliver; pull read → `reconcileRecovery` → `refreshInputState` | IMP-03 (1468 passed, incl. `agent-run.test.ts` input-state cases), IMP-04 (`agent-status-websocket` 8/8 ×3), IMP-05 (cadence 18/18 ×3) |
| BEH-002 | Doubles on the current contract; same runtime outcomes | 6 test files | IMP-06 (the 6 edited files, 99 passed), IMP-02 (8 type errors removed, 0 added), IMP-10 (no `start_only`) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts`
- `autobyteus-server-ts/tests/integration/agent/agent-status-websocket.integration.test.ts` (comment; `ScriptedAgentRunBackend`: `inputCapabilities`, `hasRunningBackgroundTasks`, a rejecting `dispatchUserInput`, the unused `postUserMessage` removed)
- `autobyteus-server-ts/tests/unit/agent-execution/agent-run-manager.test.ts`
- `autobyteus-server-ts/tests/unit/agent-execution/standalone-agent-run-lifecycle-service.test.ts`
- `autobyteus-server-ts/tests/integration/agent-execution/agent-run-manager.integration.test.ts`
- `autobyteus-server-ts/tests/unit/services/agent-streaming/agent-stream-handler.test.ts` (field added)
- `autobyteus-server-ts/tests/integration/agent-team-execution/team-agent-tools-mcp-lifecycle.integration.test.ts` (field added)

## Important Assumptions

- `AgentRun` reads `inputCapabilities.activeTurnAppend === "supported"`. The stale `{kind:"start_only"}` and a missing field both read as unsupported, so the explicit `"unsupported"` keeps every double's runtime behavior.
- `ScriptedAgentRunBackend.dispatchUserInput` is never called. Its runs never claim a dispatch: the queued message in the PB-001 case arrives during an active turn, with append unsupported. If a case did call it, it would reject and fail loudly.

## Known Risks

- None new. RSK-001 and RSK-002 (notes) are covered by the unchanged PB-001 and cadence tests (IMP-03..IMP-05).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Cleanup
- Reviewed root-cause classification: Missing Invariant plus a small Duplicated Policy Or Coordination
- Reviewed refactor decision: `Refactor Needed Now`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: see the diff in `c2e8335c42`.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`. The side-effecting `inputStateEvent()` was replaced in place; there is no wrapper.
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed: `Yes`. `ScriptedAgentRunBackend.postUserMessage` was not part of `AgentRunBackend` and was never called on the backend (the test calls `AgentRun.postUserMessage`).
- Dead code found elsewhere, listed as follow-up: FU-001 (the designer's list; see below)
- Shared structures remain tight: `Yes`
- Canonical shared design guidance reapplied: `Yes`
- Changed source files within size guardrails: `Yes` (449 non-empty lines)
- Notes: none.

## Persisted Data Transition Check

- Approved decision: `Not Affected`. Implementation follows it: `Yes`.

## Environment Or Dependency Notes

- `tsconfig.json` (src + tests) has `rootDir: src`, so a plain `tsc -p tsconfig.json` reports only TS6059 for every test file. IMP-02 uses `--rootDir .` to see real test type errors. Test type errors are not part of any gate (`typecheck` uses `tsconfig.build.json`, src only).

## Checks Run

Evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-input-state-cleanup/tickets/in-progress/agent-run-input-state-cleanup/evidence/`. Each `IMP-*` file starts with a header (command, commit, environment, date). Environment: macOS 26.5.2, node v22.23.1, pnpm 10.28.2. These are local implementation checks, not API/E2E sign-off.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts typecheck` | `a3c4982721` | as above | server `src` | AC-005 | Pass | `IMP-01-server-typecheck.log` | `# exit: 0` |
| IMP-02 | `NODE_OPTIONS=--max-old-space-size=8192 pnpm -C autobyteus-server-ts exec tsc -p tsconfig.json --noEmit --rootDir .`, on base and on the edited tree | `2763e7c678` vs edited tree (= `a3c4982721`) | as above | the 7 edited files' types | AC-004 | Pass | `IMP-02-tests-type-probe.txt` | `Errors in the 7 edited files: before 88, after 80`; "Removed": 1× `TS2353 … 'kind'`, 1× `TS2416 'inputCapabilities'`, 6× `TS2739 'ScriptedAgentRunBackend' is missing`; "Added": none. The remaining backend errors in those files are factory doubles (`beginPreparation`, `createBackend`), which is FU-001 scope |
| IMP-03 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution --no-watch` | `a3c4982721` | as above | `AgentRun` incl. `agent-run.test.ts` input-state publication cases, compaction recovery, termination | AC-001, AC-002, AC-005 | Pass | `IMP-03-unit-agent-execution.log`, `IMP-03-unit-agent-execution-excerpt.txt` | `Test Files  134 passed \| 4 skipped (138)`, `Tests  1468 passed \| 6 skipped (1474)` |
| IMP-04 | `vitest run tests/integration/agent/agent-status-websocket.integration.test.ts`, 3 runs | `a3c4982721` | as above | PB-001 socket cadence through `AgentRun` | AC-005 | Pass | `IMP-04-agent-status-websocket-run{1,2,3}.log` | `Tests  8 passed (8)` each run |
| IMP-05 | `vitest run tests/integration/agent/chat-socket-content-cadence.integration.test.ts`, 3 runs | `a3c4982721` | as above | sequenced sockets (no `AgentRun` change expected) | AC-005 | Pass | `IMP-05-chat-socket-cadence-run{1,2,3}.log` | `Tests  18 passed (18)` each run |
| IMP-06 | `vitest run` the 6 edited test files | `a3c4982721` | as above | the edited doubles | AC-004, AC-005 | Pass | `IMP-06-edited-test-files.log` | `Test Files  6 passed (6)`, `Tests  99 passed (99)` |
| IMP-07 | `pnpm -C autobyteus-server-ts test:unit` | `a3c4982721` | as above | all server units | AC-005 | Pass | `IMP-07-server-unit.log`, `IMP-07-server-unit-excerpt.txt` | `Test Files  727 passed \| 4 skipped (731)`, `Tests  5950 passed \| 7 skipped (5957)` |
| IMP-08 | `pnpm -C autobyteus-server-ts test:integration:prepare` | `a3c4982721` | as above | integration prerequisites | — | Pass | `IMP-08-server-integration-prepare.log` | `Integration test prerequisites are present.` |
| IMP-09 | `pnpm -C autobyteus-server-ts test:integration` | `a3c4982721` | as above | all server integration | AC-005 | Pass | `IMP-09-server-integration.log`, `IMP-09-server-integration-excerpt.txt` | `Test Files  77 passed \| 18 skipped (95)`, `Tests  415 passed \| 69 skipped (484)` |
| IMP-10 | `grep -rn 'start_only' autobyteus-server-ts/tests`; `grep -rn inputCapabilities autobyteus-server-ts/tests` | `a3c4982721` | as above | test doubles | AC-004 | Pass | `IMP-10-start-only-grep.txt` | `## start_only` followed by `(no matches)` |

- Not run, and why: web suites (no web change), E2E and live suites (no runtime or transport change; nothing to prove beyond the in-process suites).

## Frontend Rendered-Result Check

`Not Applicable`: server-internal refactor and test code only.

## Self-Review (Direct Route)

- The call order is identical on every path. Publish: entries → `reconcile()` → signature → DTO → broadcast. Subscribe and pull read add the existing `reconcileRecovery()` first. The DTO field order is the same as before.
- The only revision and signature writes are in `advanceInputRevision`. `publishedInputRevision` is still written only by `broadcastUnpublishedInputState`.
- `reconcileAndPublishInputState` is used exactly at the former three consecutive pairs. L207 and L360 still publish only, and termination still receives `publishInputState`.
- No public API changed. `getInputStateSnapshot()` keeps its signature and result.

## Downstream Coverage Hints / Suggested Scenarios

- Re-confirm PB-001 behavior on a live or scripted stream if desired: no repeated `AGENT_INPUT_STATE` between content windows, and a queued message still gives an immediate new revision. In-process coverage: IMP-03..IMP-05.
- Nothing user-visible changed; there is no UI or contract to exercise.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Independent confirmation of AC-005 as the API/E2E engineer sees fit. AC-001..AC-003 are code-review criteria, and AC-004 is grep plus review (IMP-02, IMP-10).

## Follow-Ups (Out Of Scope)

- FU-001 (designer): 49 backend-contract type errors in 14 test files, for the PTM / autobyteus-65 (`evidence/test-double-drift-typecheck-probe.txt`). After this change, `agent-run-manager.test.ts` still carries its factory-double errors from that list (IMP-02).

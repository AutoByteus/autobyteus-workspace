# Implementation Handoff — PB-001 `agent-input-state-content-cadence`

Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-input-state-content-cadence/tickets/in-progress/agent-input-state-content-cadence/`
Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-input-state-content-cadence`. Branch `codex/agent-input-state-content-cadence` (local, not pushed), HEAD `1496628f7dc32584184856598030e063aa3cce35`, base `origin/personal` @ `2f211340ee`.

Commits:
- `157c47ac2b` test(server): Team segment admission fixture backend gets its required input capabilities (baseline fix)
- `1496628f7d` fix(server): send each agent input-state revision once so the content cadence holds (PB-001)

The ticket artifacts in `tickets/in-progress/...` are still uncommitted, as the Solution Designer left them.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: direct route (Small + Low). Architecture review is not applicable. The Solution Designer's `get_handoff_rules` result is recorded in `handoff-summary.md`.
- Requirements doc: `.../requirements-doc.md` (SR-001, Approved)
- Investigation notes: `.../investigation-notes.md`
- Solution revision record: `.../solution-revision-record.md`
- Design spec: `.../design-spec.md` (SR-001, Ready)
- Supplemental task artifacts: `.../evidence/` (repro and probe logs from design; `impl-*.log` from implementation)
- Design review report: `N/A — not applicable`
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report: N/A (initial)

## Current Implementation Summary

`AgentRun` sends each input-state revision once. It tracks `publishedInputRevision`, the highest revision every current listener has received. Every publish goes through `broadcastUnpublishedInputState(event)`, which skips a revision already published. On subscribe, the queued task reconciles recovery and builds the snapshot. If the snapshot's revision is new, it is broadcast to the existing listeners first. Then the new listener is added and gets that same snapshot. A revision advanced by `getInputStateSnapshot()` (pull read) is sent on the next publish. Real input changes still bump the revision, are sent immediately, and stay ordering boundaries in the unchanged cadence scheduler.

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
- Evidence and rationale: the production change is in one file (`agent-run.ts`: +1 field, +1 private method, subscribe task reordered; 425 non-empty lines). Frame schema, revision semantics, scheduler, consumers and the concurrency model are unchanged. Every path still runs on `dispatchQueue` as before. None of the design's escalation triggers fired.
- Selected route: `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes` (see Self-Review below)
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | No repeat of a delivered revision; window holds | `AgentRun.onCanonicalEventsDispatched → publishInputState → broadcastUnpublishedInputState` returns early when revision == published (`agent-run.ts`) | The 2 cadence cases now pass (3/3 runs). The new socket case shows 1 input-state frame (the snapshot) across 4 batches. Unit AC-002 case passes |
| BEH-002 | New revision is broadcast immediately, after the pending content | `postUserMessage → publishInputState` (new revision, so it is dispatched); scheduler unchanged | New socket case: trace `[INPUT_STATE 1, SEGMENT_CONTENT "abc", INPUT_STATE 2]`, arriving < 250 ms after the post inside a 500 ms window |
| BEH-003 | Snapshot to the new listener; a revision first produced by a snapshot or pull read reaches the existing listeners | `subscribeToEvents` queued task: reconcile → snapshot → broadcast-if-new to existing → add → deliver; pull read is caught by the next publish | Unit AC-004a (subscribe/reconnect without duplicates) and both AC-004b cases (pull read; subscribe snapshot, ordered before the new snapshot) pass |
| BEH-004 | Boundaries flush first | Scheduler untouched | Existing cases 1-3, 6, 7 pass |
| BEH-005 | Changed interval visible again | Same as BEH-001 | "uses a changed interval only…" passes 3/3 |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. The extra fixture fix is test-only, needed to keep the server suites green (TESTING.md Rule 9), and in its own commit.

## Key Files Or Areas

- `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts`: `publishedInputRevision`, `subscribeToEvents`, `publishInputState`, `broadcastUnpublishedInputState`.
- `autobyteus-server-ts/tests/unit/agent-execution/agent-run.test.ts`: new describe "AgentRun input-state publication (agent-input-state-content-cadence)" with 4 cases.
- `autobyteus-server-ts/tests/integration/agent/agent-status-websocket.integration.test.ts`: new case "sends no repeated input state during a content window and a queued message's new revision right after the pending content", using its own capture that keeps `AGENT_INPUT_STATE`. The existing 7 cases and `captureMessages` are byte-identical.
- `autobyteus-server-ts/tests/integration/agent-team-execution/team-agent-segment-admission.integration.test.ts`: fixture baseline fix (see below).
- `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md`: one paragraph in Client-Bound Content Cadence.

## Baseline Fix Found During Local Checks

`test:integration` first failed 9/11 in `team-agent-segment-admission.integration.test.ts`.
- Cause: its `SegmentSourceBackend` implements `AgentRunBackend` without the required `inputCapabilities` and `compactionRecovery`. `reconcileRecovery()` therefore throws `Cannot read properties of undefined (reading 'kind')`. On base this already happened on every batch (11 logged errors per run). The cases passed only because the old subscribe task attached the listener *before* `reconcileRecovery()` threw. The design's subscribe order reconciles first, so with the incomplete fixture the listener was never attached.
- Fix: declare both members as the real AutoByteus backend does (`activeTurnAppend: "unsupported"`, `compactionRecovery: { kind: "unsupported" }`). The file now passes 11/11 with no logged errors. Commit `157c47ac2b`, labelled as a baseline fix.

## Important Assumptions

- Revisions only increase (`inputRevision` is only ever `++`), so comparing with `===` against the published revision is exact.
- `reconcileRecovery()` does not dispatch run events (it reconciles the lifecycle snapshot and the admission recovery observation), so moving it before `listeners.add` changes no listener-visible order.

## Known Risks

- RSK-002 (design): a real stream might have another non-companion flush trigger. AC-005 covers this. If one is found, route it as `Design Impact`.
- Subscribe ordering: if `reconcileRecovery()` throws for a *real* backend, the new listener is now not attached (before, it was attached but got no snapshot). All production backends declare `compactionRecovery`, and no supported scenario makes reconcile throw, so no extra handling was added. It is listed for visibility only.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix
- Reviewed root-cause classification: Missing Invariant
- Reviewed refactor decision: `No Refactor Needed`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: the invariant is enforced in its owner, `AgentRun`. The egress, team projector, collaboration adapter and web client are untouched.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`. The unconditional broadcast is replaced in place.
- Dead code in the touched files and modules removed: `Yes` (none found in the input-state methods)
- Dead code found elsewhere, listed as follow-up: None
- Shared structures remain tight: `Yes`. No type changes.
- Canonical shared design guidance reapplied: `Yes`
- Changed source files within size guardrails: `Yes`. `agent-run.ts` has 425 non-empty lines and the production delta is about 15 lines.
- Notes: none.

## Persisted Data Transition Check

- Approved decision: `Not Affected` (in-memory projection per live run)
- Implementation follows it: `Yes`. Nothing is stored.

## Environment Or Dependency Notes

- `pnpm -C autobyteus-server-ts test:integration:prepare` was run (it regenerates untracked `dist/` outputs for the application SDKs and brief-studio; these are not ticket changes).
- `pnpm -C autobyteus-web exec nuxt prepare` was run before the web spec. Without it, Vitest fails to resolve `.nuxt/tsconfig.json` (an environment step that TESTING.md already lists).

## Local Implementation Checks Run

All logs are in `.../evidence/`.

| Check | Command | Result |
| --- | --- | --- |
| New unit cases on base (before fix) | `vitest run tests/unit/agent-execution/agent-run.test.ts -t "input-state publication"` | 4/4 fail (expected) |
| AgentRun unit file | `vitest run tests/unit/agent-execution/agent-run.test.ts` | 46/46 pass |
| New socket case on base code | `vitest run …agent-status-websocket… -t "repeated input state"` with `agent-run.ts` reverted | Fails: 5 input-state frames instead of 1 (expected) |
| Cadence file ×3 | `vitest run tests/integration/agent/agent-status-websocket.integration.test.ts` | 8/8 on all 3 runs (`impl-cadence-run-{1,2,3}.log`) |
| Server typecheck | `pnpm -C autobyteus-server-ts typecheck` | exit 0 (`impl-typecheck.log`) |
| Server unit | `pnpm -C autobyteus-server-ts test:unit` | 720 files, 5846 passed, 7 skipped (`impl-test-unit.log`; run on the final `agent-run.ts`, before the fixture fix, which is integration-only) |
| Server integration | `pnpm -C autobyteus-server-ts test:integration` | 76 files passed / 18 skipped; 396 passed / 68 skipped (`impl-test-integration.log`, final tree) |
| Web input-state handler | `pnpm -C autobyteus-web test:nuxt run services/agentStreaming/handlers/__tests__/agentInputStateHandler.spec.ts` | 3/3 pass (`impl-web-agentInputStateHandler.log`) |

These are local implementation checks, not API/E2E sign-off.

## Self-Review (Direct Route)

- Invariant holds on every path: post-batch, admission, dispatch result, uncertain dispatch, recovery change and termination all call `publishInputState()`. Subscribe and pull read are covered as described above.
- With no existing listeners, subscribe records the revision as published and the snapshot delivers it, so the invariant still holds.
- A closed subscription before the task runs causes no state change.
- No double delivery to the new listener: the broadcast happens before `listeners.add`.
- Snapshot listener errors are still logged the same way, and the broadcast keeps the same `onListenerError` logging.

## Frontend Rendered-Result Check

`Not Applicable`. This is a server-side producer change, and the frame shape is unchanged. The web handler spec was run as a consumer check only.

## Downstream Coverage Hints / Suggested Scenarios

- AC-005: a real or scripted runtime text response through the real server (for example the scripted AGY CLI `tests/fixtures/agy-failure-cli.mjs`, or an isolated instance per TESTING.md). In the socket trace, look for `SEGMENT_CONTENT` frames spaced by about the configured window, no `AGENT_INPUT_STATE` between them except for real changes, and boundaries after content.
- Queue a message during a streaming reply in the isolated app. The pending entry should show at once, and earlier text should not be reordered after it.
- Reconnect or reload mid-run. The queue state should be hydrated from the snapshot, and the next queue change should still arrive.
- Team/collaboration views (they consume `AgentRun` listeners and `getInputStateSnapshot()`). Queue state should still update. Team content coalescing remains FU-001 (out of scope).

## API / E2E / Executable Coverage Investigation And Execution Still Required

- AC-005 real-stream regression proof and the isolated-instance check (RSK-002).
- Independent confirmation of AC-001..AC-004 and AC-006 at the API/E2E layer as the API/E2E engineer sees fit.

## Follow-Ups (Out Of Scope)

- FU-001 (from design): team-stream `SEGMENT_CONTENT` uses `segment_id`, which `isCoalescibleStreamContent` does not recognize.
- FU-002 (observed, test-only): `ScriptedAgentRunBackend` in `agent-status-websocket.integration.test.ts` declares `inputCapabilities = { kind: "start_only" }`, which is not the `{ activeTurnAppend }` contract shape; `AgentRun` reads it as append-unsupported. Left unchanged here because the design keeps that file's existing harness unchanged; suggest correcting it with the next change to that file.

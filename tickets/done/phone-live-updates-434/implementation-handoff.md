# Implementation Handoff — autobyteus-434

Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-live-updates-434/tickets/in-progress/phone-live-updates-434/`
Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-live-updates-434`, branch `codex/phone-live-updates-434`, base `origin/personal` `eebbc2b8ee`.
Commits: `5230b0e3dc` (server), `108fcd0587` (web), `9e0a09dc81` and `feb69495a5` (spec updates); the ticket documents, the probe's new R7 and the evidence follow in one docs commit (named in the handoff message). The checks below ran on `feb69495a5` unless stated.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review selected (Medium / High) and passed (ARCH-REV-003); this package goes to code review (Large-or-High rule).
- Requirements doc: `requirements-doc.md` (Approved, SR-001).
- Investigation notes: `investigation-notes.md`.
- Solution revision record: `solution-revision-record.md`.
- Design spec (required on every route): `design-spec.md` (SR-004, `Ready`).
- Supplemental task artifacts: `evidence/repro/phone-live-repro.mjs` (reproduction; this round adds scenario R7 for AC-003, as the design's Guidance For Implementation asks, runs it before R4, and makes the R6 fresh client wait for its run screen); `follow-ups.md` (FU-001, FU-002; FU-003 added by implementation).
- Design review report: `design-review-report.md` (ARCH-REV-003, Pass; notes N-8, N-9 applied).
- Architecture review revision record: `architecture-review-revision-record.md`.
- Triggering rework report, revision record, or evidence: N/A (initial round).

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-004`
- Related architecture-review revision IDs: `ARCH-REV-003`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

What the change does:

1. **One reconnect scheduler per run stream** (`services/liveStreamLifecycle/liveStreamReconnectScheduler.ts`). It owns *when*: waits 1, 2, 4, 8, 16, then 30 s for ever while the page is visible (no give-up); holds while hidden (a wait that ends while hidden holds instead of attempting); attempts at once on a page resume (`visibilitychange` to visible, or `online`); asks its owner to re-synchronize a connected stream after the page was hidden ≥ 30 s; reports a persistent failure once per streak at the fifth consecutive failure. `pageResumeSignal.ts` owns the one set of DOM listeners. States `idle`, `attempting`, `connected`, `waiting`, `held`.
2. **`WebSocketClient` is a plain socket**: no retry, no `RECONNECTING`, no options. Its `onDisconnect(reason, retryable)` tells the owner an unintended close and whether it may be retried (4004/4005 not). An intentional `disconnect()` emits nothing.
3. **Each stream owner holds one scheduler** and keeps how it connects, where it succeeds and how it catches up (design Per-Owner Scheduler Adoption table):
   - Team (`TeamStreamingService`): attempt = reconnect the transport; success = snapshot accepted; re-sync = quiet close + loss bookkeeping + attempt now; `connect()` starts over; `reopen_required` starts over (no retries). The pending Team-send admission moved to `teamSendAdmission.ts` (the extraction the design names) to keep the file under 500 lines.
   - Agent run (`AgentRunStreamReconnection`, new, with `createAgentRunStream`): attempt = load the stored state, commit it into the live context while the socket is closed, then open; success = every socket open (whoever started it); re-sync = `AgentStreamingService.dropConnection()` + attempt now; `requestConnect()` is the Agent Connect Rule (waiting → catch-up now; held / attempting / connected → nothing; idle → plain connect).
   - Org (`AgentOrgStreamingService`): attempt = existing transparent recovery; success = snapshot accepted; failures = unintended close, `failClosed`, a failed recovery; `requestRecovery()` reads `isRecovering()`; re-sync = retire the generation (pending commands rejected with "re-synchronizing") + attempt now; persistent failure = `reportError` + readiness rejected, retrying goes on.
   - Collaboration (`AgentRunCollaborationStreamingService`): attempt = open; success = snapshot accepted; failures = unintended non-4004 close, invalid frame; 4004 starts over; re-sync = `closeSocket` + attempt now; persistent failure = `reportError` + readiness rejected, retrying goes on.
4. **One stored-state reader** (`services/runHydration/runStoredStateLoader.ts`): reads a run's projection and file changes and builds conversation and activities from given conversation defaults. The open path's full loader (`loadRunContextHydrationCandidate`) uses it.
5. **Server**: `RuntimeMemoryEventAccumulator.recordForwardedUserMessage` passes the forwarded message's `message_id`/`dedupe_key` (through `normalizeAcceptedInputIdentity`) and `ExternalRuntimeMemoryWriter` writes them on the user `RawTraceItem`.

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Medium`
- Architecture risk (`Low`/`High`): `High`
- Design classification section / evidence reference: `design-spec.md` § Task Size And Architectural Risk (confirmed by ARCH-REV-001/003).
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: 14 production files (two new web modules, one new agent-run reconnection file, one new loader, one extracted Team-send file; four stream owners, transport, store, full loader; three server files), all inside the existing owners. It changes the connection lifecycle of all four live run streams and replaces a live agent conversation from the stored state on reconnect: High stays.
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable` (High route; an implementation self-review of the diff was done anyway).
- New design impact or escalation trigger: `None`. No owner needed a protocol or readiness change; the size constraints hold; no reader rejects the new keys; no event was lost or duplicated in the reproduction. The harness finding on reads without a timeout (IMP-11) is recorded as FU-003 with its reasoning (Known Risks).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Preserved: live delay | Unchanged dispatch path | Preserved: R1 40–47 ms (IMP-12; 41–47 ms before, IMP-01) |
| BEH-002 | Preserved; agent now also catches up | Team/Org/collaboration snapshot after the scheduler's attempt; agent: `AgentRunStreamReconnection.attempt` → `loadRunStoredState` → `commitStoredState` → `service.connect` | Preserved: R2 caught up 7.2 s (IMP-12). Agent catch-up: unit (IMP-06, `agentRunStreamReconnection.spec.ts`) |
| BEH-003 | Keep trying ≤ 30 s apart while visible; catch up | `LiveStreamReconnectScheduler.connectionLost` (schedule `RECONNECT_DELAYS_MS`, no give-up) in all four owners | Fixed: R3 shown by itself, attempts at +1, 3, 7, 15, 31, 61 s (IMP-12; `null` in IMP-01). Unit per owner (IMP-06) |
| BEH-004 | Attempt at once on resume; re-sync after ≥ 30 s hidden; nothing while hidden | `pageResumeSignal` → scheduler `handleResume` → `attemptNow` / owner `resynchronize`; `held` while hidden | Fixed: R7 (new, AC-003) no socket while hidden, missed event shown 104 ms after visible (IMP-12). Unit per owner (IMP-06). R4 (screen-on dead path) stays `null`: out of scope (FU-001) |
| BEH-005 | One copy, in place | `recordForwardedUserMessage` → `ExternalRuntimeMemoryWriter` user branch → `RawTraceItem` `message_id`/`dedupe_key` → projection → client identity match (unchanged) | Fixed: server test (IMP-02); R6 fresh client 1 copy before `run_command`, stored `hasMessageId: true` (IMP-12; 2 copies in IMP-01) |
| BEH-006, 007, 008 | Preserved | Untouched paths (sending view, 403/416, node events) | R6 sending view 1 copy (IMP-12); server and web suites green (IMP-03, IMP-07/08). Route-policy tests are part of the server unit suite (IMP-03) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. No UI, no protocol message, no Android change, no change to 403/416, old raw-trace records untouched; Team candidate streams keep their own 10 s readiness timeout.

## Key Files Or Areas

Web (`autobyteus-web/`):

- Add `services/liveStreamLifecycle/liveStreamReconnectScheduler.ts`, `services/liveStreamLifecycle/pageResumeSignal.ts`.
- Add `services/agentStreaming/agentRunStreamReconnection.ts` (`AgentRunStreamReconnection`, `createAgentRunStream`).
- Add `services/agentStreaming/teamSendAdmission.ts` (extracted from `TeamStreamingService.ts`, design-named extraction).
- Add `services/runHydration/runStoredStateLoader.ts` (`readRunStoredState`, `buildRunStoredState`, `loadRunStoredState`).
- Modify `services/agentStreaming/transport/WebSocketClient.ts`, `transport/types.ts`, `transport/index.ts`, `services/agentStreaming/index.ts` (plain socket; `RECONNECTING` and the options removed; `onDisconnect(reason, retryable)`).
- Modify `services/agentStreaming/TeamStreamingService.ts` (456 lines, was 486), `services/agentStreaming/AgentStreamingService.ts` (`onConnectionChange`, `dropConnection`).
- Modify `stores/agentRunStore.ts` (506 lines, was 515): one map of `{ service, reconnection }`; `connectToAgentStream` → `createAgentRunStream` / `requestConnect()`; `disconnectAgentStream` disposes both.
- Modify `services/agentOrgExecution/agentOrgStreamingService.ts` (516 lines, was 524), `services/agentCollaboration/agentRunCollaborationStreamingService.ts`.
- Modify `services/runHydration/runContextHydrationService.ts` (reads through `readRunStoredState` / `buildRunStoredState`).

Server (`autobyteus-server-ts/src/agent-memory/`): `services/runtime-memory-event-accumulator.ts`, `domain/memory-recording-models.ts`, `store/external-runtime-memory-writer.ts`.

Tests: new `liveStreamLifecycle/__tests__/liveStreamReconnectScheduler.spec.ts` (+ `pageVisibilityTestControl.ts`), `agentStreaming/__tests__/TeamStreamingService.reconnect.spec.ts`, `agentStreaming/__tests__/agentRunStreamReconnection.spec.ts` (+ `fakeSocketClient.ts`), `agentCollaboration/__tests__/agentRunCollaborationStreamingService.reconnect.spec.ts`, server `tests/unit/agent-memory/external-runtime-user-message-identity.test.ts`. Updated: `WebSocketClient.spec.ts` (rewritten for the plain socket), `agentOrgStreamingService.spec.ts` (1 s first wait, report at the fifth failure, no give-up, new scheduling cases, services released after each test), `agentOrgComposerSubmission.spec.ts` (1 s first wait; exhaustion test steps the timers instead of running all of them), `agentRunStore.spec.ts`, `nativeCompactionTermination.spec.ts` and `tests/integration/workspace-history-draft-send.integration.test.ts` (mock the service module the factory imports), `agentOrgRetainedRecovery.spec.ts` (first retry 1 s, no give-up, `requestRecovery` during a loss streak leaves the attempt to the scheduler; race windows kept), `agentRunCollaborationParticipantReloads.spec.ts` (waits for the 1 s retry), `RECONNECTING` removed from four ConnectionState mocks and one `it.each`, the probe fixture `task-agent-monitor-visibility.page.vue` (its fake no longer emits a disconnect on an intentional close, as the real client never did).

## Important Assumptions

- ASM-001 (Android WebView fires `visibilitychange` on background / screen-off) is unchanged and left to API/E2E on the emulator.
- `online` is reported only while visible (a hidden page holds; the visibility resume attempts).

## Known Risks

- Agent read-to-open window (accepted in the design): events between the catch-up read and the socket open are not shown until the next catch-up or open. Not reproduced: the reproduction drives a Team member, whose catch-up is the snapshot; the agent path's probe belongs to API/E2E.
- Reads without a timeout (FU-003, IMP-11): a GraphQL read sent on a pooled HTTP keep-alive connection whose path died silently waits until the operating system gives up. With the harness black-holing every connection for good, the Team re-sync reconnected but its member reload never returned. The realistic case recovers (the node closes idle keep-alive connections after 72 s and answers a reuse with a reset, which the browser retries), and R7 passes with only the WebSocket black-holed. On the agent path such a hanging catch-up read keeps the scheduler `attempting` until the read fails. Recorded as a follow-up, not changed here.
- DEC-003: on desktop, every kept stream re-syncs after the window was hidden ≥ 30 s (one reconnect plus catch-up per stream).
- A collaboration or Org service whose owner is no longer current (`isCurrent()` false, node switched) stops retrying; that is the existing ownership rule, now explicit (`startOver`).

### Decisions made inside the design (for the reviewer)

- **Agent `attempt`, "socket started during the load"** (N-7): the design lists this exit as `startOver()`. The code returns without a scheduler call and leaves the scheduler to that socket's own open (`connected()`) or loss (`connectionLost()`). Reason: if the socket has already opened, `connected()` already ran, and a `startOver()` afterwards would put a connected stream back to `idle`, losing the resume re-sync (P-005). The unit test "a socket started during the load is left to its own open" covers it. Under the Agent Connect Rule no production entry starts a socket during an attempt, so the branch is defensive.
- **Team candidate after promotion**: the candidate stream gets no scheduler before readiness (failures still fail the candidate, 10 s timeout unchanged). Its success point (snapshot accepted) calls `connected()`, so after `replaceFailedTeamStream` promotes it, it reconnects like any kept Team stream (today it got `WebSocketClient`'s 5 retries).
- **`loadRunStoredState` split**: `readRunStoredState(runId)` (the one projection and file-change reader) and `buildRunStoredState(read, defaults)`; `loadRunStoredState` composes them. The full loader reads in parallel with the resume config (unchanged latency), then builds with the defaults the resume config gives. The result carries no `lastActivityAt`: the build sets `conversation.updatedAt` from it, as before, and nothing else read it.
- **`WebSocketClient.connect` when `new WebSocket()` throws**: it now reports `DISCONNECTED` and a retryable disconnect, so the scheduler retries instead of the client staying `CONNECTING` for good.
- **`connectionLost()` while already waiting or held** is ignored, so one loss is never counted twice.
- **Collaboration `checkpoint_required`** keeps its immediate reopen (`closeSocket` + open), as today; only the scheduler-driven attempt and the re-sync go through `attemptNow()`.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix.
- Reviewed root-cause classification: Duplicated Policy Or Coordination (stall); Local Implementation Defect (identity not written).
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `Refactor Needed Now` (bounded).
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`. Three local retry policies removed; one scheduler; the transport no longer retries.
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`.
- Evidence / notes: removal list below.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes`. Removed: `WebSocketClient` `DEFAULT_OPTIONS`, `WebSocketClientOptions` (`autoReconnect` was already dead), `reconnectAttempts`, `reconnectTimeout`, `shouldReconnect`, `scheduleReconnect`, `clearReconnectTimeout`, the `Max reconnection attempts reached` error, `ConnectionState.RECONNECTING`; Org `MAX_TRANSPARENT_RECOVERY_ATTEMPTS`, `recoveryDelay`, `transparentRecoveryAttempts`, `transparentRecoveryTimer`, `transparentRecoveryScheduled`, `scheduleTransparentRecovery`, `resetTransparentRecovery`, `clearTransparentRecovery`; collaboration `MAX_RECOVERY_ATTEMPTS`, `recoveryDelay`, `recoveryAttempts`, `recoveryTimer`, `scheduleRecovery`; the duplicate projection and file-change read in `loadRunContextHydrationCandidate`; the already-unused `AgentRuntimeKind` import there; the unused `agentContextsStore`/`agent` locals in `agentRunStore.disconnectAgentStream`. Evidence: `grep -rn "RECONNECTING\|maxReconnectAttempts\|Max reconnection\|MAX_TRANSPARENT\|MAX_RECOVERY\|transparentRecoveryScheduled\|autoReconnect" autobyteus-web --include=*.ts --include=*.vue` (excluding generated/build folders) finds nothing; the web typecheck passes.
- Dead code found elsewhere, added to `follow-ups.md`: None new (FU-002 already records `activeRunRecoveryCoordinator.ts`, not touched). FU-003 (reads without a timeout) is a behavior follow-up, not dead code.
- Shared structures remain tight: `Yes`. Scheduler options are three callbacks; `RunStoredState` has no config; identity only on the user trace input.
- Canonical shared design guidance was reapplied during implementation: `Yes`.
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes`. Largest: `agentOrgStreamingService.ts` 516 lines / 483 non-empty (was 524 / 490), `agentRunStore.ts` 506 / 448 (was 515 / 452), `TeamStreamingService.ts` 456 / 418 (was 486 / 446). No changed production file has a delta above 220 lines (largest: `WebSocketClient.ts` +18/−95, `TeamStreamingService.ts` +47/−77).
- Notes: tests that asserted the give-up after N attempts were rewritten to the new behavior (report at the fifth failure, retrying goes on), per DESIGN.md rule 11.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Directly Usable — No Migration`.
- Design-spec decision reference: `design-spec.md` § Persisted Data / State Transition Decision.
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`.
- Direct-use evidence: IMP-02 writes a record in the shape of the user's real identity-less records next to a new one and reads both through the real projection provider: the old one loads without identity, the new one with it.
- Migration implementation and focused checks: N/A.
- Deviation from the reviewed transition decision: `None`.

## Environment Or Dependency Notes

- macOS (darwin 25.5.0, arm64), Node from the worktree's toolchain, pnpm. No dependency, lockfile, `tsconfig`, script or contract-package change, so the fresh-start build rule (DESIGN.md rule 12) does not apply.
- `autobyteus-server-ts` build and `autobyteus-web build:mobile-web` were rebuilt from this source before the reproduction (IMP-13).

## Checks Run

Environment for all: macOS 26.5.2 arm64, node v22.23.1, pnpm 10.28.2; the reproduction uses headless Chrome. Evidence paths are relative to the ticket folder's `evidence/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result (`Pass`/`Fail`) | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `node evidence/repro/phone-live-repro.mjs --output-dir=… --scenarios=R1,R2,R3,R4,R6` (before any change) | `eebbc2b8ee` | as above, bootstrap builds | the whole phone path, before | BEH-003, 004, 005 (fail expected) | Pass (reproduced the failures) | `IMP-01-repro-baseline/` (`README.md`, `repro-summary.json`, `repro-stdout.log`, R6 screenshots) | `"phoneShowsByItselfWithin60s":null`; `Max reconnection attempts reached`; R6 `freshDuringTurn` `"copies":2` |
| IMP-02 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-memory/external-runtime-user-message-identity.test.ts tests/unit/agent-memory/runtime-memory-event-accumulator.test.ts tests/unit/agent-memory/external-runtime-memory-writer.test.ts --no-watch` | `feb69495a5` | as above | recorder, writer, `RawTraceItem`, `LocalMemoryRunViewProjectionProvider` | REQ-004 / AC-005, persisted-data decision | Pass | `IMP-02-server-identity-tests.log` | `Tests  32 passed (32)`; "an older record without them still loads" |
| IMP-03 | `pnpm -C autobyteus-server-ts test:unit` | `feb69495a5` | as above | the whole server unit suite (incl. route-policy tests) | REQ-004, REQ-005 | Pass | `IMP-03-server-unit-suite.excerpt.log`, `IMP-03-server-unit-suite.log.gz` | `Test Files  952 passed \| 5 skipped (957)`, `Tests  8160 passed` |
| IMP-04 | `pnpm -C autobyteus-server-ts typecheck` | `feb69495a5` | as above | server `src` and tests | — | Pass | `IMP-04-server-typecheck.log` | `production errors: 0; test-file errors: 1182 in 365 files (baseline 1182 in 365 files)`, `PASS` |
| IMP-05 | `pnpm -C autobyteus-web typecheck` (the final pass reran its `scripts/typecheck.mjs` after the spec typing fix) | `feb69495a5` | as above | web app, Electron main, build scripts, cross-package tests | — | Pass | `IMP-05-web-typecheck.log` | `production errors: 0; test-file errors: 96 in 41 files (baseline 96 in 41 files)`, `PASS` |
| IMP-06 | `pnpm -C autobyteus-web test:nuxt --run` on the stream, hydration, open-path and store specs (list in the file header) | `feb69495a5` | as above | scheduler, page signal, transport, Team/agent/Org/collaboration owners, agent reconnection, loaders, `agentRunStore`, Org/collaboration stores | REQ-001, REQ-002 / AC-001…004 (unit), REQ-005 | Pass | `IMP-06-web-stream-specs.log` | `Test Files  67 passed (67)`, `Tests  676 passed (676)`; the six new/rewritten spec lines |
| IMP-07 | `pnpm -C autobyteus-web test:nuxt --run` (full web unit suite) | `108fcd0587` | as above | every web spec | REQ-005 | Fail → fixed (3 spec files written for the 0 s retry / give-up or mocking the index; fixed in `9e0a09dc81`, IMP-08) | `IMP-07-web-unit-full.excerpt.log`, `IMP-07-web-unit-full.log.gz` | `Test Files  3 failed \| 719 passed (722)`; the three `FAIL` files |
| IMP-08 | rerun of the three failing files and `nativeCompactionTermination.spec.ts` (mock repointed) | `9e0a09dc81` | as above | Org retained recovery, collaboration reloads, draft-send integration, native compaction termination | REQ-001, REQ-005 | Pass | `IMP-08-web-specs-fixed-rerun.log` | `Test Files  4 passed (4)`, `Tests  41 passed (41)` |
| IMP-09 | `pnpm -C autobyteus-web guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | `9e0a09dc81` | as above | web boundary and localization rules | — | Pass | `IMP-09-web-guards.log` | `[guard:web-boundary] Passed.`; `Passed with zero unresolved findings.` |
| IMP-10 | reproduction after the fix, first run, `--scenarios=R1,R2,R3,R4,R6,R7` | `feb69495a5` | as above | the whole phone path | BEH-003 | Superseded by IMP-12 (two probe problems, IMP-11) | `IMP-10-repro-after-fix/` (`README.md`) | R3 `"phoneShowsByItselfWithin60s":47`; R6 fresh empty, R7 `null` (probe, see IMP-11) |
| IMP-11 | temporary diagnostic copy of the repro, `--scenarios=R6,R7` (not kept, not committed) | `feb69495a5` | as above | fresh client open; R7 member reload reads | — | Pass (causes found) | `IMP-11-diag-r6-r7/README.md`, `repro-summary.json` | `freshScreen.state: "open"`, `copies: 1`; `GetTeamMemberRunProjection` with `done: null, failed: null` |
| IMP-12 | `node evidence/repro/phone-live-repro.mjs --output-dir=… --scenarios=R1,R2,R3,R4,R6,R7` (final) | `feb69495a5` | as above, builds IMP-13 | the whole phone path on the phone bundle with Phone Access | AC-001 (Team member), AC-003, AC-004, AC-005, AC-006 (R1, R2, sending view) | Pass | `IMP-12-repro-after-fix-final/` (`README.md`, `repro-summary.json`, `repro-stdout.log`, `server.log`, screenshots) | R3 `"phoneShowsByItselfWithin60s":47`; R6 fresh `"copies":1`, `"hasMessageId":true`; R7 `"socketsOpenedWhileHidden":0`, `"shownAfterVisibleMs":104` |
| IMP-13 | `pnpm -C autobyteus-server-ts build`; `pnpm -C autobyteus-web build:mobile-web` | `feb69495a5` | as above | server `dist`, the served phone bundle | — | Pass | `IMP-13-builds.log` | `files with "Max reconnection attempts": 0`, `files with "re-synchronizing": 1` |

- Not run, and why: the durable `mobile-shell-probe` cases, the AC-002 agent-run phone probe, the emulator check (ASM-001) and the server E2E / route-policy browser checks are API/E2E's. The Electron test layer was not run (no Electron main-process change). No fresh-start build: no build input changed (DESIGN.md rule 12).
- Discrepancy noted while running checks: the IMP-02 focused run first happened while the IMP-01 reproduction was running (TESTING.md: one heavy run at a time); its recorded result comes from the later rerun on `feb69495a5`.

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable` as a visual change: no UI, layout or interaction changed (no new indicator, DEC-007). The rendered phone bundle was exercised for behavior through the reproduction (IMP-12): the phone's conversation shows the missed events by itself after a long outage (R3) and after a hidden period with a dead connection (R7), and a user message appears once (R6).

## Downstream Coverage Hints / Suggested Scenarios

- AC-002 on the phone bundle for a **top-level agent run** (the reproduction drives a Team member only): a 45 s outage, then a marker; the agent path catches up through `loadRunStoredState` before it reopens.
- AC-003 on the **emulator** (ASM-001): app to background ≥ 2 min, screen off, then on; the run's events meanwhile appear within 5 s.
- AC-005 durable probe: a second client opens an AGY run during a 30 s turn; one copy before the tool card; the stored record has `message_id`/`dedupe_key` (R6 shape).
- AC-006: route-policy tests (`/ws/terminal` refused for a phone credential while run streams open), mobile-shell probe, no list poll while hidden; 4004 not retried (unit-covered in IMP-03…IMP-07).
- DEC-003 cost: a desktop window with several kept runs hidden ≥ 30 s re-syncs each stream once on becoming visible.
- The read-to-open window on the agent path (Risks): watch for a missing event right after a reconnect.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- The durable `mobile-shell-probe` cases for AC-001, AC-003, AC-005 (design Guidance For Implementation, Durable tests), and the AC-002 agent-run probe.
- Emulator validation of AC-003 / ASM-001.
- AC-006 existing suites and the route-policy tests.

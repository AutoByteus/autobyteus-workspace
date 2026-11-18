# Implementation Handoff — autobyteus-540 (send-on-unbound-stream)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review selected (Medium / High); ARCH-REV-002 Pass. Route after implementation: Code Reviewer (`get_handoff_rules`).
- Requirements doc: `requirements-doc.md` (SR-003, Approved)
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md`
- Design spec (required on every route): `design-spec.md` (SR-003, Ready)
- Supplemental task artifacts: `evidence/spine-validation/sr-003-send-spines-by-run-kind.md`; `evidence/reproduction/`
- Design review report: `design-review-report.md` (ARCH-REV-002 Pass)
- Architecture review revision record: `architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence: N/A (initial round)
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/send-on-unbound-stream/tickets/in-progress/send-on-unbound-stream`
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/send-on-unbound-stream`, `codex/send-on-unbound-stream`; code commits `f70d3cb968` (server), `49ed8967f0` (web); documents and evidence in the commit after them (`git log`). Base `origin/personal` `914eb36577`.

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-003`
- Related architecture-review revision IDs: `ARCH-REV-002`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

**Node (D-8).** `AgentStreamSnapshotPayload` gains `input_state`. `activeRunSnapshot(sequence, base, readStored, readInputState)` takes the reader explicitly and reads it after the stored part; the agent stream connection passes the bound run's `getInputStateSnapshot()`, the peer relay passes `null` (with the reason in a comment), and `storedRunSnapshot` gives `null`.

**Web.**
- D-1: `AgentStreamingService.whenBound(timeoutMs)`; the bound flag is set at `CONNECTED` and cleared at any loss, drop or disconnect. `ensureAgentStreamConnected` awaits `whenBound(10_000)` (the socket poll is gone); the peer route awaits it too.
- D-2/D-3: every agent send (`sendMessage`, `sendMessageAwaitingAdmission`) resolves at the node's ack, and a not-bound stream or a throwing socket gives `MessageNotDeliveredError('not_sent')`. The bookkeeping lives in `agentStreamSendAdmissions.ts`, owned by the service.
  - At a retryable loss (`handleDisconnect`, `dropConnection`, `reopen`) waiting sends are held (`HeldUntilRebind`). After the next `AGENT_STREAM_SNAPSHOT` is applied they are decided by message id: found → resolved; missing with `input_state` → `not_sent`; missing without one → `unknown`.
  - A final close settles held and waiting sends as `unknown`.
- D-8 page side: the envelope parses `input_state` with the contract schema. `applyAgentStreamSnapshot` applies a non-null one with `handleAgentInputState`, resetting the projection's revision first, *instead of* the old pending overlay (the reviewer's non-blocking suggestion). With `null` it keeps the overlay as before.
- D-4: `MessageNotDeliveredError` and `failLocalSubmission`'s `'returned_draft'` outcome.
  - The shown message is removed (`not_sent` only).
  - When the box is empty the draft comes back: text and skill tags as typed (the new `draft` option of `beginLocalUserSubmission`), the message's own (finalized) attachments, and its mentions.
  - `context.messageNotDelivered` is set and `submissionPending` cleared; the status is not touched. `beginLocalUserSubmission` clears the notice.
  - `showMessageNotDelivered` is used by the peer route.
- D-5:
  - Team: the handshake timeout and a socket refusal give `not_sent`; `drain` gives `unknown`. The store returns on anything but `'failed'`, so neither its own draft restore nor the Error status applies to these.
  - Org: not ready and a socket refusal give `not_sent`; a `SEND_MESSAGE` pending at a close gives `unknown`. This goes through `orgCommandFailure` in the Org-owned `agentOrgConnectionLostError.ts`; other commands keep a plain error. The store returns on anything but `'failed'`. Both Org files stay at 506 lines.
- D-6: `MessageNotDeliveredNotice.vue` is mounted beside the collaborator-add notice in `AgentEventMonitor.vue` (desktop and phone). Texts (a)/(b) of REQ-004, verbatim, plus "Dismiss", in en and zh-CN.
- D-7: both probes' `holdTurn` fail the case at once on a lost send.
- `HeldUntilRebind` (`heldUntilRebind.ts`) replaces `InterruptsAwaitingRebind`; the Stop-specific part is `holdPendingInterrupts(holder, pending)`.

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Medium`
- Architecture risk (`Low`/`High`): `High`
- Design classification section / evidence reference: `design-spec.md`, Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: the node change is D-8 only (one payload field, three call sites); 17 web source files changed and 4 added, all inside existing owners. The send contract changes for every run kind, there is lifecycle across reconnects, and draft restoration is shared, as classified.
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None` (no node or wire change beyond D-8; snapshot application changed only to apply the input state; ASM-001 confirmed).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001/002 | Agent and delegated sends leave only after `CONNECTED` | `agentRunStore.sendUserInputAndSubscribe` → `ensureAgentStreamConnected` → `whenBound` → `sendMessage` (ack awaited). The delegated agent route is the same store with a run id | `agentStreamSendDelivery.spec` (send waits for CONNECTED, one SEND_MESSAGE; bound stream sends at once); IMP-01 fails before the fix |
| BEH-003 | Peer send waits for bound; failure → notice, draft kept | `delegatedRunsStore` peer `send`: `whenBound` → `sendMessageAwaitingAdmission`; `showMessageNotDelivered` | `delegatedRunsStore.spec` (not_sent and unknown; a new send clears the notice) |
| BEH-004 | Team/Org transport failures classified; shared presentation; status unchanged | `teamSendAdmission.ts`, `agentTeamRunStore`; `agentOrgStreamingService` + `orgCommandFailure`, `agentOrgContextsStore` | Team store spec (timeout, not_sent, unknown; status kept, no segment); Team service spec; Org composer spec (socket refusal → not_sent; close → unknown, survives the Org recovery) |
| BEH-005 | Lost in flight: decided after the rebind snapshot | `AgentStreamingService` (hold at loss, `decideHeld` after `applyAgentStreamSnapshot`), `agentStreamSendAdmissions.ts`, snapshot `input_state` (node + page) | Found stored; found queued through `input_state` (the native/AGY/ACP case; a mutation check shows it depends on D-8); not_sent; unknown; final close → unknown |
| BEH-006 | Not bound within 10 s → (a), draft back | `whenBound` timeout → `failLocalSubmission` `'returned_draft'` | Message removed, draft back, notice, status unchanged, no "Error Occurred" |
| BEH-007 | Protocol unchanged | — | Server suites green for the changed code; the node's gate is untouched |
| AC-005 | Notice and draft survive a later snapshot | context field (not the conversation) | Spec case; the Org recovery keeps the context object |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

Server: `src/services/agent-streaming/agent-stream-snapshot.ts`, `agent-stream-connection.ts`, `agent-stream-handler.ts`; `src/remote-collaboration/inbound/peer-agent-stream.ts`. Tests: `tests/unit/services/agent-streaming/{agent-stream-handler,agent-stream-sequence,peer-run-stream-session,agent-stream-handler-follow}.test.ts`, `tests/unit/remote-collaboration/peer-agent-stream.test.ts`, `tests/integration/agent/agent-websocket.integration.test.ts` (fake), new `tests/unit/run-history/projection/native-user-message-identity.test.ts`. Removed `tests/e2e/agent-run/send-on-unbound-stream-repro.e2e.test.ts`.

Web:
- Added: `services/runSubmission/messageNotDelivered.ts`, `services/agentStreaming/heldUntilRebind.ts`, `services/agentStreaming/agentStreamSendAdmissions.ts`, `components/agentInput/MessageNotDeliveredNotice.vue`.
- Modified: `AgentStreamingService.ts`, `agentStreamSnapshotApplication.ts`, `protocol/agentStreamEnvelope.ts`, `interruptCommandAdmission.ts`, `TeamStreamingService.ts`, `teamSendAdmission.ts`, `agentOrgStreamingService.ts`, `agentOrgConnectionLostError.ts`, `localUserSubmission.ts`, `AgentContext.ts`, `AgentEventMonitor.vue`, stores `agentRunStore`, `agentTeamRunStore`, `agentOrgContextsStore`, `delegatedRunsStore`, localization en/zh-CN, probes `stop-generation-probe.mjs`, `mobile-stop-generation-cases.mjs`, docs `agent_execution_architecture.md`.
- Tests: new `agentStreamSendDelivery.spec.ts` (14 cases), `MessageNotDeliveredNotice.spec.ts`, `sendNotDeliveredCatalog.spec.ts`; route cases in Team/Org/peer specs; stale specs rewritten.

## Important Assumptions

- ASM-001: confirmed on the native stored path (IMP-03: the page's message id is kept from `buildNativeUserMessageTrace` through the normalizer and projection to the stored user message). External runtimes keep it through `runtime-memory-event-accumulator.ts` (existing `external-runtime-user-message-identity.test.ts`).

## Known Risks

- Implementation decision outside the design text: a not-delivered **first message of a new run** keeps its prepared run (the store no longer calls `CancelPreparedAgentRun` for `MessageNotDeliveredError`). REQ-003 tells the user to send again, and that resend needs the run. For `unknown`, the message may already have started it. Other failures still cancel. Reviewer: please confirm, or route to the Solution Designer.
- R-2 (design): an ack that never comes on a bound stream leaves the send pending until a loss; no timer.
- R-4 (design): a peer run answers `unknown` for a missing message.
- The agent store still logs `console.error('Error sending user input:')` for a not-delivered send, before `failLocalSubmission`'s `console.warn`. These are console lines only; the existing catch was kept.
- `whenBound` waiting when the stream is disconnected rejects at its timeout (10 s), not at once. The draft then returns to a context that may no longer be shown. Not a supported user path; noted only.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug fix.
- Reviewed root-cause classification: Missing Invariant + Duplicated Policy Or Coordination.
- Reviewed refactor decision: `Refactor Needed Now` (bounded: generalized holder, shared failure outcome).
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes:
  - Applying the snapshot's `input_state` resets `inputProjection` first. Without that, an input state at a revision the page already saw would not be applied to the replaced conversation, and a queued message would vanish (spec case "an input state at a revision the page already saw").
  - The failure status of the agent store moved into `failLocalSubmission`'s `failedStatus` option. It must be set before the navigation effect is published (the existing navigation test). The Team store keeps its order.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (a snapshot without `input_state` is rejected by the parse; node and page ship together, DESIGN.md rule 9).
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes`. Removed: the socket poll; `pendingAdmissions`/`settleAdmission`; `InterruptsAwaitingRebind`; the unused `CollaboratorAddRejection` import in `agentRunStore`; the probes' second send; the Team and Org store-local draft restore and Team's Error status for transport failures (kept for other failures, as designed).
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes` (`MessageNotDeliveredError` carries certainty + detail; `HeldUntilRebind` holds settle callbacks only).
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Deviations from a design principle decided during implementation: `None`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes`. `agentOrgContextsStore.ts` and `agentOrgStreamingService.ts` stay at 506 lines (no growth; FU-001). `agentTeamRunStore.ts` is 486 effective, `AgentStreamingService.ts` 403, `agent-stream-handler.ts` 454 (was 453). No delta above 220.
- Notes: `agentOrgConnectionLostError.ts` now also holds `orgCommandFailure`, the Org's rule for what a failed command rejects with. It is kept there so the Org service does not grow.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Implementation follows the approved decision: `Yes`
- Deviation: `None`

## Environment Or Dependency Notes

- macOS, Node v22.23.1; Chrome; scripted AGY CLI; server `dist` built from this worktree for IMP-08.
- `fseventsd` was busy during the server suite (164% CPU; an FSEvents write produced no event in 10 s), which explains the skill-folder watcher failure (IMP-04).

## Checks Run

Evidence: `tickets/in-progress/send-on-unbound-stream/evidence/implementation/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result (`Pass`/`Fail`) | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | The readiness test of `agentStreamSendDelivery.spec.ts` on the base code | `5b58c98cc4` (base code) | macOS, Node 22 | `ensureAgentStreamConnected` | AC-001 | Fail (expected: reproduces) | `IMP-01-web-readiness-repro-before-fix.log` | `expected "spy" to not be called at all, but actually been called 1 times` |
| IMP-02 | `vitest run tests/unit/services/agent-streaming tests/unit/remote-collaboration` + the two agent websocket integration files | `49ed8967f0` | macOS, Node 22 | snapshot `input_state` (active, stopped, peer), handlers, relay | AC-003 (server half), AC-007 | Pass | `IMP-02-server-snapshot-input-state.log` | `Tests  398 passed (398)` |
| IMP-03 | `vitest run tests/unit/run-history/projection/native-user-message-identity.test.ts` | `49ed8967f0` | macOS, Node 22 | native raw trace → normalizer → projection | ASM-001 | Pass | `IMP-03-asm001-native-message-id.log` | `Tests  1 passed (1)` |
| IMP-04 | `pnpm -C autobyteus-server-ts test:unit`; the 2 failing files alone after commit; FSEvents measurement | full: pre-commit tree; rerun `49ed8967f0` | macOS, Node 22 | whole server unit suite | AC-007 | Pass for the changed code; 2 unrelated (see Look For) | `IMP-04-server-unit-full.log` | `Tests  2 failed \| 8471 passed`: tracked-imports (new files not yet in git; passes after commit) and skill-folder-watcher (fseventsd busy; passes alone); rerun `Tests  11 passed (11)` |
| IMP-05 | `pnpm -C autobyteus-server-ts typecheck` | pre-commit tree = the commits | macOS, Node 22 | server src + tests | — | Pass | `IMP-05-server-typecheck.log` | `production errors: 0; test-file errors: 1006 in 315 files (baseline 1006 in 315 files)` |
| IMP-06 | `pnpm -C autobyteus-web typecheck`; `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | pre-commit tree = `49ed8967f0` | macOS, Node 22 | web app, tests, cross-package tests; guards | QR-001 | Pass | `IMP-06-web-typecheck-and-guards.log` | `production errors: 0; test-file errors: 87 in 37 files (baseline 87 in 37 files)`; `Passed with zero unresolved findings.` |
| IMP-07 | `NUXT_TEST=true pnpm -C autobyteus-web exec vitest run`; mutation check of the queued case | pre-commit tree = `49ed8967f0` | macOS, Node 22 | whole web suite incl. 14 send-delivery cases, route specs, notice and catalog specs | AC-001, AC-003, AC-004, AC-005, QR-002 | Pass | `IMP-07-web-unit-full.log` | `Test Files  775 passed (775)`; mutation: `expected [ 'the running turn\'s input' ] to deeply equal [ …(1) ]` |
| IMP-08 | `pnpm -C autobyteus-server-ts build`; `pnpm -C autobyteus-web test:e2e:stop-generation --output-dir …` (real stack, loopback) | `49ed8967f0` | macOS, Chrome, scripted AGY | sends right after Stops took the AGY run offline (new streams), Stop paths | AC-002 (partly), AC-006 | Pass | `IMP-08-stop-generation-probe/` (README.txt, evidence.json) | `"result": Pass`, SGD-01…SGD-08 Pass, `"sends": 20`, `"sendStalls": []` |
| IMP-09 | Notice rendered above the real composer on a temporary `nuxi dev` page (removed afterwards), driven in Chrome: `not_sent` (en, desktop width), `unknown` (zh-CN, 360 px), dismiss | `49ed8967f0` | macOS, Chrome | `MessageNotDeliveredNotice.vue`, composer | AC-004, REQ-004, QR-001 | Pass | `IMP-09-notice-rendered/*.png` | the en text (a) verbatim; zh text (b) wraps within 360 px; after dismiss the notice is gone and the draft stays |

- Not run, and why:
  - AC-002's 40+ rounds, the forced-reconnect real-stack case, and the phone case in `test:e2e:mobile-shell`: E2E coverage is owned by API/E2E. The modified probes are ready (they fail on a lost send).
  - Whole server `test:integration` and `pnpm test:e2e`: left to API/E2E. The rewritten websocket integration files ran (IMP-02).
  - Real Team/Org/peer stacks with a lost send in flight: API/E2E (multi-node for peer).

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: the composer's notice slot above the message box (desktop and phone `AgentEventMonitor`); the returned draft in the box.
- Approved UI/UX, interaction, requirement, or design references: REQ-003, REQ-004 texts; D-6; the existing collaborator-add notice place.
- Existing design system, shared components, and adjacent product surfaces reviewed: `CollaboratorAddFailureNotice.vue` (same slot, layout, icon and dismiss pattern). The new notice uses amber rather than red, because it is a recoverable state, not a refusal.
- Testing guideline or development / preview instructions and rendered surface used: `nuxi dev` with a temporary fixture page that mounts the real notice and composer through the active-context store (IMP-09); the real-stack probe for sends after Stops (IMP-08).
- States, layouts, viewports, and interactions inspected: `not_sent` en at desktop width; `unknown` zh-CN at 360 px; dismiss; the restored draft in the box; the notice sits above the box (`getBoundingClientRect`); `role="alert"`, dismiss `aria-label`.
- Visual or interaction issues found and corrected: none.
- Check IDs with the supporting evidence, and remaining unverified states or limitations: IMP-09 screenshots; the phone bundle itself was not rendered (API/E2E's `test:e2e:mobile-shell`).

## Downstream Coverage Hints / Suggested Scenarios

- AC-002: 40+ rounds of a send right after a Stop of an AGY run (desktop probe) and a send right after a forced reconnect (the probe's wire can drop the path); the phone case in `test:e2e:mobile-shell`.
- AC-003 in a real stack: drop the path after `SEND_MESSAGE` and before its ack, for a run that queues input (native/AGY/ACP while Running), so the message is found through the snapshot's input state and shows once with no notice. Then a missing case (text a) and a stopped run (text b).
- Team and Org: a send lost in flight shows text (b) with the draft back and the member's status unchanged; a Team handshake timeout shows (a).
- A first message of a new run that is not delivered: send again succeeds on the kept prepared run.
- Peer run (two nodes): not bound → notice (a) with the draft kept; lost in flight → (b) unless it appears.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes: the AC-002 rounds and the reconnect and phone cases, the real-stack AC-003 branches, Team/Org/peer lost sends, and the whole server integration/e2e suites, as listed above.

# Code Review Report — autobyteus-540 (send-on-unbound-stream)

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-003, Approved)
- Investigation Notes Reviewed As Context: through the design spec's Current-State Read and evidence rows
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md` (SR-003, Ready)
- Supplemental Task Artifacts Reviewed As Context: `evidence/spine-validation/sr-003-send-spines-by-run-kind.md`; `evidence/reproduction/`
- Relevant Solution Revision IDs: SR-003
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-002 Pass)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-002
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-001)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Review Scope: `Full Review`
- Review Scope Evidence (round >1): N/A
- Trigger: Implementation Engineer, IR-001 ready for source review
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Code reviewed: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/send-on-unbound-stream`, branch `codex/send-on-unbound-stream`, `914eb36577..c95f2d3874` (code commits `f70d3cb968` server, `49ed8967f0` web)
- Failure-origin fields: N/A

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: Confirmed. The send contract changes for every run kind, a send is held across reconnects, draft restoration is shared, and the `AGENT_STREAM_SNAPSHOT` payload gains `input_state`. No correction.

## Review Scope

- Changed implementation and behavior reviewed:
  - Node D-8: snapshot `input_state`.
  - Web D-1…D-7: `whenBound`, ack-awaited sends, `AgentStreamSendAdmissions`, `HeldUntilRebind`, snapshot application of `input_state`, `MessageNotDeliveredError`, `failLocalSubmission` `'returned_draft'`, Team/Org classification, peer route, notice, localization, probes, docs.
- Files / areas reviewed: all changed source in `autobyteus-server-ts/src` (4 files) and `autobyteus-web` (21 source files), their changed specs, and the owners needed to judge them. Those owners are `userMessageProjection.overlayPendingUserMessages`, `contextFileUploadStore.finalizeDraftAttachments`, `peer-run-stream-session.ts` (CONNECTED at open, `:43`) and the agent/Team store send paths.
- Explicit exclusions: none. No recorded check was rerun: the code each one exercises is unchanged since it ran, and the conclusions here come from reading the code.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes. REQ-001…REQ-006, AC-001…AC-007, DEC-001…DEC-006.
- Design-spec behavior map verified against the implementation: Yes (DS-001…DS-004, D-1…D-8).
- Design review report and round confirmed: ARCH-REV-002 Pass on SR-003.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: one implementation decision, a not-delivered first message keeps its prepared run (CG-01). It is judged as required by REQ-003, not new behavior.
- Remaining material ambiguity: None.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Evidence |
| --- | --- | --- | --- |
| BEH-001/002 | Confirmed | `agentRunStore.sendUserInputAndSubscribe` → `ensureAgentStreamConnected` (`agentRunStore.ts:316-323`, `whenBound(10_000)`) → `sendMessage` awaits the ack (`AgentStreamingService.send`); `bound` set at `CONNECTED` (`markBound`) and cleared in `rejectInFlight` / `disconnect()` | — |
| BEH-003 | Confirmed | `delegatedRunsStore.ts` peer `send`: `whenBound` then `sendMessageAwaitingAdmission`; failure → `showMessageNotDelivered`, draft kept (the route clears it only on success); the relay sends `CONNECTED` at open (`peer-run-stream-session.ts:43`) | — |
| BEH-004 | Confirmed | Team: handshake timeout and `TeamSendAdmissions.fail` → `not_sent`, `drain` → `unknown`; store returns on non-`'failed'`, so no Error status. Org: `requireReadyContext` / socket throw → `not_sent`, `rejectPending` → `unknown` via `orgCommandFailure`; store returns on non-`'failed'` | — |
| BEH-005 | Confirmed | `rejectInFlight(true)` → `sends.holdWaiting()`; after `applyAgentStreamSnapshot` → `sends.decideHeld({ has, inputStateKnown })`. Server: `activeRunSnapshot(…, readInputState)` with the bound run's `getInputStateSnapshot` (`agent-stream-handler.ts:305`), `null` for the peer relay and stopped runs | — |
| BEH-006 | Confirmed | `whenBound` timeout → `MessageNotDeliveredError('not_sent')` → `returnDraft` (message removed, draft back if the box is empty, notice, status untouched) | — |
| BEH-007 | Confirmed | Node gate and protocol untouched; only the payload field added | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor | Goal | Entry | Shape | Forward Path | Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001…003, 007; AC-001, AC-002 | User | User | Send a message to a run whose stream just opened | Composer Send, desktop/phone, every UC-004 kind | Normal | DS-001 | The node takes it; the turn starts | 533 API-10; server measurement | Supported Normal Scenario | Use |
| SCN-002 | BEH-005; AC-003 | User / network | User | Same, connection drops in flight | Send; drop; reconnect | Normal | DS-002 | Shows if the node has it, else SCN-003 | requirements | Supported Normal Scenario | Use |
| SCN-003 | BEH-001…006; AC-004, AC-005 | User | User | A send that cannot be delivered | Send | Normal | DS-003 | Draft back + one plain notice | requirements | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract | Independent Trigger | Forward Path / Consequence | Evidence | Disposition | Scope | Reason / Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CG-01 | (Handoff question 1) A not-delivered first message of a new run no longer cancels its prepared run | SCN-003, REQ-003, UC-001 ("the first message of a new run") | First message of a new run whose stream is not bound in 10 s | The context is already promoted to the prepared id and its config locked. A cancelled run would make the resend REQ-003 asks for fail. Kept, the resend is an existing-run send on the same id (`SEND_MESSAGE` starts it, as for any first message). Attachments come back finalized and pass through `finalizeDraftAttachments` unchanged (`phase !== 'draft'` is skipped) | `agentRunStore.ts:246-256`; `contextFileUploadStore.ts:129-138` | Reject (no finding) | — | Required to meet REQ-003 for UC-001, so not new behavior. Other failures still cancel. The docs record it (`agent_execution_architecture.md`, "A message that does not reach the node") |
| CG-02 | (Question 2) The agent store's Error status moved into `failLocalSubmission`'s `failedStatus` option | Design D-4, BEH-004 status unchanged | — | `kept_draft` and `returned_draft` return before the status. The `'failed'` path sets Error before the navigation effect, as before | `localUserSubmission.ts` `failLocalSubmission` | Reject (no finding) | — | Keeps one classifier of the error. The Team store sets its status after `'failed'`, as before. The two orders differ, but each preserves its existing test-backed behavior |
| CG-03 | (Question 3) `orgCommandFailure` lives in `agentOrgConnectionLostError.ts` | Principle 12 | — | Both exports answer "what an Org command rejects with". The file name names only one of them | Code read | Reject (suggestion) | — | Reason given: a separate file would add an import line to the 506-line Org service the design froze. Suggest renaming the file (e.g. `agentOrgCommandFailure.ts`) at the next touch; no behavior or reader is misled by the doc comments |
| CG-04 | When `input_state` is null, the old overlay is kept; could it carry the page's own optimistic message and make a lost send "found"? | SCN-002, REQ-002 (never silent) | Retryable loss with a send waiting; stopped run or peer at the rebind | `overlayPendingUserMessages` copies only messages with `pendingInput`, which only the node's input state sets (`userMessageProjection.ts:120,130`). A local optimistic message has none, so a lost send is not found falsely. A message the node had queued before the loss is found, which is true | Code read | Reject (not reachable) | — | — |
| CG-05 | `whenBound` waiters are not cancelled by `disconnect()`: a waiting send rejects at its 10 s timeout and returns its draft to a context that may no longer be shown | — | Close the view while a send waits for binding | No supported product consequence: the context is not shown, and the draft lands where the user left it | Handoff Known Risks | Reject | — | Noted only |
| CG-06 | Stale doc name: `autobyteus-web/docs/agent_execution_architecture.md:395` still says `InterruptsAwaitingRebind`, which this change renamed to `HeldUntilRebind` | Docs accuracy | — | A reader of the doc looks for a class that no longer exists | `grep` | Promote → docs sync | This ticket (docs) | Non-blocking: one word in delivery's docs sync. Recorded under Docs-Impact, not as a code finding |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | The readiness rule (D-1) and ack-awaited sends (D-2) replace the behaviors that were decided by an absence; one failure owner (D-4) replaces two store-local restores | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | SR-003 spine re-walk rows match the code | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-001…DS-004 traceable per run kind | — |
| Ownership boundary preservation and clarity | Pass | Services reject `MessageNotDeliveredError` and never touch drafts; `failLocalSubmission` owns the returned draft; the notice reads the context field | — |
| Off-spine concern clarity | Pass | Error type, notice, localization each serve one owner | — |
| Existing capability/subsystem reuse check | Pass | 533 holder generalized (`HeldUntilRebind`); `handleAgentInputState` reused for the snapshot's input state; notice slot reused | — |
| Reusable owned structures check | Pass | `HeldUntilRebind` shared by Stops and sends in three services; `holdPendingInterrupts` keeps the Stop-specific part | — |
| Shared-structure/data-model tightness check | Pass | `MessageNotDeliveredError` (certainty + detail); `RebindView` (two fields); `ReturnableDraft` | — |
| Repeated coordination ownership check | Pass | One classifier per service, one presenter | — |
| Empty indirection check | Pass | `AgentStreamSendAdmissions` owns the waiting map, the held settlement and the decision; `HeldUntilRebind` owns once-only settlement | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass — deviation recorded, reason holds | CG-03: `orgCommandFailure` in `agentOrgConnectionLostError.ts`, reason in the handoff | Suggestion only |
| Ownership-driven dependency check | Pass | `runSubmission/messageNotDelivered.ts` imports nothing; services import it; stores do not reach service internals | — |
| Visible dependencies check | Pass | Node: `readInputState` passed explicitly (`null` where none). Web: no new process-wide binding | — |
| Authoritative Boundary Rule check | Pass | Stores call `whenBound` / `sendMessage`; none read the send map | — |
| File placement check | Pass | New files beside their owners | — |
| Flat-vs-over-split layout judgment | Pass | — | — |
| Interface/API/query/command/service-method boundary clarity | Pass | `whenBound(timeoutMs)`, `sendMessage(): Promise<void>`, `failLocalSubmission(…, options)` with three outcomes | — |
| Naming quality and one vocabulary | Pass | "bound" matches the service's existing `{ kind: 'bound' }`; "not delivered" with `not_sent` / `unknown` used consistently; `rejectInFlight` now also holds (a pre-existing name, as in 533) | — |
| No unjustified duplication in changed scope | Pass | `pendingAdmissions` / `settleAdmission` folded into the admissions owner | — |
| Patch-on-patch complexity control | Pass | — | — |
| Dead code removed in the touched files and modules | Pass | Socket poll, `pendingAdmissions`, `InterruptsAwaitingRebind`, an unused import, the probes' second send, and the scratch measurement test (removed in `f70d3cb968`) | — |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | `agentStreamSendDelivery.spec.ts` names each AC branch, including the queued case with a mutation check (IMP-07) and the base-code failure (IMP-01) | — |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | — | — |
| No stale, duplicated, or compatibility-only tests retained in changed scope | Pass | Socket-readiness and raw-segment assertions rewritten | — |
| API/E2E readiness for the next workflow stage | Pass | Probes fail on a lost send (D-7); IMP-08 20 sends after Stops, 0 lost | — |

## Source File Size And Structure Audit

| Source File | Effective Before | Effective After | `>500` Check | `>220` Delta | SoC / Ownership | Placement | Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/agentOrgContextsStore.ts` | 488 | 488 | Pass | Pass | Pass | Pass | — (FU-001 for the 506 physical lines) | — |
| `autobyteus-web/stores/agentTeamRunStore.ts` | 483 | 486 | Pass | Pass | Pass | Pass | — | — |
| `autobyteus-web/services/agentOrgExecution/agentOrgStreamingService.ts` | 473 | 473 | Pass | Pass | Pass | Pass | — (FU-001) | — |
| `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts` | 453 | 454 | Pass | Pass | Pass | Pass | — | — |
| `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` | 435 | 436 | Pass | Pass | Pass | Pass | — | — |
| `autobyteus-web/stores/agentRunStore.ts` | 429 | 420 | Pass | Pass | Pass | Pass | — | — |
| `autobyteus-web/services/agentStreaming/AgentStreamingService.ts` | 357 | 403 | Pass | Pass | Pass | Pass | — | — |
| `autobyteus-web/services/runSubmission/localUserSubmission.ts` | 167 | 227 | Pass | Pass | Pass | Pass | — | — |
| All other changed source files | ≤ 198 | ≤ 198 | Pass | Pass | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | A snapshot without `input_state` fails the parse; node and page ship together (DESIGN.md rule 9) |
| No legacy old-behavior retention in changed scope | Pass | The socket poll was removed, not kept as a fallback |
| Dead code removed in the touched files and modules | Pass | See structural check |
| Approved persisted-data transition decision is followed | Pass | `Not Affected` |
| No version-specific dual reads/writes or request-time old-shape fallback | Pass | `input_state: null` is a defined value (no input state on this node), not an old shape |
| Approved transition mechanics match the reviewed design | Pass | N/A |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: send readiness, delivery outcomes and the snapshot's `input_state` changed.
- Files or areas likely affected: `autobyteus-web/docs/agent_execution_architecture.md`, updated in the change and accurate, except one stale name. Line 395 (the 533 interrupt passage) still says `InterruptsAwaitingRebind`, which is now `HeldUntilRebind` (CG-06): one word for delivery's docs sync. No server doc describes the snapshot's fields, so none needs the new one.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| ARCH-REV-002 decisions (incl. ASM-001) | Confirmed | ASM-001 confirmed on the native stored path (IMP-03) |

None new beyond the candidate gate.

## Review Scorecard (Mandatory)

- Overall score: `9.4/10` (simple average; not the decision rule)

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | Every kind's send traced from Send to the node's answer or the returned draft | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | Services classify, one owner presents; the node's fact is read once, at the snapshot | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.4 | `whenBound`, ack-resolving sends, three failure outcomes | — | — |
| 4 | Separation of Concerns and File Placement | 9.3 | New concerns in small owned files | CG-03 file name broader than its name says | Rename at the next touch |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.4 | Tight error type and rebind view; generalized holder | — | — |
| 6 | Naming Quality and Local Readability | 9.3 | Consistent "bound" / "not delivered" vocabulary | CG-03; the pre-existing `rejectInFlight` now mostly holds | — |
| 7 | API/E2E Readiness | 9.4 | Unit branches per AC, mutation-checked queued case, base failure, real-stack probe with 0 lost sends | AC-002 rounds, reconnect, phone and Team/Org/peer real-stack branches remain (API/E2E's) | — |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.4 | Hold/decide, final close, overlay vs input state, resend on the kept prepared run, finalized attachments all traced correct | R-2 (no ack on a bound stream) by design | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | Clean cut | — | — |
| 10 | Cleanup Completeness | 9.3 | Poll, admissions map, old holder, second send, scratch test removed | One stale doc name (CG-06) | Docs sync |

## Findings

None blocking.

## Follow-ups

- Follow-ups this review added: None (FU-001 recorded upstream).

## Classification

- None (Pass).

## Recommended Recipient

- API/E2E Engineer (`/api_e2e_engineer`), per the rule "implementation review passes"; Implementation Engineer gets the informational notice.

## Residual Risks

- R-2 (design): an ack that never comes on a bound stream leaves the send pending until a loss (no timer).
- R-4 (design): a peer run answers `unknown` for a missing message (no input state through `RunAgentAccess`).
- For `unknown`, the draft comes back and the message may still appear. Text (b) says so, and the user may then send a duplicate (DEC-005, by design).
- The agent store still logs `console.error('Error sending user input:')` before `failLocalSubmission`'s warn for a not-delivered send (console only).
- For API/E2E:
  - AC-002's 40+ rounds;
  - the forced-reconnect and phone cases;
  - real-stack AC-003 branches, including a queued message on a native/AGY/ACP run;
  - Team/Org/peer lost sends;
  - the resend on a kept prepared run;
  - whole server integration and e2e suites.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.4 average; every category ≥ 9.3
- Failure Origin: N/A
- Recommended Recipient: `/api_e2e_engineer`
- Notes on the implementer's three questions:
  - (1) Keeping the prepared run is accepted: REQ-003's resend for UC-001's first message needs it.
  - (2) `failedStatus` is accepted.
  - (3) `orgCommandFailure`'s placement is accepted, with a rename suggested at the next touch.

# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/interrupt-idempotent-stop/tickets/in-progress/interrupt-idempotent-stop/requirements-doc.md` (SR-002, Approved)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/interrupt-idempotent-stop/tickets/in-progress/interrupt-idempotent-stop/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/interrupt-idempotent-stop/tickets/in-progress/interrupt-idempotent-stop/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/interrupt-idempotent-stop/tickets/in-progress/interrupt-idempotent-stop/design-spec.md` (SR-003)
- Supplemental Task Artifacts Reviewed: `evidence/spine-validation/sr-003-stop-spines-by-run-kind.md` (current), `sr-002-…` (superseded); `evidence/reproduction/browser-latency-150ms.json`; `follow-ups.md`; `handoff-architecture-design-complete.md`
- Relevant Solution Revision IDs: SR-001, SR-002, SR-003
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/interrupt-idempotent-stop/tickets/in-progress/interrupt-idempotent-stop/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger: Solution Designer's revised design SR-003 for ARCH-REV-001 AR-001 (`handoff-architecture-design-revised-sr-003.md`), 2026-11-18
- Prior Review Round Reviewed: 1 (ARCH-REV-001, Fail, AR-001)
- Latest Authoritative Round: 2
- Current-State Evidence Basis: branch `codex/interrupt-idempotent-stop` at `ab7e4c8967` (base `origin/personal` `bd2053ee51`; product code unchanged since round 1). Round 2 additionally opened: server `agent-stream-handler.ts:100-160` (every open, active or not, sends `CONNECTED` then `AGENT_STATUS`), `peer-run-stream-session.ts:70-80` (peer status before its snapshot); web `TeamStreamingService.ts:95-110,215-230,270-330,425-440` (`markTransportLost`, snapshot → `ready`, `enterReopenRequired`), `agentTeamRunStore.ts:95-190` (reopen-required replacement calls `previousService.disconnect()`), `agentOrgStreamingService.ts:80-110,296-316,392-440` (`failClosed`, `recoveryFailed`, `retireAndRecover`, `ready`). Round 1 basis: Cited lines opened: server `agent-run-interrupt-state.ts:34-80`, `agent-run-root-shutdown-fence.ts:76-109`, `agent-run-termination.ts:95-155`, `agent-turn-lifecycle-state.ts:108-160`, `agent-stream-handler.ts:389-440`, `team-interrupt-generation-command-handler.ts`, `agent-org-stream-handler.ts:104-160`, `agent-collaboration-stream-handler.ts:170-192`, `peer-run-stream-session.ts:112-117`, `root-team-run.ts:308-327`, `agent-org-run-message-delivery.ts:189-210`, `paired-agent-access.ts:55-58`, `standalone-paired-agent-access.ts:74-86`, `team-paired-agent-access.ts:104`, Claude/Codex/native/ACP/AGY backend `interrupt`, `claude-session.ts:274-290`, `codex-thread.ts:264-277`, `autobyteus-ts agent-runtime.ts:177-225`, `agent-run-input-lifecycle.ts`, `agent-run.ts:250-265,440-457`; web `agentPrimaryAction.ts`, `activeContextStore.ts:40-125,225-272`, `delegatedRunsStore.ts:118-155`, `agentOrgContextsStore.ts:360-380`, `agentOrgStreamingService.ts:125-140,175-262,392-456,491-496`, `AgentStreamingService.ts:60-160,237-360`, `TeamStreamingService.ts:130-140,462-472`, `interruptCommandAdmission.ts`, `agentRunStreamReconnection.ts`, `liveStreamReconnectScheduler.ts:14-57`, `peerRunStreams.ts`, `useTargetConversation.ts:10-20`, `AgentContext.ts:23,36`.

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Classification rationale reviewed: ack meaning changes on five streams, backend interrupt contract for three runtimes, the web interrupt result API and `AgentInteractionPort.interrupt()` return type for every run kind, a new client-side pending state with lifecycle against status events. About 8 server and 14 web source files inside existing owners; no persistence.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None. The classification matches the definitions (contract and concurrency impact → High; several components within existing boundaries → Medium).

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed` (round 2: BEH-008 now follows REQ-003's exit rule; AR-001 resolved)
- Approved requirements / intended behavior understood: Yes. Stop is harmless to repeat; "Stopping…" after the first press until the status leaves Running, a failure, or the stream rebinds; nothing-to-stop is `accepted` on every stream and runtime; only real failures show one plain message naming the agent.
- Relevant existing behavior and evidence confirmed: Yes. Root cause reproduced (server e2e, browser at loopback and at 150 ms latency); every cited server and web path opened and matches.
- Scope guardrail confirmed: Yes (UC-001…UC-006; terminate, the open-time placeholder, turn identity work, tool approval out of scope; REQ-007 preserved behavior).
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable: `Yes` (round 1 AR-001 → REQ-003, REQ-005, AC-006, AC-008; round 2: no blocking finding).
- Remaining material ambiguity: None.
- Statements about existing code the design relies on:
  - Shutdown fence and termination read a non-accepted interrupt result (`agent-run-root-shutdown-fence.ts:91-101`, `agent-run-termination.ts:106,136,153`): true; mapping at the command boundary keeps them correct.
  - Claude (`claude-session.ts:279-283` rejects) and Codex (`codex-thread.ts:268-272` throws) report a gone turn as `RUNTIME_COMMAND_FAILED`; native maps through `result.status` lowercase (`autobyteus-agent-run-backend.ts:297-303`): true.
  - AC-005 is reachable: the canonical turn stays active after the runtime's own turn is gone until the terminal event is applied (`agent-turn-lifecycle-state.ts:139-142` keeps an IDENTIFIED canonical turn when the snapshot has none), so the backend can be asked to interrupt a turn the runtime already ended. Confirmed.
  - `RUN_NOT_ACTIVE` is the code for a shut-down member (`root-team-run.ts:322`, `agent-org-run-message-delivery.ts:205`) and a not-running peer target (`paired-agent-access.ts:57-58`); a not-a-member target answers `RUN_NOT_FOUND` (`root-team-run.ts:315`, `agent-org-run-message-delivery.ts:197`) and stays rejected per DEC-002: true.
  - Round 2: SR-003's claims hold. The new connection's first `AGENT_STATUS` follows `CONNECTED` on every agent open, also for an inactive run (`agent-stream-handler.ts:150-155`, status from the projection); the peer relay sends the peer's status before its snapshot (`peer-run-stream-session.ts:76-77`); Team's snapshot sets `ready` (`TeamStreamingService.ts:310-325`); Org's single `ready` point is `agentOrgStreamingService.ts:312`.
  - Round 1 (SR-002, now corrected in the SR-003 re-walk): "A rebind of the stream drains pending commands as `connection_lost`" (spine re-walk, Restart / reconnect): **false**. Pending interrupts are drained when the stream drops (`AgentStreamingService.ts:316-326` `handleDisconnect` → `rejectInFlight`; `reopen` `:304-309`; `dropConnection` `:120-123`; `TeamStreamingService.ts:467-471`; Org `rejectPending` on close `agentOrgStreamingService.ts:136,452`). The rebind comes at least `RECONNECT_DELAYS_MS[0]` = 1 s later (`liveStreamReconnectScheduler.ts:14,53-57`; peer `REOPEN_WAIT_MS` 1 s, `peerRunStreams.ts:10,32-35`). See AR-001.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-002 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-003/004 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-005 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-006/007 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-008 | User | Pass (SR-003: Stopping held to the rebind's status) | Pass (reproduced, `browser-latency-150ms.json` gap150) | Pass (DS-002b) | Confirmed | AR-001 resolved |
| BEH-009/010 | User | Pass | Pass | Pass | Confirmed | — |
| (AC-005) | System | Pass | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/reproduction/` | Pass | Pass | Pass | Pass | Pass | — |
| `evidence/spine-validation/sr-003-stop-spines-by-run-kind.md` | Pass | Pass | Pass | Pass (rebind signals cited per stream; see implementation notes for two Team/Org close paths) | Pass | — |
| `evidence/spine-validation/sr-002-stop-spines-by-run-kind.md` | Pass | Pass | Pass | Superseded (marked) | Pass | — |
| Server and browser reproductions (hand-over) | Pass | Pass | Pass | Pass | Pass | — |
| `follow-ups.md` (FU-001, FU-002) | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Bug fix + behavior change | — |
| Root-cause classification is explicit and evidence-backed | Pass | Duplicated policy (four web presentations, five node pass-throughs) + missing invariant (no pending-Stop state); cited and confirmed | — |
| Refactor decision is explicit | Pass | Yes, bounded: one owner each side | — |
| Refactor decision is supported by concrete design sections | Pass | D-S1…D-S3, D-W1…D-W6; removal plan | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary (web) | Pass | Pass | Pass (`activeContextStore.interruptGeneration` thin entry → `runInterrupt`) | Pass | Pass | Pass | Pass |
| DS-002 | Return-Event | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002b | Return-Event (connection loss, SR-003) | Pass | Pass | Pass (streaming service owns when a lost Stop settles; `runInterrupt` owns what it means) | Pass | Pass (drop → hold → rebind status applied → settle → `runInterrupt` ends Stopping) | Pass | Pass |
| DS-003 | Return-Event (watch from the press, SR-003) | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-004 | Primary (node) | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Bounded local | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-006 | Bounded local | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `runInterrupt` behind `activeContextStore.interruptGeneration` | Pass | Pass | Pass | Pass | Only owner of `interruptPending` and messages |
| Streaming services' `interruptGeneration` (outcome promises) | Pass | Pass | Pass | Pass | Pending map stays inside |
| Node stream handlers + `userInterruptOutcome` | Pass | Pass | Pass | Pass | Domain result untouched |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `runInterrupt` | Pass | Pass | Pass | Pass | Arguments only; no store imports |
| Streaming services | Pass | Pass (no toasts/localization) | Pass | Pass | — |
| `user-interrupt-outcome.ts` | Pass | Pass (domain does not import it) | Pass | Pass | — |

Principle 16: `Pass` (no binding added; `useToasts()` used as the existing presenters use it).

## Interface Boundary Verdict

| Interface | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `runInterrupt({ context, interrupt, agentName })` | Pass | Pass | Pass | Low | Pass |
| `AgentInteractionPort.interrupt(): Promise<InterruptOutcome>` | Pass | Pass | Pass | Low | Pass |
| `AgentStreamingService` / `TeamStreamingService.interruptGeneration` | Pass | Pass | Pass | Low | Pass |
| `orgInterruptOutcome(service, agentRunId)` | Pass | Pass | Pass | Low | Pass |
| `userInterruptOutcome(result)`, `NOTHING_TO_INTERRUPT` | Pass | Pass | N/A | Low | Pass |
| Backend `interrupt(turnId)` contract | Pass | Pass | Pass | Low | Pass |

Empty indirection check: `Pass`. `runInterrupt` owns state and sequence; `orgInterruptOutcome` translates; no port added.

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Pending flag | Pass | Pass (`AgentContext`, beside `submissionPending`) | N/A | Pass | — |
| Ending Stopping on status | Pass | Pass (watch the one field all writers write) | N/A | Pass | — |
| Ending Stopping on rebind | Pass | Pass (each service's own rebind point: agent/peer first `AGENT_STATUS`, Team/Org the `ready` snapshot) | Pass (`InterruptsAwaitingRebind`, one settle-once rule used by three services) | Pass | AR-001 resolved |
| Command admission/drain | Pass | Pass | N/A | Pass | — |
| Stop sequence owner | Pass | Pass (`services/runInterrupt/` beside `runSubmission/`) | Pass | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| web `services/runInterrupt/` | Pass | Pass | Pass | Pass | — |
| web `services/agentStreaming/` | Pass | Pass | Pass | Pass | — |
| node `services/agent-streaming/` | Pass | Pass | Pass | Pass | — |
| node backends | Pass | Pass | Pass | Pass | — |

Every run kind (standalone, Team member, Org direct/Org-internal Team member, Org peer row, delegated agent, delegated Team member, peer run, collaboration-root peer row) is traced in the spine re-walk and confirmed against code.

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `InterruptOutcome` | Pass | Pass | Pass | Pass | — |
| Shown-name rule (`targetDisplayName`) | Pass | Pass | Pass | Pass | — |
| Nothing-to-interrupt rule | Pass | Pass | Pass | Pass | — |
| `InterruptsAwaitingRebind` (hold across a retryable loss, settle once) | Pass | Pass (`interruptCommandAdmission.ts`, beside admission/drain) | Pass | Pass | Not empty indirection: it owns the settle-once rule for three services (real repetition) |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Variant Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `InterruptOutcome` | Pass | Pass | Pass | N/A | Pass | `refused.detail` console only |

Derived consumers listed with a decision for each: `Pass` (presenters, stale probe, integration test, shutdown fence/termination, docs, `ChatComposer`). Note for implementation: `InterruptCommandTransportFailure` is also re-exported from `protocol/messageTypes.ts:16` and `protocol/index.ts:18`, and the callback options appear in `agentRunStreamReconnection.spec.ts:202`, `TeamStreamingService.execution-address.spec.ts:17`, `AgentStreamingService.spec.ts:254,318,344`, `agentRunStore.spec.ts:620`, `agentTeamRunStore.spec.ts:304-305`; the typecheck will surface them.

Vocabulary (Principle 15): `Pass` (Stop = interrupt, not terminate; `NO_ACTIVE_TURN` one meaning; `NOTHING_TO_INTERRUPT` names the answer).

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Matches The Intended Owner? | Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `user-interrupt-outcome.ts` | Pass | Pass | N/A | Pass | — |
| `runInterrupt.ts`, `orgInterruptOutcome.ts` | Pass | Pass | N/A | Pass | — |
| `agentOrgConnectionLostError.ts` | Pass | Pass | N/A | Pass | Keeps the 498-line service ≤ 500 |
| `targetDisplayName.ts` | Pass | Pass | Pass | Pass | — |
| Modified handlers, backends, services, stores | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/services/runInterrupt/` | Pass | Pass | Low | Pass | — |
| `autobyteus-server-ts/src/services/agent-streaming/user-interrupt-outcome.ts` | Pass | Pass | Low | Pass | Beside the ack builder |

## Removal / Decommission Completeness Verdict

| Item / Area | Named? | Replacement Clear? | Scope Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Web presenters and callback options | Pass | Pass | Pass | Pass | — |
| `InterruptCommandTransportFailure` and failure-callback admission | Pass | Pass | Pass | Pass | Re-exports noted above |
| Old localization keys | Pass | Pass | Pass | Pass | — |
| Scratch reproductions | Pass | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Ack meaning / web tolerance of old acks | No | Pass | Pass | DESIGN.md rule 9 applied |
| Callback options | No | Pass | Pass | — |

## Persisted-Data Transition Verdict (When Applicable)

N/A — `Not Affected` (command answers and client state only); confirmed.

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Node then web types, streams, routes, tests, docs | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Present And Clear? | Bad Shape Explained? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Web sequence, ending Stopping, node rule, connection loss, messages | Yes | Pass | Pass | Pass | SR-003 added the connection-loss example |

## Material Premise Validation (Only When Needed)

### `MP-001` — The stream drops while a Stop waits and the page still shows Running; the user presses Stop again before the rebind

- Related approved requirement: REQ-003 (Stopping leaves "when the run's stream rebinds (then the current status decides)"), REQ-005, AC-006 alternate outcome, AC-008.
- Relevant behavior ID(s): BEH-008, BEH-002.
- Initiating basis kind: `User` (+ network/runtime event already established as SCN-005).
- Independent trigger: the user double-taps Stop on the composer (SCN-002) on a phone over a remote path (SCN-005), on an AGY run, which goes offline after a Stop (by design).
- Support evidence: approved SCN-002 and SCN-005 (Supported Normal Scenarios); reproduced `evidence/reproduction/browser-latency-150ms.json` case `gap150`: the second press at 165 ms still found "Stop generation" (status Running) and its pending interrupt was then cancelled by the stream disconnect.
- Forward path in the approved target: press 1 → `runInterrupt` sets `interruptPending` → stream drops → service drains the pending interrupt at the drop (`AgentStreamingService.ts:316-326`) → outcome `connection_lost` → design: "Stopping ends, nothing shown" → `resolveAgentPrimaryAction` sees `Running` (stale; no status arrives while disconnected) and no pending → enabled Stop → press 2 → `tryAdmitInterruptCommand` finds the stream not `CONNECTED` (`interruptCommandAdmission.ts:47-58`) → `not_sent` → toast "Stop was not sent: not connected to the node…". The rebind comes ≥ 1 s after the drop (`liveStreamReconnectScheduler.ts:14,53-57`; peer 1 s, `peerRunStreams.ts:10,32-35`).
- Lifecycle consequence: a red failure toast after a double tap whose first Stop worked, and an enabled Stop on a stale status for ≥ 1 s — the false-alarm class this ticket removes (AC-008 "No toast"; REQ-003 keeps Stopping until the rebind).
- Reachability: `Reachable`.
- Review consequence: AR-001 (Design Impact, blocking) in round 1. Round 2: under SR-003 the context stays Stopping from the drop to the rebind's status, so press 2 is refused by the primary action and sends nothing (DS-002b); premise no longer produces a consequence.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass` (round 2)

## Findings

None open. AR-001 below is `Resolved` in ARCH-REV-002 and kept for traceability.

### AR-001 — "Stopping…" ends at the connection drop, not at the rebind; a double tap in the reconnect window shows a false failure toast

- Status: `Resolved` (SR-003 D-W7, DS-002b; verified in ARCH-REV-002)
- Type: Design Impact
- Severity: High (blocking in round 1)
- Protects: REQ-003 (leaves Stopping "when the run's stream rebinds (then the current status decides)"), REQ-005, AC-006 (alternate: "stream rebinds while Stopping → current status decides"), AC-008 ("No toast; after rebind, control follows the run's status").
- Scope status: Within Approved Scope. Changes approved behavior: No (it implements the approved rule).
- Affected behavior: BEH-008 / SCN-005, with SCN-002 (double tap) on every run kind whose stream can drop (agent, Team, Org, peer).
- Concrete problem: the design settles a waiting Stop as `connection_lost` and ends Stopping when the stream **drops** (DS-002 narrative; Return spine; spine re-walk "A rebind of the stream drains pending commands as connection_lost", which contradicts the code). Between the drop and the rebind (≥ 1 s) the page keeps the stale `Running` status, so the control returns to an enabled Stop; the user's second tap — the exact double tap of this ticket — is then refused locally as `not_sent` and shows "Stop was not sent: not connected to the node", although the first Stop worked. This is the reproduced `gap150` case with a different red toast.
- Evidence: MP-001; `AgentStreamingService.ts:304-309,316-326`; `TeamStreamingService.ts:467-471`; `agentOrgStreamingService.ts:136,436,452,491-496`; `liveStreamReconnectScheduler.ts:14,53-57`; `peerRunStreams.ts:10,32-35`; `interruptCommandAdmission.ts:47-58`.
- Required update: keep a context in Stopping across a connection loss and end it only after the stream has rebound and the rebind's status has been applied; then the current status decides (Send if not Running; Stop enabled if still Running). Name who drives it and in what order. One proportionate shape: the streaming service, which owns both the command and its connection, settles a waiting interrupt as `connection_lost` when the stream is bound again and its first status/snapshot has been applied to the context (`AgentStreamingService`: after the `CONNECTED`/bind status, `AgentStreamingService.ts:297`; Team and Org: their own ready/snapshot point), and at once only when the stream is closed for good (intentional `disconnect()`, context released, `startOver`); `runInterrupt` stays as designed (`connection_lost` → end Stopping, no message). An equivalent shape is fine if it keeps the same order: drop → still Stopping → rebind + status applied → Stopping ends → status decides. Correct the DS-002 narrative, the Return spine, the "Ending Stopping" example if affected, and the spine re-walk's Restart / reconnect rows; add a unit case (drop while Stopping, press during the reconnect window sends nothing and shows nothing, rebind with Running → Stop enabled; rebind with Idle/offline → Send) to AC-006/AC-008 coverage.
- Why proportionate: the requirement already states this exit rule; the services already observe the rebind; no timer or new state machine is needed, only moving the settle point of one outcome.
- Recommended recipient: Solution Designer.

## Classification

N/A (Pass). Round 1: `Design Impact` (AR-001, resolved).

## Recommended Recipient

Implementation Engineer (`/implementation_engineer`); informational pass notice to the Solution Designer.

## Residual Risks

- Implementation notes (non-blocking; apply D-W7's own rule "settle at once only when the stream is closed for good, otherwise hold until the rebind" to two close paths the enumerated lists do not name):
  - Team `enterReopenRequired` (`TeamStreamingService.ts:428-440`) closes that service instance for good (it disconnects and never reconnects; the store replaces the service and context, `agentTeamRunStore.ts:144-190`). Settle held Stops there at once, beside its existing drain, rather than leaving them until the old service's `disconnect()` at recovery commit.
  - Org `retireAndRecover` (`:435-439`) and `failClosed` (`:392-405`) set `intentionalClose` but are followed by recovery. Classify by "recovery follows", not by the `intentionalClose` flag, so they hold like the agent stream's `dropConnection`/`reopen`. I found no reachable case where a Stop waits at either point (a resync needs ≥30 s hidden; `failClosed` is a protocol failure), so this is consistency, not a finding.
  - `runInterrupt`'s `end()` ends only its own press (a later press's `interruptPending` is not cleared by an earlier outcome). With the watch from the press and no frames while held, I found no reachable overlap; keep it true by construction.
- Round 1 suggestion, adopted in SR-003: `runInterrupt` started the status watch only after `accepted` (design "Ending Stopping" example). Starting it at the press is as simple and removes any dependence on the order of the status frame and the ack (Claude/AGY send the status first). I found no reachable case where the status leaves Running and returns to Running before the ack (a queued input's next turn needs provider I/O after the ack is sent, `agent-run.ts:448-455`), so this stays a suggestion.
- R-1 (overlap with 448/526 FU-002 in the interrupt path), R-2 (Org service near 500 lines), R-3 (an accepted Stop with no later status change keeps Stopping; no timer, per DESIGN.md rule 1): accepted as recorded.
- Implementation note: when the Org route's `socket.send` throws, `command()` rejects with a plain error that `orgInterruptOutcome` maps to `refused`, while the agent/Team services map a send failure to `not_sent`; both show a plain message, so this is a wording choice for implementation, not a finding.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (MP-001 reachable; SR-003 removes its consequence; the new holder serves a reproduced, supported scenario)
- Notes: AR-001 resolved by D-W7 / DS-002b with cited rebind points per stream; status watch from the press adopted; classification Medium / High unchanged. Ready for implementation; see the implementation notes under Residual Risks.

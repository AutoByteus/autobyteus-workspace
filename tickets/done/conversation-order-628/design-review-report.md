# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-order-628/tickets/in-progress/conversation-order-628/requirements-doc.md` (SR-005, Approved; REQ-004 by the user; text aligned at SR-005)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-order-628/tickets/in-progress/conversation-order-628/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-order-628/tickets/in-progress/conversation-order-628/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-order-628/tickets/in-progress/conversation-order-628/design-spec.md` (SR-005: D-3 rewritten per stream boundary; D-1, D-2 unchanged and passed in round 1)
- Supplemental Task Artifacts Reviewed: `probes/clock-order-reproduction.spec.ts` (+ `.run.log`); `follow-ups.md` (FU-001); `handoff-architecture-design-complete.md`; `handoff-design-revised-sr-004.md`; `handoff-design-revised-sr-005.md`; implementation evidence IMP-01…IMP-05 (D-1/D-2)
- Relevant Solution Revision IDs: SR-001…SR-007
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-order-628/tickets/in-progress/conversation-order-628/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-004`
- Current Review Round: 4
- Trigger: Solution Designer's revised design SR-005 after ARCH-REV-001 (`handoff-design-revised-sr-005.md`, branch head `b45ef33694`), 2026-11-23
- Round 3 trigger: SR-006 after implementation's Design Impact (branch head `d035533502`; D-1, D-2 and D-3 built at `33a75a4ae4`…`87d7321915`), 2026-11-23
- Round 4 trigger: SR-007 after delivery DR-001 Blocked, Finding 2 (`handoff-design-revised-sr-007.md`, local branch head `3b95d9b080` on delivery's merge `54cee15c8e`), 2026-11-24
- Prior Review Round Reviewed: 3 (ARCH-REV-003, Pass)
- Latest Authoritative Round: 4
- Current-State Evidence Basis (round 4):
  - `evidence/delivery/DEL-BLOCK-accumulator-distinct-event-times/distinct-times-run.log` (7 of 25 accumulator tests fail with distinct event times);
  - base `1f761bc8db` `runtime-memory-event-payload.ts:36-40` (`extractTimestamp`: payload `ts`/`timestamp`/`createdAt`/`created_at`) and `external-runtime-memory-writer.ts:14` (`Date.now()` fallback);
  - current `runtime-memory-event-payload.ts:26-29` (`extractEventTime` from `occurredAt`, D-3, to be reverted);
  - runtime converters setting payload times (`claude-session.ts:240,522` `nowTimestampSeconds()`, `claude-system-instruction-capture.ts:25`): node-local only;
  - web `segmentHandler.ts:255-270` (`findOrCreateAIMessage` opens a new AI message when the last row is a user row);
  - `raw-trace-record-normalizer.ts:115-133` (reload sort by `ts`, then turn, then `seq`).
- Current-State Evidence Basis (round 3): `agent-run-command-observer-dispatch.ts:15-40` (`forwardedAt: new Date()` when the observers are notified), `agent-run-input-admission-state.ts:24,120,372` (`acceptedAt` set at `admit`, sent as `accepted_at`), `runtime-memory-event-accumulator.ts:75-87`, `rg forwardedAt` over `src` (one reader: the accumulator).
- Current-State Evidence Basis (round 2): branch head `b45ef33694`. Additionally opened: `autobyteus-team-stream-contracts/src/team-agent-message-dtos.ts:10-60` (every Team member payload is the shared `agentPresentationPayloadSchemas.<TYPE>` extended with `change_sequence`/`agent_run_id`, and the content batch items extend `SEGMENT_CONTENT`), web `handlers/compactionActivityProjection.ts:190-220` (`now ?? provider_timestamp ?? new Date()`), `handlers/userMessageProjection.ts:134-150` (`applyPendingUserMessage` keeps `existing.timestamp`), `protocol/messageParser.ts` (no user echo on `/ws/agent`).
- Round 1 basis: branch `codex/conversation-order-628`, documents at `fe77389ced`; D-1/D-2 built at `d67b58c740`, `1c6f493625`, `2bb11e0874` (not yet handed off). Opened:
  - server `services/agent-streaming/agent-run-event-message-mapper.ts:1-40`, `team-agent-event-websocket-projector.ts:1-40`, `agent-team-execution/services/team-run-agent-access.ts:30-75`, `agent-org-execution/container/live-agent-org-container.ts:158`, `collaboration-agent-presentation-event-adapter.ts:24`;
  - `agent-execution/events/dispatch-processed-agent-run-events.ts`; `agent-execution/domain/agent-run.ts:216-230,336-358,522-545`; `agent-run-input-preface-dispatch.ts:60-105`;
  - `agent-memory/services/runtime-memory-event-accumulator.ts:60-100`;
  - contract packages: `autobyteus-agent-presentation-contracts/src/agent-presentation-message-dtos.ts:144-154`, `autobyteus-team-stream-contracts/src/team-agent-message-dtos.ts:17-73`, `autobyteus-collaboration-stream-contracts/src/agent-org-execution-dtos.ts:102`;
  - web `services/agentStreaming/teamStreamDtoAdapters.ts:46-60`, `agentStreamMessageProjector.ts:1-40,214`, `AgentStreamingService.ts:292,328,435`.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: D-3 adds a server time to the live stream contract across the server, the contract packages and the web, and changes the external runtimes' stored trace `ts` source. Contract `dist/` is a build input (rule 12).
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None. The real number of stream shapes is larger than the design states (AR-001), which strengthens the classification.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed` (round 2: D-3's boundaries and stamp point match the code; the requirements text is aligned with REQ-004. Round 1: D-3's boundary claims were contradicted, AR-001.)
- Approved requirements / intended behavior understood: Yes.
  - REQ-001…003: order independent of any clock; a preface notice after its message; compactions never reorder messages.
  - REQ-004 (the user's rule): every row's time is the server's; the app never stamps one.
- Relevant existing behavior and evidence confirmed: Yes for D-1 and D-2 (Reproduced; the SR-003 correction stands).
- Scope guardrail: aligned with REQ-004 at SR-005 (Out of Scope: a run's times are its own node's; AR-002 resolved).
- Every prospective blocking `Design Impact` finding is traceable: `Yes` (round 1 AR-001, AR-002; round 2: no blocking finding).
- Statements about existing code the design relies on:
  - Round 2 (SR-005):
    - **Three boundaries.** The Team member DTOs extend the shared per-type payload schemas (`team-agent-message-dtos.ts:17-48`), and their content batch items extend `SEGMENT_CONTENT` (`:59`), so `payload.occurred_at` on the shared schemas reaches the Team and Org shapes with one definition. `/ws/agent` gets it from its own mapper and parser, as designed. True.
    - **One stamp point.** SR-005 names an AgentRun method through which all four deliveries pass: the processed pipeline, `broadcastUnpublishedInputState`, `dispatchCanonicalStatus` and the subscribe snapshot. It does not re-stamp an event that is already stamped. That covers every delivery found in round 1.
    - **The field only on timed messages,** each with its web reader. This meets Principle 17's "a field with a reader".
    - **A standalone own send.** `/ws/agent` has no user echo (`messageParser.ts`), so a standalone own send gets its server time only from the input state's `accepted_at`. Today `applyPendingUserMessage` keeps the existing message's `timestamp` (`userMessageProjection.ts:146`), which would keep `null`. The walk needs that merge to take `accepted_at` when the existing time is `null`. See N-1.
    - **Compaction time.** The live compaction time today is `now ?? provider_timestamp ?? new Date()` (`compactionActivityProjection.ts:198`). With `occurred_at` required on `COMPACTION_STATUS`, the node's time must come first and be the row's time; a provider's own timestamp is not the node's clock. See N-2.
  - Round 1: **"`AgentPresentationMessage` … embedded unchanged in the agent, Team and Org/collaboration streams" — false for two of the three.**
    - Only the Org/collaboration contract embeds `agentPresentationMessageSchema` (`agent-org-execution-dtos.ts:102`).
    - The standalone agent stream `/ws/agent` maps `AgentRunEvent` to its own `ServerMessage` with `AgentRunEventMessageMapper` (`agent-run-event-message-mapper.ts`). That covers standalone and delegated agent runs, the stream's snapshot turn frames, and the peer-run relay, which speaks the `/ws/agent` protocol.
    - The Team stream `/ws/agent-team` sends its own strict DTOs (`team-agent-message-dtos.ts:17-73`, `.strict()`), projected by `team-agent-event-websocket-projector.ts`, not through `projectAgentPresentationMessage`. `teamMemberPresentationOf` (`team-run-agent-access.ts:37-39`) feeds the run-agent access and Org views, not the Team stream.
    - The founder's own run was a Team member (investigation notes).
  - **"`dispatchProcessedAgentRunEvents`, the one path every runtime's events take" — false.** `AgentRun` also delivers events to its listeners directly:
    - `AGENT_INPUT_STATE` on subscribe and on every input change (`agent-run.ts:222-226`, `broadcastUnpublishedInputState` `:524-529`);
    - the canonical `AGENT_STATUS` (`dispatchCanonicalStatus`, `:531-545`).
    A stamp placed only in `dispatchProcessedAgentRunEvents` leaves these without `occurredAt`, while D-3 makes the field required on every presentation variant.
  - Native preface rule (SR-002), the reload `ts` sort (SR-003) and the window's mixed-clock sort: true, as recorded.
  - D-2 under D-3's recorder change. **Round 1 stated that the notice's time stays ≥ the user's (`forwardedAt`); that was wrong.** `forwardedAt` is `new Date()` taken when the forward observers are notified (`agent-run-command-observer-dispatch.ts:31`), which can be after the notice's delivery stamp. Implementation measured `n.ts < u.ts` by 1 ms (MSP-105, 3/3 after a reopen). SR-006 corrects it: the external user trace is stored at `acceptedAt`, set at admission (`agent-run-input-admission-state.ts:120`), which precedes the preface being taken for that dispatch (`postUserMessage`: `admit` → `claimNextInput` → `startInputDispatch`). So `u.ts ≤ n.ts` by construction, and rule (a) (`≤`) holds even within one millisecond.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 (order, live) | User | Pass (D-1) | Pass | Pass | Confirmed | — |
| BEH-002 (reload order) | User | Pass (D-2) | Pass | Pass | Confirmed | — |
| BEH-003 (compaction) | User | Pass (D-1 + D-3) | Pass | Pass (`COMPACTION_STATUS.occurred_at` on all three streams; N-2) | Confirmed | AR-001 resolved |
| REQ-004 / AC-006 (server time) | User | Pass | Pass (SR-005) | Pass (per-stream walks; null until confirmed; N-1) | Confirmed | AR-001 resolved |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `probes/clock-order-reproduction.spec.ts` | Pass | Pass | Pass | Pass | Pass | — |
| `follow-ups.md` FU-001 | Pass | Pass | Pass | Pass (resolved by REQ-004, not sent) | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment present | Pass | Bug fix | — |
| Root cause explicit and evidence-backed | Pass | The order was derived from mixed-clock timestamps (Reproduced); the preface order invariant was missing | — |
| Refactor decision explicit | Pass | No refactor for D-1/D-2; D-3 is a contract addition | — |
| Supported by concrete sections | Pass | — | — |

## Data Contract Verdict

| Record / Message | Each Field Has A Meaning, A Writer And A Reader? | Identities, Relationships And Lifecycle Are Explicit? | Each In-Scope Flow Walked Through It, With An Example Per Case? | Checked Against Existing Data And Real Dependencies It Relies On? | The Layers Above Follow It Without Mappings, Recomputed Facts Or Second Copies? | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| Projection entries order (D-2) and window rows (D-1) | Pass | Pass | Pass (examples per case) | Pass (SR-003 real reload path) | Pass | Pass |
| `AgentRunEvent.occurredAt` | Pass (one AgentRun stamping delivery covering all four deliveries) | Pass (one event, one time) | Pass | Pass (the deliveries found in round 1) | Pass | Pass |
| `payload.occurred_at` (`serverTimeSchema`), on the timed messages only | Pass (each type listed with its web reader) | Pass | Pass (per stream, with example frames) | Pass (Team DTOs inherit the shared schemas) | Pass (one definition) | Pass |
| `/ws/agent` `ServerMessage` (standalone, delegated, snapshot turn frames, peer-run relay) | Pass (mapper writes it; `messageParser.ts` exact keys) | Pass | Pass | Pass | Pass | Pass |
| `/ws/agent-team` member DTOs (strict) | Pass (inherited from the shared payload schemas) | Pass | Pass (the founder's case walked) | Pass | Pass | Pass |
| Own send `UserMessage.timestamp: Date \| null` and `accepted_at` on pending entries | Pass (null until confirmed; readers to be listed by type) | Pass | Pass (new run, reconnect walked) | N/A | Pass, given N-1's merge rule | Pass |
| External runtimes' trace `ts` | Superseded at SR-007: each trace keeps its write time (payload time, else `Date.now()`); only the user trace takes `acceptedAt` (SR-006) | Pass | Pass (round 4: write order, D-2 rule (a), queued message, reopen) | Pass (delivery's distinct-times suite) | Pass | Pass |

## Spine Inventory Verdict

| Spine ID | Scope | Readable? | Narrative Clear? | Facade Vs Owner? | Naming? | One Owner Per Node, In Order? | Off-Spine Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-1 (window) | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-2 (replay) | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| D-3 time spine | Primary | Pass: `runtime event -> AgentRun stamp (occurredAt) -> listeners -> {/ws/agent mapper | Team projector | presentation projector} -> payload.occurred_at -> web parser -> handler row time` | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Point Clear? | Internals Stay Internal? | Bypass Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentRun` as the one stamper | Pass | Pass | Pass (every delivery passes the stamping method) | Pass | AR-001 resolved |
| Web: never read the viewer's clock for a row | Pass (intent; the inventory of `new Date()` sites is planned) | Pass | Pass | Pass | — |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner | Allowed Clear? | Forbidden Explicit? | Coherent? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Contracts ← server, web | Pass | Pass | Pass | Pass | — |

Principle 16: `Pass` (no binding added).

## Interface Boundary Verdict

| Interface | Subject Clear? | Singular? | Identity Explicit? | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `buildRecentEventMonitorPresentation`, `buildHistoricalReplayEvents` (unchanged signatures) | Pass | Pass | Pass | Low | Pass |
| The stream frames' server time | Pass (three boundaries) | Pass | N/A | Low | Pass |

Empty indirection check: `N/A`.

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked? | Decision Sound? | New Piece Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server time source | Pass (AgentRun dispatch queue) | Pass, once every delivery is covered | N/A | Pass | — |
| Compaction placement | Pass (D-1 merge with one clock) | Pass | N/A | Pass | FU-001 resolved |

## Subsystem / Capability-Area Allocation Verdict

| Area | Allocation Clear? | Decision Sound? | Supports Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| web event monitor window; node replay; contracts; agent execution; agent memory; agent streaming (all three streams); web stream handlers | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Structure | Evaluated? | Shared File Sound? | Ownership Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| A server time per frame | Pass | Pass (`serverTimeSchema` in agent-presentation-contracts) | Pass | Pass | — |

## Shared Structure Tightness Verdict

| Structure | One Meaning Per Field? | Redundant Removed? | Overlap Controlled? | Core Vs Variant | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `occurred_at` | Pass | Pass (timed messages only) | Pass | N/A | Pass | — |

Derived consumers listed: `Pass` (round 2: the three mappers, the parsers, the handlers per timed type, fixtures; readers of a nullable `timestamp` to be listed by implementation under the type change).

Vocabulary: `Pass` (`occurred_at` beside the existing `received_at`; implementation must not add a third time word).

## File Responsibility Mapping Verdict

| File | Singular? | Matches Owner? | Re-Tightened? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| D-1 / D-2 files | Pass | Pass | N/A | Pass | — |
| D-3 changes (contracts, node, web, tests) | Pass | Pass | N/A | Pass | Listed by area with the files named in the contract tables |

## Subsystem / Folder / File Placement Verdict

| Path | Clear? | Folder Matches Owner? | Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| D-1 / D-2 | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item | Named? | Replacement Clear? | Scope Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| The window's combined sort; the `order` field if unread | Pass | Pass | Pass | Pass | — |
| The web's `new Date()` row stamps | Pass (inventory planned) | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Retention Exists? | Clean-Cut Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Frames without a server time | No (required field, same version, rule 9) | Pass | Pass | — |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Evidence Sufficient? | Choice Proportionate? | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Raw traces (order read-side; external `ts` source) | Not Affected | Pass (old traces read by the same rule; the new `ts` source is the same server clock) | Pass | N/A | Pass | — |

## Change / Refactor Safety Verdict

| Area | Realistic? | Seams Explicit? | Cleanup Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| D-1, D-2 built; D-3 after review; rule 12 named | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic | Needed? | Present? | Bad Shape? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| D-1 merge, D-2 rule | Yes | Pass | Pass | Pass | — |
| D-3 frames | Yes | Pass (one example per stream, plus the input state entry and the own send) | Pass | Pass | — |

## Material Premise Validation (Only When Needed)

None. AR-001 rests on the approved scenarios themselves (SCN-001/SCN-002, a Team member, as in the founder's run) and on cited code, not on an added premise.

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Requirements text contradicts REQ-004 | Visible outcome (shown times) ambiguous | AR-002 | Resolved (SR-005) |

## Review Decision

`Pass` (round 4)

## Findings

None open. AR-001 and AR-002 below are `Resolved` (ARCH-REV-002) and kept for traceability.

### AR-001 — D-3's data contract names one of three stream shapes and a stamp point that misses three deliveries

- Status: `Resolved` (SR-005: three boundaries, one field definition, one stamping delivery method, timed messages only, null until confirmed; verified in ARCH-REV-002)
- Type: Design Impact
- Severity: High (blocking in round 1)
- Protects: REQ-004, AC-006, REQ-003 (compaction placement with one clock), SCN-001/SCN-002 (the founder's Team-member run).
- Scope status: Within Approved Scope. Changes approved behavior: No.
- Concrete problem:
  - **Boundaries.** The design puts `occurred_at` on `AgentPresentationMessage` and says that message is embedded unchanged in the agent, Team and Org streams. Only the Org/collaboration stream embeds it.
    - `/ws/agent` (standalone, delegated, its snapshot's turn frames, the peer-run relay) sends `ServerMessage` from `AgentRunEventMessageMapper`.
    - `/ws/agent-team` sends its own strict member DTOs from `team-agent-event-websocket-projector`.
    - As designed, the Team member's and the standalone run's frames would still carry no server time. The web would have none to use, so REQ-004 fails on the founder's own run kind, and compaction rows there keep the viewer's clock (REQ-003's "one clock").
  - **Writer.** `occurredAt` is to be stamped in `dispatchProcessedAgentRunEvents`, "the one path". But `AGENT_INPUT_STATE` (`agent-run.ts:222-226,524-529`) and the canonical `AGENT_STATUS` (`:531-545`) reach the listeners directly. With the field required on every variant, those messages either fail the strict schema or need a second stamp somewhere unnamed.
  - **Fields without readers.** Requiring the field on every variant adds writers for messages whose time nothing reads (status, input state, turn lifecycle).
  - **Edge state.** The own-send placeholder ("the latest server time the conversation holds") has no value for an empty conversation (a new run's first message, New chat).
- Evidence: basis section above (file and line per claim).
- Required update: redo D-3's contract and validation per Principle 17. Say who writes the time, in what order, and per stream:
  1. **Stamp point.** One owner stamps `occurredAt` on every `AgentRunEvent` that reaches listeners. Either stamp at the single delivery helper (`dispatchRuntimeEvent`), or stamp on `finalEvents` and in the three direct deliveries. State which, so derived pipeline events and direct deliveries are all covered.
  2. **Which messages carry it.** List the messages whose time a reader uses: those that create or time a row (segment start/content/end, system task notice, tool lifecycle, compaction, member input/echo, error rows, if timed). Make the field required there. Leave it off messages with no reader, or name their reader.
  3. **Every boundary that carries those messages, each with its field, writer and web reader, and one example frame:**
     - `/ws/agent` `ServerMessage`: the mapper, the sequence's numbered frames and snapshot `turn_frames`, and the stored snapshot. The web reader is `AgentStreamingService` → `dispatchAgentStreamMessage`.
     - The peer-run relay: same protocol; say whether the remote node's time passes through unchanged.
     - `/ws/agent-team` member DTOs: the strict schemas in `autobyteus-team-stream-contracts`. The web reader is the Team stream service and `teamStreamDtoAdapters`.
     - Org/collaboration `AgentPresentationMessage`: as designed. The web reader is `agentOrgExecutionContext` → `toAgentPresentationProjectionMessage`.
     Decide whether the three shapes share one field definition (for example a schema fragment in `agent-presentation-contracts` that the team DTOs extend) so there is one meaning and one validator.
  4. **Placeholder.** Define the own-send placeholder when the conversation holds no server time. One option: the row has no time until the echo, if the window can place it without one. Walk SCN-001 for a new run.
  5. **Re-walk and re-check.** Walk SCN-001…004 per stream (standalone, Team member, Org member, peer run), with an example frame each. Replace the `rg projectAgentPresentationMessage` check with a list of the stream projectors and mappers.
  Then update the derived consumers and the file mapping (all three server projectors, the two contract packages, the web readers).
- Why proportionate: it is the same design (one server stamp, the app only shows it), made true for every stream the app reads. No new behavior.
- Recommended recipient: Solution Designer.

### AR-002 — The approved requirements still state the pre-SR-004 scope

- Status: `Resolved` (SR-005 text alignment; two leftover FU-001 mentions in the design spec, N-3)
- Type: Requirement Gap (an internal contradiction in the approved basis; no new decision is needed, because REQ-004 is the user's rule and governs)
- Severity: Medium (blocking until corrected)
- Protects: REQ-004, AC-006 (what the user sees: the rows' times).
- Concrete problem: the approved text contradicts REQ-004 in several places.
  - `requirements-doc.md`:
    - "Exact approved baseline: this document at SR-001";
    - Out of Scope: "The shown message times: they stay as they are. A viewer whose clock is wrong shows its own times; only the order is fixed." Under REQ-004 an agent message shows the server's time;
    - Non-Goals: "Making timestamps from different devices comparable";
    - BEH-003 Desired: still says a clock difference can misplace a compaction row (FU-001);
    - Traceability omits REQ-004 and AC-006.
  - `design-spec.md`:
    - "Approved requirements … at SR-001";
    - D-1's "Deliberately left alone: compaction placement by time (FU-001); the shown times".
  - Taken as written, the package says both that the shown times change and that they do not.
- Required update: align these lines with REQ-004 and the SR-004 approval, without a new decision. The shown times become the server's times, shown in the viewer's time zone. Clock synchronization between devices stays out of scope.
- Recommended recipient: Solution Designer.

## Classification

N/A (Pass). Round 1: `Design Impact` (AR-001) and `Requirement Gap` (AR-002), both resolved.

## Recommended Recipient

Implementation Engineer (`/implementation_engineer`); informational pass notice to the Solution Designer.

## Residual Risks

- Round 4 (SR-007), verified:
  - **The finding is real.** A trace built from several events (a reasoning trace from its first segment event, a tool call written at its result) took one event's `occurredAt`. The reload sorts by `ts` (`raw-trace-record-normalizer.ts:121-130`), so the stored order stopped being the write order. Delivery's distinct-times run shows it: 7 of 25 tests fail.
  - **Reverting to the write time is the right cut.** REQ-004 is about the app never using its own clock. Stored write times and live `occurred_at` are both the node's, ms apart, and the payload times that the converters set are node-local (`nowTimestampSeconds`).
  - **D-2 rule (a)** holds: the notice is written after the dispatch that follows admission, so `u.ts` (`acceptedAt`) < `n.ts`.
  - **A user message queued during a running turn** is stored at admission, so a reopen places it inside that turn's traces by time. Live shows the same split: the own send is appended at send, and later segments open a new AI message after a user row (`segmentHandler.ts:255-270`). Reload and live agree, as SR-007 states.
  - Finding 1 (the contract fixtures and the contract suites in TESTING.md) is a Local Fix with no design effect.
- N-6 (round 4, non-blocking): the stored time again reads the payload's `ts`/`timestamp`/`createdAt`/`created_at` before the write time. All current producers set node-local values. A future runtime that passes a provider's own time in those keys would bring a second clock back into the reload order. A one-line comment at `extractTimestamp` stating "node-local times only" would keep that visible.

- Round 3 (SR-006), non-blocking:
  - N-4: after the change, `rg forwardedAt` over `autobyteus-server-ts/src` finds only the accumulator as a reader. Remove `AgentRunUserMessageForwardedPayload.forwardedAt` and its `new Date()` (Principle 7), unless implementation finds another reader (tests are not readers, rule 11).
  - N-5: D-2's text says an own-turn notice "is followed, if at all, by a user message received later, so it is not moved". With `ts = acceptedAt`, a message admitted earlier (queued during a previous turn) and appended into a notice's turn would be moved before that notice. That matches live order, since the user's own send and a non-sender's echo show at admission, so the outcome is right (REQ-001/REQ-002). Update the sentence so it says so, and add that case to the D-2 test if it is reachable on a runtime that appends (Claude, Codex).

- N-1 (round 2, implementation precision, REQ-004 / AC-006): on `/ws/agent` the own send's only server time is the pending entry's `accepted_at`, because there is no user echo on that stream. `applyPendingUserMessage` keeps `existing.timestamp` (`userMessageProjection.ts:146`). Make it take the entry's `accepted_at` when the existing time is `null`, or the standalone own send stays `null` until a reload. Cover it in the AC-006 spec (standalone SCN-001).
- N-2 (round 2, implementation precision, REQ-003/REQ-004): the live compaction row time today is `now ?? provider_timestamp ?? new Date()` (`compactionActivityProjection.ts:198`). With `COMPACTION_STATUS.occurred_at` required, use it as the row's time. A provider's own timestamp is not the node's clock, so do not prefer it. The design's "the provider time it uses today … the server's time first" should read as: `occurred_at` always.
- N-3 (round 2, editorial): `design-spec.md` still says "Follow-ups: FU-001" (`:76`) and "mixed clocks: FU-001" (`:152`, `:253`) in the D-1/D-2 text. FU-001 is resolved by REQ-004; delivery's docs sync can drop them.

- D-1 and D-2 are sound as designed and built; implementation may hand them off with D-3 once it passes, as planned.
- The user row's stored time (`forwardedAt`) and its live time (`received_at`) are both the server's but differ by the dispatch delay. That is acceptable under REQ-004, but the contract's "stored = live" invariant should say it applies to agent events, not user rows.
- Rule 12 (contract `dist/` for two or three packages): fresh-start build and build-only release run, as the design names.

## Latest Authoritative Result

- Review Decision: `Pass` (round 4, SR-007)
- Round 4 notes: SR-007 returns the memory recorder to each trace's write time and keeps only the user trace at `acceptedAt` (SR-006). Stored order is write order again, D-2 rule (a) holds by construction, REQ-004 holds (all server times), and reload equals live for a queued message. N-6 is non-blocking. Round 3 (SR-006) also passed.
- Round 3 decision: `Pass` (SR-006)
- Round 3 notes: SR-006 stores the external user trace at its admission time (`acceptedAt`, the same value as D-3's `accepted_at`). It needs no new stored field, keeps D-2 rule (a) true by construction, and leaves native, old traces and live unchanged. The rejected tolerance window and preface link were rightly rejected. It also corrects my round-1 basis statement (above). N-4 and N-5 are non-blocking.
- Round 2 decision: `Pass`
- Material-Premise Gate: `Pass` (no added premise)
- Notes: D-3's contract now matches the code. There are three stream boundaries with one shared field definition (the Team DTOs inherit it), one AgentRun stamping delivery method, the field only on timed messages with their readers, `accepted_at` on pending entries, and an own send that is `null` until confirmed, walked per stream. D-1 and D-2 passed in round 1. N-1 and N-2 are precision notes for implementation; N-3 is editorial. Classification Large / High; rule 12 applies.

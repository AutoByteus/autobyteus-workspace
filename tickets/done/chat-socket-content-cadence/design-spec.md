# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-002` (revised for ARCH-REV-001: AR-001, AR-002, AR-003)
- Approved requirements baseline: `requirements-doc.md` SR-002, approved by Solution Designer within the direction (DEC-004 of PB-001 under the user's delegation; user informed 2026-10-18). SR-002 adds AC-009, a verification criterion for the already approved parallel case of SCN-002.
- Behavior-defining supplements: None
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-socket-content-cadence/tickets/in-progress/chat-socket-content-cadence/investigation-notes.md`
- Authorities read (2026-10-18): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md`, `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md`, `autobyteus-server-ts/docs/modules/agent_streaming.md`; `design-examples.md` not used
- Project design-principle conflicts or discrepancies: The two streaming docs are stale (FU-003, fixed here). No conflict.

## Current-State Read

Each collaboration root (Org, standalone-with-delegates, Team) owns one synchronous `RootEventPublisher`. It numbers every root event (`changeSequence`) and provides the snapshot barrier. Socket handlers subscribe through the barrier and send each event as one frame:
- Org and collaboration send `ROOT_EXECUTION_EVENT` envelopes directly with `connection.send`.
- Team sends through the shared `AgentStreamWebSocketEgress`, but its content shape (`segment_id`, per-frame `change_sequence`) is never coalescible.

Clients require gap-free sequences from the snapshot base. The canonical pipeline emits a "running" status before every delta, and each status is a sequenced root event too. Applications, the Team lifecycle observer and manager inspections read the same root events and must stay unthrottled.

Evidence: investigation notes › Source Log, Runtime findings (validity probe: Team/Org/collab 30 deltas → 30 frames).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale and supporting evidence: three subsystems change together:
  - server egress (new sequenced scheduler and two stream shapes) and two socket handlers, plus Team wiring;
  - two contract packages (`collaboration-stream-contracts`, `team-stream-contracts`);
  - three web stream contexts (Org, collaboration, Team view state);
  - plus docs and per-socket tests.
- Architectural risk: `High`
- Risk rationale and supporting evidence:
  - wire-contract change (covered sequence range) on three streams;
  - ordering/sequence invariants that every client enforces;
  - new per-connection timers on two sockets that had none;
  - remote-node version skew (RSK-003).
- Escalation trigger: any need to change root sequencing, the snapshot barrier or inspection bases; any client that cannot accept a range; live evidence that statuses differ between deltas (UNK-001) so absorption does not apply → return `Design Impact`.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Validity probe | `evidence/validity-probe.log` | 3 of 4 sockets send per delta | Fix needed on 3 sockets | — |
| Client sequence checks | web contexts (notes) | Gap → reopen | Covered range, never skip | — |
| Root subscribers | notes Source Log | Applications read root events | Cadence must be after the publisher, per connection | — |
| Status transformer | `lifecycle-status-event-transformer.ts` L50-52 | Status before every delta | Absorb identical repeats | UNK-001 (live) |

## Intended Change

Give Org, collaboration and Team sockets the same per-connection egress as `/ws/agent`, in a **sequenced mode** built around one **content batch** per window (revised in SR-002 for AR-001):
- While a window is open, consecutive content events of *any* agents and segments are collected into one pending batch. The batch holds one ordered aggregate per content identity (root, agent run, turn, segment, segment type), so parallel agents coalesce together.
- Identical repeated status companions (AR-003 baseline below) arriving while a batch is pending are absorbed.
- When the window ends or any other sequenced event arrives, the batch is sent as **one batch frame** covering the contiguous root-sequence range `[first, through]` of everything it absorbed. Then the boundary event follows.
- No sequenced message ever overtakes the pending batch.

Clients accept a batch frame when `first === next`, apply its items in order and advance to `through + 1`. The domain stream, snapshot barrier and inspection bases are untouched.

## Change Scope (Mandatory)

- In scope: UC-001..UC-004.
  - Server: `websocket-egress` (sequenced scheduler, stream shapes, composition, egress option); `agent-org-stream-handler.ts`; `agent-collaboration-stream-handler.ts`; `agent-team-stream-handler.ts` wiring.
  - Contracts: covered-range field.
  - Web: three contexts.
  - Docs: the two streaming docs.
  - Tests: per socket, contracts, web contexts.
- Deliberately left alone:
  - `RootEventPublisher`, root event production, snapshot/inspection (REQ-005, BEH-005);
  - the `/ws/agent` unsequenced scheduler and `AgentRun` (PB-001);
  - the cadence setting;
  - client renderers.
- Follow-ups: None new. autobyteus-140 remains separate.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-002..004 | User | REQ-001, REQ-002 / AC-001, AC-003, AC-007 | Member/child streams | Per-delta frames | Coalesced per window | DS-001 |
| BEH-005 | Contract | REQ-003 / AC-002 | Gap-free sequences | Strict next = seq + 1 | Range-aware, still gap-free | DS-001, DS-002 |
| BEH-006 | System | REQ-005 / AC-005 | Root subscribers | Unthrottled | Preserved (egress is per socket) | — |
| BEH-007 | System | REQ-004 / AC-004 | Boundaries | Flush first | Preserved; stricter in sequenced mode | DS-001 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `evidence/validity-probe.*` | Validity | REQ-001 | Baseline and starting point for the per-socket tests | Evidence only |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix` (regression of an approved performance requirement), with a contract extension
- Current design issue found: `Yes`
- Structural triggers:
  - **Repeated coordination**: three socket handlers own "send" separately, and only some use the shared egress. One shared send path is needed.
  - **Capability-area reuse**: the egress subsystem already exists, so it is extended rather than copied into handlers.
- Root cause classification: `Duplicated Policy Or Coordination`. The cadence policy is attached per handler by hand, so new sockets (Org, collaboration) skipped it. A contract change (strict sequences) also made the existing coalescer inapplicable to Team.
- Refactor needed now: `Yes`. All chat sockets send through `AgentStreamWebSocketEgress`; handlers stop calling `connection.send` for stream messages.
- Evidence: notes (handlers L49-101 / L69-106; team schema).
- Design response: see Intended Change.
- Refactor rationale: a fourth or fifth socket must not be able to skip the cadence again.
- Intentional deferrals: None.

## Terminology

- *Sequenced stream*: a socket whose frames carry root `change_sequence` (Team, Org, collaboration).
- *Batch frame*: the only coalesced content frame on sequenced streams. It covers the contiguous range `[change_sequence, change_sequence_through]` and carries ordered per-identity text items. It stands for every root event in that range, including absorbed identical statuses.

## Legacy Removal Policy (Mandatory)

- Obsolete paths: direct `connection.send` of stream messages in the Org and collaboration handlers (replaced by the egress). On Team, the unsequenced default composition (its coalescer and status filter are inert there) is replaced by the sequenced composition.
- Compatibility wrappers kept: `None`. Ordinary frames keep their single-sequence meaning; `change_sequence_through` exists only on batch frames. No dual representation of coalesced content.

## Persisted Data / State Transition Decision

- Decision: `Not Affected`. Streams and sequences are in memory.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-002..007 | Member AgentRun delta | Client context applies coalesced frame | Root publisher (order) → per-socket egress (cadence) → client context (sequence check) | The broken path |
| DS-002 | Bounded Local | BEH-005 | Sequenced scheduler accept | Forward/flush | `SequencedContentCadenceScheduler` | Range and overtaking rules |

## Primary Execution Spine(s)

- DS-001: `Member AgentRun -> collaboration presentation adapter -> Root (Org / standalone root / Team) -> RootEventPublisher (sequence n) -> snapshot barrier -> socket handler -> AgentStreamWebSocketEgress (sequenced composition) -> socket -> web context (range check) -> agent conversation store`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Root events keep their numbers. Each socket's egress holds text of one agent/segment for the window, absorbs identical "running" repeats, and sends one frame covering all absorbed numbers. The client checks that the frame starts at the next expected number and continues after its end. | Root, publisher, egress, client context | Publisher (order), egress (cadence), client (acceptance) | Stream shapes (read/merge per wire format) |
| DS-002 | `accept(m)`, in order:<br>(1) unsequenced safe companion (`CONNECTED`, `AGENT_COMMAND_ACK`) → forward without flush.<br>(2) sequenced message whose sequence ≠ `through + 1` while a batch is pending → flush, then handle as new.<br>(3) content (any identity) → add to the pending batch: append to that identity's aggregate or create a new aggregate at the end; set `through`; open the window timer if none.<br>(4) status that is an identical repeat (AR-003) while a batch is pending → absorb (set `through`, record it as that agent's last status).<br>(5) anything else → flush the batch (one batch frame), then forward.<br>The timer fires → flush. A flush with no pending batch is a no-op. | Scheduler | Scheduler | Shape adapter |

## Spine Actors / Main-Line Nodes

Member AgentRun; root (Org / standalone root / Team); `RootEventPublisher`; socket handler; `AgentStreamWebSocketEgress`; web stream context.

## Ownership Map

- `RootEventPublisher`: order and barrier (unchanged).
- Socket handlers: session lifecycle and command handling. Stream sends go only through their egress.
- `AgentStreamWebSocketEgress`: per-connection filters, scheduler and dispose (extended with an injectable composition).
- `SequencedContentCadenceScheduler` (new): window, range, absorption and no-overtaking rules.
- Stream shapes (new, two): wire-format knowledge (read sequence, content identity, status identity; build the coalesced frame).
- Web contexts: gap check with range.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `AgentStreamWebSocketEgress` | Composition (filters + scheduler) | One send path per socket | Wire-format parsing (belongs to shapes) |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| Direct `connection.send(serialize(...))` of stream messages in Org and collaboration handlers | Bypasses cadence | Egress per session | In This Change | Close codes and error-then-close stay with the handler, sent via the egress then closed |
| Team socket's default (unsequenced) composition | Inert and unsafe if "fixed" (it would let token usage overtake) | Sequenced composition | In This Change | — |
| `AgentTeamStreamHandler.convertTeamEvent` (L230) | Dead: no caller in `src` or `tests` (grep 2026-10-18; AR-002) | — | In This Change | — |
| `AgentTeamStreamHandler.getTeamRun` (private, L236) | Dead: no caller (the `getTeamRun` in `agent-team-websocket.integration.test.js` L81 is a fake service method, not this one; AR-002) | — | In This Change | — |
| Plain `SEGMENT_CONTENT` on the three sequenced stream contracts and their client branches | Sequenced sockets now send content only as batch frames | Batch frame | In This Change, **if** implementation confirms no other producer sends plain `SEGMENT_CONTENT` on those streams; otherwise keep it and record the producer | Evidence-gated: no dead branch left, no live branch removed |

## Return Or Event Spine(s) (If Applicable)

DS-001 is the event spine.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `SequencedContentCadenceScheduler`. `accept -> classify(shape) -> append | absorb | forward-unsequenced | flush+forward | flush+startGroup -> timer -> flush(emit frame with [first..through])`. It matters because every invariant of REQ-003/REQ-004 lives here.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Team stream shape | DS-002 | Scheduler | Read/merge Team agent messages (`change_sequence`, `agent_run_id`, `segment_id`) | Wire knowledge | The scheduler would learn every DTO |
| Root execution event shape | DS-002 | Scheduler | Read/merge `ROOT_EXECUTION_EVENT` envelopes (Org, agent) | Same | Same |

## Ownership Boundaries

Handlers depend on the egress, never on the scheduler or shapes directly. The scheduler depends on a shape interface, never on concrete DTO modules. Contracts own the range field and its validation.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AgentStreamWebSocketEgress` | scheduler, filters, shapes | 4 socket handlers | Handler calling `connection.send` for a stream message | Add an egress option, not a bypass |

## Dependency Rules

- Allowed: handler → egress → composition → scheduler → shape interface; shapes → contract types.
- Forbidden:
  - egress/scheduler → root publisher;
  - any cadence before `RootEventPublisher`;
  - per-socket suppression of a sequenced message without covering its number.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `SequencedStreamShape<M>` | one wire format | `sequenceOf(m): number \| null`; `contentItemOf(m): { identityKey, item } \| null`; `statusOf(m): { agentRunId, comparable } \| null` (comparable = status payload without sequence/envelope fields); `buildBatch(first, through, items): M` | message | Two implementations |
| `createSequencedStreamEgressComposition(shape, options)` | composition | Sequenced scheduler; no status-transition filter | — | Next to the default composition |
| Contract, root envelope (`collaboration-stream-contracts`) | content batch | New event kind `agent_presentation_batch` with `items: [{ member_address, agent_run_id, message: SEGMENT_CONTENT }]` (≥ 1). Envelope `change_sequence` = first; new `change_sequence_through` (≥ first), **required for and only allowed with** the batch kind | — | For the `agent_org` and `agent` envelope variants |
| Contract, Team (`team-stream-contracts`) | content batch | New server message `SEGMENT_CONTENT_BATCH` with payload `{ change_sequence, change_sequence_through, items: [{ agent_run_id, segment_id, turn_id, segment_type, delta }] }` (≥ 1 item) | — | — |
| Web context `applyEvent` / Team `applyMessage` | gap check + batch | Ordinary frame: unchanged (`seq === next`). Batch: accept if `first === next`; dispatch each item as that agent's `SEGMENT_CONTENT`, in item order; `next = through + 1` | — | 3 contexts; one shared range helper |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `SequencedStreamShape` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Scheduler | `SequencedContentCadenceScheduler` | Yes | Low | — |
| Shapes | `teamStreamSequencedShape`, `rootExecutionEventSequencedShape` | Yes | Low | — |
| Field | `change_sequence_through` | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Per-connection cadence | `websocket-egress` | Extend | Same regulator for every socket | — |
| Window timer and interval reading | existing scheduler, `resolveStreamingContentFlushIntervalMs` | Reuse | One setting | — |
| Delta concatenation | `stream-content-coalescing.ts` | Reuse where it fits | — | — |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| server `services/agent-streaming/websocket-egress` | cadence, shapes | DS-001/002 | handlers | Extend | — |
| server stream handlers | sessions | DS-001 | — | Modify | — |
| contracts (2 packages) | range field | DS-001 | clients | Modify | — |
| web stream contexts | gap check | DS-001 | stores | Modify | — |

## Draft File Responsibility Mapping

See Final.

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Range acceptance (`first === next`, advance to through) | one small web helper used by 3 contexts | web `services/` stream area | Same rule in 3 places | Yes | Yes | A stream framework |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Batch frame (`change_sequence` first + `change_sequence_through` last + `items`) | Yes | Yes | Low: one representation of coalesced content on sequenced streams | Validate `through ≥ first`, ≥ 1 item, `through` only on batch frames |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `websocket-egress/sequenced-content-cadence-scheduler.ts` (Add) | egress | scheduler | Sequenced rules (DS-002) | One owner | Interval reader |
| `websocket-egress/sequenced-stream-shape.ts` (Add) | egress | interface | Shape contract | — | — |
| `websocket-egress/team-stream-sequenced-shape.ts` (Add) | egress | shape | Team wire format | — | contracts |
| `websocket-egress/root-execution-event-sequenced-shape.ts` (Add) | egress | shape | Envelope wire format | — | contracts |
| `websocket-egress/agent-stream-egress-control-composition.ts` (Modify) | egress | composition | Add sequenced composition | — | — |
| `websocket-egress/agent-stream-websocket-egress.ts` (Modify) | egress | facade | Accept an injected composition | — | — |
| `agent-org-stream-handler.ts`, `agent-collaboration-stream-handler.ts` (Modify) | handlers | session | Per-session egress; dispose on disconnect; flush before lifecycle close | — | — |
| `agent-team-stream-handler.ts` (Modify) | handler | session | Use the sequenced composition | — | — |
| `autobyteus-collaboration-stream-contracts/src/root-execution-view-dtos.ts` and the Org/agent event DTO files (Modify) | contracts | DTO | `agent_presentation_batch` event kind; envelope `change_sequence_through` only with it | — | — |
| `autobyteus-team-stream-contracts/src/team-agent-message-dtos.ts`, `team-stream-server-message.ts` (Modify) | contracts | DTO | `SEGMENT_CONTENT_BATCH` message | — | — |
| web `agentOrgExecutionContext.ts`, `agentRunCollaborationContext.ts`, `teamExecution/teamExecutionViewState.ts` (+ callers passing the range) (Modify) | web | contexts | Range-aware gap check; apply batch items per agent | — | range helper |
| `docs/design/agent_websocket_streaming_protocol.md`, `docs/modules/agent_streaming.md` (Modify) | docs | — | 4 sockets; sequenced cadence; range | — | — |

## Applied Patterns (If Any)

- Strategy: the stream shape is selected per socket, with one scheduler owner.

## Target Subsystem / Folder / File Mapping

As in Final File Responsibility Mapping. All new server files go in the existing `websocket-egress/` folder, which already owns cadence; a subfolder is not needed for four files.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `websocket-egress/` | Off-Spine Concern | Yes | Low | Existing home |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Range (one agent) | Root events 11 status A(running), 12 content A "a", 13 status A(running, identical), 14 content A "b", 15 SEGMENT_END A → frames: `status seq 11`; `batch seq 12 through 14 items [A "ab"]` (at window end or when 15 arrives); `segment_end seq 15` | Sending `content seq 14 "ab"` (the client sees a gap at 12-13); suppressing 13 (gap) | REQ-003 |
| Interleaved agents (AR-001) | 21 content A "x", 22 status B(running, identical to B's last), 23 content B "1", 24 content A "y", 25 status A(identical), 26 content B "2" → after the window: `batch seq 21 through 26 items [A "xy", B "12"]` | One frame per delta because B's content "breaks" A's group (SR-001's single-group rule) | Parallel members are the common Org/Team case |
| Cross-identity order | Inside one batch, deltas of different identities are regrouped by identity (A's in order, then B's in order; items ordered by first appearance). Nothing crosses a non-absorbed sequenced event, because every such event closes the batch first. Different identities have independent segment state on the client, so regrouping inside a window has no observable ordering meaning. | Interleaving deltas across agents in one aggregate | States the only reordering allowed |
| Status baseline (AR-003) | "Identical repeat" = the status payload (without sequence/envelope fields) equals the **last status this connection forwarded or absorbed for the same agent run**. No snapshot seeding: with no baseline it is not a repeat → boundary (at most one extra flush per agent per connection). Absorption is allowed for any agent run while a batch is pending, because the batch covers the whole range. With no pending batch, statuses are forwarded unchanged. | Comparing against the root's state or snapshot | Deterministic, connection-local |
| Overtaking | Pending content 12..14; `TOKEN_USAGE_UPDATED seq 15` → flush 12..14, then 15 | Forwarding 15 before the pending content (the `/ws/agent` rule) | Out-of-order sequence |
| Placement | Egress per socket after the barrier | Cadence in front of `RootEventPublisher` | Applications would be delayed |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Client tolerating gaps for old servers / server sending per-delta to old clients | Remote-node skew | Rejected | Strict DTOs already reject skew; ship together |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Contracts: range field + schema tests.
2. Web: range helper + three contexts + unit tests (gap still rejected; range accepted).
3. Server: shape interface, two shapes, sequenced scheduler (unit tests for DS-002 rules), composition, egress option.
4. Handlers: Team composition switch; Org and collaboration per-session egress (dispose on disconnect, flush before lifecycle close).
5. Per-socket cadence integration cases (AC-001..AC-004), plus one **interleaved two-agent case per socket** (AC-009: deltas and identical statuses of A and B interleaved → one batch frame `[A text, B text]` covering the whole range; a boundary from either agent closes it first); application/observer unthrottled assertion (AC-005).
6. Docs.
7. Downstream: live traces and the isolated-app check with a Team, an Org and a delegated agent (AC-007).

## Key Tradeoffs

- A contract change versus a second sequence space: the contract change is one new frame kind per stream; a second sequence space would touch hydration/inspection alignment.
- One batch per window for all identities versus one group per identity: per-identity groups cannot each cover a contiguous range when identities interleave (AR-001); one batch with per-identity items can.
- Per-socket timers: three more per-connection timers; bounded by session lifetime and disposed on disconnect.

## Risks

- UNK-001: if live statuses between deltas are not identical, absorption does not apply and batches split. The review confirmed in code that the payload `{status, recoverableBlock, agent_id}` carries no timestamp, so repeats are identical. A live trace is still needed; escalate if it contradicts this.
- Batch size: bounded by one window (≤ 2,000 ms at the setting's maximum) and closed by any boundary.
- RSK-003: remote-node skew. Mention it in the release notes of the beta that ships this.
- Snapshot ordering: the snapshot and `CONNECTED` frames must leave through the same egress before any event, which holds because the scheduler is empty at connect.

## Guidance For Implementation

- Keep `RootEventPublisher` and root event production untouched.
- Unsequenced companions (`CONNECTED`, `AGENT_COMMAND_ACK`) may still pass without a flush; every sequenced frame flushes first.
- `ERROR` then close: send through the egress (this flushes), then close.
- Do not change the `/ws/agent` scheduler or the PB-001 tests.

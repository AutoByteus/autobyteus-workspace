# Design Spec

## Solution And Approval Basis

- Current solution revision ID: SR-005 (SR-002: D-2 covers native; SR-003: evidence; SR-004: D-3, the founder's time rule; SR-005: D-3 revised after ARCH-REV-001)
- Approved requirements: `requirements-doc.md` at SR-005. SR-001…003: Solution Designer within the direction, user informed. SR-004's REQ-004: the user, 2026-11-23 (in their words). SR-005: the text aligned (AR-002).
- User approval of the design: Not required.
- Design status: `Ready`
- Investigation notes: `tickets/in-progress/conversation-order-628/investigation-notes.md`
- Authorities read (2026-11-23):
  - `references/architecture-design.md` (read this conversation)
  - `references/design-principles.md` (updated: Approach, Principle 17, Practical Application Guide, Structural Triggers re-read)
  - `references/design-examples.md` Case 11
  - `templates/design-spec-template.md` (updated: Data Contract section)
  - project `DESIGN.md` (rules 7, 9, 11)
  - `docs/design-cases.md` Cases 2, 3, 5
- Conflicts or discrepancies: none.

## Current-State Read

- The web's conversation window (`services/eventMonitor/recentEventMonitorWindow.ts:184-201`, `buildRecentEventMonitorPresentation`) flattens the conversation into rows, then sorts all rows by timestamp (`:200`) to interleave compaction rows.
- Live, an agent message's timestamp is the viewer's clock (`segmentHandler.ts:254-272`), while a user message echoed by the node carries the node's `received_at` (`userMessageProjection.ts:29-80`). A viewer behind the node shows the user's message after the reply (Reproduced: `probes/clock-order-reproduction.spec.ts`).
- After a reload, every timestamp is the node's, so the order is right. But it is right only because of the sort: by entry order a preface notice comes first, because it is stored first (`seq` 1, notice; `seq` 2, user).

## Task Size And Architectural Risk (Mandatory)

- Task size: SR-004 reclassifies to `Large` / `High` (D-3 below); SR-001's text follows for D-1/D-2.
- SR-001 task size: `Medium`. Two owners in two packages:
  - the web's conversation window (one function and its spec);
  - the node's replay builder (one ordering rule and its test);
  - plus one phone probe case.
- Architectural risk: `Low`.
  - No field, route or stored data changes.
  - The one boundary effect is the order of a preface notice relative to its message in the projection's entries and replay events, which the web reads in order (same-version deploy, DESIGN.md rule 9).
  - No concurrency, security or deployment surface.
- Escalation trigger: another runtime stores a preface in a shape the rule does not match; or a reader of the window's order is found that depends on timestamp order.

## Architecture Investigation Evidence

| Source | Path | Observation | Decision |
| --- | --- | --- | --- |
| Read + Reproduced | `recentEventMonitorWindow.ts:80-104,184-201`; `probes/clock-order-reproduction.spec.ts` (+ `.run.log`) | Rows sorted by mixed-clock timestamps | D-1 |
| Read | `recentEventMonitorSelection.ts:24` `selectRecentWindowCandidates`; callers `AgentConversationFeed.vue:160`, `recentEventMonitorMutationCoordinator.ts:34`, fixture `tests/e2e/fixtures/background-agent-renderer-contention.page.vue:354` | The selection takes the ordered list; three readers | D-1 consumers |
| Read | `compactionActivityProjection.ts:214`; `runProjectionActivityHydration.ts:199`; `nativeCompactionActivityReconciliation.ts:19`; `agentActivityStore.ts:190-194,354` | Four writers of a compaction's timeline time | D-1 keeps time placement for compactions (DEC-003; FU-001) |
| Read | `raw-trace-to-historical-replay-events.ts:139-200` (traces in stored order → events); `agent-run-input-preface-dispatch.ts:22-45,68-100` (the preface is one provider message, notice first; the notice event is published after forwarding); founder's traces (notes) | The notice is stored before its message; the message's `ts` (its receipt) is not later than the notice's | D-2 |
| Reproduced (temporary, removed) | the reload pipeline on the founder's shape (`/tmp/sd628/reload-projection.json`) | Entries keep stored order | D-2 |

## Intended Change

- **D-1:** messages and their segments keep the conversation's own order. Compaction rows are merged in by time, never re-sorting messages.
- **D-2:** the node's replay builder puts a preface notice right after the user message it was delivered with, so reload order equals live order.

## Change Scope (Mandatory)

- In scope: UC-001, UC-002.
  - Web: `services/eventMonitor/recentEventMonitorWindow.ts` (+ spec).
  - Node: `run-history/projection/transformers/raw-trace-to-historical-replay-events.ts` (+ test).
  - Probe: one phone case.
- Derived consumers:

  | Changed | Consumer | Decision |
  | --- | --- | --- |
  | Window row order | `AgentConversationFeed.vue` (desktop, phone) | Shows the new order; no change |
  | Window row order | `recentEventMonitorMutationCoordinator.ts:34` | Implementation checks it only compares presentations, not relying on timestamp order |
  | Window row order | `background-agent-renderer-contention.page.vue:354` (fixture) | Unchanged unless its assertions depend on sort |
  | Window row order | `recentEventMonitorWindow.spec.ts`, `recentEventMonitorPresentationWitness.spec.ts`, 585's notice-row specs | Keep passing; a case that asserted a clock-based reorder is rewritten to the approved order (rule 11) |
  | Replay event order (D-2) | `historical-replay-events-to-conversation.ts` (conversation entries) | Follows the events |
  | Replay event order (D-2) | `event-monitor-active-trace-page-projection.ts` (earlier-events page) | Follows the events, so the page shows the same order (consistent) |
  | Replay event order (D-2) | `historical-replay-events-to-activities.ts` | Unaffected (activities hold no notices or user messages) |
  | Replay event order (D-2) | the web reload builder `runProjectionConversation.ts:335-405` | Unchanged: it already keeps entry order |

- Deliberately left alone:
  - compaction placement by time is kept, now on one clock (D-3; FU-001 resolved);
  - the stored traces and their writer (old and new runs read the same way);
  - live handlers (live order is already right once the window keeps it).
- Follow-ups: FU-001.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | Kind | REQ / AC | Trigger | Existing | Change | Path |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001 / AC-001, AC-002, AC-005 | Live stream | Timestamp sort | Conversation order | DS-1 |
| BEH-002 | User | REQ-002 / AC-003 | Reload | Stored order, then sorted | Preface after its message | DS-2 |
| BEH-003 | User | REQ-003 / AC-004 | Compaction | Sorted with messages | Merged by time | DS-1 |

## Relevant Supplemental Task Artifacts

| Path | Purpose | Related | Relationship |
| --- | --- | --- | --- |
| `probes/clock-order-reproduction.spec.ts` | Failing reproduction with the real web code | AC-001 | Implementation turns it into the window's spec |

## Task Design Health Assessment (Mandatory)

- Change posture: Bug Fix.
- Current design issue found: Yes. A fact (the conversation's order) is recomputed from timestamps that do not share a clock, instead of taken from its owner (the conversation's order).
- Structural triggers that fire:
  - Derived data (Principle 11): order derived from timestamps. Response: read the conversation's order.
  - Data contract (Principle 17): the order of replay events and conversation entries changes for one case. Response: the Data Contract section below.
  - Several kinds or forms (Principle 1): the window serves desktop and phone, the sender and a non-sender viewer, live and reload. Each is walked in the validation table. D-2 serves every runtime whose stored preface has this shape; implementation checks native, Claude, Antigravity and Codex.
- Deliberate deviations: `None`.
- Root cause classification: `Local Implementation Defect` (the window's sort) plus a `Missing Invariant` (the projection's preface order).
- Refactor needed now: No. One function's ordering and one ordering rule.

## Terminology

- **Preface notice**: a platform notice the node delivered in front of a user's input, in one provider message (`agent-run-input-preface-dispatch.ts`).
- **Conversation order**: the order of the conversation's messages and of each agent message's segments, as the stream appended them, or as the projection's entries list them.

## Legacy Removal Policy (Mandatory)

- Obsolete: the timestamp sort of message rows (`recentEventMonitorWindow.ts:199-200`).
- Compatibility kept: `None`.

## Data Contract (Mandatory When The Change Stores Or Exchanges Data)

- Contract location: this section. No field is added, removed or renamed. One ordering invariant of a shape the web receives changes, and one web-internal ordering rule.

| Record / Message | Boundary | Field | Meaning | Written By | Read By |
| --- | --- | --- | --- | --- | --- |
| Run projection `conversation[]` entries and replay events | node → web (GraphQL JSON), node → earlier-events page | (order) | Conversation order. **New invariant:** a preface notice follows the user message it was delivered with | `buildHistoricalReplayEvents` (D-2) | `buildConversationFromProjection` (web), the page projection |
| Window rows (web-internal) | web store → feed | (order) | Conversation order for message rows; a compaction row sits before the first message row (in conversation order) whose time is later than its own | `buildRecentEventMonitorPresentation` (D-1) | `AgentConversationFeed.vue` |

- **Identity:** unchanged. Events keep their `eventId` from the trace's own `id` (`resolveTraceReplayIdentity`); D-2 moves an event, it does not re-identify it.
- **D-2's rule (SR-002, after implementation's Design Impact):** within one turn, a `user` trace stored immediately after a `system_task_notification` trace of the same turn comes before that notice when either:
  - (a) the user's `ts` is not later than the notice's: **external runtimes** (Claude, Codex, Antigravity, ACP).
    - One writer, `RuntimeMemoryEventAccumulator`, stores the user at `forwardedAt` (`runtime-memory-event-accumulator.ts:74-95`, `sourceEvent "AgentRun.postUserMessage"`).
    - It stores the notice from the event published at `settle`, after forwarding (`agent-run-input-preface-dispatch.ts:85-99`, `sourceEvent SYSTEM_TASK_NOTIFICATION`).
    - Their stored order can be `[n, u]` (the founder's) or `[u, n]`; only `[n, u]` moves.
    - Their own-turn notices (restart resume, background task, team change) come through the same writer with a later user, so they are not moved.
  - (b) both traces have `sourceEvent "LLMUserMessageReadyEvent"`: **native**.
    - `MemoryIngestInputProcessor` (`autobyteus-ts/src/agent/input-processor/memory-ingest-input-processor.ts:53-73`) writes a `system_task_notification` only for a preface, notice first, then the user.
    - Each write stamps its own `Date.now()` (`memory-manager.ts:437`, `raw-trace-ingestion.ts:155`), so the time condition would hold only when both writes fall in the same millisecond.
  - Writers stay unchanged: read-side only, so old and new runs read the same way.
  - Both times are the node's: the user message's receipt and the notice's write at dispatch, and dispatch follows receipt.
  - A notice that started its own turn (a restart reminder, a task notice) is followed, if at all, by a user message received later, so it is not moved.
- **Examples:**
  - Founder (stored): `[n seq1 ts .697, u seq2 ts .696, a seq3]` → events `[u, n, a]`.
  - A notice turn with a message appended later: `[n seq1 ts 10.0, u seq2 ts 12.4, a seq3]` → unchanged `[n, u, a]`.
  - Native preface: `[n src LLMUserMessageReadyEvent ts 10.000, u src LLMUserMessageReadyEvent ts 10.002, a]` → `[u, n, a]`.
  - External, already `[u ts .696, n ts .697]` → unchanged.
  - No notice: `[u seq1, a seq2]` → unchanged.
  - Window, live, viewer 1 s behind: messages `[AI prev (t 54:00), You (node 55:09.696), AI(notice, reply) (viewer 55:08.996)]` → rows `prev, You, notice, reply` (array order); today `prev, notice, reply, You`.
  - Window with a compaction (equal clocks): `[You t1, AI t2]`, compaction at t1.5 → `You, compaction, AI`, as today.

### Data Contract Validation

| Scenario | Step | Reads | Writes | Served? |
| --- | --- | --- | --- | --- |
| SCN-001 (sender, live) | Send; optimistic You pushed; notice and reply appended into a new AI message | Conversation array | Rows in array order | Yes |
| SCN-002 (non-sender, live) | Echo (`MEMBER_INPUT_MESSAGE`) pushed; notice published after forwarding, so after it | Array | Rows | Yes (the echo is published right after admission, `configured-agent-execution-handle.ts:150-161`; the notice at settle, after forwarding) |
| SCN-003 (reload) | Projection entries `[u, n, a]` → web builder `[You, AI(notice), AI(reply)]` | Entries | Rows | Yes (D-2) |
| SCN-004 (compaction) | Compaction merged before the first later message | Activity time, message times | Rows | Yes, as today; mixed clocks: FU-001 |
| Preserved (585) | A notice segment becomes its own row | Segments in order | Notice row | Yes |

- Checks run:
  - The reload pipeline on the founder's shape (temporary server test, removed): entries in stored order today, so D-2 is needed.
  - The web reproduction: today's sort fails at a 1 s difference.
  - Both read-only; the founder's data was only read.
- Contract changes the validation caused: none.

## Persisted Data / State Transition Decision

`Not Affected`. Read-side only. Stored traces keep their order, and old and new runs are read by the same rule.

## Data-Flow Spine Inventory

| Spine | Scope | Behavior | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-1 | Primary | BEH-001, BEH-003 | Conversation + compactions | Feed rows | `buildRecentEventMonitorPresentation` | Order shown |
| DS-2 | Primary | BEH-002 | Stored traces | Replay events → entries | `buildHistoricalReplayEvents` | Reload order |

## Primary Execution Spine(s)

- DS-1: `Stream/hydration → AgentContext.conversation (array) → buildRecentEventMonitorPresentation [flatten in array order → merge compactions by time → select window] → AgentConversationFeed (desktop/phone)`
- DS-2: `Stored raw traces → buildHistoricalReplayEvents [preface rule] → buildRunProjectionConversation → GraphQL → buildConversationFromProjection → DS-1`

## Spine Narratives (Mandatory)

| Spine | Narrative | Owner |
| --- | --- | --- |
| DS-1 | Flatten as today (message, then its segments). Take compaction rows ordered by their own time. Walk the message rows in conversation order and insert each compaction before the first message row whose time is later than the compaction's. Then select the recent window and build items as today. | Window |
| DS-2 | Before mapping traces to events, apply the preface rule within each turn, then map as today | Replay builder |

## Ownership Map

- `buildRecentEventMonitorPresentation` owns the shown order. The conversation array owns message order.
- `buildHistoricalReplayEvents` owns replay order.

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By |
| --- | --- | --- |
| The combined timestamp sort of all rows (`recentEventMonitorWindow.ts:199-200`) | Orders messages by clocks | Array order plus a compaction merge |
| The `order` field of descriptors, if it becomes unread after the merge | Dead if nothing reads it (Principle 7; implementation checks) | — |

## Off-Spine Concerns

None new.

## Dependency Rules

No new dependency. No lookup or after-construction wiring.

## Interface Boundary Mapping

Unchanged signatures: `buildRecentEventMonitorPresentation(conversation, compactions, limit)` and `buildHistoricalReplayEvents(rawTraces, options)`.

## Final File Responsibility Mapping

| File | Change |
| --- | --- |
| `autobyteus-web/services/eventMonitor/recentEventMonitorWindow.ts` | D-1: replace the sort with the array-order walk and compaction merge |
| `autobyteus-web/services/eventMonitor/__tests__/recentEventMonitorWindow.spec.ts` | The reproduction's cases (viewer behind, ahead, equal; sender and non-sender), a compaction between turns, notice rows (585) unchanged |
| `autobyteus-server-ts/src/run-history/projection/transformers/raw-trace-to-historical-replay-events.ts` | D-2: the preface rule (a small named function in the file, e.g. `orderPrefaceNoticesAfterTheirMessage`) |
| `autobyteus-server-ts/tests/unit/run-history/projection/raw-trace-to-historical-replay-events.test.ts` | D-2 examples above: founder shape, notice turn with a later message, no notice; plus the conversation entries |
| `autobyteus-web/tests/e2e/…` (a phone case file) | AC-001/AC-003: the phone page's clock 2 s behind (Playwright `page.clock`), a message to a run whose input carries a platform notice; live order, then the same after a reload; also 2 s ahead |
| Docs (delivery's sync) | `autobyteus-web/docs/…` conversation window order |

## Concrete Examples / Shape Guidance

```ts
// D-1, inside buildRecentEventMonitorPresentation
const messages = flattenConversation(conversation);   // conversation order
const compactions = compactionDescriptors.sort(byTime); // their own time only
const ordered: VisualDescriptor[] = [];
let c = 0;
for (const m of messages) {
  while (c < compactions.length && compactions[c].timestampMs < m.timestampMs) ordered.push(compactions[c++]);
  ordered.push(m);
}
while (c < compactions.length) ordered.push(compactions[c++]);
```

The comparison must keep today's tie rule: with equal clocks, the output equals today's for every existing spec. Implementation confirms the tie (`<` versus `<=`) against `recentEventMonitorWindow.spec.ts`.

The shape avoided: re-stamping live messages with a common clock, or overwriting the echo's time. That would keep a clock in the order, and a hydrated conversation followed by live rows would still mix clocks.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision |
| --- | --- | --- |
| Reorder old traces on disk | Old runs | Rejected: read-side rule covers old and new |

## Change / Refactor Sequence

1. D-2 and its test.
2. D-1 and its spec (start from the reproduction).
3. Probe case.
4. Web suite, server projection tests, phone probe (the case, MSP-99 and the conversation cases).

## Key Tradeoffs

- Compaction placement still uses time (DEC-003, FU-001).
- D-2 uses two node times of the same turn to recognize a preface. They are the same clock, and the order of receipt before dispatch is guaranteed by the code path.

## Risks

- A runtime that stores the preface differently (for example inside the user's content). Implementation checks native, Claude, Antigravity and Codex; the rule only moves the exact shape.
- A spec that encoded timestamp order. It gets rewritten to conversation order (DESIGN.md rule 11).

## Guidance For Implementation

- Reproduction to start from: `tickets/in-progress/conversation-order-628/probes/clock-order-reproduction.spec.ts`. Copy it into `services/eventMonitor/__tests__/`; its second case fails on base and must pass. Run with `npx vitest run <file>` in `autobyteus-web` after `nuxt prepare`.
- The founder's run is evidence only: never run code against it or copy it.
- Node 22.

## D-3: The server records every time; the app only shows it (SR-005, revised after ARCH-REV-001 AR-001)

### Why

Live, the app stamps rows with its own clock:
- agent messages: `findOrCreateAIMessage`, `segmentHandler.ts:254-272`;
- tool activity: `toolActivityProjection.ts:131`;
- compaction rows: `compactionActivityProjection.ts:199-214`;
- pending user messages: `userMessageProjection.ts:8-18`, `toTimestamp(undefined)`;
- the own send: `localUserSubmission.ts:91`;
- the conversation's `updatedAt`: `agentStreamMessageProjector.ts:219-223`.

REQ-004 requires the server's time for each.

### The three boundaries (ARCH-REV-001 AR-001.1)

| Boundary | Wire shape | Built by | Parsed by (web) |
| --- | --- | --- | --- |
| `/ws/agent` (standalone and delegated runs; its snapshot `turn_frames`; the peer-run relay) | `ServerMessage {type, payload, sequence?}` | `AgentRunEventMessageMapper` (`services/agent-streaming/agent-run-event-message-mapper.ts`) from `AgentRunEvent` | `protocol/messageParser.ts` (exact keys per type) |
| `/ws/agent-team` (Team members: the founder's run) | `teamAgentPayloadSchemas` = the shared presentation payload schema of each type `.extend({change_sequence, agent_run_id})` (`team-agent-message-dtos.ts:13-48`), plus the content batch (`:55-60`) | `team-agent-event-websocket-projector` | `TeamStreamingService` (team contract parse) |
| Org / collaboration | `AgentPresentationMessage` (`agent-org-execution-dtos.ts:102`) of the shared presentation payload schemas | `projectAgentPresentationMessage` (4 call sites) | the Org/collaboration parsers |

The Team and Org shapes both build on the same per-type payload schemas (`agentPresentationPayloadSchemas`). `/ws/agent` has its own mapper and parser.

### Data Contract (Principle 17)

**One field definition:** `occurred_at`, the ISO 8601 time the run's node recorded the event. It is defined once in `@autobyteus/agent-presentation-contracts` (`serverTimeSchema`) and is required **only on the messages a reader times**.

The timed messages are those whose web handler creates or stamps a row:

| Message type | Web reader that times it | Why |
| --- | --- | --- |
| `SEGMENT_START` | `handleSegmentStart` (`segmentHandler.ts:78`) | creates the AI message / segment |
| `SEGMENT_CONTENT` (and each item of the Team content batch) | `createSyntheticSegmentFromContent` (`segmentHandler.ts:356`) | may create them |
| `TOOL_APPROVAL_REQUESTED`, `TOOL_APPROVED`, `TOOL_DENIED`, `TOOL_EXECUTION_STARTED`, `TOOL_EXECUTION_SUCCEEDED`, `TOOL_EXECUTION_FAILED`, `TOOL_EXECUTION_INTERRUPTED` | `createSyntheticToolSegment` (`toolLifecycleHandler.ts:114,144`); `upsertActivityFromToolSegment` (`toolActivityProjection.ts:131`) | create a tool segment and its Activity row |
| `SYSTEM_TASK_NOTIFICATION` | `handleSystemTaskNotification` | creates the AI message |
| `INTER_AGENT_MESSAGE` | `handleInterAgentMessage` (`teamHandler.ts:41`) | creates it |
| `ERROR` | `handleError` (`agentStatusHandler.ts:134,154`) | creates it |
| `COMPACTION_STATUS` | `compactionActivityProjection` (`:199`) | the compaction row's time |
| `MEMBER_INPUT_MESSAGE` | `buildUserMessageFromProjectionPayload` | keeps its existing `received_at` (already the node's) |
| `AGENT_INPUT_STATE` entries | `upsertPendingUserMessage` | each entry gains `accepted_at` (when the node admitted it), not a frame time |

Implementation confirms the list against every handler that creates or stamps a row. A type that creates one and is missing from the list gets the field.

| Record / Message | Boundary | Field | Meaning | Written By | Read By |
| --- | --- | --- | --- | --- | --- |
| `AgentRunEvent` (node) | AgentRun → listeners | `occurredAt: number` (epoch ms) | The node's time of the event | **AgentRun, at one point:** a private method through which every delivery to listeners passes. That covers the processed pipeline (`publishSourceEvents` → `dispatchProcessedAgentRunEvents`), the input state (`broadcastUnpublishedInputState`, `agent-run.ts:524-529`), the canonical status (`dispatchCanonicalStatus`, `:531-545`) and the subscribe snapshot (`:222-226`). Events already stamped are not re-stamped (one event, one time). | the memory recorder for external runtimes (trace `ts`); the three mappers |
| Timed payloads (table above) | `/ws/agent` | `payload.occurred_at` | same | `AgentRunEventMessageMapper` from `occurredAt` | `messageParser.ts` (exact keys include it for these types) → the handlers |
| Timed payloads | `/ws/agent-team` | `payload.occurred_at` (inherited from the shared schema; content batch items carry it) | same | the Team projector from `occurredAt` | `TeamStreamingService` → the same handlers |
| Timed payloads | Org / collaboration | `payload.occurred_at` (shared schema) | same | `projectAgentPresentationMessage` from `AgentPresentationEvent.occurredAt` (adapters carry it from `AgentRunEvent`) | Org/collaboration parsers → the same handlers |
| `agentPendingInputSchema` entry | all three (input state) | `accepted_at: string` (ISO) | When the node admitted the input | `inputAdmissionState.admit` | `upsertPendingUserMessage` |
| Presentation events not from an `AgentRunEvent` that are timed (for example a stream-level `ERROR` built by a stream handler) | per stream | `occurred_at` | The node's time when that producer builds it | that producer | the same handlers |
| Web `UserMessage.timestamp` | web-internal | `Date \| null` | `null` for an own send the node has not yet confirmed (no time recorded yet); the node's `received_at` or `accepted_at` replaces it | `beginLocalUserSubmission` (null) | window (array order; a null time bounds no compaction), conversation `createdAt`/`updatedAt` (derived from row times, nulls skipped), every other reader of a message's `timestamp` (implementation lists and decides each) |
| Web `conversation.updatedAt` | web-internal | — | The latest row time (server), derived, never `now` | the projector (`agentStreamMessageProjector.ts:219-223`) | run views |

- **Peer-run relay:** frames pass unchanged, so a peer run's times are the peer node's (Out of Scope: the run's own node is its source).
- **`/ws/agent` snapshot `turn_frames`:** the buffered frames are the same `ServerMessage`s, so they keep their `occurred_at`. The stored part carries stored `ts` (server).

**Example frames:**
- `/ws/agent`: `{"type":"SEGMENT_START","payload":{"id":"s1","segment_type":"text","turn_id":"t2","occurred_at":"2026-11-23T16:55:15.948Z"},"sequence":812}`
- Team: `{"type":"SYSTEM_TASK_NOTIFICATION","payload":{"sender_id":"system.skill_update_notifier","content":"[Platform notice — skill updated] …","message_id":"993f64ae…","occurred_at":"2026-11-23T16:55:09.697Z","change_sequence":4411,"agent_run_id":"solution_designer_f474…"}}`
- Org: `{"type":"COMPACTION_STATUS","payload":{…,"occurred_at":"2026-11-23T17:02:00.100Z"}}` inside the Org member message.
- Input state entry: `{"sequence":7,"message_id":"client_561b…","state":"forwarded",…,"accepted_at":"2026-11-23T16:55:09.696Z"}`
- Own send before its confirmation: `{type:'user', text:'You mean …', timestamp:null, messageId:'client_561b…'}`; on the echo, `timestamp` becomes `2026-11-23T16:55:09.696Z`.

### Data Contract Validation (per stream)

| Scenario | `/ws/agent` (standalone) | `/ws/agent-team` (the founder's) | Org |
| --- | --- | --- | --- |
| SCN-001 sender | own send `null` → input state `accepted_at` → `SEGMENT_START`/notice `occurred_at` | own send `null` → `MEMBER_INPUT_MESSAGE.received_at` → notice `occurred_at` → segments | as Team, through the presentation message |
| SCN-002 non-sender | input state entry `accepted_at` (no local send) | echo `received_at` | echo |
| SCN-003 reload | stored `ts` | stored `ts` | stored `ts` |
| SCN-004 compaction | `COMPACTION_STATUS.occurred_at` | same | same |
| First message of a new run (empty conversation) | own send `null`; nothing to place against; confirmed by `accepted_at` | `null` → `received_at` | same |
| Reconnect snapshot | stored `ts` plus `turn_frames` with `occurred_at` | the Team snapshot (stored `ts`) plus later frames | same |

Every row's time is the node's, or null until the node's arrives. The window's order never reads a time (D-1), and compaction placement compares server times only.

### Persisted data

Not Affected:
- old runs are read-side;
- external runtimes' new traces take `ts` from `occurredAt`, the same server clock;
- input state is transient.

### Changes

- Contracts:
  - `serverTimeSchema`, plus `occurred_at` on the timed payload schemas and `accepted_at` on pending input entries;
  - rebuild every contract `dist/` (`pnpm check:contract-dist`).
- Node:
  - AgentRun's one stamping delivery method;
  - the three mappers and producers write the field;
  - the memory recorder uses `occurredAt`;
  - `inputAdmissionState` records `accepted_at`.
- Web:
  - `messageParser.ts` exact keys;
  - handlers take `payload.occurred_at` instead of `new Date()`;
  - the compaction projection takes it instead of `now` (or the provider time it uses today: implementation decides with one rule, the server's time first);
  - `upsertPendingUserMessage` uses `accepted_at`;
  - an own send is `null` until confirmed;
  - `updatedAt` is derived;
  - every reader of a nullable `timestamp` is listed and decided.
- Tests:
  - fixtures that build these frames gain the field;
  - specs with fake timers far from frame times assert that no row carries the viewer's clock.

### Classification

`Large` / `High`:
- three stream boundaries and a shared contract field;
- AgentRun's delivery;
- the web's row times;
- contract `dist/` is a build input (rule 12).

Route: architecture review.

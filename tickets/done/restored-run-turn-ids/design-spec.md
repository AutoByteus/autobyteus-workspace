# Design Spec — autobyteus-526 round 1

## Solution And Approval Basis

- Revision `SR-002` (revised for CRR-001 / API-E2E F-1; SR-001 implemented at 10217e9a0b, cbea910d08); requirements `requirements-doc.md` approved by the Solution Designer within the Task's direction (user informed), 2026-11-18
- Design status: `Ready`; user approval of the design: `Not required`
- Authorities read (2026-11-18): `references/architecture-design.md`, `references/design-principles.md` (current version), `/DESIGN.md`
- Conflicts: none

## Current-State Read

- Native turn ids come from `MemoryManager.startTurn()` → `TurnTracker.nextTurnId()` (`autobyteus-ts/src/memory/memory-manager.ts` L143-145, `turn-tracker.ts` L11-14). `MemoryManager` creates `new TurnTracker()` (start 1) on every construction (L114), for a new run and for a restored one. The same constructor already reads the run's complete stored raw-trace corpus (archived segments + active file, system instructions excluded) for `ToolTraceLifecycleState` (L128; `run-memory-file-store.ts` L178-183).
- Layers that key on the turn id and so merge two turns with one id: replay turn groups and tool replay ids (`historical-replay-event-identity.ts` L22-28), stream frame buffers (`agent-stream-sequence.ts` L103-115), web segment identity (`segmentIdentity.ts`). Their shared invariant: a turn id names one turn of a run.
- The reminder's time is produced as `YYYY-MM-DD HH:MM UTC` (`restart-notice.ts` L36-37). Desktop and phone render notices through one component, `components/conversation/segments/SystemTaskNotificationSegment.vue` (desktop conversation and the phone's `MobileRunTargetView` → `AgentEventMonitor` → `AIMessage`), which already recognizes notices by sender or header (L30-60).

## Task Size And Architectural Risk

- Task size: `Medium` (SR-001's two changes, plus one notice identity carried through the preface metadata, the stored trace, the projection, the live notice payload and the web notice segment)
- Size rationale: two small, local changes in existing owners; no contract, route or store shape change
- Architectural risk: `High` (SR-002)
- Risk rationale: a field is added to the live `SYSTEM_TASK_NOTIFICATION` payload and the projection's notice entries (strict wire contracts), stored notice traces gain their `message_id` (additive, existing field), and every notice producer is touched; SR-001's parts stay Low
- Escalation trigger: if validation shows the conversation still merges turns with distinct ids, or a reader depends on a restored run restarting at `turn_0001`, return a Design Impact

## Intended Change

1. `MemoryManager` seeds its `TurnTracker` from the highest `turn_NNNN` in the corpus it already reads at construction: `new TurnTracker(highest + 1)`; no stored turn → 1. Ids that do not match `turn_NNNN` (an explicit id passed to `startActiveTurn`) are ignored for the seed.
2. `SystemTaskNotificationSegment.vue` recognizes the restart reminder (sender `system.restart_resume` or header `[Platform notice — application restarted]`, as it already does for the other notices) and shows the `YYYY-MM-DD HH:MM UTC` time in the viewer's local zone with `Intl.DateTimeFormat` (date, time, short zone name, the app's locale). The segment content (what the agent got and memory holds) is unchanged.

## Change Scope

- In scope: UC-001, UC-002. Files: `autobyteus-ts/src/memory/memory-manager.ts` (seed), `autobyteus-ts/src/memory/turn-tracker.ts` (only if a helper to parse `turn_NNNN` belongs with it), `autobyteus-web/components/conversation/segments/SystemTaskNotificationSegment.vue` (+ a small pure helper `utils/restartReminderLocalTime.ts` if the component grows), tests; docs where turn numbering or the reminder card are described (`autobyteus-server-ts/docs/modules/restart_resume.md`, memory docs in `autobyteus-ts/docs` if they state the numbering).
- Derived consumers: none change; they receive unique ids.
- Deliberately left alone: the layers keying on turn ids (they are right once ids are unique); stored traces of runs restored before the fix (DEC-003); the reminder text (UTC for the agent).
- Follow-ups: None new.

## Spines

- DS-001: `restore of a native run -> MemoryManager constructor -> store.listTurnRawTraceCorpusOrdered() (already read) -> highest turn_NNNN -> TurnTracker(highest + 1) -> startActiveTurn -> next turn id unique`
- DS-002: `notice segment -> SystemTaskNotificationSegment (restart reminder?) -> UTC time in the body -> Intl local format -> rendered card`

## Task Design Health Assessment

- Posture: Bug Fix. Root cause: `Missing Invariant` (turn ids unique per run) at its owner, the turn tracker's seed. Refactor: No. Triggers: Several kinds or forms (new vs restored run; live vs reload; desktop vs phone) traced above. Deviations: None.

## Persisted Data

`Not Affected` (format unchanged; old duplicate ids stay, DEC-003).

## Removal Plan

None.

## Concrete Examples

- Stored `turn_0001`..`turn_0003` (`turn_0002` in an archived segment), restore → next `turn_0004`. After a second restore with `turn_0004`..`turn_0005` stored → `turn_0006`.
- Reminder body `The application restarted at 2026-11-18 05:41 UTC (reason: a restart).`, viewer in Europe/Berlin with English locale → card shows `… restarted at 18 Nov 2026, 06:41 CET (reason: a restart).`

## Guidance For Implementation

- Start from the 448 reproduction: `evidence/API-15-desktop/run-traces-turn-ids.txt` in `tickets/done/background-task-restart-notice/` (turn ids reused after each restart); a unit test on `MemoryManager` with a store holding `turn_0001..3` (one archived) must fail on base.
- Validation (API/E2E): isolated node, native run restarted twice; before (base `2e9ac1e65b`) and after; desktop and phone conversation, live and after a reload; also open a run restored before the fix and report what it shows (DEC-003); the card's local time with the viewer zone set (e.g. `TZ=Europe/Berlin`).


## SR-002 — One identity per notice (CRR-001 / API-E2E F-1)

### Cause (read, with the validation evidence; investigation notes U-1)

A notice reaches the web on two paths, and nothing ties them together: the snapshot's stored part keeps it (notices have no turn, `keepsStored`) and its live frame arrives with only `sender_id` and `content`. The 461 contract says the web matches notices by `messageId`, but no notice carries one on any path. Turn ids are not involved (base shows the same counts).

### Intended Change

Every platform notice has one id, `messageId`, given where the notice is made, and the same id travels with every copy:

| Step | Owner (file) | Change |
| --- | --- | --- |
| 1 | `autobyteus-ts/src/agent/message/platform-input-preface-metadata.ts` | `PlatformInputPreface` gains `noticeId: string` (required); `platformInputPrefaceMetadata` writes `notice_id`; `readPlatformInputPreface` reads it (a stored message without it reads `null`: tolerant, older metadata) |
| 2 | `autobyteus-ts/src/agent/input-processor/memory-ingest-input-processor.ts` L54-62 | the `system_task_notification` trace is appended with `messageId: preface.noticeId` (`RawTraceItem.messageId` exists) |
| 3 | server notice producers: `agent-run-input-preface-dispatch.ts` (preface: `noticeId = preface.id`), restart reminder wake (`restart-notice.ts`), tool list (`tool-list-update-notice-builder.ts`), skill (`skill-update-notice-builder.ts`), background tasks (`background-task-notice-builder.ts`), model router (`model-router.ts` L200-210), Claude background notice (`claude-session.ts` L428, recorded by the server memory recorder from the same event) | each makes one id per notice, puts it in the message's preface metadata (when the notice is an input) and in the published `SYSTEM_TASK_NOTIFICATION` payload as `message_id`. The runtime hand-over marker keeps its existing rule (its echo is not numbered) |
| 4 | server memory recorder for external runtimes (`runtime-memory-event-accumulator.ts`) | records the notice with the event's `message_id` |
| 5 | projection: `raw-trace-to-historical-replay-events.ts` L201-210, `historical-replay-events-to-conversation.ts` L64-71, `run-projection-types.ts` | notice replay events and conversation entries carry `messageId` when stored |
| 6 | wire: agent stream `SYSTEM_TASK_NOTIFICATION` payload (`agent-run-event-message-mapper.ts`, web `messageParser.ts`/`messageTypes.ts`), collaboration presentation (`collaboration-agent-presentation-adapter.ts` L369, `agent-presentation-event.ts` L137, contracts), team stream (`team-agent-event.ts` L122) | `message_id` (nullable for notices without one, e.g. old traces) |
| 7 | web: `SystemTaskNotificationSegment` type gains `messageId: string \| null`; `systemTaskNotificationHandler.ts` does not add a notice whose `messageId` the conversation already shows; hydration (`runProjectionConversation.ts` L275-281) sets it | the one rule: a notice id is shown once |

A notice without an id (traces written before this change) is shown as today (no dedupe): they never had a live copy after their run ended.

### Example (one restart, desktop live then reload)

1. Restart; input sent; the preface dispatch makes `noticeId = n1`; the native memory stores the notice with `message_id: n1`; the live frame `{sender_id, content, message_id: n1}` arrives → one card.
2. A snapshot is taken (reload or reconnect): its stored part holds the notice `messageId: n1` → one card; the replayed or later live frame with `n1` is skipped → still one card.

### Persisted Data (SR-002)

Stored notice traces gain `message_id` (an existing optional field). `Directly Usable — No Migration`: older traces read as today.

### Change Scope (SR-002)

Adds step 1-7 files to SR-001's. Left alone: the snapshot's keep rule (notices stay kept, as 461 designed); user and inter-agent messages (already matched by `messageId`).

### Guidance (SR-002)

- Reproduction: `MSP-75` (phone, fails until fixed) and `evidence/V-04-desktop/` (desktop live and reload) in this ticket folder.
- Keep SR-001's code (turn ids, local time): validated (AC-001 RR-10, AC-003, RR-11).

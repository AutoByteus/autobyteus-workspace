# Design Spec — autobyteus-526 round 1

## Solution And Approval Basis

- Revision `SR-001`; requirements `requirements-doc.md` approved by the Solution Designer within the Task's direction (user informed), 2026-11-18
- Design status: `Ready`; user approval of the design: `Not required`
- Authorities read (2026-11-18): `references/architecture-design.md`, `references/design-principles.md` (current version), `/DESIGN.md`
- Conflicts: none

## Current-State Read

- Native turn ids come from `MemoryManager.startTurn()` → `TurnTracker.nextTurnId()` (`autobyteus-ts/src/memory/memory-manager.ts` L143-145, `turn-tracker.ts` L11-14). `MemoryManager` creates `new TurnTracker()` (start 1) on every construction (L114), for a new run and for a restored one. The same constructor already reads the run's complete stored raw-trace corpus (archived segments + active file, system instructions excluded) for `ToolTraceLifecycleState` (L128; `run-memory-file-store.ts` L178-183).
- Layers that key on the turn id and so merge two turns with one id: replay turn groups and tool replay ids (`historical-replay-event-identity.ts` L22-28), stream frame buffers (`agent-stream-sequence.ts` L103-115), web segment identity (`segmentIdentity.ts`). Their shared invariant: a turn id names one turn of a run.
- The reminder's time is produced as `YYYY-MM-DD HH:MM UTC` (`restart-notice.ts` L36-37). Desktop and phone render notices through one component, `components/conversation/segments/SystemTaskNotificationSegment.vue` (desktop conversation and the phone's `MobileRunTargetView` → `AgentEventMonitor` → `AIMessage`), which already recognizes notices by sender or header (L30-60).

## Task Size And Architectural Risk

- Task size: `Medium` (one owner in `autobyteus-ts` memory, one web component, tests and the isolated-node/desktop/phone validation)
- Size rationale: two small, local changes in existing owners; no contract, route or store shape change
- Architectural risk: `Low`
- Risk rationale: the id format and every reader stay as they are; the numbering of new turns of restored runs continues instead of restarting; the card change is presentation only; stored data untouched
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

# Investigation Notes — autobyteus-526 round 1 (`restored-run-turn-ids`)

## Meta

- Package: `restored-run-turn-ids` (Project Task `autobyteus-526`, part of `autobyteus-530`), round 1 of several (FU-002 and the reminder's local time; later rounds: FU-001/008/009 test timing, FU-004, FU-007)
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/restored-run-turn-ids`, branch `codex/restored-run-turn-ids`, base `origin/personal` @ `2e9ac1e65b90ec24608223edd22a7db784979cd3` (fetched 2026-11-18; beta.10 released); finalization target `origin/personal`
- Authorities read (2026-11-18): `references/requirements-engineering.md`, `references/ticket-scope.md`, `references/finding-the-cause.md`; design: `references/architecture-design.md`, `references/design-principles.md`, `/DESIGN.md`
- Status: complete for round 1

## Source Log

| Source | Path | Finding | Established |
| --- | --- | --- | --- |
| Code | `autobyteus-ts/src/memory/turn-tracker.ts` L1-15 | counter starts at `start - 1` (default 1): ids `turn_0001`, `turn_0002`, … | Read |
| Code | `autobyteus-ts/src/memory/memory-manager.ts` L108-128, L143-145 | `turnTracker = options.turnTracker ?? new TurnTracker()` on every construction (new or restored run); the constructor already reads the complete stored raw-trace corpus (`store.listTurnRawTraceCorpusOrdered()`, L128) | Read |
| Code | `autobyteus-ts/src/memory/store/run-memory-file-store.ts` L178-183, L215+ | the corpus covers archived segments and the active file (`readCompleteRawTraceCorpusDicts`), system instruction traces excluded | Read |
| Code | `autobyteus-ts/src/agent/context/agent-runtime-state.ts` L84-98 | a turn takes `memoryManager.startTurn()` unless an explicit id is given | Read |
| Evidence | 448 `evidence/API-15-desktop/run-traces-turn-ids.txt` | after each restart the first input is recorded under `turn_0001` again (twice in one run) | Reproduced (448 API/E2E) |
| Evidence | 448 `API-15-desktop/02-after-restart-reminder.png`, `03-after-reload.png` | the reminder card shows twice, live and after a reload | Reproduced |
| Evidence | 448 `API-05-14-restart-suite/RR-01.json` `conversation` | the server's projection lists the notice once and every reply | Reproduced |
| Code | `autobyteus-server-ts/src/run-history/projection/historical-replay-event-identity.ts` L22-28; `services/agent-streaming/agent-stream-sequence.ts` L103-115; `autobyteus-web/services/agentStreaming/handlers/segmentIdentity.ts` | replay turn groups (`turn:v1:<turnId>`), tool replay ids (`turnId` + call id), stream frame buffers (per `turnId`) and web segment identity (`turnId` + segment id) all assume a turn id names one turn of a run | Read |
| Code | `autobyteus-server-ts/src/restart-resume/restart-notice.ts` L36-49 | reminder time `YYYY-MM-DD HH:MM UTC` (448 DEC-002 detail) | Read |
| Code | `autobyteus-web/components/conversation/segments/SystemTaskNotificationSegment.vue` L30-60 | the notice card already recognizes notices by sender or header (skill, tools, runtime hand-over) and renders the body as Markdown | Read |

## Cause

A restored native run restarts its turn numbering at 1, so its new turns reuse ids of its first turns. Every layer that keys on the turn id (replay turn groups, stream buffers, segment identity) then treats two turns as one. The exact layer that produces the doubled card is not isolated; the invariant every one of them assumes ("a turn id names one turn of a run") is what breaks, so the fix restores the invariant at its source.

## Data

- Runs restored before the fix keep duplicate ids in their stored traces (no rewrite: the Task forbids changing stored data without the user's approval). Whether those old turns still render merged after the fix is checked in validation and reported to the user.

## Unknowns

- U-1 (resolved in SR-002, from CRR-001 / API-E2E F-1): the doubled card does not depend on turn ids (base shows the same counts). Read, with the validation evidence:
  - the snapshot keeps every stored entry without a turn (`agent-stream-sequence.ts` `keepsStored`: `turnId === null || …`); notices reach the conversation without a turn by design (`historical-replay-events-to-conversation.ts` L5-8: "notices carry none: they are always kept, and the web matches them by `messageId`") and without a message id (L64-71; replay event L201-210);
  - the live notice frame carries only `sender_id` and `content` (RR-10 frame order: `SYSTEM_TASK_NOTIFICATION {sender_id, content}` before `TURN_STARTED`); the web notice segment has neither turn nor id (`systemTaskNotificationHandler.ts` L13-21; hydration `runProjectionConversation.ts` L275-281);
  - so whenever a notice reaches the web on two paths (a snapshot's stored part and its live frame; desktop reload of a live run; phone live after a restart), both show. The 461 contract's "matched by messageId" is not met for notices: none carries one.
  - the stored trace can hold an id already (`raw-trace-item.ts` `messageId`, L30, L108, L136); user inputs use it.

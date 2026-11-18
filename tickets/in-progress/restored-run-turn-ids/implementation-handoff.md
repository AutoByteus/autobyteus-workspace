# Implementation Handoff — autobyteus-526 round 1 (`restored-run-turn-ids`)

## Upstream Artifact Package

All paths below are in `/Users/normy/autobyteus_org/autobyteus-worktrees/restored-run-turn-ids/tickets/in-progress/restored-run-turn-ids/`.

- Upstream review applicability and handoff-rule result: direct route (Medium / Low), no independent architecture review; this package goes to API/E2E.
- Requirements doc: `requirements-doc.md` (Approved, SR-001)
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md` (SR-001)
- Design spec: `design-spec.md` (Ready, SR-001)
- Supplemental task artifacts: `handoff.md`
- Triggering rework report: none

## Current Implementation Summary

- Implementation cycle: `Design Impact rework` (IR-002: SR-002 "One identity per notice", after API/E2E F-1 and CRR-001); IR-001 the round's baseline (SR-001, kept)
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-002` (IR-001 baseline)
- Related solution revision IDs: `SR-001`, `SR-002`
- Related architecture-review revision IDs: `ARCH-REV-001` (Pass, SR-002, Medium / High)
- Related code-review revision IDs: `CRR-001` (failure origin of F-1: Design Impact), `CRR-002` (Pass, round 2: SR-002 / IR-002, CR-001 resolved, no findings; sent on to API/E2E by the code reviewer)
- Related API/E2E revision IDs: `API-REV-001` (round 1: Fail F-1, the reminder card twice live)
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `F-1`
- Worktree / branch / commits: `/Users/normy/autobyteus_org/autobyteus-worktrees/restored-run-turn-ids`, branch `codex/restored-run-turn-ids`, base `origin/personal` @ `2e9ac1e65b`. `10217e9a0b` (turn numbering), `cbea910d08` (reminder card) (SR-001); SR-002: `6517199e36` (producers, memory, projection, wire, contract), `289e3e1539` (web show-once, tests), `491395b89f` (docs). The ticket documents and evidence are in the commit named in the handoff message.

What it does: a `MemoryManager` built over a native run's stored memory (a restore) seeds its `TurnTracker` from the highest `turn_NNNN` in the stored raw-trace corpus it already reads (archived segments and the active file), so the next turn continues after it; a new run still starts at `turn_0001`. The restart reminder card (`SystemTaskNotificationSegment`, desktop and phone) shows the reminder's restart time in the viewer's time zone (`18 Nov 2026, 06:41 CET`); the segment content, what the agent got and memory keeps, stays UTC.

What SR-002 adds: every platform notice has one id, given where it is made, and the same id travels with every copy: the message's preface metadata (`notice_id`), the stored notice trace (`message_id`), the projection's conversation entry (`messageId`), the published notice on the agent, collaboration and team streams (`message_id`) and the web segment (`messageId`). `handleSystemTaskNotification`, which every live and replayed frame passes through, adds nothing for a notice the conversation already shows, so a snapshot's stored copy and the live or replayed frame give one card. A notice without an id (older traces) is shown as before.

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `High` (SR-002: a strict wire contract field, every notice producer, memory, projection and the web)
- Design classification section / evidence reference: `design-spec.md` "SR-002 — One identity per notice"; `design-review-report.md` ARCH-REV-001
- Classification confirmed or changed: `Confirmed` (SR-002's Medium / High)
- Evidence and rationale: SR-001's two local changes, plus SR-002 across autobyteus-ts (preface metadata, notice trace, native emit), the server's seven producers, the external-runtime recorder, the projection, three wire routes (one strict contract) and the web handler and hydration.
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable` (SR-001's self-review below is kept as recorded)
- New design impact or escalation trigger: `None`. No reader depends on a restored run restarting at `turn_0001` (the server and web readers only key on the id; search: `turn_0001` appears in tests and docs only).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 / REQ-001 | restored native run continues after its highest stored `turn_NNNN`; new run `turn_0001`; format kept | `MemoryManager` constructor → `store.listTurnRawTraceCorpusOrdered()` (read once, also for `ToolTraceLifecycleState`) → `TurnTracker.continuingAfter(turnIds)` → `startTurn()` | Implemented; AC-001 unit-proven (fails on base) |
| BEH-002 / REQ-002 | each turn shown once after restarts: one reminder card per restart, every reply, live and after a reload | SR-001's unique turn ids, plus SR-002: producer → `notice_id` / `message_id` on every copy → web `handleSystemTaskNotification` shows a notice id once | Implemented; MSP-75 (phone, live after two restarts and after a reload) passes on this build after failing on base and on SR-001 (V-03); RR-10 passes; desktop V-04 is for API/E2E |
| BEH-003 / REQ-003 | card shows the viewer's local time; agent text UTC | `SystemTaskNotificationSegment.vue` (restart reminder by sender `system.restart_resume` or its header) → `utils/restartReminderLocalTime.ts` (`Intl.DateTimeFormat`, app locale) | Implemented; component test (Europe/Berlin → `06:41 CET`), rendered check desktop/phone widths |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. Stored traces of runs restored before the fix are untouched (DEC-003); the reminder text stays UTC.

## Implementation Choices Beyond The Design Text

1. **The parse lives with the format.** `TurnTracker.continuingAfter(storedTurnIds)` reads `turn_NNNN` (the format `nextTurnId()` writes); `MemoryManager` passes it the stored corpus's turn ids. The constructor reads the corpus once and gives the same list to `ToolTraceLifecycleState` (it read it once before too; no extra read).
2. **The highest id counts, not the last one**, and ids of another form (an explicit turn id, `turn_99x`) are ignored. More than 9999 turns continue as `turn_10000` (the existing padding).
3. **English shows `18 Nov 2026, 06:41 CET`.** The app's English locale (`en`) is formatted with `en-GB` (day first, 24-hour, the zone's abbreviation, as the reminder's UTC time reads); plain `en`/`en-US` would give `Nov 18, 2026, 06:41 GMT+1` without `CET`. Chinese uses `zh-CN` (`2026年11月18日 GMT+1 06:41`). A zone with no abbreviation in the locale shows its offset (`GMT+9`).
4. **Only the reminder's time line changes**: the helper replaces the `The application restarted at YYYY-MM-DD HH:MM UTC` time and nothing else; another notice's UTC text is left as it is (tested).

SR-002:

5. **R-1, the two producers outside the design's table send `null`:** autobyteus-ts `agent-input-pipeline.ts` (the native emit for an unsuppressed SYSTEM input; every platform builder suppresses it) and `collaboration-agent-presentation-event-adapter.ts` (a task-delegation input shown as a notice). Neither is a platform notice with a live and a stored copy.
6. **Where each id comes from:** the preface dispatch uses `preface.id` for the message (`notice_id`) and the published notice; the tool-list, skill and background-task services use their existing in-flight id for both the message and the event (the builders now take it); the restart wake uses its existing message id (`restart-resume:<restartedAt>:<run>`), read back from the message by the observer (`restartNoticeLifecycleObserver` now takes the message); the Model Router makes one id per request; each Claude background notice gets a new id, which the converter passes on and the external-runtime recorder stores. The runtime hand-over marker keeps its rule (no id).
7. **`PlatformInputPreface.noticeId` is `string | null` and always written**; a message stored before reads `null`. `RawTraceItem` keeps `messageId` for `system_task_notification` traces too (it kept it for user traces only), and the server's trace normalizer reads it for notices.
8. **The contract field is required and nullable** (`message_id: string | null` on the presentation `SYSTEM_TASK_NOTIFICATION`; the team stream derives it); the agent stream mapper writes `null` when a producer gave none. The projection entry carries `messageId` only when stored (the entry's field is optional); hydration reads it as `null` otherwise.
9. **R-2, one show-once rule:** only `handleSystemTaskNotification` decides, by the conversation it appends to (`context.conversation`, as `findOrCreateAIMessage` reads), over every message, completed ones included. Hydration only sets `messageId`; no second dedupe.

Deviations from a design principle decided during implementation: None.

## Lightweight Implementation Self-Review (Direct Route)

- Spine DS-001 and DS-002 followed as designed; no new owner, no boundary crossed; the helper is pure and tested on its own.
- No dead code: nothing was replaced by these changes besides the default `new TurnTracker()` (now `continuingAfter`) and the inline second corpus read.
- Size: `turn-tracker.ts` +15, `memory-manager.ts` +5/−2, `SystemTaskNotificationSegment.vue` +15/−2, `restartReminderLocalTime.ts` new (34 lines). No file near 500 lines from this change.
- Shared structures: no type or contract changed. Localization: no new keys (the shown time is formatted, not translated text).
- Tests follow code: new tests prove each behavior; existing memory, tracker and notice tests pass unchanged.

## Key Files Or Areas

- SR-002: autobyteus-ts `agent/message/platform-input-preface-metadata.ts`, `memory/models/raw-trace-item.ts`, `agent/input-processor/memory-ingest-input-processor.ts`, `agent/pipelines/agent-input-pipeline.ts`, `agent/streaming/events/stream-event-payload-lifecycle.ts`; server `agent-execution/domain/agent-run-input-preface-dispatch.ts`, the tool-list, skill and background-task builders and services, `restart-resume/restart-notice.ts` and `restart-resumer.ts`, `model-routing/services/model-router.ts`, the Claude session and its converter, `agent-memory/` (recorder, writer, recording models, trace normalizer), `run-history/projection/` (replay event type and both transformers), `agent-collaboration/execution/events/` (event type, adapters, projector), `agent-team-execution/domain/team-agent-event.ts`, `services/agent-streaming/` (mapper, team projector); `autobyteus-agent-presentation-contracts` (`SYSTEM_TASK_NOTIFICATION`, dist rebuilt; the team stream contract's dist too); web `types/segments.ts`, `services/agentStreaming/{protocol/messageTypes.ts,teamStreamDtoAdapters.ts,handlers/systemTaskNotificationHandler.ts}`, `services/runHydration/runProjectionConversation.ts`. Docs: `agent_execution.md`, `agent_memory_design.md`, the two web docs.

- `autobyteus-ts/src/memory/turn-tracker.ts` (`continuingAfter`), `autobyteus-ts/src/memory/memory-manager.ts` (seed, one corpus read)
- `autobyteus-web/utils/restartReminderLocalTime.ts` (new), `autobyteus-web/components/conversation/segments/SystemTaskNotificationSegment.vue`
- Tests: `autobyteus-ts/tests/unit/memory/{memory-manager-turn-numbering,turn-tracker}.test.ts`; `autobyteus-web/utils/__tests__/restartReminderLocalTime.spec.ts`, `components/conversation/segments/__tests__/SystemTaskNotificationSegment.spec.ts`
- Docs: `autobyteus-ts/docs/agent_memory_design.md` (turn numbering across restores), `autobyteus-server-ts/docs/modules/restart_resume.md` (the card's local time)

## Important Assumptions

- A native run's restore builds its `MemoryManager` over the same memory folder (`agent-factory.ts` → `FileMemoryStore`), so the stored corpus is the run's own; the test builds the store the same way.

## Known Risks

- Runs restored before the fix keep duplicate `turn_NNNN` ids in their stored traces (DEC-003); whether their old turns still render merged is for API/E2E to report.
- A viewer whose system time zone is wrong sees a wrong local time (the card uses the browser's zone).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix; root cause: Missing Invariant (turn ids unique per run) at its source
- Reviewed refactor decision: No refactor
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed: `Yes` (none left)
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes`
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Deviations from a design principle decided during implementation: `None`
- Changed source implementation files stayed within size guardrails: `Yes`

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected` (format unchanged; old duplicate ids stay, DEC-003)
- Implementation follows the approved decision: `Yes` — nothing writes or rewrites stored traces; the seed only reads them.

## Environment Or Dependency Notes

- Fresh worktree: `pnpm install`, `pnpm -C autobyteus-server-ts prebuild` and `pnpm -C autobyteus-web exec nuxt prepare` were run. No dependency change. Node v22.23.1, macOS arm64; the machine's own zone is CET (the component test sets its own zone and also passes with the process started in `America/New_York`).

## Checks Run

Evidence files are in `tickets/in-progress/restored-run-turn-ids/evidence/`.

| Check ID | Command Or Steps | Commit Tested | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-00 | the new `memory-manager-turn-numbering.test.ts` against base source (`2e9ac1e65b`'s `memory-manager.ts`, `turn-tracker.ts`), then with the fix | `cbea910d08` | turn seed across restores (stored `turn_0001..3`, `turn_0002` archived) | REQ-001, AC-001 | Fails on base (3 of 4, `Received: "turn_0001"`), passes with the fix (7/7 with the tracker cases) | `IMP-00-turn-numbering-red-green.log` | `Tests  3 failed \| 1 passed (4)`, then `Tests  7 passed (7)` |
| IMP-01 | `pnpm -C autobyteus-server-ts typecheck`; `pnpm -C autobyteus-web typecheck` | `cbea910d08` | server (builds autobyteus-ts) and web | — | Pass at both baselines | `IMP-01-typechecks.log` | `test-file errors: 1012 in 316 files (baseline 1012 in 316 files)`, `87 in 37 files (baseline 87 in 37 files)`, `[typecheck] PASS` |
| IMP-02 | `pnpm -C autobyteus-ts exec vitest run tests/unit` | `cbea910d08` | all autobyteus-ts unit tests, memory included | REQ-001, regression | Pass | `IMP-02-autobyteus-ts-unit.log` | `Test Files  318 passed (318)`, `Tests  2194 passed (2194)` |
| IMP-03 | server: `vitest run tests/unit/agent-execution/backends/autobyteus tests/unit/restart-resume tests/unit/run-history tests/unit/services/agent-streaming tests/integration/restart-resume tests/integration/agent-execution`; web: `test:nuxt run components/conversation services/agentStreaming components/mobile` + the two new specs | `cbea910d08` | native backend, restart-resume, replay/stream readers of turn ids; the notice card, streaming and phone | REQ-001 to REQ-003, regression | Pass | `IMP-03-server-suites.log`, `IMP-03-web-suites.log` | server `Tests  701 passed \| 35 skipped`; web `Tests  500 passed (500)` |
| IMP-04 | rendered check: a temporary fixture page with the card (removed after), Nuxt dev, headless Chrome with `timezoneId` Europe/Berlin (1280 and 390 wide) and Asia/Tokyo | `cbea910d08` | the card as rendered in a browser at desktop and phone widths | REQ-003, AC-003 (local level) | Pass | `IMP-04-rendered-card/` (`result.json`, screenshots, the script and page) | `"The application restarted at 18 Nov 2026, 06:41 CET (reason: a restart)."`, Tokyo `14:41 GMT+9`, `segmentContentKeepsUtc: true`, `"errors": []`, `routeRemoved: true` |
| IMP-05 | SR-002: both typechecks; `pnpm -C autobyteus-ts exec vitest run tests/unit`; `pnpm -C autobyteus-server-ts test:unit`; server integration `skill-update-notices`, `restart-resume`, `background-task-notices`, `agent`, `agent-team-execution`, `agent-execution`; `pnpm -C autobyteus-web test:nuxt run` (full) | `491395b89f` | every notice producer, memory (native and external), projection, the three wire routes and contract, the web handler and hydration; new `tests/unit/agent-execution/platform-notice-identity.test.ts`, the extended preface-memory, preface-dispatch, restart-notice, model-router, Claude and web handler specs | REQ-002, AC-002 (local), regression | Pass for this change: both typechecks at baseline; autobyteus-ts 2194 pass; web 5779 pass; server unit `5 failed \| 8341 passed` and integration `4 failed \| 207 passed`, all in real-folder watcher tests (`agent-package-folder-watcher`, `skill-folder-watcher`, `package-auto-refresh`: time-outs at load 90 to 128, the `fs.watch` environment failure recorded before on this machine; no watcher code touched) | `IMP-05-typechecks.log`, `IMP-05-autobyteus-ts-unit.log`, `IMP-05-server-unit-full.log`, `IMP-05-server-integration.log`, `IMP-05-web-unit-full.log` | `Tests  2194 passed`; `Tests  5779 passed`; the watcher failures' `Test timed out` / `Hook timed out` |
| IMP-06 | the phone reproduction MSP-75 (`node autobyteus-web/tests/e2e/mobile-shell-probe.mjs --cases=MSP-75`; own node, production phone bundle, Europe/Berlin) on fresh server and phone builds | `491395b89f` | live after one and two restarts, then a reload of the live run, on the phone (the same web code as the desktop) | REQ-002, AC-002 (phone), AC-003 | Pass (it failed on base and on SR-001, V-03) | `IMP-06-phone-MSP-75/` | `afterFirst` 1 card, `live` 2 cards, `reloaded` 2 cards; inputs and replies `[1, 1, 1]` |
| IMP-07 | `RUN_RESTART_REMINDER_E2E=1 vitest run tests/e2e/restart-resume/restart-reminder-built-server.e2e.test.ts -t "RR-10\|RR-01\|RR-02"` (built server) | `491395b89f` | real restarts of the built server: turn ids, the loaded conversation, the reminders | REQ-001, REQ-002 | Pass (3) | `IMP-07-RR-10/` | `Tests  3 passed \| 8 skipped`; `RR-10.json` |
| IMP-08 | Fresh-start build (contract package changed): clean clone at `491395b89f`, `pnpm install --frozen-lockfile`, `build:electron:mac -- --arm64` with the job's environment, then the two verify steps (with the spawn probe) | `491395b89f` | the contract `dist/` and every package's build from a clean clone | build | Pass; signing, notarization and other systems not tested (runner only) | `IMP-08-fresh-start-build/` | `install ok`, `build ok`, `verify prisma ok`, `verify terminal runtime ok`, `spawn probe ok`, `exit=0` |

- Not run, and why: the desktop journey V-04 on an isolated instance with a real model (restart twice, live, then a reload of the live run, V-04 step 5): API/E2E's; MSP-75 covers the same web code on the phone bundle, including a reload of the live run. DEC-003 (a run restored before the fix) is API/E2E's report.

## Frontend Rendered-Result Check (When Applicable)

IMP-04: I looked at the three screenshots. The card reads "The application restarted at 18 Nov 2026, 06:41 CET (reason: a restart)." and wraps cleanly at 390 px; Tokyo shows `14:41 GMT+9`. (The monospace block under the card in the screenshots is the fixture page's own dump of the stored content, showing it keeps UTC.) The fixture ran inside the desktop app shell; the phone's own bundle is for API/E2E.

## Downstream Coverage Hints / Suggested Scenarios

- AC-002: isolated node, a native run with two turns; restart; send; restart again; send. Base `2e9ac1e65b`: traces reuse `turn_0001`, the card doubles and a reply is hidden (448 API-15). This build: traces `turn_0001..` continue, each card once, every reply, desktop and phone, live and after a reload.
- DEC-003: open a run restored before the fix (its stored traces already hold duplicate ids) and report what its old turns show.
- AC-003 on the production phone bundle and the desktop with the viewer's zone set (`TZ=Europe/Berlin`, or a browser `timezoneId`); the agent's request still carries `… UTC`.

- SR-002 (ARCH-REV-001 asks): V-04 on the desktop, especially step 5 (reload while the run is live: one card per restart); MSP-75 again on the phone; a Team member and an Org member that get a skill or tool-list notice (team and collaboration streams, the stored copy and the live frame after a reconnect); a Claude run with a background-task notice (its recorded trace's id and the live frame); a run with notices stored before this change (old cards still show, once each as before).

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes: AC-002 on the desktop (V-04, step 5) and the phone, DEC-003, and the notice id on the team, Org and Claude paths named above.

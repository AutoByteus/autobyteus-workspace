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

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-001`
- Related architecture-review, code-review, API/E2E, delivery revision IDs: `N/A`
- Worktree / branch / commits: `/Users/normy/autobyteus_org/autobyteus-worktrees/restored-run-turn-ids`, branch `codex/restored-run-turn-ids`, base `origin/personal` @ `2e9ac1e65b`. `10217e9a0b` (turn numbering), `cbea910d08` (reminder card). The ticket documents and evidence are in the commit named in the handoff message.

What it does: a `MemoryManager` built over a native run's stored memory (a restore) seeds its `TurnTracker` from the highest `turn_NNNN` in the stored raw-trace corpus it already reads (archived segments and the active file), so the next turn continues after it; a new run still starts at `turn_0001`. The restart reminder card (`SystemTaskNotificationSegment`, desktop and phone) shows the reminder's restart time in the viewer's time zone (`18 Nov 2026, 06:41 CET`); the segment content, what the agent got and memory keeps, stays UTC.

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `Low`
- Design classification section / evidence reference: `design-spec.md` "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: two local changes in existing owners (the tracker seed in `MemoryManager`; the notice card with a small pure helper); no contract, route, store shape or reader change; id format unchanged.
- Selected route: `API/E2E` (direct)
- Lightweight implementation self-review completed for the direct route: `Yes` (below)
- New design impact or escalation trigger: `None`. No reader depends on a restored run restarting at `turn_0001` (the server and web readers only key on the id; search: `turn_0001` appears in tests and docs only).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 / REQ-001 | restored native run continues after its highest stored `turn_NNNN`; new run `turn_0001`; format kept | `MemoryManager` constructor → `store.listTurnRawTraceCorpusOrdered()` (read once, also for `ToolTraceLifecycleState`) → `TurnTracker.continuingAfter(turnIds)` → `startTurn()` | Implemented; AC-001 unit-proven (fails on base) |
| BEH-002 / REQ-002 | each turn shown once after restarts | follows from unique ids; no reader changed | To be proven live by API/E2E (AC-002) |
| BEH-003 / REQ-003 | card shows the viewer's local time; agent text UTC | `SystemTaskNotificationSegment.vue` (restart reminder by sender `system.restart_resume` or its header) → `utils/restartReminderLocalTime.ts` (`Intl.DateTimeFormat`, app locale) | Implemented; component test (Europe/Berlin → `06:41 CET`), rendered check desktop/phone widths |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. Stored traces of runs restored before the fix are untouched (DEC-003); the reminder text stays UTC.

## Implementation Choices Beyond The Design Text

1. **The parse lives with the format.** `TurnTracker.continuingAfter(storedTurnIds)` reads `turn_NNNN` (the format `nextTurnId()` writes); `MemoryManager` passes it the stored corpus's turn ids. The constructor reads the corpus once and gives the same list to `ToolTraceLifecycleState` (it read it once before too; no extra read).
2. **The highest id counts, not the last one**, and ids of another form (an explicit turn id, `turn_99x`) are ignored. More than 9999 turns continue as `turn_10000` (the existing padding).
3. **English shows `18 Nov 2026, 06:41 CET`.** The app's English locale (`en`) is formatted with `en-GB` (day first, 24-hour, the zone's abbreviation, as the reminder's UTC time reads); plain `en`/`en-US` would give `Nov 18, 2026, 06:41 GMT+1` without `CET`. Chinese uses `zh-CN` (`2026年11月18日 GMT+1 06:41`). A zone with no abbreviation in the locale shows its offset (`GMT+9`).
4. **Only the reminder's time line changes**: the helper replaces the `The application restarted at YYYY-MM-DD HH:MM UTC` time and nothing else; another notice's UTC text is left as it is (tested).

Deviations from a design principle decided during implementation: None.

## Lightweight Implementation Self-Review (Direct Route)

- Spine DS-001 and DS-002 followed as designed; no new owner, no boundary crossed; the helper is pure and tested on its own.
- No dead code: nothing was replaced by these changes besides the default `new TurnTracker()` (now `continuingAfter`) and the inline second corpus read.
- Size: `turn-tracker.ts` +15, `memory-manager.ts` +5/−2, `SystemTaskNotificationSegment.vue` +15/−2, `restartReminderLocalTime.ts` new (34 lines). No file near 500 lines from this change.
- Shared structures: no type or contract changed. Localization: no new keys (the shown time is formatted, not translated text).
- Tests follow code: new tests prove each behavior; existing memory, tracker and notice tests pass unchanged.

## Key Files Or Areas

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

- Not run, and why: AC-002 (isolated node, native run restarted twice, before/after, desktop and phone, live and after reload, and a run restored before the fix, DEC-003) and the probes on the production phone bundle: API/E2E's per the design.

## Frontend Rendered-Result Check (When Applicable)

IMP-04: I looked at the three screenshots. The card reads "The application restarted at 18 Nov 2026, 06:41 CET (reason: a restart)." and wraps cleanly at 390 px; Tokyo shows `14:41 GMT+9`. (The monospace block under the card in the screenshots is the fixture page's own dump of the stored content, showing it keeps UTC.) The fixture ran inside the desktop app shell; the phone's own bundle is for API/E2E.

## Downstream Coverage Hints / Suggested Scenarios

- AC-002: isolated node, a native run with two turns; restart; send; restart again; send. Base `2e9ac1e65b`: traces reuse `turn_0001`, the card doubles and a reply is hidden (448 API-15). This build: traces `turn_0001..` continue, each card once, every reply, desktop and phone, live and after a reload.
- DEC-003: open a run restored before the fix (its stored traces already hold duplicate ids) and report what its old turns show.
- AC-003 on the production phone bundle and the desktop with the viewer's zone set (`TZ=Europe/Berlin`, or a browser `timezoneId`); the agent's request still carries `… UTC`.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes: AC-002 live (desktop and phone, live and reload) and DEC-003, AC-003 on the real surfaces.

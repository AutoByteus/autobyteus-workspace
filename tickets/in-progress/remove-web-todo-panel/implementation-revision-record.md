# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record only locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | architecture_reviewer pass handoff, `design-review-report.md`, round 1 | N/A (applied AR-REC-002..004 and the Codex `ITEM_PLAN_DELTA` note) | `Initial Baseline` | SR-005, SR-006, ARCH-REV-001 | Implementation complete; implementation-scoped checks pass; ready for code review |

## Revision Entries

### IR-001 — Initial implementation: to-do removal and `BACKGROUND_TASK_UPDATED` for Claude and AGY

- Triggering role, report path, and round: `/architecture_reviewer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/design-review-report.md`, round 1 (Pass)
- Triggering finding IDs: `N/A`
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result: implementation complete per design-spec SR-006; classification confirmed Large/High; routed to `/code_reviewer`
- Related solution revision IDs: `SR-005`, `SR-006`
- Related architecture-review revision IDs: `ARCH-REV-001`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why this baseline is recorded: first implementation handoff
- Approved behavior or requirement IDs affected: BEH-001..BEH-007; REQ-001..REQ-011; AC-001..AC-013 (unit and component level; live acceptance stays with API/E2E)
- Implementation delta:
  - **Removal.** The to-do event, message and payload are removed from the server, both contract packages (src and dist), Codex and the web. `RightSideTabs` no longer auto-switches. The localization keys and docs are gone.
  - **New event.** `BACKGROUND_TASK_UPDATED` is added: a domain builder/parser plus Zod schemas with enum parity.
  - **Claude.** The registry has a per-task view, the DS-002 rules, an injected callback and an injected clock (AR-REC-004).
  - **AGY brain files.** `agy-brain-file.ts` holds the shared safe read with a per-caller bound (AR-REC-002).
  - **AGY exit messages.** `agy-task-exit-message-reader.ts` reads `messages/*.json` only, settles other shapes, and retries only partial JSON (AR-REC-003).
  - **AGY monitor.** `AgyBackgroundTaskMonitor` tracks tasks, polls every 2 s and fails safe.
  - **AGY backend.** It calls `stopAll()` before `await eventQueue` on every stop path (AR-REC-003).
  - **Web.** Adds types, a store, a handler, projector/adapter cases and `BackgroundTaskPanel` in the `ProgressPanel` slot, with en and zh-CN strings.
  - **Browser probe.** A new probe renders and exercises the section.
  - **Kind table.** Confirmed against the SDK 0.3.280 CLI's own label table (static extraction). No change was needed.
- Changed files or areas: see `implementation-handoff.md` "Key Files Or Areas" (94 paths including tests, dist and docs: 69 modified, 5 deleted, 20 added)
- Local validation and result:
  - Contract tests pass, and the server build typecheck is clean.
  - The focused Claude, AGY, domain, admission and lifecycle suites pass.
  - The full server unit and integration suites and the full web suite show only failures that also occur on the untouched baseline `43b6fc0f4`: 52 server files and 5 web files.
  - The localization guard and audit pass.
  - The AC-003 static audit is clean.
  - The browser probe passes all 6 scenarios. It found three visual defects, which are fixed: the summary clamp, the header wrap and a fixed-px chip.
- Next recipient or routing: `/code_reviewer` (handoff rule for Large/High)
- Remaining limitations or risks:
  - `claude-session-event-converter.ts` is exactly at 500 effective lines.
  - The live `task_type` capture (RR-003) and all live AC runs remain for API/E2E.
  - RR-001, RR-002, RR-004 and RR-005 are unchanged.

# Implementation Revision Record — task-comments

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer, `design-review-report.md`, round 2 (Pass) | N/A | `Initial Baseline` | SR-013, ARCH-REV-002 | Implemented; to Code Review |

## Revision Entries

### IR-001 — Add-only Task comments and partsNotClosed (server, web, docs)

- Triggering role, report path, and round: `/software_engineering_team/architecture_reviewer`, `design-review-report.md`, round 2 (Pass, ARCH-REV-002)
- Triggering finding IDs: N/A (the five non-blocking implementation notes are applied; see the handoff)
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result: implementation complete at `52035832a6` (server) and `e014c349b8` (web); implementation-scoped checks IMP-01–IMP-07
- Related solution revision IDs: SR-013 (requirements SR-011 / SR-013)
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: first implementation handoff (Medium / High → Code Review)
- Approved behavior or requirement IDs affected: BEH-001, BEH-002, BEH-004, BEH-006, BEH-007; REQ-001, 002, 004–008, 010–014; AC-001–005, 008–012, 016 (AC-013 left to API/E2E; AC-006 withdrawn)
- Implementation delta:
  - Server: `comments` in `task.json` (reader / writer); `domain/task-comments.ts`; `update()` patch `addComment`; `ProjectTaskService.addComment`; `TASK_COMMENT_INVALID`; GraphQL field and `addProjectTaskComment`; feed schema and wire; tool `add_comment`, list `comments`, search `commentCount`, ack `partsNotClosed`; the exact search tier over comments; port `comments` and the "Comments:" block in the delegated work; docs.
  - Web: `TaskCommentsSection` on the Task page and the tab view; store `addComment`; types, query, mutation, generated comment hunks; en / zh-CN strings; docs.
- Changed files or areas: see the handoff's "Key Files Or Areas"
- Local validation and result: see the handoff's Checks Run (IMP-01–IMP-07)
- Next recipient or routing: Code Review (per `get_handoff_rules`)
- Remaining limitations or risks: the tab view was not rendered (component test only); E2E and the isolated desktop instance are left to API/E2E.

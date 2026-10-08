# Implementation Revision Record — `task-closed-status`

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `handoff-to-implementation.md`, initial | N/A | `Initial Baseline` | SR-004 | Implemented; ready for direct API/E2E |

## Revision Entries

### IR-001 — Closed Task status, initial implementation

- Triggering role, report path, and round: Solution Designer, `/Users/normy/autobyteus_org/autobyteus-worktrees/task-closed-status/tickets/in-progress/task-closed-status/handoff-to-implementation.md`, initial.
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: implementation complete; Medium/Low confirmed; direct API/E2E route.
- Related solution revision IDs: SR-004
- Related architecture-review / code-review / API/E2E / delivery revision IDs: N/A
- Why recorded: initial implementation baseline.
- Approved behavior or requirement IDs affected: BEH-001…BEH-010; REQ-001…REQ-014; AC-001…AC-013.
- Implementation delta:
  - **Server vocabulary:** new `projects/domain/task-status.ts` (4-value tuple, `isProjectTaskStatus`, `validateTaskStatus`, `isTerminalTaskStatus`).
  - **Server consumers:**
    - stores, service closure trigger and refusals (status-naming messages; `assertTaskNotDone` → `assertTaskNotTerminal`);
    - open count, feed schema, tool contract (enum, parse, descriptions);
    - GraphQL enum `CLOSED`;
    - LLM contract and runtime refusal wording; comment sweep.
  - **Released migration:** repointed to a frozen `readReleasedTaskFileV1`.
  - **Web presentation owner:** `taskStatusPresentation.ts` (renamed, no shim).
  - **Web UI:** new `ClosedTasksToggle.vue`; both boards hide Closed behind the toggle with a full-width lane; pills and labels show Closed.
  - **Web store, strings and types:** store lane/open predicates; en/zh-CN strings; generated enum; unused `PROJECT_TASK_STATUSES` (web) removed.
  - **Docs:** synced (server projects, tools, communication, prompt engineering, streaming protocol; web projects, chat, AGENTS catalog).
- Changed files or areas: see `implementation-handoff.md` › Key Files Or Areas.
- Local validation and result:
  - Server: source typecheck clean, build OK, targeted unit suites pass (incl. new `task-closed-status.test.ts`).
  - Existing E2E regressions pass: startup migration, node locality, gated closure, change feed, ad-hoc delegation.
  - Web: Projects specs 102 files / 981 tests pass; localization audit and guard pass; full `test:nuxt` 586/589 files pass (one unrelated flaky file, below).
  - Rendered check of the board (narrow and wide, toggle off and on) and the Task page via `pnpm dev`.
- Full web suite (`pnpm -C autobyteus-web test:nuxt --run`): 586 files passed, 2 skipped, 1 failed (`components/workspace/collaboration/__tests__/CollaborationMessagesOrgRoot.integration.spec.ts`, 2 tests). That file passes alone both with this change and on base code (3/3 each); it is flaky under full-suite load and unrelated.
- Next recipient or routing: `/software_engineering_team/api_e2e_engineer` (direct route).
- Remaining limitations or risks:
  - R-002: the external manager skill does not know CLOSED.
  - The collaborator-mention guidance text still says "mark that Task DONE" (cosmetic, outside the wording list).
  - The rendered check set statuses by file write, not by an agent.
  - 16 server unit files fail for pre-existing, environment reasons unrelated to this change.

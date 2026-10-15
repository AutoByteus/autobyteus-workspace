# Implementation Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md`, ARCH-REV-002 pass | N/A | `Initial Baseline` | SR-003, ARCH-REV-002 | Implemented; local checks green |

## Revision Entries

### IR-001 — Split `create_or_update_task` into `create_task` / `update_task`, no automatic exposure, tool-neutral texts

- Triggering role, report path, and round: Architecture Reviewer, /Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/design-review-report.md, ARCH-REV-002 (pass)
- Triggering finding IDs: N/A (ARCH-F-001 and ARCH-F-004 are design inputs, implemented here)
- Classification: Initial Baseline
- Prior authoritative result: N/A
- Current authoritative result: the implementation described in implementation-handoff.md
- Related solution revision IDs: SR-001..SR-003
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: first implementation of the approved package.
- Approved behavior or requirement IDs affected: BEH-001..BEH-005; REQ-001..REQ-006; AC-001..AC-008
- Implementation delta:
  - `project-task-tool-contract.ts`: names/types/descriptions/schemas for `create_task` and `update_task`; `parseCreateTaskInput` and `parseUpdateTaskInput` share private validators (`plainInput`, `rejectUnsupported`, `taskDescription`, `taskContextFiles`); `CREATE_OR_UPDATE_TASK_TOOL_NAME` removed.
  - `project-task-native-tools.ts`: `CreateTaskTool`, `UpdateTaskTool` replace `CreateOrUpdateTaskTool`. Manifest executes by tool name (`update_task` branch vs create).
  - `runtime-agent-tool-exposure.ts`: automatic list is `send_message_to`, `delegate_task` (+ `get_handoff_rules` when Team-scoped).
  - Deleted `autobyteus-collaboration-tool-exposure.ts` (and its test); resolver iterates `requestedToolNames` directly.
  - Tool-neutral texts: `agent-team-collaboration-llm-contract.ts` (3 texts), `task-execution-resources.ts` (2 errors), `project-task-service.ts` (1 error). `update_task` description carries the close/reopen guidance.
  - `collaborator-mention-note.ts`: tool-neutral `NOTE_GUIDANCE`; `guidanceFor(entries, delegateSentence)`; frozen `PREVIOUS_RELEASE_NOTE_GUIDANCE`; parser accepts current, previous and saved lines. Presentation-contracts `dist/` rebuilt (tracked).
  - Docs, tests and probes updated; `release-notes.md` added in the ticket folder.
- Changed files or areas: see implementation-handoff.md "Key Files Or Areas".
- Local validation and result: see implementation-handoff.md; server typecheck, full server unit suite (693 files), presentation-contracts tests, project-task-boundaries HTTP/MCP e2e and web mention utils all pass.
- Next recipient or routing: Code Review (Medium + High).
- Remaining limitations or risks: gated live suites and probes (AGY CLI, live web probes) were updated but not run; FU-1 must ship with this release.

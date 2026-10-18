# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round's delta.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer / `design-review-report.md` / round 1 (Pass) | N/A | `Initial Baseline` | `SR-002`, `ARCH-REV-001` | Implementation complete; local checks pass; routed to Code Review |

## Revision Entries

### IR-001 — Remove `create_or_update_project` and its dispatch

- Triggering role, report path, and round: Architecture Reviewer, `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-create-or-update-project/tickets/in-progress/remove-create-or-update-project/design-review-report.md`, round 1 (`Pass`, no findings; R-1..R-3 applied).
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: implementation complete against SR-002; local checks pass (see handoff); routed to Code Review (Small/High).
- Related solution revision IDs: `SR-001`, `SR-002`
- Related architecture-review revision IDs: `ARCH-REV-001`
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: initial implementation handoff.
- Approved behavior or requirement IDs affected: BEH-001..BEH-003; REQ-001..REQ-006; AC-001..AC-005 (AC-006 real-app check left to API/E2E).
- Implementation delta:
  - Contract: old name removed from `PROJECT_TASK_TOOL_NAMES` / `ProjectTaskToolName`; its description, deprecation comment and schema branch removed; dead `effectiveProjectTaskToolName` and `EffectiveProjectTaskToolName` removed; `parseProjectTaskToolInput` dispatches on `name`; `workspacesDefinition` comment "three" → "both". `projectInput` kept (both project parsers use it).
  - Manifest: `executeProjectTaskTool` dispatches on `name`; helper import and comment removed.
  - Native tools: `CreateOrUpdateProjectTool` and its registration removed.
  - Tests: old-tool tests removed from `project-task-tools.test.ts`, `project-tool-runtime-parity.test.ts`, `project-task-boundaries.e2e.test.ts`. Added: exact-set test (contract names, MCP adapter names, native registry names = six current names; `isProjectTaskToolName("create_or_update_project")` false); runtime-parity skip test on AutoByteus/Codex/Claude; resolver skip test (warning, no error).
  - Docs: whole passages removed (R-3) in server `projects.md`, `agent_tools_mcp_server.md`, web `docs/projects.md`. Web probe `team-status-live-probe.mjs:141` lists `create_project`, `update_project`, `create_task`, `update_task`.
  - Ticket `release-notes.md`.
- Changed files or areas: see the handoff's Key Files.
- Local validation and result: see the handoff's Local Implementation Checks Run.
- Next recipient or routing: Code Reviewer (per `get_handoff_rules`).
- Remaining limitations or risks: AC-006 (isolated real-app instance with a test data package) not run by implementation.

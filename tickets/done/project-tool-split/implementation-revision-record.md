# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round's delta.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer / `design-review-report.md` / round 1 (Pass) | N/A | `Initial Baseline` | `SR-002`, `ARCH-REV-001` | Implementation complete; local checks pass; routed to Code Review |

## Revision Entries

### IR-001 — Split `create_or_update_project` into `create_project` and `update_project`; old tool becomes a dispatcher

- Triggering role, report path, and round: Architecture Reviewer, `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tool-split/tickets/in-progress/project-tool-split/design-review-report.md`, round 1 (`Pass`, no findings; non-blocking R-1..R-4 applied as described below).
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: implementation complete against SR-002; typecheck, full server unit suite and the changed server E2E files pass locally (see handoff); routed to Code Review (Medium/High).
- Related solution revision IDs: `SR-001`, `SR-002`
- Related architecture-review revision IDs: `ARCH-REV-001`
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: initial implementation handoff.
- Approved behavior or requirement IDs affected: BEH-001..BEH-004; REQ-001..REQ-006; AC-001..AC-005, AC-007 (AC-006 real-app check is left to API/E2E).
- Implementation delta:
  - Contract: `create_project` and `update_project` names, descriptions (design examples verbatim), schemas (one `workspacesDefinition` builder shared by all three Project mutation schemas); `parseCreateProjectInput` and `parseUpdateProjectInput` share private `projectInput` (plain-object check), `addProjectFields` and `projectNameRequired`; `parseProjectMutation` removed. `effectiveProjectTaskToolName(name, raw)` is the only place that maps `create_or_update_project` to `update_project` (`project_id` present) or `create_project` (R-1). `parseProjectTaskToolInput` dispatches on the effective name.
  - Manifest: `executeProjectTaskTool` resolves the effective name once, parses with it, and branches on `create_project` / `update_project` (no `project_id` presence check); same `ProjectService` calls and result/error projection.
  - Native: `CreateProjectTool`, `UpdateProjectTool` registered; `CreateOrUpdateProjectTool` kept with a deprecation comment (FU-2).
  - Old tool's description and schema are byte-identical to the base (verified by a throwaway comparison against `origin/personal`'s contract and pinned as literals in the unit test). Old tool error order and messages are unchanged (R-2), pinned by code and message.
  - Tests: unit test restructured around a native+MCP error helper with pinned messages; new `tests/unit/agent-execution/shared/project-tool-runtime-parity.test.ts` (R-3, AC-003/AC-004/AC-005 new-build side across AutoByteus, Codex, Claude). E2E agents, calls, fixtures and web probes use the new names; `project-task-boundaries` keeps old-name calls for both modes, checks every Project error on the old tool too, and adds the collision case for the new names.
  - Docs: `autobyteus-server-ts/docs/modules/projects.md` (section renamed to "Project And Task Agent Tools"), `agent_tools_mcp_server.md`, `autobyteus-web/docs/projects.md`. Release notes added.
  - AC-005 probe script and both versions' outputs under `evidence/`.
- Changed files or areas: see the handoff's Key Files.
- Local validation and result: see the handoff's Local Implementation Checks Run.
- Next recipient or routing: Code Reviewer (per `get_handoff_rules`).
- Remaining limitations or risks: AC-006 (isolated real-app instance with a test data package) not run by implementation; R-4 doc comment in `runtime-agent-tool-exposure.ts` left unchanged (file out of the change scope; optional).

# Product Design Request — task-run-resources-workspace-cleanup

- Result classification: `Product Design Requested`
- Purpose: `New Request`
- Package identifier: `task-run-resources-workspace-cleanup`
- Current solution revision: `SR-002`
- From: Solution Designer (`/solution_designer`)
- Date: 2026-10-05
- Requirements status: `Ready for Approval` (not yet approved; the user asked for UI work first)
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup` (branch `codex/task-run-resources-workspace-cleanup`, base `origin/personal` @ `88851166fe8a37944381f0299bd479f20ed0f877`, finalization target `origin/personal`)

## User's Request (own words)

Original request (voice transcript, summarized): A Project Task Manager runs as the root, plans Tasks and delegates them. Delegation creates Task agent run resources, which appear in the left Workspaces area under the root Project Task Manager run. When the Manager marks a Task DONE, those resources are stopped and cleaned up — "at that moment, I think it makes sense that on the front end the task run resources also disappear… if it doesn't disappear… it's not manageable anymore. When it's created, it appears; when it's done, cleaned up, it disappears — that's more like reality."

Product request (2026-10-05): "@Product Team could you ask ui to work on UI first then" — the user wants the UI/UX work done first, before requirements approval and architecture design.

## Focused Decision / Experience To Evolve

How the left Workspaces tree should behave when a Task is DONE and its agent run rows go away. Open UX questions the user has not yet decided (my current recommendations are in the requirements doc, DEC-001–006):

1. The removal moment and any feedback (instant removal vs. a brief transition).
2. Which rows disappear: the assigned Agent/Team and its members, workers' sub-delegations and helpers (recommended: all of them).
3. An open worker conversation in the main panel at the moment of DONE (recommended: return to the Manager run).
4. The Manager's Team-tab message history with runs no longer in the tree (recommended: keep the messages).
5. Whether the user retains any way to reach finished work (currently none is proposed; the data stays on disk). A new archive/browse UI is currently out of scope unless the user decides otherwise.
6. Consistency for Agent, Agent Team and Agent Org root trees.

## Established Context

- Critical journey: Manager root run with live Task rows → Manager marks Task DONE → that Task's rows disappear live; reload/restart keeps them hidden; reopen + delegate again shows the new runs only; non-Task rows (description-only delegations, `@` collaborators) and other Tasks' rows unchanged.
- Constraints: no data deletion; DONE closure/stop semantics unchanged; visibility follows DONE (closure), not stop success; applies to standalone Agent, Agent Team and Agent Org roots.
- Non-goals: hiding runs stopped without DONE (root Stop, idle, error).
- Existing frontend: `autobyteus-web/components/workspace/history/AgentRunTaskRows.vue`, `WorkspaceTransientExecutionRow.vue`, `WorkspaceTeamExecutionTree.vue`, `WorkspaceAgentOrgHistoryCollection.vue`; earlier tree UX ticket `tickets/done/task-agents-workspace-tree-ux/`.
- Related IDs: BEH-002–004, REQ-001–006, REQ-008, REQ-009, AC-001, AC-004, AC-008, AC-009, SCN-001–004, DEC-001–006.

## Canonical Artifacts (absolute paths)

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/requirements-doc.md`
- Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/solution-revision-record.md`
- Design spec: N/A — not started (awaiting UI result and requirements approval).

## Expected Output

The Product Team's UI/UX result for this experience, returned to `/solution_designer`, so that the user can review it, decisions DEC-001–006 can be settled, and approved UI behavior can be integrated into the requirements before approval and architecture design.

## Open Risks

- No in-app access to closed worker conversations once rows are hidden (R-002).
- Team-tab message history references hidden runs (R-001; technical, architecture phase).

## Route

- `get_handoff_rules` (2026-10-05) returned three rules (architecture reviewer, implementation engineer, delivery engineer); none matches `Product Design Requested`.
- Route applied: direct user instruction — the user mentioned the collaborator `Product Team` at `/product_team` and asked for it to do the UI work first. Message sent with `send_message_to` to `/product_team` with this file attached.

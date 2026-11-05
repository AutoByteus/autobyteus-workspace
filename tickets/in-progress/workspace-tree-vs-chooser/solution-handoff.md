# Solution Handoff — `workspace-tree-vs-chooser`

- Result: **Architecture Design Complete** (SR-003, revised after ARCH-REV-001), `task_size=Medium`, `architectural_risk=High`.
- Origin: Project Task `autobyteus-385` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`) from `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), 2026-11-05.

## Request summary

Remove a workspace from the left Workspaces tree while it stays choosable in the chat's workspace chooser. Removing it from the chooser stays possible on purpose. No files, runs or history are lost. A test is required. Release only on the user's word.

The user's typical scenario (his words, 2026-11-05): he hides a folder after archiving or deleting its runs; starting a run there again brings it back to the left side.

## Approval

The Solution Designer approved within the direction. The user left the design to this role ("you'll do your own work … your design and the implement based on the current ticket itself") and told it to ignore the left-panel ticket. He was informed and gave his scenario; DEC-001 and DEC-005 follow it.

## Classification evidence

Medium: about 15–20 files across server `workspaces/`, the workspace GraphQL type, three run mutations, the web store, tree, phone list and chooser.

High risk because of:
- new persisted state (an additive file);
- a contract field and mutation used by every client;
- the rule about which commands count as the user's own, which must cover every launch surface.

## Artifacts (absolute paths)

- `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-tree-vs-chooser/tickets/in-progress/workspace-tree-vs-chooser/requirements-doc.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-tree-vs-chooser/tickets/in-progress/workspace-tree-vs-chooser/investigation-notes.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-tree-vs-chooser/tickets/in-progress/workspace-tree-vs-chooser/design-spec.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-tree-vs-chooser/tickets/in-progress/workspace-tree-vs-chooser/solution-revision-record.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-tree-vs-chooser/tickets/in-progress/workspace-tree-vs-chooser/follow-ups.md`
- Review: `design-review-report.md`, `architecture-review-revision-record.md` (same folder)
- Supplements: none. Product Design: N/A (DEC-004).

## Workspace

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-tree-vs-chooser`, branch `codex/workspace-tree-vs-chooser`.
- Base `origin/personal` @ `3ef5e33eecf7b50588b2b6dcec6908ab18152f1e`; target `origin/personal`.
- No source changes; the ticket docs are uncommitted. Dependencies are not installed yet.

## Open risks

- A user creation surface outside `prepareAgentRun`, `createAgentTeamRun`, `createAgentOrgRun` and `createWorkspace` would not bring a folder back for good; its runs still show while active (DEC-006).
- Clients see the change on their next fetch; there is no live feed for workspaces.

## Next expected action

Independent architecture review, then implementation.

## Route applied

`get_handoff_rules` (2026-11-05): Large or High → `/software_engineering_team/architecture_reviewer`.

## SR-003 Revision (after ARCH-REV-001, 2026-11-05)

- **AR-001:** the agent-run re-show point is the GraphQL `prepareAgentRun` resolver (`agent-run.ts:233`), the user's chat and mobile path. A peer's delegation calls the service, not the resolver. A cancelled or never-started prepared run leaves the folder shown, since the user chose it. `createAgentRun` gets no re-show; it has no caller (FU-001).
- **AR-002 (DEC-006):** the tree and the phone's list show a hidden folder while one of its runs is active, with that run, and hide it again when none is. Only creation and "Add workspace" bring a folder back for good. This covers every restore and resume path without wiring them. New AC-008.
- **AC-003 kept:** delegated copies are not in a folder's history groups (E-10), so they never show a hidden folder; an opened delegated-copy context must not count either.
- **Follow-ups:** `follow-ups.md` FU-001.
- **Recommendation adopted:** writes to the hidden list are serialized like the registry's.
- **Route:** the architecture-review rule → `/software_engineering_team/architecture_reviewer`.

## Review Outcome (recorded, 2026-11-05)

- ARCH-REV-002: **Pass** on SR-003 (AR-001, AR-002 resolved). The reviewer sent the package to `/software_engineering_team/implementation_engineer`. Its non-blocking recommendation: one predicate for the shown-or-active rule, shared by the tree and the phone list. Nothing forwarded by the Solution Designer.

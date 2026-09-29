# Solution Handoff — task-team-row-collapse-chevron

- Result: `Architecture Design Complete`
- Package identifier: `task-team-row-collapse-chevron`
- Current SR: `SR-003`
- Classification: `task_size=Small`, `architectural_risk=Low` (rationale in design-spec.md → Classification)
- Route: direct implementation (handoff rule: Small/Medium + Low → `/implementation_engineer`). Independent architecture review: `N/A — not applicable` (Small/Low).

## Original Request

User (2026-09-29), with screenshot `/private/tmp/claude-501/-Users-normy-autobyteus-org-autobyteus-workspace-superrepo/a452c1c2-097b-4d38-bd55-4e5b3fe325bc/images/1.png`:
"There's no chevron on the task agent team. That is causing me I'm not able to collapse the task agent row just like the normal agent row." In the Agent Org tree, the delegated Team row (`StudentStudyGroup — Started by Teacher`) has no chevron and always shows its members.

## Approved Behavior (summary; authority is requirements-doc.md)

- Delegated Team rows with children show the same chevron as the mounted Team row; collapsing hides all descendants (REQ-001, REQ-002).
- State is per delegated Team execution (`rootRunId + teamRunId`), independent of a same-named mounted Team or another delegation (REQ-003).
- `aria-expanded` exposed; keyboard operable (REQ-004).
- Default **open/expanded** (REQ-005, user: "Okay, then start open.").
- Clicking the row toggles collapse **and** opens the coordinator, same as the mounted Team row (REQ-006, user: "When I click the row, it will collapse ... same for the task team").
- Approval: explicit user approval in conversation 2026-09-29, baseline SR-003.

## Artifacts (absolute paths)

- Requirements (Approved): `/Users/normy/autobyteus_org/autobyteus-worktrees/task-team-row-collapse-chevron/tickets/in-progress/task-team-row-collapse-chevron/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-team-row-collapse-chevron/tickets/in-progress/task-team-row-collapse-chevron/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-team-row-collapse-chevron/tickets/in-progress/task-team-row-collapse-chevron/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-team-row-collapse-chevron/tickets/in-progress/task-team-row-collapse-chevron/solution-revision-record.md`
- Supplements / Product artifacts: none.
- Architecture review artifacts: `N/A — not applicable`.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-team-row-collapse-chevron`
- Branch: `codex/task-team-row-collapse-chevron`
- Base: `origin/personal` @ `cd4ad898b`; finalization target `origin/personal`.
- Ticket artifacts are uncommitted in the worktree.

## Files Expected To Change (autobyteus-web)

- `composables/useWorkspaceHistoryTreeState.ts`
- `components/workspace/history/workspaceHistorySectionContracts.ts`
- `components/workspace/history/WorkspaceAgentRunsTreePanel.vue`
- `utils/agentOrgHistoryRows.ts`
- `components/workspace/history/WorkspaceAgentOrgHistoryCollection.vue`
- Tests: new/extended specs per design-spec.md → Tests.

## Constraints / Risks

- Frontend only; do not alter mounted Team, Agent, or delegated Agent row behavior (AC-005).
- Residual non-goal: no auto-reopen of a user-collapsed delegated Team when a hidden member is selected elsewhere.
- Escalate to Solution Designer if server/API or shared contract changes appear necessary.

## Expected Output

Implementation in the worktree + implementation-scoped tests and a rendered check of the Org tree (chevron, collapse via row click, default open), with `implementation-handoff.md`, then continue per the team's handoff rules.

## Route Record

- 2026-09-29: get_handoff_rules matched "Small/Medium + Low" → sent to `/implementation_engineer` (delivered, run `implementation_engineer_8e6e5bbe8a054d4e87d0ddd3ea33a189`).

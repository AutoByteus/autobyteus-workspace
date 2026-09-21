# Solution Handoff

## Result

- Package identifier: `ORG-HISTORY-ROW-TOGGLE-20260920-001`
- Current solution revision: `SR-002`
- Classification: `Architecture Design Complete`
- Task size / architectural risk: `Small / Low`
- Requirements: `Approved` on `SR-001` by the user's initiating request.
- Design: `Ready`
- Intended downstream route: Direct implementation and proportional validation; no independent architecture review unless implementation discovers the recorded escalation trigger.

## Original Request And Goal

The user reported that clicking an Agent Team history row expands/collapses its hierarchy, while an AgentOrg history row only collapses through its left chevron. The requested result is Team-like AgentOrg row behavior: clicking the primary row expands or collapses it.

## Evidence And Root Cause

- Current component: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-row-toggle/autobyteus-web/components/workspace/history/WorkspaceAgentOrgHistoryCollection.vue`
- Current rendered test: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-row-toggle/autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentOrgDisclosure.spec.ts`
- Root cause: component-local `openRun()` only toggles when the run is collapsed; an expanded primary-row click therefore cannot collapse. Exact disclosure/open owners are otherwise correct.
- Comparator: Agent Team row selection/disclosure behavior in `WorkspaceHistoryWorkspaceSection.vue` and `useWorkspaceHistorySelectionActions.ts`.

## Approved Behavior

1. Primary AgentOrg run summary activation toggles the exact run hierarchy in both directions.
2. The existing exact AgentOrg open/select action remains.
3. The dedicated chevron remains disclosure-only.
4. Stop and other secondary controls remain isolated and do not toggle/open.
5. No backend, API, routing identity, persisted data, history content, runtime, or Team behavior changes.

## Design

- Reuse `toggleAgentOrgRun(rootRunId)` on every primary-row activation.
- Retain the subsequent `onOpenAgentOrgRun(run)` delegation.
- Add accurate `aria-expanded` and conditional `aria-controls` to the primary button.
- Update the focused rendered test that currently encodes the one-way defect; preserve chevron, Stop, nested selection, refresh, localization, draft/conversation, and sibling isolation coverage.
- Do not add an outer row handler, generic helper, store/router dependency, or shared abstraction.

## Validation Expectations

- Focused rendered disclosure regression.
- Adjacent workspace-history tests.
- Proportional frontend build/type validation.
- Browser validation using a real AgentOrg history row: row expands, repeated row click collapses, chevron stays independent, Stop does not toggle.

## Workspace And Repository Context

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-row-toggle`
- Branch: `codex/org-history-row-toggle`
- Base: `origin/requirements/flat-agent-organization-model` at `aef459e8474550439e9e34bbbce98b04a3d9b754`
- Finalization target: `origin/requirements/flat-agent-organization-model`
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-row-toggle/tickets/in-progress/org-history-row-toggle`

## Canonical Artifacts

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-row-toggle/tickets/in-progress/org-history-row-toggle/requirements-doc.md`
- Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-row-toggle/tickets/in-progress/org-history-row-toggle/investigation-notes.md`
- Design: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-row-toggle/tickets/in-progress/org-history-row-toggle/design-spec.md`
- Revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-row-toggle/tickets/in-progress/org-history-row-toggle/solution-revision-record.md`
- Bootstrap: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-row-toggle/tickets/in-progress/org-history-row-toggle/bootstrap-handoff.md`

## Constraints, Risks, And Next Expected Output

- Preserve selection-ancestry reveal behavior; newly selected subjects may still be revealed by the existing owner.
- Escalate as Design Impact if the correction requires shared state, routing, backend, persistence, or ownership-boundary changes.
- Expected implementation output: a cumulative `implementation-handoff.md` with source/test evidence and exact validation results.

## Handoff Rule Result

- Rule lookup result: the `Architecture Design Complete` + `Small / Low` direct-implementation rule applies.
- Selected recipient: `/software_engineering_team/implementation_engineer`
- Handoff status: `Prepared`; updated to `Delivered` only after the messaging tool confirms success.

# Investigation Notes — task-team-row-collapse-chevron

## Bootstrap

- Package identifier: `task-team-row-collapse-chevron`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-team-row-collapse-chevron`
- Branch: `codex/task-team-row-collapse-chevron`
- Base: `origin/personal` @ `cd4ad898b` (fetched 2026-09-29; the shared checkout was 11 commits behind, so it was not used)
- Finalization target: `origin/personal`
- User evidence: screenshot `/private/tmp/claude-501/-Users-normy-autobyteus-org-autobyteus-workspace-superrepo/a452c1c2-097b-4d38-bd55-4e5b3fe325bc/images/1.png`
  (Agent Org "Nested Classroom Test Org": mounted `StudentStudyGroup` Team row has a chevron; the delegated
  `StudentStudyGroup — Started by Teacher` row has none, and its members `student one` / `student two` are always shown).

## Evidence

| ID | Source | Observation |
| --- | --- | --- |
| E-001 | `autobyteus-web/components/workspace/history/WorkspaceAgentOrgHistoryCollection.vue` (Org tree, `v-else` branch = `task_team`) | Task-Team row renders an empty `<span class="ml-2 mr-1 h-3.5 w-3.5">` placeholder where the chevron would be; has no `aria-expanded`; click only calls `actions.onInspectAgentOrgExecution(run, coordinatorAgentRunId, coordinatorAddress)`. |
| E-002 | Same file, `kind === 'team'` branch | Mounted Team row renders `heroicons:chevron-down-20-solid` (rotated `-90` when collapsed), sets `aria-expanded`, and its click calls `selectTeam` → `toggleAgentOrgTeam` + `onSelectAgentOrgMember`. |
| E-003 | `autobyteus-web/utils/agentOrgHistoryRows.ts` `projectAgentOrgHistoryRows` / `flattenTaskTeam` | Mounted Team children are emitted only when `isTeamExpanded(address)`. `flattenTaskTeam` always emits the task-Team row followed by all members, nested task Teams (recursive) and nested task executions — no expansion check exists. `AgentOrgHistoryTaskTeamRow` has no expansion field. |
| E-004 | `autobyteus-web/composables/useWorkspaceHistoryTreeState.ts` L54, L151, L340–347, L358–375 | Org Team expansion state is `expandedAgentOrgTeams` keyed by `${rootRunId}::agent-org-team::${address}`, default `false` (collapsed). `revealAgentOrgRunAncestry` expands only configured Team addresses. |
| E-005 | Screenshot + E-004 | A mounted Team and a delegated task Team can share the same address/name (`StudentStudyGroup`); the same address can also be delegated more than once. Address alone is not a unique key for a task-Team row; `teamRunId` is. |
| E-006 | `autobyteus-web/components/workspace/history/WorkspaceTransientExecutionRow.vue` + `WorkspaceTeamExecutionTree.vue` (non-Org team tree) | The standalone Team run tree already gives transient (task) rows a real disclosure `<button data-test="workspace-team-transient-disclosure">` with `aria-expanded`, and hides descendants when collapsed. The gap is Org-tree-only. |
| E-007 | `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentOrgDelegatedRows.spec.ts`, `WorkspaceAgentOrgDisclosure.spec.ts`; `autobyteus-web/tests/e2e/task-agent-monitor-visibility-probe.mjs`, `task-agent-peer-sidebar-probe.mjs` | Existing tests/probes expect task-Team members visible in the Org tree (no collapse step). A default-collapsed task Team would change that visible outcome. |

## Unknowns

- Default expansion state of task-Team rows (user decision; see requirements OQ-001).

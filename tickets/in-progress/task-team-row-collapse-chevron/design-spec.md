# Design Spec — task-team-row-collapse-chevron

- Status: `Complete` (SR-003)
- Requirements basis: `requirements-doc.md` — Approved SR-003 (REQ-001..006, AC-001..005)
- Evidence: `investigation-notes.md` E-001..E-007
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-team-row-collapse-chevron` / `codex/task-team-row-collapse-chevron`; base `origin/personal` @ `cd4ad898b`; finalization target `origin/personal`

## Existing Owners And Path

Agent Org history tree rendering path (frontend only, `autobyteus-web`):

`useWorkspaceHistoryTreeState` (expansion state) → `WorkspaceAgentRunsTreePanel.vue` (binds state into `WorkspaceHistorySectionState`) → `WorkspaceAgentOrgHistoryCollection.vue` (renders rows, handles clicks) → `utils/agentOrgHistoryRows.ts` `projectAgentOrgHistoryRows` (pure projection of the execution tree into flat, depth-annotated rows + branch-line metadata).

The mounted Team row already follows this path end to end (`isAgentOrgTeamExpanded` / `toggleAgentOrgTeam` → `isTeamExpanded` callback to the projector → children skipped when collapsed → chevron + `selectTeam` = toggle + select). The delegated (`task_team`) row is simply missing the same wiring (E-001, E-003). The fix extends each existing owner by the equivalent delta; no new owner, service, or contract outside the web tree.

## Intended Delta (by owner)

### 1. `composables/useWorkspaceHistoryTreeState.ts` — expansion state (REQ-003, REQ-005)

- Add `expandedAgentOrgTaskTeams = ref<Record<string, boolean>>({})`.
- Key: `agentOrgTaskTeamKey(rootRunId, teamRunId) = \`${rootRunId.trim()}::agent-org-task-team::${teamRunId.trim()}\``.
  Keyed by **teamRunId**, not address, because a delegated Team can share its address/name with the mounted Team and the same Team can be delegated more than once (E-005). Separate map from `expandedAgentOrgTeams`, so mounted and delegated state never collide.
- `isAgentOrgTaskTeamExpanded(rootRunId, teamRunId)` → `map[key] ?? true` (default **expanded**, REQ-005).
- `toggleAgentOrgTaskTeam(rootRunId, teamRunId)` → flips that value (immutable spread, same as `toggleAgentOrgTeam`).
- Export both from the composable's return object.
- In-memory only (same lifetime as the existing Org Team map); no persistence (out of scope).

### 2. `components/workspace/history/workspaceHistorySectionContracts.ts` + `WorkspaceAgentRunsTreePanel.vue` — binding

- Add optional `isAgentOrgTaskTeamExpanded?(rootRunId, teamRunId): boolean` and `toggleAgentOrgTaskTeam?(rootRunId, teamRunId): void` to `WorkspaceHistorySectionState`, next to the Org Team pair.
- Bind them from `treeState` in `WorkspaceAgentRunsTreePanel.vue` next to `isAgentOrgTeamExpanded` / `toggleAgentOrgTeam`.

### 3. `utils/agentOrgHistoryRows.ts` — projection (REQ-001, REQ-002)

- `AgentOrgHistoryTaskTeamRow` gains `hasChildren: boolean` and `expanded: boolean`.
- `projectAgentOrgHistoryRows` input gains optional `isTaskTeamExpanded?(teamRunId: string): boolean`; when absent treat as `true` (keeps the existing caller in `services/agentOrgExecution/__tests__/agentOrgContextHydration.spec.ts` valid and preserves default-open semantics).
- Thread the callback through `flattenTask` → `flattenTaskTeam` (e.g. via the existing `source`/an extra parameter; implementer's choice, keep it pure).
- In `flattenTaskTeam`: `hasChildren = team.members.length > 0 || team.taskExecutions.length > 0`; `expanded = isTaskTeamExpanded(team.teamRunId)`. Always emit the task-Team row; emit members, nested task Teams (recursive — nested Teams get their own state by their own `teamRunId`) and nested task executions **only when `!hasChildren || expanded`**.
- Branch lines need no special work: `hasSibling` / `continuingAncestorDepths` are computed over the emitted rows, so collapsed descendants are naturally excluded (same mechanism the mounted Team relies on).
- `coordinatorFor(team)` must still be computed for collapsed rows (it is used by the row click).

### 4. `components/workspace/history/WorkspaceAgentOrgHistoryCollection.vue` — row rendering and click (REQ-001, REQ-004, REQ-006)

In the `task_team` (`v-else`) row:
- Replace the empty placeholder span with the same icon markup as the mounted Team row when `display.row.hasChildren`:
  `<Icon icon="heroicons:chevron-down-20-solid" class="ml-2 mr-1 h-3.5 w-3.5 text-gray-400" :class="display.row.expanded ? '' : '-rotate-90'" />` plus a `data-test="agent-org-task-team-disclosure-<teamRunId>"`; keep the empty placeholder span when `!hasChildren` (alignment unchanged).
- Add `:aria-expanded="display.row.hasChildren ? display.row.expanded : undefined"`.
- Click handler becomes `selectTaskTeam(run, display.row)`:
  `if (row.hasChildren) state.toggleAgentOrgTaskTeam?.(run.rootRunId, row.teamRunId)` then `actions.onInspectAgentOrgExecution?.(run, row.coordinatorAgentRunId, row.coordinatorAddress)` — mirroring `selectTeam` (toggle + select). The whole row is a single `<button>` (as the mounted Team row is), so keyboard Enter/Space activation already works; no nested button needed.
- Pass `isTaskTeamExpanded: (teamRunId) => state.isAgentOrgTaskTeamExpanded?.(run.rootRunId, teamRunId) ?? true` into `rowsFor`.
- Everything else on the row (team icon, label, "Started by" line, `title`, `aria-label`, `data-test` of row) is unchanged (BEH-001 preserved).

## Behavior → Path Mapping

| Req / AC | Path |
| --- | --- |
| REQ-001 / AC-001 | projector sets `hasChildren`/`expanded` → template chevron (down by default) |
| REQ-002 / AC-002 | click → `toggleAgentOrgTaskTeam` → re-projection skips descendants; branch metadata recomputed |
| REQ-003 / AC-003 | separate map keyed by `rootRunId + teamRunId` |
| REQ-004 | `aria-expanded` on the row button; button keyboard activation |
| REQ-005 / AC-001 | `?? true` default in state and projector |
| REQ-006 / AC-004 | `selectTaskTeam` = toggle + `onInspectAgentOrgExecution` |
| AC-005 | mounted Team, Agent, delegated Agent branches untouched |

## Tests (implementation-scoped)

- `utils` projection unit test (new, e.g. `utils/__tests__/agentOrgHistoryRows.spec.ts` or extend an existing Org history spec): with the `taskBearingView` fixture (`services/agentOrgExecution/__tests__/taskBearingOrgFixture`), default → task-Team members present, row `expanded: true`, `hasChildren: true`; with `isTaskTeamExpanded: () => false` → descendants absent and sibling/ancestor branch metadata of remaining rows correct; nested task Team collapse independent of outer.
- `WorkspaceAgentOrgDelegatedRows.spec.ts` (or `WorkspaceAgentOrgDisclosure.spec.ts` which uses the real `useWorkspaceHistoryTreeState`): chevron rendered for the task-Team row, `aria-expanded="true"` initially; clicking the row hides member rows, sets `aria-expanded="false"`, and still calls `onInspectAgentOrgExecution` with the coordinator; a mounted Team with the same address keeps its own state (AC-003).
- Existing specs and the e2e probes that expect visible task-Team members remain valid because default is expanded.

## Design Health

- Root cause: the delegated-Team row was added without the disclosure wiring the mounted Team row has. The fix completes the existing pattern in each owning layer rather than adding special cases in the template.
- No clean-cut removals, no persisted data, no migration, no server/API/contract-package changes (N/A).
- Residual (non-goal): when a member inside a user-collapsed delegated Team becomes selected from elsewhere, the tree does not auto-reopen it (`revealAgentOrgRunAncestry` only handles configured Team addresses). Default is open, so this only occurs after an explicit user collapse.

## Classification

- `task_size`: **Small** — 5 frontend files in one tree feature (state composable, contract type, panel binding, pure projector, one component) + tests; follows an existing in-file pattern.
- `architectural_risk`: **Low** — no new owner/boundary/contract outside the web tree; additive optional fields; default preserves current visible behavior.
- Evidence: E-001..E-006; call sites of `projectAgentOrgHistoryRows` limited to the collection component and one test.
- Escalation trigger: if implementation needs server/API data changes, a shared contract package change, or changes to mounted-Team/Agent row behavior, return to Solution Designer.

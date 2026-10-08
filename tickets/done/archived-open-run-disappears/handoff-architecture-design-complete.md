# Handoff — Architecture Design Complete: `archived-open-run-disappears`

- Result: `Architecture Design Complete`
- From: `/software_engineering_team/solution_designer`, 2026-10-08
- Current solution revision: `SR-003`
- Classification: `task_size=Small`, `architectural_risk=Low` → direct implementation route (no independent architecture review)
- Route applied (`get_handoff_rules`): "Architecture Design Complete with task_size=Small or Medium and architectural_risk=Low" → `/software_engineering_team/implementation_engineer`
- Original caller: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)

## Original request

Delivery open point 3 of `workspace-history-group-archive`: a run archived while open in the middle area stays open and reappears in the Workspaces sidebar as a `local` row, so the archive looks like it failed. User (2026-10-08): "it should disappear". Done when, for each run kind, archiving an open run removes it from the sidebar and the middle area, no `local` row comes back (also after reload), covered by tests and verified by the user in the desktop app.

## Approval basis

Requirements `Approved` at SR-002 by the user on 2026-10-08 ("I think it's now approved." / "Your recommended approach is reasonable."):
- DEC-001 = A: neutral state is the existing `/workspace` empty view for every run kind.
- DEC-002 = A: safety net — a stale chat address of an archived run shows the empty view and creates no row.
- DEC-003 = A: Delete of an open run gets the same close behavior.

## Evidence summary

- Server archive is correct (`archivedAt` set, data kept; listings skip archived runs). Defect is client-only.
- Agent: `pages/chat.vue` re-opens a displayed run whose context was removed by archive cleanup → `local` row; also after window reload.
- Team (incl. member views): no reappearance, but `removeTeamContext` selects another loaded team.
- Agent: `removeRun` selects another loaded agent run.
- Org: already correct (route → `/workspace`).

## Design summary (see `design-spec.md`)

1. `agentContextsStore.removeRun` and `agentTeamContextsStore.removeTeamContext`: clear selection instead of selecting another run.
2. `pages/chat.vue`: when the displayed persisted run's context vanishes (not a promotion, not a temp id) → clear selection and `router.replace({ path: '/workspace' })`. Remove the re-open behavior.
3. `services/runOpen/agentRunOpenCoordinator.ts`: add `ArchivedAgentRunOpenError`; throw it before any context commit when `resumeConfig.modelConfigEditability.reason === 'RUN_ARCHIVED' && !resumeConfig.isActive`. Chat's `ensureRunOpen` maps it to the same leave-to-workspace.
4. Org unchanged; no server/GraphQL/codegen change.

## Acceptance criteria to cover

AC-001..AC-009 in `requirements-doc.md` (agent per-run + Archive all; team + member view; Org regression; reload/restart; running-run guard unchanged; archiving another run leaves the open view; stale archived address; Delete of an open agent/team/Org run).

## Open risks / unknowns

- UNK-001: team open-run archive not yet observed live — include in live validation.
- Specs currently asserting auto-select (`agentContextsStore.spec.ts:141`, `agentTeamContextsStore.spec.ts:136`) must be updated.
- Escalation trigger: another production caller relying on auto-select, or another path removing a displayed persisted agent context → return Design Impact.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/archived-open-run-disappears`
- Branch: `codex/archived-open-run-disappears`
- Base: `origin/personal` @ `3a2496c95b16b0f7e0cedc7afdf615ada00b2267`
- Finalization target: `origin/personal`

## Package (absolute paths)

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/archived-open-run-disappears/tickets/in-progress/archived-open-run-disappears/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/archived-open-run-disappears/tickets/in-progress/archived-open-run-disappears/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/archived-open-run-disappears/tickets/in-progress/archived-open-run-disappears/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/archived-open-run-disappears/tickets/in-progress/archived-open-run-disappears/solution-revision-record.md`
- Architecture review artifacts: `N/A — not applicable` (direct route)
- Supplements / Product design: `N/A — not applicable`

## Expected next action

Implementation Engineer implements per `design-spec.md`, runs implementation-scoped checks per `TESTING.md`, and produces its implementation handoff.

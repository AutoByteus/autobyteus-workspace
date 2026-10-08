# Handoff — Architecture Design Complete (direct implementation route)

- Package identifier: `workspace-history-group-archive`
- Result: `Architecture Design Complete`
- Current SR entry: `SR-003` (revision of the SR-002 package already sent; supersedes it where they differ)
- Classification: `task_size=Medium`, `architectural_risk=Low` (rationale in `design-spec.md` → Task Size And Architectural Risk)
- Route applied: handoff rule "Small or Medium and architectural_risk=Low" → `/software_engineering_team/implementation_engineer` (direct implementation; independent architecture review not applicable). Implementation self-checks, code review rules and executable validation still apply as configured.

## Original request

User, 2026-10-08 (via Project Task from `/project_task_manager`, AgentRun `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`): "The archive should allow me to archive on the group header itself as well … if I change a certain agent's name and all those are invalid anymore, I want to archive all." Clarified: "not just standalone but in general standalone agent team, and agent org … on the group header"; with screenshots of the "Codex (5)" agent header ("its more like a batach archive all the runs underneath right?") and the "English Bridge Team (2)" team header; "the same as agent teams and agent orgs".

## Goal

An "Archive all" icon on every agent, agent team and Agent Org group header in the Workspaces sidebar. **All-or-nothing (SR-003):** if any run of the group is running, nothing is archived and one short message says "Stop running runs first." Otherwise, after a confirmation, it archives all stored runs of that group in that workspace, including standalone runs hidden by the 6-run listing cap. History refreshes once and one short toast reports the result ("Archived 5 runs." / "Archived 4 runs. 1 failed."). Messages must stay short and clean (QR-003).

## Approval basis

- Requirements `Approved` by user 2026-10-08 ("approve"), revised at SR-003 ("exactly. but keep the messages ui clean thanks"). Baseline = `requirements-doc.md` at SR-003: REQ-001..REQ-007, AC-001..AC-010, QR-001..QR-003, DEC-001..DEC-005 (all stored runs; confirmation; **block if any run is running**; no unarchive; no delete-all), ASM-001 (group = one workspace). The section "SR-003 Approved Delta" governs where it differs from the tables above it.
- Behavior-defining supplements: None. Product design: N/A — not requested.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-history-group-archive`
- Branch: `codex/workspace-history-group-archive`
- Base: `origin/personal` @ `4a51482a5ef8c678d69a3ffc995d6876fd170a2f` (fetched 2026-10-08)
- Finalization target: `origin/personal`
- Ticket artifacts are uncommitted in the worktree (no commit made by Solution Designer).

## Artifacts (absolute paths)

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-history-group-archive/tickets/in-progress/workspace-history-group-archive/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-history-group-archive/tickets/in-progress/workspace-history-group-archive/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-history-group-archive/tickets/in-progress/workspace-history-group-archive/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-history-group-archive/tickets/in-progress/workspace-history-group-archive/solution-revision-record.md`
- Architecture review artifacts: N/A — not applicable (direct route)
- Origin request (read-only): `/Users/normy/autobyteus_org/autobyteus-worktrees/run-continuity-after-agent-definition-rename/tickets/in-progress/run-continuity-after-agent-definition-rename/new-ticket-request-group-archive.md`

## Design summary

- Server: `AgentRunHistoryService.archiveStoredAgentRunGroup({ workspaceRootPath, agentDefinitionId })` plus a GraphQL mutation `archiveStoredAgentRunGroup` that returns `archivedRunIds`, `activeRunIds` and `failedRunIds`. A non-empty `activeRunIds` means nothing was archived. It reuses the per-run `catalogService.archiveRun`.
- Web store: extract mutation+cleanup cores from the per-run team/org archive. Add `archiveAgentRunGroup`, `archiveTeamRuns` and `archiveAgentOrgRuns`, each with one refresh.
- Web: a new `useWorkspaceHistoryGroupArchive` composable (running pre-check before the dialog, confirmation, pending, dispatch, short toasts, org route cleanup); header buttons in `WorkspaceHistoryWorkspaceSection.vue` and `WorkspaceAgentOrgHistoryCollection.vue`; contracts, panel wiring and en/zh-CN strings.
- See the design spec for file mapping, interfaces, sequence and test guidance.

## Open risks

- RSK-001: merge overlap with `codex/run-continuity-after-agent-definition-rename` (`WorkspaceAgentOrgHistoryCollection.vue`, standalone run catalog). Whichever lands second rebases onto the other.
- One standalone index flush per archived run. This is accepted for groups of tens of runs.

## SR-003 changes since the first send

- The running-run rule changed from skipping running runs to blocking the whole group (DEC-003, REQ-004/005/007, AC-005/008, AC-010).
- The server result field `skippedActiveRunIds` is replaced by `activeRunIds`, and nothing is archived when it is non-empty.
- The button now shows whenever the group has saved runs.
- QR-003 adds the short, clean message wording.
- The changed design-spec sections are Intended Change, Terminology, DS-003, Interface Boundary Mapping, Examples, Risks and Guidance.

## Next expected action

Implementation Engineer implements per `design-spec.md`, runs the implementation-scoped checks and produces `implementation-handoff.md`.

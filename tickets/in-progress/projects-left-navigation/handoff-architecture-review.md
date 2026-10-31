# Handoff — Architecture Design Complete: projects-left-navigation

- Package: `projects-left-navigation`; Project Task `autobyteus-347` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), delegated by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`).
- From: Solution Designer (run `solution_designer_7591e3d191704d25a3396b3020a41127`). To: architecture reviewer (rule: Large or High).
- Result: `Architecture Design Complete`; task_size **Large**, architectural_risk **High** (new optional persisted field on Agent run metadata, Agent/Team index rows and the Team tree; new GraphQL query and inputs; a new instruction section on every runtime; a run-history → Projects port; a left-panel restructuring). Current revision SR-007.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-left-navigation`, branch `codex/projects-left-navigation`, base `origin/personal` `8faae968997564cf52dc404eb6b6f6a7721d5434`; finalization target `origin/personal`; release only on the user's word.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-left-navigation/tickets/in-progress/projects-left-navigation/`.

## Original request and goal

Give the app a Projects alternative beside Workspaces in the left panel: pick a Project, run any agent or team under it, see its runs and the work they dispatch (scoped to the Project), with the Project's folder as the working folder and the run told its Project. Workspaces stays as it is. Full text: the Task (re-read 2026-10-31, no comments).

## Approval basis

- Requirements: `requirements-doc.md` R4 (SR-005), approved by the user (journey and folder rules; Project choice in New chat; the Product package) and by the Solution Designer within the direction for the remaining decisions (DEC table).
- Behavior-defining supplement: Product UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/projects-left-navigation/ui-ux-spec.md` + VIS-001…VIS-025 (design `0675adca`, integration `1988a503`), confirmed by the user.
- Design: `design-spec.md`, approved by the user 2026-10-31 ("i think your design is good. lets go. basically.").

## Documents

- `requirements-doc.md` (R4), `investigation-notes.md` (E-001…E-036, migration-convention check), `design-spec.md`, `solution-revision-record.md` (SR-001…SR-007), `follow-ups.md` (FU-001…FU-006, not yet sent), `product-design-request.md` (context).

## What the reviewer should look at closely

- Persisted-data decision: `projectId` optional, no migration (design § Persisted Data, guideline checklist answered).
- The run-history ↔ Projects boundary: `ProjectRunLinks` / `RunProjectContextReader` ports bound in `compositions/`; `TaskExecutionResourceService.runLinksOf` as the single owner of Project scope.
- The listing rule: agent groups capped at 6 plus hosts of open Project work; uncapped Team/Org hosts.
- The `Project` section in the shared Carpenter composition and the five backend callers (verify `acp` covers `grok_build`).
- Web restructuring for file size (`RunDefinitionGroups.vue` extraction; `WorkspaceAgentRunsTreePanel.vue` must not grow).

## Open risks

- A copy shown by its run stream before its Task link commits: one-time re-read rule (DS-004).
- Runtimes outside the shared composition would miss the section (none known).

## Expected next step

Independent architecture review; on pass, the reviewer routes to implementation per its rules.

## Re-review request — SR-008 (2026-10-31)

ARCH-REV-001 failed with AR-001…AR-005. This revision answers each finding:

| Finding | Resolution | Where |
| --- | --- | --- |
| AR-001 | `stores/projectRunsProjection.ts` owns the Projects nodes. It reuses `buildRunTreeProjection`, `mergeRunTreeWithLiveContexts` and `buildTeamNodes`, keyed by Project, with the same agent and team contexts, so live status needs no re-read. Ancestry indexes are lists `{projectId, groupKey}`. `useProjectsTreeState` expands the open run in every Project that lists it, and the existing reveal scrolls to it. The store loads all Projects when the mode is shown. | design § Current-State Read, DS-003/DS-004 narratives, Ownership Map, File Mapping, step 5, Examples; E-037 |
| AR-002 | Rule: a copy belongs to P while it holds an open Task of P; with none open, it belongs to the Project of its latest Task. A copy working for P and Q is listed under both. Decided within the direction and recorded. | requirements REQ-008, DEC-013, AC-007; design `runLinksOf` contract, Ownership Map, Examples; E-040 |
| AR-003 | Effective-line counts are recorded. New owned files `stores/chatDraftProjectChoice.ts` and `run-history/services/agent-run-history-row-projector.ts`. The factory has a cap rule. `runHistoryStore.ts` is untouched. FU-006 is withdrawn. | design § Task Design Health, File Mapping, step 1; E-038; follow-ups.md |
| AR-004 | `startedUnderProject` is removed. `executions = runLinksOf(P)[root] ∪ (started under P ? runLinksOf(null)[root] : ∅)`. DS-004 has five explicit triggers, including Temp-task events through `task.root.hostRoot` (E-039) and one re-read per unknown copy key. | design § Interface Boundary Mapping, DS-004 narrative, Tests; E-039 |
| AR-005 | The dependency rule is reworded: new code goes through the ports, and the existing imports stay. The Team owner is named (`TeamRunService.createTeamRun` 112 → `AgentTeamRunManager.createTeamRun` 126–140). `RunProjectContextReader` is placed in `agent-execution/domain/run-project-context.ts`. An invalid `projectId` is dropped and logged. | design § Dependency Rules, Ownership Map, File Mapping, Persisted Data; E-040 |

Current documents: `requirements-doc.md` (R4 with REQ-008 refined, SR-008), `investigation-notes.md` (E-001…E-040), `design-spec.md` (SR-008), `solution-revision-record.md` (SR-001…SR-008) and `follow-ups.md` (FU-001…FU-005; FU-006 withdrawn).

The classification is unchanged: Large / High.

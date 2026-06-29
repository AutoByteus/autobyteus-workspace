# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Design-impact reroute investigated; requirements/design correction completed for re-review
- Investigation Goal: Correct the active task UI container after browser review showed the previous design placed the task context in the wrong left surface.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: Frontend component/data-composition change with cleanup of wrongly introduced cross-surface coupling.
- Scope Summary: Preserve the Team active-task master/detail UI and insert responsible agent/team/member context into each task navigator item, while removing the wrong global Workspaces-tree embedding.
- Primary Questions Resolved: The authoritative host is `TeamActiveTasksSection`, not the global Workspaces tree. The global tree must not render task summaries, references, or technical details.

## Request Context

The user requested a more live task UI by showing the responsible agent/team and members directly under the active task summary/short description, using the same small status-dot visual language as the Workspaces tree. Through clarification, the intended hierarchy is:

```text
Task summary / short description        ← text only; click shows content on right

● Software Engineering Team             ← no indent; responsible agent/team row; status dot
  ● solution_designer                   ← member row; status dot
  ● architecture_reviewer               ← member row; status dot
  ● implementation_engineer             ← member row; status dot

  References                            ← file names stay on the left
    file-a.md                           ← click opens content/preview on right
    screenshot.png

  Technical details                     ← compact/collapsed metadata on the left
```

Important clarified meaning: “left side” means the left navigator column of the existing active task master/detail UI, not the global Workspaces/run-history tree.

Reference image for status-dot style: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_05adf8f38e4b4ed1802251c8b346d606/solution_designer_52e7f4f1caf343ccac2ab0dd0c2a946b/context_files/ctx_0604b708d182__image.png`.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context/tickets/in-progress/task-left-panel-team-context`
- Current Branch: `codex/task-left-panel-team-context`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin` succeeded on 2026-06-29.
- Task Branch: `codex/task-left-panel-team-context`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: This is a reroute correction. Previous implementation matched the earlier reviewed design, but the earlier reviewed design used the wrong host container.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-29 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch` | Resolve repo and branch state before investigation | Dedicated task worktree is `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context` on `codex/task-left-panel-team-context` | No |
| 2026-06-29 | Code | `autobyteus-web/components/AppLeftPanel.vue` | Locate global left panel owner | Left app shell hosts primary navigation plus Workspaces tree | No |
| 2026-06-29 | Code | `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | Locate global Workspaces tree orchestration | Wrong implementation added active-task bindings here; corrected design must remove those | Yes |
| 2026-06-29 | Code | `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Locate global Workspaces tree row renderer | Wrong implementation rendered `TeamActiveTaskContextTree` under expanded live team runs; corrected design forbids this host | Yes |
| 2026-06-29 | Code | `autobyteus-web/components/workspace/history/workspaceHistorySectionContracts.ts` | Locate global tree props/contracts | Wrong implementation added active-task contract surface; corrected design removes it | Yes |
| 2026-06-29 | Code | `autobyteus-web/components/workspace/team/TeamOverviewPanel.vue` | Locate Team tab owner | Hosts Messages and `TeamActiveTasksSection`; should remain the shell for team task UI | Yes |
| 2026-06-29 | Code | `autobyteus-web/components/workspace/team/TeamActiveTasksSection.vue` | Locate active task UI owner | Baseline component already had the intended left navigator/right detail split; corrected design restores this owner and changes row content/order | Yes |
| 2026-06-29 | Code | `origin/personal:autobyteus-web/components/workspace/team/TeamActiveTasksSection.vue` | Compare pre-change task UI | Original active task UI already rendered a split with left task rows and right detail/reference preview | Yes |
| 2026-06-29 | Code | `origin/personal:autobyteus-web/components/workspace/team/TeamActiveTaskRow.vue` | Compare pre-change left task row | Original row rendered target/status chip, description, and reference rows, but not the requested responsible agent/team/member status-dot hierarchy | Yes |
| 2026-06-29 | Code | `autobyteus-web/utils/teamActiveTaskEntries.ts` | Verify data source | `ActiveTaskEntry` already has description, target kind/name, status/status label, references, task IDs/arguments, and task-team members | No |
| 2026-06-29 | Code | `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` and `autobyteus-web/composables/useWorkspaceHistoryTreeState.ts` | Verify status-dot visual semantics | Workspaces tree uses tiny circular dots with blue animated running, green idle, amber initializing, red error, gray offline/inactive | No |
| 2026-06-29 | Code | `autobyteus-web/components/workspace/team/TeamActiveTaskContextTree.vue` | Inspect wrong implementation component | Row structure is close to requested hierarchy but was mounted in the wrong global-tree host and coupled to cross-surface selection | Yes |
| 2026-06-29 | Code | `autobyteus-web/stores/teamActiveTaskSelectionStore.ts`, `teamOverviewSectionStore.ts`, `composables/useTeamActiveTaskRightDetailActivation.ts` | Inspect wrong cross-surface coordination | These were needed only because the previous design split navigation into global tree and detail into Team tab; corrected design can use local section state | Yes |
| 2026-06-29 | Doc | `api-e2e-design-impact-reroute.md` | Review reroute classification | Reroute correctly classified mismatch as design/requirements impact, not bounded implementation bug | No |
| 2026-06-29 | Image | `browser-evidence/design-impact-current-browser-ui.png` | Inspect current browser state | Active-task block appears deeply embedded in global Workspaces tree; center shows focused subteam/composer; right Team tab shows task detail | No |
| 2026-06-29 | Image | `ctx_6d1f64063a16__image.png` | Inspect user-reviewed browser state | Shows global-tree active-task block and Teams section collapsed/visible mismatch; confirms container confusion | No |
| 2026-06-29 | Image | `ctx_38352508f924__image.png` | Inspect previous/baseline browser context | Shows Team tab active Tasks detail on right while global Workspaces list is separate; supports keeping task UI in Team active-task surface | No |
| 2026-06-29 | Other | User clarification in chat with exact desired hierarchy | Resolve product intent | User explicitly stated the UI should mostly keep the task interface and only insert agent/team context below each task summary before references/technical details | No |

## Current Behavior / Current Flow

### Baseline Task UI Before Wrong Design

- `TeamOverviewPanel.vue` hosts Messages and `TeamActiveTasksSection.vue` inside the Team tab.
- `TeamActiveTasksSection.vue` derives `ActiveTaskEntry[]` from `deriveActiveTaskEntries(teamContext)`.
- It renders a left active-task navigator and a right detail pane.
- The old left row had task/target info and reference file names; clicking a reference opened `TeamTaskReferenceViewer` on the right.
- Technical details lived in the right detail pane.

### Wrong Implemented Flow On Current Task Branch

- `WorkspaceAgentRunsTreePanel.vue` computes/provides active-task bindings.
- `WorkspaceHistoryWorkspaceSection.vue` renders `TeamActiveTaskContextTree` under expanded live team runs in the global Workspaces tree.
- `teamActiveTaskSelectionStore.ts`, `teamOverviewSectionStore.ts`, and `useTeamActiveTaskRightDetailActivation.ts` coordinate selection/activation across global left tree and right Team tab.
- Browser evidence shows this produces a confusing UI: active task navigation inside global Workspaces tree, center focused subteam/composer, and right Team Messages/Tasks detail.

### Corrected Target Flow

- `TeamOverviewPanel.vue` continues to host the Team Messages/Tasks shell.
- `TeamActiveTasksSection.vue` owns the active task master/detail split and local selected task/reference state.
- The left navigator item renders the exact required order: summary -> responsible agent/team -> members -> references -> technical details.
- The right detail pane renders selected task body or selected reference content/preview.
- The global Workspaces tree renders no active-task summary blocks, reference rows, or technical details.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature / behavior change with reroute correction
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue / File Placement Or Responsibility Drift
- Refactor posture evidence summary: Corrected implementation must undo wrong cross-surface coordination and restore active-task ownership to the Team active-task section.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User hierarchy clarification | User placed responsible team/members between task summary and references | This is a row-content/order change within the task navigator | No |
| `origin/personal:TeamActiveTasksSection.vue` | Existing task UI already has left navigator/right detail split | Reuse/restore this owner instead of creating a global-tree host | Yes |
| Current branch screenshot | Active-task block in Workspaces tree is visually wrong and confusing | Remove global-tree active-task embedding | Yes |
| `teamActiveTaskEntries.ts` | Existing projection contains needed data | Backend changes are not expected | No |
| Status-dot work tree code | Existing tiny-dot semantics are available | Extract/reuse status-dot presentation without moving task ownership into the tree | Yes |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/workspace/team/TeamOverviewPanel.vue` | Team tab shell for Messages and active Tasks | Correct high-level container for task UI | Keep; avoid broad cross-surface controller responsibilities |
| `autobyteus-web/components/workspace/team/TeamActiveTasksSection.vue` | Active task section | Correct owner for task split layout and selected task/reference state | Restore/enhance as master/detail coordinator |
| `autobyteus-web/components/workspace/team/TeamActiveTaskContextTree.vue` | Wrong implementation's row renderer | Row hierarchy is useful, host/coupling is wrong | Rename/repurpose under Team active-task navigator or replace with clearer file |
| `autobyteus-web/components/workspace/team/TeamActiveTaskDetailPane.vue` | Wrong implementation's right detail pane | Useful detail rendering, but should not own global-store selection | Make pure props-driven detail pane |
| `autobyteus-web/utils/teamActiveTaskEntries.ts` | Active task entry projection | Has needed task/actor/member/reference/metadata fields | Reuse as data source |
| `autobyteus-web/utils/teamActiveTaskTechnicalDetails.ts` | Technical metadata projection | Useful extraction from wrong implementation | Keep and use for left compact details |
| `autobyteus-web/components/workspace/common/StatusDot.vue` | Shared status-dot display | Useful extraction from wrong implementation | Keep if dependency is UI-only and reusable |
| `autobyteus-web/utils/workspaceStatusDotPresentation.ts` | Shared status-dot class mapping | Useful extraction from Workspaces tree semantics | Keep; status semantics must not duplicate |
| `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | Global Workspaces tree orchestrator | Wrong implementation added active task bindings | Remove active-task knowledge/imports |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Global Workspaces tree renderer | Wrong implementation rendered active-task context | Remove active-task rendering |
| `autobyteus-web/components/workspace/history/workspaceHistorySectionContracts.ts` | Global tree contract types | Wrong implementation added active-task contract | Remove active-task contract |
| `autobyteus-web/stores/teamActiveTaskSelectionStore.ts` | Wrong cross-surface selection store | Only needed because selection left global tree and detail right Team tab were separated | Remove unless a remaining same-section need is proven |
| `autobyteus-web/stores/teamOverviewSectionStore.ts` | Wrong cross-surface section visibility store | Only needed for global-tree clicks opening Team tasks | Remove/revert unless another caller needs it |
| `autobyteus-web/composables/useTeamActiveTaskRightDetailActivation.ts` | Wrong cross-surface activation command | Only needed for global-tree task/ref clicks | Remove |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-29 | Browser smoke evidence from API/E2E | `http://127.0.0.1:3010/workspace` with `Nested Classroom Test Team` fixture | Current branch displays active task context under global Workspaces tree | Confirms corrected design must be re-routed before delivery |

## External / Public Source Findings

None.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: API/E2E used the `Nested Classroom Test Team` fixture and frontend at `http://127.0.0.1:3010/workspace`.
- Required config, feature flags, env vars, or accounts: None identified for design correction.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation from `origin/personal` during original bootstrap.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

- The user's requested hierarchy maps naturally to the existing active task navigator row, not to the global Workspaces tree.
- The old `TeamActiveTasksSection.vue` already had the left/right task split; the corrected implementation should restore that architecture and adjust row content/order.
- The wrong implementation's `TeamActiveTaskContextTree.vue` contains useful row-level rendering ideas but must not be hosted by history components or depend on cross-surface selection stores.
- Shared status-dot extraction is still valuable as a presentation reuse, provided it remains independent of history/task stores.
- Technical detail projection extraction is still valuable; technical details should render in the left navigator below references.
- Cross-surface stores/composables introduced for global tree -> right Team activation are now design debt for this corrected scope.

## Constraints / Dependencies / Compatibility Facts

- Clean-cut correction is required: do not keep both the wrong global-tree active-task UI and the corrected task-navigator UI.
- The global Workspaces tree may reuse shared dot components but must not depend on active task entries or selection.
- The right detail pane should not duplicate actor/member roster or left-side technical details.
- Task-summary/reference clicks must not focus the center subteam/composer; explicit actor/member row clicks may reuse existing focus behavior.
- Existing unit tests for Team active tasks and Workspaces tree should be updated to verify both positive row hierarchy and negative global-tree absence.

## Open Unknowns / Risks

- Visual density of long task descriptions plus member rows plus reference rows in a narrow navigator needs browser verification.
- If the existing Team Messages/Tasks shell remains collapsed on Messages by default, product may later choose a default-active Tasks behavior; this is separate from the corrected host/container requirement.
- If actor runtime status and task execution status diverge, the compact actor/team/member rows should show actor runtime status while the right detail may show task execution status text.

## Notes For Architect Reviewer

Please review this as a material design correction. The prior approved design used the wrong host container. The corrected design should be evaluated for:

- whether `TeamActiveTasksSection` is the clear owner of task navigation/detail state;
- whether global Workspaces tree active-task coupling is fully removed;
- whether the exact row order is unambiguous;
- whether cross-surface stores/composables introduced by the wrong design are removed unless a remaining concrete need is proven.

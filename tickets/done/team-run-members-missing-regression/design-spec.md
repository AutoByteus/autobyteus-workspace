# Design Spec

## Current-State Read

The reproduced Electron-backend path returns the correct team-run topology: the active Software Engineering Team run `team_software-engineering-team_b8abf03c` contains all six members in both GraphQL `memberTree` and `members`. The UI still shows only `solution_designer` after the team row is selected.

Current frontend projection path:

1. `WorkspaceAgentRunsTreePanel.vue` fetches persisted history and live contexts through `runHistoryStore`.
2. `runHistoryStore.getTeamNodes(...)` calls `buildRunHistoryTeamNodes(...)`.
3. `buildTeamNodes(...)` merges persisted `TeamRunHistoryItem`s with local/live `AgentTeamContext`s.
4. For live contexts, `buildTeamRowsFromContext(...)` in `runHistoryTeamRows.ts` builds rows from `teamContext.memberTree`.
5. Current code filters that member tree with `filterActiveExecutionMemberTree(...)`, which delegates to `isActiveExecutionMemberNode(...)` in `teamActiveExecutionMembers.ts`.
6. Because only the coordinator/current entry member is active for the reproduced run, the roster row projection collapses to `solution_designer`.
7. `TeamGridView.vue` and `TeamSpotlightView.vue` also render from `flattenActiveExecutionMemberNodesForDisplay(...)`, so their visual member displays are activity-filtered instead of roster-based.

The recent runtime-tool MCP unification ticket introduced a valid active-execution projection for task-agent safety, but current code uses that projection above its authoritative boundary. Team roster/topology and active execution are different subjects: roster answers “who is on this team?”, while active execution answers “which member/task-agent is currently eligible as execution/focus/composer target?”.

## Intended Change

Restore full team-member roster display by separating frontend projection ownership:

- Roster/topology display paths render all logical team members and subteam nodes from the authoritative `memberTree`.
- Active-execution paths continue to use active-execution filtering only for task-agent activity, safe focus fallback, and composer/send targeting.

No backend data contract change is needed for the reproduced bug.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence: Backend GraphQL returns six members; `runHistoryTeamRows.ts`, `TeamGridView.vue`, and `TeamSpotlightView.vue` filter display through active-execution helpers. Prior runtime-tool MCP unification design required active execution and roster/topology projections to be separate.
- Design response: Reassert two projection boundaries: `teamDefinitionMembers.ts`/`memberTree` owns roster topology display; `teamActiveExecutionMembers.ts` owns execution-target filtering only.
- Refactor rationale: A local line edit that merely special-cases Software Engineering Team would preserve the boundary violation and risk future member-display regressions. The in-scope refactor is small but necessary: move each caller to the correct projection owner and rename/remove any local roster filter that hides topology.
- Intentional deferrals and residual risk, if any: Deeper UX distinction between “selected roster member” and “composer execution target” can be refined later if product wants inactive member selection to show historical/readonly details. This fix must at least avoid hiding members and avoid changing send target safety semantics.

## Terminology

- `Roster/topology projection`: the complete logical tree of team members/subteams from a run's `memberTree` or team definition metadata.
- `Active-execution projection`: a filtered view of currently active execution subjects: coordinator/directly active members and transient task-agent instances, excluding stale task-only logical workers.
- `Task-agent instance`: a transient concrete runtime spawned for delegated task execution.

## Design Reading Order

Read this design from projection ownership first, then caller mapping, then validation.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove/decommission roster filtering from `buildTeamRowsFromContext(...)`; do not keep a dual roster path that chooses active-only vs full roster by team type or flag.
- The active-execution helper itself is not legacy; it remains in scope for its proper owner.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User clicks a Software Engineering Team run row | Full team roster appears in history/team workspace member displays | Frontend team roster projection | This is the failing user path. |
| DS-002 | Primary End-to-End | User sends/types in selected team run | Message targets the safe active-execution member, not a stale task-only logical worker | Active execution target projection | Preserves task-agent safety from the prior ticket. |
| DS-003 | Bounded Local | Team workspace Grid/Spotlight renders member tiles | All topology nodes render, ordered/marked by roster focus | Team workspace roster views | Prevents inactive/unmessaged members from disappearing. |
| DS-004 | Bounded Local | Task-agent activity bar renders | Only active transient task-agent entities render | Task-agent activity bar | Keeps activity-only UI separate from roster UI. |

## Primary Execution Spine(s)

- DS-001: `Workspace history row click -> openTeamRun hydration -> AgentTeamContext.memberTree -> roster row builder -> history tree/team workspace display -> all team members visible`
- DS-002: `Team composer/send -> activeContextStore -> agentTeamContextsStore.activeExecutionFocusedMember* -> agentTeamRunStore.sendMessageToFocusedMember -> backend team run target`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | When a run row is clicked, the frontend hydrates or reuses a team context. Display surfaces must render the authoritative topology tree, not infer roster membership from current runtime activity. | Workspace history, team run context, roster row projection, team workspace member views | Frontend team roster projection | Avatar/status formatting, workspace path resolution |
| DS-002 | Sending to a team still goes through the active-execution focus boundary so stale task-only worker routes cannot become composer targets. | Active context store, active-execution focus getter, team run store | Active execution target projection | Task-agent preview suppression, historical hydration |
| DS-003 | Grid/Spotlight visual modes flatten the complete roster tree and display every logical member/subteam even if a member has no messages yet. | Team workspace views, roster topology flattening, member tiles | Team workspace roster views | Tile preview contents and status badges |
| DS-004 | Task-agent activity UI deliberately filters to currently active task-agent instances and remains separate from team roster display. | Task-agent activity bar, active-execution flattening | Task-agent activity bar | Pending approval actions |

## Spine Actors / Main-Line Nodes

- `WorkspaceAgentRunsTreePanel` / `WorkspaceHistoryWorkspaceSection`: user-visible history/team rows.
- `runHistoryStore` / `buildRunHistoryTeamNodes`: read model owner that composes persisted history and live contexts.
- `buildTeamRowsFromContext`: live team-context to roster-row converter.
- `TeamGridView` and `TeamSpotlightView`: team workspace roster display surfaces.
- `teamActiveExecutionMembers.ts`: active-execution filter and safe focus fallback.
- `activeContextStore` / `agentTeamRunStore`: execution-target/send boundary.

## Ownership Map

- `runHistoryTeamRows.ts` owns conversion of team run history/live context into **roster rows** for the workspace history tree. It must not decide execution eligibility.
- `teamDefinitionMembers.ts` owns generic topology flattening. It is the correct reusable owner for complete roster display.
- `TeamGridView.vue` and `TeamSpotlightView.vue` own roster visualization, ordering, and selection emission. They must not hide members because they are inactive.
- `teamActiveExecutionMembers.ts` owns active-execution inclusion and focus fallback. It may answer “who is currently active/safe to target?”, not “who is a member of the team?”.
- `activeContextStore.ts` and `agentTeamRunStore.ts` own composer/send targeting through active-execution focused context.
- `TeamTaskAgentActivityBar.vue` owns active task-agent activity visualization and may keep active-execution filtering.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `WorkspaceAgentRunsTreePanel.vue` | `runHistoryStore` read model and selection actions | UI entrypoint for workspace/run selection | Roster filtering policy |
| `TeamWorkspaceView.vue` | Team workspace view mode components + active context store | Coordinates header, mode switch, composer, and active task-agent bar | Mixing roster membership with composer target policy |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `filterActiveExecutionMemberTree(...)` in `runHistoryTeamRows.ts` | It applies execution filtering inside a roster-row builder. | Direct use of `teamContext.memberTree` for structured live contexts; fallback from leaf contexts remains only for unstructured legacy-like contexts if still needed by current type guards. | In This Change | Remove the local helper and unused active-execution import. |
| Active-execution flattening in `TeamGridView.vue` display entries | Grid is a roster visualization, not an activity-only list. | `flattenTeamMemberNodesForDisplay(props.teamContext.memberTree)` from `teamDefinitionMembers.ts`. | In This Change | Keep member context lookup/status preview logic. |
| Active-execution flattening in `TeamSpotlightView.vue` display entries | Spotlight is a roster visualization with a primary focused slot. | `flattenTeamMemberNodesForDisplay(...).map(entry => entry.node)`. | In This Change | Ordering should use roster focus; composer target stays active-execution-controlled elsewhere. |
| Tests expecting live team roster rows to collapse to coordinator only | That expectation encodes the regression. | New tests expecting all roster members plus separate active-execution focus behavior. | In This Change | Replace, do not keep dual expectations. |

## Return Or Event Spine(s) (If Applicable)

- Runtime stream events and task-agent events are out of scope except where existing active-execution filtering consumes them for safe focus and task-agent activity UI.

## Bounded Local / Internal Spines (If Applicable)

- Roster flattening: `memberTree -> flattenTeamMemberNodesForDisplay -> TeamMemberMonitorTile rows/tiles`.
- Active execution filtering: `memberTree + leaf contexts + task-agent identity -> flattenActiveExecutionMemberNodesForDisplay / resolveActiveExecutionFocusedMemberRouteKey -> composer target and task-agent activity`.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Avatar/display-name presentation | DS-001, DS-003 | Roster display surfaces | Show human-readable labels/avatars | Visual polish | Could obscure roster projection if it filters data. |
| Runtime status normalization | DS-001, DS-003 | Roster row/tile display | Show member statuses | Users need state cues | Could become membership inclusion policy if misused. |
| Task-agent work packet preview suppression | DS-002, DS-004 | Active execution + tile preview | Avoid showing task-agent activation packet as logical member conversation | Preserves task-agent UX semantics | If used as roster filter, hides members. |
| Historical projection hydration | DS-001, DS-003 | Team run open/roster detail | Lazy-load member conversation/activity | Performance | Could be mistaken for roster existence. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Complete roster flattening | `utils/teamDefinitionMembers.ts` | Reuse | `flattenTeamMemberNodesForDisplay` already preserves full topology recursively. | N/A |
| Active execution filtering | `utils/teamActiveExecutionMembers.ts` | Reuse but narrow callers | Existing helper correctly owns task-agent/stale worker execution semantics. | N/A |
| History row read model | `stores/runHistoryTeamRows.ts` | Extend/repair | Correct owner for tree rows; must stop filtering roster. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend run-history read model | Team run tree node/row projection | DS-001 | Workspace history tree | Extend/repair | Restore full roster rows from live contexts. |
| Frontend team workspace views | Grid/Spotlight roster visualization | DS-003 | Team workspace | Extend/repair | Use topology flattening. |
| Frontend active execution | Composer target safety and task-agent activity | DS-002, DS-004 | Active context/store and task-agent activity bar | Reuse/narrow | Keep but do not feed roster surfaces. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/runHistoryTeamRows.ts` | Run-history read model | Roster row converter | Convert history/live team data into `TeamMemberTreeRow` roster rows | Existing owner; only misuse must be removed | `TeamMemberNode`, `TeamRunMetadataMember` |
| `autobyteus-web/components/workspace/team/TeamGridView.vue` | Team workspace views | Grid roster view | Render all topology entries as tiles | Existing view owner | `flattenTeamMemberNodesForDisplay` |
| `autobyteus-web/components/workspace/team/TeamSpotlightView.vue` | Team workspace views | Spotlight roster view | Render all topology entries with primary focused entry | Existing view owner | `flattenTeamMemberNodesForDisplay` |
| `autobyteus-web/utils/teamActiveExecutionMembers.ts` | Active execution | Execution filter | Keep active task-agent/stale worker filter | Existing owner | N/A |
| Focused tests | Validation | Regression coverage | Protect roster vs active execution split | Existing test suites already cover these files | Test fixtures |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Recursive roster flattening | Existing `utils/teamDefinitionMembers.ts` | Team definition/topology utilities | Already shared by roster surfaces | Yes | Yes | Active execution filter |
| Active execution filtering | Existing `utils/teamActiveExecutionMembers.ts` | Active execution utilities | Already shared by safe focus/task-agent surfaces | Yes | Yes | Roster/topology source |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `TeamMemberNode` / `memberTree` | Yes | N/A | Low | Treat as topology, not activity-filtered result. |
| `TeamMemberTreeRow` | Yes | N/A | Medium | Ensure rows represent roster rows; status fields may reflect activity but must not decide inclusion. |
| Active execution entries | Yes | N/A | Medium | Keep named and consumed as execution entries only. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/runHistoryTeamRows.ts` | Run-history read model | Roster row converter | Build full `TeamMemberTreeRow` tree from persisted/live topology, overlaying statuses when available | Single conversion concern | `TeamMemberNode`, metadata types |
| `autobyteus-web/components/workspace/team/TeamGridView.vue` | Team workspace views | Grid roster display | Display all topology entries as selectable member tiles | Single UI mode | `flattenTeamMemberNodesForDisplay` |
| `autobyteus-web/components/workspace/team/TeamSpotlightView.vue` | Team workspace views | Spotlight roster display | Display all topology entries with focused member first | Single UI mode | `flattenTeamMemberNodesForDisplay` |
| `autobyteus-web/utils/teamActiveExecutionMembers.ts` | Active execution | Execution filter | Compute active execution entries and safe execution focus | Single execution-target concern | N/A |
| `autobyteus-web/components/workspace/team/TeamTaskAgentActivityBar.vue` | Active execution UI | Task-agent activity display | Render active transient task agents and approvals | Activity-specific UI | `flattenActiveExecutionMemberNodesForDisplay` |

## Ownership Boundaries

The authoritative roster boundary is the run/team topology (`memberTree`) and topology utilities. The authoritative execution-target boundary is `teamActiveExecutionMembers.ts` plus `activeExecutionFocusedMember*` getters. Callers must not mix these levels: a roster caller cannot ask the execution boundary for its display list, and a composer caller cannot target arbitrary roster rows without active-execution normalization.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| Roster/topology projection (`memberTree` + `flattenTeamMemberNodesForDisplay`) | Recursive topology traversal | History rows, Grid, Spotlight, roster panels | Calling `flattenActiveExecutionMemberNodesForDisplay` to decide roster membership | Add a roster-specific helper/name, not activity filtering |
| Active execution projection (`teamActiveExecutionMembers.ts`) | Task-agent/stale worker filtering and safe focus fallback | Composer target, active task-agent activity, active execution header if needed | Using roster `memberTree` directly as send target | Strengthen execution-target API |

## Dependency Rules

- Roster display code may depend on `teamDefinitionMembers.ts` and member status/context lookups.
- Roster display code must not depend on `isActiveExecutionMemberNode` or `flattenActiveExecutionMemberNodesForDisplay` for inclusion.
- Composer/send/interrupt code must continue to depend on `activeExecutionFocusedMember*`, not arbitrary clicked roster row state.
- Task-agent activity code may depend on active-execution filtering.
- Backend should not add an alternate roster endpoint for this bug; the existing GraphQL fields are sufficient.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `buildTeamRowsFromContext(teamContext, ...)` | Roster row projection | Convert full live team topology into rows | `AgentTeamContext.teamRunId`, `TeamMemberNode.memberRouteKey` | Should include inactive members. |
| `flattenTeamMemberNodesForDisplay(memberTree)` | Topology flattening | Flatten complete roster recursively | `TeamMemberNode.memberRouteKey` | Correct for Grid/Spotlight display. |
| `flattenActiveExecutionMemberNodesForDisplay(teamContext)` | Active execution projection | Return active execution entries only | `AgentTeamContext` + task-agent metadata | Correct for activity/safe target only. |
| `activeExecutionFocusedMemberRouteKey` getter | Execution target | Resolve safe target route key | Current selected team context | Must not be used as the full roster list. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `buildTeamRowsFromContext` | No, currently roster + active filtering | Yes | Medium | Remove active filter. |
| `TeamGridView.displayEntries` | No, currently roster UI + active filter | Yes | Medium | Use topology flattening. |
| `TeamSpotlightView.displayEntries` | No, currently roster UI + active filter | Yes | Medium | Use topology flattening. |
| Active context send path | Yes | Yes | Low | Preserve. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Team roster | `memberTree` / `flattenTeamMemberNodesForDisplay` | Yes | Low | Use in roster displays. |
| Active execution | `flattenActiveExecutionMemberNodesForDisplay` | Yes | Medium | Restrict caller set to active-execution surfaces. |
| History row members | `TeamMemberTreeRow` | Yes | Medium | Clarify by tests that rows include roster members. |

## Applied Patterns (If Any)

- Projection split: two derived read models from the same `AgentTeamContext`, each with a different owner and purpose.
- Adapter/mapper: `runHistoryTeamRows.ts` maps live/persisted team data into workspace tree rows.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/runHistoryTeamRows.ts` | File | Run-history roster rows | Build full member rows from history/live contexts | Existing run-history read model file | Active-execution membership filters |
| `autobyteus-web/components/workspace/team/TeamGridView.vue` | File | Team grid roster view | Render all roster/topology member tiles | Existing component | Activity-only display membership logic |
| `autobyteus-web/components/workspace/team/TeamSpotlightView.vue` | File | Team spotlight roster view | Render all roster/topology member tiles with primary focus ordering | Existing component | Activity-only display membership logic |
| `autobyteus-web/utils/teamActiveExecutionMembers.ts` | File | Active execution projection | Keep task-agent/stale worker execution filtering | Existing active-execution utility | General roster flattening responsibility |
| `autobyteus-web/stores/__tests__/runHistoryTeamRows.spec.ts` | File | Unit tests | Add live-context full roster regression | Existing store tests | N/A |
| `autobyteus-web/components/workspace/team/__tests__/TeamGridView.spec.ts` | File | Component tests | Update/add roster display expectations | Existing view tests | N/A |
| `autobyteus-web/components/workspace/team/__tests__/TeamSpotlightView.spec.ts` | File | Component tests | Update/add roster display expectations | Existing view tests | N/A |
| `autobyteus-web/utils/__tests__/teamActiveExecutionMembers.spec.ts` | File | Active execution tests | Preserve active execution expectations | Existing utility tests | Roster expectations |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-web/stores` | Main-Line frontend read model/state | Yes | Low | Existing placement remains valid. |
| `autobyteus-web/components/workspace/team` | UI projection components | Yes | Low | Existing components own visual modes. |
| `autobyteus-web/utils` | Shared frontend utilities | Yes | Medium | Keep utility semantics tight by subject: topology vs active execution. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| History tree roster | `sourceTree = teamContext.memberTree` for structured contexts | `sourceTree = filterActiveExecutionMemberTree(teamContext, teamContext.memberTree)` | The first answers membership; the second answers activity. |
| Grid display | `flattenTeamMemberNodesForDisplay(props.teamContext.memberTree)` | `flattenActiveExecutionMemberNodesForDisplay(props.teamContext)` | Grid should show all members. |
| Composer target | `activeExecutionFocusedMemberRouteKey` | clicked inactive roster member route without normalization | Preserves task-agent/stale route safety. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Backend fallback endpoint for team roster | Could hide frontend bug by fetching definition separately | Rejected | Use existing `memberTree` already returned by backend. |
| Flag to toggle active-only vs full roster rows | Could preserve prior task-agent behavior | Rejected | Separate roster display and active execution callers. |
| Special-case Software Engineering Team | Fast local fix | Rejected | General projection-boundary fix. |

## Derived Layering (If Useful)

- Backend GraphQL/history layer: supplies authoritative team-run metadata.
- Frontend read model layer: builds roster rows from metadata/live context.
- Frontend UI layer: renders roster/topology or activity-specific views.
- Frontend execution layer: resolves safe send/composer target.

## Migration / Refactor Sequence

1. Update `runHistoryTeamRows.ts`:
   - Remove `filterActiveExecutionMemberTree(...)` and the `isActiveExecutionMemberNode` import.
   - For structured live contexts, use `teamContext.memberTree` directly as the source tree.
   - Keep the unstructured map fallback only as a shape fallback, not as active filtering.
2. Update `TeamGridView.vue`:
   - Import `flattenTeamMemberNodesForDisplay` from `teamDefinitionMembers.ts`.
   - Render `displayEntries` from full topology.
3. Update `TeamSpotlightView.vue`:
   - Import/use topology flattening.
   - Keep primary ordering by `focusedMemberRouteKey`; implementation should decide whether that prop should be `teamContext.focusedMemberRouteKey` for visual roster focus while the composer remains active-execution-targeted through stores.
4. Keep `teamActiveExecutionMembers.ts` and active execution getters unchanged except for any needed test naming/import cleanup.
5. Update tests:
   - Replace tests that expect active-only roster rows with tests expecting full roster rows.
   - Preserve tests for `resolveActiveExecutionFocusedMemberRouteKey`, task-agent-only preview suppression, and task-agent activity behavior.
6. Validate:
   - Run focused frontend tests for `runHistoryTeamRows`, `TeamGridView`, `TeamSpotlightView`, `teamActiveExecutionMembers`, and any affected `runHistoryStore` tests.
   - Reproduce against Electron backend and verify all six Software Engineering Team members display.

## Key Tradeoffs

- Restoring all roster members may show inactive members with `Offline` or no-activity states. This is correct for roster display and matches user expectation.
- Composer/send target remains active-execution-controlled, so clicking a non-active roster member may not immediately retarget sending. That is safer for this bug-fix scope and preserves the prior task-agent safety intent.
- The design avoids backend changes because runtime evidence shows backend payloads are already correct.

## Risks

- If implementation passes `activeExecutionFocusedMemberRouteKey` to roster views, the visual focused tile may remain the active target even after an inactive member is clicked. If this UX is confusing, implement a small distinction between visual roster focus and active execution target; do not use active filtering as the display list.
- Nested team rendering must remain recursive.
- Existing tests encode the active-only roster regression and must be updated intentionally.

## Guidance For Implementation

- Do not delete `teamActiveExecutionMembers.ts`; narrow its callers.
- Prefer existing `flattenTeamMemberNodesForDisplay` over introducing a second roster flattening helper.
- Add regression fixtures with coordinator running and all other members idle/offline/no messages; expect all members visible.
- Verify the browser scenario using the Electron backend port discovered at runtime or equivalent Electron-started backend.

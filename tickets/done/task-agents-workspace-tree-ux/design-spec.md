# Design Spec: Workspaces Execution Identity Rows and Right-Side Task Detail Boundary

## Approval / Artifact State

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agents-workspace-tree-ux/tickets/in-progress/task-agents-workspace-tree-ux/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agents-workspace-tree-ux/tickets/in-progress/task-agents-workspace-tree-ux/investigation-notes.md`
- UX recommendation: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agents-workspace-tree-ux/tickets/in-progress/task-agents-workspace-tree-ux/ux-recommendation.md`
- User-approved product boundary: left Workspaces tree owns execution identity/hierarchy; right Team -> Tasks owns task detail/content only.
- Design posture: redesigned after deeper history investigation to follow the team design principles strictly.

## Current-State Read

### Current runtime path

The runtime already maintains the correct live execution hierarchy:

- `AgentTeamContext.memberTree` is the live runtime tree.
- `teamTaskAgentContextProjection.ts` inserts task-agent projection nodes near their logical source member.
- `teamTaskTeamExecutionProjection.ts` inserts task-team roots near their structural source team.
- `teamTaskTeamChildProjection.ts` clones scoped task-team child projections beneath the task-team root.

### Current Workspaces tree path

The current Workspaces tree renders stable team/member rows:

- `runHistoryTeamRows.ts` builds `TeamMemberTreeRow` durable/stable rows.
- Current `buildTeamRowsFromContext()` filters transient task projection nodes through `isTransientTaskProjectionNode()`.
- `WorkspaceHistoryWorkspaceSection.vue` flattens and renders team member rows as the left Workspaces tree.

This stable filter is correct as a durable row boundary. It should not be removed wholesale.

### Current right Team -> Tasks path

The current Team Tasks UI derives active task entries through `deriveActiveTaskEntries(teamContext)` and renders a rich task navigator/detail split:

- task summary/detail;
- actor row for task-agent/task-team;
- task-team member rows;
- references;
- technical details.

That mixes two concerns: task detail/content and execution identity hierarchy.

### Historical read

- Older/original direct Workspaces path: in `0fae9c60` (2026-06-02), live `buildTeamRowsFromContext()` used `teamContext.memberTree` directly, and `WorkspaceHistoryWorkspaceSection.vue` rendered `flattenTeamMembers(team)`. Task-agent projection nodes therefore appeared inline in the Workspaces tree using the normal row renderer.
- That original placement was product-reasonable, but architecturally weak because transient rows became ordinary stable-looking rows.
- Later `6d772875` added `TeamActiveTaskContextTree` to the Workspaces tree, but moved too much there: summaries, references, technical details, and full active task context.
- `d0c2f995` and `2c2e9311` moved away from global transient rows because they looked duplicate/disappearing.

The new design should restore the original inline execution identity placement, but with an explicit display-row boundary and transient visual semantics.

## Intended Change

Create a clean split:

```text
Runtime live tree
  -> Workspaces execution display rows        left, identity/hierarchy/focus
  -> Team active task detail entries          right, task content/details
```

Left Workspaces tree:

```text
● stable member/team                          solid leading status circle
◌ transient task-agent/task-team              dotted/dashed leading status circle + light ghost background
```

Right Team -> Tasks:

- task body/summary/details;
- references;
- technical details;
- selected task detail/message-style content;
- no duplicated primary task-agent/task-team execution hierarchy.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / UX Information Architecture Refactor
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue; Legacy Or Compatibility Pressure
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence:
  - Original inline Workspaces placement had good product shape but no stable/transient display distinction.
  - Current stable row filter is the right durable boundary but hides transient execution identity.
  - Current right Team Tasks owns both task detail and execution identity hierarchy.
  - Later full-context global tree moved too many task details left.
- Design response:
  - Keep stable member rows stable.
  - Add a pure Workspaces display-row adapter for inline transient execution rows.
  - Move execution identity hierarchy to Workspaces rendering.
  - Keep task content/details on the right.
- Refactor rationale:
  - This avoids the bad old dual choice of either hiding transient rows or making them ordinary rows.
  - It respects the Authoritative Boundary Rule: Workspaces tree does not depend on both stable row owner and stable row internals as if they were task detail; it gets a purpose-built display row boundary.
- Intentional deferrals and residual risk, if any:
  - Completed task execution history remains out of scope.
  - Exact right-side detail layout may be adjusted during implementation, but it must preserve the left/right ownership boundary.

## Terminology

- `Execution identity`: the concrete agent/team/member runtime target that can be focused.
- `Task detail/content`: task body, summary, references, technical details, and selected task detail content.
- `Stable member row`: durable team/member row from history or stable live context projection.
- `Transient execution row`: task-agent, task-team, or scoped task-team child row that exists only while the task projection exists.
- `Display-row adapter`: pure derived boundary that converts stable rows + live runtime nodes into renderer rows.

## Design Reading Order

1. Data-flow spine inventory.
2. Ownership split between runtime projection, Workspaces execution display, and right task detail.
3. File responsibilities and display-row model.
4. Removal/decommission plan.
5. Migration sequence and tests.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Do not restore the older direct raw `memberTree -> TeamMemberTreeRow` behavior where transient nodes become ordinary rows.
- Do not restore the later `TeamActiveTaskContextTree` full context in the Workspaces tree.
- Do not keep task-agent/task-team execution hierarchy as a duplicated primary UI in both left Workspaces and right Tasks.
- Keep one clean split: left execution identity, right task detail/content.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-TWU-001 | Primary End-to-End | Team stream task projection | Dotted/ghost transient execution row appears inline in Workspaces tree | Runtime projection + Workspaces display adapter | Restores original placement with clean transient semantics. |
| DS-TWU-002 | Primary End-to-End | User clicks Workspaces transient row | Center workspace focuses that execution target | Team context focus owner | Makes left tree the execution identity/focus surface. |
| DS-TWU-003 | Primary End-to-End | User opens Team -> Tasks | Task detail/content renders message-style on the right | Team active task detail owner | Keeps right side focused on task details, not execution hierarchy. |
| DS-TWU-004 | Return-Event | Projection cleanup removes task node | Transient Workspaces row and right task detail entry disappear | Runtime projection lifecycle | Ensures transient lifecycle is not persisted. |
| DS-TWU-005 | Bounded Local | Workspaces renderer receives display-row union | Stable rows and transient rows render with different visuals | WorkspaceHistoryWorkspaceSection | Keeps stable/transient boundary visible and testable. |

## Primary Execution Spine(s)

`Team stream event -> task projection helper -> AgentTeamContext.memberTree -> Workspaces execution display-row adapter -> WorkspaceHistoryWorkspaceSection -> inline dotted/ghost transient row`

`Transient row click -> Workspace selection action -> runHistoryStore.selectTreeRun / focusMemberAndEnsureHydrated -> center workspace focused on execution target`

`AgentTeamContext + deriveActiveTaskEntries -> TeamActiveTasksSection -> right-side task detail/message content`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-TWU-001 | Runtime projection inserts task-agent/task-team nodes in live hierarchy. A Workspaces display adapter reuses this placement but emits explicit transient row kinds instead of stable rows. | Team stream, projection helper, `AgentTeamContext.memberTree`, display-row adapter, Workspaces section | Runtime projection and Workspaces display adapter | Stable row lookup, visual semantics, data-test markers |
| DS-TWU-002 | The Workspaces tree is the execution focus surface. Clicking any stable or transient execution row selects/focuses the corresponding member route key. | Workspaces row, selection action, team context store | Team context focus owner | Route-key validation, local live context reuse |
| DS-TWU-003 | Right Team Tasks derives task entries and renders task detail/content only. It should no longer present task-agent/task-team member hierarchy as the main left/right task navigator identity. | `deriveActiveTaskEntries`, Team active task section/detail components | Team active task detail owner | Multiple task selection, references, technical details |
| DS-TWU-004 | Cleanup removes projection nodes; derived left rows and right task entries both disappear without stored duplicates. | Projection cleanup, live context, derived rows/details | Runtime projection lifecycle | No caches, stale selection fallback |
| DS-TWU-005 | Renderer branches by row kind: stable rows get existing solid leading status circle; transient rows get dotted circle and light ghost background. | Display row, renderer component/branch | Workspaces renderer | CSS/accessibility/i18n |

## Spine Actors / Main-Line Nodes

- Team stream task projection helpers.
- `AgentTeamContext.memberTree` live runtime graph.
- Stable row projection (`buildTeamRowsFromContext()`).
- New Workspaces execution display-row adapter.
- `WorkspaceHistoryWorkspaceSection.vue` renderer.
- Run-history/team focus selection actions.
- `deriveActiveTaskEntries()` for task detail/content.
- `TeamActiveTasksSection` and task detail subcomponents.

## Ownership Map

| Node / Owner | Owns | Must Not Own |
| --- | --- | --- |
| Runtime task projection helpers | Creation, placement, status, and cleanup of transient nodes | UI visual semantics or task detail rendering |
| `AgentTeamContext.memberTree` | Live execution graph, including stable and transient runtime nodes | Durable history row semantics |
| `buildTeamRowsFromContext()` | Stable/durable member row projection | Rendering transient rows as ordinary durable rows |
| Workspaces execution display-row adapter | Pure derived renderer rows preserving live placement with stable/transient discriminants | Runtime lifecycle, persistence, task body/reference/detail content |
| Workspaces renderer | Execution hierarchy UI, row focus actions, solid vs dotted/ghost visuals | Task detail/message content |
| Team active task detail owner | Task body/summary, references, technical details, task detail selection | Primary execution identity hierarchy |
| Existing selection/focus owner | Focusing member route keys in center workspace | Display-row construction |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| Display-row adapter | Workspaces execution display owner | Clean boundary between stable row model and transient runtime nodes | Runtime lifecycle or task details |
| `runHistoryStore.selectTreeRun()` / selection actions | Run-history/team focus owner | Existing click/focus API for rows | Display semantics |
| `deriveActiveTaskEntries()` | Team task detail read model | Derives task detail/content from runtime nodes | Workspaces execution hierarchy placement |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Ordinary stable-row rendering for transient nodes | It caused original confusion | Display-row adapter with transient row kind | In This Change | Do not remove stable filter just to show tasks. |
| Full global task-context tree | It moves right-side task details left | Workspaces execution rows + right task detail | In This Change | Do not restore `TeamActiveTaskContextTree`. |
| Primary task-agent/task-team hierarchy inside right Tasks | Execution hierarchy belongs left | Workspaces transient rows | In This Change | Right can show task detail/metadata, not hierarchy rows. |
| Tests/docs forbidding all global task-related visibility | New left execution rows are approved | Narrowed docs/tests | In This Change | Still forbid task details in Workspaces tree. |

## Return Or Event Spine(s) (If Applicable)

- `Task projection cleanup -> live node removed -> display adapter emits no transient row -> Workspaces row disappears`.
- `Task projection cleanup -> deriveActiveTaskEntries emits no detail entry -> right task detail removes/falls back`.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: Workspaces execution display-row adapter
  - Chain: `stable rows + live memberTree -> index stable rows by route key -> visit live nodes in order -> stable display row or transient display row -> recurse children -> renderer rows`
  - Why it matters: preserves original inline placement while avoiding stable/transient model mixing.

- Parent owner: right task detail component
  - Chain: `active task entries -> task detail selector/list -> selected task body/references/technical details`
  - Why it matters: right side becomes task-content owner, not execution identity owner.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Dotted circle + ghost background | DS-TWU-001, DS-TWU-005 | Workspaces renderer | Communicate transient execution identity | Fixes original UX ambiguity | Users think task agents are durable members |
| Stable row lookup | DS-TWU-001 | Display adapter | Reuse stable row metadata/avatars for durable rows | Avoid duplicating stable row logic | Divergent stable row behavior |
| Task detail selection | DS-TWU-003 | Team active task detail owner | Manage selected task/detail content | Multiple tasks may exist | Global tree becomes task-detail owner |
| Accessibility copy | DS-TWU-001, DS-TWU-005 | Workspaces renderer | Tooltip/aria temporary semantics without visible text | No visible Temp label by default | Inaccessible visual-only semantics |
| Tests/docs | All | Quality boundary | Encode no legacy/full-context regressions | Prevents old behavior returning | Ambiguous future ownership |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Runtime task placement/lifecycle | Task projection helpers | Reuse | Already correct | N/A |
| Stable durable member rows | `runHistoryTeamRows.ts` | Reuse/Preserve | Existing stable row owner | N/A |
| Inline execution rows | Workspaces history UI | Extend | Correct visual home | N/A |
| Stable/transient row composition | None exact | Create New | Need discriminated display boundary | Stable row builder must stay durable-only. |
| Task detail/content | Team active task components | Reuse/Modify | Correct right-side owner | N/A |
| Focus on row click | Run-history/team selection path | Reuse | Existing route-key focus behavior | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime projection | Live transient nodes | DS-TWU-001, DS-TWU-004 | Execution runtime | Reuse | No backend change. |
| Run-history stable row model | Durable rows | DS-TWU-001 | Workspaces stable renderer | Reuse | Preserve filter. |
| Workspaces execution display | Stable/transient display-row union and visuals | DS-TWU-001, DS-TWU-002, DS-TWU-005 | Workspaces tree | Create/Extend | Main refactor. |
| Team task detail | Task detail/content only | DS-TWU-003 | Right Team tab | Modify | Remove execution hierarchy as primary UI. |
| Selection/focus | Route-key focus | DS-TWU-002 | Center workspace | Reuse | Existing path. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `utils/workspaceTeamExecutionDisplayRows.ts` | Workspaces execution display | Display-row adapter | Compose stable and transient display rows from team node + live context | Isolates pure mapping/testability | `TeamMemberTreeRow`, `TeamMemberNode` |
| `components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Workspaces renderer | Tree renderer | Render display rows with stable/transient branches | Existing visual host | Display row union |
| `components/workspace/history/WorkspaceTransientExecutionRow.vue` | Workspaces renderer | Transient visual row | Dotted circle + ghost background row | Keeps visual semantics focused | Display row union |
| `components/workspace/team/TeamActiveTasksSection.vue` | Team task detail | Detail owner | Render task detail/message content | Existing active task owner | `ActiveTaskEntry` |
| `components/workspace/team/TeamActiveTaskNavigator.vue` or replacement | Team task detail | Detail selector/content | Remove execution hierarchy rows; keep task detail navigation only if needed | Existing mixed-concern component may need split | `ActiveTaskEntry` |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Workspaces display row union | `utils/workspaceTeamExecutionDisplayRows.ts` or adjacent contract | Workspaces execution display | Used by renderer and tests | Yes | Yes | Durable history DTO |
| Transient visual row | `WorkspaceTransientExecutionRow.vue` | Workspaces renderer | Avoid duplicated dotted/ghost styles | Yes | Yes | Task detail card |
| Active task detail entry | Existing `teamActiveTaskEntries.ts` | Team task detail | Right-side task content | Existing | Existing | Workspaces execution placement owner |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `TeamMemberTreeRow` | Yes for durable rows | Yes | Medium if transient fields are added | Do not add transient flags directly as durable semantics. |
| `WorkspaceTeamExecutionDisplayRow` | Yes if discriminated union | Yes | Low | Keep render/focus fields only. |
| `ActiveTaskEntry` | Yes for task detail | Existing | Medium if used for left placement | Keep for right detail; left should use live node placement. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/utils/workspaceTeamExecutionDisplayRows.ts` | Workspaces execution display | Display-row adapter | Pure function to build stable/transient display rows preserving live order | Prevents component blob and stable-row pollution | `TeamMemberTreeRow`, `TeamMemberNode` |
| `autobyteus-web/components/workspace/history/workspaceHistorySectionContracts.ts` | Workspaces contracts | Renderer types/actions | Export/import display row/action identities as needed | Existing section contract owner | Display row type |
| `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | Workspaces shell | Binding assembler | Get live context by team run, pass display rows/actions | Existing parent for stores/actions | Display adapter |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Workspaces renderer | Tree renderer | Render stable/transient display rows; solid vs dotted/ghost | Existing tree visual owner | Display row type |
| `autobyteus-web/components/workspace/history/WorkspaceTransientExecutionRow.vue` | Workspaces renderer | Visual row component | Dotted circle + ghost background + accessible label | Focused visual responsibility | Display row type |
| `autobyteus-web/components/workspace/team/TeamActiveTasksSection.vue` | Team task detail | Task detail owner | Render task detail/message content and selected task details | Existing owner | `ActiveTaskEntry` |
| `autobyteus-web/components/workspace/team/TeamActiveTaskNavigator.vue` or successor | Team task detail | Task detail selector/navigation | Remove execution identity hierarchy rows; keep task detail selection/content only | Current mixed file likely needs simplification/split | `ActiveTaskEntry` |
| Tests/docs | Coverage/docs | Boundary enforcement | Update stable/transient/detail assertions | Existing affected areas | N/A |

## Ownership Boundaries

Authority changes hands as follows:

- Runtime projection owns live node existence and placement.
- Stable row builder owns durable row projection and must remain free of transient display semantics.
- Workspaces display adapter owns renderer-only composition of stable and transient execution rows.
- Workspaces renderer owns execution identity hierarchy and visual semantics.
- Team Tasks owns task detail/content and selection.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| Runtime projection helpers | Transient insertion/cleanup in `memberTree` | Display adapter | Rebuilding placement from task IDs only | Extend projection metadata/helper output |
| Stable row builder | Durable row fields/avatar/status | Workspaces display adapter | Removing filter and treating transient nodes as stable rows | Add display-row adapter |
| Workspaces display adapter | Stable/transient row union | Workspaces section | Component manually mixing stable rows and raw nodes ad hoc | Extend adapter output |
| Team task detail owner | Task body/references/technical details | Right tab | Workspaces importing full detail/navigator components | Add explicit detail-only component/API |

## Dependency Rules

Allowed:

- Display adapter may read stable `TeamTreeNode.memberTree` and live `AgentTeamContext.memberTree`.
- Workspaces renderer may branch on display row discriminant.
- Transient rows may use existing focus actions by `teamRunId + memberRouteKey`.
- Right task detail components may use `deriveActiveTaskEntries()`.

Forbidden:

- Do not render task summary/body/reference/technical-detail rows in Workspaces tree.
- Do not use `TeamMemberTreeRow` as the durable type for transient rows without a display discriminant.
- Do not render full `TeamActiveTaskContextTree` globally.
- Do not keep execution hierarchy as primary rows in right Tasks after left migration.
- Do not introduce compatibility dual rendering for old and new behavior.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `buildWorkspaceTeamExecutionDisplayRows({ team, teamContext })` | Workspaces execution display | Build display rows | `TeamTreeNode`, optional `AgentTeamContext` | Proposed helper name. |
| `WorkspaceTeamExecutionDisplayRow` | Renderer row | Discriminate stable vs transient | `{ kind, teamRunId, memberRouteKey }` | No task body/reference fields. |
| `actions.onSelectTeamMember(rowIdentity)` | Execution focus | Focus a route key | `teamRunId + memberRouteKey` | Works for stable/transient rows. |
| `deriveActiveTaskEntries(teamContext)` | Task detail read model | Build right-side task detail entries | `AgentTeamContext` | Must not own left placement. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Display adapter | Yes | Yes | Low | Keep pure and renderer-focused. |
| Display row union | Yes | Yes | Low | Use discriminated union. |
| Focus action | Yes | Yes | Low | Route key identity is explicit. |
| Active task detail entry | Yes for right side | Yes | Medium | Avoid using it for Workspaces placement. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Display adapter | `workspaceTeamExecutionDisplayRows` | Yes | Low | Includes Workspaces + execution. |
| Transient row | `WorkspaceTransientExecutionRow` | Yes | Low | Avoid generic task row naming. |
| Row kind | `stable_member` / `transient_execution` | Yes | Low | Do not call transient rows history rows. |
| Right detail | `TeamActiveTaskDetail...` | Yes | Medium | Rename/split if navigator remains mixed. |

## Applied Patterns (If Any)

- Discriminated union: stable vs transient renderer rows.
- Pure read-model adapter: Workspaces display rows derived from existing owners.
- Existing focus command reuse: row clicks call the current focus path.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/utils/workspaceTeamExecutionDisplayRows.ts` | File | Workspaces display adapter | Pure display-row composition | Testable utility | Task details or persistence writes |
| `autobyteus-web/components/workspace/history/` | Folder | Workspaces execution UI | Render stable/transient rows | Existing tree owner | Right-side task detail content |
| `autobyteus-web/components/workspace/team/` | Folder | Team task detail UI | Render task detail/content | Existing right Team tab owner | Workspaces execution row placement |
| `autobyteus-web/stores/runHistoryTeamRows.ts` | File | Stable row model | Durable row projection | Existing owner | Transient display semantics |
| `autobyteus-web/docs/agent_execution_architecture.md` | File | Architecture docs | Document left/right split | Existing durable doc | Stale right-only/global-full claims |

A compact layout is preferred: one display adapter plus one optional transient row component. Avoid a broad new subsystem unless implementation shows repeated row adapters.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `utils/workspaceTeamExecutionDisplayRows.ts` | Off-Spine Concern | Yes | Low | Pure display adapter. |
| `components/workspace/history/` | Main-Line UI Renderer | Yes | Low | Left execution identity tree. |
| `components/workspace/team/` | Main-Line UI Detail | Yes | Medium | Current navigator mixes concerns; split/prune. |
| `stores/runHistoryTeamRows.ts` | Read Model | Yes | Low | Durable rows only. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Left row semantics | `● worker` stable, `◌ worker · task_0001` dotted/ghost transient | Both rows rendered with the same solid leading status circle | Fixes original ambiguity. |
| Architecture split | Workspaces row focuses execution; right panel shows task detail | Right panel and left tree both show execution hierarchy | Prevents duplicated ownership. |
| Data model | Display row union over stable rows + live nodes | Removing transient filter from stable row builder | Keeps durable/transient semantics clean. |
| Global tree content | Identity rows only | Summary/references/technical details in Workspaces tree | Avoids later full-context mistake. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Restore `0fae9c60` raw memberTree stable row behavior exactly | Closest original placement | Rejected as-is | Restore placement through display-row union with transient styling. |
| Restore `TeamActiveTaskContextTree` globally | Existing later code precedent | Rejected | Left identity rows only; right detail content. |
| Keep actor/member hierarchy as primary UI in both right and left | Avoids right-side refactor | Rejected | Move execution hierarchy left; keep right detail-only. |
| Add visible `Temp` chip/label | Easy to explain temporariness | Rejected by product preference by default | Dotted circle + ghost background; aria/tooltip if needed. |

## Derived Layering (If Useful)

- Runtime layer: projection helpers and `AgentTeamContext.memberTree`.
- Stable read-model layer: durable row projection.
- Workspaces display adapter layer: renderer-specific stable/transient display rows.
- Workspaces renderer layer: execution hierarchy and focus.
- Team task detail layer: task content/message details.

## Migration / Refactor Sequence

1. Add `workspaceTeamExecutionDisplayRows` with a discriminated union that preserves original inline placement from live `memberTree` while using stable rows for durable row fields.
2. Wire `WorkspaceAgentRunsTreePanel.vue` / section contracts to provide display rows per team.
3. Update `WorkspaceHistoryWorkspaceSection.vue` to render display rows and extract `WorkspaceTransientExecutionRow.vue` if the transient branch is more than trivial.
4. Implement dotted/dashed leading status circle plus light ghost background for transient rows; keep durable rows visually unchanged.
5. Ensure transient row clicks use existing team member focus behavior.
6. Refactor `TeamActiveTaskNavigator.vue` / `TeamActiveTasksSection.vue` so right Team -> Tasks renders task detail/content only and does not duplicate execution hierarchy as primary rows.
7. Update tests for:
   - display-row adapter order and row kinds;
   - stable rows unchanged;
   - transient rows dotted/ghost and focusable;
   - no task details in Workspaces tree;
   - no duplicated execution hierarchy in right task UI;
   - cleanup removal.
8. Update docs to record left execution identity / right task detail split.
9. Run focused frontend tests after dependencies are available.

## Key Tradeoffs

- Restoring original inline placement is product-simple and intuitive.
- The display-row adapter adds a small layer, but it is the clean boundary that the original implementation lacked.
- Right task UI simplification may require test updates, but it removes duplicated ownership.
- No visible Temp label keeps UI clean, but accessibility text should still communicate transient semantics.

## Risks

- Component-level shortcut could mix raw live nodes and stable rows directly in `WorkspaceHistoryWorkspaceSection.vue`. Mitigate with a pure adapter and tests.
- Right task detail selection could become unclear if multiple tasks are active. Mitigate with a task-detail selector/list that does not render execution hierarchy.
- Visual semantics could be too subtle. Mitigate with contrast tuning of dotted circle and ghost background.
- Dependency setup absent in fresh worktree; validation must prepare frontend dependencies.

## Guidance For Implementation

- Follow the design principles strictly: spine first, one owner per concern, no boundary bypass, no dual legacy behavior.
- Do not solve this by deleting `isTransientTaskProjectionNode()` filtering from stable rows.
- Preserve live `memberTree` order for placement.
- Treat Workspaces transient rows as execution identity/focus rows only.
- Treat right Team Tasks as task detail/content only.
- Prefer pure helpers and discriminated unions over ad hoc component branching.

## Addendum: Concrete Transient Row Anatomy (2026-07-01)

This addendum resolves implementation ambiguity found during Electron review. It is normative for implementation.

### Required Row Anatomy

A transient execution row in the Workspaces tree must have this visual structure:

```text
[transient status dot] [display name]                         [optional relative time only if stable rows also show it]
```

Example:

```text
◌ StudentStudyGroup · task_0003
◌ student_one
◌ student_two
```

The transient row must **not** have this structure:

```text
● [dotted initials/avatar] StudentStudyGroup · task_0003 [trailing dotted circle]
```

### Required Element Semantics

| Slot | Stable durable row | Transient execution row | Notes |
| --- | --- | --- | --- |
| Leading status indicator | Solid colored `StatusDot` | Dotted/dashed/hollow status dot in the same leading position | This is the only visible dotted circle. |
| Avatar / initials circle | Existing durable avatar/initials where stable rows currently show it | Omit by default for transient rows | Do not add a second dotted initials/avatar circle. |
| Row background | Normal stable row background | Light ghost background | Keep subtle. |
| Row border | Existing stable row border/none | Optional very subtle border only if needed | Full dashed card border is not required and may be too noisy. |
| Trailing indicator | Existing stable row trailing content, usually relative time | No transient-specific trailing dotted marker | Do not add right-side dotted circle. |
| Visible text label | Stable row name/team chip | Display name only; no visible `Temp`/`Temporary` label by default | Tooltip/aria text is allowed. |

### Required DOM / Testable Constraints

Implementation and tests must enforce:

- exactly one visible circular transient marker per transient row;
- that marker is the leading status indicator;
- no dashed/dotted initials/avatar marker;
- no trailing dashed/dotted marker;
- no visible `Temporary task execution` text in the row body;
- transient row has a light ghost background class;
- transient row remains focus/selectable through existing team member focus behavior.

### Preferred Implementation Shape

Prefer extending the existing status-dot system instead of adding ad hoc extra circles:

- Add `variant?: 'solid' | 'transient'` or equivalent to `StatusDot.vue`; or
- Add a small focused `WorkspaceTransientStatusDot.vue` if changing shared `StatusDot` is too broad.

The transient status dot should preserve status meaning as far as practical, for example:

- running: blue dashed/hollow dot;
- idle/active-success: green dashed/hollow dot;
- offline: gray dashed/hollow dot;
- error: red dashed/hollow dot.

Do not add a separate avatar circle merely to carry initials. The row display name already carries identity.

### Example Acceptable Markup Shape

Illustrative only; implementation may vary while preserving the constraints:

```vue
<button class="... bg-indigo-50/40 ..." data-test="workspace-team-transient-execution-row">
  <span data-test="workspace-transient-status-dot" class="h-2 w-2 rounded-full border border-dashed border-blue-500 bg-transparent" />
  <span class="truncate">StudentStudyGroup · task_0003</span>
</button>
```

Forbidden illustrative shape:

```vue
<button>
  <StatusDot />
  <span class="rounded-full border-dashed">SS</span>
  <span>StudentStudyGroup · task_0003</span>
  <span class="rounded-full border-dashed" />
</button>
```

### Task-Team Default Disclosure Behavior

Transient task-team rows must follow the same default expansion semantics as persistent nested agent-team/member rows:

```text
Initial render:
◌ StudentStudyGroup · task_0003        [collapsed disclosure]

After user expands that transient task-team row:
◌ StudentStudyGroup · task_0003        [expanded disclosure]
  ◌ student_one
  ◌ student_two
```

Normative constraints:

- A transient `task_team` row with child rows is visible at its placement point, but its children are hidden by default.
- Child rows become visible only after the user expands that transient task-team row.
- The user can collapse the transient task-team row again, hiding its children.
- Expansion state must be keyed by the transient execution row identity, e.g. `teamRunId + memberRouteKey` or the existing team-member expansion key if it already includes both dimensions.
- Expansion state must not be keyed only by persistent team definition/name, because two task-team executions from the same team definition may exist at the same time.
- This disclosure state belongs to the left Workspaces tree execution-identity renderer; it must not move task detail/content ownership back into the left tree.

Implementation guidance:

- Update the display-row visibility filtering so `hasChildren` is true for transient task-team rows with children, not only for stable `agent_team` rows.
- Reuse the existing Workspaces tree disclosure styling and state contract when possible so transient task teams behave like normal nested teams.
- If the existing `state.isTeamMemberExpanded(workspaceId, teamRunId, memberRouteKey)` / `toggleTeamMember(...)` key shape can safely address transient member route keys, use it instead of adding a parallel transient-only expansion store.
- If a separate expansion helper is necessary, keep it inside the Workspaces tree state owner and expose it through the same section state boundary; do not let `WorkspaceTransientExecutionRow.vue` own global expansion state.
- Add tests for both initial collapsed state and user-driven expand/collapse.

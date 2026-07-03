# Design Spec

## Current-State Read

The left-sidebar history surface is mounted by `autobyteus-web/components/AppLeftPanel.vue` through `WorkspaceAgentRunsTreePanel.vue`. The current renderer, `WorkspaceHistoryWorkspaceSection.vue`, exposes the stored/read-model grouping directly:

- workspace -> agent definition -> agent runs
- workspace -> `Teams` heading -> team definition -> team runs -> team member/role rows

This makes team sessions hard to find because the user must navigate through a team-definition layer before seeing the actual session. It also makes standalone sessions inconsistent with team sessions because standalone sessions are grouped under agent definitions while team sessions are grouped under team definitions.

The row label is currently derived from `summary` and formatted inside the renderer by `formatRunLabel` / `formatTeamRunLabel`. That function only strips a known `[User Requirement]` wrapper. Backend records store `summary` as compacted raw initial/first user input, so `summary` is overloaded as both prompt summary and UI row title. The code has no distinct session-row subject and no distinct display-title boundary.

Relevant current owners:

- `runHistoryStore` owns history state, fetching, selection entrypoints, and read-model getters.
- `runHistoryReadModel.ts`, `runTreeProjection.ts`, and `runHistoryTeamHelpers.ts` own grouped history projections.
- `useWorkspaceHistoryTreeState.ts` owns tree expansion/reveal state, including obsolete agent and team-definition expansion layers.
- `useWorkspaceHistorySelectionActions.ts` owns run/team/member selection behavior; this selection behavior is mostly healthy and should be reused.
- `WorkspaceHistoryWorkspaceSection.vue` currently owns rendering, hierarchy decisions, member rows, and label cleanup, which is too much for a session-first redesign.

The target design must respect lazy workspace history fetching, active-run reconciliation, historical team-member hydration, existing mutation actions, and existing team-member focus behavior.

## Intended Change

Replace the team/agent-definition-first history tree under each expanded workspace with a session-first list. A workspace remains the top-level scope. Each direct child row under the workspace represents one session:

- standalone agent session (`kind: agent`)
- team session (`kind: team`)

Team identity moves from a parent grouping row to a leading team avatar/initials chip and metadata on the session row. Team member/role rows remain available as expandable details below the team session row.

Introduce a session projection/read-model boundary that merges existing agent-run and team-run sources into one `WorkspaceHistorySessionRow` subject and resolves the row display label before rendering. Component templates should not directly format raw `summary` as the title.

This first implementation should avoid backend schema/migration churn. It should create a front-end display-label boundary that can consume a future `displayTitle` / `sessionTitle` field when one exists, while using sanitized current `summary` as the legacy fallback. Rich LLM-generated titles and bulk retitling old sessions are intentionally deferred.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature / behavior change
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue plus Shared Structure Looseness
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence: The renderer exposes backend grouping (`agentDefinitions`, `teamDefinitions`) as the user hierarchy. Team session discovery requires expanding a visible `Teams` layer and a team-definition row. Row titles depend directly on prompt-derived `summary`.
- Design response: Introduce a session-list projection as the authoritative UI read model for this sidebar. Render workspace -> sessions -> optional team details. Move display-label cleanup/resolution out of the component template and into a reusable label resolver.
- Refactor rationale: A template-only indentation change would keep the wrong subject (`teamDefinition` / `agentDefinition`) as the row owner and would keep raw `summary` as the title source. The in-scope behavior depends on a new session-row boundary.
- Intentional deferrals and residual risk, if any: Rich generated/persisted session titles are deferred. The residual risk is that legacy rows without explicit titles still fall back to sanitized prompt summaries. This task still improves the core problem by making sessions directly discoverable and by establishing the label boundary where future generated titles can land without another renderer refactor.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.
- `Session row`: a UI/read-model row representing one agent run or team run under a workspace.
- `Session display label`: the structured title/metadata resolved for a session row before rendering.

## Design Reading Order

Read and write this design from abstract to concrete:

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove the old visible history hierarchy from this sidebar: workspace -> agent/team definition -> session. Do not keep a toggle or parallel old tree.
- Treat removal as first-class design work: decommission team-definition display grouping from workspace history if no longer used, and remove agent/team-definition expansion state from the workspace history state owner.
- Decision rule: the design is invalid if implementation keeps a parallel compatibility renderer or continues using raw `summary` formatting in component templates as the authoritative title behavior.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Workspace history panel | Session rows rendered under workspace | `runHistoryStore` + session projection | Main path for finding previous sessions. |
| DS-002 | Primary End-to-End | User clicks session row | Active/historical run or team member focused | `useWorkspaceHistorySelectionActions` | Preserves open/select behavior after row hierarchy changes. |
| DS-003 | Return-Event | Run/team mutation result | Session list refresh/row action state | `WorkspaceAgentRunsTreePanel` mutation wiring | Ensures terminate/archive/delete behavior still updates the direct session rows. |
| DS-004 | Bounded Local | Selection or disclosure action | Workspace/session/member expansion state | `useWorkspaceHistoryTreeState` | Local tree state must change from definition expansion to session-detail expansion. |

## Primary Execution Spine(s)

DS-001: `WorkspaceAgentRunsTreePanel -> runHistoryStore -> runHistory session projection -> WorkspaceHistoryWorkspaceSection -> WorkspaceHistorySessionRow`

DS-002: `WorkspaceHistorySessionRow click -> useWorkspaceHistorySelectionActions -> runHistoryStore.selectTreeRun -> run/team hydration/selection -> parent run-selected event`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The panel fetches workspace history as it does today, but asks the store/read model for session rows per workspace instead of grouped agent/team-definition rows. The session projection merges agent runs and team runs into one row list, resolves label/title metadata, sorts rows, and hands them to the workspace renderer. | `WorkspaceAgentRunsTreePanel`, `runHistoryStore`, `WorkspaceHistorySessionProjection`, `WorkspaceHistoryWorkspaceSection`, `WorkspaceHistorySessionRow` | `runHistoryStore` for read-model entry; `WorkspaceHistorySessionProjection` for row subject formation | Avatar state, display-label resolver, relative-time formatting, mutation state. |
| DS-002 | When a row is selected, agent sessions reuse current agent selection. Team sessions reuse current team selection: open the team, focus coordinator/default member, and expand details. | `WorkspaceHistorySessionRow`, `useWorkspaceHistorySelectionActions`, `runHistoryStore`, run/team hydration services | `useWorkspaceHistorySelectionActions` | Member ancestor expansion, parent event emission. |
| DS-003 | Row actions call the existing mutation handlers. Mutation state remains keyed by run/team ID and is surfaced on the direct session row. | `WorkspaceHistorySessionRow`, mutation handlers, `runHistoryStore` | `WorkspaceAgentRunsTreePanel` mutation wiring | Confirmation modal, toast reporting. |
| DS-004 | Local expansion state tracks only workspace expansion, team session detail expansion, and nested team-member expansion. It no longer tracks agent definition or team definition expansion for this surface. | `useWorkspaceHistoryTreeState` | `useWorkspaceHistoryTreeState` | Selection reveal, workspace pruning. |

## Spine Actors / Main-Line Nodes

- `WorkspaceAgentRunsTreePanel`: history panel orchestrator.
- `runHistoryStore`: fetch/selection state owner and read-model facade.
- `WorkspaceHistorySessionProjection`: new row-subject owner that merges agent/team runs.
- `WorkspaceHistoryWorkspaceSection`: per-workspace session-list renderer.
- `WorkspaceHistorySessionRow`: per-session row renderer and action affordance surface.
- `useWorkspaceHistorySelectionActions`: selection/open behavior owner.

## Ownership Map

| Node | Owns |
| --- | --- |
| `WorkspaceAgentRunsTreePanel` | Fetch orchestration, wiring stores/composables/actions/avatars into the workspace history surface. |
| `runHistoryStore` | Current history data, active context merge entrypoints, public read-model methods, selection state, mutation state bridge. |
| `WorkspaceHistorySessionProjection` | Normalizing agent and team run sources into one session row type; row sorting; preserving source payloads needed for actions. |
| `WorkspaceHistorySessionLabelResolver` | Title/summary cleanup, fallback order, and label source classification. |
| `WorkspaceHistoryWorkspaceSection` | Rendering one workspace and its direct session list; empty/loading/error states. |
| `WorkspaceHistorySessionRow` | Rendering one session row; dispatching selection, detail-toggle, and mutation actions through provided actions only. |
| `WorkspaceHistoryTeamMemberRows` | Rendering nested team member details for an expanded team session. |
| `useWorkspaceHistoryTreeState` | Workspace, session-detail, and team-member expansion state plus selection reveal. |
| `useWorkspaceHistorySelectionActions` | How selecting agent/team/member rows opens/focuses runtime or history contexts. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `runHistoryStore.getWorkspaceSessions(...)` | `WorkspaceHistorySessionProjection` | Pinia store exposes a simple read-model method to components. | Sorting/label rules duplicated in Vue templates. |
| `WorkspaceHistorySessionRow` | `useWorkspaceHistorySelectionActions` and mutation handlers | UI event boundary. | Run/team hydration, selection policy, or mutation policy. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Visible `Teams` heading in workspace history | Sessions are now direct children of workspace. | Session-first list in `WorkspaceHistoryWorkspaceSection.vue`. | In This Change | Do not leave as optional toggle. |
| Team-definition group rows in workspace history | Team identity moves to each team session row. | `WorkspaceHistorySessionRow` team symbol/metadata. | In This Change | Remove matching old tests. |
| Agent-definition group rows in workspace history | Agent identity moves to each agent session row. | `WorkspaceHistorySessionRow` agent symbol/metadata. | In This Change | Per-agent quick-create buttons are removed from this history view; launch remains in Agents/Agent Teams surfaces. |
| `workspaceHistoryTeamDefinitionGroups.ts` usage in workspace history | No visible grouping by team definition remains. | `runHistorySessionProjection.ts`. | In This Change | Delete file if no other imports remain. |
| `expandedAgents` and `expandedTeamDefinitions` state in `useWorkspaceHistoryTreeState.ts` | No agent/team-definition rows remain. | Session detail expansion keyed by session kind/id. | In This Change | Keep workspace and team-member expansion. |
| Template-local `formatRunLabel` / `formatTeamRunLabel` | Label policy belongs in projection/resolver. | `runHistorySessionLabels.ts`. | In This Change | Component receives `displayLabel`. |

## Return Or Event Spine(s) (If Applicable)

DS-003: `Session row action -> existing mutation handler -> runHistoryStore mutation action -> workspaceGroups/read model refresh/removal -> session projection recomputes -> row disappears or updates`

Parent UI event flow: `Session row selection -> WorkspaceAgentRunsTreePanel emit('run-selected') -> AppLeftPanel -> workspace center/view selection behavior` remains unchanged at the parent boundary.

## Bounded Local / Internal Spines (If Applicable)

Parent owner: `useWorkspaceHistoryTreeState`

`Selection/disclosure input -> resolve session key -> set workspace/session/member expansion -> reveal selected row/details`

Why this matters: the current bounded state machine still assumes agent definition and team definition ancestors. It must be reduced to workspace/session/member expansion or it will keep reintroducing old hierarchy dependencies.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Avatar/initials resolution | DS-001 | `WorkspaceHistorySessionRow` | Use existing agent/team/member avatar helpers. | Source identity must be visually obvious. | Projection becomes coupled to image fallback state. |
| Display-label cleanup | DS-001 | `WorkspaceHistorySessionProjection` | Resolve primary title and label source from explicit title/summary/fallback. | Prevent raw `summary` template usage. | Renderer duplicates policy and remains summary-coupled. |
| Relative time formatting | DS-001 | `WorkspaceHistorySessionRow` | Existing `runHistoryStore.formatRelativeTime`. | Consistent time display. | Projection becomes time-environment dependent. |
| Mutation action state | DS-003 | `WorkspaceHistorySessionRow` | Disable/show terminate/archive/delete actions. | Preserve current operations. | Row would own mutation policy. |
| Team member detail rows | DS-002/DS-004 | Team sessions | Show member hierarchy below session. | Preserve role access. | Session discovery becomes hidden behind member rows again. |
| Localization | DS-001 | Renderers | User-facing fallback text/tooltips. | Existing UI strings should remain localizable where practical. | Hard-coded scattered copy. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| History fetch and state | `runHistoryStore` | Reuse/Extend | Already owns history fetch, selected state, mutations, formatting. | N/A |
| Agent run grouped projection | `runTreeProjection.ts` / `runHistoryReadModel.ts` | Reuse as input | Existing agent rows remain useful source data. | N/A |
| Team run/member projection | `runHistoryTeamHelpers.ts` / `runHistoryTeamRows.ts` | Reuse as input | Existing member tree/focus behavior is healthy. | N/A |
| Session row unification | None | Create New | Current projections expose grouped definitions, not sessions. | New subject needed to prevent renderer from merging ad hoc. |
| Display title fallback | Current template functions | Create New / replace | Current functions are component-local and not semantically enough. | Needs reusable read-model ownership. |
| Selection behavior | `useWorkspaceHistorySelectionActions.ts` | Reuse/Extend | Existing team coordinator/default focus behavior is correct. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Run history store/read model | Fetching, source history data, session projection entrypoint | DS-001 | `runHistoryStore` | Extend | Add session list method; do not replace lower-level hydration logic. |
| Workspace history UI | Workspace/session/member rendering | DS-001/DS-002 | `WorkspaceHistoryWorkspaceSection` | Extend/refactor | Split row/details components to avoid one overloaded file. |
| Workspace history state | Expansion/reveal | DS-004 | `useWorkspaceHistoryTreeState` | Refactor | Remove old definition expansion. |
| Run/team selection | Row click -> focus/open behavior | DS-002 | `useWorkspaceHistorySelectionActions` | Reuse/Extend | Add session-oriented wrapper if helpful. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `stores/runHistorySessionProjection.ts` | Run history read model | Session projection | Build direct session rows from agent/team sources and sort them. | One cohesive subject: session row formation. | Uses label resolver. |
| `stores/runHistorySessionLabels.ts` | Run history read model | Display-label resolver | Resolve title/fallback/subtitle source fields. | Separates label policy from projection shape and Vue templates. | N/A |
| `components/workspace/history/WorkspaceHistorySessionRow.vue` | Workspace history UI | Session row renderer | One direct session row with actions. | Avoids further overloading workspace section. | Uses session type. |
| `components/workspace/history/WorkspaceHistoryTeamMemberRows.vue` | Workspace history UI | Team member detail renderer | Nested member tree rows below a team session. | Preserves existing member rendering separately. | Uses existing member row types/avatar helpers. |
| `components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Workspace history UI | Workspace section renderer | Workspace shell plus direct session list. | Keeps per-workspace states in one place. | Uses session row/details components. |
| `composables/useWorkspaceHistoryTreeState.ts` | Workspace history state | Expansion/reveal owner | Workspace/session/team-member expansion and reveal. | Existing state owner, refactored. | Uses session keys. |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Session row identity and source metadata | `runHistorySessionProjection.ts` | Run history read model | Needed by store, state reveal, and UI rows. | Yes | Yes | A generic mixed run bag without kind-specific payloads. |
| Display label cleanup/fallback | `runHistorySessionLabels.ts` | Run history read model | Needed for agent and team sessions consistently. | Yes | Yes | A prompt summarizer or LLM title generator. |
| Team member detail row rendering | `WorkspaceHistoryTeamMemberRows.vue` | Workspace history UI | Existing member rendering is too large for session row component. | Yes | Yes | A second session hierarchy owner. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `WorkspaceHistorySessionRow` | Yes | Yes | Medium | Include `kind`, `sessionId`, `workspaceRootPath`, `displayLabel`, `source`, `status`, `lastActivityAt`, and exactly one source payload (`agentRun` or `teamRun`). Do not copy every field from both source types into optional fields. |
| `WorkspaceHistorySessionDisplayLabel` | Yes | Yes | Low | Use `title`, `subtitle`, `rawSummary`, and `titleSource`. Keep `summary` as raw source, not title. |
| `WorkspaceHistorySessionSource` | Yes | Yes | Low | Use `sourceName`, `avatarUrl`, `initialsSubject`, `memberCount`/`coordinator` only when kind requires it. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/runHistorySessionLabels.ts` | Run history read model | Session label resolver | Strip wrappers, normalize whitespace, choose explicit title -> summary -> fallback, build source metadata subtitle. | Keeps semantic label policy out of Vue components. | N/A |
| `autobyteus-web/stores/runHistorySessionProjection.ts` | Run history read model | Workspace session projection | Merge `RunTreeWorkspaceNode.agents[*].runs` and `TeamTreeNode[]` into sorted direct session rows. | The session row is the new authoritative UI subject. | Uses label resolver. |
| `autobyteus-web/stores/runHistoryStore.ts` | Run history store | Public read-model facade | Add `getWorkspaceSessionNodes(workspaceRootPath?: string)` or equivalent. | Components should not import low-level projection inputs directly. | Uses session projection. |
| `autobyteus-web/composables/useWorkspaceHistoryTreeState.ts` | Workspace history state | Expansion/reveal owner | Replace agent/team-definition expansion with session detail expansion; reveal selected sessions. | Existing owner for local expansion state. | Uses session keys. |
| `autobyteus-web/components/workspace/history/workspaceHistorySectionContracts.ts` | Workspace history UI contracts | Section action/state contracts | Add session selection state and session detail toggle contracts; remove old agent/team-definition expansion methods. | Keeps component props explicit. | Uses session type. |
| `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | Workspace history panel | Orchestration | Pass session rows and session-oriented state/actions to workspace sections. | Existing panel boundary. | Uses store read-model. |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Workspace history UI | Workspace section renderer | Render workspace row, loading/empty/error, direct session list. | One workspace shell; delegates session/member details. | Uses session row component. |
| `autobyteus-web/components/workspace/history/WorkspaceHistorySessionRow.vue` | Workspace history UI | Session row renderer | Render status, avatar/initials, title, subtitle, time, actions, disclosure. | Isolates direct row behavior. | Uses session type/action contract. |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryTeamMemberRows.vue` | Workspace history UI | Team member details renderer | Render nested team members under expanded team session. | Avoids a giant row component. | Uses existing `TeamMemberTreeRow`. |
| `autobyteus-web/components/workspace/history/workspaceHistoryTeamDefinitionGroups.ts` | Workspace history UI | Old team-definition grouping | Remove if no imports remain. | Obsolete in session-first view. | N/A |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` | Tests | Component coverage | Replace old grouping assertions with session-first rows and detail expansion. | Main regression surface. | N/A |
| `autobyteus-web/stores/__tests__/runHistoryStore.spec.ts` or new `runHistorySessionProjection.spec.ts` | Tests | Projection coverage | Test merge/sort/label fallback semantics. | Read-model behavior deserves isolated tests. | N/A |

## Ownership Boundaries

- Components above `runHistoryStore` must request session rows from the store/read-model boundary and must not reconstruct agent/team groups themselves.
- `WorkspaceHistorySessionProjection` owns the mapping from old source shapes into session rows. It may depend on existing lower-level grouped projections but callers should not depend on both the session projection and group internals for the same rendered list.
- `WorkspaceHistorySessionLabelResolver` owns display-label fallback. Components can display `session.displayLabel.title` and `subtitle`, but must not directly sanitize raw `summary`.
- `useWorkspaceHistorySelectionActions` remains the owner for selection/open/focus behavior. Row components must call actions instead of hydrating runs directly.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `runHistoryStore.getWorkspaceSessionNodes` | Agent tree projection, team node projection, session merge/sort | `WorkspaceAgentRunsTreePanel`, workspace section components | Component calls `getTreeNodes()` + `getTeamNodes()` and merges rows itself. | Add fields/methods to session row projection. |
| `WorkspaceHistorySessionLabelResolver` | Prefix stripping, blank fallback, title source selection | Session projection and tests | Template calls `stripSummaryPrefix(summary)` or formats `summary` as title. | Extend resolver return shape. |
| `useWorkspaceHistorySelectionActions` | Agent/team/member open/focus behavior | Session row and member detail components | Row directly calls hydration/open stores. | Add `onSelectSession` wrapper. |

## Dependency Rules

Allowed:

- `WorkspaceAgentRunsTreePanel.vue` may depend on `runHistoryStore`, tree state, avatar state, mutation composables, and selection actions.
- `runHistoryStore` may depend on `runHistoryReadModel`, `runHistorySessionProjection`, existing agent/team stores, and workspace store.
- `runHistorySessionProjection.ts` may depend on run/team row types and `runHistorySessionLabels.ts`.
- UI row components may depend on typed session rows, `StatusDot`, `Icon`, avatar bindings, and action/state contracts.

Forbidden:

- Vue templates must not use raw `summary` as the primary session title.
- Workspace history components must not re-create team-definition or agent-definition grouping for session discovery.
- `WorkspaceHistorySessionProjection` must not own run/team hydration or mutation behavior.
- Row components must not call backend GraphQL mutations or stores directly; they dispatch through action contracts.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `runHistoryStore.getWorkspaceSessionNodes(workspaceRootPath?: string)` | Workspace history sessions | Return direct session rows for one workspace or all workspaces. | Optional normalized workspace root path | Name should avoid generic `listRuns` because agent/team subjects differ internally. |
| `buildWorkspaceHistorySessionRows(input)` | Session projection | Merge agent/team sources into one row list. | Workspace node + team nodes keyed by workspace root | Internal pure function for tests. |
| `resolveWorkspaceHistorySessionDisplayLabel(input)` | Session display label | Produce title/subtitle/fallback metadata. | `{ kind, explicitTitle?, summary?, sourceName, memberCount?, coordinator? }` | Pure function. |
| `state.isSessionExpanded(sessionKey)` / `toggleSession(sessionKey)` | Session detail expansion | Control team detail visibility. | Compound key: `${kind}:${sessionId}` | Avoid ambiguous raw ID. |
| `actions.onSelectSession(session)` | Session selection | Route to agent or team selection. | Discriminated session row | Optional wrapper over existing actions. |

Rule:
- Do not use one generic boundary when the subject or identity meaning differs.
- Split boundaries by subject or require an explicit compound identity shape.

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `getWorkspaceSessionNodes` | Yes | Yes | Low | Use workspace root, not mixed arbitrary filter. |
| `WorkspaceHistorySessionRow.sessionKey` | Yes | Yes | Low | Compound `agent:{runId}` / `team:{teamRunId}`. |
| `onSelectSession` | Yes | Yes | Low | Discriminated union avoids guessing ID kind. |
| Existing `selectedRunId` + `selectedTeamRunId` | Mostly | Partly | Medium | Add `isSessionSelected(session)` or selected session key in section state so row highlighting is explicit. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Session row | `WorkspaceHistorySessionRow` | Yes | Low | Use consistently in types/components. |
| Label resolver | `WorkspaceHistorySessionDisplayLabel` | Yes | Low | Avoid `summaryLabel` because title is not raw summary. |
| Old team group | `WorkspaceHistoryTeamDefinitionDisplayGroup` | Yes for old behavior, obsolete for target | High if retained | Remove from this surface. |
| Tree state | `useWorkspaceHistoryTreeState` | Acceptable | Medium | It still says tree; okay because workspace/session/member remains a shallow tree. Do not keep old definition-tree methods. |

## Applied Patterns (If Any)

- Read-model projection: `runHistorySessionProjection.ts` converts backend/live grouped data into a UI-specific session list subject.
- Discriminated union: session rows use `kind: 'agent' | 'team'` with kind-specific payloads to avoid ambiguous IDs.
- Bounded local state: `useWorkspaceHistoryTreeState` holds expansion/reveal state as a local UI state machine.
- Adapter-style label resolver: `runHistorySessionLabels.ts` adapts prompt-derived legacy summary into display-label semantics.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/runHistorySessionLabels.ts` | File | Run history read model | Session display-label resolution. | Near store/read model, not component styling. | Vue rendering or LLM generation. |
| `autobyteus-web/stores/runHistorySessionProjection.ts` | File | Run history read model | Session row projection and sorting. | Existing run history read model files live under `stores`. | Component action handlers. |
| `autobyteus-web/stores/runHistoryStore.ts` | File | Store facade | Public getter/action for session rows. | Existing facade for components. | Row rendering details. |
| `autobyteus-web/composables/useWorkspaceHistoryTreeState.ts` | File | Local UI state | Workspace/session/member expansion/reveal. | Existing state owner. | Data projection/label rules. |
| `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | File | Panel orchestration | Wire store/session projection into section components. | Existing panel. | Per-row template logic. |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | File | Workspace section | Workspace shell plus sessions list. | Existing per-workspace boundary. | Team-definition grouping logic. |
| `autobyteus-web/components/workspace/history/WorkspaceHistorySessionRow.vue` | File | Session row | Direct session row. | New row component keeps section small. | Member tree recursion. |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryTeamMemberRows.vue` | File | Team details | Nested member rows. | Details are a separate concern. | Session row title/action policy. |

Rules:
- If the design has meaningful structural depth, usually reflect it in folders rather than flattening everything into one mixed directory.
- Do not place transport entrypoints, main-line domain/control nodes, persistence, adapters, and unrelated off-spine concerns in one flat folder when that hides ownership or structural depth.
- A compact layout is acceptable here because the existing workspace history subsystem already lives in one `components/workspace/history` folder; split by file responsibility inside that folder is sufficient.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-web/stores` run history files | Main-Line Domain-Control / read model | Yes | Medium | Store folder already contains run-history read models; name new files explicitly. |
| `autobyteus-web/components/workspace/history` | UI rendering | Yes | Low | Existing folder is correct; split row/details components. |
| `autobyteus-web/composables` | Local UI state/actions | Yes | Low | Existing composables remain state/action owners. |
| `autobyteus-server-ts/src/run-history` | Persistence/API | Yes | Low | No changes planned in this iteration. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Team session row hierarchy | `Workspace -> [SE] Improve session history navigation -> solution_designer / architecture_reviewer` | `Workspace -> Teams -> Software Engineering Team (6) -> Improve session history navigation -> solution_designer` | Shows reduced hierarchy depth. |
| Session row subject | `WorkspaceHistorySessionRow { kind: 'team', sessionId: teamRunId, displayLabel, teamRun }` | Component receives `teamDefinitions` and loops groups/runs/members inline. | Keeps session as the user-facing owner. |
| Label usage | `{{ session.displayLabel.title }}` and `{{ session.displayLabel.subtitle }}` | `{{ formatTeamRunLabel(team.summary) }}` in template | Prevents raw summary from remaining the title boundary. |
| Selection | `onSelectSession(session)` dispatches by discriminated kind to existing actions. | Row directly calls `openTeamMemberRun(teamRunId, coordinator)` | Preserves selection owner and avoids hydration bypass. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Toggle between old grouped tree and new session list | Could reduce risk for users used to old grouping. | Rejected | Session-first list replaces old history surface. Agent/team launch pages remain for definition browsing. |
| Keep `Teams` heading while showing sessions below it | Would preserve old visual category. | Rejected | Team identity appears on each row as symbol/metadata. |
| Keep template-local summary formatting | Smaller patch. | Rejected | Label resolver owns display label; component uses `displayLabel`. |
| Backend `summary` renamed to `title` without data change | Seems easy but preserves semantic looseness. | Rejected | Keep `summary` as summary; create display-label/title boundary. |

Hard block:
- Any design that depends on backward-compatibility wrappers, dual-path behavior, or retained legacy flow for in-scope replaced behavior fails review.

## Derived Layering (If Useful)

- Store/read model layer: existing history data -> session projection -> display labels.
- UI orchestration layer: panel wires store state/actions to sections.
- UI rendering layer: workspace section -> session row -> optional team member details.
- Runtime/history behavior layer: existing selection/mutation/hydration services remain below action contracts.

## Migration / Refactor Sequence

1. Add `runHistorySessionLabels.ts` with pure label resolver and unit tests.
2. Add `runHistorySessionProjection.ts` with session row types, merge/sort logic, and unit tests.
3. Extend `runHistoryStore.ts` with a session-row getter that composes existing `getTreeNodes()` and `getTeamNodes()` results.
4. Refactor `useWorkspaceHistoryTreeState.ts`:
   - keep workspace expansion;
   - remove agent/team-definition expansion;
   - add session expansion keyed by compound session key;
   - update selection reveal to expand workspace + team session only.
5. Update `workspaceHistorySectionContracts.ts` for session-oriented state/actions and selected-session highlighting.
6. Split rendering:
   - create `WorkspaceHistorySessionRow.vue`;
   - create `WorkspaceHistoryTeamMemberRows.vue`;
   - simplify `WorkspaceHistoryWorkspaceSection.vue` to workspace shell + session list.
7. Update `WorkspaceAgentRunsTreePanel.vue` wiring to pass session rows instead of `workspaceTeams` and `workspaceTeamHistoryGroups`.
8. Remove/decommission `workspaceHistoryTeamDefinitionGroups.ts` if unused, and remove old imports/tests.
9. Update tests:
   - component tests for direct team/agent session rows;
   - team selection still focuses coordinator/default member;
   - member details expansion and member selection;
   - label resolver fallback and wrapper stripping;
   - mutation actions remain visible for active/inactive rows;
   - no visible `Teams` heading/team-definition group rows in history.
10. Run targeted frontend tests for workspace history and run-history store/read-model coverage.

## Key Tradeoffs

- Frontend-only display-label projection avoids backend migrations and codegen churn but does not solve rich generated titles for old sessions. It creates the correct boundary for future generated titles.
- Removing per-definition grouping removes a convenient quick-create location in this sidebar. The tradeoff is intentional: history should optimize for finding sessions, while Agents/Agent Teams surfaces remain definition/launch surfaces.
- Splitting row/details components adds files but prevents the workspace section from becoming a mixed-concern renderer.

## Risks

- Existing tests may be tightly coupled to old `data-test` selectors and grouping. Implementation must update them intentionally rather than preserving old structure for tests.
- Some users may rely on agent/team grouping to create new sessions. If feedback shows this is important, add a separate compact launch affordance outside the history list, not by restoring definition groups.
- If future persisted `displayTitle` lands, GraphQL schema/codegen and server record types need a follow-up migration/design; this design keeps the front-end read-model seam ready.
- Sorting mixed active/team/agent sessions may expose timestamp inconsistencies because persisted `lastActivityAt` currently maps to `createdAt` for history rows.

## Guidance For Implementation

- Start with pure projection/label tests before editing Vue templates.
- Use discriminated session row types; avoid optional-field bags that mix team and agent properties.
- Keep `summary` in the data model as raw/legacy text; never render it directly as primary row text.
- Preserve current team coordinator/default member selection by reusing `useWorkspaceHistorySelectionActions` logic.
- Use compound session keys (`agent:${runId}`, `team:${teamRunId}`) for expansion and selection reveal.
- Keep action visibility rules exactly equivalent to current agent/team branches.
- Ensure the final UI has no visible `Teams` heading or `Software Engineering Team (n)` group row inside workspace history.

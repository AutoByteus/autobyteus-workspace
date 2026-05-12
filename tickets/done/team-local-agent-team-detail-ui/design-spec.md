# Design Spec

## Current-State Read

The current frontend already has the data needed to present team-local agent details in the Agent Team detail page, but the UI boundary is misaligned with product ownership.

Current paths:

- `pages/agent-teams.vue` routes `?view=team-detail&id=<teamId>` into `components/agentTeams/AgentTeamDetail.vue`.
- `AgentTeamDetail.vue` fetches both `agentTeamDefinitionStore.fetchAllAgentTeamDefinitions()` and `agentDefinitionStore.fetchAllAgentDefinitions()` on mount.
- Team-local member display already resolves the canonical agent definition id with `buildTeamLocalAgentDefinitionId(teamDef.id, node.ref)` for member avatar/name lookup.
- Member cards in `AgentTeamDetail.vue` remain shallow: member name, blueprint name, type badge, `Team-local` badge, and coordinator badge. Recent prototype/screenshot feedback showed an early large repeated `View member agent details` button shape is too visually heavy for dense member grids.
- Full team-local agent detail/edit today is only practical through the generic Agents page route, `pages/agents.vue -> AgentDetail / AgentEdit`.
- Shared/global individual-agent members in an Agent Team also lack a direct lightweight path from the team member card to the existing Agent Detail page.
- `AgentList.vue` renders team-local agent groups in browse mode and includes team-local definitions in flat search results.

Current ownership issue:

- Product ownership says a `TEAM_LOCAL` agent is scoped to and owned by its agent team.
- The UI makes the global Agents catalog the primary place to inspect/edit team-local definitions, which crowds the Agents page and forces users out of the team context.

Target constraints:

- Application-owned agents stay unchanged for this ticket.
- Shared agents and nested teams do not get redesigned in this ticket.
- Existing backend query/mutation shapes remain sufficient; no backend or schema work is needed.
- Direct `/agents?view=detail&id=<team-local-id>` and `/agents?view=edit&id=<team-local-id>` behavior is not intentionally removed, but normal discovery shifts to the owning team.

## Intended Change

Make Agent Team detail the primary view/edit surface for team-local agent members:

1. Team-local agent member cards become expandable accordions in `AgentTeamDetail.vue`.
2. Expanded team-local members show full agent details inline inside the team page.
3. Team-local member actions are compact (`Details`/chevron/icon) and secondary, not large full-width buttons repeated across cards.
4. Team-local member editing occurs inside the expanded team member context and saves through the existing `agentDefinitionStore.updateAgentDefinition(...)` mutation path.
5. Shared/global individual-agent members get a compact `View`/external-link action that routes to the existing Agent Detail page for that agent, with return context to the originating team when practical.
6. The Agents page no longer shows team-local agents in normal browse or normal search results.
7. Application-owned agent behavior remains as it is today.

Text-shape target:

```text
Agent Team Detail
  Members
    ▸ solution_designer       AGENT · TEAM-LOCAL · COORDINATOR     Details ▾
    ▾ implementation_engineer AGENT · TEAM-LOCAL                   Hide ▴
        Description
        Instructions
        Skills
        Tools
        Default runtime/model
        [Edit]

    professor                 AGENT · SHARED · COORDINATOR         View ↗
    student                   AGENT · SHARED                       View ↗
```

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / Feature
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, bounded frontend refactor
- Evidence: `AgentTeamDetail.vue` already loads agent definitions and resolves team-local member ids, but exposes only shallow member cards. `AgentList.vue` promotes team-local definitions as generic catalog cards even though the user expectation is to inspect/edit team-owned members while remaining inside the team detail page.
- Design response: Move team-local member read/edit interaction into a dedicated team-owned member-detail component under the Agent Teams surface; use compact member-card actions; add a route-to-Agent-Detail action for shared/global members; extract reusable agent detail sections so Agent Detail and Team Detail do not duplicate rendering; extend the existing agent form with an embedded variant so edit submission shape remains canonical.
- Refactor rationale: Adding detail/edit directly into `AgentTeamDetail.vue` by copy-pasting `AgentDetail.vue` and `AgentEdit.vue` would create duplicated rendering/edit rules. A small extraction keeps one agent detail renderer and one agent form submit shape while changing only the ownership surface.
- Intentional deferrals and residual risk, if any: Application-owned member ownership remains deferred by user request. Settings/featured catalog may still list a team-local agent if manually configured, but the Agents page will not display team-local definitions in normal catalog discovery. A future advanced/debug filter for team-local agents is out of scope.

## Terminology

- `Team-local agent`: an `AgentDefinition` whose normalized ownership scope is `TEAM_LOCAL` and whose owning team identifies where it should be primarily viewed/edited.
- `Team-local member node`: a `TeamMemberInput` with `refType === 'AGENT'` and `refScope === 'TEAM_LOCAL'`.
- `Canonical team-local agent definition id`: the persisted `AgentDefinition.id` derived by `buildTeamLocalAgentDefinitionId(teamDefinitionId, node.ref)`.
- `Embedded edit`: an edit experience rendered inside Agent Team detail, not a route to the generic Agents page.
- `Shared/global member view`: a compact member-card action for `SHARED` agent members that navigates to the existing Agent Detail page rather than rendering shared-agent details inline.

## Design Reading Order

Read this design from:

1. team detail member expansion/view/edit spines,
2. Agents page catalog-filter spine,
3. component ownership and reusable agent detail/form extraction,
4. file-by-file mapping and validation.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove normal Agents-page browse/search discovery of team-local agents from the in-scope catalog UI.
- This design does not keep a dual normal path where team-local agents are both primary in Agent Team detail and still first-class normal cards in Agents browse/search.
- Direct route support for an already-known team-local id is not treated as a legacy discovery path; it remains because it is not the in-scope user-facing catalog flow being replaced.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-TL-001 | Primary End-to-End | User opens Agent Team detail and expands a team-local member | Full team-local agent details render inside the team page | `AgentTeamDetail.vue` with `TeamLocalAgentMemberDetails.vue` | This is the new primary inspection path. |
| DS-TL-002 | Primary End-to-End | User edits a team-local member agent in the expanded panel | `agentDefinitionStore.updateAgentDefinition(...)` persists and read view refreshes | `TeamLocalAgentMemberDetails.vue` plus `agentDefinitionStore` | This is the new primary edit path while staying in team context. |
| DS-TL-003 | Primary End-to-End | User opens/searches Agents page | Agents catalog excludes `TEAM_LOCAL` definitions but keeps shared/application-owned definitions | `AgentList.vue` | This removes crowding and reinforces ownership. |
| DS-TL-004 | Return-Event | Agent definition update succeeds/fails | Team-local expanded panel returns to read mode or shows failure | `TeamLocalAgentMemberDetails.vue` | This governs edit feedback and local state cleanup. |
| DS-TL-005 | Bounded Local | User toggles a member accordion | Expanded/collapsed member state updates | `AgentTeamDetail.vue` or extracted member card owner | This keeps expansion state local to team detail UI. |
| DS-TL-006 | Primary End-to-End | User clicks `View` on a shared/global agent member | Existing Agent Detail page opens for that shared agent and can return to the originating team | `AgentTeamDetail.vue` for action; `AgentDetail.vue` for destination/return | This gives teams made from global agents a direct inspection path without inline shared-agent redesign. |

## Primary Execution Spine(s)

- `DS-TL-001`: `AgentTeam route -> AgentTeamDetail -> team member node -> canonical team-local id resolver -> agentDefinitionStore lookup -> TeamLocalAgentMemberDetails -> AgentDefinitionDetailSections`
- `DS-TL-002`: `Expanded team-local member -> embedded AgentDefinitionForm -> TeamLocalAgentMemberDetails submit handler -> agentDefinitionStore.updateAgentDefinition -> Pinia definition update -> expanded read view`
- `DS-TL-003`: `Agents route -> AgentList -> discoverable agent filter -> featured split/origin grouping/search -> AgentCard grid`
- `DS-TL-006`: `AgentTeamDetail shared member card -> compact View action -> /agents?view=detail&id=<agentId>&returnToTeam=<teamId> -> AgentDetail -> Back to originating team`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-TL-001 | When a user expands a team-local member, the team detail owner resolves the member node to the canonical `AgentDefinition`, then renders reusable read-only agent detail sections inline. | Team detail, team member node, canonical team-local agent definition, embedded detail sections | `AgentTeamDetail.vue` orchestrates member list; `TeamLocalAgentMemberDetails.vue` owns expanded team-local member content | Id canonicalization, avatar fallback, localization, optional processor display |
| DS-TL-002 | The expanded member switches into edit mode, reuses the existing agent form shape, saves through the agent-definition store, and returns to the read-only expanded state on success. | Expanded team-local member, embedded edit form, agent definition update store | `TeamLocalAgentMemberDetails.vue` owns edit state; `agentDefinitionStore` owns persistence | Toast/notification, submit busy state, cancel reset |
| DS-TL-003 | The Agents page builds a discoverable list by excluding `TEAM_LOCAL`, then applies existing featured/origin/search presentation to the remaining shared/application-owned definitions. | Agent catalog, discoverable filter, featured split, origin sections/search result grid | `AgentList.vue` owns catalog presentation | Featured setting parse, normalized ownership scope, application grouping |
| DS-TL-004 | Save success/failure is handled as a local event from the update promise: success exits edit mode and surfaces success; failure keeps edit mode and surfaces an error. | Update result, edit state, notification | `TeamLocalAgentMemberDetails.vue` | Error text localization, store error propagation |
| DS-TL-005 | Expander state changes do not mutate team or agent definitions; they only control UI visibility for team-local detail panels. | Member key, expanded-key state | `AgentTeamDetail.vue` or `AgentTeamMemberCard.vue` | Stable member key generation |
| DS-TL-006 | A shared/global member card routes to the existing Agent Detail page with the shared agent's canonical id and optional team return context. Agent Detail remains the detail owner for shared agents. | Shared member node, route action, Agent Detail route, return action | `AgentTeamDetail.vue` initiates; `AgentDetail.vue` owns destination | Route query shape, return label |

## Spine Actors / Main-Line Nodes

- `AgentTeamDetail.vue`: route-level team detail owner and member-list orchestrator.
- `TeamMemberInput`: team composition node that identifies whether a member is team-local.
- `teamLocalAgentDefinitionId` utility: authoritative canonical id boundary for team-local agent records.
- `TeamLocalAgentMemberDetails.vue`: embedded read/edit owner for one team-local member agent.
- `AgentDefinitionDetailSections.vue`: reusable read-only agent detail renderer.
- `AgentDefinitionForm.vue`: canonical agent definition edit form, extended with embedded layout.
- `agentDefinitionStore`: persistence boundary for updating agent definitions.
- `AgentList.vue`: global Agents catalog presentation owner.
- `AgentDetail.vue`: existing shared/global agent detail destination and optional team-return action owner.

## Ownership Map

| Node | Owns |
| --- | --- |
| `AgentTeamDetail.vue` | Team detail lifecycle, loaded team/member presentation, member expansion keys, resolving member nodes to referenced definitions, deciding which member types receive team-local expansion, and initiating compact route-to-detail actions for shared/global members. |
| `TeamLocalAgentMemberDetails.vue` | One team-local member's expanded read/edit state, update submission, save/cancel transition, and member-local feedback events. |
| `AgentDefinitionDetailSections.vue` | Read-only rendering of an `AgentDefinition`'s description, instructions, launch defaults, skills, tools, and optional processors. It does not own navigation, run/edit/delete actions, or persistence. |
| `AgentDefinitionForm.vue` | Form state and submit payload shape for creating/updating an agent definition. It does not own persistence. |
| `agentDefinitionStore` | Fetching, caching, and mutating `AgentDefinition` records through GraphQL. |
| `AgentList.vue` | Which agent definitions are discoverable in the global Agents catalog and how they are grouped/searched/rendered. |
| `AgentDetail.vue` | Existing agent detail page actions/navigation. When reached from a team member shared-agent `View` action, it may use return context to navigate back to the originating team detail page. |

If `pages/agent-teams.vue` and `pages/agents.vue` are public route facades, they remain thin route wrappers. They do not own team-local membership rules.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `pages/agent-teams.vue` | `AgentTeamDetail.vue`, `AgentTeamList.vue`, create/edit components by route query | Query-param route switching | Team-local member expansion or edit policy |
| `pages/agents.vue` | `AgentList.vue`, `AgentDetail.vue`, `AgentEdit.vue` | Query-param route switching | Catalog ownership filtering beyond passing route state |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `AgentList.vue` team-local browse section rendering | Team-local agents are no longer normal Agents catalog browse content | `AgentTeamDetail.vue` + `TeamLocalAgentMemberDetails.vue` | In This Change | Remove the template block that renders `originSections.teamLocalGroups`. |
| Large repeated member-card detail button shape | It makes dense member grids noisy and was rejected in user clarification | Compact `Details`/`View` text+icon actions owned by `AgentTeamDetail.vue`/member card | In This Change | Keep accessibility labels verbose while visual labels stay short. |
| Team-local inclusion in `AgentList.vue` normal search results | Search should reinforce that team-local definitions are found through their owning team | `AgentList.vue` discoverable-definition filter | In This Change | Filter before search/featured split. |
| Read-only agent detail markup duplicated inside future team member panel | Copy/paste would create drift from `AgentDetail.vue` | `AgentDefinitionDetailSections.vue` | In This Change | Extract from current `AgentDetail.vue` right-side detail sections. |
| Page-only form shell for all usages of `AgentDefinitionForm.vue` | Embedded team-local editing needs the same form payload without page-card styling | `AgentDefinitionForm.vue` `variant` prop | In This Change | Default remains page variant; embedded variant is not a compatibility fork. |
| Agent docs claim that team-local agents are normal Agents-page browse/edit items | New ownership model makes this inaccurate | Updated `docs/agent_management.md` and `docs/agent_teams.md` | In This Change | Document application-owned unchanged. |

## Return Or Event Spine(s) (If Applicable)

- `DS-TL-004`: `agentDefinitionStore.updateAgentDefinition promise -> success branch -> store updates definition list -> TeamLocalAgentMemberDetails exits edit mode -> parent/global notification -> AgentDefinitionDetailSections re-renders from updated prop`.
- Failure branch: `update promise rejection/null -> TeamLocalAgentMemberDetails keeps edit mode -> localized error feedback -> no mutation to expanded read state`.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `AgentTeamDetail.vue` or extracted member card.
  - Chain: `toggle click -> memberKey -> expandedMemberKeys replacement -> v-if detail panel render/hide`.
  - Why it matters: Expansion is presentation state only; it must not alter `teamDef.nodes` or `AgentDefinition` records.

- Parent owner: `TeamLocalAgentMemberDetails.vue`.
  - Chain: `Edit click -> local mode=edit -> form draft initialized from agentDef -> Save/Cancel -> mode=read or remain edit on failure`.
  - Why it matters: Edit cancellation must not leak partial changes into the Pinia store.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Team-local id canonicalization | DS-TL-001, DS-TL-002 | `AgentTeamDetail.vue`, `TeamLocalAgentMemberDetails.vue` | Convert team id + local node ref to persisted `AgentDefinition.id` | Prevents a second id rule | Inline string building could break consistency with runtime/team form paths. |
| Agent detail section rendering | DS-TL-001 | `AgentDetail.vue`, `TeamLocalAgentMemberDetails.vue` | Render stable read-only definition sections | Prevents duplicated read-only markup | Copy-paste would drift fields/labels across surfaces. |
| Embedded form layout | DS-TL-002 | `TeamLocalAgentMemberDetails.vue` | Reuse full agent form with tighter container | Keeps submit shape canonical | A second team-local-only edit form would duplicate mapping and validation. |
| Catalog ownership filter | DS-TL-003 | `AgentList.vue` | Exclude `TEAM_LOCAL` before search/featured/origin display | Implements global catalog decluttering | Filtering after grouping/search could leak team-local cards in some modes. |
| Compact member actions | DS-TL-001, DS-TL-006 | `AgentTeamDetail.vue` / member card | Present `Details` for team-local expansion and `View ↗` for shared/global navigation without large repeated buttons | Keeps member grid scannable | Full-width action buttons can dominate each card and obscure member identity. |
| Shared/global member detail routing | DS-TL-006 | `AgentTeamDetail.vue`, `AgentDetail.vue` | Route shared/global member inspection to existing Agent Detail with optional return context | Reuses the right owner for shared-agent details | Inline shared-agent rendering would broaden scope and confuse ownership. |
| Localization | All | UI components | Add user-facing labels/messages in existing localization files | Guards literal audit and Chinese/English parity | Hard-coded labels could fail localization guard and create mixed language UI. |
| Documentation | All | Maintainers/users | Update module docs for changed ownership UX | Keeps future work from restoring old behavior | Stale docs would reintroduce Agents-page team-local assumptions. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Fetch/update agent definitions | `stores/agentDefinitionStore.ts` | Reuse | Already owns GraphQL fetch/update and Pinia cache | N/A |
| Resolve team-local ids | `utils/teamLocalAgentDefinitionId.ts` | Reuse | Existing canonical id builder/parser | N/A |
| Agent edit form payload | `components/agents/AgentDefinitionForm.vue` | Extend | Existing form maps all editable fields and launch defaults | N/A |
| Read-only agent details | `AgentDetail.vue` markup | Create reusable extracted component | Current capability exists only embedded in route page; needs reuse without page actions | Existing route component also owns run/edit/delete/navigation, which would be wrong inside team member panel. |
| Team member expanded UX | Agent Teams component area | Create focused component | No existing component owns expanded team-local member read/edit | Generic AgentDetail page would force navigation out of team context. |
| Shared/global member inspection | Existing Agent Detail route | Reuse/extend | Shared/global agents are owned by the existing Agent Detail page, not by the team-local inline panel | N/A |
| Agents page grouping | `AgentList.vue` + `agentDefinitionOriginGroups.ts` | Extend/adjust | Current grouping handles application/shared; list owner can filter team-local out | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent Teams UI | Team detail member expansion, compact member actions, embedded team-local member read/edit, and shared/global member view routing | DS-TL-001, DS-TL-002, DS-TL-005, DS-TL-006 | `AgentTeamDetail.vue`, `TeamLocalAgentMemberDetails.vue` | Extend | Primary product surface for team-local definitions; initiates shared-agent view navigation without owning shared-agent details. |
| Agents UI | Reusable read-only details and reusable form | DS-TL-001, DS-TL-002 | `AgentDetail.vue`, `TeamLocalAgentMemberDetails.vue` | Extend | Agent definition display/edit stays canonical. |
| Agents Catalog UI | Global Agents list filtering/search/grouping | DS-TL-003 | `AgentList.vue` | Extend | Removes normal team-local discovery. |
| Agent Definition Store | Data persistence for agent definitions | DS-TL-002 | `TeamLocalAgentMemberDetails.vue`, existing Agent pages | Reuse | No schema change. |
| Docs | Product ownership documentation | All | Maintainers/users | Extend | Update docs after code. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `components/agents/AgentDefinitionDetailSections.vue` | Agents UI | Reusable agent detail renderer | Read-only definition sections without page actions | One clear rendering concern shared by page and embedded surfaces | `AgentDefinition` |
| `components/agents/AgentDefinitionForm.vue` | Agents UI | Agent definition form | Add `variant` prop for page/embedded shell while preserving submit payload | Same form fields and mapping should stay canonical | `normalizeDefaultLaunchConfig` |
| `components/agentTeams/TeamLocalAgentMemberDetails.vue` | Agent Teams UI | Team-local member embedded detail/edit owner | Read/edit mode for one team-local `AgentDefinition` in team context | Isolates new team-local UX from route-level `AgentTeamDetail.vue` | `AgentDefinitionDetailSections`, `AgentDefinitionForm` |
| `components/agents/AgentDetail.vue` | Agents UI | Existing agent detail route | Add optional return-to-team behavior when route query includes team context | Shared/global member `View` should reuse existing detail page while preserving user orientation | Vue route query |
| `components/agentTeams/AgentTeamDetail.vue` | Agent Teams UI | Team detail route component | Resolve member definitions, render member cards, mount team-local detail component, own expansion keys | Route-level team detail stays orchestrator, not field-level renderer | `buildTeamLocalAgentDefinitionId` |
| `components/agents/AgentList.vue` | Agents Catalog UI | Catalog presentation owner | Exclude team-local definitions before search/featured/grouping | Catalog ownership rule belongs here | `normalizeDefinitionOwnershipScope` |
| `localization/messages/en/*.ts`, `zh-CN/*.ts` | Localization | Message catalogs | Add/remove labels for new UX and decommissioned team-local catalog labels | Keeps literal guard satisfied | N/A |
| Tests | Validation | Component behavior | Update/add coverage | Protects behavior change | N/A |
| Docs | Documentation | Module docs | Update ownership model | Prevents future design drift | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Agent read-only sections: description, launch defaults, instructions, skills, tools, optional processors | `components/agents/AgentDefinitionDetailSections.vue` | Agents UI | Needed by route Agent Detail and team-local embedded detail | Yes; no route actions included | Yes; no duplicate optional-processor calculations in parent components | A page-level component with navigation/run/edit/delete actions |
| Agent form outer styling variants | `components/agents/AgentDefinitionForm.vue` `variant` prop | Agents UI | Same form shape needed in page and embedded card | Yes; same submit payload | Yes; no second form DTO | A separate team-local-only form with duplicated field mapping |
| Team-local canonical id | Existing `utils/teamLocalAgentDefinitionId.ts` | Shared utility with team definition ownership | Already canonical | Yes | Yes | Inline ad hoc string concatenation |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentDefinition` | Yes | N/A | Low | Reuse existing store type. |
| `TeamMemberInput` | Yes for this scope (`ref` is local id for team-local members, global id for shared/app-owned) | N/A | Medium due scope-dependent `ref` meaning | Always resolve through `buildTeamLocalAgentDefinitionId` for `TEAM_LOCAL`; do not treat `node.ref` as canonical definition id in team-local branch. |
| `AgentDefinitionForm` submit payload | Yes | Yes | Low | Keep one submit shape for page and embedded variants. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/agents/AgentDefinitionDetailSections.vue` | Agents UI | Reusable read-only agent definition detail boundary | Render description, metadata, `ExpandableInstructionCard`, skills, tools, optional processor details | Shared pure presentation with no route/team persistence policy | `AgentDefinition` |
| `autobyteus-web/components/agents/AgentDetail.vue` | Agents UI | Agent detail route/page owner | Keep avatar/sidebar/actions/navigation, delegate right-side read-only content to `AgentDefinitionDetailSections`, and support optional return-to-team navigation when reached from a team shared-member card | Separates page actions from reusable content and preserves cross-surface navigation context | `AgentDefinitionDetailSections` |
| `autobyteus-web/components/agents/AgentDefinitionForm.vue` | Agents UI | Agent definition form owner | Add embedded layout variant; keep field state, option loading, and submit payload canonical | Avoids a duplicated team-local editor | Existing launch config helpers |
| `autobyteus-web/components/agentTeams/TeamLocalAgentMemberDetails.vue` | Agent Teams UI | Embedded team-local member read/edit owner | Render read mode using detail sections; edit mode using embedded form; save through store; emit feedback/collapse events | One component owns one team-local member interaction | `AgentDefinitionDetailSections`, `AgentDefinitionForm`, `agentDefinitionStore` |
| `autobyteus-web/components/agentTeams/AgentTeamDetail.vue` | Agent Teams UI | Agent Team detail orchestrator | Resolve team-local agent definitions, render compact expand/collapse controls for team-local members, mount member details, render compact shared/global `View` route action, keep application-owned/nested behavior unchanged | Route-level team composition owner | `buildTeamLocalAgentDefinitionId` |
| `autobyteus-web/components/agents/AgentList.vue` | Agents Catalog UI | Global catalog owner | Build `discoverableAgentDefinitions` excluding team-local; use it for search and featured/origin sections; remove team-local group template | Catalog discovery policy belongs here | `normalizeDefinitionOwnershipScope`, featured catalog helpers |
| `autobyteus-web/docs/agent_management.md` | Docs | Agents module documentation | Document that team-local agents are not normal Agents catalog content | Keeps ownership guidance explicit | N/A |
| `autobyteus-web/docs/agent_teams.md` | Docs | Agent Teams module documentation | Document inline team-local details/editing | Keeps new UX discoverable | N/A |

## Ownership Boundaries

- `AgentTeamDetail.vue` is the authoritative UI boundary for team member card actions in the team context. It may look up referenced agent definitions, but it should delegate detailed team-local read/edit mechanics to `TeamLocalAgentMemberDetails.vue`. For shared/global members, it should only initiate navigation to `AgentDetail.vue` instead of rendering shared-agent details inline.
- `TeamLocalAgentMemberDetails.vue` is the authoritative embedded interaction boundary for one team-local agent. It should not mutate `teamDef.nodes`; it only edits the associated `AgentDefinition`.
- `AgentDefinitionDetailSections.vue` is a pure presentation boundary. It must not own update calls, route navigation, run-agent behavior, delete, duplicate, or team membership decisions.
- `AgentDefinitionForm.vue` remains the authoritative form-state and submit-payload boundary for agent definition edits. The embedded variant changes only layout, not semantic payload.
- `agentDefinitionStore` remains the authoritative persistence boundary for updating definitions.
- `AgentList.vue` is the authoritative normal Agents catalog boundary. It should exclude team-local definitions before any featured/group/search presentation work.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `TeamLocalAgentMemberDetails.vue` | Read/edit mode, save/cancel, embedded form submission | `AgentTeamDetail.vue` | Parent manually duplicating edit form fields and update mapping | Add props/events to member detail component |
| `AgentDefinitionDetailSections.vue` | Optional processor list calculation, detail section markup | `AgentDetail.vue`, `TeamLocalAgentMemberDetails.vue` | Copying the same detail markup into team component | Extend presentation props/variant |
| `AgentDefinitionForm.vue` | Field state, launch config normalization, submit payload | `AgentEdit.vue`, `TeamLocalAgentMemberDetails.vue` | Creating a second form mapping for team-local edits | Add layout/config props while preserving payload |
| `agentDefinitionStore.updateAgentDefinition` | GraphQL mutation and Pinia cache update | Agent edit surfaces | Calling GraphQL mutation directly from component | Add/extend store action if needed |
| `AgentList.vue` discoverable list | Catalog-level team-local exclusion | Template rendering and search computed values | Filtering only some sections and accidentally leaking team-local in search/featured | Centralize in `discoverableAgentDefinitions` computed |
| `AgentDetail.vue` optional team return | Route-query return context and back action | Shared/global member `View` navigation from `AgentTeamDetail.vue` | Forcing users to backtrack through Agents list after inspecting a team member | Add a narrow return-to-team query contract; do not add shared-agent inline detail. |

## Dependency Rules

Allowed:

- `AgentTeamDetail.vue` may import `TeamLocalAgentMemberDetails.vue`, `buildTeamLocalAgentDefinitionId`, use agent/team stores, and use router navigation for compact shared/global member `View` actions.
- `TeamLocalAgentMemberDetails.vue` may import `AgentDefinitionDetailSections.vue`, `AgentDefinitionForm.vue`, and `useAgentDefinitionStore`.
- `AgentDefinitionDetailSections.vue` may import `ExpandableInstructionCard` and `AgentDefinition` type only; it must remain presentation-only.
- `AgentDefinitionForm.vue` may accept a new `variant` prop but must keep default page behavior for existing callers.
- `AgentList.vue` may use `normalizeDefinitionOwnershipScope` to create a single discoverable list before downstream display computation.

Forbidden:

- Do not route team-local edit through `/agents` as the primary team-local member action.
- Do not render shared/global member details inline in this ticket; route `SHARED` member view to Agent Detail instead.
- Do not inline-build team-local ids with string concatenation.
- Do not duplicate `AgentDefinitionForm` field mapping in a new team-local-only editor.
- Do not let `AgentDefinitionDetailSections.vue` own route navigation, run, edit, duplicate, delete, or persistence.
- Do not alter application-owned filtering/edit behavior in this task.
- Do not filter team-local definitions only in the template while leaving search/featured computation able to leak them.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `buildTeamLocalAgentDefinitionId(teamId, agentId)` | Team-local definition identity | Convert team id + local agent id to canonical persisted definition id | `teamId: string`, `agentId: string` | Must be used for `node.refScope === 'TEAM_LOCAL'`. |
| `agentDefinitionStore.getAgentDefinitionById(id)` | Agent definition lookup | Return loaded definition by canonical id | Canonical `AgentDefinition.id` | For team-local, pass built id, not raw `node.ref`. |
| `agentDefinitionStore.updateAgentDefinition(input)` | Agent definition persistence | Persist updates and refresh Pinia state | `UpdateAgentDefinitionInput` with canonical `id` | Used by embedded edit and existing AgentEdit. |
| `AgentDefinitionForm @submit` | Agent edit payload | Emit normalized editable fields without owning persistence | Form payload excluding id | Existing contract remains. |
| `TeamLocalAgentMemberDetails @saved/@error/@collapse` | Embedded member events | Inform parent of feedback/collapse needs | Event payload with message/agent id as needed | Keep parent notification optional. |
| `AgentTeamDetail` shared member view action | Shared/global member inspection | Navigate to Agent Detail | `node.ref` for `SHARED` agent member plus current `teamDef.id` as return context | Only for resolvable shared/global agent members; application-owned unchanged. |
| `AgentDetail` return-to-team query | Cross-surface return navigation | Back action can return user to originating team | `returnToTeam=<teamDefinitionId>` query parameter | Falls back to Back to Agents when absent. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `buildTeamLocalAgentDefinitionId` | Yes | Yes | Low | Reuse existing utility. |
| `getAgentDefinitionById` | Yes | Yes if caller passes canonical id | Medium for team-local callers | Centralize team-local canonical resolution in `AgentTeamDetail.vue`. |
| `updateAgentDefinition` | Yes | Yes | Low | Reuse store action. |
| `AgentDefinitionForm @submit` | Yes | N/A; form payload not persistent identity | Low | Add `variant` prop only. |
| Shared member `View` route | Yes | Yes: shared `AgentDefinition.id` and optional `returnToTeam` id | Low | Keep route shape explicit; do not pass raw team-local local ids through this path. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Embedded team-local member component | `TeamLocalAgentMemberDetails.vue` | Yes | Low | Name makes ownership and member scope explicit. |
| Reusable detail sections | `AgentDefinitionDetailSections.vue` | Yes | Low | Avoid naming it `AgentDetail` to prevent route/page confusion. |
| Discoverable list computed | `discoverableAgentDefinitions` | Yes | Low | Indicates catalog visibility, not full store contents. |
| Team-local canonical id helper | existing `buildTeamLocalAgentDefinitionId` | Yes | Low | Keep as authoritative. |

## Applied Patterns (If Any)

- Accordion / local UI state pattern in `AgentTeamDetail.vue`: expansion state is local presentation state and not persisted.
- Reusable presentation component pattern in `AgentDefinitionDetailSections.vue`: one pure renderer used by route and embedded contexts.
- Form variant pattern in `AgentDefinitionForm.vue`: same semantic form, two layout shells. This is not dual behavior; it is presentation configuration around the same submit contract.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/agentTeams/TeamLocalAgentMemberDetails.vue` | File | Agent Teams UI / team-local member detail | Embedded read/edit for team-local agent member | Team-local member UX belongs to Agent Teams surface | Generic shared/app-owned redesign, team node mutation |
| `autobyteus-web/components/agentTeams/AgentTeamDetail.vue` | File | Agent Team detail | Member list, compact team-local expansion, and shared/global `View` route orchestration | Existing route detail owner | Duplicated full agent detail/edit markup; inline shared-agent details |
| `autobyteus-web/components/agents/AgentDefinitionDetailSections.vue` | File | Agents UI reusable presentation | Agent definition read-only detail sections | Agent definition rendering belongs with Agents components and can be embedded elsewhere | Run/edit/delete/navigation/persistence |
| `autobyteus-web/components/agents/AgentDefinitionForm.vue` | File | Agents UI form | Add embedded layout variant | Existing canonical form owner | Separate persistence logic |
| `autobyteus-web/components/agents/AgentDetail.vue` | File | Agents route detail | Delegate read-only sections to extracted component and support optional return-to-team back action | Page still owns route actions/sidebar and shared-agent detail destination | Team-local member expansion logic |
| `autobyteus-web/components/agents/AgentList.vue` | File | Agents catalog | Exclude team-local definitions from normal catalog/search | Existing catalog owner | Team-detail member rendering |
| `autobyteus-web/localization/messages/en/agentTeams.ts` and `zh-CN/agentTeams.ts` | File | Localization | Add team-local member UI strings | Existing message catalogs | Hard-coded fallback strings in components |
| `autobyteus-web/localization/messages/en/agents.ts` and `zh-CN/agents.ts` | File | Localization | Remove/decommission team-local Agents-list labels if no longer used | Avoid stale catalog labels | Agent Team-specific copy |
| `autobyteus-web/components/agentTeams/__tests__/AgentTeamDetail.spec.ts` | File | Tests | Cover expand/read/edit/cancel for team-local member | Existing component test location | Backend integration |
| `autobyteus-web/components/agents/__tests__/AgentList.spec.ts` | File | Tests | Cover browse/search team-local exclusion and application-owned unchanged | Existing component test location | Agent Team detail behavior |
| `autobyteus-web/docs/agent_management.md` | File | Docs | Update Agents catalog behavior | Existing module doc | Application-owned redesign |
| `autobyteus-web/docs/agent_teams.md` | File | Docs | Update team-local member inline details/editing | Existing module doc | Backend runtime details |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `components/agentTeams/` | Main-line UI for Agent Teams | Yes | Low | New team-local member component belongs with team detail components. |
| `components/agents/` | Main-line UI for Agent Definitions | Yes | Low | Reusable agent definition sections/form belong with agent definition UI. |
| `stores/` | Persistence-provider/front-end state boundary | Yes | Low | Reuse only; no new store. |
| `utils/` | Off-spine identity utilities | Yes | Low | Existing team-local id utility is reused; no new identity utility. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Team-local id resolution | `const id = buildTeamLocalAgentDefinitionId(teamDef.id, node.ref)` | ``const id = `team-local:${teamDef.id}:${node.ref}` `` | Existing id utility is the boundary. |
| Embedded team-local edit | `TeamLocalAgentMemberDetails -> AgentDefinitionForm(variant='embedded') -> updateAgentDefinition({ id: agentDef.id, ...formData })` | `Edit button -> router.push('/agents?view=edit&id=...')` as primary action | User remains inside team context. |
| Compact member card actions | `Details ▾` for team-local, `View ↗` for shared/global | Repeated large `View member agent details` buttons | Keeps the Members grid clean and scannable. |
| Shared/global member view | `View ↗ -> /agents?view=detail&id=professor&returnToTeam=team-id` | Inline shared-agent details/editing inside Agent Team detail | Shared agents remain owned by the Agent Detail surface. |
| Agent detail reuse | `AgentDetail` and `TeamLocalAgentMemberDetails` both render `AgentDefinitionDetailSections` | Copy read-only sections into `AgentTeamDetail.vue` | Prevents field/label drift. |
| Agents catalog filter | `discoverableAgentDefinitions = agentDefinitions.filter(scope !== 'TEAM_LOCAL')`; all search/featured/grouping uses it | Hide only the team-local template section while search still finds team-local agents | Prevents leaks across display modes. |
| Application-owned scope | Application-owned definitions continue through current AgentList grouping and current member cards | Treat application-owned like team-local in this ticket | User explicitly deferred application-owned design. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep team-local agents visible in Agents browse under a collapsed section | Would preserve old discovery path for debugging | Rejected for normal UX | Remove normal browse section; team detail is primary. |
| Keep team-local agents searchable in Agents page while hiding browse section | Would preserve old search path | Rejected for normal UX | Filter team-local before search. |
| Duplicate a small team-local-only edit form | Might make embedded UI smaller | Rejected | Reuse `AgentDefinitionForm` with embedded layout variant. |
| Route `Edit member agent` to `/agents?view=edit` | Easy implementation using current page | Rejected as primary action | Save inline via `TeamLocalAgentMemberDetails`. |
| Large full-width member detail buttons | Initial/simple affordance for discoverability | Rejected | Use compact `Details`/`View` text+icon actions with accessible labels. |
| Inline details/edit for shared/global members | Could make every member inspectable in-place | Rejected for this scope | Use compact route-to-Agent-Detail `View` action. |
| Change application-owned agents together with team-local | Could produce consistency | Rejected / out of scope | Leave application-owned behavior unchanged. |

## Derived Layering (If Useful)

- Route facade layer: `pages/agent-teams.vue`, `pages/agents.vue`.
- UI orchestration layer: `AgentTeamDetail.vue`, `AgentList.vue`, `AgentDetail.vue` including optional team-return route handling.
- Reusable presentation/form layer: `TeamLocalAgentMemberDetails.vue`, `AgentDefinitionDetailSections.vue`, `AgentDefinitionForm.vue`.
- State/persistence layer: `agentDefinitionStore`, `agentTeamDefinitionStore`.
- Identity utility layer: `teamLocalAgentDefinitionId.ts`.

Layering is explanatory only; ownership boundaries above are authoritative.

## Migration / Refactor Sequence

1. Extract reusable read-only detail sections:
   - Add `components/agents/AgentDefinitionDetailSections.vue` from the existing right-side sections in `AgentDetail.vue`.
   - Move optional processor list calculation into this component.
   - Replace the matching section in `AgentDetail.vue` with the new component.
   - Verify Agent Detail tests still pass.

2. Add embedded form variant:
   - Add optional `variant?: 'page' | 'embedded'` prop to `AgentDefinitionForm.vue`, defaulting to `page`.
   - Use computed wrapper/spacing/button classes so existing create/edit pages remain visually unchanged.
   - Do not change emitted submit payload.

3. Add team-local member detail/edit component:
   - Add `components/agentTeams/TeamLocalAgentMemberDetails.vue`.
   - Props should include at least `agentDef`, `memberName`, `isCoordinator`, and optionally `teamName`/`memberLabel` for copy.
   - Read mode renders `AgentDefinitionDetailSections` in embedded variant plus `Edit member agent` action.
   - Edit mode renders `AgentDefinitionForm` in embedded variant with `initialData=agentDef`, `isCreateMode=false`, `submitButtonText` from Agent Teams localization.
   - Save calls `agentDefinitionStore.updateAgentDefinition({ id: agentDef.id, ...formData })`.
   - Success exits edit mode and emits or displays a localized success notification; failure remains in edit mode and surfaces localized error.
   - Cancel exits edit mode without calling update.

4. Wire Agent Team detail:
   - Add stable member key and `expandedMemberKeys` local state.
   - Add helpers:
     - `isTeamLocalAgentNode(node)`.
     - `isSharedAgentNode(node)` for `refType === 'AGENT'` and normalized/shared `refScope`.
     - `getAgentDefinitionForNode(node)` using `buildTeamLocalAgentDefinitionId` for team-local and `node.ref` for shared/global members.
     - `canExpandTeamLocalMember(node)` when node is team-local and definition is found.
     - `canViewSharedMember(node)` when node is shared/global and definition is found.
   - Add compact `Details`/chevron expand-collapse action only for resolvable team-local agent members. Avoid full-width member-details buttons.
   - Add compact `View ↗` action for resolvable shared/global agent members; route to `/agents?view=detail&id=<node.ref>&returnToTeam=<teamDef.id>`.
   - Render `TeamLocalAgentMemberDetails` inside the expanded area.
   - Render unresolved team-local message if a team-local node has no matching definition.
   - Leave application-owned/nested team behavior unchanged except for normal card coexistence.

5. Declutter Agents page:
   - Add `discoverableAgentDefinitions` computed that filters `normalizeDefinitionOwnershipScope(definition) !== 'TEAM_LOCAL'`.
   - Use `discoverableAgentDefinitions` for flat search, featured split, and origin grouping.
   - Remove the `originSections.teamLocalGroups` template section and remove team-local from `hasOriginSections`.
   - Keep `syncAgent` shared-only guard unchanged for safety.
   - Remove unused team-local Agents-list localization keys if no longer referenced.

6. Add Agent Detail return context:
   - In `AgentDetail.vue`, read an optional team-return query or prop passed from the route.
   - If `returnToTeam` exists, the back action should route to `/agent-teams?view=team-detail&id=<returnToTeam>` and use a localized compact label such as `Back to Agent Team`; otherwise keep current `Back to Agents`.
   - Do not alter default Agent Detail behavior when no return context is present.

7. Update localization:
   - Add English and Chinese copy for team-local details expand/collapse/edit/save/error/missing states.
   - Ensure no new hard-coded user-facing strings are introduced.

8. Update tests:
   - `AgentTeamDetail.spec.ts`:
     - team-local member shows expand affordance.
     - expand renders read-only details from the canonical team-local definition.
     - edit/save calls `updateAgentDefinition` with canonical id and submitted fields.
     - cancel does not call update and returns to read mode.
     - shared/global members show compact `View` action and route to Agent Detail with return context.
     - application-owned members do not show team-local edit controls or shared/global view behavior unless that was already supported before.
   - `AgentList.spec.ts`:
     - browse renders application-owned and shared agents but not team-local cards/section.
     - search excludes team-local matches and still finds application-owned/shared matches.
     - featured team-local agent ids do not appear in Agents list if present in featured setting.
   - Keep/adjust direct sync guard test as needed; programmatic sync should still reject non-shared definitions.

9. Update docs:
   - `docs/agent_management.md`: Agents page excludes team-local agents from normal browse/search; team-local details are managed through owning team.
   - `docs/agent_teams.md`: Agent Team detail supports expandable team-local member details and embedded edit.

10. Validation:
   - Run targeted component tests:
     - `cd autobyteus-web && pnpm test:nuxt run components/agentTeams/__tests__/AgentTeamDetail.spec.ts components/agents/__tests__/AgentList.spec.ts components/agents/__tests__/AgentDetail.spec.ts`
   - Run localization guard if localization files changed:
     - `cd autobyteus-web && pnpm guard:localization-boundary`
   - If feasible, run broader Nuxt tests for affected component directories.

## Key Tradeoffs

- Reusing `AgentDefinitionForm` keeps edit payload and launch config behavior canonical, but the embedded form may be visually dense. The `variant='embedded'` layout should reduce chrome while preserving fields.
- Compact action labels improve scanability but may be less self-explanatory than long buttons. Mitigation: use icons/chevrons, tooltips/titles/aria labels, and consistent placement.
- Removing team-local from normal Agents search improves product ownership clarity but removes a quick debugging path. Direct URL access remains, and an advanced include-team-local filter can be considered later if needed.
- Extracting read-only sections from `AgentDetail.vue` adds a component now but prevents immediate duplication and future drift.
- Application-owned behavior remains inconsistent with the stricter team-local/shared-global ownership model by design, because the user explicitly deferred application-owned decisions.

## Risks

- If team-local definitions are missing from `agentDefinitionStore`, expansion cannot render details. Mitigation: show a localized unresolved state and do not render edit controls.
- If a shared/global member's referenced definition is missing, the `View` action should not render or should show a disabled/unresolved state rather than routing to a broken detail page.
- `AgentDefinitionForm` embedded variant may still be large inside an accordion. Mitigation: use a bordered embedded panel and keep only one expanded card practical; if needed later, move edit into an in-page drawer using the same component.
- Filtering `TEAM_LOCAL` before featured split means old featured settings that reference team-local agents will not display on Agents page. This is acceptable for normal UX but should be documented as part of team-local ownership shift.
- Tests may rely on old team-local groups. Mitigation: update tests to assert the new exclusion and unchanged application-owned behavior.

## Guidance For Implementation

- Keep the task frontend-only unless implementation uncovers missing backend data.
- Implement the reusable read-only component before the team-local member component to avoid copying `AgentDetail.vue` markup.
- Do not change application-owned behavior. In code review, verify every ownership-scope branch treats `APPLICATION_OWNED` the same as before unless it only coexists with unchanged generic member cards.
- Keep visible member action labels short: prefer `Details` for team-local expansion and `View` with an external-link glyph for shared/global Agent Detail navigation; use longer accessible labels/title text for clarity.
- Use `normalizeDefinitionOwnershipScope` for catalog filtering instead of raw string checks where possible.
- Use `buildTeamLocalAgentDefinitionId` for every team-local member definition lookup.
- Keep `AgentDefinitionForm` default behavior unchanged for existing create/edit pages.
- Prefer emitted events from `TeamLocalAgentMemberDetails` for success/error/collapse if parent notification is reused; avoid coupling that component to team delete notifications.
- Update docs in the same implementation branch after code and tests.

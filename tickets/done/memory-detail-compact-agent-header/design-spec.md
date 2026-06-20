# Design Spec

## Current-State Read

The Memory page is already split into presentation components with a healthy data boundary:

- `/memory` page shell (`autobyteus-web/pages/memory.vue`) selects the Memory Home, agent detail, team detail, or inspector component based on route query state.
- `MemoryHome.vue` presents the memory catalog tabs/search/cards and delegates list behavior to `memoryExplorerStore`.
- `AgentMemoryDetail.vue` presents runs for one selected agent and delegates search/page/fetch behavior to `memoryExplorerStore.agentRuns` actions/state.
- `AgentTeamMemoryDetail.vue` presents team runs and member targets for one selected team and delegates search/page/fetch behavior to `memoryExplorerStore.teamRuns` actions/state.
- `memoryExplorerStore.ts` already owns selected agent/team summaries, list state, search strings, pagination, and fetch actions.

The current implementation issue is presentation hierarchy, not data ownership:

- `MemoryHome.vue` starts with a page-level `Memory` title and subtitle even though the global sidebar already has `Memory` selected.
- `AgentMemoryDetail.vue` renders a large standalone summary card (`Agent`, selected agent name, run count, stable ID) before the actual run list. The run-list card then uses a generic `Runs` heading.
- `AgentTeamMemoryDetail.vue` renders the same redundant pattern for team detail.

The target design must respect these constraints:

- Keep the existing route query contract and inspector navigation unchanged.
- Keep existing Memory explorer GraphQL contracts and store actions unchanged.
- Keep search, pagination, empty/loading/error states, retry, run/member selection, and memory badges unchanged.
- Do not introduce replacement title blocks that preserve the same vertical redundancy under a different name.

## Intended Change

Compact the Memory UI by making the functional content panel carry the visible identity:

1. Remove the top `Memory` title/subtitle from `MemoryHome.vue` so the tab/search/card panel is the first content block.
2. Remove the large standalone agent summary card from `AgentMemoryDetail.vue`.
3. Render the selected `agentName` where the generic detail `Runs` heading currently appears.
4. Remove the large standalone team summary card from `AgentTeamMemoryDetail.vue`.
5. Render the selected `teamName` where the generic detail `Runs` heading currently appears.
6. Update tests and documentation so they assert/describe the compact layout.

This is a clean-cut UI replacement. The old summary cards and redundant home header should not remain behind a flag, wrapper, or alternate path.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / UI Cleanup.
- Current design issue found (`Yes`/`No`/`Unclear`): No broad architecture issue found.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): No Design Issue Found.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): No.
- Evidence:
  - The redundant UI is localized to `MemoryHome.vue`, `AgentMemoryDetail.vue`, and `AgentTeamMemoryDetail.vue` templates.
  - Existing computed values `agentName` and `teamName` already provide the desired compact headings.
  - The store, route shell, GraphQL list contracts, and inspector targets remain correct for the requested behavior.
- Design response:
  - Keep ownership boundaries unchanged and perform a local template/content cleanup.
  - Remove no-longer-used metadata/computed/localization references where implementation proves they are obsolete.
- Refactor rationale:
  - A subsystem or store refactor would be over-scoped. The existing owners are healthy; the task is a visual hierarchy simplification.
- Intentional deferrals and residual risk, if any:
  - If product later wants detail run count or IDs visible again, add them as compact inline metadata only after a new requirement; do not resurrect the large summary cards.

## Terminology

- `Memory Home`: the `/memory` default view showing Agents/Agent Teams tabs and memory cards.
- `Agent detail`: the selected-agent run list view.
- `Team detail`: the selected-team team-run/member-target list view.
- `Functional content panel`: the bordered white card that contains tabs/search/cards on Home or search/list content on detail pages.
- `Standalone summary card`: the current large subject card above the detail run list; this is removed.

## Design Reading Order

1. Data-flow spine: page route -> component -> existing store state/actions -> rendered panel.
2. Subsystem allocation: reuse existing Memory frontend components only.
3. File responsibilities: adjust templates/tests/docs in place; no new shared structure.
4. Folder/path mapping: compact changes in existing `autobyteus-web/components/memory` and related test/doc paths.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Obsolete in-scope UI paths:
  - `MemoryHome.vue` header block with `Memory` and `Inspect stored agent and team memories.`.
  - `AgentMemoryDetail.vue` standalone summary card containing the `Agent` label, run count, and ID.
  - `AgentMemoryDetail.vue` generic `Runs` heading as the primary detail title.
  - `AgentTeamMemoryDetail.vue` standalone summary card containing the `Agent Team` label, run count, and ID.
  - `AgentTeamMemoryDetail.vue` generic `Runs` heading as the primary detail title.
- Required action: remove those UI paths directly; do not hide them behind conditional rendering, feature flags, or alternate compatibility components.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-COMPACT-001 | Primary End-to-End | User opens `/memory` with sidebar Memory selected | Memory Home functional panel renders without redundant page title | `MemoryHome.vue` | Governs the Home visual hierarchy simplification. |
| DS-COMPACT-002 | Primary End-to-End | User opens selected agent detail | Agent run-list panel renders selected agent name as heading | `AgentMemoryDetail.vue` | Governs the agent detail compact identity placement. |
| DS-COMPACT-003 | Primary End-to-End | User opens selected team detail | Team-run-list panel renders selected team name as heading | `AgentTeamMemoryDetail.vue` | Keeps team detail consistent with agent detail. |
| DS-COMPACT-004 | Primary End-to-End | User searches/pages/selects after cleanup | Existing store actions and events produce same behavior | `memoryExplorerStore` plus page shell | Ensures visual cleanup does not alter behavior. |

## Primary Execution Spine(s)

- Home render: `Sidebar Memory selection -> /memory page shell -> MemoryHome -> MemoryExplorerStore list state -> tabs/search/cards panel`.
- Agent detail render: `/memory?view=agent-detail -> AgentMemoryDetail -> selectedAgent/selector-derived agentName -> run-list card heading + existing run entries`.
- Team detail render: `/memory?view=team-detail -> AgentTeamMemoryDetail -> selectedTeam/teamDefinitionId-derived teamName -> team-run-list card heading + existing entries`.
- Behavior preservation: `Detail search/pagination/click -> existing component handlers -> memoryExplorerStore/page shell -> same fetch/navigation side effects`.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-COMPACT-001 | The user enters Memory from the already-selected sidebar navigation. `MemoryHome` should start directly with the useful browser panel rather than restating the nav label. | Sidebar nav, Memory page shell, Memory Home panel | `MemoryHome.vue` | Existing tab/search/list state from `memoryExplorerStore`. |
| DS-COMPACT-002 | The user selects an agent such as `Codex`. The detail page keeps the back link and list card, removes the oversized subject card, and promotes `agentName` into the list card heading. | Agent detail view, selected agent name, run list | `AgentMemoryDetail.vue` | Existing run search, pagination, loading/error/empty states, run-card clicks. |
| DS-COMPACT-003 | The user selects a team. The detail page applies the same compact pattern: no oversized team summary card, and `teamName` becomes the list card heading. | Team detail view, selected team name, team-run list | `AgentTeamMemoryDetail.vue` | Existing member target rendering and inspect-member emission. |
| DS-COMPACT-004 | Search, pagination, retry, and inspect actions continue to call the same store/page-shell handlers as before because only static hierarchy/copy changes. | Component event handlers, store actions, page-shell routing | Existing store/page owners | Durable tests should verify behavior did not regress. |

## Spine Actors / Main-Line Nodes

- `pages/memory.vue`: route-driven page shell; unchanged.
- `MemoryHome.vue`: owns Home presentation; remove redundant title/subtitle.
- `AgentMemoryDetail.vue`: owns selected-agent list presentation; remove summary card and use `agentName` heading.
- `AgentTeamMemoryDetail.vue`: owns selected-team list presentation; remove summary card and use `teamName` heading.
- `memoryExplorerStore.ts`: owns existing list/search/page state; unchanged.
- `MemoryInspector` routing path: unchanged downstream consumer of run/member selections.

## Ownership Map

| Node | Owns | Target Change | Must Not Own |
| --- | --- | --- | --- |
| `MemoryHome.vue` | Home layout, tab/search/card presentation | Remove redundant page-level title/subtitle. | Memory grouping/fetch policy. |
| `AgentMemoryDetail.vue` | Agent detail layout and run-list interactions | Promote `agentName` into section heading; remove summary card and obsolete `agentStableId` usage. | Backend filtering or route identity. |
| `AgentTeamMemoryDetail.vue` | Team detail layout and member-list interactions | Promote `teamName` into section heading; remove summary card. | Team-run/member memory inclusion policy. |
| `memoryExplorerStore.ts` | Search/page/list/selected summaries | No planned change. | Visual hierarchy decisions. |
| `pages/memory.vue` | Query-state view selection and inspector navigation | No planned change. | Local component layout. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `/memory` page shell | Specific Memory view components and stores | Selects the active Memory view by route query. | Per-view visual hierarchy or memory grouping. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `MemoryHome.vue` top `<header>` with `Memory` title/subtitle | Repeats selected sidebar nav state. | Existing tab/search/card panel in `MemoryHome.vue`. | In This Change | Do not add a replacement header. |
| `AgentMemoryDetail.vue` summary card | Wastes vertical space and duplicates selected agent identity. | `agentName` in list-card heading. | In This Change | Remove `agentStableId` computed if unused. |
| `AgentMemoryDetail.vue` generic `Runs` heading | Too generic after summary card removal. | `agentName` heading. | In This Change | Keep search placeholder `Search runs...`. |
| `AgentTeamMemoryDetail.vue` summary card | Same redundancy as agent detail. | `teamName` in list-card heading. | In This Change | Keeps detail views consistent. |
| `AgentTeamMemoryDetail.vue` generic `Runs` heading | Too generic after summary card removal. | `teamName` heading. | In This Change | Keep members label within run cards. |
| Tests/docs asserting/describing removed headings | Would preserve stale UI contract. | Updated compact-layout assertions/docs. | In This Change | Include localization glossary test update if affected. |

## Return Or Event Spine(s) (If Applicable)

No new return/event spine is introduced. Existing event emissions remain unchanged:

- `AgentMemoryDetail` emits `inspectRun` with the selected run.
- `AgentTeamMemoryDetail` emits `inspectMember` with the selected team run and member target.
- `MemoryHome` emits `changeTab`, `selectAgent`, and `selectTeam` as before.

## Bounded Local / Internal Spines (If Applicable)

No new bounded local loop/state machine is introduced. Existing local input flow remains:

- Search input changes locally via `searchInput`.
- Enter/Search button calls `applySearch`.
- `applySearch` delegates to the existing store action.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Localization keys | DS-COMPACT-001/002/003 | Memory presentation components | Provide visible text such as back labels, placeholders, loading/empty messages. | Existing i18n convention. | Keeping obsolete keys/tests could preserve stale headings. |
| Component tests | DS-COMPACT-002/003/004 | Memory UI maintainers | Assert compact headings and unchanged interactions. | Durable regression protection. | If tests only check generic text, old redundancy can return unnoticed. |
| Memory documentation | DS-COMPACT-001/002/003 | Product/developer readers | Describe current UI structure. | Avoid stale docs after visible UI change. | Docs could instruct users/reviewers to expect removed `Runs` headings. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Compact Memory Home layout | `components/memory/MemoryHome.vue` | Reuse | Existing owner of Home presentation. | N/A |
| Compact agent detail layout | `components/memory/AgentMemoryDetail.vue` | Reuse | Existing owner of agent detail presentation. | N/A |
| Compact team detail layout | `components/memory/AgentTeamMemoryDetail.vue` | Reuse | Existing owner of team detail presentation. | N/A |
| Behavior preservation | `stores/memoryExplorerStore.ts` and `pages/memory.vue` | Reuse | Existing handlers already implement behavior. | N/A |
| Test coverage | Existing Memory component/page tests | Extend | Targeted assertions belong near existing coverage. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend Memory UI | Home/detail presentation hierarchy and interactions | DS-COMPACT-001/002/003/004 | Memory components | Extend | No backend work. |
| Frontend Memory State | Selected summaries, search/page/list state | DS-COMPACT-004 | `memoryExplorerStore` | Reuse | No store API change. |
| Localization | Visible Memory copy | DS-COMPACT-001/002/003 | Components | Extend/cleanup | Remove no-longer-used detail labels if practical. |
| Docs/tests | Durable verification and docs | All | Maintainers | Extend | Update stale expectations. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/memory/MemoryHome.vue` | Frontend Memory UI | Memory Home presentation | Remove page title/subtitle; keep section panel. | Existing Home presentation owner. | Existing store state only. |
| `autobyteus-web/components/memory/AgentMemoryDetail.vue` | Frontend Memory UI | Agent detail presentation | Remove summary card; use `agentName` as list heading. | Existing agent detail owner. | Existing computed/store state. |
| `autobyteus-web/components/memory/AgentTeamMemoryDetail.vue` | Frontend Memory UI | Team detail presentation | Remove summary card; use `teamName` as list heading. | Existing team detail owner. | Existing computed/store state. |
| `autobyteus-web/components/memory/__tests__/AgentMemoryDetail.spec.ts` | Tests | Agent detail component test | Assert absent summary card/generic heading and unchanged click behavior. | Existing targeted test. | N/A |
| `autobyteus-web/components/memory/__tests__/AgentTeamMemoryDetail.spec.ts` | Tests | Team detail component test | Assert absent summary card/generic heading and unchanged member click behavior. | Existing targeted test. | N/A |
| `autobyteus-web/pages/__tests__/memory.spec.ts` | Tests | Page shell integration-ish test | Optionally assert Memory Home no longer renders redundant page header while behavior remains. | Existing page coverage. | N/A |
| `autobyteus-web/docs/memory.md` | Docs | Memory docs | Update detail/home layout description. | Existing Memory docs. | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Compact detail header pattern | N/A | Frontend Memory UI | Do not extract for this small two-file pattern. | N/A | N/A | A generic header abstraction with no policy. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Existing Memory explorer selected summaries | Yes | N/A | Low | Reuse unchanged. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/memory/MemoryHome.vue` | Frontend Memory UI | Memory Home presentation | Render the browser panel without redundant title/subtitle. | Existing Home component. | `memoryExplorerStore`. |
| `autobyteus-web/components/memory/AgentMemoryDetail.vue` | Frontend Memory UI | Agent detail presentation | Render selected agent name as list-card heading; remove summary card and unused summary metadata. | Existing agent detail component. | `memoryExplorerStore`, `AgentRunMemorySummary`. |
| `autobyteus-web/components/memory/AgentTeamMemoryDetail.vue` | Frontend Memory UI | Team detail presentation | Render selected team name as list-card heading; remove summary card. | Existing team detail component. | `memoryExplorerStore`, team memory summary types. |
| `autobyteus-web/components/memory/__tests__/AgentMemoryDetail.spec.ts` | Tests | Agent detail coverage | Compact-heading and behavior assertions. | Existing targeted test. | N/A |
| `autobyteus-web/components/memory/__tests__/AgentTeamMemoryDetail.spec.ts` | Tests | Team detail coverage | Compact-heading and behavior assertions. | Existing targeted test. | N/A |
| `autobyteus-web/pages/__tests__/memory.spec.ts` | Tests | Memory page coverage | Home compact-layout assertion if practical. | Existing page-shell test. | N/A |
| `autobyteus-web/localization/messages/*/memory.generated.ts` and related localization tests | Localization | Memory copy catalogs | Remove/update no-longer-used detail labels only as allowed by localization workflow. | Existing catalog location. | N/A |
| `autobyteus-web/docs/memory.md` | Docs | Memory user/dev docs | Reflect compact Home and detail headings. | Existing docs. | N/A |

## Ownership Boundaries

- `MemoryHome.vue`, `AgentMemoryDetail.vue`, and `AgentTeamMemoryDetail.vue` own visible hierarchy and should be changed directly.
- `memoryExplorerStore.ts` remains the authoritative owner for list state/actions and should not receive presentation-only flags.
- `pages/memory.vue` remains the route-view coordinator and should not be changed unless tests reveal a necessary assertion setup update.
- Backend GraphQL and storage services are below the authoritative frontend state boundary for this task and must not be touched.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `memoryExplorerStore` list actions | GraphQL query invocation, search/page variables, request IDs | Memory UI components | Components calling GraphQL directly for existing list behavior | Add/adjust store action only if behavior requirements change. |
| Memory detail components | Local visual hierarchy and event emission | Page shell/tests | Page shell injecting alternate title blocks | Keep hierarchy inside the detail components. |

## Dependency Rules

Allowed:

- Memory components may read existing `memoryExplorerStore` state and call existing store actions.
- Memory components may emit the same events to `pages/memory.vue`.
- Tests may mount components with testing Pinia and assert visible text/events.
- Docs may be updated to match the new UI.

Forbidden:

- Do not change backend GraphQL/storage to support this presentation-only cleanup.
- Do not add route query parameters for display-only title state.
- Do not introduce a shared generic detail-header component unless a real repeated policy emerges; two local headings are clearer here.
- Do not preserve the removed summary cards behind a feature flag or conditional compatibility path.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `setAgentRunsSearch(selector, search)` | Selected agent run list | Existing run search | `AgentWithMemorySelector` + string | Unchanged. |
| `changeAgentRunsPage(selector, page)` | Selected agent run list | Existing pagination | `AgentWithMemorySelector` + page number | Unchanged. |
| `setTeamRunsSearch(teamDefinitionId, search)` | Selected team run list | Existing team-run/member-target search | Team definition ID + string | Unchanged. |
| `changeTeamRunsPage(teamDefinitionId, page)` | Selected team run list | Existing pagination | Team definition ID + page number | Unchanged. |
| Component event `inspectRun(run)` | Agent run inspector target | Existing run selection | `AgentRunMemorySummary` | Unchanged. |
| Component event `inspectMember(run, member)` | Team member inspector target | Existing member selection | `AgentTeamRunMemorySummary` + `TeamMemberMemoryTargetSummary` | Unchanged. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Agent run search/page actions | Yes | Yes | Low | None. |
| Team run search/page actions | Yes | Yes | Low | None. |
| Inspect events | Yes | Yes | Low | None. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Agent detail list heading | Proposed selected `agentName`, e.g. `Codex` | Yes | Low | Replace generic `Runs`. |
| Team detail list heading | Proposed selected `teamName`, e.g. `Software Engineering Team` | Yes | Low | Replace generic `Runs`. |
| Home page title | Current `Memory` | Redundant | Medium | Remove because sidebar already supplies selected section. |

## Applied Patterns (If Any)

No new architectural pattern is introduced. The design intentionally avoids a new abstraction and keeps the cleanup inside existing presentation owners.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/memory/MemoryHome.vue` | File | Memory Home presentation | Remove redundant top title/subtitle. | Existing Home UI owner. | Fetching/grouping policy. |
| `autobyteus-web/components/memory/AgentMemoryDetail.vue` | File | Agent detail presentation | Compact heading and remove summary card. | Existing agent detail UI owner. | Backend or route changes. |
| `autobyteus-web/components/memory/AgentTeamMemoryDetail.vue` | File | Team detail presentation | Compact heading and remove summary card. | Existing team detail UI owner. | Backend or route changes. |
| `autobyteus-web/components/memory/__tests__/` | Folder | Component tests | Update durable compact-layout coverage. | Existing test location. | API/E2E environment setup. |
| `autobyteus-web/pages/__tests__/memory.spec.ts` | File | Page shell tests | Optional Home compact assertion while preserving routing tests. | Existing page test owner. | Component implementation details beyond visible contract. |
| `autobyteus-web/docs/memory.md` | File | Memory docs | Update UI description. | Existing Memory docs. | Design speculation. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `components/memory` | Frontend presentation | Yes | Low | Existing component folder correctly owns UI templates. |
| `stores` | Frontend state | Yes | Low | No change needed. |
| `docs` | Documentation | Yes | Low | Only update if stale. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Agent detail compact heading | Back link, then one list card whose header is `Codex` with search controls to the right. | Back link, then large `AGENT / Codex / 56 runs · ID: codex` card, then second card headed `Runs`. | Shows the desired removal of vertical redundancy. |
| Memory Home compact start | Functional card with `Agents` / `Agent Teams` tabs and search starts the content. | A page-level `Memory` title and descriptive subtitle before the same card while sidebar `Memory` is selected. | Shows why nav-selected title copy is redundant. |
| Compatibility rejection | Remove old summary card from template. | Keep old card hidden behind `showLegacySummary` or CSS display toggle. | Avoids retaining old UI path. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Feature flag to toggle old/new Memory headings | Could preserve old UI for comparison. | Rejected | Remove old headings/cards directly. |
| CSS-hide old summary cards | Quick visual fix. | Rejected | Delete template blocks and unused computed/localization references. |
| Leave team detail unchanged | Narrowly follows initial agent-only screenshot. | Rejected | Apply same compact detail pattern to team detail because the same redundant pattern exists. |
| Keep generic `Runs` heading plus compact subject metadata elsewhere | Would continue splitting subject identity from list. | Rejected | The selected subject name becomes the list heading. |

## Derived Layering (If Useful)

Layering remains unchanged:

- Page shell: route-based view selection.
- Presentation components: visible hierarchy and user events.
- Pinia store: list/search/page state and GraphQL invocation.
- Backend GraphQL/storage: unchanged memory data source.

## Migration / Refactor Sequence

1. Update `MemoryHome.vue` to remove the top header and keep the existing section/card structure.
2. Update `AgentMemoryDetail.vue`:
   - Remove the standalone summary `<header>` block.
   - Replace the list-card `<h2>` content with `agentName`.
   - Remove `agentStableId` computed if no longer used.
3. Update `AgentTeamMemoryDetail.vue`:
   - Remove the standalone summary `<header>` block.
   - Replace the list-card `<h2>` content with `teamName`.
4. Update localization usage/catalog/tests for now-obsolete `agent`, `agent_team`, and generic detail `runs` labels if they become unused and repository convention allows removal.
5. Update component/page tests:
   - Assert removed summary labels/cards are absent.
   - Assert selected subject names are list headings.
   - Assert search/click behavior remains unchanged.
   - Assert Home no longer renders the redundant page-level title/subtitle when feasible.
6. Update `autobyteus-web/docs/memory.md` so Home/detail descriptions match the compact layout.
7. Install/prepare frontend dependencies in the dedicated worktree if needed and run targeted Nuxt tests.

## Key Tradeoffs

- Removing detail run count/ID reduces explicit metadata, but it directly addresses the user's wasted-space complaint and avoids a new compact metadata design not requested here.
- Applying the same pattern to team detail slightly expands the initial agent-detail request, but keeps Memory detail views consistent and removes the same redundant structure.
- Avoiding a shared compact header component keeps the implementation simple and prevents empty abstraction.

## Risks

- Test environment in the dedicated worktree currently lacks `autobyteus-web/node_modules`; implementation/validation must prepare dependencies before test execution.
- Generated localization files may have a regeneration workflow. Implementer should follow repository convention and avoid ad hoc generated-file drift if a generator exists.
- If any downstream stakeholder expects visible ID/run-count metadata on detail pages, that expectation should be handled as a new requirement for compact inline metadata, not by preserving the old summary card.

## Guidance For Implementation

- Treat this as a presentation-only change.
- Do not touch backend memory explorer services, GraphQL schemas, route query shape, or inspector stores.
- Prefer deleting obsolete template blocks over hiding them.
- Keep search placeholders as `Search runs...`; the input still searches runs within the selected subject.
- Make tests assert both absence of old redundant labels and preservation of existing interactions.
- If updating localization keys, also update `zhCnGlossaryConsistency.spec.ts` if it references a removed key.

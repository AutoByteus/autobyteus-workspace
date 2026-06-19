# Design Spec

## Current-State Read

The Memory UI is already structured around the correct frontend owners:

- `autobyteus-web/pages/memory.vue` is the query-driven page shell. It chooses `MemoryHome`, `AgentMemoryDetail`, `AgentTeamMemoryDetail`, or `MemoryInspector` and composes inspector back labels.
- `autobyteus-web/components/memory/MemoryHome.vue` owns the Memory landing presentation: subject tabs, subject-scoped search, cards, and pagination.
- `autobyteus-web/components/memory/AgentMemoryDetail.vue` owns the selected-agent detail presentation: agent header, agent-run search/list/cards, and pagination.
- `autobyteus-web/components/memory/AgentTeamMemoryDetail.vue` owns the selected-team detail presentation: team header, team-run search/list/cards, member target buttons, and pagination.
- `autobyteus-web/components/memory/MemoryInspector.vue` owns memory payload inspection: back button, header, breadcrumb, metadata, tabs, and payload panel.
- `autobyteus-web/stores/memoryExplorerStore.ts` and `autobyteus-web/stores/memoryInspectorStore.ts` own fetching/state. Their boundaries are healthy and do not need changes.

The current problem is that presentation copy over-explains the already-established Memory context:

- Home tab/search labels include `with Memory` / `with memory`.
- Home card metadata repeats `Latest memory:` and `members with memory`.
- Detail hero copy repeats `Agent Memory Detail` / `Agent Team Memory Detail` and `<subject> Memory`.
- Detail lists use more specific headings/placeholders (`Agent Runs`, `Team Runs`, `Search agent runs...`, `Search team runs...`) even though the page already scopes the subject.
- Detail cards repeat `Workspace:` and `Updated:` prefixes on every row.
- Team member sections use `Team member memories` even though only inspectable member memory targets are shown there.
- Inspector navigation/header repeats `Back to <subject> Memory` and renders `Memory Inspector` twice.

The target design must preserve the existing Memory page data and route behavior. The labels `Agents` and `Agent Teams` are only short labels inside the Memory page; they must still represent the memory-bearing catalogs returned by `listAgentsWithMemory` and `listAgentTeamsWithMemory`, not the full configured agent/team catalogs.

## Intended Change

Implement a local Memory UI copy and presentation cleanup:

- Shorten Memory Home labels to `Agents`, `Agent Teams`, `Search agents...`, and `Search agent teams...`.
- Compact Memory Home card metadata while retaining run counts, timestamps, member counts, IDs, and memory badges.
- Shorten detail headers so the selected subject name is the title and the subject type appears only as a small concise label (`Agent` or `Agent Team`) or is otherwise non-redundant.
- Use shared visible list language on detail pages: `Runs`, `Search runs...`, and `Members`.
- Compact per-card metadata by preserving path/timestamp content without repeated `Workspace:` / `Updated:` prefixes.
- Render `Memory Inspector` once and shorten inspector back labels from `Back to <subject> Memory` to `Back to <subject>`.
- Rename/update localization keys so implementation does not keep stale `with_memory` / `memory_detail` semantics behind new visible copy.
- Update focused tests and later docs to reflect the concise copy.

No backend, GraphQL, Pinia store, route query, memory data, or raw-trace loading changes are in scope.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Cleanup / UI copy polish.
- Current design issue found (`Yes`/`No`/`Unclear`): No broader design issue found.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Local Implementation Defect.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): No.
- Evidence:
  - Code reads show the redundant text is rendered in established Memory presentation components and localization catalogs.
  - `memoryExplorerStore` and `memoryInspectorStore` already separate data/state from presentation and do not encode the redundant visible copy.
  - The page shell already owns route/view transitions and can shorten only the back label without changing route behavior.
  - Existing focused tests assert old labels and can be updated locally.
- Design response:
  - Keep the existing owner boundaries.
  - Modify only Memory presentation components, Memory page back-label composition, localization catalogs, focused tests, and delivery docs.
  - Do not create new services, stores, GraphQL queries, shared abstractions, or compatibility code.
- Refactor rationale:
  - A structural refactor would add unnecessary churn. The current owner, boundary, API shape, file placement, and data structures remain healthy for this scope.
- Intentional deferrals and residual risk, if any:
  - Broader localization generation workflow discovery is deferred to implementation if needed; the design requires semantically clean localization keys regardless of whether they are manually edited or generated.
  - Full Memory UX redesign is out of scope; this design only removes redundant copy in the existing flow.

## Terminology

- `Memory Home`: the `/memory` landing view rendered by `MemoryHome.vue`.
- `Agent detail`: selected-agent run-list view rendered by `AgentMemoryDetail.vue`.
- `Agent Team detail`: selected-team run/member-list view rendered by `AgentTeamMemoryDetail.vue`.
- `Inspector`: memory payload view rendered by `MemoryInspector.vue`.
- `Memory-bearing subject`: an agent or team returned by existing Memory explorer queries because it has stored memory/run history.
- `Concise copy`: visible UI text that assumes the page context already establishes Memory.

## Design Reading Order

1. Follow the Memory navigation/presentation spines.
2. Preserve existing ownership boundaries and data contracts.
3. Replace redundant copy in the owning presentation files.
4. Rename/update localization keys and tests.
5. Sync durable docs after implementation/review confirms final copy.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove or replace old redundant visible copy and obsolete translation keys/usages that encode the old copy.
- This design must not keep both old and new visible labels behind feature flags, alternate branches, compatibility toggles, or duplicated translation keys.
- The old archived `tickets/done/*` artifacts are historical records and must not be edited just to erase old labels from past evidence.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-MEM-UI-001 | Primary End-to-End | User opens `/memory` home | Concise memory-bearing agent/team catalog cards render | `MemoryHome.vue` presentation, with data from `memoryExplorerStore` | Main screenshot complaint starts here; copy must be concise while catalog semantics remain memory-derived. |
| DS-MEM-UI-002 | Primary End-to-End | User selects an agent card | Concise selected-agent run list renders | `AgentMemoryDetail.vue` presentation | Second screenshot complaint is this view. |
| DS-MEM-UI-003 | Primary End-to-End | User selects an agent-team card | Concise selected-team run/member list renders | `AgentTeamMemoryDetail.vue` presentation | Team detail must stay copy-consistent with agent detail. |
| DS-MEM-UI-004 | Primary End-to-End | User selects a run/member target | Inspector renders one header and concise back navigation | `MemoryInspector.vue` and `pages/memory.vue` | Avoids carrying redundant Memory wording into the final inspection view. |
| DS-MEM-UI-005 | Bounded Local | Component visible copy lookup | Localized text renders in English/zh-CN | Memory localization catalogs | Copy must remain localization-compliant and not preserve stale key semantics. |

## Primary Execution Spine(s)

- DS-MEM-UI-001: `Memory nav/route -> pages/memory.vue -> MemoryHome -> memoryExplorerStore.fetchAgents/fetchTeams -> concise tabs/search/cards`
- DS-MEM-UI-002: `MemoryHome agent card -> pages/memory.vue route push -> memoryExplorerStore.fetchAgentRuns -> AgentMemoryDetail concise header/run cards`
- DS-MEM-UI-003: `MemoryHome team card -> pages/memory.vue route push -> memoryExplorerStore.fetchTeamRuns -> AgentTeamMemoryDetail concise header/team-run/member cards`
- DS-MEM-UI-004: `Detail run/member click -> memoryInspectorStore.inspect -> pages/memory.vue inspector route/back label -> MemoryInspector concise header/tabs`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-MEM-UI-001 | The Memory page opens to the memory-bearing catalog. The existing store fetches the active subject type, while `MemoryHome` renders concise subject labels and cards. | Route, Memory Home, explorer store, catalog entries | `MemoryHome.vue` for presentation | Localization, card metadata formatting, tests |
| DS-MEM-UI-002 | Selecting an agent keeps the same route/data flow, but the selected-agent page renders the agent name as the title and uses concise run-list labels. | Agent card, page shell, explorer store, agent detail | `AgentMemoryDetail.vue` | Localization, compact card metadata, tests |
| DS-MEM-UI-003 | Selecting a team keeps the same route/data flow, but the selected-team page mirrors the agent detail cleanup and uses `Members` for inspectable member targets. | Team card, page shell, explorer store, team detail | `AgentTeamMemoryDetail.vue` | Localization, member-target labels, tests |
| DS-MEM-UI-004 | Selecting a run/member loads the existing inspector target and payload. Only the inspector header/back copy changes. | Detail card/member target, inspector store, page shell, inspector | `MemoryInspector.vue`; `pages/memory.vue` for back label | Breadcrumb and metadata remain useful context |
| DS-MEM-UI-005 | Components continue to resolve visible strings from Memory localization catalogs; obsolete key names are replaced rather than kept as misleading aliases. | Translation keys, localized messages, components | Localization catalogs | Localization guard/audit |

## Spine Actors / Main-Line Nodes

- `pages/memory.vue`: view selection and route/back-label composition.
- `MemoryHome.vue`: landing view presentation.
- `AgentMemoryDetail.vue`: selected-agent detail presentation.
- `AgentTeamMemoryDetail.vue`: selected-team detail presentation.
- `MemoryInspector.vue`: payload inspection presentation.
- `memoryExplorerStore`: existing list-fetching owner; unchanged.
- `memoryInspectorStore`: existing inspector-fetching owner; unchanged.

## Ownership Map

| Main-Line Node | Owns |
| --- | --- |
| `pages/memory.vue` | Route-query interpretation, navigation pushes, selected view rendering, inspector back-label text. It does not own Memory card/list presentation. |
| `MemoryHome.vue` | Home tabs, search input placeholder, catalog cards, home empty/loading/error states, pagination controls. |
| `AgentMemoryDetail.vue` | Agent detail title/subtitle, run-list heading/search/card presentation, pagination controls, `inspectRun` emission. |
| `AgentTeamMemoryDetail.vue` | Team detail title/subtitle, team-run heading/search/card presentation, member target section/button presentation, `inspectMember` emission. |
| `MemoryInspector.vue` | Inspector header, breadcrumb, metadata line, tab labels, payload panel selection. |
| `memoryExplorerStore` | Existing GraphQL list fetching, selected summaries, search/page state, stale response guards. It must not be modified for copy-only behavior. |
| `memoryInspectorStore` | Existing inspector target, active tab, raw trace loading and stale response guards. It must not be modified for copy-only behavior. |
| Memory localization catalogs | Visible string values and keys used by Memory components. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `/memory` page route (`pages/memory.vue`) | Memory presentation components plus Memory stores | Route-level view shell for home/detail/inspector. | Component-specific copy/layout beyond back labels and view selection. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Visible `Agents with Memory` / `Agent Teams with Memory` tab copy | Memory page title/context already establishes Memory. | `MemoryHome.vue` using new localized `Agents` / `Agent Teams` copy | In This Change | Do not keep old visible labels in alternate paths. |
| Visible `Search agents with memory...` / `Search teams with memory...` placeholders | Redundant in Memory Home context. | New localized `Search agents...` / `Search agent teams...` copy | In This Change | Preserve active-tab-specific placeholder. |
| Visible `Latest memory:` / `members with memory` card metadata | Repeats Memory context on Memory Home cards. | Compact metadata in `MemoryHome.vue` | In This Change | Preserve timestamps/member counts. |
| Visible `Agent Memory Detail` / `Agent Team Memory Detail` | Redundant detail-page heading. | Concise subject-type label or omitted eyebrow in detail components | In This Change | Prefer `Agent` / `Agent Team` if an eyebrow remains. |
| Visible `<subject> Memory` detail titles | The page already lives under Memory. | Selected subject name only | In This Change | e.g. `Codex`, not `Codex Memory`. |
| Visible `Agent Runs` / `Team Runs` headings and specific run placeholders | Selected detail page already scopes subject. | Shared `Runs` / `Search runs...` copy | In This Change | Preserve search behavior. |
| Visible `Team member memories` section heading | Too verbose for inspectable member target section. | `Members` | In This Change | Preserve member target buttons. |
| Repeated `Workspace:` / `Updated:` prefixes on each detail card | Creates visual noise in repeated lists. | Compact metadata line(s) in detail card presentation | In This Change | Preserve actual workspace path and timestamp. |
| Inspector duplicate `Memory Inspector` header | Same phrase appears as eyebrow and title. | Single `Memory Inspector` title or label | In This Change | Preserve breadcrumb and metadata line. |
| `Back to <subject> Memory` back labels | Redundant subject-memory wording from inspector. | `Back to <subject>` in `pages/memory.vue` | In This Change | `Back to Memory` for no-target/default remains acceptable. |
| Obsolete translation keys with stale semantics | Hidden key names would preserve old copy meaning and invite reintroduction. | Semantically renamed Memory keys | In This Change | Remove when no longer referenced. |
| Durable docs old-label references | Docs would be stale after UI change. | Updated `autobyteus-web/docs/memory.md` | Follow-up in Delivery | Delivery owns docs sync after implementation/integration. |

## Return Or Event Spine(s) (If Applicable)

No separate return/event spine materially shapes this cleanup. Component event emissions (`selectAgent`, `selectTeam`, `inspectRun`, `inspectMember`, `back`) remain unchanged.

## Bounded Local / Internal Spines (If Applicable)

- `MemoryHome` active-tab placeholder spine: `homeTab changes -> activeState/search sync -> placeholder label chooses active subject`. This remains local to `MemoryHome`; only the chosen copy changes.
- `MemoryInspector` tab spine: `activeTab changes -> selected payload tab renders -> raw trace tab may fetch through store`. This is not changed; only header/back labels change.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Localization catalogs | DS-MEM-UI-001..005 | Memory presentation components | Provide English/zh-CN strings with semantically accurate keys. | Existing localization boundary and audit require cataloged strings. | Raw literals or stale keys drift from copy intent. |
| Focused component/page tests | DS-MEM-UI-001..004 | Memory UI owners | Guard concise copy and unchanged event/navigation behavior. | Existing tests currently assert old copy. | Manual-only validation would allow old labels to return. |
| Durable docs sync | DS-MEM-UI-001..004 | Delivery/documentation | Keep Memory docs aligned with final visible labels. | Docs currently describe old copy. | Stale docs could mislead future work. |
| Timestamp formatting | DS-MEM-UI-001..003 | Card/detail presentation | Render existing timestamps safely. | Existing components have local `formatTimestamp`. | Moving it into stores would mix presentation into data owners. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Home labels/cards | `MemoryHome.vue` | Reuse/Modify | Existing correct home presentation owner. | N/A |
| Agent detail labels/cards | `AgentMemoryDetail.vue` | Reuse/Modify | Existing correct selected-agent presentation owner. | N/A |
| Team detail labels/cards | `AgentTeamMemoryDetail.vue` | Reuse/Modify | Existing correct selected-team presentation owner. | N/A |
| Inspector header/back behavior | `MemoryInspector.vue` + `pages/memory.vue` | Reuse/Modify | Existing correct split: page shell owns back label; inspector owns header. | N/A |
| Localized strings | Memory localization catalogs | Reuse/Modify | Existing localization boundary. | N/A |
| Data fetching/state | `memoryExplorerStore`, `memoryInspectorStore` | Reuse/No Change | Existing state/fetching owners remain healthy. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend Memory presentation (`components/memory`) | Visible Memory Home/detail/inspector copy and layout. | DS-MEM-UI-001..004 | Memory UI components | Reuse/Modify | Main implementation area. |
| Frontend Memory page shell (`pages/memory.vue`) | Route-driven view selection and inspector back labels. | DS-MEM-UI-002..004 | Page shell | Reuse/Modify | Back labels only. |
| Frontend localization (`localization/messages`) | English/zh-CN Memory copy. | DS-MEM-UI-005 | Memory components | Reuse/Modify | Rename stale keys where practical. |
| Frontend tests (`components/memory/__tests__`, `pages/__tests__`) | Focused UI copy/event/navigation coverage. | DS-MEM-UI-001..004 | Memory UI owners | Reuse/Modify | Update assertions. |
| Memory data/state stores | GraphQL fetch/state. | DS-MEM-UI-001..004 | Presentation components | Reuse/No Change | No store changes. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/memory/MemoryHome.vue` | Frontend Memory presentation | Home UI | Concise tabs/search/card metadata. | Existing home owner. | Existing summary DTOs |
| `autobyteus-web/components/memory/AgentMemoryDetail.vue` | Frontend Memory presentation | Agent detail UI | Concise subject header, run heading/search/cards. | Existing selected-agent owner. | Existing run summary DTOs |
| `autobyteus-web/components/memory/AgentTeamMemoryDetail.vue` | Frontend Memory presentation | Team detail UI | Concise subject header, run heading/search/cards, `Members` section. | Existing selected-team owner. | Existing team run/member DTOs |
| `autobyteus-web/components/memory/MemoryInspector.vue` | Frontend Memory presentation | Inspector UI | Single inspector header; preserve breadcrumb/tabs. | Existing inspector presentation owner. | Existing inspect target |
| `autobyteus-web/pages/memory.vue` | Frontend Memory page shell | Route/back-label owner | Shortened inspector back labels. | Existing route shell owner. | Existing query target types |
| `autobyteus-web/localization/messages/en/memory.generated.ts` | Localization | English Memory catalog | New/renamed concise copy keys. | Existing catalog file. | N/A |
| `autobyteus-web/localization/messages/zh-CN/memory.generated.ts` | Localization | zh-CN Memory catalog | Matching concise copy translations. | Existing catalog file. | N/A |
| Focused Memory tests | Frontend tests | UI behavior/copy tests | Update old-copy assertions and event checks. | Existing coverage locations. | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Concise `Runs` / `Search runs...` labels | Memory localization catalogs | Localization | Same visible strings serve agent and team detail pages. | Yes: old agent/team-specific run labels removed or unused. | Yes | A generic catch-all UI state helper. |
| Card timestamp formatting | Existing local `formatTimestamp` functions | Component presentation | Not worth extracting for this copy-only change. | N/A | N/A | A shared formatting subsystem created only for this task. |
| Compact metadata layout | Component-local template expressions | Component presentation | Agent/team cards differ enough that local rendering is clearer. | N/A | N/A | A broad shared card component that hides detail-specific ownership. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Existing memory summary DTOs | Yes | N/A | Low | No data-model changes. |
| Existing `MemoryInspectTarget` discriminated union | Yes | N/A | Low | No target-shape changes. |
| Memory translation keys | Must be Yes after implementation | Yes by renaming/removal | Medium if old keys are kept with new values | Use semantically accurate key names for new copy. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/memory/MemoryHome.vue` | Frontend Memory presentation | Home UI | Render `Agents`/`Agent Teams`, concise placeholders, compact card metadata. | Existing home presentation file. | Localization, summary DTOs |
| `autobyteus-web/components/memory/AgentMemoryDetail.vue` | Frontend Memory presentation | Agent detail UI | Render selected agent name-only header, `Runs`, `Search runs...`, compact run metadata. | Existing selected-agent presentation file. | Localization, run summary DTOs |
| `autobyteus-web/components/memory/AgentTeamMemoryDetail.vue` | Frontend Memory presentation | Team detail UI | Render selected team name-only header, `Runs`, `Search runs...`, compact team-run metadata, `Members`. | Existing selected-team presentation file. | Localization, team DTOs |
| `autobyteus-web/components/memory/MemoryInspector.vue` | Frontend Memory presentation | Inspector UI | Render `Memory Inspector` once and keep breadcrumb/metadata/tabs. | Existing inspector presentation file. | Localization, inspector store |
| `autobyteus-web/pages/memory.vue` | Frontend Memory page shell | Route/back-label owner | Compose `Back to <subject>` labels for inspector views. | Existing page shell file. | Existing target/query shapes |
| `autobyteus-web/localization/messages/en/memory.generated.ts` | Localization | English Memory catalog | Concise English strings with non-stale keys. | Existing catalog. | N/A |
| `autobyteus-web/localization/messages/zh-CN/memory.generated.ts` | Localization | zh-CN Memory catalog | Matching concise zh-CN strings with non-stale keys. | Existing catalog. | N/A |
| `autobyteus-web/components/memory/__tests__/MemoryHome.spec.ts` | Frontend tests | Home component coverage | Assert concise tabs/placeholders/cards and selection behavior. | Existing focused test. | N/A |
| `autobyteus-web/components/memory/__tests__/AgentMemoryDetail.spec.ts` | Frontend tests | Agent detail coverage | Assert name-only header, concise run heading, behavior. | Existing focused test. | N/A |
| `autobyteus-web/components/memory/__tests__/AgentTeamMemoryDetail.spec.ts` | Frontend tests | Team detail coverage | Assert name-only header, `Members`, behavior. | Existing focused test. | N/A |
| `autobyteus-web/components/memory/__tests__/MemoryInspector.spec.ts` | Frontend tests | Inspector coverage | Assert no duplicated inspector header if feasible. | Existing focused test. | N/A |
| `autobyteus-web/pages/__tests__/memory.spec.ts` | Frontend tests | Page route/back-label coverage | Optionally add/adjust back-label expectations and update old test titles. | Existing focused page test. | N/A |
| `autobyteus-web/docs/memory.md` | Durable docs | Memory page docs | Update old visible-label references after implementation. | Existing docs. | N/A |

## Ownership Boundaries

- Presentation components own visible copy/layout; stores own data/state. Do not push presentation simplification into stores or GraphQL DTOs.
- The page shell owns route and back-label composition; do not make detail components infer route state for inspector back labels.
- Localization catalogs own visible string values; do not add new raw user-facing literals in migrated Memory components unless existing project audit explicitly allows them.
- Tests own executable proof of copy/behavior; docs sync is delivery-owned after integrated implementation state.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `MemoryHome.vue` | Home tab/search/card rendering | `pages/memory.vue` route shell | Page shell directly rendering home tab/card copy. | Add/adjust props/events only if needed; not expected. |
| `AgentMemoryDetail.vue` | Agent run-list rendering | `pages/memory.vue` route shell | Page shell directly formatting agent detail card metadata. | Keep detail presentation inside component. |
| `AgentTeamMemoryDetail.vue` | Team run/member rendering | `pages/memory.vue` route shell | Page shell directly formatting team detail card metadata. | Keep team detail presentation inside component. |
| `MemoryInspector.vue` | Inspector header/tabs/payload rendering | `pages/memory.vue` route shell | Page shell rendering inspector title/tabs. | Component prop for back label already exists. |
| Memory localization catalogs | String values/key contracts | Memory components | Raw literals for migrated copy, stale old keys used for new meanings. | Add/rename translation keys. |

## Dependency Rules

- Memory presentation components may depend on their stores, Memory DTO types, `MemoryBadges`, and localization.
- `pages/memory.vue` may depend on Memory components and stores for routing/orchestration.
- Stores must not depend on presentation copy or component-specific formatting.
- GraphQL query documents and generated types must not change for this task.
- Do not create a new shared UI card component unless implementation finds unavoidable duplication with real ownership; current design expects local component edits.
- Do not keep compatibility labels, feature flags, or dual old/new translation keys for the same visible text.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `listAgentsWithMemory` | Memory-bearing agents | Existing home data fetch. | Search/page only. | No change. |
| `listAgentTeamsWithMemory` | Memory-bearing teams | Existing home data fetch. | Search/page only. | No change. |
| `listAgentRunsWithMemory` | Selected agent's memory-bearing runs | Existing agent detail data fetch. | `AgentWithMemorySelector`. | No change. |
| `listAgentTeamRunsWithMemory` | Selected team's memory-bearing runs/member targets | Existing team detail data fetch. | `teamDefinitionId`. | No change. |
| Component emits (`selectAgent`, `selectTeam`, `inspectRun`, `inspectMember`, `back`) | UI navigation events | Existing page navigation. | Existing event payload types. | No change. |
| Memory translation keys | Visible UI copy | Localized labels/placeholders/headings. | Translation key string. | Rename/update stale keys. |

Rule: no generic backend/API boundary changes are needed because the subject and identity meanings remain explicit.

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Memory explorer queries | Yes | Yes | Low | No API change. |
| Memory component emits | Yes | Yes | Low | No event change. |
| Memory translation keys | Should be Yes | N/A | Medium if stale key names remain | Rename keys to concise semantics. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Home agent tab | `Agents with Memory` -> `Agents` | Yes | Low | Context comes from page title. |
| Home team tab | `Agent Teams with Memory` -> `Agent Teams` | Yes | Low | Context comes from page title. |
| Agent detail title | `Codex Memory` -> `Codex` | Yes | Low | Subject name only. |
| Team detail title | `<Team> Memory` -> `<Team>` | Yes | Low | Subject name only. |
| Detail section | `Agent Runs` / `Team Runs` -> `Runs` | Yes | Low | Detail page scopes subject. |
| Team member section | `Team member memories` -> `Members` | Yes | Low | Section contains inspectable member targets. |
| Inspector | duplicate `Memory Inspector` -> single `Memory Inspector` | Yes | Low | One title is enough. |

## Applied Patterns (If Any)

No new architecture pattern is introduced. This is a local presentation cleanup using existing component ownership, existing localization catalogs, and existing focused tests.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/memory/` | Folder | Frontend Memory presentation | Home/detail/inspector component copy and layout. | Existing Memory UI component boundary. | Store/API policy changes. |
| `autobyteus-web/components/memory/MemoryHome.vue` | File | Home UI | Concise home tabs/search/cards. | Current home presentation owner. | Detail/inspector route logic. |
| `autobyteus-web/components/memory/AgentMemoryDetail.vue` | File | Agent detail UI | Concise selected-agent header/run list. | Current agent detail owner. | Team member rendering. |
| `autobyteus-web/components/memory/AgentTeamMemoryDetail.vue` | File | Team detail UI | Concise selected-team header/run/member list. | Current team detail owner. | Agent-only run grouping. |
| `autobyteus-web/components/memory/MemoryInspector.vue` | File | Inspector UI | Single inspector header. | Current inspector owner. | Route query composition. |
| `autobyteus-web/pages/memory.vue` | File | Route shell | Concise inspector back labels. | Current page shell owner. | Home/detail card formatting. |
| `autobyteus-web/localization/messages/en/` | Folder | English localization | Updated Memory catalog. | Existing localization structure. | Raw UI logic. |
| `autobyteus-web/localization/messages/zh-CN/` | Folder | zh-CN localization | Updated Memory catalog. | Existing localization structure. | Raw UI logic. |
| `autobyteus-web/components/memory/__tests__/` | Folder | Memory component tests | Focused copy/behavior tests. | Existing coverage. | Backend API tests. |
| `autobyteus-web/docs/memory.md` | File | Memory durable docs | Final docs sync. | Existing docs page. | Implementation evidence logs. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-web/components/memory` | Presentation | Yes | Low | Existing components map to page/view responsibilities. |
| `autobyteus-web/pages` | Route shell | Yes | Low | Only back-label composition changes. |
| `autobyteus-web/localization/messages` | Off-Spine Concern | Yes | Low | Existing localization boundary. |
| `autobyteus-web/stores` | State/control | Yes | Low | No changes; keep presentation copy out. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Home tabs | `Memory` page title + tabs `Agents` / `Agent Teams` | `Memory` page title + tabs `Agents with Memory` / `Agent Teams with Memory` | Removes the exact redundancy reported by user. |
| Agent detail header | eyebrow `Agent`, title `Codex`, subtitle `6 runs · ID: codex` | eyebrow `Agent Memory Detail`, title `Codex Memory`, subtitle `6 agent runs · Stable ID: codex` | Keeps identity while removing repeated Memory/detail wording. |
| Run card metadata | `codex_f685...` then `/home/autobyteus/workspace · 19.6.2026, 10:06:04` | `Workspace: /home/autobyteus/workspace` and `Updated: 19.6.2026, 10:06:04` on every card | Preserves metadata in a cleaner repeated-list shape. |
| Team member section | `Members` | `Team member memories` | The team detail page and badges already establish memory context. |
| Inspector header | one `Memory Inspector` heading plus breadcrumb | eyebrow `Memory Inspector` and title `Memory Inspector` | Avoids duplicated header text. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep old labels behind a toggle or alternate mode | Could avoid changing screenshots/tests. | Rejected | Replace old visible copy directly. |
| Keep old translation keys with new values | Faster implementation. | Rejected when practical | Rename to semantically accurate keys; remove old references. |
| Add a new wrapper component for old/new detail headers | Could centralize copy change. | Rejected | Existing detail components own their headers; modify locally. |
| Change GraphQL/store names to match shortened labels | Might make naming uniform. | Rejected | Backend/store contracts correctly describe memory-bearing data and should not change for UI copy. |

## Derived Layering (If Useful)

Layering is simple and unchanged:

`Route shell -> Presentation components -> Pinia stores -> GraphQL queries -> Backend memory explorer/view APIs`

This task edits only the route-shell label composition and presentation/localization/test/doc layers.

## Migration / Refactor Sequence

1. Update/rename Memory localization keys in English and zh-CN catalogs for concise labels.
2. Update `MemoryHome.vue` to use concise home tab/search/card metadata copy.
3. Update `AgentMemoryDetail.vue` to use concise selected-agent header, `Runs`, `Search runs...`, and compact card metadata.
4. Update `AgentTeamMemoryDetail.vue` in parity with agent detail, including `Members` for member target sections.
5. Update `MemoryInspector.vue` to render `Memory Inspector` only once.
6. Update `pages/memory.vue` inspector back labels to `Back to <subject>`.
7. Update focused component/page tests to assert the approved concise copy and absence of old redundant phrases where practical.
8. Run focused frontend checks. If dependencies are absent, install/use the repository's established package manager setup before checks.
9. After implementation/code review/API-E2E stages, delivery updates `autobyteus-web/docs/memory.md` to match final copy.

## Key Tradeoffs

- Shorter labels reduce visual noise but rely on the Memory page title/context to convey that `Agents` means memory-bearing agents. This is acceptable because the tabs only appear inside Memory Home and the page subtitle still explains stored memories.
- Keeping component-local metadata formatting avoids overengineering. The repeated formatting is small and subject-specific.
- Renaming translation keys adds a little implementation work but prevents stale key names from reintroducing old copy later.

## Risks

- Over-compacting metadata could make timestamps or workspace paths ambiguous. Mitigation: preserve the values and keep a readable order/separator.
- zh-CN translations may need reviewer polish. Mitigation: update consistently and let review flag copy quality.
- Localization generation workflow may be implicit. Mitigation: implementation should inspect existing localization patterns and keep guard/audit passing.
- Existing tests may rely on old copy. Mitigation: update focused tests deliberately, not by broad snapshot deletion.

## Guidance For Implementation

- Keep this frontend-only unless implementation discovers an unexpected source of copy from backend data.
- Do not alter GraphQL documents, generated GraphQL types, Pinia action names, route query shapes, or emitted component event contracts.
- Prefer explicit, semantically named translation keys over old `with_memory` or `memory_detail` key names.
- Preserve existing memory badges and raw trace action/tab labels.
- Preserve all useful identity facts: display name, stable ID/run ID, counts, timestamps, workspace path, and member target names.
- Do not edit archived `tickets/done/*` historical artifacts.
- Expected focused checks include at least the Memory component/page Vitest files changed by this task and localization guard/audit if available after dependency setup.

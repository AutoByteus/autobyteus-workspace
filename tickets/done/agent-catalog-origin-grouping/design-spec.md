# Design Spec

## Current-State Read

The current ticket has two relevant product paths.

Agents page browsing path:

`/agents route -> AgentList.vue -> agentDefinitionStore + serverSettingsStore -> splitFeaturedCatalogDefinitions(...) -> Featured agents + regular catalog -> AgentCard actions`

Current facts:

- The backend/GraphQL catalog already exposes authoritative ownership metadata: ownership scope, owner team id/name, owner application id/name, package id, and local application id.
- `AgentList.vue` is the page composition owner: search state, reload, featured split consumption, and run/details/sync orchestration already live there.
- `AgentCard.vue` is reusable across featured, regular, and search contexts and already shows ownership labels/badges.
- The current regular no-search list is too flat; team-local, application, and shared definitions appear together.
- Search mode is intentionally flat and should remain flat.

Server built-in/private-agent path:

`server-runtime.ts -> bootstrapBuiltInAgents() -> BuiltInAgentBootstrapper -> built-in-agent-registry -> src/built-in-agents/templates/* -> <appDataDir>/agents/<built-in-id> -> AgentDefinitionService -> server settings when required`

Current WIP facts:

- The new central built-in-agent subsystem is the right ownership direction for true platform infrastructure built-ins.
- The current WIP registry/template set still includes `daily-assistant`, but latest user direction says Daily Assistant is private/user-managed and must not be server built-in or default-featured.
- `Memory Compactor` remains a true platform built-in because compaction runtime depends on `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` and should receive a default when blank.
- The normal file-backed agent provider also loads `agents/` under each configured `AUTOBYTEUS_AGENT_PACKAGE_ROOTS` root. Therefore `/Users/normy/autobyteus_org/autobyteus-private-agents/agents/daily-assistant/` is the correct source for Daily Assistant when users configure that package root.

Constraints the target design must respect:

- Featured selection remains controlled by existing Settings / `AUTOBYTEUS_FEATURED_CATALOG_ITEMS`; the server must not auto-select Daily Assistant.
- Frontend grouping must use catalog ownership metadata and must not infer origin from ids, names, or paths.
- Built-in provisioning must not keep active one-off bootstrappers/templates for old Daily/Super Assistant or Memory Compactor paths.
- Server startup must preserve user-edited built-in Memory Compactor files by seeding only missing files.
- Private Daily Assistant changes are outside the server/web package but are explicitly in scope because the user requested the agent move/rename.

## Intended Change

1. Replace the no-search regular flat `All agents` area with origin-aware sections:
   - `Team-local agents`, grouped by owning team and showing application context when applicable;
   - `Application agents`, grouped by owning application;
   - `Shared agents`, one shared/global section.
2. Keep `Featured agents` first and de-duplicated from regular origin sections.
3. Keep search mode as one flat grid across all matching definitions.
4. Keep one central server built-in-agent subsystem, but make its active registry contain Memory Compactor only for this ticket.
5. Seed Memory Compactor from `src/built-in-agents/templates/memory-compactor/` into `<appDataDir>/agents/autobyteus-memory-compactor/`, resolving it through the normal agent loader and initializing blank compaction settings.
6. Remove Daily Assistant from server built-ins: no server template, no server seed, no featured-setting default, no legacy featured migration.
7. Add/rename private Daily Assistant at `/Users/normy/autobyteus_org/autobyteus-private-agents/agents/daily-assistant/` with `agent.md` formal name `Daily Assistant`.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature + behavior change + refactor/cleanup.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes for frontend presentation structure and server built-in file placement. No backend catalog ownership API issue.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Frontend presentation gap; server file-placement/responsibility drift; legacy/default-feature compatibility pressure.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes.
- Evidence: Adding grouping inline to `AgentList.vue` would mix page orchestration with section-building, fallback labels, and deterministic ordering policy. Built-in provisioning was scattered between default-agent and compaction execution areas; current WIP correctly centralizes it but over-includes Daily Assistant.
- Design response: Use a pure frontend origin-grouping utility fed by existing ownership normalization. Use a central `src/built-in-agents` subsystem for Memory Compactor built-in provisioning only. Move Daily Assistant to private agents and leave featured selection to Settings.
- Refactor rationale: The grouping helper prevents page-component bloat; central built-in provisioning aligns template ownership; removing Daily Assistant from built-ins prevents platform/user policy confusion.
- Intentional deferrals and residual risk, if any: Agent Teams page grouping and user-customized section order are deferred. Automatic cleanup/migration of old Daily/Super Assistant settings/data is intentionally not included because Daily Assistant is no longer a server built-in; users can manage featured rows in Settings.

## Terminology

- `Origin section`: A no-search Agents page section derived from authoritative ownership metadata.
- `Owner group`: A nested group inside an origin section keyed by owning team or application.
- `Regular agent`: An agent definition not currently displayed as featured after featured de-duplication.
- `Platform built-in agent`: A server-packaged infrastructure agent that the platform needs to provision or select for internal/runtime behavior. In this ticket, Memory Compactor.
- `Private agent`: An agent definition supplied by a user/private package root or user app data rather than server bootstrap. In this ticket, Daily Assistant.

## Design Reading Order

Read this design from spines to ownership to files:

1. data-flow spine inventory,
2. subsystem / capability-area allocation,
3. file responsibilities and reusable structures,
4. folder/path mapping and migration sequence.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove the no-search regular `All agents` presentation path; remove active one-off built-in bootstrappers/templates; remove Daily Assistant server built-in/default-feature behavior from current WIP.
- Treat removal as first-class design work: the target must not keep `DefaultDailyAssistantBootstrapper`, `default-super-assistant`, `default-daily-assistant`, or `default-compactor-agent` active paths.
- Decision rule: the design must not depend on old/new active Daily Assistant aliases, frontend hard-coded id/name overrides, or server bootstrap migration for a non-built-in private agent.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | `/agents` no-search page render | Grouped non-featured AgentCards visible below featured agents | `AgentList.vue` with `agentDefinitionOriginGroups` | Main user-visible grouping change. |
| DS-002 | Primary End-to-End | Agent search input | Flat matching AgentCards visible | `AgentList.vue` search state | Ensures grouping disappears during search. |
| DS-003 | Primary End-to-End | Server startup | Memory Compactor seeded and compaction setting initialized when blank | `BuiltInAgentBootstrapper` | True platform built-in provisioning path. |
| DS-004 | Primary End-to-End | Configured private package root | Private Daily Assistant resolved as a normal agent definition | `FileAgentDefinitionProvider` / normal catalog service | Shows why no server bootstrap is needed for Daily Assistant. |
| DS-005 | Primary End-to-End | User edits Featured catalog settings | Chosen Daily Assistant appears in Featured agents if available | Existing settings + featured split owner | Keeps featured selection user-managed. |

## Primary Execution Spine(s)

- DS-001: `AgentList.vue -> splitFeaturedCatalogDefinitions -> buildAgentDefinitionOriginGroups -> grouped section render -> AgentCard action emissions`
- DS-002: `AgentList.vue search input -> existing search filter -> flat AgentCard grid -> existing action handlers`
- DS-003: `server-runtime.ts -> bootstrapBuiltInAgents -> BuiltInAgentBootstrapper registry iteration -> seed Memory Compactor files -> AgentDefinitionService resolve -> ServerSettingsService compaction default`
- DS-004: `AUTOBYTEUS_AGENT_PACKAGE_ROOTS -> FileAgentDefinitionProvider read roots -> private agents/daily-assistant files -> AgentDefinitionService catalog -> GraphQL/store`
- DS-005: `Settings UI/server setting -> featured catalog setting value -> splitFeaturedCatalogDefinitions -> Featured agents section`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The page receives the resolved catalog and configured featured split, removes featured definitions from the regular list, then transforms the remaining definitions into origin sections for display. | Agent catalog, featured split, origin section model, AgentCard rendering | `AgentList.vue` page composition + grouping utility | Ownership normalization, localized labels, deterministic ordering. |
| DS-002 | Typing search switches the page from browsing structure to one flat matching result grid. | Search input, filtered definitions, result cards | `AgentList.vue` | Existing search matcher, empty-state copy. |
| DS-003 | Startup provisions platform infrastructure agents from one registry; Memory Compactor files are seeded if missing and blank compaction setting is initialized only after successful resolution. | Runtime startup, built-in registry, seed files, agent definition resolution, server setting | `BuiltInAgentBootstrapper` | Asset copying, cache refresh, logging, seed-only-missing preservation. |
| DS-004 | A configured package root exposes private `agents/daily-assistant/` through the normal file-backed catalog path. | Package root, file provider, agent definition service, GraphQL/store | `FileAgentDefinitionProvider` / existing catalog service | Private repo filesystem layout, package-root env config. |
| DS-005 | User-managed featured setting selects available definitions; if Daily Assistant is available and selected, it appears in Featured agents. | Settings, featured item list, catalog split, featured render | Existing server settings + frontend split helper | Settings validation, unresolved item behavior, de-duplication. |

## Spine Actors / Main-Line Nodes

- `AgentList.vue`: page entry/composition owner for browsing/search states and action handlers.
- `splitFeaturedCatalogDefinitions`: existing owner of featured/regular de-duplication.
- `agentDefinitionOriginGroups`: pure owner of no-search origin section construction.
- `AgentCard.vue`: reusable display/action card.
- `server-runtime.ts`: thin startup sequencer.
- `BuiltInAgentBootstrapper`: built-in provisioning lifecycle owner.
- `built-in-agent-registry.ts`: declarative list of platform built-ins and setting defaults.
- `FileAgentDefinitionProvider`: normal file-backed read-root owner for app data and package roots.
- Existing Settings/featured catalog services: user-managed featured selection owners.

## Ownership Map

| Node | Owns | Does Not Own |
| --- | --- | --- |
| `AgentList.vue` | Page state, section placement, search/browse switch, action wiring. | Ownership classification rules or built-in provisioning. |
| `agentDefinitionOriginGroups.ts` | Transformation from non-featured definitions to typed origin sections/groups. | GraphQL fetching, Settings persistence, card actions. |
| `definitionOwnership.ts` | Shared frontend ownership normalization/label primitives. | Page rendering or server ownership truth. |
| `BuiltInAgentBootstrapper` | Built-in seed lifecycle, resolution, cache refresh, built-in setting defaults. | General user/private agent provisioning; Daily Assistant featured policy. |
| `built-in-agent-registry.ts` | Canonical platform built-in metadata. | Dynamic user-selected featured list. |
| `FileAgentDefinitionProvider` | Read-root discovery and file-backed definitions from app data/package roots. | Featured selection or built-in setting defaults. |
| Settings / featured catalog services | Persisting and parsing user/admin featured item selection. | Auto-deciding that Daily Assistant is featured. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `server-runtime.ts` startup call | `BuiltInAgentBootstrapper` | Startup sequencing and logging. | Per-agent template/setting policy. |
| GraphQL `agentDefinitions` query | Backend definition services/providers | Catalog transport boundary. | Frontend grouping policy or featured selection. |
| Settings UI | Server settings services | User-facing configuration surface. | Server bootstrap defaults for Daily Assistant. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| No-search regular `All agents` flat section | Replaced by origin-aware browsing sections. | `agentDefinitionOriginGroups.ts` + `AgentList.vue` grouped render. | In This Change | Search remains flat. |
| Active `default-super-assistant` / `default-daily-assistant` bootstrapper/template paths | Daily Assistant is not server built-in/default-featured. | Private `/Users/normy/.../autobyteus-private-agents/agents/daily-assistant/`. | In This Change | Historical fixtures/docs can mention old ids only as history. |
| WIP `src/built-in-agents/templates/daily-assistant/` | Conflicts with private/user-managed direction. | Private agent package folder. | In This Change | Remove from build asset copy and smoke expectations. |
| WIP Daily Assistant registry row/constants/featured default | Server must not seed or feature Daily Assistant. | Settings-selected private agent. | In This Change | Do not migrate `autobyteus-super-assistant` featured rows. |
| Active `default-compactor-agent` bootstrapper/template paths under compaction execution | Built-in provisioning belongs centrally, not in compaction runtime. | `src/built-in-agents/*` Memory Compactor row/template. | In This Change | Compaction runtime keeps using setting. |
| Built-output stale deleted templates | Could mask removed source paths. | Clean build output + smoke validation. | In This Change | Ensure Daily Assistant built-in template absent. |

## Return Or Event Spine(s) (If Applicable)

- Agent card actions return through existing emits to `AgentList.vue` handlers; no new action event shape is introduced.
- Built-in bootstrap returns a result object for logging/tests; server startup does not expose a new public API.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `agentDefinitionOriginGroups.ts`.
  - Chain: `regular definitions -> normalize ownership -> bucket by origin -> sort groups/items -> omit empty sections`.
  - Why it matters: Keeps grouping deterministic and pure.
- Parent owner: `BuiltInAgentBootstrapper`.
  - Chain: `registry row -> seed missing files -> resolve definition -> apply setting default -> refresh cache`.
  - Why it matters: Keeps platform built-in provisioning cohesive and testable.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Localization/copy | DS-001, DS-002 | `AgentList.vue` | Section headings/descriptions and empty states. | User-facing clarity. | Hard-coded strings or duplicated copy. |
| Ownership normalization | DS-001 | Grouping utility + card/store | Turn raw metadata into consistent labels/keys. | Avoid duplicated origin rules. | Divergent grouping/card labels. |
| Featured de-duplication | DS-001, DS-005 | Existing featured split helper | Remove selected featured items from regular catalog. | Prevent duplicates. | Grouping helper would own featured policy. |
| Build asset copy/cleanup | DS-003 | Built-in subsystem | Package Memory Compactor template and avoid stale output. | Runtime uses built output. | Source/build mismatch. |
| Private package-root config | DS-004 | File provider / deployment config | Expose private agents without bootstrap. | Needed for Daily Assistant availability. | Server would incorrectly own user/private content. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Featured split | Existing featured catalog frontend/server settings | Reuse | Already owns user-selected featured semantics. | N/A |
| Agent ownership truth | Existing backend GraphQL/store fields | Reuse | Metadata already available. | N/A |
| Frontend grouping transformation | Frontend catalog utilities | Create/Extend | There is no pure origin grouping owner yet. | Page component would become too mixed. |
| Built-in agent provisioning | New `src/built-in-agents` subsystem from WIP | Extend/Correct | One owner is appropriate for platform templates/seeding. | Old default-agent/compaction paths are scattered. |
| Daily Assistant availability | Existing package-root agent loading | Reuse | Private package root is the correct mechanism. | Server bootstrap would force platform policy. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web` Agents page | Page render states and user actions. | DS-001, DS-002, DS-005 | `AgentList.vue` | Extend | Add grouped browsing view. |
| `autobyteus-web` catalog utilities | Pure grouping and ownership label primitives. | DS-001 | `AgentList.vue`, store/card | Create/Extend | Keeps page thin. |
| Server built-in agents | Platform built-in templates, seed lifecycle, setting defaults. | DS-003 | `BuiltInAgentBootstrapper` | Create/Correct WIP | Memory Compactor only. |
| Agent definition file provider | File-backed app-data and package-root definitions. | DS-004 | Existing provider/service | Reuse | Daily Assistant private path uses this. |
| Server settings / Featured catalog | User-managed featured selection. | DS-005 | Existing settings services/UI | Reuse | No default Daily Assistant. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/utils/catalog/agentDefinitionOriginGroups.ts` | Frontend catalog utilities | Grouping owner | Build typed origin sections/groups from regular definitions. | One pure transform with deterministic ordering. | Yes, ownership utility. |
| `autobyteus-web/utils/definitionOwnership.ts` | Frontend catalog utilities | Ownership normalization | Shared labels/keys/scope helpers. | Single semantic owner for frontend origin meaning. | N/A |
| `autobyteus-web/components/agents/AgentList.vue` | Agents page | Page composition | Render featured, grouped sections, search flat state, actions. | Existing page owner. | Yes. |
| `autobyteus-server-ts/src/built-in-agents/built-in-agent-registry.ts` | Server built-ins | Registry owner | Declare Memory Compactor metadata and setting default. | Keeps built-in set explicit. | N/A |
| `autobyteus-server-ts/src/built-in-agents/built-in-agent-bootstrapper.ts` | Server built-ins | Lifecycle owner | Seed Memory Compactor, resolve, initialize compaction setting, refresh cache. | One lifecycle owner. | Yes, registry type. |
| `/Users/normy/autobyteus_org/autobyteus-private-agents/agents/daily-assistant/*` | Private agents package | Private agent definition | Daily Assistant content/config. | Correct user/private location. | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Frontend ownership label/key construction | `definitionOwnership.ts` | Frontend catalog utilities | Store/card/grouping need same semantics. | Yes | Yes | A path/id inference helper. |
| Origin group section shape | `agentDefinitionOriginGroups.ts` | Frontend catalog utilities | Tests and component share section model. | Yes | Yes | A second featured split owner. |
| Built-in agent metadata | `built-in-agent-registry.ts` | Server built-ins | Bootstrapper and tests need one declarative source. | Yes | Yes | A kitchen-sink registry for private/user agents. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Origin section/group model | Yes | Yes | Low | Keep fields tied to display section/group only. |
| Ownership normalization result | Yes | Yes | Low | Do not include raw path/id guesses. |
| Built-in registry row | Yes | Yes | Low after Daily removal | Keep fields about platform built-ins only. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/utils/catalog/agentDefinitionOriginGroups.ts` | Frontend catalog utilities | Pure grouping transform | Construct Team-local/Application/Shared sections for non-featured definitions. | One transformation concern. | `definitionOwnership.ts`. |
| `autobyteus-web/utils/catalog/__tests__/agentDefinitionOriginGroups.spec.ts` | Frontend catalog tests | Grouping behavior tests | Ordering, bucketing, empty sections, featured-excluded input assumptions. | Focused unit tests. | N/A |
| `autobyteus-web/utils/definitionOwnership.ts` | Frontend catalog utilities | Ownership semantics | Normalize scope labels/keys shared by store/card/grouping. | Prevent duplicated rules. | N/A |
| `autobyteus-web/components/agents/AgentList.vue` | Agents page | Page composition | Render sections/search and preserve actions. | Existing page boundary. | Grouping utility. |
| `autobyteus-server-ts/src/built-in-agents/built-in-agent-registry.ts` | Server built-ins | Built-in metadata | Memory Compactor id/template/display/compaction setting default only. | Explicit registry. | N/A |
| `autobyteus-server-ts/src/built-in-agents/built-in-agent-bootstrapper.ts` | Server built-ins | Seed lifecycle | Iterate registry, seed missing files, resolve definitions, initialize Memory Compactor setting, refresh cache. | Cohesive lifecycle owner. | Registry. |
| `autobyteus-server-ts/src/built-in-agents/templates/memory-compactor/agent.md` | Server built-ins | Template asset | Memory Compactor prompt/frontmatter. | Runtime template source. | N/A |
| `autobyteus-server-ts/src/built-in-agents/templates/memory-compactor/agent-config.json` | Server built-ins | Template asset | Memory Compactor config. | Runtime template source. | N/A |
| `/Users/normy/autobyteus_org/autobyteus-private-agents/agents/daily-assistant/agent.md` | Private agents | Private agent definition | Daily Assistant formal name/instructions. | Private user-managed source. | N/A |
| `/Users/normy/autobyteus_org/autobyteus-private-agents/agents/daily-assistant/agent-config.json` | Private agents | Private agent config | Daily Assistant tools/processors/config. | Private user-managed source. | N/A |

## Ownership Boundaries

- Backend catalog/GraphQL owns agent definition data and ownership truth.
- Frontend catalog utilities own display grouping of already-resolved definitions.
- Settings own featured selection; no bootstrapper may decide Daily Assistant should be featured.
- Server built-in subsystem owns only platform built-in provisioning and built-in setting defaults.
- Private agents repo owns Daily Assistant definition content; server package must not duplicate it as a built-in template.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `BuiltInAgentBootstrapper` | Filesystem seeding, definition resolution, setting defaults, cache refresh. | `server-runtime.ts`, tests. | Startup manually copying templates or setting compaction defaults. | Add bootstrapper option/result fields. |
| `FileAgentDefinitionProvider` / definition services | App-data and package-root scan/read. | GraphQL/store/catalog consumers. | Server built-in bootstrapper reading private package root just to feature Daily Assistant. | Extend normal provider/service APIs. |
| Featured catalog settings | Parse/serialize/persist selected featured items. | Agents page split and Settings UI. | Built-in bootstrapper initializing Daily Assistant featured rows. | Improve Settings defaults/UI, not built-in bootstrap. |
| `agentDefinitionOriginGroups.ts` | Section/group construction. | `AgentList.vue` and tests. | Component-local duplicate bucketing logic. | Add explicit grouped model fields. |

## Dependency Rules

Allowed:

- `AgentList.vue` may depend on frontend grouping and featured split utilities.
- Grouping utility may depend on shared frontend ownership normalization.
- `server-runtime.ts` may call `bootstrapBuiltInAgents()` once.
- `BuiltInAgentBootstrapper` may depend on filesystem, registry, `AgentDefinitionService`, `ServerSettingsService`, and compaction setting key/service methods.
- Private Daily Assistant may be loaded through normal package-root provider paths when configured.

Forbidden:

- Frontend grouping must not hard-code `daily-assistant`, `autobyteus-super-assistant`, or `Memory Compactor` for origin/featured placement.
- Server built-in subsystem must not include Daily Assistant template, registry row, seed behavior, or featured catalog default/migration.
- Compaction runtime folder must not own Memory Compactor template/seeding lifecycle.
- Settings/frontend code must not rewrite private Daily Assistant source files.
- Build output must not retain stale deleted Daily Assistant built-in templates.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `buildAgentDefinitionOriginGroups(definitions)` | Regular agent definitions | Return display origin sections/groups. | Resolved agent definition objects with ownership metadata. | No featured policy. |
| `splitFeaturedCatalogDefinitions(...)` | Featured catalog split | Return featured and regular definitions. | Featured catalog setting items + full definition list. | Existing owner retained. |
| `bootstrapBuiltInAgents(options?)` | Platform built-in provisioning | Seed/resolve Memory Compactor and apply built-in setting defaults. | Optional injected agents dir/services/registry for tests. | Registry should contain Memory only. |
| `getFreshAgentDefinitionById(id)` | Agent definition lookup | Resolve seeded built-in after file writes. | Definition id string. | No special Daily Assistant alias. |
| `AUTOBYTEUS_AGENT_PACKAGE_ROOTS` | Package-root config | Expose private agent package roots. | Filesystem root path(s). | Enables private Daily Assistant. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `buildAgentDefinitionOriginGroups` | Yes | Yes | Low | Keep input as definitions, output as sections. |
| `bootstrapBuiltInAgents` | Yes | Yes | Low | Remove Daily/private agent concerns. |
| Featured settings APIs | Yes | Yes | Low | Keep selection user-managed. |
| Package-root provider config | Yes | Yes | Low | Do not overload with built-in defaults. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Grouping utility | `agentDefinitionOriginGroups` | Yes | Low | Keep scope to agent definitions. |
| Built-in subsystem | `built-in-agents` | Yes | Low | Registry must contain only platform built-ins. |
| Private assistant | `daily-assistant` / `Daily Assistant` | Yes | Medium if server also has template | Remove server template and keep private source. |
| Memory infrastructure agent | `autobyteus-memory-compactor` / `Memory Compactor` | Yes | Low | Keep as built-in row/template. |

## Applied Patterns (If Any)

- Pure transformation utility: used for frontend origin grouping to keep component rendering separate from grouping policy.
- Declarative registry + lifecycle bootstrapper: used for platform built-ins so built-in metadata and seeding/default-setting lifecycle have one owner.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/utils/catalog/` | Folder | Frontend catalog utilities | Grouping utilities and tests. | UI catalog transformation concern. | Server settings persistence. |
| `autobyteus-web/utils/catalog/agentDefinitionOriginGroups.ts` | File | Origin grouping owner | Build grouped section model. | Pure frontend transform. | Featured selection or hard-coded ids. |
| `autobyteus-web/components/agents/AgentList.vue` | File | Agents page composition | Render featured/grouped/search states. | Existing page owner. | Low-level origin bucketing policy. |
| `autobyteus-server-ts/src/built-in-agents/` | Folder | Server built-in subsystem | Registry, bootstrapper, templates for platform built-ins. | Correct central ownership. | Private/user agents such as Daily Assistant. |
| `autobyteus-server-ts/src/built-in-agents/templates/memory-compactor/` | Folder | Memory Compactor built-in template | Server-packaged Memory Compactor files. | Platform infrastructure built-in. | Daily Assistant. |
| `/Users/normy/autobyteus_org/autobyteus-private-agents/agents/daily-assistant/` | Folder | Private agent package | User/private Daily Assistant definition. | User-managed featured choice. | Server bootstrap code. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-web/utils/catalog` | Off-Spine Concern | Yes | Low | Pure UI catalog transformations. |
| `autobyteus-server-ts/src/built-in-agents` | Main-Line Domain-Control for built-in provisioning | Yes | Low after Daily removal | One cohesive lifecycle for platform built-ins. |
| `autobyteus-server-ts/src/agent-execution/compaction` | Runtime execution | Yes | Medium if templates remain | Remove template/bootstrap ownership. |
| `autobyteus-private-agents/agents/daily-assistant` | Private definition source | Yes | Low | Correct user/private placement. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Grouped browsing | `Featured -> Team-local by team -> Application by app -> Shared` | `Featured -> All agents flat` | Shows intended no-search information architecture. |
| Search | `Search text -> flat matching cards` | `Search text -> nested origin sections` | Search should optimize finding, not browsing. |
| Built-in registry | `[{ id: "autobyteus-memory-compactor", templateDirName: "memory-compactor", settingDefault: compaction }]` | Registry row for `daily-assistant` with featured default | Keeps platform built-ins distinct from user/private agents. |
| Daily Assistant availability | Configure `AUTOBYTEUS_AGENT_PACKAGE_ROOTS=/Users/normy/.../autobyteus-private-agents` and feature via Settings | Server seeds and auto-features Daily Assistant on startup | Preserves user choice. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `autobyteus-super-assistant` as active server alias | Would avoid changing old settings/data. | Rejected | Daily Assistant is private; Settings can be updated by user. |
| Server migrate `autobyteus-super-assistant` featured rows to `daily-assistant` | Earlier built-in rename design needed it. | Rejected now | No server-owned Daily featured default/migration. |
| Keep Daily Assistant built-in template plus private copy | Might make fresh startup convenient. | Rejected | Single source in private agents. |
| Frontend hard-code Daily Assistant as featured/recommended | Would satisfy visibility without settings. | Rejected | Featured selection remains Settings-owned. |
| Keep one-off Memory Compactor bootstrapper for compatibility | Avoids moving files. | Rejected | Central built-in subsystem owns provisioning. |

## Derived Layering (If Useful)

- UI layer: `AgentList.vue`, `AgentCard.vue`, localization.
- Frontend catalog utility layer: ownership normalization and origin grouping.
- Server startup/provisioning layer: `server-runtime.ts` thin entry to `BuiltInAgentBootstrapper`.
- Server definition/provider layer: normal app-data and package-root file-backed agent definitions.
- Private package layer: `/Users/normy/autobyteus_org/autobyteus-private-agents` source definitions.

## Migration / Refactor Sequence

1. Preserve current frontend grouping implementation direction:
   - keep/finish grouping helper and tests;
   - keep `AgentList.vue` consuming grouped sections;
   - keep search flat and existing actions.
2. Correct server built-in registry:
   - remove Daily Assistant constants, row, legacy id migration metadata, and featured catalog setting default;
   - leave Memory Compactor row with compaction setting default.
3. Correct server templates/assets:
   - delete `autobyteus-server-ts/src/built-in-agents/templates/daily-assistant/`;
   - keep `templates/memory-compactor/`;
   - update asset copy/clean/smoke scripts so built output contains Memory Compactor and not Daily Assistant.
4. Correct bootstrapper/tests:
   - remove Daily-specific featured catalog initialization/migration behavior if it becomes unused;
   - keep generic seed-only-missing, definition resolution, cache refresh, and server-setting default behavior required by Memory Compactor;
   - update unit tests to assert Memory Compactor-only built-in behavior.
5. Remove obsolete active one-off paths:
   - default assistant one-off paths under `agent-definition/default-agents`;
   - compactor one-off paths under `agent-execution/compaction/default-compactor-agent*`.
6. Add/update private Daily Assistant:
   - create or rename `/Users/normy/autobyteus_org/autobyteus-private-agents/agents/daily-assistant/`;
   - set `agent.md` frontmatter `name: Daily Assistant`;
   - preserve intended tools/processors/instructions from current private assistant source.
7. Update docs/artifacts:
   - agent-management/settings docs describe grouping and user-managed featured selection;
   - server docs describe Memory Compactor as built-in infrastructure;
   - no doc claims fresh server seeds/features Daily Assistant.
8. Validate:
   - frontend grouping tests;
   - built-in bootstrapper tests;
   - built-output smoke;
   - optional package-root discovery smoke for private Daily Assistant.

## Key Tradeoffs

- Central built-in subsystem remains even though only Memory Compactor is currently registered. This is still better than leaving platform provisioning in compaction runtime because the subsystem owns a real platform lifecycle and can scale to future true built-ins.
- Removing Daily Assistant server auto-feature behavior makes fresh installs less opinionated, but matches the user's stated product model: users choose featured agents in Settings.
- Not auto-migrating old Daily/Super Assistant settings avoids server ownership of a private agent, but may require user cleanup of old featured rows.

## Risks

- Current WIP code/tests/docs may still assert Daily Assistant built-in behavior; implementation must search and remove/update those expectations.
- Private agent repo content may need careful selection if both old `super-ai-assistant` and new `daily-assistant` variants exist.
- Build output can retain stale templates unless clean/build smoke explicitly checks absence.

## Guidance For Implementation

- Treat this as a delta on top of the current WIP: keep Agents page grouping and the central built-in-agent subsystem; remove only the Daily Assistant built-in/default-feature behavior.
- You are not alone in the codebase. Do not revert unrelated grouping, docs, tests, or Memory Compactor centralization changes made by others; adjust them to the new product direction.
- Search active source/docs/tests for `daily-assistant`, `Daily Assistant`, `autobyteus-super-assistant`, `featuredCatalog`, `default-super-assistant`, and `default-daily-assistant` and classify each occurrence as private-agent content, historical fixture/documentation, or stale server built-in behavior.
- Expected server target: `BUILT_IN_AGENT_DEFINITIONS` contains Memory Compactor only.
- Expected private target: `/Users/normy/autobyteus_org/autobyteus-private-agents/agents/daily-assistant/` exists with `agent.md` name `Daily Assistant`.
- Run/update focused checks:
  - frontend AgentList/grouping tests;
  - built-in-agent bootstrapper/template tests;
  - built-output smoke confirming Memory Compactor present and Daily Assistant absent from server built-ins;
  - package-root discovery check when feasible.

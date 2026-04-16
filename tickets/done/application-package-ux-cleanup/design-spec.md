# Design Spec

Write this artifact to a canonical file path in the assigned task workspace before any handoff message.

## Current-State Read

This follow-on ticket combines two post-merge cleanup/refactor slices that currently leak implementation internals and fragmented ownership into user-facing UX.

### 1. Application package source presentation is too close to raw storage internals

Current path:
`ApplicationPackagesManager.vue -> applicationPackagesStore -> GraphQL applicationPackages -> ApplicationPackageService.listApplicationPackages() -> ApplicationPackageRootSettingsStore + package summary utilities`

Current ownership and fragmentation problems:
- `ApplicationPackageService.listApplicationPackages()` always prepends one built-in row regardless of whether built-in applications actually exist.
- The built-in row exposes the resolved built-in root path and source directly.
- `ApplicationPackagesManager.vue` renders that raw path in the default settings surface.
- The current built-in root is resolved by upward scan from the server app root, so in local/personal builds the visible path can look like a personal repo/worktree path.
- The outward product contract does not distinguish between:
  - platform-owned built-in applications,
  - linked local package roots chosen by the user,
  - GitHub-installed managed packages.
- GitHub-installed packages are already materialized into app-managed storage under `AppDataDir/application-packages/github/...`, while built-ins still come from an upward-scanned repo/bundle root. Built-in applications are therefore the outlier versus both user trust and the server-data storage model already used by built-in agents/teams.

Constraints the target design must respect:
- Built-in application discovery must continue to work.
- Linked local application package roots must remain supported.
- GitHub-installed packages must remain supported.
- The settings surface must stop implying that the platform is reading arbitrary personal folders when no user-imported package exists.
- The target must be a clean cut, not a compatibility wrapper around the old built-in-root presentation.

### 2. Definition-level launch defaults are fragmented, poorly presented, and only half-modeled

Current path for agents:
`AgentDefinitionForm.vue -> AgentDefaultLaunchConfigFields.vue -> agentDefinitionStore -> GraphQL agent definition mutations -> agent-definition-service -> file/provider persistence`

Current path for direct runs:
- direct agent launch template: `agentRunConfigStore.setTemplate(...)`
- direct team launch template: `createDefaultTeamRunConfig(...)` via `teamRunConfigStore.setTemplate(...)`
- application launch preparation: `applicationLaunch.ts`

Current ownership and fragmentation problems:
- Agent definitions already own a real stored `defaultLaunchConfig`, but the editor UX is poor:
  - free-text runtime input,
  - free-text model input,
  - raw JSON textarea.
- The agent-definition form places launch defaults too high, above more primary concerns such as tools.
- The existing run-config forms already have much better runtime/model/config UX, but that UX logic is not reused by definition editing.
- Direct launch template creation currently ignores stored agent definition defaults and instead builds empty/default configs.
- Team definitions currently do not own any equivalent `defaultLaunchConfig` at all.
- `FileAgentTeamDefinitionProvider` already treats shared and application-owned team definitions as the same `AgentTeamDefinition` subject, but it reaches them through two different config parsing/writing paths.
- `application-owned-team-source.ts` currently parses and writes coordinator/member/avatar data for application-owned teams, but its config contract omits `defaultLaunchConfig`.
- `applicationLaunch.ts` currently synthesizes team launch defaults by aggregating leaf agent defaults, which makes application launch own policy that really belongs to the definition layer.
- The current application-launch integration coverage already includes imported/application-owned team launches, so removing the aggregation policy without replacing the application-owned team path would change exercised behavior.

Constraints the target design must respect:
- The concept is valid and already real for agent definitions; the design should not create a second parallel concept.
- The user wants this feature to be general for reusable definitions, not application-specific.
- Team scope for this ticket stays at **team-level defaults only**, not member-level stored overrides.
- Application-owned team definitions are already first-class `AgentTeamDefinition` subjects and must participate in the same team-level default-launch contract unless they are explicitly scoped out.
- Existing application-owned team updates already flow through `FileAgentTeamDefinitionProvider.update()` when the source is writable, so the target design should extend that path rather than invent a parallel application-launch-only exception.
- Launch-time overrides must remain possible.
- The improved UX should align with the existing run-config runtime/model/config interaction patterns.

## Intended Change

Deliver one clean combined refactor with two top-level outcomes:

1. **Application package presentation becomes product-safe and server-data-aligned.**
   - Built-in applications stop using an upward-scanned repo/bundle path as their authoritative package root.
   - Built-in applications are materialized into a platform-managed built-in package root under server-data.
   - The normal Application Packages list becomes a safe presentation contract rather than a raw filesystem dump.
   - Raw internal location metadata moves out of the default list and into explicit details/debug-only access.

2. **Definition-level launch preferences become one general capability for agents and teams.**
   - Agent definitions keep `defaultLaunchConfig`, but the user-facing UX becomes a reusable “preferred launch settings” section aligned with run-config UX.
   - Team definitions gain the same stored `defaultLaunchConfig` shape.
   - Shared and application-owned team definitions participate in that same team-level `defaultLaunchConfig` contract.
   - The application-owned team source/parser/write path is extended to carry the same tight `defaultLaunchConfig` shape through the team-definition boundary.
   - Direct launch templates and application launch preparation consume the same definition-owned defaults through one shared resolver.
   - The old ad hoc team-default aggregation from leaf agent definitions is removed.

## Terminology

- `Application package list item`: safe user-facing summary for one application package source in Settings.
- `Application package debug details`: on-demand raw/internal location metadata for support/debugging.
- `Built-in application materialization`: runtime synchronization step that copies bundled platform apps into a managed server-data package root.
- `Definition launch preferences`: user-facing term for stored `defaultLaunchConfig` values on agent and team definitions.
- `Launch defaults resolver`: shared web-side owner that converts stored definition defaults into initial run-config templates.

## Design Reading Order

Read and write this design from abstract to concrete:

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: identify obsolete legacy paths/files included in this scope.
- Treat removal as first-class design work: when clearer subsystem ownership, reusable owned structures, or tighter file responsibilities make fragmented or duplicated pieces unnecessary, name and remove/decommission them in scope.
- Decision rule: the design is invalid if it depends on compatibility wrappers, dual-path behavior, or legacy fallback branches kept only for old behavior.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Settings Application Packages screen | Safe application package list rows in the UI | `ApplicationPackageService` | This is the trust-sensitive package-source presentation path. |
| DS-002 | Primary End-to-End | Server startup / package refresh | Managed built-in package root under server-data | `BuiltInApplicationPackageMaterializer` | This is the new authoritative built-in application storage root. |
| DS-003 | Primary End-to-End | Agent definition editor | Persisted agent `defaultLaunchConfig` | `AgentDefinitionService` | This keeps agent launch preferences definition-owned while fixing UX. |
| DS-004 | Primary End-to-End | Team definition editor | Persisted team `defaultLaunchConfig` | `AgentTeamDefinitionService` | This adds the missing team-side definition capability across both shared and application-owned team definitions. |
| DS-005 | Primary End-to-End | Direct launch surface or application launch preparation | Prefilled agent/team run config | `DefinitionLaunchDefaultsResolver` | This removes duplicated/ad hoc launch-default derivation logic, including the old application-owned-team aggregation path. |
| DS-006 | Bounded Local | Runtime/model/config field interaction | Valid runtime/model/config subsection state | `RuntimeModelConfigFields` | This local UI loop governs runtime selection, model availability, and schema-driven config editing. |
| DS-007 | Return-Event | Package import/remove mutation completion | Refreshed application/agent/team catalogs | `applicationPackagesStore` | Package source changes must refresh dependent discovery-based catalogs cleanly. |

## Primary Execution Spine(s)

- `Settings Application Packages -> applicationPackagesStore -> GraphQL ApplicationPackageResolver -> ApplicationPackageService -> ApplicationPackagePresentationComposer -> Settings list`
- `Server startup -> BuiltInApplicationPackageMaterializer -> managed built-in package root -> ApplicationPackageService / ApplicationBundleService`
- `AgentDefinitionForm -> DefinitionLaunchPreferencesSection -> agentDefinitionStore -> GraphQL agent definition mutation -> AgentDefinitionService -> provider persistence`
- `AgentTeamDefinitionForm -> DefinitionLaunchPreferencesSection -> agentTeamDefinitionStore -> GraphQL team definition mutation -> AgentTeamDefinitionService -> FileAgentTeamDefinitionProvider -> shared or application-owned team config persistence`
- `Direct launch or application launch preparation -> DefinitionLaunchDefaultsResolver -> AgentRunConfig / TeamRunConfig template builder -> Run config form`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The Settings screen asks for package rows; the service returns only safe product-facing summaries, hiding empty built-ins and removing raw built-in paths from the default list. | Settings UI, store, resolver, service, list-item composer | `ApplicationPackageService` | debug-details query, source summary rules |
| DS-002 | On startup or package refresh, the platform materializes bundled built-in applications into a managed server-data package root, so built-ins no longer depend on an upward-scanned repo/bundle root as their authoritative location. | startup hook, materializer, bundled-resource root, managed built-in root | `BuiltInApplicationPackageMaterializer` | bundled resource resolver, sync manifest/versioning |
| DS-003 | Agent definition editing persists optional launch preferences using the same runtime/model/config interaction pattern as run-config UI, but under the agent-definition boundary. | agent form, shared preferences section, store, GraphQL, service, provider | `AgentDefinitionService` | shared launch-config type/normalizer |
| DS-004 | Team definition editing gains the same optional launch-preference flow and persists team-level defaults for both shared and application-owned team definitions through their respective team-config paths. | team form, shared preferences section, store, GraphQL, service, provider | `AgentTeamDefinitionService` | shared launch-config type/normalizer, application-owned team config parser/write path |
| DS-005 | Launching an agent or team — directly or through an application, including application-owned team launches — resolves one definition-owned launch-default contract into an initial run config template, while preserving launch-time override capability. | launch surface, defaults resolver, run-config template store, run-config form | `DefinitionLaunchDefaultsResolver` | runtime/model/config normalizers |
| DS-006 | Inside the shared runtime/model/config subsection, runtime changes refresh available models, invalid selections are sanitized, and model schemas drive the config editor. | runtime selector, model selector, model config section | `RuntimeModelConfigFields` | runtime availability store, provider-model store |

## Spine Actors / Main-Line Nodes

- `ApplicationPackagesManager.vue`
- `applicationPackagesStore`
- `ApplicationPackageResolver`
- `ApplicationPackageService`
- `BuiltInApplicationPackageMaterializer`
- `AgentDefinitionForm.vue`
- `AgentTeamDefinitionForm.vue`
- `DefinitionLaunchPreferencesSection.vue`
- `agentDefinitionStore`
- `agentTeamDefinitionStore`
- `AgentDefinitionService`
- `AgentTeamDefinitionService`
- `FileAgentTeamDefinitionProvider`
- `DefinitionLaunchDefaultsResolver`
- `agentRunConfigStore`
- `teamRunConfigStore`
- `applicationLaunch.ts` (as a consumer of the shared resolver, not as a policy owner)

## Ownership Map

- `ApplicationPackagesManager.vue`
  - Owns only list rendering, import/remove interactions, empty states, and optional details toggles.
  - Does **not** own package-source truth, built-in hiding rules, or source-kind presentation policy.
- `applicationPackagesStore`
  - Owns GraphQL fetch/mutate transport and post-mutation dependent catalog refresh.
  - Does **not** own package-source classification policy.
- `ApplicationPackageResolver`
  - Thin transport boundary only.
- `ApplicationPackageService`
  - Governing owner for package-source listing, source-kind-aware list-item composition, built-in hiding rules, and package details access.
- `BuiltInApplicationPackageMaterializer`
  - Governing owner for syncing bundled built-in application content into managed server-data storage.
- `AgentDefinitionForm.vue` / `AgentTeamDefinitionForm.vue`
  - Own editor composition and information architecture.
  - Do **not** own runtime/model option-fetching policy.
- `DefinitionLaunchPreferencesSection.vue`
  - Owns the optional UI section shell and binding of `defaultLaunchConfig` fields inside definition editors.
- `RuntimeModelConfigFields.vue`
  - Governing owner for the runtime/model/config field interaction loop used by both run forms and definition editors.
- `AgentDefinitionService`
  - Governing owner for validating and persisting agent `defaultLaunchConfig`.
- `AgentTeamDefinitionService`
  - Governing owner for validating and persisting team `defaultLaunchConfig` across both shared and application-owned team sources.
- `DefinitionLaunchDefaultsResolver`
  - Governing owner for mapping stored definition launch defaults into initial run-config templates for agent, team, and application launch flows.
- `agentRunConfigStore` / `teamRunConfigStore`
  - Own run-template state buffers, but not the policy for how definition defaults are interpreted.
- `applicationLaunch.ts`
  - Consumes the shared resolver for application launch preparation.
  - Must not keep its own divergent team-default derivation policy or reintroduce ownership-specific fallback logic for application-owned teams.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `ApplicationPackageResolver` | `ApplicationPackageService` | GraphQL boundary for package listing/import/remove/details | package-source presentation policy |
| `agentDefinitionStore` | `AgentDefinitionService` | Frontend transport/cache boundary for agent definitions | launch-default normalization rules |
| `agentTeamDefinitionStore` | `AgentTeamDefinitionService` | Frontend transport/cache boundary for team definitions | launch-default normalization rules |
| `applicationLaunch.ts` | `DefinitionLaunchDefaultsResolver` | Application-launch-specific assembly entrypoint | its own independent team-default policy |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Upward-scanned built-in application package root as the authoritative built-in storage location | Built-ins move to a managed server-data package root | `BuiltInApplicationPackageMaterializer` + managed built-in root from app config | In This Change | The old bundled-resource resolver may remain only as a read-only source locator for materialization. |
| Always-show empty built-in package row | Empty built-ins are hidden from the normal list | `ApplicationPackageService` list-item composition rules | In This Change | No compatibility branch retained. |
| Raw built-in path exposure in default Application Packages rows | Product-safe source summaries replace raw internal locations | `ApplicationPackageListItem` contract + optional details query | In This Change | Built-in raw paths move out of the default list. |
| `isDefault` as the main built-in UI concept | “Built-in/default” is the wrong product meaning here | `isPlatformOwned` / platform-owned source presentation | In This Change | The package list should talk about platform-owned sources, not “default” packages. |
| `AgentDefaultLaunchConfigFields.vue` free-text/JSON editor | Shared runtime/model/config UX replaces it | `DefinitionLaunchPreferencesSection.vue` + `RuntimeModelConfigFields.vue` | In This Change | Remove the old component instead of keeping both. |
| Direct launch template creation that ignores stored definition defaults | Definition launch defaults become authoritative prefill source | `DefinitionLaunchDefaultsResolver` used by run-config stores | In This Change | Applies to both agent and team direct launches. |
| Team-default aggregation from leaf agent defaults inside `applicationLaunch.ts` | Team definitions now own team-level defaults directly across both shared and application-owned teams | `DefinitionLaunchDefaultsResolver` using `teamDefinition.defaultLaunchConfig` from both team source paths | In This Change | Member-aggregation policy is removed, not retained as fallback for application-owned teams. |

## Return Or Event Spine(s) (If Applicable)

- `import/remove package mutation -> applicationPackagesStore -> refresh application / agent / team catalogs`
- `definition mutation success -> store reload/update -> editor/detail surfaces`

These return spines matter because package sources affect discovery-based catalogs, and launch-preference changes must immediately become the new definition truth used by later launches.

## Bounded Local / Internal Spines (If Applicable)

### BLS-001 — Shared runtime/model/config interaction loop
- Parent owner: `RuntimeModelConfigFields.vue`
- Short arrow chain:
  `selected runtime -> fetch runtime models -> sanitize selected model -> resolve model schema -> update config editor`
- Why it matters:
  This is the repeated coordination loop that currently exists separately inside `AgentRunConfigForm.vue` and `TeamRunConfigForm.vue`. It must become one reusable owner before definition editors reuse the same UX safely.

### BLS-002 — Built-in application materialization loop
- Parent owner: `BuiltInApplicationPackageMaterializer`
- Short arrow chain:
  `resolve bundled app source root -> compare materialization manifest/version -> copy/sync app roots into managed built-in package root -> publish final root path`
- Why it matters:
  This loop turns packaged bundled resources into a stable server-data root without making build-time packaging write directly into per-user server-data.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Application package list-item composer | DS-001 | `ApplicationPackageService` | Convert raw source records into safe product-facing list rows | Different source kinds need different default-visible summaries | UI/store would re-encode source-kind rules ad hoc |
| Application package details builder | DS-001, DS-002 | `ApplicationPackageService` | Provide on-demand raw/debug location metadata | Keeps sensitive/internal data out of the default list path | Raw internals would leak again into the main list contract |
| Bundled application resource root resolver | DS-002 | `BuiltInApplicationPackageMaterializer` | Locate packaged read-only built-in app resources | Materializer still needs a source to copy from | Old upward-scan semantics would stay mixed with outward package identity |
| Built-in materialization manifest/version check | DS-002 | `BuiltInApplicationPackageMaterializer` | Decide whether sync/copy is needed on startup/upgrade | Avoid needless rewrites while keeping built-ins updated | Startup flow would either thrash or go stale |
| Shared default launch config type/normalizer | DS-003, DS-004, DS-005 | definition services, team config parsers, defaults resolver | Keep one semantic shape for `runtimeKind`, `llmModelIdentifier`, `llmConfig` across shared and application-owned definitions | Agent and team definitions should not drift into parallel shapes or ownership-specific semantics | Duplicate slightly-different config shapes would emerge |
| Shared runtime/model options logic | DS-003, DS-004, DS-006 | `RuntimeModelConfigFields.vue` | Fetch runtime availability, model options, and schema state | Reuse the good run-config interaction pattern everywhere | Repeated option-fetch logic would stay fragmented |
| Dependent catalog refresh after package changes | DS-007 | `applicationPackagesStore` | Refresh discovered applications, agents, and teams after package mutations | Discovery results depend on package sources | Users would see stale catalog state after import/remove |
| Definition detail-surface summary | DS-003, DS-004 | agent/team detail views | Show stored launch preferences as secondary read-only information | The new capability should be inspectable after save | Only editor forms would know the new capability exists |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Package source list/import/remove ownership | `application-packages` | Extend | Correct higher-layer owner already exists | N/A |
| Managed package storage under server-data | GitHub installer under `application-packages/installers` | Extend | Already proves managed package roots under `AppDataDir/application-packages/...` | N/A |
| Built-in app read-only source location | `application-bundles` utilities | Extend | Bundled app resources still belong to the app bundle side | N/A |
| Agent definition launch-default persistence | `agent-definition` | Extend | Domain/API support already exists | N/A |
| Team definition launch-default persistence | `agent-team-definition` | Extend | Team definition is the correct owner of team-level defaults across both shared/team-config-backed and application-owned/source-backed definitions | N/A |
| Runtime/model/config UI behavior | `AgentRunConfigForm.vue`, `TeamRunConfigForm.vue`, existing selector components | Extend via shared subcomponent/composable | Good interaction pattern already exists | Reusing whole run-config forms would over-couple workspace-only concerns into definition editors |
| Shared launch-default-to-run-template mapping | none authoritative today | Create New | Needed to stop direct-launch/application-launch policy drift | Existing stores/helpers each own only one caller path |
| Safe package details/debug retrieval | none authoritative today | Create New | Default list and debug details should not share the same outward contract | Existing list contract is too raw and unsafe |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `application-packages` | package listing/import/remove, source presentation rules, built-in materialization | DS-001, DS-002, DS-007 | `ApplicationPackageService`, `BuiltInApplicationPackageMaterializer` | Extend | This becomes the authoritative home for package-source truth and built-in package storage. |
| `application-bundles` | bundled built-in app resource discovery for materialization source | DS-002 | `BuiltInApplicationPackageMaterializer` | Extend | Read-only source side only. |
| `agent-definition` | agent launch-preference persistence/validation | DS-003, DS-005 | `AgentDefinitionService` | Extend | Existing `defaultLaunchConfig` support remains the core model. |
| `agent-team-definition` | team launch-preference persistence/validation across shared and application-owned team sources | DS-004, DS-005 | `AgentTeamDefinitionService` | Extend | New team-level `defaultLaunchConfig` support lands here for the full team-definition subject, not only shared teams. |
| Web launch-preferences UI | shared runtime/model/config fields + definition section wrapper + launch-default resolver | DS-003, DS-004, DS-005, DS-006 | definition forms, run-config stores, application launch prep | Create New | Current logic is fragmented across editor-only and run-only files. |
| Settings application-packages UI | product-safe list rendering and optional details affordance | DS-001, DS-002 | `ApplicationPackagesManager.vue` | Extend | Must consume safe list items instead of raw paths. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/application-packages/services/application-package-service.ts` | `application-packages` | `ApplicationPackageService` | list/import/remove/details orchestration and product-safe package presentation | One authoritative package-source boundary already exists | Yes |
| `autobyteus-server-ts/src/application-packages/services/built-in-application-package-materializer.ts` | `application-packages` | `BuiltInApplicationPackageMaterializer` | runtime sync of bundled built-in apps into managed server-data root | Distinct lifecycle/policy owner | Yes |
| `autobyteus-server-ts/src/application-packages/types.ts` | `application-packages` | package-source type owner | internal raw package-source types plus outward list/detail models | Shared contract file across service/resolver/installer | Yes |
| `autobyteus-server-ts/src/application-packages/stores/application-package-root-settings-store.ts` | `application-packages` | root settings owner | managed built-in root + additional roots | One place owns root-path truth | Yes |
| `autobyteus-server-ts/src/api/graphql/types/application-packages.ts` | GraphQL transport | resolver/type boundary | safe list query + details query transport types | Transport-specific file | Yes |
| `autobyteus-web/components/settings/ApplicationPackagesManager.vue` | settings UI | package list view | list rows, empty state, optional details affordance | One page-level UI owner | Yes |
| `autobyteus-web/stores/applicationPackagesStore.ts` | settings data transport | frontend store | list/details fetch, import/remove, dependent refresh | One store for package-source interactions | Yes |
| `autobyteus-web/components/launch-config/RuntimeModelConfigFields.vue` | web launch-preferences UI | shared field owner | runtime/model/config interaction loop | Reused by run forms and definition editors | Yes |
| `autobyteus-web/components/launch-config/DefinitionLaunchPreferencesSection.vue` | web launch-preferences UI | definition editor section owner | optional section shell + binding to shared fields | Keeps editor IA distinct from raw field logic | Yes |
| `autobyteus-web/composables/useDefinitionLaunchDefaults.ts` | web launch-preferences UI | `DefinitionLaunchDefaultsResolver` | convert stored defaults into initial agent/team run configs | Shared policy owner for direct/app launches | Yes |
| `autobyteus-server-ts/src/agent-team-definition/domain/models.ts` | `agent-team-definition` | domain model owner | add team `defaultLaunchConfig` | Team definition shape must own it | Yes |
| `autobyteus-server-ts/src/agent-team-definition/providers/team-definition-config.ts` | `agent-team-definition` | shared-team config parser/serializer owner | read/write shared team config `defaultLaunchConfig` | One file already owns shared team config JSON shape | Yes |
| `autobyteus-server-ts/src/agent-team-definition/providers/application-owned-team-source.ts` | `agent-team-definition` | application-owned team parser/serializer owner | read/write application-owned team config `defaultLaunchConfig` plus local/canonical member refs | This is the existing application-owned team config boundary that must join the same team-default model | Yes |
| `autobyteus-server-ts/src/agent-team-definition/providers/file-agent-team-definition-provider.ts` | `agent-team-definition` | source-routing persistence owner | route shared vs application-owned team defaultLaunchConfig persistence through one provider boundary | Keeps one team-definition subject across ownership scopes | Yes |
| `autobyteus-web/stores/agentTeamDefinitionStore.ts` | team definition frontend boundary | store owner | carry team `defaultLaunchConfig` through GraphQL create/update/list | Single frontend source of team definition truth | Yes |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Definition launch-default config shape (`runtimeKind`, `llmModelIdentifier`, `llmConfig`) on server | `autobyteus-server-ts/src/launch-preferences/default-launch-config.ts` | shared launch-preferences support | Used by agent-definition and agent-team-definition | Yes | Yes | a kitchen-sink runtime config with workspace/auto-execute fields |
| Definition launch-default config shape on web | `autobyteus-web/types/launch/DefinitionLaunchConfig.ts` | web launch-preferences UI | Used by both definition stores, forms, and defaults resolver | Yes | Yes | a direct alias of full run-config types |
| Runtime/model/config field interaction logic | `autobyteus-web/components/launch-config/RuntimeModelConfigFields.vue` plus small helper composable if needed | web launch-preferences UI | Reused by run forms and definition editors | Yes | Yes | a monolithic whole-run form |
| Package list item vs debug details contract | `autobyteus-server-ts/src/application-packages/types.ts` | `application-packages` | Separates safe default-visible data from raw details | Yes | Yes | one catch-all outward type exposing every internal path by default |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `DefaultLaunchConfig` shared shape | Yes | Yes | Low | Keep only `runtimeKind`, `llmModelIdentifier`, `llmConfig`; exclude workspace/autoExecute/memberOverrides. |
| `ApplicationPackageListItem` | Yes | Yes | Low | Include only default-visible presentation fields. |
| `ApplicationPackageDebugDetails` | Yes | Yes | Medium | Keep separate from list query so raw location fields do not leak back into the main contract. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/application-packages/types.ts` | `application-packages` | package-source type owner | Define `ApplicationPackageSourceRecord`, `ApplicationPackageListItem`, `ApplicationPackageDebugDetails`, import input | Central shared contract file for package-source behavior | Yes |
| `autobyteus-server-ts/src/application-packages/services/application-package-service.ts` | `application-packages` | `ApplicationPackageService` | Own list/import/remove/details orchestration and hide empty built-ins | Highest authoritative package boundary | Yes |
| `autobyteus-server-ts/src/application-packages/services/built-in-application-package-materializer.ts` | `application-packages` | `BuiltInApplicationPackageMaterializer` | Materialize/sync bundled built-in apps into `AppDataDir/application-packages/platform` (or final chosen managed root) | One lifecycle/policy owner for built-in package storage | Yes |
| `autobyteus-server-ts/src/application-packages/stores/application-package-root-settings-store.ts` | `application-packages` | root settings owner | Return managed built-in root and additional roots; stop treating upward scan as built-in root truth | Root-path authority should live in one place | Yes |
| `autobyteus-server-ts/src/application-bundles/utils/bundled-application-resource-root.ts` | `application-bundles` | read-only source locator | Locate packaged bundled app resources for materialization | Distinct from managed built-in root | No |
| `autobyteus-server-ts/src/api/graphql/types/application-packages.ts` | GraphQL transport | resolver/type boundary | Expose safe list query and separate details query | Keeps transport aligned with package-source boundary | Yes |
| `autobyteus-web/stores/applicationPackagesStore.ts` | settings data transport | store owner | Fetch list/details, import/remove, refresh dependent catalogs | Single frontend package-source store | Yes |
| `autobyteus-web/components/settings/ApplicationPackagesManager.vue` | settings UI | page owner | Render safe list rows, source summaries, empty state, optional details affordance | Main product surface for this slice | Yes |
| `autobyteus-server-ts/src/launch-preferences/default-launch-config.ts` | shared launch-preferences support | shared type/normalizer owner | Shared server-side shape + normalizers for definition launch defaults | Prevent agent/team drift | N/A |
| `autobyteus-server-ts/src/agent-team-definition/domain/models.ts` | `agent-team-definition` | domain model owner | Add `defaultLaunchConfig` to team definitions and updates across all ownership scopes | Team definitions must own their own defaults regardless of source kind | Yes |
| `autobyteus-server-ts/src/agent-team-definition/providers/team-definition-config.ts` | `agent-team-definition` | shared-team config parser/serializer owner | Parse and serialize shared-team `defaultLaunchConfig` in `team-config.json` | Correct shared-team persistence boundary | Yes |
| `autobyteus-server-ts/src/agent-team-definition/providers/application-owned-team-source.ts` | `agent-team-definition` | application-owned team parser/serializer owner | Parse and serialize application-owned-team `defaultLaunchConfig` in application-owned `team-config.json` while keeping local/canonical member translation | Correct application-owned persistence boundary for the same team subject | Yes |
| `autobyteus-server-ts/src/agent-team-definition/providers/file-agent-team-definition-provider.ts` | `agent-team-definition` | source-routing persistence owner | Route team defaultLaunchConfig reads/writes through shared and application-owned team source paths | Keeps one provider boundary across ownership scopes | Yes |
| `autobyteus-server-ts/src/agent-team-definition/services/agent-team-definition-service.ts` | `agent-team-definition` | `AgentTeamDefinitionService` | Validate/update team `defaultLaunchConfig` across shared and application-owned team definitions | Correct authoritative service boundary | Yes |
| `autobyteus-server-ts/src/api/graphql/types/agent-team-definition.ts` | GraphQL transport | team definition transport | Add team `defaultLaunchConfig` to object/input types | Transport must expose the new team capability | Yes |
| `autobyteus-server-ts/src/api/graphql/converters/agent-team-definition-converter.ts` | GraphQL transport | converter owner | Map team `defaultLaunchConfig` between domain and GraphQL | Singular translation concern | Yes |
| `autobyteus-web/types/launch/DefinitionLaunchConfig.ts` | web launch-preferences UI | shared type owner | Shared web launch-default shape | Prevent store/form drift | N/A |
| `autobyteus-web/components/launch-config/RuntimeModelConfigFields.vue` | web launch-preferences UI | shared field owner | Runtime dropdown, model selector, schema-driven config editor | Reused by run forms and definition editors | Yes |
| `autobyteus-web/components/launch-config/DefinitionLaunchPreferencesSection.vue` | web launch-preferences UI | section owner | Optional/collapsible section shell for definition editors | Keeps form placement/labels consistent | Yes |
| `autobyteus-web/composables/useDefinitionLaunchDefaults.ts` | web launch-preferences UI | `DefinitionLaunchDefaultsResolver` | Build initial `AgentRunConfig` / `TeamRunConfig` from definition defaults | One authoritative prefill policy owner | Yes |
| `autobyteus-web/components/agents/AgentDefinitionForm.vue` | agent UI | page owner | Place launch preferences below tools and above advanced processors | Correct information architecture for agent definitions | Yes |
| `autobyteus-web/components/agentTeams/AgentTeamDefinitionForm.vue` | team UI | page owner | Add team launch preferences section near the bottom of team authoring | Correct information architecture for team definitions | Yes |
| `autobyteus-web/stores/agentDefinitionStore.ts` | agent frontend boundary | store owner | Continue carrying agent `defaultLaunchConfig` via shared type | Existing correct definition boundary | Yes |
| `autobyteus-web/stores/agentTeamDefinitionStore.ts` | team frontend boundary | store owner | Add team `defaultLaunchConfig` via shared type | New team definition boundary support | Yes |
| `autobyteus-web/stores/agentRunConfigStore.ts` | direct launch template store | run template owner | Use shared resolver when setting agent templates | Stop ignoring stored agent defaults | Yes |
| `autobyteus-web/types/agent/TeamRunConfig.ts` | run-config type boundary | team run config owner | Update `createDefaultTeamRunConfig()` to consume team definition defaults through shared resolver or helper | Remove empty-team-default hardcoding | Yes |
| `autobyteus-web/utils/application/applicationLaunch.ts` | application launch preparation | application launch assembler | Consume shared resolver for agent/team config prefill, remove leaf-agent aggregation policy | Application launches should consume, not own, defaults policy | Yes |

## Ownership Boundaries

### Application package boundary
`ApplicationPackageService` is the authoritative product boundary.
It encapsulates:
- built-in source hiding rules,
- source-kind-specific list presentation,
- debug details exposure,
- import/remove orchestration,
- managed built-in root policy.

Upstream callers must not bypass it by mixing:
- raw root settings,
- raw registry records,
- component-only formatting logic.

### Built-in materialization boundary
`BuiltInApplicationPackageMaterializer` is the authoritative owner of how bundled built-in apps become a managed server-data package source.
It encapsulates:
- bundled source location lookup,
- target managed root selection,
- sync/copy/version logic.

### Definition launch-preference boundaries
`AgentDefinitionService` and `AgentTeamDefinitionService` are the authoritative owners of persisted launch defaults for their respective definition types.
For teams, that boundary spans both shared `team-definition-config.ts` persistence and the application-owned `application-owned-team-source.ts` parser/write path; callers must not treat application-owned teams as a special launch-policy exception.
Application launch helpers and run-config stores are consumers only.

### Launch-default resolution boundary
`DefinitionLaunchDefaultsResolver` is the authoritative web-side owner of how stored definition defaults become initial `AgentRunConfig` / `TeamRunConfig` values.
Direct launch stores and application launch helpers must call this boundary rather than inventing their own defaults policy, and `applicationLaunch.ts` must not branch back into ownership-specific leaf-member aggregation for application-owned teams.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `ApplicationPackageService` | root settings, registry records, source summary rules, built-in hiding, details lookup | GraphQL resolver, tests, admin flows | UI/store reading root settings + formatting raw paths themselves | add explicit list/detail methods and models |
| `BuiltInApplicationPackageMaterializer` | bundled source lookup, sync manifest/versioning, target root copy logic | server startup/bootstrap hooks | direct callers manually copying files into server-data | expose one `ensureMaterialized()` entrypoint |
| `AgentDefinitionService` | agent defaultLaunchConfig normalization and persistence | GraphQL mutations, tests | UI-only pseudo-default fields not mapped through service | strengthen mutation input + shared normalizer usage |
| `AgentTeamDefinitionService` | team defaultLaunchConfig normalization and persistence across shared `team-definition-config.ts` and application-owned `application-owned-team-source.ts` paths | GraphQL mutations, tests | team form or application launch inferring ownership-specific defaults outside the service/provider boundary | add first-class domain/API/store support plus provider coverage for both team source kinds |
| `DefinitionLaunchDefaultsResolver` | normalization, empty-default handling, run-config prefill mapping | `agentRunConfigStore`, `teamRunConfigStore`, `applicationLaunch.ts` | each caller building its own team/agent defaults | expose agent/team-specific builder helpers |
| `RuntimeModelConfigFields.vue` | runtime availability fetch, model list fetch, invalid-selection sanitation, schema-driven config editing | run forms, definition preferences section | forms duplicating their own option-fetch/sanitize loop | add explicit props/events instead of copying logic |

## Dependency Rules

- `ApplicationPackagesManager.vue` may depend on `applicationPackagesStore`, not on raw GraphQL fields plus path-formatting rules in parallel.
- `applicationPackagesStore` may depend on GraphQL queries/mutations and downstream catalog refresh stores, but not on `ApplicationPackageRootSettingsStore` semantics.
- `ApplicationPackageResolver` may depend on `ApplicationPackageService`, not on lower-level root-settings/installer internals directly.
- `ApplicationPackageService` may depend on:
  - root settings store,
  - registry store,
  - GitHub installer,
  - materializer,
  - summary/details utilities.
- `BuiltInApplicationPackageMaterializer` may depend on app config and a bundled-resource locator, but not on UI-facing formatting.
- Definition editors may depend on `DefinitionLaunchPreferencesSection.vue`, not directly on runtime-availability/model-fetch orchestration.
- `DefinitionLaunchPreferencesSection.vue` may depend on `RuntimeModelConfigFields.vue`, not on workspace-only run-config form shells.
- `agentRunConfigStore`, `teamRunConfigStore`, and `applicationLaunch.ts` must depend on `DefinitionLaunchDefaultsResolver`, not on parallel ad hoc normalization logic.
- `applicationLaunch.ts` must not depend on both `DefinitionLaunchDefaultsResolver` and its old leaf-member-dominant aggregation logic.
- `team-definition-config.ts` and `application-owned-team-source.ts` must depend on the shared server-side `default-launch-config.ts` normalizer, not on parallel ownership-specific launch-default parsing rules.
- `applicationLaunch.ts` must not branch on `teamDefinition.ownershipScope` to reintroduce leaf-member aggregation for application-owned teams.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `ApplicationPackageService.listApplicationPackages()` | application package source list | Return safe list items for Settings | none | No raw path/source leakage in the default list contract. |
| `ApplicationPackageService.getApplicationPackageDetails(packageId)` | package debug details | Return raw/internal details on demand | `packageId` | Separate from list path. |
| `ApplicationPackageService.importApplicationPackage(input)` | package source management | Import linked local or GitHub package | explicit import input | Existing import boundary remains. |
| `ApplicationPackageService.removeApplicationPackage(packageId)` | package source management | Remove imported package | `packageId` | Built-in remains non-removable. |
| `BuiltInApplicationPackageMaterializer.ensureMaterialized()` | built-in package storage | Sync bundled built-ins into managed root | none | Called during startup/refresh lifecycle. |
| `AgentDefinitionService.create/updateDefinition(...defaultLaunchConfig...)` | agent definition | Persist agent launch defaults | explicit `defaultLaunchConfig` | Existing boundary extended only by UX cleanup. |
| `AgentTeamDefinitionService.create/updateDefinition(...defaultLaunchConfig...)` | team definition | Persist team launch defaults across shared and application-owned team sources | explicit `defaultLaunchConfig` | New first-class team capability across the full team-definition subject. |
| `DefinitionLaunchDefaultsResolver.buildAgentRunTemplate(agentDefinition)` | agent launch defaults | Prefill `AgentRunConfig` from agent definition | agent definition object | Used by direct runs and applications. |
| `DefinitionLaunchDefaultsResolver.buildTeamRunTemplate(teamDefinition)` | team launch defaults | Prefill `TeamRunConfig` from team definition | team definition object | Clean-cut replacement for leaf-agent aggregation. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `listApplicationPackages()` | Yes | Yes | Low | Keep list data separate from details. |
| `getApplicationPackageDetails(packageId)` | Yes | Yes | Low | No mixed list/details contract. |
| `buildAgentRunTemplate(agentDefinition)` | Yes | Yes | Low | Keep agent and team builders split by subject. |
| `buildTeamRunTemplate(teamDefinition)` | Yes | Yes | Low | Do not collapse into one generic definition builder with ambiguous identity. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Built-in server-data root | `managed built-in application package root` | Yes | Low | Use product wording “Platform Applications” in UI, not raw path. |
| Stored definition launch defaults | user-facing `Preferred launch settings`; stored `defaultLaunchConfig` | Yes | Medium | Keep storage/API name for code continuity, but rename UI copy for clarity. |
| Shared launch-default resolver | `DefinitionLaunchDefaultsResolver` | Yes | Low | Keep it definition-owned, not application-owned. |

## Applied Patterns (If Any)

- `Adapter`
  - `ApplicationPackageResolver` and GraphQL converters translate transport contracts only.
- `Repository / Persistence boundary`
  - Existing provider layers for agent/team definitions remain persistence owners.
- `Factory-like materialization owner`
  - `BuiltInApplicationPackageMaterializer` governs one runtime-managed copy/sync lifecycle.
- `Shared bounded local interaction component`
  - `RuntimeModelConfigFields.vue` owns a reusable local state loop instead of duplicating runtime/model/config coordination.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/application-packages/types.ts` | File | package-source type owner | package list/detail/internal record types | Shared server contract for this subsystem | UI wording logic |
| `autobyteus-server-ts/src/application-packages/services/application-package-service.ts` | File | `ApplicationPackageService` | package list/import/remove/details orchestration | Existing package boundary remains authoritative | raw GraphQL decorator code |
| `autobyteus-server-ts/src/application-packages/services/built-in-application-package-materializer.ts` | File | `BuiltInApplicationPackageMaterializer` | materialize bundled built-ins into managed root | Built-in package lifecycle owner | generic package list formatting |
| `autobyteus-server-ts/src/application-packages/stores/application-package-root-settings-store.ts` | File | root settings owner | managed built-in root + additional root settings | Correct place for root-path truth | UI-specific naming |
| `autobyteus-server-ts/src/application-bundles/utils/bundled-application-resource-root.ts` | File | bundled-resource locator | find read-only bundled app source root | Source-side utility only | package list or UI behavior |
| `autobyteus-server-ts/src/launch-preferences/` | Folder | shared launch-preferences support | shared default-launch-config type/normalizer | Cross-definition support is real and focused | workspace-only run-config fields |
| `autobyteus-server-ts/src/launch-preferences/default-launch-config.ts` | File | shared type owner | normalize and validate `defaultLaunchConfig` shape | Used by agent and team definition subsystems | launch-time workspace/autoExecute logic |
| `autobyteus-server-ts/src/agent-team-definition/domain/models.ts` | File | team domain owner | add team `defaultLaunchConfig` | Team domain shape change belongs here | GraphQL transport code |
| `autobyteus-server-ts/src/agent-team-definition/providers/team-definition-config.ts` | File | shared-team config parser | persist `defaultLaunchConfig` in shared-team `team-config.json` | Shared-team config JSON owner | runtime availability lookups |
| `autobyteus-server-ts/src/agent-team-definition/providers/application-owned-team-source.ts` | File | application-owned team parser/write owner | persist `defaultLaunchConfig` in application-owned `team-config.json` while translating local/canonical refs | Existing application-owned team boundary must join the same team-default model | runtime availability lookups |
| `autobyteus-server-ts/src/agent-team-definition/providers/file-agent-team-definition-provider.ts` | File | source-routing persistence owner | route team defaultLaunchConfig reads/writes through shared and application-owned source paths | One provider already owns source-kind routing for team definitions | launch-policy fallback logic |
| `autobyteus-server-ts/src/api/graphql/types/application-packages.ts` | File | transport boundary | safe list + details queries | GraphQL transport concern | root-setting internals |
| `autobyteus-server-ts/src/api/graphql/types/agent-team-definition.ts` | File | transport boundary | team `defaultLaunchConfig` fields in query/mutation types | GraphQL transport concern | domain validation logic |
| `autobyteus-web/components/launch-config/` | Folder | web launch-preferences UI | shared launch-default editor pieces | Reused by run forms and definition editors | full workspace run forms |
| `autobyteus-web/components/launch-config/RuntimeModelConfigFields.vue` | File | shared field owner | runtime/model/config UI trio | Common bounded local loop | workspace selection, auto-execute |
| `autobyteus-web/components/launch-config/DefinitionLaunchPreferencesSection.vue` | File | section shell owner | optional/collapsible editor section | Shared agent/team editor IA | direct run panel logic |
| `autobyteus-web/types/launch/DefinitionLaunchConfig.ts` | File | shared web type owner | shared launch-default shape | Prevent store/form drift | full run-config template fields |
| `autobyteus-web/composables/useDefinitionLaunchDefaults.ts` | File | `DefinitionLaunchDefaultsResolver` | build agent/team run templates from definitions | Shared prefill policy owner | UI rendering |
| `autobyteus-web/components/settings/ApplicationPackagesManager.vue` | File | settings page owner | consume safe list rows, optional details | Main product page for package UX | package-source business rules |
| `autobyteus-web/stores/applicationPackagesStore.ts` | File | settings data boundary | list/details fetch + dependent refresh | Single frontend data owner | built-in hiding rules |
| `autobyteus-web/components/agents/AgentDefinitionForm.vue` | File | agent editor owner | place launch preferences below tools | Agent-specific IA belongs here | duplicated runtime/model logic |
| `autobyteus-web/components/agentTeams/AgentTeamDefinitionForm.vue` | File | team editor owner | place team launch preferences near bottom | Team-specific IA belongs here | duplicated runtime/model logic |
| `autobyteus-web/stores/agentRunConfigStore.ts` | File | direct agent run template owner | use shared resolver when templating | Correct place for agent direct-run prefill | custom ad hoc normalization |
| `autobyteus-web/types/agent/TeamRunConfig.ts` | File | team run-config type owner | create default team run config from definition defaults | Correct place for team template shape | package-source logic |
| `autobyteus-web/utils/application/applicationLaunch.ts` | File | application launch assembler | consume shared resolver | Application-specific assembly only | independent defaults policy |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/application-packages/` | Main-Line Domain-Control | Yes | Low | Correct home for package-source policy and materialization. |
| `autobyteus-server-ts/src/launch-preferences/` | Off-Spine Concern | Yes | Medium | New small shared subsystem justified because both agent/team definitions need the same tight config shape. |
| `autobyteus-web/components/launch-config/` | Off-Spine Concern | Yes | Low | Shared runtime/model/config UI is reused across multiple callers but does not own whole forms. |
| `autobyteus-web/components/settings/` | Mixed Justified | Yes | Low | Page-level UI remains here while business policy stays in service/store boundaries. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Package list contract | `ApplicationPackageService -> ApplicationPackageListItem { displayName, sourceKind, sourceSummary, applicationCount, isPlatformOwned }` | `ApplicationPackageService -> { path, source, managedInstallPath, isDefault } rendered directly in UI` | Shows the clean separation between safe default-visible data and raw internal locations. |
| Built-in storage model | `bundled resources -> materializer -> AppDataDir/application-packages/platform/applications/...` | `UI and service keep treating an upward-scanned repo/app-bundle root as the built-in package root` | Clarifies that packaged resources and managed runtime root are different concerns. |
| Team launch defaults | `shared or application-owned teamDefinition.defaultLaunchConfig -> DefinitionLaunchDefaultsResolver.buildTeamRunTemplate()` | `applicationLaunch.ts branches on ownershipScope and derives application-owned team defaults by tallying leaf agent defaults` | Shows why team-level defaults belong to the team definition boundary regardless of ownership scope. |
| Shared launch-preference UI | `DefinitionLaunchPreferencesSection -> RuntimeModelConfigFields -> SearchableGroupedSelect + ModelConfigSection` | `Agent form keeps raw text inputs while run forms use dropdowns/selectors` | Makes the intended UX alignment concrete. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep showing the old built-in row but just rename it | Smallest visible patch | Rejected | Hide empty built-ins, move built-ins to managed server-data root, replace raw list contract. |
| Keep raw path/source fields in the main list and ask the UI to hide some of them | Minimal API churn | Rejected | Replace with safe list item contract plus separate details access. |
| Keep `AgentDefaultLaunchConfigFields.vue` and only move it lower in the form | Minimal UI change | Rejected | Replace with shared runtime/model/config UX aligned with run forms. |
| Add team launch defaults only in frontend local state | Smaller implementation | Rejected | Add real team domain/API/store support. |
| Keep leaf-agent-dominant team-default aggregation as a fallback (especially for application-owned teams) | Preserve old application behavior | Rejected | Team definitions become the single team-level defaults owner across both shared and application-owned teams. |

Hard block:
- Any design that depends on backward-compatibility wrappers, dual-path behavior, or retained legacy flow for in-scope replaced behavior fails review.

## Derived Layering (If Useful)

- **Product-facing surfaces**
  - Settings package list UI
  - Agent/team definition editors
  - Run-config forms
- **Frontend transport/state boundaries**
  - stores + GraphQL operations
- **Domain/control boundaries**
  - `ApplicationPackageService`
  - `BuiltInApplicationPackageMaterializer`
  - `AgentDefinitionService`
  - `AgentTeamDefinitionService`
  - `DefinitionLaunchDefaultsResolver`
- **Persistence / resource boundaries**
  - package registry/root settings
  - bundled-resource locator
  - file providers/config serializers

## Migration / Refactor Sequence

1. **Introduce shared package-source contract split**
   - Add `ApplicationPackageListItem` and `ApplicationPackageDebugDetails` server-side models.
   - Update GraphQL package resolver/types and frontend store types accordingly.

2. **Introduce managed built-in package root**
   - Add app-config-root access needed for managed package storage if missing.
   - Add `BuiltInApplicationPackageMaterializer`.
   - Replace built-in root settings so the authoritative built-in root points to managed server-data storage rather than upward-scanned repo/bundle roots.
   - Keep bundled-resource lookup only as the read-only source for materialization.

3. **Refactor package list UI**
   - Update `ApplicationPackagesManager.vue` to render safe list rows, hide empty built-ins, and optionally open explicit details/debug metadata.
   - Update tests that currently assume built-in row always appears and always exposes raw paths.

4. **Add shared launch-preference structures**
   - Add shared `default-launch-config` type/normalizer on server.
   - Add shared web launch-default type.

5. **Refactor agent launch-preference editor UX**
   - Replace `AgentDefaultLaunchConfigFields.vue` with the shared definition launch-preferences section and runtime/model/config fields.
   - Move the section below tools in `AgentDefinitionForm.vue`.

6. **Add team definition launch-preference support**
   - Extend domain models, GraphQL types/converter, frontend store types, and team definition form.
   - Extend `team-definition-config.ts` so shared-team `team-config.json` persists `defaultLaunchConfig`.
   - Extend `application-owned-team-source.ts` so application-owned `team-config.json` also parses and serializes `defaultLaunchConfig` through the same shared normalizer.
   - Update `FileAgentTeamDefinitionProvider` / `AgentTeamDefinitionService` so both shared and application-owned team definitions participate in the same authoritative team-default boundary.

7. **Introduce shared launch-defaults resolver**
   - Add `DefinitionLaunchDefaultsResolver` on the web.
   - Update `agentRunConfigStore.setTemplate(...)` and `createDefaultTeamRunConfig(...)` / `teamRunConfigStore` to use it.
   - Update `applicationLaunch.ts` to use the same resolver for shared and application-owned team launches.

8. **Remove legacy divergent policies**
   - Delete `AgentDefaultLaunchConfigFields.vue`.
   - Remove leaf-agent-dominant team-default aggregation from `applicationLaunch.ts` only after both shared and application-owned team source paths carry `defaultLaunchConfig`.
   - Remove old built-in root semantics from outward package presentation.

## Key Tradeoffs

- **Materializing built-ins into server-data vs leaving them in bundle resources**
  - Chosen: materialize into server-data.
  - Why: better trust model, aligns with built-in agents/teams, and removes personal-path-looking built-in roots from the product mental model.
  - Cost: requires startup sync logic.

- **Separate package list vs details contracts**
  - Chosen: split list and details.
  - Why: the default list must be safe and simple.
  - Cost: one more small query/path if debug details are needed.

- **Shared runtime/model/config UI subsection vs reusing whole run-config forms**
  - Chosen: shared subsection.
  - Why: we want consistent UX without dragging workspace/auto-execute/run-panel concerns into definition editors.
  - Cost: some extraction work.

- **Team-level defaults only vs member-level stored defaults**
  - Chosen: team-level only for this ticket.
  - Why: matches user direction and keeps the first team capability simple.
  - Cost: no persisted member-level team overrides yet.

- **Extend application-owned team definitions into the same team-default contract vs scope them out**
  - Chosen: extend application-owned team definitions into the same contract.
  - Why: the current codebase already treats them as first-class `AgentTeamDefinition` subjects, the provider already has a writable-source update path, and application-owned agents already carry `defaultLaunchConfig`.
  - Cost: extra parser/write-path work and test coverage across the application-owned team source path.

- **Remove team-default aggregation from leaf agents**
  - Chosen: remove.
  - Why: team defaults should be team-owned, and the current aggregation hides ownership inside application launch code.
  - Cost: applications that relied on that synthesis change behavior once the refactor lands, so both shared and application-owned team source paths must be migrated before the fallback is deleted.

## Risks

- Startup materialization needs a clear sync/version rule so packaged built-ins update correctly without corrupting user-managed imported packages.
- The exact managed built-in root naming still needs one final path choice; `AppDataDir/application-packages/platform` is the leading recommendation because it preserves the package-root contract cleanly.
- Localization/copy updates are needed so user-facing labels say “Platform Applications” / “Preferred launch settings” consistently.
- Team-definition support touches multiple layers, so implementation should update tests across server, store, and UI boundaries together.
- Shared-team and application-owned-team config parsing must stay aligned on the same shared `defaultLaunchConfig` semantics; otherwise launch behavior will drift by ownership scope.
- Application-owned team updates still depend on source writability, so any new editor affordance or mutation handling should continue respecting the existing read-only-source boundary.

## Guidance For Implementation

- Treat the package-source contract split and the team launch-default model as **real boundary changes**, not wording tweaks.
- Do not keep the old `isDefault`/raw built-in path list contract alive “just in case.”
- Do not keep `AgentDefaultLaunchConfigFields.vue` as a second editor path.
- Introduce the shared runtime/model/config field owner before rewriting the forms; otherwise the refactor will duplicate logic again.
- Do not extend only `team-definition-config.ts` and forget `application-owned-team-source.ts`; both are part of the same team-definition subject for this design.
- Reuse the existing `FileAgentTeamDefinitionProvider.update(...)` routing path for application-owned team writes instead of inventing a second persistence seam.
- Introduce the shared launch-default resolver before changing launch stores and `applicationLaunch.ts`; otherwise callers will drift.
- Keep `applicationLaunch.ts` consumer-only and ownership-agnostic; once the model lands, it should read `teamDefinition.defaultLaunchConfig` regardless of whether the team is shared or application-owned.
- When implementing built-in materialization, keep imported-package roots isolated from the platform-managed built-in root.

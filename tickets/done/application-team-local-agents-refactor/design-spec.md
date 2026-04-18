# Design Spec

Write this artifact to a canonical file path in the assigned task workspace before any handoff message.

## Current-State Read

Current application-owned team semantics split agent locality into two inconsistent models:

- shared teams already use `team_local` agent members stored under `agent-teams/<team-id>/agents/<agent-id>/`;
- application-owned teams instead require `refScope: "application_owned"`, store their member agents under `applications/<app-id>/agents/<agent-id>/`, and canonicalize those refs into application-owned agent ids.

The current execution path that encodes this old model is:

`application root -> FileApplicationBundleProvider.scanBundleRoot() -> readApplicationOwnedTeamDefinitionFromSource() -> canonicalizeApplicationOwnedTeamMembers() -> assertApplicationOwnedTeamIntegrity() -> buildApplicationOwnedAgentSourcePaths()`

The current update path is also split across mismatched owners:

`AgentTeamDefinitionService.updateDefinition(...) -> assertApplicationOwnedMembership(...) -> FileAgentTeamDefinitionProvider.update(...)`

That service-level validation only knows canonical application-owned source maps, while the provider already resolves concrete `sourcePaths` and writes the app-owned team files. Under the new semantics, the service no longer has enough context to verify that local team members exist under the owning team folder.

The current UI edit path has a similar mismatch:

`AgentDefinitionStore generic definitions -> useAgentTeamDefinitionFormState agent library -> addNodeFromLibrary(item) -> node.ref = item.id -> buildSubmitNodes(...)`

That path is safe for shared/global ids, but not for application-owned teams after the refactor because app-owned team configs must persist **local** team-member refs, not canonical visible team-local ids.

Current constraints the target design must respect:

- direct application runtime target agents must remain supported at `applications/<app>/agents/<agent-id>/` with `application_owned` ownership;
- application-owned teams remain top-level app definitions at `applications/<app>/agent-teams/<team-id>/`;
- generic Agents/Agent Teams surfaces must still show/edit application-team member agents independently;
- no backward compatibility, no fallback reads, no dual-path support.

## Intended Change

Unify team-member semantics around one rule:

> If an agent belongs to a team, its persisted member ref is `team_local` and its files live inside that team's `agents/` folder.

Applied to application bundles, the new filesystem and config model becomes:

- direct app agent: `applications/<app>/agents/<agent-id>/...` -> `application_owned`
- app team: `applications/<app>/agent-teams/<team-id>/...` -> `application_owned`
- app team member agent: `applications/<app>/agent-teams/<team-id>/agents/<agent-id>/...` -> `team_local`

For application-owned teams:

- `team-config.json` agent members use `refScope: "team_local"`
- `ref` stores the **local agent id inside the owning team folder**, not a canonical application-owned agent id
- nested team refs stay canonical application-owned team ids in the domain model and local app-team ids in the file shape
- any old `application_owned` agent member ref is invalid

Runtime/API identity for a team-local agent remains canonical when needed by generic agent APIs:

- canonical id = `buildTeamLocalAgentDefinitionId(teamDefinitionId, localAgentId)`
- for application-owned teams, `teamDefinitionId` is the canonical application-owned team id
- therefore app-team-local agent ids stay globally unique without flattening their filesystem placement

Two additional boundary rules are now explicit:

1. **Update-time source-aware validation rule**: `FileAgentTeamDefinitionProvider.update(...)` is the authoritative boundary for validating app-owned team local-member existence because it already resolves `sourcePaths` for the owning team.
2. **UI persisted-ref localizer rule**: `useAgentTeamDefinitionFormState` is the authoritative UI boundary for converting canonical visible team-local agent ids into persisted local `ref` values for app-owned team editing.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.

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
| `DS-001` | `Primary End-to-End` | `Application bundle root` | `Validated application-owned team definition` | `FileApplicationBundleProvider` | Establishes the authoritative bundle contract for application teams and their member-agent locality. |
| `DS-002` | `Primary End-to-End` | `Agent definition id lookup / list request` | `Resolved agent.md + agent-config.json with provenance` | `FileAgentDefinitionProvider` | Generic agent surfaces and updates depend on correct resolution of shared, direct-app, and app-team-local agent ids. |
| `DS-003` | `Primary End-to-End` | `Application/team launch preparation` | `Canonical leaf agentDefinitionId for runtime member config` | `ApplicationSessionLaunchBuilder` / `TeamRunService` | Runtime launch must convert persisted local team refs into stable canonical agent ids. |
| `DS-004` | `Primary End-to-End` | `Application-owned team update request` | `Persisted team-config.json that only references valid local members` | `FileAgentTeamDefinitionProvider.update(...)` | Source-aware update-time validation must happen where the owning team dir is already resolved. |
| `DS-005` | `Primary End-to-End` | `Visible canonical team-local agent definition in UI` | `Persisted local team member ref in submitted form payload` | `useAgentTeamDefinitionFormState` | The app-owned team edit path must not leak canonical ids into persisted `node.ref` values. |
| `DS-006` | `Return-Event` | `Resolved agent definition provenance` | `Native Agents/Agent Teams UI labels and form libraries` | `autobyteus-web agent/team surfaces` | The UI must show both team and application provenance for application-team-local agents and stop teaching the old app-owned-member model. |
| `DS-007` | `Bounded Local` | `Team definition id + local agent id` | `Concrete local agent source paths` | `team-local agent discovery / source-resolution helper` | One reusable local-resolution loop removes duplicated assumptions about where team-local agents live. |

## Primary Execution Spine(s)

- `Application bundle root -> FileApplicationBundleProvider -> ApplicationOwnedTeamSource -> ApplicationOwnedTeamIntegrityValidator -> validated AgentTeamDefinition`
- `AgentDefinitionService -> FileAgentDefinitionProvider -> team-local agent source resolver -> agent.md/agent-config.json -> AgentDefinition`
- `ApplicationSessionLaunchBuilder / TeamRunService -> buildTeamLocalAgentDefinitionId(teamDefinitionId, localAgentId) -> AgentDefinitionService -> runtime member config`
- `AgentTeamDefinitionService.updateDefinition(...) -> FileAgentTeamDefinitionProvider.update(...) -> ApplicationOwnedTeamIntegrityValidator + ApplicationOwnedTeamSource write prep -> team-config.json`
- `AgentDefinitionStore.getTeamLocalAgentDefinitionsByOwnerTeamId(...) -> useAgentTeamDefinitionFormState localizer -> addNodeFromLibrary(...) -> buildSubmitNodes(...)`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-001` | Application bundle scanning still discovers top-level app teams, but app-team member refs are now validated against the owning team folder instead of app-root sibling agents. | `FileApplicationBundleProvider`, `ApplicationOwnedTeamSource`, `ApplicationOwnedTeamIntegrityValidator` | `FileApplicationBundleProvider` | nested-team canonicalization, local-agent parse checks |
| `DS-002` | Generic agent lookup accepts a canonical team-local id, resolves its owning team definition source first, then reads the local agent files under that team while attaching both team and application provenance when applicable. | `FileAgentDefinitionProvider`, `team-local agent discovery`, `AgentDefinition` | `FileAgentDefinitionProvider` | team source resolution, ownership metadata mapping |
| `DS-003` | Launch prep reads team definitions that persist local team refs, then canonicalizes each leaf team-local agent at the launch boundary so downstream runtime code always receives a stable agentDefinitionId. | `ApplicationSessionLaunchBuilder`, `TeamRunService`, `AgentDefinitionService` | `ApplicationSessionLaunchBuilder` / `TeamRunService` | runtime member-route collection |
| `DS-004` | The service validates generic team invariants, then the provider resolves `sourcePaths` and performs source-aware app-owned team validation before writing files. | `AgentTeamDefinitionService`, `FileAgentTeamDefinitionProvider`, `ApplicationOwnedTeamIntegrityValidator`, `ApplicationOwnedTeamSource` | `FileAgentTeamDefinitionProvider.update(...)` | local-agent existence checks, nested-team same-app checks |
| `DS-005` | The store exposes current-team visible team-local definitions, but the form-state layer localizes each visible canonical id into a persisted local ref before writing `node.ref` or submitting nodes. | `AgentDefinitionStore`, `useAgentTeamDefinitionFormState` | `useAgentTeamDefinitionFormState` | team-local id parse/build utility |
| `DS-006` | Resolved provenance flows outward through GraphQL/store/UI so app-team-local agents show as team-local definitions with both owning team and owning application context. | `GraphQL agent definition`, `agentDefinitionStore`, `AgentCard/Detail/Edit`, `AgentTeamDefinitionForm` | `autobyteus-web agent/team surfaces` | provenance formatting |
| `DS-007` | A small internal resolution cycle finds the owning team source (shared or application-owned), derives local agent paths, and returns ownership metadata to all callers that need it. | `findTeamSourcePaths`, `team-local agent discovery helpers` | `team-local agent discovery helper` | shared-vs-app-owned team source branching |

## Spine Actors / Main-Line Nodes

- `FileApplicationBundleProvider`
- `ApplicationOwnedTeamSource`
- `ApplicationOwnedTeamIntegrityValidator`
- `FileAgentDefinitionProvider`
- `team-local agent discovery / source-resolution helper`
- `ApplicationSessionLaunchBuilder`
- `TeamRunService`
- `AgentTeamDefinitionService`
- `FileAgentTeamDefinitionProvider`
- `AgentDefinitionStore`
- `useAgentTeamDefinitionFormState`
- `autobyteus-web agent/team surfaces`

## Ownership Map

- `FileApplicationBundleProvider` owns application bundle scanning and import-time contract validation.
- `ApplicationOwnedTeamSource` owns parse/write semantics for app-owned team files.
- `ApplicationOwnedTeamIntegrityValidator` owns same-team/same-app member integrity rules for app-owned teams.
- `FileAgentDefinitionProvider` is the authoritative generic agent-definition read/update boundary.
- `team-local agent discovery / source-resolution helper` owns turning a team definition id plus local agent id into concrete filesystem paths and provenance metadata.
- `ApplicationSessionLaunchBuilder` owns application-session leaf-member descriptor construction.
- `TeamRunService` owns generic runtime leaf-member descriptor construction for team runs.
- `AgentTeamDefinitionService` owns generic team-definition update semantics (coordinator validity, generic ref-shape validity, default launch config normalization) but **not** source-aware local-member existence checks.
- `FileAgentTeamDefinitionProvider.update(...)` owns source-aware persistence-time validation and write preparation for application-owned teams because it already resolves `sourcePaths`.
- `AgentDefinitionStore` owns generic cached agent-definition query/filter helpers.
- `useAgentTeamDefinitionFormState` owns the UI-side canonical-visible-id -> persisted-local-ref conversion for app-owned team editing.
- `autobyteus-web agent/team surfaces` own how provenance is rendered.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `ApplicationBundleService` | `FileApplicationBundleProvider` | Cache and expose app bundle catalog + top-level source provenance | direct local-agent path logic |
| `AgentDefinitionService` | `FileAgentDefinitionProvider` | Stable public boundary for generic agent reads/updates | ad-hoc path reconstruction by callers |
| `AgentTeamDefinitionService` | `FileAgentTeamDefinitionProvider` for source-aware persistence | Stable public team update/read boundary | filesystem existence checks for app-owned local members |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| App-owned team requirement that agent members use `refScope: "application_owned"` | Conflicts with the unified team-local locality rule | `ApplicationOwnedTeamSource` + `ApplicationOwnedTeamIntegrityValidator` requiring `team_local` | `In This Change` | Hard rejection, no fallback |
| Canonicalization of app-team member agent refs into application-owned agent ids during parse/write | Team-local members should persist local ids relative to the team folder | launch-boundary canonicalization via `buildTeamLocalAgentDefinitionId(teamDefinitionId, localAgentId)` | `In This Change` | Applies to parse/write + launch collection |
| `AgentTeamDefinitionService.assertApplicationOwnedMembership(...)` as the app-owned update validator | Lacks owning team source-path context under the new semantics | `FileAgentTeamDefinitionProvider.update(...)` + `ApplicationOwnedTeamIntegrityValidator` | `In This Change` | Service keeps generic team validation only |
| UI path that writes canonical library `item.id` directly into persisted `node.ref` for app-owned teams | Persists the wrong identity shape | `useAgentTeamDefinitionFormState` localizer writing `persistedRef` | `In This Change` | Applies to add flow and submit flow |
| Sample app top-level `applications/<app>/agents/*` folders that only hold team-private agents | Violates locality and teaches the old model | `applications/<app>/agent-teams/<team>/agents/*` | `In This Change` | Brief Studio + Socratic Math Teacher |
| Durable docs/tests that describe app-team member agents as application-owned siblings | Would reintroduce the wrong contract | updated docs/tests for team-local app members | `In This Change` | Clean-cut documentation change |

## Return Or Event Spine(s) (If Applicable)

`FileAgentDefinitionProvider -> GraphQL converter -> agentDefinitionStore -> AgentCard / AgentDetail / AgentEdit / useAgentTeamDefinitionFormState`

The return spine matters because the same agent definition must now carry `TEAM_LOCAL` ownership while still exposing application provenance when the owning team itself is application-owned.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `team-local agent discovery / source-resolution helper`
- Short arrow chain: `teamDefinitionId -> findTeamSourcePaths() -> teamDir/agents/<localAgentId> -> read agent files -> AgentDefinition provenance`
- Why this bounded local spine matters: the resolution logic is needed by single lookup, visible-list enumeration, update-path validation, and source-path discovery. Keeping it in one owned helper prevents separate callers from reimplementing shared-team versus app-owned-team path rules.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Team member config normalizer | `DS-001`, `DS-004` | `ApplicationOwnedTeamSource` | Normalize persisted member shapes while preserving local team-local ids and canonicalizing only nested app team refs | Keeps parse/write symmetry | Would blur parsing with bundle validation and runtime concerns |
| Source-aware app-owned team write validator | `DS-004` | `FileAgentTeamDefinitionProvider.update(...)` | Resolve local-member existence from `sourcePaths.teamDir` and same-app nested-team validity before write | Provider already owns team source paths and file write | Would force the service to bypass provider source resolution |
| Team-local source/path derivation | `DS-002`, `DS-004`, `DS-007` | `FileAgentDefinitionProvider` and provider-side write validation | Resolve shared-team and app-owned-team local agent paths + provenance | Avoids path duplication across lookup/update/list callers | Would turn top-level providers into path-construction blobs |
| Bundle-time local agent parse checks | `DS-001` | `FileApplicationBundleProvider` | Fail fast on missing/malformed app-team-local agents | Bundle import should not accept broken app team members | Would make later runtime/UI failures opaque |
| UI team-local id localizer | `DS-005` | `useAgentTeamDefinitionFormState` | Convert visible canonical team-local agent ids into persisted local refs and back | The form edits persisted `team-config` shape, so it must own the localizer | Would leak canonical ids into persisted `node.ref` |
| Provenance label formatting | `DS-006` | `autobyteus-web` agent surfaces | Render both owning team and owning application where relevant | Keeps UI wording consistent | Would spread string formatting across many components |
| Sample/package mirror refresh | `DS-001`, `DS-006` | sample application roots | Keep canonical app roots and importable mirrors aligned | Repo teaches the contract through shipped samples | Would leave docs/examples contradicting runtime semantics |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Resolve owning team source path from a team id | `agent-team-definition/providers/team-definition-source-paths.ts` | `Reuse` | Already distinguishes shared vs application-owned team source paths | N/A |
| Resolve/read/list team-local agents | `agent-definition/providers/team-local-agent-discovery.ts` | `Extend` | Already owns shared team-local discovery and provenance | N/A |
| Parse/write app-owned team config | `agent-team-definition/providers/application-owned-team-source.ts` | `Extend` | Already authoritative for app-owned team file contract | N/A |
| Same-app and same-team integrity validation | `agent-team-definition/utils/application-owned-team-integrity-validator.ts` | `Extend` | Current owner of app-owned team integrity rules | N/A |
| UI team-local id build utility | `autobyteus-web/utils/teamLocalAgentDefinitionId.ts` | `Extend` | Existing web utility already builds canonical team-local ids for launch prep | N/A |
| UI provenance formatting | `autobyteus-web/utils/definitionOwnership.ts` | `Extend` | Existing single formatting helper for app provenance | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-team-definition` | App-owned team parse/write semantics, source-aware update validation, and integrity rules | `DS-001`, `DS-004` | `ApplicationOwnedTeamSource`, `FileAgentTeamDefinitionProvider`, `AgentTeamDefinitionService` | `Extend` | Validation ownership is now explicit |
| `agent-definition` | Generic agent source resolution, visible-list discovery, update-path lookup | `DS-002`, `DS-007` | `FileAgentDefinitionProvider` | `Extend` | Must now also serve provider-side write validation |
| `application-bundles` | Bundle scan and fail-fast validation for local team members | `DS-001` | `FileApplicationBundleProvider` | `Extend` | Top-level app bundle contract owner |
| `application-sessions` + `agent-team-execution` | Canonical runtime member identity for local team refs | `DS-003` | `ApplicationSessionLaunchBuilder`, `TeamRunService` | `Extend` | Keep runtime id canonicalization aligned |
| `autobyteus-web stores/form surfaces` | Current-team agent filtering, canonical-to-local form localization, provenance rendering | `DS-005`, `DS-006` | `AgentDefinitionStore`, `useAgentTeamDefinitionFormState`, agent UI components | `Extend` | The conversion boundary is now explicit |
| `applications/*` sample bundles + durable docs/tests | Canonical examples and validation fixtures | `DS-001`, `DS-006` | repo documentation + regression suite | `Extend` | Must cut over in the same change |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-definition/providers/application-owned-team-source.ts` | `agent-team-definition` | parse/write boundary | App-owned team config semantics for local agent members | One owner for file contract symmetry | `Yes` |
| `autobyteus-server-ts/src/agent-team-definition/utils/application-owned-team-integrity-validator.ts` | `agent-team-definition` | integrity owner | Validate local team members and same-app nested teams for bundle/read/update contexts | One integrity subject | `Yes` |
| `autobyteus-server-ts/src/agent-team-definition/providers/file-agent-team-definition-provider.ts` | `agent-team-definition` | persistence boundary | Resolve app-owned team source paths and run source-aware update validation before write | Provider already owns source path + write | `Yes` |
| `autobyteus-server-ts/src/agent-team-definition/services/agent-team-definition-service.ts` | `agent-team-definition` | service boundary | Generic team invariants and update orchestration only | Keeps service above filesystem/source-path concerns | `No` |
| `autobyteus-server-ts/src/agent-definition/providers/team-local-agent-discovery.ts` | `agent-definition` | local-agent resolver | Shared + app-owned team-local agent read/list helpers | One owner for team-local source resolution | `Yes` |
| `autobyteus-web/utils/teamLocalAgentDefinitionId.ts` | `autobyteus-web` | canonical/local id utility | Build and parse team-local ids for launch and form localization | Existing reuse point for one identity contract | `Yes` |
| `autobyteus-web/stores/agentDefinitionStore.ts` | `autobyteus-web` | query/cache owner | Expose current-team team-local definitions by `ownerTeamId` | Generic store helper, still canonical | `No` |
| `autobyteus-web/components/agentTeams/form/useAgentTeamDefinitionFormState.ts` | `autobyteus-web` | form-state owner | Map visible canonical definitions into form library items with persisted local refs and write them into nodes | This is the raw-team-config editing boundary | `Yes` |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Shared-vs-app-owned team source resolution | `agent-team-definition/providers/team-definition-source-paths.ts` reused by team-local discovery and team provider update | `agent-team-definition` + `agent-definition` | One authoritative way to resolve a team definition source path | `Yes` | `Yes` | a second parallel path resolver |
| Application-owned team member shape translation | `application-owned-team-source.ts` + integrity validator contract | `agent-team-definition` | Keep file IO and member-shape validation separate but aligned | `Yes` | `Yes` | a hidden compatibility mapper |
| Web canonical/local team-local id conversion | `autobyteus-web/utils/teamLocalAgentDefinitionId.ts` | `autobyteus-web` | One authoritative build/parse contract for launch + form paths | `Yes` | `Yes` | duplicated regex parsing in components/stores |
| UI provenance label formatting | `autobyteus-web/utils/definitionOwnership.ts` | `autobyteus-web` | One place to combine team/application labels cleanly | `Yes` | `Yes` | component-local string concatenation |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| App-owned team agent member `ref` | `Yes` | `Yes` | `Low` | Define it as local team agent id only when `refScope = team_local`; no canonical app-agent ids allowed here |
| Team-local canonical agentDefinitionId | `Yes` | `Yes` | `Low` | Generate only at launch / generic agent lookup boundaries via `buildTeamLocalAgentDefinitionId(teamDefinitionId, localAgentId)` |
| UI form library item for app-owned teams | `Yes` | `Yes` | `Low` | Give it both `definitionId` and `persistedRef`; form writes only `persistedRef` |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-definition/providers/application-owned-team-source.ts` | `agent-team-definition` | authoritative parse/write boundary | Require `team_local` app-team agent refs, preserve local agent ids in domain/file mapping, canonicalize/localize nested app team refs | One file owns the app-team file contract | `Yes` |
| `autobyteus-server-ts/src/agent-team-definition/utils/application-owned-team-integrity-validator.ts` | `agent-team-definition` | integrity validator | Accept explicit `teamSourcePaths` + resolution closures and validate both local agent existence and same-app nested-team membership | One file owns app-team integrity rules across bundle/read/update contexts | `Yes` |
| `autobyteus-server-ts/src/agent-team-definition/providers/file-agent-team-definition-provider.ts` | `agent-team-definition` | authoritative persistence boundary | Resolve `sourcePaths`, run app-owned write-time validation, localize nested team refs, and write validated app-owned team files | Provider is the only boundary with concrete source-path context at update time | `Yes` |
| `autobyteus-server-ts/src/agent-team-definition/services/agent-team-definition-service.ts` | `agent-team-definition` | service boundary | Keep generic team-member/coordinator/default-config validation and delegate source-aware app-owned validation to provider.update | Prevents service from bypassing provider source resolution | `No` |
| `autobyteus-server-ts/src/agent-definition/providers/team-local-agent-discovery.ts` | `agent-definition` | team-local agent resolver | Resolve/read/list shared and application-team-local agents using authoritative team source paths and attach team + optional app provenance | One owner for all team-local discovery | `Yes` |
| `autobyteus-server-ts/src/agent-definition/providers/agent-definition-source-paths.ts` | `agent-definition` | path-selection boundary | Route team-local ids through the expanded resolver for updates and lookups | One file owns source-path dispatch | `Yes` |
| `autobyteus-server-ts/src/application-bundles/providers/file-application-bundle-provider.ts` | `application-bundles` | bundle scan/validation owner | Validate app-owned teams against local team folders and parse those local agents during bundle validation | Existing bundle owner remains authoritative | `Yes` |
| `autobyteus-server-ts/src/application-sessions/services/application-session-launch-builder.ts` | `application-sessions` | app launch leaf-member owner | Canonicalize persisted local refs during app launch prep the same way `TeamRunService` already does | Keep launch prep explicit and consistent | `Yes` |
| `autobyteus-web/utils/teamLocalAgentDefinitionId.ts` | `autobyteus-web` | identity utility | Export both build and parse helpers for team-local ids | One canonical UI identity helper | `Yes` |
| `autobyteus-web/stores/agentDefinitionStore.ts` | `autobyteus-web` | agent-definition query/cache owner | Add `getTeamLocalAgentDefinitionsByOwnerTeamId(ownerTeamId)`; keep store output canonical | Store remains generic, not form-specific | `No` |
| `autobyteus-web/components/agentTeams/form/useAgentTeamDefinitionFormState.ts` | `autobyteus-web` | authoritative form-state localizer | Build app-owned-team library items `{ definitionId, persistedRef, ... }`, write `persistedRef` into nodes, and rebuild canonical id from local ref when looking up display names | This is the raw persisted team-config editing boundary | `Yes` |
| `autobyteus-web/components/agents/AgentCard.vue` + `AgentDetail.vue` + `AgentEdit.vue` + `autobyteus-web/utils/definitionOwnership.ts` | `autobyteus-web` | provenance presentation boundary | Render combined team + app provenance for TEAM_LOCAL definitions that also carry app provenance | Presentation and label logic stay centralized | `Yes` |
| `applications/brief-studio/**`, `applications/socratic-math-teacher/**`, related docs/tests | samples/docs/tests | durable contract examples | Move team-private agents under team folders and update fixtures/assertions | Repo examples and regression suite must match the target contract | `No` |

## Ownership Boundaries

Authority changes hands at five key boundaries:

1. **Bundle contract boundary**: `FileApplicationBundleProvider` owns what counts as a valid application bundle and validates local team member files before the bundle enters the catalog.
2. **Team file contract boundary**: `ApplicationOwnedTeamSource` owns how app-owned team files are read/written; callers must not infer old semantics from raw JSON.
3. **App-owned team update boundary**: `FileAgentTeamDefinitionProvider.update(...)` owns source-aware validation because it resolves the concrete owning team `sourcePaths`. `AgentTeamDefinitionService` must not duplicate that source-path logic.
4. **Generic agent-definition boundary**: `FileAgentDefinitionProvider` owns how any canonical agent id resolves to files and provenance; callers above it must not reconstruct team-local source paths.
5. **UI persisted-ref localizer boundary**: `useAgentTeamDefinitionFormState` owns conversion between visible canonical team-local ids and persisted local `nodes[].ref` values for app-owned team editing.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `FileApplicationBundleProvider` | local team-member parse checks, same-app nested-team validation | `ApplicationBundleService`, package validation flows | separate callers manually scanning `applications/<app>/agent-teams/*/agents/*` | extend provider helpers, not callers |
| `ApplicationOwnedTeamSource` | app-team member normalization/localization | `FileApplicationBundleProvider`, `FileAgentTeamDefinitionProvider` | callers manually rewriting app-team member refs | strengthening source helper API |
| `FileAgentTeamDefinitionProvider.update(...)` | `findTeamSourcePaths(...)`, source-aware local-member validation, validated write preparation | `AgentTeamDefinitionService` | service-level source path resolution or service-level local file reads | extending provider/update helper contracts |
| `FileAgentDefinitionProvider` | team-local source resolution and provenance attachment | `AgentDefinitionService`, GraphQL agent queries/mutations | UI/runtime code manually joining team paths | extending provider/discovery helper |
| `useAgentTeamDefinitionFormState` | team-local id parse/build localizer and persisted ref writes | `AgentTeamDefinitionForm.vue` | component/template logic writing canonical `item.id` directly into `node.ref` | strengthening form-state library item shape |

## Dependency Rules

- `application-bundles` may depend on `agent-team-definition` parse/integrity helpers, but not on UI/store code.
- `agent-definition` may reuse `team-definition-source-paths` to resolve owning team sources; it must not bypass `ApplicationBundleService` for application-owned team provenance.
- `AgentTeamDefinitionService` may depend on provider boundaries and generic team invariants, but must not inspect app-owned team local-agent files or resolve owning team source paths.
- `FileAgentTeamDefinitionProvider.update(...)` may depend on `ApplicationBundleService`, `team-definition-source-paths`, and `team-local-agent-discovery` because it owns source-aware persistence validation.
- `autobyteus-web` stores may expose canonical team-local definitions, but only `useAgentTeamDefinitionFormState` may convert those canonical ids into persisted local team member refs.
- No caller above `FileAgentDefinitionProvider` or `FileAgentTeamDefinitionProvider.update(...)` may directly inspect app-team local agent paths.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `readApplicationOwnedTeamDefinitionFromSource(...)` | app-owned team file contract | Parse persisted team members and return domain team definition | canonical app-owned team id + local team-member refs in file | Agent member refs stay local when `refScope = team_local` |
| `buildApplicationOwnedTeamWriteContent(...)` | app-owned team file contract | Serialize a validated domain team definition back to file shape | domain team definition with local team-local agent refs + canonical nested team ids | Must not emit `application_owned` agent members |
| `validateApplicationOwnedTeamIntegrity(...)` | app-owned team integrity | Validate app-owned team nodes using explicit source-aware closures | canonical team id + `teamSourcePaths` + `resolveLocalAgentRef(localId)` + `resolveNestedTeamRef(canonicalTeamId)` | Local agent ids stay local; nested team ids stay canonical in domain |
| `AgentTeamDefinitionService.updateDefinition(...)` | generic team update orchestration | Normalize generic team fields and delegate source-aware persistence validation to provider.update | canonical team id + raw update payload | Must not resolve `teamDir` itself |
| `FileAgentTeamDefinitionProvider.update(...)` | app-owned team persistence | Resolve source paths, validate local-member existence, localize nested team ids, write files | canonical team id + hydrated domain definition | This is the authoritative update-time validation boundary |
| `getById(agentId)` / `findAgentSourcePaths(agentId)` | generic agent definition | Resolve shared, team-local, or direct-app agent ids | shared id / `team-local:<teamDefinitionId>:<localAgentId>` / canonical application-owned agent id | One explicit dispatch boundary |
| `mapAgentDefinitionToLibraryItem(...)` in form state | app-owned team form library | Convert visible canonical definition into form library item with `persistedRef` | canonical team-local agent definition id | Writes local ref only |
| `addNodeFromLibrary(item)` / `buildSubmitNodes(nodes)` | app-owned team form state | Persist local team member refs in form nodes and emitted payload | `LibraryItem.persistedRef` / existing local `node.ref` | No canonical ids in submitted `nodes[].ref` |

Rule:
- Do not use one generic boundary when the subject or identity meaning differs.
- Split boundaries by subject or require an explicit compound identity shape.

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentTeamDefinitionService.updateDefinition(...)` | `Yes` | `Yes` | `Low` | Keep it above source-aware validation and remove app-owned membership source-map logic |
| `FileAgentTeamDefinitionProvider.update(...)` | `Yes` | `Yes` | `Low` | Pass explicit `sourcePaths` and validation closures into the integrity owner |
| `validateApplicationOwnedTeamIntegrity(...)` | `Yes` | `Yes` | `Low` | Accept explicit local-agent and nested-team resolution closures |
| `mapAgentDefinitionToLibraryItem(...)` / `addNodeFromLibrary(...)` | `Yes` | `Yes` | `Low` | Give library items both canonical `definitionId` and persisted `persistedRef` |
| `getById(agentId)` dispatch in `FileAgentDefinitionProvider` | `Yes` | `Yes` | `Medium` | Keep explicit parse order: team-local id -> direct app-owned id -> shared id |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| App-owned team integrity validator | `application-owned-team-integrity-validator` | `Yes` | `Low` | Keep same owner; update input contract |
| UI canonical/local id utility | `teamLocalAgentDefinitionId` | `Yes` | `Low` | Extend existing file with parse helper |
| Form library item localizer | `mapAgentDefinitionToLibraryItem` (within form-state owner) | `Yes` | `Low` | Keep localized to form-state boundary, not generic store |

## Applied Patterns (If Any)

- `Adapter`: `ApplicationOwnedTeamSource` adapts persisted file content into domain definitions and back.
- `Registry/Lookup`: `ApplicationBundleService` and `team-definition-source-paths` provide authoritative source lookup for application-owned teams.
- `Factory-like identity builder/parser`: `teamLocalAgentDefinitionId` utilities remain the single canonical build/parse contract for local team-agent ids.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-definition/providers/application-owned-team-source.ts` | `File` | app-owned team parse/write boundary | Persisted app-team file contract | It already owns this contract | runtime launch logic |
| `autobyteus-server-ts/src/agent-team-definition/utils/application-owned-team-integrity-validator.ts` | `File` | integrity owner | Same-team local-member validation and same-app nested-team validation for bundle/read/update flows | Integrity rules stay centralized | unrelated UI concerns |
| `autobyteus-server-ts/src/agent-team-definition/providers/file-agent-team-definition-provider.ts` | `File` | persistence/update boundary | Resolve `sourcePaths` and perform source-aware app-owned team validation before write | Existing provider already owns `findTeamSourcePaths(...)` and file writes | generic UI filtering logic |
| `autobyteus-server-ts/src/agent-team-definition/services/agent-team-definition-service.ts` | `File` | service boundary | Generic team update semantics only | Prevents source-path bypass | local file existence checks |
| `autobyteus-server-ts/src/agent-definition/providers/team-local-agent-discovery.ts` | `File` | local-agent resolution owner | Shared/app-owned team-local agent read/list helpers + provenance | One readable place for team-local resolution | direct app-owned agent logic |
| `autobyteus-web/utils/teamLocalAgentDefinitionId.ts` | `File` | identity utility | Build and parse team-local ids | Already used by launch-prep UI helpers | component-specific state |
| `autobyteus-web/stores/agentDefinitionStore.ts` | `File` | UI query/cache owner | Expose owner-team filtered team-local definitions while keeping store outputs canonical | Store owns cached selection helpers | persisted-ref localizer logic |
| `autobyteus-web/components/agentTeams/form/useAgentTeamDefinitionFormState.ts` | `File` | authoritative form-state localizer | Convert canonical visible ids into local persisted refs for app-owned team editing | The form edits persisted `team-config` shape | generic store caching |
| `applications/brief-studio/agent-teams/brief-studio-team/agents/*` | `Folder` | sample application-owned team | Team-private sample agents | Canonical sample shape | unrelated app-root shared agents |
| `applications/socratic-math-teacher/agent-teams/socratic-math-team/agents/*` | `Folder` | sample application-owned team | Team-private sample agents | Canonical sample shape | unrelated app-root shared agents |

Rules:
- If the design has meaningful structural depth, usually reflect it in folders rather than flattening everything into one mixed directory.
- Do not place transport entrypoints, main-line domain/control nodes, persistence, adapters, and unrelated off-spine concerns in one flat folder when that hides ownership or structural depth.
- A compact layout is acceptable when it remains easy to read for the scope. If you keep it flatter, state why that is the clearer tradeoff.
- Folder boundaries should make ownership and structural depth easier to read, not hide them.
- Shared-layer, feature-oriented, runtime-oriented, and hybrid projections can all be valid when they make the intended ownership and flow easier to understand.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-definition/providers` | `Persistence-Provider` | `Yes` | `Low` | File contract and source-aware update logic already live here |
| `autobyteus-server-ts/src/agent-team-definition/utils` | `Off-Spine Concern` | `Yes` | `Low` | Integrity validation remains a true helper concern serving provider/bundle owners |
| `autobyteus-server-ts/src/agent-definition/providers` | `Persistence-Provider` | `Yes` | `Low` | Team-local source resolution belongs with generic agent source providers |
| `autobyteus-web/components/agentTeams/form` | `Off-Spine Concern` | `Yes` | `Low` | Form policy/localization stays decoupled from view markup |
| `applications/<app>/agent-teams/<team>/agents` | `Main-Line Domain-Control` | `Yes` | `Low` | This folder is the human-facing locality improvement at the center of the refactor |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| App-owned team persisted config | `applications/brief-studio/agent-teams/brief-studio-team/team-config.json` member: `{ "memberName": "writer", "ref": "writer", "refType": "agent", "refScope": "team_local" }` with files under `.../brief-studio-team/agents/writer/` | `{ "memberName": "writer", "ref": "writer", "refType": "agent", "refScope": "application_owned" }` with files under `applications/brief-studio/agents/writer/` | Shows the new persisted contract directly |
| Runtime canonical id | `buildTeamLocalAgentDefinitionId("bundle-team__...", "writer")` | treating persisted `node.ref` as if it were already a globally unique definition id | Clarifies where canonicalization belongs |
| Update-time validation owner | `AgentTeamDefinitionService.updateDefinition(...) -> FileAgentTeamDefinitionProvider.update(...) -> findTeamSourcePaths(...) -> validateApplicationOwnedTeamIntegrity({ teamSourcePaths, resolveLocalAgentRef(localId), resolveNestedTeamRef(canonicalTeamId) }) -> buildApplicationOwnedTeamWriteContent(...) -> writeJsonFile(...)` | `AgentTeamDefinitionService.updateDefinition(...)` directly reading `applications/<app>/agent-teams/<team>/agents/*` or validating against app-owned agent source maps only | Makes the authoritative boundary and required inputs explicit |
| UI canonical-to-local conversion | visible agent definition from store: `{ id: "team-local:bundle-team__abc:writer", ownerTeamId: "bundle-team__abc", ownershipScope: "TEAM_LOCAL" }` -> form library item: `{ definitionId: "team-local:bundle-team__abc:writer", persistedRef: "writer", refType: "AGENT", refScope: "TEAM_LOCAL" }` -> persisted node: `{ memberName: "writer", refType: "AGENT", refScope: "TEAM_LOCAL", ref: "writer" }` | `addNodeFromLibrary(item)` writing `node.ref = item.id` for an app-owned team | Shows the exact canonical-visible-id vs persisted-local-ref boundary |
| UI display lookup from persisted local ref | `getReferenceName(node)` for current team `bundle-team__abc` rebuilds `buildTeamLocalAgentDefinitionId("bundle-team__abc", node.ref)` before looking up the visible definition name | assuming persisted local `node.ref` can be looked up directly in the generic agent store | Keeps existing persisted file shape and generic store shape aligned |

Use this section when the design would otherwise remain too abstract.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Accept both `application_owned` and `team_local` for app-owned team agent members | Would reduce immediate fixture churn | `Rejected` | Parser/validator reject old shape; samples/tests/docs all update together |
| Fallback source resolution from `applications/<app>/agents/<agent>` when app-team local agent is missing | Would make old packages still launch | `Rejected` | Bundle validation and provider update fail fast; no runtime fallback |
| Keep service-level app-owned membership validation by application-owned agent-source maps | Would avoid provider update changes | `Rejected` | `FileAgentTeamDefinitionProvider.update(...)` becomes the explicit source-aware validation boundary |
| Keep UI library items as canonical ids only and localize during backend submit | Would avoid form-state change | `Rejected` | Form-state localizer writes local refs into `nodes[]` immediately and submits them unchanged |

Hard block:
- Any design that depends on backward-compatibility wrappers, dual-path behavior, or retained legacy flow for in-scope replaced behavior fails review.

## Derived Layering (If Useful)

- **Top-level bundle/application layer**: `application-bundles`
- **Definition contract + persistence layer**: `agent-team-definition`, `agent-definition`
- **Runtime launch layer**: `application-sessions`, `agent-team-execution`
- **Presentation + form-localization layer**: `autobyteus-web` stores/components/utils
- **Sample/fixture layer**: `applications/*`, docs, tests

This layering is derived from the ownership boundaries above; it is not the primary design driver.

## Migration / Refactor Sequence

1. Lock the semantics in docs/artifacts: app-team member agents are `team_local`, no fallback support.
2. Refactor `application-owned-team-source` and the integrity validator so persisted app-team agent refs are local `team_local` ids and validation accepts explicit source-aware closures.
3. Move application-owned team source-aware validation out of `AgentTeamDefinitionService.assertApplicationOwnedMembership(...)` and into `FileAgentTeamDefinitionProvider.update(...)`; remove the service-level app bundle source-map validation path.
4. Extend team-local agent discovery/source-path resolution to support canonical team-local ids whose owning team is application-owned.
5. Update `FileApplicationBundleProvider` to validate app-team-local agents under team folders.
6. Update `ApplicationSessionLaunchBuilder` to canonicalize `team_local` refs the same way `TeamRunService` already does.
7. Extend `autobyteus-web/utils/teamLocalAgentDefinitionId.ts` with parse support, add `AgentDefinitionStore.getTeamLocalAgentDefinitionsByOwnerTeamId(...)`, and refactor `useAgentTeamDefinitionFormState` so app-owned team library items carry `persistedRef` and write local refs into nodes.
8. Update provenance rendering in agent UI surfaces.
9. Move sample app team-private agents into team folders, refresh importable package mirrors, and update READMEs.
10. Update unit/integration/e2e tests and durable docs; delete assertions/fixtures that still expect app-owned team members to be application-owned siblings.
11. Run targeted validations; no cleanup step should restore legacy behavior because the legacy behavior is removed in-step.

## Key Tradeoffs

- **Pros**: semantic consistency, better author locality, clearer update-time authority, explicit UI identity handling, fewer hidden app-root dependencies for team-private agents.
- **Cost**: broader coordinated refactor across validation, discovery, runtime launch prep, UI form state, samples, and tests.
- **Chosen tradeoff**: accept the coordinated cutover because keeping both models or leaving the boundaries implicit would permanently preserve a confusing dual semantic.

## Risks

- Canonical team-local ids for application-owned teams must stay globally unique and consistently derived from the canonical team id.
- UI surfaces that currently branch on `TEAM_LOCAL` vs `APPLICATION_OWNED` may need careful provenance updates so app-team-local agents do not lose application context.
- Hidden tests or helper fixtures may still assume application-owned team members live under app-root `agents/`.

## Guidance For Implementation

- Treat persisted team-local refs as **local ids**, not canonical ids.
- Reuse existing authoritative boundaries (`team-definition-source-paths`, `FileAgentDefinitionProvider`, `FileAgentTeamDefinitionProvider`, `teamLocalAgentDefinitionId` utility) instead of adding parallel helpers.
- Keep `AgentTeamDefinitionService` above source-path concerns; let the provider own concrete source-aware validation.
- Keep direct application-root agents untouched unless they are only team-private sample definitions.
- In the web form path, localize canonical visible ids to local refs as soon as a library item is added; do not delay conversion to submit time.
- Remove legacy assertions and fixtures in the same change; do not leave dead compatibility branches behind.

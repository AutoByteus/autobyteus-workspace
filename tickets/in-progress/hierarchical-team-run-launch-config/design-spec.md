# Hierarchical TeamRun Launch Configuration — Design Spec

## Current-State Read

The current TeamRun launch path has a real nested topology but flattens configuration before that topology becomes runtime state. The web draft in `autobyteus-web/types/agent/TeamRunConfig.ts` stores one root configuration plus a flat Agent override map. `TeamRunConfigForm.vue` renders the root controls once, `MemberOverrideTree.vue` treats nested Teams as display groups, and `teamRunMemberConfigBuilder.ts` resolves every Agent directly from the root. The immutable draft/in-flight boundary in `teamRunConfigStore.ts` is healthy and must remain the launch-state owner, but its subject model and one global workspace-loading slot are too narrow.

The server receives only `memberConfigs[]`. `TeamDefinitionTopologyPlanner` validates and compiles complete Agent settings, but Team nodes in `team-run-config.ts` and configured Team nodes in `team-run-execution-tree.ts` contain no launch default. Restore therefore cannot recover a containing TeamRun default. The strict V1 file schema and Team stream DTO both omit it. The web read-only factory compensates only for the root by treating the root coordinator as a synthetic baseline; it cannot truthfully represent nested Team defaults.

Root-only mobile, application, external-channel, and programmatic launch paths are supported production paths. Their authoring stays root-only, but their backend projection must still produce a complete effective default for every configured Team. Application exact-Agent overrides remain supported.

Existing execution-tree V1 files are durable, exact-key-validated user history. Representative fixtures prove that every configured Team has a direct coordinator Agent with a complete persisted launch snapshot. The approved historical rule is therefore a deterministic V1-to-V2 transform: copy each Team's direct coordinator launch snapshot into that Team's default. The migration must follow `autobyteus-server-ts/docs/design/production_data_migration_conventions.md` and the simplicity patterns in the latest two migration designs recorded in `investigation-notes.md`.

Detailed current paths and exact sources are authoritative in `investigation-notes.md`, BEH-001–BEH-009.

## Intended Change

Introduce TeamRun scope as a first-class launch-configuration subject across web authoring, backend planning, runtime state, persistence, transport, restore, and read-only presentation.

Editable web state will hold:

1. one complete root configuration;
2. partial nested-Team overrides keyed by canonical Team address; and
3. partial exact-Agent overrides keyed by canonical Agent address.

One pure hierarchy owner will validate subject kinds, reconcile topology, and resolve root -> nearest Team -> exact Agent into complete snapshots. The web sends one complete Team record for `/` and every nested Team plus one complete Agent record for every leaf. The backend independently validates exact address/kind/coverage against the resolved definition graph before allocating run identities. It stores the complete Team default on every configured Team runtime/persistence node and continues storing complete Agent launch snapshots.

Root-only callers will use a service entrypoint that expands the root configuration across every Team and, when no explicit complete Agent list is supplied, across every Agent. No new run may infer a Team default from a coordinator. Coordinator inference exists only in the registered V1-to-V2 migration.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | R-001–R-004; AC-001–AC-003 | Select a Team definition for a new workspace run | Investigation BEH-001 | Root remains the first complete scope; root-only flow stays compact | Definition default -> draft store -> hierarchy view -> form; DS-001 |
| BEH-002 | User | R-005–R-010; AC-004–AC-008 | Expand nested Team configuration | Investigation BEH-002 | Every nested Team has inherited/customized state, summary, editor, and reset | Recursive Team tree -> scope view/editor -> address-specific store command; DS-001 |
| BEH-003 | Contract | R-011–R-015; AC-009–AC-012 | Resolve a launch candidate | Investigation BEH-003 | Resolve root, then each nearest Team override, then exact Agent override; preserve coherent model config | Launch intent + canonical topology -> hierarchy resolver -> complete scope/Agent snapshots; DS-002 |
| BEH-004 | Contract | R-016–R-020; AC-013–AC-015 | Edit, repair, lock, or admit a draft | Investigation BEH-004 | Keep immutable drafts; add typed Team subjects, address-keyed loading, topology reconciliation, and visible repair | Store commands -> frozen draft -> reconcile -> readiness -> exact-snapshot admission; DS-001, DS-002 |
| BEH-005 | System | R-021–R-026; AC-016–AC-019 | Create, persist, and restore a TeamRun | Investigation BEH-005 | Validate complete Team and Agent coverage; retain Team defaults in runtime and V2 persistence | GraphQL/service -> planner -> runtime -> V2 tree/store -> restore; DS-003, DS-004 |
| BEH-006 | Contract | R-027; AC-020 | Seed a new draft from a selected root definition | Investigation BEH-006 | Preserve root-only definition default seeding; embedded definition defaults do not activate | Root definition -> `buildTeamRunTemplate`; DS-001 |
| BEH-007 | User / Operational | R-028–R-031, R-037; AC-021–AC-023, AC-030 | Upgrade or inspect a stored TeamRun | Investigation BEH-007 | Migrate each V1 Team default from its direct coordinator, then present stored V2 defaults without runtime inference | Startup migration -> V2-only catalog/projector -> read-only configuration view; DS-005, DS-006 |
| BEH-008 | System / Contract | R-032–R-036; AC-024–AC-029 | Launch through mobile, application, external channel, or backend preset | Investigation BEH-008 | Preserve root-only authoring and application Agent overrides; centrally expand complete Team policy | Root preset/application complete Agent records -> root-config service entry -> common planner; DS-007 |
| BEH-009 | User | R-038–R-041; AC-031–AC-034 | Load, recover, lock, or navigate hierarchical controls | Investigation BEH-009 | Scope loading/error/disabled/accessibility state by canonical Team address and retain current recovery semantics | Address-scoped store state -> reusable Team editor/tree -> readiness/banner; DS-001, DS-002 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `tickets/in-progress/hierarchical-team-run-launch-config/hierarchical-launch-configuration-behavior.md` | Canonical hierarchy, UI states, field participation, surface semantics, and migration behavior | R-001–R-041; AC-001–AC-034 | Governs user-visible and cross-surface behavior implemented by the owners below | Approved by user on 2026-08-24 |
| `tickets/in-progress/hierarchical-team-run-launch-config/team-execution-tree-v2-contract.md` | Exact TypeScript structure, materialization rules, realistic V2 JSON, and V1 conversion table | R-021–R-031, R-035, R-037; AC-016–AC-023, AC-030 | Governs the concrete execution-tree schema and examples used by persistence, migration, transport, and restore work | Approved by user on 2026-08-24 |

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change` plus prerequisite `Feature`
- Current design issue found: `Yes`
- Root cause classification: `Shared Structure Looseness` and `Boundary Or Ownership Issue`
- Refactor needed now: `Yes`
- Evidence: topology already models Team and Agent subjects, but launch intent and payload flatten Team scopes away; frontend resolution is split across form, store pruning, readiness, and a root-only member builder; backend planning has no Team policy input; persistence/history synthesize missing meaning from a coordinator.
- Design response: add one semantically tight launch-intent model, one pure frontend hierarchy resolver, one complete backend topology contract, one shared complete launch-configuration value type, and one V2 persistence/transport shape. Root-only policy expansion belongs behind `TeamRunService`, not in each caller.
- Refactor rationale: adding Team fields only in the UI or execution tree would leave conflicting resolution owners and would not satisfy restore, root-only callers, or Dynamic AgentTeam's containing-Team default prerequisite. The obsolete root-only member builder and coordinator-derived runtime projection must be removed now.
- Intentional deferrals and residual risk: live topology mutation and Dynamic AgentTeam consumption are separate tickets. This change stores the required nearest-Team defaults but does not expose runtime mutation APIs. Actual repository-resident coverage choices remain with `api_e2e_engineer` after implementation/code review.

## Terminology

- **Root configuration:** the complete TeamRun scope at canonical address `/`.
- **Team override:** partial editable intent for one nested Team placement; absence means inherit its parent.
- **Effective Team configuration:** the complete snapshot after merging the parent effective configuration with the Team override.
- **Agent override:** partial intent for exactly one Agent placement; it applies after the containing Team's effective configuration.
- **Launch hierarchy:** the resolved definition topology paired with complete Team and Agent launch configurations.
- **Configuration view:** a derived presentation model containing complete effective scope/Agent values and explicit/inherited metadata. It is not editable intent.

## Design Reading Order

Read this spec in the template order. The main structural decisions are: migration/current-only boundary, DS-001/DS-002 frontend ownership, DS-003/DS-004 backend/persistence ownership, and DS-007 root-only expansion.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove the root-only `teamRunMemberConfigBuilder.ts` resolution path.
- Remove `MemberOverrideTree.vue` as a display-only Team grouping and replace it with a tree that treats Team and Agent subjects explicitly.
- Remove public caller composition through `buildMemberConfigsFromLaunchPreset`; root-only callers use one service entrypoint.
- Remove coordinator-based baseline inference from `teamExecutionContextFactory.ts`.
- Make normal execution-tree domain/schema/store/catalog/projector code V2-only; move exact V1 types, validators, builder/mutator support used by retained historical migrations into migration-owned files.
- Rename V1-labeled current catalog/test names to current-schema names.
- Do not add dual V1/V2 readers, optional Team defaults, compatibility GraphQL fields, or a new-run coordinator fallback.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: one exact `team_run_execution_tree.json` V1 per durable root TeamRun package under `AgentMemoryLayout`; five nested and task-bearing fixtures were inspected; installation volume is unbounded.
- Relevant code-model, serialization, semantic, or physical-store change: configured root/nested Team nodes gain one required `defaultLaunchConfiguration`; V2 stores root address `/` explicitly; file and wire schemas move from version 1 to 2; V2 uses current `RuntimeKind` values instead of V1's uppercase persistence labels. The exact proposed shape is in `team-execution-tree-v2-contract.md`.
- Normal reader/writer behavior and representative evidence: V1 exact-key validation rejects missing/extra fields; the V1 store/catalog and stream DTO admit only version 1; restore builds runtime state from the stored tree. See investigation source log.
- Required semantics and invariants under direct use: every configured Team must have a complete `AgentLaunchConfiguration` default, every configured Agent retains its complete `AgentLaunchConfiguration`, root address is exactly `/`, all topology/identity/task/handoff/application facts remain semantically unchanged, and no current-definition lookup participates in history.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: history is durable user data and cannot be discarded. One normal migration writer and stable filesystem attempt are governing assumptions. Diagnostics must not expose file contents or grow per TeamRun.
- Decision: `Migration Required`
- Decision rationale: direct V1 use cannot supply the required Team meaning and exact validation prevents tolerant expansion. Discard/rebuild would lose user history. The approved coordinator copy is deterministic and additive. One startup app-data migration, existing atomic file writer, existing ledger, and existing manual Retry give the required safety with less I/O/state than a backup/journal protocol.
- Acceptance criteria or design constraints supported: R-023–R-031, R-037; AC-018–AC-023, AC-030.

### Migration Plan (Only When Decision Is `Migration Required`)

- Current canonical schema / version: `TeamRunExecutionTreeFileV2`, `schemaVersion: 2`.
- Older persisted schema version(s) that require transformation: exact released `TeamRunExecutionTreeFileV1`, `schemaVersion: 1`.
- Why direct use and discard/rebuild are insufficient: V1 omits Team defaults and is exact; history is non-disposable.
- Migration trigger: registered required startup app-data migration, ID `20260824_team_run_execution_tree_v2`, `executionPolicy: "ANYTIME"` so the existing Settings Retry remains truthful.
- Migration owner and file / subsystem location: one cohesive `TeamRunExecutionTreeV2AppDataMigration` in `autobyteus-server-ts/src/app-data-migrations/migrations/team-run-execution-tree-v2-app-data-migration.ts`.
- Normal business/runtime path that remains current-schema-only: `team-run-execution-tree.ts`, current schema/store, package catalog/loader, manager restore, projector, contracts, and web hydration accept V2 only.
- Historical-shape types or decoders confined to migration-owned code: exact V1 types/validator/store plus V1 builder/mutator/package validation needed by the retained V1 promotion live under `.../migrations/team-run-execution-tree-v1/`; the V2 migration imports that boundary only.
- Completion marker / version ledger: existing `app_data_migration_records` entry for the migration ID; each file also declares schema version 2.
- Restart-safety or idempotency strategy: classify each file on every attempt. Valid V1 transforms once; valid V2 skips. Pre-rename failure leaves V1; after rename the migration rereads the canonical path and accepts only exact V2. One ordinary rerun covers incomplete attempts.
- Validation before current runtime proceeds: exact V1 validation before transformation, exact V2 validation before write, reread/exact V2 validation after the writer result, then V2-only package catalog admission. A failed root remains excluded; unrelated roots and application capabilities continue.
- Backup / rollback / quarantine / operator-recovery strategy: no bespoke backup, rollback, quarantine, journal, or `fsync` protocol. The transform preserves every V1 fact semantically, adds deterministic Team defaults/root address, and converts the closed legacy runtime labels to their current enum equivalents; the existing writer performs synced temp write plus atomic rename. A pre-rename failure preserves V1. `renamed_finalization_indeterminate` is resolved by rereading: valid V2 is `MIGRATED_WITH_FINALIZATION_WARNING`; otherwise `FAILED_CURRENT_VALIDATION`. Existing runner ledger and manual Retry own recovery.
- Concurrent old/new application access risk and cutover / maintenance / deployment-sequencing decision: assume one startup writer and no concurrent old runtime. Register after `TEAM_RUN_EXECUTION_TREE_V1_MIGRATION_ID` and `TEAM_AGENT_MEMORY_LAYOUT_MIGRATION_ID`, before later normal TeamRun consumers/migrations. The memory-layout migration therefore finishes while V1 is still its migration-owned input.
- Historical migration retention decision: retain the original V1 promotion, memory-layout repair, migration-owned V1 decoder, and new V2 migration for direct and skip-version upgrades. They are never invoked by normal runtime.

| Migration Step | Source Shape / Version | Target Shape / Version | Transformation Owner | Validation | Failure / Recovery Behavior |
| --- | --- | --- | --- | --- | --- |
| 1. Enumerate | Team root directories from `AgentMemoryLayout` | Sorted candidate paths | V2 migration private loop | Directory entry is a real directory; tree path classified by `lstat` | Unsupported entries receive bounded failure; missing tree is skipped |
| 2. Classify | Missing, exact V1, exact V2, invalid/unsupported JSON | Closed disposition | V2 migration + migration-owned V1 validator + current V2 validator | Version-specific exact schema/invariants | Preserve invalid/unsupported file; record failure |
| 3. Transform | Valid V1 configured root/nested Teams with legacy runtime labels | In-memory V2 candidate using current `RuntimeKind` and explicit root `/` | V2 migration private recursive function | Decode every Agent's legacy runtime label; set root address `/`; for each Team, find exactly one direct Agent whose address equals `coordinatorAddress` and copy its decoded complete `launchConfiguration`; preserve every other fact semantically | Unsupported runtime or missing/ambiguous coordinator is failure before mutation |
| 4. Validate target | In-memory V2 | Exact validated V2 | Current V2 validator | Schema, topology, IDs, tasks, handoffs, defaults | No mutation on validation failure |
| 5. Commit | Validated V2 payload | Canonical JSON path | Existing `TeamRunFileCommitWriter` | Writer outcome plus canonical reread | Pre-rename error leaves V1 and fails; post-rename uncertainty is classified from reread |
| 6. Report | Closed dispositions | Existing runner record/log | V2 migration | Exact counts and at most five sorted relative-path examples per reason | Any missing required V2 target => `FAILED`; only independently valid V2 plus finalization warning => `SUCCEEDED_WITH_WARNINGS`; otherwise `SUCCEEDED` |

The migration deliberately does **not** introduce a generic migration planner, transform registry, backup folder, journal, lifecycle state machine, or per-root unbounded detail list. This follows the two latest migration designs: a small closed file loop like `TeamAgentMemoryLayoutAppDataMigration`, and one durable old-to-current boundary like the summary-log SQLite migration.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-002, BEH-004, BEH-006, BEH-009 | Root definition selection or scope edit | Frozen launch intent plus derived view | `teamRunConfigStore` | Owns user intent, loading/error state, repair notice, and lock semantics |
| DS-002 | Bounded Local | BEH-003, BEH-004, BEH-009 | Launch intent + definition member tree | Complete resolved hierarchy/readiness/payload facts | `teamRunLaunchHierarchy.ts` | One precedence and subject-validation authority prevents UI/caller drift |
| DS-003 | Primary End-to-End | BEH-005 | Complete create command | Immutable runtime `TeamRunConfig` | `TeamRunService` -> `TeamDefinitionTopologyPlanner` | Validates topology/config coverage before identity allocation |
| DS-004 | Primary End-to-End | BEH-005 | Runtime TeamRun | V2 file and restored identical runtime config | Execution-tree builder/store + manager | Makes Team defaults durable and restart-safe |
| DS-005 | Primary End-to-End | BEH-007 | Startup/Settings Retry on V1 data | Exact V2 or capability-scoped failure | `TeamRunExecutionTreeV2AppDataMigration` | Establishes one current schema without runtime fallback |
| DS-006 | Return-Event | BEH-007 | V2 runtime/history tree | Read-only hierarchical configuration view | Stream projector -> web hydration/context factory | Presents stored truth rather than coordinator inference |
| DS-007 | Primary End-to-End | BEH-008 | Root-only preset/application launch | Same complete planner input as workspace | `TeamRunService.createTeamRunFromRootConfig` | Preserves compact surfaces while centralizing semantics |

## Primary Execution Spine(s)

- **DS-001:** `selected root definition -> build root intent -> immutable draft store -> hierarchy configuration view -> TeamRunConfigForm / TeamMemberConfigTree -> typed edit -> replacement frozen draft`.
- **DS-003:** `GraphQL complete teamConfigs/memberConfigs -> TeamRunService normalization/workspace activation -> TeamDefinitionTopologyPlanner validation -> identity allocation/compile -> AgentTeamRunManager`.
- **DS-004:** `runtime TeamRunConfig -> execution-tree builder -> V2 store/catalog -> restore -> runtime TeamRunConfig`.
- **DS-005:** `startup runner or Settings Retry -> V2 migration -> V1 validate/transform -> V2 validate/atomic replace/reread -> ledger -> V2-only catalog`.
- **DS-007:** `mobile/application/external root config (+ application complete Agent configs) -> TeamRunService root expansion -> common planner -> runtime`.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The store retains only explicit root/team/Agent intent. Every edit replaces the exact frozen draft; the UI consumes a derived view and never becomes the inheritance owner. | Draft, root scope, Team override, Agent override, configuration view | Draft store | catalog loading, workspace selection, localization, accessibility |
| DS-002 | The pure resolver walks the canonical definition tree once, merges Team overrides recursively, then Agent overrides, and emits complete snapshots and address/kind issues. | Canonical topology, effective Team, resolved Agent | Hierarchy resolver | model/config coherence, stale-address repair |
| DS-003 | The server normalizes complete values, activates unique workspace roots, validates exact Team/Agent maps against the graph, then allocates IDs and builds configured nodes. | Create command, graph, plan, runtime config | Service/planner | GraphQL/application adapters, model validation |
| DS-004 | The execution-tree builder copies configured Team defaults and Agent snapshots to V2; restore maps both back without definition defaults or frontend state. | Runtime config, V2 tree, package | Builder/store/manager | catalog/history index, file writer |
| DS-005 | One migration-owned loop classifies each tree, derives every Team default from its direct coordinator, validates V2, commits atomically, rereads, and returns bounded status. | V1 tree, V2 candidate, migration result | V2 migration | runner ledger, manual Retry, V1 promotion sequencing |
| DS-006 | The server emits V2 Team defaults; hydration resolves/deduplicates all referenced workspaces; the factory creates a complete read-only presentation by comparing stored children with stored parents. | V2 DTO, workspace metadata, configuration view | Projector/hydration/factory | GraphQL generated types, stream schema |
| DS-007 | Root-only callers submit one root config; the service expands it across all Team placements and either all Agents or combines it with an exact complete Agent list, then enters DS-003. | Root config, optional complete Agent configs, full plan input | TeamRunService | SDK contracts, external binding behavior |

## Spine Actors / Main-Line Nodes

- `teamRunConfigStore`: editable draft lifecycle and address-scoped transient UI state.
- `teamRunLaunchHierarchy.ts`: topology reconciliation, effective resolution, and derived presentation.
- `TeamRunConfigForm.vue` / `TeamMemberConfigTree.vue`: presentation and typed user commands only.
- `TeamRunService`: public creation boundaries, value normalization, workspace activation, root-only expansion.
- `TeamDefinitionTopologyPlanner`: definition graph authority, exact coverage/kind validation, identity allocation, runtime compilation.
- `TeamRunConfig` runtime aggregate: immutable current launch hierarchy using the canonical `AgentLaunchConfiguration` value.
- execution-tree builder/schema/store/catalog: current V2 persistence authority.
- `TeamRunExecutionTreeV2AppDataMigration`: historical V1 transformation owner.
- stream projector + web hydration/context factory: current read-only return path.

## Ownership Map

- The web store owns draft identity, mutability, edit sequencing, in-flight exact-snapshot invariants, repair notice, and per-Team workspace loading state. It does not own recursive inheritance calculations.
- The web hierarchy resolver owns canonical subject validation, parent/nearest-Team precedence, Agent precedence, semantic override normalization, and complete resolved projection. It has no Pinia, Vue, GraphQL, or network dependency.
- UI components own disclosure, labels, interaction, accessibility, and emitting address-specific commands. They must not recursively merge values.
- `TeamRunService` owns public create workflows, input normalization, unique workspace activation, and root-only policy expansion. It does not infer policy from Agents.
- The planner owns definition graph truth, exact Team/Agent coverage, address/kind validation, allocation ordering, and immutable runtime compilation.
- Runtime/persistence owners store complete values only; partial override intent never crosses into runtime domain.
- The V2 migration exclusively owns coordinator-based historical reconstruction and exact V1 interpretation.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| GraphQL `createAgentTeamRun` | `TeamRunService` / planner | Transport decode and result envelope | inheritance, workspace activation, topology validation |
| `TeamRunConfigForm.vue` | store + hierarchy resolver | User presentation and event emission | mutable draft copy, recursive policy |
| application/external launch services | `TeamRunService.createTeamRunFromRootConfig` | Adapt surface contracts/binding identity | graph traversal or coordinator inference |
| Team stream projector | V2 execution tree | DTO serialization | fallback reconstruction |
| migration runner | V2 migration definition | scheduling, ledger, recovery action | transform-specific semantics |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-web/utils/teamRunMemberConfigBuilder.ts` | Encodes root-only merge | `teamRunLaunchHierarchy.ts` resolved Agents | In This Change | Delete tests or retarget them to hierarchy resolver |
| `MemberOverrideTree.vue` | Treats Team as display-only | `TeamMemberConfigTree.vue` | In This Change | No wrapper alias |
| Root-global props on recursive Agent tree | Wrong baseline below nested Team | per-node resolved containing-Team view | In This Change | Agent item receives containing Team baseline |
| Public `TeamRunService.buildMemberConfigsFromLaunchPreset` | Forces callers to compose internal steps | `createTeamRunFromRootConfig` | In This Change | Update all callers and tests |
| Coordinator baseline in web context factory | Fabricates normal runtime meaning | stored V2 Team defaults | In This Change | Coordinator lookup remains only for initial focus |
| `TeamRunV1PackageCatalog` current naming/API | V1 ceases to be current runtime | `TeamRunPackageCatalog` V2-only | In This Change | Rename reset accessor/tests too |
| Current V1 types/schema/store imports inside historical V1 migration | Would couple historical migration to V2 runtime | migration-owned V1 types/validator/builder/mutator/store | In This Change | Retain only under migration folder |
| V1 stream DTO/schema version | Cannot expose Team defaults | one V2 DTO/schema | In This Change | Regenerate checked-in dist; no union |

## Return Or Event Spine(s) (If Applicable)

**DS-006:** `V2 TeamRunExecutionTreeSnapshot -> projectExecutionTree(schema_version 2) -> GraphQL/WebSocket payload -> strict contract parse -> hydrate workspace metadata by referenced root path -> create read-only TeamRunConfigurationView -> RunConfigPanel/TeamRunConfigForm`.

Task/lifecycle event DTOs do not gain Team defaults because configured Team policy changes only in snapshots for this ticket. A future dynamic-topology ticket must define any incremental configuration event rather than overloading existing task events.

## Bounded Local / Internal Spines (If Applicable)

- **Parent owner: web hierarchy resolver.** `root complete -> visit Team -> merge supported override -> emit Team snapshot -> visit children -> merge exact Agent`. This single recursive walk governs precedence and keeps component recursion presentation-only.
- **Parent owner: planner.** `resolve graph -> build address/kind index -> validate exact Team and Agent maps/definition IDs -> only then allocate IDs and compile nodes`. Validation-before-allocation prevents rejected requests from consuming identities.
- **Parent owner: V2 migration.** `sorted root -> classify -> transform -> prevalidate -> write -> reread -> record capped disposition`. It stays private in one file; no generic planner/transform framework.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Runtime/model catalogs | DS-001, DS-002 | Resolver/readiness/UI | Load every referenced effective runtime and validate model availability | Inherited configurations introduce more effective combinations | Silent model substitution or duplicated async policy |
| Workspace selection/activation | DS-001, DS-003, DS-006 | Store/service/hydration | Address-scoped selection; canonical root-path dedupe | Workspace is a Team-scope field | One root loading state or repeated activation |
| Accessibility/localization | DS-001 | UI | Textual state/address/level, keyboard disclosures, error association | Approved observable behavior | Policy mixed into domain resolver |
| Topology repair notice | DS-001, DS-002 | Store/UI | Prune stale/kind-mismatched intent and show exact addresses before launch | Definition can change after draft creation | Silent retargeting or launch of stale intent |
| Generated/dist artifacts | DS-003, DS-006, DS-007 | Contract packages | Keep source and checked-in outputs aligned | Repository publishes generated packages | Runtime mismatch despite source correctness |
| Migration diagnostics/retry | DS-005 | Migration/runner | Counts, capped examples, existing manual Retry | Unbounded installation volume | Database/API/log size proportional to roots |

## Ownership Boundaries

The editable-to-resolved boundary is explicit: partial intent never leaves the web authoring subsystem. The resolved-to-runtime boundary is explicit: GraphQL/service/planner receive complete Team and Agent records and reject missing/extra/kind-mismatched subjects. The runtime-to-storage boundary is V2-only. The historical-to-current boundary runs before normal catalog admission and is the only place allowed to inspect V1 or infer defaults from coordinators.

Root-only authoring is not a second resolution policy. It is an input mode owned by `TeamRunService`, which expands a root complete value into the same complete planner input used by workspace launch.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `resolveTeamRunLaunchHierarchy` | recursive merge, address/kind index, complete projection | readiness, catalog sync, store launch projection, editable view | component/root-only ad hoc merge | extend typed result/issues, not another helper |
| `TeamRunService.createTeamRun` | normalize complete inputs, workspace activation, planner | GraphQL full hierarchy | resolver calls planner/manager directly | extend service input |
| `TeamRunService.createTeamRunFromRootConfig` | graph-wide root expansion then common create | mobile-derived backend calls, application, external channel, programmatic presets | caller builds leaf list through planner helper | add explicit optional complete Agent input |
| `TeamDefinitionTopologyPlanner.buildPlan` | graph index, exact coverage, allocations, compile | TeamRunService only | caller allocates IDs or compiles nodes | add planner-private validation stage |
| `TeamRunExecutionTreeStore` | V2 exact validation and atomic writer | normal persistence/restore | normal code reads JSON/V1 directly | extend current V2 store |
| `TeamRunExecutionTreeV2AppDataMigration.execute` | V1 decode/transform/V2 validation/dispositions | migration runner only | catalog/runtime performs coordinator fallback | change migration boundary, never runtime |

## Dependency Rules

1. Vue/Pinia UI may depend on `TeamRunConfig` types and the pure hierarchy resolver; the resolver may not depend on Vue, Pinia, Apollo, generated GraphQL, or components.
2. `TeamRunConfig` editable intent owns no resolved duplicate map. `TeamRunConfigurationView` and `ResolvedTeamRunLaunchHierarchy` are derived and immutable.
3. Team overrides may contain runtime/model/`llmConfig`/auto-execute/workspace only. Root owns `skillAccessMode`; new-run resolution copies it into every Team/Agent snapshot. Agent override capabilities remain the current runtime/model/`llmConfig`/auto-execute set.
4. GraphQL/application adapters may translate transport values only; only the service activates workspaces and only the planner validates definition topology.
5. Planner validation completes before any TeamRun/AgentRun identity allocation.
6. Current domain/schema/store/catalog/projector code may not import migration-owned V1 modules. Migration code may import the current V2 validator/writer as its target boundary.
7. The new V2 migration is registered after V1 promotion and Team Agent memory repair. Later current readers see V2 only.
8. Source packages and checked-in `dist`/generated artifacts change together; no compatibility union is emitted.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `TeamLaunchConfigEdit` | draft intent | Root edit, nested Team override/reset, exact Agent override | `/` only for root commands; canonical non-root Team or Agent address per command | Split commands prevent kind ambiguity |
| `resolveTeamRunLaunchHierarchy(intent, memberTree)` | launch hierarchy | Validate/resolve complete scopes and Agents | root `/` plus typed canonical tree nodes | Returns issues rather than guessing |
| GraphQL `CreateAgentTeamRunInput.teamConfigs` | configured Team scopes | Complete snapshot for every Team | `teamAddress`, including exactly `/` | No partial fields |
| GraphQL `memberConfigs` | configured Agents | Complete snapshot for every leaf Agent | `memberAddress` + definition ID | Remove unused `workspaceId`; use root path |
| `TeamRunService.createTeamRun` | complete hierarchy command | Normalize and create | Team definition ID + exact Team/Agent arrays | Full-hierarchy entry |
| `TeamRunService.createTeamRunFromRootConfig` | root-only policy command | Expand root Team defaults and optional complete Agents | root config has no address; Agents use exact addresses | No coordinator inference |
| `ApplicationTeamRunLaunch` member mode | application root policy + exact Agents | Carry `teamDefaultConfig` and existing complete `memberConfigs` | definition is resolved by application resource; members use canonical address | Preset mode unchanged in intent |
| `TeamRunExecutionTreeStore.read/write` | V2 tree | Exact current persistence | root TeamRun ID + canonical file path | V2 only |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Typed draft edits | Yes | Yes | Low | Separate root/Team/Agent command variants |
| Hierarchy resolver | Yes | Yes | Low | Use topology kind index and closed issue codes |
| Full create service | Yes | Yes | Low | Exact complete coverage |
| Root-only create service | Yes | Yes | Low | Root config is explicit; optional Agent list must be complete |
| Execution-tree store | Yes | Yes | Low | Current version only |
| V2 migration | Yes | Yes | Low | Exact version dispatch inside migration only |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Editable root/team/Agent state | `TeamRunConfig` with `rootConfig`, `teamOverrides`, `agentOverrides` | Yes | Low | Stop calling all overrides “member” overrides |
| Complete executable Agent value | `AgentLaunchConfiguration` | Yes | Low | Reuse it as an Agent's actual launch configuration and as a Team's inherited default; do not imply that a Team launches an LLM runtime |
| Configured execution-tree child union | `ConfiguredExecutionNode` = `ConfiguredAgentExecutionNode \| ConfiguredTeamExecutionNode` | Yes | Low | Use parallel `*ExecutionNode` names instead of mixing the union name `ConfiguredMemberExecution` with concrete `ConfiguredAgentExecution` / `ConfiguredTeamExecution` names |
| Team transport record | `TeamScopeLaunchConfigInput` | Yes | Low | Use `teamAddress`, not `memberAddress` |
| Derived UI model | `TeamRunConfigurationView` | Yes | Low | Keep separate from editable intent |
| Current package catalog | `TeamRunPackageCatalog` | Yes | Low | Remove V1 label |
| Historical transform | `TeamRunExecutionTreeV2AppDataMigration` | Yes | Low | Name target version and keep V1 decoder separate |
| Current persisted file payload | `TeamRunExecutionTreeFileV2` with required `schemaVersion: 2` | Yes | Low | Retain both by explicit user decision: the type suffix identifies the compile-time payload contract and the field classifies materialized data |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Canonical hierarchy identity | `teamDefinitionMembers.ts` / graph resolver | Reuse | Both already expose canonical address and kind | N/A |
| Immutable draft lifecycle | `teamRunConfigStore.ts` | Extend | Exact snapshot/in-flight invariants are correct | N/A |
| Effective hierarchy resolution | root-only member builder | Create New | Existing helper erases Team subjects | One new pure owner replaces it |
| Team editor controls | current root runtime/model/workspace controls | Extend | Behavior/accessibility already exists | Extract reusable scope editor |
| Backend compile | topology planner | Extend | Already owns definition graph and IDs | N/A |
| Atomic file replacement | `TeamRunFileCommitWriter` | Reuse | Correct existing physical boundary | N/A |
| Startup/migration recovery | app-data runner/ledger/Settings Retry | Reuse | Already supplies scheduling and manual retry | N/A |
| V1 interpretation | historical V1 migration folder | Extend | Correct forward-only boundary | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Web Team launch authoring | intent, edits, view, readiness, scoped UI state | DS-001, DS-002 | store/resolver | Extend + one new pure utility | Desktop full hierarchy; mobile root-only |
| Team create/planning | complete contracts, normalization, root expansion, graph compile | DS-003, DS-007 | service/planner | Extend | One common plan path |
| Team runtime/persistence | immutable Team defaults, V2 file, restore | DS-004 | runtime aggregate/store | Extend | Complete snapshots only |
| Team transport/history | V2 DTO/projector/hydration/view | DS-006 | projector/factory | Extend | No historical inference |
| Application SDK | explicit root default in member mode | DS-007 | contracts/backend SDK | Extend | Update source/dist |
| App-data migration | V1 isolation and V2 transform | DS-005 | migration definition/runner | Extend + one new migration | Proportionate single-file loop |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/types/agent/TeamRunConfig.ts` | Web authoring | shared types | tight intent, overrides, complete values, presentation | One subject vocabulary | Yes |
| `autobyteus-web/utils/teamRunLaunchHierarchy.ts` | Web authoring | resolver | reconcile/resolve/project derived scopes | One recursive policy owner | Yes |
| `autobyteus-web/stores/teamRunConfigStore.ts` | Web authoring | draft owner | commands, frozen drafts, address loading/repair | Existing lifecycle owner | Yes |
| `TeamScopeConfigEditor.vue` | Web UI | scope editor | root/nested fields and state | Reusable complete field composition | Yes |
| `TeamMemberConfigTree.vue` | Web UI | recursive presentation | Team/Agent hierarchy | Recursion belongs together | Yes |
| `team-run-config.ts` | Server runtime | domain value | common complete config + Team default | Runtime vocabulary | Yes |
| `team-definition-topology-planner.ts` | Server planning | graph/compiler | exact complete coverage + allocation | Existing graph owner | Yes |
| `team-run-execution-tree.ts` / schema/store | Persistence | current V2 | complete Team defaults | Existing persistence area | Yes |
| V2 migration file | Migration | historical transform | closed file loop/dispositions | Transformation is small/cohesive | Yes |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Complete runtime/model/config/auto/skill/workspace value | `team-run-config.ts` (`AgentLaunchConfiguration`) | Server Team runtime | It is the executable Agent configuration; a Team stores it as the default for inherited/current/future Agents | Yes | Yes | transport DTO, partial intent, or a falsely Team-specific value type |
| Web complete Team/Agent value | `TeamRunConfig.ts` (`ResolvedTeamRunLaunchConfig`) | Web Team authoring | resolver/view/payload share one meaning | Yes | Yes | mutable store state |
| Recursive precedence | `teamRunLaunchHierarchy.ts` | Web Team authoring | readiness/view/payload must agree | Yes | Yes | Vue/Apollo helper bag |
| Stream launch DTO/schema | `team-execution-view-dtos.ts` (`LaunchConfigurationDto`) | Team stream contracts | Team and Agent fields identical | Yes | Yes | version union |
| Exact V1 historical structures | migration-owned V1 schema module | App-data migration | retained V1 promotion and V2 transform need one decoder | Yes | Yes | current runtime import |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `TeamRunConfig` editable intent | Yes | Yes | Low | Complete values only at root; partial maps below |
| `TeamScopeConfigOverride` | Yes | Yes | Low | workspace stored as one paired selection; property presence distinguishes explicit nullable `llmConfig` |
| `TeamRunConfigurationView` | Yes | Yes | Low | Mark derived/read-only; never write it back as intent |
| `AgentLaunchConfiguration` | Yes | Yes | Low | Use it directly for `ConfiguredAgentExecutionNode.launchConfiguration` and `ConfiguredTeamExecutionNode.defaultLaunchConfiguration`; intersect it into runtime Agent fields only where the existing flat runtime shape remains useful |
| GraphQL complete arrays | Yes | Yes | Low | Backend exact coverage prevents parallel policy meaning |
| V1/V2 schemas | Yes | Yes | Low | V1 exists only under migration; runtime exports only V2 |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/types/agent/TeamRunConfig.ts` | Web authoring | type boundary | `TeamScopeRootConfig`, `TeamScopeConfigOverride`, `AgentConfigOverride`, `TeamRunConfig`, derived view types | One coherent launch vocabulary | N/A |
| `autobyteus-web/types/agent/TeamLaunchDraft.ts` | Web authoring | command boundary | typed root/Team/Agent edits and repair notice | Draft commands stay with draft | TeamRunConfig types |
| `autobyteus-web/utils/teamRunLaunchHierarchy.ts` | Web authoring | policy owner | topology reconciliation, recursive resolution, derived view | One pure hierarchy policy | member-tree and config types |
| `autobyteus-web/utils/teamRunConfigUtils.ts` | Web authoring | field semantics | property-presence/equality/coherence primitives | Small field-local utilities | override types |
| `autobyteus-web/stores/teamRunConfigStore.ts` | Web authoring | lifecycle owner | frozen edits, per-Team workspace state, repair/admission | Existing lifecycle cohesion | hierarchy resolver |
| `TeamScopeConfigEditor.vue` | Web UI | reusable editor | root/nested scope fields/status/reset | Avoid duplicate root/nested controls | configuration view |
| `TeamMemberConfigTree.vue` | Web UI | recursive tree | Team scopes and Agent items | One presentation recursion | scope editor/item |
| `MemberOverrideItem.vue` | Web UI | Agent editor | exact Agent override against containing Team | Existing focused responsibility | field utilities |
| `TeamRunConfigForm.vue` / `RunConfigPanel.vue` | Web UI | composition | root + tree + banners/address workspace events | Existing screen boundaries | view/store commands |
| `team-run-service.ts` | Server create | public service | full create + root-only create, normalize/activate | One lifecycle boundary | planner/domain types |
| `team-definition-topology-planner.ts` | Server planning | graph owner | coverage validation and compile | Existing topology owner | common launch value |
| `team-run-config.ts` | Server runtime | domain aggregate | complete value and Team default | One immutable runtime model | N/A |
| `team-run-execution-tree.ts`, schema, store, builder | Persistence | V2 current boundary | write/read/restore Team defaults | Established responsibilities | common snapshot value |
| `team-execution-view-dtos.ts` / projector | Transport | V2 DTO | expose Team defaults | Current strict contract | launch DTO |
| `teamExecutionContextFactory.ts` / hydration | Web history | view owner | stored Team view and workspace metadata | Read-only return path | configuration view |
| migration-owned V1 modules | Migration | legacy boundary | exact V1 decode/build/mutate/package validation | Keep all old-shape knowledge isolated | migration only |
| `team-run-execution-tree-v2-app-data-migration.ts` | Migration | transform owner | classify/transform/commit/report | Latest simplicity convention | V1 decoder + V2 validator/writer |

## Applied Patterns (If Any)

- **Intent versus snapshot:** partial editable intent; complete runtime/persistence values.
- **Recursive nearest-owner resolution:** one Team-scoped walk, exact Agent merge at leaves.
- **Thin transport adapters:** GraphQL/application/external adapt into service commands only.
- **Forward-only migration boundary:** legacy V1 decoder and coordinator reconstruction exist only in registered migrations.
- **Final-state classification:** writer uncertainty is classified by canonical V2 reread, not by speculative phase state.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/types/agent/TeamRunConfig.ts` | File modify | Web launch model | Replace flat globals/member map with root/team/Agent intent and view types | Existing type authority | recursive algorithm |
| `autobyteus-web/types/agent/TeamLaunchDraft.ts` | File modify | Draft commands | address-specific edits/repair notice | Existing draft boundary | UI rendering |
| `autobyteus-web/composables/useDefinitionLaunchDefaults.ts` | File modify | Root seeding | Build/clone new root-only intent | Existing definition-default owner | embedded defaults |
| `autobyteus-web/utils/teamRunLaunchHierarchy.ts` | File add | Hierarchy policy | reconcile/resolve/view | New missing policy owner | stores/GraphQL |
| `autobyteus-web/utils/teamRunConfigUtils.ts` | File modify | Field helpers | override presence/equality/coherence | Existing helper area | recursive traversal |
| `autobyteus-web/utils/teamRunMemberConfigBuilder.ts` | File delete | Obsolete | Remove root-only projection | Replaced | compatibility wrapper |
| `autobyteus-web/stores/teamRunConfigStore.ts` | File modify | Draft lifecycle | new commands, scope loading map, repair, readiness | Existing owner | component recursion |
| `autobyteus-web/utils/teamRunLaunchReadiness.ts`; `composables/useTeamRunRuntimeCatalogSync.ts` | Files modify | Validation/catalog | consume resolved hierarchy | Existing concerns | independent precedence |
| `autobyteus-web/components/workspace/config/TeamScopeConfigEditor.vue` | File add | Scope UI | reusable root/nested editor | Config component folder | store mutation |
| `.../TeamMemberConfigTree.vue` | File add | Tree UI | recursive Team/Agent presentation | Config component folder | merge policy |
| `.../MemberOverrideTree.vue` | File delete | Obsolete UI | remove display-only Team grouping | Clean cut | alias |
| `.../MemberOverrideItem.vue`; `TeamRunConfigForm.vue`; `RunConfigPanel.vue` | Files modify | UI composition | containing-Team baseline, new tree/view/events/notices | Existing screen | policy inference |
| `autobyteus-web/stores/agentTeamRunStore.ts` | File modify | Launch orchestration | reconcile before admission; send complete arrays | Existing launch boundary | root-only builder |
| `autobyteus-web/services/teamExecution/teamExecutionContextFactory.ts`; `.../teamExecutionViewState.ts`; `.../teamExecutionTreeSelectors.ts`; `services/runHydration/teamRunContextHydrationService.ts` | Files modify | Read-only view/hydration | Team selectors, stored view, all workspace roots | Existing execution-return area | coordinator default inference |
| `autobyteus-web/localization/messages/en/workspace.ts`; `.../zh-CN/workspace.ts` | Files modify | Localization | nested scope/state/error/repair strings | Existing catalog | hard-coded labels |
| `autobyteus-web/graphql/mutations/agentTeamMutations.ts`; `autobyteus-web/generated/graphql.ts` | Files modify/generated | GraphQL client | complete Team input | Existing transport | partial resolution |
| `autobyteus-application-sdk-contracts/src/index.ts`; checked-in `dist/**` | Files modify/generated | App contract | add `teamDefaultConfig` to member mode | Existing public contract | compatibility optional field |
| `autobyteus-application-backend-sdk/src/launch-profile.ts`; checked-in `dist/**` | Files modify/generated | App SDK adapter | derive explicit root default from profile defaults | Existing builder | coordinator inference |
| `autobyteus-server-ts/src/api/graphql/types/agent-team-run.ts` | File modify | GraphQL facade | `teamConfigs` + Agent configs; drop ignored `workspaceId` | Existing resolver | planning |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts` | File modify | Create service | full/root-only commands, path activation/dedupe | Existing lifecycle owner | public leaf builder |
| `.../services/team-definition-topology-planner.ts` | File modify | Planner | exact address/kind/coverage then allocate/compile | Existing graph owner | workspace I/O |
| `.../domain/team-run-config.ts` | File modify | Runtime model | common complete config and Team default | Existing domain | partial overrides |
| `.../services/team-run-execution-tree-builder.ts`; `.../domain/team-run-execution-tree.ts` | Files modify | Persistence mapping/model | V2 defaults and restore | Existing tree owner | V1 union |
| `autobyteus-server-ts/src/run-history/store/team-run-execution-tree-schema.ts`; `.../team-run-execution-tree-store.ts`; `.../services/team-run-state-package-validator.ts` | Files modify | Current persistence | exact V2 schema/store/package | Existing current boundary | V1 fallback |
| `.../services/team-run-v1-package-catalog.ts` and references | File rename/modify | Current catalog | rename to `team-run-package-catalog.ts`, V2-only admission | Current responsibility | V1 classification |
| `autobyteus-team-stream-contracts/src/team-execution-view-dtos.ts`; checked-in `dist/**` | Files modify/generated | Stream contract | schema_version 2 + Team default | Existing strict DTO | V1 union |
| `autobyteus-server-ts/src/services/agent-streaming/team-execution-view-projector.ts` | File modify | Projector | emit stored Team defaults | Existing adapter | inference |
| `autobyteus-server-ts/src/application-orchestration/services/application-run-binding-launch-service.ts` | File modify | App adapter | pass root default and Agent list through service | Existing binding owner | graph expansion |
| `autobyteus-server-ts/src/external-channel/runtime/channel-binding-run-launcher.ts` | File modify | External adapter | call root-only service entry | Existing launcher | member expansion |
| `autobyteus-server-ts/src/app-data-migrations/migrations/team-run-execution-tree-v1/**`; `.../team-run-migration-state-classifier.ts` | Files modify/add | Legacy migration boundary | own exact V1 types/validator/builder/mutator/store/package validation | Historical migration area | current runtime export |
| `autobyteus-server-ts/src/app-data-migrations/migrations/team-run-execution-tree-v2-app-data-migration.ts` | File add | V2 migration | one deterministic file transform and bounded dispositions | Migrations folder | generic framework |
| `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts` | File modify | Migration ordering | register V2 after V1 + memory layout | Existing registry | transform logic |
| `tickets/in-progress/hierarchical-team-run-launch-config/team-execution-tree-v2-contract.md` | File add | Design contract | exact proposed V2 type/JSON materialization and migration mapping | User requested a concrete contract rather than an inline-only sketch | implementation evidence or alternate schema |
| Relevant existing unit/integration test files plus a focused V2 migration test | Files modify/add | Verification candidates | hierarchy, UI, planner, persistence, DTO, migration | Mirrors production owners | final coverage policy decisions |

Checked-in generated or `dist` paths must be regenerated with each package's existing build command; implementations must not hand-edit generated structures when a generator is authoritative.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-web/utils` + `types/agent` | Main-Line Domain-Control | Yes | Low | One pure hierarchy file plus tight types; do not create a folder for one owner |
| `autobyteus-web/components/workspace/config` | Transport/UI | Yes | Low | Two components reflect reusable editor and recursive composition |
| `agent-team-execution/domain/services` | Main-Line Domain-Control | Yes | Low | Existing service/planner/runtime boundaries remain |
| `run-history/store/services` | Persistence-Provider | Yes | Low | Current V2 only |
| `app-data-migrations/migrations/team-run-execution-tree-v1` | Off-Spine Concern | Yes | Medium | Existing historical migration already has structural depth; put all V1 knowledge there |
| `app-data-migrations/migrations` V2 file | Off-Spine Concern | Yes | Low | New transform is small enough for one file; no new folder/framework |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Editable intent | `{ rootConfig, teamOverrides: { '/research': { runtimeKind: 'claude_agent_sdk' } }, agentOverrides: { '/research/reviewer': { llmModelIdentifier: 'opus' } } }` | Store a complete copy for every Team/Agent in the draft | Preserves inheritance intent and avoids stale duplicated values |
| Nullable config | `Object.hasOwn(override, 'llmConfig') && override.llmConfig === null` means explicit null | `override.llmConfig ?? parent.llmConfig` | Null is a complete selected value, not missing |
| Workspace override | `workspace: { workspaceId, workspaceMetadata }` as one optional field | independent optional `workspaceId` and `workspaceMetadata` fields | Prevents internally divergent partial pairs |
| Backend request | `teamConfigs` contains `/`, `/research`, `/delivery`; `memberConfigs` contains every leaf | Send partial overrides and ask backend to recreate UI merge | Runtime input stays complete and deterministic |
| Root-only caller | service expands one explicit root config to every Team | choose root coordinator's Agent config as default | New runs never infer policy from Agents |
| Migration | validate V1 -> copy each direct coordinator config -> validate V2 -> atomic write -> reread | backup + journal + phase state machine + V1 runtime fallback | Matches convention and latest simple migrations |
| Historical view | render stored root/nested defaults; derive presentation differences against stored parent | fabricate all Team baselines from root coordinator | Preserves exact reconstructed history, including accepted coordinator edge case |

Illustrative backend target shapes:

```ts
type AgentLaunchConfiguration = Readonly<{
  runtimeKind: RuntimeKind;
  llmModelIdentifier: string;
  llmConfig: Readonly<Record<string, unknown>> | null;
  autoExecuteTools: boolean;
  skillAccessMode: SkillAccessMode;
  workspaceRootPath: string | null;
}>;

type TeamScopeLaunchSettings = AgentLaunchConfiguration & Readonly<{
  teamAddress: AgentTeamAddress; // includes "/"
}>;

type ConfiguredAgentExecutionNode = Readonly<{
  address: AgentTeamAddress;
  // existing Agent identity fields
  launchConfiguration: AgentLaunchConfiguration;
}>;

type ConfiguredTeamExecutionNode = Readonly<{
  address: AgentTeamAddress;
  // existing Team identity/topology fields
  defaultLaunchConfiguration: AgentLaunchConfiguration;
  members: readonly ConfiguredExecutionNode[];
}>;

type ConfiguredExecutionNode =
  | ConfiguredAgentExecutionNode
  | ConfiguredTeamExecutionNode;

type RootConfiguredTeamExecutionNode = Readonly<{
  address: "/";
  // existing root Team identity/topology fields
  defaultLaunchConfiguration: AgentLaunchConfiguration;
  members: readonly ConfiguredExecutionNode[];
}>;
```

The complete field list and a realistic materialized JSON object are authoritative in `team-execution-tree-v2-contract.md`; the compact excerpt above exists only to show the shared value and recursive node relationship.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Normal store accepts V1 or V2 | Simplifies mixed history | Rejected | startup migration then V2-only store/catalog |
| Optional `defaultLaunchConfiguration` | Avoid migration | Rejected | required V2 field reconstructed for V1 |
| Coordinator inference for new runs/history | Existing root factory does it | Rejected | explicit complete Team input; migration-only historical inference |
| Keep root-only builder as wrapper | Reduces caller edits | Rejected | delete and use hierarchy resolver/service root expansion |
| GraphQL accepts old request without `teamConfigs` | Client compatibility | Rejected | regenerate web client in same repository change |
| Application member mode makes root default optional | Older SDK shape | Rejected | required `teamDefaultConfig` plus regenerated packages |
| Stream DTO union of schema 1/2 | Mixed payload compatibility | Rejected | migrate storage and emit one V2 contract |
| Bespoke migration backup/journal | Appears safer | Rejected | prevalidate + existing atomic writer + reread + ordinary retry |

Hard block: implementation is not acceptable if current business/runtime code contains V1 fallback branches, optional Team defaults, or coordinator-derived new-run defaults.

## Derived Layering (If Useful)

- **Web presentation:** Vue components and `RunConfigPanel`.
- **Web authoring domain:** tight intent/view types, pure hierarchy resolver, Pinia lifecycle owner.
- **Transport adapters:** GraphQL, application contracts/SDK, external binding launcher, Team stream DTO/projector.
- **Server application/domain:** `TeamRunService`, topology planner, immutable runtime config.
- **Persistence:** V2 execution-tree builder/schema/store/catalog.
- **Migration off-spine:** retained V1 boundary and one V2 transformation definition.

## Change / Refactor Sequence

1. Introduce web intent, complete-value, and derived-view types plus `teamRunLaunchHierarchy.ts`; prove three-level resolution, nullable `llmConfig`, workspace inheritance, kind validation, and semantic normalization.
2. Refactor draft defaults/store/readiness/catalog sync to the new types, address-scoped loading state, and topology repair. Preserve exact snapshot admission. Delete the root-only member builder after all callers move.
3. Extract `TeamScopeConfigEditor.vue`, replace `MemberOverrideTree.vue`, update Agent items to use containing-Team baselines, wire canonical-address events and repair/loading/error/locked/accessibility states, and update localization.
4. Change GraphQL/web launch projection to send complete `teamConfigs` and `memberConfigs`; reconcile topology before admission and stop a stale launch while showing the repair notice.
5. Add server common complete launch value and required Team defaults; change service/planner so full coverage validation precedes identity allocation. Add `createTeamRunFromRootConfig`, move external/application callers, and remove the public preset-to-member builder.
6. Extend application contracts/SDK member mode with required `teamDefaultConfig`; regenerate source-owned dist outputs and validate model/root config in the application adapter.
7. Add V2 execution-tree domain/builder/schema/store/package catalog and stream DTO/projector; update restore and web hydration/read-only view. Remove normal coordinator baseline inference and rename current catalog symbols.
8. Before registering V2, isolate all exact V1 types/validators/builders/mutators/store/package validation used by the retained V1 promotion and memory-layout migrations under the migration boundary. Prove those historical migrations still operate on V1.
9. Implement/register the single V2 migration after V1 promotion and memory layout repair. Validate copied fixtures, exact semantic preservation, coordinator-derived defaults, `llmConfig: null`, invalid/unsupported preservation, bounded diagnostics, writer final-state reread, and one rerun/idempotence scenario.
10. Regenerate contract/client artifacts, run package type/build/unit/integration checks, and remove every obsolete file/import/name. Downstream `api_e2e_engineer` will decide durable broader coverage after mandatory coverage investigation.

No temporary compatibility seam may remain at the end of the change. During implementation, compile errors across packages are the preferred sequencing signal rather than optional transport fields.

## Key Tradeoffs

- **Frontend resolves; backend validates.** This avoids serializing partial-property semantics across GraphQL while still preventing a compromised/stale client from inventing topology.
- **Separate derived view from editable intent.** It adds one presentation type but keeps the store semantically tight and lets read-only history display exact stored values, including historical skill/workspace differences that new nested UI cannot author.
- **Complete Team array is redundant with topology but intentional.** Exact one-record-per-Team validation makes policy explicit and future Dynamic AgentTeam defaults durable. Root-only callers avoid payload-building duplication through the service entrypoint.
- **Migration copies the coordinator snapshot.** This may reconstruct a coordinator-specific override as the Team default; the user explicitly accepted it as the most reliable historical evidence.
- **No migration backup/journal.** The existing atomic writer, pre/post validation, deterministic additive target, stable-attempt assumption, and ordinary retry are proportionate. More machinery adds states and I/O without an approved reachable need.

## Risks

1. **Wide cross-package contract cut:** server, web, application SDK, and stream contracts must land together. Mitigation: required fields and source/dist regeneration; no optional compatibility path.
2. **Model-config invalidation drift:** root, Team, and Agent edits could diverge. Mitigation: field-local coherence primitives plus one hierarchy resolver/readiness path; never silently substitute on catalog errors.
3. **Historical read-only ambiguity:** reconstructed defaults represent effective values, not proven old intent. Mitigation: call them reconstructed effective defaults, retain Agent snapshots, and keep coordinator policy documented.
4. **V1 migration coupling:** the existing V1 promoter currently imports normal runtime V1 code. Mitigation: isolate it before current code becomes V2-only and keep migration order explicit.
5. **Large histories:** traversal and file rewrite are linear. Mitigation: sequential/small-loop processing, aggregate counts, and five capped sorted examples per disposition; never retain all diagnostic paths.
6. **Topology changes during a draft:** stale overrides could be silently reassigned. Mitigation: exact address/kind reconciliation, prune notice, and no admission on the stale attempt.
7. **Historical workspace metadata resolution cost:** Team and Agent snapshots can repeat roots. Mitigation: cache/dedupe by canonical root path, then map metadata to addresses.

## Guidance For Implementation

- Treat `TeamRunConfig` as immutable editable intent. Never mutate `teamOverrides`/`agentOverrides` in components and never store a resolved complete map in the draft.
- Use own-property checks for optional `llmConfig`; `null` is explicit, absence inherits.
- Make workspace override one atomic pair. Payload projection uses `workspaceMetadata.workspaceRootPath`; backend accepts/activates only canonical root paths. Remove GraphQL `workspaceId`, which the current Team service ignores.
- Root `skillAccessMode` is copied into every new effective Team and Agent record. Do not add a nested skill edit or accept nested skill divergence in new workspace requests. Read-only V2 presentation may show a historical reconstructed value exactly as stored.
- Topology reconciliation must classify both maps against address **and kind**, return sorted repaired addresses, replace the frozen draft through the store, show a localized notice, and refuse to admit the stale snapshot.
- Backend full-create validation must require exactly one Team config per graph Team including `/` and exactly one Agent config per leaf; reject duplicate, noncanonical, unknown, missing, extra, kind-mismatched, and wrong Agent-definition records before allocating identities.
- Normalize/activate unique workspace roots across both Team and Agent arrays in `TeamRunService`; planner receives complete canonical values and performs no I/O.
- `cloneTeamRunNode`, execution-tree builder/restore, and DTO projector must deep-clone/freeze `llmConfig` for Team defaults exactly as for Agent settings.
- Keep task Team execution shapes unchanged; the new required default belongs to configured root/nested Team nodes. Do not invent a task-event configuration protocol in this ticket.
- In migration code, use a private closed `Disposition` union, count independently of examples, cap each sorted relative-path example list at five, and emit one detail per disposition—not per root.
- Validate V1 and build the whole V2 candidate before calling the writer. After any writer outcome that may have renamed, reread the canonical path. A valid exact V2 is current; anything else is failed. Do not restore from a side copy or probe current definitions.
- Run migration verification only against disposable copies of repository fixtures or synthetic temp directories, never a user profile.
- Update all affected source-owned `dist` and generated GraphQL files with existing package generation commands. Record commands/evidence in the later implementation handoff; the solution designer does not create that artifact.

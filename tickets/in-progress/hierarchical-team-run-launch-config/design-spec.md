# Hierarchical TeamRun Launch Configuration — Design Spec

## Current-State Read

The integrated implementation now delivers the approved hierarchy on its ordinary paths: `TeamRunConfig` represents root, nested-Team, and exact-Agent intent; `teamRunLaunchHierarchy.ts` owns root -> nearest Team -> exact Agent resolution; the workspace UI renders inherited/customized Team scopes; the create contract carries exact Team/Agent coverage; runtime/V2 persistence/restore retain complete Team defaults and Agent snapshots; and historical coordinator reconstruction is confined to the V1-to-V2 migration. SR-008 passed `ARCH-REV-002`, was implemented through IR-008, passed complete implementation review at CRR-012, API/E2E at API-REV-007 (98%), proportional test review at CRR-014, and delivery integration/build through DR-003. During hands-on Electron verification, the user rejected the hierarchy-specific root wrapper/title/badge, visible `/`, divider, and effective summary. A live render of the current `origin/personal`-equivalent root form and nested group established the target visual baseline; `ui-ux-spec.md` materializes that additive, no-redesign contract.

CRR-010 exposed one integrated frontend ownership defect. `TeamLaunchDraft` owns immutable configuration and pending Agent inputs, while `teamRunConfigStore` owns configuration reconciliation and a global address-keyed workspace loading map. Separately, `RunConfigPanel.vue` owns `teamWorkspaceSelections`, including active/inactive New-path buffers, and performs workspace registration before calling `agentTeamRunStore.launchDraft`. The stable `team-draft:<draftId>` context deliberately preserves that panel map across same-draft edits. If current definition topology removes, renames, moves, or kind-changes a nested Team, the retained active New selection can be registered and then rejected by `setWorkspaceLoaded` before the launch owner's topology repair executes. CR-008 is therefore a reachable boundary/coordination defect, not a missing filter.

CRR-010 also exposed one backend allocation-boundary defect. `TeamDefinitionTopologyPlanner` validates complete exact coverage before allocating nested Team and Agent identities, but `TeamRunService` allocates or accepts the root `teamRunId` first and passes it into `buildPlan`. Application launch calls the public root allocator even earlier. No invalid run is persisted, but DS-003's validation-before-allocation invariant and planner allocation ownership are false for the root identity. CR-009 requires a clean public-contract correction rather than an extra guard.

The current root-only mobile, application, external-channel, and programmatic launch paths remain supported. The integrated V2 runtime/persistence, migration, stream, restore, and read-only return paths are not redesigned by SR-009/SR-010. The new corrective target is presentation-only: preserve the original personal-branch root appearance and extend existing nested-Team groups with default-collapsed global controls, whole-scope state, and conditional Reset—without any effective summary.

Detailed current paths, material-premise traces, commands, and reviewer evidence are authoritative in `investigation-notes.md`, BEH-001–BEH-009, MP-CR-006, and MP-CR-007.

## Intended Change

Retain the implemented hierarchical launch model and the two integrated ownership corrections from SR-008.

For Team workspace authoring, make the selected `TeamLaunchDraft` under `teamRunConfigStore` the single authority for each canonical Team address's selection mode, active or inactive New-path buffer, address-scoped loading/error state, canonical workspace replacement, topology reconciliation, and repair notice. Existing-workspace identity remains in canonical `TeamRunConfig`; it is derived into the UI rather than duplicated in transient selection state. `RunConfigPanel` renders store-derived views and emits typed commands only. On Run, it delegates the exact selected draft once to `agentTeamRunStore`, which sequences store-owned reconciliation and a typed workspace-preparation plan, uses the existing `workspaceStore` only as the registration adapter, commits results through store commands, revalidates topology, evaluates readiness, and admits the latest exact draft. No broad config watcher or silent retarget is introduced.

For backend create, make `TeamDefinitionTopologyPlanner` the configured Team topology's singular validation/allocation compiler. `buildPlan` resolves/indexes the graph and validates exact Team/Agent coverage and inherited skill policy before asking injected TeamRun or AgentRun identity allocators for any identity. The service/application contracts no longer accept or expose root TeamRun preallocation. `TeamRunService` remains the public full/root-only lifecycle facade, while application binding materializes its runtime record from the successfully created `teamRun.teamRunId`.

The already-implemented complete Team/Agent request, runtime, V2 persistence, migration, return projection, and root-only expansion contracts remain unchanged.

For SR-009/SR-010/SR-011 presentation, keep field composition reusable but let the root and nested wrappers serve their different information needs. `TeamRunConfigForm` preserves the `origin/personal` sequence and quiet styling: Team Definition proceeds directly to root runtime/model/model-config/workspace/auto-execute fields and the existing `Team Members Override (N)` disclosure. It does not render a hierarchy wrapper card, root-scope title/badge, `/`, divider, or effective summary. A nested disclosure extends the existing group identity/indentation treatment, defaults collapsed, retains inherited/customized state and conditional Reset, and renders the real controls on expansion. No effective or customized-fields summary exists in either disclosure state. This is a clean-cut removal of redundant visual output, not a configuration-model or accessibility shortcut. The exact visual/journey contract in `ui-ux-spec.md` was approved by the user on 2026-08-25 and is ready for architecture re-review.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | R-001–R-004; AC-001–AC-003 | Select a Team definition for a new workspace run | Investigation BEH-001; SR-009/SR-010 user review + origin-personal render | Root remains the first complete scope and visually matches the personal-branch baseline; no hierarchy wrapper/title/badge, `/`, divider, or summary | Definition default -> draft store -> hierarchy view -> root field composition; DS-001 |
| BEH-002 | User | R-005–R-010; AC-004–AC-008 | Expand nested Team configuration | Investigation BEH-002; SR-009/SR-010 user review + origin-personal render | Existing nested Team group gains a default-collapsed editor, inherited/customized state, and conditional Reset; no summary | Recursive Team tree -> nested disclosure -> scope view/editor -> address-specific store command; DS-001 |
| BEH-003 | Contract | R-011–R-015; AC-009–AC-012 | Resolve a launch candidate | Investigation BEH-003 | Resolve root, then each nearest Team override, then exact Agent override; preserve coherent model config | Launch intent + canonical topology -> hierarchy resolver -> complete scope/Agent snapshots; DS-002 |
| BEH-004 | Contract | R-016–R-020; AC-013–AC-015 | Edit, repair, lock, or admit a draft | Investigation BEH-004; MP-CR-006 / CR-008 | Keep immutable drafts; make Team workspace selection/operation state draft-owned; reconcile config plus transient address state before registration; stop visibly on repair | Store commands -> draft-owned workspace view -> launch-owner reconcile/prepare -> readiness -> exact-snapshot admission; DS-001, DS-002, DS-008 |
| BEH-005 | System | R-021–R-026; AC-016–AC-019 | Create, persist, and restore a TeamRun | Investigation BEH-005; MP-CR-007 / CR-009 | Validate complete Team and Agent coverage before every configured root/nested Team or Agent identity allocation; retain Team defaults in runtime and V2 persistence | GraphQL/service -> planner validation -> planner-owned allocation/compile -> runtime -> V2 tree/store -> restore; DS-003, DS-004 |
| BEH-006 | Contract | R-027; AC-020 | Seed a new draft from a selected root definition | Investigation BEH-006 | Preserve root-only definition default seeding; embedded definition defaults do not activate | Root definition -> `buildTeamRunTemplate`; DS-001 |
| BEH-007 | User / Operational | R-028–R-031, R-037; AC-021–AC-023, AC-030 | Upgrade or inspect a stored TeamRun | Investigation BEH-007 | Migrate each V1 Team default from its direct coordinator, then present stored V2 defaults without runtime inference | Startup migration -> V2-only catalog/projector -> read-only configuration view; DS-005, DS-006 |
| BEH-008 | System / Contract | R-032–R-036; AC-024–AC-029 | Launch through mobile, application, external channel, or backend preset | Investigation BEH-008; CR-009 | Preserve root-only authoring and application Agent overrides; centrally expand complete Team policy; application consumes the root identity returned by common creation | Root preset/application complete Agent records -> root-config service entry -> planner validation/allocation -> returned root -> binding persistence; DS-007, DS-003 |
| BEH-009 | User | R-038–R-041; AC-031–AC-034 | Load, recover, lock, or navigate hierarchical controls | Investigation BEH-009 | Scope loading/error/disabled/accessibility state by canonical Team address and retain current recovery semantics | Address-scoped store state -> reusable Team editor/tree -> readiness/banner; DS-001, DS-002 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `tickets/in-progress/hierarchical-team-run-launch-config/ui-ux-spec.md` | Origin-personal visual baseline, additive nested-Team journeys, state transitions, wireframes, responsive/accessibility rules, and explicit removed output | R-001–R-010, R-038–R-041; AC-001–AC-008, AC-031–AC-034 | Governs the narrow frontend presentation delta without reopening hierarchy owners | User-approved on 2026-08-25; ready for architecture re-review |
| `tickets/in-progress/hierarchical-team-run-launch-config/hierarchical-launch-configuration-behavior.md` | Canonical hierarchy, UI states, field participation, surface semantics, and migration behavior | R-001–R-041; AC-001–AC-034 | Governs user-visible and cross-surface behavior implemented by the owners below | Functional behavior approved on 2026-08-24; UI presentation approved on 2026-08-25 |
| `tickets/in-progress/hierarchical-team-run-launch-config/team-execution-tree-v2-contract.md` | Exact TypeScript structure, materialization rules, realistic V2 JSON, and V1 conversion table | R-021–R-031, R-035, R-037; AC-016–AC-023, AC-030 | Governs the concrete execution-tree schema and examples used by persistence, migration, transport, and restore work | User-approved semantics; reconstructed after disk recovery; semantic equivalence confirmed by `ARCH-REV-001` |
| `tickets/in-progress/hierarchical-team-run-launch-config/recovery-audit.md` | Archive/base/hash evidence and exact missing-path inventory | N/A | Establishes recovery provenance and the safe workflow restart point; it does not govern target behavior | Evidence only / approval N/A |

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change` plus prerequisite `Feature`, now in integrated design-impact correction
- Current design issue found: `Yes`
- Root cause classification: `Boundary Or Ownership Issue` plus `Duplicated Policy Or Coordination`; the original `Shared Structure Looseness` is otherwise resolved in the integrated source
- Refactor needed now: `Yes`
- Evidence: CR-008 splits one exact-address workspace lifecycle between a panel map, a store loading map, store configuration, and launch-owner reconciliation. CR-009 splits configured root identity ownership across application, service, and planner even though the planner owns nested/Agent allocation ordering. Both material premises are Reachable through approved contracts and reproduced by CRR-010 probes.
- Design response: attach Team workspace authoring/operation state to its immutable draft and govern every transition/reconciliation through `teamRunConfigStore`; keep registration sequencing in the existing launch owner and the panel thin. Inject a configured-Team identity allocator into the planner, remove caller-supplied/preallocated root IDs, and return the created root identity through the runtime aggregate.
- Refactor rationale: another panel filter, config watcher, or service-side allocation check would preserve parallel authorities and repeat IR-004–IR-006 patch pressure. Clean public replacements are smaller and make the already-reviewed boundaries true.
- Unchanged owners: hierarchy resolution, complete transport/runtime/V2 persistence, migration-only V1 interpretation, read-only return projection, and root-only policy expansion remain healthy and are not redesigned.
- Intentional deferrals and residual risk: live post-launch topology mutation and Dynamic AgentTeam consumption remain separate tickets. A topology change that occurs after an external workspace-create request has begun can cause an unused registered workspace, but post-return reconciliation prevents stale config attachment or TeamRun launch; no rollback/delete policy is introduced without an approved workspace-transaction contract. Actual repository-resident coverage choices remain with `api_e2e_engineer` after implementation/code review.

## Terminology

- **Root configuration:** the complete TeamRun scope at canonical address `/`.
- **Team override:** partial editable intent for one nested Team placement; absence means inherit its parent.
- **Effective Team configuration:** the complete snapshot after merging the parent effective configuration with the Team override.
- **Agent override:** partial intent for exactly one Agent placement; it applies after the containing Team's effective configuration.
- **Launch hierarchy:** the resolved definition topology paired with complete Team and Agent launch configurations.
- **Configuration view:** a derived presentation model containing complete effective scope/Agent values and explicit/inherited metadata. It is not editable intent.
- **Team workspace authoring state:** per-draft, per-Team transient intent containing selection mode, one New-path buffer, and operation status; the selected existing workspace remains canonical only in `TeamRunConfig`.
- **Workspace preparation plan:** an immutable launch-owner token containing draft identity, topology fingerprint, and deduplicable active-New registration requests produced only after store reconciliation.
- **Configured TeamRun identity allocator:** the planner dependency used for root and nested configured Team IDs after exact validation; task-Team identity creation remains outside this create path.

## Design Reading Order

Read this spec in the template order. The main structural decisions are: migration/current-only boundary, DS-001/DS-002 frontend ownership, DS-003/DS-004 backend/persistence ownership, and DS-007 root-only expansion.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove the root-only `teamRunMemberConfigBuilder.ts` resolution path.
- Remove `MemberOverrideTree.vue` as a display-only Team grouping and replace it with a tree that treats Team and Agent subjects explicitly.
- Remove public caller composition through `buildMemberConfigsFromLaunchPreset`; root-only callers use one service entrypoint.
- Remove `RunConfigPanel.teamWorkspaceSelections`, its Team registration loop, and the store's selected-context-global Team workspace-loading map; replace them with per-draft store-owned state and launch-owner preparation.
- Remove `TeamRunService.allocateTeamRunId`, optional caller-supplied `teamRunId` fields, and planner `buildPlan.teamRunId`; configured identity allocation begins only inside the validated planner.
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
| DS-001 | Primary End-to-End | BEH-001, BEH-002, BEH-004, BEH-006, BEH-009 | Root definition selection or scope/workspace edit | Frozen launch intent, per-draft Team workspace authoring state, and derived view | `teamRunConfigStore` | Owns configuration/workspace intent, operation state, repair notice, and edit/preparation/launch locks |
| DS-002 | Bounded Local | BEH-003, BEH-004, BEH-009 | Launch intent + definition member tree | Complete resolved hierarchy/readiness/payload facts | `teamRunLaunchHierarchy.ts` | One precedence and subject-validation authority prevents UI/caller drift |
| DS-003 | Primary End-to-End | BEH-005 | Complete create command | Immutable runtime `TeamRunConfig` with created root identity | `TeamRunService` facade -> `TeamDefinitionTopologyPlanner` compiler | Planner validates topology/config coverage before all configured Team/Agent identity allocation |
| DS-004 | Primary End-to-End | BEH-005 | Runtime TeamRun | V2 file and restored identical runtime config | Execution-tree builder/store + manager | Makes Team defaults durable and restart-safe |
| DS-005 | Primary End-to-End | BEH-007 | Startup/Settings Retry on V1 data | Exact V2 or capability-scoped failure | `TeamRunExecutionTreeV2AppDataMigration` | Establishes one current schema without runtime fallback |
| DS-006 | Return-Event | BEH-007 | V2 runtime/history tree | Read-only hierarchical configuration view | Stream projector -> web hydration/context factory | Presents stored truth rather than coordinator inference |
| DS-007 | Primary End-to-End | BEH-008 | Root-only preset/application launch | Created root plus optional application binding record | `TeamRunService.createTeamRunFromRootConfig` -> planner; application adapter consumes result | Preserves compact surfaces, centralizes semantics, and forbids application root preallocation |
| DS-008 | Primary End-to-End | BEH-004, BEH-009 | One Run Team activation with zero or more active New workspace paths | Repaired stop, address-scoped failure, or exact admitted draft | `agentTeamRunStore.launchDraft` sequencing `teamRunConfigStore` state transitions | Guarantees topology repair before registration and one continuous preparation-to-launch path |

## Primary Execution Spine(s)

- **DS-001:** `selected root definition -> build root intent -> immutable draft store -> hierarchy/workspace authoring view -> TeamRunConfigForm / TeamMemberConfigTree -> typed edit -> replacement frozen draft`.
- **DS-003:** `GraphQL complete teamConfigs/memberConfigs -> TeamRunService normalization/workspace activation -> TeamDefinitionTopologyPlanner graph/index/exact validation -> configured TeamRun/AgentRun allocator dependencies -> compile -> AgentTeamRunManager`.
- **DS-004:** `runtime TeamRunConfig -> execution-tree builder -> V2 store/catalog -> restore -> runtime TeamRunConfig`.
- **DS-005:** `startup runner or Settings Retry -> V2 migration -> V1 validate/transform -> V2 validate/atomic replace/reread -> ledger -> V2-only catalog`.
- **DS-007:** `mobile/application/external root config (+ application complete Agent configs) -> TeamRunService root expansion -> common planner validation/allocation -> created runtime -> application binding uses returned root ID`.
- **DS-008:** `Run Team -> agentTeamRunStore.launchDraft(exact selected draft) -> store reconcile/plan -> workspaceStore registration adapter -> store commit/revalidate -> readiness -> exact admission -> GraphQL create`.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The store retains explicit root/team/Agent configuration intent plus per-draft Team workspace authoring/operation state. Every edit replaces the exact frozen draft; the UI consumes a derived view and never becomes a topology or workspace-state owner. | Draft, root scope, Team override, Agent override, Team workspace authoring state, configuration view | Draft store | catalog loading, workspace registration, localization, accessibility |
| DS-002 | The pure resolver walks the canonical definition tree once, merges Team overrides recursively, then Agent overrides, and emits complete snapshots and address/kind issues. | Canonical topology, effective Team, resolved Agent | Hierarchy resolver | model/config coherence, stale-address repair |
| DS-003 | The service normalizes complete values and activates unique roots; the planner resolves/indexes the graph, validates every exact Team/Agent fact, then allocates root/nested Team and Agent identities and compiles nodes. | Create command, validated graph/index, identities, runtime config | Service facade / planner compiler | GraphQL adapters, workspace activation, model validation, injected allocators |
| DS-004 | The execution-tree builder copies configured Team defaults and Agent snapshots to V2; restore maps both back without definition defaults or frontend state. | Runtime config, V2 tree, package | Builder/store/manager | catalog/history index, file writer |
| DS-005 | One migration-owned loop classifies each tree, derives every Team default from its direct coordinator, validates V2, commits atomically, rereads, and returns bounded status. | V1 tree, V2 candidate, migration result | V2 migration | runner ledger, manual Retry, V1 promotion sequencing |
| DS-006 | The server emits V2 Team defaults; hydration resolves/deduplicates all referenced workspaces; the factory creates a complete read-only presentation by comparing stored children with stored parents. | V2 DTO, workspace metadata, configuration view | Projector/hydration/factory | GraphQL generated types, stream schema |
| DS-007 | Root-only callers submit one root config; the service expands it across all Team placements and either all Agents or an exact complete Agent list, enters DS-003, and returns the created root. Application persistence derives binding identity from that result. | Root config, optional complete Agent configs, created root, binding record | TeamRunService; application binding adapter after return | SDK contracts, external binding behavior |
| DS-008 | The launch owner asks the store to reconcile configuration and every Team workspace state against current topology before any registration. It executes the typed plan through the existing workspace store, commits each result through the draft owner, revalidates, and admits the latest exact draft. | Draft, topology fingerprint, preparation request/result, repaired or admitted draft | `agentTeamRunStore.launchDraft` + `teamRunConfigStore` state authority | workspace registration/metadata lookup, readiness, files-tab presentation |

## Spine Actors / Main-Line Nodes

- `teamRunConfigStore`: editable draft lifecycle; per-draft exact-Team workspace selection/buffer/operation state; atomic topology repair and canonical workspace replacement.
- `teamRunLaunchHierarchy.ts`: topology reconciliation, effective resolution, and derived presentation.
- `TeamRunConfigForm.vue` / `TeamMemberConfigTree.vue` / `RunConfigPanel.vue`: presentation and typed user commands only; the panel delegates one exact draft to the launch owner and owns no Team map or registration loop.
- `agentTeamRunStore.launchDraft`: single preparation-to-create sequence; executes workspace side effects only from a store-produced plan and admits the latest exact draft.
- `TeamRunService`: public creation boundaries, value normalization, workspace activation, root-only expansion.
- `TeamDefinitionTopologyPlanner`: definition graph authority, exact coverage/kind validation, post-validation configured root/nested Team and Agent identity allocation, runtime compilation.
- `TeamRunConfig` runtime aggregate: immutable current launch hierarchy using the canonical `AgentLaunchConfiguration` value.
- execution-tree builder/schema/store/catalog: current V2 persistence authority.
- `TeamRunExecutionTreeV2AppDataMigration`: historical V1 transformation owner.
- stream projector + web hydration/context factory: current read-only return path.

## Ownership Map

- The web store owns draft identity, mutability, edit sequencing, preparation/in-flight locks, repair notice, per-draft/per-Team workspace selection mode/New buffer/loading/error state, canonical workspace replacement, and topology reconciliation across configuration plus workspace state. It does not perform external registration or recursive inheritance calculations.
- The web hierarchy resolver owns canonical subject validation, parent/nearest-Team precedence, Agent precedence, semantic override normalization, and complete resolved projection. It has no Pinia, Vue, GraphQL, or network dependency.
- UI components own disclosure, labels, interaction, accessibility, and emitting address-specific commands. They must not recursively merge values, retain Team workspace maps, register Team workspaces, or decide topology repair.
- `TeamRunService` owns public full/root-only create workflows, input normalization, unique workspace activation, manager/persistence sequencing, and root-only policy expansion. It does not infer policy from Agents or allocate/accept configured root identity.
- `agentTeamRunStore` owns the web launch sequence but not draft state: it asks the draft store for reconcile/plan/commit transitions and uses `workspaceStore` only as an off-spine registration adapter.
- The planner owns definition graph truth, exact Team/Agent coverage, address/kind validation, configured Team/Agent allocation ordering, and immutable runtime compilation. Its root ID is generated after validation through the same planner-owned allocation phase as descendants.
- Runtime/persistence owners store complete values only; partial override intent never crosses into runtime domain.
- The V2 migration exclusively owns coordinator-based historical reconstruction and exact V1 interpretation.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| GraphQL `createAgentTeamRun` | `TeamRunService` / planner | Transport decode and result envelope | inheritance, workspace activation, topology validation |
| `TeamRunConfigForm.vue` / `RunConfigPanel.vue` | store + hierarchy resolver + launch owner | User presentation, typed event emission, and one launch delegation | mutable draft copy, Team workspace map/registration, recursive policy, second readiness gate |
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
| `RunConfigPanel.teamWorkspaceSelections` and Team `ensurePendingWorkspaceLoadedForRun` branch | Parallel topology-sensitive authority and pre-repair side effect | draft-owned `teamWorkspaceAuthoringByTeamAddress` + `agentTeamRunStore.launchDraft` plan execution | SR-008 Correction | Agent-only workspace preparation remains local to its existing Agent path |
| Store-global selected-context `workspaceLoadingStates` for Team drafts | Leaks transient state outside draft ownership and cannot be reconciled atomically | per-draft Team workspace authoring/operation state | SR-008 Correction | UI receives derived address views |
| `TeamRunService.allocateTeamRunId`, `CreateTeamRunInput.teamRunId`, root-config `teamRunId`, planner `buildPlan.teamRunId` | Caller preallocation violates exact-validation ordering | planner-injected `TeamRunIdentityAllocator` after validation | SR-008 Correction | No compatibility wrapper or optional override |
| Coordinator baseline in web context factory | Fabricates normal runtime meaning | stored V2 Team defaults | In This Change | Coordinator lookup remains only for initial focus |
| `TeamRunV1PackageCatalog` current naming/API | V1 ceases to be current runtime | `TeamRunPackageCatalog` V2-only | In This Change | Rename reset accessor/tests too |
| Current V1 types/schema/store imports inside historical V1 migration | Would couple historical migration to V2 runtime | migration-owned V1 types/validator/builder/mutator/store | In This Change | Retain only under migration folder |
| V1 stream DTO/schema version | Cannot expose Team defaults | one V2 DTO/schema | In This Change | Regenerate checked-in dist; no union |

## Return Or Event Spine(s) (If Applicable)

**DS-006:** `V2 TeamRunExecutionTreeSnapshot -> projectExecutionTree(schema_version 2) -> GraphQL/WebSocket payload -> strict contract parse -> hydrate workspace metadata by referenced root path -> create read-only TeamRunConfigurationView -> RunConfigPanel/TeamRunConfigForm`.

Task/lifecycle event DTOs do not gain Team defaults because configured Team policy changes only in snapshots for this ticket. A future dynamic-topology ticket must define any incremental configuration event rather than overloading existing task events.

## Bounded Local / Internal Spines (If Applicable)

- **Parent owner: web hierarchy resolver.** `root complete -> visit Team -> merge supported override -> emit Team snapshot -> visit children -> merge exact Agent`. This single recursive walk governs precedence and keeps component recursion presentation-only.
- **Parent owner: launch draft store / launch owner (DS-008).** `assert exact draft -> resolve current topology -> reconcile config + workspace states -> emit repaired stop or immutable preparation plan -> begin address operation -> register/dedupe -> commit result atomically -> re-resolve/reconcile -> readiness -> admit latest exact draft`. The store owns state; the launch owner owns sequencing; the workspace store owns registration.
- **Parent owner: planner.** `resolve graph -> build address/kind index -> validate exact Team and Agent maps/definition IDs/skill inheritance -> only then allocate the root configured Team ID, nested Team IDs, and Agent IDs -> compile nodes`. Validation-before-allocation prevents rejected requests from consuming any configured-run identity.
- **Parent owner: V2 migration.** `sorted root -> classify -> transform -> prevalidate -> write -> reread -> record capped disposition`. It stays private in one file; no generic planner/transform framework.

### Team Workspace Draft Lifecycle

`teamRunConfigStore` holds one active preparation token per draft outside the immutable draft value so user edits/context selection can be locked while internal loading/success/error transitions replace that draft. Every token contains the expected draft ID and a topology fingerprint built from the sorted canonical address, kind, and definition identity of every current Team/Agent placement.

| Trigger / State | Store-Owned Transition | Preserved State | Required Result |
| --- | --- | --- | --- |
| No explicit workspace authoring entry | Derive Existing mode from effective canonical config; use its canonical path as the initial inactive New buffer | Canonical config | No duplicate existing workspace ID in transient state |
| User selects New or edits New path | Materialize/replace exact Team entry; clear stale operation error; retain canonical config until registration succeeds | Same draft, same valid address, current buffer | Readiness reflects active New path; no external side effect |
| User selects an existing workspace | Validate exact Team address; atomically replace canonical workspace config; set mode Existing and idle status | Inactive New buffer for this valid address | Existing ID/metadata have one authority in config |
| Launch begins | Lock the draft; reconcile config and all Team workspace entries; return `repaired`, `blocked`, or an immutable plan | Root state and all valid-address active/inactive buffers | `repaired`/`blocked` performs zero registrations and zero create request |
| Before each deduplicated registration | `authorizeWorkspacePreparationRequest(token, currentMemberTree, addresses)` recomputes fingerprint and exact Team kinds | No mutation on success | A topology already stale at the side-effect boundary aborts and repairs before `createWorkspace` |
| Registration succeeds | Token/address/fingerprint check; atomically replace canonical workspace config, transition mode to Existing, preserve New buffer, set operation idle; the derived view reads the canonical path from config | Other address states | Latest frozen draft becomes authoritative |
| Registration fails | Token/address check; retain mode/path and canonical preexisting config; set the same address-scoped error on every request sharing the failed canonical path | User input | No GraphQL create; retry is possible |
| Topology changes after registration began | Completion/final reconciliation rejects stale attachment, prunes invalid state, reports repair, and stops | Valid unrelated state | An already-created unused workspace may remain, but stale config/TeamRun launch cannot occur |
| Nested Team remove/rename/move/kind change | Prune its config override and active/inactive workspace entry; dedupe/sort repair address | Root and all still-valid entries | No retarget; first launch attempt stops visibly |
| Nested Team reset | Remove Team override and workspace authoring/operation entry in one draft replacement | Descendant/other valid state | Reset means inherit parent without hidden scoped workspace intent |
| Real draft/context switch | Select that draft's own aggregate or derive an empty state for a new draft | State in each retained draft only | No cross-draft/context leakage; no broad config watcher |

The topology fingerprint is an internal concurrency guard, not a persisted schema or public API. It complements address/kind reconciliation; it does not replace the canonical member tree.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Runtime/model catalogs | DS-001, DS-002 | Resolver/readiness/UI | Load every referenced effective runtime and validate model availability | Inherited configurations introduce more effective combinations | Silent model substitution or duplicated async policy |
| Workspace authoring/registration/activation | DS-001, DS-008, DS-003, DS-006 | Draft store / web launch owner / service / hydration | Per-draft address selection+operation state; create registration plan; canonical root-path dedupe | Workspace is a Team-scope field with an external registration side effect | Parallel panel authority, stale registration, cross-draft leakage, or repeated activation |
| Accessibility/localization | DS-001 | UI | Textual state/address/level, keyboard disclosures, error association | Approved observable behavior | Policy mixed into domain resolver |
| Topology repair notice | DS-001, DS-002, DS-008 | Store/UI | Atomically prune stale/kind-mismatched config and Team workspace state; show sorted unique addresses before registration/launch | Definition can change after draft creation | Silent retargeting, stale side effect, or repair that one state map bypasses |
| Generated/dist artifacts | DS-003, DS-006, DS-007 | Contract packages | Keep source and checked-in outputs aligned | Repository publishes generated packages | Runtime mismatch despite source correctness |
| Migration diagnostics/retry | DS-005 | Migration/runner | Counts, capped examples, existing manual Retry | Unbounded installation volume | Database/API/log size proportional to roots |

## Ownership Boundaries

The editable-to-resolved boundary is explicit: partial configuration and Team workspace authoring intent never leave the web authoring subsystem. `teamRunConfigStore` is the single state boundary; `agentTeamRunStore` may sequence registration but can mutate no draft state except through typed store transitions. The resolved-to-runtime boundary is explicit: GraphQL/service/planner receive complete Team and Agent records and reject missing/extra/kind-mismatched subjects. The runtime-to-storage boundary is V2-only. The historical-to-current boundary runs before normal catalog admission and is the only place allowed to inspect V1 or infer defaults from coordinators.

Root-only authoring is not a second resolution policy. It is an input mode owned by `TeamRunService`, which expands a root complete value into the same complete planner input used by workspace launch. Root identity is not an application/service input: the planner produces it only after that complete input passes exact validation.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `teamRunConfigStore` draft/workspace commands | immutable draft replacement, per-draft Team workspace state, topology repair, preparation token validation, canonical workspace commit | Team form/panel typed edits and `agentTeamRunStore.launchDraft` | panel-owned Team maps, direct config mutation, workspace result applied without topology/draft token | extend typed commands/results, not a watcher or caller filter |
| `agentTeamRunStore.launchDraft` | reconcile/plan, external registration sequencing, final revalidation, readiness, admission, GraphQL/hydration | `RunConfigPanel` Run action | panel invokes workspace registration/readiness and then launch owner | strengthen this one launch sequence |
| `resolveTeamRunLaunchHierarchy` | recursive merge, address/kind index, complete projection | readiness, catalog sync, store launch projection, editable view | component/root-only ad hoc merge | extend typed result/issues, not another helper |
| `TeamRunService.createTeamRun` | normalize complete inputs, workspace activation, planner | GraphQL full hierarchy | resolver calls planner/manager directly | extend service input |
| `TeamRunService.createTeamRunFromRootConfig` | graph-wide root expansion then common create | mobile-derived backend calls, application, external channel, programmatic presets | caller builds leaf list through planner helper | add explicit optional complete Agent input |
| `TeamDefinitionTopologyPlanner.buildPlan` | graph index, exact coverage/skill validation, configured Team/Agent allocations, compile | TeamRunService only | caller supplies/preallocates root ID or compiles nodes | extend planner input/dependencies, never restore preallocation |
| `TeamRunExecutionTreeStore` | V2 exact validation and atomic writer | normal persistence/restore | normal code reads JSON/V1 directly | extend current V2 store |
| `TeamRunExecutionTreeV2AppDataMigration.execute` | V1 decode/transform/V2 validation/dispositions | migration runner only | catalog/runtime performs coordinator fallback | change migration boundary, never runtime |

## Dependency Rules

1. Vue presentation may depend on store-derived views and typed commands; it may not retain an exact-address Team workspace map, perform Team workspace registration, mutate draft configuration, or own topology repair.
2. `TeamLaunchDraft` owns editable configuration plus `teamWorkspaceAuthoringByTeamAddress`. Canonical existing workspace ID/metadata exist only in `TeamRunConfig`; transient state stores only selection mode, New-path buffer, and operation status so no parallel canonical workspace representation exists.
3. `teamRunConfigStore` alone may replace draft configuration/workspace state, reconcile either against topology, issue repair notice, and validate preparation tokens. `agentTeamRunStore` sequences registration by invoking these transitions; `workspaceStore` only registers/resolves workspace metadata.
4. Readiness/catalog/payload utilities consume the same draft-owned state and pure hierarchy result. `RunConfigPanel` must not overlay a second readiness gate, and no broad config-object watcher may substitute for explicit context or launch transitions.
5. Team overrides may contain runtime/model/`llmConfig`/auto-execute/workspace only. Root owns `skillAccessMode`; new-run resolution copies it into every Team/Agent snapshot. Agent override capabilities remain the current runtime/model/`llmConfig`/auto-execute set.
6. GraphQL/application adapters may translate transport values only; only the service activates server workspaces and only the planner validates definition topology and allocates configured root/nested Team and Agent identities.
7. Planner exact graph/coverage/kind/definition/skill validation completes before any configured root TeamRun, nested TeamRun, or AgentRun identity allocation. `TeamRunService` and application adapters may neither accept nor request a root TeamRun ID. Task-Team identity creation is unchanged and remains outside this configured-create planner.
8. Current domain/schema/store/catalog/projector code may not import migration-owned V1 modules. Migration code may import the current V2 validator/writer as its target boundary.
9. The V2 migration remains registered after V1 promotion and Team Agent memory repair. Later current readers see V2 only.
10. Source packages and checked-in `dist`/generated artifacts change together; no compatibility union or allocation wrapper is emitted.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `TeamLaunchConfigEdit` | draft configuration intent | Root edit, nested Team override/reset, exact Agent override | `/` only for root commands; canonical non-root Team or Agent address per command | Split commands prevent kind ambiguity |
| `TeamWorkspaceAuthoringCommand` | one draft's Team workspace intent/status | Change Existing/New mode or buffer; select existing; begin/complete/fail preparation; reset | exact `draftId` + canonical Team address; preparation completion also requires topology fingerprint/token | Existing workspace ID is written only to canonical config |
| `reconcileAndPlanSelectedDraftLaunch(expectedDraft, memberTree)` | launch preparation state | Lock draft, reconcile all topology-sensitive config/workspace state, and return repaired/blocked/immutable plan | exact selected draft object + canonical topology | Produces no external side effect |
| `authorizeWorkspacePreparationRequest(plan, memberTree, addresses)` | external-side-effect authorization | Revalidate draft token/topology/exact Team subjects immediately before one deduplicated registration | plan token + current topology + one or more exact Team addresses sharing a canonical path | Returns repaired/authorized; caller may invoke `workspaceStore` only after authorized |
| `complete/failWorkspacePreparation(plan, ...)` | draft workspace result | Commit canonical config + derived state or address-scoped errors after external result | plan token + exact Team address(es) + workspace result/error | Revalidates topology; never silently retargets |
| `resolveTeamRunLaunchHierarchy(intent, memberTree)` | launch hierarchy | Validate/resolve complete scopes and Agents | root `/` plus typed canonical tree nodes | Returns issues rather than guessing |
| GraphQL `CreateAgentTeamRunInput.teamConfigs` | configured Team scopes | Complete snapshot for every Team | `teamAddress`, including exactly `/` | No partial fields |
| GraphQL `memberConfigs` | configured Agents | Complete snapshot for every leaf Agent | `memberAddress` + definition ID | Remove unused `workspaceId`; use root path |
| `TeamRunService.createTeamRun` | complete hierarchy command | Normalize/activate and create | Team definition ID + exact Team/Agent arrays; no root TeamRun ID | Full-hierarchy entry |
| `TeamRunService.createTeamRunFromRootConfig` | root-only policy command | Expand root Team defaults and optional complete Agents | root config has no address; Agents use exact addresses; no root TeamRun ID | Returns created root; no coordinator inference |
| `TeamRunIdentityAllocator.allocateForTeamDefinitionName` | configured Team identity | Allocate root/nested TeamRun ID after planner validation | validated Team definition name | Injected into planner; not public on service/application |
| `ApplicationTeamRunLaunch` member mode | application root policy + exact Agents | Carry `teamDefaultConfig` and existing complete `memberConfigs` | definition is resolved by application resource; members use canonical address | Preset mode unchanged in intent |
| `TeamRunExecutionTreeStore.read/write` | V2 tree | Exact current persistence | root TeamRun ID + canonical file path | V2 only |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Typed draft/config workspace commands | Yes | Yes | Low | Separate configuration edits from exact draft+Team workspace transitions |
| Launch preparation plan/token | Yes | Yes | Low | Draft identity + topology fingerprint prevents stale completion |
| Hierarchy resolver | Yes | Yes | Low | Use topology kind index and closed issue codes |
| Full create service | Yes | Yes | Low | Exact complete coverage; no caller-supplied root identity |
| Planner identity allocator boundary | Yes | Yes | Low | Team definition name is allocated only after validated index/coverage |
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
| Immutable draft lifecycle | `teamRunConfigStore.ts` | Extend | Exact snapshot/in-flight invariants are correct; add preparation lock/token and attach Team workspace state to each draft | N/A |
| Team workspace registration | `workspaceStore` under existing `agentTeamRunStore.launchDraft` orchestration | Reuse | Existing store owns registration/metadata; launch owner already governs reconcile/readiness/admission/create | No new pass-through preparation service |
| Effective hierarchy resolution | root-only member builder | Create New | Existing helper erases Team subjects | One new pure owner replaces it |
| Team editor controls | current root runtime/model/workspace controls | Extend | Behavior/accessibility already exists | Extract reusable scope editor |
| Backend compile | topology planner | Extend | Already owns definition graph, nested/Agent allocation, and compile; extend root allocation after validation | N/A |
| Configured Team identity generation | `team-run-id.ts` generator | Reuse behind new injectable allocator | Existing token/name algorithm stays canonical while planner ordering becomes testable | Thin allocator owns invocation boundary, not identity format |
| Atomic file replacement | `TeamRunFileCommitWriter` | Reuse | Correct existing physical boundary | N/A |
| Startup/migration recovery | app-data runner/ledger/Settings Retry | Reuse | Already supplies scheduling and manual retry | N/A |
| V1 interpretation | historical V1 migration folder | Extend | Correct forward-only boundary | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Web Team launch authoring | intent, edits, view, readiness, scoped UI state, workspace preparation state | DS-001, DS-002, DS-008 | store/resolver/launch owner | Extend existing owners | Desktop full hierarchy; mobile root-only; no new service |
| Team create/planning | complete contracts, normalization, root expansion, graph validation, post-validation identity allocation/compile | DS-003, DS-007 | service facade/planner compiler | Extend + one small injected allocator | One common plan path; no public root preallocation |
| Team runtime/persistence | immutable Team defaults, V2 file, restore | DS-004 | runtime aggregate/store | Extend | Complete snapshots only |
| Team transport/history | V2 DTO/projector/hydration/view | DS-006 | projector/factory | Extend | No historical inference |
| Application SDK | explicit root default in member mode | DS-007 | contracts/backend SDK | Extend | Update source/dist |
| App-data migration | V1 isolation and V2 transform | DS-005 | migration definition/runner | Extend + one new migration | Proportionate single-file loop |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/types/agent/TeamRunConfig.ts` | Web authoring | shared types | tight intent, overrides, complete values, presentation | One subject vocabulary | Yes |
| `autobyteus-web/types/agent/TeamLaunchDraft.ts` | Web authoring | draft aggregate/contracts | configuration edits, per-Team workspace authoring state, preparation plan/token/results | All prelaunch topology-sensitive state for one draft shares one vocabulary | Yes |
| `autobyteus-web/utils/teamRunLaunchHierarchy.ts` | Web authoring | resolver | reconcile/resolve/project derived scopes | One recursive policy owner | Yes |
| `autobyteus-web/stores/teamRunConfigStore.ts` | Web authoring | draft owner | frozen drafts, Team workspace commands/views, preparation locks/tokens, atomic config+state reconciliation/repair | Existing lifecycle owner is strengthened rather than paralleled | Yes |
| `TeamScopeConfigEditor.vue` | Web UI | scope editor | reusable root/nested fields plus nested-only disclosure/state/reset chrome | Reuse behavior without forcing identical root/nested presentation | Yes |
| `TeamMemberConfigTree.vue` | Web UI | recursive presentation | Team/Agent hierarchy | Recursion belongs together | Yes |
| `team-run-config.ts` | Server runtime | domain value | common complete config + Team default | Runtime vocabulary | Yes |
| `team-definition-topology-planner.ts` | Server planning | graph/validation/allocation compiler | exact complete coverage then configured root/nested Team + Agent allocation/compile | Existing graph owner becomes truthful for root too | Yes |
| `team-run-identity-allocator.ts` | Server planning | planner dependency | configured Team ID generation behind one injectable contract | Enables ordering proof without exposing service preallocation | `team-run-id.ts` generator |
| `team-run-execution-tree.ts` / schema/store | Persistence | current V2 | complete Team defaults | Existing persistence area | Yes |
| V2 migration file | Migration | historical transform | closed file loop/dispositions | Transformation is small/cohesive | Yes |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Complete runtime/model/config/auto/skill/workspace value | `team-run-config.ts` (`AgentLaunchConfiguration`) | Server Team runtime | It is the executable Agent configuration; a Team stores it as the default for inherited/current/future Agents | Yes | Yes | transport DTO, partial intent, or a falsely Team-specific value type |
| Web complete Team/Agent value | `TeamRunConfig.ts` (`ResolvedTeamRunLaunchConfig`) | Web Team authoring | resolver/view/payload share one meaning | Yes | Yes | mutable store state |
| Recursive precedence | `teamRunLaunchHierarchy.ts` | Web Team authoring | readiness/view/payload must agree | Yes | Yes | Vue/Apollo helper bag |
| Team workspace selection/operation lifecycle | `TeamLaunchDraft.ts` + `teamRunConfigStore.ts` | Web Team authoring | form, readiness, reconciliation, and launch preparation need one exact-address state | Yes — existing workspace ID remains only in config | Yes — removes panel/store parallel maps | generic workspace store or UI-local cache |
| Stream launch DTO/schema | `team-execution-view-dtos.ts` (`LaunchConfigurationDto`) | Team stream contracts | Team and Agent fields identical | Yes | Yes | version union |
| Exact V1 historical structures | migration-owned V1 schema module | App-data migration | retained V1 promotion and V2 transform need one decoder | Yes | Yes | current runtime import |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `TeamRunConfig` editable intent | Yes | Yes | Low | Complete values only at root; partial maps below |
| `TeamWorkspaceAuthoringState` | Yes | Yes | Low | Store mode/New buffer/operation only; derive existing ID/metadata from effective canonical config |
| `TeamWorkspacePreparationPlan` | Yes | Yes | Low | Immutable draft ID + topology fingerprint + exact address/path requests; no duplicated config payload |
| `TeamScopeConfigOverride` | Yes | Yes | Low | workspace stored as one paired selection; property presence distinguishes explicit nullable `llmConfig` |
| `TeamRunConfigurationView` | Yes | Yes | Low | Mark derived/read-only; never write it back as intent |
| `AgentLaunchConfiguration` | Yes | Yes | Low | Use it directly for `ConfiguredAgentExecutionNode.launchConfiguration` and `ConfiguredTeamExecutionNode.defaultLaunchConfiguration`; intersect it into runtime Agent fields only where the existing flat runtime shape remains useful |
| GraphQL complete arrays | Yes | Yes | Low | Backend exact coverage prevents parallel policy meaning |
| V1/V2 schemas | Yes | Yes | Low | V1 exists only under migration; runtime exports only V2 |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/types/agent/TeamRunConfig.ts` | Web authoring | type boundary | `TeamScopeRootConfig`, `TeamScopeConfigOverride`, `AgentConfigOverride`, `TeamRunConfig`, derived view types | One coherent launch vocabulary | N/A |
| `autobyteus-web/types/agent/TeamLaunchDraft.ts` | Web authoring | draft aggregate/command boundary | typed root/Team/Agent edits, per-Team workspace authoring state, preparation plan/result/token, repair notice | All prelaunch state for one draft shares one topology lifecycle | TeamRunConfig/address types |
| `autobyteus-web/utils/teamRunLaunchHierarchy.ts` | Web authoring | policy owner | topology reconciliation, recursive resolution, derived view | One pure hierarchy policy | member-tree and config types |
| `autobyteus-web/utils/teamRunConfigUtils.ts` | Web authoring | field semantics | property-presence/equality/coherence primitives | Small field-local utilities | override types |
| `autobyteus-web/stores/teamRunConfigStore.ts` | Web authoring | lifecycle owner | frozen edits, per-draft Team workspace views/transitions, preparation locks/tokens, topology repair, admission | Existing lifecycle cohesion; one address-state owner | hierarchy resolver + draft types |
| `TeamScopeConfigEditor.vue` | Web UI | reusable editor | shared field/event behavior; nested-only existing group identity, state, disclosure, and reset; no summary | Avoid duplicate control logic while allowing personal-baseline root composition | configuration view |
| `TeamMemberConfigTree.vue` | Web UI | recursive tree | Team scopes and Agent items | One presentation recursion | scope editor/item |
| `MemberOverrideItem.vue` | Web UI | Agent editor | exact Agent override against containing Team | Existing focused responsibility | field utilities |
| `TeamRunConfigForm.vue` / `RunConfigPanel.vue` | Web UI | composition | root + tree + banners; derived workspace views; typed commands; one launch delegation | Existing screen boundaries remain thin | view/store/launch commands |
| `agentTeamRunStore.ts` | Web launch | sequence owner | reconcile/plan/register/commit/revalidate/readiness/admit/create | Existing launch lifecycle, no new pass-through service | store preparation contract + workspaceStore |
| `team-run-service.ts` | Server create | public service | full/root-only create, normalize/activate, manager/persistence; no root preallocation | One lifecycle facade | planner/domain types |
| `team-run-identity-allocator.ts` | Server planning | configured Team identity dependency | root/nested Team ID generation | One injectable concern serving planner ordering | `team-run-id.ts` generator |
| `team-definition-topology-planner.ts` | Server planning | graph/validation/allocation owner | coverage validation then configured Team/Agent allocation and compile | Existing topology owner | common launch value + identity allocators |
| `team-run-config.ts` | Server runtime | domain aggregate | complete value and Team default | One immutable runtime model | N/A |
| `team-run-execution-tree.ts`, schema, store, builder | Persistence | V2 current boundary | write/read/restore Team defaults | Established responsibilities | common snapshot value |
| `team-execution-view-dtos.ts` / projector | Transport | V2 DTO | expose Team defaults | Current strict contract | launch DTO |
| `teamExecutionContextFactory.ts` / hydration | Web history | view owner | stored Team view and workspace metadata | Read-only return path | configuration view |
| migration-owned V1 modules | Migration | legacy boundary | exact V1 decode/build/mutate/package validation | Keep all old-shape knowledge isolated | migration only |
| `team-run-execution-tree-v2-app-data-migration.ts` | Migration | transform owner | classify/transform/commit/report | Latest simplicity convention | V1 decoder + V2 validator/writer |

## Applied Patterns (If Any)

- **Intent versus snapshot:** partial editable intent; complete runtime/persistence values. Team workspace authoring state is transient draft intent and never enters GraphQL/V2.
- **Plan/commit around an external side effect:** the store creates and validates an immutable workspace preparation token; the launch owner executes registration; the store alone commits or fails the address state.
- **Recursive nearest-owner resolution:** one Team-scoped walk, exact Agent merge at leaves.
- **Thin transport adapters:** GraphQL/application/external adapt into service commands only.
- **Forward-only migration boundary:** legacy V1 decoder and coordinator reconstruction exist only in registered migrations.
- **Final-state classification:** writer uncertainty is classified by canonical V2 reread, not by speculative phase state.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/types/agent/TeamRunConfig.ts` | File modify | Web launch model | Replace flat globals/member map with root/team/Agent intent and view types | Existing type authority | recursive algorithm |
| `autobyteus-web/types/agent/TeamLaunchDraft.ts` | File modify | Draft aggregate/contracts | address-specific edits, Team workspace state, plan/token/result, repair notice | Existing draft boundary | UI rendering or workspace-store calls |
| `autobyteus-web/composables/useDefinitionLaunchDefaults.ts` | File modify | Root seeding | Build/clone new root-only intent | Existing definition-default owner | embedded defaults |
| `autobyteus-web/utils/teamRunLaunchHierarchy.ts` | File add | Hierarchy policy | reconcile/resolve/view | New missing policy owner | stores/GraphQL |
| `autobyteus-web/utils/teamRunConfigUtils.ts` | File modify | Field helpers | override presence/equality/coherence | Existing helper area | recursive traversal |
| `autobyteus-web/utils/teamRunMemberConfigBuilder.ts` | File delete | Obsolete | Remove root-only projection | Replaced | compatibility wrapper |
| `autobyteus-web/stores/teamRunConfigStore.ts` | File modify | Draft lifecycle | per-draft workspace authoring/operation state, derived views, prepare/commit/fail/reconcile commands, repair/admission | Existing owner; replaces global/panel maps | external workspace registration or component recursion |
| `autobyteus-web/utils/teamRunLaunchReadiness.ts`; `composables/useTeamRunRuntimeCatalogSync.ts` | Files modify | Validation/catalog | consume resolved hierarchy plus draft-owned active workspace state | Existing concerns | panel-owned readiness overlay or independent precedence |
| `autobyteus-web/components/workspace/config/TeamScopeConfigEditor.vue` | File add | Scope UI | reusable fields/events; no root hierarchy chrome; existing-style nested group with default-collapsed editor/state/reset and no summary | Config component folder | store mutation, common chrome forced onto root, or summary output |
| `.../TeamMemberConfigTree.vue` | File add | Tree UI | recursive Team/Agent presentation | Config component folder | merge policy |
| `.../MemberOverrideTree.vue` | File delete | Obsolete UI | remove display-only Team grouping | Clean cut | alias |
| `.../MemberOverrideItem.vue`; `TeamRunConfigForm.vue`; `RunConfigPanel.vue` | Files modify | UI composition | containing-Team baseline, derived workspace views/events/notices, remove Team map/registration/second readiness gate | Existing screen | policy inference, Team workspace authority, broad watcher |
| `autobyteus-web/stores/agentTeamRunStore.ts` | File modify | Launch orchestration | one exact-draft delegation; reconcile/plan, execute deduped workspace registration, store commit/revalidate, readiness/admit/create | Existing launch boundary | direct draft mutation or UI policy |
| `autobyteus-web/services/teamExecution/teamExecutionContextFactory.ts`; `.../teamExecutionViewState.ts`; `.../teamExecutionTreeSelectors.ts`; `services/runHydration/teamRunContextHydrationService.ts` | Files modify | Read-only view/hydration | Team selectors, stored view, all workspace roots | Existing execution-return area | coordinator default inference |
| `autobyteus-web/localization/messages/en/workspace.ts`; `.../zh-CN/workspace.ts` | Files modify | Localization | nested scope/state/error/repair strings | Existing catalog | hard-coded labels |
| `autobyteus-web/graphql/mutations/agentTeamMutations.ts`; `autobyteus-web/generated/graphql.ts` | Files modify/generated | GraphQL client | complete Team input | Existing transport | partial resolution |
| `autobyteus-application-sdk-contracts/src/index.ts`; checked-in `dist/**` | Files modify/generated | App contract | add `teamDefaultConfig` to member mode | Existing public contract | compatibility optional field |
| `autobyteus-application-backend-sdk/src/launch-profile.ts`; checked-in `dist/**` | Files modify/generated | App SDK adapter | derive explicit root default from profile defaults | Existing builder | coordinator inference |
| `autobyteus-server-ts/src/api/graphql/types/agent-team-run.ts` | File modify | GraphQL facade | `teamConfigs` + Agent configs; drop ignored `workspaceId` | Existing resolver | planning |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts` | File modify | Create service facade | full/root-only commands, path activation/dedupe, manager/persistence; remove root ID API/input | Existing lifecycle owner | identity allocation or public leaf builder |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-identity-allocator.ts` | File add | Planner dependency | allocate configured TeamRun ID by validated Team definition name | Small injectable allocation concern | graph validation or task-Team policy |
| `.../services/team-definition-topology-planner.ts` | File modify | Planner | exact address/kind/coverage/skill validation then root/nested Team and Agent allocate/compile | Existing graph owner | workspace I/O or caller-supplied root ID |
| `.../domain/team-run-config.ts` | File modify | Runtime model | common complete config and Team default | Existing domain | partial overrides |
| `.../services/team-run-execution-tree-builder.ts`; `.../domain/team-run-execution-tree.ts` | Files modify | Persistence mapping/model | V2 defaults and restore | Existing tree owner | V1 union |
| `autobyteus-server-ts/src/run-history/store/team-run-execution-tree-schema.ts`; `.../team-run-execution-tree-store.ts`; `.../services/team-run-state-package-validator.ts` | Files modify | Current persistence | exact V2 schema/store/package | Existing current boundary | V1 fallback |
| `.../services/team-run-v1-package-catalog.ts` and references | File rename/modify | Current catalog | rename to `team-run-package-catalog.ts`, V2-only admission | Current responsibility | V1 classification |
| `autobyteus-team-stream-contracts/src/team-execution-view-dtos.ts`; checked-in `dist/**` | Files modify/generated | Stream contract | schema_version 2 + Team default | Existing strict DTO | V1 union |
| `autobyteus-server-ts/src/services/agent-streaming/team-execution-view-projector.ts` | File modify | Projector | emit stored Team defaults | Existing adapter | inference |
| `autobyteus-server-ts/src/application-orchestration/services/application-run-binding-launch-service.ts` | File modify | App adapter | pass root default/Agent list; persist binding from returned root ID | Existing binding owner | graph expansion or TeamRun ID preallocation |
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
| `autobyteus-web/utils` + `types/agent` | Main-Line Domain-Control | Yes | Low | Pure hierarchy plus tight config/draft/preparation contracts; do not create a folder for one owner |
| `autobyteus-web/stores` + config components | Main-Line Lifecycle / Presentation | Yes after SR-008 | Medium -> Low | Store owns Team address state; launch store sequences; components render/emit only |
| `agent-team-execution/services` identity allocator | Main-Line Planning Concern | Yes | Low | One injectable configured-Team identity concern serves planner; task identity factory remains separate |
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
| Workspace override | `workspace: { workspaceId, workspaceMetadata }` as one optional canonical config field | independent optional `workspaceId` and `workspaceMetadata` fields | Prevents internally divergent partial pairs |
| Team workspace authoring | `{ selectionMode: 'new', newWorkspacePath: '/tmp/research', operation: { status: 'idle', error: null } }`; existing ID derives from effective config | `{ existingWorkspaceId, ... }` duplicated in panel state plus config and separate global loading map | One draft/address owner can reconcile active and inactive buffers atomically |
| Topology repair | Removed `/research` prunes config override and workspace authoring/operation entry, reports `/research`, returns `repaired`, performs zero `createWorkspace` calls | panel enumerates `/research`, creates workspace, then store rejects its stale address | Makes AC-015 precede external side effects |
| Backend request | `teamConfigs` contains `/`, `/research`, `/delivery`; `memberConfigs` contains every leaf | Send partial overrides and ask backend to recreate UI merge | Runtime input stays complete and deterministic |
| Root-only caller | service expands one explicit root config to every Team, planner validates, then returns its generated root ID | choose root coordinator's Agent config or preallocate the root in application code | New runs never infer policy and rejected inputs allocate no configured-run identity |
| Migration | validate V1 -> copy each direct coordinator config -> validate V2 -> atomic write -> reread | backup + journal + phase state machine + V1 runtime fallback | Matches convention and latest simple migrations |
| Historical view | render stored root/nested defaults; derive presentation differences against stored parent | fabricate all Team baselines from root coordinator | Preserves exact reconstructed history, including accepted coordinator edge case |

Illustrative frontend draft-owned workspace shape:

```ts
type TeamWorkspaceAuthoringState = Readonly<{
  selectionMode: 'existing' | 'new';
  newWorkspacePath: string; // active or inactive buffer; never a canonical existing selection
  operation: Readonly<{
    status: 'idle' | 'loading' | 'error';
    error: string | null;
  }>;
}>;

type TeamWorkspacePreparationPlan = Readonly<{
  draftId: TeamLaunchDraftId;
  topologyFingerprint: string;
  requests: readonly Readonly<{ teamAddress: AgentTeamAddress; rootPath: string }>[];
}>;
```

An absent address state derives as Existing mode from that Team's effective canonical configuration. Valid same-draft addresses preserve their New buffer. Reconciliation removes invalid Team addresses from both config and this map in one draft replacement.

Illustrative backend target shapes:

```ts
interface TeamRunIdentityAllocator {
  allocateForTeamDefinitionName(teamDefinitionName: string): string;
}

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
| Keep panel Team workspace map and add stale-address filter/watcher | Small patch | Rejected | draft-store ownership + launch preparation plan; explicit launch/context transitions only |
| Keep public root-ID allocator or optional caller-supplied `teamRunId` | Application convenience/tests | Rejected | planner allocates after validation and application consumes returned ID |
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

1. Add tight draft-owned `TeamWorkspaceAuthoringState`, preparation plan/token/result contracts, and a configured `TeamRunIdentityAllocator` interface. Do not change GraphQL/V2 persistence shapes.
2. Refactor `teamRunConfigStore` so create/select/remove/reset/replace operate on per-draft Team workspace state. Replace the global Team loading map. Make one reconciliation atomically prune config overrides plus active/inactive workspace state, return sorted unique repaired addresses, and preserve root plus valid same-draft buffers.
3. Move Team workspace readiness input to the draft/store getter. Update `TeamRunConfigForm`/`TeamMemberConfigTree`/`RunConfigPanel` to consume derived views and emit commands. Delete `teamWorkspaceSelections`, the Team branch of `ensurePendingWorkspaceLoadedForRun`, manual reset cleanup, and any component-level post-preparation readiness gate. Retain the separate Agent-only workspace path. For the SR-010 presentation delta, restore the personal-branch root composition/spacing/labels, remove all hierarchy-specific root output, extend the existing nested group with a default-collapsed global editor/state/reset, and render no effective/customized-fields summary.
4. Strengthen `agentTeamRunStore.launchDraft`: assert the passed exact selected draft; resolve current topology; ask the store to lock/reconcile/plan; stop visibly on repair/blocked input before any registration; immediately authorize each canonical-path-deduplicated request against the token/current topology; only then call `workspaceStore`; commit success/failure through token-checked store actions; re-resolve/reconcile; then evaluate readiness, admit the latest exact snapshot, project, create, and hydrate. No broad watcher or second caller sequence.
5. Add real-Pinia boundary coverage for root/nested active and inactive New buffers across remove, rename/move, and Team-to-Agent kind change; valid same-draft edit stability; distinct-draft/context isolation; nested reset; deduplicated success; address-scoped failure; and zero registration on repaired topology. Keep focused rendered checks for disabled/error/repair text. Add presentation assertions for personal-baseline root order/labels/no wrapper-chrome, default-collapsed nested editor, actionable scope state/reset, and absence of every effective/customized-fields summary.
6. Inject `TeamRunIdentityAllocator` into `TeamDefinitionTopologyPlanner`. Remove `teamRunId` from `buildPlan`, allocate root from the validated root definition name after all exact checks, and retain nested Team/Agent allocation only in the post-validation compile phase.
7. Remove `TeamRunService.allocateTeamRunId`, `CreateTeamRunInput.teamRunId`, and root-config `teamRunId`; update application launch to call common creation once and persist/use `teamRun.teamRunId`. Do not add a compatibility wrapper.
8. Add planner/service/application tests with spies proving invalid full hierarchy and invalid root-only/application member inputs perform zero configured Team/Agent allocation, zero manager creation, and zero persistence; valid application binding records the returned root identity.
9. Re-run the existing hierarchy, V2 persistence/restore, migration, application/external, frontend focused/render/build suites to prove unchanged owners remain intact. Update implementation handoff/revision evidence.
10. Return through complete code review. Only after source passes may `api_e2e_engineer` rerun exact API-E2E-014 and the broader package; repository-resident durable coverage changes still require proportional code review before delivery.

No temporary compatibility seam may remain. Compile failures at removed panel/service/planner APIs are the intended migration signal.

## Key Tradeoffs

- **Frontend resolves; backend validates.** This avoids serializing partial-property semantics across GraphQL while still preventing a compromised/stale client from inventing topology.
- **Separate derived view from editable intent.** It adds one presentation type but keeps the store semantically tight and lets read-only history display exact stored values, including historical skill/workspace differences that new nested UI cannot author.
- **Put Team workspace authoring state in the draft, not `TeamRunConfig`.** Mode/New buffer/loading/error are required prelaunch UI intent but are not executable policy. Attaching them to the immutable draft gives topology/context ownership without serializing them into GraphQL/V2. Existing workspace identity remains singular in canonical config.
- **Sequence registration in the existing launch owner rather than a new service.** `agentTeamRunStore.launchDraft` already owns reconcile/readiness/admission/create/hydrate; a pass-through preparation service would add indirection. Typed store plan/commit commands keep state authority separate from the external `workspaceStore` side effect.
- **Inject Team identity generation into the planner.** One small dependency enables zero-allocation ordering tests and root/nested consistency. The lower-level ID generator and task-Team factory remain reusable; no generic cross-runtime identity framework is introduced.
- **Complete Team array is redundant with topology but intentional.** Exact one-record-per-Team validation makes policy explicit and future Dynamic AgentTeam defaults durable. Root-only callers avoid payload-building duplication through the service entrypoint.
- **Migration copies the coordinator snapshot.** This may reconstruct a coordinator-specific override as the Team default; the user explicitly accepted it as the most reliable historical evidence.
- **No migration backup/journal.** The existing atomic writer, pre/post validation, deterministic additive target, stable-attempt assumption, and ordinary retry are proportionate. More machinery adds states and I/O without an approved reachable need.

## Risks

1. **Wide cross-package contract cut:** server, web, application SDK, and stream contracts must land together. Mitigation: required fields and source/dist regeneration; no optional compatibility path.
2. **Model-config invalidation drift:** root, Team, and Agent edits could diverge. Mitigation: field-local coherence primitives plus one hierarchy resolver/readiness path; never silently substitute on catalog errors.
3. **Historical read-only ambiguity:** reconstructed defaults represent effective values, not proven old intent. Mitigation: call them reconstructed effective defaults, retain Agent snapshots, and keep coordinator policy documented.
4. **V1 migration coupling:** the existing V1 promoter currently imports normal runtime V1 code. Mitigation: isolate it before current code becomes V2-only and keep migration order explicit.
5. **Large histories:** traversal and file rewrite are linear. Mitigation: sequential/small-loop processing, aggregate counts, and five capped sorted examples per disposition; never retain all diagnostic paths.
6. **Topology changes during a draft:** config or active/inactive Team workspace state could be silently reassigned or cause an external side effect. Mitigation: one atomic address/kind reconciliation before plan creation, token checks before each request commit, a final reconciliation before readiness/admission, sorted repair notice, and zero registration when topology was already stale at launch entry. If topology changes after external creation has begun, the returned result is not attached and no TeamRun launches; unused workspace cleanup is not invented in this ticket.
7. **Draft snapshot churn during async preparation:** loading/success/error transitions replace the draft. Mitigation: launch preparation locks user edits/context changes, every store transition checks draft ID plus plan token/topology fingerprint, and admission uses the latest returned exact snapshot rather than the caller's pre-preparation object.
8. **Allocation regression through convenience APIs:** tests/application code could restore preallocation. Mitigation: delete public/optional root-ID inputs, inject allocators only into the planner, and assert zero allocator calls on invalid full/root-only/application inputs.
9. **Historical workspace metadata resolution cost:** Team and Agent snapshots can repeat roots. Mitigation: cache/dedupe by canonical root path, then map metadata to addresses.

## Guidance For Implementation

- Treat the user-approved `ui-ux-spec.md` as the presentation authority. Reuse root/nested field and event behavior, not redundant visual chrome. The editable root form must preserve the personal-branch sequence/style and render no hierarchy wrapper, “Root Team defaults”, root badge, `/`, scope divider, or summary. The existing nested Team group gains a default-collapsed editor with state/reset and no summary.
- Treat `TeamRunConfig` as immutable executable configuration intent and `TeamLaunchDraft` as the complete prelaunch aggregate. Never mutate config/workspace maps in components and never store a resolved complete hierarchy as editable intent.
- Store Team workspace `selectionMode`, active/inactive `newWorkspacePath`, and operation state per draft/address. Derive `existingWorkspaceId` and metadata from the effective canonical config; do not duplicate them in the workspace authoring state.
- `RunConfigPanel` must call the Team launch owner once with the exact selected draft. It must not call `workspaceStore.createWorkspace`, mutate Team workspace state, reconcile topology, or reevaluate a post-preparation gate.
- Use own-property checks for optional `llmConfig`; `null` is explicit, absence inherits.
- Make workspace override one atomic pair. Payload projection uses `workspaceMetadata.workspaceRootPath`; backend accepts/activates only canonical root paths. Remove GraphQL `workspaceId`, which the current Team service ignores.
- Root `skillAccessMode` is copied into every new effective Team and Agent record. Do not add a nested skill edit or accept nested skill divergence in new workspace requests. Read-only V2 presentation may show a historical reconstructed value exactly as stored.
- Topology reconciliation must classify configuration override maps and Team workspace authoring/operation state against address **and kind**, return one sorted unique repaired-address list, replace the frozen draft through the store, show a localized notice, and refuse registration/admission on that stale launch attempt. Root `/` and all still-valid same-draft active/inactive buffers remain.
- A nested Team reset clears its Team override and its workspace authoring/loading/error entry atomically. A context/draft switch derives state from the selected draft and never reuses another draft's buffer. Do not add a broad watcher on the config object.
- Backend full-create validation must require exactly one Team config per graph Team including `/` and exactly one Agent config per leaf; reject duplicate, noncanonical, unknown, missing, extra, kind-mismatched, wrong Agent-definition, and root-skill-divergent records before invoking either configured TeamRun or AgentRun allocator.
- `TeamRunService` and application code must not expose, accept, or call a root TeamRun allocator. The planner generates the root and nested configured Team identities after validation; application binding uses the root returned from successful common creation.
- Normalize/activate unique workspace roots across both Team and Agent arrays in `TeamRunService`; planner receives complete canonical values and performs no I/O.
- `cloneTeamRunNode`, execution-tree builder/restore, and DTO projector must deep-clone/freeze `llmConfig` for Team defaults exactly as for Agent settings.
- Keep task Team execution shapes unchanged; the new required default belongs to configured root/nested Team nodes. Do not invent a task-event configuration protocol in this ticket.
- In migration code, use a private closed `Disposition` union, count independently of examples, cap each sorted relative-path example list at five, and emit one detail per disposition—not per root.
- Validate V1 and build the whole V2 candidate before calling the writer. After any writer outcome that may have renamed, reread the canonical path. A valid exact V2 is current; anything else is failed. Do not restore from a side copy or probe current definitions.
- Run migration verification only against disposable copies of repository fixtures or synthetic temp directories, never a user profile.
- Update all affected source-owned `dist` and generated GraphQL files with existing package generation commands. Record commands/evidence in the later implementation handoff; the solution designer does not create that artifact.

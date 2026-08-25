# Hierarchical TeamRun Launch Configuration — Design Spec

## Current-State Read

The integrated implementation now delivers the approved hierarchy on its ordinary paths: `TeamRunConfig` represents root, nested-Team, and exact-Agent intent; `teamRunLaunchHierarchy.ts` owns root -> nearest Team -> exact Agent resolution; the workspace UI renders inherited/customized Team scopes; the create contract carries exact Team/Agent coverage; runtime/V2 persistence/restore retain complete Team defaults and Agent snapshots; and historical coordinator reconstruction is confined to the V1-to-V2 migration. SR-008 passed `ARCH-REV-002`, was implemented through IR-008, passed complete implementation review at CRR-012, API/E2E at API-REV-007 (98%), proportional test review at CRR-014, and delivery integration/build through DR-003. During hands-on Electron verification, the user rejected the hierarchy-specific editable-root wrapper/title/badge, visible `/`, divider, and effective summary. A live render of the current `origin/personal`-equivalent root form and nested group established the editable visual baseline; SR-011 approved that additive, no-redesign contract.

CRR-010 exposed one integrated frontend ownership defect. `TeamLaunchDraft` owns immutable configuration and pending Agent inputs, while `teamRunConfigStore` owns configuration reconciliation and a global address-keyed workspace loading map. Separately, `RunConfigPanel.vue` owns `teamWorkspaceSelections`, including active/inactive New-path buffers, and performs workspace registration before calling `agentTeamRunStore.launchDraft`. The stable `team-draft:<draftId>` context deliberately preserves that panel map across same-draft edits. If current definition topology removes, renames, moves, or kind-changes a nested Team, the retained active New selection can be registered and then rejected by `setWorkspaceLoaded` before the launch owner's topology repair executes. CR-008 is therefore a reachable boundary/coordination defect, not a missing filter.

CRR-010 also exposed one backend allocation-boundary defect. `TeamDefinitionTopologyPlanner` validates complete exact coverage before allocating nested Team and Agent identities, but `TeamRunService` allocates or accepts the root `teamRunId` first and passes it into `buildPlan`. Application launch calls the public root allocator even earlier. No invalid run is persisted, but DS-003's validation-before-allocation invariant and planner allocation ownership are false for the root identity. CR-009 requires a clean public-contract correction rather than an extra guard.

Continued verification exposed a second presentation regression (`USER-UX-003`). In `origin/personal`, selecting an existing TeamRun routed its stored configuration through the same `TeamRunConfigForm.vue` with `readOnly=true`; focused tests asserted disabled controls, operable disclosures, and no mutation. The ticket instead added `StoredTeamRunConfigForm.vue`, `StoredTeamRunConfigTree.vue`, and `StoredLaunchConfigurationCard.vue`, so existing-run Settings rendered a separate address-heavy card/key-value inspector. This was reproduced live with the integrated frontend against the user's Electron server on port 29695. SR-012/`ARCH-REV-004` approved one shared form with distinct editable/stored capabilities; IR-010 restored that presentation and deleted all three stored-card components.

`CRR-017` then failed IR-010 at 8.9/10 with two approved-contract defects. First, `TeamRunFormModel.ts` defined one common `TeamScopeFormModel` that imported `TeamWorkspaceOperationState` from `TeamLaunchDraft` and required editable state for stored scopes. Second, whole-schema fallback did not cover partial schema drift. SR-013/`ARCH-REV-005` split the capabilities and defined one historical-field classifier; IR-011 implemented that architecture. CRR-018 then introduced a multiline-string premise without identifying a product producer, and IR-012 added CR/LF-specific classifier/fallback/test behavior. CRR-019 passed that source before the premise was challenged.

API-REV-009 subsequently created two temporary free-text fields, `ordinary_prompt` and `multiline_prompt`, by mutating the owned page's Pinia runtime catalog and placing arbitrary keys in an isolated GraphQLJSON/V2 fixture. The current `codex_app_server` / `gpt-5.6-luna` catalog exposes no free-text setting, and no normal current UI can create those fields. The probe's isolated-carriage-return observation is therefore not a current product defect. CRR-021 rescinds CR-013/MP-CR-010 and voids CRR-020; API-REV-010 passes real current-user paths at 98%.

The immutable data boundary remains correct: `teamExecutionContextFactory.ts` produces `TeamRunConfigurationView` from stored V2 topology and values without current-definition inference. The shared visual form, deleted stored-card components, distinct Team/Agent capability models, and IR-011 per-field/value classifier also remain correct. The retained classifier has a named production path: Codex derives `reasoning_effort` enum values from live `model/list`, users persist those emitted values, and later Settings compares them with the then-current catalog. No current or released producer emits a free-text model field. SR-014 therefore retains IR-011 but removes IR-012's four-file CR/LF-only delta instead of preserving unsupported complexity as a feature. `ARCH-REV-006` validated that behavior and architecture direction but found AR-001: the design did not yet enumerate the cleanup in the mandatory decommission table, and its final hard block still applied to arbitrary injected values. SR-015 corrects that specification coherence only; it adds the explicit removal/fixture-retargeting inventory and scopes every blocking exactness instruction to a named supported current or released producer path while keeping the runtime classifier generic and provenance-free.

The current root-only mobile, application, external-channel, and programmatic launch paths remain supported. V2 runtime/persistence, migration, stream, restore, immutable return projection, workspace lifecycle, the SR-011 editable UI, and SR-013/IR-011 frontend architecture are not redesigned by SR-014 or SR-015.

Detailed current paths, material-premise traces, commands, and reviewer evidence are authoritative in `investigation-notes.md`, BEH-001–BEH-010, API-REV-009's reachability-correction artifact, CRR-021, API-REV-010, ARCH-REV-006/AR-001, and SR-015.

## Intended Change

Retain the implemented hierarchical launch model and the two integrated ownership corrections from SR-008.

For Team workspace authoring, make the selected `TeamLaunchDraft` under `teamRunConfigStore` the single authority for each canonical Team address's selection mode, active or inactive New-path buffer, address-scoped loading/error state, canonical workspace replacement, topology reconciliation, and repair notice. Existing-workspace identity remains in canonical `TeamRunConfig`; it is derived into the UI rather than duplicated in transient selection state. `RunConfigPanel` renders store-derived views and emits typed commands only. On Run, it delegates the exact selected draft once to `agentTeamRunStore`, which sequences store-owned reconciliation and a typed workspace-preparation plan, uses the existing `workspaceStore` only as the registration adapter, commits results through store commands, revalidates topology, evaluates readiness, and admits the latest exact draft. No broad config watcher or silent retarget is introduced.

For backend create, make `TeamDefinitionTopologyPlanner` the configured Team topology's singular validation/allocation compiler. `buildPlan` resolves/indexes the graph and validates exact Team/Agent coverage and inherited skill policy before asking injected TeamRun or AgentRun identity allocators for any identity. The service/application contracts no longer accept or expose root TeamRun preallocation. `TeamRunService` remains the public full/root-only lifecycle facade, while application binding materializes its runtime record from the successfully created `teamRun.teamRunId`.

The already-implemented complete Team/Agent request, runtime, V2 persistence, migration, return projection, and root-only expansion contracts remain unchanged.

For SR-009/SR-010/SR-011 editable presentation, keep field composition reusable but let the root and nested wrappers serve their different information needs. `TeamRunConfigForm` preserves the `origin/personal` sequence and quiet styling: Team Definition proceeds directly to root runtime/model/model-config/workspace/auto-execute fields and the existing `Team Members Override (N)` disclosure. It does not render a hierarchy wrapper card, root-scope title/badge, `/`, divider, or effective summary. A nested disclosure extends the existing group identity/indentation treatment, defaults collapsed, retains inherited/customized state and conditional Reset, and renders the real controls on expansion. No effective or customized-fields summary exists in either disclosure state.

For SR-012/SR-013 stored presentation, keep `TeamRunConfigForm` as the singular rendered form owner for both modes. `RunConfigPanel` chooses `EditableTeamRunFormModel` for a selected launch draft or `StoredTeamRunFormModel` for a selected existing TeamRun. The modes share only neutral display subjects such as address, name, complete effective value, and comparison-derived customized state. Each Team and Agent node remains discriminated all the way to its renderer.

`EditableTeamScopeFormModel` exclusively contains `inheritedConfig`, `override`, `WorkspaceSelectionState`, `TeamWorkspaceOperationState`, editable runtime-catalog operation state, and typed command capability. `StoredTeamScopeFormModel` exclusively contains exact complete stored config and `StoredWorkspaceDisplay`; it has no authoring selection, override, workspace operation, draft catalog operation, or command capability. The same split applies to Agent nodes: editable Agents receive baseline/override/catalog authoring capability, while stored Agents receive exact complete config and stored workspace display. The stored type/projector module must not import `TeamLaunchDraft`, `WorkspaceSelectionState`, `teamRunConfigStore` catalog-operation types, or editable override types. Shared Vue components accept a discriminated model/subject and narrow by `mode`; they may not replace absent capabilities with defaults or sentinels.

For supported historical fields, keep the implemented pure `projectHistoricalModelConfigFields(storedConfig, currentSchema)` owner. It classifies each persisted key/value independently. If the current field can represent the exact persisted value, the existing disabled control renders it. If a legitimately persisted key from a previously supported catalog is absent from the current schema, or its formerly supported value is no longer representable, one compact fallback row renders the exact key/value in the same Advanced/model-config region. Current-schema order remains for normal fields; residual stored-only keys are stably sorted; each persisted key appears exactly once. Whole-schema absence is the degenerate case for a legitimately historical model. Current defaults never replace an explicit supported stored value.

SR-014 does not require product code to identify provenance that the V2 payload does not record. The retained IR-011 classifier may continue to show unknown/stale values defensively through its ordinary schema/value rules. It must not carry dedicated CR/LF behavior for a field no supported producer emits. A browser-mutated catalog, direct arbitrary GraphQLJSON injection, or invented future/custom field cannot establish a blocking current-path defect. When a provider actually introduces a new field shape, that provider/catalog change must define its UI representation and add its own current-path browser coverage.

This is visual reuse without capability conflation: editable mode continues to use draft intent, current definition topology, store-owned workspace authoring state, and typed commands; stored mode uses immutable stored view/topology/effective values plus neutral current-schema representability references. Neither mode writes through or fabricates the other's model. The exact visual/journey contract remains user-approved through SR-012. SR-015 requires architecture confirmation, bounded implementation removal of IR-012-only code/tests, complete source review, and downstream confirmation against the already-green real-user coverage basis.

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
| BEH-010 | User | R-042–R-044; AC-035–AC-038 | Select an existing TeamRun/member and open Settings | Investigation BEH-010; USER-UX-003; CRR-021; API-REV-010 | Keep the shared form/hierarchy, distinct stored subject capabilities, and exact supported product-originated history. Synthetic catalog/JSON injection is out of scope and creates no product UI obligation. | V2 snapshot -> immutable configuration view -> stored-only form model -> discriminated shared form/tree/controls -> supported historical representability projector; DS-006 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `tickets/in-progress/hierarchical-team-run-launch-config/ui-ux-spec.md` | Origin-personal editable/stored visual baseline, distinct capability rule, supported-history fallback behavior, journeys, wireframes, responsive/accessibility rules, and explicit removed output | R-001–R-010, R-038–R-044; AC-001–AC-008, AC-031–AC-038 | Governs the shared-form frontend presentation delta without promoting synthetic test fields into product UI | User-approved through SR-012; applicability clarified through SR-014; SR-015 architecture re-review pending |
| `tickets/in-progress/hierarchical-team-run-launch-config/hierarchical-launch-configuration-behavior.md` | Canonical hierarchy, editable/stored UI states, field participation, surface semantics, and migration behavior | R-001–R-044; AC-001–AC-038 | Governs user-visible and cross-surface behavior implemented by the owners below | Functional behavior approved on 2026-08-24; editable and stored presentation approved on 2026-08-25 |
| `tickets/in-progress/hierarchical-team-run-launch-config/team-execution-tree-v2-contract.md` | Exact TypeScript structure, materialization rules, realistic V2 JSON, and V1 conversion table | R-021–R-031, R-035, R-037; AC-016–AC-023, AC-030 | Governs the concrete execution-tree schema and examples used by persistence, migration, transport, and restore work | User-approved semantics; reconstructed after disk recovery; semantic equivalence confirmed by `ARCH-REV-001` |
| `tickets/in-progress/hierarchical-team-run-launch-config/recovery-audit.md` | Archive/base/hash evidence and exact missing-path inventory | N/A | Establishes recovery provenance and the safe workflow restart point; it does not govern target behavior | Evidence only / approval N/A |

## Task Design Health Assessment (Mandatory)

- Change posture: `Requirement Applicability Clarification + Speculative Complexity Removal` within the completed hierarchical behavior change
- Current design issue found: `No new product-source design issue`
- Root cause classification: `Synthetic Reachability Overclassification`; the prior boundary/capability and supported historical-representability defects are resolved by IR-011 and remain resolved under CRR-021
- Refactor needed now: `No`
- Evidence: API-REV-009's correction proves both free-text fields and their catalog entries were invented in an owned page/isolated V2 fixture. `git show 003413b05` shows IR-012's only product effect is CR/LF classification plus whitespace CSS; its added tests use those invented fields. The current Codex Luna catalog has no free-text field, so none has a supported producer.
- Design response: retain IR-011's shared-form capability architecture and producer-grounded dynamic enum/schema-drift classifier. Remove IR-012's `canTextInputRepresentExactly`/CR-LF branch, `whitespace-pre-wrap`, and synthetic ordinary/multiline fixtures/assertions. Constrain R-044/AC-038 and downstream blocking evidence to product-originated configurations accepted by a supported catalog/launch path.
- Refactor rationale: retaining dead-path CR/LF machinery as “robustness” would preserve complexity created entirely by an invalid test premise. The future provider that introduces a real free-text field must own its UI/control and browser coverage.
- Unchanged owners: draft/store/workspace lifecycle, hierarchy resolution, launch orchestration, backend validation/allocation, complete transport/runtime/V2 persistence, migration-only V1 interpretation, immutable stored return projection, and root-only policy expansion remain healthy and are not redesigned.
- Intentional deferrals and residual risk: live post-launch topology mutation and Dynamic AgentTeam consumption remain separate tickets. A topology change that occurs after an external workspace-create request has begun can cause an unused registered workspace, but post-return reconciliation prevents stale config attachment or TeamRun launch; no rollback/delete policy is introduced without an approved workspace-transaction contract. Actual repository-resident coverage choices remain with `api_e2e_engineer` after implementation/code review.

## Terminology

- **Root configuration:** the complete TeamRun scope at canonical address `/`.
- **Team override:** partial editable intent for one nested Team placement; absence means inherit its parent.
- **Effective Team configuration:** the complete snapshot after merging the parent effective configuration with the Team override.
- **Agent override:** partial intent for exactly one Agent placement; it applies after the containing Team's effective configuration.
- **Launch hierarchy:** the resolved definition topology paired with complete Team and Agent launch configurations.
- **Configuration view:** a derived presentation model containing complete effective scope/Agent values and explicit/inherited metadata. It is not editable intent.
- **Editable form capability:** a Team/Agent subject model that may carry partial overrides, authoring workspace selection/operation state, catalog operation state, and typed commands.
- **Stored form capability:** a Team/Agent subject model that carries complete immutable stored values and stored workspace display only; it has no authoring state or command surface.
- **Supported historical representability:** whether one exact product-originated persisted field value, accepted by a supported catalog/launch path when written, can be rendered by its current field schema without substitution. It is evaluated per key/value, not per model or whole schema.
- **Historical residual:** one legitimately historical persisted key/value that the current schema can no longer represent; it renders as a compact read-only fallback in the ordinary field region.
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
- Remove `StoredTeamRunConfigForm.vue`, `StoredTeamRunConfigTree.vue`, and `StoredLaunchConfigurationCard.vue`; selected-existing TeamRuns use the shared `TeamRunConfigForm` in stored read-only mode.
- Replace the common authoring-shaped `TeamScopeFormModel` and stored sentinel construction with distinct editable/stored scope and Agent capabilities. Do not preserve an alias that reintroduces mandatory common authoring fields.
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
| DS-006 | Return-Event | BEH-007, BEH-010 | V2 runtime/history tree | Shared-form read-only hierarchical configuration with exact supported historical residuals | Stream projector -> web hydration/context factory -> stored-only form adapter -> discriminated shared Team form -> per-field/value representability projector | Presents product-originated stored truth through the same visual language without importing/fabricating authoring capabilities or substituting current defaults; arbitrary synthetic fields are outside blocking acceptance authority |
| DS-007 | Primary End-to-End | BEH-008 | Root-only preset/application launch | Created root plus optional application binding record | `TeamRunService.createTeamRunFromRootConfig` -> planner; application adapter consumes result | Preserves compact surfaces, centralizes semantics, and forbids application root preallocation |
| DS-008 | Primary End-to-End | BEH-004, BEH-009 | One Run Team activation with zero or more active New workspace paths | Repaired stop, address-scoped failure, or exact admitted draft | `agentTeamRunStore.launchDraft` sequencing `teamRunConfigStore` state transitions | Guarantees topology repair before registration and one continuous preparation-to-launch path |

## Primary Execution Spine(s)

- **DS-001:** `selected root definition -> build root intent -> immutable draft store -> hierarchy/workspace authoring view -> TeamRunConfigForm / TeamMemberConfigTree -> typed edit -> replacement frozen draft`.
- **DS-003:** `GraphQL complete teamConfigs/memberConfigs -> TeamRunService normalization/workspace activation -> TeamDefinitionTopologyPlanner graph/index/exact validation -> configured TeamRun/AgentRun allocator dependencies -> compile -> AgentTeamRunManager`.
- **DS-004:** `runtime TeamRunConfig -> execution-tree builder -> V2 store/catalog -> restore -> runtime TeamRunConfig`.
- **DS-005:** `startup runner or Settings Retry -> V2 migration -> V1 validate/transform -> V2 validate/atomic replace/reread -> ledger -> V2-only catalog`.
- **DS-006:** `V2 snapshot -> strict projection/hydration -> immutable TeamRunConfigurationView -> StoredTeamRunFormModel with StoredTeamScope/Agent nodes -> TeamRunConfigForm / TeamMemberConfigTree discriminated narrowing -> projectHistoricalModelConfigFields(exact stored map, current schema) -> disabled controls + exact residual rows`.
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
| DS-006 | The server emits V2 Team defaults; hydration resolves/deduplicates referenced workspaces; the factory creates a complete immutable view; a stored-only adapter projects Team/Agent/workspace display capabilities; shared components narrow by mode; the generic historical-field projector applies IR-011 schema/enum/type classification. For named supported producer paths, representable values use normal disabled fields and stale/removed values use exact residuals. | V2 DTO, workspace metadata, configuration view, stored scope/Agent model, historical field presentation | Projector/hydration/factory + stored adapter + shared form + pure representability projector | GraphQL generated types, stream schema, neutral catalog/schema snapshots, localization/accessibility |
| DS-007 | Root-only callers submit one root config; the service expands it across all Team placements and either all Agents or an exact complete Agent list, enters DS-003, and returns the created root. Application persistence derives binding identity from that result. | Root config, optional complete Agent configs, created root, binding record | TeamRunService; application binding adapter after return | SDK contracts, external binding behavior |
| DS-008 | The launch owner asks the store to reconcile configuration and every Team workspace state against current topology before any registration. It executes the typed plan through the existing workspace store, commits each result through the draft owner, revalidates, and admits the latest exact draft. | Draft, topology fingerprint, preparation request/result, repaired or admitted draft | `agentTeamRunStore.launchDraft` + `teamRunConfigStore` state authority | workspace registration/metadata lookup, readiness, files-tab presentation |

## Spine Actors / Main-Line Nodes

- `teamRunConfigStore`: editable draft lifecycle; per-draft exact-Team workspace selection/buffer/operation state; atomic topology repair and canonical workspace replacement.
- `teamRunLaunchHierarchy.ts`: topology reconciliation, effective resolution, and derived presentation.
- `TeamRunConfigForm.vue` / `TeamMemberConfigTree.vue` / `TeamScopeConfigEditor.vue` / `MemberOverrideItem.vue`: singular editable/stored form presentation. Editable mode emits typed commands; stored mode receives complete immutable values and emits none.
- `EditableTeamRunFormModel` / `EditableTeamScopeFormModel` and editable Agent nodes: authoring-only form capabilities projected from the real draft/store/resolver state.
- `StoredTeamRunFormModel` / `StoredTeamScopeFormModel` and stored Agent nodes: history-only display capabilities projected from `TeamRunConfigurationView`; no authoring-state imports or sentinels.
- `projectHistoricalModelConfigFields`: pure, provenance-free current-schema comparison owner using retained IR-011 rules; producer-backed stale/removed values receive exact residual presentation without mutation/default substitution.
- `RunConfigPanel.vue`: chooses editable-draft or stored-view adapter, displays the common form, and delegates one exact editable draft to the launch owner; it owns no Team map, registration loop, or alternate stored card tree.
- `agentTeamRunStore.launchDraft`: single preparation-to-create sequence; executes workspace side effects only from a store-produced plan and admits the latest exact draft.
- `TeamRunService`: public creation boundaries, value normalization, workspace activation, root-only expansion.
- `TeamDefinitionTopologyPlanner`: definition graph authority, exact coverage/kind validation, post-validation configured root/nested Team and Agent identity allocation, runtime compilation.
- `TeamRunConfig` runtime aggregate: immutable current launch hierarchy using the canonical `AgentLaunchConfiguration` value.
- execution-tree builder/schema/store/catalog: current V2 persistence authority.
- `TeamRunExecutionTreeV2AppDataMigration`: historical V1 transformation owner.
- stream projector + web hydration/context factory: immutable stored truth owner; the shared form is its read-only consumer, not an editor.

## Ownership Map

- The web store owns draft identity, mutability, edit sequencing, preparation/in-flight locks, repair notice, per-draft/per-Team workspace selection mode/New buffer/loading/error state, canonical workspace replacement, and topology reconciliation across configuration plus workspace state. It does not perform external registration or recursive inheritance calculations.
- The web hierarchy resolver owns canonical subject validation, parent/nearest-Team precedence, Agent precedence, semantic override normalization, and complete resolved projection. It has no Pinia, Vue, GraphQL, or network dependency.
- UI components own disclosure, labels, interaction, accessibility, and emitting address-specific commands. They must not recursively merge values, retain Team workspace maps, register Team workspaces, or decide topology repair.
- The shared Team form owns visual composition in both modes. A mode adapter may normalize data shape for display, but only editable mode may expose commands/actions. Stored mode must use view-derived topology and complete values directly and may not consult the current definition or draft store.
- Neutral shared form types own display-only identity/value vocabulary. Editable and stored capability modules own their nonshared fields. A Vue renderer narrows the discriminated subject before touching override/workspace-operation/catalog-operation properties; default props must not synthesize missing capabilities.
- The historical representability projector owns generic comparison of stored `llmConfig` entries against the current schema. `ModelConfigAdvanced` renders its classified rows; for named supported producer paths it must not independently resolve an explicit stale stored value through editable-default semantics. No provenance machinery is added for arbitrary injected/future fields.
- `TeamRunService` owns public full/root-only create workflows, input normalization, unique workspace activation, manager/persistence sequencing, and root-only policy expansion. It does not infer policy from Agents or allocate/accept configured root identity.
- `agentTeamRunStore` owns the web launch sequence but not draft state: it asks the draft store for reconcile/plan/commit transitions and uses `workspaceStore` only as an off-spine registration adapter.
- The planner owns definition graph truth, exact Team/Agent coverage, address/kind validation, configured Team/Agent allocation ordering, and immutable runtime compilation. Its root ID is generated after validation through the same planner-owned allocation phase as descendants.
- Runtime/persistence owners store complete values only; partial override intent never crosses into runtime domain.
- The V2 migration exclusively owns coordinator-based historical reconstruction and exact V1 interpretation.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| GraphQL `createAgentTeamRun` | `TeamRunService` / planner | Transport decode and result envelope | inheritance, workspace activation, topology validation |
| `TeamRunConfigForm.vue` / `RunConfigPanel.vue` | editable store/hierarchy/launch owner or immutable stored view, selected by mode | One user presentation, editable typed events/launch only when applicable, stored read-only inspection otherwise | mutable draft copy, Team workspace map/registration, recursive policy, second readiness gate, alternate stored visual tree |
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
| `StoredTeamRunConfigForm.vue` | Duplicates the entire form presentation for selected existing TeamRuns | `TeamRunConfigForm.vue` with a stored read-only adapter | SR-012 Correction | Delete after shared-form parity coverage; no alias/wrapper |
| `StoredTeamRunConfigTree.vue` | Creates a history-only hierarchy and address-heavy labels | `TeamMemberConfigTree.vue` driven by stored view-derived topology | SR-012 Correction | Stored topology remains authoritative; only presentation is shared |
| `StoredLaunchConfigurationCard.vue` | Replaces actual controls with key/value cards and raw-ish model config | `TeamScopeConfigEditor.vue` / `MemberOverrideItem.vue` disabled controls plus field-local fallbacks | SR-012 Correction | Do not restyle or retain as fallback |
| Common authoring-shaped `TeamScopeFormModel` plus stored `workspaceSelection`, `override: null`, idle workspace/catalog objects | Makes stored history depend on mutable-authoring owner concepts | neutral `TeamScopeDisplayFields` + distinct `EditableTeamScopeFormModel` / `StoredTeamScopeFormModel` | SR-013 Correction | No alias or optional kitchen-sink replacement |
| Whole-schema-only historical fallback condition | Hides removed keys and substitutes stale explicit values when a partial current schema remains | `projectHistoricalModelConfigFields` union-of-persisted/current-key classification | SR-013 Correction | Whole-schema absence uses the same residual algorithm, not a second path |
| `canTextInputRepresentExactly` plus CR/LF-specific branches in `historicalModelConfigFields.ts` | No current or released model-config producer emits a free-text field; the branches were added only for a synthetic premise | Restore IR-011's schema/enum/type scalar classification in `projectHistoricalModelConfigFields` | SR-014 Correction | Delete outright; no compatibility helper, feature flag, or provenance branch |
| `whitespace-pre-wrap` added to `HistoricalModelConfigFallback.vue` solely for multiline prompt values | The only motivating LF/CR values came from invented prompt fields | Restore the ordinary compact IR-011 residual styling | SR-014 Correction | Do not replace it with isolated-CR markup or another whitespace mechanism |
| Synthetic ordinary/LF/CR fixtures and assertions in `historicalModelConfigFields.spec.ts` and `StoredTeamScopeHistoricalFields.spec.ts` | Test setup invented its own catalog fields and initiating state | Remove those cases; retain coverage only for independently established emitted-field paths | SR-014 Correction | No synthetic CR browser rerun or renamed equivalent |
| Invented retained field names such as `removed_parameter` and `legacy_shape` in classifier/Team/Agent tests | They obscure the independent production witness and can be mistaken for product settings | Retarget the same stale-value/removed-field assertions to emitted `reasoning_effort` and optional `service_tier=fast` paths | SR-014 Correction | Test mechanics remain; fixture premise becomes production-grounded |
| `TeamRunService.allocateTeamRunId`, `CreateTeamRunInput.teamRunId`, root-config `teamRunId`, planner `buildPlan.teamRunId` | Caller preallocation violates exact-validation ordering | planner-injected `TeamRunIdentityAllocator` after validation | SR-008 Correction | No compatibility wrapper or optional override |
| Coordinator baseline in web context factory | Fabricates normal runtime meaning | stored V2 Team defaults | In This Change | Coordinator lookup remains only for initial focus |
| `TeamRunV1PackageCatalog` current naming/API | V1 ceases to be current runtime | `TeamRunPackageCatalog` V2-only | In This Change | Rename reset accessor/tests too |
| Current V1 types/schema/store imports inside historical V1 migration | Would couple historical migration to V2 runtime | migration-owned V1 types/validator/builder/mutator/store | In This Change | Retain only under migration folder |
| V1 stream DTO/schema version | Cannot expose Team defaults | one V2 DTO/schema | In This Change | Regenerate checked-in dist; no union |

## Return Or Event Spine(s) (If Applicable)

**DS-006:** `supported product-written V2 TeamRunExecutionTreeSnapshot -> projectExecutionTree(schema_version 2) -> GraphQL/WebSocket payload -> strict contract parse -> hydrate workspace metadata by referenced root path -> create immutable TeamRunConfigurationView -> projectStoredTeamRunFormModel(view) -> StoredTeamScope/Agent nodes -> RunConfigPanel -> TeamRunConfigForm(readOnly) -> shared tree/subject narrowing -> projectHistoricalModelConfigFields(stored llmConfig, current schema) -> disabled current controls + exact residual rows`.

`projectStoredTeamRunFormModel` is a pure presentation adapter, not a second domain model or reverse migration. It preserves stored addresses, parent/child order, complete Team/Agent values, comparison-derived state, and stored workspace display. It supplies no `TeamRunConfig`, `TeamLaunchDraft`, `WorkspaceSelectionState`, `TeamWorkspaceOperationState`, editable override, draft catalog operation, current definition, or mutation callback. Current schema data is intentionally absent from this adapter: it is a later read-only presentation reference and must never normalize the stored model. Because V2 does not record field provenance, the adapter need not reject arbitrary JSON; the supported-path boundary belongs to acceptance/routing, not runtime branching.

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
| Runtime/model catalogs and schema snapshots | DS-001, DS-002, DS-006 | Resolver/readiness/UI | Validate editable combinations; in stored mode serve only as neutral representability references for exact IDs and model-config key/values | Inherited and historical configurations introduce more effective combinations | Authoring catalog state leaks into history, silent substitution, hidden key/value, or whole-screen fallback inspector |
| Workspace authoring/registration/activation | DS-001, DS-008, DS-003, DS-006 | Draft store / web launch owner / service / hydration | Per-draft address selection+operation state; create registration plan; canonical root-path dedupe | Workspace is a Team-scope field with an external registration side effect | Parallel panel authority, stale registration, cross-draft leakage, or repeated activation |
| Accessibility/localization | DS-001, DS-006 | UI | Textual state/level, keyboard disclosures, error association, read-only explanation, unavailable historical-value notice | Approved observable behavior | Policy mixed into domain resolver or inaccessible disabled-only screen |
| Topology repair notice | DS-001, DS-002, DS-008 | Store/UI | Atomically prune stale/kind-mismatched config and Team workspace state; show sorted unique addresses before registration/launch | Definition can change after draft creation | Silent retargeting, stale side effect, or repair that one state map bypasses |
| Generated/dist artifacts | DS-003, DS-006, DS-007 | Contract packages | Keep source and checked-in outputs aligned | Repository publishes generated packages | Runtime mismatch despite source correctness |
| Migration diagnostics/retry | DS-005 | Migration/runner | Counts, capped examples, existing manual Retry | Unbounded installation volume | Database/API/log size proportional to roots |

## Ownership Boundaries

The editable-to-resolved boundary is explicit: partial configuration and Team workspace authoring intent never leave the web authoring subsystem. `teamRunConfigStore` is the single state boundary; `agentTeamRunStore` may sequence registration but can mutate no draft state except through typed store transitions. The resolved-to-runtime boundary is explicit: GraphQL/service/planner receive complete Team and Agent records and reject missing/extra/kind-mismatched subjects. The runtime-to-storage boundary is V2-only. The historical-to-current boundary runs before normal catalog admission and is the only place allowed to inspect V1 or infer defaults from coordinators. The stored-data-to-presentation boundary is also explicit: `TeamRunConfigurationView` remains immutable stored truth, `projectStoredTeamRunFormModel` emits only stored capabilities, and the current schema participates later only as a neutral display comparison. Visual reuse never routes history through editable draft intent or fills missing stored capabilities with authoring sentinels.

Root-only authoring is not a second resolution policy. It is an input mode owned by `TeamRunService`, which expands a root complete value into the same complete planner input used by workspace launch. Root identity is not an application/service input: the planner produces it only after that complete input passes exact validation.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `teamRunConfigStore` draft/workspace commands | immutable draft replacement, per-draft Team workspace state, topology repair, preparation token validation, canonical workspace commit | Team form/panel typed edits and `agentTeamRunStore.launchDraft` | panel-owned Team maps, direct config mutation, workspace result applied without topology/draft token | extend typed commands/results, not a watcher or caller filter |
| `agentTeamRunStore.launchDraft` | reconcile/plan, external registration sequencing, final revalidation, readiness, admission, GraphQL/hydration | `RunConfigPanel` Run action | panel invokes workspace registration/readiness and then launch owner | strengthen this one launch sequence |
| `resolveTeamRunLaunchHierarchy` | recursive merge, address/kind index, complete projection | readiness, catalog sync, store launch projection, editable view | component/root-only ad hoc merge | extend typed result/issues, not another helper |
| `projectStoredTeamRunFormModel` | view-derived stored topology, complete stored scope/Agent values, stored workspace display, comparison-derived customized state | `RunConfigPanel` selected-existing branch / shared form | current definition lookup, draft conversion, override reconstruction, `WorkspaceSelectionState`, workspace/catalog operation sentinels, mutation callbacks | extend distinct stored scope/node types, not common authoring-shaped fields |
| `projectHistoricalModelConfigFields` | generic union of persisted entries and current schema, retained IR-011 classification, deterministic normal/residual rows | shared root/nested/Agent model-config renderers in stored mode | whole-schema boolean, iteration of current keys only, editable default resolver applied to a producer-backed stale value | extend the closed presentation union/reason codes only for a separately established supported path, not component-local or speculative conditions |
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
5. `TeamRunConfigForm` and its tree/field children are the singular rendered configuration presentation. Every root/Team/Agent subject remains discriminated as editable or stored through the renderer boundary; a standalone stored form/tree/card path and a common kitchen-sink subject model are both forbidden.
6. Stored mode depends on `TeamRunConfigurationView` and stored workspace metadata only. `StoredTeamScopeFormModel`, stored Agent nodes, and `projectStoredTeamRunFormModel` must not import or contain `TeamLaunchDraft`, `WorkspaceSelectionState`, `TeamWorkspaceOperationState`, editable override types, `teamRunConfigStore` catalog-operation types, or mutation/reset/launch commands. Stored components must not synthesize null/idle/default versions of those facts.
7. Editable models alone carry override, inherited baseline needed for editing, workspace selection/buffer/operation, editable catalog operation, and command capabilities. Neutral shared display fields are limited to identity, complete effective value, comparison-derived state, and other facts that mean the same thing in both modes.
8. Shared stored fields are disabled but disclosures remain operable. Historical model-config projection remains generic and provenance-free, using the union of current-schema and persisted keys. For a value produced by a named supported current/released catalog and normal launch path, a normal control is used when the retained IR-011 schema/enum/type rules represent it; otherwise one residual fallback preserves it. Supported removed keys and stale enum values remain exact; current defaults never replace those supported explicit stored values. Arbitrary injected/future fields do not create a blocking acceptance obligation.
9. Team overrides may contain runtime/model/`llmConfig`/auto-execute/workspace only. Root owns `skillAccessMode`; new-run resolution copies it into every Team/Agent snapshot. Agent override capabilities remain the current runtime/model/`llmConfig`/auto-execute set.
10. GraphQL/application adapters may translate transport values only; only the service activates server workspaces and only the planner validates definition topology and allocates configured root/nested Team and Agent identities.
11. Planner exact graph/coverage/kind/definition/skill validation completes before any configured root TeamRun, nested TeamRun, or AgentRun identity allocation. `TeamRunService` and application adapters may neither accept nor request a root TeamRun ID. Task-Team identity creation is unchanged and remains outside this configured-create planner.
12. Current domain/schema/store/catalog/projector code may not import migration-owned V1 modules. Migration code may import the current V2 validator/writer as its target boundary.
13. The V2 migration remains registered after V1 promotion and Team Agent memory repair. Later current readers see V2 only.
14. Source packages and checked-in `dist`/generated artifacts change together; no compatibility union or allocation wrapper is emitted.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `TeamLaunchConfigEdit` | draft configuration intent | Root edit, nested Team override/reset, exact Agent override | `/` only for root commands; canonical non-root Team or Agent address per command | Split commands prevent kind ambiguity |
| `TeamWorkspaceAuthoringCommand` | one draft's Team workspace intent/status | Change Existing/New mode or buffer; select existing; begin/complete/fail preparation; reset | exact `draftId` + canonical Team address; preparation completion also requires topology fingerprint/token | Existing workspace ID is written only to canonical config |
| `reconcileAndPlanSelectedDraftLaunch(expectedDraft, memberTree)` | launch preparation state | Lock draft, reconcile all topology-sensitive config/workspace state, and return repaired/blocked/immutable plan | exact selected draft object + canonical topology | Produces no external side effect |
| `authorizeWorkspacePreparationRequest(plan, memberTree, addresses)` | external-side-effect authorization | Revalidate draft token/topology/exact Team subjects immediately before one deduplicated registration | plan token + current topology + one or more exact Team addresses sharing a canonical path | Returns repaired/authorized; caller may invoke `workspaceStore` only after authorized |
| `complete/failWorkspacePreparation(plan, ...)` | draft workspace result | Commit canonical config + derived state or address-scoped errors after external result | plan token + exact Team address(es) + workspace result/error | Revalidates topology; never silently retargets |
| `resolveTeamRunLaunchHierarchy(intent, memberTree)` | launch hierarchy | Validate/resolve complete scopes and Agents | root `/` plus typed canonical tree nodes | Returns issues rather than guessing |
| `projectEditableTeamRunFormModel(...)` | editable form capability | Project real draft/resolver/workspace/catalog authoring state into editable Team/Agent nodes | exact draft + current definition tree + store views | Sole projector allowed to carry authoring types |
| `projectStoredTeamRunFormModel(view)` | immutable stored presentation | Preserve stored hierarchy/order and complete Team/Agent/stored-workspace display in stored-only scope/node types | one `TeamRunConfigurationView`; canonical stored addresses remain internal keys | Pure/read-only; no current-definition/draft/authoring-type dependency or sentinel construction |
| `TeamRunConfigForm` / subject mode contracts | shared rendered configuration | Render editable or stored read-only controls through one hierarchy with subject-level narrowing | `EditableTeamRunFormModel \| StoredTeamRunFormModel`; nested scope/Agent unions remain discriminated | Stored mode hides Run/Reset, disables controls, leaves disclosures operable, and has no authoring props |
| `projectHistoricalModelConfigFields(storedConfig, currentSchema)` | generic stored-field presentation | Classify persisted keys through the retained IR-011 schema/enum/type rules as current-control or residual; preserve deterministic order and no duplication | immutable stored map + neutral current schema or null | Pure and provenance-free; exactness is blocking only for named supported current/released producer paths |
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
| Stored form adapter | Yes | Yes | Low | Discriminated read-only output keeps exact stored values and forbids editable commands |
| Shared form subject contracts | Yes | Yes | Low | Distinct Team/Agent capabilities prevent stored authoring sentinels, not just top-level mutation wiring |
| Historical field projector | Yes | Yes | Low | Closed normal/residual union owns partial and whole-schema drift consistently |
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
| Shared form presentation input | `EditableTeamRunFormModel \| StoredTeamRunFormModel` with parallel `EditableTeamScopeFormModel` / `StoredTeamScopeFormModel` and Agent nodes | Yes | Low after SR-013 | Keep discrimination at every subject; remove common authoring-shaped `TeamScopeFormModel` |
| Historical model-config row | `HistoricalModelConfigFieldPresentation` = current-control or historical-residual | Yes | Low | Name the display result, not a migrated/normalized config value |
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
| Existing-run Settings presentation | `TeamRunConfigForm` and existing read-only mode pattern from `origin/personal` | Restore/Extend | The original branch already proved one-form visual parity and safe disabled controls | Add stored-view/topology adapters for the V2 hierarchy; delete the ticket-created card tree |
| Partial/whole current-schema drift | current model-schema utilities + `HistoricalModelConfigFallback.vue` | Extend behind one pure projector | Existing schema knows valid current values and existing fallback has compact visual treatment | New classifier is needed because current editable resolver intentionally applies defaults and current-key iteration loses stored residuals |
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
| Team transport/history | V2 DTO/projector/hydration/view + stored-only form adapter + historical field projector | DS-006 | projector/factory/form presentation | Correct capability boundary + exact display | No historical inference, authoring-state dependency, current-definition dependency, value substitution, or separate stored visual language |
| Application SDK | explicit root default in member mode | DS-007 | contracts/backend SDK | Extend | Update source/dist |
| App-data migration | V1 isolation and V2 transform | DS-005 | migration definition/runner | Extend + one new migration | Proportionate single-file loop |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/types/agent/TeamRunConfig.ts` | Web authoring/history | shared domain/view types | tight intent, overrides, complete values, immutable stored view | One subject vocabulary; form capability types live separately | Yes |
| `autobyteus-web/types/agent/TeamLaunchDraft.ts` | Web authoring | draft aggregate/contracts | configuration edits, per-Team workspace authoring state, preparation plan/token/results | All prelaunch topology-sensitive state for one draft shares one vocabulary | Yes |
| `autobyteus-web/utils/teamRunLaunchHierarchy.ts` | Web authoring | resolver | reconcile/resolve/project derived scopes | One recursive policy owner | Yes |
| `autobyteus-web/stores/teamRunConfigStore.ts` | Web authoring | draft owner | frozen drafts, Team workspace commands/views, preparation locks/tokens, atomic config+state reconciliation/repair | Existing lifecycle owner is strengthened rather than paralleled | Yes |
| `editableTeamRunFormModel.ts` + editable model types | Web authoring/UI boundary | editable form adapter | real hierarchy/resolver/workspace/catalog authoring capabilities | Keeps mutable-authoring types on one side of the union | Yes |
| `storedTeamRunFormModel.ts` + stored model types | Web history/UI boundary | immutable view adapter | view-derived hierarchy, complete stored values/workspace display, comparison state, no commands/sentinels | Keeps history independent of authoring owners | Yes |
| `historicalModelConfigFields.ts` | Web history presentation | representability owner | exact key union, schema/value checks, deterministic current/residual rows | One pure policy serves root/nested/Agent and partial/whole drift | Yes |
| `TeamScopeConfigEditor.vue` | Web UI | scope renderer | discriminate editable/stored scope; reusable root/nested field presentation; editable-only disclosure/reset/operations | Reuse visuals without common authoring props | Yes |
| `TeamMemberConfigTree.vue` | Web UI | recursive presentation | discriminate editable/stored Team/Agent hierarchy | Recursion belongs together | Yes |
| `MemberOverrideItem.vue` | Web UI | Agent renderer | discriminate editable override capability or exact stored Agent display | One Agent visual presentation with distinct subject data | Yes |
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
| Neutral form display fields | `TeamScopeDisplayFields` / `AgentDisplayFields` | Web UI boundary | both modes render the same subject identity and complete effective value | Yes | Yes | authoring workspace/operation/catalog state or commands |
| Editable/stored form capability | parallel editable/stored form, scope, and Agent types | Web UI boundary | root/tree/scope/Agent visuals need different real capabilities | Yes | Yes — removes common sentinel-filled scope | optional kitchen-sink props or reverse mapping |
| Historical model-config classification | `historicalModelConfigFields.ts` | Web history presentation | root/nested/Agent must agree on exact current-control vs residual behavior | Yes | Yes — replaces whole-schema booleans/component-local iteration | schema migration, config normalization, or editable default resolver |
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
| `TeamRunConfigurationView` | Yes | Yes | Low | Mark immutable/derived; preserve stored topology and complete values; never write it back as intent |
| `EditableTeamScopeFormModel` | Yes | Yes | Low | Sole scope containing override, workspace selection/operation, editable catalog state, and commands |
| `StoredTeamScopeFormModel` | Yes | Yes | Low after correction | Complete stored config + stored workspace display only; forbid authoring imports/sentinels |
| Editable/stored Agent nodes | Yes | Yes | Low after correction | Editable carries baseline/override/catalog capability; stored carries exact complete config/workspace display only |
| `HistoricalModelConfigFieldPresentation` | Yes | Yes | Low | Closed current-control/residual union remains generic; supported producer-backed residuals retain the exact key/value and reason |
| `AgentLaunchConfiguration` | Yes | Yes | Low | Use it directly for `ConfiguredAgentExecutionNode.launchConfiguration` and `ConfiguredTeamExecutionNode.defaultLaunchConfiguration`; intersect it into runtime Agent fields only where the existing flat runtime shape remains useful |
| GraphQL complete arrays | Yes | Yes | Low | Backend exact coverage prevents parallel policy meaning |
| V1/V2 schemas | Yes | Yes | Low | V1 exists only under migration; runtime exports only V2 |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/types/agent/TeamRunConfig.ts` | Web authoring/history | domain/view type boundary | editable intent types and immutable configuration view only | One coherent launch vocabulary without form authoring dependencies | N/A |
| `autobyteus-web/types/agent/TeamRunFormModel.ts` (neutral union/display only) | Web UI | shared form identity boundary | top-level editable/stored union, neutral display fields, node unions; no `TeamLaunchDraft`/store imports | One discriminated visual vocabulary | config/view value types only |
| `autobyteus-web/types/agent/EditableTeamRunFormModel.ts` or equivalent editable-only module | Web authoring/UI | editable capability boundary | editable Team/Agent fields including override, selection, operation, catalog state | Keeps authoring dependency explicit | draft/workspace/store types |
| `autobyteus-web/types/agent/StoredTeamRunFormModel.ts` or equivalent stored-only module | Web history/UI | stored capability boundary | complete stored Team/Agent values, stored workspace display, comparison state; no sentinels | Makes forbidden authoring dependency mechanically auditable | immutable view/display types only |
| `autobyteus-web/types/agent/TeamLaunchDraft.ts` | Web authoring | draft aggregate/command boundary | typed root/Team/Agent edits, per-Team workspace authoring state, preparation plan/result/token, repair notice | All prelaunch state for one draft shares one topology lifecycle | TeamRunConfig/address types |
| `autobyteus-web/utils/teamRunLaunchHierarchy.ts` | Web authoring | policy owner | topology reconciliation, recursive resolution, derived view | One pure hierarchy policy | member-tree and config types |
| `autobyteus-web/utils/teamRunConfigUtils.ts` | Web authoring | field semantics | property-presence/equality/coherence primitives | Small field-local utilities | override types |
| `autobyteus-web/stores/teamRunConfigStore.ts` | Web authoring | lifecycle owner | frozen edits, per-draft Team workspace views/transitions, preparation locks/tokens, topology repair, admission | Existing lifecycle cohesion; one address-state owner | hierarchy resolver + draft types |
| `TeamScopeConfigEditor.vue` | Web UI | reusable Team-scope control presentation | accept one discriminated scope model; editable branch owns events/operations/reset, stored branch owns disabled exact value/workspace display; no optional authoring defaults | Avoid duplicate visual control logic without capability conflation | editable/stored scope union + field renderer |
| `TeamMemberConfigTree.vue` | Web UI | recursive tree | narrow editable/stored Team/Agent nodes before delegation | One presentation recursion with mode-specific data authority | node union + scope/item |
| `MemberOverrideItem.vue` | Web UI | Agent control presentation | accept one discriminated Agent node; editable override branch or exact stored display branch | Existing visual responsibility supports both modes without broad optional props | Agent node union + historical field projector |
| `TeamRunConfigForm.vue` / `RunConfigPanel.vue` | Web UI | singular composition/mode entry | shared root + tree + banners; editable typed commands/one launch or stored immutable inspection/no actions | Existing screen boundaries remain thin and restore origin-personal parity | editable store/hierarchy commands or stored form adapter |
| `agentTeamRunStore.ts` | Web launch | sequence owner | reconcile/plan/register/commit/revalidate/readiness/admit/create | Existing launch lifecycle, no new pass-through service | store preparation contract + workspaceStore |
| `team-run-service.ts` | Server create | public service | full/root-only create, normalize/activate, manager/persistence; no root preallocation | One lifecycle facade | planner/domain types |
| `team-run-identity-allocator.ts` | Server planning | configured Team identity dependency | root/nested Team ID generation | One injectable concern serving planner ordering | `team-run-id.ts` generator |
| `team-definition-topology-planner.ts` | Server planning | graph/validation/allocation owner | coverage validation then configured Team/Agent allocation and compile | Existing topology owner | common launch value + identity allocators |
| `team-run-config.ts` | Server runtime | domain aggregate | complete value and Team default | One immutable runtime model | N/A |
| `team-run-execution-tree.ts`, schema, store, builder | Persistence | V2 current boundary | write/read/restore Team defaults | Established responsibilities | common snapshot value |
| `team-execution-view-dtos.ts` / projector | Transport | V2 DTO | expose Team defaults | Current strict contract | launch DTO |
| `teamExecutionContextFactory.ts` / hydration | Web history | immutable view owner | stored Team view and stored topology/workspace metadata | Read-only return truth stays independent of current definitions/drafts | configuration view |
| `storedTeamRunFormModel.ts` | Web history/UI | stored form adapter | stored-only Team/Agent nodes; no schema comparison or authoring sentinel | One pure immutable-view projection | stored form types |
| `historicalModelConfigFields.ts` | Web history/UI | representability policy | per-key/value exact current-control/residual classification and stable ordering | One pure policy reused at all three subject levels | neutral schema + stored map types |
| migration-owned V1 modules | Migration | legacy boundary | exact V1 decode/build/mutate/package validation | Keep all old-shape knowledge isolated | migration only |
| `team-run-execution-tree-v2-app-data-migration.ts` | Migration | transform owner | classify/transform/commit/report | Latest simplicity convention | V1 decoder + V2 validator/writer |

## Applied Patterns (If Any)

- **Intent versus snapshot:** partial editable intent; complete runtime/persistence values. Team workspace authoring state is transient draft intent and never enters GraphQL/V2.
- **Shared display, separate capabilities:** neutral identity/effective-value fields may be shared; editable and stored Team/Agent capabilities remain parallel discriminated types with no sentinels.
- **Exact residual projection:** current schema is compared to immutable stored config per key/value; it never normalizes or migrates history.
- **Plan/commit around an external side effect:** the store creates and validates an immutable workspace preparation token; the launch owner executes registration; the store alone commits or fails the address state.
- **Recursive nearest-owner resolution:** one Team-scoped walk, exact Agent merge at leaves.
- **Thin transport adapters:** GraphQL/application/external adapt into service commands only.
- **Forward-only migration boundary:** legacy V1 decoder and coordinator reconstruction exist only in registered migrations.
- **Final-state classification:** writer uncertainty is classified by canonical V2 reread, not by speculative phase state.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/types/agent/TeamRunConfig.ts` | File modify | Web launch/history model | root/team/Agent intent and immutable stored view types | Existing type authority | form operation state or recursive algorithm |
| `autobyteus-web/types/agent/TeamRunFormModel.ts` | File modify | Neutral UI form boundary | top-level form union, neutral display fields, Team/Agent node unions | Existing IR-010 form entry type can be narrowed | imports from `TeamLaunchDraft`, workspace authoring, or store operation state |
| editable-only form model type module or co-located explicitly editable section | File add/modify | Web authoring/UI | `EditableTeamRunFormModel`, `EditableTeamScopeFormModel`, editable Agent nodes | Authoring capabilities remain cohesive | stored projection/value fallback policy |
| stored-only form model type module or co-located dependency-isolated section | File add/modify | Web history/UI | `StoredTeamRunFormModel`, `StoredTeamScopeFormModel`, stored Agent nodes, `StoredWorkspaceDisplay` | Stored capability is mechanically independent | editable override/selection/operation/catalog types or commands |
| `autobyteus-web/types/agent/TeamLaunchDraft.ts` | File modify | Draft aggregate/contracts | address-specific edits, Team workspace state, plan/token/result, repair notice | Existing draft boundary | UI rendering or workspace-store calls |
| `autobyteus-web/composables/useDefinitionLaunchDefaults.ts` | File modify | Root seeding | Build/clone new root-only intent | Existing definition-default owner | embedded defaults |
| `autobyteus-web/utils/teamRunLaunchHierarchy.ts` | File add | Hierarchy policy | reconcile/resolve/view | New missing policy owner | stores/GraphQL |
| `autobyteus-web/utils/teamRunConfigUtils.ts` | File modify | Field helpers | override presence/equality/coherence | Existing helper area | recursive traversal |
| `autobyteus-web/utils/teamRunMemberConfigBuilder.ts` | File delete | Obsolete | Remove root-only projection | Replaced | compatibility wrapper |
| `autobyteus-web/stores/teamRunConfigStore.ts` | File modify | Draft lifecycle | per-draft workspace authoring/operation state, derived views, prepare/commit/fail/reconcile commands, repair/admission | Existing owner; replaces global/panel maps | external workspace registration or component recursion |
| `autobyteus-web/utils/teamRunLaunchReadiness.ts`; `composables/useTeamRunRuntimeCatalogSync.ts` | Files modify | Validation/catalog | consume resolved hierarchy plus draft-owned active workspace state | Existing concerns | panel-owned readiness overlay or independent precedence |
| `autobyteus-web/components/workspace/config/TeamScopeConfigEditor.vue` | File modify | Scope UI | one discriminated scope prop; editable-only commands/operations/reset; stored exact disabled values/workspace display; no summary | Config component folder | optional kitchen-sink authoring props/default sentinels, store mutation, or stored substitution |
| `.../TeamMemberConfigTree.vue` | File modify | Tree UI | recursive Team/Agent presentation with node-level narrowing | Config component folder | merge policy, current-definition lookup in stored mode, or loss of discrimination |
| `.../MemberOverrideTree.vue` | File delete | Obsolete UI | remove display-only Team grouping | Clean cut | alias |
| `.../MemberOverrideItem.vue`; `TeamRunConfigForm.vue`; `RunConfigPanel.vue` | Files modify | singular UI composition | discriminated Agent/form models; exact stored Agent config; editable-only events/notices/launch | Existing screen preserves origin-personal one-form behavior | broad optional mode props, stored-to-draft conversion, policy inference, or alternate cards |
| `autobyteus-web/utils/historicalModelConfigFields.ts` (or naturally named equivalent) | File add | Historical presentation policy | union persisted/current keys, retained generic schema-value check, current-control/residual row output, stable order | Pure reusable policy does not belong in Vue template or draft utilities | mutation, editable default application, catalogs/store access, component strings, provenance/product-specific branches |
| `ModelConfigAdvanced.vue`; `RuntimeModelConfigFields.vue`; `HistoricalModelConfigFallback.vue` | Files modify | Model field presentation | consume classified rows; normal disabled control for representable values; compact residual rows, with producer-backed stale/removed values exact | Existing controls/fallback treatment | iteration of only current keys, supported explicit stale value -> Default, duplicate whole-schema branch |
| `.../StoredTeamRunConfigForm.vue`; `.../StoredTeamRunConfigTree.vue`; `.../StoredLaunchConfigurationCard.vue` | Files delete | Rejected duplicate UI | remove standalone stored form/tree/key-value cards and history-only labels | Clean cut after shared-form coverage | wrapper aliases, fallback use, or retained parallel visual language |
| `autobyteus-web/stores/agentTeamRunStore.ts` | File modify | Launch orchestration | one exact-draft delegation; reconcile/plan, execute deduped workspace registration, store commit/revalidate, readiness/admit/create | Existing launch boundary | direct draft mutation or UI policy |
| `autobyteus-web/services/teamExecution/teamExecutionContextFactory.ts`; `storedTeamRunFormModel.ts`; `.../teamExecutionViewState.ts`; `.../teamExecutionTreeSelectors.ts`; `services/runHydration/teamRunContextHydrationService.ts` | Files modify | Read-only view/hydration/presentation boundary | immutable view/topology, workspace roots, stored-only shared-form projection | Existing execution-return area | coordinator/current-definition inference, editable types/sentinels, schema normalization, commands |
| `autobyteus-web/localization/messages/en/workspace.ts`; `.../zh-CN/workspace.ts` | Files modify | Localization | nested scope/state/error/repair/read-only/unavailable-value strings; remove stored-card-only labels | Existing catalog | hard-coded labels or “Stored root Team defaults” language |
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
| `autobyteus-web/components/workspace/config` | Transport/UI | Yes after SR-013 | Medium -> Low | One visual form remains, but subject props are capability-discriminated and historical field policy is extracted from component-local branching |
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
| Historical view | adapt immutable stored root/nested/Agent snapshots into the same disabled form controls; derive Team state only against the stored parent | fabricate Team baselines from a current definition, rebuild Agent values from absent overrides, or render separate key/value cards | Preserves exact reconstructed history while keeping configure/inspect visually consistent |
| Historical catalog miss | show the exact stored identifier/value plus a concise unavailable note inside the normal disabled Runtime/Model/Workspace/Advanced field region | silently select a current default or fall back to the standalone stored card inspector | Truthful history remains legible without creating a second presentation |
| Supported partial schema drift | a Codex `reasoning_effort` emitted by prior `model/list` remains exact if the live enum changes; a persisted `service_tier=fast` remains visible if later metadata omits that field | current resolver substitutes `Default` or current-key iteration drops the real prior field | Closes AC-038 with named production producers and user actions |
| Production-reachability gate | use actual emitted `reasoning_effort` enum drift and `service_tier` disappearance to exercise stale-value/removed-field mechanics | invent `ordinary_prompt`, `multiline_prompt`, `removed_parameter`, or arbitrary JSON and let the fixture establish its own scope | Tests may reproduce an independently established production path; they cannot create it |

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

Illustrative shared-form boundary (names may follow repository conventions, but the capability split is mandatory):

```ts
type TeamRunFormModel =
  | Readonly<{
      mode: 'editable';
      definitionLabel: string;
      root: EditableTeamScopeFormModel;
      members: readonly EditableTeamMemberFormNode[];
      // editable parent wiring may emit typed commands
    }>
  | Readonly<{
      mode: 'stored';
      definitionLabel: string;
      root: StoredTeamScopeFormModel;
      members: readonly StoredTeamMemberFormNode[]; // from stored view topology
      readOnlyMessage: string;
      // deliberately no commands, Reset, workspace authoring state, or Run action
    }>;

type TeamScopeDisplayFields = Readonly<{
  address: AgentTeamAddress;
  displayName: string;
  effectiveConfig: ResolvedTeamRunLaunchConfig;
  isCustomized: boolean;
}>;

type EditableTeamScopeFormModel = TeamScopeDisplayFields & Readonly<{
  mode: 'editable';
  inheritedConfig: ResolvedTeamRunLaunchConfig | null;
  override: TeamScopeConfigOverride | null;
  workspaceSelection: WorkspaceSelectionState;
  workspaceOperation: TeamWorkspaceOperationState;
  runtimeCatalogState: EditableRuntimeCatalogOperationState;
}>;

type StoredTeamScopeFormModel = TeamScopeDisplayFields & Readonly<{
  mode: 'stored';
  storedWorkspace: StoredWorkspaceDisplay | null;
  // no override, selection, operation, editable catalog state, or commands
}>;

type StoredAgentFormModel = Readonly<{
  mode: 'stored';
  address: AgentTeamAddress;
  displayName: string;
  effectiveConfig: ResolvedTeamRunLaunchConfig; // exact stored Agent snapshot
  storedWorkspace: StoredWorkspaceDisplay | null;
}>;

type HistoricalModelConfigFieldPresentation =
  | Readonly<{
      kind: 'current_control';
      key: string;
      schema: UiModelConfigFieldSchema;
      hasExplicitStoredValue: boolean;
      storedValue?: unknown;
    }>
  | Readonly<{
      kind: 'historical_residual';
      key: string;
      exactStoredValue: unknown;
      reason: 'removed_key' | 'value_not_representable';
    }>;
```

The components share rendering, labels, disclosures, and field controls. They narrow `mode` before touching nonshared fields; they do not use optional authoring props with null/idle defaults. In particular, a stored Agent receives `effectiveConfig` directly rather than an artificial `override: null`, and a stored Team receives `StoredWorkspaceDisplay` rather than an artificial Existing/New authoring selection.

`projectHistoricalModelConfigFields` remains generic and provenance-free. It first walks current-schema keys in schema order. A current field with no explicit persisted key remains a normal disabled control and may show the ordinary schema-default presentation. A current field with an explicit value is classified by IR-011's schema/enum/type rules; otherwise it becomes one residual and the normal control is omitted for that key. Keys absent from the schema are appended as residuals in stable key order. The projector never mutates input, applies editable normalization to an explicit value, or emits the same key twice. Blocking exactness applies only when the initiating field/value came from a named supported current/released catalog and normal launch path; the projector does not gain provenance tracking or special handling for arbitrary injected/future fields.

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
| Keep/restyle `StoredTeamRunConfigForm` / tree / cards | Seems isolated from editable authoring | Rejected | delete all three; use the shared form/tree/controls with a stored-view adapter |
| Convert `TeamRunConfigurationView` back into `TeamRunConfig` to reuse editable code | Avoids a presentation adapter | Rejected | share visual components only; preserve immutable complete stored values/topology and expose no draft commands |
| Use current AgentTeam definition to drive stored hierarchy | Reuses editable tree input | Rejected | derive stored hierarchy exclusively from the immutable stored view so removed/renamed/moved historical subjects remain inspectable |
| Keep one common Team scope and make authoring fields optional/defaulted | Minimizes type edits after IR-010 | Rejected | parallel editable/stored subject types sharing only neutral display fields; no null/idle sentinels |
| Reuse editable enum/default resolver for supported stored explicit values | Reuses current control helper | Rejected | generic representability classifier; a supported producer-backed unrepresentable value becomes a residual, never `Default` |
| Whole-schema fallback boolean plus current-key loop | Covers missing models/schemas | Rejected | one union-key per-field/value projector covers both partial and whole-schema drift |

Hard block: implementation is not acceptable if current business/runtime code contains V1 fallback branches, optional Team defaults, or coordinator-derived new-run defaults; if selected existing TeamRuns retain a standalone stored form/tree/card presentation; if stored form types/projectors import or fabricate editable authoring state; or if a model-config key/value accepted from a named supported current/released catalog through a normal launch path can be hidden, coerced, or displayed as a different/default value under the later current schema. Arbitrary GraphQLJSON injection, page-local catalog mutation, and hypothetical future/custom fields are explicitly excluded from blocking acceptance and must not introduce product machinery.

## Derived Layering (If Useful)

- **Web presentation:** Vue components and `RunConfigPanel`.
- **Web authoring domain:** tight intent/view types, pure hierarchy resolver, Pinia lifecycle owner.
- **Web history presentation boundary:** immutable stored form capability + pure current-schema representability projection; no draft/store operation dependency.
- **Transport adapters:** GraphQL, application contracts/SDK, external binding launcher, Team stream DTO/projector.
- **Server application/domain:** `TeamRunService`, topology planner, immutable runtime config.
- **Persistence:** V2 execution-tree builder/schema/store/catalog.
- **Migration off-spine:** retained V1 boundary and one V2 transformation definition.

## Change / Refactor Sequence

1. Add tight draft-owned `TeamWorkspaceAuthoringState`, preparation plan/token/result contracts, and a configured `TeamRunIdentityAllocator` interface. Do not change GraphQL/V2 persistence shapes.
2. Refactor `teamRunConfigStore` so create/select/remove/reset/replace operate on per-draft Team workspace state. Replace the global Team loading map. Make one reconciliation atomically prune config overrides plus active/inactive workspace state, return sorted unique repaired addresses, and preserve root plus valid same-draft buffers.
3. Move Team workspace readiness input to the draft/store getter. Update `TeamRunConfigForm`/`TeamMemberConfigTree`/`RunConfigPanel` to consume derived views and emit commands. Delete `teamWorkspaceSelections`, the Team branch of `ensurePendingWorkspaceLoadedForRun`, manual reset cleanup, and any component-level post-preparation readiness gate. Retain the separate Agent-only workspace path. Preserve the SR-011 personal-branch root composition/spacing/labels, remove all hierarchy-specific root output, extend the existing nested group with a default-collapsed global editor/state/reset, and render no effective/customized-fields summary.
4. Strengthen `agentTeamRunStore.launchDraft`: assert the passed exact selected draft; resolve current topology; ask the store to lock/reconcile/plan; stop visibly on repair/blocked input before any registration; immediately authorize each canonical-path-deduplicated request against the token/current topology; only then call `workspaceStore`; commit success/failure through token-checked store actions; re-resolve/reconcile; then evaluate readiness, admit the latest exact snapshot, project, create, and hydrate. No broad watcher or second caller sequence.
5. Add real-Pinia boundary coverage for root/nested active and inactive New buffers across remove, rename/move, and Team-to-Agent kind change; valid same-draft edit stability; distinct-draft/context isolation; nested reset; deduplicated success; address-scoped failure; and zero registration on repaired topology. Keep focused rendered checks for disabled/error/repair text. Add editable presentation assertions for personal-baseline root order/labels/no wrapper-chrome, default-collapsed nested editor, actionable scope state/reset, and absence of every effective/customized-fields summary.
6. Inject `TeamRunIdentityAllocator` into `TeamDefinitionTopologyPlanner`. Remove `teamRunId` from `buildPlan`, allocate root from the validated root definition name after all exact checks, and retain nested Team/Agent allocation only in the post-validation compile phase.
7. Remove `TeamRunService.allocateTeamRunId`, `CreateTeamRunInput.teamRunId`, and root-config `teamRunId`; update application launch to call common creation once and persist/use `teamRun.teamRunId`. Do not add a compatibility wrapper.
8. Add planner/service/application tests with spies proving invalid full hierarchy and invalid root-only/application member inputs perform zero configured Team/Agent allocation, zero manager creation, and zero persistence; valid application binding records the returned root identity.
9. Preserve IR-010's one shared `TeamRunConfigForm`, stored V2 topology/order, disabled controls, operable disclosures, and deletion of all three `Stored*` components. Split the common scope/Agent form vocabulary into neutral display fields plus distinct editable/stored capability modules. Remove stored `WorkspaceSelectionState`, `override: null`, idle workspace/catalog objects, optional authoring defaults, and all stored imports from `TeamLaunchDraft`/draft store types. Update tree/scope/Agent/workspace components to accept one discriminated subject and narrow before accessing mode-specific fields.
10. Add `projectHistoricalModelConfigFields` and a closed current-control/residual result. Route root/nested Team and Agent stored model-config rendering through it. Representable values stay in normal disabled controls; producer-backed removed keys and stale/incompatible explicit values render once as compact exact residual rows. The runtime classifier remains generic/provenance-free and may apply the same mechanics defensively, but arbitrary injected/future values add no blocking acceptance obligation. Replace whole-schema-only conditions with the same algorithm; keep editable default/normalization behavior unchanged.
11. Add static/type and focused render coverage: stored model/projector has no forbidden authoring imports or sentinel literals; editable projection still carries real state; shared components reject kitchen-sink props; production-emitted `reasoning_effort` stale-enum and `service_tier` removed-field cases remain exact; representable fields remain normal disabled controls; and partial/whole drift works independently at root, nested Team, and Agent scopes with zero mutation. Retain the existing no-current-definition, exact topology/order, no Run/Reset, operable disclosure, and no-card assertions. Do not use invented field names to create the premise.
12. Re-run the focused cohort, Nuxt production build, existing hierarchy/V2/migration/application suites, and browser existing-TeamRun Settings journey. For a blocking current-path browser result, use a setting emitted by a current catalog or documented as emitted by a supported historical catalog. Do not mutate browser catalog state or inject arbitrary GraphQLJSON and then label the resulting field as current product UI. Durable coverage changes still require proportional code review before delivery.
13. After SR-015 architecture approval, simplify the five affected frontend paths. Reverse commit `003413b05`'s IR-012 behavior: remove `canTextInputRepresentExactly` and restore IR-011's schema-valid scalar/control classification in `historicalModelConfigFields.ts`; remove `whitespace-pre-wrap` added solely for multiline residuals; remove the ordinary/LF/CR classifier and mounted fixtures/assertions. In the retained IR-011 tests (`historicalModelConfigFields.spec.ts`, `StoredTeamScopeHistoricalFields.spec.ts`, and `MemberOverrideItem.spec.ts`), replace `removed_parameter`/`legacy_shape`/similar invented keys with actual emitted Codex paths: stale `reasoning_effort` and removed `service_tier`. Do not revert IR-011 behavior, add compatibility branches, or add isolated-CR machinery. Run the affected focused cohort/build, update the implementation artifacts, complete source review, and use API-REV-010 as the real-user coverage baseline. No synthetic CR browser rerun is authorized.

No temporary compatibility seam may remain. Compile failures at removed panel/service/planner APIs are the intended migration signal.

## Key Tradeoffs

- **Frontend resolves; backend validates.** This avoids serializing partial-property semantics across GraphQL while still preventing a compromised/stale client from inventing topology.
- **Separate capabilities, share visual presentation.** Editable intent and immutable stored view feed parallel discriminated subject models into one rendered hierarchy. This adds a few explicit types but removes fabricated state and preserves exact history without a second card UI or reverse conversion.
- **Classify display residuals instead of normalizing history.** A pure per-field projector is slightly more code than a whole-schema boolean, but it gives one truthful rule for root/nested/Agent and makes partial schema drift testable.
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
10. **Shared-form capability leakage:** visual reuse can make stored scopes depend on editable override/workspace/catalog state even without mutation. Mitigation: subject-level discriminated models, dependency-isolated type/projector modules, no optional authoring defaults, and forbidden-import/sentinel checks.
11. **Supported partial historical schema drift:** native selectors may map a formerly supported unlisted value to Default while current-key iteration drops formerly supported removed fields. Mitigation: union-key per-value representability, exact residual rows, and direct classifier/subject coverage. Synthetic fixtures prove mechanics only; blocking browser evidence must establish real catalog provenance.
12. **Stored topology/current-definition drift:** using the current definition to satisfy shared tree props would hide or retarget historical subjects. Mitigation: the stored adapter derives its tree only from `TeamRunConfigurationView`, and coverage removes/renames/moves current definition subjects while proving history remains unchanged.
13. **Future free-text provider field:** this ticket deliberately carries no CR/LF-specific presentation promise because no current or released producer emits such a field. When a provider introduces one, define its actual control/presentation and browser acceptance in that provider change rather than pre-designing it here.

## Guidance For Implementation

- Treat the user-approved `ui-ux-spec.md` as the presentation authority. Reuse root/nested field and event behavior, not redundant visual chrome. The editable root form must preserve the personal-branch sequence/style and render no hierarchy wrapper, “Root Team defaults”, root badge, `/`, scope divider, or summary. The existing nested Team group gains a default-collapsed editor with state/reset and no summary.
- Use `TeamRunConfigForm` as the one rendered form for editable and selected-existing TeamRun modes. A discriminated input should make illegal wiring difficult: editable mode carries draft-derived form data plus typed commands/Run eligibility; stored mode carries view-derived form data and no mutation/Reset/Run capability.
- Keep the discrimination at root, nested Team, and Agent subject level. Remove the common `TeamScopeFormModel`; do not replace it with optional `workspaceSelection`/`override`/operation/catalog props. `EditableTeamScopeFormModel` owns those real facts; `StoredTeamScopeFormModel` owns complete stored config and `StoredWorkspaceDisplay` only.
- Place stored and editable capability types/projectors so a static dependency audit can prove the stored side does not import `TeamLaunchDraft`, `WorkspaceSelectionState`, `TeamWorkspaceOperationState`, editable overrides, or `teamRunConfigStore` catalog state. Do not construct `idle`/`null`/fake Existing/New sentinels in stored projection.
- Keep `TeamRunConfigurationView` immutable and direct. The stored adapter must use its stored hierarchy/order, root/nested Team complete values, exact Agent complete values, and hydrated stored workspace metadata; it must not query the current AgentTeam definition, compute Agent values from editable overrides, or materialize a `TeamRunConfig`/`TeamLaunchDraft`.
- Disable value controls in stored mode while keeping Team Members, nested-Team, and model Advanced disclosures operable. Preserve the existing read-only explanation and Back behavior; omit Run and Reset. Ignore/reject any child edit emission defensively even if a test invokes it mechanically.
- For runtime/model/workspace identifiers, keep the exact field-local unavailable treatment. For supported product-originated `llmConfig`, do not gate fallback on whole-schema absence. Feed the exact stored map and current schema to the IR-011 classifier. Retain its schema/enum/type rules, but remove the IR-012 CR/LF-specific text-control predicate and whitespace styling because no supported free-text producer exists.
- `ModelConfigAdvanced` must consume classified rows rather than iterate only current schema keys. It must not call editable `resolveEffectiveConfigValue` for an explicit stale supported stored value. Current-schema defaults may display only where the persisted map has no explicit value for that key. Delete synthetic `ordinary_prompt`/`multiline_prompt` behavior and replace `removed_parameter`/`legacy_shape` test fixtures with the real emitted `reasoning_effort`/`service_tier` paths; do not turn fixture names or CR/LF behavior into shipped labels, CSS obligations, or source branches.
- Delete `StoredTeamRunConfigForm.vue`, `StoredTeamRunConfigTree.vue`, and `StoredLaunchConfigurationCard.vue` plus history-only localization after parity coverage. Do not keep wrapper aliases or use those cards as a fallback.
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

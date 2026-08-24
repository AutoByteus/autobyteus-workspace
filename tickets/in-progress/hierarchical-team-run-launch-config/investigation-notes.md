# Hierarchical TeamRun Launch Configuration — Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Requirements, intended-behavior supplement, and V2 contract approved; architecture-level investigation and design complete; user authorized architecture-review handoff
- Investigation Goal: Trace every current TeamRun launch-configuration surface and establish the hierarchy, persistence, restoration, and UI requirements for treating nested teams as configuration scopes.
- Scope Classification: `Large`
- Scope Classification Rationale: The change crosses frontend types/store/UI/resolution, multiple launch surfaces, GraphQL, topology planning, persisted execution-tree schema, restore, and historical inspection.
- Scope Summary: Hierarchical TeamRun launch configuration; root global plus inherited/custom nested-team scopes plus Agent overrides. No live topology mutation.
- Resolved Design Outcomes:
  1. The immutable store owns editable intent; one pure hierarchy resolver owns reconciliation, precedence, readiness projection, and complete launch projection; UI consumes a derived view.
  2. The backend accepts a complete Team/Agent hierarchy while one service root-config entrypoint expands root-only surfaces without coordinator inference.
  3. Runtime, persistence, stream transport, restore, and normal history become V2-only with required configured-Team defaults.
  4. One registered V1-to-V2 migration performs the approved direct-coordinator copy using existing atomic writer/runner/retry facilities and bounded diagnostics.

## Request Context

While bootstrapping Dynamic AgentTeam Runtime, the user observed that the current frontend gives only the root AgentTeam a global launch configuration. Nested teams are displayed as groups and their individual Agent descendants can be overridden, but the nested team itself cannot define a shared configuration. The user elevated this as a higher-priority prerequisite because every team should behave as a unit and a future dynamically added Agent should inherit from its containing TeamRun.

## Environment Discovery / Bootstrap Context

- Project Type: `Git` super-repository
- Task Workspace Root: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-hierarchical-team-run-launch-config`
- Task Artifact Folder: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config`
- Current Branch: `codex/hierarchical-team-run-launch-config`
- Current Worktree / Working Directory: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-hierarchical-team-run-launch-config`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch --prune origin` initially resolved the remote ticket at `274567367140adbda8757b01ee30ea0dc02eb44e`. Before approved design work, `origin/personal` advanced to `52b4be02ea793f2071fe5a63a94664ab25196433`; the local ticket branch was rebased successfully with its Draft artifact edits autostashed/restored. Current ticket HEAD `030743de9868a1437afa462314323fd9bcf95603` is one ticket commit ahead and zero behind that base.
- Task Branch: `codex/hierarchical-team-run-launch-config`
- Expected Base Branch: `personal`
- Expected Finalization Target: `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: This ticket is the prerequisite for the Dynamic AgentTeam Runtime work; that later requirements basis must consume the approved nearest-containing-TeamRun default rather than a root-only assumption.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related Requirement / Acceptance-Criteria IDs | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/hierarchical-launch-configuration-behavior.md` | Intended behavior, hierarchy examples, UI states, field participation, launch-surface semantics, and historical transition | Target user/system behavior | Requirements and design | R-001–R-041; AC-001–AC-034 | Approved | Approved with requirements on 2026-08-24 | Keep aligned and include in every downstream handoff. |
| `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/team-execution-tree-v2-contract.md` | Exact TypeScript structure, materialization rules, and realistic JSON example for TeamRun execution-tree V2 | Design/interface contract | Requirements and design | R-021–R-031, R-035, R-037; AC-016–AC-023, AC-030 | Approved | Approved by the user on 2026-08-24 after personal design review | Keep synchronized with V2 schema/migration sections and include in every later handoff. |

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-08-24 | Command | `git fetch --prune origin`; `git worktree add --track -b codex/hierarchical-team-run-launch-config /home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-hierarchical-team-run-launch-config origin/codex/hierarchical-team-run-launch-config`; `git merge-base HEAD origin/personal`; `git rev-list --left-right --count HEAD...origin/personal` | Resume the existing remote ticket in a current isolated tracking worktree | Ticket HEAD `274567367...` has current `origin/personal` `c5b87df4d...` as its parent/merge-base; branch is one ticket commit ahead and zero behind | No |
| 2026-08-24 | Command | `git fetch --prune origin`; `git rebase --autostash origin/personal`; `git rev-list --left-right --count HEAD...origin/personal`; `git rev-parse HEAD` | Refresh again immediately before approved design work | `origin/personal` advanced to `52b4be02...`; rebase succeeded; current ticket HEAD `030743de...` is one commit ahead and zero behind the refreshed base | No |
| 2026-08-24 | Code | `autobyteus-web/types/agent/TeamRunConfig.ts` | Inspect authoring state | One root global config plus flat `memberOverrides`; no team-scope override subject | Yes |
| 2026-08-24 | Code | `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue` | Inspect root UI | Root runtime/model/workspace/auto-execute controls render once, outside recursive member tree | Yes |
| 2026-08-24 | Code | `autobyteus-web/components/workspace/config/MemberOverrideTree.vue` | Inspect nested UI | Nested team renders only a group label; the same root globals are passed recursively to Agent items | Yes |
| 2026-08-24 | Code | `autobyteus-web/utils/teamDefinitionMembers.ts` | Inspect hierarchy identity | Recursive tree already contains canonical addresses and team/Agent kinds; suitable subject identity exists | No |
| 2026-08-24 | Code | `autobyteus-web/composables/useDefinitionLaunchDefaults.ts` | Inspect template seeding | `buildTeamRunTemplate` uses only selected root definition defaults; nested definition defaults are not projected | Yes |
| 2026-08-24 | Code | `autobyteus-web/stores/teamRunConfigStore.ts` | Inspect edits/invariants | Store edits root fields or exact Agent overrides; root changes prune some inherited model configs | Yes |
| 2026-08-24 | Code | `autobyteus-web/utils/teamRunMemberConfigBuilder.ts` | Trace effective resolution | Each leaf resolves from root globals plus its exact override; no nearest-team resolution | Yes |
| 2026-08-24 | Code | `autobyteus-server-ts/src/agent-team-execution/services/team-definition-topology-planner.ts` | Trace backend launch planning | API must provide complete settings for every leaf Agent; team nodes receive no launch default | Yes |
| 2026-08-24 | Code | `autobyteus-server-ts/src/agent-team-execution/domain/team-run-config.ts` | Inspect compiled runtime topology | Agent nodes contain complete settings; Team nodes contain topology/identity only | Yes |
| 2026-08-24 | Code | `autobyteus-server-ts/src/agent-team-execution/domain/team-run-execution-tree.ts` | Inspect persisted tree | Configured Agent nodes persist complete launch snapshots; configured Team nodes do not persist effective defaults | Yes |
| 2026-08-24 | Code | `autobyteus-web/utils/teamRunLaunchReadiness.ts`; `autobyteus-web/composables/useTeamRunRuntimeCatalogSync.ts` | Trace readiness/catalog coverage | Root plus exact Agent override runtime/model combinations are validated/loaded; there is no Team-scope traversal or subject-kind validation | No |
| 2026-08-24 | Code | `autobyteus-web/components/mobile/MobileRunSetup.vue`; `autobyteus-web/composables/mobile/useMobileRunSetupController.ts` | Inventory mobile authoring | Mobile exposes only root Team workspace/runtime/model/config/auto-execute and uses the shared launch draft/store; it has no member or Team-scope editor | No |
| 2026-08-24 | Code | `autobyteus-web/components/applications/setup/ApplicationTeamLaunchProfileEditor.vue`; `autobyteus-web/utils/application/applicationLaunchProfile.ts` | Inventory application profile authoring | Application setup stores root defaults plus complete leaf-profile identity and exact Agent runtime/model overrides; it has no nested-Team profile subject | No |
| 2026-08-24 | Code | `autobyteus-application-sdk-contracts/src/execution-resources.ts`; `autobyteus-application-sdk-contracts/src/index.ts`; `autobyteus-application-backend-sdk/src/launch-profile.ts` | Trace application launch contract | Configured profiles expand to root defaults plus per-leaf complete launch records; public Team launch supports root preset or complete `memberConfigs`, but no explicit Team-scope policy/default contract | Design must extend one current contract, not infer a default from a leaf |
| 2026-08-24 | Code | `autobyteus-server-ts/src/external-channel/domain/models.ts`; `.../runtime/channel-binding-run-launcher.ts`; `.../providers/file-channel-binding-provider.ts` | Trace external-channel launch | External Team binding owns one complete root preset; backend expands it uniformly to every leaf | No |
| 2026-08-24 | Code | `autobyteus-server-ts/src/api/graphql/types/agent-team-run.ts`; `.../services/team-run-service.ts` | Trace API/service entry | GraphQL and service accept only complete per-Agent member configs; preset expansion also flattens directly to Agents | Design team-policy input boundary |
| 2026-08-24 | Code | `autobyteus-server-ts/src/agent-team-execution/services/team-run-execution-tree-builder.ts`; `autobyteus-server-ts/src/run-history/store/team-run-execution-tree-schema.ts`; `.../team-run-execution-tree-store.ts` | Trace write/read/restore schema | V1 writer/restorer maps Agent launch facts only; exact-key validation rejects added Team fields and current store accepts only schemaVersion 1 | Migration required |
| 2026-08-24 | Code | `autobyteus-server-ts/src/run-history/services/team-run-state-package-loader.ts`; `.../team-run-v1-package-catalog.ts`; `.../services/agent-team-run-manager.ts` | Trace startup admission and restore | Package catalog validates/repairs V1 before admission; manager rebuilds runtime config solely from admitted execution tree | New migration must run before current-schema catalog/readers |
| 2026-08-24 | Code | `autobyteus-team-stream-contracts/src/team-execution-view-dtos.ts`; `autobyteus-server-ts/src/services/agent-streaming/team-execution-view-projector.ts`; `autobyteus-web/services/teamExecution/teamExecutionContextFactory.ts` | Trace live/history projection | Wire DTO omits Team defaults; frontend reconstructs a synthetic root baseline from the root coordinator and diffs all Agents against it | New-format projection reads stored Team defaults; coordinator reconstruction is isolated to migration |
| 2026-08-24 | Code | `autobyteus-server-ts/docs/design/production_data_migration_conventions.md`; `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts` | Determine transition rules | Current runtime must be forward-only; legacy interpretation belongs in a registered startup migration with ordinary retry | No |
| 2026-08-24 | Data/Command | `jq` over `autobyteus-server-ts/tests/fixtures/app-data-migrations/team-run-execution-tree-v1/*/team_run_execution_tree.json`; direct-coordinator invariant in `team-run-execution-tree-schema.ts` | Inspect representative current persisted shape and fallback availability | Fixtures contain `/`, `/architecture`, `/qa`, and `/qa/automation` Team scopes and heterogeneous Agent snapshots but no Team default field; every configured Team has a persisted direct coordinator address and complete coordinator launch snapshot | No |
| 2026-08-24 | User clarification | Nested subteams should expose their global configuration and inherit the parent when untouched; `skillAccessMode` remains root-inherited as it works now | Lock the scoped-field boundary | Nested scopes expose runtime, model/model configuration, workspace, and auto-execute; skill access is not a nested override | No |
| 2026-08-24 | User clarification | Historical Team defaults should be derived from the direct coordinator because users normally leave the coordinator on the global configuration | Lock the V1 reconstruction policy | V1 migration copies each Team's persisted direct coordinator launch snapshot into that Team's reconstructed default; the accepted risk is a historical coordinator-specific override | Design migration and focused fixture coverage |
| 2026-08-24 | User approval | Complete `requirements.md` and `hierarchical-launch-configuration-behavior.md` decision bundle | Authorize solution design | The user approved the clarified requirements, requested migration-convention/latest-example study, and required personal review before architecture review | Complete design package; do not hand off yet |
| 2026-08-24 | Design authority | `.codex/skills/solution-designer/design-principles.md`; `.codex/skills/solution-designer/templates/design-spec-template.md`; `.codex/skills/solution-designer/references/design-examples.md` | Apply the mandated architecture workflow | Target design must be spine-led, owner-specific, semantically tight, clean-cut, and explicit about migration/removal | No |
| 2026-08-24 | Migration convention | `autobyteus-server-ts/docs/design/production_data_migration_conventions.md`; `autobyteus-server-ts/README.md` (`Production data migrations`) | Govern the V1-to-current transition | Use a deterministic known-source-to-fixed-target transform, one writer/stable-attempt assumptions, forward-only current runtime, before/after validation, truthful capability-scoped failure, bounded diagnostics, and ordinary runner retry; no speculative journal/backup/state machine | No |
| 2026-08-24 | Command | `git log --all --date=iso-strict --format=... -- tickets/done/*migration*/design-spec.md tickets/done/nested-team-history-restart-hydration/design-spec.md` | Identify the latest two completed migration-design rounds | Latest were nested Team history/restart repair archived 2026-08-24 and app-data migration summary redesign finalized 2026-08-21; the prior token-ledger migration was 2026-07-03 | Read both latest designs and their implementations |
| 2026-08-24 | Latest migration design and implementation | `tickets/done/nested-team-history-restart-hydration/design-spec.md`; `autobyteus-server-ts/src/app-data-migrations/migrations/team-agent-memory-layout-app-data-migration.ts` | Learn the latest filesystem-migration simplification | One cohesive definition owns a closed disposition table and a small deterministic loop; reuse the runner/ledger/manual Retry; cap sorted examples at five per reason; avoid a generic planner/relocator, backup, journal, `fsync` protocol, or mechanical-failure matrix | Apply the same proportionate shape to the execution-tree rewrite |
| 2026-08-24 | Latest migration design and implementation | `tickets/done/app-data-migration-summary-log-redesign/design-spec.md`; `autobyteus-server-ts/prisma/migrations/20260820090000_redesign_app_data_migration_summary/migration.sql` | Learn the latest database-migration simplification | Keep legacy interpretation in one durable migration boundary, validate before mutation, use the existing atomic boundary, leave current runtime on one shape, and retain the migration for direct/skip upgrades | Apply the same one-boundary/current-only rule; use the existing atomic file writer rather than SQL |
| 2026-08-24 | Code | `autobyteus-server-ts/src/app-data-migrations/migrations/team-run-migration-state-classifier.ts`; `.../team-run-execution-tree-v1/*`; `.../team-agent-memory-layout-app-data-migration.ts`; `.../run-history/store/team-run-file-commit-writer.ts` | Resolve sequencing and legacy-boundary mechanics | The V1 promotion and memory-layout migration currently depend on current-schema V1 types; the new V2 migration must be registered after both, while exact V1 types/validators/builders used by those historical migrations move behind a migration-owned boundary. The shared writer already distinguishes pre-rename failure from post-rename finalization uncertainty | Design V1 isolation and V2 final-state reread explicitly |
| 2026-08-24 | User design review | Naming review of the complete launch value and execution-tree node types | Remove misleading or nonparallel names before architecture review | The approved shared value name is `AgentLaunchConfiguration`: an Agent stores it as its actual `launchConfiguration`, while a Team stores the same value as `defaultLaunchConfiguration`. `TeamRunLaunchConfiguration` and `*Snapshot` are rejected. The target execution-tree type family uses parallel `ConfiguredExecutionNode`, `ConfiguredAgentExecutionNode`, `ConfiguredTeamExecutionNode`, and `RootConfiguredTeamExecutionNode` names | Update design and revision record; continue user review hold |
| 2026-08-24 | User design review | Request for a dedicated contract with a realistic materialized Team execution-tree example | Make the proposed V2 persistence shape directly reviewable | Added `team-execution-tree-v2-contract.md` with exact types, materialization rules, a root/nested/sibling JSON example, explicit V2 runtime-kind values, V1 conversion rules, and excluded shapes | User review/approval of the proposed contract |
| 2026-08-24 | User design review | Whether `TeamRunExecutionTreeFileV2` and materialized `schemaVersion: 2` are unnecessarily duplicative | Resolve compile-time versus persisted version naming | The user chose to retain `V2` in the file-payload type name. `schemaVersion: 2` also remains as the persisted discriminator used by migration/storage classification | Record the intentional dual version markers; continue contract review |
| 2026-08-24 | User approval | Completed personal review of the design package, concrete V2 contract, and forward-only migration failure semantics | Release the package for architecture review | The user approved the solution package and explicitly authorized architecture-review handoff. Normal application code remains V2-only; migration failure is capability-scoped, truthfully recorded as failed, and leaves the affected TeamRun excluded with Retry available | Submit the cumulative package to `/architecture_reviewer` |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Select AgentTeam and configure new TeamRun | Team definition -> root TeamRun template -> config store -> root form | One root global config is editable | Root form/template/store |
| BEH-002 | User | Expand Team members override panel | Definition tree -> `MemberOverrideTree` recursion | Nested teams group leaf controls but are not config subjects | Member tree component |
| BEH-003 | Contract | Build launch payload | Root config + exact Agent override -> leaf record builder | Every leaf is fully resolved directly against root | Member config builder |
| BEH-004 | Contract | Edit/lock/launch a draft | Pinia draft store -> immutable cloned config -> in-flight lock | Root and Agent edit subjects only | TeamRunConfig type/store |
| BEH-005 | System | Create and restore TeamRun | GraphQL `memberConfigs[]` -> planner -> compiled topology -> execution tree -> restore | Agent settings persist; TeamRun defaults do not | GraphQL/planner/domain/persistence |
| BEH-006 | Contract | Seed config from AgentTeam definition | `buildTeamRunTemplate(rootDefinition)` | Only root definition default seeds launch | Definition launch defaults |
| BEH-007 | User | Inspect selected historical TeamRun configuration | V1 exact-schema tree -> DTO projection -> `createTeamConfigurationView` -> read-only form | Agent details are known; root defaults are currently fabricated from the coordinator and nested-Team defaults are absent | V1 schema/fixture, DTO projector, frontend context factory |
| BEH-008 | System | Mobile, application, external channel, or backend preset launches a team | shared mobile draft or application profile/SDK or external preset -> leaf records/preset expansion -> normal create service | Root-only presets configure all leaves uniformly; application may add exact Agent overrides; no path carries Team defaults | Mobile/app/SDK/external/service traces |
| BEH-009 | User | Load, recover, lock, or navigate TeamRun launch controls | root form/runtime model fields/workspace selector/member items -> readiness and draft lock | Existing root/Agent paths show loading/error/locked/read-only feedback and accessible control state; nested Teams have no equivalent controls because they are display-only | Root form, Agent item, readiness utility, draft store |

## Design Health Assessment Evidence

- Change posture: `Behavior Change` and prerequisite feature
- Candidate root cause classification: `Shared Structure Looseness` plus `Boundary Or Ownership Issue`
- Refactor posture evidence summary: Team topology has Team subjects, but launch configuration flattens them away before resolution. A correct solution needs a tight shared hierarchy model and one resolution owner rather than recursive-component state or repeated caller-specific merging.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `TeamRunConfig` | Root globals and Agent overrides coexist without Team scopes | Shape does not represent the actual nested TeamRun domain | Define tighter authoring hierarchy |
| `MemberOverrideTree` | Nested Team is display-only | UI can expose a team editor, but it cannot own resolution policy | Keep resolution in reusable owned utility/store boundary |
| Root/Agent form controls | Current controls already expose loading/error, locked/read-only, disclosure, focus, and screen-reader semantics in the root/Agent paths | The nested scope must reuse or preserve those behavior classes rather than creating an ungoverned parallel UI | Cover scoped state and accessibility in the approved behavior contract |
| Member config builder | One root-based merge per leaf | Nearest-team precedence needs one canonical resolver shared by workspace draft projection | Callers inventoried: workspace desktop/mobile and application frontend helper |
| Backend Team nodes | No effective launch default | Dynamic-team prerequisite would have no containing-Team default after restore | Extend runtime, persistence, wire, and read-only projection contracts |
| V1 exact schema/catalog | Shape cannot grow in place and current readers are V1-only | A deterministic registered migration and one new forward-only schema are required | Reconstruct each historical Team default from its required direct coordinator snapshot |
| Application SDK launch | Explicit mode carries only leaf records | Backend cannot truthfully persist a Team default from arbitrary leaf variation | Extend the current Team launch policy contract; never infer from coordinator |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/types/agent/TeamRunConfig.ts` | Team launch draft config | Missing team-scope subject | Modify/tighten shared config shapes |
| `.../types/agent/TeamLaunchDraft.ts` | Explicit config edit commands | No team-scope edit operation | Add subject-specific team edit/reset commands |
| `.../stores/teamRunConfigStore.ts` | Draft lifecycle and edits | Root-only mutation/pruning policy | Remain draft owner; delegate hierarchy resolution to owned utility |
| `.../components/workspace/config/TeamRunConfigForm.vue` | Root config UI | Root controls render once | Compose reusable team-scope editor |
| `.../components/workspace/config/MemberOverrideTree.vue` | Recursive nested/Agent display | Team nodes have no editor | Render inherited/custom Team scope state recursively |
| `.../utils/teamDefinitionMembers.ts` | Canonical member tree | Already distinguishes Team and Agent addresses | Reuse as hierarchy input |
| `.../utils/teamRunMemberConfigBuilder.ts` | Complete Agent record projection | Root-only resolution | Replace with hierarchy-aware projection owner |
| `.../services/teamExecution/*` | Draft-to-execution projection | Tests encode root-only globals | Update all production projection paths |
| `.../api/graphql/types/agent-team-run.ts` | TeamRun create/history API | Only per-Agent create configs | Add team-scope contract |
| `.../services/team-definition-topology-planner.ts` | Definition graph + launch config compilation | Team nodes lack config | Validate/attach complete effective TeamRun defaults |
| `.../domain/team-run-config.ts` | Runtime compiled topology | Team node shape lacks default | Add complete effective default to Team node |
| `.../domain/team-run-execution-tree.ts` | Persisted rooted execution tree | Team execution shape lacks default | Persist/restore Team defaults |
| `autobyteus-team-stream-contracts/src/team-execution-view-dtos.ts` | Strict execution-tree DTO | Team nodes omit defaults | Add a complete Team default to the one current DTO shape; migration supplies it for V1 packages |
| `.../teamExecution/teamExecutionContextFactory.ts` | Builds frontend configuration view | Uses root coordinator as synthetic baseline | Read stored Team defaults; keep coordinator reconstruction inside migration only |
| `.../components/mobile/MobileRunSetup.vue` | Compact mobile launch | Root-only Team settings | Preserve as root-only authoring; shared projection supplies Team defaults |
| `.../applications/setup/ApplicationTeamLaunchProfileEditor.vue` | Application resource profile | Root defaults + leaf Agent runtime/model overrides | Preserve authoring scope; current launch contract supplies explicit root policy |
| `autobyteus-application-sdk-contracts/src/index.ts` | Public application Team launch | Preset or complete leaf records only | Extend current hierarchical policy without a coordinator fallback |
| `.../external-channel/runtime/channel-binding-run-launcher.ts` | Lazy external Team launch | Root preset expansion | Preserve root-only authoring and compile inherited Team defaults |
| `.../run-history/store/team-run-execution-tree-schema.ts` | Exact current file validator | V1 Team keys cannot be expanded | Replace with one new current schema after migration |
| `.../app-data-migrations/app-data-migration-registry.ts` | Startup migration ordering | Existing Team V1 migration already precedes catalog availability | Register V1-to-new-schema migration after V1 promotion and before current readers |

## Runtime / Probe Findings

- No server or browser process was started; this worktree has no installed `node_modules`, so executable UI probing was not used to manufacture evidence.
- Source-render trace confirms the nested Team branch in `MemberOverrideTree.vue` renders only label/address and recurses with unchanged root globals.
- A bounded `jq` probe inspected all five repository V1 migration fixtures. Each contains nested configured Teams at `/architecture`, `/qa`, and `/qa/automation`; Agent launch configurations consistently contain runtime/model/config/auto-execute/skill/workspace, while Team nodes contain no default configuration.
- The fixtures include heterogeneous Agent runtime/model values inside the same Team, so the original Team default is not mathematically recoverable. The user explicitly selected the persisted direct coordinator snapshot as the deterministic historical fallback and accepts that a coordinator-specific override, if one existed, becomes the reconstructed default.

## External / Public Source Findings

N/A. Repository-native behavior governs this change.

## Reproduction / Environment Setup

- No services or accounts required for bootstrap.
- Dedicated latest-base worktree created before artifact authoring.
- No temporary investigation files outside the ticket package.

## Findings From Code / Docs / Data / Logs

1. The user's report is confirmed: a nested team is a visual container, not a configuration scope.
2. Canonical Team addresses already exist in the frontend tree, so scope identity does not need a new naming system.
3. Current editable launch data has two semantic levels (root and Agent); target editable intent needs three (root Team, nested Team, Agent).
4. Authoring intent should remain partial/inherited, but runtime/persistence shapes should be complete snapshots.
5. Backend persistence changes belong in this prerequisite, otherwise Dynamic AgentTeam would still be unable to restore a containing TeamRun's default.
6. The complete executable field set is runtime, model, model-specific config, auto-execute, skill access, and workspace. Current workspace UI can reasonably scope all except skill access, which is not editable anywhere in the Team launch UI.
7. Mobile, application-profile, external, and backend-preset surfaces can preserve their compact/root-only Team authoring by expressing no nested-Team override; semantic parity does not require adding hierarchy editors to each surface.
8. V1 history requires transformation because exact-key validation prevents in-place tolerant expansion. Every Team has a required direct coordinator Agent with a complete persisted launch snapshot; the user selected that snapshot as the historical Team-default reconstruction policy.
9. Current code already has a startup app-data migration registry and forward-only migration conventions suitable for a V1-to-new-schema transition.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject, location, representative shape, and approximate volume: one `team_run_execution_tree.json` V1 file per durable root TeamRun package under the Team memory layout. Five repository fixtures were inspected; user installation volume is unbounded by this ticket and migration traversal must use the existing bounded package/migration conventions.
- Relevant code-model, serialization, semantic, or physical-store change: add complete effective launch configuration to root and configured nested-Team execution nodes and expose it through restore/history.
- Normal readers and writers, including unknown/extra-field behavior: `buildInitialTeamRunExecutionTree`, exact V1 `validateTeamRunExecutionTreePayload`, `TeamRunExecutionTreeStore`, package loader/catalog, manager restore, Team stream/history projector, strict shared DTO, and frontend configuration-view factory. Extra/missing Team keys are rejected.
- Representative direct-read or compatibility evidence: V1 fixtures validate the current shape and show complete Agent snapshots but no root/nested Team default. The frontend currently chooses the root coordinator as a synthetic baseline; no nested baseline exists.
- Required semantics and invariants preserved by direct use: V1 cannot be directly used as the target because the required Team default meaning is absent and exact shape validation blocks extension.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints: run history is durable user data and must not be discarded solely for schema convenience.
- Concrete benefit, cost, and risk of migration: migration establishes one current schema and preserves old runs by copying each Team's direct coordinator snapshot into its reconstructed default. This is deterministic and normally matches the former global configuration, but a historical coordinator-specific override becomes the reconstructed default. The user explicitly accepts that tradeoff. Current definition defaults or non-coordinator Agents must not participate.
- Existing migration framework or lifecycle constraints: register after the existing TeamRun V1 promotion; use startup execution and ordinary retry; current package catalog/runtime must consume only the new schema. Do not retain V1 runtime readers.
- Decision: `Migration Required`; coordinator-based reconstruction policy and the complete requirements basis were explicitly approved by the user on 2026-08-24.

## Constraints / Dependencies / Compatibility Facts

- Latest hierarchical AgentTeam addressing is authoritative.
- Every Team placement has a canonical rooted address and concrete TeamRun identity at runtime.
- Agent runtime construction requires complete resolved settings.
- Root-only presets must remain meaningful through inheritance.
- Dynamic AgentTeam Runtime depends on this ticket, not vice versa.

## Open Unknowns / Risks

- No material product decision remains open for solution design. The user approved the nested field boundary, embedded-definition behavior, root-only non-workspace authoring, stale-address repair notice, and direct-coordinator migration rule.
- Exact names and file allocation are design-owned and are fixed in `design-spec.md`; implementation may change a private helper name only if it preserves the documented owner and boundary.
- Application SDK/current-contract extension is cross-package work; source and checked-in `dist` artifacts must move together, with no leaf/coordinator inference fallback for new runs.
- V1 migration isolation touches the existing V1 promotion path because that historical migration currently imports the normal runtime V1 schema/builder/store. The design must move that knowledge into migration-owned code before making normal runtime V2-only.
- No executable UI probe was run in this dependency-free worktree. Downstream implementation/API-E2E stages must validate nested inherited/custom/read-only states in a real rendered browser and migration behavior against disposable copied fixtures.
- The user completed personal review and authorized architecture review; no user-review hold remains.

## Notes For Architecture Reviewer

Review is requested. The requirements basis, intended-behavior supplement, and concrete V2 execution-tree contract are user-approved. The completed `design-spec.md` traces distinct spines for workspace draft editing, hierarchy resolution, root-only launch projection, backend planning, persistence/restore, migration, and historical read-only projection. Pay particular attention to the clean V2-only runtime boundary, migration-only coordinator reconstruction, exact Team/Agent coverage validation, and preservation of root-only auxiliary launch surfaces.

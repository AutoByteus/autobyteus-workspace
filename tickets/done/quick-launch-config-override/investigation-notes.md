# Quick-Launch Configuration Override Investigation Notes

## Investigation Status

- Bootstrap Status: Complete—dedicated worktree created from refreshed `origin/personal`.
- Current Status: Investigation and architecture-level design complete; the user-approved solution package is validated and ready for initial architecture review.
- Investigation Goal: Determine whether the event-monitor quick-launch panel discards edited launch configuration, classify the affected paths, and identify the correct ownership boundary for a fix.
- Scope Classification: `Medium`
- Scope Classification Rationale: The confirmed team defect originates in one frontend projection but crosses the existing-run quick-launch entrypoint, immutable draft edits, per-member payload construction, server execution tree, hydration/read-only display, persisted history, and standalone-agent regression boundary.
- Scope Summary: Team and agent quick launch from selected event-monitor runs; editable launch configuration; genuine team member override semantics; no definition or history mutation.
- Primary Questions Resolved:
  - The header action is owned by `AgentWorkspaceView` / `TeamWorkspaceView` through `WorkspaceHeaderActions`.
  - Team edits are stored in an immutable `TeamLaunchDraft`; submission uses the exact admitted draft.
  - The defect affects team global fields that have corresponding member override fields: runtime, model identifier, model config, and auto-approval.
  - The deterministic stale-value defect was not found in the standalone-agent path.
  - The backend honors the per-member payload; stale values are already selected by the frontend payload builder because the input projection marks every historical member value explicit.

## Request Context

The user reports that the event-monitor convenience `+` action can start a new standalone agent or team from the selected run's launch configuration and permits per-launch edits. After changing the model/configuration and selecting `Run Agent` or `Run Team`, the newly created run appears to use the old source configuration. Two screenshots show the selected event-monitor header action and the populated team launch form.

## Environment Discovery / Bootstrap Context

- Project Type: `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/quick-launch-config-override`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/quick-launch-config-override/tickets/in-progress/quick-launch-config-override`
- Current Branch: `codex/quick-launch-config-override`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/quick-launch-config-override`
- Initial Bootstrap Base Branch: `origin/personal` at `122adc91c184a75541489eea670ac29fcb43f4ab`
- Pre-Design Refresh Result: A second `git fetch origin personal --prune` on 2026-08-21 found `origin/personal` at `49a02eb4bc13c687e6967f11eab318e1134d41b8`; the task branch was fast-forwarded with `git merge --ff-only origin/personal` before design production.
- Pre-Handoff Refresh Result: `origin/personal` advanced again through release/evidence-only commits to `6ceaf2ec5349752d0afb6d9be3326833451a4aca`; the task branch was fast-forwarded before package validation, with no change to the designed source paths.
- Authoritative Design / Implementation Baseline: `6ceaf2ec5349752d0afb6d9be3326833451a4aca`
- Task Branch: `codex/quick-launch-config-override` (tracks `origin/personal`)
- Expected Base Branch: `personal`
- Expected Finalization Target: `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Use only the dedicated task worktree. The shared base checkout contains an unrelated untracked `.article-work/` directory and must not be used for ticket edits.

## Supplemental Task Artifact Inventory

None. The screenshots remain external request evidence; the disposable probe was intentionally removed after its result was recorded here.

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-08-21 | Doc | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/.codex/skills/solution-designer/design-principles.md` | Apply canonical design/investigation rules | Requires approved behavior map, full production spine, authoritative boundary, persisted-data decision, and clean-cut replacement. | Use during design after approval. |
| 2026-08-21 | Other | `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_06607b8fd9644de58fb3de3790228d1d/solution_designer_c0f794428de541b2bdcf0883513ee740/context_files/ctx_b931c1194c4f__image.png` | Inspect the reported event-monitor context | Shows the central event monitor with header cog and `+` convenience action. | No. |
| 2026-08-21 | Other | `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_06607b8fd9644de58fb3de3790228d1d/solution_designer_c0f794428de541b2bdcf0883513ee740/context_files/ctx_e7fc138b0fe7__image.png` | Inspect the quick-launch configuration state | Shows editable team runtime, global model, model config, workspace, auto-approval, and `Run Team`. | No. |
| 2026-08-21 | Command | `git fetch origin personal --prune`; `git worktree add -b codex/quick-launch-config-override ... origin/personal` | Establish isolated current baseline | Worktree created at refreshed remote base commit. | No. |
| 2026-08-21 | Code | `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue` lines 139-144 | Trace event-monitor team `+` action | Copies `activeTeamContext.view.getConfigurationView()` through `buildEditableTeamRunSeed` into the team draft store. | Design canonical source view. |
| 2026-08-21 | Code | `autobyteus-web/components/workspace/agent/AgentWorkspaceView.vue` lines 142-147 | Trace event-monitor agent `+` action | Copies selected agent config through `buildEditableAgentRunSeed`; clears source selection. | Preserve. |
| 2026-08-21 | Code | `autobyteus-web/components/workspace/config/RunConfigPanel.vue` lines 237-398 | Trace edit and run ownership | Team edits call store commands; `Run Team` admits `selectedDraft`; agent run copies store config into a temp context. | Preserve admission guards. |
| 2026-08-21 | Code | `autobyteus-web/services/teamExecution/teamExecutionContextFactory.ts` lines 65-94 | Inspect existing-run team config projection | Coordinator becomes global baseline, but every member is also emitted with a complete explicit runtime/model/config/auto override. | Confirmed defect origin. |
| 2026-08-21 | Code | `autobyteus-web/stores/teamRunConfigStore.ts` and `autobyteus-web/utils/teamRunConfigUtils.ts` | Inspect immutable edit and inheritance semantics | Store correctly replaces frozen snapshots; global model/runtime edit prunes only inherited stale member config; explicit member values intentionally win. | Do not add store workaround. |
| 2026-08-21 | Code | `autobyteus-web/utils/teamRunMemberConfigBuilder.ts` | Inspect payload materialization | Correctly resolves each member as explicit override first, otherwise global. Redundant projected overrides therefore shadow visible global edits. | Regression-test boundary. |
| 2026-08-21 | Code | `autobyteus-web/stores/agentTeamRunStore.ts` lines 309-348; `autobyteus-web/graphql/mutations/agentTeamRunMutations.ts` | Trace team submission | Exact admitted draft is converted to `memberConfigs` and sent via `CreateAgentTeamRun`. | Preserve exact-snapshot invariant. |
| 2026-08-21 | Code | `autobyteus-server-ts/src/api/graphql/types/agent-team-run.ts`; `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts`; `team-definition-topology-planner.ts` | Verify server treatment | Server accepts member configs, normalizes runtime/workspace, and persists supplied member runtime/model/config/auto values into the execution tree. | No server change indicated. |
| 2026-08-21 | Code | `autobyteus-web/stores/agentContextsStore.ts` lines 76-112; `autobyteus-web/stores/agentRunStore.ts` lines 89-170 | Trace standalone agent | Edited store template is copied into temp context; first-message `PrepareAgentRun` uses that context's current model/runtime/config/workspace/auto values. | Regression coverage only. |
| 2026-08-21 | Code | `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts`; `teamExecutionContextFactory.ts` | Trace return/read path | Stored execution tree is schema-validated; config view is recreated from effective member launch settings. | Projection fix also corrects read-only override presentation. |
| 2026-08-21 | Data | `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_915e4b79d07545dcb15945824cf92e41/team_run_execution_tree.json` and `.../software_engineering_team_06607b8fd9644de58fb3de3790228d1d/team_run_execution_tree.json` | Compare apparent source and reported new run | Both contain six members with `CODEX`, `gpt-5.6-sol`, `{reasoning_effort:xhigh}`, auto-approval true, same workspace. This corroborates old values surviving, but intended new pre-submit value is not logged. | No. |
| 2026-08-21 | Data | Read-only SQLite query on `token_usage_run_records` for the reported solution-designer run | Distinguish stale display from runtime use | Latest runtime record is `codex_app_server` / `gpt-5.6-sol`; actual runtime agreed with persisted new-run configuration. | No. |
| 2026-08-21 | Command | `find .../memory/agent_teams ... team_run_execution_tree.json | wc -l`; `jq` history index | Assess persisted data volume and schema | 509 schema-v1 team execution trees in the observed installation; history index has 509 entries. | No migration required. |
| 2026-08-21 | Test | Disposable `test-support/__tmp_quick_launch_config_probe.spec.ts`; `pnpm --dir autobyteus-web test:nuxt --run ...` after `nuxi prepare` | Reproduce projection/edit/payload boundary | Passed 1/1: projected overrides retained `old-model`/`low` after global draft changed to `new-model`/`xhigh`, proving the defect. File removed after result capture. | Convert to durable regression coverage during implementation/API-E2E as owned downstream. |
| 2026-08-21 | Test | `pnpm --dir autobyteus-web test:nuxt --run` with eight focused agent/team workspace, form, context, and run-store specs | Validate current neighboring behavior | 8 files, 91 tests passed. Coverage validates pieces but omits faulty projection-to-payload sequence. | Preserve passing behavior and add boundary regression. |
| 2026-08-21 | User confirmation | Conversation approval after investigation findings were presented | Lock the intended inheritance semantics and path scope | User confirmed the bug is team-only in their own testing, confirmed standalone model/runtime edits work, approved equal-to-global as inherited, and authorized design work under project principles. | Produce design and architecture-review package. |
| 2026-08-21 | Command | `git fetch origin personal --prune`; `git merge --ff-only origin/personal` | Re-verify dedicated baseline after approval | Task branch fast-forwarded from `122adc91c` to latest `origin/personal` `49a02eb4b`; incoming change was delivery evidence only and did not alter the investigated frontend path. | Use `49a02eb4b` as design/implementation baseline. |
| 2026-08-21 | Doc / code | Design template, revision template, design examples 4 and 8; `TeamRunConfig.ts`, `teamRunConfigUtils.ts`, `useDefinitionLaunchDefaults.ts`, member override components, and focused tests | Complete architecture-level read and concrete file mapping | Confirmed the projection owner and also found `MemberConfigOverride.agentDefinitionId` is redundant: address-keyed overrides never read it, while payload identity comes from the current leaf definition. The local model-config equality helper also duplicates a shallower normalizer than the existing canonical deep normalizer. | Remove the redundant override identity field and shallow duplicate normalizer as part of the in-scope representation refactor. |
| 2026-08-21 | Command | Fast-forward task branch from `49a02eb4b` to `origin/personal` `6ceaf2ec5`; inspect the relevant-path diff | Re-verify the baseline immediately before solution handoff | Incoming commits changed release metadata/evidence paths only; none of the projected production or test-owner files changed. | Record `6ceaf2ec5` as the authoritative downstream baseline. |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Select a live/hydrated team member and click the event-monitor header `+`, edit global launch fields, then `Run Team`. | `TeamWorkspaceView.createNewTeamRun` -> selected `TeamExecutionViewState.configuration` -> editable team draft -> `TeamRunConfigForm` edits -> immutable draft replacement -> `RunConfigPanel.handleRun` -> `agentTeamRunStore.launchDraft` -> `buildTeamRunMemberConfigRecords` -> GraphQL -> server topology -> runtime. | Intended invariant is visible draft = admitted snapshot. Current projection violates it semantically by encoding old effective values as explicit member overrides; payload and runtime then correctly use those old values. | Code trace and passing disposable probe. |
| BEH-002 | User | Select a standalone agent and click header `+`, edit, `Run Agent`, then send first message. | `AgentWorkspaceView.createNewAgent` -> editable config store -> `AgentRunConfigForm` direct reactive edits -> `RunConfigPanel` -> `agentContextsStore.createRunFromTemplate` -> temp context -> first message -> `agentRunStore.sendUserInputAndSubscribe` -> `PrepareAgentRun`. | Edited config is copied and submitted; source remains separate. No current supported defect found. | Code trace and focused passing specs. |
| BEH-003 | Contract | Team global fields apply unless a `MemberConfigOverride` explicitly supplies that field. | `teamRunConfigStore` owns base/override draft -> `teamRunConfigUtils` resolves inheritance -> `teamRunMemberConfigBuilder` materializes full member records. | Explicit differences win; absent fields inherit. Current projector supplies redundant explicit fields, so it changes the meaning of later global edits. | `teamRunConfigUtils.ts`, builder, store tests. |
| BEH-004 | System | Hydrate a live or historical team execution from schema-v1 execution-tree history. | GraphQL resume config -> DTO schema -> `hydrateCurrentTeamRunContext` -> `createTeamConfigurationView` -> read-only config / quick-launch seed. | Stored tree is immutable effective execution truth. The view should be lossless for effective values and directly readable without migration. | Stored representative trees and hydration code. |

## Design Health Assessment Evidence

- Change posture: `Bug Fix`
- Candidate root cause classification: `Shared Structure Looseness`
- Refactor posture evidence summary: A local representation refactor is required now at the existing projection owner. The edit store, payload builder, and server are behaving according to their contracts; adding fixes there would duplicate policy or bypass the authoritative source boundary.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `teamExecutionContextFactory.ts` | One flattened execution shape is re-expressed as both a global baseline and complete member overrides. | `TeamRunConfig.memberOverrides` loses its singular "difference from global" meaning. | Replace with minimal deltas. |
| `teamRunMemberConfigBuilder.ts` | Explicit member values correctly have precedence. | Builder is healthy; submission workaround would be a forbidden mixed-level fix. | Keep unchanged except tests if needed. |
| `teamRunConfigStore.ts` | Immutable draft and exact admission are healthy. | Store should continue to own edits/in-flight exclusion, not source reconstruction. | Preserve. |
| Standalone code/tests | Agent draft uses one config, with no parallel override representation. | No design issue found for standalone scope. | Regression-only. |
| Persisted tree | Stores effective values only. | Cannot recover authoring intent; canonical base-plus-delta projection is necessary and sufficient. | Document rule and no-migration decision. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/workspace/common/WorkspaceHeaderActions.vue` | Shared header cog/`+` surface | Emits generic new-run action. | Thin facade; no change needed. |
| `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue` | Team event-monitor entrypoint | Seeds draft from selected execution configuration. | Correct caller of authoritative config view; no local pruning. |
| `autobyteus-web/components/workspace/agent/AgentWorkspaceView.vue` | Agent event-monitor entrypoint | Seeds standalone draft correctly. | Preserve. |
| `autobyteus-web/services/teamExecution/teamExecutionContextFactory.ts` | Maps execution DTOs into frontend agent contexts and team configuration view | Emits redundant all-member overrides. | Authoritative fix owner for canonical projection. |
| `autobyteus-web/composables/useDefinitionLaunchDefaults.ts` | Clones/builds editable configs from definition/current config | Faithfully preserves provided overrides. | Keep as a clone boundary, not a semantic repair boundary. |
| `autobyteus-web/stores/teamRunConfigStore.ts` | Owns immutable team draft lifecycle and edits | Healthy exact-snapshot and inheritance-pruning behavior. | Do not bypass. |
| `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue` | Presents global fields and member override controls | Emits typed edits and truthfully follows `memberOverrides`. | Presentation correct once source view is tight. |
| `autobyteus-web/utils/teamRunConfigUtils.ts` | Defines meaningful override/effective inheritance/model-config equality | Existing `modelConfigsEqual` and `hasMeaningfulMemberOverride` fit canonicalization. | Reuse rather than duplicate equality rules. |
| `autobyteus-web/types/agent/TeamRunConfig.ts` | Defines the global team baseline and address-keyed member delta shape | `MemberConfigOverride.agentDefinitionId` duplicates identity already carried by the canonical address key and current leaf definition, and no production consumer reads it. | Remove the redundant field so an override contains launch-setting deltas only. |
| `autobyteus-web/components/workspace/config/MemberOverrideItem.vue` / `MemberOverrideTree.vue` | Construct and route editable member deltas | The item receives `agentDefinitionId` only to copy it into the redundant override field. | Remove the prop/binding while preserving address-keyed edit routing and all field controls. |
| `autobyteus-web/utils/teamRunMemberConfigBuilder.ts` | Materializes per-member API records | Correct precedence exposes faulty input. | Preserve as authoritative materializer. |
| `autobyteus-web/stores/agentTeamRunStore.ts` | Admits draft, builds member configs, calls GraphQL, hydrates result | Uses exact draft. | Regression assertion target; no behavior workaround. |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts` | Server team run lifecycle | Honors frontend member config. | No server change indicated. |
| `autobyteus-web/stores/agentContextsStore.ts` / `agentRunStore.ts` | Standalone temp-context and backend preparation lifecycle | Correct edited-config path. | Preserve; add/retain coverage. |

## Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-08-21 | Probe | Temporary Vitest constructed two-member old-model execution -> `createTeamConfigurationView` -> editable seed changed to new model/config -> `buildTeamRunMemberConfigRecords` | Test passed asserting visible global was new while both produced member configs remained old. | Deterministic confirmation of team quick-launch bug and exact origin. |
| 2026-08-21 | Test | Focused eight-file Vitest command recorded in Source Log | 91/91 passed. | Existing suites miss cross-boundary defect; neighboring behavior is stable. |
| 2026-08-21 | Trace | `jq` comparison of source/new execution-tree files | Apparent source and new team effective configurations are identical. | Consistent with report; cannot identify intended unsubmitted selection. |
| 2026-08-21 | Trace | Read-only SQLite token usage query | New run actually used recorded old/same model. | Not a display-only hydration issue. |

## External / Public Source Findings

Not applicable. This is repository-specific UI/domain behavior; no public or unstable external contract was needed.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Focused reproduction required only existing frontend pure projector/materializer code and Vitest; no live server mutation.
- Required config, feature flags, env vars, or accounts: `NUXT_TEST=true` is supplied by `test:nuxt`.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: `pnpm --dir autobyteus-web exec nuxi prepare`; temporary worktree-local `node_modules` symlinks to the base checkout's matching dependencies; symlinks removed after tests.
- Cleanup notes for temporary investigation-only setup: Disposable probe file and symlinks were removed. `.nuxt` is ignored generated state. Git status contains only authoritative ticket artifacts.
- Live desktop action was not performed because creating extra user-data runs or changing the active user's configuration was unnecessary after deterministic reproduction. The downstream API/E2E role owns final realistic execution.

## Findings From Code / Docs / Data / Logs

1. The bug is confirmed for team quick launch, not merely suspected.
2. The form, draft store, payload builder, server, and runtime each behave consistently with their contracts; the input configuration shape is semantically wrong.
3. The projection's global value is already coordinator-based. Tightening member overrides to only deltas preserves the current global choice and yields a lossless effective round trip.
4. Equal member values have no persisted authoring-intent marker. Treating them as explicit overrides is both unobservable and contrary to the UI's global/inherited expectation.
5. Genuine differing member values are reachable and supported. They must remain explicit and must not be globally cleared.
6. Standalone agent quick launch uses a single config representation and was not reproduced as faulty.
7. The current user data has 509 execution-tree histories; rewriting them would add risk without benefit.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject, location, representative shape, and approximate volume: 509 schema-v1 JSON files at `/Users/normy/.autobyteus/server-data/memory/agent_teams/<teamRunId>/team_run_execution_tree.json`; each configured member stores effective `runtimeKind`, `llmModelIdentifier`, `llmConfig`, `autoExecuteTools`, `skillAccessMode`, and `workspaceRootPath`. Index: `memory/team_run_history_index.json` (509 entries, about 244 KiB).
- Relevant code-model, serialization, semantic, or physical-store change: No stored schema or writer change. Frontend `TeamRunConfig.memberOverrides` projection changes from complete materialized member copies to semantic deltas from coordinator/global baseline.
- Normal readers and writers, including unknown/extra-field behavior: Server writer records effective member values; GraphQL resume reader validates into `TeamRunExecutionTreeDto`; frontend projection derives the view. The stored fields already contain all values needed for minimal-delta comparison.
- Representative direct-read or compatibility evidence: Current `software_engineering_team_066.../team_run_execution_tree.json` schema version 1 parses and exposes all six member launch configs; current hydration uses no version-specific business branch.
- Required semantics and invariants preserved by direct use: `Yes` — each effective field can be reconstructed exactly as global baseline or an explicit delta; a no-edit materialization returns the original member-effective value.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints: Histories are user run records and must not be rewritten or discarded for this frontend semantic correction.
- Concrete benefit, cost, and risk of migration if it remains a candidate: Migration offers no runtime benefit; it would perform unnecessary I/O across 509 records and introduce corruption/recovery risk. Reader projection is sufficient.
- Existing migration framework or lifecycle constraints, only if migration may be required: Not applicable; decision is `Directly Usable — No Migration`.

## Constraints / Dependencies / Compatibility Facts

- No backward compatibility or dual projection is allowed for the corrected behavior.
- Existing tree histories remain current canonical effective data; the new reader is version-agnostic for schema v1.
- `hasMeaningfulMemberOverride` intentionally ignores identity-only `agentDefinitionId`.
- `modelConfigsEqual` normalizes key ordering and null-like config before comparison; it should govern delta detection.
- Current member override shape does not include workspace or skill-access fields.
- Server APIs expect fully materialized member configs; materialization remains frontend-owned by `buildTeamRunMemberConfigRecords`.

## Open Unknowns / Risks

- The exact alternate model the user selected before the reported launch is not recoverable from logs; the pre-submit browser draft is ephemeral.
- Original historical override intent is not persisted. The target preserves effective values but cannot distinguish a deliberately redundant explicit value from inheritance; no product contract currently exposes such a distinction.
- Member-specific workspace/skill access may be representable in server execution trees but is not representable in the generic team draft override type; explicitly out of scope.

## Notes For Architecture Reviewer

The user approved the Design-ready requirements on 2026-08-21. Architecture review should verify that the design keeps execution-tree projection as the authoritative correction point, tightens `MemberConfigOverride` to launch-setting deltas only, reuses canonical equality/meaning rules, preserves exact immutable-draft admission, rejects submission-time fallback logic, and specifies durable cross-boundary regression coverage.

# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete.
- Current Status: Architecture finding F-001 resolved through explicit user approval; requirements, UI/UX, investigation, and design reworked for SR-003; ready for architecture re-review.
- Investigation Goal: Establish safe and verifiable stopped-only behavior for editing model-specific configuration on already-created standalone Agent Runs and Agent Team Runs.
- Scope Classification (`Small`/`Medium`/`Large`): Medium.
- Scope Classification Rationale: The storage fields already exist, but safe updates cross selected-run UI state, runtime-scoped schema handling, GraphQL, standalone/team lifecycle serialization, persistence, and automatic restore.
- Scope Summary: Keep every active configuration locked; after an explicit Stop, permit only `llmConfig` changes for the fixed runtime/model, persist them without starting/stopping a runtime, and reuse automatic resume on the next message.
- Primary Questions Resolved: Stopped-only eligibility; whole-root Team eligibility; contextual Run-to-Save interaction; persistence shapes; automatic restore consumption; existing Team hierarchy behavior; catalog/validation behavior; Save-versus-restore serialization; effective AutoByteus/Codex/Claude parity.

## Request Context

The user reported that after launching an independent Agent or Agent Team, all configuration controls remain locked even when the run is already stopped. The user specifically wants to change model options such as Codex Default/Fast mode and reasoning effort, and AutoByteus thinking/reasoning settings. The user clarified that the runtime and model itself do **not** change. On 2026-08-25 the user simplified the workflow further: every active state remains locked; the user explicitly stops the run/team first, then edits and saves; the next message automatically resumes it.

Architecture review round `ARCH-REV-001` found that carrying the pre-launch `Reset to inherited` action into stopped existing-Team editing conflicts with the fixed runtime/model boundary for a reachable customized child. The user confirmed the simplest correction on 2026-08-25: do not add Reset-to-inherited to the stopped-run feature; preserve the existing pre-launch Reset flow unchanged.

The supplied screenshot shows selected Team Configuration with disabled Runtime, Default LLM Model, Thinking, Reasoning Effort, Fast mode, workspace, and Auto approve tools controls.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git monorepo.
- Task Workspace Root: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis`
- Task Artifact Folder: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis`
- Current Branch: `codex/live-agent-definition-refresh-analysis`
- Current Worktree / Working Directory: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-08-25. The existing matching task worktree had no task source commits and was reset to current `origin/personal` at `9d0fd7c570d58da1af2c7a40279327c8a20a8093`; the untracked authoritative ticket artifacts were retained.
- Task Branch: `codex/live-agent-definition-refresh-analysis`
- Expected Base Branch (if known): `personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: The requirements basis and UI/UX supplement are re-approved after F-001. Use the current `design-spec.md` produced in SR-003; SR-001's analysis-only design and SR-002's stopped-run Reset wording are obsolete.

## Supplemental Task Artifact Inventory

| Canonical Path | Purpose / Scope | Status | Relationship To Core Artifacts | Related IDs | Approval Applicability |
| --- | --- | --- | --- | --- | --- |
| `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/ui-ux-spec.md` | Defines selected-run user journeys, fixed/editable controls, lifecycle-specific states, minimal Save behavior, error recovery, responsive behavior, and accessibility. | Refined | Approved intended-behavior supplement linked from requirements and design spec. | REQ-002–REQ-005, REQ-008, REQ-010–REQ-012; AC-001–AC-014, AC-016 | Re-approved after F-001 on 2026-08-25. |

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-08-25 | Command | `git fetch origin --prune`; `git reset --hard origin/personal`; `git status --short --branch`; `git rev-parse HEAD origin/personal` | Reuse and refresh the dedicated task worktree from the tracked integration base. | Task branch/worktree is isolated and matches current `origin/personal` at the recorded SHA; only ticket artifacts are untracked. | No |
| 2026-08-25 | Architecture review | `design-review-report.md` / `ARCH-REV-001`, finding `F-001`, material premise `MP-001` | Review SR-002 for implementation readiness. | Existing Team launch authoring can persist a child with a fixed runtime/model different from its parent. A stopped-run Reset cannot make that child inherited through an `llmConfig`-only mutation and copying the parent's config may be invalid. All other reviewed design areas were coherent. | Requirement clarification required and obtained. |
| 2026-08-25 | User clarification | Conversation following `F-001` | Decide whether the stopped existing-Team editor should inherit the pre-launch Reset action. | The user approved the simplest boundary: omit Reset-to-inherited from stopped-run editing and leave existing pre-launch behavior unchanged. | Align requirements, UI/UX, DS-003, examples, and coverage; re-review. |
| 2026-08-25 | User artifact | `.../context_files/ctx_2860ad95e322__image.png` | Inspect the reported selected Team Configuration surface. | Runtime, model, Thinking, Reasoning Effort, Fast mode, workspace, and Auto approve tools appear disabled after launch. | No |
| 2026-08-25 | Code | `autobyteus-web/components/workspace/config/RunConfigPanel.vue`; `AgentRunConfigForm.vue`; `TeamRunConfigForm.vue` | Trace selected-run form mode and actions. | `selectedRunId` enables selection mode; standalone passes `read-only`; teams project a stored form model whose mode is always read-only; selected mode has no Save footer. | No |
| 2026-08-25 | Code | `autobyteus-web/components/launch-config/RuntimeModelConfigFields.vue`; `components/workspace/config/ModelConfigSection.vue`; `utils/llmThinkingConfigAdapter.ts`; `utils/llmConfigSchema.ts` | Determine whether existing controls can represent the requested settings. | One broad disabled/read-only flag locks runtime, model, and `llmConfig`. Existing schema-driven controls already represent provider-specific Thinking and advanced parameters, sanitize values, and expose Codex/other reasoning shapes. | Design separate fixed runtime/model from editable model-config state. |
| 2026-08-25 | Code | `autobyteus-web/stores/runHistoryTypes.ts`; `runHistoryStore.ts`; `activeContextStore.ts`; `agentContextsStore.ts`; `agentRunStore.ts` | Trace current standalone editability, local mutation, and existing-run send behavior. | Resume config has editable-field flags, but selected form ignores them. Local `updateConfig` can guard/patch `llmConfig` only in frontend state. Existing-run send transmits a command, not revised config, so UI-only edits cannot become authoritative. | Add a server write operation and canonical refresh. |
| 2026-08-25 | Code | `autobyteus-server-ts/src/run-history/services/agent-run-resume-config-service.ts`; `src/api/graphql/types/agent-run.ts` | Inspect standalone read/write contracts. | Service currently marks model/config editable only when `!isActive`, but GraphQL exposes no existing-run config mutation. Runtime/workspace are already fixed. | Replace incomplete capability semantics and add narrow update contract. |
| 2026-08-25 | Code | `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts`; `input/agent-run-input-admission-state.ts`; `events/agent-run-event-dispatch-queue.ts` | Determine whether active-idle editing could be safe. | `AgentRun` owns canonical command admission and would require a new idle-only reservation for active editing. | The approved stopped-only workflow deliberately avoids this change. |
| 2026-08-25 | Code | `src/agent-execution/services/standalone-agent-run-activation-service.ts`; `agent-run-manager.ts`; `agent-run-status-projection-service.ts` | Trace activation/restore/status ownership. | Active runs are reused; inactive runs restore from metadata. Status projection distinguishes active runtime states from inactive `offline`. Activation has per-run attempt coalescing but no shared configuration-update transition lane. | Design one serialized standalone transition owner across restore/update. |
| 2026-08-25 | Code | `src/run-history/store/agent-run-metadata-types.ts`; `agent-run-metadata-store.ts`; `atomic-json-file-writer.ts`; `services/agent-run-history-catalog-service.ts` | Inspect standalone persistence shape and atomicity. | `run_metadata.json` already stores `llmConfig`; writes use atomic JSON replacement. The catalog has a serialized mutation queue but no existing config-patch method. | Reuse storage; no schema migration. |
| 2026-08-25 | Code | `src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts`; `codex-app-server-model-normalizer.ts`; `thread/codex-thread-manager.ts` | Verify requested Codex options are effective and identify application boundary. | Bootstrap maps fixed model plus `llmConfig.reasoning_effort` and `llmConfig.service_tier` (`fast`) into Codex thread create/resume configuration. Later turns reuse the prepared thread. | Recycle/restore to apply; preserve thread binding. |
| 2026-08-25 | Code | `src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | Verify AutoByteus model config consumption. | Create/restore carries `llmConfig` into LLM creation and the resolved run config; it is bootstrap-lifetime state. | Recycle/restore to apply. |
| 2026-08-25 | Code | `src/runtime-management/claude/client/claude-sdk-model-normalizer.ts`; `src/agent-execution/backends/claude/backend/claude-session-bootstrapper.ts`; `session/claude-session-config.ts`; `session/claude-session.ts`; `runtime-management/claude/client/claude-sdk-client.ts`; search `rg -n "llmConfig|reasoningEffort|thinking|effort" .../claude` | Check whether the third runtime can make saved thinking/reasoning settings effective. | Claude model discovery advertises `thinking_enabled` and `reasoning_effort`, but bootstrap builds session config without `llmConfig`, session turn construction passes neither value, and the SDK client query options contain no corresponding setting. Persistence alone would therefore be a no-op for Claude. | All-runtime parity is approved; add and verify a Claude config-to-query adapter for installed SDK `0.3.231`. |
| 2026-08-25 | Code | `src/llm-management/services/model-catalog-service.ts`; `src/api/graphql/types/llm-provider-model-catalog.ts`; `autobyteus-ts/src/utils/parameter-schema.ts` | Trace runtime-scoped schemas and possible server validation source. | Model catalog lists models per runtime and publishes config schemas. Core `ParameterSchema` exists, but its current `validateConfig` only checks required presence; full type/range/enum validation for this update remains a design/implementation responsibility. | Design authoritative validator using catalog schema. |
| 2026-08-25 | Vendor package inspection | `tmpdir=$(mktemp -d /tmp/claude-agent-sdk-0.3.231-inspect.XXXXXX) && cd "$tmpdir" && npm pack @anthropic-ai/claude-agent-sdk@0.3.231 --silent && tar -xzf claude-agent-sdk-0.3.231.tgz && rg -n "ThinkingConfig|thinking\\?:|effort\\?:|EffortLevel" package/sdk.d.ts`; inspected `/tmp/claude-agent-sdk-0.3.231-inspect.yoBOnh/package/sdk.d.ts` | Verify the exact installed Claude SDK contract rather than infer option names. | Version `0.3.231` declares query `Options.thinking?: ThinkingConfig` and `Options.effort?: EffortLevel`; thinking supports `adaptive`, `enabled` with optional budget, and `disabled`; effort supports `low`, `medium`, `high`, `xhigh`, and `max`. | Add typed adapter/query-option coverage; temporary package is investigation-only. |
| 2026-08-25 | Code | `src/runtime-management/claude/client/claude-sdk-model-normalizer.ts`; installed SDK types above | Compare catalog capability flags with exact SDK options. | Current catalog emits both `thinking_enabled` and `reasoning_effort` when either adaptive thinking or effort is supported. This can advertise an effort control for an adaptive-only descriptor or a Thinking toggle for an effort-only descriptor. | Split schema emission by capability: Thinking only for adaptive-thinking support; effort only for effort support/advertised levels. |
| 2026-08-25 | Code | `src/run-history/services/team-run-history-service.ts`; `src/api/graphql/types/team-run-history.ts`; frontend team resume types/hydration | Inspect Team Run read/write contract. | Team resume returns `isActive` and the stored execution tree, but no editability flags and no update mutation. | Add root-scoped read capability/outcome and update contract. |
| 2026-08-25 | Code | `src/agent-team-execution/services/agent-team-run-manager.ts`; `domain/root-team-run.ts`; `domain/team-run.ts`; `root-team-run-materialization-gate.ts` | Trace Team active/stopped ownership and restore serialization. | Manager owns root create/restore, knows whether a root is managed, and already has per-root transition lanes. The approved workflow edits only unmanaged/stopped roots. | Serialize stopped Save with root restore using the manager lane; no safe-idle reservation needed. |
| 2026-08-25 | Code | `src/agent-team-execution/domain/team-run-execution-tree.ts`; `domain/team-run-config.ts`; `services/team-run-execution-tree-builder.ts`; `run-history/store/team-run-execution-tree-store.ts` | Inspect Team Run persisted configuration and restore. | Schema-v2 tree stores root/nested default launch configs and every configured agent launch config, including `llmConfig`. Restore reconstructs `TeamRunConfig` directly from this tree. | Narrow tree mutation; no schema migration. |
| 2026-08-25 | Code | `src/agent-team-execution/services/team-run-persistence-coordinator.ts`; `team-run-execution-tree-mutator.ts`; team file commit writer | Inspect team persistence ordering/failure outcomes. | Active-tree mutations already have an authoritative persistence coordinator and committed/failed/indeterminate outcomes. An inactive update must still run through root lifecycle ownership rather than a client-supplied tree write. | Design canonical reconciliation for indeterminate outcome. |
| 2026-08-25 | Code | `src/run-history/services/agent-run-history-catalog-service.ts`; `team-run-history-catalog-service.ts`; `team-run-package-catalog.ts` | Check archived/deleted-state enforcement and competing persistence transitions. | Standalone catalog mutations already share a queue with metadata/history operations. Team delete uses the manager root lane, but Team archive only checks managed state before its own queue and does not share the root lane. | Keep standalone Save persistence inside the catalog queue; generalize the Team unmanaged-root transition so Save/archive/delete serialize consistently. |
| 2026-08-25 | Code | `src/run-history/projection/run-projection-dedupe.ts`; repository search `rg -n "stableStringify|createHash\\(|sha256|configurationRevision|fingerprint" autobyteus-server-ts/src` | Find an existing canonical revision helper for optimistic concurrency. | Hashing exists in several concern-specific files; the only stable JSON helper is private to projection dedupe and is not an appropriate shared contract. No existing run configuration revision exists. | Add a narrowly owned canonical model-config revision helper rather than reuse an unrelated hash. |
| 2026-08-25 | Code | `autobyteus-web/services/teamExecution/teamExecutionContextFactory.ts`; `storedTeamRunFormModel.ts`; `utils/teamRunConfigUtils.ts`; `teamRunLaunchHierarchy.ts`; `editableTeamRunFormModel.ts`; `components/workspace/config/TeamScopeConfigEditor.vue` | Determine stored Team UI semantics, override provenance, and the existing Reset owner. | Launch drafts retain explicit override intent and the pre-launch Team editor can reset that intent. Stored execution views contain only effective configs, infer customization by equality, and are read-only. Explicit equal override versus inheritance is irrecoverable. | Use draft-start equality plus direct-edit markers only for stopped-run parent propagation; do not import pre-launch Reset into stopped-run mode. |
| 2026-08-25 | Code | `autobyteus-web/stores/agentTeamRunStore.ts`; search for `RestoreAgentTeamRun` in team send path | Verify next-message behavior after stopping an updated team. | If a selected team is inactive, sending a message restores/hydrates the same root before dispatch. | Reuse lazy restore rather than immediate post-save activation. |
| 2026-08-25 | Command | `rg -n "update.*Run|reconfigure|llmConfig|editableFields|rootTransition|hasOpenExecutionWork" autobyteus-web autobyteus-server-ts` and targeted `sed` reads recorded above | Search for an existing supported update/reconfiguration path and relevant owners. | No existing end-to-end run/team model-config update path was found. | New feature design required after approval. |
| 2026-08-25 | Test Attempt | Prior focused Vitest invocation via `pnpm`, then `corepack pnpm` | Try to confirm bootstrap snapshot behavior in the clean worktree. | `pnpm` was not directly installed; Corepack resolved pnpm but the worktree has no `node_modules`/Vitest. No source was changed. Production-path evidence is direct and sufficient for requirements investigation. | Implementation/testing team must install dependencies or use its prepared environment. |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User / Contract | Save a reusable Agent Definition. | Definition form/store -> GraphQL `updateAgentDefinition` -> definition service/provider/cache. | Definition catalog changes; an existing active run is not mutated. | Prior definition analysis plus source paths retained in SR-001/design baseline. |
| BEH-002 | System | Create or restore a runtime. | Prepare/restore -> activation/manager -> runtime backend bootstrap -> fixed model and persisted `llmConfig`. | New backend consumes run config at bootstrap. | Activation service and Codex/AutoByteus bootstrap sources. |
| BEH-003 | System / Operational | Send another command to an active run. | Command resolution -> existing `AgentRun`/Team member -> existing backend. | Runtime configuration remains stable for the backend lifetime; no per-turn metadata reread. | `AgentRun`, activation, manager, backend sources. |
| BEH-004 | User | Select an existing standalone run and open Agent Configuration. | `RunConfigPanel.isSelectionMode` -> active context config -> `AgentRunConfigForm(readOnly=true)` -> one broad disabled/read-only path. | All fields are locked. Stale inactive `editableFields` and frontend patch helpers do not provide persistence. | Frontend config components/stores and server resume service. |
| BEH-005 | User | Select an existing Team Run and open Team Configuration. | Stored tree hydration -> `createTeamConfigurationView` -> `projectStoredTeamRunFormModel(mode=stored)` -> Team form read-only. | Root and configured-member model settings are view-only; no update action/API exists. | Team hydration/projection/forms and history service. |
| BEH-006 | Contract | Query resume config/status for selected runs. | Standalone resume service reads metadata + status projection; team resume reads tree + manager activity. | Standalone exposes coarse editable flags; team exposes only activity/tree. Neither response can authorize an update operation. | Resume/history services and GraphQL/frontend payload types. |
| BEH-007 | User / System | Render launch-time model settings. | Fixed runtime -> runtime-scoped catalog -> selected model schema -> `RuntimeModelConfigFields` -> `ModelConfigSection`/Thinking adapter. | Schemas can represent requested settings, but selected historical mode is read-only and may preserve residual/unavailable values. | Catalog GraphQL, runtime selection composable, config components/utilities. |

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature / Behavior Change.
- Candidate root cause classification: Missing Invariant and Boundary Or Ownership Issue.
- Refactor posture evidence summary: A narrow transition extension is required, but no active-runtime domain refactor is needed. The stopped Save must share activation/restore ordering so a message cannot resume from metadata/tree while it is being updated. Unlocking the UI or writing files directly would still create a Save-versus-restore race.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Selected-run forms | One read-only flag conflates fixed launch facts with model settings. | Local UI separation is needed but insufficient alone. | Design distinct flags/form model. |
| Existing-run command path | Commands do not carry full config; active backends are reused. | Local config mutation cannot apply safely or durably. | Add authoritative operation. |
| `AgentRun` admission/queue | Would own an active-idle edit reservation. | Stopped-only scope avoids changing it. | Preserve unchanged. |
| Standalone activation | Attempts serialize activations but not config updates. | Restore/update need a shared transition owner/lane. | Narrow refactor. |
| Root manager/run | Manager knows whether the root is managed and lanes create/restore. | Stopped update and restore must share the manager lane; active root is rejected. | Narrow manager extension. |
| Existing persistence | Both stores already contain `llmConfig`. | No schema migration; reuse atomic writers and canonical reread. | No data refactor. |
| Runtime bootstrappers | Requested values are applied at bootstrap. | Generic solution is stop then lazy restore, not provider hot mutation. | Preserve provider binding. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/workspace/config/RunConfigPanel.vue` | New/selected Agent/Team configuration host | Selected mode is read-only and has no footer action. | Own draft/Save UX orchestration, not lifecycle truth. |
| `AgentRunConfigForm.vue` / `TeamRunConfigForm.vue` | Render run configuration | Broad read-only state disables every field. | Accept explicit fixed-vs-model-config editability. |
| `components/launch-config/RuntimeModelConfigFields.vue` | Runtime/model/schema fields | `disabled` currently locks model selector and model config together. | Split presentation/editability inputs; still emit only permitted draft changes. |
| `ModelConfigSection.vue` and model-config utilities | Schema-driven controls | Already support Thinking/advanced/historical display. | Reuse; prevent sanitization persistence in historical/catalog failure cases. |
| `runHistoryStore.ts` / active contexts | Selected-run hydration/status/config cache | Has incomplete standalone flags and local patch paths. | Store canonical editability/config and local draft separately. |
| `AgentRun` | Standalone runtime command/lifecycle domain owner | No change is needed because active runs remain locked. | Preserve active admission/turn behavior. |
| `StandaloneAgentRunActivationService` | Active reuse and inactive restore | No update transition lane. | Extend/introduce owner-adjacent per-run transition serialization. |
| `AgentRunMetadataStore` / history catalog | Durable standalone run state | `llmConfig` already persisted atomically. | Add narrow serialized patch; preserve every other field. |
| Codex/AutoByteus bootstrappers | Convert run config into runtime state | Consume requested settings at create/restore. | No backend hot-update API needed. |
| `AgentTeamRunManager` / `RootTeamRun` | Root lifecycle and public operation boundary | Manager can reject a managed root and serialize restore; no active root mutation is allowed. | Add stopped-tree update to the manager transition boundary; preserve `RootTeamRun`. |
| Team execution tree/store/persistence | Durable configured execution facts | Already stores all relevant effective `llmConfig` locations. | Narrow authoritative tree mutation; no client replacement tree. |
| Stored team view/projection | Render effective historical configuration | Original override intent is absent. | Use the approved value-based inheritance rule without introducing a new impact-preview workflow. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-08-25 | Static trace | Selected standalone/team config surface through forms/stores/GraphQL | No Save/write path exists; all selected controls are read-only. | This is not fixed by removing one disabled prop. |
| 2026-08-25 | Static trace | Standalone command/activation/metadata/bootstrappers | Inactive restore reads persisted `llmConfig`; active commands reuse the current backend. | Stop -> persist -> lazy restore is a coherent application boundary. |
| 2026-08-25 | Static trace | Team root/manager/tree/store/send path | Root can establish no-open-work/member status, stored tree drives restore, and next send already restores inactive roots. | Whole-root stop -> tree patch -> lazy restore is coherent. |
| 2026-08-25 | Static trace | Team launch draft versus stored projection | Effective configs survive; explicit inheritance/override provenance does not. | Existing-run parent cascade needs deterministic value-based semantics. |
| 2026-08-25 | Vendor contract probe | Exact `@anthropic-ai/claude-agent-sdk@0.3.231` package declaration inspection | The installed query API accepts `thinking` and `effort` with concrete typed value sets. | Claude parity is feasible through the existing session/query boundary; it does not require provider hot mutation. |
| 2026-08-25 | Test attempt | Focused Vitest via pnpm/Corepack | Clean task worktree lacks dependencies. | No runtime test evidence; implementation must add/run durable coverage later. |

## External / Public Source Findings

- Exact vendor artifact consulted: npm package `@anthropic-ai/claude-agent-sdk@0.3.231`, matching `autobyteus-server-ts/package.json` and `pnpm-lock.yaml`.
- Relevant declaration contract: query options accept `thinking?: ThinkingConfig` and `effort?: EffortLevel`; `ThinkingConfig` supports `adaptive`, `enabled`, and `disabled`, while `EffortLevel` is `low | medium | high | xhigh | max`.
- This was a package declaration inspection, not a public documentation assumption. No web source was needed.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for static investigation.
- Required config, feature flags, env vars, or accounts: None.
- External repos, samples, or artifacts cloned/downloaded for investigation: Exact npm tarball for `@anthropic-ai/claude-agent-sdk@0.3.231`, unpacked under `/tmp/claude-agent-sdk-0.3.231-inspect.yoBOnh` for type inspection only.
- Setup commands that materially affected the investigation: Git remote refresh/reset of the dedicated worktree; exact npm-package inspection command recorded in the Source Log.
- Cleanup notes for temporary investigation-only setup: The `/tmp` package extraction is disposable and is not an authoritative task artifact. No repository runtime data or scripts were created.

## Findings From Code / Docs / Data / Logs

1. **The visible lock masks a missing end-to-end operation.** The form can already render the desired controls, but existing-run commands do not submit config and no mutation persists it.
2. **Runtime and model can remain fixed exactly as the user clarified.** Both identifiers are already stored separately from `llmConfig`; the update can be a narrow object/null patch.
3. **Requested Codex settings are concrete runtime inputs.** Reasoning effort and Fast mode are normalized from `llmConfig` into thread configuration on create/resume.
4. **Requested AutoByteus settings are concrete runtime inputs.** Its factory passes `llmConfig` into LLM construction on create/restore.
5. **Stopped-only is materially simpler than active-idle editing.** Save does not need to inspect turn queues, close admission, terminate, or interrupt. The existing Stop action establishes the boundary before the form unlocks.
6. **A stopped Save still races with automatic resume.** The update must share the activation/root transition lane: either Save commits first and resume reads it, or resume wins and Save is rejected because the run is active again.
7. **Persistence failure is contained.** Because the run was already stopped, a failed write leaves the prior stored config authoritative and no live backend has observed draft state.
8. **Team safety is root-wide.** A member setting can influence future configured or delegated work, and the root owns tasks, messages, member activation, and persistence. Per-member live recycling would bypass that owner.
9. **No data migration is necessary.** Both persisted shapes already store `llmConfig` and normal restore readers consume it.
10. **Historical override intent cannot be reconstructed.** Current stored UI infers customization from value equality. Requirements therefore use a draft-start immediate-parent equality snapshot plus explicit current-draft edit markers only to bound parent propagation, and explicitly omit Reset from stopped-run editing instead of pretending launch-time intent can be cleared.
11. **Catalog failure must be non-destructive.** Current editable components sanitize configs against schemas, while historical mode preserves residual values. Existing-run editing must not turn transient catalog/schema gaps into persisted key deletion.
12. **The three runtime paths do not have equal implementation readiness.** AutoByteus already rebuilds its LLM from `llmConfig` during restore. Codex already maps reasoning effort/Fast mode and sends them on `turn/start`. Claude advertises settings in its catalog but currently drops them before query construction.
13. **The installed Claude SDK can carry the missing settings.** Version `0.3.231` exposes typed `thinking` and `effort` query options, so the correction belongs in the existing Claude bootstrap/session/client adapter chain.
14. **Claude catalog capability emission needs tightening at the same boundary.** Thinking and effort are independent discovered capabilities; the schema must not expose both merely because either is supported.
15. **Optimistic concurrency has no reusable current owner.** A model-config-specific opaque revision must be derived from canonical persisted fixed model identity plus `llmConfig`; unrelated hashing helpers should remain private to their current concerns.

## Runtime-Specific Feasibility

| Runtime | Current Effective Path | Save/Restore Work Needed | Runtime-Specific Difficulty | Main Risk |
| --- | --- | --- | --- | --- |
| AutoByteus | `AgentRunConfig.llmConfig -> buildAgentConfig -> createAvailableLlm`; restore rebuilds `AgentConfig` with the persisted values. | Persist while stopped; normal restore rebuilds through the existing factory. | Low after the shared stopped-update API exists. | Confirm restored memory uses the rebuilt LLM configuration without replacing logical run identity. |
| Codex App Server | `llmConfig.reasoning_effort/service_tier -> CodexThreadConfig`; `turn/start` sends `effort` and `serviceTier`; restore preserves the thread ID. | Persist while stopped; normal resume of the same thread builds current thread/turn config. | Low after the shared stopped-update API exists. | Verify next `turn/start` accepts revised values and Fast-mode normalization. |
| Claude Agent SDK | Catalog exposes `thinking_enabled`/`reasoning_effort`, but bootstrap/session/query do not consume `llmConfig`. Exact SDK `0.3.231` types support `thinking` and `effort`. | Persist while stopped and add a typed adapter through `ClaudeSessionConfig`, session turn input, and SDK query options; tighten catalog capability emission. | Medium and currently the least ready runtime. | A saved value would otherwise appear successful but have no runtime effect; adapter and capability mapping require durable tests. |

Stopped-only scope reduces the shared lifecycle work to Save-versus-restore serialization rather than active turn/team coordination. Team member restoration already selects the appropriate runtime backend per configured member, so one authoritative Team update path can serve mixed-runtime teams once each runtime adapter honors its persisted `llmConfig`.

## Persisted Data Transition Evidence (When Applicable)

- Representative standalone shape: `AgentRunMetadata` includes fixed `runtimeKind`, fixed `llmModelIdentifier`, and `llmConfig: Record<string, unknown> | null`; `AgentRunMetadataStore` normalizes and atomically writes `run_metadata.json`.
- Representative team shape: `TeamRunExecutionTreeFileV2` includes root/nested `defaultLaunchConfiguration` and configured-agent `launchConfiguration`; each `AgentLaunchConfiguration` includes `llmConfig`.
- Normal readers: standalone activation reconstructs `AgentRunConfig` from metadata; Team restore uses `buildTeamRunConfigFromExecutionTree`.
- Normal writers: standalone atomic JSON writer; Team execution-tree store/file commit writer with explicit committed/failed/indeterminate outcomes.
- Required meaning: only authorized `llmConfig` locations change. All identities, bindings, history/task/message files, and other launch fields remain byte/semantic equivalents.
- Volume/operational risk: one selected run package at a time; no bulk rewrite or maintenance window.
- Decision: **Directly Usable — No Migration**.

## Constraints / Dependencies / Compatibility Facts

- Fixed runtime/model selection determines the authoritative schema and the runtime adapter that consumes the config.
- Current server-side generic parameter validation is insufficient for full type/enum/range enforcement; the feature needs a validator matched to the catalog schema.
- Catalog sources can be dynamic or unavailable. A transient catalog failure cannot authorize mutation or stored-value deletion.
- Codex and AutoByteus consume the required settings. Claude advertises thinking/reasoning schema but does not currently consume `llmConfig`; the user approved correcting that adapter in this ticket.
- Standalone and Team send paths already support lazy restoration after an update leaves the run inactive.
- No backward-compatibility wrapper or alternate legacy update path is needed because this is a new API/behavior.

## Open Unknowns / Risks

- Stopped-only editing is approved: explicit Stop first, edit and Save while inactive, then automatic resume on the next message.
- Team hierarchy behavior is approved: the whole root must be stopped; configured scopes are directly editable; parent/default changes propagate only through the draft-start value-matching chain and never overwrite a directly edited draft branch; divergent branches remain unchanged; no Reset-to-inherited is added to stopped-run editing.
- All-three-runtime parity is approved; the Claude execution bridge is required behavior rather than an adjacent adapter fix.
- The exact runtime/model schemas remain dynamically sourced at operation time. Catalog absence or a schema that cannot represent stored values must keep Save unavailable rather than trigger destructive normalization.
- Team execution-tree commit can report post-rename durability indeterminate; the update API and UI must expose and reconcile that result rather than guess success.

## Notes For Architecture Reviewer

- Review the SR-003 design against the approved stopped-only boundary: no active-idle editing, automatic stop, hot provider mutation, replacement run, or stopped-run Reset-to-inherited.
- Pay particular attention to lifecycle serialization, the narrow identity-specific update APIs, archive/delete interaction, optimistic revision handling, non-destructive historical schema behavior, and the Claude capability/query adapter.
- Reject a UI-only unlock, direct metadata/tree write from GraphQL, client-authored replacement tree, provider-specific hot mutation, or compatibility wrapper around the stale broad editable-field contract.
- For F-001, verify that REQ-008/AC-006, UXJ-003, DS-003, examples, and coverage now preserve fixed identity: parent propagation stops at any draft-start divergent or directly edited scope, direct edits validate against that scope's own model and win regardless of edit order, and the stopped-run UI renders no Reset action. Existing pre-launch Reset is unchanged under REQ-015.

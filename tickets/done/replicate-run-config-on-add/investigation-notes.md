# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete; dedicated worktree/branch created before deep investigation.
- Current Status: Investigation complete; design basis identified.
- Investigation Goal: Identify why add/new-run from a selected historical/live agent/team run opens an editable configuration without preserving the source run's thinking/reasoning configuration, then define an implementation-ready fix for team and individual-agent paths.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The issue spans source-run seeding entrypoints, shared runtime/model config lifecycle, team member overrides, and tests for both team and individual agent flows.
- Scope Summary: Preserve selected source run configuration when opening a new editable run, while retaining explicit model/runtime-change cleanup and fresh default starts.
- Primary Questions To Resolve:
  - Which add/new-run click path is used from the selected run header?
  - Does the add path already copy selected run config?
  - Why does copied `llmConfig.reasoning_effort` disappear in editable new-run mode?
  - Does the individual-agent path share the same failure mode?
  - Which component should own stale model-config clearing?

## Request Context

User supplied screenshots on 2026-04-26 showing a selected Software Engineering Team historical run/configuration where Thinking is enabled and Advanced Reasoning Effort is `xhigh`. After clicking add/new-run, the new Team Definition screen shows default configuration: Thinking off and default reasoning medium. User wants the add action to replicate the selected run's configuration so they do not need to reselect and reconfigure settings. User also suspects the same bug may affect individual agent runs.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/replicate-run-config-on-add`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/replicate-run-config-on-add`
- Current Branch: `codex/replicate-run-config-on-add`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/replicate-run-config-on-add`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-04-26 before worktree creation.
- Task Branch: `codex/replicate-run-config-on-add` tracking `origin/personal`, created from commit `81f6c823a16f54de77f426b1bc3a7be50e6c843d`.
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Use the dedicated worktree path above for implementation and validation; do not modify the shared `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` checkout.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-26 | Command | `git rev-parse --show-toplevel && git status --short --branch && git remote -v && git branch --show-current && git symbolic-ref refs/remotes/origin/HEAD` | Resolve repo root, branch, remote, and default tracking branch. | Repo root is `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`; initial branch was `personal` tracking `origin/personal`; remote HEAD is `origin/personal`. | No |
| 2026-04-26 | Command | `git fetch origin --prune && git worktree list --porcelain && git status --short` | Refresh tracked remote refs and inspect existing worktrees before creating a dedicated task worktree. | Remote refresh succeeded; no exact existing `replicate-run-config-on-add` worktree/branch found. | No |
| 2026-04-26 | Command | `git worktree add -b codex/replicate-run-config-on-add /Users/normy/autobyteus_org/autobyteus-worktrees/replicate-run-config-on-add origin/personal` | Create isolated task workspace as required for git repository tasks. | Worktree created and checked out at `81f6c823a16f54de77f426b1bc3a7be50e6c843d`. | No |
| 2026-04-26 | Command | `rg -n "Reasoning Effort|reasoningEffort|reasoning_effort|thinking|Thinking|Run Team|Run Agent|Team Configuration|Team Definition|Team Members Override|LLM Model Override|Runtime Override" ...` | Locate relevant UI and config paths. | Found config UI under `autobyteus-web/components/workspace/config`, shared launch config under `components/launch-config`, run-history stores, and related docs/tests. | No |
| 2026-04-26 | Code | `autobyteus-web/components/workspace/config/RunConfigPanel.vue:105-124` | Determine how selected-run vs new-run config is chosen. | Selected mode reads active run/team context config; editable new-run mode reads agent/team run config stores. | No |
| 2026-04-26 | Code | `autobyteus-web/components/workspace/common/WorkspaceHeaderActions.vue:13-21` | Identify header add action. | The plus button emits `newAgent`; agent/team workspace views handle it separately. | No |
| 2026-04-26 | Code | `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue:168-176` | Inspect selected team header add behavior. | It JSON-clones `activeTeamContext.value.config`, sets `isLocked=false`, sets `teamRunConfigStore`, clears agent config and selection. It should copy source values before child lifecycle side effects. | Yes: use centralized deep clone helper instead of ad hoc JSON clone. |
| 2026-04-26 | Code | `autobyteus-web/components/workspace/agent/AgentWorkspaceView.vue:138-145` | Inspect selected agent header add behavior. | It shallow-spreads `selectedAgent.value.config`; nested `llmConfig` is not deep-cloned. Individual path uses same shared runtime/model fields as team. | Yes: use centralized clone helper. |
| 2026-04-26 | Code | `autobyteus-web/components/launch-config/RuntimeModelConfigFields.vue:46-58,196-218` | Inspect shared runtime/model/thinking form. | Always passes `clear-on-empty-schema=true`; `updateModel` changes the model identifier without explicitly clearing `llmConfig`. | Yes: runtime/model field owner should clear only on explicit user changes. |
| 2026-04-26 | Code | `autobyteus-web/composables/useRuntimeScopedModelSelection.ts:81-97,157-217` | Check schema resolution during catalog loading. | Provider groups start empty; `modelConfigSchemaByIdentifier` returns `null` both while loading and when no schema exists. | Yes: prevent loading-null from being interpreted as config deletion authority. |
| 2026-04-26 | Code | `autobyteus-web/components/workspace/config/ModelConfigSection.vue:159-185,205-243` | Find why `llmConfig` disappears. | On editable forms, empty schema + `clearOnEmptySchema` emits `null`; later schema-change watcher also clears config on schema change if config object reference is unchanged. Read-only mode suppresses emits, explaining why source view can show config but new editable seed loses it. | Yes: remove schema-change reset ownership from this display component. |
| 2026-04-26 | Code | `autobyteus-web/components/workspace/running/RunningAgentsPanel.vue:110-143` | Inspect running-panel group add source policy. | Agent/team group add clones `group.runs[0]`, not necessarily selected/current source. | Yes: use selected same-definition source first, then deterministic fallback. |
| 2026-04-26 | Code | `autobyteus-web/stores/runHistoryStore.ts:112-185` | Inspect history agent definition-row add. | `createDraftRun` can reuse an existing same-definition active context via `pickPreferredRunTemplate`, but it is not explicitly selected-source first and clone is shallow for nested config. | Yes: align source policy and clone helper use. |
| 2026-04-26 | Code | `autobyteus-web/composables/useDefinitionLaunchDefaults.ts:27-46` | Check existing clone/default helpers. | `cloneAgentConfig` and `cloneTeamConfig` already normalize/deep-clone `llmConfig` and member override `llmConfig`; these are not consistently used by add handlers. | Yes: reuse/extend instead of duplicating clone logic. |
| 2026-04-26 | Code | `autobyteus-web/components/workspace/config/MemberOverrideItem.vue:71-81,265-320` | Check team member override model config lifecycle. | Member override item has explicit runtime/model change handlers and relies on `ModelConfigSection` for config editing; if reset is removed from `ModelConfigSection`, member model change must keep explicit stale cleanup. | Yes |
| 2026-04-26 | Code | `autobyteus-web/composables/messaging-binding-flow/launch-preset-model-selection.ts:176-183`, `autobyteus-web/components/settings/messaging/ChannelBindingSetupCard.vue:358-364` | Identify other callers relying on shared ModelConfigSection reset. | Messaging binding model change sets model without clearing config; `ChannelBindingSetupCard` passes `clear-on-empty-schema=true`. | Yes: adjust explicit model-change clearing in this owner too. |
| 2026-04-26 | Code | `autobyteus-web/components/workspace/config/__tests__/AgentRunConfigForm.spec.ts:280-307`, `autobyteus-web/components/workspace/config/__tests__/TeamRunConfigForm.spec.ts:257-283` | Check existing test coverage for read-only historical config. | Existing tests cover read-only display/advanced expansion but do not cover editable source-copy preservation through schema loading. | Yes: add regression tests. |
| 2026-04-26 | Doc | `autobyteus-web/tickets/workspace-run-config-form-consistency/*` | Check prior intended behavior for plus/add actions. | Prior ticket intentionally made plus actions config-first and documented header plus as "duplicate current config into editable template". Current bug is a preservation regression within that intended behavior. | No |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: User opens a selected run/team in workspace view, clicks the header plus/add action from `WorkspaceHeaderActions.vue`.
- Current execution flow:
  - Team: `WorkspaceHeaderActions.newAgent` -> `TeamWorkspaceView.createNewTeamRun` -> JSON clone active team config -> `teamRunConfigStore.setConfig` -> clear selection -> `RunConfigPanel` switches to editable new-team config.
  - Agent: `WorkspaceHeaderActions.newAgent` -> `AgentWorkspaceView.createNewAgent` -> shallow clone active agent config -> `agentRunConfigStore.setAgentConfig` -> clear selection -> `RunConfigPanel` switches to editable new-agent config.
  - Editable forms mount `RuntimeModelConfigFields`, which initially lacks provider groups/model schema while async model loading runs.
  - `RuntimeModelConfigFields` passes `schema=null` and `clearOnEmptySchema=true` into `ModelConfigSection`.
  - `ModelConfigSection` emits `update:config(null)` in editable mode, clearing copied `llmConfig`; read-only source mode does not emit due to `readOnly` guard.
- Ownership or boundary observations:
  - `RunConfigPanel` is a mode selector, not the seed owner.
  - Header/group/history add handlers currently own source selection and clone policy in scattered local code.
  - `ModelConfigSection` currently owns inferred stale-config clearing despite not knowing whether schema null means loading, schema-less model, or user model change.
- Current behavior summary: Selected source config can display `reasoning_effort: "xhigh"`, but editable copied config loses it during child component initialization. The individual-agent path shares the same vulnerable model-config lifecycle.

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/workspace/config/RunConfigPanel.vue` | Chooses read-only selected config vs editable buffered config. | Selection mode and editable mode use different config sources but same form components. | Keep as view/mode boundary; do not put seed policy here. |
| `autobyteus-web/components/workspace/common/WorkspaceHeaderActions.vue` | Emits edit-config and new-run header actions. | Generic plus emits `newAgent` for both agent/team views. | Keep thin facade; parent view owns source context. |
| `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue` | Selected team workspace header and source team context. | Add handler clones active team config but does not use central helper. | Should seed via a shared editable team seed helper. |
| `autobyteus-web/components/workspace/agent/AgentWorkspaceView.vue` | Selected agent workspace header and source run context. | Add handler shallow clones source config. | Must deep-clone nested config. |
| `autobyteus-web/components/workspace/running/RunningAgentsPanel.vue` | Running-group add/select/delete actions. | Add chooses `group.runs[0]`, not necessarily selected source. | Needs deterministic source policy. |
| `autobyteus-web/stores/runHistoryStore.ts` | History tree fetch/open and agent definition-row draft preparation. | Existing preferred-template reuse only partly covers selected source and shallow clone concerns. | Align with source seed helper and selection-first policy. |
| `autobyteus-web/composables/useDefinitionLaunchDefaults.ts` | Launch config template/default/clone utility. | Existing `cloneAgentConfig` / `cloneTeamConfig` are appropriate reusable owned structures. | Reuse/extend for editable source-run seeds. |
| `autobyteus-web/components/launch-config/RuntimeModelConfigFields.vue` | Runtime/model selection wrapper around model-specific config UI. | Knows explicit user runtime/model changes but currently delegates stale clearing to schema watcher. | Should own clearing on user runtime/model change. |
| `autobyteus-web/components/workspace/config/ModelConfigSection.vue` | Renders and edits schema-driven model config. | Clears config on empty/schema change without knowing loading vs user switch. | Should only render/sanitize/default against actual schema; should not infer source-reset policy. |
| `autobyteus-web/components/workspace/config/MemberOverrideItem.vue` | Team member runtime/model override editor. | Has local runtime/model change logic and relies partly on ModelConfigSection reset. | Must own explicit member model-change cleanup if ModelConfigSection reset is removed. |
| `autobyteus-web/composables/messaging-binding-flow/launch-preset-model-selection.ts` | Messaging binding runtime/model launch preset editor. | Directly uses ModelConfigSection with clear-on-empty-schema. | Must own explicit model-change cleanup if shared component reset is removed. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-26 | Trace | Static trace through `TeamWorkspaceView.createNewTeamRun` -> `RunConfigPanel` -> `TeamRunConfigForm` -> `RuntimeModelConfigFields` -> `ModelConfigSection` | Source team config is copied into `teamRunConfigStore`, then editable model-config child can emit `null` before model schema is loaded. | Root cause is shared editable model-config lifecycle, not missing source data. |
| 2026-04-26 | Trace | Static trace through `AgentWorkspaceView.createNewAgent` -> `AgentRunConfigForm` -> shared runtime/model components | Individual agent path shares the same clear-on-empty-schema/schema-change reset behavior and also shallow-clones source config. | User's suspicion is valid; agent add should be fixed in same design. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None used.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: This is an internal product behavior regression.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: No runtime reproduction was required to identify the code path; targeted frontend component/store tests are recommended for implementation validation.
- Required config, feature flags, env vars, or accounts: N/A for static investigation.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation only.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

1. Prior behavior design explicitly intended plus/add actions to open config-first and duplicate current config for header plus (`autobyteus-web/tickets/workspace-run-config-form-consistency`). The bug is not that plus opens the config form; it is that copied model config is erased after entering editable mode.
2. `ModelConfigSection` is overloaded: it renders model config and also tries to infer when config should be reset. That inference is unsafe because schema `null` is ambiguous during async model catalog loading.
3. Read-only selected config avoids mutation because `emitConfig` returns in read-only mode, which explains the screenshot split: source can display `xhigh`, editable copy loses it.
4. Source-run clone code is scattered and inconsistent: team path deep clones by JSON, agent path shallow clones, running group uses first run. Existing clone helpers should be the reusable owned structure.

## Constraints / Dependencies / Compatibility Facts

- Do not mutate source historical/live run config when using it as a new-run seed.
- Preserve definition/default seeding when no source run is selected.
- Preserve stale-config cleanup on explicit user runtime/model changes.
- Preserve read-only historical config display and missing historical config messaging.

## Open Unknowns / Risks

- Exact original team global-vs-member override intent may be reconstructed from member metadata for historical runs; the add action can only replicate the current reconstructed config available in `activeTeamContext.config`.
- Some runtime/model schemas may be absent; source-run preservation should not discard their `llmConfig` merely because schema UI is unavailable.

## Notes For Architect Reviewer

- The likely architecture review focus is ownership: `ModelConfigSection` should stop owning user-intent reset policy; runtime/model selector owners should own explicit reset events.
- The design should avoid adding compatibility wrappers or dual paths. Replace inferred schema-change clearing with explicit model-change clearing at the correct owners.

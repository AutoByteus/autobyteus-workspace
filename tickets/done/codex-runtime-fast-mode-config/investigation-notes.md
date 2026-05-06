# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Deep investigation complete; requirements approved by user on 2026-05-06; design spec produced for architecture review.
- Investigation Goal: Determine current Codex runtime configuration model, verify Codex CLI Fast-mode support/mechanism, and identify the product changes needed to expose/apply Fast mode when Codex runtime is selected.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The change crosses frontend runtime configuration, backend Codex model metadata, backend runtime launch/turn dispatch, and tests. Existing `llmConfig` likely avoids broad GraphQL/database changes.
- Scope Summary: Add a user-facing Codex runtime Fast-mode configuration and apply it through Codex app-server `serviceTier` without affecting other runtimes.
- Primary Questions Resolved:
  - Where are runtime-specific configuration options defined and rendered?
  - Where is run configuration persisted/serialized between frontend and backend?
  - How does the Codex runtime start/resume threads and send turns today?
  - What concrete Codex app-server mechanism maps to CLI `/fast`?
  - Does this require schema/contracts changes across packages?

## Request Context

User wrote: "i think codex support fast mode, but when i select codex as runtime, it does not give me configuraiton how i could enable fast mode. I want to have this feature. Please investigate. Because codex command line has codex /fast. but in your investigation you could try as well. help me with this thanks"

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-fast-mode-config`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-fast-mode-config/tickets/codex-runtime-fast-mode-config`
- Current Branch: `codex/codex-runtime-fast-mode-config`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-fast-mode-config`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-05-06 before worktree creation.
- Task Branch: `codex/codex-runtime-fast-mode-config`
- Expected Base Branch: `origin/personal`
- Expected Finalization Target: `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: Authoritative artifacts are in this task worktree/branch, not the original shared checkout.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-06 | Command | `pwd && git rev-parse --is-inside-work-tree && git rev-parse --show-toplevel && git status --short --branch && git remote -v && git symbolic-ref refs/remotes/origin/HEAD || true && ls -la` | Bootstrap environment discovery | Original checkout is Git repo at `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`, branch `personal` tracking `origin/personal`; remote default resolves to `origin/personal`. | No |
| 2026-05-06 | Command | `git fetch origin --prune && git worktree list --porcelain` | Refresh remote and check existing task worktrees | Fetch completed; no existing `codex-runtime-fast-mode-config` worktree/branch found. | No |
| 2026-05-06 | Command | `git worktree add -b codex/codex-runtime-fast-mode-config /Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-fast-mode-config origin/personal` | Create dedicated task worktree/branch | Worktree created at latest `origin/personal` (`HEAD b42d109c...`). | No |
| 2026-05-06 | Command | `cat > tickets/done/codex-runtime-fast-mode-config/investigation-notes.md <<EOF ...` | Create initial investigation artifact | First write accidentally used an unquoted heredoc and shell-expanded Markdown backticks inside artifact content; file was immediately rewritten with a quoted heredoc. The accidental re-run of `git worktree add` failed because the branch already existed and had no intended repo-state effect. | No |
| 2026-05-06 | Command | `find . -maxdepth 3 ...`, `rg -n "runtimeKind|llmConfig|config_schema|Codex" ...` | Locate runtime config, schema, and Codex integration files | Relevant spine crosses `autobyteus-web` config UI/types/stores and `autobyteus-server-ts` GraphQL/domain/Codex backend/model catalog. | Yes: design exact changes. |
| 2026-05-06 | Code | `autobyteus-web/components/launch-config/RuntimeModelConfigFields.vue` | Find frontend runtime/model config entrypoint | Renders runtime select, model select, and `ModelConfigSection` with schema from selected model; emits `update:llmConfig`. | Yes |
| 2026-05-06 | Code | `autobyteus-web/components/workspace/config/ModelConfigSection.vue` | Understand schema-driven config UI | Shows the config section only when schema exists. Advanced parameters render only under `thinkingSupported`; otherwise fallback says thinking config not available. Defaults are applied for non-thinking keys. | Yes: consider generic non-thinking config rendering. |
| 2026-05-06 | Code | `autobyteus-web/components/workspace/config/ModelConfigAdvanced.vue` | Confirm whether enum fields can render service tier | Advanced component already supports enum/select, boolean, number, text. Enum fields with no default get a “Default” option that removes the key. | Yes |
| 2026-05-06 | Code | `autobyteus-web/utils/llmConfigSchema.ts` | Confirm schema normalization/sanitization | Supports backend `parameters[]` and JSON-schema `properties`, enum validation, and drops unknown/stale config keys. | Yes |
| 2026-05-06 | Code | `autobyteus-web/utils/llmThinkingConfigAdapter.ts` | Distinguish thinking from Fast mode | Detects OpenAI-like thinking via `reasoning_effort` / `reasoning_summary`; Fast mode is not represented here. | Yes |
| 2026-05-06 | Code | `autobyteus-web/types/agent/AgentRunConfig.ts`, `TeamRunConfig.ts`, stores, default launch config | Verify config persistence path | Existing `llmConfig` exists in single-agent and team configs, member overrides, default launch config, stores, and GraphQL submissions. | Use existing path. |
| 2026-05-06 | Code | `autobyteus-server-ts/src/api/graphql/types/agent-run.ts`, `agent-team-run.ts`, `default-launch-config.ts` | Verify backend GraphQL accepts `llmConfig` | GraphQL create inputs and default launch inputs already accept JSON `llmConfig`. | No broad schema change expected. |
| 2026-05-06 | Code | `autobyteus-server-ts/src/agent-execution/domain/agent-run-config.ts` and team/domain metadata mapping | Verify backend run config carries `llmConfig` | `llmConfig` is part of run config and is persisted/restored in metadata for single and team runs. | Use existing field. |
| 2026-05-06 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/codex-app-server-model-normalizer.ts` | Find Codex model schema generation | Normalizes `supportedReasoningEfforts` to a `reasoning_effort` enum schema; ignores `additionalSpeedTiers`. | Add service-tier schema generation. |
| 2026-05-06 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-config.ts` | Find Codex runtime config object | Contains `model`, `workingDirectory`, `reasoningEffort`, approval/sandbox/instructions/tools; no `serviceTier`. | Extend. |
| 2026-05-06 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` | Find llmConfig-to-thread config mapping | Uses `resolveCodexSessionReasoningEffort(input.agentRunConfig.llmConfig)` only; no service tier mapping. | Add resolver. |
| 2026-05-06 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-manager.ts` | Find app-server thread start/resume payloads | Sends `thread/start`/`thread/resume` with `model`, `cwd`, approval/sandbox, instructions, tools; no `serviceTier`. | Add field. |
| 2026-05-06 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts` | Find app-server turn payload | Sends `turn/start` with `effort: this.reasoningEffort`; no `serviceTier`. | Add field. |
| 2026-05-06 | Command | `command -v codex && codex --version && codex --help && codex app-server --help` | Verify local Codex install and CLI surface | Local binary `/Users/normy/.nvm/versions/node/v22.21.1/bin/codex`, version `0.128.0`; help does not expose a standalone `--fast` flag. `/fast` is an interactive/app-server behavior. | Probe app-server protocol. |
| 2026-05-06 | Command / Spec | `codex app-server generate-json-schema --out /tmp/codex-app-schema` | Generate local app-server protocol schema | Schema exposes `ThreadStartParams.serviceTier`, `ThreadResumeParams.serviceTier`, `TurnStartParams.serviceTier`, `Config.service_tier`, `Model.additionalSpeedTiers`, `ServiceTier` enum. | Yes |
| 2026-05-06 | Command / Spec | `codex app-server generate-ts --out /tmp/codex-app-ts` | Generate local TS protocol types | `ServiceTier = "fast" | "flex"`; thread start/resume/turn start params support `serviceTier`; model type has `additionalSpeedTiers`. | Yes |
| 2026-05-06 | Probe | `node /tmp/probe-codex-app-server.mjs "$PWD"` | Verify live app-server behavior, model metadata, and `serviceTier: "fast"` acceptance | `config/read.service_tier` was null; live models include fast tier on `gpt-5.5` and `gpt-5.4`; `thread/start` with `serviceTier: "fast"` succeeded and returned `serviceTierInResult: "fast"`. | No |
| 2026-05-06 | Repo / Upstream Source | `git clone --depth 1 --branch rust-v0.128.0 https://github.com/openai/codex.git /tmp/openai-codex-0.128.0` plus `rg` over Codex source | Verify official Codex source semantics | Upstream defines Fast mode feature, `ServiceTier::{Fast,Flex}`, `/fast [on|off|status]`, and tests that Fast maps to HTTP `service_tier: "priority"`; Fast off maps to no service tier. | No |
| 2026-05-06 | Test Inventory | `find autobyteus-server-ts ... codex ...`, `rg` over tests | Identify validation locations | Relevant server tests exist under `tests/unit/agent-execution/backends/codex/...` and integration model catalog/thread tests; web tests exist for schema and config components. | Add/update focused tests during implementation. |
| 2026-05-06 | Other | User approval in chat: "approve. so basically, the design is that it will be shown in the configuration when select a certain model right?" | Lock requirements for design | User approved requirements and confirmed intended UI behavior: Fast mode appears in configuration when a fast-capable Codex model is selected. | No |

## Current Behavior / Current Flow

### Frontend model/runtime configuration spine

1. `RuntimeModelConfigFields.vue` is the shared launch/runtime model config entrypoint.
2. It uses `useRuntimeScopedModelSelection` to obtain model options and a `modelConfigSchemaByIdentifier` lookup.
3. It passes the selected model schema to `ModelConfigSection.vue` and emits `update:llmConfig` when config changes.
4. `ModelConfigSection.vue` sanitizes `modelConfig` against schema and applies non-thinking defaults.
5. `ModelConfigAdvanced.vue` can render enum/select parameters and remove an enum key by choosing the “Default” option when no default is defined.
6. This means the frontend can carry a `service_tier` enum if the backend includes it in model `config_schema`, but the section is currently unnecessarily coupled to thinking support.

### Frontend/backend config transport spine

- `llmConfig` appears in single-agent and team run types.
- `llmConfig` is included in frontend stores when calling GraphQL create operations.
- Backend GraphQL inputs accept JSON `llmConfig` for single-agent runs, team member configs, and default launch config.
- Backend domain run configs carry `llmConfig`.
- Run metadata mappers persist and restore `llmConfig`.
- Therefore Fast mode can use `llmConfig.service_tier` without new transport/persistence fields.

### Backend Codex current flow

1. `CodexModelCatalog.listModels()` calls app-server `model/list`.
2. `mapCodexModelListRowToModelInfo()` maps each row into `ModelInfo` and creates a schema with only `reasoning_effort`.
3. `CodexThreadBootstrapper.buildThreadConfig()` maps `llmConfig.reasoning_effort` into `CodexThreadConfig.reasoningEffort`.
4. `CodexThreadManager.startRemoteThread()` calls `thread/start` without `serviceTier`.
5. `CodexThreadManager.resumeRemoteThread()` calls `thread/resume` without `serviceTier`.
6. `CodexThread.sendTurn()` calls `turn/start` with `effort` but without `serviceTier`.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature / behavior parity improvement.
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Local Implementation Defect in Codex-specific model normalizer/thread propagation; small UI affordance issue in generic config rendering.
- Refactor posture evidence summary: No broad refactor needed. The existing `llmConfig` channel is the correct spine. Required work should be local to Codex schema normalization, Codex thread config/app-server payloads, and possibly a small `ModelConfigSection` generalization.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User report | Codex runtime lacks visible Fast-mode configuration while Codex CLI supports `/fast`. | Missing product/runtime integration for a Codex-specific option. | Implement parity. |
| Generated Codex schema | Fast mode is modeled as `serviceTier`/`service_tier`, not reasoning effort. | Must not conflate Fast mode with `reasoning_effort`. | Add separate field. |
| Existing `llmConfig` path | Already carries model/runtime config across UI/API/run metadata. | No new top-level transport field required. | Use `service_tier` inside `llmConfig`. |
| Codex normalizer | Ignores `additionalSpeedTiers`. | Fast capability is known by Codex but dropped before UI. | Preserve in config schema. |
| Codex thread manager/thread | No `serviceTier` in app-server requests. | UI-only config would not affect runtime without backend propagation. | Add payload propagation. |
| ModelConfigSection | Advanced schema parameters only render under thinking support. | Current fast-capable models work if they also have reasoning schema, but the UI component is too thinking-specific for future non-thinking config params. | Consider local generalization. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/launch-config/RuntimeModelConfigFields.vue` | Shared runtime/model selector and model config editor wrapper | Emits `llmConfig` and receives selected model schema. | Main UI entrypoint; likely no major change if schema appears. |
| `autobyteus-web/components/workspace/config/ModelConfigSection.vue` | Thinking toggle + advanced schema parameter section | Advanced section hidden unless thinking support is detected. | May need generic config display so Fast mode is visible as a first-class runtime param. |
| `autobyteus-web/components/workspace/config/ModelConfigAdvanced.vue` | Renders schema parameters | Already supports enum fields and default/unset selection. | Can render `service_tier` with minimal or no changes. |
| `autobyteus-web/utils/llmConfigSchema.ts` | Normalize/sanitize model config schemas | Drops stale keys absent from schema. | Supports FR-004. |
| `autobyteus-web/utils/llmThinkingConfigAdapter.ts` | Provider-specific thinking toggle logic | Fast mode is not thinking. | Do not add Fast mode here except maybe to exclude from thinking keys if needed. |
| `autobyteus-web/stores/agentRunStore.ts` | Create single-agent runs | Sends `llmConfig` through GraphQL. | Existing path should carry `service_tier`. |
| `autobyteus-web/stores/agentTeamRunStore.ts` | Create team runs/member configs | Sends global/member `llmConfig`. | Existing path should carry `service_tier`. |
| `autobyteus-server-ts/src/api/graphql/types/agent-run.ts` | GraphQL create agent run input | Has JSON `llmConfig`. | No schema change expected. |
| `autobyteus-server-ts/src/api/graphql/types/agent-team-run.ts` | GraphQL team member config input | Has JSON `llmConfig`. | No schema change expected. |
| `autobyteus-server-ts/src/api/graphql/types/default-launch-config.ts` | GraphQL default launch config | Has JSON `llmConfig`. | No schema change expected. |
| `autobyteus-server-ts/src/llm-management/services/codex-model-catalog.ts` | Lists Codex app-server models | Delegates row normalization. | Integration test may need update from one-param schema to multi-param schema. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/codex-app-server-model-normalizer.ts` | Codex model row normalization and reasoning config resolver | Ignores `additionalSpeedTiers`; only resolves `reasoning_effort`. | Add service-tier capability schema and resolver. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-config.ts` | Internal Codex thread configuration | No service-tier property. | Add normalized `serviceTier`. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` | Builds Codex run runtime context | Only maps `llmConfig.reasoning_effort`. | Map `llmConfig.service_tier`. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-manager.ts` | Starts/resumes app-server threads | No `serviceTier` in requests. | Include `serviceTier` when selected. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts` | Sends app-server turns | No `serviceTier` in `turn/start`. | Include `serviceTier` when selected. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/...` | Focused Codex unit tests | Existing thread/bootstrap tests can be extended. | Add service-tier tests. |
| `autobyteus-web/utils/__tests__/llmConfigSchema.spec.ts` and config component tests | Frontend schema/config tests | Existing schema tests cover sanitization; component tests can validate rendering/emission. | Add Fast-mode UI/sanitization coverage. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-06 | CLI Probe | `command -v codex && codex --version` | Codex binary `/Users/normy/.nvm/versions/node/v22.21.1/bin/codex`; version `codex-cli 0.128.0`. | Local app-server is recent enough to support Fast mode protocol. |
| 2026-05-06 | CLI Probe | `codex --help` and `codex app-server --help` | Help does not expose a direct `--fast` flag. | `/fast` should be treated as interactive slash command/app-server service-tier behavior, not CLI startup flag. |
| 2026-05-06 | Schema Generation | `rm -rf /tmp/codex-app-schema && mkdir -p /tmp/codex-app-schema && codex app-server generate-json-schema --out /tmp/codex-app-schema` | Generated schema has `serviceTier` on thread start/resume/turn start, `service_tier` in config, and `additionalSpeedTiers` in model list. | Use app-server protocol fields. |
| 2026-05-06 | TS Generation | `rm -rf /tmp/codex-app-ts && mkdir -p /tmp/codex-app-ts && codex app-server generate-ts --out /tmp/codex-app-ts` | `ServiceTier` is exactly `"fast" | "flex"`. | Backend normalizer should whitelist service-tier values. |
| 2026-05-06 | Live App-Server Probe | `node /tmp/probe-codex-app-server.mjs "$PWD"` | `thread/start` with `serviceTier: "fast"` succeeded; result included `serviceTierInResult: "fast"`. | Confirms non-interactive runtime startup can apply Fast mode. |
| 2026-05-06 | Live Model Metadata | Same probe | `gpt-5.5` and `gpt-5.4` had `additionalSpeedTiers: ["fast"]`; `gpt-5.4-mini`, `gpt-5.3-codex`, `gpt-5.3-codex-spark` had `[]`. | UI must be capability-gated by selected model metadata. |

## External / Public Source Findings

- Official upstream source checked by cloning OpenAI Codex tag `rust-v0.128.0` from `https://github.com/openai/codex.git` into `/tmp/openai-codex-0.128.0`.
- Relevant upstream files:
  - `/tmp/openai-codex-0.128.0/codex-rs/features/src/lib.rs`: `Feature::FastMode` enables Fast mode selection in TUI/request layer.
  - `/tmp/openai-codex-0.128.0/codex-rs/protocol/src/config_types.rs`: defines `ServiceTier` with lower-case serde values.
  - `/tmp/openai-codex-0.128.0/codex-rs/core/config.schema.json`: defines config key `service_tier` and feature `fast_mode`.
  - `/tmp/openai-codex-0.128.0/codex-rs/protocol/src/openai_models.rs`: model presets expose `additional_speed_tiers` and `supports_fast_mode()`.
  - `/tmp/openai-codex-0.128.0/codex-rs/tui/src/chatwidget/slash_dispatch.rs`: `/fast`, `/fast on`, `/fast off`, and `/fast status` call service-tier selection.
  - `/tmp/openai-codex-0.128.0/codex-rs/core/tests/suite/model_switching.rs`: tests show `ServiceTier::Fast` maps to outgoing HTTP `service_tier: "priority"`; unset default sends no service tier; `ServiceTier::Flex` maps to `"flex"`.
- Version/freshness: local installed and probed version is `codex-cli 0.128.0`; official source tag is `rust-v0.128.0`.
- Why it matters: Confirms the correct implementation target is Codex app-server service tier, not slash-command injection or reasoning-effort mutation.

## Current Gap Summary

- Capability gap: Autobyteus drops Codex `additionalSpeedTiers`, so the frontend cannot know a selected Codex model supports Fast mode.
- UI gap: There is no explicit Fast mode control, and the schema UI is biased toward thinking controls.
- Runtime gap: Even if a `service_tier` key were manually submitted in `llmConfig`, the backend currently never forwards it to Codex app-server.

## Candidate Implementation Direction For Design

1. Add Codex service-tier normalization in `codex-app-server-model-normalizer.ts`, e.g. `normalizeCodexServiceTier()` and `resolveCodexSessionServiceTier()`.
2. Parse `additionalSpeedTiers` / `additional_speed_tiers` from Codex model rows.
3. Build a combined Codex config schema with:
   - existing `reasoning_effort` enum when supported;
   - `service_tier` enum when `additionalSpeedTiers` contains `fast`.
4. Do not default `service_tier` to `fast`; leave no default so the frontend “Default” option means absent/default/off.
5. Extend `CodexThreadConfig` with `serviceTier: string | null`.
6. Map `input.agentRunConfig.llmConfig?.service_tier` to `CodexThreadConfig.serviceTier` in `CodexThreadBootstrapper`.
7. Add `serviceTier: config.serviceTier` to `thread/start` and `thread/resume` payloads.
8. Add a `serviceTier` getter and include it in `turn/start` payloads.
9. Adjust `ModelConfigSection.vue` if needed so non-thinking schema parameters can be shown as model/runtime config rather than hidden behind thinking support.
10. Add tests at backend normalizer/bootstrap/thread manager/thread payload levels and frontend schema/component levels.

## Validation Plan Suggestions

- Backend unit tests:
  - `mapCodexModelListRowToModelInfo` includes `service_tier` only when `additionalSpeedTiers` contains `fast`.
  - `resolveCodexSessionServiceTier` accepts `fast` and rejects unknown values.
  - `CodexThreadBootstrapper` maps `llmConfig.service_tier` to `codexThreadConfig.serviceTier`.
  - `CodexThreadManager` sends `serviceTier` on `thread/start` and `thread/resume`.
  - `CodexThread` sends `serviceTier` on `turn/start`.
- Frontend tests:
  - `llmConfigSchema` preserves valid `service_tier` enum and drops stale/invalid values.
  - Config component renders the Fast mode enum and emits `llmConfig.service_tier: "fast"`.
  - Changing to a schema without `service_tier` clears stale Fast-mode config.
- Live/gated validation:
  - Update or add a `RUN_CODEX_E2E=1` Codex model catalog/app-server integration test to assert fast-capable models expose `additionalSpeedTiers` and a `thread/start` with `serviceTier: "fast"` is accepted when such a model exists.

## Open Questions To Confirm With User/Product

1. Should the UI label be “Fast mode” with protocol details in help text, or “Service tier” with `fast` as an option? Recommendation: “Fast mode”.
2. Should explicit `flex` be exposed now? Recommendation: no; implement only `/fast` parity (`fast` vs default/off).
3. Should Fast mode be configurable for active existing sessions, or only at launch/default config? Recommendation: launch/default config first, because the user asked about selecting Codex runtime configuration.

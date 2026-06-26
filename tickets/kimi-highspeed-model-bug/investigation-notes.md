# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Investigation complete; requirements are design-ready pending user approval
- Investigation Goal: Identify the cause of the Kimi high-speed model temperature error, determine whether `Kimi Code` and `Kimi Code High Speed` are distinct provider models or duplicate/confusing aliases, and define a design-ready fix.
- Scope Classification (`Small`/`Medium`/`Large`): Small-to-Medium
- Scope Classification Rationale: The primary defect is isolated to the existing Kimi provider adapter predicate, but the user-visible model-catalog clarity question also needs a narrow catalog/display decision and coverage.
- Scope Summary: Daily Assistant run using `Kimi / kimi-k2.7-code-highspeed` fails because high-speed K2.7 Code is cataloged but not included in the Kimi adapter's K2.7 fixed-sampling normalization path. It falls through to generic OpenAI-compatible request building, which sends default `temperature: 0.7`; Kimi requires K2.7 Code temperature to be exactly `1.0`.
- Primary Questions To Resolve:
  - Where is `kimi-k2.7-code-highspeed` defined and displayed? Resolved: built-in catalog row in `autobyteus-ts/src/llm/supported-model-definitions.ts`, metadata in `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts`, displayed through `ModelInfo`/provider grouping as `Kimi / kimi-k2.7-code-highspeed` for AutoByteus runtime.
  - What outgoing temperature is generated for this model, and by which owner? Resolved by static trace: high-speed falls through to generic request builder, which sends `LLMConfig.temperature` default `0.7`; `KimiLLM` should own the override.
  - Does provider documentation or the upstream model catalog distinguish `kimi-k2.7-code` and `kimi-k2.7-code-highspeed`? Resolved: yes, official docs and live `/models` list both identifiers; docs describe high-speed as the same K2.7 Code model with faster output speed.
  - What is the minimal coherent design for enforcing model-specific parameter constraints and cleaning the Kimi catalog labels? Resolved: extend the existing K2.7 predicate/model-family helper in `KimiLLM` to include both identifiers; keep both catalog rows but make their labels/meaning clear.

## Request Context

User provided two screenshots and reported:

- They selected the Kimi high-speed model for one Daily Assistant agent/run.
- The run failed; screenshot shows provider error `400 invalid temperature: only 1 is allowed for this model`.
- They see both Kimi code and Kimi code High Speed and ask whether those are truly different models.

Screenshot evidence files:

- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_a1d31214853f4852b556b11767e6ca1a/solution_designer_15a2f72238c242cca5aca0cbd15583fc/context_files/ctx_2c595dfd6215__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_a1d31214853f4852b556b11767e6ca1a/solution_designer_15a2f72238c242cca5aca0cbd15583fc/context_files/ctx_9916a6571c5a__image.png`

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/kimi-highspeed-model-bug`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/kimi-highspeed-model-bug/tickets/kimi-highspeed-model-bug`
- Current Branch: `codex/kimi-highspeed-model-bug`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/kimi-highspeed-model-bug`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-06-26.
- Task Branch: `codex/kimi-highspeed-model-bug`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: Authoritative work must remain in the dedicated task worktree above; do not modify the shared superrepo checkout.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-26 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && ls -la` in `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` | Establish initial repository/workspace context | Current shared checkout is git repo on `personal`, tracking `origin/personal`, with unrelated untracked `.article-work/` and `docs/articles/`; not a ticket worktree. | No |
| 2026-06-26 | Command | `git remote -v && git branch -vv && git remote show origin | sed -n '/HEAD branch/s/.*: //p'` | Resolve base branch and remote | Remote `origin` points to `AutoByteus/autobyteus-workspace.git`; remote HEAD/base is `personal`; many existing worktrees. | No |
| 2026-06-26 | Command | `git fetch origin --prune` | Refresh tracked remote refs before creating ticket branch | Completed successfully. | No |
| 2026-06-26 | Command/Setup | `git worktree add -b codex/kimi-highspeed-model-bug /Users/normy/autobyteus_org/autobyteus-worktrees/kimi-highspeed-model-bug origin/personal` | Create dedicated task worktree/branch | Dedicated worktree created at commit `a0a3d52f`, branch tracks `origin/personal`. | No |
| 2026-06-26 | Other | User-provided screenshots listed in Request Context | Capture observed product failure | Runtime error says `400 invalid temperature: only 1 is allowed for this model`; selected LLM model is `Kimi / kimi-k2.7-code-highspeed`. | No |
| 2026-06-26 | Command | `rg -n "kimi-k2\.7-code-highspeed\|KIMI_K2_7_CODE\|KIMI_K2_7" autobyteus-ts autobyteus-server-ts autobyteus-web --glob '!node_modules' --glob '!dist' --glob '!build'` | Locate exact high-speed catalog/request-policy references | High-speed exists in `supported-model-definitions.ts` and `curated-model-metadata.ts`. Kimi adapter only defines `KIMI_K2_7_CODE_MODEL = 'kimi-k2.7-code'` and branches on exact equality. | Implement predicate extension |
| 2026-06-26 | Code | `autobyteus-ts/src/llm/api/kimi-llm.ts` | Inspect Kimi provider request normalization owner | `normalizeKimiKwargs()` calls `normalizeK2_7CodeKwargs()` only when `this.model.value === 'kimi-k2.7-code'`. The K2.7 normalizer deletes disabled thinking and forces `temperature: 1.0`; high-speed is not included. | Modify |
| 2026-06-26 | Code | `autobyteus-ts/src/llm/api/openai-compatible-request-builder.ts` | Trace fallback request composition | Generic request builder applies `config.temperature` whenever present. `LLMConfig` default is non-null, so Kimi high-speed fallback will send a temperature. | No shared-builder change; adapter should normalize |
| 2026-06-26 | Code | `autobyteus-ts/src/llm/utils/llm-config.ts` | Confirm default config temperature | `LLMConfig.temperature` defaults to `0.7`; `mergeWith()` preserves non-null user/default temperature. | No |
| 2026-06-26 | Code | `autobyteus-ts/src/llm/supported-model-definitions.ts` | Inspect built-in Kimi catalog | Catalog includes `kimi-k2.6`, `kimi-k2.7-code`, and `kimi-k2.7-code-highspeed`; high-speed has KimiLLM class and pricing config. | Preserve row; clarify if labels change |
| 2026-06-26 | Code | `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts` | Inspect fallback model metadata | Metadata includes both K2.7 Code identifiers with 256K context and Kimi docs source URLs. | Preserve/ensure coverage |
| 2026-06-26 | Code | `autobyteus-ts/tests/unit/llm/api/kimi-llm.test.ts` | Check durable Kimi adapter tests | Tests cover K2.6 and non-high-speed `kimi-k2.7-code` fixed sampling/tool-choice behavior, but no high-speed K2.7 row. | Add tests |
| 2026-06-26 | Web | `https://platform.kimi.ai/docs/guide/kimi-k2-7-code-quickstart` | Verify official high-speed and fixed-parameter contract | Official docs list both `kimi-k2.7-code` and `kimi-k2.7-code-highspeed`; high-speed is described as the same model with faster output speed; fixed parameters include `temperature=1.0`, `top_p=0.95`, `n=1`, penalties `0.0`, and tool choice `auto`/`none`. | Use in requirements/design |
| 2026-06-26 | Web | `https://platform.kimi.ai/docs/models` | Verify current official model list | Official model overview lists `kimi-k2.7-code` and `kimi-k2.7-code-highspeed`, both with 256K context. | Use in requirements/design |
| 2026-06-26 | Probe | Node fetch to `https://api.moonshot.ai/v1/models` using configured `KIMI_API_KEY`; output redacted to status + matching ids only | Verify live provider catalog without exposing secrets | HTTP 200; matching model IDs: `kimi-k2.7-code` and `kimi-k2.7-code-highspeed`, both `context_length: 262144`. | No |
| 2026-06-26 | Command | `git show e1476fc5/b794dcc6/fb3914b1 ... | rg "kimi-k2\.7\|highspeed"`; `git log --oneline ...` | Understand introduction history | Original newest-GLM/Kimi adapter work added non-high-speed K2.7 policy. Later token/pricing catalog commit added high-speed catalog row without updating Kimi adapter predicate. | Helps root-cause classification |
| 2026-06-26 | Code | `autobyteus-ts/src/llm/models.ts`, `autobyteus-ts/src/llm/llm-factory.ts`, `autobyteus-server-ts/src/llm-management/providers/autobyteus-llm-model-provider.ts`, `autobyteus-web/composables/useRuntimeScopedModelSelection.ts`, `autobyteus-web/utils/modelSelectionLabel.ts` | Trace model selector display flow | `LLMModel.toModelInfo()` emits `display_name: this.name`; AutoByteus runtime selection labels prefer `modelIdentifier`, selected label is `provider / optionLabel`, matching screenshot `Kimi / kimi-k2.7-code-highspeed`. | Optional clarity improvement |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Agent configuration model selector selects `Kimi / kimi-k2.7-code-highspeed`; chat send starts a Daily Assistant run.
- Current execution flow:
  - Catalog/display: `supported-model-definitions.ts` -> `buildSupportedModels()`/`LLMFactory` -> `LLMModel.toModelInfo()` -> server `AutobyteusLlmModelProvider` -> frontend provider/model grouping -> `Kimi / kimi-k2.7-code-highspeed` selected label.
  - Invocation: runtime/agent config -> `LLMFactory.createLLM(modelIdentifier)` -> `KimiLLM` -> `normalizeKimiKwargs()` -> `OpenAICompatibleRequestBuilder.build()` -> Kimi/Moonshot Chat Completions API.
- Ownership or boundary observations:
  - `KimiLLM` is the correct authoritative owner for Kimi-specific request invariants.
  - `OpenAICompatibleRequestBuilder` is provider-agnostic and correctly applies generic config; it should not gain Kimi-specific model checks.
  - `supported-model-definitions.ts` is the built-in catalog owner; it already has both official K2.7 rows.
  - Frontend selection labels intentionally show model identifiers for AutoByteus runtime; this is why the screenshot shows the raw high-speed identifier.
- Current behavior summary: `kimi-k2.7-code-highspeed` is cataloged and selectable but falls outside the K2.7 Code normalization predicate. The generic `LLMConfig` default temperature `0.7` reaches the request builder and the provider rejects it because K2.7 Code variants require `temperature = 1.0`.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix + small catalog clarity behavior change
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant
- Refactor posture evidence summary: Existing ownership is healthy. The missing invariant is that the K2.7 provider-policy branch is keyed to one exact model string instead of the K2.7 Code model family. No broad refactor is needed; a small predicate/model-family helper makes the invariant explicit and reusable inside `KimiLLM` tests.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Screenshot error | Upstream rejects temperature unless exactly `1` for selected model | Runtime lacks K2.7 high-speed provider constraint enforcement | Extend Kimi adapter predicate |
| `kimi-llm.ts` | K2.7 normalization exists but only for `kimi-k2.7-code` | Correct owner is present; invariant is incomplete | Modify/test |
| `supported-model-definitions.ts` | High-speed row uses `KimiLLM` and is selectable | Catalog introduced a model identifier that adapter policy does not recognize | Add high-speed adapter coverage |
| `LLMConfig` + request builder | Default temperature `0.7` is generically sent | Explains exact 400 error without needing a live failed repro | No shared-builder change |
| Kimi official docs + live `/models` | Both K2.7 identifiers are real; high-speed is same model faster route | Do not remove as duplicate; clarify label/meaning | Preserve both rows |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-ts/src/llm/api/kimi-llm.ts` | Kimi provider adapter/default/request normalization | Existing K2.7 Code normalization enforces fixed sampling, thinking, and tool-choice but only for exact `kimi-k2.7-code` | Extend the K2.7 predicate to include high-speed; keep provider policy here |
| `autobyteus-ts/src/llm/api/openai-compatible-request-builder.ts` | Generic OpenAI-compatible request construction | Applies config temperature and kwargs without provider-specific checks | Do not add Kimi-specific logic here |
| `autobyteus-ts/src/llm/utils/llm-config.ts` | Generic LLM config/defaults | Default temperature is `0.7` | Kimi adapter must override before request builder |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | Built-in model catalog/pricing/default class | Includes both K2.7 Code rows; high-speed value is official | Preserve both; optionally improve display names while keeping identifiers |
| `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts` | Docs-backed model metadata fallback | Includes both K2.7 Code identifiers with 256K context | Preserve/cover high-speed metadata if tests change |
| `autobyteus-ts/tests/unit/llm/api/kimi-llm.test.ts` | Deterministic Kimi request-shape tests | Missing high-speed K2.7 request-shape coverage | Add high-speed tests |
| `autobyteus-ts/tests/integration/llm/api/kimi-llm.test.ts` | Live Kimi provider coverage | Existing live coverage focuses K2.6 and non-high-speed K2.7 Code | Add/attempt high-speed live coverage if credentials are available |
| `autobyteus-web/utils/modelSelectionLabel.ts` | Frontend model label policy | AutoByteus runtime uses model identifiers, selected label includes provider name | If clearer labels are desired, decide whether catalog `name` or label policy changes own it |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-26 | Static trace | Read `KimiLLM.normalizeKimiKwargs()` against `OpenAICompatibleRequestBuilder.build()` and `LLMConfig` defaults | High-speed model is not normalized; generic builder sends default `temperature: 0.7` | Explains provider `temperature` 400 error |
| 2026-06-26 | Live probe | Node `fetch('https://api.moonshot.ai/v1/models')` with bearer key from environment; printed only HTTP status and matching IDs | HTTP 200; live provider lists both `kimi-k2.7-code` and `kimi-k2.7-code-highspeed` with `context_length: 262144` | The two entries are real provider model IDs/routes |

## External / Public Source Findings

- Kimi K2.7 Code quickstart: `https://platform.kimi.ai/docs/guide/kimi-k2-7-code-quickstart`, checked 2026-06-26. Relevant facts: `Kimi K2.7 Code HighSpeed (kimi-k2.7-code-highspeed)` is described as the high-speed version / same model with faster output speed; model variants list `kimi-k2.7-code` and `kimi-k2.7-code-highspeed`; both have 256K context. The same page documents fixed parameters: `temperature = 1.0`, `top_p = 0.95`, `n = 1`, `presence_penalty = 0.0`, `frequency_penalty = 0.0`, and tool choice `auto`/`none` only.
- Kimi model overview: `https://platform.kimi.ai/docs/models`, checked 2026-06-26. Relevant facts: official model list shows both `kimi-k2.7-code` and `kimi-k2.7-code-highspeed`, both with 256K context.
- Live Kimi `/models` endpoint, checked 2026-06-26 with local `KIMI_API_KEY` and no secret output. Relevant facts: endpoint returned both identifiers with context length 262144.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for static root cause. Live provider confirmation requires `KIMI_API_KEY`.
- Required config, feature flags, env vars, or accounts: `KIMI_API_KEY` was present in the execution environment and used only for a redacted `/models` probe.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation above.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

- The user's two-model concern is valid but not a duplicate-catalog bug: `kimi-k2.7-code-highspeed` is a distinct official API identifier/serving route, while Kimi docs describe it as the same K2.7 Code model with higher output speed.
- The runtime failure is a product bug: the built-in catalog exposes high-speed but `KimiLLM` only normalizes the non-high-speed K2.7 identifier.
- The minimal fix is to make K2.7 Code request policy family-based inside `KimiLLM` (both identifiers), not to move policy into the shared OpenAI-compatible request builder.
- Existing Kimi unit tests already provide the right shape for new high-speed coverage.
- Model selector clarity may be improved by display names or a label policy, but removing high-speed as a duplicate would be wrong based on provider evidence.

## Constraints / Dependencies / Compatibility Facts

- No compatibility aliases or fallback hidden rows should be introduced.
- The shared OpenAI-compatible request builder must stay provider-agnostic.
- High-speed and non-high-speed K2.7 identifiers should remain distinct for provider routing/pricing while sharing request constraints.
- Existing `kimi-k2.6` behavior must remain unchanged.

## Open Unknowns / Risks

- Live high-speed request execution may be blocked by provider availability/quota; classify as environment/provider access if the normalized request is accepted by request-capture coverage but live access fails.
- If frontend currently lacks a separate human display name field for AutoByteus runtime identifiers, catalog clarity might require either using `name` differently or a follow-up display-name capability. This should not block the core temperature fix.

## Notes For Architect Reviewer

- Design should focus on a bounded missing invariant in `KimiLLM`: K2.7 Code policy applies to both official K2.7 identifiers.
- Do not put Kimi constants into `OpenAICompatibleRequestBuilder`.
- Do not remove `kimi-k2.7-code-highspeed` as a duplicate; it is a real provider model ID/route.
- Acceptance coverage should include deterministic request-capture for high-speed temperature/fixed sampling and K2.6 non-regression. Live high-speed provider coverage is useful but can be environment-classified if blocked.

## Additional Findings: Backend Config Composition Design Smell (2026-06-26)

The user correctly pointed out that temperature should normally be resolved from model/default configuration when the user has not explicitly supplied a custom value. Additional backend/code investigation found the current config pipeline does not cleanly support that authority model.

### Additional Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-26 | Command | `rg -n "createLLM\\(|LLMConfig\\.fromDict|new LLMConfig\\(" autobyteus-server-ts/src/agent-execution autobyteus-ts/src/llm` | Find runtime config construction and LLM creation path | AutoByteus backend is the active native runtime path that converts run `llmConfig` to `LLMConfig`. | Design fix needed |
| 2026-06-26 | Code | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` lines around `new LLMConfig({ extraParams: llmConfig })` | Inspect how persisted run config becomes runtime LLM config | Runtime wraps the entire user/run config record as `extraParams`, instead of parsing standard fields into first-class config fields. Constructing `LLMConfig` this way also creates implicit default `temperature: 0.7`. | Modify/design owner |
| 2026-06-26 | Code | `autobyteus-ts/src/llm/llm-factory.ts` `createLLM()` | Inspect model default + override merge order | Factory clones `model.defaultConfig`, merges passed `llmConfig`, then constructs provider LLM. | Keep composition owner but avoid implicit overrides |
| 2026-06-26 | Code | `autobyteus-ts/src/llm/api/openai-compatible-llm.ts` constructor | Inspect provider constructor config behavior | Constructor again clones `model.defaultConfig` and merges supplied config. This is redundant and makes override semantics harder to reason about. | Account for in design |
| 2026-06-26 | Code | `autobyteus-ts/src/llm/utils/llm-config.ts` constructor/`mergeWith()` | Inspect absence/default semantics | `temperature` is a non-null number defaulting to `0.7`; `mergeWith()` overwrites when override temperature is non-null. There is no representation for “temperature absent in user override.” | Refactor or introduce override composer |
| 2026-06-26 | Code | `autobyteus-ts/src/llm/supported-model-definitions.ts` Kimi rows | Inspect model default configs | Kimi K2.7 rows include pricing defaults but not fixed sampling defaults such as temperature/top_p/penalties. | Add model-family policy/defaults |
| 2026-06-26 | Code | `autobyteus-web/components/workspace/config/ModelConfigSection.vue`, `ModelConfigAdvanced.vue`, `utils/llmConfigSchema.ts` | Understand UI config semantics | UI emits only schema-backed config keys and uses defaults for schema parameters; Kimi currently has no config schema, so normal users do not set temperature through this UI path. | Preserve model-specific config behavior |
| 2026-06-26 | Code/Test | `autobyteus-server-ts/tests/integration/agent-definition/md-centric-provider.integration.test.ts`, `autobyteus-web/stores/__tests__/agentDefinitionStore.spec.ts`, `autobyteus-server-ts/tests/integration/agent-execution/agent-run-service.integration.test.ts` | Check whether `{ temperature: ... }` in launch config is intended | Tests persist and pass `llmConfig: { temperature: ... }`, implying standard fields in launch config are intended to be supported. | Add composition coverage |

### Current Effective Config Flow

`Frontend/model config or agent defaultLaunchConfig` -> GraphQL `llmConfig: Record<string, unknown> | null` -> `AgentRunMetadata.llmConfig` -> `AgentRunConfig.llmConfig` -> `AutoByteusAgentRunBackendFactory` -> `new LLMConfig({ extraParams: llmConfig })` -> `LLMFactory.createLLM()` merges into `model.defaultConfig` -> provider constructor merges again -> request builder applies first-class config fields and then `extraParams`.

### Design Implications

- `LLMModel.defaultConfig` is present and should be the model-level home for defaults, but current Kimi K2.7 rows do not encode fixed sampling defaults.
- `LLMConfig` currently conflates an effective full config with a partial override. This is why an override object that does not include temperature can still carry `temperature: 0.7` after construction.
- Server runtime config conversion bypasses first-class config parsing by putting all user keys into `extraParams`. This makes standard fields work accidentally only because the request builder applies `extraParams` after config fields.
- The target design should introduce a clear effective-config composition boundary or override factory that preserves absence semantics and parses known fields properly.
- Kimi K2.7 fixed values should be represented as a shared Kimi model-family policy/default set used by both model definitions and adapter enforcement, so adding HighSpeed cannot drift away from the non-high-speed model again.

### Extra Nuance: Standard Fields Currently Work Inconsistently

A run/default launch config such as `{ temperature: 0.2 }` is not reliably honored as a first-class `LLMConfig.temperature` today. In the generic OpenAI-compatible builder, `extraParams.temperature` can overwrite the earlier config temperature because `extraParams` are assigned after `applyConfig()`. But provider adapters that inspect `this.config.temperature` or add normalized kwargs may not see that user temperature as first-class config. For example, Kimi K2.6 normalization can add its own `kwargs.temperature`, and `OpenAICompatibleRequestBuilder.applySafeKwargs()` applies kwargs after `extraParams`, so adapter-added kwargs can override the user/run `extraParams.temperature`. This confirms the boundary is not merely inelegant; behavior depends on provider-specific ordering.

## User Refinement: Generalize Config Composition To All LLMs (2026-06-26)

The user clarified that the config-resolution pattern should apply to all LLMs, not only Kimi. This aligns with the investigation: the broken boundary is in the runtime/factory config composition path, before provider-specific adapters. Kimi HighSpeed is the observed failing case because Kimi has a strict fixed temperature invariant, but the underlying design pressure is global.

Updated interpretation:

- Model registry `defaultConfig` is the source for model-specific defaults for every provider/model.
- Raw user/run `llmConfig` is a partial override for all providers.
- Absence semantics must be global: if a user does not set `temperature`, no generic user override should overwrite the model default.
- Provider adapters enforce only provider/model invariants after effective config composition.
- Kimi K2.7 Code and HighSpeed are the first concrete provider invariant covered by this ticket.

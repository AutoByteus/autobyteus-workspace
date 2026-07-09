# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Complete; root cause confirmed
- Investigation Goal: Explain why Codex CLI shows `max` and `ultra` for `gpt-5.6-sol` while AutoByteus shows only `low`, `medium`, `high`, and `xhigh`.
- Scope Classification: `Medium`
- Scope Classification Rationale: The question requires source tracing and runtime probing across an installed external runtime, backend integration, shared contracts, and frontend rendering.
- Scope Summary: Root-cause investigation is complete; the user approved corrective design and implementation on 2026-07-09.
- Primary Questions To Resolve:
  1. What exact model metadata does the installed Codex CLI/App Server advertise?
  2. Does AutoByteus consume that metadata or substitute a static list?
  3. At which boundary are `max` and `ultra` lost?

## Request Context

The user supplied screenshots showing Codex CLI 0.144.0 with six reasoning choices for `gpt-5.6-sol`, and the AutoByteus team configuration UI with four choices for the same displayed model.

Reference screenshots:

- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_880ffdfa233646f09c8a1f9f12809333/solution_designer_3144d8604ff3424ba6c036981142bb2a/context_files/ctx_04e43bd0b4ca__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_880ffdfa233646f09c8a1f9f12809333/solution_designer_3144d8604ff3424ba6c036981142bb2a/context_files/ctx_1c40dfaf3711__image.png`

## Environment Discovery / Bootstrap Context

- Project Type: `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/gpt56-reasoning-level-investigation`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/gpt56-reasoning-level-investigation/tickets/in-progress/gpt56-reasoning-level-investigation`
- Current Branch: `codex/gpt56-reasoning-level-investigation`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/gpt56-reasoning-level-investigation`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin personal` succeeded on 2026-07-09; task branch and `origin/personal` both started at `4aeb31191beeb4005969ad3c1143e5ac0a34e02b`.
- Task Branch: `codex/gpt56-reasoning-level-investigation`
- Expected Base Branch: `personal`
- Expected Finalization Target: `personal` if a later implementation is approved.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: The user's shared checkout had unrelated untracked files; all authoritative task artifacts are isolated in this dedicated worktree.

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-09 | Other | User-supplied screenshots listed above | Establish reported behavior | CLI screenshot shows six levels; AutoByteus UI shows four | Yes |
| 2026-07-09 | Command | `git fetch origin personal` and `git worktree add -b codex/gpt56-reasoning-level-investigation ... refs/remotes/origin/personal` | Create isolated current task workspace | Worktree created from refreshed base at `4aeb3119` | No |
| 2026-07-09 | Command | `type -a codex`; `readlink $(command -v codex)`; `codex --version` | Identify the exact local runtime | `/Users/normy/.local/bin/codex` points to the standalone package; version is `codex-cli 0.144.0` | No |
| 2026-07-09 | Code | `autobyteus-server-ts/src/llm-management/services/codex-model-catalog.ts` | Find the AutoByteus model-discovery entrypoint | Calls App Server `model/list` and maps each row through `mapCodexModelListRowToModelInfo` | No |
| 2026-07-09 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/codex-app-server-model-normalizer.ts` | Trace capability normalization | Static set accepts only `none`, `low`, `medium`, `high`, `xhigh`; both catalog and launch paths reuse it | No |
| 2026-07-09 | Code | `autobyteus-web/utils/llmConfigSchema.ts`; `autobyteus-web/components/workspace/config/ModelConfigAdvanced.vue` | Determine whether the frontend filters enum values | Frontend copies `enum_values` into the UI schema and renders every enum entry | No |
| 2026-07-09 | Probe | Temporary Node JSON-RPC client: spawn `codex app-server`; request `initialize`; notify `initialized`; request `model/list` with `{cursor:null,includeHidden:false}` | Inspect raw App Server metadata without AutoByteus mapping | `gpt-5.6-sol` advertises `low`, `medium`, `high`, `xhigh`, `max`, `ultra`; default `low` | No |
| 2026-07-09 | Probe | `POST http://127.0.0.1:29695/graphql` querying `availableLlmProvidersWithModels(runtimeKind:"codex_app_server")` | Inspect actual running AutoByteus 1.4.6 output | `gpt-5.6-sol` GraphQL `reasoning_effort.enum_values` contains only `low`, `medium`, `high`, `xhigh` | No |
| 2026-07-09 | Probe | Import `/Applications/AutoByteus.app/Contents/Resources/server/dist/agent-execution/backends/codex/codex-app-server-model-normalizer.js` and invoke its exported normalizer/mapper | Confirm the packaged application's exact loss point | `max` and `ultra` normalize to `null`; mapped catalog drops both; explicit run resolution also returns `null` | No |
| 2026-07-09 | Command | `codex app-server generate-ts --experimental --out <temp-dir>` | Inspect the installed protocol contract | Generated `ReasoningEffort` is `string`; generated comments identify `effort: "ultra"` as the current automatic/proactive multi-agent behavior switch | No |
| 2026-07-09 | Repo | `https://github.com/openai/codex.git`, tag `rust-v0.144.0`, commit `767822446c7a594caa19609ca435281a9ec67e0d` | Trace how the CLI obtains and renders reasoning levels | Model manager uses remote `/models` plus cache/bundled fallback; `ModelInfo -> ModelPreset` preserves advertised efforts; TUI renders `preset.supported_reasoning_efforts` directly | No |
| 2026-07-09 | Command | `git blame` and `git log --follow` on `codex-app-server-model-normalizer.ts` | Determine origin/staleness of the filter | Five-value set was introduced on 2026-02-28 in commit `1670457d` and remains unchanged | No |
| 2026-07-09 | Repo | Historical `AutoByteus/autobyteus-server-ts` commit `22561c8ff556160ad945c1e4b08de262b24aad79` and `tickets/codex-runtime-server-owned-redesign/*` | Recover the original reason for the hardcode before the repositories were flattened | The set was originally added on 2026-02-25 as defensive “known enum/default” normalization. Requirements explicitly asked unknown values/defaults to be dropped to avoid invalid UI state and persisted reopen drift. No security rationale was documented. | No |
| 2026-07-09 | Code | `autobyteus-server-ts/tests/integration/services/codex-model-catalog.integration.test.ts` | Evaluate why coverage did not catch drift | Test asserts every normalized value belongs to the old five-value set; it never compares raw and normalized effort lists | No |
| 2026-07-09 | Doc | `node /Users/normy/.codex/skills/.system/openai-docs/scripts/fetch-codex-manual.mjs` | Attempt current public Codex manual lookup | Helper failed because the response lacked `x-content-sha256`; local runtime and official tagged source provided the decisive evidence | No |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Codex CLI model/reasoning selector versus AutoByteus team-definition model configuration.
- Current execution flow:
  - Codex CLI: remote `/models` or cache/bundled `models.json` -> `ModelsManager` -> `ModelInfo -> ModelPreset` -> TUI `open_reasoning_popup` -> one choice per `supported_reasoning_efforts` entry.
  - AutoByteus: GraphQL `availableLlmProvidersWithModels(runtimeKind)` -> `ModelCatalogService` -> `CodexModelCatalog.model/list` -> `mapCodexModelListRowToModelInfo` -> fixed allowlist filter -> GraphQL `configSchema` -> frontend schema normalizer -> generic enum renderer.
  - AutoByteus launch: persisted/submitted `llmConfig.reasoning_effort` -> the same fixed allowlist normalizer -> `CodexThreadConfig.reasoningEffort` -> `turn/start.effort`.
- Ownership or boundary observations:
  - Codex App Server already owns per-model reasoning capability discovery.
  - AutoByteus's catalog adapter is the correct translation boundary, but its closed global capability policy duplicates and narrows the authoritative per-model contract.
  - The frontend correctly depends on the backend-provided schema and has no Codex-specific option list.
- Current behavior summary: Codex 0.144.0 advertises six values for `gpt-5.6-sol`; AutoByteus discards `max` and `ultra` in backend normalization, so both UI discovery and explicit runtime propagation are limited to the older set.

## Design Health Assessment Evidence

- Change posture: `Bug Fix`.
- Candidate root cause classification: `Duplicated Policy Or Coordination`.
- Refactor posture evidence summary: A focused boundary correction is needed. Simply appending two labels would restore today's options but retain the same drift class because Codex 0.144.0 intentionally accepts non-empty model-advertised custom effort values.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User screenshots | Two UIs expose different capability sets for the same displayed model | A capability contract may be stale, narrowed, or owned at the wrong boundary | Yes |
| Raw App Server probe vs live AutoByteus GraphQL | Six values enter AutoByteus's integration boundary; four leave it | The defect is inside AutoByteus backend mapping, not CLI discovery or frontend rendering | No |
| `VALID_REASONING_EFFORTS` plus `toSupportedReasoningEfforts` | Model-advertised values are filtered through an older product-wide set | Duplicated capability policy causes version drift | No |
| Packaged normalizer invocation | `max`/`ultra` become null for both catalog mapping and run resolution | One shared filter creates two user-visible defects | No |
| Codex `ReasoningEffort::Custom` and open-string schema | Upstream intentionally supports future non-empty model-advertised effort strings | A permanent closed AutoByteus enum is an unhealthy boundary | No |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/llm-management/services/codex-model-catalog.ts` | Acquire App Server client, page through `model/list`, map rows | Receives authoritative rows and delegates mapping | Keep as the catalog entrypoint |
| `autobyteus-server-ts/src/agent-execution/backends/codex/codex-app-server-model-normalizer.ts` | Translate App Server model rows and normalize run settings | Static five-value set drops `max`, `ultra`, and future values; shared by catalog and run paths | Primary correction boundary; separate trusted advertised-value translation from explicit run-input validation if their policies differ |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` | Build `CodexThreadConfig` from run config | Uses `resolveCodexSessionReasoningEffort` | Explicit supported values must survive this boundary |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts` | Send Codex turns | Sends `this.reasoningEffort` as `turn/start.effort` | Final runtime payload is already generic string/null; no enum restriction here |
| `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts` | Transport model `configSchema` | Passes the mapped schema through unchanged | Not the loss point |
| `autobyteus-web/utils/llmConfigSchema.ts` | Normalize backend parameter schema and validate values | Copies backend `enum_values` into `enum` without a reasoning-specific filter | Reuse; likely coverage-only changes |
| `autobyteus-web/components/workspace/config/ModelConfigAdvanced.vue` | Render schema-driven advanced fields | Renders every value in `paramSchema.enum` | Reuse; no production option-list change indicated |
| `autobyteus-server-ts/tests/integration/services/codex-model-catalog.integration.test.ts` | Exercise live model-list transport | Tests an old closed set instead of pass-through parity | Replace/expand assertion to detect dropped advertised values |
| `/Applications/AutoByteus.app/.../codex-app-server-model-normalizer.js` | Packaged AutoByteus 1.4.6 runtime mapper | Contains the same fixed five-value set | Confirms repository source matches installed behavior |
| OpenAI Codex `codex-rs/models-manager/models.json` at `rust-v0.144.0` | Bundled fallback model metadata | `gpt-5.6-sol` contains all six values | Primary upstream evidence |
| OpenAI Codex `codex-rs/tui/src/chatwidget/model_popups.rs` at `rust-v0.144.0` | Render CLI reasoning popup | Iterates `preset.supported_reasoning_efforts` | Confirms CLI is catalog-driven |
| OpenAI Codex `codex-rs/protocol/src/openai_models.rs` at `rust-v0.144.0` | Shared model metadata/value contract | Known `Max`/`Ultra` plus `Custom(String)`; only empty values rejected | Supports forward-compatible advertised-value handling |

## Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-07-09 | Probe | JSON-RPC over stdio to `codex app-server`: `initialize`, `initialized`, `model/list` | `gpt-5.6-sol` advertises `low, medium, high, xhigh, max, ultra`; `gpt-5.6-luna` advertises through `max` but not `ultra` | Capabilities are model-specific and already available to AutoByteus |
| 2026-07-09 | Probe | GraphQL POST to the running AutoByteus server on port `29695` | Sol, Terra, and Luna all return only `low, medium, high, xhigh`; Luna also incorrectly loses `max` | AutoByteus globally narrows all rows; discrepancy is not Sol-specific |
| 2026-07-09 | Probe | Invoke packaged `normalizeCodexReasoningEffort`, mapper, and `resolveCodexSessionReasoningEffort` | Low through xhigh survive; max/ultra return null; mapped enum has four; explicit run values return null | Exact root cause and second runtime effect confirmed |
| 2026-07-09 | Script | `codex app-server generate-ts --experimental --out <temp-dir>` | `ReasoningEffort = string`; generated comments say use `effort: "ultra"` for proactive multi-agent behavior | Current App Server protocol does not require a fixed downstream enum |

## External / Public Source Findings

- Public API / spec / issue / upstream source: Official `openai/codex` repository, especially `codex-rs/models-manager/`, `codex-rs/protocol/src/openai_models.rs`, `codex-rs/tui/src/chatwidget/model_popups.rs`, and `codex-rs/app-server/src/models.rs`.
- Version / tag / commit / freshness: Tag `rust-v0.144.0`, peeled commit `767822446c7a594caa19609ca435281a9ec67e0d`, matching the installed CLI version.
- Relevant contract, behavior, or constraint learned:
  - The model manager fetches `/models`, caches results, and falls back to bundled model metadata.
  - `ModelInfo -> ModelPreset` preserves `supported_reasoning_levels`.
  - The TUI reasoning popup iterates the selected preset's supported values directly.
  - App Server `model/list` converts the same model preset without narrowing its reasoning efforts.
  - `ReasoningEffort` includes `max`, `ultra`, and `Custom(String)` and rejects only the empty string.
- Why it matters: Codex CLI and App Server share one dynamic model-capability contract; AutoByteus's fixed allowlist is not required by upstream and is the sole observed narrowing layer.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Installed Codex CLI/App Server; no AutoByteus service startup expected for initial protocol probing.
- Required config, feature flags, env vars, or accounts: Existing local Codex authentication/config; secrets will not be copied into artifacts.
- External repos, samples, or artifacts cloned/downloaded for investigation: Temporary shallow clone of official `https://github.com/openai/codex.git` at tag `rust-v0.144.0`; removed after recording commit and source findings.
- Setup commands that materially affected the investigation: Dedicated worktree creation recorded above.
- Cleanup notes for temporary investigation-only setup: Temporary JSON-RPC script, generated TypeScript directory, and upstream shallow clone were removed. No probe modified Codex config or AutoByteus data.

## Findings From Code / Docs / Data / Logs

### Root cause

The backend's `VALID_REASONING_EFFORTS` set is stale. The raw model row contains six values, but `toSupportedReasoningEfforts` calls `normalizeCodexReasoningEffort` for every entry. That function returns null for anything outside the five-value set, so `max` and `ultra` never reach the config schema. For Sol, the remaining advertised values are exactly the four visible in the screenshot.

### Why Codex CLI differs

Codex CLI does not use AutoByteus's allowlist. Its TUI receives `ModelPreset` rows from the model manager and builds the popup choices by mapping `preset.supported_reasoning_efforts`. The 0.144.0 bundled Sol preset and the live App Server row both contain all six values.

### Why this is not a frontend defect

AutoByteus GraphQL already returns only four values. The frontend normalizes `enum_values` to `enum` and renders one `<option>` for every enum entry. Existing frontend tests also exercise arbitrary schema values such as `max`; the frontend is capable of rendering them when supplied.

### Hidden second effect

The same function that filters catalog metadata also normalizes explicit run settings. A direct packaged-code probe showed both `resolveCodexSessionReasoningEffort({reasoning_effort:"max"})` and the `ultra` equivalent return null. Therefore bypassing the UI would not restore the requested effort: AutoByteus would send null at `turn/start`, allowing Codex to use its default.

### Coverage gap

The live catalog integration test asserts that every post-normalization effort belongs to the old set. Because unsupported entries are silently removed first, this test passes precisely when new upstream values are dropped. It needs an equality/pass-through assertion against the raw model metadata or explicit fixtures for max, ultra, and a future advertised value.

### Why the hardcode existed

The original Codex runtime integration deliberately added it as defensive input normalization, not as a product decision to expose only five levels and not as a security control. The 2026-02-25 requirements said model-list enum/default metadata should be validated before reaching the UI, unknown defaults should be dropped, and persisted reasoning settings should be reconciled when schemas change. The implementation represented “valid” as the then-known global set. That was a reasonable short-term guard but the wrong long-term owner: it duplicated a snapshot instead of validating against each model's advertised schema. The current Codex contract makes the mismatch explicit by treating reasoning effort as a non-empty open string and reserving model support authority for the App Server/model catalog.

## Constraints / Dependencies / Compatibility Facts

- Preserve per-model capability differences; do not assume every reasoning model supports the same levels.
- Avoid depending on undocumented rollout semantics beyond what the installed runtime proves.
- `gpt-5.6-luna` proves why a union of all current values is insufficient for UI exposure: it advertises `max` but not `ultra`.
- `ultra` carries automatic task-delegation semantics in current Codex metadata, so executable coverage must include team-runtime interaction rather than only schema rendering.

## Open Unknowns / Risks

- Resolved design direction: do not create an AutoByteus capability cache or repeat `model/list` lookup at thread bootstrap. Preserve non-empty submitted effort strings and let Codex App Server enforce its own open-string/model-support contract.
- The user explicitly directed AutoByteus to expose the levels returned by Codex App Server. `ultra` therefore remains in scope when advertised; executable coverage must still observe its automatic task-delegation interaction.

## Notes For Architect Reviewer

The defect is confirmed at one backend adapter boundary. The user approved implementation. A durable design should remove the duplicated closed capability policy, keep selectable values model-scoped through App Server metadata, defer direct runtime support decisions to the authoritative App Server, and explicitly cover the `ultra`/automatic-delegation interaction.

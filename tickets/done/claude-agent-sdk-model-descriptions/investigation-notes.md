# Investigation Notes

## Investigation Status

- Bootstrap Status: `Complete`
- Current Status: `Complete; requirements and UI/UX specification approved by the user on 2026-07-13`
- Investigation Goal: Explain why Claude Agent SDK model options lack descriptions in AutoByteus, determine the authoritative metadata source and affected path, and define a safe implementation scope.
- Scope Classification (`Small`/`Medium`/`Large`): `Medium`
- Scope Classification Rationale: The observable defect is frontend-facing but the description is discarded at the runtime adapter and absent from the shared model DTO, GraphQL model contract, frontend query/store, runtime-selection projection, and shared grouped selector.
- Scope Summary: Preserve live optional model-description metadata through the existing catalog spine and render/search it in shared model-selection UI. Model execution and stored identifiers remain unchanged.
- Primary Questions To Resolve:
  1. Where are Claude runtime model options discovered and normalized? `Resolved.`
  2. Does Claude's SDK expose the same concrete model/use guidance as Claude Code? `Yes.`
  3. Where is the metadata lost? `At the Claude normalizer, then structurally absent from every downstream contract.`
  4. Should AutoByteus hard-code descriptions? `No; the live SDK response is authoritative and varies by runtime/auth context.`
  5. Does the UI already support separate descriptions? `No; the generic selector supports only name and selected label.`

## Request Context

The user supplied three screenshots. Claude Code 2.1.201 shows `Default (recommended)`, `Sonnet`, `Opus`, and `Haiku` with concrete model/version and suitability text. AutoByteus shows richer Codex labels but only Claude alias names, making Claude model choice unclear.

Reference screenshots:

- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_ffb2a0fbd5f8495fa0e081a11d3a7b73/solution_designer_d29215ee80ad4882b229659d480b6258/context_files/ctx_003e9576a742__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_ffb2a0fbd5f8495fa0e081a11d3a7b73/solution_designer_d29215ee80ad4882b229659d480b6258/context_files/ctx_e7f967b2a2ae__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_ffb2a0fbd5f8495fa0e081a11d3a7b73/solution_designer_d29215ee80ad4882b229659d480b6258/context_files/ctx_05812eb94152__image.png`

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-agent-sdk-model-descriptions`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-agent-sdk-model-descriptions/tickets/done/claude-agent-sdk-model-descriptions`
- Current Branch: `codex/claude-agent-sdk-model-descriptions`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-agent-sdk-model-descriptions`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch --prune origin` succeeded on 2026-07-13; task branch was created from `origin/personal` commit `2f2ddc0bf97eddad7693764a6ad54393b5091d94` (`docs(delivery): record v1.4.10 release completion`).
- Task Branch: `codex/claude-agent-sdk-model-descriptions`
- Expected Base Branch (if known): `personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Use only this dedicated task worktree. The user's shared checkout contains unrelated untracked files and must not be used for authoritative artifacts or source changes. Read-only probes used its already-installed dependencies and built output at the same base commit.

## Supplemental Solution Artifact Inventory

| Artifact Path | Purpose | Evidence Or Decision Captured | Related Requirement / Acceptance-Criteria IDs | Status | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-agent-sdk-model-descriptions/tickets/done/claude-agent-sdk-model-descriptions/ui-ux-spec.md` | Define model-option content, search behavior, layout, fallback, and responsive states | Secondary description line; description-aware search; compact closed label; name-only fallback | REQ-003–REQ-006, REQ-008, REQ-010; AC-003–AC-005, AC-007–AC-009 | `Refined`; approved by the user on 2026-07-13 | Present with requirements.md |

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-13 | Setup | `git fetch --prune origin`; `git worktree add -b codex/claude-agent-sdk-model-descriptions /Users/normy/autobyteus_org/autobyteus-worktrees/claude-agent-sdk-model-descriptions origin/personal` | Establish a fresh isolated task workspace | `origin/HEAD -> origin/personal`; worktree created from `2f2ddc0b` | No |
| 2026-07-13 | Other | Three user-supplied screenshots listed in Request Context | Establish reported mismatch | Claude Code shows version/use guidance; AutoByteus Claude options show aliases only; Codex options look richer | No |
| 2026-07-13 | Code | `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts` | Find discovery entrypoint | `listModels()` calls query-control `supportedModels()` and maps normalized descriptors | No |
| 2026-07-13 | Code | `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-model-normalizer.ts` | Identify metadata mapping | Normalizer reads id/name/thinking flags but never reads `description`; `toModelInfo` cannot emit it | No |
| 2026-07-13 | Code | `autobyteus-ts/src/llm/models.ts` | Inspect shared catalog DTO | Shared `ModelInfo` has no description property | No |
| 2026-07-13 | Code | `autobyteus-server-ts/src/llm-management/services/{model-catalog-service.ts,claude-model-catalog.ts}` and `llm-management/llm-providers/services/llm-provider-service.ts` | Trace catalog/service ownership | Existing owners correctly route runtime-scoped rows; no separate policy or hard-coded Claude table exists | No |
| 2026-07-13 | Code | `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts` | Inspect API projection | `ModelDetail` and `mapLlmModel` omit description | No |
| 2026-07-13 | Code | `autobyteus-web/graphql/queries/llm_provider_queries.ts`, `stores/llmProviderConfig.ts`, `generated/graphql.ts` | Inspect frontend data contract | Query, handwritten store type, and generated type have no description | No |
| 2026-07-13 | Code | `autobyteus-web/composables/useRuntimeScopedModelSelection.ts` | Trace shared UI projection | Maps model to `{id,name,selectedLabel}` only; all main runtime-scoped launch surfaces reuse it | No |
| 2026-07-13 | Code | `autobyteus-web/components/agentTeams/SearchableGroupedSelect.vue` | Inspect rendering/search capability | `SelectItem` has no description; row renders one truncated span; search excludes descriptions | No |
| 2026-07-13 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/codex-app-server-model-normalizer.ts` | Explain richer Codex screenshot | Codex concatenates default reasoning into `display_name`; this is not separate description support | No |
| 2026-07-13 | Spec | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/node_modules/.pnpm/@anthropic-ai+claude-agent-sdk@0.2.71_zod@4.3.6/node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts`, lines around `ModelInfo` and `supportedModels()` | Verify upstream contract from installed first-party package | SDK `ModelInfo` requires `value`, `displayName`, and `description`; `supportedModels()` returns `Promise<ModelInfo[]>` | No |
| 2026-07-13 | Command | `claude --version`; locked package inspection | Establish runtime freshness | Claude Code `2.1.207`; Claude Agent SDK `0.2.71` | No |
| 2026-07-13 | Probe | Temporary Node ESM script calling SDK `query(...).supportedModels()` with installed Claude executable and AutoByteus CLI-auth environment (API-key variables removed) | Observe authoritative live rows without running a model turn | Returned the same concrete model/use descriptions shown in the user's Claude Code screenshot | No |
| 2026-07-13 | Probe | Temporary Node ESM script importing the already-built `ClaudeSdkClient` and calling `listModels()` | Compare AutoByteus output with raw SDK output | AutoByteus returned only `model_identifier` and `display_name`; no descriptions survived | No |
| 2026-07-13 | Trace | `curl` GraphQL query to running packaged server `http://127.0.0.1:29695/graphql` for `availableLlmProvidersWithModels(runtimeKind: "claude_agent_sdk")` | Reproduce product transport output | Claude rows contain names/identifiers only; exact order/name list matches UI | No |
| 2026-07-13 | Trace | GraphQL introspection of `__type(name: "ModelDetail")` on port 29695 | Confirm schema capability | `ModelDetail` has no description field | No |
| 2026-07-13 | Code | Relevant unit/integration tests under `autobyteus-server-ts/tests/...claude-sdk-model-normalizer.test.ts`, `...claude-sdk-client.test.ts`, `...claude-model-catalog.integration.test.ts`, and frontend config tests | Identify current coverage authority | Tests cover identifiers and thinking metadata but not description preservation/API/UI/search | Coverage additions needed downstream |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: `RuntimeModelConfigFields.vue` or another existing `useRuntimeScopedModelSelection` consumer opens `SearchableGroupedSelect.vue`.
- Current execution flow:
  1. UI runtime changes to `claude_agent_sdk`.
  2. `useRuntimeScopedModelSelection.ensureModelsForRuntime()` calls `llmProviderConfig.fetchProvidersWithModels()`.
  3. Frontend GraphQL query requests `availableLlmProvidersWithModels(runtimeKind)`.
  4. `LlmProviderResolver.availableLlmProvidersWithModels()` delegates to `LlmProviderService.listProvidersWithModels()` with `mapLlmModel`.
  5. `ModelCatalogService` delegates Claude rows to `ClaudeModelCatalog` and `ClaudeSdkClient.listModels()`.
  6. `ClaudeSdkClient` calls the SDK query control's `supportedModels()`.
  7. `normalizeModelDescriptors()` drops `description`; downstream DTOs cannot carry it.
  8. Frontend maps the remaining display name into one-line `SelectItem.name`; selector renders only that.
- Ownership or boundary observations:
  - `ClaudeSdkClient`/normalizer correctly owns adaptation of vendor model descriptors.
  - `ModelInfo` is the established shared catalog record.
  - GraphQL `ModelDetail` correctly owns the external API projection.
  - `useRuntimeScopedModelSelection` correctly owns model-option projection for runtime surfaces.
  - `SearchableGroupedSelect` correctly owns generic option rendering/filtering.
  - No ownership bypass or duplicate Claude discovery policy was found.
- Current behavior summary: AutoByteus receives live descriptive metadata from the SDK but discards it at the first adapter, and every downstream contract is incapable of representing it.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Bug Fix / Behavior Change`
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): `Missing Invariant`
- Refactor posture evidence summary: Existing owners and dependency direction are healthy. The change should extend the established shared record and mapping path rather than introduce new services or Claude-specific frontend policy. No architecture refactor is indicated.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| SDK `sdk.d.ts` + live probe | Description is first-party discovery metadata beside display name | Adapter should preserve it; no curated metadata subsystem needed | Add optional description mapping |
| Claude normalizer | Field is dropped immediately | Missing preservation invariant is the direct root cause | Focused adapter test |
| Shared `ModelInfo` and GraphQL `ModelDetail` | Neither can express description | Add one semantically singular optional field through existing boundary | API contract test/codegen |
| Runtime-scoped frontend composable | One projection serves all affected launch/config surfaces | Extend once, avoid per-screen fixes | Shared projection test |
| Shared grouped selector | Generic item/render/search is the correct UI owner | Add optional generic description, not Claude branches | Component UI/search tests |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts` | First-party SDK client and model discovery | Already calls `supportedModels()` | Reuse unchanged unless typing can be tightened |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-model-normalizer.ts` | Vendor descriptor normalization to shared catalog model | Drops SDK `description` | Must normalize/merge/map optional description |
| `autobyteus-ts/src/llm/models.ts` | Shared model catalog record and model representation | `ModelInfo` lacks description | Extend `ModelInfo`; avoid making it a second identity |
| `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts` | GraphQL model schema/projection | `ModelDetail`/`mapLlmModel` omit description | Add nullable field and mapping |
| `autobyteus-web/graphql/queries/llm_provider_queries.ts` | Frontend catalog query | Does not request description | Request new field for LLM models |
| `autobyteus-web/generated/graphql.ts` | Tracked generated GraphQL types/hooks | `ModelDetail`/operation omit description | Regenerate/synchronize via established codegen |
| `autobyteus-web/stores/llmProviderConfig.ts` | Frontend provider/model catalog state | Handwritten `ModelInfo` lacks description | Add optional nullable description |
| `autobyteus-web/composables/useRuntimeScopedModelSelection.ts` | Runtime model catalog caching and UI option projection | Drops all data except id/name/selected label | Pass description to `SelectItem` |
| `autobyteus-web/components/agentTeams/SearchableGroupedSelect.vue` | Generic grouped popover, filtering, selection | Single truncated line; search lacks description | Render optional wrapped secondary line and search it |
| Shared runtime selection consumers | Agent/team/mobile/application/member/messaging selection | All reuse the composable/selector path | One shared change covers all; verify proportional regression scope |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-07-13 | Probe | SDK `query` with `maxTurns: 0`, `permissionMode: "plan"`, `settingSources: ["user"]`, installed Claude path, and CLI-auth environment; then `supportedModels()` | Raw rows included descriptions: `Default`/`Sonnet`: `Sonnet 5 · Efficient for routine tasks`; `Opus`: `Opus 4.8 · Best for everyday, complex tasks · ~2× usage vs Sonnet`; `Haiku`: `Haiku 4.5 · Fastest for quick answers` | Product can use supported first-party dynamic metadata now; no AI/model turn or hard-coded lookup required |
| 2026-07-13 | Probe | `new ClaudeSdkClient().listModels()` using current built server output | Mapped rows contain display names and thinking schemas but no description | Confirms loss inside AutoByteus, not upstream |
| 2026-07-13 | Repro | Live packaged GraphQL catalog query on `127.0.0.1:29695` | Response models: `default`, `haiku`, `opus`, `sonnet`; names only | Confirms the screenshot against running product |
| 2026-07-13 | Trace | GraphQL `ModelDetail` introspection | No `description` field | Frontend cannot recover description without API change |

### Exact CLI-auth Probe Result

```json
[
  {
    "value": "default",
    "resolvedModel": "claude-sonnet-5",
    "displayName": "Default (recommended)",
    "description": "Sonnet 5 · Efficient for routine tasks"
  },
  {
    "value": "sonnet",
    "resolvedModel": "claude-sonnet-5",
    "displayName": "Sonnet",
    "description": "Sonnet 5 · Efficient for routine tasks"
  },
  {
    "value": "opus",
    "resolvedModel": "claude-opus-4-8",
    "displayName": "Opus",
    "description": "Opus 4.8 · Best for everyday, complex tasks · ~2× usage vs Sonnet"
  },
  {
    "value": "haiku",
    "resolvedModel": "claude-haiku-4-5-20251001",
    "displayName": "Haiku",
    "description": "Haiku 4.5 · Fastest for quick answers"
  }
]
```

The probe also returned capability flags omitted above for focus. The full descriptions were captured before AutoByteus normalization.

## External / Public Source Findings

- Public API / spec / issue / upstream source: Installed first-party `@anthropic-ai/claude-agent-sdk` `sdk.d.ts` package contract; no web source was required.
- Version / tag / commit / freshness: Locked dependency `0.2.71`; inspected and probed on 2026-07-13 with Claude Code `2.1.207`.
- Relevant contract, behavior, or constraint learned: `supportedModels()` returns `ModelInfo[]`; each upstream `ModelInfo` contains `value`, `displayName`, and `description`. Descriptions are runtime/auth-context dependent.
- Why it matters: AutoByteus can and should surface live supported metadata rather than own a stale model-description table.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Running packaged AutoByteus server on port `29695` for read-only GraphQL reproduction; installed Claude executable for zero-turn SDK discovery.
- Required config, feature flags, env vars, or accounts: AutoByteus CLI-auth policy was reproduced by removing API-key environment variables from the child environment; no credential values were printed or recorded.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Git remote refresh/worktree creation only. Probe scripts were temporary files under `/tmp` and were deleted immediately.
- Cleanup notes for temporary investigation-only setup: Both `/tmp` probe scripts were deleted. No server was started/stopped, no model turn was executed, and the running packaged app was not modified.

## Findings From Code / Docs / Data / Logs

### Root cause

The defect is a deterministic loss-of-information chain:

```text
Claude SDK supportedModels() row
  { value, displayName, description, capability flags }
-> normalizeModelDescriptors()
  { identifier, displayName, capability flags }       # description dropped here
-> autobyteus-ts ModelInfo                              # no description property
-> GraphQL ModelDetail                                  # no description field
-> frontend ModelInfo                                   # no description property
-> SelectItem { id, name, selectedLabel }              # no description property
-> one-line dropdown row
```

### Why Codex appears descriptive

`codex-app-server-model-normalizer.ts` constructs `display_name` as `${displayName} (default reasoning: ${effort})`. The current selector then displays that single name string. This path does not transport separate semantic descriptions and does not help Claude because Claude's description remains a separate upstream property.

### Authoritative source decision

Use the description returned by `supportedModels()` for the current runtime/auth environment. Do not copy the strings from the screenshot or probe into product source. The same installed executable returned different default/resolved descriptions when run under a different auth environment, proving that hard-coding would become stale or inaccurate.

### UI ownership decision input

The shared `SearchableGroupedSelect` is used beyond model selection, so description must be an optional generic item property. `useRuntimeScopedModelSelection` is the correct model-specific projection point. This avoids Claude-only branches in the component and automatically covers existing agent, team, mobile, override, application, and messaging model-selection surfaces.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject, location, representative shape, and approximate volume: Launch/run configuration stores `runtimeKind`, `llmModelIdentifier`, and optional `llmConfig` across agent/team/application/messaging contexts. Catalog display metadata is not persisted. Volume is irrelevant because no rows require rewrite.
- Relevant code-model, serialization, semantic, or physical-store change: Add optional transient/catalog description metadata only; selected identifier semantics do not change.
- Normal readers and writers, including unknown/extra-field behavior: Existing writers continue writing the same identifier/config. Catalog description is loaded through GraphQL and UI state only.
- Representative direct-read or compatibility evidence: Existing UI/config code resolves current selections by `modelIdentifier`; description is not used in identity lookup or launch payloads.
- Required semantics and invariants preserved by direct use: `Yes` — identifiers remain exactly `default`, `sonnet`, `opus`, `haiku`, etc.; descriptions do not enter persisted config.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints: None. Vendor descriptions are plain catalog text.
- Concrete benefit, cost, and risk of migration if it remains a candidate: No migration benefit; rewriting configs would add risk and incorrectly persist dynamic metadata.
- Existing migration framework or lifecycle constraints, only if migration may be required: Not applicable.
- Decision: `Directly Usable — No Migration`.

## Constraints / Dependencies / Compatibility Facts

- Executable model identifiers must remain compatible with Claude Agent SDK query options.
- Display name, description, and identifier are separate semantics; do not concatenate description into identifier/canonical name.
- `description` must be nullable/optional for non-Claude and future incomplete catalog rows.
- GraphQL client code generation is part of contract synchronization.
- Vue interpolation must render description as plain text.
- No backward-compatibility wrapper or dual catalog path is required: this is an additive nullable metadata field and current configs already remain valid.

## Open Unknowns / Risks

- No blocking unknowns remain.
- Vendor text may contain prices, usage multipliers, longer context labels, or future wording. The UI must wrap and avoid product-owned interpretation.
- A full selector keyboard/listbox accessibility overhaul is out of scope; description association must not worsen the current behavior.
- The downstream API/E2E engineer should decide whether browser validation is necessary in addition to durable component/GraphQL coverage after implementation.

## Notes For Architecture Reviewer

Requirements and UI/UX specification were approved by the user on 2026-07-13. Expected design posture: extend the existing catalog/GraphQL/UI spine with a single optional description field, add no new subsystem, do no persistence migration, and avoid hard-coded Claude copy.

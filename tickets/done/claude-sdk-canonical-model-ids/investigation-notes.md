# Investigation Notes

## Investigation Meta

- Package identifier: `claude-sdk-canonical-model-ids`
- Request / ticket: Show canonical Claude model IDs (not "Default (recommended)", "Fable", …) in the Claude Agent SDK model dropdown
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-canonical-model-ids`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-canonical-model-ids` / `codex/claude-sdk-canonical-model-ids`
- Resolved base remote / branch / revision: `origin/personal` @ `9267d11c8e82f9798b3870362b221edf39d3d7df` (fetched 2026-09-24)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: Worktree created from freshly fetched `origin/personal`.
- Bootstrap blocker: None
- Current solution revision ID: `SR-003`
- Investigation status: Requirements and architecture investigation complete.

## Initial Request And Clarifications

- Original request (2026-09-24): "we support claude agent sdk, on the frontend … when i select claude agent sdk, the model list shows default, fable etc. … its better to show the canonical model id itself there … when show the default fable etc. they dont know the exact model id … please analyse"
- Reference screenshots: team run config, runtime `Claude Agent SDK`, dropdown `ANTHROPIC` group shows `Default (recommended)`, `Fable`, `Haiku`, `Opus (1M context)`, `Sonnet` with descriptions (e.g. "Opus 5.5 with 1M context · Best for everyday, complex tasks"); selected field shows `Anthropic / Default (recommended)`.
- Clarifications received: none yet.
- Initial ambiguity: whether "show the canonical ID" means only the **label** (still running the alias) or also **selecting/pinning** the canonical model (what is saved and sent to Claude). See DEC-001.

## Source Log

| Date | Source Type | Exact Source / Command | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-09-24 | Code | `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts` `listModels()` / `tryGetSupportedModelsFromQueryControl()` | Where the Claude model list originates | Catalog = Claude SDK `query(...).supportedModels()` probe (zero-turn, `settingSources: ["user"]`), mapped via `toModelInfo` | — |
| 2026-09-24 | Code | `.../claude/client/claude-sdk-model-normalizer.ts` `toModelInfo` / `normalizeModelDescriptors` | How rows become catalog entries | `model_identifier = value = canonical_name = row.value` (alias such as `default`); `display_name = row.displayName`; `description = row.description`; `row.resolvedModel` is parsed into the descriptor but **not exposed** in `ModelInfo` | Architecture: expose resolved id |
| 2026-09-24 | Contract | `@anthropic-ai/claude-agent-sdk@0.3.231` `sdk.d.ts` `ModelInfo` | SDK contract | `value` = id used in API calls; `resolvedModel?` = "Canonical wire model id this row's `value` resolves to (e.g. 'sonnet' → 'claude-sonnet-5'). Lets hosts match a persisted explicit id against the alias row that covers it." `resolvedModel` is optional | — |
| 2026-09-24 | Runtime | Node probe: `query({prompt, options:{maxTurns:0, settingSources:["user"], pathToClaudeCodeExecutable:"/Users/normy/.local/bin/claude"}}).supportedModels()` (Claude Code 2.1.281, the CLI the app resolves) | Real rows on the user's machine | `default`→`claude-opus-5-5[1m]`; `opus[1m]`→`claude-opus-5-5[1m]`; `claude-fable-5[1m]`→`claude-fable-5`; `sonnet`→`claude-sonnet-5`; `haiku`→`claude-haiku-4-5-20251001` | — |
| 2026-09-24 | Runtime | Same probe using the SDK-bundled CLI (no `pathToClaudeCodeExecutable`) | Is alias resolution stable? | `default`/`opus[1m]` → `claude-opus-5[1m]` (not 5.5); one run returned `claude-fable-5-1[1m]`→`claude-fable-5-1`, another `claude-fable-5[1m]`→`claude-fable-5` | Aliases drift by CLI version/account/rollout |
| 2026-09-24 | Code | `.../claude/client/claude-sdk-selected-model-binding.ts`, `agent-execution/backends/claude/session/claude-selected-model-turn-binding.ts`, `claude-session-token-usage.ts` | What actually runs | Selected alias is sent to Claude; per turn the server re-resolves alias→`resolvedModel` (`selectedResolvedRawModelId`) for token-usage attribution only | Resolution at run time may differ from what the picker showed |
| 2026-09-24 | Code | `.../claude/client/claude-sdk-context-capacity.ts` | Context capacity lookup | Capacity keyed by `row.value`, validated against `resolvedModel` via `getContextUsage().model` | Must keep working with whichever value is stored |
| 2026-09-24 | Code | `autobyteus-web/utils/modelSelectionLabel.ts` (commit `87d99ddc6` "use model identifiers for autobyteus runtime dropdowns") | Frontend label rule | Only the AutoByteus runtime shows `modelIdentifier`; all other runtimes (incl. Claude Agent SDK) show `name` (= SDK `displayName`). Selected label = `"<Provider> / <label>"` | Precedent: identifier labels already chosen for AutoByteus runtime |
| 2026-09-24 | Code | `autobyteus-server-ts/src/api/graphql/types/llm-provider-model-catalog.ts` `ModelDetail`; `autobyteus-web/graphql/queries/llm_provider_queries.ts` | Transport contract | Fields: `modelIdentifier name description value canonicalName …`; no resolved-model field today | Architecture: add field or reuse `canonicalName` |
| 2026-09-24 | User | Screenshots | Current UX | Five rows; `Default (recommended)` and `Opus (1M context)` resolve to the same model; exact id appears nowhere | — |

## Relevant Existing Behavior

| Behavior ID | Kind | Trigger | Current Behavior | Outcome / Invariants | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Choose runtime `Claude Agent SDK` in agent/team run config, open model dropdown | Rows labeled with SDK `displayName` (`Default (recommended)`, `Fable`, `Haiku`, `Opus (1M context)`, `Sonnet`) + description text | Exact model id never visible | Screenshot, `modelSelectionLabel.ts` | High |
| BEH-002 | User | Model selected | Collapsed field shows `Anthropic / <displayName>` | Same | Screenshot | High |
| BEH-003 | System | Save/launch run | Stored and sent value is the SDK `value` (alias like `default`, `sonnet`, or explicit id like `claude-fable-5[1m]`) | Alias floats: `default` can resolve to a different model later or on another CLI | Normalizer, probes | High |
| BEH-004 | System | Each Claude turn | Server resolves alias→`resolvedModel` for token accounting | Resolved id is internal only | turn binding code | High |
| BEH-005 | User | Other runtimes | AutoByteus runtime shows identifiers; Codex shows its display names | Must not regress | `modelSelectionLabel.ts` | High |

## Key Findings

1. The exact model id is already available — the SDK returns `resolvedModel` on every row we observed — but the server drops it.
2. Aliases are not stable: `default` resolved to `claude-opus-5[1m]` with the SDK-bundled CLI and `claude-opus-5-5[1m]` with the installed CLI 2.1.281. Fable resolved to `claude-fable-5` or `claude-fable-5-1` across probes.
3. Two rows can resolve to the same canonical id (`default` and `opus[1m]` → `claude-opus-5-5[1m]`). Showing only the canonical id as label produces duplicate-looking rows.
4. `resolvedModel` is not always "the same as value minus alias": for Fable, `value` = `claude-fable-5[1m]` but `resolvedModel` = `claude-fable-5` (the `[1m]` suffix is dropped). For Opus, `[1m]` is kept. So `resolvedModel` is not safely a drop-in replacement for the value we *send* (it could silently lose the 1M-context mode for Fable).
5. `resolvedModel` is optional in the SDK contract — a fallback is needed when absent.

## Unknowns

- Whether the Claude SDK accepts every `resolvedModel` string verbatim as `options.model` (e.g. `claude-opus-5-5[1m]`) — only relevant if DEC-001 = Option B. The SDK already lists explicit ids like `claude-fable-5[1m]` as `value`, so explicit ids are accepted in general.
- Behavior of previously saved runs/definitions if the stored value changes from alias to explicit id (Option B only).

## Architecture-Level Investigation (after approval, 2026-09-24)

| Date | Source Type | Exact Source | Relevant Finding | Design Implication |
| --- | --- | --- | --- | --- |
| 2026-09-24 | Code | `autobyteus-server-ts/src/llm-management/services/run-model-selection-service.ts:41,46,94,115` | Save/launch validation and capacity replacements look up `row.model_identifier === selection.llmModelIdentifier` exactly | Catalog must keep `default` as an identifier; merge only in picker |
| 2026-09-24 | Code | `application-platform/launch-configuration/application-launch-host-capability-validator.ts:121-130` | Application launch validation also exact-matches catalog identifiers (`MODEL_UNAVAILABLE`) | Same |
| 2026-09-24 | Code | `llm-management/services/model-availability-service.ts:114-144` | Exact identifier registration checks | Same |
| 2026-09-24 | Code | `llm-management/services/model-catalog-service.ts:199-203, 370-380` | Claude catalog listed fresh per call via `ClaudeModelCatalog`, grouped by `provider_id`; no cache/persistence | No cache invalidation concern |
| 2026-09-24 | Code | `api/graphql/types/llm-provider-model-catalog.ts:34-52, 76-96, 124-137` | `ModelDetail` fields; `mapLlm`; `ModelInfoWithMetadata` pattern for server-local extras; models sorted by `name` | Add nullable `selectionPresentation`; reuse `canonicalName` |
| 2026-09-24 | Code | `autobyteus-ts/package.json` exports `./dist/*` | Server consumes the built library | Keep new hint server-local, don't change `autobyteus-ts` `ModelInfo` |
| 2026-09-24 | Code | grep `canonical_name\|canonicalName` across server/web/ts | Readers: pricing (`LLMFactory` registry, not runtime catalogs), `ModelMetadataProvisioningService.enrichBestEffort` (no production caller), web `canonicalModels()` (no caller), unused `agentInput/GroupedSelect.vue` | Changing Claude `canonical_name` to `resolvedModel` is safe |
| 2026-09-24 | Code | `autobyteus-web/composables/useRuntimeScopedModelSelection.ts:238-254`; `composables/messaging-binding-flow/launch-preset-model-selection.ts:137-151` | Two duplicated provider-group → option builders | Extract one builder |
| 2026-09-24 | Code | `autobyteus-web/components/agentTeams/SearchableGroupedSelect.vue:54-75, 177-205, 223-229` | Selection matching `item.id === modelValue`; search over name/id/selectedLabel/description; `selectItem` always emits | Alias-aware matcher, badge, no-emit on re-select |
| 2026-09-24 | Code | `autobyteus-web/components/launch-config/RuntimeModelConfigFields.vue:193-201, 237-262` | Replacement filter `ids.has(item.id)`; raw "Saved / selected model" row; `hasModelIdentifier` validation | Filter via matcher; `hasModelIdentifier` unchanged (catalog keeps aliases) |
| 2026-09-24 | Code | `components/workspace/config/AgentOrgRunConfigPanel.vue:180,238`; `stores/agentOrgRunConfigStore.ts:61-72` | New config model seeded from definition `defaultLaunchConfig`; no auto pre-selection | Evidence correction for BEH-006/REQ-010 (SR-003) |
| 2026-09-24 | Code | `components/settings/providerApiKey/ProviderModelSectionGroup.vue:35`, `components/settings/useMediaDefaultModelsCard.ts:75` | Label helper used with AutoByteus/media runtimes only | Unaffected |
| 2026-09-24 | Code | `autobyteus-web/localization/messages/{en,zh-CN}/agentTeams.generated.ts` | `SearchableGroupedSelect` strings live here | Add `recommended` key |

## Supplement Inventory

| Artifact | Purpose | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- |
| `dropdown-preview.md` | Picker preview | REQ-001..010 | Current | Approved SR-002; §2 pre-selection note corrected SR-003 (intent unchanged) |
| `design-spec.md` | Technical design | all | Ready | N/A (design) |

# Investigation Notes

## Investigation Meta

- Package identifier: `claude-anthropic-effort-control` (Project Task `autobyteus-8`)
- Request / ticket: missing thinking-effort control for Claude Opus 5.5 on the AutoByteus runtime
- Workspace root: `/home/autobyteus/workspace/.codex/worktrees/claude-anthropic-effort-control`
- Repository mode: `Git`
- Task worktree / branch: `/home/autobyteus/workspace/.codex/worktrees/claude-anthropic-effort-control` / `codex/claude-anthropic-effort-control`
- Resolved base remote / branch / revision: `origin/personal` @ `e82d03b0f9c69fcb7e18eac2ca7d65e55d7c971d` (fetched 2026-10-29)
- Finalization target remote / branch: `origin` / `personal` (RELEASE.md)
- Bootstrap result: worktree created; first `git worktree add` timed out at 30 s and was cleaned (`worktree prune`, branch deleted) and re-run successfully in the background; dependencies installed with `corepack pnpm install --frozen-lockfile --prefer-offline` (pnpm is only available through corepack in this environment).
- Bootstrap blocker: None
- Current solution revision ID: `SR-001`
- Authorities read (requirements gate, 2026-10-29): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`, `references/handoff.md`. Architecture gate (2026-10-29): `references/architecture-design.md`, `references/design-principles.md`, project `DESIGN.md`, `autobyteus-server-ts/docs/design/data_migration_guideline.md` §2.
- Investigation status: Complete

## Initial Request And Clarifications

- Original request: Task `autobyteus-8` (see requirements doc); user: "it does not support thinking effort for opus 5.5 … I think it could be a bug from our implementation."
- Clarifications received (user, this conversation, 2026-10-29):
  - "It's not just for opus … sonnet also supports efforts … Whatever the model supports, we should support."
  - "We can remove all models below 5 … they are obsolete … remove them now."
  - Approval: "Yeah, since you already did the investigation, go ahead. Then I think the requirement is quite clear."
  - The user supplied an Anthropic key through a placeholder file that was imported into the test vault and then deleted.
- Initial ambiguity: which models, defaults, UI shape (Task left these to the team).

## Product And Domain Understanding

- Product area: AutoByteus runtime LLM catalog (autobyteus-ts), Anthropic adapter, web thinking controls (composer thinking menu, run-settings Thinking row, Agent Configuration form).
- Terminology: *effort* = Anthropic `output_config.effort` (low/medium/high/xhigh/max), stored in our configs as `reasoning_effort` (already the key used for effort by OpenAI/Kimi/GLM/Grok rows and by the Claude Agent SDK runtime's Claude schema). *Thinking switch* = `thinking_enabled`. *Off shape* = what the adapter sends when the switch is off.

## Source Log

| ID | Date | Type | Source | Why | Finding |
| --- | --- | --- | --- | --- | --- |
| SRC-001 | 2026-10-29 | Web | https://platform.claude.com/docs/en/build-with-claude/effort | Effort contract | `output_config.effort`, no beta header. Levels: max on all catalog Claude models; xhigh on Fable 5.1/5, Opus 5.5/5/4.8/4.7, Sonnet 5.5/5, Haiku 5.5 (not Sonnet 4.6). Default high, except Opus 5.5 and Haiku 5.5 = medium. Setting the default equals omitting it. Effort affects all output tokens, with or without thinking. Changing top-level effort restarts the prompt cache. |
| SRC-002 | 2026-10-29 | Code | `autobyteus-ts/src/llm/anthropic-supported-model-definitions.ts` (origin/personal) | Catalog | `claudeOpus55Schema` = `thinking_display` only (L44-53); `claudeAdaptiveThinkingSchema` = `thinking_enabled` + `thinking_display` (L27-42); `claudeSonnet55Schema` (L55-71); `claudeSchema` budget mode only for Sonnet 4.6 (L9-25, L196); `claude-fable-5-1` has no `configSchema` (L76-82). No effort parameter anywhere. |
| SRC-003 | 2026-10-29 | Code | same file, rows | Catalog rows | Rows: fable-5-1, fable-5, opus-5, opus-5-5, opus-4.8, opus-4.7, sonnet-5-5, sonnet-5, sonnet-4.6, haiku-5-5. |
| SRC-004 | 2026-10-29 | Code | `autobyteus-ts/src/llm/api/anthropic-llm.ts` | Request shaping | Internal keys `thinking_enabled`, `thinking_budget_tokens`, `thinking_display` (L72-79); other config extra params are forwarded raw (L107-111, L203); `validateStrictRequestRules` (L118-139); `buildThinkingFromToggle` per policy (L171-191), `legacy_budget` builds `{type:'enabled', budget_tokens}` (L184-189); `applyAnthropicRequestParams` (L193-239) strips sampling for non-legacy and sets `temperature: 0` for legacy (L229-238). Never sets `output_config`. |
| SRC-005 | 2026-10-29 | Code | `autobyteus-ts/src/llm/api/anthropic-model-request-policy.ts` | Per-model policy | `ANTHROPIC_MODEL_REQUEST_POLICIES` (L34-45): opus-5-5 `adaptive_required`; sonnet-5-5 `adaptive('between_tools', true)`; haiku-5-5 and sonnet-5 `adaptive('disabled')`; opus-5, opus-4-8, opus-4-7, fable-5, fable-5-1 `adaptive('omit')`; sonnet-4-6 `LEGACY_BUDGET_POLICY`. Unknown value falls back to legacy (L51-54) "only non-catalog test fixtures". `AnthropicLLM` is the only consumer (L3). |
| SRC-006 | 2026-10-29 | Code | `autobyteus-web/components/run-settings/RunSettingsCard.vue` L62-67, `useRunSettingsPresentation` → `buildChatThinkingMenu` | Why "Not available" | Thinking row shows `runSettings.thinking.unavailable` when the menu is `hidden`. |
| SRC-007 | 2026-10-29 | Code | `autobyteus-web/utils/llmThinkingConfigAdapter.ts` | Thinking semantics | `detectThinkingProvider` (claude iff `thinking_enabled`; openai iff `reasoning_effort`/`reasoning_summary`); `PROVIDER_KEYS.claude = [thinking_enabled, thinking_budget_tokens, thinking_display, reasoning_effort]` (L20-25); `DEPENDENT_KEYS.claude = [reasoning_effort, thinking_budget_tokens, thinking_display]` (L307-310); `applyThinkingToggle` claude writes budget default (L246-254); `getDefaultThinkingConfig` drops budget unless on (L375-385). |
| SRC-008 | 2026-10-29 | Web | https://platform.claude.com/docs/en/build-with-claude/thinking | Thinking × effort table | Opus 5.5, Fable 5.1, Fable 5: disabled/between_tools → 400 (thinking cannot be off). Sonnet 5.5: `between_tools` only at ≤ high effort. Haiku 5.5 and Opus 5: `disabled` only at ≤ high. Sonnet 5: `disabled` → "Thinking off" (no qualifier). Opus 4.8/4.7, Sonnet 4.6: no field = thinking off. |
| SRC-009 | 2026-10-29 | Code | `autobyteus-web/components/chat/chatThinkingMenu.ts` L90-121 | Menu | Merged menu for switch schemas; if effort is a dependent key the primary list is `Off · levels`, picking a level turns thinking on. Schemas without a switch use the per-parameter menu (L123-139); hidden when no thinking keys (L147). |
| SRC-010 | 2026-10-29 | Code | `autobyteus-web/utils/runSettings/modelOptions.ts` | Why "Thinking display" is a separate row | Non-thinking enum/boolean keys become "other model setting" rows; for Opus 5.5 `thinking_display` is not a thinking key because no provider is detected, so it renders as its own row and the Thinking row is hidden. |
| SRC-011 | 2026-10-29 | Code | `autobyteus-server-ts/src/llm-management/services/model-config-schema-validation.ts` L115-140 | Config validation | Server validates `llmConfig` strictly against the model's schema (unknown key → "Setting is not supported…"; schema null → only null config valid). Schema additions flow automatically from autobyteus-ts. |
| SRC-012 | 2026-10-29 | Code | `rg "claude-opus-4[-.]8|claude-opus-4[-.]7|claude-sonnet-4[-.]6"` outside tickets | Removal surface | Production source: only the catalog and policy files. Tests/docs: autobyteus-ts docs (`provider_model_catalogs.md`, `llm_module_design*.md`), ts tests (anthropic-llm, image, live handler, factory metadata, metadata resolver, summary output limit, policy, supported-model-definitions), `test-support/live-e2e/live-e2e-scenarios.mjs` (L94-100), server tests (pricing provider L47, token-usage e2e, claude event converter), web tests (`ModelConfigSection.spec.ts`, `chatDraftStore.spec.ts`). |
| SRC-013 | 2026-10-29 | Code | `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-model-normalizer.ts` L39-68; `.../backends/claude/session/claude-session-config.ts` L34-46 | Claude SDK runtime | SDK schema = `thinking_enabled` (when adaptive) + `reasoning_effort` (levels from SDK); backend sends `thinking` and `effort` independently. Shares the web 'claude' presentation. |
| SRC-014 | 2026-10-29 | Code | `rg budget_tokens/thinking_budget` | Dead code after Sonnet 4.6 removal | Only users: anthropic-llm (budget building, internal key, strict rule), policy `legacy_budget`, web adapter claude budget handling, `autobyteus-web/utils/llmConfigSchema.ts` L304-306 (budget default on reset), docs (`autobyteus-web/docs/settings.md` L1743, `chat.md` thinking section), tests. No other catalog row or runtime schema declares `thinking_budget_tokens`. |
| SRC-015 | 2026-10-29 | Ticket | `tickets/done/claude-sonnet-haiku-5-5-model-support/requirements-doc.md` L51; `tickets/done/astra-fable-pricing-support/design-spec.md` L54 | History | Effort was an explicit non-goal; Fable 5.1 schema intentionally empty ("always-on thinking"). |
| SRC-016 | 2026-10-29 | Ticket | `tickets/done/remove-deprecated-deepseek-kimi-models/requirements.md` | Removal precedent | Prior model removals were clean cuts (no alias/migration); AC: no references outside archived tickets. |
| SRC-017 | 2026-10-29 | Code | `autobyteus-web/components/run-settings/RunSettingsCard.vue` L58-60; `autobyteus-ts/src/llm/current-model-selection-error.ts`; server `application-current-model-selection-guard.ts` | Removed-model handling | Existing "model unavailable for runtime" UI state and `CurrentModelSelectionRequiredError` path cover saved configs naming a model that is no longer listed. |
| SRC-018 | 2026-10-29 | Code | `autobyteus-server-ts/src/token-usage/pricing/token-price-config-provider.ts` L147-160 | Pricing | Prices resolved from the catalog at observation time and captured on the usage row; removing rows only affects new observations. |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Trigger | Current Path | Current Outcome | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Open Thinking on Opus 5.5 run | catalog schema → server GraphQL `configSchema` → web `buildChatThinkingMenu` → hidden | "Not available"; display as separate row | SRC-002, SRC-006, SRC-010 | High (read) |
| BEH-002 | User | Thinking on other Claude rows | schema with switch → merged menu Off · On + display | no effort | SRC-002, SRC-009 | High |
| BEH-003 | System | Run turn | `AnthropicLLM.buildRequestParams` → `applyAnthropicRequestParams` | no `output_config` | SRC-004 | High |
| BEH-005 | Operational | Model list | catalog rows | gen-4 rows listed | SRC-003 | High |
| BEH-006 | User | Claude SDK runtime thinking | SDK schema → merged Off · levels | effort coupled to switch in UI only | SRC-013, SRC-009 | High |

## Relevant Codebase And Technical Facts

| Path | Current Responsibility | Implication |
| --- | --- | --- |
| `anthropic-supported-model-definitions.ts` | Catalog rows + schemas | Add effort to every Claude schema; remove gen-4 rows and `claudeSchema` |
| `anthropic-model-request-policy.ts` | Per-model request facts | Natural home for per-model thinking facts; remove legacy mode |
| `anthropic-llm.ts` | Request shaping | Map `reasoning_effort` → `output_config.effort`; enforce xhigh/max rule; remove legacy budget path |
| `llmThinkingConfigAdapter.ts` / `chatThinkingMenu.ts` | Web thinking semantics/presentation | Make effort independent for claude; xhigh/max rule; remove budget handling |
| server schema validation | Generic | No change |

## Structural And Payload Surface Inventory

- Payload: catalog rows/schemas (autobyteus-ts), docs, tests.
- Structural: Anthropic adapter request shaping (one file), request policy (one file), web adapter + menu builder (two files). No API, persistence, route or ownership change.
- Potential structural impacts: API contract — none (schema JSON is data); persistence — none (tolerant readers); security/concurrency/deployment — none.

## Runtime, Probe, Or Reproduction Findings

All probes ran on the real Anthropic API through the current (unchanged) `AnthropicLLM` adapter by passing `output_config` as a forwarded config extra param (SRC-004 L203), from a throw-away script `/tmp/effort-probe/probe.mjs` (deleted) with `AUTOBYTEUS_TEST_VAULT=/root/.autobyteus-test/vault`. Prompt: rook-derangement count (answer 14833).

| ID | Method | Scenario | Observation | Established |
| --- | --- | --- | --- | --- |
| PRB-001 | `node probe.mjs opus` | Opus 5.5, effort unset/low/medium/high/xhigh/max | All accepted; output tokens 65 / 18 / 22 / 22 / 23 / 171 (thinking 61 / 14 / 18 / 18 / 19 / 165) | Measured |
| PRB-002 | `node probe.mjs neg` | Sonnet 5.5 `thinking_enabled:false` (between_tools) + xhigh | 400 `output_config.effort 'xhigh' is not supported when thinking is disabled on this model. Use effort 'high' or below, or enable thinking.` | Reproduced |
| PRB-002 | same | Sonnet 5.5 thinking on + xhigh | OK (68 out tokens) | Measured |
| PRB-002 | same | Opus 5.5 effort `adaptive` | 400 `output_config.effort: Input should be 'low', 'medium', 'high', 'xhigh' or 'max'` | Reproduced |
| PRB-002 | same | Sonnet 4.6 budget thinking + effort medium | OK (429 out tokens) — moot after removal | Measured |

- Temporary diagnostics: None in the worktree; probe script lived in `/tmp` and was deleted. Two untracked `dist/` folders produced by the `test-vault` build in the worktree were deleted. Note: a first `test-vault setup` attempt in the shared main checkout failed at its `autobyteus-ts` build (stale dependencies); its `clean-dist` + `tsc` regenerated `autobyteus-ts/dist` there from that checkout's own source; no tracked file changed.
- Reproduction for implementation: None as a committed test; AC-002/AC-004 unit tests are the failing-first starting point.

## Stakeholder And User Evidence

| Source | Need | Strength | Implication |
| --- | --- | --- | --- |
| User screenshot + Task | Effort for Opus 5.5 | Direct | REQ-001, REQ-006 |
| User conversation | All models, effort with thinking off where allowed, remove gen-4 | Direct | REQ-001, REQ-004, REQ-005, REQ-007 |

## External Contracts, Standards, And Dependencies

| Contract | Version | Constraint | Evidence |
| --- | --- | --- | --- |
| Anthropic Messages API | current docs 2026-10-29; `@anthropic-ai/sdk` 0.132.1 | `output_config.effort` enum; per-model levels/defaults; xhigh/max with disabled/between_tools rejected (Sonnet 5.5 measured; Haiku 5.5, Opus 5 documented) | SRC-001, SRC-008, PRB-001/002 |

## Persisted Data And State Facts

- Affected subjects: saved agent definitions / run configs (`llmModelIdentifier`, `llmConfig`), token-usage rows.
- Readers: server schema validation (SRC-011) validates on save/launch; web unavailable-model state (SRC-017).
- Required: data stays readable; no startup lockout.
- Acceptable: configs naming removed models need user re-selection; stale `thinking_budget_tokens` keys become unsupported settings for remaining models (only Sonnet 4.6 declared them, and that model is removed).
- Remaining gap: None.

## Product Design Request Context

- Product Design request in the current input: `Not stated`

## Supplemental Artifact Inventory

None.

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution | Status |
| --- | --- | --- | --- | --- |
| RSK-001 | Risk | Shared web presentation change also alters Claude Agent SDK runtime menus | Accepted (DEC-005); covered by web tests | Open |
| UNK-001 | Unknown | Levels on models not probed live | AC-009 live check | Open |

## Architecture Investigation Findings

- Production path (Opus 5.5 turn): web menu writes `llmConfig.reasoning_effort` → server validates against catalog schema (SRC-011) → run's `LLMConfig.extraParams` → `AnthropicLLM.buildRequestParams` (anthropic-llm.ts L285-305) → `applyAnthropicRequestParams` → `@anthropic-ai/sdk` messages create/stream.
- Today a stored `reasoning_effort` would be forwarded raw as a top-level param (not internal) — must become internal and mapped.
- `thinking_budget_tokens`, `legacy_budget`, `LEGACY_BUDGET_POLICY`, temperature-0 default, budget web handling become unreachable once Sonnet 4.6 goes (SRC-014).
- The policy fallback for non-catalog values exists only for test fixtures (SRC-005 L47-54).
- `anthropic-llm.ts` is 419 lines; adding effort while removing the legacy path keeps it under 500.

## Requirement Implications

- Effort is supported by every catalog Claude model → REQ-001.
- Effort works without thinking, but xhigh/max conflict with thinking off on several models → REQ-004/REQ-005 uniform rule.

## Notes For Architecture Design

- Map SCN-001..SCN-004. Keep the key `reasoning_effort` (one name for effort across providers/runtimes). Per-model levels/defaults belong in the catalog schema (the existing per-model owner of exposed settings); request shaping stays in `AnthropicLLM`.

# Investigation Notes

## Investigation Meta

- Package identifier: `claude-sonnet-haiku-5-5-model-support`
- Request / ticket: User request (screenshot of Claude Opus 5.5 / Sonnet 5.5 / Haiku 5.5): "we need to support two more models from claude in autobyteus-ts"
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-5-5-model-support`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-5-5-model-support` / `codex/claude-5-5-model-support`
- Resolved base remote / branch / revision: `origin/personal` @ `ff227eb72` (fast-forwarded at user request: `927796780` → `ca8569449` → `ff227eb72`; branch has no local commits)
- Finalization target remote / branch: `origin` / `personal`
- Bootstrap result: Success — dedicated worktree created from refreshed `origin/personal` (shared checkout is behind and dirty; not used). Re-based by fast-forward to `ca8569449` (42 upstream commits) at user request.
- Bootstrap blocker: None
- Current solution revision ID: `SR-006`
- Authorities read (requirements reading gate): `references/requirements-engineering.md` (read this session), requirements/investigation/solution-revision templates.
- Investigation status: Requirements-level investigation complete; architecture-level investigation pending approval.

## Initial Request And Clarifications

- Original request: support "two more models from claude" in `autobyteus-ts`; screenshot lists Claude Opus 5.5, Claude Sonnet 5.5, Claude Haiku 5.5.
- Finding: Claude Opus 5.5 (`claude-opus-5-5`) is already in the catalog (commit `704e2108e`). The two missing models are therefore **Claude Sonnet 5.5** and **Claude Haiku 5.5**.
- Clarifications received: none yet (see DEC-001..DEC-003 in requirements).

## Source Log

| Date | Type | Source | Why | Finding | Follow-up |
| --- | --- | --- | --- | --- | --- |
| session | Code | `autobyteus-ts/src/llm/anthropic-supported-model-definitions.ts` | Current Anthropic catalog | Rows: fable-5-1, fable-5, opus-5, opus-5-5, opus-4.8, opus-4.7, sonnet-5, sonnet-4.6. No sonnet-5-5 / haiku-5-5. | Add two rows |
| session | Code | `autobyteus-ts/src/llm/api/anthropic-llm.ts` `resolveAnthropicModelRequestPolicy` | Request shaping | Family matching is prefix-based (`modelValue.startsWith(family + '-')`). `claude-sonnet-5-5` would match family `claude-sonnet-5` → `supportsThinkingDisabled: true` → default schema value `thinking_enabled:false` sends `thinking:{type:'disabled'}`, which Sonnet 5.5 rejects with 400. `claude-haiku-5-5` matches no family → not adaptive → adapter injects `temperature: 0`, which Haiku 5.5 rejects with 400. | Policy must be explicit per model; catalog-only change is insufficient |
| session | Code | same file, `modelValue === 'claude-opus-5-5'` block | Precedent | Opus 5.5 has a hard-coded preflight: rejects disabled/manual thinking, sampling params, forced tool_choice; always sends adaptive. | Precedent for model-specific constraints |
| session | Code | `src/llm/supported-model-pricing.ts`, `src/llm/utils/llm-config.ts` (`inputTokenPricingTiers`), `autobyteus-server-ts/src/token-usage/pricing/token-cost-calculator.ts` `selectTier` | Haiku tiered price | Tiered pricing by gross input tokens is already supported end-to-end, including per-tier cache read/5m/1h write prices (used by Gemini 3.1 Pro, GPT-6 rows). | No pricing-engine change expected |
| session | Code | `src/llm/api/anthropic-token-usage-normalizer.ts` | Tier selection basis | Anthropic usage normalized with `base_excludes_cache`; server derives gross `accounting_input_tokens`. | Architecture to confirm gross includes cache read/write for the 100k tier boundary |
| session | Code | `src/llm/utils/provider-native-assistant-turn.ts`, `anthropic-assistant-turn-assembler.ts` | Thinking-block preservation | Native Anthropic assistant turns (incl. signed thinking) are preserved for tool continuation generically for Anthropic models, not only Opus 5.5. | Verify applies to new models |
| session | Code | `rg tool_choice autobyteus-ts/src` | Forced tool use | Anthropic adapter never sets `tool_choice` itself; only caller kwargs could. | Preflight guard only |
| session | Doc | `autobyteus-ts/docs/provider_model_catalogs.md`, `docs/llm_module_design*.md` | Docs to sync | Catalog doc lists current Claude rows and per-model request policy. | Update |
| session | Code | `tests/unit/llm/supported-model-definitions.test.ts`, `tests/unit/llm/api/anthropic-llm.test.ts` | Test contracts | Ordered aggregate test pins Anthropic sublist positions (slice 12..20). | Tests must be updated |
| session | Web | https://platform.claude.com/docs/en/about-claude/models/overview | Official IDs/specs | `claude-sonnet-5-5`: $2/$10, adaptive, default effort high, 1M ctx, 128K out. `claude-haiku-5-5`: from $0.10/$0.50, adaptive, default effort medium, 1M ctx, 128K out. Text+image input. | — |
| session | Web | https://platform.claude.com/docs/en/models/sonnet-5-5/overview, `.../whats-new-sonnet-5-5` | Sonnet 5.5 contract | Released 2026-09-28. Pricing: in $2, out $10, 5m write $2.50, 1h write $4, cache read $0.10. `thinking:{type:'disabled'}` → 400; lowest setting is `{type:'between_tools'}` (no other fields; ≤ high effort). Manual `enabled/budget_tokens` → 400. Non-default temperature/top_p/top_k → 400. `tool_choice` `any`/`tool` → 400. With adaptive + default `display:'omitted'`, text between tool calls arrives as empty progress-update thinking blocks (UI goes quiet); with `between_tools` the text is returned. Thinking blocks bound to model/conversation/account; keep history append-only. | — |
| session | Web | https://platform.claude.com/docs/en/models/haiku-5-5/overview, `.../whats-new-haiku-5-5` | Haiku 5.5 contract | Released 2026-10-07. Pricing tiered on prompt size: ≤100k: in $0.10, out $0.50, 5m $0.125, 1h $0.20, read $0.01; >100k: in $0.50, out $2.50, 5m $0.625, 1h $1, read $0.05. Adaptive on by default; `disabled` allowed at ≤ high effort; manual budget → 400; non-default sampling → 400; assistant prefill → 400; thinking text omitted by default. | — |
| session | Web | https://platform.claude.com/docs/en/build-with-claude/thinking | Per-model thinking table (follow-up read) | Confirms: Sonnet 5.5 — `between_tools` OK (≤ high effort), `disabled`/`enabled` → 400; Haiku 5.5 — `disabled` OK (≤ high effort), `enabled`/`between_tools` → 400. `display` defaults to `omitted` on both; `display` is invalid with `between_tools`/`disabled`. Progress updates between tool calls exist on Sonnet 5.5 (not Haiku 5.5); empty under `omitted`, readable under `summarized`, beta `updates` (header `thinking-display-updates-2026-08-18`) or `between_tools`. Forced tool use rejected on Sonnet 5.5 (and Opus 5.5); accepted on Haiku 5.5. Prefilled final assistant turn rejected on all Claude 4.6+ models. Sampling params: non-default → 400 on both; top_p default 0.99. Thinking blocks must be passed back unmodified; Sonnet/Haiku 5.5 blocks are account-bound. | Confirms REQ-005..011 |
| session | Web | https://platform.claude.com/docs/en/build-with-claude/extended-thinking | Manual budget | `type: enabled` returns 400 on Sonnet 5.5 and Haiku 5.5. | Confirms REQ-009 |
| session | Web | https://platform.claude.com/docs/en/about-claude/pricing | Authoritative price table | Sonnet 5.5: $2/$10, 5m $2.50, 1h $4, hit $0.10. Haiku 5.5 ≤100k: $0.10/$0.50, 5m $0.125, 1h $0.20, hit $0.01; >100k: $0.50/$2.50, $0.625, $1, $0.05. **Haiku prompt length counts all input tokens including cache reads and cache writes**; each request priced on its own. Batch/data-residency out of scope. Side finding: pricing page lists Claude Sonnet 5 at $2/$10 (5m $2.50, 1h $4, hit $0.20) while the autobyteus catalog row has $3/$15/$0.30/$3.75/$6 — out of scope here; separate-ticket candidate. | Resolves U-001 at requirement level (AC-003 threshold basis); flags Sonnet 5 price drift |
| session | Web | Migration-guide pages | Not separately fetched; search did not return the official URL. Their checklist content is reproduced on the "What's new" pages already read. | No gap |
| session | Web | https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking | Effort semantics | Effort is `output_config.effort`; not currently exposed by autobyteus Claude rows. | Non-goal |

## Re-verification After Fast-Forward To `ca8569449`

| Area | Upstream change | Effect on this package |
| --- | --- | --- |
| `anthropic-supported-model-definitions.ts` | Only Sonnet 5 price changed to 2/10/0.2/2.5/4 | Removes former separate-ticket candidate; no new rows for Sonnet/Haiku 5.5 exist yet |
| `api/anthropic-llm.ts` | Shared `buildRequestParams` for sync/stream; conversation-scoped prompt caching (top-level system block + top-level `cache_control`, both `ttl: 1h`); `cache_control` adapter-controlled; leading-only system split | `resolveAnthropicModelRequestPolicy`, `buildThinkingParam`, the Opus 5.5 preflight and default `temperature: 0` injection are unchanged, so the misclassification findings (Sonnet 5.5 → `disabled`, Haiku 5.5 → `temperature: 0`) still hold. Request shaping now has a single build path (simplifies design). 1h cache writes count toward Haiku's 100k tier (provider rule). |
| `provider-native/*`, `anthropic-native-history-policy.ts`, `memory/retained-reasoning-prefix-binding.ts` | Provider-generic native-history policy and prefix-bound reasoning guard | Covers REQ-011 continuity and R-002 for new models without model-specific code (to confirm in architecture) |
| `docs/provider_model_catalogs.md` | Sonnet 5 pricing note; Gemini tier table | Doc update for new rows goes in same Anthropic section |

## Full Re-verification Against `ff227eb72` (committed HEAD)

Method: `git diff ca8569449 ff227eb72` over every design-relevant path, plus `git show HEAD:<file>` for adapter facts. HEAD was used rather than the working tree, because the implementation engineer had already begun editing in the worktree.

| Earlier finding | Path(s) re-checked | Changed upstream? | Still holds? |
| --- | --- | --- | --- |
| AF-001/002 request policy fragmentation | `anthropic-llm.ts` @ HEAD L103-236 | File changed (finish/output-limit), policy region not | Yes — prefix matcher L103, Sonnet-5 disabled rule L117, Opus 5.5 blocks L185/L222, `temperature = 0` L236 |
| AF-003 no dated IDs; static catalog | catalog files | No | Yes |
| AF-004 SDK types `between_tools` | `autobyteus-ts/package.json` pin `0.132.1` | No | Yes |
| AF-005/006 tier basis and pricing projection | `autobyteus-server-ts/src/token-usage/**`, `llm-model-pricing.ts`, `llm-config.ts`, `anthropic-token-usage-normalizer.ts` | No | Yes |
| AF-007 schema-driven frontend thinking controls | `autobyteus-web/utils/llmThinkingConfigAdapter.ts`, `llmConfigSchema.ts`, `runSettings/**` | No | Yes |
| AF-008 provider-keyed native history / prefix strip | `provider-native/**`, `anthropic-native-history-policy.ts`, `retained-reasoning-prefix-binding.ts` | No | Yes |
| Prompt renderer (no prefill), kwargs sanitizer | `anthropic-prompt-renderer.ts`, `provider-request-kwargs.ts` | No | Yes |
| Anthropic docs facts | External, read 2026-10-09 | N/A | Yes (same day) |

New upstream facts relevant to this package (AF-012..AF-015):

| ID | Source | Observation | Implication |
| --- | --- | --- | --- |
| AF-012 | `src/llm/utils/max-output-tokens.ts`, `base.ts resolveMaxOutputTokens`, `anthropic-llm.ts _streamMessagesToLLM` | Streaming `max_tokens` = configured value, else catalog `maxOutputTokens`. The call throws when both are unknown. Non-streaming keeps 8192. | The new rows must carry `maxOutputTokens: 128_000` (already in the design). Default streaming requests will send `max_tokens: 128000`, which is within both models' limit. Thinking tokens count toward it. |
| AF-013 | `anthropic-llm.ts` finish table; `docs/llm_module_design.md` L294 | Native turn yielded only for `stop`/`tool_calls`. `max_tokens` → `output_limit`, with no native turn. The stream must end with `message_stop`. | Covers Sonnet 5.5's "interrupted" progress-update block on `max_tokens`: it is not stored. No policy impact. |
| AF-014 | `agent/loop/output-limit-recovery.ts`, `agent-turn-runner.ts` L213-226, `memory-manager.appendOutputLimitRecoveryNote` | After an output limit, a hidden **USER** note is appended (append-only), and the turn continues. | No assistant prefill (Haiku 5.5 and Sonnet 5.5 reject prefill) and no history edit, so it is compatible with the prefix-bound thinking check. No impact. |
| AF-015 | `tests/unit/llm/api/anthropic-llm.test.ts`, `anthropic-signed-tool-continuation.test.ts` diffs | Test models now need `maxOutputTokens`; stream mocks must end with `{type:'message_stop'}`; the request identity field was renamed `isToolContinuation` → `isTurnContinuation`. | Test-authoring guidance for the new tests |

Conclusion: no requirement or design decision changes. Only implementation and test guidance is added (design spec "Guidance For Implementation").

## Re-verification After Fast-Forward To `ca8569449`

| Area | Upstream change | Effect on this package |
| --- | --- | --- |
| `anthropic-supported-model-definitions.ts` | Only Sonnet 5 price changed to 2/10/0.2/2.5/4 | Removes former separate-ticket candidate; no new rows for Sonnet/Haiku 5.5 exist yet |
| `api/anthropic-llm.ts` | Shared `buildRequestParams` for sync/stream; conversation-scoped prompt caching (top-level system block + top-level `cache_control`, both `ttl: 1h`); `cache_control` adapter-controlled; leading-only system split | `resolveAnthropicModelRequestPolicy`, `buildThinkingParam`, the Opus 5.5 preflight and default `temperature: 0` injection are unchanged, so the misclassification findings (Sonnet 5.5 → `disabled`, Haiku 5.5 → `temperature: 0`) still hold. Request shaping now has a single build path (simplifies design). 1h cache writes count toward Haiku's 100k tier (provider rule). |
| `provider-native/*`, `anthropic-native-history-policy.ts`, `memory/retained-reasoning-prefix-binding.ts` | Provider-generic native-history policy and prefix-bound reasoning guard | Covers REQ-011 continuity and R-002 for new models without model-specific code (to confirm in architecture) |
| `docs/provider_model_catalogs.md` | Sonnet 5 pricing note; Gemini tier table | Doc update for new rows goes in same Anthropic section |

## Re-verification After Fast-Forward To `ff227eb72` (41 upstream commits)

- The request-policy region of `anthropic-llm.ts` is unchanged: prefix matching, the `claude-sonnet-5` disabled rule, both `claude-opus-5-5` blocks and the `temperature: 0` fallback are still present (now around L103-236; the file is 418 lines). AF-001..AF-003 still hold.
- New upstream: normalized finish handling (`llm-response-finish.ts`) and output-limit resolution. Streaming now sends `max_tokens` = configured value, else the model's `maxOutputTokens` from catalog metadata, and throws when neither is known. The new rows set `maxOutputTokens: 128_000`, so no design change is needed. Implementation must keep the metadata on both rows.
- Catalog, pricing, server token-usage, native-history and frontend thinking-adapter files are unchanged.

## Relevant Existing Behavior

| Behavior ID | Kind | Trigger | Current Path | Outcome | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | User picks a built-in Anthropic model for an agent | Static catalog → model list → `AnthropicLLM` | Sonnet 5.5 / Haiku 5.5 not selectable | catalog file | High |
| BEH-002 | System | Agent invokes a Claude model | `applyAnthropicRequestParams` | Per-model thinking/sampling shaping; new IDs would be shaped wrongly (see Source Log) | anthropic-llm.ts | High |
| BEH-003 | System | Token usage recorded | server cost calculator with optional tiers | Works for flat and tiered prices | token-cost-calculator.ts | High |

## Structural And Payload Surface Inventory

- Payload: Anthropic catalog rows; docs catalog table; unit tests.
- Structural: `resolveAnthropicModelRequestPolicy` / `applyAnthropicRequestParams` (request policy). No API, persistence, security or concurrency change identified.
- Persisted data: none affected (new catalog entries only).

## Assumptions, Unknowns, Risks

| ID | Type | Description | Resolution | Status |
| --- | --- | --- | --- | --- |
| U-001 | Unknown | Provider rule: Haiku tier threshold counts all input incl. cache read/write (pricing page). Architecture must verify server `accounting_input_tokens` equals that gross value | Architecture phase | Partially resolved |
| R-004 | Risk | Catalog Sonnet 5 price ($3/$15) differed from Anthropic pricing page ($2/$10) | Fixed upstream in `origin/personal` (row now 2/10/0.2/2.5/4; doc verified 2026-10-09) | Resolved |
| R-001 | Risk | Live API verification requires Anthropic key; unit tests use mocked SDK | Validation phase | Open |
| R-002 | Risk | Sonnet 5.5 / Haiku 5.5 thinking blocks fail (400) if the earlier prefix is edited | Upstream `80845f45e` added a provider-generic guard: `RetainedReasoningPrefixBinding` + `anthropicNativeHistoryPolicy` strip prefix-bound Anthropic thinking when the request prefix digest changes, and late SYSTEM notes no longer alter the top-level system. Applies to all Anthropic models incl. new rows. Architecture to confirm. | Mitigated upstream |
| R-003 | Risk | Haiku 5.5 rejects assistant prefill; autobyteus renderer is not known to send prefill | Architecture verify | Open |

## Requirement Implications

- Catalog addition alone is unsafe: existing prefix-family policy would cause 400s for both models. Requirements must state correct request behavior per model.
- Tiered Haiku pricing fits existing pricing mechanism.

## Architecture Investigation Findings

Authorities read (design reading gate, 2026-10-09): `references/architecture-design.md`, `design-principles.md`, `templates/design-spec-template.md`, repo-root `DESIGN.md`, `TESTING.md`. No `autobyteus-ts`-level `DESIGN.md` exists.

| ID | Source / Command | Observation | Design implication |
| --- | --- | --- | --- |
| AF-001 | `autobyteus-ts/src/llm/api/anthropic-llm.ts` L72-213 @ `ca8569449` | Request policy is split three ways: (1) a prefix-matched family list → `usesAdaptiveThinking`/`rejectsSamplingParameters`; (2) a prefix match for `claude-sonnet-5` → `supportsThinkingDisabled`; (3) two hard-coded `modelValue === 'claude-opus-5-5'` blocks (strict preflight + forced adaptive). Prefix matching already conflates `claude-opus-5-5`→`claude-opus-5` and `claude-fable-5-1`→`claude-fable-5`; that only works because Opus 5.5 is special-cased and Fable 5.1 happens to share Fable 5's rules. | Root cause of the new-model misclassification. The policy has no field for *which* off-shape a model takes, or for forced-tool-choice rejection outside Opus 5.5. Adding Sonnet/Haiku 5.5 as more `if modelValue ===` branches would be a third and fourth special case → refactor to one explicit per-model policy. |
| AF-002 | same file | The boolean `rejectsSamplingParameters` always equals `usesAdaptiveThinking` | Redundant field; derive it from the thinking mode |
| AF-003 | `rg -n "claude-[a-z]+-[0-9]-[0-9]-[0-9]{6,}"` over src/tests/server | No dated snapshot model values anywhere. `AnthropicLLM` is only instantiated through the static catalog (`anthropic-supported-model-definitions.ts`); the docs say the catalog is static with no reload. Unit tests use exact catalog values. | Exact-value lookup can replace prefix matching without changing reachable behavior. Unknown values fall back to the legacy fixed-budget policy, as they do today. |
| AF-004 | `npm pack @anthropic-ai/sdk@0.132.1` (the pinned autobyteus-ts version), `resources/messages/messages.d.ts` L3941-3990 | The SDK types include `ThinkingConfigBetweenTools { type: 'between_tools' }`, and `ThinkingConfigParam` includes it | No SDK bump or cast needed (the adapter already builds thinking as a record) |
| AF-005 | `autobyteus-server-ts/src/token-usage/domain/token-usage-component-basis.ts` L100-104; `pricing/token-cost-calculator.ts` `selectTier` | For `base_excludes_cache` (Anthropic) the gross is input + cache read + cache creation. The tier is chosen with `gross <= max_input_tokens` per usage observation (one per LLM call). | Matches Anthropic's Haiku rule exactly (all input incl. cache, per request; "up to 100,000" inclusive). U-001 resolved. No server change. |
| AF-006 | `autobyteus-ts/src/llm/llm-model-pricing.ts` L87-120; Gemini 3.1 Pro catalog row | Catalog tiers project to server `input_price_tiers` with per-tier cache 5m/1h/read prices | Haiku tiers fit the existing contract |
| AF-007 | `autobyteus-web/utils/runSettings/explicitModelConfig.ts`, `utils/llmThinkingConfigAdapter.ts` `getDefaultThinkingConfig`, `docs/chat.md` | Every start surface (New chat, Org launch, Team member override, existing-run settings) writes the schema's default thinking keys (`thinking_enabled`, `thinking_display`) explicitly. The UI renders the Claude switch generically from the schema (`Off · On` + display). | Schema defaults are the single source of the default thinking state. The adapter keeps its current semantics: an absent key means nothing is sent (provider default). No frontend change. |
| AF-008 | `anthropic-native-history-policy.ts`, `provider-native-history.ts`, `memory/retained-reasoning-prefix-binding.ts` | Native-turn preservation and the prefix-bound reasoning strip are keyed by provider `anthropic`, not by model | REQ-011 and R-002 are satisfied for the new models without new code; verify with a unit test |
| AF-009 | `git show 42ba8549b` ("Split Anthropic catalog definitions to satisfy source limit"); `wc -l` | The Anthropic catalog was split to keep source files small. `anthropic-llm.ts` is 382 lines; the catalog is 162. | Moving the policy out of `anthropic-llm.ts` keeps the adapter focused and small |
| AF-010 | `TESTING.md` | `pnpm -C autobyteus-ts exec vitest run <path>` for unit tests. The Anthropic prompt-caching live E2E accepts `ANTHROPIC_CACHE_E2E_MODEL`. | Validation plan: mocked unit tests, plus an optional live run per model with a key |
| AF-011 | thinking-config table (Anthropic thinking page) vs. the current adapter | Opus 5 accepts `disabled` at ≤ high effort, yet the adapter never sends it (`supportsThinkingDisabled` is Sonnet-5-only), so Opus 5 "Off" still lets the model think | Out of scope (REQ-012 preserves it); recorded as a follow-up candidate |

## SR-007 Investigation — Independent Code Review CRR-001 (2026-10-11)

Trigger: independent code review report `/Users/normy/autobyteus_org/independent-reviews/claude-sonnet-haiku-5-5-model-support/independent-code-review-report.md` (CRR-001, verdict "Changes required (bounded)", findings CR-001..CR-006). The user asked Solution Designer to work on the feedback.

Authorities read (design reading gate, 2026-10-11): `references/architecture-design.md`, `references/design-principles.md`, `references/requirements-engineering.md`; repository `DESIGN.md` and `TESTING.md` read from `origin/personal` @ `d72d2018b`. No `autobyteus-ts`-level `DESIGN.md` exists.

| ID | Source / Command | Observation | Design implication |
| --- | --- | --- | --- |
| AF-016 | `git fetch origin`; `git log --oneline ff227eb72..origin/personal \| wc -l` → 42; `git merge-tree --write-tree --name-only HEAD origin/personal` | `origin/personal` is now `d72d2018b` (42 commits past the base; 2 more since the reviewer's `54e071d5e`, both unrelated: a ticket-evidence log rename and a version bump). `TESTING.md` is the only conflicting file. `git diff --name-only ff227eb72 origin/personal` touches no `autobyteus-ts/` path, no token-usage code or doc, and no `tests/e2e/helpers` or prompt-caching live test. The branch is not on the remote (`git ls-remote --heads origin codex/claude-5-5-model-support` is empty). | Rebasing the 2 commits onto `origin/personal` is safe (nothing published). The conflict resolution is to take origin's `TESTING.md` unchanged. |
| AF-017 | `git show origin/personal:TESTING.md` (`361804e45` rewrite) | The "When this file may be updated" section forbids per-suite descriptions, cases, costs and commands: "Put them in that test file's header (purpose, prerequisites, gate variable, command, cases)". The layer table says "Gated runtime suites … The gate and command are in the test file". The "Real-provider credentials" bullet already says to wrap the importer in `script -q /dev/null …` on macOS without a terminal. | Both suite rows (prompt-caching and Claude 5.5) are dropped from `TESTING.md`; each suite's exact run command moves into its test-file header. The uncommitted `tcgetattr` note is not a rule for every task; it belongs in `autobyteus-server-ts/docs/modules/secret_management.md` (importer section, which already says "Execution requires the TTY confirmation" and "An agent may run it as the operator"). |
| AF-018 | `autobyteus-ts/src/llm/api/anthropic-model-request-policy.ts:17-24,31,42-52`; `anthropic-llm.ts` `sanitizeExplicitThinking` / `buildThinkingFromToggle` | `thinkingOffShape` is read only after `thinkingMode === 'adaptive'` is established (both readers). Opus 5.5 (`adaptive_required`) and the legacy-budget policy carry `'omit'` that nothing reads; for Opus 5.5 the real off behavior is a local throw. `AnthropicThinkingMode` / `AnthropicThinkingOffShape` are used only inside the policy file and its test. | CR-002 confirmed: a discriminated union keyed by `thinkingMode` (only `adaptive` carries `thinkingOffShape`) is a type-only tightening; the two readers already narrow on the mode. |
| AF-019 | `anthropic-llm.ts:122-129`; `rg "Claude Opus 5.5 supports\|does not support explicit sampling"` over `autobyteus-ts`, `autobyteus-server-ts`, `autobyteus-web` (src, tests, docs) | The only occurrences are the two `throw` sites. `tests/unit/llm/api/anthropic-llm.test.ts:83-85` match the substrings `'adaptive thinking only'` and `'explicit sampling'`. No server, web or doc text depends on the "Claude Opus 5.5" wording. | CR-003 confirmed: both messages can be built from `modelValue` (`Anthropic model ${modelValue} …`), matching the forced-tool-choice message, with no existing test change. |
| AF-020 | `rg -l "new AnthropicLLM"` over `autobyteus-ts/tests`, `autobyteus-server-ts/tests`, `autobyteus-server-ts/src`; model values in those files | Production builds `AnthropicLLM` only from the static catalog (AF-003 re-confirmed). Existing unchanged tests construct it with non-catalog values `'synthetic'` (`request-output-limit.test.ts`, `stream-finish.test.ts`), `'test'` (`nonstreaming-finish.test.ts`, server `compaction-provider-requests.test.ts`) and `'fixture'` (`compaction-single-attempt-transport.test.ts`); these rely on the resolver returning the fixed-budget policy for a value without a row. | CR-004: add an explicit `claude-sonnet-4-6` row and keep the resolver total (fixed-budget result for a value without a row). Making it throw would change existing tests' expected behavior (the SR-004 escalation trigger) and add machinery for an unsupported scenario. Remove only the tests and doc text that describe dated/unknown production IDs. |
| AF-021 | `api-e2e-evidence/c55-live/case-results.json` (C55-E2E-006), `calls-summary.json` | The recorded live run made 22 calls (all 200). The Haiku tier case's second call was 242,111 gross input tokens priced at $0.2346; the case total was $0.2363. The header says "about a dozen short calls and one ~130K-token Haiku call (a few cents)". | CR-006 confirmed: the header must say about 20 short calls plus one ~240K-gross-token Haiku call (about $0.24 for that call), and carry the exact clean-environment command. |
| AF-022 | `git status` / `git diff` in the worktree | `autobyteus-server-ts/docs/modules/token_usage.md` (+17 lines: Sonnet 5.5 rates and the Haiku 5.5 tier table) is uncommitted; it merges cleanly with origin. | CR-005 confirmed: commit it with the ticket. |

# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements baseline: `requirements-doc.md` at SR-001, approved by the User on 2026-10-29 in the Solution Designer conversation ("Yeah, since you already did the investigation, go ahead…").
- Behavior-defining supplements: None.
- Design status: `Ready`
- Canonical investigation-notes path: `/home/autobyteus/workspace/.codex/worktrees/claude-anthropic-effort-control/tickets/in-progress/claude-anthropic-effort-control/investigation-notes.md`
- Authorities read (2026-10-29): `references/architecture-design.md`, `references/design-principles.md`, project `DESIGN.md` (root), `autobyteus-server-ts/docs/design/data_migration_guideline.md` §2; design examples not used.
- Project design-principle conflicts or discrepancies: None. `GLOSSARY.md` holds no LLM-config words; the terms here (effort, thinking switch) are provider vocabulary defined below and in the investigation notes.

## Current-State Read

- The AutoByteus runtime's Claude catalog (`autobyteus-ts/src/llm/anthropic-supported-model-definitions.ts`, SRC-002/003) declares per-model config schemas; none declares effort. Opus 5.5 declares only `thinking_display`; Fable 5.1 declares nothing.
- The schema flows unchanged to the server (strict schema validation of saved configs, SRC-011) and to the web, whose `llmThinkingConfigAdapter.ts` derives thinking semantics from schema keys (SRC-007) and `chatThinkingMenu.ts` builds the menu (SRC-009). With no recognized thinking key, Opus 5.5's menu is `hidden` → "Not available for this model" (SRC-006, SRC-010).
- `AnthropicLLM` (`anthropic-llm.ts`, SRC-004) shapes each request from `LLMConfig.extraParams` using the per-model facts in `anthropic-model-request-policy.ts` (SRC-005). It never sets `output_config`; a stored `reasoning_effort` would leak as a raw top-level field.
- Sonnet 4.6 is the only user of the fixed-budget thinking mode (`legacy_budget`, `thinking_budget_tokens`, temperature-0 default); removing it makes that machinery dead in autobyteus-ts and in the web adapter (SRC-014).
- Root cause of the reported problem: effort was never modeled in our Claude catalog or request shaping (an explicit non-goal in earlier tickets, SRC-015), not a provider limitation (PRB-001).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale: production delta in 3 autobyteus-ts files (catalog, request policy, Anthropic adapter) and 3 web files (thinking adapter, thinking menu builder, schema-defaults helper) plus one localization key; docs and tests updated in existing places. No new file, subsystem, API, route or persistence code.
- Architectural risk: `Low`
- Risk rationale: existing owners absorb the change (catalog owns per-model settings; adapter owns request shaping; web adapter owns thinking semantics). New external request field is additive and measured against the real API (PRB-001/002). Persisted data directly usable (no migration). The shared web presentation change also reaches the Claude Agent SDK runtime's Claude schema (accepted DEC-005; no backend change there).
- Escalation trigger: return a Design Impact if implementation finds that (a) a saved-config reader rejects or crashes on configs naming removed models or holding `thinking_budget_tokens` (instead of the existing unavailable/unsupported-setting states), (b) another production caller constructs `AnthropicLLM` with a non-catalog model value, or (c) a remaining model rejects a documented effort level in the live check.

## Architecture Investigation Evidence

| Source | Path / Reference | Observation | Design Decision Supported | Uncertainty |
| --- | --- | --- | --- | --- |
| SRC-001, SRC-008 | Anthropic effort + thinking docs | Levels/defaults per model; xhigh/max rejected with thinking off on several models | Levels, defaults, uniform xhigh/max rule | Future doc changes |
| PRB-001/002 | live probe | All five levels accepted on Opus 5.5; 400 for Sonnet 5.5 between_tools+xhigh and invalid value | Mapping to `output_config.effort`; local refusal | Unprobed models (AC-009) |
| SRC-004 | `anthropic-llm.ts` L72-79, L118-139, L171-191, L193-239 | Internal keys, strict rules, toggle → thinking, legacy branch | Where effort mapping and refusal go; what is removed | — |
| SRC-005 | `anthropic-model-request-policy.ts` L13-54 | `legacy_budget` only for Sonnet 4.6; fallback for non-catalog values | Remove legacy variant and fallback | Test fixtures need catalog values |
| SRC-007, SRC-009 | web adapter L20-25, L246-254, L307-310, L375-385; menu L90-139 | Effort is a dependent key of the claude switch | Make effort independent, add rule | — |
| SRC-011 | server schema validation | Schema-driven | No server change | — |
| SRC-013 | Claude SDK normalizer/session config | Same keys; backend independent of UI coupling | DEC-005 shared presentation | — |
| SRC-014 | budget usages | Dead after removal | Removal plan | — |
| SRC-017, SRC-018 | unavailable-model state; pricing snapshots | Removed IDs handled by existing paths | Persisted data: Directly Usable | — |

## Intended Change

Add a per-model `reasoning_effort` setting to every Claude catalog schema, map it to `output_config.effort` in `AnthropicLLM` with a uniform "xhigh/max need thinking on" rule, present effort as its own group in the shared Claude thinking menu, and remove the gen-4 Claude rows together with the fixed-budget thinking machinery only they used.

## Change Scope (Mandatory)

- In scope: UC-001 (catalog schemas, request shaping), UC-002 (web thinking adapter/menu), UC-003 (catalog removal and dead-code removal). Areas: `autobyteus-ts/src/llm` Anthropic catalog/policy/adapter; `autobyteus-web` thinking adapter, thinking menu builder, schema-defaults helper, en/zh-CN chat localization; docs and tests that describe these.
- Derived consumers: catalog schema → server GraphQL `configSchema` and `model-config-schema-validation` (no change; reads schema generically); web `normalizeModelConfigSchema` → thinking adapter/menu (changed), `modelOptions.otherModelSettingKeys` (no change: effort is a thinking key so it never becomes an "other setting" row; for Opus 5.5 `thinking_display` stays an other-setting row as today), `explicitModelConfig` / `getDefaultThinkingConfig` (writes `reasoning_effort` default explicitly; harmless, equals API default), ModelConfigSection form (follows adapter rules; no template change).
- Deliberately left alone: Claude Agent SDK runtime backend and discovery; per-model thinking-off shapes (Opus 5 / Fable 5 "Off" still sends nothing — FU-001); prompt caching; non-Anthropic providers; per-message effort.
- Follow-ups: FU-001.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | REQ / AC | Trigger | Existing Behavior | Approved Change / Preserved | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001/002/006, AC-001/002/006 | Thinking on Opus 5.5 | hidden menu | effort menu (default medium); display row kept | DS-001, DS-002 |
| BEH-002 | User | REQ-001/002, AC-001/003 | Thinking on other Claude rows | Off/On + display | + effort group; Fable 5.1 gains effort | DS-001, DS-002 |
| BEH-003 | System | REQ-003/008, AC-002/003/008 | Run turn | no effort sent | `output_config.effort` when configured; unset unchanged | DS-001 |
| BEH-004 | User/System | REQ-004/005, AC-004/005 | Thinking off + effort | — | independent; xhigh/max need thinking on | DS-001, DS-002 |
| BEH-005 | Operational | REQ-007, AC-007 | Model list | gen-4 rows | removed | DS-003 |
| BEH-006 | User | REQ-009, AC-005 | Claude SDK thinking menu | merged Off · levels | same presentation as BEH-004 | DS-002 |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature` (plus `Cleanup` of obsolete models).
- Current design issue found: `No`.
- Structural triggers: *Several kinds or forms* fires — the thinking menu serves Claude schemas with a switch (AutoByteus gen-5 rows and Claude SDK rows), Claude schemas without a switch (Opus 5.5, Fable 5.1), and other providers; each is traced below (DS-002) and only the claude-switch kind changes semantics. *Legacy cleanup* fires — fixed-budget mode becomes dead (SRC-014) → removed. *Derived data* fires — the schema feeds server validation, menus, defaults; dispositions listed in Change Scope. *Behavior by absence* checked: "no effort configured → nothing sent" is an explicit rule (REQ-003), and the policy fallback for unknown models (behavior by absence) is removed. Ruled out: repeated coordination, responsibility overload (files stay < 500 lines), authoritative-boundary bypass (no new callers), vocabulary drift (`reasoning_effort` already means effort for every provider and the Claude SDK runtime).
- Root cause classification: `No Design Issue Found` — a missing capability in existing owners.
- Refactor needed now: `No`.
- Evidence: SRC-002..SRC-009.
- Design response: extend the three existing owners; remove dead legacy machinery.
- Refactor rationale: owners and boundaries are already correct.
- Intentional deferrals: FU-001.

## Terminology

- **Effort**: Anthropic `output_config.effort`; config key `reasoning_effort`; levels `low | medium | high | xhigh | max`. UI labels come from the schema ("Reasoning effort"; levels humanized "Low … Xhigh, Max").
- **Thinking switch**: `thinking_enabled`. **Off shape**: per-model value sent when off (policy `thinkingOffShape`).
- **Thinking-required levels**: `xhigh`, `max` — the effort levels that need thinking on (DEC-004).

## Legacy Removal Policy (Mandatory)

- Obsolete paths: gen-4 Claude rows; `claudeSchema`; `legacy_budget` policy variant, `LEGACY_BUDGET_POLICY` and the unknown-value fallback; budget thinking construction, `thinking_budget_tokens` internal key/strict-rule clause and temperature-0 default in `AnthropicLLM`; web claude budget handling.
- Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision (Mandatory)

- Stored subject: saved agent definitions, launch profiles and run configs (`llmModelIdentifier`, `llmConfig` JSON) in server app data; token-usage rows.
- Change: model rows removed; `reasoning_effort` added as an optional key; `thinking_budget_tokens` no longer declared by any schema.
- Readers: server strict schema validation on save/launch (SRC-011); web unavailable-model state and current-model-selection guard (SRC-017); pricing resolved at observation time and captured per row (SRC-018).
- Semantics under direct use: configs without `reasoning_effort` behave exactly as today; configs naming a removed model show the existing unavailable-model state and require re-selection (user-approved removal); a leftover `thinking_budget_tokens` could only exist with Sonnet 4.6, so it travels with a config that already needs re-selection; history rows keep captured prices.
- Constraints: DESIGN.md rule 7 (no lockout) satisfied — nothing reads these at startup admission.
- Decision: `Directly Usable — No Migration`.
- Rationale: tolerant/generic readers already handle both cases; rewriting user data to swap models would guess intent (migration guideline §2 "Stop… guessing identity"). Migration checklist: need — none (no meaning change of a stored name; removal is a catalog change); availability — unaffected; source/target — existing configs unchanged; disposition — retained as-is; cost — none; references — model identifier references validated where they are today; evidence — AC-007 unavailable-model test.
- Supported ACs: AC-007, AC-008.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior IDs | Start | End | Governing Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001..004 | User picks effort / sends a message | Anthropic request with `output_config.effort` | `AnthropicLLM` (request shaping) | Effort must reach the provider correctly |
| DS-002 | Primary End-to-End | BEH-001/002/004/006 | Model selected in a thinking surface | Menu/form shows effort, choice written to `llmConfig` | `llmThinkingConfigAdapter` (semantics) | Users must see and set effort; rule enforced at the source |
| DS-003 | Primary End-to-End | BEH-005 | Model catalog listing | Model menu | Anthropic catalog definitions | Obsolete rows disappear |

## Primary Execution Spine(s)

- DS-001: `Web thinking control -> Server run config (schema validation) -> Agent run LLMConfig -> AnthropicLLM.buildRequestParams -> applyAnthropicRequestParams (policy, thinking, effort, strict rules) -> @anthropic-ai/sdk -> Anthropic Messages API`
- DS-002: `Catalog schema -> Server GraphQL configSchema -> normalizeModelConfigSchema -> llmThinkingConfigAdapter (keys, switch, independent effort, rule) -> buildChatThinkingMenu / ModelConfigSection -> llmConfig update`
- DS-003: `anthropicSupportedModelDefinitions -> LLMFactory catalog -> Server model catalog GraphQL -> Web model menu`

## Spine Narratives (Mandatory)

| Spine | Narrative | Main Nodes | Owner | Off-Spine |
| --- | --- | --- | --- | --- |
| DS-001 | The run's config carries `reasoning_effort`. `applyAnthropicRequestParams` treats it as an internal key (never forwarded raw), validates it is a known effort level and that thinking-required levels are not combined with `thinking_enabled: false`, builds `thinking` as today, then sets `output_config.effort` (merged into any explicit `output_config`). Unset effort → no `output_config.effort`. | config, policy, request | `AnthropicLLM` | effort constants in the policy file |
| DS-002 | The adapter recognizes the claude schema (switch present) with keys `thinking_enabled`, `thinking_display`, `reasoning_effort`. Display stays dependent on the switch; effort is independent. Choosing a thinking-required level while off turns thinking on; switching off while a thinking-required level is effective sets effort to `high`. The menu shows Off/On, then the effort group (always showing its checked level), then display; summary "On · High". No-switch Claude schemas (Opus 5.5 `reasoning_effort`+`thinking_display`; Fable 5.1 `reasoning_effort`) keep the generic per-parameter path: Thinking row = effort levels; Opus 5.5 display stays its own row. | schema, adapter, menu | `llmThinkingConfigAdapter` | menu builder (presentation) |
| DS-003 | The three gen-4 rows are deleted from the definitions array; nothing else lists them. | catalog | catalog file | docs |

## Spine Actors / Main-Line Nodes

Catalog definitions; server schema validation (unchanged); `AnthropicLLM` request shaping; web thinking adapter; web thinking menu builder.

## Ownership Map

- Catalog definitions: own which settings each model exposes, their levels and defaults.
- `anthropic-model-request-policy.ts`: owns per-model Anthropic request facts and the provider's effort vocabulary (`ANTHROPIC_EFFORT_LEVELS`, `ANTHROPIC_THINKING_REQUIRED_EFFORT_LEVELS`).
- `AnthropicLLM`: owns turning config into a valid request and refusing invalid combinations locally.
- Web `llmThinkingConfigAdapter`: owns thinking semantics in the UI (which keys, switch, dependencies, the xhigh/max rule). The rule is restated there for presentation; the backend refuses any mismatch (verify-and-refuse, Principle 11).
- Web `chatThinkingMenu`: presentation only, no semantics.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A — no facade involved.

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| Rows `claude-opus-4.8`, `claude-opus-4.7`, `claude-sonnet-4.6` | User decision (REQ-007) | — | catalog file |
| `claudeSchema` (budget schema) | Dead: only Sonnet 4.6 used it (SRC-002 L196) | — | |
| Policy entries for `claude-opus-4-8`, `claude-opus-4-7`, `claude-sonnet-4-6`; `legacy_budget` variant; `LEGACY_BUDGET_POLICY`; unknown-value fallback | Dead after removal; fallback served only non-catalog test fixtures (SRC-005 L47-54) | Exact lookup; unknown value throws a clear error | Tests switch to catalog values |
| `AnthropicLLM`: `legacy_budget` case in `buildThinkingFromToggle`, `thinking_budget_tokens` internal key and strict-rule clause, `temperature: 0` default branch, non-legacy guard around sampling stripping | Dead: no model uses legacy mode | Sampling stripped for every model | |
| Web adapter: `thinking_budget_tokens` in `PROVIDER_KEYS.claude`/`DEPENDENT_KEYS.claude`, budget default in `applyThinkingToggle`, budget removal in `getDefaultThinkingConfig` | Dead: no schema declares it (SRC-014) | — | |
| Web `applyModelConfigSchemaDefaults` budget block (`llmConfigSchema.ts` L304-306) and its doc sentence | Dead (same) | — | |
| Tests/fixtures/docs naming removed models or budget mode | Describe removed behavior | Current-model equivalents | see test list |

## Return Or Event Spine(s) (If Applicable)

N/A — response handling unchanged.

## Bounded Local / Internal Spines (If Applicable)

`applyAnthropicRequestParams` (parent `AnthropicLLM`): `resolve policy -> filter internal keys -> apply extra params/kwargs -> strict rules (incl. effort) -> sanitize explicit thinking -> thinking from toggle -> apply effort -> strip sampling`. Effort applies after thinking so the rule sees the final thinking state.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| Effort vocabulary constants | DS-001, DS-002 | `AnthropicLLM`, catalog | One list of levels and thinking-required levels | Single place to update when Anthropic changes | Duplicated lists drift |
| Localization of summary | DS-002 | menu | "{state} · {effort}" label | i18n | Hard-coded strings |

## Ownership Boundaries

Catalog → schema data only. `AnthropicLLM` is the only consumer of the policy file and the only place building Anthropic requests. Web semantics stay in the adapter; the menu builder and form call adapter functions only.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass | Fix If Thin |
| --- | --- | --- | --- | --- |
| `AnthropicLLM` | policy, request shaping | agent runtime via `LLMFactory` | building `output_config` elsewhere | extend `applyAnthropicRequestParams` |
| `llmThinkingConfigAdapter` | thinking key semantics, xhigh/max rule | `chatThinkingMenu`, `ModelConfigSection`, `llmConfigSchema`, `explicitModelConfig` | menu/form hard-coding effort rules | add adapter function |

## Dependency Rules

- Catalog may import effort constants from `api/anthropic-model-request-policy.ts` (it already imports `api/anthropic-llm.ts`).
- Web menu/form depend on the adapter; the adapter never depends on menu code.
- No web ↔ autobyteus-ts import (separate packages); the web restates the rule and the backend refuses mismatches.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity | Notes |
| --- | --- | --- | --- | --- |
| `resolveAnthropicModelRequestPolicy(modelValue)` | Anthropic model | per-model facts | exact catalog value | throws for unknown values |
| `ANTHROPIC_EFFORT_LEVELS`, `ANTHROPIC_THINKING_REQUIRED_EFFORT_LEVELS` (exported constants) | Anthropic effort | vocabulary | — | |
| Web `getIndependentThinkingParamKeys(schema)` (new) | thinking schema | thinking keys that are neither switch-owned nor switch-dependent (claude: `reasoning_effort`) | schema | used by merged menu |
| Web `applyThinkingParamChoice`, `applyThinkingToggle`, `applyThinkingDependentEdit` (changed) | thinking config | apply rule | schema + config | |

## Interface Boundary Check

| Interface | Singular | Explicit Identity | Ambiguity | Action |
| --- | --- | --- | --- | --- |
| policy lookup | Yes | Yes | Low | — |
| `getIndependentThinkingParamKeys` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | Natural | Same Everywhere | Drift | Action |
| --- | --- | --- | --- | --- | --- |
| effort config key | `reasoning_effort` | Yes | Yes (OpenAI/Kimi/GLM/Grok rows, Claude SDK schema) | Low | keep |
| thinking-required levels | `ANTHROPIC_THINKING_REQUIRED_EFFORT_LEVELS` | Yes | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| Per-model effort levels/defaults | catalog `ParameterDefinition` enum/default | Reuse | already the per-model settings owner |
| Request field mapping | `applyAnthropicRequestParams` | Extend | existing shaping owner |
| UI presentation | merged menu groups (`ChatThinkingControl` renders any group) | Extend builder only | template already generic |

## Subsystem / Capability-Area Allocation

| Area | Concerns | Spine | Decision |
| --- | --- | --- | --- |
| autobyteus-ts LLM catalog | schemas, rows | DS-001/003 | Extend/Remove |
| autobyteus-ts Anthropic adapter | effort mapping, rule, legacy removal | DS-001 | Extend/Remove |
| autobyteus-web thinking controls | semantics + menu | DS-002 | Extend/Remove |

## Draft File Responsibility Mapping

See Final mapping (no extraction changed it).

## Reusable Owned Structures Check

| Repeated Structure | Shared File | Owner | Why | Redundant Removed | Overlap Removed | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Effort parameter definition (levels + per-model default) | file-local factory `claudeEffortParameter(defaultValue)` in the catalog file | catalog | used by every Claude schema | Yes | Yes | a generic cross-provider effort helper |
| Effort level lists | constants in `anthropic-model-request-policy.ts` | Anthropic adapter area | used by catalog + adapter | Yes | Yes | — |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning | Redundant Removed | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| `AnthropicModelRequestPolicy` | Yes | Yes (legacy variant removed) | Low | — |

## Final File Responsibility Mapping

| File | Area | Owner | Concern | Change |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/anthropic-supported-model-definitions.ts` | catalog | definitions | rows + schemas | add `claudeEffortParameter`; add effort to every schema (Opus 5.5: medium; Haiku 5.5: medium; others high); give Fable 5.1 a schema with effort; remove gen-4 rows and `claudeSchema` |
| `autobyteus-ts/src/llm/api/anthropic-model-request-policy.ts` | adapter | policy | per-model facts + effort vocabulary | add constants; remove legacy variant, entries, fallback (throw) |
| `autobyteus-ts/src/llm/api/anthropic-llm.ts` | adapter | `AnthropicLLM` | request shaping | internal key `reasoning_effort`; validate + refuse thinking-required level with switch off; set `output_config.effort`; remove legacy paths |
| `autobyteus-web/utils/llmThinkingConfigAdapter.ts` | web thinking | adapter | semantics | claude keys/dependents updated; `getIndependentThinkingParamKeys`; xhigh/max rule in choice/toggle/dependent-edit; remove budget |
| `autobyteus-web/components/chat/chatThinkingMenu.ts` | web thinking | menu builder | presentation | merged menu: Off/On + independent effort group (always shows check) + dependent display; summary "{state} · {effort}" |
| `autobyteus-web/utils/llmConfigSchema.ts` | web schema | defaults helper | defaults | remove budget block + doc sentence |
| `autobyteus-web/localization/messages/{en,zh-CN}/chat.ts` | web i18n | — | summary key | add `chat.thinking.summaryWithEffort` |
| `autobyteus-web/components/chat/ChatThinkingControl.vue` | web | control | comment only | update doc comment (no template change) |

## Applied Patterns (If Any)

None new.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Responsibility | Must Not Contain |
| --- | --- | --- | --- |
| files above | File | as mapped | request shaping in the catalog; effort rules in the menu builder or Vue templates |
| Docs: `autobyteus-ts/docs/provider_model_catalogs.md` (rows, request-shape table, new effort paragraph), `autobyteus-ts/docs/llm_module_design.md` / `llm_module_design_nodejs.md` (removed-model mentions), `autobyteus-web/docs/chat.md` (Thinking menu section), `autobyteus-web/docs/settings.md` L1743 | File | describe current behavior | removed models/budget mode |
| Tests (update/add): ts `tests/unit/llm/api/anthropic-llm.test.ts`, `anthropic-llm-claude-5-5.test.ts`, `anthropic-model-request-policy.test.ts`, `tests/unit/llm/supported-model-definitions.test.ts`, `tests/unit/llm/metadata/model-metadata-resolver.test.ts`, `tests/unit/agent/loop/llm-phase-summary-output-limit.test.ts`, `tests/integration/llm/llm-factory-metadata-resolution.test.ts`, `tests/integration/llm/api/anthropic-llm*.test.ts` (live: add effort case per AC-009), `tests/integration/agent/handlers/claude-tool-call-handler-live.test.ts`; `test-support/live-e2e/live-e2e-scenarios.mjs` L94-100; server `tests/unit/token-usage/pricing/token-price-config-provider.test.ts` L47, `tests/e2e/token-usage/*`, `tests/unit/agent-execution/backends/claude/events/claude-session-event-converter.test.ts` (fixture names only); web `utils/__tests__/llmThinkingConfigAdapter.spec.ts`, `components/chat/__tests__/chatThinkingMenu.spec.ts`, `ChatThinkingControl.spec.ts`, `utils/__tests__/llmConfigSchema.spec.ts`, `components/workspace/config/__tests__/ModelConfigSection.spec.ts`, `stores/__tests__/chatDraftStore.spec.ts` | File | prove ACs | — |

## Folder Boundary Check

| Folder | Depth | Clear | Risk | Note |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/api` | Persistence-Provider (adapter) | Yes | Low | unchanged layout |
| `autobyteus-web/utils`, `components/chat` | Off-spine / presentation | Yes | Low | unchanged layout |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Request (Sonnet 5.5, off, low) | `{ thinking: { type: 'between_tools' }, output_config: { effort: 'low' } }` | `{ thinking: {...}, reasoning_effort: 'low' }` (raw leak) | Anthropic rejects unknown top-level fields |
| Request (Opus 5.5, max) | `{ thinking: { type: 'adaptive' }, output_config: { effort: 'max' } }` | — | AC-002 |
| Refusal | config `{ thinking_enabled: false, reasoning_effort: 'max' }` → `Error: Anthropic model claude-haiku-5-5: effort 'max' requires thinking on.` before the SDK call | sending and getting a 400 | AC-004 |
| Menu (Sonnet 5.5, off, low) | `Thinking: Off ✓ · On` / `Reasoning effort: Low ✓ Medium High Xhigh Max` / `Thinking display: …`; trigger "Off · Low" | `Off · Low · … · Max` single list where Low turns thinking on | REQ-004 |
| Toggle off with Max | `{thinking_enabled:true, reasoning_effort:'max'}` → Off → `{thinking_enabled:false, reasoning_effort:'high'}` | `{thinking_enabled:false, reasoning_effort:'max'}` | REQ-005 |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Aliases mapping removed gen-4 IDs to gen-5 models | Keep saved configs running | Rejected | Existing unavailable-model state; user re-selects |
| Keep `legacy_budget` for non-catalog models | Test fixtures | Rejected | Exact lookup; fixtures use catalog values |
| Keep effort coupled for Claude SDK schemas only | Avoid touching another runtime's UI | Rejected | One presentation (DEC-005) |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. autobyteus-ts policy: add effort constants; remove legacy variant/entries/fallback.
2. Catalog: effort factory; schemas updated; Fable 5.1 schema; remove gen-4 rows and `claudeSchema`.
3. `AnthropicLLM`: internal key, strict rule, effort mapping, legacy removal; unit tests first (AC-002/003/004/008).
4. Web adapter + menu builder + schema-defaults helper + i18n; unit tests (AC-005/006).
5. Docs, remaining test fixtures, live scenario list; grep audit for removed IDs and `thinking_budget_tokens` outside `tickets/` (AC-007).
6. Gated live check per remaining model (AC-009) with the test vault.

## Key Tradeoffs

- Uniform xhigh/max rule vs. per-model exactness: loses "thinking off + xhigh/max" on Opus 5 / Fable 5 / Sonnet 5 (where the API may allow it) in exchange for one predictable rule and no per-model UI knowledge.
- Restating the rule in the web (presentation) and enforcing in the backend vs. shipping rule metadata in the schema: a schema extension would add a cross-package contract for one rule; rejected as heavier.
- Opus 5.5/Fable 5.1 use the generic per-parameter menu (internally detected like other effort-only schemas) rather than a Claude-specific no-switch branch: no web code change for them.

## Risks

- RSK-001: Claude SDK runtime menu changes shape (accepted; tests).
- Changing effort mid-run restarts Anthropic's prompt cache for that run (documented provider behavior; user-initiated).
- Anthropic level changes require a catalog edit (single place).

## Guidance For Implementation

- Reproduction to start from: `None` committed; write AC-002/AC-004 adapter unit tests first (they fail on the base).
- Validate `reasoning_effort` against `ANTHROPIC_EFFORT_LEVELS`; an unknown value fails locally (server enum validation normally prevents it).
- Merge into an existing `output_config` object rather than replacing it (keeps e.g. a future structured-output `format`).
- The refusal applies whenever `thinking_enabled === false` (switch rows); no-switch rows never carry `thinking_enabled` (server validation).
- Live checks: `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault RUN_LIVE_PROVIDER_TESTS=1` (Anthropic key now in the test vault). pnpm is available via `corepack pnpm` in this environment.

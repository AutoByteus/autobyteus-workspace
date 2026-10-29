# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-003`
- Approved requirements baseline: `requirements-doc.md` at SR-002 (User, 2026-10-29), with SR-003 adding DEC-011 / AC-012 (User chose option B for the stopped-run edit fix, 2026-10-29). SR-001 design is superseded; unchanged parts are restated here.
- Behavior-defining supplements: None.
- Design status: `Ready`
- Canonical investigation-notes path: `/home/autobyteus/workspace/.codex/worktrees/claude-anthropic-effort-control/tickets/in-progress/claude-anthropic-effort-control/investigation-notes.md`
- Authorities read (2026-10-29): `references/architecture-design.md`, `references/design-principles.md`, project `DESIGN.md` (root), `autobyteus-server-ts/docs/design/data_migration_guideline.md` §2; design examples not used.
- Project design-principle conflicts or discrepancies: None. `GLOSSARY.md` holds no LLM-config words; terms are defined below.

## SR-002 Delta Against The SR-001 Implementation (WIP commit `781823e77`)

| Area | Keep from SR-001 | Change for SR-002 |
| --- | --- | --- |
| Catalog | effort on all 7 rows with API defaults; gen-4 rows and `claudeSchema` removed; Fable 5.1 schema | remove `thinking_display` from every Claude schema (Opus 5.5 = effort only; switch rows = `thinking_enabled` + `reasoning_effort`) |
| Policy | effort constants; legacy mode and fallback removed | drop `ANTHROPIC_THINKING_REQUIRED_EFFORT_LEVELS` if nothing else uses it |
| `AnthropicLLM` | `output_config.effort` mapping (merge), unknown-level check, legacy removal | effort not sent when `thinking_enabled === false` (no refusal); never send `display`; build the request only from the config keys the adapter owns (no raw forwarding of other stored config keys) |
| Web | budget removal | revert the independent-effort presentation: claude keys `thinking_enabled`, `reasoning_effort`; effort is the switch's dependent key again (existing merged list "Off · Low … Max"); remove `getIndependentThinkingParamKeys`, the xhigh/max web rule, the `chat.thinking.summaryWithEffort` key and the `ChatThinkingControl` height change if it was only for the extra groups; remove `thinking_display` handling |
| Docs/tests | as SR-001 | follow the above |

## SR-003 Delta (Design Impact CR-FO-001)

- Finding: a stopped AutoByteus agent/team/Org run whose stored `llmConfig` holds `thinking_display` cannot save settings changes: editable stopped-run cards pass `preserve-invalid-draft` (`RuntimeModelConfigFields.vue` L82), so `ModelConfigSection` skips `sanitizeModelConfigAgainstSchema` (L271-280) and the hidden key reaches server validation (SRC-022, evidence API-04/API-06). SR-002's premise "edit surfaces drop them" was wrong for this surface.
- Decision (DEC-011, user): editable model-settings drafts leave out keys the current schema does not declare. Invalid values of declared keys keep today's behavior (kept, shown with their field error, Save blocked).
- Owner: `ModelConfigSection.vue`'s schema-alignment step (the existing place that aligns a draft to the schema). With `preserveInvalidDraft`, it still drops undeclared keys and only preserves unrepresentable values of declared keys. Put the key filter in `utils/llmConfigSchema.ts` next to `sanitizeModelConfigAgainstSchema` (e.g. `withoutUndeclaredModelConfigKeys(schema, config)`), so both share one definition of "declared".
- Dirty/write constraint: the drop is an automatic alignment, not a user edit. Opening a stopped run's settings must not by itself enable Save or write anything (dirty stays a semantic comparison per `docs/agent_execution_architecture.md` L1449-1454). When the user saves a real change, the payload carries the config without undeclared keys. If the existing dirty comparison would treat the automatic drop as a change, compare against the original projected to declared keys (in the existing-run draft owners) rather than adding a separate flag.
- Coverage: agent, team and Org stopped-run edits all render `RuntimeModelConfigFields` → `ModelConfigSection`; verify the Org draft (`existingAgentOrgModelConfigDraft.ts`) and team draft (`existingTeamModelConfigDraft.ts`) use the emitted config for their payloads.
- Unchanged: read-only/historical views still list undeclared keys as residuals (`projectHistoricalModelConfigFields`); launch surfaces already sanitize; server validation unchanged; no data migration (option A rejected, DEC-011).
- Docs: `autobyteus-web/docs/settings.md` L1652-1660 and `docs/agent_execution_architecture.md` L1477-1483 — add: a key the current schema no longer declares cannot be edited, saved or sent; editable drafts leave it out; historical/read-only views still show it as a residual.
- Tests: web unit test of `ModelConfigSection` with `preserveInvalidDraft` (undeclared key dropped as automatic; invalid declared value preserved with error); existing-run draft tests showing no dirty state from opening alone and a saved payload without the key (agent, team, Org); rerun API-04, API-06 and the Org edit path (AC-012).
- Classification unchanged: Medium / Low (one shared web component + helper + docs/tests; no API, persistence or ownership change).

## Current-State Read

- The AutoByteus Claude catalog (`autobyteus-ts/src/llm/anthropic-supported-model-definitions.ts`, SRC-002/003) declares per-model schemas; on the base none declares effort; Opus 5.5 declares only `thinking_display`; Fable 5.1 nothing.
- Schemas flow unchanged to the server (strict validation, SRC-011) and the web, whose `llmThinkingConfigAdapter.ts` derives thinking semantics from schema keys (SRC-007) and `chatThinkingMenu.ts` builds the menu (SRC-009). The merged "Off · levels" list already exists for switch schemas whose effort is a dependent key (the Claude Agent SDK runtime's Claude schema uses it, SRC-013).
- `AnthropicLLM` (SRC-004) builds requests from `LLMConfig.extraParams` (a run's stored `llmConfig` keys land there, `llm-config-overrides.ts` L187-191) and forwards every non-internal key raw. Saved user runs hold `thinking_display` (SRC-019), so once it is no longer an owned key it would be forwarded raw and rejected by Anthropic (SRC-020).
- Display only controls whether Anthropic returns readable summary text; the signed thinking block (full encrypted reasoning) is returned and must be passed back either way, and our native-turn path already keeps and replays blocks with empty text (PRB-003, SRC-021).
- Root cause of the reported problem: effort never modeled in the catalog or request shaping (SRC-015), not a provider limitation (PRB-001).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale: production delta in 3 autobyteus-ts files (catalog, request policy, Anthropic adapter) and 3 web files (thinking adapter, thinking menu builder, schema-defaults helper); docs/tests in existing places. No new file, subsystem, API, route or persistence code. SR-002 shrinks the web delta.
- Architectural risk: `Low`
- Risk rationale: existing owners absorb the change; the new request field is additive and measured (PRB-001/002/003); persisted data directly usable through the adapter's owned-key projection; Claude Agent SDK runtime untouched.
- Escalation trigger: return a Design Impact if (a′) the automatic drop cannot be kept from marking stopped-run drafts dirty without changing the draft owners' dirty contract, (a) resuming a saved run whose config holds `thinking_display` is blocked by a server validation path (not only the adapter), (b) another production caller relies on raw forwarding of Anthropic config extra params, (c) a remaining model rejects a documented effort level live, or (d) another production caller constructs `AnthropicLLM` with a non-catalog model value.

## Architecture Investigation Evidence

| Source | Path / Reference | Observation | Design Decision Supported | Uncertainty |
| --- | --- | --- | --- | --- |
| SRC-001, SRC-008 | Anthropic effort + thinking docs | Levels/defaults per model; `omitted` is the display default on every remaining model; xhigh/max rejected with thinking off on several models | Levels, defaults; never send `display`; no effort while off | Future doc changes |
| PRB-001/002 | live probe | All levels accepted (Opus 5.5); 400 for between_tools+xhigh and invalid value | Mapping; no effort while off | — |
| PRB-003, SRC-021 | live round trip; native turn code | Omitted blocks keep full signatures; pass-back works; stripping silently loses reasoning; we already replay blocks with empty text | Display removal is presentation-only | Fable 5.1 round trip not completed (max_tokens) |
| SRC-004, SRC-020 | `anthropic-llm.ts` L72-82, L107-113, L203-231 | Non-internal config keys forwarded raw | Owned-key projection | — |
| `llm-config-overrides.ts` L187-191 | autobyteus-ts | Stored config keys become extraParams | Same | — |
| SRC-005 | policy L13-54 | `legacy_budget`/fallback only for Sonnet 4.6/test fixtures | Removal | — |
| SRC-007, SRC-009, SRC-013 | web adapter/menu; Claude SDK schema | Merged list exists for dependent effort | Reuse existing list | — |
| SRC-011, SRC-017, SRC-018, SRC-019 | validation; unavailable model; pricing; user data | Removed IDs/keys handled by existing paths; definitions hold no `thinking_display` | Persisted data: Directly Usable | — |

## Intended Change

Add `reasoning_effort` to every Claude catalog schema and remove `thinking_display`; in `AnthropicLLM` send `output_config.effort` while thinking is not off, never send `display`, and build requests only from owned config keys; the web shows the existing one-list "Off · Low … Max" for Claude switch schemas and an effort-only list for Opus 5.5/Fable 5.1; remove gen-4 Claude rows and the fixed-budget machinery.

## Change Scope (Mandatory)

- In scope: UC-001..UC-004. Areas: `autobyteus-ts/src/llm` Anthropic catalog/policy/adapter; `autobyteus-web` thinking adapter, menu builder, schema-defaults helper; docs and tests describing these.
- Derived consumers: catalog schema → server GraphQL `configSchema` and `model-config-schema-validation` (no change); web `normalizeModelConfigSchema` → thinking adapter/menu (changed), `modelOptions.otherModelSettingKeys` (no change; with display gone Opus 5.5 has no other-setting row), `explicitModelConfig`/`getDefaultThinkingConfig` (writes `thinking_enabled:false` and the effort default for switch rows, effort default for no-switch rows — harmless: effort is not sent while off, and the default equals the API default), ModelConfigSection form (follows adapter; launch surfaces drop stale keys via `sanitizeModelConfigAgainstSchema`; stopped-run edit surfaces drop undeclared keys per SR-003), historical views (stale keys shown as residuals, existing rule).
- Deliberately left alone: Claude Agent SDK runtime presentation and backend (FU-003); per-model off shapes (FU-001); prompt caching; non-Anthropic providers; per-call kwargs forwarding in `AnthropicLLM`; per-message effort.
- Follow-ups: FU-001, FU-002, FU-003.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | REQ / AC | Trigger | Existing Behavior | Approved Change / Preserved | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001/002/006/010, AC-001/002/006 | Thinking on Opus 5.5 | hidden menu + display row | effort-only list (default Medium); no display row | DS-001, DS-002 |
| BEH-002 | User | REQ-001/002/004, AC-001/005 | Thinking on switch rows | Off/On + display | one list Off · levels; Fable 5.1 effort list | DS-001, DS-002 |
| BEH-003 | System | REQ-003/008, AC-002/008 | Run turn | no effort | `output_config.effort` when configured and thinking not off | DS-001 |
| BEH-004 | User/System | REQ-004/005, AC-003/004 | Off with stored effort | — | off shape, no effort | DS-001, DS-002 |
| BEH-005 | Operational | REQ-007, AC-007 | Model list | gen-4 rows | removed | DS-003 |
| BEH-006 | User | REQ-009, AC-005 | Claude SDK menu | one list | unchanged | DS-002 |
| BEH-007 | User/System | REQ-010/011, AC-010/011 | Any request; resumed run | display setting; stored key | no display; stored keys ignored | DS-001 |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature` (plus `Cleanup`).
- Current design issue found: `Yes`, small: `AnthropicLLM` treats the schema-owned run config as a raw passthrough, so any key a schema stops declaring breaks saved runs (SRC-020).
- Structural triggers: *Persisted-data transition* fires (schema key removal with stored values) → owned-key projection (tolerant reader, Principle 5). *Legacy cleanup* fires → fixed-budget machinery removed. *Several kinds or forms* — thinking menu kinds: Claude switch schemas (AutoByteus gen-5, Claude SDK) use the existing merged list; Claude no-switch schemas (Opus 5.5, Fable 5.1) use the generic per-parameter path; other providers unchanged. *Behavior by absence* — the policy fallback is removed; "effort not sent while off" is an explicit rule. Ruled out: repeated coordination, responsibility overload (files < 500 lines), boundary bypass, vocabulary drift (`reasoning_effort` already means effort everywhere).
- Root cause classification: `Missing Invariant` for the passthrough (the adapter should only send what it owns); otherwise a missing capability.
- Refactor needed now: `Yes`, local: replace raw forwarding of config extra params in `applyAnthropicRequestParams` with reading the owned keys.
- Evidence: SRC-004, SRC-019, SRC-020, `llm-config-overrides.ts` L187-191.
- Design response: see DS-001.
- Refactor rationale: required by REQ-011; the only config keys Anthropic rows ever validly hold are schema keys, all owned.
- Intentional deferrals: FU-001, FU-003.

## Terminology

- **Effort**: Anthropic `output_config.effort`; config key `reasoning_effort`; levels `low | medium | high | xhigh | max` (labels humanized from the schema).
- **Thinking switch**: `thinking_enabled`; **off shape**: per-model value sent when off (policy `thinkingOffShape`).
- **Owned config keys**: the config keys `AnthropicLLM` interprets — `thinking_enabled`, `reasoning_effort`.

## Legacy Removal Policy (Mandatory)

- Obsolete: gen-4 Claude rows; `claudeSchema`; `legacy_budget`, `LEGACY_BUDGET_POLICY`, unknown-value fallback; budget construction, `thinking_budget_tokens` handling and temperature-0 default; `thinking_display` (schemas, adapter internal key, `adaptiveThinking` display branch, web handling); raw forwarding of non-owned config extra params.
- Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision (Mandatory)

- Stored subject: saved runs (run metadata, team/org execution trees), definitions, launch profiles — `llmModelIdentifier`, `llmConfig` JSON.
- Change: gen-4 rows removed; `reasoning_effort` added; `thinking_display` and `thinking_budget_tokens` no longer declared.
- Readers: `AnthropicLLM` (via `LLMConfig.extraParams`), server strict validation on model replacement / Org launch / stopped-run edit (SRC-011, SRC-020), web edit surfaces (sanitize to schema) and historical views (residuals).
- Evidence: user data holds `thinking_display: "omitted"` in a run and a team run, none in definitions (SRC-019).
- Semantics under direct use: `AnthropicLLM` reads only owned keys, so stale keys are inert (and `omitted` is what they mostly held — now the provider default); edit surfaces drop them on save; historical views show them as residuals; configs naming removed models show the unavailable-model state.
- Decision: `Directly Usable — No Migration`.
- Rationale: a generic owned-key projection is a tolerant reader, not version branching; rewriting run trees would cost I/O and risk for no semantic gain. Migration checklist: need none (no meaning change of a stored name); availability unaffected; disposition: retained as-is; cost none; references unchanged; evidence AC-011.
- Supported ACs: AC-007, AC-008, AC-011.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior IDs | Start | End | Governing Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001..004, BEH-007 | User picks a level / sends a message / resumes a run | Anthropic request | `AnthropicLLM` | Correct thinking/effort, no stale keys |
| DS-002 | Primary End-to-End | BEH-001/002/004/006 | Model selected in a thinking surface | `llmConfig` update | `llmThinkingConfigAdapter` | Users see and set effort |
| DS-003 | Primary End-to-End | BEH-005 | Catalog listing | Model menu | catalog definitions | Obsolete rows disappear |

## Primary Execution Spine(s)

- DS-001: `Web thinking control -> Server run config (schema validation where applicable) -> run LLMConfig (llm-config-overrides) -> AnthropicLLM.buildRequestParams -> applyAnthropicRequestParams (policy, owned keys, thinking, effort) -> @anthropic-ai/sdk -> Anthropic Messages API`
- DS-002: `Catalog schema -> Server GraphQL configSchema -> normalizeModelConfigSchema -> llmThinkingConfigAdapter -> buildChatThinkingMenu / ModelConfigSection -> llmConfig update`
- DS-003: `anthropicSupportedModelDefinitions -> LLMFactory catalog -> Server model catalog GraphQL -> Web model menu`

## Spine Narratives (Mandatory)

| Spine | Narrative | Main Nodes | Owner | Off-Spine |
| --- | --- | --- | --- | --- |
| DS-001 | `applyAnthropicRequestParams` resolves the policy, reads `thinking_enabled` and `reasoning_effort` from the config (other config keys are not read or forwarded), applies per-call kwargs as today, runs strict rules (adaptive-required, forced tool choice, unknown effort level), builds `thinking` (`{type:'adaptive'}` without `display`, or the off shape), and sets `output_config.effort` only when an effort is configured and `thinking_enabled !== false`. | config, policy, request | `AnthropicLLM` | effort constants |
| DS-002 | Claude switch schema keys: `thinking_enabled`, `reasoning_effort`; effort is the switch's dependent key, so the existing merged list renders "Off · Low · Medium · High · Xhigh · Max" (picking a level writes thinking on + effort; Off writes thinking off and keeps the stored effort, which the backend ignores while off). No-switch Claude schemas (`reasoning_effort` only) use the existing per-parameter path: one effort list. | schema, adapter, menu | adapter | menu builder |
| DS-003 | Gen-4 rows deleted. | catalog | catalog | docs |

## Spine Actors / Main-Line Nodes

Catalog definitions; server validation (unchanged); `AnthropicLLM`; web thinking adapter; web menu builder.

## Ownership Map

- Catalog: which settings each model exposes, levels, defaults.
- Policy file: per-model Anthropic request facts and `ANTHROPIC_EFFORT_LEVELS`.
- `AnthropicLLM`: config → valid request; owns the interpretation of `thinking_enabled`/`reasoning_effort` and the rule "no effort while off".
- Web adapter: thinking semantics in the UI; menu builder: presentation only.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A.

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| Rows `claude-opus-4.8`, `claude-opus-4.7`, `claude-sonnet-4.6`; `claudeSchema` | User decision; dead | — | done in WIP |
| `legacy_budget`, `LEGACY_BUDGET_POLICY`, gen-4 policy entries, unknown-value fallback | Dead / behavior by absence | exact lookup, unknown throws | done in WIP |
| Budget construction, `thinking_budget_tokens`, temperature-0 branch in `AnthropicLLM` | Dead | sampling stripped for all | done in WIP |
| `thinking_display` in every Claude schema; adapter internal key; display branch of `adaptiveThinking` | User decision (REQ-010) | provider default `omitted` | new |
| Raw forwarding of non-owned config extra params (`filterInternalExtraParams` + `applySafeProviderRequestKwargs(request, providerExtraParams)`) and reading explicit `thinking` from config | Missing invariant (stale keys reach Anthropic) | owned-key reads | new; per-call kwargs forwarding unchanged |
| Effort refusal "requires thinking on" and `ANTHROPIC_THINKING_REQUIRED_EFFORT_LEVELS` (if unused) | REQ-005 revised | effort not sent while off | new |
| Web: `getIndependentThinkingParamKeys`, independent-effort merged-menu branch, xhigh/max rule in choice/toggle/dependent-edit, `chat.thinking.summaryWithEffort` (en, zh-CN), `thinking_display` in `PROVIDER_KEYS.claude`/`DEPENDENT_KEYS.claude` | REQ-004/010 revised | existing merged list with dependent effort | revert WIP parts |
| Web budget handling (adapter, `llmConfigSchema.ts` L304-306) | Dead | — | done in WIP |
| Tests/docs for removed models, budget, display, independent effort | Describe removed behavior | current behavior | |

## Return Or Event Spine(s) (If Applicable)

N/A — response handling unchanged (native thinking blocks still stored and replayed, SRC-021).

## Bounded Local / Internal Spines (If Applicable)

`applyAnthropicRequestParams`: `resolve policy -> read owned config keys -> apply per-call kwargs -> strict rules -> sanitize explicit (kwargs) thinking -> thinking from switch -> effort (if set and not off) -> strip sampling`.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| `ANTHROPIC_EFFORT_LEVELS` | DS-001 | `AnthropicLLM`, catalog | one level list | single update point | drift |

## Ownership Boundaries

Catalog = data; `AnthropicLLM` is the only Anthropic request builder and the only policy consumer; web semantics in the adapter.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass | Fix If Thin |
| --- | --- | --- | --- | --- |
| `AnthropicLLM` | policy, owned config interpretation | agent runtime via `LLMFactory` | adding request fields from config elsewhere | extend `applyAnthropicRequestParams` |
| `llmThinkingConfigAdapter` | thinking semantics | menu, form, defaults | menu/form hard-coding rules | adapter function |

## Dependency Rules

- Catalog may import `ANTHROPIC_EFFORT_LEVELS` from the policy file.
- Web menu/form depend on the adapter, never the reverse.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity | Notes |
| --- | --- | --- | --- | --- |
| `resolveAnthropicModelRequestPolicy(modelValue)` | Anthropic model | per-model facts | exact catalog value | throws for unknown |
| `ANTHROPIC_EFFORT_LEVELS` | Anthropic effort | vocabulary | — | |

## Interface Boundary Check

| Interface | Singular | Explicit Identity | Ambiguity | Action |
| --- | --- | --- | --- | --- |
| policy lookup | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | Natural | Same Everywhere | Drift | Action |
| --- | --- | --- | --- | --- | --- |
| effort key | `reasoning_effort` | Yes | Yes | Low | keep |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| Per-model levels/defaults | catalog `ParameterDefinition` | Reuse | per-model settings owner |
| One-list presentation | merged menu with dependent effort (Claude SDK path) | Reuse | already the requested UX |
| Effort-only presentation | per-parameter path | Reuse | no change needed |
| Stale stored keys | web sanitize + residuals | Reuse | existing product rule |

## Subsystem / Capability-Area Allocation

| Area | Concerns | Spine | Decision |
| --- | --- | --- | --- |
| autobyteus-ts catalog | schemas, rows | DS-001/003 | Extend/Remove |
| autobyteus-ts Anthropic adapter | effort, owned keys, removals | DS-001 | Extend/Remove |
| autobyteus-web thinking | key lists, budget/display removal | DS-002 | Remove (mostly) |

## Draft File Responsibility Mapping

As final mapping.

## Reusable Owned Structures Check

| Repeated Structure | Shared File | Owner | Why | Redundant Removed | Overlap Removed | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Effort parameter (levels + default) | file-local `claudeEffortParameter(defaultValue)` | catalog | every Claude schema | Yes | Yes | cross-provider helper |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning | Redundant Removed | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| `AnthropicModelRequestPolicy` | Yes | Yes | Low | — |

## Final File Responsibility Mapping

| File | Concern | Change |
| --- | --- | --- |
| `autobyteus-ts/src/llm/anthropic-supported-model-definitions.ts` | rows + schemas | effort on all rows (Opus 5.5, Haiku 5.5 medium; others high); no `thinking_display`; switch rows `thinking_enabled` + `reasoning_effort` (Sonnet 5.5 description notes Off sends `between_tools`); Opus 5.5 and Fable 5.1 effort only; gen-4 rows and `claudeSchema` removed |
| `autobyteus-ts/src/llm/api/anthropic-model-request-policy.ts` | facts + effort vocabulary | as WIP; drop unused constants |
| `autobyteus-ts/src/llm/api/anthropic-llm.ts` | request shaping | owned-key reads; no `display`; effort only when not off; no refusal; unknown-level check kept |
| `autobyteus-web/utils/llmThinkingConfigAdapter.ts` | semantics | `PROVIDER_KEYS.claude = [thinking_enabled, reasoning_effort]`, `DEPENDENT_KEYS.claude = [reasoning_effort]`; no budget/display; no independent/xhigh-max rule |
| `autobyteus-web/components/chat/chatThinkingMenu.ts` | presentation | back to the base merged-menu shape (minus budget) |
| `autobyteus-web/components/chat/ChatThinkingControl.vue` | control | revert WIP changes not needed for the base shape |
| `autobyteus-web/utils/llmConfigSchema.ts` | defaults helper | budget block removed (WIP) |
| `autobyteus-web/localization/messages/{en,zh-CN}/chat.ts` | i18n | remove `chat.thinking.summaryWithEffort` |
| `autobyteus-web/components/run-settings/useRunSettingsPresentation.ts` | presentation | revert WIP change if it only served the independent group |
| `autobyteus-web/components/workspace/config/ModelConfigSection.vue` | settings form | SR-003: schema alignment drops undeclared keys even with `preserveInvalidDraft` (automatic) |
| `autobyteus-web/utils/llmConfigSchema.ts` | schema helpers | SR-003: undeclared-key filter shared with `sanitizeModelConfigAgainstSchema` |

## Applied Patterns (If Any)

None.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Responsibility | Must Not Contain |
| --- | --- | --- | --- |
| files above | File | as mapped | request shaping in the catalog; effort rules in the menu or templates |
| Docs: `autobyteus-ts/docs/provider_model_catalogs.md` (rows, request-shape table: no display, effort rule, owned keys), `autobyteus-web/docs/chat.md` (Thinking menu: Claude rows use the one list; no display), `autobyteus-web/docs/settings.md` | File | current behavior | removed models, budget, display, independent effort |
| Tests: as SR-001 list, plus adapter tests for AC-003/004/010/011 (stale `thinking_display`/`thinking_budget_tokens` in config not sent; off + effort → no `output_config`), catalog test for AC-010, a server-level resume test with a stored config holding `thinking_display` (AC-011), web adapter/menu specs back to one list (AC-005/006) | File | prove ACs | — |

## Folder Boundary Check

| Folder | Depth | Clear | Risk | Note |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/api` | adapter | Yes | Low | unchanged |
| `autobyteus-web/utils`, `components/chat` | presentation | Yes | Low | unchanged |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Sonnet 5.5, Off with stored max | `{ thinking: { type: 'between_tools' } }` (no `output_config.effort`) | adding `output_config.effort: 'max'` → 400 | AC-003 |
| Sonnet 5.5, High | `{ thinking: { type: 'adaptive' }, output_config: { effort: 'high' } }` | `thinking: { type: 'adaptive', display: 'summarized' }` | AC-003, AC-010 |
| Resumed Opus 5.5 run, stored `{ thinking_display: 'omitted', reasoning_effort: 'max' }` | `{ thinking: { type: 'adaptive' }, output_config: { effort: 'max' } }` | top-level `thinking_display: 'omitted'` → 400 | AC-011 |
| Menu on `claude-sonnet-5-5` | `Off ✓ · Low · Medium · High · Xhigh · Max`; trigger "Off" | Off/On + effort group + display | AC-005 |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Aliases for removed gen-4 IDs | saved configs | Rejected | unavailable-model state |
| Keep `thinking_display` hidden in schemas | saved configs pass strict validation | Rejected | owned-key projection + existing sanitize/residual rules |
| Ignore `thinking_display` by name in the adapter | stale key | Rejected (version-specific) | generic owned-key projection |
| Migration stripping stored keys | clean data | Rejected (cost, no semantic gain) | tolerant reader |
| Keep `legacy_budget` for non-catalog models | test fixtures | Rejected | catalog values in fixtures |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. `AnthropicLLM`: owned-key reads; remove display and the refusal; effort only when not off; adapter unit tests first (AC-003/004/010/011).
2. Catalog: drop `thinking_display`; catalog tests (AC-001/010).
3. Web: revert independent-effort work to the base merged-menu shape with claude keys `thinking_enabled` + dependent `reasoning_effort`; remove display/budget/i18n leftovers; specs (AC-005/006).
4. Server-level resume test with a stored `thinking_display` config (AC-011).
5. Docs; grep audit for removed IDs, `thinking_budget_tokens` and `thinking_display` outside `tickets/` and the historical-residual code (AC-007/010).
6. Live re-check only where the request shape changed: one request per switch row with thinking off + stored effort, and Opus 5.5 with a stored `thinking_display` (AC-004/009/011); the IMP-05 effort-on results stay valid for unchanged shapes.
7. Rendered check of the one-list menu (Fable 5, Sonnet 5.5) and Opus 5.5 run settings (AC-005/006).

## Key Tradeoffs

- One list (user) loses thinking-off with non-default effort.
- Owned-key projection removes raw config passthrough for Anthropic; per-call kwargs remain the programmatic escape hatch.
- Not sending effort while off (instead of refusing) can silently ignore an API-saved off+effort combination; consistent with "Off means thinking off".

## Risks

- Sonnet 5.5 progress notes no longer visible (accepted, DEC-010).
- Changing effort mid-run restarts that run's prompt cache (provider behavior).
- Anthropic level changes need a catalog edit (one place).

## Guidance For Implementation

- Reproduction: write AC-011 adapter test first (stored `thinking_display` must not reach the request; fails on the WIP if the key is removed from internal keys without the projection).
- Owned keys: read `thinking_enabled` and `reasoning_effort` directly from `configExtraParams`; do not forward other config keys; keep `kwargs` handling as is (including explicit `thinking` sanitization from kwargs).
- Validate `reasoning_effort` against `ANTHROPIC_EFFORT_LEVELS` (unknown → local error); merge into an existing `output_config` (kwargs may carry one).
- Live checks: `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault RUN_LIVE_PROVIDER_TESTS=1`; pnpm via `corepack pnpm`.

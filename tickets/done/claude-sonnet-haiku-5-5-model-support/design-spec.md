# Design Spec — Claude Sonnet 5.5 and Claude Haiku 5.5 support in autobyteus-ts

## Solution And Approval Basis

- Current solution revision ID: `SR-007` (design revision from independent code review CRR-001; see [Revision SR-007](#revision-sr-007--independent-code-review-crr-001) — it supersedes the earlier sections where they differ)
- Approved requirements baseline: `requirements-doc.md` (REQ-001..REQ-013, AC-001..AC-012; DEC-001=A, DEC-002=A, DEC-003=A). User approval in conversation on 2026-10-09: "approve. i think you are following industry practices". SR-007 changes no intended behavior; the approval still applies.
- Behavior-defining supplements: None.
- Design status: `Ready` (revised SR-007)
- Canonical investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-5-5-model-support/tickets/in-progress/claude-sonnet-haiku-5-5-model-support/investigation-notes.md` (see "Architecture Investigation Findings" AF-001..AF-015 and "SR-007 Investigation" AF-016..AF-022)
- Authorities read (2026-10-09): `references/architecture-design.md`, `design-principles.md`, `templates/design-spec-template.md`; project `DESIGN.md` (repo root) and `TESTING.md`. There is no `autobyteus-ts`-specific `DESIGN.md`. `design-examples.md` was not used. Re-read for SR-007 (2026-10-11): `architecture-design.md`, `design-principles.md`, `requirements-engineering.md`; `DESIGN.md` and the rewritten `TESTING.md` from `origin/personal` @ `d72d2018b`.
- Project design-principle conflicts: None. The root `DESIGN.md` rules "smallest coherent owner", "remove unnecessary work before adding complexity" and "no speculative machinery" all favor the bounded policy extraction below over more model-specific branches.
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-5-5-model-support`, branch `codex/claude-5-5-model-support`, based on `origin/personal` @ `ff227eb72`; SR-007 requires rebasing onto `origin/personal` @ `d72d2018b` (or newer). Finalization target: `origin/personal`.

## Current-State Read

The Anthropic catalog (`src/llm/anthropic-supported-model-definitions.ts`) defines rows whose `llmClass` is `AnthropicLLM`. `AnthropicLLM.buildRequestParams` (one builder shared by the sync and streaming paths) calls `applyAnthropicRequestParams`, which shapes `thinking`, the sampling parameters and the `tool_choice` checks from a model-request policy (AF-001).

The policy is spread across three mechanisms:
- a prefix-matched adaptive family list;
- a prefix match for `claude-sonnet-5` that decides whether thinking can be turned off with `disabled`;
- two `modelValue === 'claude-opus-5-5'` special-case blocks.

Prefix matching would classify `claude-sonnet-5-5` as Sonnet 5, which sends `disabled` and gets a 400. It would leave `claude-haiku-5-5` unclassified, which injects `temperature: 0` and gets a 400.

Pricing (including prompt-size tiers), the provider-native turn preservation, the prefix-bound reasoning strip, prompt caching and the frontend thinking controls are all provider-generic or schema-driven. They already handle the new models (AF-005..AF-008).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale: one new small policy file and one adapter file reshaped in the Anthropic LLM area; two catalog rows with one schema; unit tests in autobyteus-ts and one server pricing unit case; two docs. All within the existing `src/llm` ownership. No new subsystem.
- Architectural risk: `Low`
- Risk rationale: no API, GraphQL, persistence, security, concurrency, deployment or ownership-boundary change. The catalog and pricing contracts are consumed unchanged. The refactor changes how request policy is *represented* for every Anthropic model but must keep every existing model's request shape (REQ-012). The existing per-model adapter tests, plus a new per-model policy table test, pin this down. The SDK already types `between_tools` (AF-004).
- Escalation trigger: if any existing Anthropic test needs its *expected payload* changed (not just new rows or order), stop and return a Design Impact. The same applies if the live API rejects a shape the docs say is accepted, or if the frontend shows a different control set for the new schemas than for Sonnet 5.

## Architecture Investigation Evidence

| Source | Path / Reference | Observation | Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| AF-001/002 | `src/llm/api/anthropic-llm.ts` L72-213 | Policy is fragmented (family prefix list, Sonnet-5 prefix, two Opus 5.5 special cases); `rejectsSamplingParameters` duplicates `usesAdaptiveThinking` | One explicit per-model policy table, keyed by exact value | — |
| AF-003 | `rg` for dated IDs; catalog is static | Model values are only exact catalog values | Exact lookup is safe; unknown values stay on the legacy policy | — |
| AF-004 | `@anthropic-ai/sdk@0.132.1` `messages.d.ts` L3951-3990 | The `between_tools` thinking type is typed | No SDK change | — |
| AF-005/006 | server `token-usage-component-basis.ts`, `token-cost-calculator.ts`; `llm-model-pricing.ts` | gross = input + cache read + cache creation, chosen per call with `<=` | Haiku tiers in the catalog only | — |
| AF-007 | `autobyteus-web/utils/runSettings/explicitModelConfig.ts`, `llmThinkingConfigAdapter.ts` | Start surfaces write schema thinking defaults explicitly; the UI is schema-driven | Defaults live in the schema; adapter semantics are unchanged | Visual confirmation during validation |
| AF-008 | `anthropic-native-history-policy.ts`, `retained-reasoning-prefix-binding.ts` | Keyed by provider | No new continuity code | — |
| Anthropic docs | thinking page config table; whats-new pages; pricing page | Accepted thinking shapes, forced-tool-choice rule, prices | Policy table rows; pricing rows | Live behavior (AC-011) |

## Intended Change

1. Replace the fragmented model-request policy with **one explicit, exact-value Anthropic model request policy** in its own file, consumed by `applyAnthropicRequestParams`. It reproduces every existing model's behavior and adds rows for Sonnet 5.5 and Haiku 5.5.
2. Add the two catalog rows: metadata, Standard pricing (Haiku tiered) and thinking schemas. Sonnet 5.5's display defaults to `summarized`.
3. Tests and docs.

## Relevant Behavior And Production-Path Map

| Behavior ID | Kind | Requirement / AC | Trigger | Existing Behavior / Evidence | Approved Change / Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, 002, 005, 008, 013 / AC-001, 006, 012 | User picks a model in the frontend picker | Catalog → server model list → schema-driven UI (AF-007) | Two new rows with schemas | DS-002 |
| BEH-002 | System | REQ-005..012 / AC-004..011 | Agent LLM call | `buildRequestParams` → `applyAnthropicRequestParams` (AF-001) | Request shaping per model from the policy table; existing shapes preserved | DS-001 |
| BEH-003 | System | REQ-003, 004 / AC-002, 003 | Usage observation costed | Catalog pricing → server tier selection (AF-005/006) | New prices/tiers; calculator unchanged | DS-003 |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature`
- Current design issue found: `Yes`
- Structural triggers that fire:
  - **Duplicated policy / repeated special-casing.** Model capability rules are expressed three different ways (AF-001). Adding the new models directly would add a fourth and fifth (`modelValue === 'claude-sonnet-5-5'` / `'claude-haiku-5-5'` branches), plus a prefix-ordering hazard (`claude-sonnet-5-5` vs `claude-sonnet-5`).
  - **Shared-structure looseness.** The policy type cannot express *which* off shape a model accepts (`disabled` vs `between_tools` vs none), or forced-tool-choice rejection outside one hard-coded model. `rejectsSamplingParameters` is redundant (AF-002).
  - Ruled out: ambiguous boundary (the adapter is the sole consumer); persisted data (none); shared-folder misuse.
- Root cause classification: `Duplicated Policy Or Coordination` (with `Shared Structure Looseness`)
- Refactor needed now: `Yes` (bounded)
- Evidence: AF-001, AF-002, AF-003.
- Design response: extract `anthropic-model-request-policy.ts` holding one exact-value table of per-model capabilities. The adapter consumes only the resolved policy. Remove the prefix matcher, the old policy type and both Opus 5.5 special-case blocks; their behavior moves into the policy fields and generic adapter logic.
- Refactor rationale: it is the smallest change that makes the new models correct without more special cases, and it shrinks the adapter.
- Intentional deferrals: AF-011 (Opus 5 could send `disabled` when off) and Fable 5.1's forced-tool-choice rejection (per Anthropic docs) are *not* changed (REQ-012). They become trivial one-field follow-ups in the table.

## Terminology

- **Off shape**: the `thinking` value sent when the user's thinking toggle is off. One of `{type:'disabled'}`, `{type:'between_tools'}`, or *omit* (send no `thinking`).
- **Thinking mode**: `legacy_budget` (fixed `budget_tokens`, sampling allowed), `adaptive` (adaptive thinking, sampling stripped) or `adaptive_required` (adaptive always sent; caller attempts to disable it, or to send sampling, fail locally — the current Opus 5.5 behavior).

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Removed in this change: `matchesAnthropicModelFamily`, the old `AnthropicModelRequestPolicy` type and `resolveAnthropicModelRequestPolicy` in `anthropic-llm.ts`, and both `modelValue === 'claude-opus-5-5'` blocks. "Legacy budget" thinking for older Claude rows is supported current behavior (Sonnet 4.6 is an active catalog row), not legacy code.

## Persisted Data / State Transition Decision

`Not Affected`. The change adds static catalog rows and request shaping. Stored token-usage records keep their captured prices (existing behavior). There are no stored-schema changes.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-002 | Agent LLM phase invokes `BaseLLM` send/stream | Anthropic Messages API request accepted; response/native turn returned | `AnthropicLLM` (request owner) using the model request policy | Where the 400-inducing shapes would originate |
| DS-002 | Primary End-to-End | BEH-001 | Frontend model picker | Run config with schema-default thinking keys | Static Anthropic catalog | New rows and defaults |
| DS-003 | Primary End-to-End | BEH-003 | Anthropic usage observation | Costed token usage | Server `TokenCostCalculator` using catalog pricing | Haiku tier correctness |

## Primary Execution Spine(s)

- DS-001: `Agent LLM phase → AnthropicLLM.buildRequestParams → applyAnthropicRequestParams (+ resolveAnthropicModelRequestPolicy) → Anthropic SDK messages.create → response / provider-native turn`
- DS-002: `Frontend picker → server model catalog (LLMModel.configSchema) → schema-driven Thinking menu → explicit llmConfig {thinking_enabled, thinking_display} → AnthropicLLM config.extraParams`
- DS-003: `AnthropicLLM usage observation (base_excludes_cache) → server component basis (gross incl. cache) → TokenCostCalculator.selectTier (catalog input_price_tiers) → cost`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Nodes | Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The adapter builds the base request, resolves the policy for `model.value`, and merges safe extra params and kwargs. It then (1) validates the strict rules (forced tool choice; `adaptive_required` disable and sampling attempts), (2) sanitizes any explicit `thinking` to a shape the model accepts, (3) builds `thinking` from the toggle when there is no explicit thinking, and (4) strips sampling, or injects the legacy `temperature: 0`. | AnthropicLLM, applyAnthropicRequestParams | AnthropicLLM | Model request policy (lookup); provider-request-kwargs (safe merge) |
| DS-002 | The schema defaults set the first-shown thinking state; the user can change it per run. | Catalog, UI | Catalog | — |
| DS-003 | The gross input selects the Haiku tier per call. | Calculator | Server pricing | — |

## Spine Actors / Main-Line Nodes

`AnthropicLLM` (request build), `applyAnthropicRequestParams` (request shaping, inside the adapter file), Anthropic SDK, static Anthropic catalog, server `TokenCostCalculator`.

## Ownership Map

- `AnthropicLLM` / `applyAnthropicRequestParams`: the sequencing of request shaping and the local validation errors.
- `anthropic-model-request-policy.ts`: the per-model provider capability facts (data plus a pure lookup). It owns no request mutation.
- Catalog: model identity, metadata, prices, schemas (default thinking state).
- Server calculator: unchanged.

## Thin Entry Facades / Public Wrappers

N/A.

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| `matchesAnthropicModelFamily` (anthropic-llm.ts) | Prefix matching misclassifies `*-5-5`; dated IDs are unused (AF-003) | Exact-value table lookup | In This Change | — |
| `AnthropicModelRequestPolicy` type + `resolveAnthropicModelRequestPolicy` (anthropic-llm.ts) | Loose and redundant shape (AF-002) | `AnthropicModelRequestPolicy` in the new policy file | In This Change | Same name, new home and shape |
| Both `modelValue === 'claude-opus-5-5'` blocks | Special cases | `thinkingMode: 'adaptive_required'` + `rejectsForcedToolChoice` | In This Change | SR-007: the error messages name the model from `modelValue` (existing tests match substrings only, AF-019) |
| Opus 5 `disabled` support; Fable 5.1 forced-tool-choice rejection | Not dead — preserved behavior | — | Follow-up | Separate ticket candidates (AF-011) |

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk If On Main Line |
| --- | --- | --- | --- | --- | --- |
| Anthropic model request policy | DS-001 | AnthropicLLM | Exact-value capability table + `resolveAnthropicModelRequestPolicy(modelValue)` | One authoritative source of per-model provider rules | Rules re-scatter into adapter branches |
| Safe kwargs merge (`provider-request-kwargs.ts`) | DS-001 | AnthropicLLM | Existing; unchanged | — | — |

## Ownership Boundaries

`AnthropicLLM` is the only consumer of the policy. The policy file must not import the adapter, the SDK client or the catalog. The catalog must not encode request-shaping rules beyond schema defaults.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass | Fix If Thin |
| --- | --- | --- | --- | --- |
| `AnthropicLLM` | request shaping + policy lookup | `BaseLLM` callers / LLM factory | Callers building Anthropic thinking payloads themselves | Extend the policy fields |

## Dependency Rules

`anthropic-llm.ts → anthropic-model-request-policy.ts` (allowed). The policy file is a leaf (no imports beyond types). Tests may import the policy file directly for the table test.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `resolveAnthropicModelRequestPolicy(modelValue: string): AnthropicModelRequestPolicy` | One Anthropic API model value | Return the capability facts | Exact Anthropic API model value (`LLMModel.value`) | Every catalog row has an explicit entry (SR-007). The function stays total: a value without a row (only non-catalog test fixtures, AF-020) gets the fixed-budget policy |

## Interface Boundary Check

| Interface | Singular | Explicit Identity | Ambiguity | Action |
| --- | --- | --- | --- | --- |
| `resolveAnthropicModelRequestPolicy` | Yes | Yes (exact value; prefix matching removed) | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | Natural | Drift | Action |
| --- | --- | --- | --- | --- |
| Policy file | `anthropic-model-request-policy.ts` | Yes | Low | Matches the sibling `anthropic-native-history-policy.ts` |
| Off-shape field | `thinkingOffShape` | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision | Why |
| --- | --- | --- | --- |
| Tiered pricing | `TokenPricingConfig.inputTokenPricingTiers` + server `selectTier` | Reuse | Exact fit (AF-005/006) |
| Thinking continuity | provider-native history policy | Reuse | Provider-keyed (AF-008) |
| UI controls | schema-driven thinking adapter | Reuse | AF-007 |
| Per-model rules | adapter-local policy | Extend → extract | See health assessment |

## Subsystem / Capability-Area Allocation

| Area | Owns | Spine | Decision |
| --- | --- | --- | --- |
| `autobyteus-ts/src/llm/api` (Anthropic adapter) | Request shaping + model request policy | DS-001 | Extend |
| `autobyteus-ts/src/llm` (catalog) | Rows, prices, schemas | DS-002/003 | Extend |
| Server token-usage pricing | Tier selection | DS-003 | Reuse (test only) |

## Draft → Final File Responsibility Mapping

| File | Area | Concern | Why One File |
| --- | --- | --- | --- |
| `autobyteus-ts/src/llm/api/anthropic-model-request-policy.ts` (Add) | Anthropic adapter | Policy type, exact-value table, resolver | One cohesive fact table |
| `autobyteus-ts/src/llm/api/anthropic-llm.ts` (Modify) | Anthropic adapter | Request shaping driven by the policy | Existing owner |
| `autobyteus-ts/src/llm/anthropic-supported-model-definitions.ts` (Modify) | Catalog | Two rows + `claudeSonnet55Schema` | Existing owner |
| `autobyteus-ts/tests/unit/llm/api/anthropic-model-request-policy.test.ts` (Add) | Tests | Table pins every catalog model's policy, so a catalog row can't lack a policy | — |
| `autobyteus-ts/tests/unit/llm/api/anthropic-llm-claude-5-5.test.ts` (Add) | Tests | AC-004..AC-009 payload tests for both models (sync + streaming) | Keeps `anthropic-llm.test.ts` (452 lines) from growing |
| `autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts` (Modify) | Tests | Order list, slice bounds, new row assertions | — |
| `autobyteus-server-ts/tests/unit/token-usage/pricing/token-cost-calculator.test.ts` (Modify) | Tests | Haiku tier case with cache-inclusive gross | AC-003 |
| `autobyteus-ts/docs/provider_model_catalogs.md`, `autobyteus-ts/docs/llm_module_design_nodejs.md` (Modify) | Docs | Rows, policy table, prices | REQ-013 |

## Reusable Owned Structures / Tightness Check

| Structure | One Meaning Per Field | Redundant Removed | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| `AnthropicModelRequestPolicy` | Yes after SR-007 (was No: `thinkingOffShape` was meaningful only for `adaptive`) | Yes (`rejectsSamplingParameters` derived from the mode; SR-007 removes `thinkingOffShape` from non-`adaptive` variants) | Low | Discriminated union keyed by `thinkingMode` (SR-007) |

## Applied Patterns

Lookup table (a registry-like data map) with a pure resolver; the adapter keeps the sequencing.

## Target Subsystem / Folder / File Mapping

See the file table above. All files sit in existing folders; no new folders.

## Folder Boundary Check

| Path | Depth | Clear | Risk | Note |
| --- | --- | --- | --- | --- |
| `src/llm/api/` | Provider adapter + policies | Yes | Low | Same placement as `anthropic-native-history-policy.ts` |

## Concrete Examples / Shape Guidance

**Policy shape (SR-004 target — superseded by the SR-007 discriminated union and explicit `claude-sonnet-4-6` row; see [Revision SR-007](#revision-sr-007--independent-code-review-crr-001))**

```ts
export type AnthropicThinkingMode = 'legacy_budget' | 'adaptive' | 'adaptive_required';
export type AnthropicThinkingOffShape = 'disabled' | 'between_tools' | 'omit';

export type AnthropicModelRequestPolicy = {
  thinkingMode: AnthropicThinkingMode;
  /** What to send when the thinking toggle is off. Only meaningful for 'adaptive'. */
  thinkingOffShape: AnthropicThinkingOffShape;
  /** tool_choice 'any'/'tool' fails locally before the SDK call. */
  rejectsForcedToolChoice: boolean;
};

const ADAPTIVE_POLICIES: Readonly<Record<string, AnthropicModelRequestPolicy>> = {
  'claude-opus-5-5':   { thinkingMode: 'adaptive_required', thinkingOffShape: 'omit',          rejectsForcedToolChoice: true  },
  'claude-sonnet-5-5': { thinkingMode: 'adaptive',          thinkingOffShape: 'between_tools', rejectsForcedToolChoice: true  },
  'claude-haiku-5-5':  { thinkingMode: 'adaptive',          thinkingOffShape: 'disabled',      rejectsForcedToolChoice: false },
  'claude-sonnet-5':   { thinkingMode: 'adaptive',          thinkingOffShape: 'disabled',      rejectsForcedToolChoice: false },
  'claude-opus-5':     { thinkingMode: 'adaptive',          thinkingOffShape: 'omit',          rejectsForcedToolChoice: false },
  'claude-opus-4-8':   { thinkingMode: 'adaptive',          thinkingOffShape: 'omit',          rejectsForcedToolChoice: false },
  'claude-opus-4-7':   { thinkingMode: 'adaptive',          thinkingOffShape: 'omit',          rejectsForcedToolChoice: false },
  'claude-fable-5':    { thinkingMode: 'adaptive',          thinkingOffShape: 'omit',          rejectsForcedToolChoice: false },
  'claude-fable-5-1':  { thinkingMode: 'adaptive',          thinkingOffShape: 'omit',          rejectsForcedToolChoice: false },
};
const LEGACY_BUDGET_POLICY = { thinkingMode: 'legacy_budget', thinkingOffShape: 'omit', rejectsForcedToolChoice: false };
```

**Adapter rules derived from the policy** (they replace the current branches one-for-one):

| Rule | `legacy_budget` | `adaptive` | `adaptive_required` (Opus 5.5) |
| --- | --- | --- | --- |
| Toggle on | `{type:'enabled', budget_tokens}` | `{type:'adaptive'[, display:'summarized']}` | same as adaptive |
| Toggle off | nothing (then `temperature: 0`) | per `thinkingOffShape`: `{type:'disabled'}` / `{type:'between_tools'}` (no other fields) / omit | **throw** (existing message) |
| Toggle absent | nothing | nothing (provider default) | `{type:'adaptive'[, display]}` |
| Explicit `thinking` kwarg/extra param | passed through | kept only if its type is `adaptive` or equals the off shape (`between_tools` reduced to `{type}`); otherwise dropped | non-adaptive → **throw** (existing message) |
| `thinking_budget_tokens` set | used | ignored | **throw** (existing behavior) |
| Sampling (`temperature`/`top_p`/`top_k`) | kept; `temperature: 0` when no thinking | stripped | **throw** if present |
| Forced `tool_choice` | — | throws when `rejectsForcedToolChoice`, with one generic message: `Anthropic model <model value> does not support forced tool choice.` | throws (same generic message; existing tests match the substring `forced tool choice`) |

Payload examples (AC-004..AC-006):

- Sonnet 5.5, default config `{thinking_enabled:false, thinking_display:'summarized'}` → `thinking: {type:'between_tools'}`; no temperature.
- Sonnet 5.5, `{thinking_enabled:true}` with the schema default display → `{type:'adaptive', display:'summarized'}`.
- Haiku 5.5, default `{thinking_enabled:false, thinking_display:'omitted'}` → `{type:'disabled'}`.
- Haiku 5.5, `{thinking_enabled:true, thinking_display:'summarized'}` → `{type:'adaptive', display:'summarized'}`.

Bad shape avoided: `if (modelValue === 'claude-sonnet-5-5') {...} else if (modelValue === 'claude-haiku-5-5') {...}` next to the Opus 5.5 block, with prefix matching left in place.

**Catalog rows**

```ts
// after claude-opus-4.7, before claude-sonnet-5
{ name: 'claude-sonnet-5-5', value: 'claude-sonnet-5-5', canonicalName: 'claude-sonnet-5-5', provider: ANTHROPIC, llmClass: AnthropicLLM,
  staticMetadata: createStaticModelMetadata(1_000_000, 1_000_000, 128_000, 'https://platform.claude.com/docs/en/models/sonnet-5-5/overview', '2026-10-09'),
  defaultConfig: new LLMConfig({ pricingConfig: pricing(2, 10, { pricingEffectiveDate: '2026-09-28',
    cachedInputReadTokenPricing: 0.1, cachedInputWrite5mTokenPricing: 2.5, cachedInputWrite1hTokenPricing: 4 }) }),
  configSchema: claudeSonnet55Schema },   // thinking_enabled (default false; description says Off = between_tools, progress notes still returned)
                                          // thinking_display enum omitted|summarized, default 'summarized'
// after claude-sonnet-4.6 (last Anthropic row)
{ name: 'claude-haiku-5-5', value: 'claude-haiku-5-5', canonicalName: 'claude-haiku-5-5', ...,
  staticMetadata: createStaticModelMetadata(1_000_000, 1_000_000, 128_000, 'https://platform.claude.com/docs/en/models/haiku-5-5/overview', '2026-10-09'),
  defaultConfig: new LLMConfig({ pricingConfig: pricing(0.1, 0.5, { pricingEffectiveDate: '2026-10-07',
    cachedInputReadTokenPricing: 0.01, cachedInputWrite5mTokenPricing: 0.125, cachedInputWrite1hTokenPricing: 0.2,
    inputTokenPricingTiers: [
      { tierId: 'prompt_le_100k', maxInputTokens: 100_000, inputTokenPricing: 0.1, outputTokenPricing: 0.5,
        cachedInputReadTokenPricing: 0.01, cachedInputWrite5mTokenPricing: 0.125, cachedInputWrite1hTokenPricing: 0.2 },
      { tierId: 'prompt_gt_100k', maxInputTokens: null, inputTokenPricing: 0.5, outputTokenPricing: 2.5,
        cachedInputReadTokenPricing: 0.05, cachedInputWrite5mTokenPricing: 0.625, cachedInputWrite1hTokenPricing: 1 },
    ] }) }),
  configSchema: claudeAdaptiveThinkingSchema }  // existing: toggle default off, display default omitted
```

The resulting Anthropic order: `fable-5-1, fable-5, opus-5, opus-5-5, opus-4.8, opus-4.7, sonnet-5-5, sonnet-5, sonnet-4.6, haiku-5-5`. The aggregate test slice becomes `(12, 22)`.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep prefix family matching for possible dated snapshot IDs | Existing behavior | Rejected | Exact values; no dated IDs exist (AF-003). Dated/unknown production IDs are an unsupported scenario and are not tested or documented (SR-007). |
| Keep the Opus 5.5 special-case blocks alongside the table | Lower diff | Rejected | `adaptive_required` mode |

## Change / Refactor Sequence

1. Add `anthropic-model-request-policy.ts` with the table (existing models first) and its table test.
2. Refactor `applyAnthropicRequestParams` onto the policy and delete the removed items. Run the existing `anthropic-llm.test.ts`, `anthropic-llm-prompt-caching.test.ts`, `anthropic-signed-tool-continuation.test.ts`, `anthropic-conversation-prefix-flow.test.ts` and `provider-native-request-payloads.test.ts` unchanged; they must pass (escalation trigger otherwise).
3. Add the Sonnet 5.5 / Haiku 5.5 policy rows and catalog rows (`claudeSonnet55Schema`).
4. Add `anthropic-llm-claude-5-5.test.ts` covering:
   - AC-004..AC-008, sync and streaming;
   - AC-009: a tool-use continuation keeps the thinking blocks byte-identical, using the existing native-turn test pattern.
5. Update `supported-model-definitions.test.ts` (AC-001/AC-002/AC-003 catalog tiers) and add the server calculator Haiku case: 60k input + 50k cache read → `prompt_gt_100k`; 100,000 exactly → `prompt_le_100k`.
6. Docs (REQ-013).
7. Validation:
   - `pnpm -C autobyteus-ts exec vitest run tests/unit/llm`
   - the server pricing unit tests
   - typecheck/build for `autobyteus-ts`
   - AC-011 live smoke with an Anthropic key, for example the existing prompt-caching live E2E with `ANTHROPIC_CACHE_E2E_MODEL=claude-sonnet-5-5` and then `claude-haiku-5-5`, or a minimal live call per model. Record it as skipped when no key is available.
   - a frontend check that the new models show the `Off · On` + display controls, same as Sonnet 5.

## Key Tradeoffs

- Bounded refactor vs. two more branches: the refactor touches shaping for all Claude models, but it removes special cases and makes each rule a reviewable table entry. Existing tests guard the behavior.
- Sampling on Sonnet 5.5 is stripped silently, matching Sonnet 5 and other adaptive models, rather than throwing like Opus 5.5. This keeps the change consistent and still never sends a 400 shape.
- Forced tool choice on Sonnet 5.5 throws (REQ-010): it can't be silently fixed without changing intent.

## Risks

- **Live API drift from the docs** (R-001): mitigated by AC-011.
- **Accidental regression for existing models in the refactor**: mitigated by the unchanged existing tests plus the policy table test.
- **A user carrying a Haiku 5.5 config with `thinking_enabled:false` while some future effort setting is `xhigh`**: N/A — effort isn't exposed (non-goal).

## Guidance For Implementation

- ~~Keep the existing Opus 5.5 thinking and sampling error messages verbatim.~~ Superseded by SR-007: all three local errors use the generic model-value form (existing tests match the substrings `adaptive thinking only`, `explicit sampling` and `forced tool choice`).
- `between_tools` must be sent as exactly `{ type: 'between_tools' }`.
- `display` is only ever sent with `type: 'adaptive'`.
- Do not change `anthropic-native-history-policy.ts`, the prompt caching or the server calculator code.
- Rebase facts (`ff227eb72`, AF-012..AF-015):
  - Keep `staticMetadata.maxOutputTokens: 128_000` on both rows; streaming throws without it.
  - In new adapter tests, build `LLMModel` with `maxOutputTokens`, and end every stream mock with `{ type: 'message_stop' }` (after the `message_delta` that carries `stop_reason`).
  - Use `isTurnContinuation` (renamed from `isToolContinuation`) when following the signed-continuation test pattern for AC-009.
  - Do not alter the finish table or the output-limit recovery.
- Update the ordered-catalog test and its slice bounds deliberately. Any other expected-payload change in existing tests is a Design Impact.

## Revision SR-007 — Independent code review CRR-001

### Basis

- Trigger: independent code review `/Users/normy/autobyteus_org/independent-reviews/claude-sonnet-haiku-5-5-model-support/independent-code-review-report.md` (CRR-001, "Changes required (bounded)", CR-001..CR-006). The review found every AC proven and existing request shapes unchanged. It failed the review bar on a merge-blocking `TESTING.md` conflict and two scorecard categories below 9.0 (shared-structure tightness 8.5, naming 8.8).
- The user asked Solution Designer to work on the feedback (2026-10-11).
- Classification of the findings:

  | Finding | Kind | Owner of the fix |
  | --- | --- | --- |
  | CR-002, CR-003, CR-004 | `Design Impact` (bounded) | This design revision; Implementation Engineer applies it |
  | CR-001 | Local Fix (merge integration and test docs) | Implementation Engineer rebases and resolves the conflict; API/E2E Engineer moves the run commands into the test-file headers |
  | CR-005 | Local Fix (docs sync) | Delivery Engineer |
  | CR-006 | Local Fix (live-test header) | API/E2E Engineer |

- Requirements impact: none. Every change is a type shape, an error-message wording, an explicit table row with the same value the fallback gave, or a docs/test-header correction. Request payloads for every model are unchanged (REQ-012 preserved). The 2026-10-09 approval still applies.
- Evidence: AF-016..AF-022 in the investigation notes.

### D-SR7-1 — Discriminated policy type (CR-002)

`AnthropicModelRequestPolicy` becomes a union keyed by `thinkingMode`. Only the `adaptive` variant carries `thinkingOffShape`; `rejectsForcedToolChoice` stays on every variant.

```ts
export type AnthropicThinkingOffShape = 'disabled' | 'between_tools' | 'omit';

export type AnthropicModelRequestPolicy =
  | { thinkingMode: 'legacy_budget'; rejectsForcedToolChoice: boolean }
  | { thinkingMode: 'adaptive'; thinkingOffShape: AnthropicThinkingOffShape; rejectsForcedToolChoice: boolean }
  | { thinkingMode: 'adaptive_required'; rejectsForcedToolChoice: boolean };

export type AnthropicThinkingMode = AnthropicModelRequestPolicy['thinkingMode']; // keep only if still referenced
```

- Keep the per-mode doc comments (move the mode descriptions onto the variants or keep them on the union).
- `thinkingOffShape` keeps `'omit'` as a value: for an `adaptive` model it is a real fact ("send nothing when off", Opus 5 / 4.8 / 4.7 / Fable 5 / 5.1).
- The adapter readers already narrow on the mode (`sanitizeExplicitThinking` returns early unless `adaptive`; `buildThinkingFromToggle` switches on it), so the adapter needs no logic change; TypeScript narrowing must compile without casts.
- Opus 5.5 row: `{ thinkingMode: 'adaptive_required', rejectsForcedToolChoice: true }`.
- The fixed-budget policy: `{ thinkingMode: 'legacy_budget', rejectsForcedToolChoice: false }`.
- Bad shape: keeping `thinkingOffShape?:` optional on a flat type, or adding a fourth `'not_applicable'` value. Both keep a field whose meaning depends on another field.

### D-SR7-2 — Mode-keyed errors name the model from `modelValue` (CR-003)

In `validateStrictRequestRules` (`anthropic-llm.ts`), the two `adaptive_required` errors use the same form as the forced-tool-choice error:

- `Anthropic model ${modelValue} supports adaptive thinking only; disabled and manual thinking are unavailable.`
- `Anthropic model ${modelValue} does not support explicit sampling parameters.`

Existing tests (`anthropic-llm.test.ts:83-85`) match only the substrings `adaptive thinking only` and `explicit sampling`; they must pass unchanged (AF-019). No server, web or doc text depends on the old wording. Optionally assert that the Opus 5.5 messages contain `claude-opus-5-5` in the new Claude 5.5 test file or the existing test; do not rewrite the existing assertions.

Out of scope (reviewer C-10, held for evidence): Opus 5.5 rejecting `thinking_enabled: false` predates this ticket and stays as is.

### D-SR7-3 — Explicit row for every catalog model; no tests or docs for unsupported IDs (CR-004)

- Add `'claude-sonnet-4-6'` to `ANTHROPIC_MODEL_REQUEST_POLICIES` with the fixed-budget policy (one shared constant used for the row and the resolver's result).
- Keep the resolver total: a value without a row returns the fixed-budget policy. It is reached only by non-catalog test fixtures (`'synthetic'`, `'test'`, `'fixture'`, AF-020); production builds `AnthropicLLM` only from catalog rows (AF-003). Do not make it throw: that would change existing tests' expected behavior (the SR-004 escalation trigger) and add machinery for an unsupported scenario. Update the resolver comment to say this (no mention of dated IDs).
- Keep the `Object.prototype.hasOwnProperty` guard (it is the correct `Record` lookup), but delete the `it.each([...'claude-sonnet-5-5-20261001', 'claude-sonnet-5-preview', 'claude-3-opus', 'toString', ''])` block in `tests/unit/llm/api/anthropic-model-request-policy.test.ts`. The catalog-pinning test stays and now also proves the explicit `claude-sonnet-4-6` row (it already expects the fixed-budget policy for it). Update the test's local helpers for the union (use `AnthropicThinkingOffShape`, not `AnthropicModelRequestPolicy['thinkingOffShape']`).
- Docs:
  - `autobyteus-ts/docs/provider_model_catalogs.md`: replace "A model value without a row (including a dated snapshot ID) uses the older fixed-budget policy." with a statement that every catalog row has an explicit entry (a unit test pins it). In the policy table, replace the row `any other value (e.g. claude-sonnet-4-6)` with `claude-sonnet-4-6`. The Opus 5.5 "Toggle off sends" cell stays "— (fails locally)", now matching the data.
  - `autobyteus-ts/docs/llm_module_design_nodejs.md`: replace "unknown values use the legacy fixed-budget policy" with "every catalog row has an explicit entry, including the fixed-budget `claude-sonnet-4-6`".

### D-SR7-4 — Rebase onto current `origin/personal` and resolve `TESTING.md` (CR-001)

- The branch is unpublished (AF-016), so rebase the 2 commits onto `origin/personal` (`d72d2018b` or newer; fetch first). Expect one conflict, `TESTING.md`, in `30541612c`.
- Resolution: take origin's `TESTING.md` unchanged. Both rows this ticket added or edited (prompt-caching and "Claude Sonnet 5.5 / Haiku 5.5 live E2E") are dropped; origin's rules forbid per-suite rows (AF-017). Do not add a replacement line to `TESTING.md`.
- Working-tree state before rebasing: discard the uncommitted `TESTING.md` edit (the `tcgetattr` note; its wording is preserved in D-SR7-6). Keep the uncommitted `token_usage.md` edit for Delivery (D-SR7-6), e.g. with `git rebase --autostash` (it merges cleanly). The ticket folder is untracked (delivery archives it at finalization), so the rebase does not touch it.
- The run commands that lived in those rows move to the test-file headers (D-SR7-5). Their exact text, for the owner:
  - Claude 5.5 suite, from `autobyteus-server-ts`: `env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" RUN_CLAUDE_5_5_E2E=1 ANTHROPIC_API_KEY=<key> ./node_modules/.bin/vitest run tests/e2e/runtime/autobyteus-claude-5-5-live.e2e.test.ts --no-watch`
  - Prompt-caching suite, from `autobyteus-server-ts`: `env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" RUN_ANTHROPIC_CACHE_E2E=1 ANTHROPIC_API_KEY=<key> ./node_modules/.bin/vitest run tests/e2e/runtime/autobyteus-anthropic-prompt-caching-live.e2e.test.ts --no-watch` (optional `ANTHROPIC_CACHE_E2E_MODEL=claude-sonnet-5-5|claude-haiku-5-5`).
- Commits: keep the ticket's history readable — the rebased feature and test commits plus a new commit for SR-007 code (e.g. `refactor(llm): tighten Anthropic request policy type, name models in errors, explicit Sonnet 4.6 row`). Stage paths explicitly; never `git add -A` (untracked SDK `dist/` folders exist).

### D-SR7-5 — Live-test headers (CR-006, and the CR-001 command move)

- `autobyteus-server-ts/tests/e2e/runtime/autobyteus-claude-5-5-live.e2e.test.ts` header: correct the cost line to the recorded run (AF-021): about 20 short Sonnet/Haiku calls plus one ~240K-gross-token Haiku call (about $0.24 for that call; ~22 calls in total). Add the exact command above.
- `autobyteus-server-ts/tests/e2e/runtime/autobyteus-anthropic-prompt-caching-live.e2e.test.ts` header: add the exact command above, next to its existing gate and options.
- Header text only; no test logic change.

### D-SR7-6 — Docs sync (CR-005 and the `tcgetattr` note)

- Commit `autobyteus-server-ts/docs/modules/token_usage.md` (Sonnet 5.5 rates and the Haiku 5.5 tier table) with the ticket. Check it still reads correctly against the rebased file.
- Preserved wording of the discarded note: "when the agent shell's stdin is a socket, `script` can fail with `tcgetattr: Operation not supported on socket`, so run the importer under a small Python `pty.fork()` wrapper that writes `IMPORT` at the prompt instead".
- The `tcgetattr` / Python `pty.fork()` importer workaround is not a rule for every task's testing (AF-017). Add it as one or two sentences to the importer section of `autobyteus-server-ts/docs/modules/secret_management.md` (after "An agent may run it as the operator …"), or drop it. Do not put it back in `TESTING.md`.
- Update `docs-sync-report.md` / delivery records for the new docs state.

### Revised file inventory (SR-007 delta)

| File | Change | Finding |
| --- | --- | --- |
| `autobyteus-ts/src/llm/api/anthropic-model-request-policy.ts` | Union type; Opus 5.5 and fixed-budget entries without `thinkingOffShape`; explicit `claude-sonnet-4-6` row; resolver comment | CR-002, CR-004 |
| `autobyteus-ts/src/llm/api/anthropic-llm.ts` | Two error messages built from `modelValue`; types compile under the union | CR-003, CR-002 |
| `autobyteus-ts/tests/unit/llm/api/anthropic-model-request-policy.test.ts` | Union-typed expectations; delete unsupported-input cases | CR-002, CR-004 |
| `autobyteus-ts/docs/provider_model_catalogs.md`, `autobyteus-ts/docs/llm_module_design_nodejs.md` | Explicit Sonnet 4.6 row; no dated-ID claim | CR-004 |
| `TESTING.md` | Origin's version unchanged (rows dropped by the rebase) | CR-001 |
| Both live E2E test headers | Commands; corrected size and cost | CR-001, CR-006 |
| `autobyteus-server-ts/docs/modules/token_usage.md` | Commit the existing edit | CR-005 |
| `autobyteus-server-ts/docs/modules/secret_management.md` (optional) | `tcgetattr` workaround sentence | CR-001 |

### Verification expectations

- `pnpm -C autobyteus-ts exec vitest run tests/unit/llm` passes, with the five existing Anthropic adapter test files and the other fixture-based tests unchanged (`git diff` of those files against the rebased base is empty). Any needed change to an existing test's expected payload or message substring is an escalation (Design Impact).
- `tsc -p tsconfig.build.json --noEmit` in `autobyteus-ts` is clean (the union must narrow without casts).
- Server `token-cost-calculator.test.ts` passes on the rebased branch.
- `git merge-tree --write-tree HEAD origin/personal` reports no conflict.
- A live re-run is not required by this design: no request payload changes. The API/E2E Engineer decides whether the rebase warrants one (the Claude 5.5 suite costs about $0.30).

### Classification (SR-007)

- `task_size`: `Small`. Three source/test files with type-only, message-only and one-row changes, two docs paragraphs, two test headers, a rebase with a docs-only conflict.
- `architectural_risk`: `Low`. No contract, API, persistence, security, concurrency, deployment or ownership-boundary change; request payloads are unchanged and existing tests pin them.
- Escalation trigger: any change to an existing test's expected payload or matched message substring; any rebase conflict outside `TESTING.md`; any new origin commit touching `autobyteus-ts/src/llm`, token-usage pricing or the live E2E helpers before finalization.

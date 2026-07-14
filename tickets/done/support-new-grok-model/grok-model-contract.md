# Grok Model Contract and Removal Matrix

## Status

Approved — user selected `grok-4.5` as the only supported Grok model on
2026-07-14.

## Scope

This supplement makes the intended Grok catalog and provider-request contract
explicit for `autobyteus-ts`. It supplements, but does not replace, the
requirements doc, investigation notes, or design spec.

Related requirements: `REQ-001` through `REQ-008`.
Related acceptance criteria: `AC-001` through `AC-007`.

## Approved Catalog State

| User/API model ID | Provider value | Role | Decision | Evidence / rationale |
| --- | --- | --- | --- | --- |
| `grok-4.5` | `grok-4.5` | Current flagship text/code/agentic model | Add as the sole supported Grok row | xAI calls it the flagship for code and general use; Chat Completions and Responses APIs are supported; reasoning is configurable low/medium/high and defaults to high. |
| `grok-4.3` | `grok-4.3` | Previous flagship text model | Remove from the active built-in catalog, metadata, tests, and docs | Replaced by the user's selected current flagship; no compatibility alias is retained. |
| `grok-build-0.1` | `grok-build-0.1` | Separate specialized coding model | Remove from the active built-in catalog, metadata, tests, and docs | The user explicitly wants only Grok 4.5 selectable in AutoByteus, even though xAI still documents Build 0.1 as a current code model. |
| `grok-code-fast-1` | `grok-code-fast-1` | Retired historical coding identifier | No active catalog/runtime/docs support or alias; retain only intentional negative absence assertions and historical ticket/audit evidence | xAI retirement guidance maps the retired workload to newer models; this package must not expose or redirect the old ID. |

## Provider Contract For `grok-4.5`

- API base URL remains `https://api.x.ai/v1`.
- Existing `GrokLLM` remains on the OpenAI-compatible Chat Completions path
  because xAI documents `grok-4.5` for Chat Completions, including streaming
  and function calling. A Responses-API migration is not part of this model
  catalog change.
- The model supports `reasoning_effort` values `low`, `medium`, and `high`;
  reasoning cannot be disabled and xAI documents `high` as the default.
- xAI documents `presencePenalty`, `frequencyPenalty`, and `stop` as invalid
  for reasoning models. The adapter/request boundary must not emit those
  fields for `grok-4.5`.
- Grok normalization must be pure and non-mutating. Do not rely on the current
  shallow `LLMConfig.clone()` for this policy because its `extraParams` object
  can remain aliased. Construct a fresh `LLMConfig` with copied first-class
  values, a copied `stopSequences` array, a fresh top-level `extraParams`
  object, and copied pricing data before deleting invalid fields.
- The exact per-call seams are Grok overrides of both inherited
  `_sendMessagesToLLM` and `_streamMessagesToLLM`. Each passes a fresh normalized
  kwargs object to `super`, so `OpenAICompatibleLLM` never receives raw Grok
  kwargs. The normalizers remove `stop`, `stop_sequences`, `stopSequences`,
  `presence_penalty`, `presencePenalty`, `frequency_penalty`, and
  `frequencyPenalty`; they preserve tools, `tool_choice`, stream controls, and
  valid `reasoning_effort` values. Invalid `reasoning_effort` values such as
  `none` are removed so the valid high default remains in effect.
- Existing generic response normalization remains the owner for content,
  tool-call, streaming, and token usage shapes; provider-specific sanitization
  belongs in `GrokLLM`, not in callers or the shared builder unless the shared
  builder is deliberately generalized for multiple providers.

## Catalog Data To Record

- Pricing: `$2.00` input / `$6.00` output per 1M tokens; `$0.50` cached input
  per 1M tokens where cache-read accounting is represented.
- Pricing source: `autobyteus_model_catalog` with effective date `2026-07-08`
  (or the repository's exact selected verification date if implementation
  verifies a newer official price page).
- Curated context metadata: `maxContextTokens: 500000` from xAI's models page
  updated July 9, 2026.
- Do not invent a maximum output token value when the public model page does
  not provide one.

## Active-Reference Removal Matrix

| Surface | Current reference / behavior | Required target | Removal rule |
| --- | --- | --- | --- |
| `src/llm/supported-model-definitions.ts` | `grok-4.3` and `grok-build-0.1` catalog rows | One `grok-4.5` row with pricing, context-linked metadata, and reasoning schema | No old rows or aliases. |
| `src/llm/api/grok-llm.ts` | Default fallback model is `grok-4.3` | Default fallback is `grok-4.5`; enforce model-specific request invariants | No fallback to either removed ID. |
| `src/llm/metadata/curated-model-metadata.ts` | No Grok curated metadata | Add only the docs-backed `grok-4.5` context limit | Do not retain metadata keyed to removed IDs. |
| `tests/unit/llm/supported-model-definitions.test.ts` | Grok membership/pricing assertions target 4.3 and Build | Assert only 4.5 pricing/schema/membership and absence of both removed IDs | Historical ticket notes are not active coverage. |
| `tests/integration/llm/api/grok-llm.test.ts` | Instantiates retired `grok-4-1-fast-reasoning` slug, relying on xAI redirect | Instantiate `grok-4.5` and exercise completion/streaming | No retired-slug redirect dependency. |
| `tests/integration/llm/llm-factory-metadata-resolution.test.ts` | No Grok model assertions | Assert Grok catalog membership and 500k curated context metadata | No old-row assertion. |
| `docs/provider_model_catalogs.md` | Latest-model table omits Grok; no Grok policy section | Document only Grok 4.5, exact pricing, limits, reasoning, and removals | State no aliases/fallbacks and no Build row. |
| `grok-code-fast-1` references | Retired identifier may appear in a current negative assertion and historical evidence | No active catalog/runtime/docs support or alias; keep only the labeled negative assertion and historical ticket/audit records | Scan must distinguish intentional absence validation/history from active support. |
| Historical ticket records | Old identifiers appear in investigation/progress history | Leave historical evidence intact | Historical records are not active support surfaces. |

## User Approval Record

The user approved the quality-first scope: keep only `grok-4.5` and remove
`grok-4.3`, `grok-build-0.1`, and other active retired Grok references without
aliases.

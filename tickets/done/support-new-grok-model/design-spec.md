# Design Specification

## Status

Ready for architecture review Round 2 after resolving architecture-review
findings AR-001 and AR-002.

The requirements basis and the linked Grok contract were explicitly approved
by the user on 2026-07-14. The approved product scope is a single selectable
Grok model: `grok-4.5`.

Round 1 review failed only on two concrete design details, now resolved here:
the safe non-mutating config/kwargs normalization seam and the explicit
historical-only/negative-assertion disposition of `grok-code-fast-1`.

## Related Artifacts

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/support-new-grok-model/tickets/in-progress/support-new-grok-model/requirements.md`
- Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/support-new-grok-model/tickets/in-progress/support-new-grok-model/investigation-notes.md`
- Provider/model contract: `/Users/normy/autobyteus_org/autobyteus-worktrees/support-new-grok-model/tickets/in-progress/support-new-grok-model/grok-model-contract.md`

## Objective and Scope

Replace the active Grok catalog rows `grok-4.3` and `grok-build-0.1` with one
exact `grok-4.5` row. Make `grok-4.5` the adapter fallback, expose only its
docs-backed pricing, context, and reasoning schema, preserve the existing
OpenAI-compatible Chat Completions flow, and enforce xAI's reasoning-model
request restrictions at the Grok provider boundary.

The change includes the built-in catalog, adapter default and normalization,
curated metadata, unit/integration coverage, and provider catalog docs. It does
not migrate to the Responses API, change shared OpenAI-compatible behavior for
other providers, or rewrite historical model identifiers.

## Current-State Architecture

### Entry and execution spine

```text
LLMFactory
  -> supportedModelDefinitions / LLMModel registry
  -> GrokLLM
  -> OpenAICompatibleLLM
  -> OpenAICompatibleRequestBuilder
  -> openai Node client chat.completions.create
  -> https://api.x.ai/v1
```

`supported-model-definitions.ts` owns built-in model identity, provider,
pricing, and configuration schema. `curated-model-metadata.ts` owns
docs-backed context/output limits. `GrokLLM` owns the xAI credential/base URL,
fallback identity, and provider-specific request policy. The shared compatible
adapter owns response, stream, tool-call, and usage normalization.

### Current design health

- **Change posture:** behavior change, feature, and cleanup.
- **Root cause:** legacy/compatibility pressure plus a missing provider request
  invariant for the new reasoning model.
- **Health:** the existing ownership boundaries are suitable for this scope;
  no subsystem redesign is needed. A bounded adapter normalization is needed
  because the shared builder intentionally supports fields that xAI rejects for
  Grok 4.5.
- **Spines:** the primary request spine is the flow above. The return spine is
  the existing `CompleteResponse`/`ChunkResponse` normalization in
  `OpenAICompatibleLLM`. The bounded local policy loop is config/kwargs
  composition followed by Grok sanitization before the shared builder.
- **Thin facade versus owner:** `GrokLLM` remains a thin provider facade over
  `OpenAICompatibleLLM`, but it is the correct owner of Grok-specific
  request-field filtering and default reasoning effort.

## Target Design

### 1. Catalog contract

In `src/llm/supported-model-definitions.ts`:

- Remove the `grok-4.3` and `grok-build-0.1` definitions.
- Add exactly one Grok definition:
  - `name`: `grok-4.5`
  - `value`: `grok-4.5`
  - `canonicalName`: `grok-4.5`
  - `provider`: `LLMProvider.GROK`
  - `llmClass`: `GrokLLM`
- Use a Grok-specific schema with one optional enum parameter:
  `reasoning_effort: low | medium | high`, default `high`.
- Set the trusted pricing to USD `$2.00` input, `$6.00` output, and `$0.50`
  cached-input read per 1M tokens. Record the official verification/effective
  date in the pricing configuration rather than inheriting the stale catalog
  helper date.
- Materialize `reasoning_effort: high` in the model default `extraParams` so
  factory-created requests have an explicit valid provider setting while the
  schema remains the user-facing contract.

No old model row, alias, redirect, fallback, or compatibility wrapper remains.

### 2. Curated metadata

In `src/llm/metadata/curated-model-metadata.ts`, add a Grok provider section
with only the `grok-4.5` entry:

- `maxContextTokens: 500000`
- xAI models-page source URL
- verification date matching the official source review

Do not set `maxOutputTokens` because the investigated public source does not
provide a trustworthy value. Do not add entries for either removed model.

### 3. Grok provider request policy

In `src/llm/api/grok-llm.ts`, keep the existing base class, API key variable,
and base URL, but update the fallback model identity to `grok-4.5`.

Add small pure provider-local normalizers with an explicit safe-copy shape:

1. `copyGrokConfig(config)` must construct a fresh `LLMConfig` by copying all
   first-class values, copying `stopSequences` as a new array, passing copied
   pricing data, and assigning a fresh top-level `extraParams` object. It must
   not rely on `LLMConfig.clone()` for mutation safety because the current
   clone path can alias `extraParams`.
2. `normalizeGrokRequestConfig(config)` must start from that fresh config,
   clear copied `frequencyPenalty`, `presencePenalty`, and `stopSequences`,
   remove all invalid keys from the fresh `extraParams`, and preserve or set a
   valid canonical `reasoning_effort` (`low`, `medium`, or `high`; default
   `high`). It must never mutate the source config or nested source
   `extraParams`.
3. `normalizeGrokInvocationKwargs(kwargs)` must return a fresh object and
   remove these raw spellings before the shared builder sees them:
   `stop`, `stop_sequences`, `stopSequences`, `presence_penalty`,
   `presencePenalty`, `frequency_penalty`, and `frequencyPenalty`. A canonical
   `reasoning_effort` of low/medium/high is preserved; invalid values such as
   `none` and the non-canonical `reasoningEffort` spelling are removed so the
   normalized config's valid high default remains in effect.
4. `GrokLLM` must override both inherited `_sendMessagesToLLM` and
   `_streamMessagesToLLM`, call `normalizeGrokInvocationKwargs` before calling
   `super`, and override `getRequestConfig` to return
   `normalizeGrokRequestConfig(this.config)`. This closes the raw-kwargs path
   in both synchronous and streaming requests while leaving BaseLLM hook
   callers' original kwargs untouched.
5. Preserve supported tools, `tool_choice`, stream controls, and unrelated
   provider-safe extra parameters. Do not add Grok conditionals to
   `OpenAICompatibleRequestBuilder` or `OpenAICompatibleLLM`.

This follows the established DeepSeek/GLM provider pattern, but the Grok
normalizers must be pure and must not mutate the provider's live config.
The final request should therefore have this conceptual shape:

```ts
{
  model: 'grok-4.5',
  messages,
  reasoning_effort: 'high', // or caller-selected low/medium/high
  tools,                    // only when supplied
  stream: true              // only for streaming
  // no presence_penalty, frequency_penalty, or stop
}
```

The immutability test shape must be explicit. Given a source config containing
`stopSequences: ['END']` and top-level `extraParams` containing invalid
sampling/stop keys, and a source kwargs object containing the same raw keys,
capture `config.toDict()` and the kwargs before both sync and stream calls.
After the mocked request payloads are captured, assert that the source config,
its `extraParams`/stop array, and the original kwargs equal their snapshots;
only the captured payload may omit the invalid keys. This specifically guards
against the current shallow `LLMConfig.clone()` alias.

The response and stream return path remains unchanged. Existing reasoning
content extraction, tool-call delta conversion, usage normalization, and
cleanup continue to be owned by the shared compatible adapter.

### 4. Clean-cut removal and persisted data

Remove active references to `grok-4.3`, `grok-build-0.1`, and
`grok-4-1-fast-reasoning` from source, active tests, and current provider docs.
`grok-code-fast-1` also has no active catalog/runtime/docs support or alias;
its intentional negative absence assertion may remain, and historical
ticket/audit records may retain all removed strings as evidence. The scan and
tests must distinguish those allowed cases from active support references.

No package-owned catalog persistence or schema migration is required. Historical
usage/compaction records retain model IDs as descriptive strings and remain
directly readable. Runtime callers that persisted a removed selection receive
the normal factory not-found behavior and must select `grok-4.5`; this package
must not silently redirect them.

## File and Responsibility Map

| File / area | Change | Governing owner |
| --- | --- | --- |
| `src/llm/supported-model-definitions.ts` | Replace two Grok rows with the one 4.5 definition, pricing, default reasoning config, and schema | Built-in catalog owner |
| `src/llm/api/grok-llm.ts` | Update fallback; add pure fresh-copy config/kwargs normalizers; override both sync and stream request entrypoints | Grok provider owner |
| `src/llm/metadata/curated-model-metadata.ts` | Add only 4.5 context metadata | Curated metadata owner |
| `tests/unit/llm/supported-model-definitions.test.ts` | Assert exact catalog membership, clean removal, schema, and pricing | Catalog test owner |
| `tests/unit/llm/api/grok-llm.test.ts` (new or equivalent focused unit coverage) | Mock sync/stream request creation; assert model/reasoning/tool/stream payload, invalid-field omission, and source config/extraParams/kwargs immutability | Grok adapter test owner |
| `tests/integration/llm/api/grok-llm.test.ts` | Use exact 4.5 ID for completion and streaming; preserve truthful credential/region behavior | Live integration test owner |
| `tests/integration/llm/llm-factory-metadata-resolution.test.ts` | Assert Grok listing, 500k context, and schema resolution | Factory metadata test owner |
| `docs/provider_model_catalogs.md` | Record the current sole Grok row, pricing, reasoning policy, transport, and removal rule | Durable catalog documentation owner |

No changes belong in the shared request builder for this task.

## Change Sequence and Dependencies

1. Update catalog identity/schema/pricing and curated metadata together so the
   registry never has an intended row without its metadata contract.
2. Update `GrokLLM` fallback and pure normalization policy. Implement the
   explicit fresh-copy config normalizer and both sync/stream kwargs overrides
   before stripping values.
3. Update deterministic catalog, adapter-payload, and factory-metadata tests.
4. Update the credential-gated integration target from the retired slug to
   `grok-4.5`.
5. Update provider catalog documentation and run an active-reference scan.
6. Run focused tests, package build, and the repository-required checks. Copy
   the main worktree `.env.test` into the ignored task worktree only when
   executing credential-gated tests; never stage or attach it.

## Coverage and Validation Design

The downstream coverage investigation should preserve or add the following
scenario intent:

- Catalog contains exactly `grok-4.5` for `LLMProvider.GROK`.
- Factory creates `GrokLLM` for `grok-4.5` and rejects both removed IDs.
- Model info contains 500,000 context tokens and the exact three-value
  reasoning schema with default high and no output limit invention.
- Pricing is trusted and reports `2.00/6.00/0.50` input/output/cache-read.
- Mocked sync and streaming request payloads use the exact model and valid
  reasoning effort, retain tools/stream controls, and omit invalid sampling/
  stop fields even if supplied through config or kwargs. The source config,
  nested extra params, stop array, and original kwargs remain byte-for-byte
  unchanged after both request paths.
- Live completion and streaming use `grok-4.5`, but a 403 region response is
  recorded as an external access blocker rather than a passing live result.
- Build and active-reference/secret-hygiene checks pass. `grok-code-fast-1`
  is allowed only in the intentional negative absence assertion and historical
  ticket/audit records; it is forbidden in active runtime/catalog/docs/alias
  surfaces.

The known local credential currently returns HTTP 403 because Grok 4.5 is not
available in its region. This is an environment limitation, not permission to
claim live provider success.

## Documentation and Operational Notes

The durable provider catalog document must state that:

- `grok-4.5` is the only built-in Grok row.
- The endpoint remains xAI's OpenAI-compatible Chat Completions route for this
  change.
- Reasoning is always enabled and accepts only low/medium/high, default high.
- xAI-invalid presence/frequency/stop fields are stripped at the Grok adapter
  boundary.
- `grok-4.3` and `grok-build-0.1` are intentionally removed without aliases.
- `grok-code-fast-1` has no active support or alias; its labeled negative
  absence assertion and historical ticket/audit references are intentional.
- Pricing and context metadata are source-dated and maximum output is not
  asserted without official evidence.

## Risks and Deferred Work

- Chat Completions is documented by xAI as legacy. A future Responses API
  migration remains separate work; this task must not create a mixed transport
  contract.
- Region entitlement prevents current live validation. Deterministic payload
  tests are the required evidence until an eligible account is available.
- External persisted app/server settings may still contain removed IDs. Their
  owners must update those settings; this package intentionally rejects silent
  compatibility behavior.

## Acceptance Mapping

| Requirement | Design section |
| --- | --- |
| REQ-001 | Target Design §1 |
| REQ-002 | Target Design §1 and §4 |
| REQ-003 | Target Design §3 |
| REQ-004 | Target Design §1 and §2 |
| REQ-005 | Target Design §1 and §3 |
| REQ-006 | Target Design §3 |
| REQ-007 | Coverage and Validation Design; Documentation and Operational Notes |
| REQ-008 | Change Sequence and Dependencies |

## Architecture Review Request

Please review the complete package for readiness. The expected decision is
`Pass` if the single-model catalog contraction, provider-boundary invariant,
clean-cut removal, metadata/pricing evidence, and coverage plan are sound;
route any requirement gap or design impact back to `solution_designer` before
implementation.

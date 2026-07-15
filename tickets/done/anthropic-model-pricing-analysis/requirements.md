# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined - user approved support for the three target Anthropic models; detailed pricing investigation is complete. A later live Anthropic runtime failure investigation added a required internal-kwarg filtering fix before implementation/review continuation.

## Goal / Problem Statement

Anthropic's public Claude catalog has changed since AutoByteus last refreshed its built-in Anthropic model definitions. The user asked whether Anthropic now supports `claude-sonnet-4.8`, observed AutoByteus showing Anthropic models `claude-opus-4.7`, `claude-opus-4.8`, and `claude-sonnet-4.6`, and asked for cost-aware analysis including Fable.

The analysis must determine the correct current Anthropic model IDs, identify whether AutoByteus's Anthropic catalog/request-shaping/pricing metadata is stale or broken, and define a safe update scope if the user chooses implementation.

After the initial model-catalog update was drafted, the user reported a live Claude runtime error: Anthropic rejected `logicalConversationId` as an extra input. The scope now also includes fixing the provider-request boundary so internal AutoByteus runtime kwargs are not forwarded to Anthropic's Messages API.

## Investigation Findings

- Anthropic does **not** appear to publish or document `claude-sonnet-4.8` as a current Claude API model. The current Sonnet successor is `claude-sonnet-5`.
- Anthropic now documents `claude-fable-5` as generally available on the Claude API and lists `claude-fable-5`, `claude-opus-4-8`, `claude-sonnet-5`, and `claude-haiku-4-5-20251001` in the current latest model comparison.
- AutoByteus's built-in Anthropic catalog currently registers exactly three API models: `claude-opus-4.8`, `claude-opus-4.7`, and `claude-sonnet-4.6`; the screenshot matches this catalog.
- AutoByteus does **not** currently register Anthropic `claude-sonnet-5` or `claude-fable-5` as built-in LLM API models.
- The Anthropic targeted Reload Models flow does not dynamically discover Anthropic models. It only supports targeted reload for `LMSTUDIO`, `AUTOBYTEUS`, and `OLLAMA`; for Anthropic it returns the existing count. Full reload rebuilds the static supported model definitions and can refresh metadata for already-supported definitions, but still will not add missing catalog rows.
- Current Anthropic pricing metadata is already present for Opus 4.8/4.7 and Sonnet 4.6, but it is dated `2026-06-25` and does not include Sonnet 5 or Fable 5.
- There is an implementation risk independent of catalog membership: `AnthropicLLM` only treats Opus 4.7 as adaptive-thinking/no-sampling-special. Official docs say Opus 4.8, Opus 4.7, Sonnet 5, Fable 5, Mythos 5, and related current models have adaptive-thinking and sampling-parameter restrictions. The current adapter would send provider-invalid manual thinking and/or `temperature: 0` for Opus 4.8 and any newly added Sonnet 5/Fable models.
- The local string `fable` currently found in code is an OpenAI TTS voice entry, not Claude Fable 5 support.
- Live Anthropic integration tests using the copied `.env.test` key passed for the existing direct Anthropic calls that do not include runtime coordination kwargs.
- A focused live probe that called `AnthropicLLM.streamUserMessage(..., { logicalConversationId: "agent_probe" })` reproduced the user's provider rejection pattern: Anthropic treats `logicalConversationId` as an unknown Messages API field.
- `autobyteus-ts/src/agent/loop/llm-phase.ts` intentionally passes `logicalConversationId` to LLM invocations so `AutobyteusLLM` can route hosted conversations, but external provider adapters must not forward that internal coordination field to their SDK request payloads.
- `OpenAICompatibleRequestBuilder` already filters internal kwargs including `logicalConversationId`; `AnthropicLLM` currently forwards all kwargs except `stream`, exposing the missing boundary invariant.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature + bug fix.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing provider-boundary invariant, with duplicated internal-kwarg filtering policy across provider adapters.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Needed, but targeted: keep model-catalog/request-shape changes in existing LLM owners and add/reuse a provider-kwarg sanitizer so Anthropic does not duplicate or omit the internal filtering rule.
- Evidence basis:
  - Catalog rows live in `autobyteus-ts/src/llm/supported-model-definitions.ts` and only include Opus 4.8, Opus 4.7, and Sonnet 4.6 for Anthropic.
  - `autobyteus-ts/src/llm/api/anthropic-llm.ts` identifies only `claude-opus-4-7` as adaptive-thinking/no-temperature-special, but official docs now apply those rules to more current models.
  - `AnthropicLLM.applyAnthropicRequestParams()` spreads invocation kwargs into the Anthropic SDK request after deleting only `stream`, so runtime-only `logicalConversationId` leaks to Anthropic.
  - `OpenAICompatibleRequestBuilder` already carries the internal kwarg deny-list, showing the boundary rule exists but is not owned in a reusable place.
  - `LLMFactory.reloadModels()` does not support dynamic Anthropic model discovery.
- Requirement or scope impact: Adding Sonnet 5/Fable 5 safely requires catalog/pricing updates, provider request-shape invariants, and provider-boundary filtering of runtime kwargs; do not add unsupported `claude-sonnet-4.8`.

## Recommendations

1. Do **not** add `claude-sonnet-4.8`; add `claude-sonnet-5` instead if the product wants the latest Sonnet model.
2. Add `claude-fable-5` only with explicit cost/UX caution because it is substantially more expensive and has Fable-specific response/data-retention/refusal behavior.
3. Fix the Anthropic adapter before or alongside any catalog expansion:
   - model-family predicate should cover Opus 4.8, Opus 4.7, Sonnet 5, Fable 5, Mythos 5, and 4.6 adaptive-capable models as appropriate;
   - avoid injecting `temperature: 0` into current models that reject non-default sampling parameters;
   - map UI schema thinking controls to provider-valid adaptive thinking or disable behavior per model.
4. Update pricing metadata effective date and curated context/output metadata for `claude-sonnet-5` and `claude-fable-5` if those models are added.
5. Keep `claude-sonnet-4.6` selectable for now unless a separate product decision removes it, but update its request-shaping toward adaptive thinking because manual budget thinking is documented as deprecated.
6. Clarify in UI/docs that Anthropic Reload Models does not dynamically add new Anthropic API models; it reloads static catalog state.
7. Filter internal runtime kwargs at the provider adapter boundary before Anthropic SDK calls; `logicalConversationId` must remain available to `AutobyteusLLM` but must not reach Anthropic.
8. Add deterministic mocked tests for the internal-kwarg filtering invariant and one minimal non-Fable live Anthropic integration validation using `logicalConversationId`, because the reported failure only appears with runtime-style kwargs.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium if implemented. The catalog additions are small, but safe delivery crosses model catalog, metadata, pricing, request-shape rules, tests, and docs.

## In-Scope Use Cases

- Verify current Anthropic Sonnet/Fable model availability.
- Add current verified Anthropic API catalog rows if approved.
- Keep cost metadata accurate enough for token usage estimates.
- Ensure Anthropic request payloads are valid for current models.
- Avoid misleading users into selecting unsupported or very expensive models accidentally.

## Out of Scope

- Further broad paid Anthropic API calls, especially Fable 5/model-matrix calls. Only the minimal user-approved non-Fable Anthropic live reproduction/validation for the `logicalConversationId` failure is in scope.
- Adding unverified model aliases such as `claude-sonnet-4.8`.
- Implementing automatic dynamic discovery of all Anthropic API models unless requested separately.
- Implementing full Fable refusal fallback orchestration beyond safe response classification/surfacing unless requested separately.
- Changing default model selection without explicit product decision.
- Changing `AutobyteusLLM`'s requirement for `logicalConversationId`; that internal kwarg is intentional for the hosted AutoByteus provider.

## Functional Requirements

- `REQ-001`: AutoByteus must not expose `claude-sonnet-4.8` unless Anthropic officially documents or returns that exact API model ID.
- `REQ-002`: If the latest Anthropic Sonnet is added, AutoByteus must expose it as `claude-sonnet-5` with provider value `claude-sonnet-5`.
- `REQ-003`: If Claude Fable is added, AutoByteus must expose it as `claude-fable-5` with provider value `claude-fable-5` and with high-cost behavior clearly represented in trusted pricing metadata.
- `REQ-004`: Built-in Anthropic pricing metadata must include trusted base input/output prices, cache read/hit prices, 5-minute cache write prices, and 1-hour cache write prices when Anthropic publishes them.
- `REQ-005`: Anthropic adapter request-shaping must not send provider-invalid manual `thinking: { type: "enabled", budget_tokens: ... }` to models that only accept adaptive/default thinking.
- `REQ-006`: Anthropic adapter request-shaping must not inject non-default sampling parameters into models that reject `temperature`, `top_p`, or `top_k` overrides.
- `REQ-007`: Model context/output metadata for new Anthropic catalog rows must come from current official Anthropic documentation or live model metadata and include verification dates.
- `REQ-008`: The API Key Management / provider model browser must continue to show the static built-in Anthropic catalog accurately; reload behavior must not falsely imply dynamic Anthropic model discovery.
- `REQ-009`: Durable docs and tests must identify current Anthropic supported models and request-shape rules.
- `REQ-010`: Detailed pricing documentation and/or implementation notes must distinguish standard sync pricing, prompt-cache pricing, Batch API discounts, US-only data-residency multipliers, Fast Mode pricing for Opus 4.8, tool-token overhead, and newer-tokenizer cost risk.
- `REQ-011`: External provider adapters, including Anthropic, must filter AutoByteus internal invocation kwargs (`logicalConversationId`, `logical_conversation_id`, `conversationId`, `agentId`, `turnId`, `requestId`, `renderedPayload`) before constructing provider API requests.
- `REQ-012`: Anthropic streaming and non-streaming calls must still preserve provider-valid caller kwargs such as `tools` and valid provider `thinking` overrides while filtering internal runtime kwargs.

## Acceptance Criteria

- `AC-001`: `claude-sonnet-4.8` is not added and does not appear in the built-in Anthropic model list.
- `AC-002`: If approved, the Anthropic model list includes `claude-sonnet-5` and `claude-fable-5`, in addition to any retained current models, with exact provider values.
- `AC-003`: Token pricing lookup returns trusted USD prices for added Anthropic models: Sonnet 5 launch/standard policy handling is explicit, and Fable 5 uses `$10/$50` per MTok base input/output unless changed by verified docs.
- `AC-004`: Unit tests prove Opus 4.8 no longer receives provider-invalid manual thinking or injected `temperature: 0` in default/adaptive paths.
- `AC-005`: Unit tests prove Sonnet 5 and Fable 5 request-shape behavior is provider-valid for thinking and sampling parameters.
- `AC-006`: Metadata resolver/catalog tests verify context/output limits for any added Anthropic rows.
- `AC-007`: Documentation explains that Anthropic targeted reload returns the existing static catalog count and does not discover new Anthropic models dynamically.
- `AC-008`: Final implementation does not make Fable 5 a default selection or fallback unless the user explicitly approves that product behavior.
- `AC-009`: Pricing tests or implementation evidence verify Anthropic cache dimensions for Fable 5, Opus 4.8, and Sonnet 5 rather than only base input/output prices.
- `AC-010`: Mocked Anthropic unit tests prove `logicalConversationId` and sibling internal runtime kwargs are absent from both sync and streaming SDK request payloads while `tools` and valid provider kwargs remain usable.
- `AC-011`: A minimal live Anthropic integration validation with `logicalConversationId` succeeds against a non-Fable model, or is explicitly skipped only by the existing provider-access skip helper when credentials/access are unavailable.

## Constraints / Dependencies

- Anthropic pricing/model availability is time-sensitive; implementation must re-check official docs on the implementation date.
- No further paid Anthropic calls unless explicitly approved; use the smallest non-Fable prompt/model for the user-approved `logicalConversationId` validation and never print `.env.test` secrets.
- Official pricing shows Fable 5 is materially expensive and uses a newer tokenizer; cost controls should not assume visible output tokens equal billed reasoning tokens.
- Fable 5 includes safety-classifier refusals and 30-day data-retention requirements according to Anthropic docs; these may affect product suitability.
- Existing code's LLM model registry is static for built-in Anthropic models.
- Runtime `logicalConversationId` remains an internal AutoByteus orchestration kwarg and must not become part of external provider request contracts.

## Assumptions

- The screenshot is the AutoByteus default API runtime model list for built-in LLM providers.
- The user wants analysis first; implementation requires user approval of the proposed scope.
- The product should prefer cost-safe choices over exposing expensive models as defaults.

## Risks / Open Questions

- Anthropic's Sonnet 5 launch pricing changes after 2026-08-31. A single static price may become stale; if implementation happens before then, decide whether to encode launch price, standard price, or a time-aware policy.
- Fable 5 refusal/fallback behavior may require UX work if the app should distinguish refusal from normal empty/partial responses.
- Adding Fable 5 without data-retention disclosure could surprise users who expect zero-data-retention compatibility.
- The current UI schema shape may need to represent always-on/non-disable-capable thinking for Fable differently from toggleable thinking for other Claude models.
- Other non-OpenAI-compatible external adapters that spread raw kwargs may have the same latent leak; Anthropic is in scope because it is reproduced and user-reported, while broader provider hardening should be handled only if it stays a small shared-sanitizer application.

## Requirement-To-Use-Case Coverage

- `REQ-001`, `REQ-002` -> verify and expose the correct latest Sonnet model.
- `REQ-003`, `REQ-004` -> cost-aware Fable/Sonnet support.
- `REQ-005`, `REQ-006` -> valid Anthropic runtime requests.
- `REQ-007` -> accurate model limits.
- `REQ-008` -> API Key Management model-browser behavior.
- `REQ-009` -> durable maintenance path.
- `REQ-010` -> detailed cost and pricing transparency.
- `REQ-011`, `REQ-012` -> valid runtime invocation boundary for Anthropic under the agent loop.

## Acceptance-Criteria-To-Scenario Intent

- `AC-001` -> prevents unsupported Sonnet 4.8 catalog pollution.
- `AC-002` -> ensures current verified models are added only if approved.
- `AC-003` -> verifies cost accounting is not misleading.
- `AC-004`, `AC-005` -> catches provider-invalid request payloads before API/E2E.
- `AC-006` -> verifies model metadata completeness.
- `AC-007` -> prevents confusion around reload behavior.
- `AC-008` -> avoids accidental high-cost default routing.
- `AC-009` -> ensures cache-aware pricing is represented correctly.
- `AC-010`, `AC-011` -> prevents recurrence of the live `logicalConversationId` Anthropic 400 error.

## Approval Status

Approved by user on 2026-07-07 for implementation of the three target models: keep/fix `claude-opus-4.8`, add `claude-sonnet-5`, and add `claude-fable-5`. User explicitly requested no integration tests for those three model additions because Fable is expensive; use non-paid deterministic coverage for model support. User later explicitly approved Claude LLM integration investigation for the reported Anthropic runtime error; only minimal non-Fable live validation is approved for that bug.

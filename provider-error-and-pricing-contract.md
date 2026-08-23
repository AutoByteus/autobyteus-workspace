# Provider, Pricing, and Error Contract

## Status

**Design supplement — aligned to the user-approved requirements basis.** This file is intended behavior and implementation evidence for REQ-001–REQ-012 and AC-001–AC-018. It must remain aligned with `requirements.md`; it does not authorize broader provider coverage or historical pricing.

## 1. Latest-only catalog contract

The curated text-LLM catalog supports the current target in each named family:

| Provider family | Current catalog identifier | Provider request value | Legacy entries removed |
| --- | --- | --- | --- |
| Grok | `grok-4.6` | `grok-4.6` | `grok-4.5` |
| Gemini Flash | `gemini-3.7-flash` | `gemini-3.7-flash` | All pre-3.7 Flash rows |
| Kimi | `kimi-k3` | `kimi-k3` | K2.6, K2.7 Code, K2.7 Code Highspeed |
| GLM | `glm-5.3` | `glm-5.3` | `glm-5.2` |
| MiniMax | `minimax-m3` | `MiniMax-M3` | Older MiniMax text rows if present |

DeepSeek V4 Flash and V4 Pro remain current variants and are not replaced by this table.

Removing a catalog model means the factory no longer resolves or advertises that model. The model schema and provider adapter remain the normal production path for the current model; no separate request-rejection feature is introduced.

## 2. Current schema and request policy

The model schema is the documented configuration surface used by the catalog/UI. It owns current names, descriptions, defaults, and enum values. The provider adapter owns only transformations required by the provider request contract.

The normal request path must continue to:

1. apply common configuration;
2. apply the configuration produced by the selected model schema;
3. remove only internal framework keys and explicitly controlled fields;
4. send the exact current provider model value to the selected endpoint.

The ticket updates the normal current-model path; it does not add a separate request-validation subsystem.

Current-model policy examples:

- Grok 4.6 exposes the documented reasoning levels, including `xhigh`, and uses the current xAI endpoint.
- Gemini 3.7 Flash exposes supported thinking levels and sends the current thinking configuration shape; it does not generate the obsolete `minimal` default.
- Kimi K3 uses the K3 reasoning/always-thinking contract. K2-specific normalizers and policy files are removed.
- GLM 5.3 exposes always-enabled thinking and the current effort values. It does not generate a disabled-thinking request from the current schema.
- MiniMax M3 uses the verified deployment endpoint and exact `MiniMax-M3` value.

This is the existing schema/catalog/factory/adapter production path. The ticket does not add a generic unknown-parameter rejection mechanism or a separate request-compatibility feature. Provider request rejection remains a provider error and follows the original-message contract below.

### Runtime-scoped model ownership

The model selection identity is the effective pair `{ runtimeKind, llmModelIdentifier }`, not a model identifier considered in isolation:

- `RuntimeKind.AUTOBYTEUS` is the only runtime whose curated model membership is owned by the AutoByteus catalog and `LLMFactory.requireCurrentModelIdentifier`.
- `RuntimeKind.CLAUDE_AGENT_SDK` remains owned by `ClaudeAgentRunBackendFactory`; `RuntimeKind.CODEX_APP_SERVER` remains owned by `CodexAgentRunBackendFactory`. Their existing SDK/session or thread bootstrap paths receive their configured model values and are not passed through the AutoByteus catalog guard.
- Application configuration and run-binding services normalize the effective runtime before validation. For teams, they expand preset/member configurations and evaluate each member pair; a member runtime override takes precedence over the team default, and absent runtime values default to AutoByteus.
- The AutoByteus guard is called only for AutoByteus pairs, before persisted readiness is reported or an AutoByteus run/team is allocated. External-runtime launches continue to `AgentRunManager`, which dispatches to the corresponding external factory.

No runtime receives an old AutoByteus alias or fallback. This is ownership scoping, not a new generic request-parameter rejection mechanism.

## 3. DeepSeek latest pricing contract

Only one current DeepSeek V4 schedule is configured. The schedule is selected by UTC time-of-day, not by the calendar date of a usage event.

Effective provenance: `2026-08-16T16:00:00Z` (00:00 Beijing on 17 August 2026).

Peak windows:

- `[01:00, 04:00)` UTC
- `[06:00, 10:00)` UTC

All other UTC times are off-peak.

Prices are USD per million tokens:

| Model | Period | Cache hit | Cache miss / standard input | Output |
| --- | --- | ---: | ---: | ---: |
| V4 Flash | Off-peak | 0.007 | 0.22 | 0.66 |
| V4 Flash | Peak | 0.014 | 0.44 | 1.32 |
| V4 Pro | Off-peak | 0.022 | 0.66 | 1.98 |
| V4 Pro | Peak | 0.044 | 1.32 | 3.96 |

The selected period identifier and current schedule provenance are recorded in the usage pricing snapshot. No retired schedule, historical lookup, date-based price selection, or old-record repricing is implemented. Existing snapshots remain immutable recorded results.

## 4. Pricing resolver shape

The catalog pricing model gains one current schedule representation (not a historical collection):

```ts
type TokenPricingSchedulePeriod = {
  periodId: "peak" | "off_peak";
  inputTokenPricing: number;
  outputTokenPricing: number;
  cachedInputReadTokenPricing: number;
  cachedInputWriteTokenPricing?: number;
  trustedDimensions: {
    input: boolean;
    output: boolean;
    cachedInputRead: boolean;
    cachedInputWrite: boolean;
    cachedInputWrite5m: boolean;
    cachedInputWrite1h: boolean;
  };
};

type TokenPricingSchedule = {
  scheduleId: "deepseek-v4-2026-08-17";
  timezone: "UTC";
  effectiveFrom: "2026-08-16T16:00:00Z";
  peakWindows: readonly [
    { periodId: "peak"; startMinuteUtc: 60; endMinuteUtc: 240 },
    { periodId: "peak"; startMinuteUtc: 360; endMinuteUtc: 600 },
  ];
  defaultPeriodId: "off_peak";
  periods: readonly [TokenPricingSchedulePeriod, TokenPricingSchedulePeriod];
};
```

`TokenPricingConfig` serializes this as `pricing_schedule`; its existing flat fields remain the trusted latest default (`off_peak`) for the current catalog status path. `LLMFactory.ModelPricingInfo` exposes `pricing_schedule` alongside those existing fields. `TokenPriceConfigProvider.resolvePolicy(payload)` consumes the schedule, maps the selected period's camel-case trusted dimensions to the existing `TokenPriceTrustedDimensions` snake-case shape, and returns `ResolvedTokenPricingPolicy` plus `pricing_schedule_id`, `pricing_schedule_period_id`, `pricing_schedule_effective_from`, and `pricing_schedule_timezone`.

Selection is deterministic: parse `observed_at` as an ISO instant, convert to UTC minute-of-day, match the half-open peak windows, and otherwise choose `off_peak`. The selected period supplies the existing input/output/cache dimensions and its trusted dimensions are copied into the resolved policy. Existing `TokenCostCalculator.selectTier` then applies current input-size tier behavior; DeepSeek V4 currently has no extra tiers. Invalid or absent scheduled timestamps return `pricing_status=missing` and `missing_reason=pricing_schedule_time_invalid`; no guess, old-price fallback, historical table, or date-based selector is introduced. The selected policy, schedule ID, period, and provenance are written to the new `pricing_snapshot_json`; existing snapshots are not rewritten.

## 5. Provider endpoint and metadata verification

Before implementation marks a row trusted, it must verify together:

- catalog identifier and provider request value;
- adapter base URL or SDK model routing;
- context and output limits;
- current input/output/cache prices and currency;
- provider source and verification date.

GLM 5.3 and MiniMax M3 endpoint deployment choices are explicitly verification gates. If the chosen deployment price cannot be verified, the row remains explicitly unpriced rather than inheriting the removed model's price.

## 6. API-key and provider-error contract

### Missing API key

A missing or blank provider credential is the only provider setup condition translated into an application-authored message:

- stable internal kind: `missing_api_key`;
- no provider request is attempted;
- user-visible message is `API key not provided for <provider>. Configure the <provider> API key before sending a request.`;
- no `SECRET_NOT_FOUND`, vault instruction code, secret value, or key material is shown.

`autobyteus-server-ts/src/secret-management/resolution/secret-management-provider-api-key-resolver.ts` maps a vault `NOT_FOUND` result (and any resolver-visible blank value) to the shared `MissingApiKeyError` from `autobyteus-ts/src/secrets/provider-api-key-error.ts`. `autobyteus-ts/src/agent/loop/llm-phase.ts` is the only user-facing translation point. Vault locked, unavailable, corrupt, or access-denied errors remain distinct safe vault errors.

### Provider error passthrough

For every other provider/request/transport failure:

1. retain the provider's original message;
2. redact credentials, authorization headers, and other secret material;
3. attach safe status/code/request identifiers only as supplemental metadata;
4. do not classify the response as balance, quota, authentication, rate limit, or another application category;
5. do not prefix it with a generic wrapper such as `Error in API request` or `Error processing your request with the LLM`.

A balance or quota response is therefore shown exactly as the provider returned it, subject only to redaction.

The extractor in `autobyteus-ts/src/llm/errors/provider-error.ts` produces:

```ts
type ProviderErrorEvidence = {
  message: string;
  providerStatus?: number | string | null;
  providerCode?: string | null;
  providerRequestId?: string | null;
  details?: string | null;
};
```

It reads common SDK fields (`message`, `status`, `code`, `request_id`, and safe request-id headers), omits absent metadata, redacts API keys/authorization/secret headers and credential-bearing payload fragments, and never classifies a provider response. If no usable message exists, it uses only `Provider request failed without an error message.` as an empty-source fallback.

### Event transport

The internal error event has separate fields:

- `code`: required non-empty transport metadata;
- `message`: original safe display text;
- `provider_status`, `provider_code`, `provider_request_id`, and safe `details` as optional fields;
- error scope/effect and turn correlation fields.

The provider's code is used as transport `code` when available and safe. Otherwise the producer supplies `LLM_PROVIDER_ERROR`; for missing credentials it supplies `missing_api_key`. This code is not used to replace the display message. All producers and parsers use the canonical `code` field; the old producer-only `source` field is removed rather than aliased.

The focused application-agent public stream is a deliberate provider-neutral boundary projection, not a second error meaning or metadata protocol. Its SDK source contract remains the existing five-variant shape:

```ts
type ApplicationAgentStreamEvent =
  | { type: "TURN_STARTED" }
  | { type: "TEXT_DELTA"; delta: string }
  | { type: "TURN_COMPLETED" }
  | { type: "TURN_INTERRUPTED" }
  | { type: "ERROR"; message: string };
```

`ApplicationAgentStreamEventProjector` maps only the safe canonical `message` into this shape and retains diagnostic filtering. It never copies native transport `code`, provider status/code/request ID, details, raw `error` objects, stack/cause values, headers, credentials, full payloads, provider session/thread/item IDs, or runtime configuration. The SDK README, normative application communication contract, generated declarations/build output, and application websocket/consumer tests must describe and validate this message-only shape. Native team/websocket transport may retain safe metadata; the application SDK does not.

The exact paths are `OpenAICompatibleLLM`/Gemini request -> extractor or missing-key mapper -> `LlmPhase` -> `AgentErrorNotification` -> `ErrorEventData` -> AgentRun mapper -> native `TeamAgentEventAdapter`/`TeamAgentEvent` -> team DTO schema -> websocket projector -> web `messageTypes.ts`/`messageParser.ts` -> web stream adapter -> `ErrorSegment`, and the separate application branch from the canonical AgentRun/team event -> `ApplicationAgentStreamEventProjector` -> message-only `ApplicationAgentStreamEvent.ERROR` -> application SDK consumer. Native error boundaries carry the required safe `code`/`message` pair and optional safe metadata; the application boundary carries only the safe `message`. A malformed unrelated native event may still fail its genuine schema validation, but a valid provider failure cannot become `Rejected ERROR: code is required`.

## 7. Redaction boundary

Redaction occurs before an error message enters the user-visible event path. It must cover:

- API keys and bearer/basic authorization values;
- secret query/header values;
- provider request payload fragments containing credential fields.

The redactor must not rewrite ordinary provider text or replace it with a semantic category. Full raw provider payloads remain diagnostics-only and are not emitted to clients. Generic `Error in API request`, `Error in API streaming`, and `Error processing your request with the LLM:` prefixes and truncation are removed so they cannot replace the provider message. The application projector must stop emitting `The agent response failed.` for a terminal provider event and instead use the safe event message, without copying native/provider metadata or raw error objects.

## 8. Persistence and legacy behavior

- Existing usage records and pricing snapshots are directly usable and are not rewritten.
- Model identity is an effective pair of `runtimeKind` plus `llmModelIdentifier`. `LLMFactory` owns exact active membership only for `RuntimeKind.AUTOBYTEUS` / the AutoByteus catalog. `ApplicationExecutionResourceConfigurationService` and `ApplicationRunBindingLaunchService` normalize the effective runtime for saved/direct agent and team-member selections, validate each pair before readiness or run side effects, and call the AutoByteus guard only for AutoByteus pairs. Claude Agent SDK and Codex App Server pairs are not passed to `LLMFactory`; their existing backend factories remain the model owners and preserve their current launch behavior. Removed AutoByteus IDs return `CURRENT_MODEL_SELECTION_REQUIRED` / `The selected model is no longer supported. Select a current supported model.` through the application SDK issue contract and retain the saved string for editing. Team configs are fully expanded and checked before allocating a team run ID.
- No old-to-new model alias, legacy price lookup, dual request branch, or silent fallback is retained.

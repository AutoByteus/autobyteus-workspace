# Design Spec

## Current-State Read

This ticket follows four existing production paths:

1. Model selection: effective runtime/model pair -> AutoByteus catalog/LLMFactory or Claude/Codex backend factory -> provider SDK/endpoint.
2. Pricing: usage event -> TokenPriceConfigProvider -> TokenCostCalculator -> immutable usage snapshot.
3. Credentials: ProviderApiKeyResolver -> secret-management resolver -> provider client initialization.
4. Errors: provider/secret failure -> LlmPhase/notifier -> AgentRun mapping -> native team/websocket projection -> client error segment, with a separate application-agent projector that narrows the same safe message to the provider-neutral SDK stream.

The catalog and provider adapters already own model execution. The pricing package already owns cost policy. The secret resolver already owns credential lookup. The event mismatch is the confirmed structural defect: the producer emits source while the team contract requires code. The target strengthens these owners; it does not add a separate request-validation subsystem.

## Intended Change

- Replace the named old catalog rows with the current Grok, Gemini Flash, Kimi, GLM, and MiniMax rows.
- Update their schemas, defaults, current thinking/reasoning settings, metadata, endpoint, and price data.
- Remove obsolete provider-specific branches and policy files.
- Add one current DeepSeek V4 peak/off-peak schedule and select it by UTC time-of-day.
- Translate only a missing/blank API key into a clear setup message.
- Preserve every other provider message after secret redaction.
- Carry a required transport code separately from the unchanged display message.
- Repair the Docker/team event path so a valid provider error cannot become Rejected ERROR: code is required.

## Relevant Behavior And Production-Path Map

| Behavior ID | Kind | Approved IDs | Current evidence | Target outcome | Spine |
| --- | --- | --- | --- | --- | --- |
| B-001 | User/Contract | REQ-001–002; AC-001–002 | Catalog exposes Grok 4.5 | Catalog exposes Grok 4.6 and current metadata | DS-001 |
| B-002 | Operational | REQ-003–004; AC-003–004 | DeepSeek prices are flat and stale | Current UTC schedule selects peak/off-peak prices; no historical lookup | DS-002 |
| B-003 | User/Contract | REQ-001–002; AC-001–002, AC-005 | Flash rows are pre-3.7 and use obsolete thinking default | Gemini 3.7 Flash is the current Flash row with current thinking shape | DS-001 |
| B-004 | User/Contract | REQ-001–002; AC-001, AC-006 | Kimi rows and normalizers are K2-specific | K3 row and current policy replace K2 | DS-001 |
| B-005 | User/Contract | REQ-001–002, REQ-005; AC-001–002, AC-007 | GLM 5.2 permits disabled thinking | GLM 5.3 current schema and always-enabled request shape | DS-001 |
| B-006 | User/Contract | REQ-006; AC-008–009 | Missing record leaks SECRET_NOT_FOUND | Clear missing-key setup message; other vault failures stay distinct | DS-001, DS-003 |
| B-007 | User/Contract | REQ-007, REQ-009; AC-010–012 | Provider errors are generically wrapped | Original provider message survives after redaction | DS-003 |
| B-008 | Contract/User | REQ-008, REQ-009; AC-013–014 | source/code mismatch rejects Docker event | code is transport metadata; message remains original | DS-003 |
| B-009 | Contract/User | REQ-007, REQ-009–010; AC-011, AC-014–015 | Native/application consumers receive generic or hidden error text | Native web renders the safe original message and native transport may retain safe metadata; the application-agent SDK preserves only the safe original message in its existing `ERROR` variant | DS-003 |
| B-010 | User/Contract | REQ-001–002, REQ-011; AC-001–002, AC-016–017 | MiniMax M3 exists with stale metadata | M3 metadata, price, and verified deployment endpoint are current | DS-001 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship |
| --- | --- | --- | --- |
| /Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/provider-error-and-pricing-contract.md | Current provider, pricing, schema, endpoint, and error contracts | REQ-001–012; AC-001–018 | Detailed contract and evidence supplement aligned to this design |
| /Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/tickets/done/application-agent-streaming/application-agent-communication-contract.md | Normative application-agent binding, stream, and message-only public `ERROR` contract | REQ-007–010; AC-011, AC-014–015 | Existing application boundary reconciled to safe original-message passthrough without exposing native/provider metadata |

## Task Design Health Assessment

- Change posture: Larger Requirement.
- Current design issue found: Yes.
- Root cause classification: Boundary Or Ownership Issue, Missing Invariant, Duplicated Policy Or Coordination, Shared Structure Looseness, and Legacy Or Compatibility Pressure.
- Refactor needed now: Yes, limited to affected provider policy and error/event boundaries.
- Evidence: model rules are split across catalog and adapters; DeepSeek pricing lacks time windows; producer and team contract disagree on error fields; request wrappers replace provider text.
- Design response: retain the existing catalog -> factory -> adapter path; make pricing policy schedule-aware; make safe provider-message extraction authoritative; make code/message a single transport shape.
- Residual risk: GLM and MiniMax deployment endpoint/price verification remains an implementation evidence gate. The balance hypothesis is not asserted as fact.

## Terminology

- Current catalog row: the supported definition for a named provider family in this ticket.
- Provider message: provider/SDK error text, preserved after redaction.
- Protocol code: required event metadata, never a replacement for the user-visible message.
- Current schedule: the one active DeepSeek schedule; its periods vary by UTC time but it has no historical versions.

## Persisted Data / State Transition Decision

- Stored subject: usage records, run summaries, pricing_snapshot_json, and launch/profile model identifiers.
- Change: current pricing snapshots gain selected schedule provenance; model rows and metadata change.
- Normal behavior: usage readers accept snapshot JSON as opaque data; profile/model readers resolve identifiers through the current catalog.
- Invariants: old usage amounts are immutable; new DeepSeek pricing never selects a retired policy; old model IDs never silently resolve to a different model.
- Decision: Directly Usable — No Migration.
- Rationale: Existing snapshots retain their meaning and are not rewritten. Removed model IDs are rejected at current resolution, so no old/new business-path decoder is required.
- Constraints: REQ-004, REQ-009, REQ-012 and AC-004, AC-014, AC-018.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behaviors | Start | End | Owner |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | B-001, B-003–B-006, B-010 | User/profile selection | Provider request or setup/model-resolution failure | Catalog/Factory plus provider adapter |
| DS-002 | Primary End-to-End / Bounded Local | B-002 | Usage event | Costed immutable snapshot | Token pricing policy |
| DS-003 | Return/Event | B-006–B-009 | Provider/secret failure | Client/team error message | Agent event contract |

## Primary Execution Spines

- DS-001: User/profile selection -> effective `{ runtimeKind, llmModelIdentifier }` -> runtime-owned model path (`AUTOBYTEUS` catalog/LLMFactory -> AutoByteus adapter, or Claude/Codex backend factory) -> SDK/endpoint.
- DS-002: Usage event -> current pricing policy -> UTC period selection -> existing token-tier arithmetic -> snapshot/repository.
- DS-003: Provider/secret failure -> safe error extraction -> notifier -> AgentRun mapper -> native team/websocket -> ErrorSegment, with a separate application-agent projector -> message-only SDK `ERROR` event.

## Spine Narratives

| Spine | Narrative | Main nodes | Off-spine concerns |
| --- | --- | --- | --- |
| DS-001 | The effective selection is a runtime/model pair. For `RuntimeKind.AUTOBYTEUS`, the catalog defines current identity, schema, defaults, metadata, and adapter; `LLMFactory` resolves it and owns exact current membership. For `CLAUDE_AGENT_SDK` and `CODEX_APP_SERVER`, the corresponding backend factory owns the provider model/session or thread bootstrap and the AutoByteus catalog guard is not invoked. Saved-profile/readiness and run-binding owners normalize and validate each effective pair before any run side effect. | RuntimeKind normalization, AutoByteus catalog/LLMModel/LLMFactory, Claude backend factory, Codex backend factory, provider adapters, application configuration/run binding | Secret lookup, metadata discovery |
| DS-002 | Pricing policy resolves current DeepSeek period before existing arithmetic. The selected policy is persisted as evidence for the new usage event. | Usage payload, ModelPricingInfo, pricing provider, calculator, repository | Source/effective provenance, invalid timestamp |
| DS-003 | Safe message preparation happens before transport. Native producers, parsers, mappers, team DTOs, websocket projectors, and web parsers carry the typed safe evidence shape. The application-agent projector deliberately narrows that evidence to the existing message-only `ERROR` event. `code` is required native transport metadata; `message` is never replaced by it. | Provider error, notifier, stream, AgentRun mapper, team adapter, team DTO, native websocket projector, application projector, web protocol, UI | Redaction, public-boundary projection, scope/effect, malformed unrelated events |

### DS-001 runtime-aware saved-model validation and reselection path

The current-model guard is a catalog capability, not a generic request-parameter rejection feature. The identity being validated is the effective pair `{ runtimeKind, llmModelIdentifier }`, and ownership is selected before validation:

1. `autobyteus-server-ts/src/runtime-management/runtime-kind-enum.ts` is the shared server-side runtime identity and normalization owner. Use `runtimeKindFromString(value, RuntimeKind.AUTOBYTEUS)` for the existing defaulting behavior. Do not make `autobyteus-ts` import server orchestration types.
2. `autobyteus-ts/src/llm/llm-factory.ts` remains the authoritative current-model owner only for `RuntimeKind.AUTOBYTEUS` / catalog-owned selections. Its exact active lookup accepts only the current `modelIdentifier`; it does not search old identifiers, aliases, names, or prices for a replacement. The application orchestration validator calls it only after the effective runtime is `AUTOBYTEUS`. It throws a typed `CurrentModelSelectionRequiredError` containing the rejected identifier only for internal diagnostics. Claude/Codex selections are not passed to this guard.
3. `autobyteus-server-ts/src/application-orchestration/services/application-execution-resource-configuration-service.ts` owns persisted application readiness. For an agent profile, and for a team default/member profile, it derives the effective runtime/model pair after normal profile/topology normalization. A member runtime override wins over the team default; absent values default to `AUTOBYTEUS`. It invokes the AutoByteus guard only for AutoByteus pairs. Claude and Codex pairs remain valid against this catalog check and retain ownership by `ClaudeAgentRunBackendFactory` and `CodexAgentRunBackendFactory` when the run is prepared. Its `normalizeLaunchProfileForWrite` path applies the same runtime-aware rule before persisting a new profile. A stale AutoByteus identifier returns `status: "INVALID_SAVED_CONFIGURATION"`, preserves the saved profile in `invalidSavedConfiguration`, and emits the application SDK issue code `CURRENT_MODEL_SELECTION_REQUIRED` with the stable message: `The selected model is no longer supported. Select a current supported model.` The separate missing-key message is `API key not provided for <provider>. Configure the <provider> API key before sending a request.` No profile is rewritten or silently reselected.
4. `autobyteus-server-ts/src/application-orchestration/services/application-run-binding-launch-service.ts` is the final launch boundary. For an agent it normalizes the effective runtime, invokes the AutoByteus guard only for `AUTOBYTEUS`, and only then calls `AgentRunService.createAgentRun`. For a team it first builds the effective preset/member configs, retains each member's runtime override, derives each `{ runtimeKind, llmModelIdentifier }` pair, validates every AutoByteus pair, and only then calls `TeamRunService.allocateTeamRunId` and `TeamRunService.createTeamRun`. A stale direct AutoByteus launch fails with the same typed code/message and performs no run allocation or provider/client construction. An external-runtime launch bypasses the AutoByteus guard and continues to `AgentRunManager`, whose existing dispatch selects the Claude or Codex factory. This preserves unrelated external-runtime behavior and closes the direct-launch bypass without making `LLMFactory` globally authoritative.
5. `AgentRunManager.resolveBackendFactory` remains the runtime dispatch owner: AutoByteus selects `AutoByteusAgentRunBackendFactory`, Claude selects `ClaudeAgentRunBackendFactory`, and Codex selects `CodexAgentRunBackendFactory`. External factories consume their existing SDK/thread model configuration; this design does not impose AutoByteus catalog IDs on them.
6. The UI may show the existing invalid-configuration repair state and asks the user to select/save a current AutoByteus catalog entry when that runtime is selected. It does not offer an alias or auto-migration. This is directly usable/no migration because the stored string remains intact and only the affected AutoByteus execution is blocked.

The validation sequence is therefore:

```text
saved profile -> normalize effective runtime/model pairs
  -> AUTOBYTEUS: LLMFactory current identifier guard
  -> CLAUDE/CODEX: retain external factory ownership
  -> ready configuration OR CURRENT_MODEL_SELECTION_REQUIRED

direct agent/team launch -> expand effective runtime/model pairs
  -> validate every AUTOBYTEUS pair only
  -> allocate/create run
  -> AgentRunManager dispatches to the runtime-owned factory
```

The AutoByteus provider adapter is not reached on a stale AutoByteus failure leg. An external runtime is not rejected by an unrelated AutoByteus catalog lookup.

### DS-003 provider-error evidence and complete transport contract

The one safe evidence type is defined in `autobyteus-ts/src/llm/errors/provider-error.ts` and reused by the runtime event shape:

```ts
type ProviderErrorEvidence = {
  message: string;                 // original available message, redacted only
  providerStatus?: number | string | null;
  providerCode?: string | null;
  providerRequestId?: string | null;
  details?: string | null;         // safe redacted diagnostics, never raw payload/headers
};
```

The extractor reads the original `Error`/SDK object and common fields (`message`, `status`, `code`, `request_id`, and safe request-id headers such as `x-request-id`). It keeps the first non-empty provider message, redacts API keys, authorization values, secret query/header values, and credential-bearing payload fragments, and does not add balance/quota/authentication categories. If no provider metadata exists, those fields are omitted/null. If no message exists at all, the transport uses the minimal fallback `Provider request failed without an error message.`; this is only an empty-source fallback and never replaces an available provider message.

The producer/parser/mapper path is explicit:

| Boundary | Target shape and responsibility |
| --- | --- |
| `OpenAICompatibleLLM` request/stream and `autobyteus-ts/src/utils/gemini-helper.ts`/`gemini-llm.ts` paths | Re-throw the original error object; remove `Error in API request` and `Error in API streaming` wrappers. Client initialization errors are not flattened. Gemini's fetch/SDK response is passed to the same extractor. |
| `autobyteus-ts/src/agent/loop/llm-phase.ts` | Detect `MissingApiKeyError` and emit only the intentional `missing_api_key` setup message. For every other error, call the extractor, remove `Error processing your request with the LLM:` and the 1000-character slice, and notify with `message=evidence.message`, `details=evidence.details`, `provider_status`, `provider_code`, `provider_request_id`, and canonical `code`. |
| `notifiers.ts` and `stream-event-payload-lifecycle.ts` | Replace producer-only `source` with required canonical `code`; add optional snake-case safe evidence fields and retain `error_scope`, `error_effect`, and `turn_id`. The notifier type separates transport `code` from display `message`. Update every notifier producer (`llm-phase.ts`, `tool-phase.ts`, `agent-turn-runner.ts`, `compaction-runtime-reporter.ts`, and `llm-response-pipeline.ts`) so non-provider errors also emit a truthful non-empty transport code. |
| `AgentRunEvent` and `agent-run-event-message-mapper.ts` | Preserve the fields during event serialization and map all safe evidence fields without deriving a new semantic category. |
| `TeamAgentEventAdapter` and `team-agent-event.ts` | Require non-empty `code` and `message` as before, but carry optional provider status/code/request ID/details; only malformed events are rejected. A valid provider failure cannot produce `code is required`. |
| `autobyteus-team-stream-contracts/src/team-agent-message-dtos.ts` and `team-stream-server-message.ts` | Extend the strict ERROR payload schema with the optional safe evidence fields. Null/omitted values are valid; raw headers/payloads are not. |
| `team-agent-event-websocket-projector.ts` | Project the actual safe `message` and optional safe native metadata. Remove `The agent response failed.` for terminal provider errors; diagnostic filtering remains unchanged. |
| `application-agent-stream-event-projector.ts` and `autobyteus-application-sdk-contracts/src/application-agent-events.ts` | Keep the existing five-variant application stream and project terminal errors as `{ type: "ERROR", message }` using the safe canonical message. Do not add provider status/code/request ID/details to the application SDK; do not copy raw error objects, stacks, causes, provider payloads, credentials, or runtime/session identifiers. |
| `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts`, `messageParser.ts`, `agentStreamMessageProjector.ts`, `teamStreamDtoAdapters.ts`, and `types/segments.ts` | Validate/carry the same optional fields and construct `ErrorSegment` with the received message. `ErrorSegment.vue` keeps its heading but renders the message; optional safe provider metadata can remain in details/debug presentation, never provider classification. |

The canonical native transport code is `providerCode` when it is a safe non-empty provider code; otherwise `LLM_PROVIDER_ERROR`. For missing credentials it is `missing_api_key`. The code is native transport metadata only; all user-visible text, including the application-agent SDK message, comes from the safe `message`.

### DS-002 DeepSeek schedule projection onto current pricing types

The schedule is a single current value, not a historical collection:

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

`TokenPricingConfig` in `autobyteus-ts/src/llm/utils/llm-config.ts` stores/round-trips the current `pricingSchedule`; the snake-case config representation uses `pricing_schedule`. For a scheduled DeepSeek config, its existing flat fields remain trusted and equal the latest default (`off_peak`) period so the current `ModelPricingInfo` status path remains usable; schedule selection overrides those values before billing. `LLMFactory.getModelPricingInfo` adds `pricing_schedule: TokenPricingSchedule | null` to `ModelPricingInfo`, preserving the existing flat fields for unscheduled providers. `TokenPriceConfigProvider` maps the schedule to `ResolvedTokenPricingPolicy` in `autobyteus-server-ts/src/token-usage/pricing/token-pricing-policy.ts`:

1. Parse `payload.observed_at` as an ISO instant and convert to UTC minute-of-day. A missing/invalid instant returns `pricing_status: "missing"` with `missing_reason: "pricing_schedule_time_invalid"`; it never guesses and never reads a retired table.
2. Match peak windows as half-open intervals; otherwise choose `defaultPeriodId` (`off_peak`). For each DeepSeek variant, the selected period supplies cache-hit, cache-miss/input, and output rates.
3. Construct the existing `ResolvedTokenPricingPolicy` from that selected period. Map the schedule's camel-case trusted-dimension shape to the policy's existing `TokenPriceTrustedDimensions` snake-case fields. Its `trusted_dimensions` is the selected period's object, not the unselected default base. Add `pricing_schedule_id`, `pricing_schedule_period_id`, `pricing_schedule_effective_from`, and `pricing_schedule_timezone` to the policy.
4. Pass the resolved policy to the existing `TokenCostCalculator.selectTier`. Current DeepSeek has no input tiers, so `input_price_tiers` is empty; if a future current schedule period carries tiers, tier selection replaces the corresponding resolved dimensions after period selection. No extra DeepSeek tier or historical composition is introduced here.
5. Persist the full resolved policy (including selected period/provenance) in `pricing_snapshot_json`; build `pricing_policy_key` from provider/model/current `scheduleId`/period, never from the observed calendar date. Existing snapshots remain immutable and readable. The resolved `price_config_id` stays the catalog identity; the schedule/period are appended to `pricing_policy_key`, not represented as a second historical price record.

The current prices are: V4 Flash off-peak `0.007/0.22/0.66`, peak `0.014/0.44/1.32`; V4 Pro off-peak `0.022/0.66/1.98`, peak `0.044/1.32/3.96` for cache-hit/input-miss/output USD per million tokens. The schedule is projected into the current flat policy rather than creating a second cost-calculation engine.

## Spine Actors / Main-Line Nodes

RuntimeKind normalization, catalog, LLMFactory, AutoByteus provider adapter, Claude/Codex backend factories, AgentRunManager, provider SDKs, usage event, TokenPriceConfigProvider, TokenCostCalculator, secret resolver, AgentError notifier, AgentRun mapper, team adapter, websocket projection, client error segment.

## Ownership Map

- Catalog owns curated identity, schema/defaults, static metadata, and current price definitions.
- LLMFactory owns AutoByteus catalog lookup/construction and the exact-current-model guard only for `RuntimeKind.AUTOBYTEUS`; it never aliases a removed identifier. Claude and Codex backend factories own their external-runtime model/session/thread bootstrap and are not subject to the AutoByteus catalog guard.
- Application configuration and run-binding services own the narrow effective-selection runtime gate: normalize the existing `RuntimeKind`, derive effective team member pairs, and delegate only AutoByteus pairs to the catalog guard. This gate does not validate or reject external-runtime model identifiers.
- Provider adapters own endpoint, provider model value, and provider request shape.
- Secret resolver owns credential retrieval and maps only a missing/blank credential to `MissingApiKeyError`; `LlmPhase` owns the user-facing setup message.
- TokenPriceConfigProvider owns current schedule resolution.
- TokenCostCalculator owns token-tier selection and arithmetic.
- Error boundary owns safe provider-message extraction and redaction; runtime owns the intentional missing-key translation.
- Agent/team mappers own transport projection, including safe supplemental evidence, not provider classification. Runtime dispatch remains with `AgentRunManager`; model validation must not cross from the AutoByteus owner into external runtime factories.
- UI owns rendering the supplied message and safe metadata, not interpretation.

## Thin Entry Facades / Public Wrappers

| Facade | Governing owner | Must not own |
| --- | --- | --- |
| LLMFactory create/lookup | Catalog and adapter owners | Provider HTTP policy or cost arithmetic |
| OpenAICompatibleLLM | Concrete adapter/shared transport | User-facing error rewriting |
| Stream/websocket handlers | Agent/team event contracts | Provider error classification |
| Usage accumulator/repository | Pricing policy and persistence | Selecting historical or provider-specific prices |

## Removal / Decommission Plan

| Item | Why removed | Replacement | Scope |
| --- | --- | --- | --- |
| Grok 4.5 row | Current Grok row replaces it | Grok 4.6 definition | In change |
| Pre-3.7 Gemini Flash rows | Current Flash target replaces them | Gemini 3.7 definition | In change |
| Kimi K2 rows and K2 policy file | K3 owns current Kimi path | K3 schema/adapter policy | In change |
| GLM 5.2 row and disabled branch | GLM 5.3 current contract | GLM 5.3 schema/adapter | In change |
| Old MiniMax text rows, if any | M3 is current target | MiniMax M3 definition | In change |
| Generic API request/stream wrappers | They destroy provider text | Original-cause error boundary | In change |
| source-only event payload | Team contract requires code | Canonical code/message payload | In change |
| DeepSeek flat old prices | Current schedule replaces them | Current schedule policy | In change |
| Historical price lookup | User rejected historical pricing | None | In change |
| Silent model aliases/fallbacks | Old models unsupported | Explicit current-model selection | In change |

## Return Or Event Spine

DS-003 is: Provider/secret error -> safe error evidence -> AgentErrorNotification(code,message,classification) -> ErrorEventData -> AgentRun mapper -> (TeamAgentEventAdapter -> native websocket/client -> ErrorSegment, and ApplicationAgentStreamEventProjector -> message-only SDK `ERROR`).

The code is required transport metadata. The message is the safe original provider text. A valid provider failure must never become Rejected ERROR: code is required.

## Bounded Local / Internal Spines

- Adapter: current schema/config -> current provider normalization -> request builder -> provider request.
- DeepSeek: observed_at UTC minute -> peak match or off-peak -> current policy -> existing input-tier arithmetic.
- Errors: caught error -> original message/metadata extraction -> redaction -> notifier payload.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Owner | Responsibility | Risk if placed on main line |
| --- | --- | --- | --- | --- |
| Secret vault | DS-001/003 | Secret resolver | Credential retrieval/state | Leaks vault internals into adapters |
| Metadata discovery | DS-001 | Catalog/Factory | Context/output resolution | Adapters become catalog owners |
| Redaction | DS-003 | Error boundary | Remove secret material | UI/transport can leak secrets |
| Usage persistence | DS-002 | Repository | Immutable storage | Pricing mutates history |
| Scope/effect | DS-003 | Agent runtime | Existing lifecycle semantics | Message path changes control flow |
| Endpoint evidence | DS-001 | Provider/catalog owner | Verify deployment URL/price | Guessed metadata is trusted |

## Ownership Boundaries

No caller bypasses LLMFactory for `AUTOBYTEUS` curated model lookup, TokenPriceConfigProvider for pricing selection, or the team adapter for team event projection. Claude/Codex external-runtime selections intentionally bypass the AutoByteus catalog and remain owned by their backend factories. Provider adapters do not call web/team code. The UI consumes the projected message and never classifies provider errors.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Forbidden bypass |
| --- | --- | --- |
| LLMFactory model lookup/create | Catalog registry and adapter construction | Manual old-model construction |
| Provider adapter send/stream | SDK client, endpoint, request mapping | Direct provider SDK from runtime |
| TokenPriceConfigProvider resolvePolicy | Catalog pricing and current schedule | Calculator reading catalog directly |
| Error notifier/stream | Safe extraction and canonical event shape | Ad hoc source-only events or provider classification |
| Team adapter | Team DTO validation/projection | Direct team DTO construction by provider |

## Dependency Rules

- Catalog depends on LLM/config types, not server/web/team code.
- Adapters depend on shared transport and secret interfaces, not UI/team DTOs.
- Server pricing consumes exported catalog pricing data, not adapter internals.
- Agent event code does not depend on provider SDK payload types.
- Team/websocket projection does not classify provider errors.
- Existing owning boundaries remain the only route for their policy.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity |
| --- | --- | --- | --- |
| LLMFactory model lookup/create | AutoByteus curated model | Resolve/construct current AutoByteus model | `runtimeKind=AUTOBYTEUS` + model identifier/value |
| ProviderApiKeyResolver.resolve | Provider credential | Safe credential handle | Provider ID |
| Effective selection runtime gate | Saved/direct effective selection | Normalize `runtimeKind`; delegate only `AUTOBYTEUS` pairs to the AutoByteus guard and otherwise leave ownership with the selected external factory | `{ runtimeKind, llmModelIdentifier }` |
| LLMFactory.requireCurrentModelIdentifier | Saved/direct AutoByteus selection | Exact active AutoByteus catalog membership; no alias/fallback; not an external-runtime validator | `runtimeKind=AUTOBYTEUS` + model identifier |
| ClaudeAgentRunBackendFactory / CodexAgentRunBackendFactory | External runtime model selection | Bootstrap the existing Claude session or Codex thread with its model config; retain external ownership | `runtimeKind=CLAUDE_AGENT_SDK`/`CODEX_APP_SERVER` + model identifier |
| TokenPriceConfigProvider.resolvePolicy | Current price policy | Resolve model price/current DeepSeek period | Provider + model + observed_at |
| TokenCostCalculator.applyPolicy | Usage cost | Select tier/calculate | Usage + resolved policy |
| notifyAgentErrorOutputGeneration | Agent error | Emit code/message/classification | Typed notification |
| AgentRunEventMessageMapper.map | Server event | Project event | AgentRun event |
| TeamAgentEventAdapter.adapt | Team event | Validate/adapt DTO | AgentRun + member identity |

## Interface Boundary Check

| Interface | Singular | Explicit identity | Risk | Action |
| --- | --- | --- | --- | --- |
| LLMFactory lookup/create | Yes | Yes | Low | Centralize curated lookup |
| Pricing resolvePolicy | Yes | Yes | Low | Require observed_at for scheduled model |
| Current-model guard | Yes | Yes | Low | Resolve runtime first; call the AutoByteus guard only for `AUTOBYTEUS`; external factories retain ownership |
| Error notifier | Yes | Yes | Low | Canonical code/message/evidence |
| Team adapter | Yes | Yes | Low | Keep member identity separate |

## Main Domain Subject Naming Check

| Subject | Name | Natural | Action |
| --- | --- | --- | --- |
| Current price | ResolvedTokenPricingPolicy | Yes | Add selected-period fields |
| Provider failure | ProviderErrorEvidence | Yes | Keep display text separate |
| Protocol field | code | Yes | Document as transport-only |
| Old producer field | source | No in team contract | Remove from canonical payload |

## Existing Capability / Subsystem Reuse Check

| Need | Existing area | Decision |
| --- | --- | --- |
| Model catalog | autobyteus-ts LLM | Extend |
| Pricing | server token-usage/pricing | Extend |
| Credentials | secret-management resolution | Extend |
| Error evidence | LLM/agent event path | Extend/refactor with one typed safe evidence shape |
| Team transport | team execution/contracts | Extend |
| Application-agent stream | Existing focused SDK projector | Preserve message-only `ERROR`; update stale generic fallback only |
| UI display | existing ErrorSegment | Verify/extend only if needed |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns | Spines | Decision |
| --- | --- | --- | --- |
| LLM catalog/factory | IDs, schemas, defaults, metadata, prices | DS-001/002 | Extend |
| Provider adapters | Endpoint and current payload | DS-001 | Extend |
| Secret management | Missing-key mapping | DS-001/003 | Extend |
| Token usage pricing | Current DeepSeek period/cost policy | DS-002 | Extend |
| Agent eventing | Safe message and canonical event | DS-003 | Refactor |
| Team stream | DTO projection | DS-003 | Extend |
| Web stream/UI | Render supplied message | DS-003 | Verify |

## Draft File Responsibility Mapping

| Candidate file | Responsibility |
| --- | --- |
| autobyteus-ts/src/llm/supported-model-definitions.ts | Current rows, schemas, defaults, prices |
| autobyteus-ts/src/llm/api/provider adapters | Current endpoint/request policies |
| autobyteus-ts/src/llm/utils/token-pricing-schedule.ts | Shared current schedule shape |
| autobyteus-ts/src/llm/utils/llm-config.ts and llm-factory.ts | Serialize/export schedule |
| server token-usage/pricing files | Resolve current period and calculate |
| autobyteus-ts/src/llm/errors/provider-error.ts | Extract/redact original error |
| autobyteus-ts/src/secrets/provider-api-key-error.ts | Missing-key contract |
| autobyteus-server-ts/src/secret-management/resolution/secret-management-provider-api-key-resolver.ts | Map missing vault record/blank credential to `MissingApiKeyError` |
| autobyteus-ts/src/agent/events/notifiers.ts and `src/agent/streaming/events/stream-event-payload-lifecycle.ts` | Canonical code/message/evidence producer/parser |
| autobyteus-server-ts/src/services/agent-streaming/agent-run-event-message-mapper.ts | Preserve AgentRun error evidence |
| autobyteus-server-ts/src/agent-team-execution/services/team-agent-event-adapter.ts and `domain/team-agent-event.ts` | Validate/adapt canonical team error evidence |
| autobyteus-team-stream-contracts/src/team-agent-message-dtos.ts and `team-stream-server-message.ts` | Strict team ERROR payload with optional safe metadata |
| autobyteus-server-ts/src/services/agent-streaming/team-agent-event-websocket-projector.ts | Project team error evidence to websocket |
| autobyteus-server-ts/src/application-agent-streaming/services/application-agent-stream-event-projector.ts | Project actual safe message into the existing message-only application `ERROR` event; never expose native/provider metadata |
| autobyteus-web/services/agentStreaming/protocol/messageTypes.ts, messageParser.ts, adapters, and `types/segments.ts` | Validate/carry evidence into web state |
| application configuration/run binding services | Validate saved/direct current model selection before side effects |
| `autobyteus-application-sdk-contracts/src/execution-resources.ts` | Application contract | Add `CURRENT_MODEL_SELECTION_REQUIRED` to the existing configuration issue-code union; no migration payload is added |
| `autobyteus-application-sdk-contracts/src/application-agent-events.ts` | Application SDK contract | Keep the closed five-variant stream and message-only `ERROR` shape |
| `tickets/done/application-agent-streaming/application-agent-communication-contract.md` and `autobyteus-application-sdk-contracts/README.md` | Application contract documentation | Replace the stale generic error-message rule with safe original-message passthrough; do not add provider metadata |
| application projector/UI | Preserve/render received message |

## Reusable Owned Structures Check

| Structure | Candidate owner | Decision |
| --- | --- | --- |
| Current pricing schedule | LLM pricing metadata + server policy | Share serialized meaning; no historical registry |
| ProviderErrorEvidence | LLM error boundary | One message/metadata shape |
| Team error DTO | Existing team contracts | Reuse; code/message already owned there |

## Shared Structure / Data Model Tightness Check

| Structure | Clear meaning | Risk | Action |
| --- | --- | --- | --- |
| ProviderErrorEvidence | Yes | Low | Keep native transport metadata separate from display message; project only the message at the application boundary |
| Pricing schedule | Yes | Medium | Store only current schedule and selected period |
| AgentErrorNotification | Yes after change | Medium | Replace source with code |
| ResolvedTokenPricingPolicy | Yes | Medium | Add selected period rather than parallel policy DTO |

## Final File Responsibility Mapping

| File | Owner | Concrete change |
| --- | --- | --- |
| autobyteus-ts/src/llm/supported-model-definitions.ts | Catalog | Replace rows/schema/defaults/pricing |
| autobyteus-ts/src/llm/utils/token-pricing-schedule.ts | Pricing metadata | Add current schedule type |
| autobyteus-ts/src/llm/utils/llm-config.ts | Config | Read/write schedule |
| autobyteus-ts/src/llm/llm-factory.ts | Factory | Export schedule in ModelPricingInfo and expose exact-current-model guard for AutoByteus catalog selections only |
| grok-llm.ts, gemini-llm.ts, kimi-llm.ts, glm-llm.ts, minimax-llm.ts | Adapters | Current provider request rules |
| kimi-k2-7-code-policy.ts | Kimi | Delete |
| openai-compatible-llm.ts | Shared transport | Re-throw original error |
| provider-error.ts | Error boundary | Safe extraction/redaction |
| provider-api-key-error.ts and `autobyteus-server-ts/src/secret-management/resolution/secret-management-provider-api-key-resolver.ts` | Credential boundary | Clear missing-key error only for missing/blank credentials |
| `openai-compatible-llm.ts`, `gemini-llm.ts`, `utils/gemini-helper.ts`, `provider-error.ts`, `llm-phase.ts` | Runtime error boundary | Preserve safe original provider evidence; remove generic wrappers/prefix/truncation |
| `notifiers.ts`, `stream-event-payload-lifecycle.ts`, AgentRun mapper | Agent runtime | Canonical code/message/evidence and scope/effect |
| `team-agent-event-adapter.ts`, `team-agent-event.ts`, team DTO/projector | Team transport | Require code without replacing message; carry safe metadata |
| `runtime-kind-enum.ts` | Runtime identity | Normalize effective runtime ownership before any model validation |
| `application-execution-resource-configuration-service.ts`, launch-profile module, `application-run-binding-launch-service.ts` | Application orchestration | Derive effective runtime/model pairs; validate only AutoByteus IDs and return explicit reselection before side effects |
| `agent-run-manager.ts`, Claude/Codex backend factory files | Runtime dispatch | Preserve distinct runtime factory ownership; do not route external selections through LLMFactory |
| application projector, application SDK contract, web protocol/parser/adapters, `ErrorSegment.vue`, segment types | Client stream/UI | Use supplied error message; native web may carry safe metadata, while the application SDK remains message-only |

## Applied Patterns

- Registry: LLMFactory.
- Adapter: provider LLM classes.
- Policy resolver: TokenPriceConfigProvider.
- Event adapter: TeamAgentEventAdapter.
- No new generic validation or compatibility layer.

## Runtime-Ownership Test Map

The implementation and downstream coverage pass must make runtime ownership observable, not infer it from a global catalog result:

| Test area | Required scenarios | Ownership assertion |
| --- | --- | --- |
| `autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts` and the LLM factory tests | Current named rows accept; removed AutoByteus IDs reject; exact current guard does not alias or fall back | AutoByteus catalog only |
| `autobyteus-server-ts/tests/unit/application-orchestration/application-execution-resource-configuration-service.test.ts` | Saved AutoByteus stale profile is invalid/reselection-required; saved Claude/Codex profiles are not rejected by the AutoByteus catalog; mixed team profiles validate each effective pair | Configuration readiness resolves runtime before calling the guard |
| `autobyteus-server-ts/tests/unit/application-orchestration/application-run-binding-launch-service.test.ts` | Direct stale AutoByteus agent fails before creation; team expands and validates all AutoByteus members before allocation; Claude/Codex agent launches proceed without the AutoByteus guard; mixed-runtime team members retain their runtime values | Run-binding boundary scopes validation and preserves side-effect ordering |
| `autobyteus-server-ts/tests/unit/agent-execution/agent-run-manager.test.ts` | AutoByteus, Claude, and Codex configs dispatch to their distinct factories | `AgentRunManager` remains runtime dispatch owner |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/backend/claude-session-bootstrapper.test.ts` and `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts` | External model values reach their existing SDK/thread bootstrap paths | External factories retain model ownership and are not catalog-gated |
| `autobyteus-server-ts/tests/unit/application-agent-streaming/application-agent-stream-event-projector.test.ts` | Native AgentRun/team provider errors preserve the safe original message in the existing message-only application `ERROR`; diagnostic errors remain filtered; raw provider fields are not projected | Application projection is a narrow message-only boundary, not a native metadata protocol |
| `autobyteus-server-ts/tests/integration/application-backend/application-agent-communication-ws.integration.test.ts` and application SDK contract/build tests | Application-agent websocket events retain the five-variant stream and serialize the original safe error message without the stale generic fallback or provider metadata fields | Normative contract and generated SDK surface remain aligned |

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner | Responsibility |
| --- | --- | --- | --- |
| autobyteus-ts/src/llm | Folder | LLM catalog/adapters | Current model definitions and provider paths |
| autobyteus-ts/src/llm/utils/token-pricing-schedule.ts | Module | Pricing metadata | Current DeepSeek schedule shape |
| autobyteus-ts/src/llm/errors/provider-error.ts | Module | Error boundary | Safe original message |
| autobyteus-ts/src/secrets/provider-api-key-error.ts | Module | Credential boundary | Missing-key error |
| autobyteus-server-ts/src/token-usage/pricing | Folder | Pricing | Current period and arithmetic |
| autobyteus-server-ts/src/secret-management/resolution | Folder | Secret management | Vault-to-setup mapping |
| autobyteus-server-ts/src/application-orchestration/services/application-execution-resource-configuration-service.ts | Service | Persisted configuration owner | Current-model validation and invalid saved configuration/reselection issue |
| autobyteus-server-ts/src/application-orchestration/services/application-execution-resource-configuration-launch-profile.ts | Module | Profile normalization | Enumerate effective runtime/model pairs for runtime-scoped validation |
| autobyteus-server-ts/src/application-orchestration/services/application-run-binding-launch-service.ts | Service | Run-binding owner | Final current-model guard before run allocation/creation |
| autobyteus-server-ts/src/runtime-management/runtime-kind-enum.ts | Module | Runtime identity owner | Normalize runtime and choose catalog-owned versus external model validation |
| autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts | Service | Runtime dispatch owner | Select AutoByteus, Claude, or Codex backend factory without changing external ownership |
| autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-agent-run-backend-factory.ts | Factory | Claude runtime owner | Bootstrap Claude with its existing model configuration; no AutoByteus catalog guard |
| autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-backend-factory.ts | Factory | Codex runtime owner | Bootstrap Codex with its existing model configuration; no AutoByteus catalog guard |
| autobyteus-application-sdk-contracts/src/execution-resources.ts | Module | Application contract | Current-model reselection issue code and invalid configuration view |
| autobyteus-server-ts/src/services/agent-streaming | Folder | Server stream | Event projection |
| autobyteus-team-stream-contracts/src/team-agent-message-dtos.ts | Module | Team contract | Strict ERROR payload with safe optional metadata |
| autobyteus-web/services/agentStreaming/protocol/messageTypes.ts and messageParser.ts | Modules | Web protocol | Validate and carry safe ERROR metadata |
| autobyteus-web/services/agentStreaming/agentStreamMessageProjector.ts and teamStreamDtoAdapters.ts | Modules | Web stream adapters | Build error segments without message replacement |
| autobyteus-web/types/segments.ts and components/conversation/segments/ErrorSegment.vue | Presentation | Web UI | Render safe message; do not classify provider errors |
| autobyteus-server-ts/src/agent-team-execution/services | Folder | Team stream | Team event adaptation |
| autobyteus-team-stream-contracts/src | Folder | Team contract | Required code/message |
| autobyteus-web/components/conversation/segments | Folder | Presentation | Render supplied error |

## Folder Boundary Check

| Folder | Clear owner | Risk | Action |
| --- | --- | --- | --- |
| autobyteus-ts/src/llm | Yes | Medium | Keep existing provider grouping |
| autobyteus-ts/src/llm/errors | Yes | Low | New narrow error boundary |
| server token-usage/pricing | Yes | Low | Extend existing owner |
| team execution services | Yes | Low | Keep adapter boundary |
| web error segments | Yes | Low | No provider logic |

## Concrete Examples / Shape Guidance

| Topic | Good shape | Avoid |
| --- | --- | --- |
| Model path | Effective runtime/model pair -> AutoByteus catalog/factory or Claude/Codex factory -> provider SDK | Global LLMFactory guard applied to every runtime |
| Provider error | Provider text -> redaction -> same message + transport code | Balance error -> generic application message |
| DeepSeek price | UTC observed time -> current period -> existing arithmetic | Event date -> historical price table |
| Old model | Old ID -> `CURRENT_MODEL_SELECTION_REQUIRED` and explicit reselection | Old ID -> silent new-model alias |

## Backward-Compatibility Rejection Log

| Candidate | Decision | Replacement |
| --- | --- | --- |
| Old model aliases | Rejected | Remove rows; require current selection |
| Historical DeepSeek prices | Rejected | Current schedule only |
| K2/GLM-5.2/Grok-4.5 branches | Rejected | Remove obsolete provider behavior |
| Generic provider error taxonomy | Rejected | Preserve original message |
| source-to-code alias | Rejected | Canonical code emitted by all producers |
| Separate request-validation subsystem | Rejected | Existing schema/catalog/adapter path |

## Derived Layering

- Catalog/config: current identity, schema, metadata, defaults, current pricing.
- Provider adapter: endpoint and request construction.
- Runtime: request execution and safe errors.
- Pricing policy: current DeepSeek period and cost policy.
- Transport: AgentRun/team/websocket projection.
- Presentation: existing ErrorSegment.

## Change / Refactor Sequence

1. Add tests for catalog rows/removals, DeepSeek period boundaries, missing key, original provider messages, canonical event fields, and Docker-equivalent transport.
2. Update model rows, schemas, defaults, metadata, endpoints, and current prices.
3. Replace K2/GLM-5.2/Grok-4.5/pre-3.7 branches and remove K2 policy file.
4. Add DeepSeek schedule data and export it through ModelPricingInfo.
5. Resolve the current DeepSeek period before existing tier selection/arithmetic.
6. Add missing-key mapping without exposing vault internals.
7. Remove generic error wrappers and add safe original-error extraction.
8. Rename producer event source to canonical code and update all stream/team fixtures.
9. Replace `source` with canonical `code` at every native producer/parser/mapper/team/web boundary, add optional safe provider evidence fields to native transport, and update strict native protocol schemas/projectors. Keep the application SDK `ERROR` event message-only.
10. Remove old rows and obsolete policy branches. Normalize effective runtime/model pairs. Call the exact-current-model guard from `ApplicationExecutionResourceConfigurationService` and `ApplicationRunBindingLaunchService` only for `RuntimeKind.AUTOBYTEUS`; leave Claude/Codex model ownership in their backend factories. Expose `CURRENT_MODEL_SELECTION_REQUIRED` for stale AutoByteus IDs without rewriting stored data, and move team allocation after all effective-pair checks.
11. Update application projection and normative application contract only to use the received safe message; retain diagnostic filtering and genuine malformed-event validation. Do not extend the application SDK with native/provider metadata.
12. Run implementation checks, then code review and API/E2E coverage investigation.

## Key Tradeoffs

- Extend existing pricing policy instead of adding a billing service.
- Preserve provider text instead of introducing a uniform semantic error taxonomy.
- Coordinate code/message contract change instead of keeping a source alias.
- Reject old model IDs rather than silently guessing an equivalent new model.
- Keep old usage snapshots immutable rather than repricing history.

## Risks

- GLM and MiniMax deployment endpoints/prices need evidence before trusted catalog values.
- Provider SDK error objects differ; extraction must preserve message without secrets.
- Docker 8001 may run a stale build; integrated validation must verify the event contract.
- Removing model IDs can invalidate saved profiles; selection failure must be actionable.
- Model validation must remain runtime-scoped: a global AutoByteus catalog guard would reject valid Claude/Codex selections. Tests must cover agent and mixed-runtime team launches, including per-member runtime overrides.
- Scheduled pricing must not disappear at the `ModelPricingInfo` or `ResolvedTokenPricingPolicy` boundary; tests must assert schedule ID, selected period, trusted dimensions, tier selection, and snapshot fields.

## Guidance For Implementation

- Follow the existing schema/catalog -> factory -> adapter -> provider path.
- Do not create a separate parameter-rejection feature.
- Do not classify provider failures into application-authored balance/quota/authentication messages.
- Do not wrap provider text with generic request/stream/LLM-phase prefixes.
- Keep code as transport metadata and message as original safe text.
- Keep DeepSeek schedule selection in pricing policy; keep token arithmetic unchanged.
- Project DeepSeek schedule data explicitly through `TokenPricingConfig` -> `ModelPricingInfo` -> `TokenPriceConfigProvider` -> `ResolvedTokenPricingPolicy` -> `pricing_snapshot_json`.
- Resolve saved/direct launch runtime/model pairs before validation. Validate only AutoByteus identifiers through the current catalog before any AutoByteus run/provider side effect; never alias or migrate removed IDs. Preserve Claude/Codex factory ownership and dispatch for external selections.
- Verify GLM/MiniMax endpoint and price evidence before marking trusted.
- Remove obsolete model rows and provider branches instead of retaining compatibility paths.

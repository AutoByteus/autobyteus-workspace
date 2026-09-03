# Design Spec

## Design Status

- Stable package identifier: `PKG-GEMINI-3-8-FLASH-2026-09-03`
- Architecture result: `Architecture Design Complete`
- Architecture revision: `AD-REV-001`
- Approved requirements revision: `RER-002` (`Approved`, explicit user approval on 2026-09-03)
- Authoritative task worktree: `/home/autobyteus/workspace/.codex/worktrees/gemini-3-8-flash`
- Branch and design base: `requirements/gemini-3-8-flash` at requirements commit `578192a1776344fa667caa29b79b4eeb8dbea290`

## Current-State Read

The current implementation already has the correct owners for this replacement:

1. `autobyteus-ts/src/llm/supported-model-definitions.ts` declares built-in LLM identity, schema, static metadata, and pricing. `LLMFactory` turns that row into the authoritative current AutoByteus model registry. The server and web surfaces project that registry rather than maintaining another Gemini list.
2. `autobyteus-server-ts/src/agent-execution/backends/autobyteus/available-llm-construction.ts` constructs a selected built-in model through `LLMFactory`. `GeminiLLM` owns Gemini request orchestration; the Gemini runtime resolver and `resolveModelForRuntime` select AI Studio versus Vertex construction and the provider model value.
3. `GeminiPromptRenderer` owns conversion of supported message, media, function-call, and function-result history into Gemini content turns. `GeminiLLM` separately owns generation configuration and response/usage normalization.
4. `TokenPriceConfigProvider` obtains the selected row's pricing schedule from `LLMFactory`, chooses a schedule using the usage observation time, and emits immutable price evidence used by the token-usage ledger.
5. `ApplicationCurrentModelSelectionPolicy` delegates exact built-in membership to `LLMFactory.requireCurrentModelIdentifier`; removed identifiers already produce explicit current-selection-required behavior without an alias.

The catalog, runtime-mode, prompt-rendering, current-selection, metadata, and pricing boundaries are healthy for this change. The one design pressure is inside the shared Gemini adapter: `GeminiLLM.buildGenerationConfig` currently assumes all Gemini text models accept the same integer-budget and common sampling configuration. The approved 3.8 contract makes that assumption false while the same adapter continues to serve `gemini-3.1-pro-preview`. The target therefore requires an exact-model policy split inside the existing adapter owner, not a global rewrite of Gemini behavior and not a new provider subsystem.

The target must preserve the following current facts:

- AI Studio, Vertex Express, and Vertex Project remain distinct setup choices, while both Vertex choices normalize to runtime key `vertex` for model mapping.
- The prompt renderer already includes both function call/result ID and name, preserves provider-native thought-signature content, and emits function results as a `user` turn.
- Static Gemini model metadata is resolved without a credential lookup or live Gemini metadata request.
- Pricing schedules already support multiple effective `fixed` entries and fail closed for invalid observation timestamps.
- Saved model selections and historical token/run records store strings and snapshots; their persistence schema does not depend on the model remaining in the current catalog.

## Task Size And Architectural Risk (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Medium`
- Size rationale and supporting evidence (file/component scope, affected surfaces, or other concrete basis): The production delta is bounded to three existing source owners in `autobyteus-ts`—the built-in model definition, Gemini runtime mapping, and Gemini adapter—plus focused package/server tests, two live-scenario values, and three active documentation surfaces. No new subsystem, public API, UI component, persistence schema, runtime kind, or deployment unit is introduced. The number of tests/docs makes this larger than a narrow local edit but it remains within existing ownership boundaries.
- Architectural risk (`Low`/`High`): `High`
- Risk rationale and supporting evidence: The task changes an external provider request contract in a shared adapter. An unscoped change could either send 3.8-invalid sampling/budget fields or regress the still-current 3.1 Pro request shape. Provider entitlement may also prevent live confirmation even when deterministic construction is correct. Persistence, security, concurrency, and deployment risks are otherwise absent.
- Selected route (`Direct Implementation`/`Architecture Review`): `Architecture Review`
- Escalation trigger if implementation or validation discovers new impact: Return `Design Impact` if satisfying 3.8 requires changing generic `LLMModel`/`SupportedModelDefinition` contracts, altering the prompt renderer or supported turn semantics, changing Gemini authentication/runtime selection, updating the Google SDK dependency, changing the pricing selector/persistence schema, migrating saved or historical data, or modifying web UI behavior beyond consuming the existing schema. Return `Requirement Gap` rather than implementing a repair for synthetic histories ending in a model turn or any new alias/migration behavior.

### Payload Versus Structural Surface Check

- Payload/content inventory: one current Gemini catalog row, one runtime-map row, an effective-dated pricing payload, active documentation statements, live-E2E scenario values, and assertions/fixtures.
- Structural code surfaces: the shared `GeminiLLM` generation-config builder is the only materially changed runtime structure. Existing factory, renderer, server catalog, GraphQL, web selection, pricing selector, and persistence owners consume the new payload through their current contracts.
- Classification consequence: content volume does not make the work `Large`; the changed external request contract makes architectural risk `High` despite the bounded implementation size.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| `git status --short --branch`; `git rev-parse HEAD`; `git rev-parse --show-toplevel` | `/home/autobyteus/workspace/.codex/worktrees/gemini-3-8-flash` | The workspace is an isolated git worktree on `requirements/gemini-3-8-flash`; the received requirements commit was `578192a1776344fa667caa29b79b4eeb8dbea290`. | Use the supplied worktree and branch; do not create a competing workspace. | None. |
| Static catalog-to-UI trace | `autobyteus-ts/src/llm/supported-model-definitions.ts`; `autobyteus-ts/src/llm/llm-factory.ts`; `autobyteus-server-ts/src/llm-management/services/model-catalog-service.ts`; `autobyteus-server-ts/src/api/graphql/types/llm-provider-model-catalog.ts`; `autobyteus-web/stores/llmProviderConfig.ts` | One package row is registered by `LLMFactory`, projected through the server/GraphQL, and consumed generically by the web store and schema UI. | Replace the package row only; do not add a server or web Gemini registry. | Rendered UI was not launched in this dependency-less worktree, but existing source/tests establish the generic path. |
| Runtime construction trace | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/available-llm-construction.ts`; `autobyteus-server-ts/src/llm-management/services/gemini-runtime-resolver-adapter.ts`; `autobyteus-ts/src/utils/gemini-helper.ts`; `autobyteus-ts/src/utils/gemini-model-mapping.ts` | The selected ID reaches `LLMFactory`; all Gemini modes use `GeminiLLM`. AI Studio normalizes to `api_key`; Vertex Express and Project normalize to `vertex`. | One exact 3.8 mapping for `api_key` and `vertex` covers all three existing setup modes without auth changes. | Live account entitlement remains environment-specific. |
| Shared request-builder inspection | `autobyteus-ts/src/llm/api/gemini-llm.ts` | The current builder converts low/medium/high to `thinkingBudget`, always includes default temperature, conditionally includes top-P and penalties, and merges arbitrary extra params after controlled fields. Both streaming and non-streaming use this builder. | Add an exact 3.8 policy branch inside this owner; prevent forbidden fields from being reintroduced by extra params; reuse the result for both invocation modes. | Live provider acceptance requires downstream credential-gated validation. |
| Prompt/tool continuation inspection | `autobyteus-ts/src/llm/prompt-renderers/gemini-prompt-renderer.ts`; `autobyteus-ts/tests/unit/llm/api/provider-native-request-payloads.test.ts` | Normal tool results follow the provider-native model tool-call turn as `user` function responses, ordered by call ID and carrying both ID and name. Empty unsupported turns are omitted. | Preserve renderer source; make 3.8 tests exercise the existing supported tool path. | Synthetic histories ending in a model turn are explicitly unsupported by RER-002. |
| Current-selection and historical-display inspection | `autobyteus-ts/src/llm/llm-factory.ts`; `autobyteus-server-ts/src/application-platform/launch-configuration/application-current-model-selection-policy.ts`; `autobyteus-server-ts/src/token-usage/projections/token-usage-model-display-projection.ts` | Current membership is exact, while historical display uses stored provider/model strings rather than requiring current catalog lookup. | Remove 3.7 with no alias and no data rewrite; add regression evidence at both boundaries. | Representative production data volume is unknown but irrelevant because no rewrite is designed. |
| Pricing-path inspection | `autobyteus-ts/src/llm/utils/token-pricing-schedule.ts`; `autobyteus-ts/src/llm/llm-model-pricing.ts`; `autobyteus-server-ts/src/token-usage/pricing/token-pricing-schedule-selector.ts`; `autobyteus-server-ts/src/token-usage/pricing/token-price-config-provider.ts` | The existing schedule history can contain multiple fixed schedules; the server chooses the latest eligible schedule from `observed_at`, appends schedule/period IDs to durable policy evidence, and does not fall back to flat current prices when schedule selection fails. | Represent 2026 introductory and 2027 standard 3.8 pricing as two fixed schedules in the model row; do not modify the selector. | None for the approved global standard price basis. |
| Active-reference scan | `rg -l --hidden --glob '!**/.git/**' --glob '!tickets/**' --glob '!test-results/**' --glob '!frontend-execution-evidence/**' --glob '!**/node_modules/**' 'gemini-3\\.7-flash' .` | Eight active files currently name 3.7: three source/config/test files, the live scenarios, the server metadata test, and three active docs/contract surfaces. | Update current references while retaining only explicit stale/historical assertions and archived evidence. | Downstream must rerun the classified scan after implementation. |
| Google SDK source/type probe | `autobyteus-ts/package.json`; `autobyteus-ts/pnpm-lock.yaml`; root `pnpm-lock.yaml`; Google `js-genai` tags `v1.38.0`, `v1.40.0`, and `v1.42.0` | The manifest range begins at `^1.38.0`; standalone/root locks resolve 1.40.0/1.42.0. Every inspected version declares `thinkingLevel`, and the 1.40.0 generate-content converter passes `thinkingConfig` through. Google's official JavaScript 3.8 example uses lower-case `"medium"`; the generated TypeScript enum declaration is stricter than that example. | No SDK bump is required. Emit the approved lower-case wire value and, if typing requires it, isolate a narrow documented cast at the SDK boundary rather than uppercasing the provider value or weakening generic model types. | Only build and live execution can prove the exact downstream install/runtime; this is a validation risk, not a design gap. |
| Baseline setup check inherited from requirements investigation | Worktree root and `investigation-notes.md` | Plain `pnpm` was unavailable; `corepack pnpm` exists, but the worktree has no installed dependencies. Baseline tests did not execute. | Implementation/API-E2E must install or link dependencies according to repository policy before claiming executable evidence. | Current baseline executable state remains unknown. |

## Intended Change

Implement a clean-cut current-model replacement:

- replace the single built-in `gemini-3.7-flash` row with exact `gemini-3.8-flash` identity, metadata, schema, and effective-dated global pricing;
- replace the explicit 3.7 Gemini LLM runtime mapping with an exact 3.8 mapping for `api_key` and `vertex`;
- make `GeminiLLM` select a 3.8-specific generation-config policy by exact provider model value, using lower-case string `thinkingLevel` and never emitting the listed unsupported sampling, penalty, count, or thinking-budget fields;
- retain the existing budget-based/common-field behavior for `gemini-3.1-pro-preview` and other unaffected Gemini adapter calls;
- preserve prompt rendering, supported tool continuation, response/reasoning separation, streaming, token observation, abort, credentials, and error behavior;
- update durable validation and active docs without rewriting historical records or archived evidence.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User / System | REQ-001, REQ-002, REQ-004, REQ-007, REQ-009; AC-001, AC-002, AC-008 | User opens a new AutoByteus configuration; built-in catalog query runs. | RER-002 requirements behavior table; catalog-to-UI trace above. | Exactly one current Flash row is 3.8 with the approved limits/schema/provenance; 3.7 is absent; no credential/live lookup is added. | Static definition -> `LLMFactory` -> server catalog -> GraphQL -> generic web selector (`DS-001`). |
| BEH-002 | User / Contract | REQ-003–REQ-006, REQ-010; AC-003–AC-005, AC-009 | User sends a normal prompt or continues a supported tool turn through the selected Gemini setup mode. | Runtime, adapter, renderer, and SDK evidence above. | Exact 3.8 provider identity; level-based config with forbidden fields absent; existing text/media/system/tool/stream/reasoning/abort/error behavior preserved; 3.1 behavior unchanged. | New turn -> AutoByteus backend -> `LLMFactory`/`GeminiLLM` -> runtime/mapping -> request config/renderer -> Google SDK/provider (`DS-002`, `DS-003`, `DS-007`, `DLS-001`). |
| BEH-003 | User / Contract | REQ-002, REQ-011; AC-006 | User launches a saved AutoByteus configuration that still names 3.7. | Exact current-selection and historical-display evidence above. | Current selection fails and requires explicit reselection; stored historic 3.7 identity remains readable and unchanged. | Launch/readiness -> runtime-scoped policy -> exact `LLMFactory` membership -> current-selection issue (`DS-004`); historical query -> stored identity projection (`DS-008`). |
| BEH-004 | System / Contract | REQ-008, REQ-011; AC-007 | A 3.8 token-usage observation with `observed_at` is priced. | Pricing-path evidence above. | Introductory prices apply before the 2027 cutover; standard prices apply from the cutover; selected period evidence is durable; old snapshots are untouched. | Token observation -> catalog pricing info -> schedule selector -> price policy/calculator -> immutable ledger evidence (`DS-005`, `DS-007`). |
| BEH-005 | Operational | REQ-012, REQ-013; AC-010, AC-011 | CI/operator runs deterministic and credential-gated validation. | Active-reference and baseline setup evidence above. | Current tests/docs/live fixtures name 3.8, deterministic contract coverage passes, and live success or the exact safe access blocker is recorded truthfully. | Repository checks -> focused tests/build -> server E2E -> credential-gated live scenario -> retained report (`DS-006`). |

The behavior map is limited to the approved scenarios. A direct or manually corrupted message history ending in a model turn remains `Technically Possible but Unsupported/Contrived`; it does not justify a renderer repair, new validation subsystem, or request retry path.

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `/home/autobyteus/workspace/.codex/worktrees/gemini-3-8-flash/tickets/in-progress/gemini-3-8-flash/requirements-doc.md` | Canonical intended behavior, scenarios, requirements, and acceptance criteria. | All | Upstream authority; this design does not revise it. | RER-002 Approved, 2026-09-03. |
| `/home/autobyteus/workspace/.codex/worktrees/gemini-3-8-flash/tickets/in-progress/gemini-3-8-flash/investigation-notes.md` | Requirements-owned current behavior, external-contract, data, and routing evidence. | All | Starting evidence augmented by the architecture investigation above. | Complete for RER-002. |
| `/home/autobyteus/workspace/.codex/worktrees/gemini-3-8-flash/tickets/in-progress/gemini-3-8-flash/requirements-revision-record.md` | Requirements approval/revision navigation. | All | Establishes approved revision and scope boundary. | RER-001–RER-002 current. |
| UI/UX specification, prototype, or screenshots | N/A | N/A | Existing schema-driven UI is reused; no Product Design artifact applies. | `N/A — not applicable`. |

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Behavior Change` with a clean-cut catalog replacement.
- Current design issue found (`Yes`/`No`/`Unclear`): `Yes`, bounded to Gemini generation-config policy.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): `Shared Structure Looseness`.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): `Yes`, bounded inside `GeminiLLM`.
- Evidence: One `buildGenerationConfig` currently assumes an integer-budget and common sampling contract for every Gemini text model. The approved 3.8 contract is incompatible with that assumption, while `gemini-3.1-pro-preview` remains current and must not inherit the 3.8 omissions silently.
- Design response: Split the adapter's internal config construction into an exact 3.8 level-based branch and the preserved existing budget-based branch. Keep dispatch, both branches, and their invariants in `gemini-llm.ts`; do not push provider policy into callers, the generic model type, server code, or UI schema handling.
- Refactor rationale: This is the smallest coherent correction to the loosened shared structure. An inline exact-model branch is sufficient because only two current Gemini LLM rows share the adapter, both send/stream paths already converge on one builder, and no reusable cross-provider abstraction exists.
- Intentional deferrals and residual risk, if any: Do not generalize a provider-policy registry or change unknown/directly constructed Gemini model behavior. A future Gemini text model with another request contract must add its own explicit adapter policy. Live entitlement and the dependency-less worktree remain validation risks. No in-scope design correctness is deferred.

## Terminology

- `Current Gemini Flash row`: the one selectable built-in Flash text entry in `supportedModelDefinitions`; after this change it is exact `gemini-3.8-flash`.
- `3.8 level-based policy`: the `GeminiLLM` generation-config branch that emits `thinkingConfig.thinkingLevel` as `low`, `medium`, or `high` and omits fields forbidden by REQ-005.
- `Budget-based policy`: the existing `thinkingBudget` and common sampling behavior retained for the unaffected current Gemini 3.1 Pro row and other out-of-scope direct adapter uses.
- `Historical identity`: model/provider strings and price evidence already stored for completed runs; it is not a current-catalog alias.

## Design Reading Order

Read this spec behavior-first: current owners and approved paths; clean-cut/data decisions; spines and ownership; internal Gemini config policy; file mapping; then sequencing, tradeoffs, risks, and validation guidance.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove the active `gemini-3.7-flash` model row and its explicit runtime-map row.
- Remove 3.7 as the current target from live scenarios, active catalog assertions, metadata tests, and current-product documentation.
- Remove the integer thinking-budget and forbidden-field request shape **for 3.8 requests only**. Retaining the budget-based branch for the separately current `gemini-3.1-pro-preview` is preserved behavior, not 3.7 compatibility.
- Do not add a 3.7 alias, a 3.7-to-3.8 resolver mapping, a silent persisted-config rewrite, a dual catalog row, or a historical pricing fallback in current runtime code.
- Explicit stale-selection tests and prose may retain the literal `gemini-3.7-flash` because they prove rejection/history rather than compatibility.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: Saved application/launch configuration leaves can contain `llmModelIdentifier: "gemini-3.7-flash"`; completed run/token-usage rows contain `model_identifier`, `model_value`, provider name, token counts, price-policy/schedule snapshots, and totals. Storage is owned by the existing application configuration and token-usage subsystems. Volume is unknown and immaterial because no scan or rewrite is required.
- Relevant code-model, serialization, semantic, or physical-store change: No schema or serializer changes. Only current catalog membership changes; the saved string becomes stale for new launch, while historical strings retain their original meaning.
- Normal reader/writer behavior and representative evidence: Current launch readers load the string and pass AutoByteus selections to `ApplicationCurrentModelSelectionPolicy`, which delegates exact membership to `LLMFactory`; historical display reads stored provider/model values directly, and existing token-cost snapshots/totals are persisted evidence rather than recalculated on display.
- Required semantics and invariants under direct use: A saved 3.7 selection remains visible/editable but cannot allocate a new AutoByteus run; the user must choose a current model. Completed records continue to display and total under 3.7 with their stored prices. New 3.8 usage records exact 3.8 identity and the selected 3.8 schedule period.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: No physical-store change, downtime, bulk I/O, secret access, or historical deletion is authorized. The in-memory/static catalog is rebuilt normally on process initialization.
- Decision (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`/`Undetermined`): `Directly Usable — No Migration`.
- Decision rationale, including concrete benefit versus I/O, downtime, corruption, recovery, and rollout cost: Existing version-agnostic readers already give old and new strings the required meanings. Rewriting them would violate REQ-002/REQ-011, erase truthful history, and add I/O/recovery risk with no correctness benefit. No legacy decoder or dual reader is needed.
- Acceptance criteria or design constraints supported by this decision: REQ-002, REQ-011; AC-006, AC-007.

### Migration Plan

`N/A — no migration is required.` No startup/deployment/maintenance transform, schema ledger, backup step, dual read/write, or historical migration artifact is to be created.

## Supported Scenario And Reachability Decisions

| Scenario | Validity | Independent basis and supported forward path | Design consequence |
| --- | --- | --- | --- |
| SCN-001 catalog selection | `Supported Normal Scenario` | Existing web configuration action -> server catalog query -> package registry -> schema-backed model choice. | Replace the source row and reuse all projections/UI. |
| SCN-002 normal invocation | `Supported Normal Scenario` | Existing send action -> AutoByteus run backend -> `GeminiLLM` -> selected runtime -> Google generate-content API. | Exact 3.8 request policy and response regression coverage are required. |
| SCN-003 tool continuation | `Supported Normal Scenario` | Existing Gemini function call -> tool execution -> correlated `ToolResultPayload` -> renderer -> next provider request. | Preserve renderer; prove ID/name and final user/function-response turn on 3.8. |
| SCN-004 stale 3.7 selection | `Supported Explicit Edge Scenario` | Saved configuration -> readiness/launch current-membership check. | Reject without alias; preserve saved/historical strings. |
| SCN-005 observation-time pricing | `Supported Normal Scenario` | Provider response usage -> token observation -> pricing policy -> ledger evidence. | Use existing fixed schedule history and observation time. |
| SCN-006 credential-gated validation | `Supported Explicit Edge Scenario` | Operator/CI invokes existing deterministic/live harness. | Distinguish deterministic success from safe credential/quota/region/entitlement blockers. |
| Fabricated history ending in a model turn | `Technically Possible but Unsupported/Contrived` | Only direct/synthetic construction was identified; no approved actor goal or supported product trigger creates it. | No prefill repair, history mutation, retry, or new validation mechanism. |

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001 | Built-in model definition initialization | Schema-backed web/current catalog selection | `LLMFactory` current-model registry | Proves one source row reaches all current selection surfaces without credentials or duplication. |
| DS-002 | Primary End-to-End | BEH-002 | User sends a normal configured Gemini prompt | Google accepts a 3.8 generate-content request | `GeminiLLM` provider adapter | Carries exact model/runtime/config policy through the real provider boundary. |
| DS-003 | Primary End-to-End | BEH-002 | Gemini returns function calls and tools settle | Google accepts the correlated continuation and response returns | Gemini adapter plus prompt renderer | Protects the supported agent/tool lifecycle, not only a one-shot prompt. |
| DS-004 | Primary End-to-End | BEH-003 | Saved 3.7 configuration is readied/launched | Current-selection-required issue before run allocation | Application current-model selection policy | Enforces explicit reselection and no alias. |
| DS-005 | Primary End-to-End | BEH-004 | 3.8 token-usage observation with timestamp | Immutable selected-price evidence and cost contribution | Token-pricing subsystem | Proves the 2027 boundary uses observation time. |
| DS-006 | Primary End-to-End | BEH-005 | CI/operator starts validation | Durable deterministic results plus live success/blocker classification | API/E2E validation owner | Prevents catalog-only proof and false live-success claims. |
| DS-007 | Return-Event | BEH-002, BEH-004 | Google response/stream chunk | User-visible text/reasoning plus token observation | `GeminiLLM` response and token normalizers | Preserves response, thought-summary, stream, and accounting behavior. |
| DS-008 | Return-Event | BEH-003, BEH-004 | Historical run/usage query | Stored 3.7 identity and existing totals displayed unchanged | Token/history projection owners | Separates truthful history from current catalog membership. |
| DLS-001 | Bounded Local | BEH-002 | Selected Gemini model/config enters request construction | One provider-ready generation config | `GeminiLLM` generation-config builder | Isolates 3.8 policy from 3.1 and from both send/stream callers. |

## Primary Execution Spine(s)

- DS-001: `supportedModelDefinitions -> ModelMetadataResolver -> LLMModel/LLMFactory -> ModelCatalogService -> GraphQL catalog mapping -> llmProviderConfig store -> existing schema-driven launch form`
- DS-002: `user send -> AutoByteus run backend -> createAvailableLlm/LLMFactory -> GeminiLLM -> active Gemini runtime resolver -> resolveModelForRuntime -> renderer + generation-config builder -> GoogleGenAI.generateContent/Stream -> Google 3.8`
- DS-003: `Gemini function-call response -> native tool-call context -> tool execution/results -> GeminiPromptRenderer correlation/order -> GeminiLLM shared config path -> Google 3.8 continuation -> streamed/final result`
- DS-004: `saved application selection -> launch/readiness service -> ApplicationCurrentModelSelectionPolicy -> LLMFactory.requireCurrentModelIdentifier -> CURRENT_MODEL_SELECTION_REQUIRED issue -> explicit user reselection`
- DS-005: `Gemini usage metadata -> Gemini token observation -> TokenPriceConfigProvider -> LLMFactory pricing info -> token-pricing schedule selector(observed_at) -> token cost calculator -> durable price/schedule evidence`
- DS-006: `focused package/server checks -> request-boundary tests -> catalog/metadata/pricing E2E -> active-reference classification -> credential-gated live scenario -> API/E2E report`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The static 3.8 row is enriched from curated metadata, registered exactly once, projected generically by server GraphQL, and rendered by the existing schema-driven UI. | Definition, resolved model, current registry, catalog projection, selector | `LLMFactory` for current built-in membership | Static provenance, schema options, credential-free test. |
| DS-002 | A configured user send constructs the selected Gemini runtime, maps the exact 3.8 value, renders supported contents, builds the 3.8-only request config, and invokes the existing Google SDK method. | Run backend, factory, adapter, runtime selection, request, provider | `GeminiLLM` after factory construction | Credentials, mapping, SDK type seam, safe error transport. |
| DS-003 | Provider-native function calls and thought signatures are retained; matching results are sorted into function responses containing ID/name and sent as the next user turn through the same 3.8 config path. | Function call, tool results, renderer, continuation request, response | Gemini prompt renderer for content; `GeminiLLM` for invocation | Native context preservation, tool normalization, response conversion. |
| DS-004 | Before an AutoByteus run is allocated, the runtime-scoped policy asks the package registry whether 3.7 is current; it is not, so the existing safe current-selection issue returns. | Saved selection, launch policy, current registry, issue | Application current-model selection policy | Historical/edit display remains independent. |
| DS-005 | The adapter normalizes usage metadata, and the server selects the latest eligible fixed price schedule using the observation instant before recording policy identity and calculated cost. | Usage observation, pricing lookup, schedule selection, calculator, ledger | Token-pricing subsystem | Trusted dimensions and invalid-time failure. |
| DS-006 | Deterministic tests prove identity/config/continuation/pricing, docs and active references are classified, then the existing live harness attempts 3.8 only when access is configured. | Test commands, contract assertions, live harness, report | API/E2E validation owner | Dependency setup, secrets, entitlement. |
| DS-007 | Provider parts are split into answer text and optional thought summary for final and streaming responses; usage returns separately into accounting. | Provider response, adapter parser, stream/final response, token observation | `GeminiLLM` | Thought flag and usage normalization. |
| DS-008 | Historical queries project stored provider/model strings and stored costs; they do not ask the current registry to rename or reprice the record. | Stored run/usage, history projection, display/totals | Existing history/token projections | No catalog alias or migration. |
| DLS-001 | The adapter clones extra params, chooses the exact 3.8 or preserved budget-based branch, removes branch-controlled keys, constructs one config, and then the send/stream path adds its invocation-local abort signal. | Model value, LLM config, policy branch, provider config | `GeminiLLM` | Forbidden-key sanitization and lower-case level normalization. |

## Spine Actors / Main-Line Nodes

- Built-in Gemini model definition and `LLMFactory` current registry.
- Server model catalog/GraphQL projection and web schema-driven selector.
- AutoByteus run backend and `createAvailableLlm` construction boundary.
- `GeminiLLM`, Gemini runtime resolver, and Google Gen AI client.
- `GeminiPromptRenderer` for supported content/tool continuation.
- Application current-model selection policy.
- Token observation, pricing selector, cost calculator, and stored ledger evidence.
- Deterministic/live validation workflow.

## Ownership Map

- `supported-model-definitions.ts` owns which built-in model row is current and the row's schema, static metadata, and base/scheduled pricing payload.
- `LLMFactory` owns current built-in membership, construction, catalog listing, and pricing lookup. It must not retain a removed-model alias.
- `ModelCatalogService` and GraphQL mapping are thin transport/projection boundaries; they do not own Gemini identities or metadata truth.
- The web store/form own generic catalog consumption and schema rendering; they do not own model-name or Google request rules.
- `GeminiLLM` owns Gemini request orchestration and provider generation-config translation. Its 3.8 branch owns all 3.8-controlled and forbidden keys; callers must not pre-sanitize them.
- `GeminiPromptRenderer` owns message/media/tool turn representation and correlation, but not model-specific generation fields.
- `initializeGeminiClientWithRuntime` owns credential/project construction for the explicitly selected Gemini setup; `resolveModelForRuntime` owns runtime-specific provider values.
- Application launch policy owns when a saved selection is required to be current; `LLMFactory` answers current membership.
- Token-pricing owner selects schedule periods from `observed_at`; model definitions provide price payloads but do not select wall-clock periods.
- Historical projections own display/aggregation from stored evidence and must not consult current catalog identity as a renaming authority.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `ModelCatalogService.listProviderModelCatalogSnapshots` | `LLMFactory` plus existing provider catalog owners | Runtime-scoped server catalog facade | Gemini row, schema, or metadata duplication; credential-based static discovery. |
| GraphQL `mapProviderModelCatalogSnapshot` | Server catalog snapshot | Transport projection | Model lifecycle or pricing decisions. |
| Web `llmProviderConfig` getters/form | Server-published catalog/schema | Generic selection/config UI | Hard-coded 3.8 identity or request conversion. |
| `createAvailableLlm` | Model availability plus `LLMFactory` | Server construction entrypoint | Model aliasing or Gemini config branching. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Current built-in 3.7 row and flat-only current pricing | 3.8 is the approved sole current Gemini Flash row. | Exact 3.8 row and two-period pricing history in `supported-model-definitions.ts`. | In This Change | Do not create a second row or alias. |
| Explicit 3.7 LLM runtime mapping | No current built-in runtime may select 3.7. | Exact 3.8 `api_key`/`vertex` identity mapping in `gemini-model-mapping.ts`. | In This Change | Generic unknown-ID pass-through is unchanged and is not catalog support. |
| Budget/sampling config for 3.8 | Google 3.8 rejects/deprecates that shape. | Exact 3.8 level-based policy inside `GeminiLLM`. | In This Change | Keep budget behavior only for unaffected current 3.1 Pro/direct out-of-scope calls. |
| 3.7 as a current model in active docs/tests/live fixtures | It would misstate shipped behavior and validation. | 3.8 current statements/assertions/scenarios. | In This Change | Retain 3.7 only in stale-selection/historical descriptions or archived artifacts. |
| Any proposed 3.7 compatibility mapping or data rewrite | It contradicts approved explicit reselection/history requirements. | Existing current-selection guard plus version-agnostic historical readers. | In This Change | Ensure none is added. |

## Return Or Event Spine(s) (If Applicable)

- DS-007: `Google response/stream parts -> GeminiLLM content/reasoning split -> CompleteResponse/ChunkResponse -> agent event/consumer -> user-visible answer`, with `usageMetadata -> Gemini token observation -> DS-005` as the accounting branch.
- DS-008: `historical run/token rows -> existing projections/aggregates -> provider:model display and stored totals`. The current model catalog is deliberately not a renaming or repricing node on this path.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `GeminiLLM`.
- DLS-001 chain: `model.value + LLMConfig + normalized tools -> clone/remove internal keys -> exact policy dispatch -> 3.8 forbidden/controlled-key filtering or preserved budget builder -> provider config -> invocation-local abortSignal`.
- Why it matters: both non-streaming and streaming requests must share one model-correct configuration result. The exact branch prevents 3.8 omissions from becoming a global Gemini regression and prevents arbitrary extra params from reintroducing a forbidden 3.8 field.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Static metadata/provenance | DS-001 | Built-in model definition/registry | Supply limits/capabilities/source date without provider access. | Catalog must be available before credentials. | Catalog would become network/credential dependent. |
| Runtime ID mapping | DS-002 | `GeminiLLM` | Translate logical provider value for `api_key`/`vertex`. | Existing modes share adapter but may have different provider IDs. | Adapter or server would hard-code mode-specific IDs. |
| Prompt/media/tool rendering | DS-002, DS-003 | `GeminiLLM` | Build Gemini `contents` with correlation/signatures. | Content contract is distinct from generation config. | Config policy and history repair become entangled. |
| Tool declaration normalization | DS-003 | `GeminiLLM` | Convert accepted tool shapes to Google SDK shape. | Existing callers use several tool declaration forms. | Core turn sequence would absorb adapter input compatibility details. |
| Pricing schedule payload | DS-005 | Token-pricing subsystem | Provide exact price periods and trusted dimensions. | Google publishes a future fixed cutover. | Selector would hard-code a model/provider. |
| SDK type seam | DS-002, DLS-001 | `GeminiLLM` | Carry lower-case official JS wire value despite stricter generated TS enum if necessary. | Prevent uppercase/type workarounds from changing the provider contract. | Generic model types or callers would be weakened. |
| Focused tests and reference scan | All | Architecture owners and validation | Prove replacement, isolation, and preserved paths. | Shared-adapter risk needs deterministic evidence. | Live access would become the only proof. |
| Credential/access handling | DS-002, DS-006 | Existing secret/runtime/error owners | Resolve the selected slot and preserve safe failure behavior. | Live access is operationally variable. | This model ticket would redesign security/error semantics. |

## Ownership Boundaries

Authority changes at these points:

1. The package built-in definition/`LLMFactory` boundary is authoritative for current AutoByteus model identity, schema, metadata, and price lookup. Server and web code consume this boundary only.
2. The AutoByteus run backend passes an exact current selection into `LLMFactory`; once constructed, `GeminiLLM` is authoritative for Google request configuration and response normalization.
3. The Gemini runtime resolver owns which configured mode is active and the corresponding credential/project construction. `GeminiLLM` may use the normalized runtime for model mapping but must not select or fall back between setup modes.
4. `GeminiPromptRenderer` is authoritative for Gemini content turns. The generation-config branch must not rewrite or “repair” those turns.
5. The token-pricing subsystem is authoritative for choosing schedule periods and recording cost evidence. The model row supplies schedule data only.
6. Application current-selection policy is authoritative for readiness/launch gating; history/token projections are authoritative for historical display and stored totals. Current catalog removal must not cross into history mutation.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `LLMFactory` | Supported definitions, metadata resolver, current registry, pricing lookup | Server catalog and AutoByteus LLM construction | Server/web hard-codes a 3.8 row or translates 3.7 | Extend the package definition/factory behavior and tests. |
| `GeminiLLM` | Model-policy dispatch, config construction, tool normalization, response/usage normalization | AutoByteus run backend/direct supported package callers | Caller strips fields, computes thinking budgets/levels, or bypasses adapter | Strengthen private adapter construction, not caller logic. |
| Gemini runtime resolver/helper | Active mode resolution and Google client options | `GeminiLLM` | Ambient credential fallback or caller-selected implicit mode | Extend the runtime service/helper under its existing contract. |
| `GeminiPromptRenderer` | Message/media/function-call/function-response conversion | `GeminiLLM` | Model-policy branch edits history or fabricates a final user turn | Correct renderer only for an approved supported scenario; otherwise return a gap. |
| `TokenPriceConfigProvider` + selector | Observation-time schedule selection and policy evidence | Token cost calculator | Catalog row uses process time or calculator hard-codes 2027 rates | Extend schedule data/selector contract explicitly. |
| Application current-selection policy | Runtime-scoped launch/readiness validation | Application launch/readiness services | Adapter aliases stale selection after readiness | Extend the current-selection boundary, never runtime fallback. |

## Dependency Rules

- `autobyteus-ts` model/adapter code must not depend on server or web modules.
- Server catalog and web selection may depend on published `ModelInfo`; neither may define or translate `gemini-3.8-flash` independently.
- `GeminiLLM` may depend on `LLMModel`, `LLMConfig`, the existing renderer, runtime helper/mapping, Google SDK, tool converter, and token normalizer. No caller may depend on its private 3.8 filtering details.
- The 3.8 policy discriminator must be the exact selected provider model value, not a broad prefix such as `gemini-3`, a runtime mode, display text, or schema field presence.
- The 3.8 branch must own its controlled keys after merging acceptable extra params. Extra params must not override `thinkingConfig`, `tools`, or reintroduce a forbidden field.
- `GeminiPromptRenderer` must remain independent of sampling/thinking configuration; request configuration must remain independent of history repair.
- Pricing data may depend on the existing schedule types; the generic selector must not import or branch on a Gemini model ID.
- Current-model validation may query `LLMFactory`; historical projections must continue to derive identity and totals from stored evidence without asking the registry to translate 3.7.
- No dependency/version update is allowed merely to obtain `thinkingLevel`; inspected supported SDK versions already expose it. If implementation proves otherwise in the actual install, return `Design Impact` with build evidence.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `SupportedModelDefinition` 3.8 row | Current built-in Gemini Flash model | Declare exact identity, schema, metadata, pricing. | `name=value=canonicalName=modelIdentifier=gemini-3.8-flash`; provider `GEMINI`. | No alias field or duplicate server row. |
| `LLMFactory.requireCurrentModelIdentifier(id)` | Current AutoByteus membership | Accept only exact registered ID. | Exact model identifier string. | 3.8 succeeds; 3.7 returns existing typed error. |
| `resolveModelForRuntime(value, 'llm', runtime)` | Gemini provider request model | Map selected value by normalized mode. | value `gemini-3.8-flash`; runtime `api_key` or `vertex`. | Both return exact same provider ID; Express/Project are distinguished earlier. |
| `GeminiLLM.buildGenerationConfig(...)` (private/internal) | Gemini provider generation config | Dispatch exact model policy and construct one send/stream config. | Exact `model.value`, `LLMConfig`, optional normalized tools. | 3.8 uses level-based policy; other calls retain current behavior. |
| `GoogleGenAI.models.generateContent/Stream` | Provider invocation | Submit model, contents, and provider config. | Exact provider ID plus renderer contents/config. | Do not change API method or client setup. |
| `TokenPriceConfigProvider.resolvePolicy(payload)` | Price policy for one observation | Resolve model pricing and select schedule from `observed_at`. | runtime/provider/model identity plus ISO observation string. | Existing invalid-time behavior remains. |
| Catalog GraphQL query | Current selectable model projection | Expose package `ModelInfo` grouped by provider. | Existing runtime kind and provider snapshot shape. | No GraphQL schema change. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| 3.8 supported definition | Yes | Yes | Low | Use exact identity in all four identity fields. |
| Current membership guard | Yes | Yes | Low | Add explicit 3.8 accept/3.7 reject regression. |
| Runtime mapping | Yes | Yes | Low | Replace explicit row and test both normalized runtimes. |
| Gemini config builder | Yes after split | Yes | Medium before implementation | Dispatch exact 3.8 value; do not use provider-wide/schema-presence detection. |
| Pricing policy resolver | Yes | Yes | Low | Supply existing two-fixed-schedule payload; test boundary instants. |
| GraphQL projection | Yes | Yes | Low | Reuse without schema/source change. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Current Flash model | `gemini-3.8-flash` | Yes | Low | Use the provider ID exactly; no friendly alias. |
| Adapter owner | `GeminiLLM` | Yes | Low | Keep model request rules inside it. |
| UI config key | `thinking_level` | Yes for AutoByteus config | Low | Preserve lower-case low/medium/high schema. |
| Provider config key | `thinkingConfig.thinkingLevel` | Yes for Google SDK | Low | Do not emit `thinkingBudget` for 3.8. |
| Price periods | `introductory` / `standard` with date-bearing schedule IDs | Yes | Low | Persist schedule and period IDs in existing evidence fields. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Current 3.8 identity/schema/metadata | Built-in supported model definitions | Extend | Existing authoritative row owner already carries all fields. | N/A |
| Mode-specific provider value | Gemini model mapping | Extend | Both normalized runtimes already map here. | N/A |
| 3.8 request contract | `GeminiLLM` adapter | Extend/refactor internally | Existing provider-specific request owner and shared send/stream builder. | N/A |
| Tool/media continuation | `GeminiPromptRenderer` and tool normalizer | Reuse | Existing behavior already meets approved supported path. | N/A |
| Effective-dated prices | Existing pricing schedule history + server selector | Reuse with new payload | Multiple fixed schedules express the contract directly. | N/A |
| Static catalog projection | Server catalog/GraphQL/web schema UI | Reuse | Existing generic boundaries consume the row without model-specific code. | N/A |
| Stale selection | Current-model guard/policy | Reuse | Exact membership already yields required explicit reselection. | N/A |
| Historical identity/totals | Existing token/history projections | Reuse | Stored evidence remains authoritative. | N/A |
| New Gemini policy registry or generic request-profile field | None needed | Do not create | One exact model split inside one provider adapter is proportionate. | A new generic abstraction would widen shared contracts without a second reusable consumer. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Built-in LLM Catalog (`autobyteus-ts/src/llm`) | Active row, config schema, static metadata, base and scheduled pricing | DS-001, DS-004, DS-005 | `LLMFactory` | Extend | Replace one row; reuse `geminiSchema`. |
| Gemini Provider Adapter (`autobyteus-ts/src/llm/api`) | Request policy, provider invocation, response/usage handling | DS-002, DS-003, DS-007, DLS-001 | `GeminiLLM` | Extend/refactor | Exact 3.8 branch plus preserved budget branch in one file. |
| Gemini Runtime Utilities (`autobyteus-ts/src/utils`) | Normalized runtime model mapping and client construction | DS-002 | Gemini runtime helper | Extend mapping; reuse construction | No mode/auth changes. |
| Server LLM Management / GraphQL | Static catalog projection | DS-001 | Model catalog service | Reuse | Test update only. |
| Application Launch Validation | Exact current model check | DS-004 | Current-model policy | Reuse | Test lower package guard; no source change. |
| Token Usage / Pricing | Observation-time schedule selection, cost evidence, historical projection | DS-005, DS-008 | Token pricing/history owners | Reuse | Test new schedule and history; no source change expected. |
| Validation / Documentation | Deterministic/live evidence and current guidance | DS-006 | API/E2E and Delivery owners | Extend | Preserve secrets and archived history. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | Built-in LLM Catalog | Current model row | Replace 3.7 identity/metadata; attach exact two-period pricing schedule; reuse schema. | Existing source of truth keeps all row payload coherent. | `ParameterSchema`, `TokenPricingConfig`, schedule types. |
| `autobyteus-ts/src/utils/gemini-model-mapping.ts` | Gemini Runtime Utilities | Runtime ID mapper | Replace explicit 3.7 LLM mapping with 3.8 mapping. | Existing modality/runtime map owner. | Existing resolver. |
| `autobyteus-ts/src/llm/api/gemini-llm.ts` | Gemini Provider Adapter | `GeminiLLM` | Exact-model config policy split, forbidden-key filtering, preserved send/stream use. | Existing config builder and invocation owner; extraction would add indirection without reuse. | Existing renderer, tools, token normalizer, runtime mapping. |
| Package and server focused test files | Validation | Respective owning boundaries | Prove catalog, config, mapping, tool continuation, history, metadata, pricing. | Existing test ownership plus one focused Gemini adapter test file. | Existing mocks/fixtures. |
| Active docs and live scenarios | Documentation/operability | Delivery/live harness | State and attempt the current 3.8 behavior. | Existing canonical current-product surfaces. | Existing harness and docs structure. |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Gemini config branching | Keep private in `gemini-llm.ts`; no new file | Gemini Provider Adapter | Both send and stream already share one method; no cross-file repetition exists. | Yes | Yes | Generic `LLMModel` request profile or caller-side switch. |
| Exact 3.8 literal across row/map/policy | No shared constant for this round | Each existing owner | Each occurrence is a distinct contract assertion and is caught by focused tests/reference scan; a new constant module would couple otherwise independent owners. | Yes | Yes | A compatibility alias registry. |
| Two fixed price periods | Existing `TokenPricingScheduleHistory` types | Pricing | Existing representation already captures schedule/period/trust meaning. | Yes | Yes | Model-specific logic in the server selector. |
| Low/medium/high schema | Existing `geminiSchema` | Built-in Catalog | Both current Gemini rows expose the same user-facing levels/default. | Yes | Yes | Provider request-shape policy; schema sharing does not imply identical wire config. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `geminiSchema` | Yes | Yes | Low | Keep only low/medium/high with medium default and include-thoughts boolean. |
| `LLMModel` identity fields | Yes when exact values match | Yes after removal | Low | Set name/value/canonical/identifier to exact 3.8; no alias field. |
| `LLMConfig` vs Google config | Yes after adapter translation | Yes | Medium before split | Keep snake-case UI config internal; adapter emits one camel-case provider representation. |
| `TokenPricingScheduleHistory` | Yes | Yes | Low | Use two fixed schedules and one period per schedule; no parallel date switch. |
| Historical model identity | Yes | Yes | Low | Keep stored 3.7 values; do not overlay current catalog name. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | Built-in LLM Catalog | Supported definitions / `LLMFactory` input | Exact 3.8 row; 1,048,576/1,048,576/65,536 metadata; current Google URL/date; existing schema; introductory base pricing plus fixed schedule history and 2027 cutover. | All static row truth is already co-located here. | Yes. |
| `autobyteus-ts/src/utils/gemini-model-mapping.ts` | Gemini Runtime Utilities | `resolveModelForRuntime` | Exact 3.8 `api_key` and `vertex` provider identity; remove explicit 3.7 row. | Existing runtime mapping owner. | Yes. |
| `autobyteus-ts/src/llm/api/gemini-llm.ts` | Gemini Provider Adapter | `GeminiLLM` | Exact 3.8 level-based generation config and forbidden-key ownership; unchanged budget-based branch and response paths. | One provider-specific owner and one shared builder call site for send/stream. | Yes. |
| `autobyteus-ts/tests/unit/llm/api/gemini-llm.test.ts` (new) | Adapter validation | `GeminiLLM` contract | Capture 3.8 non-stream/stream configs, mode-normalized model values, thinking summaries, abort/tools, forbidden-field absence, and 3.1 regression. | Focused adapter policy deserves a dedicated durable unit boundary. | Existing resolver/key test helpers. |
| `autobyteus-ts/tests/unit/llm/api/provider-native-request-payloads.test.ts` | Provider-native continuation validation | Gemini renderer + adapter integration | Exercise the existing multi-tool continuation using explicit 3.8 model and retain native context/ID/name assertions. | Existing cross-provider native-payload test is the correct integration-style owner. | Existing fixtures. |
| `autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts` | Catalog validation | Current definitions/factory | Assert exact 3.8 presence/schema/pricing and explicit 3.7 rejection. | Existing current-row contract suite. | Existing factory setup. |
| `autobyteus-ts/tests/unit/utils/gemini-model-mapping.test.ts` | Runtime validation | Mapping utility | Assert exact 3.8 for `api_key` and `vertex`. | Existing mapping suite. | Existing resolver. |
| `autobyteus-server-ts/tests/e2e/llm-management/model-metadata-provenance-graphql.e2e.test.ts` | Server catalog E2E | Catalog/GraphQL projection | Update target to 3.8 and retain the three-mode zero-credential/zero-HTTP matrix. | Existing acceptance-level boundary. | Existing setup-mode fixtures/spies. |
| `autobyteus-server-ts/tests/unit/token-usage/pricing/token-price-config-provider.test.ts` | Pricing validation | Price resolver | Assert the final introductory instant and 2027 first instant, exact triples, trusted dimensions, schedule/period IDs, and observation-time behavior. | Existing end-to-end pricing-policy unit boundary. | Existing selector/factory. |
| `autobyteus-server-ts/tests/unit/token-usage/projections/token-usage-model-display-projection.test.ts` | Historical display validation | History projection | Add a stored Gemini 3.7 event assertion independent of current catalog membership. | Existing deleted/current-provider display owner. | Existing event fixture. |
| `test-support/live-e2e/live-e2e-scenarios.mjs` | Live validation | Live harness scenario catalog | Replace both Gemini LLM scenario model values with 3.8; do not touch Gemini media scenarios. | Existing credential/mode owner. | Existing safe harness. |
| `provider-error-and-pricing-contract.md` | Current normative contract | Delivery docs | Replace current Gemini row/request/pricing prose while retaining explicit stale/history semantics. | Existing contract surface. | Existing latest-only and error contracts. |
| `autobyteus-ts/docs/provider_model_catalogs.md` | Package docs | LLM catalog documentation | Document 3.8 exact identity, config omissions, limits, static provenance, and 2027 price schedule. | Existing package model catalog. | Existing section. |
| `autobyteus-server-ts/docs/modules/llm_management.md` | Server docs | Server catalog/runtime documentation | Update current catalog boundary and package projection examples to 3.8. | Existing server module doc. | Existing section. |

No source changes are expected in `GeminiPromptRenderer`, `LLMFactory`, server catalog/GraphQL, application launch policy, token selector/calculator, historical projection, or web code. If a source change becomes necessary there, implementation must justify it against the escalation trigger rather than broaden scope silently.

## Applied Patterns (If Any)

- Existing static built-in model definition pattern.
- Provider-adapter-owned request translation with exact-model specialization.
- Existing runtime model mapping pattern.
- Effective-dated immutable pricing schedule pattern.
- Version-agnostic saved/historical data with exact current-membership validation; no migration.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | File | Built-in catalog | Current row/schema/metadata/pricing payload | Existing package source of truth | Runtime-mode selection, provider calls, alias. |
| `autobyteus-ts/src/llm/api/gemini-llm.ts` | File | Gemini adapter | Model-scoped config construction and existing invocation/response behavior | Provider-specific translation already lives here | Server/web/persistence logic, history repair. |
| `autobyteus-ts/src/utils/gemini-model-mapping.ts` | File | Gemini runtime mapping | Exact API-key/Vertex provider values | Existing cross-modality runtime map | Catalog/pricing policy. |
| `autobyteus-ts/tests/unit/llm/api/` | Folder | Adapter tests | Deterministic Google SDK boundary captures | Mirrors adapter source | Live secrets/network dependency. |
| `autobyteus-ts/tests/unit/llm/` and `tests/unit/utils/` | Folder | Catalog/mapping tests | Current identity/schema/price payload and mapping | Existing ownership-aligned suites | Server behavior. |
| `autobyteus-server-ts/tests/e2e/llm-management/` | Folder | Server API E2E | Generic catalog projection and metadata independence | Existing GraphQL catalog boundary | Provider request tests. |
| `autobyteus-server-ts/tests/unit/token-usage/` | Folder | Token/history tests | Observation-time pricing and historic identity | Existing subsystem tests | Current catalog aliasing. |
| `test-support/live-e2e/live-e2e-scenarios.mjs` | File | Live harness | Current Gemini text scenario values | Existing operational catalog | Credentials or captured secrets. |
| Active docs listed above | File | Documentation owners | Current model/request/pricing behavior | Canonical current-product guidance | Claims of live success without evidence; rewritten history. |

The compact existing folder layout is retained because the target adds no new architectural depth: the model-specific branch is one internal concern of the existing Gemini adapter, not a new module or subsystem.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm` | Main-Line Domain-Control | Yes | Low | Registry/model/config ownership is established. |
| `autobyteus-ts/src/llm/api` | Persistence-Provider | Yes | Low | Provider adapters own wire request/response conversion. Keep the 3.8 split private here. |
| `autobyteus-ts/src/utils` | Off-Spine Concern | Yes | Low | Existing Gemini runtime utilities serve adapters/media clients; do not move catalog policy here. |
| `autobyteus-server-ts/src/llm-management` | Transport/Main-Line boundary, unchanged | Yes | Low | Projects package models and resolves runtime setup without duplicating the model row. |
| `autobyteus-server-ts/src/token-usage` | Main-Line Domain-Control/Persistence | Yes | Low | Existing pricing and history owners remain unchanged; test only. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Exact row | `{ name: 'gemini-3.8-flash', value: 'gemini-3.8-flash', canonicalName: 'gemini-3.8-flash', provider: LLMProvider.GEMINI }` | Keep 3.7 plus alias to 3.8, or display 3.8 while value remains 3.7 | Identity must stay exact across selection, factory, and provider. |
| Policy dispatch | `model.value === 'gemini-3.8-flash' ? buildLevelConfig(...) : buildExistingBudgetConfig(...)` | Apply 3.8 omissions to every Gemini model or infer from `thinking_level` schema presence | Both current rows share schema fields but not the approved wire contract. |
| 3.8 config | `{ responseMimeType, systemInstruction, maxOutputTokens, stopSequences, thinkingConfig: { thinkingLevel: 'medium', includeThoughts: false }, tools }` | `{ temperature: 0.7, topP, presencePenalty, thinkingConfig: { thinkingBudget: 4096 } }` | Makes allowed/forbidden ownership concrete. Undefined fields should be absent after SDK-boundary capture. |
| Extra-param handling | Remove internal keys and 3.8 forbidden/controlled camel/snake variants, merge only remaining extras, then set `thinkingConfig`/`tools` from adapter-owned values. | Merge `extraParams` last so `thinkingConfig`, `topK`, or `candidateCount` can be reintroduced. | REQ-005 applies to the final provider request, not only default fields. |
| Fixed pricing history | Fixed `introductory` schedule followed by fixed `standard` schedule effective `2027-01-01T00:00:00Z`; selector uses `observed_at`. | `if (new Date() >= 2027...)` in catalog, calculator, or UI | Preserves observation-time accounting and durable schedule evidence. |
| Historical 3.7 | Stored `{ provider: GEMINI, model_identifier/value: 'gemini-3.7-flash', stored prices/totals }` projects as stored. | Lookup 3.7 in current catalog or rewrite it to 3.8 | Historical truth is separate from current availability. |

### Required 3.8 Config Construction Invariants

For exact `model.value === "gemini-3.8-flash"`:

1. Read AutoByteus `thinking_level`; supported values are `low`, `medium`, `high`, with `medium` as the fallback/default for the supported schema path. Do not emit `minimal`.
2. Read `include_thoughts` as the existing boolean control.
3. Remove the internal snake-case controls before merging extra params.
4. Omit/sanitize all 3.8-forbidden forms from the final config: `temperature`; `topP`/`top_p`; `topK`/`top_k`; `candidateCount`/`candidate_count`; `frequencyPenalty`/`frequency_penalty`; `presencePenalty`/`presence_penalty`; top-level `thinkingBudget`/`thinking_budget`; and any caller-provided `thinkingConfig` that could contain a budget or replace adapter-owned level/summary values.
5. Preserve supported common fields: `responseMimeType`, `systemInstruction`, `maxOutputTokens`, `stopSequences`, normalized `tools`, and invocation `abortSignal`, plus other non-controlled extra params not forbidden by the approved contract.
6. Set adapter-owned `thinkingConfig` after allowed extra-param merge: `{ thinkingLevel: <lower-case level>, includeThoughts: <boolean> }`.
7. Use the same builder from `generateContent` and `generateContentStream`.

For non-3.8 Gemini text models, retain the current builder's observable budget/sampling/extra-param behavior. Do not use the 3.8 branch as an opportunity to modernize 3.1 or direct unknown model calls.

### Required Pricing Shape

Use the existing `TokenPricingScheduleHistory` with two `fixed` schedules and stable IDs:

- introductory schedule/period: input `0.75`, output `3.75`, cached-input read `0.075`; applicable before the 2027 schedule becomes eligible;
- standard schedule/period: effective `2027-01-01T00:00:00Z`; input `1.50`, output `7.50`, cached-input read `0.15`.

The row's flat/current fields remain the introductory prices with source `autobyteus_model_catalog` and effective date `2026-09-02`, while the schedule history governs server observation-time selection. Input, output, and cached-input-read dimensions are trusted; cache-write dimensions remain untrusted/absent. Use date-bearing schedule IDs so stored price policy keys remain auditable. No selector or database change is required.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep 3.7 selectable beside 3.8 | Google still supports 3.7. | Rejected | Product's approved latest-only row becomes 3.8; 3.7 is absent. |
| Map requested 3.7 to provider 3.8 | Could make old saved configs launch. | Rejected | Exact current-membership guard rejects 3.7 and user explicitly reselects. |
| Rewrite saved or historical 3.7 strings | Could make stored data appear current. | Rejected | Directly usable strings keep stale/current/history semantics; no migration. |
| Keep a 3.7 pricing lookup for old records | Could re-resolve prices after row removal. | Rejected | Historical snapshots/totals are authoritative; new pricing lookup is only for current 3.8 observations. |
| Apply 3.8 config globally to all Gemini LLMs | Simplifies the adapter branch. | Rejected | Preserve the current 3.1 Pro contract through an explicit non-3.8 branch. |
| Add generic request-profile fields to `LLMModel` | Could encode provider policy declaratively. | Rejected | One provider-local exact split does not justify widening shared model contracts. |
| Upgrade `@google/genai` | Might appear necessary for `thinkingLevel`. | Rejected unless build evidence disproves the source probe | Supported manifest/lock versions already contain the field; isolate the TS typing seam locally. |

## Derived Layering (If Useful)

`Catalog/UI -> current selection/run construction -> Gemini provider adapter -> Google SDK/provider`, with prompt rendering and runtime mapping as adapter-owned collaborators. `Provider response -> adapter response/token normalization -> user event and token-pricing ledger` is the return path. This layering is descriptive only; ownership/boundaries above govern implementation.

## Change / Refactor Sequence

1. Establish executable dependencies using repository policy; record the actual root/package `@google/genai` resolution. Do not change the dependency unless the current supported resolution demonstrably cannot compile or forward `thinkingLevel`.
2. In `supported-model-definitions.ts`, replace the 3.7 row with exact 3.8 identity, approved metadata/provenance, existing Gemini schema, introductory base pricing, and the two-fixed-schedule history. Keep 3.1 Pro untouched.
3. In `gemini-model-mapping.ts`, remove the explicit 3.7 LLM entry and add exact 3.8 `api_key`/`vertex` identities. Do not add a 3.7 alias.
4. Refactor only `GeminiLLM.buildGenerationConfig` internals:
   - preserve the current budget-based construction as the non-3.8 path;
   - add exact 3.8 dispatch and construct/sanitize the final allowed config using the invariants above;
   - keep both send/stream paths on the same builder;
   - do not change runtime selection, prompt rendering, tool conversion, response parsing, token normalization, abort handling, or error wrapping.
5. Add focused package tests before changing broad fixtures: exact 3.8 adapter config for defaults and selected levels; summary enabled/disabled; forbidden values supplied through both common config and extra params; model identity for both normalized runtimes; send/stream reuse; 3.1 regression; exact catalog/schema/price schedule; 3.8 mapping.
6. Update the provider-native Gemini continuation test to use 3.8 explicitly and retain the ID/name/order/thought-signature/no-synthetic-text assertions. Do not alter the renderer unless this supported test exposes an actual requirement-linked defect.
7. Update server tests for three-mode credential-independent metadata, observation-time price boundary/evidence, stale 3.7 rejection, and historical 3.7 display. Reuse existing source boundaries.
8. Update only the two Gemini LLM live scenario values; preserve media model values and safe credential gating.
9. Synchronize the three current docs/contract surfaces. Run an active-reference scan and classify each remaining 3.7 mention as an explicit stale/historical assertion; leave `tickets/done`, retained reports, and other archived evidence unchanged.
10. Run package unit/build/type checks, focused server unit/API/E2E checks, and the live scenario when configured. Record a truthful access blocker if live entitlement/credentials/region/quota prevent validation.

No temporary compatibility seam is needed. The final tree must have one current 3.8 row and no active 3.7 mapping/current documentation.

## Key Tradeoffs

- **Exact inline model branch vs a generic request-policy abstraction:** the inline branch keeps policy under the correct provider owner and limits blast radius. It duplicates one exact model discriminator across independent contract surfaces, but tests and the reference scan make that duplication auditable. A generic `LLMModel` request profile would cost more coupling than it removes.
- **Deny/filter controlled 3.8 fields vs dropping all extra params:** targeted filtering guarantees the approved omissions while preserving supported non-controlled Gemini extras. Dropping all extras would silently narrow existing behavior beyond requirements.
- **Reuse shared `geminiSchema` vs create a 3.8-only schema object:** both current built-in Gemini text rows expose the approved low/medium/high/default-medium/include-thoughts UI contract. Reuse is semantically tight even though their provider request translations differ.
- **Two fixed schedules vs calendar logic:** fixed schedules use the existing observation-time owner, persist auditable IDs, and avoid process-time branching. The initial schedule is the price in force until the exact 2027 schedule becomes eligible.
- **No migration vs saved-selection convenience:** explicit reselection intentionally creates a safe blocking edge for old saved configurations. Automatic convenience would violate exact model intent and historical truth.

## Risks

| Risk | Mitigation / Required Evidence | Owner |
| --- | --- | --- |
| 3.8 forbidden fields are added by common config or reintroduced by `extraParams`. | Construct/filter the final 3.8 config under adapter ownership; tests seed every listed camel/snake path and assert absence at the mocked SDK boundary. | Implementation + code review. |
| 3.1 Pro inherits 3.8 omissions or string-level config. | Exact model-value dispatch plus a focused 3.1 regression asserting the existing budget/sampling shape. | Implementation + code review. |
| SDK generated TypeScript enum disagrees with Google's lower-case JS example. | Keep lower-case approved/provider value; isolate a narrow typed seam; package build plus captured request and live attempt. No uppercase translation or broad `any` propagation. | Implementation + API/E2E. |
| Fixed future pricing is represented only in docs or current flat values. | Two fixed schedules, exact 2026/2027 boundary tests, and schedule/period policy evidence assertions. | Implementation + API/E2E. |
| Static catalog unexpectedly asks for Gemini credentials/network. | Preserve source paths and update existing three-mode GraphQL E2E spies for zero Gemini lookup/fetch. | API/E2E. |
| Remaining 3.7 reference accidentally retains active support. | Classify every non-archived match; only stale-selection/history assertions may remain. | Implementation + Delivery. |
| Live access is absent or 3.8 entitlement differs by account/region. | Separate deterministic request construction from live provider status and record the safe blocker without secrets. | API/E2E + Delivery. |
| Dependency installation changes lockfiles unrelated to the task. | Use repository/corepack policy; inspect diff and avoid committing incidental lock churn. | Implementation + Delivery. |

## Guidance For Implementation

- Treat RER-002 as the behavior authority. Do not add aliases, saved-config rewrites, malformed-history repair, UI redesign, auth fallback, error classification, or broad Gemini modernization.
- Key the 3.8 request policy from exact `this.model.value === 'gemini-3.8-flash'`. Do not key from display name, provider alone, runtime mode, or presence of `thinking_level` because the 3.1 row shares that schema.
- Preserve the current non-3.8 builder before altering 3.8 behavior. The review-critical regression is that 3.1 still emits its established budget/common fields.
- Assert the final object passed to `generateContent`/`generateContentStream`, not only an internal helper. The provider requirement applies after all merges and invocation-local additions.
- Keep lower-case `low`/`medium`/`high` as the wire value required by the approved package and official JavaScript example. If generated SDK typings object, use one documented boundary cast; do not change the value to uppercase and do not weaken shared types.
- Use the current schema unchanged unless tests show it differs from low/medium/high, medium default, include-thoughts false. `minimal` must not appear in the 3.8 row schema or request.
- For pricing, keep current flat fields at introductory values for catalog consumers and add the fixed history used by server accounting. Test `2026-12-31T23:59:59.999Z` and `2027-01-01T00:00:00.000Z` explicitly.
- Update 3.8 request tests across `api_key` and `vertex`; combine them with existing helper tests that distinguish AI Studio, Vertex Express, and Vertex Project client construction.
- A remaining source/test occurrence of 3.7 is acceptable only when it asserts stale rejection or historical preservation. No current catalog, mapping, live fixture, or current-doc statement may retain it.
- Do not claim executable or live validation until dependencies are present and the relevant commands actually run.

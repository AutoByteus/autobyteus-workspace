# Requirements Document

## Document Status

- Status: `Approved`
- Current requirements revision ID: `RER-002`
- Request / ticket: Replace the current Gemini 3.7 Flash integration with Gemini 3.8 Flash (`gemini-3-8-flash`)
- Stable package identifier: `PKG-GEMINI-3-8-FLASH-2026-09-03`
- Requirements owner: Requirements Engineer
- Date: 2026-09-03
- Approval state and reference: Explicitly approved by the user on 2026-09-03 after confirming the intended result as "basically remove 3.7 with 3.8" and replying, "cool. its simple. approved". Approval applies to RER-002 and the canonical package at the paths below.

## Problem And Desired Outcome

- Problem: AutoByteus currently advertises and invokes `gemini-3.7-flash` as the sole current Gemini Flash text model even though Google released the GA `gemini-3.8-flash` model on 2026-09-02. The shared Gemini request adapter also builds thinking and sampling configuration in a form that Google's 3.8 migration contract says must be replaced or omitted.
- Affected actors or systems: People configuring or running AutoByteus agents with Gemini; the built-in Gemini catalog; AI Studio, Vertex Express, and Vertex Project Gemini execution modes; token-cost accounting; automated catalog and live-provider validation.
- Desired outcome: Make `gemini-3.8-flash` the exact current Gemini Flash text-model selection and provider value, remove `gemini-3.7-flash` from the current curated catalog without aliasing it, and ensure supported 3.8 requests, metadata, thinking controls, pricing, and validation conform to Google's published contract.
- Observable definition of success: Current AutoByteus catalog surfaces expose 3.8 rather than 3.7; a normal user- or tool-triggered 3.8 invocation uses the selected Gemini runtime with a provider-valid request shape and returns through existing response/tool flows; stale 3.7 selections require explicit reselection; metadata and cost calculations use verified 3.8 values; other runtimes, models, histories, and error behavior remain unchanged.

## Relevant Current And Desired Behavior

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User / System | SCN-001 | The static AutoByteus model registry contains `gemini-3.7-flash`; the server projects it through the built-in provider catalog and GraphQL; web launch configuration reads that catalog for model selection. | The same supported catalog and selection path exposes `gemini-3.8-flash` with exact name, identifier, canonical name, and provider value, and no longer exposes 3.7 as current. | Provider-grouped selection, current GraphQL shape, static catalog availability, Gemini provider ownership, and unrelated model rows. | `autobyteus-ts/src/llm/supported-model-definitions.ts`; `autobyteus-server-ts/src/llm-management/services/model-catalog-service.ts`; `autobyteus-server-ts/src/api/graphql/types/llm-provider-model-catalog.ts`; `autobyteus-web/stores/llmProviderConfig.ts`; `autobyteus-web/components/workspace/config/AgentRunConfigForm.vue` |
| BEH-002 | User / Contract | SCN-002, SCN-003 | `GeminiLLM` resolves the selected model for AI Studio/Vertex and uses the Google Gen AI `generateContent` path. It currently converts `thinking_level` to integer `thinkingBudget` and includes common sampling/penalty parameters. | Supported 3.8 requests use the exact runtime model ID, string `thinkingLevel` (`low`, `medium`, or `high`; default `medium`), optional thought summaries, and omit parameters Google's 3.8 migration contract identifies as deprecated or unsupported. | Existing response text, thought-summary handling, streaming behavior, media input, system instruction, token observations, abort behavior, and function-tool result correlation. Other Gemini models retain their approved behavior. | `autobyteus-ts/src/llm/api/gemini-llm.ts`; `autobyteus-ts/src/utils/gemini-model-mapping.ts`; `autobyteus-ts/src/llm/prompt-renderers/gemini-prompt-renderer.ts`; Google 3.8 model and migration guides recorded in `investigation-notes.md` |
| BEH-003 | User / Contract | SCN-004 | The latest-only catalog contract removes superseded identifiers without aliases; a persisted/direct AutoByteus selection outside the current catalog is rejected and requires explicit user reselection. Historical run identity is stored separately. | A stale `gemini-3.7-flash` selection follows that same explicit-reselection behavior; it is not silently translated to 3.8. Historical 3.7 run and token-usage records remain truthful and unchanged. | Exact current-model validation, no compatibility aliases, immutable historical accounting, and historical display fallback. | `provider-error-and-pricing-contract.md`; `autobyteus-ts/src/llm/llm-factory.ts`; `autobyteus-server-ts/src/application-platform/launch-configuration/application-current-model-selection-policy.ts`; token-usage projections under `autobyteus-server-ts/src/token-usage/` |
| BEH-004 | System / Contract | SCN-005 | The 3.7 row carries curated token limits and flat current pricing used by pricing lookup and server token-cost accounting. | The 3.8 row carries Google-published limits and effective-dated introductory and standard prices so cost calculation selects the applicable period by usage time. | Token observations, historical pricing snapshots/totals, missing-pricing behavior, and pricing behavior for all other models. | `autobyteus-ts/src/llm/supported-model-definitions.ts`; `autobyteus-ts/src/llm/llm-model-pricing.ts`; `autobyteus-server-ts/src/token-usage/pricing/token-price-config-provider.ts`; official pricing evidence in `investigation-notes.md` |
| BEH-005 | Operational | SCN-006 | Live-E2E scenario definitions use `gemini-3.7-flash` for Gemini text scenarios, while unit and server E2E tests assert the 3.7 catalog row and metadata. | Active validation fixtures and assertions target 3.8 and prove the replacement and provider-contract behavior; live checks are attempted only when the environment has valid access. | Credential secrecy, truthful skip/block reporting, unrelated live scenarios, and historical evidence artifacts. | `test-support/live-e2e/live-e2e-scenarios.mjs`; `autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts`; `autobyteus-server-ts/tests/e2e/llm-management/model-metadata-provenance-graphql.e2e.test.ts` |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| AutoByteus user | Select and run the current Gemini Flash model. | Sees and can invoke 3.8 with the documented thinking choices. | Must not be silently migrated from a persisted 3.7 selection. |
| AutoByteus catalog and runtime | Advertise, validate, route, and invoke exact provider-supported model identities. | Uses `gemini-3.8-flash` consistently across AI Studio and Vertex modes. | Static catalog loading must not require provider credentials or network metadata fetches. |
| Token-usage accounting | Price new usage against the correct model and effective period. | Uses current introductory pricing and the published 2027 standard price after its effective date. | Existing stored usage snapshots and totals are immutable. |
| Engineering and validation | Prove catalog, request-contract, metadata, and regression outcomes. | Durable automated checks cover both the replacement and provider-valid requests. | No secret values may be printed, captured, or committed. |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- `UC-001`: A user configuring a new AutoByteus run selects Gemini 3.8 Flash from the built-in Gemini model group and sees the existing model-specific thinking controls.
- `UC-002`: A user sends a normal prompt or continues a supported multi-turn/tool workflow using 3.8 through AI Studio, Vertex Express, or Vertex Project.
- `UC-003`: A user attempts to launch a persisted AutoByteus configuration that still selects 3.7 and is told to choose a currently available model instead of being silently remapped.
- `UC-004`: The system records and prices 3.8 token usage using the price period applicable to the observation time while retaining old records unchanged.
- `UC-005`: Operators and CI validate the current Gemini model through active unit, server API/E2E, documentation, and live-E2E surfaces.

### Out Of Scope

- Retaining 3.7 as another selectable built-in model, adding a 3.7-to-3.8 alias, or automatically rewriting persisted selections.
- Changing the current Gemini 3.1 Pro catalog decision or adding other Gemini LLM, image, audio, video, embeddings, Live API, Interactions API, or managed-agent products.
- Broad redesign of the provider catalog, web model selector, Gemini authentication/setup modes, token-usage subsystem, or provider-error transport.
- Prompt retuning, benchmark-driven default changes, or automatic selection based on latency, quality, or token consumption.
- Adding unsupported `minimal` thinking or exposing removed sampling/penalty controls for 3.8.
- Retrofactive repricing or renaming of historical 3.7 usage and run records.
- Treating manually corrupted message histories or direct synthetic calls that end in an assistant/model turn as a newly supported product scenario.

### Non-Goals

- No new UI layout or product-design work.
- No remote model-discovery capability for Google's static catalog.
- No change to Gemini credentials, region selection, quota policy, or deployment topology.
- No guarantee that every configured Google account is entitled to the new model; access, quota, or credential failures continue through existing safe provider-error behavior.

### Preserved Behavior Boundary

- Preserve the outcomes of `BEH-001` through `BEH-005` outside the stated 3.7-to-3.8 replacement.
- Existing non-Gemini models and non-text Gemini modalities remain unchanged.
- Existing AI Studio, Vertex Express, and Vertex Project setup selection remains authoritative; the model update must not introduce fallback between modes.
- Existing text/reasoning streaming, function-tool history, multimodal input, token observation, abort, missing-key, and provider-error behavior remains intact for supported scenarios.
- Historical runs and token-usage records retain the identifier and price evidence actually recorded at execution time.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate. It is not a required design correction.
- A downstream reviewer comment does not amend this requirements basis. The Requirements Engineer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | The current built-in Gemini Flash text-model catalog shall replace `gemini-3.7-flash` with one row whose user-facing identifier, name, canonical name, and provider request value are exactly `gemini-3.8-flash`. | BEH-001, BEH-003 | Must | Implements the user's explicit replacement request and the product's latest-only catalog contract. | User request; Google model ID; current catalog contract |
| REQ-002 | `gemini-3.7-flash` shall no longer resolve or appear as a current AutoByteus built-in model, and the product shall not silently alias or rewrite it to 3.8. | BEH-001, BEH-003 | Must | Avoids running a materially different model without explicit selection. | User wording "replace"; latest-only contract |
| REQ-003 | The 3.8 row shall be usable through each existing supported Gemini setup mode—AI Studio/API key, Vertex Express, and Vertex Project—using Google's documented exact `gemini-3.8-flash` model identity for each mode. | BEH-002 | Must | The current product deliberately supports three Gemini construction modes. | Google AI and Google Cloud model docs; current mapping/runtime code |
| REQ-004 | The 3.8 configuration contract shall expose thinking levels `low`, `medium`, and `high`, default to `medium`, exclude `minimal`, and preserve the existing option to request thought summaries. | BEH-001, BEH-002 | Must | Matches Google's documented valid levels and current product thinking-summary behavior. | Google 3.8 model/migration docs |
| REQ-005 | A 3.8 provider request shall express reasoning with the provider's string `thinkingLevel` contract rather than an integer thinking budget, and shall omit 3.8-deprecated or unsupported sampling/penalty/count fields including temperature, top-P, top-K, candidate count, frequency penalty, and presence penalty. | BEH-002 | Must | Google's migration checklist warns that the old shape is invalid, deprecated, or unsupported for 3.8. | Google 3.8 migration guides |
| REQ-006 | Supported user-prompt and function-tool continuations shall retain valid Gemini turn sequencing and function-response correlation, including both the function call ID and name, while preserving text, media, system-instruction, streaming, thought-summary, abort, and token-usage outcomes. | BEH-002 | Must | The model replacement must work on the product's real agent execution paths, not merely appear in a list. | Current renderer and adapter; Google 3.8 mandatory API rules |
| REQ-007 | The 3.8 catalog metadata shall report a 1,048,576-token context/input limit, a 65,536-token output limit, the current Gemini text-input modality/capability set already represented by the product, a Google source URL, and a 2026-09-02-or-later verification date. | BEH-001, BEH-004 | Must | Keeps static catalog and launch/context decisions accurate without provider lookup. | Google 3.8 model page |
| REQ-008 | Standard global 3.8 token pricing shall represent the published introductory period through 2026-12-31 (`$0.75` input, `$3.75` output, `$0.075` cached input per million tokens) and the published standard period effective 2027-01-01 (`$1.50`, `$7.50`, `$0.15` respectively); selection shall be based on the usage observation time. | BEH-004 | Must | Avoids a known future stale-price defect and uses the product's existing effective-dated accounting contract. | Google 3.8 migration/pricing docs; current pricing schedule capability |
| REQ-009 | Loading or projecting the curated 3.8 model row shall remain independent of a Gemini credential lookup or live metadata HTTP request in all existing Gemini setup modes. | BEH-001 | Must | Current static catalog availability must not be blocked by credentials or provider connectivity. | Current server metadata-provenance E2E contract |
| REQ-010 | Existing missing-credential, provider-error redaction/passthrough, runtime-mode selection, and access/quota failure behavior shall remain unchanged. | BEH-002, BEH-005 | Must | The request does not authorize broader error or authentication changes. | `provider-error-and-pricing-contract.md`; user scope |
| REQ-011 | Historical 3.7 run identity, token-usage records, price snapshots, totals, and durable delivery evidence shall not be rewritten or repriced. | BEH-003, BEH-004 | Must | Historical evidence must remain truthful and immutable. | Current token-usage contract |
| REQ-012 | Active source, current-product documentation, catalog assertions, server metadata tests, and live-E2E Gemini LLM scenarios shall use 3.8 wherever they currently designate 3.7 as the current model; historical archived evidence may retain 3.7. | BEH-005 | Should | Prevents stale operator/test guidance without falsifying historical artifacts. | Active-reference inventory in `investigation-notes.md` |
| REQ-013 | Validation shall cover exact catalog replacement, runtime mappings, metadata projection, request payload fields, supported user/tool continuation, stale-selection rejection, applicable price periods, focused regression checks, and a credential-gated live provider attempt or truthful access blocker. | BEH-001, BEH-002, BEH-003, BEH-004, BEH-005 | Must | A catalog-only assertion would not prove the provider-contract portion of the migration. | Current tests; Google migration contract |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002, REQ-007 | BEH-001 / SCN-001 | Request the AutoByteus built-in Gemini LLM catalog. | Exactly one current Gemini Flash row is returned as `gemini-3.8-flash`; it has exact identifier/name/value/canonical identity, Gemini provider classification, documented limits, and current-source metadata. | `gemini-3.7-flash` is absent from current rows and is not an alias. | Unit catalog assertion plus server GraphQL/E2E projection. |
| AC-002 | REQ-004 | BEH-001, BEH-002 / SCN-001, SCN-002 | Inspect the 3.8 model configuration schema or configure a new 3.8 run. | `thinking_level` permits only low/medium/high and defaults to medium; `include_thoughts` remains available and defaults consistently with current behavior. | `minimal` is neither generated by default nor accepted as a schema option. | Schema unit test and launch-configuration contract check. |
| AC-003 | REQ-003, REQ-005 | BEH-002 / SCN-002 | Invoke a normal 3.8 text request through each existing Gemini setup mode with the provider client mocked or observed at its request boundary. | Every mode targets `gemini-3.8-flash`; generation config contains string `thinkingLevel` at the chosen/default value and contains no integer `thinkingBudget`, temperature, top-P, top-K, candidate-count, frequency-penalty, or presence-penalty field. | Provider access failure does not excuse an incorrect locally constructed payload; unrelated setup errors retain existing handling. | Focused adapter/request tests covering AI Studio and Vertex runtime resolution. |
| AC-004 | REQ-004, REQ-005, REQ-006 | BEH-002 / SCN-002, SCN-003 | Invoke 3.8 once with thought summaries disabled and once enabled. | The request uses the same valid thinking-level contract; disabled mode does not surface a reasoning summary, enabled mode continues to surface provider-supplied thought summaries separately from response text. | No raw or invented thinking content is produced when the provider does not return it. | Adapter response and request-shape unit tests. |
| AC-005 | REQ-006 | BEH-002 / SCN-003 | Continue a supported agent turn after one or more Gemini function calls and results. | The next provider request ends in the supported user/function-response trigger, correlates every result with function ID and name, and existing text/tool streaming completes normally. | Empty unsupported messages remain omitted; no new support is promised for a manually constructed trailing model/prefill turn. | Renderer and agent/provider-native payload tests. |
| AC-006 | REQ-002, REQ-011 | BEH-003 / SCN-004 | Validate or launch a persisted AutoByteus configuration selecting `gemini-3.7-flash`, and inspect an existing historical 3.7 record. | The stale selection is rejected as unavailable and requires explicit reselection; historical identity and accounting still display/retain 3.7 as originally recorded. | No automatic remap, database rewrite, or retroactive cost change occurs. | Current-model guard test plus historical projection/regression test. |
| AC-007 | REQ-008, REQ-011 | BEH-004 / SCN-005 | Resolve standard global 3.8 pricing for observations before and after `2027-01-01T00:00:00Z`. | The introductory triple is selected through 2026-12-31 and the standard triple from 2027-01-01; selected period evidence is durable; old snapshots remain unchanged. | An invalid observation timestamp fails according to the existing pricing contract rather than silently using process time. | Pricing lookup/schedule unit tests and server accounting regression. |
| AC-008 | REQ-009 | BEH-001 / SCN-001 | Project the curated catalog in AI Studio, Vertex Express, and Vertex Project modes with credential/network spies. | 3.8 metadata is available with zero Gemini credential lookups and zero live metadata HTTP requests; the existing curated provenance/null GraphQL convention is preserved. | Catalog availability must not fail because a credential is absent. | Existing server metadata-provenance E2E test updated for 3.8. |
| AC-009 | REQ-010 | BEH-002 / SCN-002 | Trigger existing missing-key and safe provider-error paths while 3.8 is selected. | Existing stable missing-key messaging and safe original provider-message/redaction behavior are unchanged. | Access/quota errors are not misreported as successful model validation. | Focused regression tests; no new error categories. |
| AC-010 | REQ-012 | BEH-005 / SCN-006 | Search active source/docs/tests and inspect archived ticket evidence separately. | Current-model references and live scenarios use 3.8; current prose says pre-3.8/3.7 is replaced where applicable; historical archived artifacts remain untouched. | A 3.7 mention explicitly describing history or stale-selection behavior is permitted. | Scoped reference scan and docs review. |
| AC-011 | REQ-013 | All / SCN-001–SCN-006 | Run focused unit, build/type, server API/E2E, and live-provider validation. | All deterministic checks pass. A minimal live 3.8 text request succeeds in at least one configured supported mode when valid access exists, with no secret capture. | If credentials, quota, region, or model entitlement block live validation, the exact safe blocker is recorded and delivery does not claim live success. | Durable command logs and API/E2E report. |

## Relevant Scenarios And Journeys

| Scenario ID | Kind (`User`/`System`/`Operational`/`Contract`) | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Person configuring a new AutoByteus agent/application run | Choose the current Gemini Flash model and its supported reasoning behavior. | Existing runtime/model configuration fields backed by the provider model catalog. | AutoByteus runtime is selected and the local catalog can load. | Product loads provider-grouped models; user chooses Gemini 3.8 Flash; product shows schema-backed thinking options; configuration records the exact identifier. | 3.8 is selectable with low/medium/high and medium default; 3.7 is not a current option. | Missing credentials do not block static selection/catalog visibility; they are handled at invocation. | `Supported Normal Scenario` | Current web/store/GraphQL path plus user replacement request and Google model contract. | REQ-001–REQ-004, REQ-007, REQ-009; AC-001, AC-002, AC-008 |
| SCN-002 | User | Person sending a normal prompt with a configured Gemini runtime | Receive a Gemini 3.8 answer using the selected setup mode. | Existing new-turn/send action. | A valid 3.8 configuration and one of AI Studio, Vertex Express, or Vertex Project is active. | User sends text and optional supported media; system targets 3.8, submits provider-valid generation configuration, streams/parses response and optional thought summary, and records usage. | Existing response and reasoning surfaces work with the new model. | Existing safe missing-key/provider-access/quota/error behavior applies. | `Supported Normal Scenario` | Current adapter/factory/runtime path; official AI and Cloud 3.8 examples. | REQ-003–REQ-010, REQ-013; AC-003, AC-004, AC-009, AC-011 |
| SCN-003 | User | Person continuing an agent run after Gemini requests one or more tools | Complete a supported tool loop without breaking Gemini's turn/correlation contract. | Existing tool result continuation in an active AutoByteus agent run. | 3.8 returned function calls with IDs/names and tools returned results. | Product retains the provider-native model tool-call turn, supplies correlated function responses as the next user turn, sends the 3.8 continuation, then renders the response. | Tool continuation succeeds with exact correlation and existing streaming behavior. | Tool errors remain correlated and follow current safe result/error behavior. | `Supported Normal Scenario` | `GeminiPromptRenderer`; existing provider-native tool-history tests; Google mandatory function-response rules. | REQ-005, REQ-006, REQ-013; AC-003, AC-005, AC-011 |
| SCN-004 | User | Person launching an older saved AutoByteus configuration | Avoid silently running a different model than the one previously selected. | Existing readiness/launch validation. | Persisted configuration still names `gemini-3.7-flash` after 3.8 becomes current. | Product checks current catalog membership; 3.7 does not resolve; launch/readiness reports unavailable selection and asks for current selection. Historical completed-run evidence remains readable. | User explicitly chooses 3.8 before a new run; historical 3.7 identity stays truthful. | There is no alias, silent substitution, or persistence rewrite. | `Supported Explicit Edge Scenario` | Existing latest-only contract and exact membership guard. | REQ-002, REQ-011; AC-006 |
| SCN-005 | System | Token-usage pricing contract | Attribute 3.8 usage cost to the applicable published period. | A token-usage observation for a completed 3.8 provider response. | Observation contains a valid event time and 3.8 identity/value. | Pricing policy resolves the provider row and period from the observation time, calculates trusted dimensions, and stores immutable evidence. | Usage through 2026 uses introductory rates; usage from 2027-01-01 uses standard rates. | Existing invalid-time and missing-pricing behavior applies; prior records are not repriced. | `Supported Normal Scenario` | Current pricing lookup/accounting code and Google published effective dates. | REQ-008, REQ-011, REQ-013; AC-007, AC-011 |
| SCN-006 | Operational | CI/operator validation workflow | Verify that the new current model is usable and documented without exposing credentials. | Focused repository tests/builds and credential-gated live-E2E command. | Implementation package exists; dependencies and optional provider access are available or their absence is recordable. | Run deterministic catalog/request/metadata/pricing tests; inspect active references; run minimal live request where authorized; retain safe logs. | Evidence distinguishes deterministic pass from credential/access-limited live status. | Credential, quota, region, or entitlement blockers are recorded rather than converted into false success/failure claims. | `Supported Explicit Edge Scenario` | Existing live-E2E fixture and department validation contract. | REQ-012, REQ-013; AC-010, AC-011 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` — the existing schema-driven model-selection UI is reused without layout or interaction redesign.
- Linked UI/UX or interaction supplement: `N/A — not applicable`
- Linked runnable prototype, separate prototype repository/root, UI/UX specification, and applicable support artifacts: `N/A — not applicable`
- Product prototype ticket record and folder (externally owned): `N/A — not applicable`
- Prototype revision or commit: `N/A — not applicable`
- UI/UX user-confirmation reference: `N/A — not applicable`
- Approved visual-reference baseline: `N/A — not applicable`
- Normative visual and interaction details, including the approved final references: `N/A — not applicable`
- Explicitly illustrative fixture content or permitted implementation variation: `N/A — not applicable`
- Required screens, states, transitions, feedback, responsive behavior, or accessibility outcomes: The existing model selector shall render the new catalog label and schema controls using its current accessible components; no visual change beyond catalog content is required.
- Explicitly unresolved product decisions: None.

## Quality And Non-Functional Requirements

| Quality ID | Area (`Performance`/`Reliability`/`Security`/`Privacy`/`Accessibility`/`Compliance`/`Operability`/`Compatibility`/`Other`) | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- |
| QR-001 | Reliability | Deterministic catalog and request-contract tests pass for all three supported Gemini setup modes without a live provider dependency. | Catalog, mapping, adapter, renderer, and server projection. | Unit and server E2E tests. |
| QR-002 | Security | No provider key, authorization header, raw secret, or credential-bearing payload is printed, stored in an artifact, or committed. | All investigation, tests, and live validation. | Artifact scan and git status. |
| QR-003 | Compatibility | Other current model rows, Gemini modalities, setup modes, provider-error semantics, and supported agent/tool behavior show no regression in affected test suites. | Scope guardrail. | Focused regression suites plus build/type checks. |
| QR-004 | Operability | Active docs and live-E2E fixtures name the same current model as the shipped catalog. | Current, non-historical materials. | Scoped reference scan. |
| QR-005 | Reliability | Pricing resolution is deterministic at the 2027 boundary and uses observation time, not wall-clock process time. | 3.8 token accounting only. | Boundary unit tests. |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No schema change`; existing persisted configurations may contain a now-stale 3.7 identifier.
- Data or state that must be preserved: Historical run configuration/identity, token-usage observations, price snapshots, totals, and completed ticket/delivery evidence.
- Loss, reset, rebuild, or regeneration that is acceptable: Current in-memory/static model catalog content changes from 3.7 to 3.8. A new run configuration may require explicit model reselection.
- Retention, privacy, compliance, volume, downtime, or operational constraints: No migration or downtime is required; no credential material may enter artifacts.
- Unknowns requiring downstream investigation: None at the product-requirement level. Engineering must verify the shared adapter can apply 3.8-specific request rules without changing other models.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Google Gemini API — Gemini 3.8 Flash | Exact GA ID, limits, supported levels/capabilities, and API-key availability. | https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash (updated 2026-09-02) | Live access can still be account/quota limited. |
| Google Gemini API — 3.8 migration guide | Use `thinking_level`/`thinkingLevel`; omit listed deprecated or unsupported fields; preserve strict turn and function-response conventions. | https://ai.google.dev/gemini-api/docs/generate-content/latest-model (updated 2026-09-02) | Shared adapter also serves another Gemini model and must preserve its approved behavior. |
| Google Cloud Gemini 3.8 guide/model page | Exact model ID is available in global/multi-region Vertex paths; same thinking levels and limits. | https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/guides/gemini-3-8-flash and `/models/gemini/3-8-flash` | Product supports multiple existing Vertex setup modes; implementation must validate their current SDK construction. |
| Google 3.8 pricing | Introductory through 2026-12-31 and standard from 2027-01-01; global input/output/cache rates. | Google migration guide pricing section and https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing | Non-global, priority, flex/batch, storage, and provisioned-throughput pricing are outside this task. |
| `@google/genai` | Existing SDK dependency and `generateContent` integration. | `autobyteus-ts/package.json` (`^1.38.0`), lock resolution currently 1.40.0 | Downstream engineering must verify the installed SDK types/runtime support `thinkingLevel`; an upgrade is not authorized unless necessary to meet the contract. |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `/home/autobyteus/workspace/.codex/worktrees/gemini-3-8-flash/tickets/done/gemini-3-8-flash/investigation-notes.md` | Canonical code, product-path, external-contract, and routing evidence. | All | Complete for RER-002 | Explicitly approved 2026-09-03 |
| `/home/autobyteus/workspace/.codex/worktrees/gemini-3-8-flash/tickets/done/gemini-3-8-flash/requirements-revision-record.md` | Requirements-round history. | All | RER-001–RER-002 recorded | Records approval and routing completion |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | "Replace" means 3.8 becomes the sole current Gemini Flash text row and 3.7 is removed without aliasing, consistent with the existing latest-only contract. | Defines catalog and stale-selection behavior. | User approval / Requirements Engineer | Approved 2026-09-03 |
| ASM-002 | The exact same provider model value `gemini-3.8-flash` applies in current AI Studio and Vertex modes. | Required for runtime mapping. | Official Google AI/Cloud docs and downstream request tests | Supported by evidence |
| ASM-003 | Current standard global token prices are the relevant cost basis; specialized priority, flex/batch, non-global, and provisioned-throughput rates are not currently modeled by this catalog row. | Prevents unrequested pricing-mode expansion. | Current pricing model and user approval | Approved 2026-09-03 |
| ASM-004 | Live-provider access may be absent even when deterministic implementation is correct. | Defines truthful validation expectations. | API/E2E validation owner | Accepted operating constraint |

## Open Decisions And Questions

| Decision / Question ID | Question | Why It Matters | Options / Evidence | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | Approve the package, including latest-only removal of 3.7, the 3.8-specific request contract, and effective-dated standard pricing? | Required before downstream architecture routing. | The user confirmed the intended result is simply replacing 3.7 with 3.8 and explicitly approved. | User | Decided — approved 2026-09-03 |

## Traceability

| Requirement ID | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Prototype Evidence |
| --- | --- | --- | --- | --- |
| REQ-001 | BEH-001, BEH-003 | AC-001 | SCN-001 | Investigation notes |
| REQ-002 | BEH-001, BEH-003 | AC-001, AC-006 | SCN-001, SCN-004 | Investigation notes |
| REQ-003 | BEH-002 | AC-003 | SCN-002 | Investigation notes |
| REQ-004 | BEH-001, BEH-002 | AC-002, AC-004 | SCN-001, SCN-002 | Investigation notes |
| REQ-005 | BEH-002 | AC-003, AC-004, AC-005 | SCN-002, SCN-003 | Investigation notes |
| REQ-006 | BEH-002 | AC-004, AC-005 | SCN-002, SCN-003 | Investigation notes |
| REQ-007 | BEH-001, BEH-004 | AC-001 | SCN-001 | Investigation notes |
| REQ-008 | BEH-004 | AC-007 | SCN-005 | Investigation notes |
| REQ-009 | BEH-001 | AC-008 | SCN-001 | Investigation notes |
| REQ-010 | BEH-002, BEH-005 | AC-009 | SCN-002, SCN-006 | Investigation notes |
| REQ-011 | BEH-003, BEH-004 | AC-006, AC-007 | SCN-004, SCN-005 | Investigation notes |
| REQ-012 | BEH-005 | AC-010 | SCN-006 | Investigation notes |
| REQ-013 | BEH-001–BEH-005 | AC-001–AC-011 | SCN-001–SCN-006 | Investigation notes |

## Downstream Architecture Input

- Approved scenario IDs and product-level behavior paths architecture must map: SCN-001 through SCN-006.
- Product and system constraints architecture must preserve: Exact model identity; three existing Gemini setup modes; latest-only/no-alias behavior; supported text/media/tool sequences; static metadata without credential/network access; effective-dated pricing; immutable historical evidence; safe error/secret handling.
- Decisions intentionally deferred to architecture design: How to scope the 3.8 provider-request policy within the shared Gemini adapter without changing the approved behavior of the other current Gemini LLM; whether the currently resolved SDK version already supports the required field or must be minimally updated; how to represent the published two-period price using existing pricing primitives.
- Technical facts architecture should verify: `GeminiLLM` currently maps levels to `thinkingBudget` and injects sampling/penalty fields; `GeminiPromptRenderer` already omits empty messages and includes function response ID/name; model catalog is owned in `supported-model-definitions.ts` and projected by the server; runtime mapping currently names 3.7 identically for API key and Vertex.
- Known feasibility or integration risks: Shared adapter blast radius; stale lock/package manifest mismatch around unrelated packages; live model entitlement; lack of installed worktree dependencies during requirements investigation.

## Readiness Check

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Prototype and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and open decisions are visible: `Yes`
- User approval received: `Yes` — explicit approval on 2026-09-03.
- Requirements package ready for downstream route: `Yes`
- Remaining blocker: None.

## Architecture Design Routing Assessment

Although the product-visible outcome is the simple requested 3.7-to-3.8 replacement, Google's 3.8 migration contract also requires changing the outbound provider request shape in a shared Gemini adapter. That external-contract trigger makes Architecture Design the required preliminary route.

- Assessment status: `Complete`
- Assessment owner and date: Requirements Engineer, 2026-09-03
- Preliminary task size: `Medium`
- Preliminary architectural risk: `High`
- Structural surfaces reviewed: Shared Gemini adapter/request configuration, prompt renderer, runtime mapping, catalog-to-server projection, current-selection guard, token-pricing resolution.
- Payload/content surfaces reviewed: Model row, metadata values/source date, pricing periods, active documentation, test assertions, live-E2E fixtures.
- Structural-impact triggers: `Present` — outbound external-provider request contract; potentially shared adapter behavior.
- Evidence paths: This document and `/home/autobyteus/workspace/.codex/worktrees/gemini-3-8-flash/tickets/done/gemini-3-8-flash/investigation-notes.md`.
- Decision rationale: Even though the visible catalog rename is small, a provider-valid 3.8 migration requires changing how requests express reasoning and omit unsupported fields. Architecture Designer should own the production-path decision and final size/risk classification.
- Selected route: `Architecture Designer`
- Outcome classification: `Approved Architecture-Ready`
- Direct-route conditions all satisfied: `No`
- Architecture design, review, and design-revision artifacts: Not created; Requirements Engineering does not own them.
- Downstream re-entry trigger: Architecture design may return a requirements gap only if a material product decision outside REQ-001–REQ-013 is required; otherwise continue through the architecture route.

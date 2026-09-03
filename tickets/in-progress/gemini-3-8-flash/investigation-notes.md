# Requirements Investigation Notes

## Investigation Meta

- Request / ticket: Replace Gemini 3.7 Flash with Gemini 3.8 Flash (`gemini-3-8-flash`)
- Stable package identifier: `PKG-GEMINI-3-8-FLASH-2026-09-03`
- Workspace root: `/home/autobyteus/workspace/.codex/worktrees/gemini-3-8-flash`
- Repository mode: `Git`
- Task worktree / branch: `/home/autobyteus/workspace/.codex/worktrees/gemini-3-8-flash` / `requirements/gemini-3-8-flash`
- Base or reference revision: `origin/personal` at `66056b5afc49240fa139bcefd00b62d119f35ec8`
- Bootstrap result: Complete. Ran `git fetch origin personal`; created the dedicated worktree from the refreshed `origin/personal`; the task branch initially matched the base and was clean.
- Bootstrap blocker: None.
- Current requirements revision ID: `RER-002`
- Investigation status: Complete; the user explicitly approved the simple 3.7-to-3.8 replacement package on 2026-09-03. Deterministic runtime tests were not executed because dependencies are not installed in the new worktree.

## Initial Request And Clarifications

- Original request: "google published a new model 3.8 flash, lets replace our current 3.7 flash with 3.8 flash. thanks."
- Clarifications received: The user replied "continue" after initial investigation began, then confirmed the intended behavior as "basically remove 3.7 with 3.8" and explicitly approved with "cool. its simple. approved".
- User-supplied facts and constraints: Google published 3.8 Flash; replace the current 3.7 Flash integration.
- Initial ambiguity: Whether "replace" should retain 3.7 as an additional selectable row or alias. Current project evidence favored latest-only removal with explicit reselection, and the user's clarification and approval resolved that decision. The request did not mention Google's new request-shape constraints or known future pricing change; authoritative provider evidence makes both necessary supporting work for a correct, durable replacement without changing the simple product outcome.

## Product And Domain Understanding

- Product area: Built-in LLM provider catalog, AutoByteus agent launch/model selection, Gemini provider invocation, static model metadata, and token-usage pricing.
- Affected actors or systems: AutoByteus users, model catalog and launch validation, Gemini runtime modes, provider adapter, token accounting, CI/live validation.
- Existing user or operational purpose: Users select a built-in provider/model and run agents through the AutoByteus runtime. The server projects the package catalog through GraphQL, while the web client uses provider-grouped rows and model schemas for launch configuration.
- Relevant terminology:
  - **Catalog identifier / provider value**: The current project uses `modelIdentifier` as exact membership identity and `value` as the provider request model value.
  - **Latest-only contract**: Superseded curated rows are removed rather than aliased; stale persisted selections require explicit reselection.
  - **Gemini setup modes**: AI Studio/API key, Vertex Express/API key, and Vertex Project/project+location.
  - **Thinking level**: Google 3.8 supports low, medium, high; medium is default; minimal is invalid.
  - **Thought summaries**: Provider-returned reasoning summary content, separate from final text.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Runtime`/`Data`/`Contract`/`Web`/`User`/`Command`/`Other`) | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-09-03 | User | Initial request | Establish desired outcome. | User explicitly requested replacing current 3.7 Flash with 3.8 Flash. | Obtain approval of detailed behavior. |
| 2026-09-03 | User | "continue" | Confirm investigation may proceed. | User asked the workflow to continue. | Does not substitute for approval of an unseen requirements package. |
| 2026-09-03 | User | "basically remove 3.7 with 3.8 right=" followed by "cool. its simple. approved" | Confirm scope and capture explicit approval. | User approved the latest-only 3.7-to-3.8 replacement and characterized the desired product outcome as simple. | Complete post-approval routing assessment. |
| 2026-09-03 | Command | `git fetch origin personal`; `git worktree add -b requirements/gemini-3-8-flash /home/autobyteus/workspace/.codex/worktrees/gemini-3-8-flash origin/personal` | Create isolated task workspace on current base. | Worktree created at base commit `66056b5afc49240fa139bcefd00b62d119f35ec8`. | Keep all task artifacts here. |
| 2026-09-03 | Command | `rg -n -S 'gemini-3\\.7-flash|Gemini 3\\.7 Flash|pre-3\\.7|3\\.7 Flash' --glob '!tickets/done/**' ...` | Inventory active current-model references. | Active references exist in core model definitions/mapping, unit/E2E/live fixtures, root contract, and package/server docs. | Update only current references; preserve archived evidence. |
| 2026-09-03 | Code | `autobyteus-ts/src/llm/supported-model-definitions.ts` | Identify current catalog row/schema/metadata/pricing. | 3.7 is the current Gemini Flash row; uses shared `geminiSchema`, exact identity, 1,048,576/65,536 limits, and flat `$0.75/$3.75/$0.075` pricing. | Replace row; represent confirmed price schedule. |
| 2026-09-03 | Code | `autobyteus-ts/src/utils/gemini-model-mapping.ts` | Check runtime-specific IDs. | 3.7 maps identically for API-key and Vertex runtimes. | 3.8 needs explicit mapping for the existing modes. |
| 2026-09-03 | Code | `autobyteus-ts/src/llm/api/gemini-llm.ts` | Verify provider request shape. | Shared adapter converts `thinking_level` to integer budgets and injects temperature, top-P, frequency penalty, and presence penalty when values are present/defaulted. | Provider-contract change is required for 3.8 and creates a structural routing trigger. |
| 2026-09-03 | Code | `autobyteus-ts/src/llm/prompt-renderers/gemini-prompt-renderer.ts` | Verify supported prompt/tool history. | Empty text-only turns are skipped; normal user/model history is retained; tool calls and responses include provider-native ID/name correlation; tool results become a user turn. | Preserve and test on 3.8. |
| 2026-09-03 | Code | `autobyteus-ts/src/llm/llm-factory.ts`; `autobyteus-server-ts/src/application-platform/launch-configuration/application-current-model-selection-policy.ts` | Verify replacement/stale-selection semantics. | Catalog membership is exact; missing old IDs fail current-model selection rather than aliasing. | Require explicit reselection for 3.7. |
| 2026-09-03 | Code | `autobyteus-server-ts/src/llm-management/services/model-catalog-service.ts`; GraphQL model-catalog types/resolver; `autobyteus-web/stores/llmProviderConfig.ts`; `AgentRunConfigForm.vue` | Establish supported product path. | Server loads static package models and projects provider snapshots; the web store fetches them and launch form delegates to schema-driven runtime/model fields. | No UI redesign is required. |
| 2026-09-03 | Contract / Doc | `provider-error-and-pricing-contract.md`; `autobyteus-ts/docs/provider_model_catalogs.md`; `autobyteus-server-ts/docs/modules/llm_management.md` | Establish current intended model-lifecycle, metadata, and error behavior. | Gemini 3.7 is documented as the sole current Flash row; pre-3.7 rows were removed without aliases; static metadata and safe error behavior are explicit. | Carry policy forward to 3.8; update current docs. |
| 2026-09-03 | Tests | `autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts`; `autobyteus-server-ts/tests/e2e/llm-management/model-metadata-provenance-graphql.e2e.test.ts`; Gemini renderer tests | Identify current durable checks. | Tests assert current model membership/schema and credential-free metadata projection; renderer tests cover function call/response identity. | Extend/replace assertions and add request-shape coverage. |
| 2026-09-03 | Web | https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash | Verify model authority. | Google lists GA stable ID `gemini-3.8-flash`, text/image/video/audio/PDF input and text output, 1,048,576 input and 65,536 output limits, low/medium/high thinking, no minimal, and September 2026 update. | Use as primary metadata source. |
| 2026-09-03 | Web | https://ai.google.dev/gemini-api/docs/generate-content/latest-model | Verify migration and price contract. | Google says 3.8 is GA; default thinking is medium; replace thinking budget with thinking level; strip temperature/top-P/top-K, candidate count, frequency/presence penalty; preserve turn/function-response validity. Intro pricing is `$0.75/$3.75` through 2026-12-31, standard `$1.50/$7.50` from 2027-01-01. | Make provider-valid request behavior and price schedule acceptance criteria. |
| 2026-09-03 | Web | https://ai.google.dev/gemini-api/docs/deprecations | Check 3.7 lifecycle. | Both 3.8 and 3.7 remain supported with no shutdown announced; 3.8 released 2026-09-02. | Removal is a product latest-only choice, not a forced provider shutdown; user approval required. |
| 2026-09-03 | Web | https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/guides/gemini-3-8-flash and https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/3-8-flash | Verify Vertex identity and constraints. | Cloud documents exact `gemini-3.8-flash` ID, global/multi-region Vertex availability, same limits/levels, and migration rules. | Validate all current Gemini setup modes. |
| 2026-09-03 | Web | https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing | Verify global cache and future prices. | Standard global input/output/cache price triples are `$0.75/$3.75/$0.075` through 2026 and `$1.50/$7.50/$0.15` from 2027-01-01. | Keep specialized consumption/region pricing out of scope. |
| 2026-09-03 | Command | `pnpm exec vitest run ...` | Attempt focused baseline tests. | Failed before execution because `pnpm` is not globally available. `corepack pnpm --version` works (10.28.2), but the isolated worktree has no installed `node_modules`. | Downstream engineering/validation must install dependencies using repository policy before tests. |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User / System | User opens a new AutoByteus launch configuration; server catalog query runs. | Package factory initializes static model rows; server groups them by provider and projects GraphQL; web store loads rows; schema-driven model control lets the user select 3.7. | 3.7 is current/selectable; metadata is curated and credential-independent. | Catalog, server, GraphQL, store, and form paths in Source Log. | High. Runtime UI was not launched, but code/docs/tests independently support the path. |
| BEH-002 | User / Contract | User sends a prompt, or tool result continues an active run, with a Gemini model selected. | Server constructs `GeminiLLM` with selected setup mode; mapping selects provider value; renderer builds native history; adapter sends `generateContent`; response and usage flow back. | Current adapter produces integer thinking budgets and common sampling/penalty fields; renderer correlates tool ID/name. | Adapter, mapping, renderer, existing tests. | High for code behavior; no live request executed. |
| BEH-003 | User / Contract | Launch/readiness validates a persisted current-model identifier. | Exact current catalog membership is required for AutoByteus runtime; a removed row raises current-selection-required behavior. Historical identity lives in run/usage records. | No alias or silent fallback; explicit reselection protects user intent. | Current model guard/policy and latest-only contract. | High. |
| BEH-004 | System / Contract | Token observation is priced. | LLM factory exposes model pricing; server resolves trusted dimensions and stores evidence/snapshots using existing pricing rules. | 3.7 has current flat pricing; historical snapshots are immutable. | Model definition, pricing code, root contract. | High. |
| BEH-005 | Operational | CI/operator runs current-provider checks. | Active unit/server tests and live-E2E fixtures name 3.7. | Current assertions will go stale unless replaced with 3.8 and request-shape coverage. | Active reference inventory. | High. |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question Deferred Downstream |
| --- | --- | --- | --- |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | Owns static built-in LLM rows, schemas, metadata, and base pricing. | Exact current row, schema, limits, source date, and price periods must become 3.8. | Reuse or specialize schema/default configuration without changing other rows. |
| `autobyteus-ts/src/utils/gemini-model-mapping.ts` | Maps logical Gemini model value to API-key/Vertex provider ID. | Explicit 3.8 mapping must cover current runtime modes. | Confirm one mapping surface covers Vertex Express and Project through existing runtime normalization. |
| `autobyteus-ts/src/llm/api/gemini-llm.ts` | Builds shared Google Gen AI request configuration and parses responses/usage. | 3.8 requests need string level and omitted unsupported fields. | Isolate model-specific policy in the existing ownership boundary or safely modernize shared behavior; Architecture Designer decides. |
| `autobyteus-ts/src/llm/prompt-renderers/gemini-prompt-renderer.ts` | Converts supported message/media/tool history to Gemini content turns. | Preserve normal user and tool continuation; prove ID/name correlation. | Determine whether any production-supported path can end in a provider-invalid prefilled model turn; do not design for contrived calls absent evidence. |
| `autobyteus-ts/src/llm/llm-factory.ts` | Exact catalog membership, model construction, listing, metadata, pricing lookup. | 3.7 must stop resolving; 3.8 must resolve; no alias. | None at requirements level. |
| `autobyteus-server-ts/src/llm-management/services/model-catalog-service.ts` and GraphQL types | Projects factory rows to supported server/API catalog. | 3.8 should surface without duplicate server catalog or live metadata access. | None expected; confirm no generated API change required. |
| `autobyteus-web/stores/llmProviderConfig.ts` and schema-driven launch fields | Fetch and render provider-grouped models and their schemas. | Content replacement should appear without a UI redesign. | None expected; frontend changes only if existing generic path fails. |
| Current-selection policy | Rejects unknown/removed AutoByteus IDs. | Stale 3.7 selection must request explicit reselection. | Preserve external-runtime ownership and dynamic provider exceptions. |
| Token pricing model/provider | Supports effective-dated history and observation-time selection. | Represent 2026 introductory and 2027 standard price periods; retain immutable snapshots. | Select the existing appropriate pricing primitive; no subsystem redesign. |
| `test-support/live-e2e/live-e2e-scenarios.mjs` | Names the model used for live Gemini scenarios. | Update current Gemini LLM scenarios to 3.8. | Live entitlement may be unavailable. |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files, records, documents, catalogs, fixtures, or generated payloads:
  - Gemini Flash row and schema in `autobyteus-ts/src/llm/supported-model-definitions.ts`.
  - Gemini model mapping content in `autobyteus-ts/src/utils/gemini-model-mapping.ts`.
  - Current-product contract/docs in `provider-error-and-pricing-contract.md`, `autobyteus-ts/docs/provider_model_catalogs.md`, and `autobyteus-server-ts/docs/modules/llm_management.md`.
  - Unit/server-E2E assertions and live-E2E scenario values.
- Existing readers, writers, or contracts that consume them: LLM factory; server catalog/pricing services; GraphQL clients; launch forms; CI/live validation.
- Evidence paths: Active-reference scan and code paths above.

### Structural Surfaces

- Runtime modules, shared interfaces, routes, APIs, persistence boundaries, security/concurrency controls, deployment configuration, or ownership boundaries:
  - Shared `GeminiLLM` outbound request builder.
  - Gemini prompt renderer and runtime mode/mapping boundary.
  - Existing pricing schedule selector and current-model guard.
- Existing structural surfaces that can support the approved behavior:
  - Static model registry, runtime map, shared adapter, current GraphQL projection, exact membership guard, pricing schedule history, and schema-driven UI already exist.
- Evidence paths: `autobyteus-ts/src/llm/api/gemini-llm.ts`; mapping/factory/pricing files; server catalog and current-model policy.

### Potential Architecture-Design Triggers

- API or external-contract change: **Present.** The exact provider model ID and outbound generation-config contract change for 3.8.
- Persistence schema or invariant change: **Absent.** Existing stale-selection rejection and historical immutability are preserved; no migration is required.
- Security or privacy boundary change: **Absent.** Existing credentials/error redaction remain unchanged.
- Concurrency or lifecycle change: **Absent** based on current evidence.
- Deployment, migration, ownership-boundary, architectural-pattern, or structural-refactoring change: **Potential shared-adapter impact present.** The change must be scoped safely within the existing Gemini adapter boundary; no new subsystem is required by requirements.
- Confirmed absent, present, or unknown: Structural trigger is **present** due to the external provider request contract, so post-approval routing should go to Architecture Designer.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- |
| Static source/contract trace | SCN-001 | Package catalog flows through server GraphQL into web provider/model store and launch configuration. | A content-level row replacement should use the existing surface without UI redesign. | Source paths recorded above. |
| Static request-path trace | SCN-002/SCN-003 | Current request config contains `thinkingBudget`, temperature, top-P, frequency penalty, and presence penalty; Google 3.8 says to use thinking level and strip these fields. | Catalog rename alone is insufficient; provider-valid outbound behavior is required. | `autobyteus-ts/src/llm/api/gemini-llm.ts`; official migration guide. |
| Static history trace | SCN-003 | Empty content messages are skipped; function responses include both ID and name and follow tool-call model turns as user turns. | Preserve and test normal supported tool continuation rather than inventing a malformed-history feature. | `autobyteus-ts/src/llm/prompt-renderers/gemini-prompt-renderer.ts`. |
| `pnpm exec vitest run ...` | Baseline deterministic tests | Shell reported `pnpm: command not found`; tests did not start. `corepack pnpm --version` returned `10.28.2`; worktree has no installed dependencies. | This is an environment setup gap for downstream work, not evidence of product failure. | Command transcript in current AgentRun; source log above. |

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User request and approval, 2026-09-03 | Simply remove current 3.7 Flash and replace it with 3.8 Flash. | Direct and explicitly approved, high. | 3.8 becomes the current row; 3.7 has no current alias. | None at the requirements level. |
| Existing product contract | Current named provider rows replace older rows without aliases and require explicit reselection. | Durable project contract, high. | Do not retain or alias 3.7 by default. | None after approval. |
| Google official docs | 3.8 model identity, request constraints, limits, availability, and pricing. | Primary external authority, high. | Use exact ID and provider-valid request/config metadata. | Live account entitlement remains environment-specific. |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Gemini 3.8 Flash model | Google AI, updated 2026-09-02 | Stable GA `gemini-3.8-flash`; 1,048,576 input; 65,536 output; low/medium/high; minimal invalid; text/image/video/audio/PDF input and text output. | https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash | Live availability can depend on account/quota. |
| Gemini 3.8 migration contract | Google AI, updated 2026-09-02 | Default medium; string thinking level; remove sampling/count/penalty fields; enforce supported turn/function response conventions. | https://ai.google.dev/gemini-api/docs/generate-content/latest-model | Shared adapter blast radius. |
| Gemini model lifecycle | Google AI, updated 2026-09-02 | 3.8 released 2026-09-02; both 3.8 and 3.7 have no announced shutdown. | https://ai.google.dev/gemini-api/docs/deprecations | Product removal of 3.7 is a deliberate current-catalog policy, not mandatory provider shutdown. |
| Google Cloud 3.8 | Google Cloud, updated 2026-09-03 | Same exact ID and limits available via global/multi-region Vertex endpoints. | https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/3-8-flash | Validate product's two Vertex construction modes against current SDK. |
| Gemini 3.8 pricing | Google AI/Cloud, 2026-09-02/03 | Introductory and standard global price periods; cached input `$0.075` then `$0.15`. | Google migration and Cloud pricing pages. | Specialized consumption/region rates not modeled here. |
| `@google/genai` | Package manifest `^1.38.0`; local lock resolves 1.40.0 | Existing `generateContent` SDK path should carry 3.8 request fields. | `autobyteus-ts/package.json`; `autobyteus-ts/pnpm-lock.yaml` | Worktree dependencies absent; downstream must confirm types/runtime support. |

## Persisted Data And State Facts

- Affected stored or external subject: Persisted launch/application configurations may store `gemini-3.7-flash`; historical run and token-usage records store executed model identity and pricing evidence.
- Location and representative shape: Application/launch configuration model identifier fields; token usage rows and summaries under `autobyteus-server-ts/src/token-usage/`.
- Approximate volume: Unknown and immaterial because requirements authorize no bulk rewrite.
- Current readers and writers: Application launch/readiness policies, agent-run configuration services, token-usage projections/repositories, history display.
- Current unknown/extra-field behavior: A stale non-current AutoByteus identifier fails current-model validation; historical display can use stored identifier/value.
- Required semantics or data that must be preserved: Exact historical 3.7 identity, token counts, price snapshots, and totals.
- Acceptable loss, reset, rebuild, or regeneration: None for historical data; current catalog cache can be rebuilt with the new 3.8 row.
- Privacy, retention, compliance, downtime, or operational constraints: No secret material in artifacts; no downtime/migration required.
- Remaining evidence gap: No material requirements gap. Downstream should validate representative stale-selection and historical-display tests.

## Product Design Request Context

- Product Design request in the current input: `Not stated`
- User's requested outcome, in the user's own terms: N/A beyond the software replacement request.
- Requirement / behavior IDs involved: N/A
- Product decision, uncertainty, or experience to understand or evolve: N/A
- Critical journey and states: Existing schema-driven selector is reused; no new experience requested.
- Known constraints and non-goals: No UI redesign or prototype.
- Relevant existing-product or frontend context supplied or established: Catalog content is projected into existing generic controls.
- Product Design request artifact / message reference: `N/A — not applicable`
- Established separate prototype repository/root and ticket reference, when applicable: `N/A — not applicable`

## Product Design Findings

- Product Design package path (external Product Design & Prototyping repository): `N/A — not applicable`
- Visualizer or prototype source path: `N/A — not applicable`
- Approved UI/UX specification path, when applicable: `N/A — not applicable`
- Review URL: `N/A — not applicable`
- Explicit user-confirmation reference: `N/A — not applicable`
- Journeys and scenarios validated: `N/A — not applicable`
- Final visual-reference paths: `N/A — not applicable`
- Product decisions supported by evidence: `N/A — not applicable`
- Alternatives rejected or still open: `N/A — not applicable`
- Mocked boundaries and production gaps: `N/A — not applicable`
- Requirements sections affected: `N/A — not applicable`

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `/home/autobyteus/workspace/.codex/worktrees/gemini-3-8-flash/tickets/in-progress/gemini-3-8-flash/requirements-doc.md` | Requirements Engineer | Canonical intended behavior and approval basis. | Whole task. | All | Approved | Explicitly approved 2026-09-03 |
| `/home/autobyteus/workspace/.codex/worktrees/gemini-3-8-flash/tickets/in-progress/gemini-3-8-flash/requirements-revision-record.md` | Requirements Engineer | Chronological requirements-round index. | RER-001–RER-002. | All | Current | Records explicit approval and routing completion |

## Assumptions, Unknowns, And Risks

| ID | Type (`Assumption`/`Unknown`/`Risk`) | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RISK-001 | Risk | Shared `GeminiLLM` serves 3.8 and another current Gemini model; globally changing request fields could regress preserved behavior. | Creates structural blast radius beyond a string replacement. | Architecture Designer and implementation validation. | Open downstream |
| RISK-002 | Risk | The isolated worktree has no installed dependencies, so current test behavior was established from source/docs/tests rather than executable baseline results. | Downstream must establish build/test environment before claiming validation. | Implementation/API-E2E owners. | Open downstream |
| RISK-003 | Risk | Live credentials may lack 3.8 entitlement, region availability, quota, or validity. | Live failure may be environmental rather than an implementation defect. | API/E2E owner records safe evidence. | Open downstream |
| RISK-004 | Risk | Package manifest and package-local lock currently contain version differences for some dependencies; the 3.8-required SDK field must be confirmed against the actual installed resolution. | Avoids an unjustified SDK bump or a compile/runtime mismatch. | Architecture Designer/Implementation Engineer. | Open downstream |
| ASM-001 | Assumption | Latest-only removal/no alias is the intended meaning of "replace." | Governs stale selection behavior. | User approval. | Confirmed 2026-09-03 |
| ASM-002 | Assumption | Current standard global pricing is the model-row cost basis. | Keeps scope bounded and accounting accurate for the currently modeled tier. | User approval and downstream verification. | Approved 2026-09-03 |

## Requirement Implications

1. A string-only 3.7-to-3.8 catalog edit is insufficient: Google's official migration guide requires a different thinking field and omission of parameters the shared adapter currently includes.
2. The product's supported normal path includes catalog selection, ordinary prompt execution, multimodal/system instructions, and function-tool continuation across three Gemini setup modes; acceptance must cover these at the product/contract level.
3. Retaining or aliasing 3.7 would contradict the current latest-only catalog contract and the user's word "replace." Because Google has not deprecated 3.7, this remains a deliberate product decision included explicitly in the approval basis.
4. Google has already published a firm 2027 standard price. The replacement row should use existing effective-dated pricing behavior rather than becoming stale at year-end.
5. Historical run and accounting records are evidence, not current catalog content. They must not be rewritten merely because the current model changes.
6. Product Design is not needed because existing generic model/schema controls can render the content change and the user did not request new UX.

## Notes For Downstream Architecture Design Or Direct Implementation

- Proposed approved scenario basis is SCN-001 through SCN-006 in `requirements-doc.md`; do not replace those product/contract paths with only an internal call graph.
- Verified current path: static definition → LLM factory → server provider catalog/GraphQL → web provider rows/model config; execution uses exact current-model validation → `GeminiLLM` construction → runtime mapping → prompt renderer/request config → Google Gen AI SDK; token observations feed existing pricing resolution.
- The target production-path design is deliberately not specified here. Architecture Designer must decide the narrowest safe ownership for 3.8-specific request policy and verify whether any other supported Gemini model shares or differs from it.
- Preserve the product boundary against contrived histories: normal sends end with a user prompt or function-response turn. Do not add a broad malformed-history repair feature without evidence and renewed requirements approval.
- No persistence migration, provider-catalog redesign, UI redesign, or authentication/error redesign is authorized.
- Canonical artifacts:
  - `/home/autobyteus/workspace/.codex/worktrees/gemini-3-8-flash/tickets/in-progress/gemini-3-8-flash/requirements-doc.md`
  - `/home/autobyteus/workspace/.codex/worktrees/gemini-3-8-flash/tickets/in-progress/gemini-3-8-flash/investigation-notes.md`
  - `/home/autobyteus/workspace/.codex/worktrees/gemini-3-8-flash/tickets/in-progress/gemini-3-8-flash/requirements-revision-record.md`

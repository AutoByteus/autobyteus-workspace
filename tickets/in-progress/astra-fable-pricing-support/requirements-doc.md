# Requirements Document

## Document Status

- Status: `Ready for Approval`
- Current solution revision ID: `SR-001`
- Package identifier: `astra-fable-pricing-support`
- Request / ticket: User request of 2026-09-22
- Requirements owner: Solution Designer
- Date: 2026-09-22
- Approval state and reference: Explicit user approval pending.
- Exact approved requirements baseline / solution revision: N/A until the user approves `SR-001`.
- Behavior-defining supplements and their approved versions: None.

## Problem And Desired Outcome

- Problem: `gpt-6-astra` is selectable through the Codex App Server runtime, but its exact identifier is absent from the shared built-in pricing catalog, so token usage is shown as unpriced. The official `claude-fable-5-1` identifier is absent for the same reason. The existing catalog already covers GPT-5.6 Sol/Terra/Luna and Claude Fable 5.
- Affected actors or systems: Users running Codex or Claude runtime models and viewing Token Meter/Token Statistics cost estimates; runtime model catalogs; shared model metadata/pricing; token-usage accounting.
- Desired outcome: Add exact, first-party Standard pricing and metadata support for GPT-6 Astra and Claude Fable 5.1 so existing runtime and accounting paths show trusted unit prices and estimated costs when those exact model IDs produce usage.
- Observable definition of success: New token-usage observations for `OPENAI` + `gpt-6-astra` and `ANTHROPIC` + `claude-fable-5-1` resolve to the documented trusted price dimensions through the existing server pipeline; existing models and historical stored summaries remain unchanged; no paid inference is needed to verify the change.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User/System | SCN-001 | Codex App Server 0.155.1 exposes exact `gpt-6-astra`; the runtime usage adapter preserves that ID, but exact pricing lookup finds no static row and yields missing pricing | Exact Astra usage resolves to trusted Standard base/cache/long-context prices and existing views show estimates | Codex remains the availability/capability authority; model ID and runtime behavior are not rewritten | User report; non-billable `model/list` probe; exact code path |
| BEH-002 | User/System | SCN-002 | Claude runtime discovery preserves exact model descriptors; official `claude-fable-5-1` exists, but the shared static catalog has only `claude-fable-5` | When the runtime emits exact `claude-fable-5-1`, usage resolves to trusted base and cache-aware Standard prices | Claude runtime remains the availability authority; Fable 5 remains supported; no fallback/default change | Official Claude docs; Claude catalog/usage code; static row absence |
| BEH-003 | Contract | SCN-001, SCN-002, SCN-003 | Exact recognized rows are priced; unknown rows fail closed as `price_missing`; captured estimates are persisted at observation time | The two exact IDs join that existing contract without aliases or guessed variants | All unknown-model fail-closed behavior, existing price rows, calculation semantics, and public API/UI shapes remain unchanged | Pricing factory/provider, token-usage docs, UI formatting |
| BEH-004 | Operational | SCN-004 | Catalog/pricing behavior can be exercised with synthetic usage and mocked/static tests; paid provider calls are separately gated | Verification covers exact identity, price dimensions, tiering, and request/catalog compatibility without paid inference | Existing broader validation remains available; no claim of live paid-provider execution | User constraint; prior Fable delivery precedent |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User selecting Codex Astra | See useful cost estimates after Astra usage | Existing Token Meter/Statistics show trusted Standard prices/cost instead of price missing | Dynamic Codex catalog and exact model ID remain authoritative |
| User selecting Claude Fable 5.1 | Receive correct cache-aware estimates when the runtime offers and uses the model | `claude-fable-5-1` resolves all supported Standard price dimensions | Runtime availability/account entitlement is not promised by this catalog change |
| Token-usage accounting | Apply auditable trusted prices to exact provider/model observations | Preserve exact lookup, component pricing, tier selection, and prospective persistence | Never guess unsupported pricing variants or rewrite stored history |
| Engineering/validation | Deliver a low-risk catalog update | Prove behavior deterministically with non-billable tests and source-backed docs | No real paid Astra or Fable 5.1 inference solely for validation |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- `UC-001`: Price new `gpt-6-astra` observations emitted by the Codex App Server runtime using documented first-party Standard prices, including cache write/read and the >272K full-request tier.
- `UC-002`: Price new `claude-fable-5-1` observations emitted by the Claude Agent SDK runtime using documented first-party Standard input/output and prompt-cache dimensions.
- `UC-003`: Make the exact models available to existing shared model/catalog consumers with source-dated metadata while preserving provider-valid request shaping.
- `UC-004`: Validate the change through static, unit, mocked request-payload, and synthetic server pricing tests without paid inference.
- `UC-005`: Update durable provider/model documentation for the exact IDs, limits, prices, variant boundary, and verification date.

### Out Of Scope

- Real paid model inference calls solely to validate this static catalog/pricing change.
- OpenAI Fast, Batch, or Flex pricing; Claude Batch, inference-geo/data-residency, partner-cloud, private-contract, subscription-credit, or negotiated pricing. The existing identity/persistence contract does not safely identify these variants for retrospective pricing.
- Changing Codex or Claude runtime discovery, account access, entitlement, default model, fallback behavior, or frontend-hardcoded model availability.
- New Fable 5.1 provider features such as per-message effort beta, progress updates, content provenance, fallback policy, or conversation-history migration behavior.
- A UI redesign or new price-management screen.
- Retroactive repricing or migration of existing token-usage run records or analytical facets.
- Correcting adjacent provider rows, including the independently observed stale Claude Sonnet 5 price; that is a separate-ticket candidate.

### Non-Goals

- Reproduce a provider invoice, subscription quota, credit burn, discounts, taxes, or account-specific charges.
- Add aliases, fuzzy family matching, or an unsuffixed model identifier.
- Make Fable 5.1 a default or fallback.
- Replace runtime-owned model schemas with static frontend configuration.

### Preserved Behavior Boundary

- Preserve `BEH-001` and `BEH-002` runtime discovery and exact ID pass-through.
- Preserve `BEH-003` exact-match/fail-closed pricing, existing rows, token-component semantics, public summaries, and immutable captured history.
- Preserve existing GPT-5.6 Sol/Terra/Luna, Claude Fable 5, Opus, Sonnet, and all unrelated provider behavior under `REQ-006` / `AC-006`.
- Preserve existing direct Anthropic safeguards against provider-invalid fixed-budget/disabled thinking and unsupported sampling parameters under `REQ-005` / `AC-005`.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, pricing policy, compatibility promise, migration obligation, provider feature, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- Adjacent pricing/catalog concerns may be recorded as separate-ticket candidates but are not required corrections in this package.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | The system shall recognize exact provider/model identity `OPENAI` + `gpt-6-astra` as a trusted built-in model/pricing entry. | BEH-001, BEH-003 | Must | This exact missing row causes the reported unpriced Codex outcome | User report; local Codex `model/list`; official OpenAI model page |
| REQ-002 | Astra Standard pricing shall be USD per million tokens: input 10, cached input 1, cache write 12.5, output 50; when input exceeds 272,000 tokens, the full request shall use input 20, cached input 2, cache write 25, and output 75. | BEH-001, BEH-003 | Must | Input/output-only support would omit billable components and long-context pricing | Official OpenAI model page verified 2026-09-22 |
| REQ-003 | The system shall recognize exact provider/model identity `ANTHROPIC` + `claude-fable-5-1` as a trusted built-in model/pricing entry with USD per million tokens: input 10, output 50, cache read 0.25, 5-minute cache write 12.5, and 1-hour cache write 20. | BEH-002, BEH-003 | Must | Fable 5.1 differs materially from Fable 5 in cache-read price | Official Claude model/pricing pages verified 2026-09-22 |
| REQ-004 | Static metadata shall record Astra at 1,050,000 context and 128,000 max output and Fable 5.1 at 1,000,000 context/input and 128,000 max output, with exact first-party source URLs and verification date. | BEH-001, BEH-002 | Must | Shared catalog support must remain source-auditable and usable by existing metadata consumers | First-party model pages |
| REQ-005 | Exact catalog support shall preserve provider-valid current request behavior: dynamic Codex runtime capability data remains authoritative, and any direct Fable 5.1 path must not send manual fixed-budget or disabled thinking nor unsupported sampling parameters. | BEH-001, BEH-002, BEH-003 | Must | Adding shared rows must not create an invalid direct-provider request path | Current normalizers/adapters; official Fable migration contract |
| REQ-006 | Existing model definitions, prices, identifiers, runtime selection, cost calculation, missing-price fallback, UI presentation, and unrelated provider behavior shall remain unchanged. No fuzzy or legacy alias shall be added for either target. | BEH-003 | Must | This is a narrow additive correction | Current exact-match contract; scope guardrail |
| REQ-007 | Pricing support shall be prospective: existing stored run summaries, analytics, policy keys, and historical missing-price states shall not be migrated or recalculated. | BEH-003 | Must | Stored estimates are observation-time facts | Token-usage module contract |
| REQ-008 | Verification shall not send paid Astra or Fable 5.1 inference requests. It shall use deterministic static/catalog tests, synthetic token-usage policy tests, and mocked request-payload tests where direct adapter behavior is affected. | BEH-004 | Must | Explicit cost constraint without waiving regression evidence | User request; established repository practice |
| REQ-009 | Durable documentation shall identify exact IDs, Standard price dimensions, limits, source/verification date, variant exclusions, and the no-live-paid-test decision. | BEH-003, BEH-004 | Should | Static catalogs require maintainable provenance and future refreshability | Existing provider catalog documentation |
| REQ-010 | Existing Token Meter and Token Statistics consumers shall receive trusted unit prices and estimated costs through current server contracts without a new UI or transport shape. | BEH-001, BEH-002, BEH-003 | Must | The visible defect should be corrected by the existing pipeline, not duplicated frontend logic | Current token usage architecture |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002, REQ-010 | BEH-001, BEH-003 / SCN-001 | Synthetic or real non-billable metadata identifies `OPENAI` + `gpt-6-astra`; usage is at/below 272K input | Price lookup/policy is trusted with USD 10 input, 1 cache read, 12.5 cache write, and 50 output per MTok; existing summary contracts can calculate/display an estimate | Unknown or misspelled identifiers remain `model_not_found`/price missing | Catalog unit test plus server pricing-policy test using synthetic usage |
| AC-002 | REQ-002 | BEH-001, BEH-003 / SCN-001 | Astra usage has more than 272,000 input tokens | The selected tier applies 20 input, 2 cache read, 25 cache write, and 75 output per MTok to the full request, with a stable tier identity | Exactly 272,000 remains in the standard tier | Deterministic tier-boundary tests; no provider call |
| AC-003 | REQ-003, REQ-010 | BEH-002, BEH-003 / SCN-002 | Usage carries `ANTHROPIC` + `claude-fable-5-1` | Price lookup/policy is trusted with USD 10 input, 50 output, 0.25 cache read, 12.5 5m write, and 20 1h write per MTok; existing summaries estimate applicable components | `claude-fable-5` retains its existing $1 cache-read price; unknown IDs remain unpriced | Catalog unit test plus server synthetic pricing-policy test |
| AC-004 | REQ-004 | BEH-001, BEH-002 / SCN-003 | Existing catalog/metadata consumers enumerate exact target entries | Each target appears exactly once with exact provider value/canonical identity, documented limits, first-party provenance URL, and 2026-09-22 verification | No alias or duplicate appears | Static definition and factory/metadata tests |
| AC-005 | REQ-005 | BEH-001, BEH-002 / SCN-003 | Runtime consumers or direct-provider construction use the new rows | Codex runtime reasoning/Fast schema still comes from live `model/list`; Fable 5.1 request construction does not emit fixed-budget/disabled thinking or unsupported sampling fields | Provider-invalid request shapes fail a non-live regression test rather than being accepted | Existing normalizer tests plus mocked Anthropic request-payload test if catalog exposure reaches direct adapter |
| AC-006 | REQ-006 | BEH-003 / SCN-003 | Target change is applied | Existing Sol/Terra/Luna and Fable 5 price/metadata expectations pass unchanged; unrelated catalog and UI behavior has no required change | Any change to another model's price or identity is out of scope and must be separately approved | Targeted regression suites and diff review |
| AC-007 | REQ-007 | BEH-003 / SCN-004 | Deployment includes existing persisted usage rows | No database migration or historical rewrite is introduced; old captured summaries remain byte/semantically unchanged and only later observations use new pricing | Repricing existing data is a failure | Code/diff inspection and applicable persistence regression tests |
| AC-008 | REQ-008 | BEH-004 / SCN-004 | Implementation validation runs | All targeted static/unit/synthetic/mocked tests pass without API keys or paid prompts; validation report explicitly states that no Astra/Fable 5.1 inference was run | A live paid call is neither required nor evidence for completion | Command logs and test report |
| AC-009 | REQ-009 | BEH-003, BEH-004 / SCN-003 | Documentation is reviewed | Durable docs contain both exact IDs, all required dimensions/tiers, limits, source dates, and variant boundaries | Stale mention of targets as unsupported is absent | Documentation diff/search |
| AC-010 | REQ-010 | BEH-001, BEH-002 / SCN-001, SCN-002 | A synthetic end-to-end token observation is folded for either exact model | The existing public summary has `estimated` status, trusted relevant unit prices, USD currency, no missing required dimension for present token components, and a non-null calculated cost | Existing `price_missing` remains for genuinely unknown models | Server-level non-network integration/E2E test or production-builder test |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User/System | User selects Astra; Codex App Server governs the visible model | Run Astra and see an estimated API-equivalent cost | Existing runtime model selector contains exact `gpt-6-astra`; run emits token usage | Codex runtime is available and lists Astra | Select Astra → run normally → runtime reports usage with exact model → server resolves trusted policy → existing token UI/statistics consume summary | Standard or long-context tier prices and calculated costs are present | Unknown ID remains price missing; Fast/Batch/Flex price is not inferred | Supported Normal Scenario | User report; local non-billable model-list probe; current runtime/pricing pipeline | REQ-001, REQ-002, REQ-005, REQ-010 / AC-001, AC-002, AC-005, AC-010 |
| SCN-002 | User/System | User selects Fable 5.1; Claude runtime governs available models | Run Fable 5.1 and see correct cache-aware estimates | Installed/authenticated Claude runtime exposes exact `claude-fable-5-1`; run emits usage | Claude runtime is available and account may use the model | Select exact model → run normally → SDK reports exact model and component usage → server resolves trusted policy → existing views consume summary | Base/cache component prices and calculated costs are present | Runtime may legitimately not list the model for a given installation/account; unknown IDs remain unpriced | Supported Normal Scenario for the target contract; runtime availability is conditional and external | Official Claude model contract; current dynamic catalog and usage code | REQ-003, REQ-005, REQ-010 / AC-003, AC-005, AC-010 |
| SCN-003 | Contract | Shared model/catalog and pricing consumers | Resolve exact source-backed model data consistently | Exact target ID is queried through existing catalog/factory/policy APIs | Updated catalog is loaded | Enumerate/query exact entry → read limits/config/pricing → pass through current response shapes | One exact entry with trusted provenance and no alias | Misspelling or unsupported variant stays missing | Supported Normal Scenario | Existing factory/pricing tests and contracts | REQ-001–REQ-006, REQ-009 / AC-001–AC-006, AC-009 |
| SCN-004 | Operational | Engineer/release validation and existing persisted data | Validate cheaply and preserve historical truth | Targeted non-live suites run; service starts with existing data | No target paid API key is required | Run static/unit/synthetic/mocked tests → inspect diff/docs → confirm no migration → preserve old rows | Evidence proves catalog/policy/request compatibility without paid inference or historical rewrite | External live availability is not claimed | Supported Explicit Edge Scenario | Explicit user constraint; prior Fable validation precedent; token-usage persistence contract | REQ-007–REQ-009 / AC-007–AC-009 |
| SCN-005 | Contract | A caller requests Fast/Batch/Flex/regional/private pricing | Obtain a variant-specific price | Variant identity would need to be captured and governed | Current token-usage pricing input lacks a complete variant contract | Mechanical selection may be possible in a runtime, but this package does not alter pricing by unrecorded mode | No new variant price is promised; Standard estimate behavior remains | Separate requirements/design are needed before mode-specific billing estimates | Technically Possible but Unsupported/Contrived for this package | Provider docs; current price-policy input shape; scope decision pending approval | Out of scope |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` — existing price/cost output changes from missing to estimated for the exact models; no new UI is requested.
- Linked UI/UX or interaction supplement: N/A — existing UI and server contract are intentionally reused.
- Linked runnable prototype, separate prototype repository/root, UI/UX specification, and applicable support artifacts: N/A.
- Product prototype ticket record and folder (externally owned): N/A.
- Prototype revision or commit: N/A.
- UI/UX user-confirmation reference: N/A.
- Approved visual-reference baseline: N/A.
- Normative visual and interaction details, including the approved final references: Preserve current Token Meter and Token Statistics layout, status language, currency formatting, unit-price details, and calculation disclosures.
- Explicitly illustrative fixture content or permitted implementation variation: Synthetic test token counts may vary while proving exact unit prices/status/cost math.
- Required screens, states, transitions, feedback, responsive behavior, or accessibility outcomes: Existing views shall receive `estimated` pricing through current contracts; no new screen/state/transition/accessibility behavior.
- Explicitly unresolved product decisions: None once SR-001 is approved.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-008 / AC-008 | Reliability / Cost | Zero paid Astra or Fable 5.1 inference calls are required or executed for validation | This package's implementation and API/E2E validation | Inspect commands/logs; use only non-network or metadata-only probes |
| QR-002 | REQ-001–REQ-004, REQ-009 / AC-001–AC-004, AC-009 | Compatibility / Operability | Each trusted dimension and limit traces to an exact first-party URL and verification date | Static catalog rows and docs | Source/diff review plus deterministic assertions |
| QR-003 | REQ-006 / AC-006 | Reliability | Exact identifier matching and unknown-model fail-closed behavior remain intact | All providers/runtimes | Existing and targeted pricing tests |
| QR-004 | REQ-010 / AC-010 | Compatibility | No GraphQL, websocket, persisted-schema, or frontend contract change is required | Existing token usage consumers | Typecheck/build plus server contract test as proportionate validation |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No` schema/data rewrite; future observations acquire new pricing.
- Data or state that must be preserved: All existing token counts, captured price/cost summaries, pricing policy identities, missing-price states, analytics facets, and run history.
- Loss, reset, rebuild, or regeneration that is acceptable: None.
- Retention, privacy, compliance, volume, downtime, or operational constraints: No migration and no downtime requirement; static code deployment only.
- Unknowns requiring downstream investigation: None material. Architecture must confirm that no existing startup migration is accidentally engaged.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| OpenAI GPT-6 Astra | Exact ID, Standard prices, >272K multipliers, 1.05M/128K limits | `https://developers.openai.com/api/docs/models/gpt-6-astra`, verified 2026-09-22 | Pricing variants excluded; provider may change future rates |
| Claude Fable 5.1 | Exact ID, Standard/cache prices, 1M/128K limits, always-on adaptive-thinking constraints | `https://platform.claude.com/docs/en/models/fable-5-1/overview`; `https://platform.claude.com/docs/en/about-claude/pricing`, verified 2026-09-22 | Account/runtime availability is external; variants excluded |
| Codex App Server catalog | Preserve exact dynamic availability/capabilities and default reasoning | Installed 0.155.1 metadata probe and current normalizer | Future runtime rows may change; no static override |
| Claude Agent SDK catalog | Preserve exact dynamic model descriptors | Current client/normalizer code | No promise that every account lists the model |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/astra-fable-pricing-support/tickets/in-progress/astra-fable-pricing-support/investigation-notes.md` | Evidence authority and technical facts | All | Current for SR-001 | Evidence supports, but does not replace, user approval |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/astra-fable-pricing-support/tickets/in-progress/astra-fable-pricing-support/solution-revision-record.md` | Revision/approval index | All | Current for SR-001 | Approval reference pending |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | First-party Standard API prices are the intended estimate basis for both external runtimes, consistent with existing catalog behavior | Runtime/subscription billing can differ, but the user asked to restore the existing price display rather than introduce invoice reconciliation | User approval of SR-001 | Proposed; awaiting approval |
| ASM-002 | Fable 5 remains supported alongside Fable 5.1 rather than being removed or aliased | Official pricing still lists both; user requested additive 5.1 support | User approval of SR-001; implementation regression | Proposed; awaiting approval |

## Open Decisions And Questions

| Decision / Question ID | Question | Why It Matters | Options / Evidence | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | Approve Standard-only pricing and exclude unrecorded Fast/Batch/Flex/regional/private variants? | Prevents misleading price precision and scope expansion | Recommended: Standard-only, matching existing catalog and exact available evidence | User | Proposed in SR-001 |
| DEC-002 | Approve additive Fable 5.1 support while retaining Fable 5? | Defines compatibility boundary | Recommended: retain both; official provider still lists both | User | Proposed in SR-001 |
| DEC-003 | Keep the adjacent Claude Sonnet 5 price correction outside this package? | Current official price differs from repository docs, but it was not requested | Recommended: record a separate-ticket candidate rather than silently expand scope | User | Proposed in SR-001 |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Prototype Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001, UC-003 | BEH-001, BEH-003 | AC-001, AC-004 | SCN-001, SCN-003 | Investigation notes |
| REQ-002 | UC-001 | BEH-001, BEH-003 | AC-001, AC-002 | SCN-001 | Official OpenAI source in investigation notes |
| REQ-003 | UC-002, UC-003 | BEH-002, BEH-003 | AC-003, AC-004 | SCN-002, SCN-003 | Official Claude sources in investigation notes |
| REQ-004 | UC-003, UC-005 | BEH-001, BEH-002 | AC-004, AC-009 | SCN-003 | Investigation notes |
| REQ-005 | UC-001–UC-003 | BEH-001–BEH-003 | AC-005 | SCN-001–SCN-003 | Investigation notes |
| REQ-006 | UC-001–UC-003 | BEH-003 | AC-006 | SCN-003 | Investigation notes |
| REQ-007 | UC-001, UC-002 | BEH-003 | AC-007 | SCN-004 | Token-usage contract evidence |
| REQ-008 | UC-004 | BEH-004 | AC-008 | SCN-004 | User constraint and prior precedent |
| REQ-009 | UC-005 | BEH-003, BEH-004 | AC-009 | SCN-003, SCN-004 | Investigation notes |
| REQ-010 | UC-001, UC-002 | BEH-001–BEH-003 | AC-001, AC-003, AC-010 | SCN-001, SCN-002 | Existing UI/server contract evidence |

## Architecture Phase Input

- Approved scenario IDs and product-level behavior paths architecture must map: Pending approval of `SCN-001`–`SCN-004`; `SCN-005` is explicitly unsupported in this package.
- Product and system constraints architecture must preserve: Exact runtime IDs; dynamic runtime capability ownership; Standard-only trusted pricing; cache/tier dimensions; fail-closed unknown behavior; prospective persistence; no new UI/transport/schema; no paid target-model inference.
- Decisions intentionally deferred to architecture design: Exact file set; whether to generalize/rename the GPT-5.6 long-context pricing helper; proportionate direct-adapter test additions; exact documentation sections.
- Technical facts architecture should verify: Shared row effects on AutoByteus direct model listing; current OpenAI response adapter suitability for Astra; Fable-family prefix policy coverage; targeted test commands in the worktree.
- Known feasibility or integration risks: Shared catalog rows may have direct-provider visibility; official pricing can change; model-specific price variants remain unrepresented.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Prototype and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and open decisions are visible: `Yes`
- Content ready for user approval: `Yes`
- Remaining content blocker: None; explicit user approval is required.

### Approved Basis Ready For Design

- User approval received: `No`
- Exact requirements and supplement approval basis recorded: `No`
- Approved requirements package ready for architecture design: `No`
- Remaining blocker: User must explicitly approve SR-001, including the Standard-only pricing boundary, retaining Fable 5, excluding the adjacent Sonnet 5 correction, and the no-paid-inference validation plan.

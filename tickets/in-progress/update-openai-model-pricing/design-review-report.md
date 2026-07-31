# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/update-openai-model-pricing/tickets/in-progress/update-openai-model-pricing/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/update-openai-model-pricing/tickets/in-progress/update-openai-model-pricing/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/update-openai-model-pricing/tickets/in-progress/update-openai-model-pricing/design-spec.md`
- Supplemental Task Artifacts Reviewed: `None`
- Solution Revision Record Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/update-openai-model-pricing/tickets/in-progress/update-openai-model-pricing/solution-revision-record.md`
- Relevant Solution Revision IDs: `SR-001` (superseded baseline), `SR-002` (previous approved package), `SR-003` (current audit/rework)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/update-openai-model-pricing/tickets/in-progress/update-openai-model-pricing/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: `2`
- Trigger: SR-003 Claude pricing audit identified an unresolved Sonnet 5 promotional-versus-durable-standard policy choice.
- Prior Review Round Reviewed: `ARCH-REV-001` — prior Pass for SR-002, now superseded by the refined requirements gate.
- Latest Authoritative Round: `2`
- Current-State Evidence Basis: Dedicated worktree based at `dfc0468b137cd231b79ff8096fa46750611b06e2`. The SR-003 investigation records the pre-implementation baseline and current Anthropic pricing audit. The worktree now also contains uncommitted implementation edits from the prior SR-002 handoff; those edits are preserved as downstream evidence but are not accepted as an architecture approval or reviewed implementation result in this round.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status (`Confirmed`/`Contradicted`/`Blocked`): `Blocked`
- Approved requirements / intended behavior understood: The OpenAI refresh and exact Claude Opus 5 support remain understood. The current Anthropic Sonnet 5 policy is not implementation-approved: the catalog records durable standard `$3/$15`, while the current first-party page advertises a temporary `$2/$10` introductory rate through 2026-08-31.
- Relevant existing behavior and evidence confirmed: The pre-change baseline in the investigation notes shows `supported-model-definitions.ts` owning the GPT-5.6 helper and Anthropic rows, `anthropic-llm.ts` owning family policy/request sanitization, `curated-model-metadata.ts` owning model limits, and generic `LLMFactory`/server pricing. The current worktree contains uncommitted Opus 5 edits from the prior implementation attempt; these do not resolve the SR-003 requirements gate.
- Approved change, preserved behavior, and outside scope understood: Existing IDs, provider adapters, request transports, server accounting, public lookup shapes, historical snapshots, and existing model behavior remain unchanged. Fast mode, Batch, data residency, fallback, cloud variants, aliases, and new effort controls are excluded.
- Remaining material ambiguity, if any: The user must choose durable standard Sonnet 5 pricing (recommended) or explicitly approve a bounded promotional-rate design with expiry/temporal handling. `TokenPricingConfig` currently has one effective date and no expiry or temporal selector.

| Behavior ID | Kind | Design Alignment With Approved Intent (`Pass`/`Fail`) | Approved Trigger / Contract And Current-State Evidence (`Pass`/`Fail`/`Unclear`) | Target Outcome / Path / Spine Coherence (`Pass`/`Fail`/`Unclear`) | Status (`Confirmed`/`Needs Correction`/`Unclear`) | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `BEH-001` | Contract | Pass | Pass — existing GPT-5.6 catalog and `LLMFactory.getModelPricingInfo` are evidenced in source/tests; official OpenAI announcement/model pages support the target values. | Pass — `DS-001` carries centralized helper output through the unchanged factory/server policy path to accounting snapshots. | Confirmed | None. |
| `BEH-002` | System | Pass | Pass — non-local token usage with model identity is the existing server accounting contract, with generic provider-neutral resolution and stored snapshots. | Pass — future resolutions use current catalog data while historical snapshots remain stored values; no server or persistence change is proposed. | Confirmed | None. |
| `BEH-003` | Contract | Pass | Pass — catalog registration and Anthropic message creation are existing supported paths; current policy source confirms Opus 5 is absent and adaptive membership is the relevant boundary. | Pass — `DS-002` adds one exact catalog identity and one private family-list entry, then reuses the existing adaptive/sanitized Messages request path. | Confirmed | None. |
| `BEH-004` | Contract | Pass | Pass — existing curated metadata and Anthropic cache dimensions support the required shape; first-party Claude docs verify the 1M/128k limits and prices. | Pass — `DS-002`/`DS-003` add data to existing owners without changing lookup or projection interfaces. | Confirmed | None. |
| `BEH-005` | Operational | Pass | Pass — maintainers use the active provider/module documentation as the documented current-state record; stale values and missing Opus 5 references are identified. | Pass — `DS-004` updates active docs while leaving historical tickets and runtime boundaries untouched. | Confirmed | None. |
| `BEH-006` (provisional) | Contract | Unclear — the requirements retain durable standard Sonnet 5 values but do not record the user's final policy choice. | Pass — the current Anthropic pricing page independently establishes both the standard row and the time-bounded introductory offer. | Unclear — a static standard row is coherent, but a promotional row would require a bounded policy design not present in the package. | Unclear | Route the policy choice to `solution_designer`; update approved behavior, acceptance criteria, and design before implementation routing. |

## Supplemental Artifact Coherence Verdict

`None` — no supplemental task artifact exists. External evidence is retained and linked in the investigation notes and core artifacts.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Requirements and design classify this as a medium feature plus behavior change. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | The missing Opus 5 row/family entry is a local implementation gap; existing ownership and boundaries are evidenced as healthy. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Design explicitly chooses no refactor and defers Fast/Batch/cloud/fallback/effort variants. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Existing catalog, metadata, adapter, factory, and server boundaries are reused with singular file responsibilities and no new abstraction. | None. |
| Current pricing-policy decision is complete for implementation | Fail | SR-003 explicitly leaves Sonnet 5's temporary introductory rate versus durable standard policy open. | Record the user's choice and revise the requirements/design gate. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DS-001` | OpenAI pricing/accounting | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-002` | Claude Opus 5 discovery/request/usage | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-003` | Public lookup/metadata/provider boundary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-004` | Active documentation maintenance | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

The two primary runtime spines are stretched from catalog registration through the meaningful downstream result/request boundary, rather than stopping at the edited literals. The Anthropic bounded local policy spine is also named and remains private to `AnthropicLLM`.

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| LLM catalog and `LLMFactory` lookup/creation | Pass | Pass | Pass | Pass | Server and runtime callers use factory boundaries; private catalog helpers and policy lists are not exposed. |
| Curated metadata resolver | Pass | Pass | Pass | Pass | Limits remain owned by the curated metadata subsystem and are not duplicated in pricing or adapter code. |
| `AnthropicLLM` request construction | Pass | Pass | Pass | Pass | One private family-policy extension governs adaptive thinking and sampling sanitization; callers do not branch on model names. |
| Server pricing adapter/calculator | Pass | Pass | Pass | Pass | Server consumes provider-neutral pricing and does not import provider catalog literals. |
| Persistence/projection | Pass | Pass | Pass | Pass | Stored historical snapshots remain authoritative for historical events; no current-catalog reread is introduced. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Catalog -> config/schema/provider types | Pass | Pass | Pass | Pass | Existing catalog direction is retained. |
| `AnthropicLLM` -> provider request helpers/policy | Pass | Pass | Pass | Pass | No pricing, metadata, server, or caller-side request policy dependency is added. |
| Server -> factory/provider-neutral pricing | Pass | Pass | Pass | Pass | No server-side OpenAI/Anthropic table or private helper bypass is proposed. |
| Docs/tests -> current contracts | Pass | Pass | Pass | Pass | Docs remain non-runtime and tests do not become a second production policy owner. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `LLMFactory.getModelPricingInfo` / metadata lookup | Pass | Pass | Pass | Low | Pass |
| `LLMFactory.createLLM` | Pass | Pass | Pass | Low | Pass |
| `AnthropicLLM` request methods/private policy | Pass | Pass | Pass | Low | Pass |
| `TokenPriceConfigProvider.resolvePolicy` | Pass | Pass | Pass | Low | Pass |

No new public interface or ambiguous selector is introduced. `claude-opus-5` is an explicit exact model identity.

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| GPT-5.6 price derivation | Pass | Pass | N/A | Pass | Existing family helper remains the sole formula owner. |
| Opus 5 identity/default config | Pass | Pass | N/A | Pass | Existing static catalog and adaptive schema are the correct owner. |
| Opus 5 limits | Pass | Pass | N/A | Pass | Existing curated metadata map is extended. |
| Opus 5 request invariants | Pass | Pass | N/A | Pass | Existing private Anthropic family policy is extended by one value. |
| Server accounting | Pass | Pass | N/A | Pass | Existing generic adapter/calculator is reused unchanged. |
| Active documentation and tests | Pass | Pass | N/A | Pass | Existing current-state records and executable contracts are extended. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts` LLM catalog | Pass | Pass | Pass | Pass | Owns exact identity, defaults, pricing, and schema for both providers. |
| `autobyteus-ts` curated metadata | Pass | Pass | Pass | Pass | Owns Opus 5 official limits/source date. |
| `AnthropicLLM` adapter | Pass | Pass | Pass | Pass | Owns provider wire invariants and family policy. |
| Catalog/adapter/factory tests | Pass | Pass | Pass | Pass | Verification follows runtime boundaries. |
| Active docs | Pass | Pass | Pass | Pass | Maintainer context is updated without becoming runtime authority. |
| Server token usage | Pass | Pass | Pass | Pass | Reused unchanged as the provider-neutral application owner. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| GPT-5.6 cache/tier formulas | Pass | Pass | Pass | Pass | Existing private helper prevents row duplication. |
| Claude adaptive schema/request shape | Pass | Pass | Pass | Pass | Existing schema and adapter helpers are reused; no Opus-specific parallel shape. |
| Anthropic cache subtype fields | Pass | Pass | Pass | Pass | Existing `TokenPricingConfig` dimensions express 5m/1h/read prices. |
| Provider-neutral lookup types | Pass | Pass | Pass | Pass | Existing factory/server projection is sufficient. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `TokenPricingConfig` / tier fields | Pass | Pass | Pass | Pass | Pass | Reuses generic OpenAI tiers and Anthropic cache subtypes without new provider fields. |
| `ParameterSchema` | Pass | Pass | Pass | Pass | Pass | Existing adaptive schema is appropriate for Opus 5; fixed-budget field is not added. |
| Curated metadata record | Pass | Pass | Pass | Pass | Pass | One record meaning for context/input/output limits and source date. |
| `ModelPricingInfo` / resolved policy | Pass | Pass | Pass | Pass | Pass | Provider-neutral projection remains unchanged. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/llm/supported-model-definitions.ts` | Pass | Pass | N/A | Pass | Existing catalog owns identity/defaults/pricing/schema; no server logic. |
| `src/llm/api/anthropic-llm.ts` | Pass | Pass | N/A | Pass | Existing adapter owns request policy and wire sanitization. |
| `src/llm/metadata/curated-model-metadata.ts` | Pass | Pass | N/A | Pass | Existing metadata owner receives one Opus 5 record. |
| Focused catalog/adapter/factory tests | Pass | Pass | N/A | Pass | Test files map to their runtime contracts. |
| Active provider/module docs | Pass | Pass | N/A | Pass | Durable maintainer records remain descriptive only. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm` | Pass | Pass | Low | Pass | Catalog/factory ownership remains readable. |
| `autobyteus-ts/src/llm/api` | Pass | Pass | Low | Pass | Anthropic wire policy stays at the provider boundary. |
| `autobyteus-ts/src/llm/metadata` | Pass | Pass | Low | Pass | Curated limits have a dedicated location. |
| `autobyteus-ts/tests/unit/llm` and `tests/integration/llm` | Pass | Pass | Low | Pass | Existing test topology mirrors contracts. |
| `autobyteus-ts/docs` | Pass | Pass | Low | Pass | Active docs are a separate maintainer-facing concern. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Stale active GPT-5.6 Terra/Luna literals | Pass | Pass | Pass | Pass |
| Opus 5 absence assumptions in active lists/tests/docs | Pass | Pass | Pass | Pass |
| Historical tickets and runtime/persistence files | Pass | N/A | Pass | Pass — explicitly preserved or unchanged. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| GPT-5.6 stale-price fallback/dual policy | No | Pass | Pass | Active values are replaced directly; historical snapshots retain old values. |
| Opus 5 alias/fallback/cloud variant | No | Pass | Pass | Exact official identity only. |
| Fast/Batch/data-residency compatibility path | No | Pass | Pass | Separate pricing dimensions are explicitly deferred. |

## Persisted-Data Transition Verdict

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? (`Pass`/`Fail`) | Direct Use, Rebuild, Or Migration Choice Is Proportionate? (`Pass`/`Fail`) | Migration Safety Is Complete If Required? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Token-usage event price/cost snapshots | `Directly Usable — No Migration` | Pass | Pass | N/A | Pass | Stored historical snapshots are semantically complete and must not be repriced; future events resolve current catalog policy. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Catalog and GPT-5.6 price update | Pass | Pass — no seam needed | Pass | Pass |
| Opus 5 catalog/metadata/policy extension | Pass | Pass — existing boundaries are extended in place | Pass | Pass |
| Tests and active docs | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| GPT-5.6 derived pricing | Yes | Pass | Pass | Pass | Existing helper invocation and derived values are concrete. |
| Opus 5 exact identity/request policy | Yes | Pass | Pass | Pass | Exact ID, adaptive family-list extension, and avoided caller branching are shown. |
| Historical snapshots | Yes | Pass | Pass | Pass | Current policy versus immutable history is explicit. |
| Fast/Batch/cloud variants | Yes | Pass | Pass | Pass | Separate billing dimensions are documented as out of scope. |

## Material Premise Validation (Only When Needed)

`None.` The review produced no prospective finding or new machinery dependent on an unestablished production/failure/lifecycle premise. The supported catalog lookup, server token-usage path, and Anthropic message-request path are directly evidenced in current code and the approved behavior map. Fast mode, Batch, fallback, cloud variants, and data residency are explicitly out of scope rather than being used as speculative findings.

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| `REQ-GAP-001` / provisional `BEH-006`: Sonnet 5 pricing policy | The current Anthropic source advertises `$2/$10` plus proportional cache rates through 2026-08-31, while the static catalog records `$3/$15` durable standard values. The current config cannot safely express a temporary rate without expiry/temporal handling. | User chooses the recommended durable standard policy, or explicitly requests a bounded promotional-policy design; then update requirements/design and re-review. | Open |

## Review Decision

`Blocked` — the SR-003 audit leaves one approved pricing-policy choice unresolved. The OpenAI/Opus 5 design is otherwise coherent, but implementation must not proceed until the Sonnet 5 policy is selected and the requirements/design gate is updated.

## Findings

1. **Requirement Gap — `REQ-GAP-001` — Blocker**
   - Affected approved behavior / contract: current Sonnet 5 catalog pricing and the combined package's active Claude pricing policy.
   - Evidence: SR-003's first-party audit records standard `$3/$15` with `$0.30/$3.75/$6` cache rates and a temporary `$2/$10` with `$0.20/$2.50/$4` offer through 2026-08-31; `TokenPricingConfig` has no expiry or temporal selector.
   - Material-premise validation: `N/A`; this is an unresolved approved-policy choice, not a speculative lifecycle premise.
   - Required update: obtain the user's choice. For durable standard pricing, record approval and keep the current row. For promotional pricing, return through solution design with an explicit bounded policy/expiry decision and acceptance criteria.
   - Proportionate response: do not add temporal machinery or change the Sonnet 5 literal until the intended policy is approved; the existing OpenAI/Opus 5 work remains unchanged.
   - Recommended recipient: `solution_designer`.

## Classification

`Requirement Gap` — the current Sonnet 5 promotional-versus-durable-standard policy has not been approved.

## Recommended Recipient

`solution_designer`

## Residual Risks

- Provider prices and availability may change; the package records effective/verification dates and first-party sources for a future explicit refresh.
- No credentialed live call is claimed; entitlement and transport validation remain downstream API/E2E concerns.
- Fast mode, Batch, data residency, fallback, cloud variants, and provider effort controls remain separate contracts and must not be inferred from this catalog entry.
- Historical ledger snapshots intentionally retain the rates recorded at event time.
- The `autobyteus-ts` package test script is intentionally nonfunctional; downstream validation must invoke the installed Vitest/package-specific commands and report setup blockers precisely.
- Implementation is held until `REQ-GAP-001` is resolved; if durable standard pricing is approved, no new Sonnet 5 code is expected from this audit.

## Latest Authoritative Result

- Review Decision: `Blocked`
- Material-Premise Gate (`Pass`/`Fail`/`Blocked`): `Pass`
- Notes: `ARCH-REV-001`'s SR-002 Pass is superseded by SR-003's refined requirements gate. No structural design defect was found; implementation routing is held solely for `REQ-GAP-001`.

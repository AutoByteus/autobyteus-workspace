# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/design-spec.md`
- Supplemental Task Artifacts Reviewed: None
- Solution Revision Record Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/solution-revision-record.md`
- Relevant Solution Revision IDs: `SR-001`–`SR-006`, with `SR-005` as the approved behavior baseline and `SR-006` as the rework trigger
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: `2`
- Trigger: Re-review of `ARCH-REV-001` after solution rework
- Prior Review Round Reviewed: `ARCH-REV-001`
- Latest Authoritative Round: `ARCH-REV-002`
- Current-State Evidence Basis: Refreshed base `origin/personal` at `d5618bffd`; current source reads and sanitized Alibaba probes retained in `investigation-notes.md`; no implementation or durable coverage has started.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status (`Confirmed`/`Contradicted`/`Blocked`): `Confirmed`
- Approved requirements / intended behavior understood: `Confirmed`. `SR-005` remains unchanged: endpoint-advertised metadata, exact endpoint-profile metadata, exact built-in fallback marked inferred, then unknown; endpoint/profile values override inferred fallback and unsupported matching/probing remain forbidden.
- Relevant existing behavior and evidence confirmed: `Confirmed`. The supported path remains saved provider -> secret resolution -> one `/models` request -> normalized rows -> custom `LLMModel` -> registry/runtime -> token summary -> token meter. Current discovery discards optional fields, the refreshed server preserves received model values, and the Alibaba endpoint exposes no limit metadata.
- Approved change, preserved behavior, and outside scope understood: `Confirmed`. The revised package adds only the bounded metadata resolution/projection and explicit unknown UI state; it preserves credential, URL, stale/error, persistence, runtime-compaction, explicit-override, and no-extra-network-request behavior.
- Remaining material ambiguity, if any: `None`. The former contract omissions are now explicit in the revised requirements and design spec.

| Behavior ID | Kind | Design Alignment With Approved Intent (`Pass`/`Fail`) | Approved Trigger / Contract And Current-State Evidence (`Pass`/`Fail`/`Unclear`) | Target Outcome / Path / Spine Coherence (`Pass`/`Fail`/`Unclear`) | Status (`Confirmed`/`Needs Correction`/`Unclear`) | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `BEH-001` | User/System | Pass | Pass | Pass | Confirmed | Preserve the existing discovery lifecycle while carrying the fixed optional-field semantics. |
| `BEH-002` | System/Contract | Pass | Pass | Pass | Confirmed | Use the source union, exact value index, profile references, and per-field server merge defined in the revised contracts. |
| `BEH-003` | System | Pass | Pass | Pass | Confirmed | Reuse `resolveTokenBudget` and compaction unchanged; prove known and unknown cases downstream. |
| `BEH-004` | Contract | Pass | Pass | Pass | Confirmed | Apply the exact canonical endpoint tuple, fixed aliases, and independent fall-through rules. |
| `BEH-005` | User | Pass | Pass | Pass | Confirmed | Render the unavailable state only when usage is known and capacity is absent; omit percentage and denominator. |

## Supplemental Artifact Coherence Verdict

None.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Requirements and design spec classify the change as a targeted bug fix/behavior change. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Discovery drops metadata and custom construction supplies no capacity; server preservation is already healthy. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | The package explicitly chooses a targeted extension and reuses existing metadata, catalog, runtime, and UI owners. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Updated ownership, implementation-contract, removal, sequence, and risk sections support the decision. | None. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DS-001` | Custom provider to runtime model | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-002` | Model catalog to GraphQL | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-003` | Runtime budget to usage UI | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-004` | Candidate-local metadata resolution | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

The revised spines remain complete through their business consequences and now expose the source-bearing projection and exact resolution contracts needed to implement them.

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `OpenAICompatibleEndpointDiscovery` | Pass | Pass | Pass | Pass | Sole raw `/models` transport and fixed top-level normalization boundary. |
| Endpoint metadata resolver/profile | Pass | Pass | Pass | Pass | Pure resolver owns canonical endpoint identity, profiles, exact fallback index, and per-field precedence. |
| `OpenAICompatibleEndpointModelProvider` / model constructor | Pass | Pass | Pass | Pass | Coordinates fresh/stale construction and maps one resolved shape. |
| `ModelMetadataProvisioningService` | Pass | Pass | Pass | Pass | Preserves custom source-bearing fields while retaining built-in provider live-over-static behavior. |
| `resolveTokenBudget` / token meter | Pass | Pass | Pass | Pass | Consume canonical fields/summary only; no inference is added below the resolver. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Discovery | Pass | Pass | Pass | Pass | May use shared metadata types; no server, GraphQL, runtime, or UI dependency. |
| Endpoint resolver | Pass | Pass | Pass | Pass | Pure URL/profile/index policy; no credentials, network, or generic model-name lookup. |
| Custom model lifecycle | Pass | Pass | Pass | Pass | Calls the resolver; factory retains registry ownership. |
| Server catalog | Pass | Pass | Pass | Pass | Projects/merges source-bearing model data; does not query custom endpoints. |
| Runtime/UI | Pass | Pass | Pass | Pass | Consume canonical model/summary data without provider-specific inference. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `probeEndpoint(input)` | Pass | Pass | Pass | Low | Pass |
| `resolve({ endpoint, discoveredModel })` | Pass | Pass | Pass | Low | Pass |
| Endpoint profile entry | Pass | Pass | Pass | Low | Pass |
| `OpenAICompatibleEndpointModelInput` | Pass | Pass | Pass | Low | Pass |
| `ModelInfo.resolved_model_metadata` | Pass | Pass | Pass | Low | Pass |

The revised interfaces now name the exact provider-wire value, canonical endpoint tuple, source-bearing union, profile references, and non-secret projection contract.

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Numeric metadata and source shape | Pass | Pass | N/A | Pass | Extend `ResolvedModelMetadata` with the defined discriminated source union. |
| Built-in static facts | Pass | Pass | N/A | Pass | Reuse `SupportedModelDefinition.staticMetadata` through the separate exact-value index. |
| Endpoint transport/normalization | Pass | Pass | N/A | Pass | Extend the existing discovery boundary with the fixed alias allowlist and duplicate merge. |
| Runtime compaction | Pass | Pass | N/A | Pass | Existing `resolveTokenBudget` remains authoritative. |
| Unknown token-meter presentation | Pass | Pass | N/A | Pass | Existing UI owner remains authoritative. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Custom endpoint discovery | Pass | Pass | Pass | Pass | Extends the established external boundary. |
| LLM metadata | Pass | Pass | Pass | Pass | One pure profile/resolver owner contains all new policy. |
| Custom model lifecycle | Pass | Pass | Pass | Pass | Fresh/stale semantics remain with the existing provider. |
| Server catalog | Pass | Pass | Pass | Pass | Mandatory source projection is attached to the existing enrichment owner. |
| Agent runtime | Pass | Pass | Pass | Pass | Reuse only. |
| Workspace usage UI | Pass | Pass | Pass | Pass | Extends only the missing unknown state. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Numeric field value/source | Pass | Pass | Pass | Pass | Reuse the source-bearing `ResolvedMetadataField`. |
| Exact built-in fallback index | Pass | Pass | Pass | Pass | Narrow resolver-owned index keyed only by `SupportedModelDefinition.value`. |
| Positive-integer normalization | Pass | Pass | Pass | Pass | One fixed semantic normalizer is reused for aliases, profiles, and candidates. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `OpenAICompatibleEndpointDiscoveredModel` | Pass | Pass | Pass | N/A | Pass | Carries normalized numeric semantics only. |
| `ResolvedModelMetadata` | Pass | Pass | Pass | N/A | Pass | Five source kinds have distinct meanings; active context remains dynamic. |
| Built-in index/profile entry | Pass | Pass | Pass | Pass | Pass | Exact wire value, provider reference, canonical endpoint tuple, and selected provenance are explicit. |
| `ModelInfo` | Pass | Pass | Pass | N/A | Pass | Carries the same non-secret per-field resolution internally. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/openai-compatible-endpoint-discovery.ts` | Pass | Pass | Pass | Pass | Alias parsing, duplicate merging, and row normalization remain at the external boundary. |
| `autobyteus-ts/src/llm/metadata/openai-compatible-endpoint-model-metadata.ts` | Pass | Pass | Pass | Pass | Owns canonical identity, profiles, exact index, source union, and precedence. |
| `autobyteus-ts/src/llm/openai-compatible-endpoint-provider.ts` | Pass | Pass | Pass | Pass | Owns construction/lifecycle sequencing. |
| `autobyteus-ts/src/llm/openai-compatible-endpoint-model.ts` | Pass | Pass | Pass | Pass | Maps resolved metadata into the canonical model. |
| `autobyteus-ts/src/llm/models.ts` | Pass | Pass | Pass | Pass | Mandatory source-bearing `ModelInfo` projection is explicit. |
| `model-metadata-provisioning-service.ts` | Pass | Pass | Pass | Pass | Merge and coarse provenance rules are explicit. |
| `TokenUsageMeterPanel.vue` and locale/test files | Pass | Pass | Pass | Pass | Known and unknown observable states are explicit. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/metadata/` | Pass | Pass | Low | Pass | Existing metadata capability is the right owner. |
| `openai-compatible-endpoint-model-metadata.ts` | Pass | Pass | Low | Pass | One focused pure policy boundary. |
| `autobyteus-ts/src/llm/` endpoint files | Pass | Pass | Low | Pass | Existing flat adapter layout remains readable. |
| Server `llm-management/services/` | Pass | Pass | Low | Pass | Existing catalog/provisioning owner remains authoritative. |
| Web `components/workspace/usage/` | Pass | Pass | Low | Pass | Existing usage presentation owner remains authoritative. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Identifier-only discovered row | Pass | Pass | Pass | Pass |
| Global/unmarked model-name fallback | Pass | Pass | Pass | Pass |
| Speculative metadata routes | Pass | Pass | Pass | Pass |
| Proposed server null-overwrite fix | Pass | Pass | Pass | Pass |
| Silent unknown UI branch | Pass | Pass | Pass | Pass |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Discovery DTO | No | Pass | Pass | The identifier-only shape is replaced in the same path. |
| Custom provider persistence | No | Pass | Pass | Derived metadata is not persisted; existing records remain directly usable. |
| Runtime compaction | No | Pass | Pass | No provider-specific runtime branch is added. |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? (`Pass`/`Fail`) | Direct Use, Rebuild, Or Migration Choice Is Proportionate? (`Pass`/`Fail`) | Migration Safety Is Complete If Required? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Version-2 custom-provider records and separate secret references | `Not Affected` | Pass | Pass | N/A | Pass | Metadata is derived during discovery/model construction and is not stored. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Discovery and resolver | Pass | Pass | Pass | Pass |
| Custom model and registry | Pass | Pass | Pass | Pass |
| Catalog/source projection | Pass | Pass | Pass | Pass |
| Runtime and UI | Pass | Pass | Pass | Pass |

The implementation sequence is now actionable without inventing source, identity, alias, or canonicalization policy.

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Compound endpoint identity | Yes | Pass | Pass | Pass | Exact protocol/host/port/path/model tuple and near-match rejection are present. |
| Built-in fallback and conflict handling | Yes | Pass | Pass | Pass | Exact `value` index, lowest-valid per-field selection, and selected provenance are explicit. |
| Per-field source propagation | Yes | Pass | Pass | Pass | Source union and server/GraphQL projection rules are concrete. |
| Unknown UI state | Yes | Pass | Pass | Pass | Prompt usage remains visible without a false denominator. |

## Material Premise Validation (Only When Needed)

None. The review is grounded in the established supported custom-provider path and current metadata contracts; no prospective finding depends on an unsupported production scenario.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`: the approved behavior basis is confirmed, the former architecture findings are resolved in the canonical package, and the design is ready for implementation. No in-scope machinery depends on an unsupported material premise.

## Findings

None. `ARCH-DESIGN-001`, `ARCH-DESIGN-002`, and `ARCH-DESIGN-003` are resolved by `SR-006` and verified in the revised requirements and design contracts.

## Classification

`N/A` — no current finding.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Vendor profile facts for preview/plan-specific models can become stale; implementation must retain source URLs and verification dates and keep profile updates deliberate.
- Exact built-in fallback remains explicitly inferred and can differ from a custom plan; endpoint/profile values must continue to override it and unmatched models must remain unknown.
- Query/fragment-bearing endpoint URLs are intentionally not profile-addressable when the plan depends on those components; the implementation must route those cases through advertised/fallback resolution as specified, while preserving the existing discovery contract.
- No implementation, API/E2E execution, or durable coverage evidence exists yet; downstream agents must prove the exact alias/index/profile cases, source projection, stale behavior, runtime budget, and known/unknown UI states.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate (`Pass`/`Fail`/`Blocked`): `Pass`
- Notes: `ARCH-REV-001` findings are closed. The revised package is implementation-ready without adding new policy; proceed to implementation with the cumulative artifact package.

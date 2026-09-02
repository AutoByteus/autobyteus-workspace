# Design Spec

## Status

`Ready for architecture review.`

## Current-State Read

`CodexModelCatalog` owns `model/list` pagination and delegates each provider row to `mapCodexModelListRowToModelInfo()`. The normalizer already owns provider-to-product model/config-schema translation. Its only faulty choice is sourcing Fast capability from deprecated `additionalSpeedTiers`/`additional_speed_tiers` string arrays. The resulting generic schema and frontend form behavior are otherwise correct.

Current Codex 0.151/0.152 returns canonical structured `serviceTiers`, with `id: "priority"` and display name Fast. The execution path continues to accept stored product value `fast`; capability discovery does not need to change runtime configuration vocabulary.

## Intended Change

Inside the existing Codex model normalizer, replace deprecated speed-tier parsing with canonical structured service-tier parsing. A normalized structured entry ID `priority` enables the existing `service_tier` Fast parameter. Remove deprecated-field handling and its coverage. Preserve all catalog interfaces, generic schema shape, frontend components, stored configuration, and runtime execution.

## Relevant Behavior And Production-Path Map

| Behavior ID | Kind | Approved Requirement / Intent | Trigger / Contract | Existing Evidence | Approved Change / Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| `BEH-001` | User/System | `REQ-001`–`REQ-004`; `AC-001`–`AC-005` | User submits existing Fast config | Probe report and source trace | Preserve request propagation and shared-process isolation | Existing execution path unchanged; preservation check only |
| `BEH-004` | Contract/User | `REQ-005`, `REQ-006`; `AC-006`–`AC-010` | Current Codex `model/list` row is mapped and configuration is opened | 0.151/0.152 model-list probes; normalizer/catalog source | Canonical `serviceTiers[].id=priority` controls whether the existing Fast parameter appears | `DS-001` |
| `BEH-005` | User | `REQ-007`; `AC-011` | User views active run/header | User scope decision and current UI source | Preserve no effective-tier UI | No target change |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship | Status |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/fast-mode-probe-report.md` | Protocol/runtime/model-list evidence | `REQ-001`–`REQ-006`; `AC-001`–`AC-010` | Proves current execution correctness and canonical metadata availability | Complete / approval `N/A` |

## Task Design Health Assessment

- Change posture: `Cleanup`.
- Current design issue found: `No` broad design issue; one local adapter defect.
- Root cause classification: `Local Implementation Defect`.
- Refactor needed now: `No`.
- Evidence: the existing catalog-to-normalizer boundary already singularly owns provider metadata translation; only its private capability source is deprecated.
- Design response: clean-cut replacement inside that owner and removal of obsolete parser/tests.
- Refactor rationale: no caller duplication, boundary bypass, mixed identity, file-placement drift, or shared-structure pressure exists. New abstraction/files would be disproportionate.
- Intentional deferrals/residual risk: Codex versions without current `serviceTiers` will not advertise Fast; this is intentional modernization, not deferred compatibility work.

## Terminology

- **Provider capability ID:** canonical `serviceTiers[].id`, currently `priority` for Fast.
- **Product configuration value:** persisted/submitted AutoByteus value `fast`.
- These values are related by the adapter but are not interchangeable storage representations.

## Legacy Removal Policy

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove reads of `additionalSpeedTiers` and `additional_speed_tiers`.
- Remove private `toAdditionalSpeedTiers()` and deprecated camel/snake test cases.
- Do not fall back from missing/malformed `serviceTiers` to deprecated metadata.

## Persisted Data / State Transition Decision

- Stored subject/location: agent/team/default/member `llmConfig` JSON containing optional `service_tier: "fast"`.
- Relevant change: none to stored schema, serializer, reader, or semantics; only ephemeral provider capability mapping changes.
- Normal reader/writer evidence: current generic config form stores `fast`; runtime resolver accepts `fast`; these paths remain untouched.
- Required invariant: existing Fast values continue to execute as Fast; Default remains omitted.
- Decision: `Directly Usable — No Migration`.
- Rationale: provider catalog capability rows are re-derived at runtime, while existing persisted product values remain canonical and readable. Rewriting to `priority` would be unnecessary and harmful.
- Supported criteria: `AC-001`–`AC-005`, `AC-010`, `AC-011`.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| `DS-001` | Primary End-to-End | `BEH-004` | User/config surface requests Codex model catalog | Existing generic form conditionally renders Fast | Codex model-catalog/normalizer boundary | Carries canonical provider capability into stable product schema without frontend provider parsing |
| `DS-002` | Return path | `BEH-004` | Normalized `ModelInfo.config_schema` | GraphQL/store/form presentation | Existing model catalog publication path | Proves no public interface or UI-source change is necessary |

## Primary Execution Spine

`ModelConfigSection / catalog request -> model catalog GraphQL/service -> CodexModelCatalog -> Codex app-server model/list -> mapCodexModelListRowToModelInfo -> ModelInfo.config_schema -> generic ModelConfigAdvanced Fast selector`

## Spine Narratives

| Spine ID | Narrative | Main Nodes | Governing Owner | Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-001` | The existing configuration surface requests the Codex catalog. `CodexModelCatalog` pages current raw rows and the normalizer inspects `serviceTiers`. A structured `priority` ID contributes the unchanged Fast config parameter. | Catalog request, catalog owner, app-server contract, normalizer, generic schema/form | `CodexModelCatalog` for acquisition; normalizer for translation | Trim/lowercase input normalization; deterministic tests |
| `DS-002` | The unchanged `ModelInfo` schema flows through existing GraphQL/store publication and is rendered generically. | `ModelInfo`, catalog publication, frontend schema consumer | Existing model catalog publication boundary | No provider-specific frontend knowledge |

## Spine Actors / Main-Line Nodes

- Configuration catalog caller: initiates existing model discovery.
- `CodexModelCatalog`: owns transport acquisition/pagination and row handoff.
- Codex app-server `model/list`: authoritative external capability source.
- `mapCodexModelListRowToModelInfo`: owns translation to product-neutral `ModelInfo`.
- Generic schema publication/form: consumes unchanged output.

## Ownership Map

- `CodexModelCatalog` owns app-server client lifecycle and pagination, not provider-field interpretation.
- `codex-app-server-model-normalizer.ts` owns raw-row parsing, provider vocabulary normalization, and config-schema composition.
- Generic frontend configuration components own schema rendering, not Codex capability semantics.
- Runtime service-tier normalizers own stored configuration validation, not catalog capability discovery.

## Thin Entry Facades / Public Wrappers

| Facade | Governing Owner | Why It Exists | Must Not Own |
| --- | --- | --- | --- |
| Model catalog GraphQL/publication path | Model catalog service and Codex catalog | Publishes runtime model metadata generically | Codex-specific `serviceTiers` parsing |

## Removal / Decommission Plan

| Item | Why Unnecessary | Replacement | Scope | Notes |
| --- | --- | --- | --- | --- |
| Private `toAdditionalSpeedTiers()` | Reads deprecated contract | Private structured-tier capability predicate in same normalizer | In this change | Delete rather than wrap |
| `additionalSpeedTiers` / `additional_speed_tiers` reads | Legacy/undocumented input paths | Canonical `model.serviceTiers` only | In this change | No fallback |
| Unit fixture asserting deprecated camel metadata | Protects obsolete behavior | Structured `serviceTiers` priority fixture | In this change | Preserve schema assertions |
| Unit fixture asserting deprecated snake metadata | Protects obsolete behavior | Negative assertion that deprecated-only input does not enable Fast | In this change | Makes removal explicit |
| Live integration raw-capability deprecated parser | Would make parity coverage stale | Structured-entry ID parser | API/E2E coverage phase, subject to coverage investigation | Team ownership rule applies |

## Return Or Event Spine

`mapCodexModelListRowToModelInfo result -> ModelInfo.config_schema -> existing GraphQL catalog DTO -> frontend catalog store -> generic schema form`

No new event, callback, websocket, or runtime-status spine is introduced.

## Bounded Local / Internal Spines

N/A. The change is a synchronous row-to-model transformation with no loop/state machine beyond existing catalog pagination.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves Owner | Responsibility | Why | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| Structured entry validation | `DS-001` | Model normalizer | Ignore non-object/missing-ID entries and normalize valid IDs | Raw external JSON is untyped | Frontend/provider coupling or thrown catalog load |
| Unit coverage | `DS-001` | Model normalizer | Protect structured capability and unchanged schema | Deterministic regression evidence | Deprecated behavior could silently return |
| Live parity coverage | `DS-001`, `DS-002` | Catalog boundary | Compare raw current capability with catalog/GraphQL output | Validates provider contract end to end | Test could remain falsely aligned to deprecated field |

## Ownership Boundaries

Provider-specific raw JSON interpretation stays inside the Codex normalizer. `CodexModelCatalog` remains the authoritative catalog acquisition boundary and passes opaque rows to that adapter. Generic frontend consumers receive only the stable config-schema shape. No caller depends simultaneously on the catalog boundary and its client internals.

## Boundary Encapsulation Map

| Authoritative Boundary | Encapsulated Mechanisms | Required Callers | Forbidden Bypass | If Too Thin |
| --- | --- | --- | --- | --- |
| `CodexModelCatalog.listModels()` | app-server client acquisition, pagination, row normalizer | model catalog service/GraphQL path | frontend or generic service parsing `serviceTiers` | strengthen normalizer/catalog result, not caller bypass |
| `mapCodexModelListRowToModelInfo()` | raw field parsing and product schema mapping | `CodexModelCatalog` | duplicating provider-tier mapping in UI/runtime thread code | extend this mapper only |

## Dependency Rules

- Catalog service may depend on app-server client and Codex normalizer.
- Normalizer may depend on generic JSON parsing and `ModelInfo`/provider identifiers.
- Generic frontend/store must depend only on published config schema.
- Forbidden: deprecated-field fallback, frontend `serviceTiers` parsing, runtime-thread response changes, or storing provider capability ID `priority` as product config.

## Interface Boundary Mapping

| Interface / Method | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `CodexModelCatalog.listModels(cwd?)` | Codex model catalog | Acquire/map all current model rows | optional working directory | Unchanged |
| `mapCodexModelListRowToModelInfo(row)` | One Codex model row | Validate/map row to `ModelInfo` | raw unknown row with canonical current fields | Internal behavior changes; signature unchanged |
| `resolveCodexSessionServiceTier(llmConfig)` | Stored run configuration | Normalize product value `fast` | generic config record | Preserved, not used for capability discovery |

## Interface Boundary Check

| Interface | Singular? | Explicit Identity? | Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `listModels` | Yes | Yes | Low | None |
| row normalizer | Yes | N/A—single row value | Low | Replace only private field logic |
| runtime tier resolver | Yes | Yes | Low | Keep separate from capability predicate |

## Main Domain Subject Naming Check

| Subject | Name | Natural? | Drift Risk | Action |
| --- | --- | --- | --- | --- |
| Catalog acquisition | `CodexModelCatalog` | Yes | Low | Preserve |
| Raw-row adapter | `mapCodexModelListRowToModelInfo` | Yes | Low | Preserve |
| New private predicate | `supportsCodexFastServiceTier` | Yes | Low | Keep private in existing file |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| Provider metadata mapping | Codex model normalizer | Extend | Already owns all relevant translation |
| Catalog acquisition/publication | Codex/model catalog services | Reuse unchanged | No transport/interface defect |
| Form rendering | Generic model config form | Reuse unchanged | Stable schema already drives UI |
| New shared tier abstraction | None needed | Do not create | One local predicate is sufficient |

## Subsystem / Capability-Area Allocation

| Area | Concerns | Spines | Owner | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Codex model adapter | structured capability parsing and config-schema composition | `DS-001` | model normalizer | Extend | Only production source edit |
| Model catalog | acquisition/publication | `DS-001`, `DS-002` | catalog services | Reuse | Interface unchanged |
| Generic web config | schema display/selection | `DS-002` | existing components/store | Reuse | No edit |

## Draft File Responsibility Mapping

| Candidate File | Area | Owner | Concern | Why One File | Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `codex-app-server-model-normalizer.ts` | Codex adapter | row normalizer | Parse `serviceTiers` and compose existing schema | Same provider-row transformation | No new extraction |
| normalizer unit test | Codex adapter test | deterministic coverage | Structured/negative/deprecated-removal cases | Directly tests one owner | N/A |

## Reusable Owned Structures Check

No repeated new structure exists. A separate service-tier module would be empty indirection for one predicate and is rejected.

## Shared Structure / Data Model Tightness Check

N/A. No new shared DTO/type/schema is introduced. Existing generic config schema remains unchanged.

## Final File Responsibility Mapping

| File | Area | Owner | Concrete Concern | Why One File | Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/codex/codex-app-server-model-normalizer.ts` | Codex model adapter | provider-row mapping | Private canonical service-tier capability check; unchanged `ModelInfo` composition | Cohesive existing responsibility | Existing JSON helpers |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/codex-app-server-model-normalizer.test.ts` | Unit coverage | model adapter contract | Current metadata positive/negative/malformed/deprecated-removal cases | Mirrors production owner | N/A |
| `autobyteus-server-ts/tests/integration/services/codex-model-catalog.integration.test.ts` | Live API/E2E coverage | catalog parity | Candidate replacement of deprecated raw capability parser | Same end-to-end parity purpose | N/A; final coverage action owned downstream |

## Applied Patterns

- Adapter/translator: existing normalizer translates provider-specific metadata into the product-neutral model/config schema.
- No new pattern or layer is introduced.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner | Responsibility | Why Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/codex/codex-app-server-model-normalizer.ts` | File | Codex adapter | Current model-list row normalization | Existing cohesive provider boundary | UI state, process lifecycle, start response parsing |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/codex-app-server-model-normalizer.test.ts` | File | Unit coverage | Deterministic current contract | Mirrors source | Live process orchestration |
| `autobyteus-server-ts/tests/integration/services/codex-model-catalog.integration.test.ts` | File | API/E2E coverage | Live raw/catalog/GraphQL parity | Existing integration boundary | Implementation-owned unit-only logic |

The compact existing folder layout is clearest because there is one local adapter concern and no meaningful new structural depth.

## Folder Boundary Check

| Folder | Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| `src/agent-execution/backends/codex` | Provider adapter/off-spine concern | Yes | Low | Existing placement owns Codex model translation |
| `tests/unit/.../codex` | Unit coverage | Yes | Low | Mirrors provider adapter |
| `tests/integration/services` | Live integration | Yes | Low | Catalog/GraphQL parity crosses service boundaries |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Avoided Shape | Why |
| --- | --- | --- | --- |
| Capability mapping | `serviceTiers: [{ id: " priority " }] -> supports Fast -> enum_values: ["fast"]` | `additionalSpeedTiers ?? serviceTiers` dual read | Clean current contract and stable product value |
| Missing capability | deprecated-only `additionalSpeedTiers: ["fast"] -> no Fast parameter` | silently retaining legacy fallback | Makes removal verifiable |
| Boundary | raw provider parsing in server normalizer | Vue component checks `tier.id` | Keeps generic UI provider-neutral |

## Backward-Compatibility Rejection Log

| Candidate | Why Considered | Decision | Clean-Cut Replacement |
| --- | --- | --- | --- |
| Fall back to `additionalSpeedTiers` when `serviceTiers` missing | Could keep older binaries showing Fast | Rejected | Require current structured `serviceTiers` |
| Accept `service_tiers` snake-case alias | Existing normalizer tolerates some snake fields | Rejected | Use canonical app-server `serviceTiers` only |
| Store/submit `priority` instead of `fast` | Matches provider capability ID | Rejected | Keep stable product value `fast`; use `priority` only for discovery |

## Derived Layering

N/A beyond existing flow: provider transport/catalog -> provider adapter -> generic catalog contract -> generic UI.

## Change / Refactor Sequence

1. In the model normalizer, add a private `supportsCodexFastServiceTier(row)` (or equivalently named predicate) that reads only `row.serviceTiers`, accepts object entries with normalized ID `priority`, and ignores malformed entries.
2. Change service-tier config-schema composition to take the predicate result rather than deprecated string-tier arrays.
3. Delete `toAdditionalSpeedTiers()` and all deprecated camel/snake reads.
4. Update normalizer unit fixtures/assertions for structured positive, case/whitespace, non-priority, malformed/missing, and deprecated-only negative behavior while preserving reasoning/runtime resolver tests.
5. Run implementation-scoped unit/type checks.
6. During API/E2E coverage investigation, classify and update the live catalog parity test's raw capability parser to current structured metadata if retained, then execute live coverage when the environment permits.
7. Confirm no frontend/runtime/header files changed and no stored data migration exists.

No temporary compatibility seam is allowed.

## Key Tradeoffs

- Using only provider ID `priority` is narrower and more stable than matching display name `Fast`; it intentionally ignores descriptive name changes and malformed entries.
- Removing legacy fallback may hide Fast on outdated Codex versions, but avoids dual contract authority and is safe for verified 0.151/0.152.
- Keeping product value `fast` avoids migration and preserves the verified execution contract.

## Risks

- Upstream could change the structured provider ID in a later Codex version. The live parity test and capability absence behavior make this fail closed: Fast disappears rather than submitting an unsupported value.
- If the live integration test remains on deprecated parsing, it will become stale/misleading; API/E2E coverage investigation must explicitly classify it.
- Over-expanding into effective-tier UI would violate approved scope.

## Guidance For Implementation

- Keep the change local and delete legacy logic rather than wrapping it.
- Use existing `asObject`/`asString` helpers; do not throw on malformed external rows.
- Normalize entry IDs with trim/lowercase and compare exactly with `priority`.
- Do not inspect tier `name` or `description` to decide capability.
- Do not modify `normalizeCodexServiceTier`, bootstrap, thread manager, client manager, frontend components, GraphQL schema, websocket contracts, or persisted config.
- Preserve the exact generic schema parameter shape and label used today.

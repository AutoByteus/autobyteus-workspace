# Design Review Report

## Review Round Meta

- **Upstream Requirements Doc:** `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/requirements.md`
- **Upstream Investigation Notes:** `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/investigation-notes.md`
- **Reviewed Design Spec:** `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/design-spec.md`
- **Supplemental Task Artifacts Reviewed:** None
- **Solution Revision Record Reviewed:** `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/solution-revision-record.md`
- **Relevant Solution Revision IDs:** `SR-006` current; `SR-005` prior reviewed package
- **Architecture Review Revision Record:** `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/architecture-review-revision-record.md`
- **Current Architecture Review Revision ID:** `ARCH-REV-005`
- **Current Review Round:** 5
- **Trigger:** Re-review after `ARCH-REV-004` `Fail / Design Impact` (`ARCH-F-006`) and solution revision `SR-006`, which makes provider-name snapshots AutoByteus-only and explicitly preserves nullable direct Codex/Claude paths. Implementation rework remains unauthorized until this gate passes.
- **Prior Review Round Reviewed:** `ARCH-REV-004` — `Fail` / `Design Impact`
- **Latest Authoritative Round:** `ARCH-REV-005`
- **Still-relevant downstream context reviewed:** `implementation-handoff.md`, `implementation-revision-record.md`, `code-review-report.md`, `code-review-revision-record.md`, `coverage-investigation.md`, `execution-coverage-report.md`, `api-e2e-revision-record.md`, `api-e2e-test-review-report.md`, `docs-sync-report.md`, `handoff-summary.md`, `release-deployment-report.md`, and `delivery-revision-record.md`.
- **Current-State Evidence Basis:** Current source and downstream artifacts were checked. Existing delivered code has the prior nullable-free ledger schema and display implementation. The source shows the shared `autobyteus-ts` observation-builder path for the named AutoByteus normalizers, plus independent direct server token-usage producers for Codex and Claude. The current `TokenUsageUpdatedPayload`, Prisma model, and SQL mapping do not yet carry `provider_name`; SR-006 now explicitly allocates both the future AutoByteus snapshot path and preserved direct nullable paths. Startup ordering and the existing runner remain reusable.

## Upstream Behavior And Production-Path Basis Confirmation

- **Overall Basis Status:** Confirmed
- **Approved requirements / intended behavior understood:** Add one nullable `provider_name` display snapshot for AutoByteus events. New custom and built-in AutoByteus provider events persist a readable name without changing `model_provider` or canonical `model_identifier`; display is snapshot-first, then legacy current lookup/fallback. Direct Codex/Claude events remain nullable and unchanged because no configured provider name is in scope. Historical composite `model_value` correction remains value-only. Provider rename/deletion must not change rows with a snapshot.
- **Relevant existing behavior and evidence confirmed:** `LLMModel` already exposes `providerName`; the named shared LLM normalizers build observations from that model. Direct Codex/Claude server token-usage paths construct event payloads independently and have no configured/saved provider name in this scope. `TokenUsageEventEnrichmentTransformer` parses/normalizes event payloads, the SQL repository creates/reads ledger rows, and startup runs Prisma before app-data migrations. Existing delivered Model/Task display, GraphQL, frontend, and value-migration paths remain the prior reviewed baseline.
- **Approved change, preserved behavior, and outside scope understood:** Add schema/observation/domain/payload/repository propagation for AutoByteus snapshots and direct nullable pass-through; add snapshot-first display and provider-name backfill scoped to AutoByteus; retain raw/accounting fields, grouping, pricing, row identity, non-AutoByteus visible labels, and the two existing architecture-approved display/migration contracts. Do not add provider identity columns, rewrite canonical identity, store secrets, invent OpenAI/Anthropic snapshots, or rework accounting consumers.
- **Remaining material ambiguity, if any:** None. SR-006 reconciles the AutoByteus-only snapshot requirement with the supported direct Codex/Claude producers, including common top-level/nested payload precedence, conflict flagging, null preservation, persistence round-trip, and migration scope.

| Behavior ID | Kind | Design Alignment With Approved Intent (`Pass`/`Fail`) | Approved Trigger / Contract And Current-State Evidence (`Pass`/`Fail`/`Unclear`) | Target Outcome / Path / Spine Coherence (`Pass`/`Fail`/`Unclear`) | Status (`Confirmed`/`Needs Correction`/`Unclear`) | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `BEH-TOKMODEL-001` | User | Pass | Pass — user opens Token Statistics Model/Task views. | Pass — prior snapshot-first display projection remains coherent. | Confirmed | None. |
| `BEH-TOKMODEL-002` | Contract/data | Pass | Pass — raw identity is current grouping/accounting authority. | Pass — `provider_name` is display metadata only. | Confirmed | None. |
| `BEH-TOKMODEL-003` | User/contract | Pass | Pass — built-in mapping and non-AutoByteus labels are existing behavior. | Pass — snapshot is used only by the AutoByteus display policy. | Confirmed | None. |
| `BEH-TOKMODEL-004` | User/data | Pass | Pass — historical composite `model_value` correction remains approved. | Pass — value migration remains separate and ordered. | Confirmed | None. |
| `BEH-TOKMODEL-005` | Contract | Pass | Pass — exact fallback and legacy lookup contract remains present. | Pass — snapshot-first precedence falls through to the prior exact policy. | Confirmed | None. |
| `BEH-TOKMODEL-006` | Operational/contract | Pass | Pass — existing app-data runner and startup path are evidenced. | Pass — provider-name migration lifecycle is compatible with the runner. | Confirmed | None. |
| `BEH-TOKMODEL-007` | Contract | Pass | Pass — shared accounting consumers are inspected current paths. | Pass — aggregate remains display-context-free. | Confirmed | None. |
| `BEH-TOKMODEL-008` | Contract | Pass | Pass — recursive Task constructors are existing supported paths. | Pass — ordered raw/display entries remain unchanged. | Confirmed | None. |
| `BEH-TOKMODEL-009` | System/contract | Pass | Pass — AutoByteus new-event snapshot requirement is explicit; direct Codex/Claude nullable behavior is also explicitly approved. | Pass — shared AutoByteus snapshot propagation, direct nullable pass-through, common payload precedence, persistence, and AutoByteus-only backfill are mapped. | Confirmed | None. |
| `BEH-TOKMODEL-010` | System/contract | Pass | Pass — both shared AutoByteus normalizers and direct Codex/Claude producers are established supported paths. | Pass — source matrix preserves AutoByteus snapshots and direct nulls through payload, enrichment, forwarding, SQL/Prisma, and read-back. | Confirmed | None. |

## Supplemental Artifact Coherence Verdict

None. No supplemental task artifact applies; the three core solution artifacts and cumulative downstream context are sufficient.

| Artifact | Purpose And Scope Are Clear? (`Pass`/`Fail`) | Linked To Relevant Core Artifacts? (`Pass`/`Fail`) | Internally Complete? (`Pass`/`Fail`) | Consistent With Related Core Artifacts? (`Pass`/`Fail`) | Status And Approval Applicability Are Clear? (`Pass`/`Fail`) | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| None | N/A | N/A | N/A | N/A | N/A | None. |

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | SR-006 classifies this as a persisted-data change: one nullable AutoByteus display snapshot plus schema/ingestion/repository propagation and a second backfill, with direct runtimes explicitly nullable. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | The prior presentation-boundary root cause remains valid; user follow-up adds a self-contained persisted display fact. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | The design retains one column and existing boundaries, rejecting extra provider identity columns/history tables. | None. |
| Refactor decision is supported by concrete design sections or residual-risk rationale | Pass | The source matrix, payload precedence, direct nullable paths, persistence round trips, migration scope, and test obligations are concrete; no identity refactor is introduced. | None. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DS-TOKMODEL-001` | AutoByteus model metadata or direct nullable producer -> token observation/event payload -> ledger row | Pass | Pass — shared AutoByteus normalizers and direct Codex/Claude paths are explicitly mapped, including their different nested/top-level shapes. | Pass | Pass | Pass | Pass | Pass |
| `DS-TOKMODEL-002` | Ledger facts -> display projection -> statistics provider/tree -> GraphQL -> Model/Task UI | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-TOKMODEL-003` | GraphQL response -> Pinia store -> rendered cells/chart | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-TOKMODEL-004` | Startup -> Prisma -> ordered app-data migrations -> corrected ledger/status | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| LLM model/observation identity | Pass | Pass | Pass | Pass | Shared AutoByteus normalizers source `LLMModel.providerName`; direct Codex/Claude paths explicitly preserve nullable provider_name without inventing a label. |
| Token-usage event payload/enrichment | Pass | Pass | Pass | Pass | `createTokenUsageUpdatedPayload` has explicit top-level-first/nested-fallback precedence, conflict flagging, and null preservation; enrichment is pass-through. |
| Ledger repository/Prisma boundary | Pass | Pass | Pass | Pass | One nullable column and round-trip mapping are clear in principle. |
| Statistics provider/display projection | Pass | Pass | Pass | Pass | Snapshot-first lookup/fallback remains a clean boundary. |
| App-data registry/runner/migration DB boundary | Pass | Pass | Pass | Pass | Two ordered migrations, statuses, partial progress, and retries are explicit. |
| GraphQL/frontend boundary | Pass | Pass | Pass | Pass | No raw identity or provider parsing moves into frontend. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime model metadata -> token observation | Pass | Pass | Pass | Pass | AutoByteus snapshots originate from model metadata; direct Codex/Claude remain nullable and do not use statistics-time lookup. |
| Statistics provider -> provider registry | Pass | Pass | Pass | Pass | Registry lookup remains limited to legacy null/empty snapshots. |
| Display projection -> event facts/context | Pass | Pass | Pass | Pass | Pure snapshot-first resolver. |
| Migration -> ledger DB boundary | Pass | Pass | Pass | Pass | Value-only and provider-name updates are isolated and row-preserving. |
| Accounting aggregate consumers | Pass | Pass | Pass | Pass | No provider snapshot/display context added. |
| GraphQL/frontend -> display fields | Pass | Pass | Pass | Pass | Explicit additive contract. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `LlmTokenUsageModelIdentity` / observation builder | Pass | Pass | Pass — shared AutoByteus source list and direct nullable producer boundary are enumerated | Low | Pass |
| `TokenUsageUpdatedPayload` / `createTokenUsageUpdatedPayload` | Pass | Pass | Pass — top-level/nested precedence, conflict flag, and null behavior are explicit | Low | Pass |
| Prisma/SQL repository round trip | Pass | Pass | Pass | Low | Pass |
| Snapshot-first display resolver | Pass | Pass | Pass | Low | Pass |
| Provider-name snapshot migration definition | Pass | Pass | Pass | Low | Pass |
| Existing value migration and runner | Pass | Pass | Pass | Low | Pass |
| GraphQL/store/table display contract | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Built-in/custom provider display metadata | Pass | Pass | N/A | Pass | Reuse `LLMModel.providerName` and existing provider-display mapping. |
| Direct Codex/Claude token events | Pass | Pass | N/A | Pass | Reuse existing direct producers as nullable pass-through paths; no provider-name mapping is invented. |
| Ledger schema/repository | Pass | Pass | N/A | Pass | One nullable mapped column is proportionate. |
| Display projection/accounting aggregate | Pass | Pass | Pass | Pass | Snapshot context remains outside accounting aggregate. |
| App-data migrations | Pass | Pass | Pass | Pass | Reuse runner/registry and add one focused migration. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| LLM catalog and shared normalizers | Pass | Pass | Pass | Pass | Add providerName to existing model identity/observation. |
| Server direct runtime token ingestion | Pass | Pass | Pass | Pass | Direct Codex/Claude producers and forwarders are named, nullable behavior is explicit, and round-trip tests are required. |
| Token-usage ledger persistence | Pass | Pass | Pass | Pass | Prisma/domain/repository nullable field boundary is clear. |
| Statistics/GraphQL/frontend | Pass | Pass | Pass | Pass | Prior implementation architecture remains sound. |
| App-data migration subsystem | Pass | Pass | Pass | Pass | Migration B order/status/recovery are clear. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `providerName` model identity field | Pass | Pass | Pass | Pass | Reuse central identity rather than adding provider identity columns. |
| Ordered raw/display entry | Pass | Pass | Pass | Pass | Unchanged from ARCH-REV-003. |
| Provider-name snapshot classifier | Pass | Pass | Pass | Pass | Migration-owned and distinct from value classifier. |
| Direct producer provider-name mapping | Pass | N/A | Pass | Pass | The deliberate shared structure is null preservation and common payload normalization, not a guessed provider-name mapping. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `provider_name` ledger column | Pass | Pass | Pass | Pass | Pass | One display snapshot; not provider ID, routing, grouping, pricing, or secret. |
| `model_provider` / `model_identifier` | Pass | Pass | Pass | Pass | Pass | Existing provider type and canonical provider-instance identity remain distinct. |
| Observation/domain payload providerName | Pass | Pass | Pass | Pass | Pass | AutoByteus nested snapshot and direct top-level nullable shapes, precedence, and pass-through are explicit. |
| Accounting aggregate/display projection | Pass | Pass | Pass | Pass | Pass | Separate concerns remain tight. |

## File Responsibility Mapping Verdict

| File / Producer | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/utils/llm-token-usage-observation.ts` and normalizers | Pass | Pass | Pass | Pass | Shared model-based path is clear. |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run-token-usage.ts` | Pass | Pass | Pass | Pass | Common payload canonicalization owns top-level/nested precedence, conflict flagging, and null preservation. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-token-usage.ts` | Pass | Pass | N/A | Pass | Direct Codex is an explicitly preserved nullable producer and forwarder. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-token-usage.ts` | Pass | Pass | N/A | Pass | Direct Claude is an explicitly preserved nullable producer and forwarder. |
| `autobyteus-server-ts/src/token-usage/repositories/sql/token-usage-ledger-repository.ts` | Pass | Pass | Pass | Pass | Create/read mapping can carry nullable column. |
| Snapshot/value migrations and registry | Pass | Pass | Pass | Pass | Exact IDs/order/lifecycle are specified. |
| Existing statistics/GraphQL/frontend files | Pass | Pass | Pass | Pass | No new design gap. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm` observation/normalizers | Pass | Pass | Low | Pass | Existing shared model path. |
| `autobyteus-server-ts/src/agent-execution/backends/codex` and `claude` | Pass | Pass | Low | Pass | Direct producer and forwarder files are included as preserved nullable paths with no guessed labels. |
| `autobyteus-server-ts/prisma` and SQL repository | Pass | Pass | Low | Pass | Nullable field mapping is correctly placed. |
| App-data migration modules/registry | Pass | Pass | Low | Pass | Ordered migration ownership is clear. |
| GraphQL/store/table files | Pass | Pass | Low | Pass | Existing presentation boundaries remain correct. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Current-registry lookup for legacy null/empty snapshots | Pass | Pass | Pass | Pass | Retained only as an explicit legacy fallback. |
| Existing raw/display projection | N/A | Pass | Pass | Pass | Snapshot is an additive input, not a replacement. |
| Canonical identity/provider type | N/A | Pass | Pass | Pass | Explicitly retained; no rewrite or extra identity columns. |
| Direct producer paths | N/A | Pass | Pass | Pass | Direct Codex/Claude remain nullable and unchanged; only common pass-through/round-trip coverage is added. |

## Legacy / Backward-Compatibility Verdict

The nullable schema expansion and two app-data migrations are isolated historical handling. Normal statistics uses one current snapshot-first policy with current lookup only for null/empty legacy rows; it does not add version branches or dual-read/write business paths.

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Normal statistics path | No | Pass | Pass | Snapshot-first plus exact legacy fallback is one current display contract. |
| App-data history | Yes — isolated migrations | Pass | Pass | Historical knowledge is confined to migration-owned code. |
| Direct runtime ingestion | No | Pass | Pass | Direct producers retain nullable provider_name and existing model facts; the AutoByteus-only snapshot contract is explicit. |

## Persisted-Data Transition Verdict (When Applicable)

The user-approved transition to one nullable `provider_name` column is proportionate and schema migration is required. Prisma-before-app-data ordering, two migration IDs/order, row-preserving updates, snapshot-first reads, and existing runner status/recovery are evidenced. The AutoByteus-only snapshot contract and direct Codex/Claude nullable contract are explicitly separated before ledger insertion.

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? (`Pass`/`Fail`) | Direct Use, Rebuild, Or Migration Choice Is Proportionate? (`Pass`/`Fail`) | Migration Safety Is Complete If Required? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Nullable `provider_name` for new events | `Migration Required` | Pass | Pass | Pass | Pass | AutoByteus shared snapshots and direct Codex/Claude nullable pass-through are mapped through the common payload and storage boundaries. |
| Legacy composite `model_value` | `Migration Required` | Pass | Pass | Pass | Pass | Prior fixed classifier/value-only migration remains valid. |
| Legacy null/empty `provider_name` | `Migration Required` | Pass | Pass | Pass | Pass | Provider-name migration source, warnings, failure dependency, CAS, and retry are explicit. |
| `model_provider`, `model_identifier`, accounting fields | `Directly Usable — No Migration` | Pass | Pass | N/A | Pass | Must remain untouched by both migrations and ingestion change. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Schema -> app-data migrations -> runtime reads | Pass | Pass | Pass | Pass |
| Model-based ingestion propagation | Pass | Pass | Pass | Pass |
| Direct Codex/Claude ingestion propagation | Pass | Pass | Pass | Pass |
| Snapshot-first display and legacy fallback | Pass | Pass | Pass | Pass |
| GraphQL/frontend contract | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| New custom snapshot | Yes | Pass | Pass | Pass | `provider_name=alibaba_cloud`, `model_provider=OPENAI_COMPATIBLE`, raw composite identity retained. |
| New built-in snapshot | Yes | Pass | Pass | Pass | `provider_name=DeepSeek`, `model_provider=DEEPSEEK`. |
| Snapshot survives rename/deletion | Yes | Pass | Pass | Pass | Snapshot-first example and legacy fallback are explicit. |
| Direct Codex/Claude producer | Yes | Pass | Pass | Pass | Codex/Claude have nullable provider_name, preserve existing model facts, and do not receive guessed OpenAI/Anthropic labels. |
| Provider-name backfill | Yes | Pass | Pass | Pass | Recoverable name, warning, dependency failure, CAS, retry are described. |
| Raw identity/accounting preservation | Yes | Pass | Pass | Pass | Invariants are explicit for schema and both migrations. |

## Material Premise Validation (Only When Needed)

None. The AutoByteus snapshot requirement and direct Codex/Claude nullable behavior are explicitly approved contracts; both producer families are supported current production paths. The review confirms the revised source matrix against inspected code, not a hypothetical failure premise.

## Unresolved Approved-Behavior Or Current-State Gaps

None. The approved intent, AutoByteus-only snapshot scope, direct nullable scope, and relevant production paths are confirmed.

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| None | N/A | N/A | N/A |

## Review Decision

- **Decision:** `Pass`
- **Classification:** None; no requirement gap, design impact, or unclear dependency remains for the approved scope.
- **Rationale:** SR-006 resolves `ARCH-F-006` by limiting snapshots and Migration B to AutoByteus, explicitly preserving nullable direct Codex/Claude paths, and specifying the shared nested/direct top-level payload shapes, precedence, conflict flag, pass-through, storage round trips, and producer-specific tests. The one-column snapshot, display projection, migration lifecycle, and raw/accounting invariants remain proportionate and implementation-ready.

## Findings

None.

## Classification

`Pass` — the target design is ready for implementation; no failure classification applies.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

Provider names remain ingestion-time snapshots for new AutoByteus rows and current/fallback-derived for legacy rows; an old deleted provider cannot be recovered automatically. Direct Codex/Claude rows remain intentionally nullable and their non-AutoByteus labels unchanged. The local database lacks composite `model_value` and provider-name snapshot samples, so implementation must use synthetic fixtures. Downstream implementation/API/E2E/delivery artifacts describe the prior package and are not validation of SR-006; they must be regenerated after implementation rework.

## Latest Authoritative Result

- **Review Decision:** `Pass`
- **Material-Premise Gate:** `Pass`
- **Notes:** `ARCH-REV-005` verifies `ARCH-F-006` resolved in SR-006. The cumulative reviewed package may proceed to `implementation_engineer`; downstream validation must be rerun for the new snapshot schema/ingestion behavior.

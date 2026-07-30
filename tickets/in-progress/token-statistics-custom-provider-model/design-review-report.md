# Design Review Report

## Review Round Meta

- **Upstream Requirements Doc:** `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model/requirements.md`
- **Upstream Investigation Notes:** `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model/investigation-notes.md`
- **Reviewed Design Spec:** `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model/design-spec.md`
- **Supplemental Task Artifacts Reviewed:** None
- **Solution Revision Record Reviewed:** `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model/solution-revision-record.md`
- **Relevant Solution Revision IDs:** `SR-004` current; `SR-003` prior reviewed package
- **Architecture Review Revision Record:** `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model/architecture-review-revision-record.md`
- **Current Architecture Review Revision ID:** `ARCH-REV-003`
- **Current Review Round:** 3
- **Trigger:** Re-review after `ARCH-REV-002` `Fail / Design Impact` and solution revision `SR-004`, which addresses `ARCH-F-001` through `ARCH-F-005`.
- **Prior Review Round Reviewed:** `ARCH-REV-002` — `Fail` / `Design Impact`
- **Latest Authoritative Round:** `ARCH-REV-003`
- **Current-State Evidence Basis:** The revised requirements, investigation notes, design spec, and SR-004 resolutions were independently checked against the inspected ledger/statistics/GraphQL/frontend paths, provider identity construction, app-data registry/runner, startup ordering, and existing token-usage migration boundary. The local database has short `model_value` samples; composite `model_value` deployments are an explicit user-reported supported input to the migration design.

## Upstream Behavior And Production-Path Basis Confirmation

- **Overall Basis Status:** Confirmed
- **Approved requirements / intended behavior understood:** For `runtime_kind = autobyteus`, Token Statistics displays provider name plus model name. Canonical `model_identifier`, raw API fields, grouping, attribution, pricing, counts, row identity, and non-AutoByteus behavior remain unchanged. Historical composite `model_value` rows are handled safely at read time and corrected only by a value-only app-data backfill when they satisfy the explicit classifier.
- **Relevant existing behavior and evidence confirmed:** Current statistics groups by runtime plus canonical model identifier, maps raw identifiers to GraphQL `llmModel`/`models`, and the two tables render those raw fields. AutoByteus custom identifiers use `openai-compatible:<providerId>:<modelName>`. Startup runs Prisma schema migrations before registered app-data migrations; the runner records statuses/logs, continues after a caught failure, retries failed definitions in `runPending()`, and treats warnings as terminal for automatic rerun while allowing explicit retry.
- **Approved change, preserved behavior, and outside scope understood:** Add a pure server-side display projection and explicit GraphQL/frontend display fields; derive Task arrays from one ordered raw/display entry sequence; add a guarded value-only legacy backfill. Do not change provider identity construction, accounting aggregate consumers, raw fields, schema, or provider-name snapshot behavior.
- **Remaining material ambiguity, if any:** None material to the gate. Provider rename/deletion remains an accepted documented residual risk because names are current-config metadata, not snapshots.

| Behavior ID | Kind | Design Alignment With Approved Intent (`Pass`/`Fail`) | Approved Trigger / Contract And Current-State Evidence (`Pass`/`Fail`/`Unclear`) | Target Outcome / Path / Spine Coherence (`Pass`/`Fail`/`Unclear`) | Status (`Confirmed`/`Needs Correction`/`Unclear`) | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `BEH-TOKMODEL-001` | User | Pass | Pass — user opens Token Statistics Model or Task mode. | Pass — provider-aware display projection reaches both table paths. | Confirmed | None. |
| `BEH-TOKMODEL-002` | Contract/data | Pass | Pass — raw identity is the current accounting/grouping and attribution identity. | Pass — raw fields remain separate from display fields and keys. | Confirmed | None. |
| `BEH-TOKMODEL-003` | User/contract | Pass | Pass — built-in mapping and non-AutoByteus labels are existing behavior. | Pass — only the specified AutoByteus presentation changes. | Confirmed | None. |
| `BEH-TOKMODEL-004` | User/data | Pass | Pass — Task mode and recursive rows are current supported paths. | Pass — all four constructors use the same ordered display-entry sequence. | Confirmed | None. |
| `BEH-TOKMODEL-005` | Contract | Pass | Pass — missing/deleted/malformed metadata and provider-map failure are explicitly covered. | Pass — exact nonempty fallback never throws or regroups. | Confirmed | None. |
| `BEH-TOKMODEL-006` | Operational/contract | Pass | Pass — composite `model_value` is an explicit user-reported existing-deployment condition; startup migration is supported. | Pass — fixed classifier, CAS update, statuses, retry, and read-time safety are coherent. | Confirmed | None. |
| `BEH-TOKMODEL-007` | Contract | Pass | Pass — inspected total-cost, run-summary, synthetic summary, and aggregate GraphQL consumers use the accounting aggregate. | Pass — display context is isolated to Model/Task projections. | Confirmed | None. |
| `BEH-TOKMODEL-008` | Contract | Pass | Pass — current recursive constructors derive raw arrays from aggregate observations. | Pass — `TokenUsageModelDisplayEntry[]` is the sole ordered raw/display source with duplicates and empty paths preserved. | Confirmed | None. |

## Supplemental Artifact Coherence Verdict

None. No supplemental task artifact applies; the core artifacts contain the complete requirements, investigation evidence, and design.

| Artifact | Purpose And Scope Are Clear? (`Pass`/`Fail`) | Linked To Relevant Core Artifacts? (`Pass`/`Fail`) | Internally Complete? (`Pass`/`Fail`) | Consistent With Related Core Artifacts? (`Pass`/`Fail`) | Status And Approval Applicability Are Clear? (`Pass`/`Fail`) | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| None | N/A | N/A | N/A | N/A | N/A | None. |

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Requirements/design classify the task as a focused display correction plus isolated value-only legacy backfill; identity rewrite, schema migration, and provider snapshot are out of scope. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Current code leaks canonical provider-scoped identifiers into visible labels; identity construction is intentional; the user supplies the legacy composite-value deployment condition. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | The design keeps the accounting aggregate and storage contract, adds a separate display projection, and extends existing GraphQL/UI paths. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | The design maps ownership, files, sequences, exact fallback/classifier rules, all shared consumers, migration lifecycle, and accepted current-name residual risk. | None. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DS-TOKMODEL-001` | Runtime observation -> ledger event | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-TOKMODEL-002` | Ledger events -> statistics provider/tree -> GraphQL -> Model/Task UI | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-TOKMODEL-003` | GraphQL response -> Pinia store -> rendered cells/chart | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-TOKMODEL-004` | Startup -> Prisma -> app-data runner -> classifier/DB boundary -> corrected ledger values/status log | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Statistics provider / model-display projection | Pass | Pass | Pass | Pass | Provider names are loaded once per query; the pure projection owns policy and display fields. |
| Accounting aggregate | Pass | Pass | Pass | Pass | `getTotalCost`, run-summary, synthetic summary, and aggregate GraphQL consumers remain display-context-free. |
| Task tree builder | Pass | Pass | Pass | Pass | All four constructors and empty paths copy one ordered entry sequence. |
| GraphQL statistics boundary | Pass | Pass | Pass | Pass | Raw and display fields are mapped without frontend parsing. |
| App-data runner/migration DB boundary | Pass | Pass | Pass | Pass | Classifier, CAS update, summary/status, and retry are isolated from normal statistics reads. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime/catalog -> token usage | Pass | Pass | Pass | Pass | Existing canonical identity construction remains unchanged. |
| Statistics provider -> custom provider store | Pass | Pass | Pass | Pass | One query-scoped map; no per-event I/O. |
| Model-display projection -> event facts/context | Pass | Pass | Pass | Pass | Pure resolver; no files, credentials, or registry access. |
| GraphQL/frontend -> display fields | Pass | Pass | Pass | Pass | Frontend does not parse identifiers or call provider catalog APIs. |
| Migration -> ledger DB boundary | Pass | Pass | Pass | Pass | Only validated `model_value` updates; no canonical identity rewrite. |
| Normal statistics -> migration internals | Pass | Pass | Pass | Pass | Read-time resolver is safe before/without migration; migration parsing remains isolated. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `TokenUsageModelDisplayContext` | Pass | Pass | Pass | Low | Pass |
| `buildTokenUsageModelDisplayEntries(events, context)` | Pass | Pass | Pass | Low | Pass |
| `TokenUsageModelDisplayEntry[]` | Pass | Pass | Pass | Low | Pass |
| Accounting aggregate and existing consumers | Pass | Pass | Pass | Low | Pass |
| GraphQL raw/display fields | Pass | Pass | Pass | Low | Pass |
| `TokenUsageLegacyModelValueBackfillMigration` | Pass | Pass | Pass | Low | Pass |
| App-data migration result/status contract | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Canonical identity and short model value | Pass | Pass | N/A | Pass | Existing LLM catalog/observation behavior is retained. |
| Current custom provider names | Pass | Pass | N/A | Pass | Reuse `CustomLlmProviderStore.listProviders()` once per query. |
| Accounting aggregate | Pass | Pass | N/A | Pass | Keep unchanged for all shared accounting consumers. |
| Model/Task display projection | Pass | Pass | Pass | Pass | New focused owner avoids coupling the accounting aggregate to provider context. |
| App-data migration lifecycle | Pass | Pass | Pass | Pass | Reuse registry/runner and injected token-usage DB-boundary pattern. |
| GraphQL/frontend statistics | Pass | Pass | N/A | Pass | Extend existing contract and table/store paths. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| LLM catalog/runtime observation | Pass | Pass | Pass | Pass | Canonical identity remains owned there. |
| Token-usage accounting/projection | Pass | Pass | Pass | Pass | Accounting and display meanings are separate and explicit. |
| Task statistics tree | Pass | Pass | Pass | Pass | Recursive construction consumes aligned entries. |
| GraphQL and frontend statistics | Pass | Pass | Pass | Pass | Explicit display fields reach both tables/chart. |
| App-data migration subsystem | Pass | Pass | Pass | Pass | Fixed registry order and runner lifecycle are recorded. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Pure provider/model display policy | Pass | Pass | Pass | Pass | One server projection serves Model and Task paths. |
| Ordered raw/display entry | Pass | Pass | Pass | Pass | Single source prevents independent array sorting/deduplication. |
| Legacy composite classifier | Pass | Pass | Pass | Pass | Exact grammar/matrix is migration-owned and shared with read-time parsing policy. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `TokenUsageCostSummaryAggregate` | Pass | Pass | Pass | Pass | Pass | Accounting/raw aggregate remains unchanged. |
| `TokenUsageModelDisplayEntry[]` | Pass | Pass | Pass | Pass | Pass | One raw identity plus one presentation label per ordered entry. |
| Model row raw/display fields | Pass | Pass | Pass | Pass | Pass | `modelIdentifier` is identity; `modelDisplayName` is presentation. |
| Task row raw/display arrays | Pass | Pass | Pass | Pass | Pass | Equal-length positional arrays preserve duplicates and empty paths. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `token-usage-model-display-projection.ts` | Pass | Pass | Pass | Pass | Owns pure display policy and ordered entries. |
| `statistics-provider.ts` | Pass | Pass | Pass | Pass | Owns query-scoped provider context and raw Model grouping. |
| `task-statistics-tree-builder.ts` | Pass | Pass | Pass | Pass | Owns recursive rows and all four constructors. |
| `token-usage-cost-summary-aggregate.ts` | Pass | Pass | Pass | Pass | Retains accounting-only contract. |
| `token-usage-legacy-model-value-backfill-migration.ts` | Pass | Pass | Pass | Pass | Owns classification, CAS updates, and outcome summary. |
| GraphQL/store/table files | Pass | Pass | Pass | Pass | Transport and rendering remain at their existing boundaries. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Server token-usage model-display projection | Pass | Pass | Low | Pass | Fits token-usage projection subsystem. |
| App-data migration module/registry | Pass | Pass | Low | Pass | Fits existing migration subsystem and fixed order. |
| GraphQL/store/table changes | Pass | Pass | Low | Pass | Follows current API/frontend ownership. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Raw `llmModel`/`models` visible rendering | Pass | Pass | Pass | Pass | Replace visible use with display fields; retain raw API fields. |
| Frontend provider parsing/catalog lookup | Pass | Pass | Pass | Pass | Explicitly prohibited; none added. |
| Canonical identity/schema/provider snapshot | N/A | Pass | Pass | Pass | Explicitly retained or out of scope; no rewrite/schema migration/snapshot. |
| Runtime inline legacy translation | Pass | Pass | Pass | Pass | Historical correction remains in migration boundary. |

## Legacy / Backward-Compatibility Verdict

No runtime versioned compatibility wrapper or dual-read/dual-write path is proposed. The current resolver accepts the documented value shapes as one current policy; historical grammar and writes are isolated to the app-data migration.

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Normal statistics path | No | Pass | Pass | Raw fields remain current contract; display fields are additive. |
| Historical migration path | Yes — isolated migration-owned parser | Pass | Pass | Does not authorize legacy parsing in normal business paths. |

## Persisted-Data Transition Verdict (When Applicable)

The `Migration Required` choice is supported by the explicit existing-data requirement and representative ledger semantics. The migration is isolated, ordered after Prisma, validates before writing, updates only derived `model_value`, preserves row count/raw identity, records outcomes, and has durable partial-progress/retry behavior. No schema migration or provider-name snapshot is justified for this scope.

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? (`Pass`/`Fail`) | Direct Use, Rebuild, Or Migration Choice Is Proportionate? (`Pass`/`Fail`) | Migration Safety Is Complete If Required? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Legacy composite `model_value` | `Migration Required` | Pass | Pass | Pass | Pass | Fixed ID, scope, anchored grammar, conflict matrix, CAS, statuses, retry, and read-time safety are specified. |
| Canonical `model_identifier` and accounting fields | `Directly Usable — No Migration` | Pass | Pass | N/A | Pass | No rewrite; all raw/accounting invariants remain intact. |
| Provider names | `Directly Usable — No Migration` | Pass | Pass | N/A | Pass | Current registry lookup is approved; immutable historical snapshot remains out of scope. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Server projection and raw/accounting preservation | Pass | Pass | Pass | Pass |
| GraphQL/frontend propagation | Pass | Pass | Pass | Pass |
| Migration rollout and recovery | Pass | Pass | Pass | Pass |
| Generated GraphQL artifacts | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Current custom provider | Yes | Pass | Pass | Pass | `alibaba_cloud:qwen3.8-max-preview`. |
| Built-in/non-AutoByteus behavior | Yes | Pass | N/A | Pass | Existing built-in mapping and unchanged runtime labels. |
| Colon-containing suffix | Yes | Pass | Pass | Pass | `org/model:tag` is preserved after the second delimiter. |
| Deleted/malformed/provider-map failure | Yes | Pass | Pass | Pass | Exact fallback strings and malformed precedence are fixed. |
| Task alignment/cross-runtime collision | Yes | Pass | Pass | Pass | One entry sequence, duplicate preservation, raw fallback for mixed runtimes. |
| Migration partial failure/recovery | Yes | Pass | Pass | Pass | Independent commits, failed-row details, retry skips completed rows. |

## Material Premise Validation (Only When Needed)

None. The composite `model_value` condition is explicit user-provided existing-deployment behavior, not a reviewer-invented edge case. Token Statistics access is a supported user journey, and startup/app-data execution is an established system lifecycle. Runner failure/partial-progress behavior is evidenced current code and is addressed by the design contract.

## Unresolved Approved-Behavior Or Current-State Gaps

None. The approved behavior and relevant production paths are confirmed, and ARCH-F-001 through ARCH-F-005 are resolved in SR-004.

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| None | N/A | N/A | N/A |

## Review Decision

- **Decision:** `Pass`
- **Classification:** None; no requirement gap, design impact, or unclear dependency remains for the approved scope.
- **Rationale:** SR-004 resolves all prior findings with exact contracts and current-code-aligned ownership. The design is implementation-ready and preserves raw/accounting semantics while isolating display projection and historical correction.

## Findings

None.

## Classification

`Pass` — no failure classification applies.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

Provider names are current configuration metadata, so renames change historical friendly labels and deletions use the documented fallback; raw identity remains stable. The local database lacks a composite `model_value` sample, so implementation tests must use synthetic legacy fixtures. Generated GraphQL artifacts and the actual registry/DB adapter wiring must be verified during implementation; these are execution checks, not design blockers.

## Latest Authoritative Result

- **Review Decision:** `Pass`
- **Material-Premise Gate:** `Pass`
- **Notes:** `ARCH-REV-003` passes the cumulative solution package. Handoff to `implementation_engineer` is authorized with the complete reviewed package and this revision record.

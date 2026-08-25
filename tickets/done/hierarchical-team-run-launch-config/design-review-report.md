# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/design-spec.md`
- Supplemental Task Artifacts Reviewed:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/ui-ux-spec.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/hierarchical-launch-configuration-behavior.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/team-execution-tree-v2-contract.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/recovery-audit.md`
- Solution Revision Record Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/solution-revision-record.md`
- Relevant Solution Revision IDs: `SR-015` current; `SR-014` retained as the producer-bounded cleanup basis; `SR-013` retained as the distinct-capability and supported historical-classifier basis; `SR-012` retained as the user-approved shared locked-form basis; `SR-011` and `SR-008` retain their presentation and functional ownership decisions
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-007`
- Current Review Round: `7`
- Trigger: `ARCH-REV-006` failed SR-014 on `AR-001`; SR-015 adds the four mandatory removal/retargeting rows and producer-qualifies the hard block and other relevant exactness instructions without changing behavior.
- Prior Review Round Reviewed: `ARCH-REV-006` / Fail — Design Impact; AR-001
- Latest Authoritative Round: `7`
- Current-State Evidence Basis: SR-015; ARCH-REV-006/AR-001; CRR-021 and its revision entry; API-REV-009 reachability correction; API-REV-010 real-user resolution; commit `003413b05`; current IR-012 source/tests; `codex-app-server-model-normalizer.ts`; current Codex catalog, GraphQL catalog mapping, shared model-config controls, V2 persistence/return projection, and selected-existing TeamRun Settings path.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status (`Confirmed`/`Contradicted`/`Blocked`): `Confirmed`
- Approved requirements / intended behavior understood: Yes. Preserve the shared locked Settings form, immutable stored truth, distinct editable/stored capabilities, and product-grounded stale-enum/removed-field behavior. Remove CR/LF-specific code, styling, and synthetic tests because no named current or released producer creates that premise.
- Relevant existing behavior and evidence confirmed: Yes. IR-011 implements the approved capability/classifier architecture. IR-012 adds only the CR/LF text-input predicate, `whitespace-pre-wrap`, and invented ordinary/LF/CR fixtures. API-REV-009 created its initiating state by page-local Pinia mutation plus arbitrary GraphQLJSON/V2 injection. The current Codex normalizer emits `reasoning_effort` from live `model/list` metadata and optional `service_tier=fast`, but no free-text configuration field.
- Scope guardrail confirmed (`In-Scope Use Cases` / `Out of Scope` / `Preserved Behavior Boundary` / `Review Authority`): Yes. In scope are SR-015 artifact alignment and bounded removal of IR-012-only frontend complexity plus production-grounded fixture names. Synthetic free-text/isolated-CR behavior, hypothetical providers, provenance storage, and a new generic free-text UI contract are out of scope. All IR-011 capability, shared-form, V2, migration, workspace, launch, allocation, and auxiliary-surface owners remain preserved.
- Approved change, preserved behavior, and outside scope understood: Yes. This is cleanup under the user-approved reachability rule, not a new field policy or compatibility promise.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID (`Yes`/`No`): `Yes`; no current blocking finding remains. AR-001 was within BEH-010/R-044/AC-038 and is resolved by SR-015.
- Remaining material ambiguity, if any: None.

| Behavior ID | Kind | Design Alignment With Approved Intent (`Pass`/`Fail`) | Approved Trigger / Contract And Current-State Evidence (`Pass`/`Fail`/`Unclear`) | Target Outcome / Path / Spine Coherence (`Pass`/`Fail`/`Unclear`) | Status (`Confirmed`/`Needs Correction`/`Unclear`) | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass | Pass | Confirmed | Preserve |
| BEH-002 | User | Pass | Pass | Pass | Confirmed | Preserve |
| BEH-003 | Contract | Pass | Pass | Pass | Confirmed | Preserve |
| BEH-004 | Contract | Pass | Pass | Pass | Confirmed | Preserve |
| BEH-005 | System | Pass | Pass | Pass | Confirmed | Preserve |
| BEH-006 | Contract | Pass | Pass | Pass | Confirmed | Preserve |
| BEH-007 | User / Operational | Pass | Pass | Pass | Confirmed | Preserve |
| BEH-008 | System / Contract | Pass | Pass | Pass | Confirmed | Preserve |
| BEH-009 | User | Pass | Pass | Pass | Confirmed | Preserve |
| BEH-010 | User | Pass — all blocking exactness instructions now use the producer-bounded R-044/AC-038 rule | Pass — MP-CR-009 has a named emitted-field path; MP-CR-010 has no independent product producer | Pass — mandatory removals, hard block, sequence, file guidance, and tests now define one clean target | Confirmed | Implement SR-015 and complete source review |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? (`Pass`/`Fail`) | Linked To Relevant Core Artifacts? (`Pass`/`Fail`) | Internally Complete? (`Pass`/`Fail`) | Consistent With Related Core Artifacts? (`Pass`/`Fail`) | Status And Approval Applicability Are Clear? (`Pass`/`Fail`) | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `ui-ux-spec.md` | Pass | Pass | Pass | Pass — explicitly excludes synthetic free-text/CR-LF obligations | Pass — user-approved appearance through SR-012; SR-014/SR-015 apply the reaffirmed reachability rule | None |
| `hierarchical-launch-configuration-behavior.md` | Pass | Pass | Pass | Pass — product-originated history remains authoritative and synthetic fields are excluded | Pass | None |
| `team-execution-tree-v2-contract.md` | Pass | Pass | Pass | Pass — SR-014/SR-015 change no storage contract | Pass — reconstructed semantic equivalence remains confirmed | None |
| `recovery-audit.md` | Pass | Pass | Pass | Pass | Pass — evidence only | Retain in cumulative package |

The investigation notes retain the canonical supplement inventory and distinguish behavior-bearing supplements from downstream evidence. The supplements remain coherent with requirements and SR-015. AR-001 is resolved in the core design without changing any supplement contract.

### Reconstructed V2 Contract Equivalence Confirmation

`ARCH-REV-001` remains authoritative. SR-014/SR-015 change neither the V2 schema nor the V1-to-V2 migration boundary. The stored map remains immutable input; the reachability rule governs acceptance and review scope rather than adding provenance fields or runtime rewriting.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Identifies requirement applicability clarification plus speculative-complexity removal | None |
| Root-cause classification is explicit and evidence-backed | Pass | `Synthetic Reachability Overclassification` is supported by the API correction, commit audit, and absence of a producer | None |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | No new boundary refactor; a bounded cleanup is required while IR-011 remains intact | None |
| Refactor decision is supported by concrete design sections or residual-risk rationale | Pass | Mandatory removal rows, qualified hard block, dependency/interface/file guidance, sequence, and production-grounded tests define the same cleanup contract | None |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 — editable launch journey | Primary End-to-End | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 — hierarchy resolution | Bounded Local | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-003 — full create/planning | Primary End-to-End | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 — persistence/restore | Primary End-to-End | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 — V1-to-V2 migration | Primary End-to-End | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006 — stored return/presentation | Return/Event | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-007 — root-only launch surfaces | Primary End-to-End | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-008 — workspace preparation/admission | Primary End-to-End | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

DS-006 now correctly starts from a supported product-written V2 snapshot and keeps acceptance provenance out of runtime projection. The spine itself is sound; the contradiction is in decommission/acceptance instructions around it.

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Editable form capability | Pass | Pass | Pass | Pass | IR-011 authoring ownership remains intact |
| Stored form capability | Pass | Pass | Pass | Pass | Immutable stored display remains authoring-free |
| `projectStoredTeamRunFormModel` | Pass | Pass | Pass | Pass | No provenance or current-definition dependency is introduced |
| `projectHistoricalModelConfigFields` | Pass | Pass | Pass | Pass | Retain its generic schema/value classification; remove only unsupported dedicated CR/LF policy |
| Provider/catalog producer boundary | Pass | Pass | Pass | Pass | Provider changes define new emitted field shapes and their browser contract |
| Runtime/persistence/migration owners | Pass | Pass | Pass | Pass | Unchanged |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Stored types/projector -> immutable view/display | Pass | Pass | Pass | Pass | SR-013 constraints remain |
| Historical classifier -> exact map + current schema | Pass | Pass | Pass | Pass | No provenance lookup, store access, editable default normalization, or CR/LF-only rule |
| Shared renderers -> classified rows | Pass | Pass | Pass | Pass | No second history UI |
| Review/coverage -> producer-backed path | Pass | Pass | Pass | Pass | Page-local catalog mutation and arbitrary GraphQLJSON cannot establish initiating scope |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| Editable/stored Team and Agent form models | Pass | Pass | Pass | Low | Pass |
| `projectStoredTeamRunFormModel(view)` | Pass | Pass | Pass | Low | Pass |
| `projectHistoricalModelConfigFields(storedConfig, currentSchema)` | Pass | Pass | Pass — field key and exact value | Low | Pass |
| Codex `model/list` -> model catalog schema | Pass | Pass | Pass — model identifier plus emitted parameter names | Low | Pass |
| Existing V2/API/service interfaces | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Shared stored/editable form | Pass | Pass | N/A | Pass | Preserve IR-011 |
| Historical stale-enum/removed-field presentation | Pass | Pass | N/A | Pass | Retain existing classifier/fallback |
| CR/LF-specific presentation | Pass | Pass — remove rather than generalize | N/A | Pass | No supported producer |
| Provider field-shape ownership | Pass | Pass | N/A | Pass | Future producer change owns its semantics and coverage |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Web history presentation | Pass | Pass | Pass | Pass | Keeps IR-011 owners |
| Provider catalog normalization | Pass | Pass | Pass | Pass | Supplies real schema metadata |
| Review/coverage scope | Pass | Pass | Pass | Pass | Must start from a named producer |
| Backend/runtime/persistence/migration | Pass | Pass | Pass | Pass | Explicitly unchanged |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Neutral Team/Agent display vocabulary | Pass | Pass | Pass | Pass | Retain |
| Editable/stored capability families | Pass | Pass | Pass | Pass | Retain |
| Historical field classification | Pass | Pass | Pass | Pass | One pure utility remains sufficient |
| CR/LF special-case helper | Pass | N/A | Pass | Pass | Remove; do not extract or generalize |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Neutral form display fields | Pass | Pass | Pass | Pass | Unchanged |
| Editable/stored specialized subjects | Pass | Pass | Pass | Pass | Unchanged |
| Historical field presentation union | Pass | Pass | Pass | Pass | CR/LF need not become another variant |
| V2 stored configuration | Pass | Pass | Pass | Pass | No provenance field added |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `historicalModelConfigFields.ts` | Pass | Pass | Pass | Pass | Restore IR-011 scalar/schema classification; remove CR/LF predicate |
| `HistoricalModelConfigFallback.vue` | Pass | Pass | Pass | Pass | Remove multiline-only whitespace class |
| `historicalModelConfigFields.spec.ts` | Pass | Pass | Pass | Pass | Retain real reasoning/service-tier mechanics, remove CR/LF fixtures |
| `StoredTeamScopeHistoricalFields.spec.ts` / `MemberOverrideItem.spec.ts` | Pass | Pass | Pass | Pass | Root/nested/Agent coverage should use real emitted field names |
| Other IR-011 form types/projectors/components | Pass | Pass | N/A | Pass | Explicitly unchanged |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/utils/historicalModelConfigFields.ts` | Pass | Pass | Low | Pass | Pure policy stays in place |
| `autobyteus-web/components/workspace/config` fallback/control files | Pass | Pass | Low | Pass | Presentation-only cleanup |
| Focused test files beside owners | Pass | Pass | Low | Pass | Retarget fixtures, do not add a synthetic suite |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `canTextInputRepresentExactly` and CR/LF classification | Pass | Pass — IR-011 schema-valid scalar classification | Pass | Pass | Explicit SR-014 removal row; no replacement helper/flag/provenance branch |
| `whitespace-pre-wrap` multiline-only styling | Pass | Pass — ordinary compact residual styling | Pass | Pass | Explicit removal; no isolated-CR replacement |
| Synthetic ordinary/LF/CR fixtures/assertions | Pass | Pass — `reasoning_effort` / `service_tier` tests | Pass | Pass | Explicit removal; no renamed synthetic equivalent or browser rerun |
| Invented retained fixture names such as `removed_parameter` / `legacy_shape` | Pass | Pass — real emitted field names | Pass | Pass | Explicit retargeting row preserves mechanics while grounding the premise |
| Earlier common model/cards/whole-schema-only path | Pass | Pass | Pass | Pass | Remain removed/replaced |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| IR-012 CR/LF behavior | No | Pass | Pass | Mandatory removal rows and the producer-qualified hard block now agree |
| IR-011 classifier/shared form | No | Pass | Pass | Retain current target directly |
| V1 migration/current runtime | No dual current path | Pass | Pass | Unchanged migration-only V1 knowledge |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? (`Pass`/`Fail`) | Direct Use, Rebuild, Or Migration Choice Is Proportionate? (`Pass`/`Fail`) | Migration Safety Is Complete If Required? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| SR-015 frontend cleanup | `Not Affected` | Pass | Pass | N/A | Pass | No stored data is rewritten and no provenance field is added |
| Existing V1 -> V2 execution tree | `Migration Required` (unchanged) | Pass | Pass | Pass | Pass | ARCH-REV-001 remains authoritative |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Reverse IR-012 source behavior | Pass | Pass — restore exact IR-011 classification | Pass — mandatory removal table and sequence agree | Pass |
| Retarget retained tests to real fields | Pass | Pass | Pass — mandatory removal table and sequence agree | Pass |
| Focused/build/source-review routing | Pass | Pass | Pass | Pass |
| API/E2E handling | Pass | Pass — API-REV-010 is the baseline | Pass — no synthetic CR rerun | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Supported schema drift | Yes | Pass — prior `reasoning_effort` and removed `service_tier=fast` | Pass — `Default`/omission rejected | Pass | Grounded in production metadata |
| Product-reachability gate | Yes | Pass | Pass — invented prompts/arbitrary JSON rejected | Pass | Directly addresses the review failure |
| Bounded cleanup | Yes | Pass in sequence/guidance and mandatory removal table | Pass — broad synthetic obligation is expressly rejected | Pass | AR-001 resolved |
| Shared capability boundary | Yes | Pass | Pass | Pass | Retained from SR-013 |

## Material Premise Validation (Only When Needed)

### `MP-CR-009` — a legitimately persisted model-config field/value can become stale or removed when current catalog metadata changes

- Related approved requirement or established contract: R-044; AC-038; dynamic Codex model-catalog contract
- Relevant behavior ID(s): BEH-010
- Initiating basis kind: `User` plus `System`
- Independent product-supported initiating trigger or applicable governing contract: in the exposed new-TeamRun configuration form, a user selects a Codex model and a configuration value published by that model's live catalog; later, the supported model catalog is refreshed from another `model/list` response and the user opens Settings for the stored TeamRun.
- Support evidence: `CodexModelCatalog.listModels()` invokes the production `model/list` method; `mapCodexModelListRowToModelInfo()` emits `reasoning_effort` enum values and optional `service_tier=fast`; GraphQL maps that schema to the web catalog; the shared model controls emit `llmConfig`; TeamRun launch and V2 persistence retain it; Settings consumes the current catalog against the immutable stored view.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: user chooses Team Definition/model -> server live `model/list` -> web catalog schema -> user selects emitted `reasoning_effort` or `service_tier` -> draft/launch -> complete Team/Agent records -> V2 snapshot -> later catalog refresh has a changed enum or omits `service_tier` -> user selects existing TeamRun/member and opens Settings -> immutable stored adapter -> historical classifier -> normal disabled control or exact residual.
- Lifecycle preconditions and material consequence at the claimed point: the value was supported when written and is absent or invalid under later emitted metadata. Without the retained IR-011 classifier, current-key iteration can hide a removed field and editable default resolution can display a different value.
- Reachability: `Reachable`
- Review consequence / proportionate response: retain the small per-field stale-enum/removed-field classifier and ground tests in `reasoning_effort`/`service_tier`. No provenance storage or provider-specific runtime branch is required.

### `MP-CR-010` — a supported current or released product path persists free-text model-config values containing CR/LF

- Related approved requirement or established contract: R-044 / AC-038 were previously over-applied to this premise
- Relevant behavior ID(s): BEH-010
- Initiating basis kind: `User`
- Independent product-supported initiating trigger or applicable governing contract: None identified.
- Support evidence: the selected current Codex Luna catalog emits no free-text configuration field. API-REV-009 created `ordinary_prompt`/`multiline_prompt` by page-local Pinia catalog mutation and supplied arbitrary values through an isolated GraphQLJSON/V2 fixture. GraphQL JSON acceptance and generic string-schema support are downstream capabilities, not initiating product surfaces.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: None. The normal form cannot author either field; the only demonstrated path begins with synthetic/test-only mutation.
- Lifecycle preconditions and material consequence at the claimed point: the isolated-CR rendering observation occurs only after the test constructs an unsupported field/value state.
- Reachability: `Not Reachable`
- Review consequence / proportionate response: it cannot drive a finding, product behavior, CSS obligation, classifier branch, or browser rerun. Remove the IR-012 machinery that was introduced solely for it and keep the observation non-blocking.

ARCH-REV-006's AR-001 did not depend on MP-CR-010 as a production scenario; it arose from a direct document contradiction. SR-015 resolves that contradiction without changing either premise classification.

## Unresolved Approved-Behavior Or Current-State Gaps

None. Product intent, current production reachability, and design-spec alignment are sufficiently established.

## Review Decision

`Pass` — SR-015 resolves AR-001. The mandatory decommission plan now enumerates every IR-012 removal/fixture-retargeting action, and the hard block plus all relevant dependency/interface/file/sequence/guidance statements consistently limit blocking exactness to values accepted through a named supported current or released catalog and normal launch path. The runtime classifier remains generic and provenance-free. The design is ready for the bounded cleanup implementation.

## Findings

None. AR-001 is resolved by SR-015 and recorded in ARCH-REV-007.

## Classification

`N/A — Pass`. AR-001 is design-resolved; implementation cleanup remains pending.

## Recommended Recipient

`/implementation_engineer`

Implement the bounded clean-cut removal and fixture retargeting exactly as specified, preserve IR-011 and the approved UI, run the focused/build checks, update implementation handoff/revision artifacts, and return through complete source review. Do not route directly to API/E2E or delivery.

## Residual Risks

- Current product source remains at committed IR-012 until implementation removes the unsupported delta.
- Removal must not revert IR-011's distinct capabilities, generic per-field classifier, deterministic ordering, no-duplication, or no-mutation behavior.
- Retained tests must use the real `reasoning_effort` stale-enum and optional `service_tier=fast` removed-field paths at root, nested Team, and Agent scopes; fixture names cannot establish scope by themselves.
- Runtime projection must remain generic and provenance-free. The reachability gate governs requirements/review/coverage, not runtime admission or stored provenance.
- Removing `whitespace-pre-wrap` must be limited to the IR-012 multiline-only addition and preserve ordinary compact residual layout.
- API-REV-010 remains the real-user baseline; no synthetic CR browser rerun is authorized. Complete source review is still required before later gates resume.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate (`Pass`/`Fail`/`Blocked`): `Pass` — MP-CR-009 is Reachable and proportionate; MP-CR-010 is Not Reachable and no longer drives any design instruction or blocking acceptance rule.
- Notes: `ARCH-REV-007` is authoritative for `SR-015`. AR-001 is resolved. Proceed only to implementation engineering for the bounded cleanup, then complete source review.

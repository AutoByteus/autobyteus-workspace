# Design Review Report

## Review Round Meta

- Date: 2026-10-01.
- Canonical ticket directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-mcp-tool-call-presentation/tickets/in-progress/agy-mcp-tool-call-presentation` (relative artifact paths below resolve here).
- Upstream Requirements Doc: `requirements-doc.md`, approved SR-005.
- Upstream Investigation Notes: `investigation-notes.md`, cumulative through SR-005.
- Upstream Solution Revision Record: `solution-revision-record.md`.
- Reviewed Design Spec: `design-spec.md`, SR-005.
- Supplemental Task Artifacts Reviewed: `solution-handoff.md`, `test-repair-scope-inventory.md`, original probe summary, recovered conversation excerpts, implementation/API revision records and reports, DR-003 integration result, delivery revision record and `delivery-evidence/latest-base-20261001/validation-results.json`. Evidence directories remain linked by the cumulative investigation inventory; this review did not rerun or independently recertify every historical log.
- Relevant Solution Revision IDs: SR-005 (current); SR-002 original approval; SR-003/004 recovery chronology.
- Architecture Review Revision Record: `architecture-review-revision-record.md`.
- Current Architecture Review Revision ID: **ARCH-REV-001**.
- Current Review Round: 1.
- Trigger: Solution Designer's recovered combined Architecture Design Complete handoff, Large / High.
- Prior Review Round Reviewed: None. Original independent review N/A is not a Pass.
- Latest Authoritative Round: 1, this report.
- Current-State Evidence Basis: source HEAD `a01cadaea37366fdd6d91196231d1257e25427d2`; local origin/personal `b0b077b02571098a6bf7993ab46b67a69fdb8f9d`, 0 behind / 6 ahead. Read-only source inspection; no test execution, fetch, source edits, push or release in this review.

## Routing Classification Review

- Task size: **Large**.
- Architectural risk: **High**.
- Classification rationale reviewed: multi-owner test recovery plus persisted Team classification and creation ordering, not merely the original AGY projection.
- Independent Architecture Review required: **Yes**.
- Classification evidence or correction required: confirmed; retain this classification downstream. Original Small/Low/direct history is basis-limited.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: **Confirmed**.
- Approved intended behavior: REQ-001..007 / AC-001..008 retain AGY decisions; REQ-008..011 / AC-009..014 recover the user-requested two fixes and finite test repair.
- Approval evidence: original conversation excerpts, especially user lines 315, 995 and 1015 following the defect explanation at 992; current continuation/latest-base direction documented by Solution Designer. This is recovered approval, not a claim that SR-005 existed in September.
- Relevant existing behavior confirmed: AGY converter/projector; Team service/catalog/index store; migration candidate planner, cutover and runner; current Team/shared schemas and readiness index; TESTING.md and historical/current execution records.
- Scope guardrail: UC-001..006 and SCN-001..007; no frontend redesign, replay relabel, arbitrary source repairs, ledger reset or global availability gate. BEH-003/005/006/010 preserved.
- Every prospective blocking Design Impact finding traceable to approved authority: Yes; none retained.
- Remaining material ambiguity: None preventing implementation of this design. Unclassified historical test failures are explicitly investigation work, not permission to change product behavior.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001,002 | System | Pass | Pass — AGY model invokes enabled MCP tool; original stream probe has ACTIVE/DONE wrappers | Pass — DS-001 projects at converter before trace/processors/WS/Activity | Confirmed | Retain name/argument/result coverage |
| BEH-003,005 | Preserved system | Pass | Pass — native provider tool and MCP-named image tool remain distinct | Pass — native-image decision uses provider name, not projection | Confirmed | Preserve negative/native controls |
| BEH-004 | System | Pass | Pass — probe records ERROR with full wrapper and error text | Pass — common projected payload used by failure/denial branches | Confirmed | Retain errors and invocation identity |
| BEH-006 | Preserved user | Pass | Pass — user reopens stored run; history reads stored normalized values, API-REV-001 TC-004 records old-run replay | Pass — unchanged replay, no migration/relabel | Confirmed | Reassess prior evidence only if affected |
| BEH-007 | User/operational | Pass | Pass — REQ-008 explicitly governs launch while index unreadable; service currently preflights before manager | Pass — DS-002 refuses before package materialization, missing index remains valid | Confirmed | Implement/verify existing designed ordering |
| BEH-008 | System/operational | Pass | Pass — supported restart-to-retry after failed historical cutover, current packages coexist under continued app availability | Pass — DS-003 frozen recognizer selects zero-write non-targets | Confirmed | Implement pinned source closure and tests |
| BEH-009 | Operational | Pass | Pass — explicit user request to finish failures; 47-file historical cohort enumerated | Pass — DS-004 fresh builds, isolated state, contract-based repairs, honest dispositions | Confirmed | Complete implementation/API evidence, route new product defects |
| BEH-010 | Preserved contract | Pass | Pass — migration guideline §§1,4–9; runner terminal skip and independent current readiness | Pass — same-ID repair, no global gate, no admission by ledger | Confirmed | Keep terminal/mixed/all-excluded controls |

Production traces independently checked:
- AGY run → backend/converter `tool()` → projected common lifecycle payload → existing trace/processors/WS → Activity; `closeBackgroundTools()` reuses stored common payload. Historical replay stays outside this projection.
- Team launch → GraphQL `agent-team-run.ts` → `TeamRunService.createTeamRun` (root-config delegates here) → catalog strict-read precondition → manager/materializer → catalog record → response. Definition/config/workspace preparation may precede preflight; REQ-008 forbids a new Team package, not all preparatory work.
- Startup/restart → runner `runPending` ledger/prerequisite check → candidate planner reads index/tree → frozen classification or existing conversion/commit → truthful aggregate → current readiness/list/load/restore. Terminal SUCCEEDED and SUCCEEDED_WITH_WARNINGS bypass execution. A failed migration is not proof that all current packages are unavailable.

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| test-repair-scope-inventory.md | Pass | Pass | Pass | Pass | Pass | Populate current per-case dispositions downstream; not a present pass claim |
| Original AGY probe and API evidence | Pass | Pass | Pass | Pass | Pass | Preserve evidence; reuse only on unchanged basis |
| Recovery excerpts, archived logs and snapshots | Pass | Pass | Pass | Pass | Pass | Preserve; obsolete AGY-only separation recommendation is superseded |
| DR-003 integration result and evidence | Pass | Pass | Pass | Pass | Pass | 210 focused tests +13 E2E do not replace full suites |
| IR-001 / API-REV-001 / delivery records | Pass | Pass | Pass | Pass | Pass | Historical Small/Low/N/A statements do not govern SR-005 |

No Product/UI supplement is required: existing renderer consumes changed event values, not a redesigned journey. Investigation's opening SR-002 metadata is stale historical labeling, but its explicitly current SR-005 section and inventory remove substantive ambiguity; tidy on the next owner update, not a blocking redesign.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment present for current posture | Pass | Bug fixes plus test-contract cleanup section | None |
| Root-cause classification evidence-backed | Pass | Projection defect; precondition after side effect; mutable source classifier; test drift separated | None |
| Refactor decision explicit | Pass | Bounded migration-owned frozen recognizer; no runner/catalog rewrite | Implement as designed |
| Decision reflected concretely | Pass | Explicit new directory/API/source pins, planner replacement and removal list | Verify source closure downstream |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | AGY return/event, start/terminal/background closure | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Primary Team launch/refusal | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Primary startup/retry and bounded candidate classification | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Operational test repair/validation | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

Unchanged BEH-006 replay is explicitly described rather than made into a new change owner. The bounded planner flow is additive to the complete startup path, not a substitute for it.

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| AGY converter | Pass | Pass | Pass | Pass | Pure projection, no frontend duplicate |
| Team catalog | Pass | Pass | Pass | Pass | Service calls domain precondition, not store/path parser |
| Migration/candidate planner | Pass | Pass | Pass | Pass | Frozen recognizer private; provisional live import explicitly removed |
| Current package readiness | Pass | Pass | Pass | Pass | Non-target disposition is not runtime admission |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| AGY | Pass | Pass | Pass | Pass | Existing naming constant and provider primitives only |
| Team service/catalog | Pass | Pass | Pass | Pass | Catalog → index store; no service filesystem bypass |
| Migration | Pass | Pass | Pass | Pass | Freeze types/enums/predicates; no live runtime source decoder or reverse runtime import |
| Test harness | Pass | Pass | Pass | Pass | Complete owned setup; no weakened production guards |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| projectAgyMcpToolCall(providerName, params) | Pass | Pass | Pass | Low | Pass |
| projectAgyMcpToolOutput(output) | Pass | Pass | Pass | Low | Pass |
| catalog.assertHistoryIndexReadable() | Pass | Pass | Pass | Low | Pass |
| isReleasedUnversionedFlatTeamTree(raw, expectedRootId) | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| AGY flattened output | Pass | Pass | Pass | Pass | Existing shared envelope projector has a different input contract |
| Team creation precondition | Pass | Pass | N/A | Pass | Extend existing catalog/store |
| Released source recognition | Pass | Pass | Pass | Pass | Small private source snapshot; existing frozen V2 unchanged |
| Test build/isolation | Pass | Pass | N/A | Pass | Existing harness and package tools |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| AGY provider adapter | Pass | Pass | Pass | Pass | Presentation only |
| Team lifecycle/history catalog | Pass | Pass | Pass | Pass | Sequence versus storage precondition distinguished |
| App-data migrations | Pass | Pass | Pass | Pass | Historical source classification only |
| Existing server test owners | Pass | Pass | Pass | Pass | Finite cohort, no general runtime modernization |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Frozen source predicates/types | Pass | Pass | Pass | Pass | Private schema/types split; source pins documented |
| Test graph setup | Pass | Pass | Pass | Pass | Reuse only for same owner's complete dependencies |
| AGY projection | Pass | Pass | Pass | Pass | Existing pure helper reused across events |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| AGY projection | Pass | Pass | Pass | Pass | Pass | Name/arguments only; existing result envelope retained |
| Frozen unversioned source | Pass | Pass | Pass | Pass | Pass | Deliberate source cohorts, distinct Agent/Team IDs, old fields retained only where supported |
| Current persisted/runtime models | Pass | Pass | Pass | N/A | Pass | No new public DTO, schema or compatibility field |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches Intended Owner/Boundary? | Responsibilities Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| agy-mcp-tool-call.ts / agy-stream-event-converter.ts | Pass | Pass | Pass | Pass | Pure mapping versus emission/lifecycle |
| team-run-service.ts | Pass | Pass | N/A | Pass | Ordering only |
| team-run-history-catalog-service.ts | Pass | Pass | N/A | Pass | Readability boundary only |
| agent-org-history-candidate-plan.ts | Pass | Pass | Pass | Pass | Disposition selection, not live-schema ownership |
| released-unversioned-flat-team-shapes/{types,schema,README} | Pass | Pass | Pass | Pass | Pinned source closure/provenance |
| Enumerated test files and owner helpers | Pass | Pass | Pass | Pass | Setup/assertions against independent contracts |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| agent-execution/backends/antigravity/stream | Pass | Pass | Low | Pass | Provider-local |
| agent-team-execution/services; run-history/services | Pass | Pass | Low | Pass | Existing owners |
| app-data-migrations/legacy/released-unversioned-flat-team-shapes | Pass | Pass | Low | Pass | Deliberate migration isolation, not runtime compatibility |
| tests/unit, integration, e2e and existing support | Pass | Pass | Low | Pass | Mirrors tested boundaries |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Live current validator import/local isCurrentTeamRunTree | Pass | Pass | Pass | Pass | Required implementation delta, not already completed |
| Well-formed generic MCP wrapper presentation | Pass | Pass | Pass | Pass | Incomplete-wrapper fallback remains approved |
| Obsolete nested/current-skill test assumptions | Pass | Pass | Pass | Pass | Preserve historical migration fixtures and useful negative assertions |
| Dead compiled test copies | Pass | N/A | Pass | Pass | Explicitly outside this repair; no opportunistic cleanup |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Target runtime | No | Pass | Pass | No legacy source decoder or UI relabel branch |
| Migration frozen source cohorts | No | Pass | Pass | Historical interpretation remains in migration, not runtime |
| Old AGY stored traces | No | Pass | Pass | Approved unchanged data, not parallel behavior code |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| AGY traces | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Same envelope/readers; explicit no old relabel |
| Team index/packages preflight | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Move existing refusal earlier; no data repair |
| Existing Team→Org cutover | Migration Required — same-ID repair | Pass | Pass | Pass | Pass | Existing ordering/commit/source markers and terminal semantics retained |
| Valid unversioned flat Teams | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Frozen non-target recognition is zero-write, not admission |

Pinned code comparison confirms `82996343c` launch parsing required skillAccessMode, while `a01cadaea` removes it and adds optional-on-read collaborators plus collaborator/task identity checks. Design explicitly requires authentic cohorts and a closed frozen dependency set, not a copy importing current enums/normalizers. Known earlier settled/task fields must be represented deliberately. The current candidate does not yet meet that target.

Existing cutover owns target validation, package rename, token attribution, index transition, source retirement and dependency propagation. Same ID addresses eligible pending/failed attempts only. Missing trees retain warning dispositions; malformed sources remain preserved failures; terminal ledgers skip. No new backup, audit, journal or corpus rewrite is introduced. Fixture-based evidence is sufficient to design this bounded classification change; installed-data volume and acceptance measurements remain honestly unmeasured.

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Recovered candidate reconciliation | Pass | Pass | Pass | Pass |
| Frozen recognizer replacement before combined acceptance | Pass | Pass | Pass | Pass |
| Finite test repair → source/test review → full executable validation → delivery | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| MCP name/result projection | Yes | Pass | Pass | Pass | Platform/third-party/fallback examples |
| Index preflight | Yes | Pass | Pass | Pass | Same bytes and same package-root set on rejection |
| Mixed migration retry | Yes | Pass | Pass | Pass | Current A, convertible B, missing C; no manufactured version/collaborator stripping |
| Test repair | Yes | Pass | Pass | Pass | Ordinary regression assertion, not it.fails masking |

## Material Premise Validation (Only When Needed)

The two failure/lifecycle premises are made explicit here because they govern defensive and retry behavior; neither is established solely by a synthetic fixture.

### MP-001 — Launch while the Team index is unreadable

- Related authority: REQ-008 / AC-009; BEH-007/010.
- Initiating basis kind: Contract (supported explicit edge scenario).
- Independent governing contract: user-approved refusal without orphan for an already-unreadable index; migration guideline §1 and preservation rules explicitly require narrow availability rather than destructive repair.
- Support: original defect explanation followed by user inclusion direction, not merely existence of readIndexStrict. No claim that arbitrary corruption is a normal workflow.
- Forward path: user launches a Team through the existing launch/API surface → TeamRunService → catalog read rejects malformed bytes → prior manager-first ordering had materialized a package before rejection. Target preflight runs before that manager call.
- Preconditions/consequence: unreadable index exists at launch; creation already cannot record. Earlier read prevents an unrecorded package while preserving index bytes and unrelated Agent availability.
- Reachability: **Reachable** under the explicit governing edge contract.
- Response: existing catalog read preflight only. No concurrent-tampering transaction or general corruption recovery is justified or required.

### MP-002 — Current flat Team beside historical sources during eligible retry

- Related authority: REQ-009 / AC-010/011; BEH-008/010; migration guideline §§1,4,7.
- Initiating basis kind: Operational/Contract (supported explicit edge scenario).
- Independent trigger: supported correction-and-restart of a failed startup-only migration while independent current work remains available. Existing valid packages, including previously materialized current packages, are not erased by installing the preflight fix.
- Forward path: failed cutover does not lock the app → current Team creation uses current unversioned writer when its own prerequisites permit → correction/restart → runner finds nonterminal ledger → planner enumerates existing Team roots → old frozen V2 classification cannot recognize unversioned tree → existing released-nested classifier rejects it. Target frozen unversioned check instead records zero-write non-target before nested conversion.
- Preconditions/consequence: nonterminal eligible attempt and known current cohort coexist with historical candidates; misclassification produces a failed disposition and prevents clean completion. This does not imply every independent candidate conversion is globally blocked.
- Reachability: **Reachable**; production writer, runner and planner evidence support the approved coexistence lifecycle independently of the proposed recognizer.
- Response: pinned classifier only; no forced terminal replay, new migration ID or admission bypass.

No additional unsupported scenario drives machinery or a finding. Arbitrary post-preflight disk mutation and unknown future formats are not expanded into current requirements.

## Unresolved Approved-Behavior Or Current-State Gaps

None blocking this design review. Current failure origins in the finite test cohort and full combined validation remain downstream deliverables explicitly constrained by REQ-010/011.

## Review Decision

**Pass — ready for implementation reconciliation.** This accepts the SR-005 target design, not the provisional source patch, original API pass as combined evidence, or release readiness.

## Findings

None.

## Classification

N/A — Pass; no Design Impact, Requirement Gap or Unclear blocker.

## Recommended Recipient

Implementation Engineer, subject to the exact returned handoff rule. Preserve Large / High and ARCH-REV-001 / SR-005.

## Residual Risks

- Frozen classifier is not yet implemented; validate full pinned predicate/type closure, historical fields, collaborator variants, negative identity controls and zero-write coexistence in implementation/source review.
- Full unit/architecture, integration and deterministic E2E have not passed on this combined candidate. Historical failures require evidence-backed dispositions; genuine new product defects return upstream.
- DR-003's focused results and original live/browser evidence are basis-limited. Migration startup/restart, independent availability, AGY rendered behavior and refreshed user verification remain under the applicable validation/delivery gates.
- Preflight adds one strict index read and is not a transaction against unsupported concurrent mutations. Existing later failure handling is unchanged.
- Ref freshness is only the inspected local snapshot. Preserve checkpoint 9038c218b and untracked evidence; integration refresh belongs to the owning phase. No push/release authorization is exercised here.
- Cosmetic historical metadata in cumulative investigation should be clarified on its next owner update; current SR-005 authority is already explicit.

## Latest Authoritative Result

- Review Decision: **Pass**.
- Material-Premise Gate: **Pass**.
- Notes: ARCH-REV-001 baseline, SR-005, Large / High. No combined implementation, source-review, full-suite or release pass inferred.

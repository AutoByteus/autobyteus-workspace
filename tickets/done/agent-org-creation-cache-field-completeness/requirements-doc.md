# Requirements — Agent/Org creation cache field completeness

## Document Status
- Package: agent-org-creation-cache-field-completeness; Task project_task_6b9ce371-7593-42d7-9d20-3c637512830a. Owner /software_engineering_team/solution_designer; 2026-10-13.
- Status Approved; requirements baseline R1; current solution revision SR-002 (R1 approval in SR-001). Approved by Solution Designer within separately assigned user direction,2026-10-13; exact informing-message reference: “I’ve approved this follow-up’s requirements within your direction: fix Agent/Org cache completeness while preserving saves, diagnostics and normal edits.” Exact basis REQ001–004/AC001–005/SCN001–004/preserved scope; no behavior-defining supplements.
- Authorities read: solution-designer skill, references/requirements-engineering.md and canonical requirements/investigation/revision templates (current conversation), current worktree root/web/server AGENTS.md, DESIGN.md and TESTING.md. Workspace/base in investigation.
- Behavioral supplements: None. Historical reports/candidate test/patch are evidence and reuse inputs, not approval or Pass.

## Problem And Desired Outcome
Ordinary successful UI creation after catalog loading publishes Agent/Org rows missing diagnostics selected by the current catalog, emitting Apollo missing-field errors. Fix cache completeness while preserving successful saves and authoritative diagnostic values. This is the separately authorized cache follow-up, not reopened Members UI delivery or skill/policy work.

## Current / Desired / Preserved Behavior
| ID | Scenarios | Current evidence-backed behavior | Desired | Preserved |
| --- | --- | --- | --- | --- |
| BEH-001 | SCN-001 | Create shared Agent saves, then fresh row lacks selected loadIssue; six historical real UI errors | Creation result/publication satisfies existing catalog field contract, no missing-loadIssue cache error | Input/save/identity/notifications/detail transition and existing rows |
| BEH-002 | SCN-002 | Create Org saves, then published row lacks selected loadIssues; one historical real UI error | Same completeness without missing-loadIssues cache error | Members/handoffs/identity/revision/create→edit and save failure behavior |
| BEH-003 | SCN-003 | Ordinary Agent/Org edits share incomplete mutation response fragments; normalized prior fields can mask omissions | Complete edit responses/cache rereads, no regression or fabricated diagnostics | Expected revision/omitted-input/ownership and navigation semantics |
| BEH-004 | SCN-004 | Catalog selects authoritative issue fields used by existing warning badges | Preserve current selection/values/readable warning behavior; no suppression or forced null/empty values | Existing diagnostic subfield semantics, null Agent/empty Org healthy values, nonempty current query diagnostics |

## Stakeholders / Actors
Definition authors need successful create/edit and readable catalogs. Operators need useful diagnostic warnings. Implementer/API engineer own current checks and real-cache/source-current app proof; Delivery owns human verification, personal finalization/release decision and cleanup.

## Scope Guardrail (Mandatory)
### In-Scope Use Cases
UC-001 create Agent from loaded Agents catalog (SCN-001); UC-002 create Org from loaded Orgs catalog (SCN-002); UC-003 preserve ordinary edits through shared response contract (SCN-003); UC-004 preserve existing diagnostic field/value readability (SCN-004).
### Out Of Scope
Team mutations/section-order changes, server schema/warning-generation policy, store ownership redesign, persistence/migrations, generic cache machinery/recovery/concurrency/performance redesign, agent execution/model calls, skills/testing/handoff policy changes. Separate process Task4c7b3e0e remains queued, not this work.
### Non-Goals
No universal app-health/security/platform certification or guaranteed repair of unrelated diagnostics. No claim of data loss/remediation: original saves persisted.
### Preserved Behavior Boundary
BEH-001–004 / REQ-002/003 / AC-003/004/005. No removal of useful query fields or production log suppression; no invalid test fixture returns unselected fields to manufacture success.
### Review Authority
Blocking technical findings cite this R1 REQ/AC/BEH or supported contract. New product behavior/policy/migration/Team correction is Requirement Gap requiring approval. Unrelated findings remain accountable separate items; do not silently expand this Task, combine queued process work, or rewrite historical Fail.

## Requirements
| ID | Requirement | Basis |
| --- | --- | --- |
| REQ-001 | Normal Agent and Org creation with an already-loaded catalog publishes complete current-query rows without missing-field errors for loadIssue/loadIssues. | BEH-001/002, API-F001/API-F002 |
| REQ-002 | Preserve returned diagnostic values/subfields and existing query-selected warning data. Healthy Agent null and Org empty list remain authoritative values; do not synthesize false healthy values or suppress useful errors/warnings. | BEH-004, user direction/current field contract |
| REQ-003 | Preserve save/read/navigation/ownership/revision/member/handoff behavior and ordinary edits sharing affected response contracts. | BEH-001–003, Task preservation/update regression intent |
| REQ-004 | Maintain truthful durable regression and source-current app evidence, causal provenance and owned cleanup; prepared candidate is reused only through new-task workflow, not treated as approved. | All scenarios; explicit Task constraints |

## Acceptance Criteria
| ID | Requirement/scenario | Observable result | Verification intent |
| --- | --- | --- | --- |
| AC-001 | REQ-001/004, SCN-001 | Load Agents catalog, create a fresh shared Agent: save succeeds with same returned ID; result and current catalog cache contain explicit server-selected loadIssue, healthy null; no missing-field error, existing row remains | Real stores/current documents/real Apollo cache with selected-response transport; new source-current isolated UI create and persisted readback |
| AC-002 | REQ-001/004, SCN-002 | Load Org catalog, create valid Org: same ID/revision/members/handoffs/save→edit; result/catalog contain explicit loadIssues, healthy []; no missing-field error | Equivalent real-cache regression and source-current isolated UI save/readback |
| AC-003 | REQ-002/003, SCN-003 | Edit both existing definitions: complete response diagnostics and cache-first reread match response/current query; edited values/revision persist, omitted fields not reset | Assert mutation returned selection as well as cache/store reread, because normalized old values can mask missing response fields; relevant existing tests and app edit smoke |
| AC-004 | REQ-002, SCN-004 | Current query/mutation response contract preserves exact named diagnostic subfields and values, including nonempty issue object/list payloads where returned; warning display remains readable, no fake defaulting/filtering/deleted query field | Contract-level selected-response/nonempty-value assertion and existing badge/diagnostic consumer coverage; do not invent invalid-definition save as a new supported journey |
| AC-005 | REQ-003/004, SCN-001–003 | Existing forms/actions/scoped authoring/input projections stay intact; failure paths still visible and safe. Relevant checks/current-built app pass with owned resources cleaned and limits disclosed | Existing Agent/Org store/cache/scoped tests; inspect final app/evidence plus cleanup receipt |

## Relevant Scenarios / Product Journeys
| ID | Actor / coherent goal / independent supported trigger | Steps / expected / alternate | Validity / evidence |
| --- | --- | --- | --- |
| SCN-001 | User creates reusable shared Agent via Agents Create form | Catalog loaded → enter valid fields → Save → existing success/detail/catalog with complete diagnostics; failed save retains existing visible error | Supported Normal Scenario; Agent management doc/UI caller/current store, six historical native errors |
| SCN-002 | User creates Org via Orgs Create with valid referenced member(s) | Catalog loaded → select existing Agent/Team and valid inputs → Save → existing edit view/catalog with complete diagnostics; invalid save remains visibly blocked | Supported Normal Scenario; Org doc/experience/store, real UI error/readback |
| SCN-003 | User edits an existing editable Agent/Org via existing edit form | Load selected definition → edit name/description → Save → existing expected-revision/input/navigation semantics, complete response/reread | Supported Normal Scenario; exposed edit callers/shared fragments, user explicitly requests relevant update regressions |
| SCN-004 | Catalog diagnostic response contract / existing warning consumer | Read a diagnostic-bearing current catalog row → display named file/reason/last-working status; selection/value contract preserved during affected response publication | Supported Normal Scenario, kind Contract (existing catalog warning behavior); current GraphQL types/query/UI docs. Unit populated diagnostic payloads witness contract shape, not a new malformed-save flow |

## UI / Quality / Data / External Contracts
No new UI/UX design requested, Product artifacts/spec/visualizer N/A — not applicable. Existing screens, notifications/errors/actions/readable badges remain authoritative; no visual redesign. QR-001 → REQ-001/002: zero demonstrated missing-field cache errors without suppressing messages. QR-002 → REQ-003/004: selected-response test fidelity, exact source-current app identity and owned cleanup. No new latency/scaling promise or paid inference.
Persisted data affected: No new schema/semantics/format change required; existing save behavior retained, no reset/migration/loss authorized. Existing server GraphQL fields/schema and navigation identities remain dependencies, not new external API. No release authorized by dispatch; Delivery must get current user verification/release decision for this Task. Prior UI no-release approval does not approve cache delivery.

## Supplements / Assumptions / Decisions
Full original Task-context inventory at context-source-inventory.json. Old CRR001/002, API-F001/002 and candidate d8 evidence remain historical, never a current candidate Pass; raw failures and original UI completion unchanged. New Task assignment supersedes stale not-dispatched/UI-IN_PROGRESS statements in imported reports; original UI is DONE and cleaned.
- DEC-001 (Solution Designer, Decided): include ordinary updates as preservation/response completeness because existing create/update reuse the same fragments and Task explicitly requests relevant update regressions; no separate edit redesign.
- DEC-002 (Solution Designer, Decided): preserve diagnostic returned/query values, not change backend issue generation. Evidence shows Org mutation project defaults empty issues and Agent mutation converter is healthy/null; inventing broken-source save would add behavior beyond direction. Nonempty contract fixtures prove pass-through/selection, not unsupported user-save premise.
- DEC-003 (Solution Designer, Decided): reuse full exported four-case test and bounded candidate delta after current-base review; no blind cherry-pick old Task history. Current mutation files equal prepared candidate parent; regression absent from current base. No user decision unresolved in implementation scope.
- Release decision: deferred to current Delivery/user verification, not presumed from prior Task.

## Traceability / Architecture Input
REQ-001→UC001/002, BEH001/002, SCN001/002, AC001/002. REQ-002→UC003/004, BEH003/004, SCN003/004, AC003/004. REQ-003→UC001–003, BEH001–003, AC001/002/003/005. REQ-004→all, AC001–005.
Architecture must verify current complete UI→store→mutation→existing server→cache/query→catalog path and diagnostic owners, current-base candidate applicability and no persistence/server policy delta. Determine smallest coherent correction only after approval.

## Readiness
Content ready: Yes; supported scenario/contract basis, exact causal evidence, desired/preserved scope/testable IDs and decisions established; no Needs user implementation decision or Product supplement. Within-direction approval recorded above; Approved basis ready for architecture: Yes.

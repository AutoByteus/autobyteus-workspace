# Requirements — team-reload-stale-member-instructions

## Document Status
- Status: Approved
- Current revision: SR-003 (approval and completed design); approved intended-behavior baseline: SR-001 requirements with SR-002 evidence (unchanged scope)
- Owner: Solution Designer
- Request: investigate stale Worker content after Agent Teams Reload.
- Approval state: Approved. A-001: user message on 2026-10-03, “cool. approve. now work on it”, immediately following confirmed real-app reproduction and prior proposal of the narrow Team Reload freshness correction.
- Exact approved baseline / approval reference: A-001 approves REQ-001–003, AC-001–004, BEH-001–003, SCN-001–003, UC-001–003 and preserved/non-goal boundaries in the unchanged SR-001 intended-behavior baseline with SR-002 evidence. No behavior-defining supplements. Authorizes advancing the fix workflow, not bypassing checks or separately publishing a release.
- Behavior-defining supplements: None. User screenshots and probe are factual evidence, not a new visual design.

## Problem And Desired Outcome
The public English Bridge Team's Worker source has been updated, but Agent Teams Reload refreshes the Team frontend snapshot without refreshing the already loaded Agent snapshot. Later Worker inspection consequently displays old instructions, description and tools. Proposed success: a successful Reload followed by member inspection displays the current registered source definitions without requiring a separate Agents Reload or app restart.

## Relevant Current And Desired Behavior
| ID / Kind | Scenarios | Evidence-backed current | Desired | Intentionally preserved | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 / User | SCN-001 | Reload refreshes Team but leaves warmed Agent snapshot stale | Latest Team and referenced Agent content after successful Reload | Same Team/member identity, navigation and configured source ownership | E-001–E-014 in investigation notes |
| BEH-002 / User | SCN-002 | Empty Agent snapshot loads on Team inspection | Preserve first-load availability and team-local inspection | Team-local Agents remain scoped; no new standalone catalog visibility/permissions | E-007–E-008 |
| BEH-003 / User | SCN-003 | Reload has loading and error surfaces | Required content refresh failures are treated as Reload failures through existing feedback; not silently complete | Existing retry and loading lifecycle | E-005–E-007; proposed completeness criterion |

## Stakeholders
User inspects the package produced/updated by Agent Package Creator. Creator writes package sources; catalog reads must reflect those sources. Existing runs retain their execution/history semantics; this is definition-catalog freshness, not live agent instruction replacement.

## Scope Guardrail
### In-Scope Use Cases
| ID | Use case | Scenarios |
| --- | --- | --- |
| UC-001 | Refresh already viewed local package definitions via Agent Teams Reload and inspect member | SCN-001 |
| UC-002 | Preserve initial Team/member discovery | SCN-002 |
| UC-003 | Retry unsuccessful catalog Reload | SCN-003 |
### Out Of Scope
Automatic file watching/hot reload; changing public agent package content; GitHub update/download policy; launching or mutating existing runs; Org editor/reference redesign; general catalog cache architecture rewrite; schema/migration/release changes; new ownership/visibility policy.
### Non-Goals
No guarantee of a transactional point-in-time snapshot across files edited concurrently with Reload. No new performance SLA or visual redesign.
### Preserved Boundary
BEH-002/REQ-002/AC-003: source identity and ownership remain unchanged; refreshing definitions must not overwrite source files or saved run/history state.
### Review Authority
A blocking implementation/design finding must trace to approved REQ/AC/preserved behavior. New policies or broader scenarios are Requirement Gaps requiring renewed user approval, not automatic correction. Reviewer comments cannot amend scope.

## Requirements
| ID | Intended outcome | Behavior | Priority / rationale |
| --- | --- | --- | --- |
| REQ-001 | Successful Agent Teams Reload makes current Team and referenced Agent definition fields available for subsequent inspection, including already-viewed team-local members | BEH-001 | Must; user's reported bug |
| REQ-002 | Preserve first-load discovery, member identity/scoping, navigation, saved execution/history data and package source content | BEH-001, BEH-002 | Must; narrow freshness correction |
| REQ-003 | If a required refresh fails, Reload must follow existing failure/loading/retry behavior rather than treating old member content as a successful full refresh | BEH-003 | Must; necessary completeness without redesign |

## Acceptance Criteria
| ID | REQ / Behavior / Scenario | Trigger | Observable outcome / alternate | Verification intent |
| --- | --- | --- | --- | --- |
| AC-001 | REQ-001 / BEH-001 / SCN-001 | View Worker v1; complete source edit to v2; Agent Teams Reload; inspect Team then Worker | Worker instruction, description and tools equal v2, Team remains current, no Agents-page reload/restart needed | Controlled lifecycle regression + browser dev-path; test-owned API/source evidence |
| AC-002 | REQ-001,REQ-002 / BEH-001 / SCN-001 | Repeat edit/Reload/inspection with another version; include existing shared member fixture | Current content each time, same member IDs/navigation; member scope unchanged | Store/component/browser assertions |
| AC-003 | REQ-002 / BEH-002 / SCN-002 | First Team inspection; successful subsequent Reload | Initial member inspection still works; private members not promoted; source definitions and saved runs/history not rewritten by catalog operation | Appropriate scoped regression / write-path review |
| AC-004 | REQ-003 / BEH-003 / SCN-003 | Required refresh/read fails; retry after recovery | Existing failure path engaged, loading ends; retry can publish current definitions; no silent successful full-refresh claim | Failure injection store/component checks |

## Relevant Scenarios And Journeys
| ID / Kind | Actor / goal / trigger | Starting state / product-level steps | Expected / alternate | Validity / evidence |
| --- | --- | --- | --- | --- |
| SCN-001 / User | User wants current package after creator update; Agent Teams Reload | Registered local package already viewed → creator completes update → Reload → Team detail → Worker View Agent → inspect content; may repeat | Updated Team and Worker. Failure follows SCN-003 | Supported Normal Scenario; user request/screenshots, public source and existing Reload/View Agent surfaces E-001–E-010 |
| SCN-002 / User | User inspects first loaded Team | Catalog/Agent state initially empty → load Team → inspect member | Existing initial discovery and scopes preserved | Supported Normal Scenario; E-007 |
| SCN-003 / User | User retries failed Reload | Reload encounters required catalog failure → existing feedback → retry | No successful full-refresh claim on failure; retry works after recovery | Supported Explicit Edge Scenario; existing loading/error lifecycle E-005–E-007, proposed completeness requirement |

## UI / Interaction
Applicable: Yes, freshness on existing surfaces only. Existing Reload, loading/error, Team/member navigation remain. No new layout, prototype, Product ticket, UI/UX spec, normative screenshot baseline or new control required: N/A — not applicable. Screenshots are bug evidence only.

## Quality And Non-Functional Requirements
QR-001 / REQ-001,REQ-003 / Reliability: repeated successful reloads show current content; failures use existing failure lifecycle. No unsupported performance/security/compatibility commitment added.

## Data Continuity And Acceptable Loss
Persisted data affected by proposed change: No intended writes. Preserve source definitions/configuration, saved run/history data, identities and ownership. In-memory catalog snapshots may be refreshed; no persisted loss/reset authorized. Migration obligations: none established.

## Contracts / Supplements / Assumptions
Existing registered package source and ownership contracts continue. User's installed source registration/build were not read; source-copy/GitHub update concerns remain outside this directly reported local-source scenario. Real unchanged-worktree packaged-app reproduction performed with native UI and isolated HTTP; see browser-reproduction-report.md. No post-fix validation performed. Evidence: investigation-notes.md and its supplement inventory; no behavior-defining supplement.

## Open Decisions
DEC-001: Resolved by A-001 — user approved the evidenced narrow fix and asked to proceed. Applicable implementation/validation/delivery gates remain; release authorization not inferred.

## Traceability
REQ-001 → UC-001 → BEH-001 → SCN-001 → AC-001,002.
REQ-002 → UC-001,002 → BEH-001,002 → SCN-001,002 → AC-002,003.
REQ-003 → UC-003 → BEH-003 → SCN-003 → AC-004.

## Architecture Phase Input
Approved basis: A-001 / SR-003. Verify catalog publication ordering, error propagation and scoped definition freshness against current code; technical design lives in design-spec.md. Preserve existing backend behavior and data ownership. Source registration/installed-version uncertainty remains explicit.

## Readiness Check
Current behavior evidence-backed: Yes (controlled probe plus real isolated packaged-app reproduction).
Desired/preserved behavior, scope, testable traceability, supported scenarios and uncertainties: Yes.
Product/prototype approval: N/A. Content ready for approval: Yes.
User approval / exact approved basis / ready for architecture design: Yes, A-001. Next action: completed design and classification route govern implementation; no change to intended scope.

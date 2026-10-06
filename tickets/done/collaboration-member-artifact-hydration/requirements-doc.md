# Requirements Document

## Document Status

- Status: `Approved` for the user-approved basis only: REQ-001..REQ-004 (Team and Agent Org members, consistent with standalone agents). REQ-005 and REQ-006 were authored by Solution Designer without explicit user approval and are **not** part of the approved basis (see design-principles-recheck.md RF-1/RF-2 and §Unapproved Items).
- Current solution revision ID: `SR-003`
- Package identifier: `collaboration-member-artifact-hydration`
- Request / ticket: The Artifacts tab of an Agent Team member or Agent Org member must load its full list after a page reload and on historical runs, consistent with standalone agents.
- Requirements owner: Solution Designer
- Date: 2026-10-06
- Approval state and reference (user, 2026-10-06):
  1. In the predecessor ticket, the user agreed to the proposed behavior: "When you open a team run or select a member, the frontend loads that member's artifact list from the server, for both active and older runs." User: "i guess stay consistant?" → "agreed. but lets finish this current bug ticket first. and then work on this one right?"
  2. On bootstrapping this ticket: "lets bootstrap the "the team-member Artifacts ticket." ticket. does agent org has the same issue? if it has the same issue lets fix it here as well". Investigation confirmed that Agent Orgs have the same gap, which brings Org members into the approved scope.
  3. Correction (SR-003): REQ-006 (standalone-agent collaborators) had been marked approved "subject to veto". That is not explicit approval, so it was moved to §Unapproved Items. The user instructed "works on your ticket" while the decision was pending, so the design proceeds on the approved basis only.
- Exact approved requirements baseline: SR-003 (this document): REQ-001..REQ-004 with AC-001..AC-007. REQ-005 is withdrawn; REQ-006 and its UC-004 / SCN-006 / AC-008 / BEH-006 are pending.
- Behavior-defining supplements: None.

## Problem And Desired Outcome

- Problem: Team-member and Org-member Artifacts lists are populated only by live `FILE_CHANGE` events. After a page reload, or for a historical run, the list shows "No touched files yet", although the server returns the correct entries.
- Desired outcome: collaboration members behave like standalone agents. Their Artifacts list loads from the server when the member's view is hydrated, and live events keep updating it.
- Observable success: after reloading the page on an active Team/Org run, or opening a historical one, selecting a member shows all of its recorded artifacts, and each previews.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Current Behavior | Desired Behavior | Preserved Behavior | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | Active Team run, after reload: member Artifacts empty | Full list shown | Live updates continue | investigation-notes BEH-001 |
| BEH-002 | User | SCN-002 | Historical Team run: member Artifacts empty | Full list shown | — | BEH-002 |
| BEH-003 | User | SCN-003, SCN-004 | Org run (active after reload / historical): member Artifacts empty | Full list shown | Live updates continue | BEH-003 |
| BEH-004 | User | — | Standalone agent open loads artifacts | Unchanged | Fully preserved | BEH-004 |
| BEH-006 (pending REQ-006; out of scope) | User | SCN-006 | Collaborator of a standalone agent, after reload/historical: Artifacts empty (hydration loads conversation/activity only: `agentRunCollaborationHydration.ts`) | Full list shown | Live updates continue | investigation-notes (Architecture Findings) |
| BEH-005 | User | SCN-005 | Live FILE_CHANGE adds/updates member rows | Unchanged; live rows are never lost or reverted by hydration | Preserved | BEH-005 |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Constraint |
| --- | --- | --- | --- |
| User working in Team/Org runs | Inspect member output at any time | Complete artifact list per member | Same behavior as standalone agents |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | View a Team member's artifacts (active after reload, historical) | SCN-001, SCN-002 |
| UC-002 | View an Org member's artifacts (active after reload, historical), including members inside nested teams of an Org | SCN-003, SCN-004 |
| UC-003 | Live artifact updates during hydration | SCN-005 |
| UC-004 (pending REQ-006; out of scope) | View artifacts of a collaborator started by a standalone agent (active after reload, historical) | SCN-006 |

### Out Of Scope

- Server changes (the server already serves Team and Org member runIds).
- The frontend "deleted or moved" 404 wording (predecessor RSK-001).
- The pre-existing failing server integration test "hydrates historical AutoByteus team-member file changes" (predecessor NOTE). It may be fixed only if verification needs it, and must be recorded either way.
- Mobile Artifacts view changes beyond what the shared store already provides.

### Non-Goals

- No new UI, and no change to artifact rendering.

### Preserved Behavior Boundary

BEH-004, BEH-005; REQ-004.

### Review Authority

- Blocking findings must cite an approved REQ/AC/BEH ID.
- New behavior/policy proposals are a `Requirement Gap` needing user approval.
- Adjacent concerns are non-blocking recommendations.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | When a Team member's view is hydrated from the server (member selection/inspection on an active run after reload, or on a historical run), its Artifacts list contains every artifact the server has recorded for that member run. | BEH-001, BEH-002 | High | Consistency with standalone | User approval |
| REQ-002 | When an Agent Org run is opened/hydrated (active after reload, or historical), each member's Artifacts list contains every artifact the server has recorded for that member run. | BEH-003 | High | Same gap in Orgs | User approval ("fix it here as well") |
| REQ-003 | Artifact hydration must not drop, duplicate or revert artifacts delivered by live `FILE_CHANGE` events for the same member, including events that arrive while hydration is in flight. | BEH-005 | High | Live correctness | Standalone parity |
| REQ-004 | Standalone agent artifact behavior is unchanged. | BEH-004 | High | No regression | Preserved |
| ~~REQ-005~~ (withdrawn, never approved) | An artifact-loading failure for a collaboration member must not block hydration of that member's conversation/activity, or of other members. The member's list keeps whatever live entries it has, and the failure is logged. (The standalone open path, which fails as a whole today, is unchanged per REQ-004.) | BEH-001..003 | Medium | One member must not break a whole Team/Org view | Investigation: standalone throws on file-change errors (`runContextHydrationService.ts`) |
| ~~REQ-006~~ (pending user decision; not in approved basis) | When a standalone agent's collaborators are hydrated (active after reload, or historical), each collaborator's Artifacts list contains every artifact the server has recorded for that collaborator run. | BEH-006 | High | Same gap, same consistency rule | User instruction to fix the same issue; flagged for veto |

## Acceptance Criteria

| AC ID | Requirement IDs | Behavior / Scenario IDs | Preconditions / Trigger | Expected Outcome | Alternate / Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-001 / SCN-001 | Active Team run whose member has ≥ 2 artifacts; reload page; select member; open Artifacts | All artifacts listed; each previews | — | Browser E2E + unit |
| AC-002 | REQ-001 | BEH-002 / SCN-002 | Historical Team run; open; select member | All artifacts listed; each previews | 404 if file deleted (existing behavior) | Browser E2E + unit |
| AC-003 | REQ-002 | BEH-003 / SCN-003 | Active Org run with artifacts (incl. a member of a nested team); reload; open; select member | All listed; previews | — | Browser E2E + unit |
| AC-004 | REQ-002 | BEH-003 / SCN-004 | Historical Org run; open; select member | All listed | — | Browser E2E + unit |
| AC-005 | REQ-003 | BEH-005 / SCN-005 | Live FILE_CHANGE for a member arrives before/while hydration completes | Final list contains the live entry with its latest status, and no duplicates | — | Unit (race ordering) |
| AC-006 | REQ-004 | BEH-004 | Standalone open | Unchanged; existing tests pass | — | Existing tests |
| AC-007 | REQ-001, REQ-002 (preserved per-path failure behavior on the member paths; no new policy) | BEH-001..003 | `getRunFileChanges` fails for a member | Behaves exactly like a failure of that member's projection in the same path: Team focused member → the open fails as today; Team non-focused member → the member is left unhydrated as today; Org member → the Org open fails as today. No new failure policy. | — | Unit |
| ~~AC-008~~ (pending with REQ-006) | REQ-006 | BEH-006 / SCN-006 | Standalone agent with a collaborator that produced ≥ 1 artifact; reload; open host run; select collaborator | All of the collaborator's artifacts listed; previews | If the server cannot resolve the collaborator runId, return a Design Impact | Browser E2E or unit + server probe |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Starting Condition | Steps | Expected Outcome | Alternate | Validity | Evidence | Req/AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User | Review a Team member's output | Select member | Active Team run, page reloaded | Reload → open run → select member → Artifacts | Full list | — | Supported Normal Scenario | Predecessor B-003 | REQ-001/AC-001 |
| SCN-002 | User | User | Review past Team output | Select member | Historical Team run | Open → select member → Artifacts | Full list | 404 if file deleted | Supported Normal Scenario | Predecessor B-004 | REQ-001/AC-002 |
| SCN-003 | User | User | Review an Org member's output | Open Org run, select member | Active Org run, reloaded | as SCN-001 | Full list | — | Supported Normal Scenario | Code + server probe | REQ-002/AC-003 |
| SCN-004 | User | User | Review past Org output | Open Org run | Historical Org run | as SCN-002 | Full list | — | Supported Normal Scenario | Code + server probe | REQ-002/AC-004 |
| SCN-006 (pending REQ-006; out of scope) | User | User | Review a collaborator's output | Select collaborator of a standalone run | Active (reloaded) or historical host run | Open host run → select collaborator → Artifacts | Full list | — | Supported Normal Scenario | Code | REQ-006/AC-008 |
| SCN-005 | System | Live stream | Keep live rows correct | FILE_CHANGE during hydration | Active run | Event arrives before or while the fetch is in flight | Latest state is kept | — | Supported Normal Scenario | Store semantics | REQ-003/AC-005 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` (existing UI; data completeness only). Product design fields: `N/A — not applicable`.

## Quality And Non-Functional Requirements

| Quality ID | Related | Area | Constraint | Scope | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-002 | Performance | At most one additional `getRunFileChanges` request per member hydration (no polling) | Team/Org | Code review |

## Data Continuity And Acceptable Loss

- Persisted data affected: `No`.

## External Contracts And Dependencies

| Contract | Constraint | Authority | Risk |
| --- | --- | --- | --- |
| GraphQL `getRunFileChanges(runId)` | Unchanged; resolves Team/Org member runIds | Server code + probe | None |

## Supplemental Artifacts

| Artifact Path | Purpose | Related | Status | Approval |
| --- | --- | --- | --- | --- |
| Predecessor ticket folder (`tickets/done/run-file-change-live-projection-ownership/`) | Origin evidence | REQ-001 | Final | Evidence only |

## Assumptions

| ID | Assumption | Validation | Status |
| --- | --- | --- | --- |
| ASM-001 | Live FILE_CHANGE routing for Org members works (shared adapters) | AC-005 / E2E | Open (code-evident) |

## Open Decisions And Questions

None.

## Traceability

| Requirement | Use Cases | Behaviors | ACs | Scenarios |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001, BEH-002 | AC-001, AC-002 | SCN-001, SCN-002 |
| REQ-002 | UC-002 | BEH-003 | AC-003, AC-004 | SCN-003, SCN-004 |
| REQ-003 | UC-003 | BEH-005 | AC-005 | SCN-005 |
| REQ-004 | — | BEH-004 | AC-006 | — |
| ~~REQ-005~~ (withdrawn) | — | — | — (AC-007 now traces to REQ-001/REQ-002) | — |
| ~~REQ-006~~ (pending; out of scope) | UC-004 | BEH-006 | AC-008 | SCN-006 |

## Architecture Phase Input

- Map SCN-001..005 onto the Team member and Org staging hydration owners.
- (SR-003) REQ-005 is withdrawn. Member artifact-fetch failures follow each path's existing projection failure policy (AC-007). This failure premise (MP-001 in ARCH-REV-001) is out of scope by default, and no machinery is added for it.

## Readiness Check

### Content Ready For Approval

- All items: `Yes`. Product design: `N/A`.

### Approved Basis Ready For Design

- User approval received: `Yes` (see Document Status)
- Ready for architecture design: `Yes`

## Unapproved Items (SR-003)

| Item | Origin | Status | Effect on this ticket |
| --- | --- | --- | --- |
| REQ-006 / UC-004 / SCN-006 / AC-008 / BEH-006: standalone-agent collaborators | Solution Designer investigation (same gap; evidence: `AgentRunTaskRows.vue`, `ArtifactsTab.vue:41`) | **Pending explicit user decision** | Out of the design and implementation scope until approved; can be added as a later revision |
| REQ-005: new best-effort failure policy for artifacts | Solution Designer | **Withdrawn** (never approved; it diverged from existing per-path policies) | Replaced by the preserved behavior in AC-007: artifacts follow the member projection's existing failure policy |

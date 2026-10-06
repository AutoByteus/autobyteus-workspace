# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `standalone-collaborator-artifact-hydration`
- Request / ticket: Collaborators started by a standalone agent must show their full Artifacts list after a page reload and on historical runs, consistent with standalone agents, Team members and Org members.
- Requirements owner: Solution Designer
- Date: 2026-10-06
- Approval state and reference: explicit user approval, 2026-10-06: "i want to have collaboros of standa aloen agents to be fixed as well." This was given in reply to the reported gap: predecessor `collaboration-member-artifact-hydration` REQ-006, which was held there pending this decision.
- Exact approved requirements baseline: SR-001 (REQ-001..REQ-003, AC-001..AC-005).
- Behavior-defining supplements: None.
- Authorities read: `references/requirements-engineering.md` (see investigation-notes Authorities read).

## Problem And Desired Outcome

- Problem: a collaborator's Artifacts list is populated only by live `FILE_CHANGE` events. After a reload, or on a historical host run, it shows "No touched files yet", although the server records the artifacts.
- Desired outcome: collaborator hydration loads the collaborator's artifacts from the server, exactly as Team and Org member hydration now do.
- Observable success: reload, or open a historical standalone run that has a collaborator with artifacts; select the collaborator. All of its artifacts are listed and preview.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenarios | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001, SCN-002 | Collaborator Artifacts empty after reload / on history | Full list | Live updates; the existing hydration failure behavior | investigation-notes BEH-001 |
| BEH-002 | User | SCN-003 | Live `FILE_CHANGE` merges | Unchanged; hydration never drops or reverts newer live entries | Preserved | BEH-002 |
| BEH-003 | User | — | Standalone / Team / Org Artifacts correct | Unchanged | Preserved | BEH-003 |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Outcome | Constraint |
| --- | --- | --- | --- |
| User working with agent-initiated collaborators | Inspect a collaborator's output at any time | Complete artifact list | Same behavior as other members |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Scenarios |
| --- | --- | --- |
| UC-001 | View a collaborator's artifacts after reload or on a historical host run | SCN-001, SCN-002 |
| UC-002 | Live collaborator artifact updates around hydration | SCN-003 |

### Out Of Scope

- Server changes.
- FUP-001: the cost of root-less member lookups on the server, and eager per-member artifact loading at open (a follow-up candidate, to be raised with the user separately).
- Predecessor RSK-001 ("deleted or moved" wording).
- Pre-existing failing web tests (`teamTaskApprovalHydration` ×18, `AgentCompactionLiveFlow`, `workspaceSelectionComposition`).

### Non-Goals

- No UI change.

### Preserved Behavior Boundary

BEH-002, BEH-003; AC-004, AC-005.

### Review Authority

Blocking findings must cite an approved ID. New behavior or policy is a `Requirement Gap` needing user approval.

## Requirements

| Requirement ID | Requirement | Behaviors | Priority | Rationale | Source |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | When a standalone run's collaborators are hydrated (active after reload, or historical), each collaborator's Artifacts list contains every artifact the server has recorded for that collaborator run. | BEH-001 | High | Consistency with the other member types | User approval 2026-10-06 |
| REQ-002 | Collaborator artifact hydration must not drop, duplicate or revert artifacts delivered by live `FILE_CHANGE` events, including events arriving during hydration. | BEH-002 | High | Live correctness | Parity with Team/Org |
| REQ-003 | Standalone, Team and Org artifact behavior, and the collaborator hydration's existing failure behavior, are unchanged. A collaborator artifact-fetch failure behaves like a failure of that collaborator's projection (the collaboration hydration fails as today); no new failure policy is added. | BEH-003 | High | No regression; no unrequested policy | Predecessor SR-003 rule |

## Acceptance Criteria

| AC ID | Requirements | Behavior / Scenario | Trigger | Expected Outcome | Alternate | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-001 / SCN-001 | Active standalone run with a collaborator that produced ≥ 2 artifacts; reload; select the collaborator; open Artifacts | All listed; each previews | — | Browser E2E (creates a collaborator run) + unit |
| AC-002 | REQ-001 | BEH-001 / SCN-002 | Historical host run; open; select the collaborator | All listed; each previews | 404 if the file was deleted (existing) | Browser E2E + unit |
| AC-003 | REQ-002 | BEH-002 / SCN-003 | Live `FILE_CHANGE` arrives before or while hydration commits | Latest entry kept, no duplicates | — | Unit |
| AC-004 | REQ-003 | BEH-003 | Standalone, Team, Org open | Unchanged; existing tests pass | — | Existing tests |
| AC-005 | REQ-003 | BEH-001 | `getRunFileChanges` fails for a collaborator | Same outcome as that collaborator's projection failure today | — | Unit |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Start | Steps | Outcome | Alternate | Validity | Evidence | Req/AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User | Review a collaborator's output | Select a collaborator task row | Active host run, page reloaded | Reload → host run → collaborator row → Artifacts | Full list | — | Supported Normal Scenario | `AgentRunTaskRows.vue`, `ArtifactsTab.vue:41`, `agentRunCollaborationHydration.ts` | REQ-001 / AC-001 |
| SCN-002 | User | User | Review past collaborator output | Select a collaborator task row | Historical host run | Open → collaborator → Artifacts | Full list | 404 if the file was deleted | Supported Normal Scenario | Same | REQ-001 / AC-002 |
| SCN-003 | System | Live stream | Keep live rows correct | `FILE_CHANGE` during hydration | Active run | Event before or while committing | Latest kept | — | Supported Normal Scenario | Store merge rule | REQ-002 / AC-003 |

## UI, Interaction, And Experience Requirements

- Applicable: `No`. Product design fields: `N/A — not applicable`.

## Quality And Non-Functional Requirements

| Quality ID | Related | Area | Constraint | Scope | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001 | Performance | One `getRunFileChanges` request per collaborator per hydration, as for Team/Org members; no polling | Collaborators | Code review |

## Data Continuity And Acceptable Loss

Persisted data affected: `No`.

## External Contracts And Dependencies

| Contract | Constraint | Authority | Risk |
| --- | --- | --- | --- |
| `getRunFileChanges(runId)` | Unchanged; resolves collaborator runIds via `StandaloneRootLocationService` | Server code | Not probed live (no data on node); API/E2E verifies (UNK-001) |

## Supplemental Artifacts

None (predecessor folder is evidence only).

## Assumptions

| ID | Assumption | Validation | Status |
| --- | --- | --- | --- |
| ASM-001 | The server resolves collaborator runIds for `getRunFileChanges` and `/file-change-content` | AC-001/AC-002 E2E | Open (code-evident) |

## Open Decisions And Questions

None for this ticket (FUP-001 is a separate follow-up question).

## Traceability

| Requirement | Use Cases | Behaviors | ACs | Scenarios |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-002 | SCN-001, SCN-002 |
| REQ-002 | UC-002 | BEH-002 | AC-003 | SCN-003 |
| REQ-003 | UC-001 | BEH-001, BEH-003 | AC-004, AC-005 | — |

## Architecture Phase Input

- Map SCN-001..003 onto collaborator staging and the shared member-run state owner.

## Readiness Check

### Content Ready For Approval

- All items `Yes`; Product design `N/A`.

### Approved Basis Ready For Design

- User approval received: `Yes` (Document Status). Ready for design: `Yes`.

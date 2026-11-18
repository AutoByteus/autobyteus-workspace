# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `application-reentry-worker-stopped` (Project Task `autobyteus-296`)
- Request / ticket: autobyteus-296. Application reload or repair leaves a previously active application quarantined: make it return to active, and make the quarantine say why (FU-003 and FU-002 of autobyteus-238); plus the user's request (comment of 2026-10-24) to report design issues in the application SDK and framework
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on behalf of the user
- Requirements owner: Solution Designer
- Date: 2026-10-24
- Approved by and reference: `Solution Designer within the direction (user informed)`. Reference: the Solution Designer's conversation message of 2026-10-24 (SR-001)
- Exact approved requirements baseline / solution revision: this document at SR-001
- Behavior-defining supplements: none (`application-framework-design-findings.md` is a report, not behavior)

## Problem And Desired Outcome

- Problem: a package reload or the app-scoped repair of an ACTIVE application ends QUARANTINED ("…currently reentering…"; launch settings 503) when the application's worker calls the host as it starts (Brief Studio). The repair cannot recover an application quarantined at import (Codex signed out) after the user signs in. A quarantine after a live catalog change does not say why.
- Desired outcome: reload and repair return a previously active (or, for repair, a now-ready) application to ACTIVE with its worker stopped, as the docs describe. Pending events resume. The quarantine names the readiness reason, as at startup. The user receives a ranked report of design issues in the application SDK and framework.
- Observable definition of success: the durable e2e shows Brief Studio usable after a package reload and after a repair; an application imported while Codex is signed out says why in its quarantine, and after sign-in a repair makes it ACTIVE and usable without a restart.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenario IDs | Current Behavior | Desired Behavior | Preserved Behavior | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User/System | SCN-001, SCN-002 | Reentry recovers bindings, starts the worker while REENTERING, resumes dispatch, then activates. A worker that calls the host fails, and the app is quarantined | Reentry recovers bindings, activates (ACTIVE), resumes pending-event dispatch; the worker stays stopped until something needs it (ensure-ready, an application tool call, a pending event) | Participant preparation (admission closed, calls drained, worker stopped); unrelated applications untouched; a failure during recovery quarantines with its message | investigation E-01…E-05, SD-01, SD-02 |
| BEH-002 | System | SCN-001 | Dispatch resume during reentry is a no-op (requires ACTIVE) | Pending events of a reentered application are dispatched after it is ACTIVE | Dispatch rules unchanged | E-04 |
| BEH-003 | User | SCN-003 | A live catalog change that finds an app not ready quarantines it with "Application setup is required after catalog transition." | The quarantine detail is "Application setup is required: <readiness diagnostics>", the same text startup uses | Readiness rules and diagnostics unchanged | E-06, SD-01 |
| BEH-004 | User | SCN-003 | After sign-in, a repair of an app quarantined at import is quarantined again (BEH-001) | The repair returns it to ACTIVE and usable | `recoverPreviouslyInactive` policy (repair recovers, package reload keeps a previous quarantine) unchanged | SD-01 |
| BEH-005 | Operational | — | — | A ranked report of design issues in the application SDK/framework, with file and line evidence | No fixes beyond the bug | user comment |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Constraint |
| --- | --- | --- | --- |
| Application user | Keep using an app after a reload or repair | App ACTIVE and usable | No restart |
| Application developer | Reload a changed package (devkit) | App ACTIVE | — |
| The user (owner) | Decide on framework health work | Ranked findings | Report only |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Package reload of an ACTIVE application | SCN-001 |
| UC-002 | App-scoped repair of an ACTIVE application | SCN-002 |
| UC-003 | Import while the runtime is signed out → reason shown; sign in → repair → ACTIVE | SCN-003 |
| UC-004 | Design findings report | — |

### Out Of Scope

- A UI action for repair or package reload (finding 4), and whether a package reload should recover a previously quarantined app (finding 5): product decisions for the user.
- Findings 6–12 of `application-framework-design-findings.md`.
- Antigravity/Grok readiness (autobyteus-236).
- Startup lifecycle order (already correct).

### Non-Goals

- Re-checking readiness automatically when an app page opens.

### Preserved Behavior Boundary

- BEH-001 and BEH-003/004 preserved columns; startup behavior; import of a ready application (autobyteus-238 AC-001).

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source / Decision |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | A successful reentry (package reload, repair) returns the application to ACTIVE without starting its worker while it is REENTERING; the worker starts later on demand. | BEH-001 | Must | Docs contract; the worker's own host calls need ACTIVE | DEC-001 |
| REQ-002 | After reentry activates the application, its pending execution events are dispatched. | BEH-002 | Must | Docs contract ("pending-event dispatch resume") | DEC-001 |
| REQ-003 | A live catalog change that finds an application not ready quarantines it with "Application setup is required: " followed by its readiness diagnostics; startup and catalog change use one owner for this text. | BEH-003 | Must | Task | DEC-002 |
| REQ-004 | Durable e2e: Brief Studio stays usable after a package reload and after a repair; an app imported while Codex is signed out names the reason, and after sign-in a repair makes it ACTIVE and usable. | BEH-001…004 | Must | Task | Task |
| REQ-005 | The module docs describe the actual reentry order. | BEH-001, BEH-002 | Must | Docs drift | DEC-001 |
| REQ-006 | The final report lists the design findings, ranked by risk, with file and line evidence. | BEH-005 | Must | User comment | user |

## Acceptance Criteria

| AC ID | Related REQ | Behavior / Scenario | Precondition / Trigger | Observable Expected Outcome | Alternate / Failure | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-004 | BEH-001, SCN-001 | Imported ACTIVE Brief Studio; GraphQL `reloadApplicationPackage` | Launch settings 200; ensure-ready ready; the app's GraphQL `createBrief` succeeds | — | Durable e2e (from `evidence/repro-application-reentry.e2e.test.ts` RR; fails on base) |
| AC-002 | REQ-001, REQ-004 | BEH-001, SCN-002 | Same; `POST /rest/applications/:id/backend/reload` | Response `state: ACTIVE`; then usable as AC-001 | — | Same e2e |
| AC-003 | REQ-003, REQ-004 | BEH-003, SCN-003 | Codex signed out; import Brief Studio | Launch settings 503; detail contains "Application setup is required:" and "Codex authentication is unavailable" | — | Same e2e (SO) |
| AC-004 | REQ-001, REQ-004 | BEH-004, SCN-003 | Then Codex signed in; repair | `state: ACTIVE`; usable as AC-001; no restart | — | Same e2e (SO) |
| AC-005 | REQ-001, REQ-002 | BEH-001, BEH-002 | Unit: reentry of a participant | Order: binding recovery → ACTIVE → dispatch resume (→ tools open); no worker start; a recovery failure quarantines with its message | — | Unit (`application-reentry-service.test.ts`, whose current order assertion changes) |
| AC-006 | REQ-003 | BEH-003 | Unit: transition with a not-ready app; startup with a not-ready app | Both quarantine with the same "Application setup is required: …" text from one owner | — | Units (transition, lifecycle, readiness) |
| AC-007 | — | preserved | Existing suites | Import→launch e2e (238), running-agents e2e, orchestration/platform units, architecture boundaries, typecheck pass | — | Existing tests |
| AC-008 | REQ-005 | — | Docs | `application_orchestration.md` and `applications.md` state: binding recovery, then ACTIVE with the worker stopped, then dispatch resume; quarantine detail names readiness diagnostics | — | Review |
| AC-009 | REQ-006 | BEH-005 | Final report | Findings ranked with evidence (`application-framework-design-findings.md`) | — | Solution Designer's Terminal report |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Starting Condition | Steps | Expected Outcome | Alternate | Validity | Evidence | Related IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Developer | Pick up a changed package | Devkit → GraphQL `reloadApplicationPackage` | App ACTIVE | Reload → reentry | App ACTIVE, usable | — | Supported Normal | docs, devkit | AC-001 |
| SCN-002 | Operational | User/operator | Repair one app | `POST /rest/applications/:id/backend/reload` (documented) | App ACTIVE or QUARANTINED | Repair → reentry | ACTIVE when ready | Not ready → quarantine with reason | Supported Normal (documented route) | `application_orchestration.md:175` | AC-002, AC-004 |
| SCN-003 | User | User | Use an app imported while signed out | Import; later sign in; repair | Codex signed out at import | Import → quarantine with reason → sign in → repair | ACTIVE | — | Supported Explicit Edge (the Task names it) | Task; SD-01 | AC-003, AC-004 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` (the quarantine detail already reaches the client in the 503 body). Product design fields: `N/A — not applicable`.

## Quality And Non-Functional Requirements

N/A.

## Data Continuity And Acceptable Loss

- Persisted data affected: `No`. In-memory availability and worker lifecycle only; no change to the user's data.

## External Contracts And Dependencies

| Contract | Required Behavior | Evidence | Risk |
| --- | --- | --- | --- |
| Module docs (reentry) | ACTIVE with worker stopped | `application_orchestration.md:175-180` | Corrected for dispatch order |

## Supplemental Artifacts

| Artifact | Purpose | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- |
| `evidence/repro-application-reentry.e2e.test.ts` | Reproduction / e2e basis | AC-001…004 | Current | Evidence |
| `application-framework-design-findings.md` | User-requested report | AC-009 | Current | Report (no behavior) |

## Assumptions

None.

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Worker stopped until ACTIVE (docs), or admit the app's own worker calls while REENTERING? | Lifecycle contract | Docs (two modules) say stopped; startup does so; the tool invoker and dispatch start a stopped worker on demand (`application-agent-tool-worker-invoker.ts`, `application-execution-event-dispatch-service.ts:166`); dispatch needs ACTIVE anyway (`:85-89`); admitting worker calls in REENTERING would open a second admission rule for one state | Follow the docs: recover bindings → ACTIVE → resume dispatch; worker stopped. Correct the docs where they put dispatch resume before ACTIVE (it cannot run then) | Solution Designer (the Task: "decide with the docs") | Decided |
| DEC-002 | Quarantine text after a catalog change | User sees why | Startup: "Application setup is required: <diagnostics>" | Same text from one owner (readiness), used by startup and catalog change | Solution Designer | Decided |
| DEC-003 | Add a UI repair action, or change package-reload recovery policy? | User's no-restart path | Not asked; product behavior | No; report as findings 4 and 5 for the user to decide | Solution Designer | Decided |

## Traceability

| REQ | UC | BEH | AC | SCN | Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001…003 | BEH-001, BEH-004 | AC-001, AC-002, AC-004, AC-005 | SCN-001…003 | SD-01, SD-02 |
| REQ-002 | UC-001, UC-002 | BEH-002 | AC-005 | SCN-001, SCN-002 | E-04 |
| REQ-003 | UC-003 | BEH-003 | AC-003, AC-006 | SCN-003 | SD-01 |
| REQ-004 | UC-001…003 | BEH-001…004 | AC-001…004 | all | repro |
| REQ-005 | UC-001, UC-002 | BEH-001, BEH-002 | AC-008 | — | docs |
| REQ-006 | UC-004 | BEH-005 | AC-009 | — | findings |

## Architecture Phase Input

- Preserve participant preparation and unrelated-application isolation; keep the readiness rules.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence: `N/A`
- UI/UX approval: `N/A`
- Material assumptions and decisions are visible: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: none

### Approved Basis Ready For Design

- Approval recorded: `Yes`
- Exact basis recorded: `Yes`
- Ready for architecture design: `Yes`
- Remaining blocker: none

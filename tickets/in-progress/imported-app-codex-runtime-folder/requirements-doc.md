# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `imported-app-codex-runtime-folder` (Project Task `autobyteus-238`)
- Request / ticket: autobyteus-238. An application imported while the server runs, with Codex as its launch runtime, is quarantined until the server restarts (FU-006 of autobyteus-207)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on behalf of the user
- Requirements owner: Solution Designer
- Date: 2026-10-24
- Approved by and reference: `Solution Designer within the direction (user informed)`. Reference: the Solution Designer's conversation message of 2026-10-24 (SR-001)
- Exact approved requirements baseline / solution revision: this document at SR-001
- Behavior-defining supplements: none

## Problem And Desired Outcome

- Problem: when the user imports an application package while the server runs, and the application's launch runtime is Codex (Brief Studio's default), the application is quarantined with "Application setup is required after catalog transition." Its launch settings and backend are refused (HTTP 503) until the server restarts.
- Affected actors or systems: users importing applications (Settings → Applications → import), and the application's own UI and backend.
- Desired outcome: the imported application is available right after import. Its launch settings read as runnable when Codex is signed in, and it launches its Codex team without a restart.
- Observable definition of success: import, then read the launch settings (200, `RUNNABLE`), then launch → the Codex team starts, with no restart in between.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | Import → readiness spawns Codex in `<data>/applications/<app>/runtime`, which does not exist yet → `ENOENT` → "Codex authentication is unavailable: …" → not ready → QUARANTINED | The application's runtime folder exists before its readiness check; readiness reads Codex's real sign-in state; the application becomes ACTIVE | Readiness rules and texts for Codex/Claude/providers; a really signed-out Codex still blocks with "Codex authentication is unavailable: no logged-in account." | E-01…E-05, SD-01 |
| BEH-002 | System | SCN-002 | At startup the runtime folder of each catalog application is prepared before readiness (works) | Unchanged | Startup order | E-03 |
| BEH-003 | User | SCN-003 | Reload of an imported package goes through the same catalog transition | Same fix applies | — | E-02 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User | Import an application and use it | Usable without a restart | No extra steps |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Import an application package while the server runs, then launch it | SCN-001 |
| UC-002 | Reload an application package while the server runs | SCN-003 |

### Out Of Scope

- FU-004 of autobyteus-207 (application readiness for Antigravity and Grok, now "unsupported"). It touches the same readiness code but changes launch behavior. It is a separate Task, not assigned to this bundle.
- How readiness reads sign-in (`AgentRuntimeSignInReader`), and its texts.
- The application engine's own storage preparation (`ensureStoragePrepared` on engine start).

### Non-Goals

- Creating any other storage (databases) at import time.

### Preserved Behavior Boundary

- BEH-001 preserved column; BEH-002.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | When the application catalog changes while the server runs (import, reload), each application in the new catalog has its runtime folder prepared before its launch readiness is checked, as at startup. | BEH-001, BEH-003 | Must | Readiness uses that folder as Codex's working directory | DEC-001 |
| REQ-002 | An end-to-end test imports a Codex-default application while the server runs and launches it (scripted Codex CLI), and passes. | BEH-001 | Must | Task "Done when" | Task |
| REQ-003 | Readiness outcomes other than the missing-folder failure stay unchanged (signed out → blocked with today's text). | BEH-001 | Must | Preserve | — |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | BEH-001, SCN-001 | Server running without the package; Codex signed in (scripted); import Brief Studio by GraphQL | The application is ACTIVE; launch settings GET returns 200 with readiness `RUNNABLE`; launching its drafting team returns `ATTACHED` and its Codex thread starts | — | New server E2E (starts from `evidence/repro-imported-app-codex-launch.e2e.test.ts`, fails on base) |
| AC-002 | REQ-003 | BEH-001 | Same, Codex signed out | Readiness `HOST_REQUIREMENT_MISSING` with "Codex authentication is unavailable: no logged-in account." (not a spawn ENOENT) | — | Same E2E, second case |
| AC-003 | REQ-001 | BEH-003, SCN-003 | Reload of the imported package | Runtime folder exists; the application stays usable | — | Unit test of the catalog transition order |
| AC-004 | — | BEH-002 | Existing suites | Server unit tests for catalog transition, platform lifecycle; `agent-runtimes-running-agents.e2e` pass | — | Existing tests |
| AC-005 | REQ-001 | SCN-001 | Real app | An imported Codex-default application starts without a restart | — | API/E2E judgement; user check optional |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | Related IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User | Use a newly imported application | Applications → import (GraphQL `importApplicationPackage`) | Server running; app not imported before on this data dir | Import → open app → launch | App runs | Signed-out Codex → readiness says so | Supported Normal Scenario | FU-006 log; SD-01 | REQ-001/2, AC-001/2 |
| SCN-002 | System | Server | Startup | Server start | App in catalog | Prepare runtime folders → readiness | App ACTIVE | — | Supported Normal Scenario | `application-platform-lifecycle.ts:51-58` | AC-004 |
| SCN-003 | User | User | Pick up a changed package | Applications → reload | Imported package | Reload → readiness | App ACTIVE | — | Supported Normal Scenario | `application-catalog-transition-service.ts:45-72` | AC-003 |

## UI, Interaction, And Experience Requirements

- Applicable: `No`. Product design fields: `N/A — not applicable`.

## Quality And Non-Functional Requirements

N/A.

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`. An empty folder is created at the path startup already creates.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Node `child_process.spawn` with a missing `cwd` | Fails with `ENOENT` | SD-01 (real spawn of the scripted CLI) | None |

## Supplemental Artifacts

| Artifact Path | Purpose | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- |
| `evidence/repro-imported-app-codex-launch.e2e.test.ts` | Failing reproduction / basis of the E2E | REQ-002, AC-001 | Current | Evidence only |

## Assumptions

None.

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Prepare the folder before readiness, or let readiness handle a missing folder? | Where the fix lives | (a) catalog transition prepares runtime folders, as startup does; (b) readiness creates the folder; (c) readiness skips/uses another cwd | (a). The runtime folder is the application's working directory for its runs too; storage preparation belongs to storage, and startup already does it in this order (SD-02 proves it sufficient). (b) puts a write into a read; (c) would check readiness in a folder the run does not use. | Solution Designer | Decided |
| DEC-002 | Do FU-004 (Antigravity/Grok readiness) together? | Scope | The Task says "may"; FU-004 changes launch behavior and is its own Task | Keep separate; it is not in this bundle | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | AC IDs | Scenario IDs | Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001, UC-002 | BEH-001, BEH-003 | AC-001, AC-003, AC-005 | SCN-001, SCN-003 | SD-01, SD-02 |
| REQ-002 | UC-001 | BEH-001 | AC-001 | SCN-001 | repro |
| REQ-003 | UC-001 | BEH-001 | AC-002 | SCN-001 | — |

## Architecture Phase Input

- Approved scenarios: SCN-001, SCN-003; preserve SCN-002.
- Technical facts verified: see investigation notes (SD-01, SD-02).

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval: `N/A`
- Material assumptions and decisions are visible: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: none

### Approved Basis Ready For Design

- Approval recorded: `Yes`
- Exact basis recorded: `Yes`
- Ready for architecture design: `Yes`
- Remaining blocker: none

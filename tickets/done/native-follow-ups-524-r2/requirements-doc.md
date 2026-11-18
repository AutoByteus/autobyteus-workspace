# Requirements Document — autobyteus-524, round 2: FU-006 and FU-007

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `native-follow-ups-524-r2`
- Request / ticket: Project Task `autobyteus-524`, round 2
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`); scope set by the founder in the Solution Designer's conversation, 2026-11-18 ("only do the two and three")
- Requirements owner: Solution Designer
- Date: 2026-11-18
- Approved by and reference: `Solution Designer within the direction (user informed)`: the founder chose these two items; the fixes are solution details. Informed in the Solution Designer's conversation, 2026-11-18.
- Exact approved requirements baseline: this document at `SR-001`
- Behavior-defining supplements: none

## Problem And Desired Outcome

- **FU-006:** `available-agent-runtimes-graphql.e2e.test.ts` fails on any host with the DeepSeek Harness CLI (`dsh`) installed: the server lists `deepseek_harness`, the test expects the list without it.
- **FU-007:** a built server's graceful stop takes seconds and sometimes over 10 s on a loaded Mac, so the server exits 1 ("forcing exit") or the E2E harness times out. Cause (RF-002, RF-003): closing the in-process package-folder watch blocks the main thread 2–13 s while macOS's file-event service is busy. The same applies to the desktop app's embedded server when it quits.
- Desired outcome: the AAR suite passes whatever is installed; a built server stops in well under a second on a loaded host.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | SCN-001 | The AAR suite's expected runtime list depends on `dsh` being absent | The suite controls the harness like the other runtime CLIs (hidden) | The suite's assertions for the other runtimes | Source Log FU-006 rows |
| BEH-002 | System | SCN-002 | Server shutdown closes the package-folder and skill-folder OS watches on the main thread; 2–13 s under load | At process shutdown the watchers stop handling events and their OS watches are left to the process exit | The order and bound of shutdown; every other close (folder removed, tests) still closes OS watches | RF-002…RF-004 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Founder / team | Green, trustworthy suites; quick shutdowns | Both items fixed | Keep it simple |
| Desktop user | Quit the app quickly | The embedded server stops fast | — |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Run the AAR E2E suite on a host with `dsh` installed | SCN-001 |
| UC-002 | Stop a built server (E2E harness, desktop quit, node stop) on a loaded host | SCN-002 |

### Out Of Scope

- FU-004/FU-005 (no change, founder), FU-008, round 1's follow-ups, 515 FU-001/FU-002.
- Watcher test timing (448 FU-001), FS-event latency tests (483 FU-002, 493 FU-003), slow server starts under load, the 10 s vs 15 s hook mismatch of 496 FU-006 (closed in practice by the fast stop).
- A watcher close blocking the main thread during normal operation (a package folder removed while running): not observed as a problem; a follow-up if it shows.

### Non-Goals

None.

### Preserved Behavior Boundary

- BEH-002 preserved part; the 10 s shutdown bound and the process-tree sweep.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Feasibility Evidence | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | The AAR E2E suite's result does not depend on whether `dsh` is installed: it hides the harness (points `DEEPSEEK_HARNESS_COMMAND` at a missing command) | BEH-001 | Must | Same as the other runtime CLIs | `deepseek-harness-identity.ts:17` | DEC-001 |
| REQ-002 | At process shutdown, the in-process package-folder and skill-folder watchers stop handling events without closing their OS watches; the process exit releases them | BEH-002 | Must | Removes 2–13 s of main-thread blocking | RF-004: stops 48–166 ms, 10/10 | DEC-002 |
| REQ-003 | Every other close of these watchers (a folder removed or replaced while running; tests) still closes the OS watches | BEH-002 | Must | No leaked watches while the process lives | — | DEC-002 |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | SCN-001 | `~/.local/bin/dsh` installed (as on this Mac) | `available-agent-runtimes-graphql.e2e.test.ts` passes | — | E2E run on this host |
| AC-002 | REQ-002 | SCN-002 | `built-server-stop-probe.mjs <worktree> 10 3000` on a loaded host | Every stop well under 1 s, exit 0 (RF-004 shape) | — | Probe before/after |
| AC-003 | REQ-002, REQ-003 | SCN-002 | Unit | The shutdown path does not call the OS close; the ordinary close does; no event is handled after the shutdown stop | — | Unit (fake watch factories) |
| AC-004 | all | — | Server unit suite, the agent-package and skill watcher tests, the built-server E2E files of 493 FU-005 | Pass; failures unrelated to this change recorded with their cause | — | Suites |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Operational | The team | Run the E2E suite | `pnpm test:e2e` | `dsh` installed | Suite runs with faked runtime CLIs | Pass | — | Supported Normal Scenario | 515/448/493 rows | REQ-001; AC-001 |
| SCN-002 | System | Desktop quit, node stop, E2E harness | Stop the server | SIGTERM / shutdown IPC | Loaded host | Cleanup → sweep → exit | Exit 0 quickly | Cleanup over 10 s still forces exit (preserved) | Supported Normal Scenario | RF-001…RF-004 | REQ-002, REQ-003; AC-002…AC-004 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` — N/A — not applicable for every Product design field.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-002, AC-002 | Performance | Idle built-server stop < 1 s at load ~100+ on this Mac | Measured envelope | Probe |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| OS process exit | Releases file watches | OS behavior | — |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `evidence/built-server-stop-probe.mjs` | Reproduction / AC-002 | AC-002 | Final | Evidence |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Linux/Windows hosts behave no worse | Other platforms | Not measured here; the change only removes work | Open |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Fake `dsh` or hide it in the AAR suite? | Coverage vs simplicity | Faking needs the fake CLI to speak dsh's probes; its availability has its own unit tests | Hide it (missing command) | Solution Designer | Decided |
| DEC-002 | How to remove the shutdown delay | Simple, safe | Longer bound (hides it, quit still slow); move watchers to a worker process (large); leave OS watches to the exit at shutdown (RF-004) | Leave them to the exit, at shutdown only | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001 | SCN-001 | — |
| REQ-002 | UC-002 | BEH-002 | AC-002, AC-003 | SCN-002 | RF-004 |
| REQ-003 | UC-002 | BEH-002 | AC-003, AC-004 | SCN-002 | — |

## Architecture Phase Input

See design spec.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and decisions are visible, each decision with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: none

### Approved Basis Ready For Design

- Approval recorded: `Yes`
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: none

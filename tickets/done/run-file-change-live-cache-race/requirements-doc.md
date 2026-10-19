# Requirements Document: A First Read Can No Longer Hide A Running Agent's File

## Document Status

- **Status:** `Approved`
- **Current solution revision ID:** `SR-002`
- **Package identifier:** `run-file-change-live-cache-race`
- **Request / ticket:** Project Task autobyteus-180 (follow-up FU-C of autobyteus-153)
- **Requested by:** `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- **Requirements owner:** Solution Designer
- **Date:** 2026-10-19
- **Approved by:** `Solution Designer within the direction (user informed)`. Reference: my conversation message of 2026-10-19 that informs the user of this approval and its decisions.
- **Approved baseline:** this document at SR-001, approved in SR-002
- **Behavior-defining supplements:** none

## Problem And Desired Outcome

- **Problem:** this happens when the app loads a running agent's file list at the same moment the agent records its first file change. The server's live list for that agent then permanently lacks that file, and opening it gives "File change not found". If the agent records another file change afterwards, the saved record loses the first file too. It then stays missing even after the run stops.
- **Affected actors:** the user, in the Artifacts tab for any running agent: a standalone run, a team member, an org member or a delegated copy.
- **Desired outcome:** every file the agent records stays in its live list and in its saved record, however reads and file changes overlap.
- **Observable success:** a regression test of the overlap shows the file in the live list and the saved record. The real-server E2E stays green over repeated runs without its workaround wait.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenario | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User/System | SCN-001 | An overlapping first read leaves the live list without the file | The live list contains every recorded file | — | Notes BEH-001 |
| BEH-002 | System | SCN-002 | The next file change persists the stale list; the saved record loses the file | The saved record contains every recorded file | Same record shape | Notes BEH-002 |
| BEH-003 | User/System | SCN-003 | Reads and events without overlap are correct | Unchanged | All current outcomes | Notes BEH-003 |
| BEH-004 | System | SCN-003 | A detached run is not re-cached | Unchanged | Same | Notes BEH-004 |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Scenarios |
| --- | --- | --- |
| UC-001 | The app reads a running agent's file list or a file while the agent records file changes | SCN-001, SCN-002 |

### Out Of Scope

- Repairing records already damaged by this defect. The lost entries cannot be reconstructed (investigation notes, Persisted Data).
- Client-side list replace/merge policy. It is not part of this defect: live contexts merge.
- Owner-scoped reads (autobyteus-153, done) and context-file reads (autobyteus-176).
- Any other cache.

### Non-Goals

- Queuing reads behind file-change events, or any new concurrency machinery.

### Preserved Behavior Boundary

- BEH-003 and BEH-004. The read and write surfaces and the record shape stay unchanged.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion or preserved-behavior ID.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise or operational contract is a `Requirement Gap`; it needs explicit user approval before it becomes authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation or follow-up. It is not a required design correction.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| ID | Requirement | Behavior | Priority | Rationale | Source |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | While an agent run is running, a read that overlaps one of its file changes never removes a recorded file from the run's live list. Later reads list every recorded file | BEH-001 | Must | Core defect | Task direction |
| REQ-002 | Every file change an agent records stays in its saved record, regardless of overlapping reads, and also after the run stops | BEH-002 | Must | Found in investigation; same root cause | DEC-002 |
| REQ-003 | A regression test reproduces the overlap (first read in flight across the first file change, then a second file change). The real-server owner-scoped E2E no longer waits for the saved record before its first live read | BEH-001, BEH-002 | Must | Done-when | DEC-003 |
| REQ-004 | Reads and file changes without overlap, and detach handling, behave as today | BEH-003, BEH-004 | Must | Preservation | — |

## Acceptance Criteria

| ID | Requirements | Behavior / Scenario | Trigger | Expected | Alternate | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-001 / SCN-001 | First read in flight; first file change recorded; read completes | Later live reads list the file; content reads find it | — | Unit test (real service, gated store read) |
| AC-002 | REQ-002 | BEH-002 / SCN-002 | As AC-001, then a second file change | The saved record and the live list contain both files; after detach, a fresh read lists both | — | Unit test |
| AC-003 | REQ-003 | SCN-001 | Owner-scoped member file-change E2E without the stored-record wait | Passes in at least 10 consecutive runs | — | Gated server E2E loop |
| AC-004 | REQ-004 | BEH-003, BEH-004 | Existing scenarios | Existing `run-file-change-service.test.ts` cases and the run-file-changes integration tests pass | — | Unit + integration |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Start | Steps | Outcome | Alternate | Validity | Evidence | IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User/System | User + running agent | See the files an agent is writing | Open a running run or member (Artifacts list loads) while the agent records its first file | Agent attached, no cached list | Read starts; file recorded; read returns; user keeps watching or reopens | Every recorded file is listed and opens | — | Supported Normal Scenario (hydration and reopen are normal; E2E hit it 2/9) | Task; API-04b | REQ-001, AC-001, AC-003 |
| SCN-002 | System | Running agent | Record its outputs | Agent records another file after SCN-001 | As after SCN-001 | Second file change recorded | The saved record holds every file | — | Supported Normal Scenario | Probe | REQ-002, AC-002 |
| SCN-003 | User/System | Same | Normal use | Reads and events without overlap; run stops | — | — | Unchanged | — | Supported Normal Scenario | Existing tests | REQ-004, AC-004 |

## UI, Interaction, And Experience Requirements

- **Applicable:** `No`. No visible change other than files no longer going missing. Product design fields: N/A — not applicable.

## Quality And Non-Functional Requirements

| ID | Related | Area | Constraint | Verification |
| --- | --- | --- | --- | --- |
| QR-001 | REQ-001 | Performance | No new waiting on the read path: a read never waits for queued file-change handling | Design review; unit test of a cache hit |

## Data Continuity And Acceptable Loss

- **Persisted data affected:** `Yes`. `file_changes.json` is protected from future loss.
- **Must be preserved:** every recorded entry from now on.
- **Acceptable:** entries already lost before the fix stay lost (DEC-002).

## External Contracts And Dependencies

None changed.

## Supplemental Artifacts

None behavior-defining. Evidence probes are listed in the investigation notes.

## Assumptions

| ID | Assumption | Status |
| --- | --- | --- |
| ASM-001 | While a run is attached, its saved record is written only after the live cache is updated (`handle`), so the cache is never older than the record | Holds (code) |

## Decisions

| ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | How to stop the stale overwrite? | The Task leaves this to the team | (a) Fill the cache only if it is still empty when the stored read returns, and otherwise use the cache. (b) Route reads through the per-run event queue | (a): the cache is never older than the record (ASM-001), so a stored read that finds the cache filled is no newer and must not replace it. It is one local rule in the one owner; reads never wait behind writes (QR-001); it matches DESIGN.md rule 5 (smallest change). (b) adds waiting to every first read. Recommend (a) | Solution Designer | Decided |
| DEC-002 | The saved record also loses the file (beyond the Task text). Fix it, and repair old records? | Severity and scope | Same root cause; past losses have no source to rebuild from | Fixing the root cause protects the record going forward, within the direction ("keep the live list correct after the run stops"). Repair is impossible without the lost events, so none. The release notes say so | Solution Designer | Decided |
| DEC-003 | Keep the E2E's stored-record wait? | It hides the trigger the Done-when wants exercised | It was added only to dodge this defect (comment at lines 22-24) | Remove it, so the E2E loop proves the fix (AC-003) | Solution Designer | Decided |

## Traceability

| Requirement | Use Cases | Behaviors | ACs | Scenarios |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-003 | SCN-001 |
| REQ-002 | UC-001 | BEH-002 | AC-002 | SCN-002 |
| REQ-003 | UC-001 | BEH-001, BEH-002 | AC-001..AC-003 | SCN-001, SCN-002 |
| REQ-004 | UC-001 | BEH-003, BEH-004 | AC-004 | SCN-003 |

## Architecture Phase Input

- **Scenarios:** SCN-001..SCN-003.
- **Constraints:** one owner (`RunFileChangeService`); no API, shape or queue change.
- **Technical facts to verify:** that nothing else writes `projections`.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence: `N/A`
- UI/UX approval basis: `N/A`
- Material assumptions and decisions are visible, each with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`

### Approved Basis Ready For Design

- Approval recorded: `Yes` (within the direction; no `Needs user` decision; user informed)
- Approved requirements package ready for architecture design: `Yes`

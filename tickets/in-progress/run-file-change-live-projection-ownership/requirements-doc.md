# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-002`
- Package identifier: `run-file-change-live-projection-ownership`
- Request / ticket: Artifacts produced after the first one by an active agent show "File not found — deleted or moved" although the files exist.
- Requirements owner: Solution Designer
- Date: 2026-10-06
- Approval state and reference: Approved by user in conversation on 2026-10-06 after the investigation result was presented: "since you found the bug, please work on the ticket now. the requirement is clear." Follow-up instruction: "make sure check whether this is a design issue or not does it need some refactoring" (design-phase instruction, no behavior change).
- SR-002 approval (2026-10-06): user chose to finish this ticket first and handle Team-member Artifacts hydration as the next ticket: "agreed. but lets finish this current bug ticket first. and then work on this one right?" The user agreed earlier that the follow-up must make Team members consistent with standalone agents ("i guess stay consistant" / "agreed").
- Exact approved requirements baseline / solution revision: SR-002 (SR-001 scope with SCN-002/SCN-003 narrowed per §Proposed Revision SR-002, Option 2). SR-001 text: every artifact an active run records must be listable and previewable while the file exists; restore the documented artifact-serving behavior.
- Behavior-defining supplements and their approved versions: None.

## Problem And Desired Outcome

- Problem: For an active run (standalone or team member), once the run's artifacts have been read once, artifacts recorded afterwards are not found by the server's read path. The preview shows "File not found … deleted or moved" although the file exists and is recorded in `file_changes.json`. It persists until the run becomes inactive or the server restarts.
- Affected actors or systems: users viewing the Artifacts tab; GraphQL `getRunFileChanges`; REST `/runs/:runId/file-change-content`.
- Desired outcome: the read path always reflects every artifact the run has recorded.
- Observable definition of success: in an active run producing several images in sequence, every image previews successfully immediately after its row appears and after reopening the Artifacts tab.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | Artifacts recorded after the first read of an active run return 404 "File change not found" on preview | Every recorded artifact whose file exists previews (200) | Response shape, MIME, `no-store` header; 409 for pending/streaming entries of active runs; 404 when file truly missing | investigation-notes Source Log (curl, server.log) |
| BEH-002 | User | SCN-002 | Hydrated artifact list of an active run can miss entries recorded after the first read | Hydrated list contains every recorded entry | GraphQL shape and ordering | investigation-notes BEH-002 |
| BEH-003 | User | SCN-003 | Historical (inactive) run artifacts read correctly from disk | Unchanged | Fully preserved | investigation-notes BEH-003 |
| BEH-004 | System | SCN-001 | Writer persists each change to `file_changes.json` | Unchanged | File format, atomic write, transient `content` stripping | investigation-notes BEH-004 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User viewing Artifacts | Inspect what the agent produced while it works | All produced artifacts viewable | No restart workaround |
| Server read APIs | Serve list and content | Consistent with what the run recorded | No API shape change |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Preview any artifact of an active run (standalone or team member, any runtime) | SCN-001 |
| UC-002 | List (hydrate) artifacts of an active run | SCN-002 |
| UC-003 | List and preview artifacts of an inactive run (preserved) | SCN-003 |

### Out Of Scope

- Frontend wording "deleted or moved" for 404 responses (separate-ticket candidate, RSK-001).
- Changes to which tool events produce `FILE_CHANGE`.
- The `file_changes.json` format.
- Application-platform artifact publication/relay behavior.
- **Frontend Team-member Artifacts hydration** (loading a member's list from the server when a Team run is opened or a member is inspected, active and historical). Pre-existing gap found by API-REV-001 B-003/B-004. User-approved as the **next ticket**, to be started after this one is finished. Approved intent: Team members behave consistently with standalone agents.

### Non-Goals

- No performance optimization beyond keeping current per-request cost.

### Preserved Behavior Boundary

BEH-003, BEH-004; preserved columns of BEH-001/BEH-002.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- New product behavior, policy or contract proposals are a `Requirement Gap` requiring explicit user approval.
- Adjacent concerns outside the boundary are non-blocking recommendations.
- Downstream comments do not amend this basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | For an active run, content preview of any recorded artifact succeeds whenever the file exists, regardless of when it was recorded relative to earlier reads. | BEH-001 | High | User-reported defect | User approval 2026-10-06 |
| REQ-002 | For an active run, the artifact list returned by the server includes every recorded entry at the time of the request. | BEH-002 | High | Same defect class on the list API | Investigation; same intent |
| REQ-003 | Inactive-run artifact listing/preview and the persisted record format remain unchanged. | BEH-003, BEH-004 | High | No regression | Preserved behavior |
| REQ-004 | Existing endpoint semantics remain: 409 for pending/streaming entries of an active run whose file is not yet present; 404 when no entry exists or the file is truly missing. | BEH-001 | Medium | Contract preservation | Code (`run-file-changes.ts`) |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-001 / SCN-001 | Active team-member run records artifact A; A's content is read; then artifacts B and C are recorded | Content requests for A, B and C all return 200 with the file bytes | — | Automated (service/integration) with real process composition wiring; regression test fails on current code |
| AC-002 | REQ-001 | BEH-001 / SCN-001 | Same as AC-001 for an active standalone run | A, B, C all 200 | — | Automated |
| AC-003 | REQ-002 | BEH-002 / SCN-002 | Active run (standalone or Team member); list read after A; B, C recorded; list read again via `getRunFileChanges`. Standalone UI reload also shows A, B, C | Second list contains A, B, C | — | Automated |
| AC-004 | REQ-003 | BEH-003 / SCN-003 | Inactive run with `file_changes.json` (server API for any run; standalone UI) | List and content as before | — | Existing tests pass |
| AC-005 | REQ-004 | BEH-001 | Active run entry `streaming` without file; and unknown path | 409 and 404 respectively | — | Existing tests pass |
| AC-006 | REQ-001, REQ-002 | SCN-001 | Live server, agent generates ≥ 2 images in one turn | Every image previews in the Artifacts tab without restart | — | API/E2E or live check |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User watching an agent | See each produced artifact | Artifacts tab preview | Run active | Agent produces A → user opens A → agent produces B, C → user opens B, C | All previews render | 409 while still streaming | Supported Normal Scenario | User screenshots 2026-10-06; curl reproduction | REQ-001, REQ-004 / AC-001, AC-002, AC-005, AC-006 |
| SCN-002 | User | User reopening a run | See full artifact list | Artifacts tab hydration (standalone agent UI); `getRunFileChanges` API for any run incl. Team members | Run active, artifacts already read once | Reopen run / reload UI (standalone) or API list request (Team member) | Full list (Team-member **UI** hydration: follow-up ticket, see Out Of Scope) | — | Supported Normal Scenario | Code path | REQ-002 / AC-003 |
| SCN-003 | User | User browsing history | View past artifacts | Artifacts tab (standalone agent UI); API for any run incl. Team members | Run inactive | Open run | Full list and previews (Team-member **UI** hydration: follow-up ticket) | 404 when file deleted | Supported Normal Scenario | Code path | REQ-003 / AC-004 |

## UI, Interaction, And Experience Requirements

- Applicable: `No`
- Product design fields: `N/A — not applicable`.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001, REQ-002 | Reliability | No server restart or run termination needed to see newly recorded artifacts | Active runs | AC-001..AC-003 |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`
- Data that must be preserved: `file_changes.json` contents and format.
- Acceptable loss: in-memory caches (disposable).

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| GraphQL `getRunFileChanges`, REST `/runs/:runId/file-change-content` | Unchanged shapes | `docs/features/artifact_file_serving_design.md` | None |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| None | — | — | — | — |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The frontend does not need changes once the server returns correct data (standalone UI + live Team-member previews) | Scope boundary | AC-006 live check | Holds for SR-002 scope; was **invalidated for Team-member reload/history UI**, now out of scope (follow-up). (API-REV-001 B-003/B-004; CRR-002). Holds for standalone agents. See Proposed Revision SR-002 |

## Revision SR-002 (Approved: Option 2, split; Team-member UI hydration is the next ticket)

- Trigger: CRR-002 `Requirement Gap` from API-REV-001. B-003: an active team member's Artifacts list is empty after a page reload. B-004: a historical team member's list is empty. The server returns the correct three entries in both cases.
- Evidence (re-verified by Solution Designer on `061d4698b`): `autobyteus-web` calls `GetRunFileChanges` / `hydrateRunFileChanges` only from the agent-run path (`runContextHydrationService.ts`, `agentRunOpenCoordinator.ts`). No team open/inspection/hydration path calls it, at any point in history. Team-member rows exist only from live `FILE_CHANGE` events.
- Option 1 (extend this ticket): add REQ-005, "When a Team run is opened or a member is inspected, the member's Artifacts list is hydrated from the server (active and historical)". Map SCN-002/SCN-003 to Team members with new ACs. Revise the design to add frontend team-member artifact hydration reusing `hydrateRunFileChanges`. Re-review applies.
- Option 2 (split): narrow SCN-002/SCN-003 in this ticket to standalone runs plus the server API for Team members. Record Team-member UI hydration as a follow-up ticket. No design change.
- Decision owner: user. **Decision (2026-10-06): Option 2, split.** Quote: "agreed. but lets finish this current bug ticket first. and then work on this one right?" The follow-up ticket makes Team members consistent with standalone agents.

## Open Decisions And Questions

| Decision / Question ID | Question | Why It Matters | Options / Evidence | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | None open | — | — | — | Closed |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-002, AC-006 | SCN-001 | Screenshots |
| REQ-002 | UC-002 | BEH-002 | AC-003, AC-006 | SCN-002 | — |
| REQ-003 | UC-003 | BEH-003, BEH-004 | AC-004 | SCN-003 | — |
| REQ-004 | UC-001 | BEH-001 | AC-005 | SCN-001 | — |

## Architecture Phase Input

- Approved scenarios: SCN-001..SCN-003.
- Constraints: no API/persistence change; follow documented single-owner artifact design.
- Deferred to architecture: owner binding, cache policy.
- Technical facts to verify: all `RunFileChangeService` instances and readers (done, see investigation notes).

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and open decisions are visible: `Yes`
- Content ready for user approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- User approval received: `Yes` (2026-10-06, see Document Status)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None

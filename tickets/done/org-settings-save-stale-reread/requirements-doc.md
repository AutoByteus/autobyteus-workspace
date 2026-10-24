# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `org-settings-save-stale-reread` (Project Task `autobyteus-265`)
- Request / ticket: autobyteus-265. In an Org run, after a stopped delegated copy's model is saved in Settings, the page often says "Settings were saved, but could not be refreshed. Refresh before making more changes." and keeps the old model until Refresh (FU-005 of autobyteus-205)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on behalf of the user
- Requirements owner: Solution Designer
- Date: 2026-10-24
- Approved by and reference: `Solution Designer within the direction (user informed)`. Reference: the Solution Designer's conversation message of 2026-10-24 informing the user (SR-001)
- Exact approved requirements baseline / solution revision: this document at SR-001
- Behavior-defining supplements and their approved versions: none

## Problem And Desired Outcome

- Problem: in a running Org, the user stops one delegated copy, changes its model in Settings and presses Save. The Save is stored, but in about one in three Saves Settings then shows "Settings were saved, but could not be refreshed. Refresh before making more changes." It locks editing and keeps showing the old model until the user presses Refresh.
- Affected actors or systems: the desktop/web user editing a running Org's delegated copies in Run Settings.
- Desired outcome: after every successful Save, Settings shows the saved model with the success message and no error. The user does not need Refresh.
- Observable definition of success: in a loop of at least 12 Saves of a stopped copy's model in a running Org, every Save ends with the saved model shown and no "could not be refreshed" message.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | After the Save of a stopped copy's model in a running Org, Settings re-reads the Org's canonical settings. The Org stream reloads the Org view at the same moment, and the re-read then fails as "stale" in about 1 Save of 3 (4 of 12 on base). Settings shows the "could not be refreshed" message and the old model. | The re-read succeeds whenever the Org is still the same open run on the same node with no Org operation pending. Settings shows the saved model and the success message. | The Save request, its stored result and its success/failure messages are unchanged. A real target change (the Org closed, the window switched to another node, a Stop or other Org operation started) still refuses the re-read with the existing message. | investigation-notes E-01…E-06, SD-01 |
| BEH-002 | System | SCN-001 | A live Org publishes `delegated_launch_selections_changed`. The Org view answers with a checkpointed reload: it reconnects the stream and takes a new snapshot (documented: "Org and Agent views reload"). | Unchanged. | The reload and its result (member conversations show the copy's new model) stay as they are. | E-02, E-03, E-07 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User of a running Org | Change a stopped copy's model and continue | Sees the saved model right after Save, no spurious error | No extra steps |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Save a stopped delegated copy's model from Run Settings of a running Org, and see the saved settings | SCN-001 |

### Out Of Scope

- How the Org (and Agent) view reacts to `delegated_launch_selections_changed`: today it reconnects and reloads. Recording the choice in place, as the Team view does, is a separate improvement (follow-up FU-001).
- Team and Agent roots: their Settings re-read has no view-identity guard and is not affected (investigation E-05).
- Saving a stopped Org's own settings, and the Org's workspace Save.
- The browser-probe fixture failures listed in autobyteus-205's other follow-ups.

### Non-Goals

- Fewer stream reconnects or less reload work per Save.

### Preserved Behavior Boundary

- BEH-001's preserved column; BEH-002 entirely.
- The "Settings were saved, but could not be refreshed" message and its Refresh recovery remain for a re-read that really fails.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | When the Org's view is reloaded by its own stream while Settings reads the Org's canonical settings, and the Org is still the same open run on the same node with no Org operation pending, the read completes with the current canonical settings instead of failing as stale. | BEH-001 | Must | The reload is designed behavior; it does not make the server's canonical settings stale. | Task autobyteus-265; DEC-001, DEC-002 |
| REQ-002 | A real target change during the read still refuses it with the existing stale-read error, so Settings keeps showing "Settings were saved, but could not be refreshed…" with Refresh: the Org's context released, the node binding changed, or an Org operation started. A read that keeps meeting view reloads gives up after a small bounded number of attempts with the same error. | BEH-001 | Must | Keeps the guard's purpose and avoids an unbounded loop. | DEC-002 |
| REQ-003 | A regression test reproduces the race (the view replaced while the read is in flight) and proves REQ-001 and REQ-002. | BEH-001 | Must | Task "Done when" | Task autobyteus-265 |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-001, SCN-001 | Running Org; one delegated copy stopped; its model changed in Run Settings; Save, repeated at least 12 times in one session | Every Save shows the success message and the saved model in the copy's row; no "could not be refreshed" message appears | — | Browser probe loop on a real stack: `delegated-launch-defaults-probe.mjs --cases DCP-003,DCR-003` repeated to at least 12 Saves (the cases that reproduced 4 of 12 on base) |
| AC-002 | REQ-001, REQ-003 | BEH-001 | Unit: the Org context/view is replaced by a stream reload while `readRunConfig` is in flight | The read resolves with the canonical settings | — | Web unit test (starts from `evidence/repro-org-reread-race.spec.ts`, failing on base) |
| AC-003 | REQ-002, REQ-003 | BEH-001 | Unit: during the read the Org context is released, or the node binding changes, or an Org operation starts; or the view keeps being replaced past the bound | The read rejects with "Org configuration read is stale; refresh required." | — | Web unit tests |
| AC-004 | — | BEH-001, BEH-002 | Existing suites | Existing Org stream, Org config publication and Settings store tests still pass; DCP-001…DCP-005 and DCR-001…DCR-003 pass | — | Existing web tests; browser probe |
| AC-005 | REQ-001 | SCN-001 | The user's own check in the app | The user saves a copy's model in an Org run and sees the new model without Refresh | — | User verification before finalization |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User | Run a stopped copy on another model | Run Settings → copy row → model → Save | Org running; copy stopped (from its row or idled out) | Stop copy → change model → Save → Settings re-reads → (stream reloads the Org view) | Saved model shown, success message | A failed Save keeps the edits; a failed re-read shows the existing message with Refresh | Supported Normal Scenario | docs/settings.md "Editing (SR-007)", "Save"; probes DCP-003, DCR-003 | REQ-001…REQ-003, AC-001…AC-005 |

## UI, Interaction, And Experience Requirements

- Applicable: `No`. No visible change except that the spurious error no longer appears.
- Product design fields: `N/A — not applicable`

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001, AC-001 | Reliability | 0 "could not be refreshed" messages in ≥ 12 consecutive successful Saves (base: 4 of 12) | Org root, real stack | Browser probe loop |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No` (a client read path only).

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Org stream checkpointed reload | Unchanged | `agentOrgStreamingService.ts:134-170,339` | None |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `evidence/repro-org-reread-race.spec.ts` | Failing reproduction for implementation to start from | REQ-003, AC-002 | Current | Evidence only |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The view reload after a Save happens once per Save, so a bounded re-read of 3 attempts is enough | Bounds REQ-002 | API-18 shows 1 reconnect per Save; AC-001 loop | Supported by evidence |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Is the stream reconnect after every Save the defect? | Decides where the fix goes | The live Org publishes `delegated_launch_selections_changed` (`agent-org-run.ts:148`); the Org context answers `checkpoint_required` (`agentOrgExecutionContext.ts:268-273`), and the stream reconnects for a fresh snapshot (`agentOrgStreamingService.ts:339,134-170`). `docs/settings.md:1388-1392` documents it: "Org and Agent views reload." | The reconnect is the designed reload, not the defect. The defect is that Settings' re-read treats this reload as a stale target. Recording the choice in place, as the Team does, would be a separate improvement. It would not remove the race on its own, because the event (WebSocket) and the read (HTTP) travel on separate channels and the view can still change during the read. Fix the read; record the in-place idea as follow-up FU-001. | Solution Designer | Decided |
| DEC-002 | What should the re-read do when the view changes under it? | User-visible result | (a) accept the result as is; (b) read again against the new view, bounded; (c) wait for the stream to be ready | (b): read again while the same Org is still open on the same node with no operation pending, up to 3 attempts, then fail with the existing message. One rule covers live and stopped Orgs, and the returned settings are always consistent with the current view (for example, if the run stopped meanwhile). (a) could return `isActive` older than the view; (c) ties Settings to stream internals. | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-002, AC-005 | SCN-001 | SD-01 |
| REQ-002 | UC-001 | BEH-001 | AC-003 | SCN-001 | — |
| REQ-003 | UC-001 | BEH-001 | AC-002, AC-003 | SCN-001 | repro spec |

## Architecture Phase Input

- Approved scenario: SCN-001.
- Constraints: keep the Org stream's reload (BEH-002) and the existing error/Refresh behavior for real failures.
- Technical facts to verify: all callers of `readRunConfig`; whether the retry also suits the stopped-Org path.

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

- Approval recorded: `Yes` (Solution Designer within the direction; user informed)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: none

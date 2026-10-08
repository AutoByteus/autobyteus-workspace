# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-002`
- Package identifier: `archived-open-run-disappears`
- Request / ticket: Project Task from `/project_task_manager`, 2026-10-08 (delivery open point 3 of `workspace-history-group-archive`)
- Requirements owner: Solution Designer
- Date: 2026-10-08
- Approval state and reference: Approved by the user on 2026-10-08 ("I think it's now approved." / "Your recommended approach is reasonable."), accepting the recommended options for DEC-001, DEC-002 and DEC-003.
- Exact approved requirements baseline / solution revision: SR-002 (this document)
- Behavior-defining supplements and their approved versions: None

## Problem And Desired Outcome

- Problem: When a run that is open in the middle area is archived, the archive is saved on the server, but the client re-opens the run. For a standalone agent run, the view stays open and the run comes back in the Workspaces sidebar as a `local` row, also after a window reload. Users think the archive failed.
- Affected actors: desktop/web user managing run history.
- Desired outcome: an archived run disappears — from the sidebar and from the middle area — and stays gone.
- Observable definition of success: after archiving an open run of any kind, the middle area shows the neutral state, the sidebar has no row for that run (no `local` row), and this holds after a window reload and an app restart.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | Open standalone agent run archived (per-run or "Archive all"): view stays open, run returns as a `local` row; persists after reload | View closes to the neutral state; no row for the run | Archive success toast; archive data kept on disk | investigation-notes BEH-001 |
| BEH-002 | User | SCN-002 | Open team run (team or member view) archived: view closes, but if another team is loaded the app selects that team | View closes to the neutral state; no jump to another team | Same | BEH-002 |
| BEH-003 | User | SCN-003 | Open Agent Org run archived: route goes to `/workspace` empty state | Unchanged (already correct) | Org behavior | BEH-003 |
| BEH-004 | User | SCN-004 | Running runs cannot be archived ("Stop running runs first.") | Unchanged | Running-run protection | BEH-004 |
| BEH-005 | System | SCN-005 | Window reload on the archived run's chat route re-opens it as a `local` row | Archived runs stay hidden after reload and restart | — | BEH-005 |
| BEH-006 | User | SCN-006 | Open run deleted (agent/team): agent → re-open fails → "chat not found" page, may briefly select another loaded run; team → may select another loaded team | Same close behavior as archive: workspace empty view, no jump | Delete confirmation; permanent removal of run data | BEH-006 |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User | Clear out runs from history | Archived runs visibly disappear | Must not land on an unrelated run |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Archive a standalone agent run that is open (per-run or "Archive all") | SCN-001 |
| UC-002 | Archive a team run whose team or member view is open (per-run or "Archive all") | SCN-002 |
| UC-003 | Archive an Agent Org run that is open (per-run or "Archive all") — keep current correct behavior | SCN-003 |
| UC-004 | Reload or restart after archiving | SCN-005 |
| UC-005 | Delete a run (agent, team, Agent Org) that is open | SCN-006 |

### Out Of Scope

- Server archive semantics, listing rules, the 6-run cap, and the "hidden live run shown as `local`" projection (open point 2 of the prior ticket).
- Unarchive or an "archived runs" view.
- Archiving or deleting runs that are not open (already works).
- Delete semantics (confirmation, permanent removal of data) — unchanged; only the on-screen outcome of deleting an open run is in scope.

### Non-Goals

- No new confirmation, toast text or button changes.

### Preserved Behavior Boundary

BEH-003, BEH-004; Delete confirmation and permanent data removal; existing archive/“Archive all” toasts and confirmation; drafts and unsaved local runs are not affected by archive; closing/removing a run that is not open does not change what is shown.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that introduces new product behavior is a `Requirement Gap` and needs explicit user approval.
- Adjacent concerns outside this boundary are non-blocking recommendations or separate-ticket candidates.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | After a run is archived (per-run or "Archive all"), the sidebar shows no row for it — not as a history row and not as a `local` row. | BEH-001, BEH-002, BEH-003 | Must | "it should disappear" | User 2026-10-08 |
| REQ-002 | If an archived run (or one of its member views) is open in the middle area, the middle area closes it and shows the neutral state (see DEC-001). It must not open another run. | BEH-001, BEH-002, BEH-003 | Must | No jump to an unrelated agent | User 2026-10-08 |
| REQ-003 | REQ-001 and REQ-002 apply to standalone agent, team (incl. member views) and Agent Org runs. | BEH-001..BEH-003 | Must | All run kinds | User |
| REQ-004 | Archived runs stay hidden after a window reload and after an app restart; an archived run is never re-opened into the sidebar as a `local` row (see DEC-002 for opening its old address). | BEH-005 | Must | Persistence of the outcome | User |
| REQ-005 | Running runs stay protected exactly as today. | BEH-004 | Must | Preserve | User |
| REQ-006 | If a run that is archived or deleted is not the one open, the open view stays as it is. | BEH-001, BEH-002, BEH-006 | Must | No collateral navigation | Derived from REQ-002 |
| REQ-007 | Deleting a run that is open (standalone agent, team incl. member views, Agent Org) closes it the same way as REQ-002: workspace empty view, no other run opened, no row for it. | BEH-006 | Must | Same cleanup path; same "lands somewhere odd" problem | User approval of DEC-003 (2026-10-08) |
| REQ-008 | If the app is asked to open a standalone agent run that the server reports as archived (e.g. a stale chat address via reload or browser Back), it shows the workspace empty view and adds no sidebar row. | BEH-005 | Must | Safety net for REQ-004 | User approval of DEC-002 (2026-10-08) |

## Acceptance Criteria

| AC ID | Related REQ | Related BEH / SCN | Preconditions / Trigger | Observable Expected Outcome | Alternate / Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002, REQ-003 | BEH-001 / SCN-001 | Stopped standalone agent run open in Chat; another agent run also loaded; user clicks the row Archive | Toast "Run archived."; middle area shows the neutral state; no row for the run in the sidebar; the other agent run is not opened | Archive fails → run stays open and listed, error toast as today | Component/store tests + live desktop |
| AC-002 | REQ-001, REQ-002, REQ-003 | BEH-001 / SCN-001 | Same, via the agent group "Archive all" | Same as AC-001 for the open run; whole group gone | — | Tests + live |
| AC-003 | REQ-001, REQ-002, REQ-003 | BEH-002 / SCN-002 | Stopped team run open (team view and, separately, a member view); another team loaded; archive per-run and via "Archive all" | Neutral state; no row for the team; the other team is not opened | — | Tests + live |
| AC-004 | REQ-001, REQ-002, REQ-003 | BEH-003 / SCN-003 | Org run open; archive per-run and via "Archive all" | Neutral state (as today); no row | — | Regression tests |
| AC-005 | REQ-004 | BEH-005 / SCN-005 | After AC-001..AC-004, reload the window; then restart the app | Archived runs absent from the sidebar; no `local` row; middle area neutral | — | Live desktop |
| AC-006 | REQ-005 | BEH-004 / SCN-004 | Running run or group with a running run | Unchanged: no archive, "Stop running runs first." / no row action | — | Regression tests |
| AC-007 | REQ-006 | SCN-001 | Run A open; user archives a different run B | A stays open; B disappears | — | Tests |
| AC-008 | REQ-004, REQ-008 | BEH-005 / SCN-005 | The old chat address of an archived agent run is opened (e.g. reload of a stale address or browser Back) | Workspace empty view; the run is not opened; no `local` row | — | Tests |
| AC-009 | REQ-007, REQ-006 | BEH-006 / SCN-006 | Stopped agent run open in Chat (another agent loaded); stopped team run open (team view and member view; another team loaded); Org run open — each deleted with confirmation | Workspace empty view; no "chat not found" page; no other run opened; no row | Delete fails → stays open and listed, error toast as today | Tests + live |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | Related REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User | Remove an agent run they are looking at | Row Archive or group "Archive all" | Stopped standalone run open in Chat | Archive → confirm (group) → result | Run gone from sidebar and middle area | Running → refused; failure → stays | Supported Normal Scenario | Live seq 7/8; user report | REQ-001..004, AC-001/002/005/007 |
| SCN-002 | User | User | Remove a team run they are looking at | Same | Stopped team run open (team or member view) | Same | Same | Same | Supported Normal Scenario | Code; user task | REQ-001..003, AC-003 |
| SCN-003 | User | User | Remove an Org run they are looking at | Same | Stopped Org run open | Same | Same (already works) | Same | Supported Normal Scenario | Live seq 10 | AC-004 |
| SCN-004 | User | User | Try to archive running runs | Same | Run running | Archive | Refused as today | — | Supported Normal Scenario | Prior ticket | AC-006 |
| SCN-005 | System | App | Keep state after reload/restart | Window reload / app restart / browser Back (web) | Run archived (possibly while open) | Reload/restart/Back | Archived runs stay hidden; stale address shows empty view | — | Supported Normal Scenario (Back/stale address: Supported Explicit Edge Scenario per approved DEC-002) | Live seq 7 note; user 2026-10-08 | AC-005, AC-008 |
| SCN-006 | User | User | Permanently remove a run they are looking at | Row Delete → confirm | Stopped run open | Delete → confirm → result | Run gone; workspace empty view | Delete fails → stays | Supported Normal Scenario | Code; user approval DEC-003 | REQ-007, AC-009 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (navigation outcome only; no new UI)
- Product design fields: `N/A — not applicable`
- Required states: the existing workspace empty view ("Choose agent or team" / "Open runs history") after an open run is archived or deleted, for every run kind.
- Explicitly unresolved product decisions: none.

## Quality And Non-Functional Requirements

N/A — no additional quality constraint beyond REQ/AC.

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`. Archive keeps run data on disk as today.

## External Contracts And Dependencies

None changed.

## Supplemental Artifacts

None.

## Assumptions

| ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The server archive is correct and needs no change | Live evidence shows `archivedAt` set and listings skip archived runs | API/E2E | Evidence-backed |

## Open Decisions And Questions

| ID | Question | Why It Matters | Options / Evidence | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | What is the neutral state after closing an archived open run? | Where the user lands | **A (recommended): the workspace empty view ("Choose agent or team" / "Open runs history") for every run kind — same as Org today.** B: for standalone agent runs, the New chat page instead. | User | **Decided: A** (2026-10-08) |
| DEC-002 | What if the old address of an archived agent run is opened again (e.g. a stale address after reload, or a link)? | Today it re-opens as a `local` row | **A (recommended): show the same neutral state; do not open it.** B: open it read-only, but without a sidebar row. Clarified with the user: rare after the fix (browser Back in web, failed navigation); treated as a safety net. | User | **Decided: A** (2026-10-08) |
| DEC-003 | Should Delete of an open run use the same close behavior? | Delete uses the same cleanup and can also jump to another loaded run or show "chat not found" | **A (recommended): yes, same neutral state, no jump.** B: leave Delete unchanged (separate ticket). | User | **Decided: A** (2026-10-08) |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001..003 | BEH-001..003 | AC-001..004 | SCN-001..003 |
| REQ-002 | UC-001..003 | BEH-001..003 | AC-001..004 | SCN-001..003 |
| REQ-003 | UC-001..003 | BEH-001..003 | AC-001..004 | SCN-001..003 |
| REQ-004 | UC-004 | BEH-005 | AC-005, AC-008 | SCN-005 |
| REQ-007 | UC-005 | BEH-006 | AC-009 | SCN-006 |
| REQ-008 | UC-004 | BEH-005 | AC-008 | SCN-005 |
| REQ-005 | — | BEH-004 | AC-006 | SCN-004 |
| REQ-006 | UC-001, UC-002, UC-005 | BEH-001, BEH-002, BEH-006 | AC-007, AC-009 | SCN-001, SCN-006 |

## Architecture Phase Input

- Scenarios to map: SCN-001..SCN-006.
- Constraints: no server/API change expected; preserve running-run protection, toasts, drafts.
- Deferred to design: where "close the open view" is owned; whether auto-select-on-remove changes globally or only for archive/delete; how a stale archived route is detected (resume config already reports `RUN_ARCHIVED`).
- Verify: team open-run archive live (not yet observed); Org regression.
- Risks: changing auto-select may affect other close paths (draft close, terminate).

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes` (team open case code-only, flagged)
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

- User approval received: `Yes` (2026-10-08)
- Exact requirements and supplement approval basis recorded: `Yes` (SR-002)
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None

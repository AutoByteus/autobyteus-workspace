# Requirements Document

## Document Status

- Status: `Approved` (SR-003 — all-or-nothing when any run is running; approved by user 2026-10-08: "exactly. but keep the messages ui clean thanks")
- Current solution revision ID: `SR-003`
- Package identifier: `workspace-history-group-archive`
- Request / ticket: Project Task from `/project_task_manager`, user request 2026-10-08 (origin: `new-ticket-request-group-archive.md` in `run-continuity-after-agent-definition-rename`)
- Requirements owner: Solution Designer
- Date: 2026-10-08
- Approval state and reference: Approved. User clarifications 2026-10-08: (1) with a screenshot of the "Codex (5)" header — "its more like a batach archive all the runs underneath right?" (button on the group header next to `+`, batch-archives the runs below); (2) "the same as agent teams and agent orgs" (identical behaviour on team and org headers); (3) screenshot of team header "English Bridge Team (2)" with two team runs — the button sits at the right end of that header (team headers have no `+`) and archives both team runs. DEC-001..DEC-005 approved as recommended. **Approved by user 2026-10-08: "approve".**
- Exact approved requirements baseline / solution revision: this document as recorded at SR-002 (content of SR-001 + clarifications); REQ-001..REQ-007, AC-001..AC-009, DEC-001..DEC-005 (recommended options), ASM-001 confirmed.
- Behavior-defining supplements and their approved versions: None

## Problem And Desired Outcome

- Problem: The Workspaces sidebar groups runs under an agent, an agent team or an Agent Org. Runs can only be archived one at a time. When an agent/team/org is renamed or removed, all its old runs become useless clutter, and clearing them takes one click per run (and for standalone agents, older runs keep reappearing because only the 6 newest are shown).
- Affected actors: users who iterate on agent, team and org packages.
- Desired outcome: one "Archive all" action on each group header archives every stopped run in that group, for that workspace, in one step.
- Observable success: after renaming `tutorial-video-producer`, the user hovers its group header in workspace W, clicks "Archive all", confirms, and the group disappears from W (or only its running runs remain). One message reports how many runs were archived and how many running runs were kept.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001..003 | Archive only per run row | Unchanged | Per-run archive and delete work as today | `WorkspaceHistoryWorkspaceSection.vue`, `useWorkspaceHistoryMutations.ts` |
| BEH-002 | User | SCN-001..003 | Group header only expands/collapses (agent header also has `+`) | Group header offers "Archive all" for agent, team and org groups | Expand/collapse and `+` unchanged | same; `WorkspaceAgentOrgHistoryCollection.vue` |
| BEH-003 | System | SCN-001 | Standalone groups show the 6 newest unarchived runs per agent per workspace | No change to listing; "Archive all" also covers the stored runs not shown (per DEC-001) | 6-run cap | `agent-run-history-service.ts:61–110` |
| BEH-005 | User | — | No in-app way to view or restore archived runs | Unchanged (per DEC-004) | Archived data stays on disk | grep: no unarchive API/UI |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Sidebar user | Clear all runs of an obsolete agent/team/org | One action, confirmed, with a clear result | Running work is never interrupted; nothing is deleted |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Archive all runs of a standalone agent group in one workspace | SCN-001 |
| UC-002 | Archive all runs of an agent team group in one workspace | SCN-002 |
| UC-003 | Archive all runs of an Agent Org group in one workspace | SCN-003 |

### Out Of Scope

- Group-level permanent delete (DEC-005).
- Unarchive / an "archived runs" view (DEC-004) — separate-ticket candidate.
- Group-header "Reconnect all" (sibling idea; not specified anywhere yet).
- Archiving a whole workspace, or the same agent's runs across all workspaces.
- Changing the 6-run listing cap.

### Non-Goals

- Stopping running runs as part of archiving.

### Preserved Behavior Boundary

BEH-001, BEH-003 listing cap, BEH-005; the existing per-run archive guard (running runs cannot be archived) and data retention on archive.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source / Decision |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Every agent, agent team and Agent Org group header in the Workspaces sidebar offers an "Archive all" action, shown and styled like the existing row archive action (archive icon, revealed on hover/focus). | BEH-002 | Must | User request | User 2026-10-08 |
| REQ-002 | "Archive all" archives every stopped, stored run of that group **in that workspace**, including standalone runs not currently shown because of the 6-run cap. | BEH-002, BEH-003 | Must | "I want to archive all" | DEC-001 |
| REQ-003 | Before archiving, a confirmation dialog names the group and workspace and states that running runs will be kept and that archived runs are hidden from history. Cancel changes nothing. | BEH-002 | Must | Bulk action with no in-app undo | DEC-002 |
| REQ-004 | Running runs (and unsent drafts / not-yet-saved runs) are skipped, not stopped; they stay in the group. | BEH-001 | Must | Archive already refuses active runs | DEC-003 |
| REQ-005 | After the action, one result message reports how many runs were archived, how many running runs were kept, and how many failed (if any). Failures do not undo successful archives. | BEH-002 | Must | Clear outcome without one toast per run | DEC-003 |
| REQ-006 | While a group archive is in progress, the header action is disabled and shows progress; the sidebar refreshes once at the end. If the selected/open run is archived, it is closed just as with per-run archive. | BEH-001, BEH-002 | Must | Consistency with per-run archive | — |
| REQ-007 | "Archive all" is not offered (or is disabled) when the group has nothing archivable (e.g. only running runs or drafts). | BEH-002 | Should | Avoid a no-op action | — |

## Acceptance Criteria

| AC ID | Related REQ | Scenario | Preconditions / Trigger | Observable Expected Outcome | Alternate / Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | SCN-001..003 | Hover an agent, a team and an org group header | Each shows an "Archive all" archive icon with tooltip/aria-label | — | Component test + browser check |
| AC-002 | REQ-002, REQ-003 | SCN-001 | Workspace W has 10 stopped runs of agent A (6 shown); click Archive all, confirm | All 10 archived; group A disappears from W; runs of A in other workspaces untouched | — | API/E2E with >6 runs |
| AC-003 | REQ-002 | SCN-002, SCN-003 | Team group T (or org group O) with 3 stopped runs; Archive all, confirm | All 3 archived; group disappears | — | API/E2E |
| AC-004 | REQ-003 | SCN-001..003 | Click Archive all, then Cancel | Nothing archived | — | Component test |
| AC-005 | REQ-004, REQ-005 | SCN-001..003 | Group has 4 stopped + 1 running run (and/or a draft) | 4 archived; running run (and draft) stay and keep running; message "4 archived, 1 running run kept" | — | API/E2E + component test |
| AC-006 | REQ-005 | SCN-001..003 | One run's archive fails | Others archived; message reports the failure count; failed run stays visible | — | Unit/component test |
| AC-007 | REQ-006 | SCN-001 | The open run belongs to the group | It is closed/deselected like per-run archive; action disabled while in progress; one refresh | — | Component test |
| AC-008 | REQ-007 | SCN-001..003 | Group contains only running runs | Archive all hidden or disabled | — | Component test |
| AC-009 | BEH-001 | — | Per-run archive and delete | Unchanged behavior | — | Existing tests stay green |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger / Entry | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | Related IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Sidebar user | Clear all runs of an obsolete standalone agent | Agent group header in workspace W | Agent renamed/removed; group has stopped (and maybe running) runs, possibly >6 | Hover header → Archive all → confirm | All stopped runs of that agent in W archived; result message | Cancel; running runs kept; partial failure reported | Supported Normal Scenario | User request 2026-10-08 | REQ-001..007, AC-001..008 |
| SCN-002 | User | Sidebar user | Same for an agent team | Team group header | Same | Same | Same | Same | Supported Normal Scenario | User clarification 2026-10-08 | REQ-001..007 |
| SCN-003 | User | Sidebar user | Same for an Agent Org | Org group header | Same | Same | Same | Same | Supported Normal Scenario | User clarification 2026-10-08 | REQ-001..007 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`
- Linked UI/UX or interaction supplement: None — reuses existing sidebar patterns (row archive icon, existing confirmation dialog, toast).
- Linked runnable UI reference / design repository / UI/UX specification: N/A — not applicable
- Product ticket record and folder: N/A — not applicable
- Design repository revision or commit: N/A — not applicable
- UI/UX user-confirmation reference: N/A — not applicable
- Approved visual-reference baseline: N/A — not applicable
- Normative details: archive-box icon on the group header, hover/focus-revealed like row actions; confirmation dialog; single summary toast.
- Explicitly illustrative / permitted variation: exact wording, icon placement order relative to `+`.
- Unresolved product decisions: DEC-001..DEC-005.

## Quality And Non-Functional Requirements

| Quality ID | Related IDs | Area | Requirement | Conditions | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-006 | Performance | One sidebar refresh per group archive, not one per run | Groups of dozens of runs | Unit test on refresh count |
| QR-002 | REQ-001 | Accessibility | Header action is keyboard reachable with an aria-label | All three group kinds | Component test |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes` — `archivedAt` set on archived runs.
- Must be preserved: all run files, history and conversations (archive never deletes).
- Acceptable loss: none.
- Constraints: none beyond existing per-run archive guarantees.

## External Contracts And Dependencies

| Contract | Required Behavior | Authority | Risk |
| --- | --- | --- | --- |
| Existing per-run archive mutations | Same guarantees per run (active guard, transactional team/org writes) | Catalog services | None new |

## Supplemental Artifacts

None.

## Assumptions

| ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | "Group" means the group as shown under one workspace | Headers live inside a workspace section | Presented to user; approved with the package | Confirmed |

## Open Decisions And Questions

| ID | Question | Why It Matters | Options / Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | Archive only the runs shown, or all stored runs of the group? | Standalone groups show only the 6 newest; older ones reappear after archiving | **A (recommended): all stored runs of that agent/team/org in that workspace.** B: only visible runs (you may need to click several times). | User | Approved (recommended option) |
| DEC-002 | Confirmation step? | Bulk, no in-app undo | **Yes (recommended)**, a dialog naming the group. | User | Approved (recommended option) |
| DEC-003 | Runs currently running? | Backend refuses to archive them | **Skip and report (recommended).** Alternative: stop them first, then archive. | User | Approved (recommended option) |
| DEC-004 | Unarchive? | No in-app restore exists today | **Out of scope (recommended)** — data stays on disk; a separate "archived runs / restore" ticket if wanted. | User | Approved (recommended option) |
| DEC-005 | Also "Delete all" on the header? | Permanent, bulk | **Not in this ticket (recommended)**; add later if needed. | User | Approved (recommended option) |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | AC IDs | Scenario IDs | Supplemental Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001..003 | BEH-002 | AC-001 | SCN-001..003 | — |
| REQ-002 | UC-001..003 | BEH-002, BEH-003 | AC-002, AC-003 | SCN-001..003 | DEC-001 |
| REQ-003 | UC-001..003 | BEH-002 | AC-002, AC-004 | SCN-001..003 | DEC-002 |
| REQ-004 | UC-001..003 | BEH-001 | AC-005 | SCN-001..003 | DEC-003 |
| REQ-005 | UC-001..003 | BEH-002 | AC-005, AC-006 | SCN-001..003 | DEC-003 |
| REQ-006 | UC-001..003 | BEH-001, BEH-002 | AC-007 | SCN-001 | — |
| REQ-007 | UC-001..003 | BEH-002 | AC-008 | SCN-001..003 | — |

## Architecture Phase Input

- Approved scenario IDs: SCN-001..SCN-003 (after approval).
- Constraints to preserve: per-run archive guards and transactional writes; 6-run listing cap; data retention.
- Deferred to architecture: whether group archive is a new server operation (needed to reach hidden standalone runs under DEC-001 A) or a client loop; where confirmation/pending state lives; single refresh.
- Facts to verify: how to enumerate all stored runs of an agent/team/org in a workspace (workspace root canonicalization); org/team group keys (definition id vs name fallback).
- Risks: merge overlap with `codex/run-continuity-after-agent-definition-rename` in `WorkspaceAgentOrgHistoryCollection.vue`.

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

- User approval received: `Yes` (2026-10-08, "approve")
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None


## SR-003 Approved Delta (supersedes the listed SR-002 rows)

Approval: user 2026-10-08 — "exactly. but keep the messages ui clean thanks". Where this section and the tables above differ, this section governs.

Trigger: user, 2026-10-08 — "i guess if any one of them are running, then user will not click archive right? if you really want security, if any of them are not stopped, just give user error messages that you have to stopp all of them stuff like this how about that".

| ID | Change | Replaces |
| --- | --- | --- |
| DEC-003 (rev) | **All-or-nothing.** If any run of the group in that workspace is running (team: also stopping / not ready), Archive all archives nothing and shows an error asking the user to stop the running runs first. | DEC-003 "skip and report" |
| REQ-004 (rev) | If any run of the group is running, nothing is archived; an error message names the group and how many runs are still running, and asks the user to stop them first. The check happens on click, before the confirmation dialog, and again at execution (server check for standalone groups covers runs beyond the 6 shown). Unsent drafts / not-yet-saved runs do not block and are left untouched. | REQ-004 |
| REQ-005 (rev) | After archiving, one message reports how many runs were archived and how many failed (if any). | REQ-005 |
| REQ-007 (rev) | The button is shown whenever the group has at least one saved run; clicking it with running runs shows the REQ-004 error. | REQ-007 |
| AC-005 (rev) | Group has 4 stopped + 1 running run → click Archive all → error "1 run of <group> is still running. Stop it first, then archive all."; no confirmation; nothing archived. After stopping it, Archive all archives all 5. | AC-005 |
| AC-008 (rev) | Group with only running runs → button shown; click → same error; nothing archived. | AC-008 |
| AC-010 (new) | A run starts between confirmation and execution → nothing further is archived for a standalone group (server refuses the whole group); for team/org the started run is refused by the per-run guard and reported as failed. | — |
| QR-003 (new) | Messages stay short and clean: one short line each, no run IDs, no technical detail; at most the group name and a count. Target wording (en): blocked — "Stop running runs first."; confirm — title "Archive all runs?", body "{name} · {count} runs will be hidden from history." (count omitted when unknown), button "Archive all"; success — "Archived {count} runs."; partial — "Archived {count} runs. {failed} failed." Exact wording may be polished but must stay at this length. | REQ-003, REQ-004, REQ-005 |

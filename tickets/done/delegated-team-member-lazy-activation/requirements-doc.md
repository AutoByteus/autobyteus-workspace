# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-002`
- Package identifier: `delegated-team-member-lazy-activation`
- Request / ticket: Project Task Manager delegation, 2026-10-08 — delegated Team copy shows every member active
- Requirements owner: Solution Designer (`/software_engineering_team/solution_designer`)
- Date: 2026-10-08
- Approval state and reference: Approved. User, 2026-10-08: "I think this is clear because in other places we almost start the worker lazily. We should do it here. There's no exception here. Go, I think it's approved." — in reply to "Shall I take that as 'approved, A' and start the design?"
- Exact approved requirements baseline / solution revision: SR-001 baseline with DEC-001 = A (recorded in SR-002)
- Behavior-defining supplements and their approved versions: None

## Problem And Desired Outcome

- Problem: When `delegate_task` spawns a Team copy, the server activates **every** member at once — each gets a live AgentRun and a provider session/thread (Codex `thread/start`; Claude session + materialized skills). So the sidebar's green "Idle" for unused members is truthful about the runtime, but the runtime itself breaks the activate-on-work principle and wastes resources. The user's run proves it: all six members of both delegated `software_engineering_team` copies have a persisted provider binding, while only three ever had a conversation.
- Affected actors or systems: any agent delegating a Team (Project Task Manager or another standalone Agent, a Team member, an Org member, and Team helpers brought in for Task work); the members of the copy; the user watching status.
- Desired outcome: A delegated Team copy starts only its coordinator (which receives the work). Every other member stays not started (no AgentRun, no provider session) until a message or handoff reaches it, and its status shows as not started until then.
- Observable definition of success: Right after delegation, only the coordinator is non-gray; other members are gray "Offline" (DEC-001 = A) and have no provider session/binding. A member turns active only after work reaches it.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001, SCN-002, SCN-003 | Delegating a Team copy activates every member; all show green Idle | Only the coordinator activates (through the delivered work); other members stay not started and show as not started | Coordinator gets the work as its first message; `delegate_task` result (`target_agent_run_id`, `target_kind`, `task_id`) unchanged | Investigation Source Log rows 1–6, Data rows |
| BEH-002 | User | SCN-005 | UI-started Team: unused members not started (gray) | Unchanged | Fully preserved | `team-root-materializer.ts:98` |
| BEH-003 | System | SCN-005 | `send_message_to` a Team address: only the coordinator starts | Unchanged | Fully preserved | `collaborator-team-execution-registry.ts:50` |
| BEH-004 | System | SCN-004 | Restored delegated copy: members start lazily on input | Unchanged, and must also work for copies whose unused members were never started | Restore of copies created before the fix (all members bound) keeps working | `root-team-execution-directory.ts:240-260` |
| BEH-005 | System | SCN-002 | Member receiving a teammate message/handoff runs, then goes idle | A not-started member starts on that message (amber "initializing" → blue running → green idle) | Message delivery, handoff rules, conversation content | `configured-agent-execution-handle.ts` |
| BEH-006 | System | — | `delegate_task` to a single Agent activates it and gives it work immediately | Unchanged | Fully preserved | `root-agent-execution-registry.ts:140` |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User | Trust status dots; avoid wasted runtime resources | Green/blue only for really started members | Same meaning as for UI-started Teams |
| Delegating agent | Hand work to a Team | Delegation works as before | No contract change |
| Delegated Team members | Collaborate via messages/handoffs | Start when work reaches them | No loss of messages or conversation continuity |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Delegate work to a Team copy (from a standalone Agent, a Team member or an Org member; with description or task_id; and Team helpers brought in for Task work) | SCN-001, SCN-003 |
| UC-002 | A not-started member of a delegated copy receives its first message/handoff | SCN-002 |
| UC-003 | A delegated copy is idle-shut-down, restored, DONE-closed or reactivated while some members were never started | SCN-004 |

### Out Of Scope

- Single-Agent delegation (BEH-006), UI-started Teams (BEH-002), collaborator Teams (BEH-003): already correct, not changed.
- New status values, new colors or a new "Not started" label, unless the user picks that in DEC-001.
- Stopping members of copies already delegated before the fix (they expire through normal idle shutdown/restart).
- Per-member idle shutdown inside a live copy (members that finished their work stay idle/green while the copy is live — that is a truthful running state).
- Codex/Claude provider internals.

### Non-Goals

- No change to how the coordinator, handoffs or routing rules work.
- No performance target beyond "unused members create no runtime resources".

### Preserved Behavior Boundary

BEH-002, BEH-003, BEH-004 (restore of existing copies), BEH-006; `delegate_task` tool contract and result shape; Task DONE/reactivation behavior; conversation continuity for members that did start.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | When a Team copy is delegated, only the member that receives the work (the coordinator) is started. No other member gets a live run or a provider session/thread at delegation time. | BEH-001 | Must | Activate-on-work principle | User request; prior decision `collaboration-follow-up-fixes` ASM-002 |
| REQ-002 | A not-started member of a delegated copy starts when a message, handoff or user input reaches it, and then processes that input normally. | BEH-005 | Must | Collaboration must still work | User request |
| REQ-003 | Sidebar and member header show each member's true state: not-started members show as not started (DEC-001 = A: gray "Offline"); green/blue only for members that are really started. No display-only workaround. | BEH-001, BEH-005 | Must | Status must be truthful | User request |
| REQ-004 | Applies to every way a Team copy is delegated: from a standalone Agent, from a Team member, from an Org member, description- or task_id-based, and Team helpers brought in for Task work. | BEH-001 | Must | Same root cause in each path | Investigation |
| REQ-005 | If a not-started member cannot start (e.g. provider error), the failure is reported when work reaches it (to whoever sent that work, and as the member's error status), not at delegation time. Delegation fails only if the coordinator cannot start. | BEH-001, BEH-005 | Must | Consequence of REQ-001; same as UI-started Teams today | Investigation R-001 |
| REQ-006 | Idle shutdown, restore after shutdown/restart, Task DONE and reactivation keep working for copies with not-started members, and for copies delegated before this change (all members bound). | BEH-004 | Must | Lifecycle continuity | Investigation |
| REQ-007 | Team UI start, `send_message_to` to a Team and single-Agent delegation behave exactly as before. | BEH-002, BEH-003, BEH-006 | Must | No regression | Investigation |

## Acceptance Criteria

| AC ID | Related REQ | Related BEH / SCN | Preconditions / Trigger | Observable Expected Outcome | Alternate / Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-003 | BEH-001 / SCN-001 | An agent delegates a 6-member Team copy | Coordinator shows initializing → running; the other 5 show gray "Offline" in sidebar and header; they have no live run and no provider binding in the saved tree | — | Executable server test + real-app check |
| AC-002 | REQ-002, REQ-003 | BEH-005 / SCN-002 | Coordinator hands off to a not-started member | That member starts, shows amber then blue, processes the message, then green Idle; members still without work stay gray | — | Executable test + real-app check |
| AC-003 | REQ-004 | SCN-003 | Team copy delegated by a Team member, by an Org member, and with task_id | Same outcome as AC-001 in each case | — | Executable tests |
| AC-004 | REQ-005 | SCN-002 | A not-started member cannot start when work reaches it | Sender gets a delivery failure; member shows error; other members and coordinator unaffected; delegation itself had succeeded | Coordinator start failure still fails `delegate_task` as today | Executable test |
| AC-005 | REQ-006 | SCN-004 | Copy with not-started members goes through idle shutdown, then is messaged again; also app restart; also Task DONE then reactivation | Copy restores; only members that receive work start; no errors from never-started members | Legacy copy (all members bound, unused ones without conversation) restores and its unused members stay not started | Executable tests |
| AC-006 | REQ-007 | SCN-005 | Team started from UI; `send_message_to` a Team; delegate a single Agent | Behaviour identical to before (existing tests pass) | — | Existing test suites |
| AC-007 | REQ-001..003 | SCN-001 | User reproduces in the desktop app (Project Task Manager delegates a Team) | Only coordinator active at first; others gray until they get work | — | User verification in desktop app |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator | Goal / Event | Trigger / Entry Surface | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | Related REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | Delegating Agent (e.g. Project Task Manager) | Give work to a Team | `delegate_task` to a Team address | Delegator live | Copy spawned → coordinator receives work → others wait | Only coordinator started | Coordinator start fails → delegation fails | Supported Normal Scenario | User's run 2026-10-08 | REQ-001,003; AC-001, AC-007 |
| SCN-002 | System | Team member | Pass work along | `send_message_to` teammate / handoff rule | Recipient not started | Message delivered → recipient starts → runs → idle | Recipient becomes active only now | Recipient cannot start → sender gets error | Supported Normal Scenario | User's run messages | REQ-002,005; AC-002, AC-004 |
| SCN-003 | System | Team member / Org member / Task worker | Delegate a Team copy from inside a Team, Org or as a Task helper | `delegate_task` / helper bring-in | — | as SCN-001 | as SCN-001 | — | Supported Normal Scenario | Source entrypoints | REQ-004; AC-003 |
| SCN-004 | System/Operational | Lifecycle | Copy shuts down idle, app restarts, Task DONE/reopen | Idle grace, restart, DONE, reactivation message | Some members never started | Restore on next work | Only addressed members start | Legacy eagerly-bound copies restore | Supported Normal Scenario | Lifecycle code | REQ-006; AC-005 |
| SCN-005 | User/System | User / Agent | Start Team from UI; message a Team; delegate an Agent | UI run, `send_message_to`, `delegate_task` to Agent | — | unchanged | unchanged | — | Supported Normal Scenario | Source | REQ-007; AC-006 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (status presentation only, existing states)
- Linked UI/UX or interaction supplement: N/A — not applicable
- Linked runnable UI reference / design repo / UI/UX spec: N/A — not applicable
- Product ticket record and folder: N/A — not applicable
- Design repository revision or commit: N/A — not applicable
- UI/UX user-confirmation reference: N/A — not applicable
- Approved visual-reference baseline: N/A — not applicable
- Normative details: Use existing states — gray dot + "Offline" for not started; amber initializing; blue running; green idle; red error (DEC-001 = A).
- Explicitly illustrative content or permitted variation: N/A
- Required states: as above.
- Explicitly unresolved product decisions: None.

## Quality And Non-Functional Requirements

| Quality ID | Related REQ / AC | Area | Measurable Requirement | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001 / AC-001 | Performance | Delegating an N-member Team creates exactly 1 provider session/thread at delegation time (the coordinator's) | Any runtime kind | Executable test counting activations |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes` (shape unchanged)
- Data that must be preserved: existing collaboration trees and their member bindings; conversations of members that started.
- Acceptable loss: None.
- Constraints: New copies will save `null` bindings for not-started members (already allowed).
- Unknowns: Architecture confirms late binding persistence in all root kinds (U-001).

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence | Uncertainty |
| --- | --- | --- | --- |
| `delegate_task` tool | Result and semantics unchanged | Tool contract | None |

## Supplemental Artifacts

| Artifact Path | Purpose | Related REQ / AC | Status | Approval |
| --- | --- | --- | --- | --- |
| None | — | — | — | — |

## Assumptions

| ID | Assumption | Why Necessary | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | "Coordinator" is the only member that receives the delegated work; no other member must be pre-started for the Team to function | Basis of REQ-001 | Team copies work this way when restored (BEH-004) | Confirmed in architecture investigation |

## Open Decisions And Questions

| ID | Question | Why It Matters | Options / Evidence | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | How should a not-started member look? | You asked for "shown as not started" | **A (recommended):** existing gray dot + "Offline" — same as unused members of a UI-started Team today, no new state. **B:** new label "Not started" for members that have never run (still gray), distinct from "Offline" after shutdown — needs a new state across server, contracts and UI for all Teams | User | Decided: **A** (user approval 2026-10-08) |
| DEC-002 | api e2e engineer blue dot | You asked whether it was legitimate | It was: implementation engineer sent it "Implementation Complete" at 06:54 local (direct route, Medium/Low, so architecture review and code review were skipped) and it worked until ~07:19. No change needed | — | Answered (no requirement) |

## Traceability

| REQ | UC | BEH | AC | SCN | Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-007 | SCN-001 | Investigation |
| REQ-002 | UC-002 | BEH-005 | AC-002 | SCN-002 | Investigation |
| REQ-003 | UC-001, UC-002 | BEH-001, BEH-005 | AC-001, AC-002, AC-007 | SCN-001, SCN-002 | Investigation |
| REQ-004 | UC-001 | BEH-001 | AC-003 | SCN-003 | Investigation |
| REQ-005 | UC-002 | BEH-001, BEH-005 | AC-004 | SCN-002 | Investigation R-001 |
| REQ-006 | UC-003 | BEH-004 | AC-005 | SCN-004 | Investigation |
| REQ-007 | — | BEH-002, BEH-003, BEH-006 | AC-006 | SCN-005 | Investigation |

## Architecture Phase Input

- Approved scenarios: SCN-001..SCN-005.
- Constraints: reuse the existing lazy member activation path; no display-only fix; no `delegate_task` contract change.
- Deferred to architecture: whether task-Team staged-binding plumbing is removed or kept; test changes for previously eager behavior.
- Technical facts to verify: late binding persistence for Team and Org roots (U-001); seed delivery ordering; idle shutdown with not-started members; DONE/reactivation; legacy restore.
- Known risks: R-001 (deferred member failure), R-002 (already-live copies keep eager members until shutdown).

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

- User approval received: `Yes`
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None

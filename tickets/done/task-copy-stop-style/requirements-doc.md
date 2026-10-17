# Requirements — Task-copy stop styling

## Document Status
- Package: `task-copy-stop-style`; Project Task `project_task_018ddc81-1f14-4531-8143-1276d07736d3`.
- Status: **Approved**; requirements baseline **R1 / SR-001**, 2026-10-13.
- Requested by: `/project_task_manager`; delegator AgentRun `project_task_manager_2f7a8ea2d421446f8f22e4f616528547`.
- Owner/approver: `/software_engineering_team/solution_designer`, within the user's direction.
- Approval reference: conversation message 2026-10-13 beginning “The sidebar copy control uses `text-red-500`”; user informed that this is styling-only, with preserved interaction/lifecycle and Settings/docking excluded. The delegated request carries user immediate-dispatch approval, “Yeah, immediately, thanks.”
- Behavior-defining supplement: existing normal sidebar run control is the reference, as explicitly requested; user screenshots are supporting evidence, not a new design. No Product package.
- Authorities read: bundled solution-designer SKILL.md and references/requirements-engineering.md; root AGENTS.md and autobyteus-web/AGENTS.md; TESTING.md (current isolated base).

## Problem And Desired Outcome
Delegated Agent-copy and AgentTeam-copy stop icons are red at rest while their normal sidebar parent is gray, despite already using the same red hover colors. Match that implemented normal control, without redesigning cancellation, delegation, or the parent. Success is neutral → red hover → neutral on pointer leave for both copy types, with all existing interaction behavior retained.

## Relevant Current And Desired Behavior
| ID | Kind / scenarios | Evidence-backed current | Desired | Preserved |
|---|---|---|---|---|
| BEH-001 | User; SCN-001 | Both copy types share an always-red resting sidebar stop icon; parent is gray. | Same neutral and hover color/background/transition presentation as normal sidebar Stop. | Current placement, hit area, stop glyph and row layout. |
| BEH-002 | User; SCN-002 | A live copy offers a separately focusable labelled button; pending stop disables it and pulses its glyph. | Retain keyboard focus and accessible activation, pending feedback and disabled behavior. | Titles/labels, focus-visible ring, event containment, reduced-motion treatment. |
| BEH-003 | User/System; SCN-003 | Stop targets one Agent copy or a whole Team copy through its existing stop action; parent/other workers continue, Task remains open. | Unchanged. | Liveness visibility, target identity, stop/resume semantics, history and Task state. |

## Stakeholders, Actors And Outcomes
User observes and optionally stops a delegated copy. Other workers and live user conversations must not be interrupted by verification. Implementation/validation use test-owned instances and data only.

## Scope Guardrail
### In-Scope Use Cases
- UC-001: observe and hover/leave either copy's sidebar Stop (SCN-001).
- UC-002: focus/activate either copy's sidebar Stop and observe pending/stopped presentation without behavior changes (SCN-002/003).
### Out Of Scope
Normal parent control changes; Settings stop controls (which currently match their own red Settings parent); unrelated controls; cancellation/delegation/Task lifecycle redesign; server/runtime/storage changes; sidebar docking/overlay Task `project_task_082715d8-9e38-4dc4-b89c-7a6b7d2a00ba`. Shared code is not a functional dependency.
### Non-Goals
No new visual language, spacing/sizing redesign, new stop surfaces, or new keyboard conventions.
### Preserved Behavior Boundary
BEH-002/003 and REQ-002/003. No writes to live user data and no stopping real user workers. A shared sidebar component may carry the same styling to its existing collaborator consumers; do not add copy-specific branching or change which rows use it.
### Review Authority
Blocking corrections must trace to an approved REQ/AC/BEH. New scope or behavior is a Requirement Gap needing renewed approval, not a reviewer-mandated expansion. Adjacent issues become follow-ups to the delegator.

## Requirements
| ID | Requirement | Behavior | Priority / rationale |
|---|---|---|---|
| REQ-001 | Both delegated copy types' sidebar Stop is neutral at rest, red on hover, and neutral again on leave, using the existing normal sidebar run Stop's implemented colors and hover presentation. | BEH-001 | Must; explicit user direction |
| REQ-002 | Retain existing keyboard focus/accessibility, titles, button semantics, reduced-motion handling, and disabled/loading feedback. | BEH-002 | Must; direction and current conventions |
| REQ-003 | Retain visibility, event containment and exact Agent-copy versus whole-Team-copy stop targeting, with no changes to Task/worker lifecycle or parent/sibling behavior. | BEH-003 | Must; feature works already |
| REQ-004 | Verify rendered default/hover/leave states for both copy types and functional targeting through isolated tests, without touching live user workers. Report actual source integration separately from installed/running app rollout. | BEH-001/002/003 | Must; explicit done conditions and TESTING.md |

## Acceptance Criteria
| ID | Requirements / scenario | Trigger | Observable expected outcome / alternate | Verification intent |
|---|---|---|---|---|
| AC-001 | REQ-001/004; SCN-001 | Render a live Agent copy; hover its Stop then move away. | Default matches normal run gray; hover matches its red foreground/light-red background; leave returns to default after transition. Parent and surrounding controls unchanged. | Component regression plus real CSS/computed-style and rendered screenshots. |
| AC-002 | REQ-001/004; SCN-001 | Repeat on live Team copy row. | Same states as AC-001; applies to Team copy, not an individual member stop. | Same browser evidence for second copy type. |
| AC-003 | REQ-002/004; SCN-002 | Tab to Stop; activate; hold test-owned request pending. | Existing visible focus treatment and accessible name remain; keyboard activation does not select/toggle the row; pending remains visible, disabled, pulsing with reduced-motion override, no duplicate stop. | DOM/focus checks and component assertions for both types. |
| AC-004 | REQ-003/004; SCN-003 | Click each live copy's Stop in a controlled test. | Agent reference uses its agent run ID; Team reference uses whole team run ID; same root identity; no row selection/toggle. Stopped/no-root/ineligible member rows remain without Stop. Existing Task-open/parent-survival behavior unchanged. | Exact action/payload assertions plus existing isolated stop coverage as appropriate; no live-worker clicks. |
| AC-005 | REQ-004; all | Delivery concludes. | Receipt links test commands/results/screenshots, regression evidence, source/runtime state, any remaining user check and cleanup of test-owned resources. | Delivery evidence review. |

## Relevant Scenarios And Journeys
| ID | Kind / actor | Goal, supported trigger, starting state | Product sequence / outcome | Alternate | Validity / independent evidence |
|---|---|---|---|---|---|
| SCN-001 | User | Inspect active delegated Agent or Team copy in sidebar of a run. | See stop at rest → hover → move away; visual emphasis follows pointer like normal parent Stop. | Selected/unselected row does not make resting Stop red. | Supported Normal Scenario; user's screenshots and request; existing sidebar rows. |
| SCN-002 | User | Keyboard user wants to stop a visible live copy. | Tab to its Stop → focus is apparent → Enter/Space activates stop only; pending disables activation. | Stop completion hides control once no longer live; failure retains current retry/feedback behavior. | Supported Normal Scenario; existing native button and focus/keydown handlers, explicit preservation direction. |
| SCN-003 | User/System | Stop a single delegated copy independently, not the parent run. | Click copy Stop → selected copy stops (whole Team when selected) → parent/other workers continue; Task stays open and copy can resume on next message. | Existing liveness and pending/error behavior retained. | Supported Normal Scenario; user says feature works; predecessor delegated-copy-model-change requirements and current source. |

## UI, Interaction And Experience Requirements
Applicable: Yes. Reference: `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` normal `terminate-agent-run` control (base e22245f09). Normative direction is its neutral/resting and red-hover presentation, not a new mockup. Preserve copy component geometry and explicit accessibility/loading treatment. Product repository/ticket/UI-UX specification/user-confirmation fields: **N/A — not applicable**, no Product design requested or needed. Screenshots are evidence; their task names/content are illustrative, not fixtures to reproduce.

## Quality And Non-Functional Requirements
- QR-001 → REQ-002/AC-003: no accessibility or disabled/pending regression.
- QR-002 → REQ-004/AC-005: test-owned data/processes, no real worker interruption, honest evidence limitations.

## Data Continuity And Acceptable Loss
Persisted data affected: No. Preserve all conversations, Tasks, worker identity/history and model settings. No reset/deletion acceptable. No migration or data rewrite needed by requirements.

## External Contracts And Dependencies
TESTING.md governs safe validation. RELEASE.md governs downstream finalization; no release was requested. Existing sidebar docking ticket is independent. No external API/library change requested.

## Supplemental Artifacts
The two user screenshots are inventoried with absolute paths in investigation-notes.md. They support BEH-001; no separate behavior-defining Product supplement. Predecessor `tickets/done/delegated-copy-model-change/requirements-doc.md` is historical context, not this ticket's change authority.

## Assumptions / Decisions
| ID | Question | Evidence/reasoning then decision | Owner/status |
|---|---|---|---|
| DEC-001 | Which existing control is reference? | User names normal PM sidebar run Stop; implemented parent there is gray while Settings parent is red. Use sidebar parent, not the Settings parent, and leave Settings alone. | Solution Designer / Decided |
| DEC-002 | How much presentation changes? | Only resting color differs from the requested color interaction; hover tokens already match. Preserve copy dimensions, focus and pending conventions rather than homogenizing every class. | Solution Designer / Decided |
| DEC-003 | Must validation stop real workers? | User explicitly forbids interruption and TESTING.md mandates isolation. Test-owned fixtures/actions and isolated existing stop journeys suffice for this renderer-only change; do not click live controls. | Solution Designer / Decided |
No material unresolved assumption or Needs user decision.

## Traceability
REQ-001 → UC-001, BEH-001, SCN-001, AC-001/002.
REQ-002 → UC-002, BEH-002, SCN-002, AC-003.
REQ-003 → UC-002, BEH-003, SCN-003, AC-004.
REQ-004 → UC-001/002, all BEH/SCN, AC-001..005.

## Architecture Phase Input
Approved: SCN-001..003 / R1. Verify shared component consumers, reference colors, event/liveness ownership and test seams; choose a bounded implementation, not a new stop abstraction. No release or architecture migration inferred.

## Readiness Check
Current behavior evidence-backed; desired/preserved outcomes explicit; guardrail clear; IDs/testable ACs linked; supported scenarios established; screenshots integrated; decisions reasoned: **Yes**. Product final-reference approval: **N/A**. Approved basis recorded and user informed: **Yes**. Requirements ready for architecture: **Yes**. Blockers: **None**.

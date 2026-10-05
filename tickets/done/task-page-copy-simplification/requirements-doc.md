# Requirements — Task page copy simplification

## Document Status
- Package: `task-page-copy-simplification`; approved baseline `SR-001`; current solution round `SR-002`.
- Status: **Approved**; owner: Solution Designer; date: 2026-10-05.
- User approval: received 2026-10-05: “Yeah, agreed. Let's do it.” in direct response to the preceding removal/placeholder/spacing proposal for both New task and Edit task; exact transcript in approval-record.md.
- Exact approved baseline: SR-001 (REQ-001–005, AC-001–005, SCN-001–003). Behavior-defining supplements: none.
- Evidence authority: investigation-notes.md. Design: design-spec.md, authored after this approval.

## Problem And Desired Outcome
The New task page repeatedly explains that users should describe work: a subtitle,
Task details heading, description help, lengthy placeholder and standing file/voice
policy note. The user wants a simpler page, trusting familiar fields rather than
surrounding them with obvious explanations. Success is a visibly shorter form
with the editor reached sooner, without loss of task-authoring functionality.

## Stakeholders, Actors, And Outcomes
Project users create/edit durable tasks; they need clear controls and relevant
feedback rather than repeated guidance. Engineering must preserve save, context
files, voice and accessibility while removing redundant copy.

## Relevant Current And Desired Behavior
| ID | Kind / scenarios | Current | Proposed desired | Preserved |
| --- | --- | --- | --- | --- |
| BEH-001 | User; SCN-001/002 | Create/edit forms repeat title, section heading, explanations and placeholder instructions | Remove subtitle, inner Task details heading, description paragraph and standing file/voice policy note; English placeholder becomes “Describe the task…”; close gaps left by deleted text | Project context, New task/Edit task title, Description (required), editor, attachment controls/hint and save shortcut |
| BEH-002 | User; SCN-001/002/003 | Explicit create/save, cancel/back, required text and actionable failures | Same authoring behavior in a simpler presentation | Stored description and first-nonempty-line summary, identity/status, files, voice lifecycle, validation, navigation and errors |

Evidence: screenshot, ProjectTaskDraftEditor.vue, TaskDescriptionComposer.vue,
ProjectTaskEditor.vue and docs/projects.md; exact sources in investigation notes.

## Scope Guardrail (Mandatory)
### In-Scope Use Cases
- UC-001 / SCN-001: create a Project Task on the ordinary New task page.
- UC-002 / SCN-002: edit its description/context on the ordinary Edit task page,
  applying the same copy cleanup consistently.
- UC-003 / SCN-003: recover from required-description/save/voice feedback without
  removing actionable messages.
### Out Of Scope
Task detail/read-only page, board, sidebar, Project forms, status tools, feature
flags, backend/API/schema/migrations, changes to file/voice capability, mobile
support, a wider visual redesign, release/deployment decisions.
### Non-Goals
No new help system, onboarding, title field, autosave, performance target or
additional functionality. Do not remove useful controls merely to reduce text.
### Preserved Behavior Boundary
BEH-002, REQ-003/004/005 and AC-003/004/005 govern unchanged guarantees.
No saved user text or files may be lost or rewritten by this presentation change.
### Review Authority
Blocking design/implementation findings must cite these approved REQ/AC/BEH IDs.
New policy or product behavior is a Requirement Gap requiring explicit renewed
approval; adjacent concerns remain non-blocking/separate-ticket candidates.

## Requirements
| ID | Requirement | Behavior | Priority / rationale |
| --- | --- | --- | --- |
| REQ-001 | Remove the create/edit explanatory subtitle, inner Task details heading, description-help paragraph, and always-visible file-storage/voice-extension note | BEH-001 | Must; redundant copy identified by user/screenshot |
| REQ-002 | Use “Describe the task…” as the English empty-field placeholder and an equivalently concise Chinese placeholder; collapse deleted-copy gaps while retaining current form/editor styling and usable editing area | BEH-001 | Must; concise, not a redesign |
| REQ-003 | Retain project context, page title, Description (required), Context Files/count, attachment control and drag/paste/upload hint, shortcut, Cancel and Create task/Save changes | BEH-001/002 | Must; orientation and non-obvious affordances |
| REQ-004 | Preserve explicit save, trim/required validation, first-nonempty-line task summary, cancel/back destinations, existing context-file handling and conditional voice availability/status/cancellation | BEH-002 | Must; behavior unchanged |
| REQ-005 | Retain label association, keyboard operation, focus and accessible actionable errors without references to removed help/heading elements; keep en/zh-CN presentations consistent | BEH-001/002 | Must; cleanup must not break usability |

## Acceptance Criteria
| ID | Related REQ / BEH / SCN | Trigger / observable result | Alternate / verification intent |
| --- | --- | --- | --- |
| AC-001 | REQ-001; BEH-001; SCN-001/002 | Open New/Edit task: no explanatory subtitle, inner Task details heading, description paragraph or static file/voice policy note | DOM assertions and changed-source browser screenshots; detail page untouched |
| AC-002 | REQ-002/003; BEH-001; SCN-001/002 | Empty English editor reads “Describe the task…”; Chinese equivalent concise; retained labels, context controls, shortcut and actions remain; editor moves up with no spacer replacing removed copy | Browser wide/narrow views; component/catalog assertions |
| AC-003 | REQ-004; BEH-002; SCN-001/002 | Type multiline text, attach a file, explicitly save: saved text/files and first-nonempty-line board summary unchanged; edit preserves task ID/status; Cancel leaves saved content intact | Existing component/draft coverage and owned Projects browser/API journey |
| AC-004 | REQ-004/005; BEH-002; SCN-003 | Submit blank text: required message and field focus remain; existing save/file/voice failures remain actionable, entered text remains recoverable | Component/browser assertions, including no dangling aria-describedby/aria-labelledby references |
| AC-005 | REQ-003/004/005; BEH-002; SCN-001/002/003 | Label still names textarea; Ctrl/Meta+Enter still saves; optional voice still appends editable text only and exposes relevant progress/errors | Existing voice tests and keyboard checks; no installed microphone capability claim |

## Relevant Scenarios And Journeys
All below are User / **Supported Normal Scenario**, approved in SR-001.
Independent evidence: user's screenshot/request and docs/projects.md ordinary routes
and authoring/voice contracts, corroborated by code.
- SCN-001: user with Projects available opens a project's New task page, types
  description, optionally attaches files/dictates, reviews and creates; returns
  to board with saved task. Cancel returns without save. UC-001; REQ-001–005.
- SCN-002: user opens existing task → Edit, changes description/context and saves;
  returns to detail preserving task identity/status. Cancel leaves saved data
  unchanged. UC-002; REQ-001–005. Same approved cleanup applies to this shared form.
- SCN-003: user attempts blank save or encounters existing authoring failure;
  sees actionable feedback, can correct/retry or cancel without losing editable
  input. UC-003; REQ-004/005; AC-004/005. No new failure policy introduced.

## UI, Interaction, And Experience Requirements
Applicable: Yes. Normative approved intent is REQ-001–005, not a new visual system.
Screenshot is current-state evidence, not an approved target screenshot.
Keep styling/responsive behavior except reclaim space occupied by removed text.
Product Team help not requested; Product ticket/spec/visualizer/repository and
final visual-reference approvals: N/A — not applicable. No supplement approval.

## Quality And Non-Functional Requirements
QR-001 (Accessibility; REQ-005/AC-004/005): retained controls remain named,
keyboard-operable, errors associated; no dangling references after deletions.
QR-002 (Localization; REQ-002/005/AC-002): English and Chinese match cleanup;
no raw translation keys. No new performance/security promises.

## Data Continuity And Acceptable Loss
No change to stored/external data semantics. Preserve all task text, status,
identity and context files. Acceptable loss/reset: none. No migration requested.

## External Contracts And Dependencies
Existing Projects capability, node-scoped save/context and optional voice remain
unchanged. No dependency additions or API change requested.

## Supplemental Artifacts
User screenshot (absolute original path in investigation inventory): evidence
only; no target normative supplement. Product/review artifacts N/A at this phase.

## Assumptions And Open Decisions
DEC-001: exact cleanup including consistent Edit task treatment approved by user; see approval-record.md. No other material product uncertainty.
Runtime observations beyond screenshot: not performed; downstream must validate
changed source on test-owned surfaces, never the user's running app/data.

## Traceability
UC-001/002 → SCN-001/002 → BEH-001/002 → REQ-001–005 → AC-001–005.
UC-003 → SCN-003 → BEH-002 → REQ-004/005 → AC-004/005.

## Architecture Phase Input
Approved basis inputs: shared authoring owner, localization consumers and
accessibility references; preserve the contracts above. Investigation completed
and target decisions classified Small/Low in design-spec.md (SR-002).

## Readiness Check
Current evidence, desired/preserved behavior, scope, traceable criteria,
supported scenarios and uncertainties: ready. UI approval basis: SR-001 and approval-record.md;
Product-specific references N/A. Content Ready for Approval: Yes.
User approval: Yes. Approved Basis Ready for Design: Yes. Exact SR-001 approval recorded in approval-record.md; no behavior-defining supplements. Design completed in SR-002; next: rule-based implementation/review handoff.

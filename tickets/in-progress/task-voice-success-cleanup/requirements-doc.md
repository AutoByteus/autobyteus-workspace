# Requirements — Project and task voice input cleanup

## Status
Approved; package `task-voice-success-cleanup`; baseline SR-002 (2026-10-04).
Owner: Solution Designer. Approval: user replied “yesss.” to the explicit confirmation of task success-banner removal and project-description voice input on create/edit, with descriptions remaining optional. Exact approved behavior baseline: SR-002; approval recorded in SR-003. No behavior-defining supplements.

## Problem and outcome
User requests a cleaner task voice experience, voice entry for project descriptions, while keeping project descriptions optional. Successful dictation should leave editable text, not a success banner.

## Supported scenarios and behavior
- SCN-001 / UC-001 / BEH-001: User creates or edits a task and dictates its description. Supported Normal Scenario, evidenced by supplied screenshot and TaskDescriptionComposer. Current: successful transcription leaves a banner. Desired: text remains, banner and its empty space do not. Preserve recording/transcribing, cancel, errors, no-speech feedback, attachments and explicit save.
- SCN-002 / UC-002 / BEH-002: User creates a project and dictates description, reviews/edits and explicitly saves. Supported Normal Scenario proposed by user. Current project editor supports typing only. Approved scope also includes editing projects through the same user experience. Preserve typed text and append dictated text; no success banner or automatic save. Existing voice availability/setup and failure handling apply. Leaving the editor must not insert delayed text elsewhere.
- SCN-003 / UC-003 / BEH-003: User creates or edits a project. Supported Normal Scenario. Current description is labeled optional and blank values are accepted. Preserved outcome: descriptions remain optional on creation and editing, including empty/whitespace input under existing normalization. Existing blank projects remain readable and editable without adding a description. Workspace descriptions remain optional.

## Scope guardrail
In scope: UC-001–003. Out of scope: voice engine changes, project name dictation, workspace description dictation, attachments on projects, unrelated UI cleanup, backfilling historical descriptions, mandatory project descriptions or new nonblank validation. No Product Team request. Review findings must cite approved REQ/AC/BEH; new behavior requires renewed approval. No speculative performance work.

## Requirements and acceptance criteria
| Requirement | Observable acceptance criteria | Traceability |
|---|---|---|
| REQ-001 Remove task transcription success notice | AC-001 After successful task dictation, transcript stays editable; no success banner or reserved gap. Active status, cancellation, errors/no-speech remain. | UC-001 / BEH-001 / SCN-001 |
| REQ-002 Enable project description voice input | AC-002 On create and edit, dictation appends to current description, supports review and typing, never auto-saves, shows active/error feedback but no success notice. Cancel/navigation does not misdeliver text. Existing voice setup limitations apply. | UC-002 / BEH-002 / SCN-002 |
| REQ-003 Withdrawn by user in SR-002 | AC-003 Retired; mandatory description validation must not be implemented. | Historical ID retained; optional behavior covered by REQ-004 |
| REQ-004 Preserve existing data and adjacent behavior | AC-004 Project descriptions remain optional, labeled optional, and can be blank on create/edit; historical blank projects still load and save; no data rewrite/loss. Workspace descriptions remain optional; task context files and manual saving unchanged. | UC-001–003 / BEH-001–003 / SCN-001–003 |

## UI and quality
Use existing project/task visual conventions and voice availability behavior. Maintain keyboard-accessible controls and error feedback. No new visual design supplement; supplied screenshot is current-state evidence only. Verification: component coverage plus rendered create/edit/voice scenarios. No new performance target.

## Data and dependencies
Preserve all stored projects, task descriptions and attachments. No acceptable data loss. Voice input retains existing optional desktop-extension dependency. No historical backfill. No external research required.

## Assumptions and open decision
User explicitly withdrew mandatory description behavior and confirmed descriptions should remain optional. User subsequently explicitly approved the remaining baseline with “yesss.”; no unresolved product decision.

## Architecture input and readiness
Architecture input: existing voice target lifecycle and preservation of optional project descriptions. Evidence-backed current behavior, measurable outcomes, scenarios, scope and data constraints ready. Approval gate passed for SR-002; design is recorded separately in design-spec.md (SR-003). Independent review artifacts: N/A — not applicable for the current direct-route candidate; routing awaits configured rules.

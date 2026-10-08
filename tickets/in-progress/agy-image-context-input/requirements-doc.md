# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `agy-image-context-input`
- Request / ticket: Project Task `project_task_ad5f497a-6825-41f1-ab99-5c67b4a619f0` — Image context files don't reach the model on the Antigravity runtime
- Requirements owner: Solution Designer (`/software_engineering_team/solution_designer`)
- Date: 2026-10-08
- Approval state and reference: Approved by the user in the Solution Designer conversation on 2026-10-08 ("Okay, go ahead, approved."), accepting the recommended options DEC-001 = A and DEC-002 = A
- Exact approved requirements baseline / solution revision: SR-001 (this document as of 2026-10-08, with DEC-001 A, DEC-002 A)
- Behavior-defining supplements and their approved versions: None

## Problem And Desired Outcome

- Problem: On the Antigravity (AGY) runtime, every context file attached to a user message is silently dropped. The AGY backend forwards only the message text, so the model never learns an image (or any file) was attached. The AGY CLI's headless input accepts text only, so images cannot be sent inline the way Claude/Codex/native do.
- Affected actors or systems: Users of AGY standalone runs and AGY team members; the AGY CLI process.
- Desired outcome: An image attached in the app reaches the AGY agent as a viewable image: the agent is told an image is attached at a given local path and opens it with its native `view_file` tool, which gives the model real vision of the image (proven in probes B/C). Non-image files reach the agent as path references, the same as on other runtimes. No attachment is silently dropped.
- Observable definition of success: In the desktop app, an AGY agent given an uploaded or pasted image (with minimal or no text) describes the image's actual content.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | Image attachment on a standalone AGY run is dropped; the agent says nothing came through | Agent receives an explicit "attached image" cue with the absolute local path and can open and see it | UI display of message and "Context files" thumbnails | backend line 76; probes A–C |
| BEH-002 | User | SCN-002 | Non-image attachment (text, PDF, …) on AGY is dropped | Listed in the shared `Reference files:` section with absolute paths (same as Codex/Claude/ACP) | — | backend line 76 |
| BEH-003 | User | SCN-003 | Team member on AGY: same drop | Same as BEH-001/BEH-002 | — | team stream handler |
| BEH-004 | System | SCN-004 | Delegated tasks and inter-agent messages carry `Reference files:` in text; AGY receives them | Unchanged | Yes, preserved | `task-execution-input.ts:38` |
| BEH-005 | User | SCN-005 | Claude/Codex/native deliver images inline | Unchanged | Yes, preserved | mappers and tests |
| BEH-006 | User | SCN-006 | Image attachment that is not a local file (remote `http(s)` URL or inline data URL) on AGY is dropped | Never silently dropped: a remote URL is named in the message text; an image that can't be referenced is named in a short note telling the agent it could not be attached | — | `context-image-source.ts` |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Desktop/web user | Give an AGY agent visual/file context | The agent actually uses the attachment | Same attach flow as other runtimes |
| AGY CLI | Runs the agent | Receives only text input | Non-text blocks end the session |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Send a message with attached image(s) (uploaded, pasted or dragged) to a standalone AGY run | SCN-001 |
| UC-002 | Send a message with attached non-image file(s) to an AGY run | SCN-002 |
| UC-003 | Send UC-001/UC-002 messages to an AGY team member | SCN-003 |
| UC-004 | Attach a non-local image (remote URL) to an AGY run | SCN-006 |

### Out Of Scope

- Changing the AGY CLI or sending inline image blocks (not supported by AGY 1.3.1).
- Changing Claude, Codex, native, ACP or Grok input mapping.
- Changing the frontend attach flow, upload storage, or history rendering.
- Changing how delegated tasks / inter-agent messages render `reference_files`.
- Downloading remote image URLs for the agent.

### Non-Goals

- Making AGY show an image without a visible `view_file` tool step in the conversation.
- Guaranteeing `view_file` handles every image format/size (its own limits apply; a failure is visible as a tool error).

### Preserved Behavior Boundary

- BEH-004, BEH-005 and REQ-006 / AC-007, AC-008: unchanged.
- The user message shown in the UI and stored in run history stays exactly what the user typed plus its "Context files" attachments; the added path text is sent to AGY only.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | For each attached image with a local file path, the text sent to AGY includes that absolute path under explicit wording that it is an attached image the agent should open with `view_file` to see it (separate explicit image section, DEC-001 A). | BEH-001, BEH-003 | Must | Only supported AGY route to real image input | Task; probes B/C; DEC-001 |
| REQ-002 | For each attached non-image file with a local path, the text sent to AGY includes the shared `Reference files:` section with its absolute path, matching other runtimes. | BEH-002, BEH-003 | Must | Parity; files are currently dropped | Task step 4 |
| REQ-003 | Input sent to AGY contains only text; no image or other non-text content block is ever sent. | BEH-001 | Must | Non-text blocks terminate the AGY session | AGY docs; probe A |
| REQ-004 | A message with attachments but no typed text is still delivered to AGY with non-empty text (the attachment section). | BEH-001, BEH-002 | Must | Attach-only sends are a normal action | — |
| REQ-005 | No attachment is silently dropped on AGY: a non-local image (remote `http(s)` URL) is named in the text; an image that cannot be referenced at all (e.g. inline data URL) produces a short text note to the agent that an image could not be attached. | BEH-006 | Should | "Never silently drop"; clear behaviour | Task step 3 |
| REQ-006 | Displayed and stored user messages are unchanged; Claude/Codex/native/ACP input and delegated/inter-agent reference files are unchanged. | BEH-004, BEH-005 | Must | Preserved behavior | — |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-003 | BEH-001 / SCN-001 | AGY input mapping given text "her" + image context file at an absolute path | Produced AGY text contains "her", the image wording and the absolute path; payload is a single text string | — | AGY input-mapping unit test with an image |
| AC-002 | REQ-002 | BEH-002 / SCN-002 | Mapping given a `.txt` and a `.pdf` context file | Text contains `Reference files:` with both absolute paths; they are not listed as images | — | Unit test |
| AC-003 | REQ-004 | SCN-001 | Mapping given empty text + one image | Non-empty text with the image section; AGY backend forwards it (no `AGY_PROCESS_NOT_READY`/turn failure from empty input) | — | Unit test (mapping + backend dispatch) |
| AC-004 | REQ-005 | BEH-006 / SCN-006 | Mapping given a remote `https://…png` image and a `data:image/png;base64,…` image | URL named in text; data-URL image yields the "could not be attached" note; no data-URL bytes in text | — | Unit test |
| AC-005 | REQ-001, REQ-003 | BEH-001 / SCN-001 | AGY backend `dispatchUserInput` with an image context file | `AgyStreamProcess.sendUserMessage` receives the mapped text (not raw `content`) | — | Backend unit test |
| AC-006 | REQ-001, REQ-002 | SCN-001, SCN-003 | Real AGY CLI, desktop app or live test: standalone run and a team-member run, image uploaded and image pasted, minimal text | Agent opens the image with `view_file` and describes its actual content; a non-image file is opened/referenced by path | `view_file` error shown as tool error for unsupported image | Live AGY test (gated) + user verification in desktop app |
| AC-007 | REQ-006 | BEH-004 / SCN-004 | Delegated task with an image in `reference_files` to AGY | Unchanged text; agent can still open it | — | Existing tests pass |
| AC-008 | REQ-006 | BEH-005 / SCN-005 | Existing Claude/Codex/native/ACP image tests | All pass unchanged; UI message still shows typed text + thumbnails only | — | Existing test suites |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | Related IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | App user | Ask an AGY agent about an image | Upload, paste or drag image into composer; send | Standalone AGY run | Attach → send (with or without text) → agent turn | Agent opens image and answers about its content | `view_file` failure visible as tool error | Supported Normal Scenario | User report; `ContextFilePathInputArea.vue` | REQ-001,003,004; AC-001,003,005,006 |
| SCN-002 | User | App user | Give AGY agent a document | Attach `.txt`/`.pdf`/other file; send | AGY run | Attach → send | Agent receives path reference and can read it | — | Supported Normal Scenario | Task step 4 | REQ-002; AC-002,006 |
| SCN-003 | User | App user | Same as SCN-001/002 for a team member | Team composer, member on AGY | Team run with AGY member | Attach → send to member | Same as SCN-001/002 | — | Supported Normal Scenario | `agent-team-stream-handler.ts` | REQ-001,002; AC-006 |
| SCN-004 | System | Delegating agent | Delegate with reference files | `delegate_task`/`send_message_to` with `reference_files` | AGY target | Rendered into text | Unchanged | — | Supported Normal Scenario | `task-execution-input.ts` | REQ-006; AC-007 |
| SCN-005 | User | App user | Image to Claude/Codex/native | Attach; send | Non-AGY run | Inline image | Unchanged | — | Supported Normal Scenario | mappers | REQ-006; AC-008 |
| SCN-006 | User | App user | Attach a remote image URL | Paste an `https://` image URL as a context locator | AGY run | Attach → send | URL named in text so the agent knows it | Data URL: note "could not be attached" | Supported Explicit Edge Scenario (remote URL); data URL Technically Possible but Unsupported/Contrived via UI, handled defensively | `onPaste` text locators; `context-image-source.ts` | REQ-005; AC-004 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` (no UI change; the agent's `view_file` step appears as a normal tool activity).
- Product design fields: N/A — not applicable

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-003 / AC-001, AC-005 | Reliability | Zero non-text content blocks in AGY input | All AGY sends | Unit tests |
| QR-002 | REQ-005 / AC-004 | Reliability | AGY input never embeds image bytes (no data-URL payload in text) | All AGY sends | Unit test |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| AGY CLI headless stream-json input (1.3.1) | Text only | AGY docs; probe A | Future image support would be a separate improvement |
| AGY native `view_file` | Opens local images for the model | Probes B, C | Format/size limits unknown |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `probe-evidence/` | Raw AGY probe outputs | REQ-001, REQ-003 | Final | Evidence only, not behavior-defining |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | AGY runs on the same host as the server, so server-local attachment paths are readable by AGY | Path route | Probe C (path outside workspace readable); AGY is spawned locally by the server | Validated |

## Open Decisions And Questions

| Decision / Question ID | Question | Why It Matters | Options / Evidence | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | How are images described to the agent? | Probe C: with only "her" + a plain path list, the model opened the image but intent was ambiguous | **(A, recommended)** Separate explicit section, e.g. `Attached images (open each with view_file to see it):` + paths; non-images stay under `Reference files:`. (B) Put images in the plain `Reference files:` list like ACP. | User | **Decided: A** (user approval 2026-10-08) |
| DEC-002 | Show the user an extra notice that AGY views images via a tool? | Images do reach the model, so a "not supported" message isn't needed | **(A, recommended)** No extra notice; the `view_file` step is visible in the chat. (B) Add a UI hint. | User | **Decided: A** (user approval 2026-10-08) |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001, UC-003 | BEH-001, BEH-003 | AC-001, AC-005, AC-006 | SCN-001, SCN-003 | probes B, C |
| REQ-002 | UC-002, UC-003 | BEH-002, BEH-003 | AC-002, AC-006 | SCN-002, SCN-003 | — |
| REQ-003 | UC-001 | BEH-001 | AC-001, AC-005 | SCN-001 | probe A |
| REQ-004 | UC-001, UC-002 | BEH-001, BEH-002 | AC-003 | SCN-001 | — |
| REQ-005 | UC-004 | BEH-006 | AC-004 | SCN-006 | — |
| REQ-006 | — | BEH-004, BEH-005 | AC-007, AC-008 | SCN-004, SCN-005 | — |

## Architecture Phase Input

- Approved scenario IDs: SCN-001..SCN-006 (approved SR-001).
- Constraints: text-only AGY input; reuse shared reference-section and image-source helpers; no change to other runtimes or UI.
- Deferred to design: where the AGY input mapping lives; exact wording strings (within DEC-001's choice).
- Technical facts to verify: AGY backend tests' fake process shape; live AGY test gating.
- Risks: model not opening the image without a clear cue (DEC-001).

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
